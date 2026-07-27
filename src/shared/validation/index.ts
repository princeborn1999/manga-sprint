import type { AppSettings, Chapter, ChapterTotalPagesUpdate, ProgressPoint } from "../types";
import { isValidLocalDate } from "../date";

export function validateChapter(chapter: Chapter): void {
  if (!Number.isInteger(chapter.chapterNumber) || chapter.chapterNumber <= 0) throw new Error("話數必須為正整數");
  if (!chapter.title.trim() || chapter.title.length > 200) throw new Error("標題無效");
  if (!Number.isInteger(chapter.totalPages) || chapter.totalPages <= 0 || chapter.totalPages > 100_000) throw new Error("總頁數無效");
  if (!Number.isInteger(chapter.actualCompletedPages) || chapter.actualCompletedPages < 0 || chapter.actualCompletedPages > chapter.totalPages) throw new Error("完成頁數無效");
  if (!isValidLocalDate(chapter.startDate) || !isValidLocalDate(chapter.targetEndDate) || chapter.targetEndDate < chapter.startDate) throw new Error("日期範圍無效");
}

export function validateProgress(point: ProgressPoint, chapters: Chapter[]): Chapter {
  if (!Number.isInteger(point.chapterNumber) || !Number.isInteger(point.page)) throw new Error("進度必須是整數");
  const chapter = chapters.find((item) => item.chapterNumber === point.chapterNumber);
  if (!chapter) throw new Error("找不到指定話數");
  if (point.page < 0 || point.page > chapter.totalPages) throw new Error("頁數超出範圍");
  return chapter;
}

export function validateChapterTotalPages(update: ChapterTotalPagesUpdate, chapters: Chapter[]): Chapter {
  if (!Number.isInteger(update.chapterNumber) || update.chapterNumber <= 0) throw new Error("話數必須是正整數");
  if (!Number.isInteger(update.totalPages) || update.totalPages <= 0 || update.totalPages > 100_000) throw new Error("總頁數必須介於 1 到 100000");
  const chapter = chapters.find((item) => item.chapterNumber === update.chapterNumber);
  if (!chapter) throw new Error("找不到指定話數");
  return chapter;
}

export function validateSettings(input: Partial<AppSettings>): void {
  if (input.opacity !== undefined && (!Number.isFinite(input.opacity) || input.opacity < 0.5 || input.opacity > 1)) throw new Error("透明度必須介於 0.5 到 1");
  if (input.projectName !== undefined && (!input.projectName.trim() || input.projectName.length > 200)) throw new Error("專案名稱無效");
  if (input.dockPosition !== undefined && !["free","top-center","top-right","top-free","right-center"].includes(input.dockPosition)) throw new Error("停靠位置無效");
}
