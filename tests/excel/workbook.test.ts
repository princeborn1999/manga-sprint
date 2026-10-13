import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  completeLegacyImport,
  importLegacy,
  workbookFromState,
} from "../../src/main/excel";
import { applyChapterTotalPages } from "../../src/main/services/progress";
import {
  buildDailyPlan,
  cumulativePages,
  currentChapter,
} from "../../src/shared/calculations";
import type { MangaState } from "../../src/shared/types";

const state: MangaState = {
  chapters: [
    {
      id: "11",
      chapterNumber: 11,
      title: "Chapter 11",
      totalPages: 18,
      startDate: "2026-07-27",
      targetEndDate: "2026-07-29",
      actualCompletedPages: 12,
      status: "in-progress",
      createdAt: "2026-07-27T00:00:00.000Z",
      updatedAt: "2026-07-27T00:00:00.000Z",
      order: 0,
    },
  ],
  dailyPlan: [],
  dailyHistory: [],
  events: [],
  settings: {
    schemaVersion: 1,
    projectName: "Fixture",
    excelFilePath: "",
    opacity: 1,
    alwaysOnTop: true,
    launchAtStartup: false,
    theme: "dark",
    lockWindowPosition: false,
    dockPosition: "top-center",
    widgetCollapsed: false,
    lastOpenedAt: "2026-07-27T00:00:00.000Z",
    syncStatus: "pending",
    hasPendingSync: true,
  },
};

