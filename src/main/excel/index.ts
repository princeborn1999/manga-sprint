import XLSX from "xlsx";
import { copyFile, mkdir, readdir, rename, rm, stat } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { Chapter, LegacyImportPreview, MangaState, OperationResult } from "../../shared/types";
import { BACKUP_RETENTION_DAYS } from "../../shared/constants";
import { localDate } from "../../shared/date";

const HEADERS = {
  chapters: ["ChapterNumber","Title","TotalPages","StartDate","TargetEndDate","ActualCompletedPages","Status","ActualCompletedDate","CreatedAt","UpdatedAt"],
  dailyPlan: ["Date","ChapterNumber","IdealPage","TotalPages","IdealPercent","IsManualOverride"],
  dailyHistory: ["Date","ActualChapterNumber","ActualPage","ActualChapterTotalPages","ActualPercent","IdealChapterNumber","IdealPage","IdealChapterTotalPages","IdealPercent","CumulativeActualPages","CumulativeIdealPages","DifferencePages","Status","RecordedAt"],
};

function assertXlsx(filePath: string): string {
  const resolved = path.resolve(filePath);
  if (path.extname(resolved).toLowerCase() !== ".xlsx") throw new Error("只允許 .xlsx 檔案");
  return resolved;
}

function chapterRows(chapters: Chapter[]): unknown[][] {
  return [HEADERS.chapters, ...chapters.map((c) => [c.chapterNumber,c.title,c.totalPages,c.startDate,c.targetEndDate,c.actualCompletedPages,c.status,c.actualCompletedDate ?? "",c.createdAt,c.updatedAt])];
}

function addSheet(workbook: XLSX.WorkBook, name: string, rows: unknown[][], widths: number[]): void {
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  sheet["!cols"] = widths.map((wch) => ({ wch }));
  sheet["!autofilter"] = { ref: sheet["!ref"] ?? "A1:A1" };
  XLSX.utils.book_append_sheet(workbook, sheet, name);
}

export function workbookFromState(state: MangaState): XLSX.WorkBook {
  const workbook = XLSX.utils.book_new();
  addSheet(workbook, "Chapters", chapterRows(state.chapters), [14,26,12,14,16,22,14,20,24,24]);
  addSheet(workbook, "DailyPlan", [HEADERS.dailyPlan, ...state.dailyPlan.map((p) => [p.date,p.chapterNumber,p.idealPage,p.totalPages,p.idealPercent / 100,p.isManualOverride])], [14,14,12,12,14,18]);
  addSheet(workbook, "DailyHistory", [HEADERS.dailyHistory, ...state.dailyHistory.map((h) => [h.date,h.actualChapterNumber,h.actualPage,h.actualChapterTotalPages,h.actualPercent / 100,h.idealChapterNumber,h.idealPage,h.idealChapterTotalPages,h.idealPercent / 100,h.cumulativeActualPages,h.cumulativeIdealPages,h.differencePages,h.status,h.recordedAt])], [14,20,12,24,15,19,12,23,14,22,21,18,14,24]);
  addSheet(workbook, "Settings", [["Key","Value"],["ExcelSchemaVersion",state.settings.schemaVersion],["ProjectName",state.settings.projectName],["ExcelFilePath",state.settings.excelFilePath],["Opacity",state.settings.opacity],["AlwaysOnTop",state.settings.alwaysOnTop],["LaunchAtStartup",state.settings.launchAtStartup],["Theme",state.settings.theme],["LastOpenedAt",state.settings.lastOpenedAt]], [24,42]);
  return workbook;
}

export async function createBackup(filePath: string): Promise<string | undefined> {
  const target = assertXlsx(filePath);
  try { await stat(target); } catch { return undefined; }
  const backupDir = path.join(path.dirname(target), "backups");
  await mkdir(backupDir, { recursive: true });
  const backup = path.join(backupDir, `${path.basename(target, ".xlsx")}-${new Date().toISOString().replace(/[:.]/g, "-")}.xlsx`);
  await copyFile(target, backup);
  await pruneBackups(backupDir);
  return backup;
}

async function pruneBackups(directory: string): Promise<void> {
  const cutoff = Date.now() - BACKUP_RETENTION_DAYS * 86_400_000;
  for (const name of await readdir(directory)) {
    if (!name.endsWith(".xlsx")) continue;
    const file = path.join(directory, name);
    if ((await stat(file)).mtimeMs < cutoff) await rm(file, { force: true });
  }
}

export async function syncWorkbook(state: MangaState, filePath: string): Promise<OperationResult> {
  const target = assertXlsx(filePath);
  await mkdir(path.dirname(target), { recursive: true });
  await createBackup(target);
  const temp = path.join(path.dirname(target), `.${path.basename(target, ".xlsx")}.${randomUUID()}.tmp.xlsx`);
  const displaced = `${target}.replacing`;
  try {
    XLSX.writeFile(workbookFromState(state), temp, { compression: true });
    const verify = XLSX.readFile(temp, { cellDates: true });
    if (!["Chapters","DailyPlan","DailyHistory","Settings"].every((name) => verify.SheetNames.includes(name))) throw new Error("臨時 Excel 驗證失敗");
    let hadTarget = false;
    try { await stat(target); hadTarget = true; } catch { /* new file */ }
    if (hadTarget) await rename(target, displaced);
    try { await rename(temp, target); } catch (error) {
      if (hadTarget) await rename(displaced, target).catch(() => undefined);
      throw error;
    }
    if (hadTarget) await rm(displaced, { force: true });
    return { ok: true, message: "Excel 已同步", path: target };
  } catch (error) {
    await rm(temp, { force: true }).catch(() => undefined);
    throw new Error(`Excel 寫入失敗，進度已安全保存在 App：${error instanceof Error ? error.message : String(error)}`);
  }
}

