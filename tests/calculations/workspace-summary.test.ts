import { describe, expect, it } from "vitest";
import { projectTodaySummary } from "../../src/shared/calculations";
import type { Chapter, MangaProject } from "../../src/shared/types";

const now = "2026-10-13T00:00:00.000Z";

function project(
  id: string,
  actualPage: number,
  idealPage: number,
): MangaProject {
  const chapter: Chapter = {
    id: `${id}-chapter`,
    chapterNumber: 1,
    title: "Chapter 1",
    totalPages: 18,
    startDate: "2026-10-01",
    targetEndDate: "2026-10-14",
    actualCompletedPages: actualPage,
    dialogueComplete: false,
    status: "in-progress",
    createdAt: now,
    updatedAt: now,
    order: 0,
  };

  return {
    id,
    createdAt: now,
    updatedAt: now,
    state: {
      chapters: [chapter],
      dailyPlan: [
        {
          date: "2026-10-13",
          chapterNumber: 1,
          idealPage,
          totalPages: 18,
          idealPercent: Math.round((idealPage / 18) * 100),
          isManualOverride: false,
        },
      ],
      dailyHistory: [],
      events: [],
      settings: {
        schemaVersion: 1,
        projectName: id,
        excelFilePath: "",
        opacity: 0.95,
        alwaysOnTop: true,
        launchAtStartup: false,
        theme: "dark",
        lockWindowPosition: false,
        dockPosition: "top-center",
        widgetCollapsed: false,
        lastOpenedAt: now,
        syncStatus: "synced",
        hasPendingSync: false,
      },
    },
  };
}

describe("workspace summary", () => {
  it("counts only missing pages for each manga", () => {
    const behind = projectTodaySummary(project("Behind", 6, 10), "2026-10-13");
    const ahead = projectTodaySummary(project("Ahead", 12, 10), "2026-10-13");

    expect(behind.gapPages).toBe(-4);
    expect(behind.missingPages).toBe(4);
    expect(ahead.gapPages).toBe(2);
    expect(ahead.missingPages).toBe(0);
    expect(behind.missingPages + ahead.missingPages).toBe(4);
  });
});
