import type { Chapter, DailyPlan, PaceStatus, ProgressPoint } from "../types";
import { daysInclusive, localDate } from "../date";

export function percent(page: number, total: number): number {
  return total > 0 ? Math.round((Math.min(page, total) / total) * 100) : 0;
}

export function cumulativePages(chapters: Chapter[], point: ProgressPoint): number {
  return chapters
    .filter((c) => c.chapterNumber < point.chapterNumber)
    .reduce((sum, c) => sum + c.totalPages, 0) + point.page;
}

export function differencePages(actual: number, ideal: number): number {
  return actual - ideal;
}

export function paceStatus(difference: number): PaceStatus {
  return difference < 0 ? "behind" : difference > 0 ? "ahead" : "on-track";
}

export function buildDailyPlan(chapters: Chapter[], today = localDate()): DailyPlan[] {
  const result: DailyPlan[] = [];
  for (const chapter of [...chapters].sort((a, b) => a.order - b.order)) {
    const count = daysInclusive(chapter.startDate, chapter.targetEndDate);
    for (let index = 0; index < count; index += 1) {
      const [y, m, d] = chapter.startDate.split("-").map(Number);
      const date = new Date(y, m - 1, d + index);
      const idealPage = Math.min(chapter.totalPages, Math.ceil(((index + 1) / count) * chapter.totalPages));
      result.push({
        date: localDate(date),
        chapterNumber: chapter.chapterNumber,
        idealPage,
        totalPages: chapter.totalPages,
        idealPercent: percent(idealPage, chapter.totalPages),
        isManualOverride: false,
      });
    }
  }
  if (!result.some((plan) => plan.date === today) && result.length) {
    const nearest = [...result].sort((a, b) => Math.abs(a.date.localeCompare(today)) - Math.abs(b.date.localeCompare(today)))[0];
    result.push({ ...nearest, date: today });
  }
  return result.sort((a, b) => a.date.localeCompare(b.date));
}

export function currentChapter(chapters: Chapter[]): Chapter | undefined {
  return [...chapters].sort((a, b) => a.order - b.order).find((c) => c.actualCompletedPages < c.totalPages) ??
    [...chapters].sort((a, b) => b.order - a.order)[0];
}