function numberValue(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value <= 1 && value >= 0 ? Math.round(value * 100) : Math.round(value);
  if (typeof value === "string") { const parsed = Number(value.replace("%","").trim()); return Number.isFinite(parsed) ? Math.round(parsed) : undefined; }
  return undefined;
}

function optionalDateValue(value: unknown): string | undefined {
  if (value instanceof Date) return localDate(value);
  if (typeof value === "number") { const parsed = XLSX.SSF.parse_date_code(value); if (parsed) return `${parsed.y}-${String(parsed.m).padStart(2,"0")}-${String(parsed.d).padStart(2,"0")}`; }
  if (typeof value === "string") { const match = value.match(/(\d{4})[/-](\d{1,2})[/-](\d{1,2})/); if (match) return `${match[1]}-${match[2].padStart(2,"0")}-${match[3].padStart(2,"0")}`; }
  return undefined;
}

function dateValue(value: unknown): string {
  return optionalDateValue(value) ?? localDate();
}

export function importLegacy(filePath: string): LegacyImportPreview {
  const sourcePath = assertXlsx(filePath);
  const workbook = XLSX.readFile(sourcePath, { cellDates: true });
  const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[workbook.SheetNames[0]], { header: 1, raw: true });
  const chapters: LegacyImportPreview["chapters"] = [];
  for (let r = 0; r < rows.length; r += 1) {
    const row = rows[r];
    for (let c = 0; c < row.length; c += 1) {
      const label = String(row[c] ?? "");
      const match = label.match(/ch(?:apter)?\s*(\d+)/i);
      if (!match) continue;
      const chapterNumber = Number(match[1]);
      const inlineActualPercent = numberValue(row[c + 1]);
      const inlineDate = optionalDateValue(row[c + 2]);
      if (inlineActualPercent !== undefined && inlineDate) {
        if (!chapters.some((item) => item.chapterNumber === chapterNumber)) {
          chapters.push({
            chapterNumber,
            actualCompletedPages: inlineActualPercent,
            actualValueIsPercent: true,
            title: `Chapter ${chapterNumber}`,
            totalPages: 18,
            startDate: inlineDate,
            targetEndDate: inlineDate,
            actualCompletedDate: inlineActualPercent >= 100 ? inlineDate : undefined,
          });
        }
        continue;
      }
      let startDate: string | undefined;
      let targetEndDate: string | undefined;
      let actualCompletedDate: string | undefined;
      let highestActualPercent = 0;

      for (let dataRow = r + 1; dataRow < rows.length; dataRow += 1) {
        const current = rows[dataRow];
        const date = optionalDateValue(current?.[c + 2]);
        const plannedPercent = numberValue(current?.[c]);
        const actualPercent = numberValue(current?.[c + 1]);
        if (date && !startDate) startDate = date;
        if (date && plannedPercent !== undefined && plannedPercent >= 100) targetEndDate = date;
        if (actualPercent !== undefined && actualPercent >= highestActualPercent) {
          highestActualPercent = actualPercent;
          if (date) actualCompletedDate = date;
        }
      }

      if (!chapters.some((item) => item.chapterNumber === chapterNumber)) {
        const firstDate = startDate ?? localDate();
        chapters.push({
          chapterNumber,
          actualCompletedPages: highestActualPercent,
          actualValueIsPercent: true,
          title: `Chapter ${chapterNumber}`,
          totalPages: 18,
          startDate: firstDate,
          targetEndDate: targetEndDate ?? firstDate,
          actualCompletedDate: highestActualPercent >= 100 ? actualCompletedDate : undefined,
        });
      }
    }
  }
  if (!chapters.length) {
    for (let r = 1; r < rows.length; r += 1) {
      const chapterNumber = numberValue(rows[r][0]);
      if (chapterNumber && chapterNumber > 0) chapters.push({ chapterNumber, title: String(rows[r][1] ?? `Chapter ${chapterNumber}`), actualCompletedPages: numberValue(rows[r][2]) ?? 0, totalPages: numberValue(rows[r][3]), startDate: dateValue(rows[r][4]), targetEndDate: dateValue(rows[r][5]) });
    }
  }
  if (!chapters.length) throw new Error("無法辨識舊 Excel 的話數資料");
  return { sourcePath, projectName: path.basename(sourcePath, ".xlsx"), chapters, missingTotalPages: chapters.filter((c) => !c.totalPages).map((c) => c.chapterNumber) };
}

export function completeLegacyImport(preview: LegacyImportPreview, totals: Record<number, number>): Chapter[] {
  const now = new Date().toISOString();
  return preview.chapters.map((raw, order) => {
    const totalPages = totals[raw.chapterNumber] ?? raw.totalPages;
    if (!Number.isInteger(totalPages) || totalPages <= 0) throw new Error(`請填寫 Chapter ${raw.chapterNumber} 的總頁數`);
    const value = raw.actualValueIsPercent
      ? Math.round((raw.actualCompletedPages / 100) * totalPages)
      : Math.min(raw.actualCompletedPages, totalPages);
    return { id: randomUUID(), chapterNumber: raw.chapterNumber, title: raw.title ?? `Chapter ${raw.chapterNumber}`, totalPages, startDate: raw.startDate ?? localDate(), targetEndDate: raw.targetEndDate ?? localDate(), actualCompletedPages: value, status: value >= totalPages ? "completed" : value > 0 ? "in-progress" : "not-started", actualCompletedDate: value >= totalPages ? raw.actualCompletedDate ?? localDate() : undefined, createdAt: now, updatedAt: now, order };
  });
}
