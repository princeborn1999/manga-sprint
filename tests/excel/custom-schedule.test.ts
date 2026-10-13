import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  completeLegacyImport,
  dailyPlanFromImport,
  importLegacy,
  workbookFromState,
} from "../../src/main/excel";
import { applyChapterTotalPages } from "../../src/main/services/progress";
import { percent, projectTodaySummary } from "../../src/shared/calculations";
import { localDate } from "../../src/shared/date";
import type { MangaState } from "../../src/shared/types";

const samuraiPattern = [0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 0];
const vPattern = [...Array<number>(12).fill(0), 2, 2];

function scheduledState(pattern: number[], cycleDays: number): MangaState {
  const state: MangaState = {
    chapters: [],
    dailyPlan: [],
    dailyHistory: [],
    events: [],
    settings: {
      schemaVersion: 1,
      projectName: "Schedule",
      excelFilePath: "",
      opacity: 1,
      alwaysOnTop: true,
      launchAtStartup: false,
      theme: "dark",
      lockWindowPosition: false,
      dockPosition: "top-center",
      widgetCollapsed: false,
      lastOpenedAt: "2026-10-12T00:00:00.000Z",
      syncStatus: "pending",
      hasPendingSync: true,
    },
  };
  for (let chapterIndex = 0; chapterIndex < 2; chapterIndex += 1) {
    const offset = chapterIndex * cycleDays;
    const chapterNumber = chapterIndex + 1;
    state.chapters.push({
      id: String(chapterNumber),
      chapterNumber,
      title: `Chapter ${chapterNumber}`,
      totalPages: 16,
      startDate: localDate(new Date(2026, 9, 12 + offset)),
      targetEndDate: localDate(new Date(2026, 9, 12 + offset + cycleDays - 1)),
      actualCompletedPages: 0,
      dialogueComplete: false,
      status: "not-started",
      createdAt: "2026-10-12T00:00:00.000Z",
      updatedAt: "2026-10-12T00:00:00.000Z",
      order: chapterIndex,
    });
    let idealPage = 0;
    for (let index = 0; index < cycleDays; index += 1) {
      idealPage += pattern[index % pattern.length];
      state.dailyPlan.push({
        date: localDate(new Date(2026, 9, 12 + offset + index)),
        chapterNumber,
        idealPage,
        totalPages: 16,
        idealPercent: percent(idealPage, 16),
        isManualOverride: true,
      });
    }
  }
  return state;
}

