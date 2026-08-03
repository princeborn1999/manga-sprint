import { describe, expect, it } from "vitest";
import { applyChapterTotalPages, applyProgress } from "../../src/main/services/progress";
import { buildDailyPlan } from "../../src/shared/calculations";
import type { MangaState } from "../../src/shared/types";

const chapter = {
  id: "11",
  chapterNumber: 11,
  title: "Chapter 11",
  totalPages: 18,
  startDate: "2026-07-20",
  targetEndDate: "2026-07-31",
  actualCompletedPages: 6,
  status: "in-progress" as const,
  createdAt: "2026-07-20T00:00:00.000Z",
  updatedAt: "2026-07-27T00:00:00.000Z",
  order: 0,
};

const state: MangaState = {
  chapters: [chapter],
  dailyPlan: buildDailyPlan([chapter]),
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
    syncStatus: "synced",
    hasPendingSync: false,
  },
};

describe("chapter total page adjustments", () => {
  it("adds pages without changing completed pages and rebuilds the plan", () => {
    const result = applyChapterTotalPages(structuredClone(state), { chapterNumber: 11, totalPages: 20 });

    expect(result.chapters[0]).toMatchObject({
      totalPages: 20,
      actualCompletedPages: 6,
      status: "in-progress",
    });
    expect(result.dailyPlan.every((item) => item.totalPages === 20)).toBe(true);
    expect(result.settings).toMatchObject({ hasPendingSync: true, syncStatus: "pending" });
    expect(result.events[0]).toMatchObject({
      type: "chapter-total-pages",
      previousTotalPages: 18,
      newTotalPages: 20,
      removedCompletedPages: 0,
    });
  });

  it("treats reducing below completed pages as deleting completed pages", () => {
    const input = structuredClone(state);
    input.chapters[0].actualCompletedPages = 16;

    const result = applyChapterTotalPages(input, { chapterNumber: 11, totalPages: 14 });

    expect(result.chapters[0]).toMatchObject({
      totalPages: 14,
      actualCompletedPages: 14,
      status: "in-progress",
    });
    expect(result.chapters[0].actualCompletedDate).toBeUndefined();
    expect(result.events[0]).toMatchObject({
      previousTotalPages: 18,
      newTotalPages: 14,
      removedCompletedPages: 2,
    });
  });

  it("keeps all pages at 99% until dialogue is marked complete", () => {
    const pagesDone = applyProgress(structuredClone(state), { chapterNumber: 11, page: 18, dialogueComplete: false });
    expect(pagesDone.chapters[0]).toMatchObject({ actualCompletedPages: 18, dialogueComplete: false, status: "in-progress" });
    expect(pagesDone.dailyHistory[0].actualPercent).toBe(99);
    const finished = applyProgress(pagesDone, { chapterNumber: 11, page: 18, dialogueComplete: true });
    expect(finished.chapters[0]).toMatchObject({ dialogueComplete: true, status: "completed" });
    expect(finished.dailyHistory[0].actualPercent).toBe(100);
  });

  it("rejects invalid total page counts", () => {
    expect(() => applyChapterTotalPages(structuredClone(state), { chapterNumber: 11, totalPages: 0 })).toThrow(
      "總頁數必須介於 1 到 100000",
    );
  });
});
