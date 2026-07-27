import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { completeLegacyImport, importLegacy, workbookFromState } from "../../src/main/excel";
import { applyChapterTotalPages } from "../../src/main/services/progress";
import type { MangaState } from "../../src/shared/types";

const state: MangaState = {
  chapters: [{ id:"11",chapterNumber:11,title:"Chapter 11",totalPages:18,startDate:"2026-07-27",targetEndDate:"2026-07-29",actualCompletedPages:12,status:"in-progress",createdAt:"2026-07-27T00:00:00.000Z",updatedAt:"2026-07-27T00:00:00.000Z",order:0 }],
  dailyPlan: [], dailyHistory: [], events: [],
  settings: { schemaVersion:1,projectName:"Fixture",excelFilePath:"",opacity:1,alwaysOnTop:true,launchAtStartup:false,theme:"dark",lockWindowPosition:false,dockPosition:"top-center",widgetCollapsed:false,lastOpenedAt:"2026-07-27T00:00:00.000Z",syncStatus:"pending",hasPendingSync:true },
};

describe("MangaSprint workbook", () => {
  it("creates the four required sheets with stable headers", () => {
    const workbook = workbookFromState(state);
    expect(workbook.SheetNames).toEqual(["Chapters","DailyPlan","DailyHistory","Settings"]);
    const chapters = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets.Chapters,{header:1});
    expect(chapters[0]).toContain("ChapterNumber");
    expect(chapters[1][0]).toBe(11);
  });
  it("writes adjusted chapter totals and completed pages to Excel", () => {
    const adjusted = applyChapterTotalPages(structuredClone(state), { chapterNumber: 11, totalPages: 10 });
    const workbook = workbookFromState(adjusted);
    const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets.Chapters, { header: 1 });

    expect(rows[1][2]).toBe(10);
    expect(rows[1][5]).toBe(10);
    expect(rows[1][6]).toBe("completed");
  });
  it("imports the real legacy fixture without modifying it", () => {
    const result = importLegacy("examples/legacy-vol2.xlsx");
    expect(result.chapters.map((chapter) => chapter.chapterNumber)).toEqual([11,12,13]);
    expect(result.missingTotalPages).toEqual([]);
    expect(result.chapters[0]).toMatchObject({ startDate:"2026-07-27",targetEndDate:"2026-07-27",actualCompletedPages:50,actualValueIsPercent:true,totalPages:18 });
    const imported = completeLegacyImport(result, { 11:18,12:18,13:18 });
    expect(imported.map((chapter) => chapter.actualCompletedPages)).toEqual([9,9,0]);
  });
  it("imports three-column horizontal chapters and ignores progress regression", () => {
    const directory = mkdtempSync(path.join(tmpdir(), "mangasprint-horizontal-"));
    const file = path.join(directory, "horizontal.xlsx");
    try {
      const plan = [0.08,0.16,0.25,0.33,0.41,0.5,0.58,0.66,0.75,0.83,0.91,1];
      const rows: unknown[][] = [["ch11.預計完成%","實際完成%","日期","ch12.預計完成%","實際完成%","日期"]];
      for (let index = 0; index < plan.length; index += 1) {
        rows.push([
          plan[index],
          index === 6 ? 0.33 : index > 6 ? 0 : null,
          new Date(2026,0,5 + index),
          plan[index],
          null,
          new Date(2026,0,19 + index),
        ]);
      }
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), "工作表1");
      XLSX.writeFile(workbook, file);
      const result = importLegacy(file);
      expect(result.chapters).toHaveLength(2);
      expect(result.chapters[0]).toMatchObject({ chapterNumber:11,startDate:"2026-01-05",targetEndDate:"2026-01-16",actualCompletedPages:33 });
      expect(result.chapters[1]).toMatchObject({ chapterNumber:12,startDate:"2026-01-19",targetEndDate:"2026-01-30",actualCompletedPages:0 });
    } finally {
      rmSync(directory, { recursive:true, force:true });
    }
  });
});