function withWorkbook(
  state: MangaState,
  check: (file: string, directory: string) => void,
): void {
  const directory = mkdtempSync(
    path.join(tmpdir(), "mangasprint-custom-plan-"),
  );
  try {
    const file = path.join(directory, "custom.xlsx");
    XLSX.writeFile(workbookFromState(state), file);
    check(file, directory);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

describe("custom daily schedule import", () => {
  it("preserves Samurai rest days and second-day target through reimport", () => {
    const original = scheduledState(samuraiPattern, 28);
    withWorkbook(original, (file, directory) => {
      const preview = importLegacy(file);
      const chapters = completeLegacyImport(preview, {});
      const dailyPlan = dailyPlanFromImport(preview, chapters);
      expect(dailyPlan).toEqual(original.dailyPlan);
      expect(dailyPlan[0]).toMatchObject({ date: "2026-10-12", idealPage: 0 });
      expect(dailyPlan[1]).toMatchObject({ date: "2026-10-13", idealPage: 1 });
      expect(dailyPlan[27].idealPage).toBe(16);
      const imported = { ...original, chapters, dailyPlan };
      const reexport = path.join(directory, "custom-MangaSprint.xlsx");
      XLSX.writeFile(workbookFromState(imported), reexport);
      const reimport = importLegacy(reexport);
      expect(
        dailyPlanFromImport(reimport, completeLegacyImport(reimport, {})),
      ).toEqual(dailyPlan);
      expect(
        projectTodaySummary(
          {
            id: "samurai",
            state: imported,
            createdAt: "",
            updatedAt: "",
          },
          "2026-10-13",
        ).missingPages,
      ).toBe(1);
    });
  });

  it("preserves twelve V rest days before its two-page work days", () => {
    const original = scheduledState(vPattern, 56);
    withWorkbook(original, (file) => {
      const preview = importLegacy(file);
      const plan = dailyPlanFromImport(
        preview,
        completeLegacyImport(preview, {}),
      );
      expect(plan.slice(0, 12).map((row) => row.idealPage)).toEqual(
        Array<number>(12).fill(0),
      );
      expect(plan[12]).toMatchObject({ date: "2026-10-24", idealPage: 2 });
      expect(plan[13]).toMatchObject({ date: "2026-10-25", idealPage: 4 });
      expect(plan[55].idealPage).toBe(16);
    });
  });

  it("reads numeric Excel date serials", () => {
    const original = scheduledState(samuraiPattern, 28);
    withWorkbook(original, (file) => {
      const workbook = workbookFromState(original);
      const serial =
        (Date.UTC(2026, 9, 12) - Date.UTC(1899, 11, 30)) / 86_400_000;
      workbook.Sheets.DailyPlan.A2 = { t: "n", v: serial };
      XLSX.writeFile(workbook, file);
      expect(importLegacy(file).dailyPlan?.[0].date).toBe("2026-10-12");
    });
  });

  it.each([
    ["invalid date", "A2", "2026-02-30"],
    ["unknown chapter", "B2", 99],
    ["fractional page", "C2", 0.5],
    ["incorrect total", "D2", 18],
    ["incorrect percent", "E2", 1],
    ["invalid override", "F2", "maybe"],
    ["duplicate date", "A3", "2026-10-12"],
    ["progress regression", "C4", 0],
  ])("rejects a supplied plan with %s", (_label, cell, value) => {
    const original = scheduledState(samuraiPattern, 28);
    withWorkbook(original, (file) => {
      const workbook = workbookFromState(original);
      workbook.Sheets.DailyPlan[cell] =
        typeof value === "number" ? { t: "n", v: value } : { t: "s", v: value };
      if (cell === "C4") workbook.Sheets.DailyPlan.E4 = { t: "n", v: 0 };
      XLSX.writeFile(workbook, file);
      expect(() => importLegacy(file)).toThrow("DailyPlan");
    });
  });

  it("uses the original generic fallback when DailyPlan is empty", () => {
    const original = scheduledState(samuraiPattern, 28);
    original.dailyPlan = [];
    withWorkbook(original, (file) => {
      const preview = importLegacy(file);
      expect(preview.dailyPlan).toBeUndefined();
      const plan = dailyPlanFromImport(
        preview,
        completeLegacyImport(preview, {}),
      );
      expect(plan[0].idealPage).toBe(1);
      expect(plan[0].isManualOverride).toBe(false);
    });
  });
});

describe("custom daily schedule page adjustments", () => {
  it("preserves an untouched chapter and rest days when another total changes", () => {
    const state = scheduledState(samuraiPattern, 28);
    const untouched = structuredClone(
      state.dailyPlan.filter((row) => row.chapterNumber === 1),
    );
    const result = applyChapterTotalPages(state, {
      chapterNumber: 2,
      totalPages: 20,
    });
    expect(result.dailyPlan.filter((row) => row.chapterNumber === 1)).toEqual(
      untouched,
    );
    const adjusted = result.dailyPlan.filter((row) => row.chapterNumber === 2);
    expect(adjusted[0].idealPage).toBe(0);
    expect(adjusted[2].idealPage).toBe(adjusted[3].idealPage);
    expect(adjusted[27].idealPage).toBe(20);
    expect(adjusted.every((row) => row.totalPages === 20)).toBe(true);
  });

  it("keeps V rest days intact when reducing chapter pages", () => {
    const state = scheduledState(vPattern, 56);
    const result = applyChapterTotalPages(state, {
      chapterNumber: 1,
      totalPages: 12,
    });
    expect(
      result.dailyPlan.slice(0, 12).every((row) => row.idealPage === 0),
    ).toBe(true);
    expect(result.dailyPlan[55].idealPage).toBe(12);
  });
});