describe("MangaSprint workbook", () => {
  it("creates the four required sheets with stable headers", () => {
    const workbook = workbookFromState(state);
    expect(workbook.SheetNames).toEqual([
      "Chapters",
      "DailyPlan",
      "DailyHistory",
      "Settings",
    ]);
    const chapters = XLSX.utils.sheet_to_json<unknown[]>(
      workbook.Sheets.Chapters,
      { header: 1 },
    );
    expect(chapters[0]).toContain("ChapterNumber");
    expect(chapters[1][0]).toBe(11);
  });
  it("writes adjusted chapter totals and completed pages to Excel", () => {
    const adjusted = applyChapterTotalPages(structuredClone(state), {
      chapterNumber: 11,
      totalPages: 10,
    });
    const workbook = workbookFromState(adjusted);
    const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets.Chapters, {
      header: 1,
    });

    expect(rows[1][2]).toBe(10);
    expect(rows[1][5]).toBe(10);
    expect(rows[1][6]).toBe("in-progress");
    expect(rows[1][10]).toBe(false);
  });
  it("reimports a MangaSprint workbook while preserving totals and progress", () => {
    const directory = mkdtempSync(path.join(tmpdir(), "mangasprint-reimport-"));
    const file = path.join(directory, "GorillaSprint-MangaSprint.xlsx");
    try {
      const portableState = structuredClone(state);
      portableState.chapters[0].totalPages = 20;
      XLSX.writeFile(workbookFromState(portableState), file);

      const preview = importLegacy(file);

      expect(preview.preserveTotalPages).toBe(true);
      expect(preview.projectName).toBe("GorillaSprint");
      expect(preview.chapters[0]).toMatchObject({
        chapterNumber: 11,
        totalPages: 20,
        actualCompletedPages: 12,
        actualValueIsPercent: false,
        dialogueComplete: false,
      });
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
  it("preserves a 16-page Chapter 16 schedule and calculates September 2 as four pages", () => {
    const directory = mkdtempSync(path.join(tmpdir(), "mangasprint-ch16-"));
    const file = path.join(
      directory,
      "gorilla_sprint_ch16-50-MangaSprint.xlsx",
    );
    try {
      const portableState = structuredClone(state);
      portableState.chapters = [
        {
          ...portableState.chapters[0],
          id: "16",
          chapterNumber: 16,
          title: "Chapter 16",
          totalPages: 16,
          startDate: "2026-08-31",
          targetEndDate: "2026-09-11",
          actualCompletedPages: 0,
          order: 0,
        },
      ];
      portableState.dailyPlan = buildDailyPlan(
        portableState.chapters,
        "2026-09-02",
      );
      XLSX.writeFile(workbookFromState(portableState), file);

      const preview = importLegacy(file);
      const chapters = completeLegacyImport(preview, {});
      const plan = buildDailyPlan(chapters, "2026-09-02").find(
        (item) => item.date === "2026-09-02",
      );
      const chapter = currentChapter(chapters);

      expect(preview.preserveTotalPages).toBe(true);
      expect(chapter).toMatchObject({
        chapterNumber: 16,
        totalPages: 16,
        actualCompletedPages: 0,
      });
      expect(plan).toMatchObject({
        chapterNumber: 16,
        idealPage: 4,
        totalPages: 16,
        idealPercent: 25,
      });
      expect(
        cumulativePages(chapters, { chapterNumber: 16, page: 0 }) -
          cumulativePages(chapters, { chapterNumber: 16, page: 4 }),
      ).toBe(-4);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
  it("imports the real legacy fixture without modifying it", () => {
    const result = importLegacy("examples/legacy-vol2.xlsx");
    expect(result.chapters.map((chapter) => chapter.chapterNumber)).toEqual([
      11, 12, 13,
    ]);
    expect(result.missingTotalPages).toEqual([]);
    expect(result.chapters[0]).toMatchObject({
      startDate: "2026-07-27",
      targetEndDate: "2026-07-27",
      actualCompletedPages: 50,
      actualValueIsPercent: true,
      totalPages: 18,
    });
    const imported = completeLegacyImport(result, { 11: 18, 12: 18, 13: 18 });
    expect(imported.map((chapter) => chapter.actualCompletedPages)).toEqual([
      9, 9, 0,
    ]);
  });
  it("imports legacy 99% as all pages drawn but dialogue unfinished", () => {
    const imported = completeLegacyImport(
      {
        sourcePath: "legacy.xlsx",
        projectName: "Legacy",
        chapters: [
          {
            chapterNumber: 18,
            actualCompletedPages: 99,
            actualValueIsPercent: true,
            totalPages: 18,
          },
        ],
        missingTotalPages: [],
      },
      {},
    );
    expect(imported[0]).toMatchObject({
      actualCompletedPages: 18,
      dialogueComplete: false,
      status: "in-progress",
    });
  });
  it("imports three-column horizontal chapters and ignores progress regression", () => {
    const directory = mkdtempSync(
      path.join(tmpdir(), "mangasprint-horizontal-"),
    );
    const file = path.join(directory, "horizontal.xlsx");
    try {
      const plan = [
        0.08, 0.16, 0.25, 0.33, 0.41, 0.5, 0.58, 0.66, 0.75, 0.83, 0.91, 1,
      ];
      const rows: unknown[][] = [
        [
          "ch11.預計完成%",
          "實際完成%",
          "日期",
          "ch12.預計完成%",
          "實際完成%",
          "日期",
        ],
      ];
      for (let index = 0; index < plan.length; index += 1) {
        rows.push([
          plan[index],
          index === 6 ? 0.33 : index > 6 ? 0 : null,
          new Date(2026, 0, 5 + index),
          plan[index],
          null,
          new Date(2026, 0, 19 + index),
        ]);
      }
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.aoa_to_sheet(rows),
        "工作表1",
      );
      XLSX.writeFile(workbook, file);
      const result = importLegacy(file);
      expect(result.chapters).toHaveLength(2);
      expect(result.chapters[0]).toMatchObject({
        chapterNumber: 11,
        startDate: "2026-01-05",
        targetEndDate: "2026-01-16",
        actualCompletedPages: 33,
      });
      expect(result.chapters[1]).toMatchObject({
        chapterNumber: 12,
        startDate: "2026-01-19",
        targetEndDate: "2026-01-30",
        actualCompletedPages: 0,
      });
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
