import { randomUUID } from "node:crypto";
import type { MangaState, ProgressPoint } from "../../shared/types";
import { cumulativePages, paceStatus, percent } from "../../shared/calculations";
import { localDate } from "../../shared/date";
import { validateProgress } from "../../shared/validation";
import { addEvent } from "../storage";

export function applyProgress(state: MangaState, point: ProgressPoint): MangaState {
  const chapter = validateProgress(point, state.chapters);
  const previous = { chapterNumber: chapter.chapterNumber, page: chapter.actualCompletedPages };
  chapter.actualCompletedPages = point.page;
  chapter.updatedAt = new Date().toISOString();
  chapter.status = point.page === 0 ? "not-started" : point.page === chapter.totalPages ? "completed" : "in-progress";
  chapter.actualCompletedDate = chapter.status === "completed" ? localDate() : undefined;

  const today = localDate();
  const ideal = state.dailyPlan.filter((p) => p.date <= today).at(-1) ??
    { date: today, chapterNumber: chapter.chapterNumber, idealPage: 0, totalPages: chapter.totalPages, idealPercent: 0, isManualOverride: false };
  const actualPoint = { chapterNumber: chapter.chapterNumber, page: chapter.actualCompletedPages };
  const idealPoint = { chapterNumber: ideal.chapterNumber, page: ideal.idealPage };
  const actualTotal = cumulativePages(state.chapters, actualPoint);
  const idealTotal = cumulativePages(state.chapters, idealPoint);
  const difference = actualTotal - idealTotal;
  const history = {
    date: today,
    actualChapterNumber: chapter.chapterNumber,
    actualPage: chapter.actualCompletedPages,
    actualChapterTotalPages: chapter.totalPages,
    actualPercent: percent(chapter.actualCompletedPages, chapter.totalPages),
    idealChapterNumber: ideal.chapterNumber,
    idealPage: ideal.idealPage,
    idealChapterTotalPages: ideal.totalPages,
    idealPercent: ideal.idealPercent,
    cumulativeActualPages: actualTotal,
    cumulativeIdealPages: idealTotal,
    differencePages: difference,
    status: paceStatus(difference),
    recordedAt: new Date().toISOString(),
  };
  const existing = state.dailyHistory.findIndex((item) => item.date === today);
  if (existing >= 0) state.dailyHistory[existing] = history;
  else state.dailyHistory.push(history);
  state.settings.hasPendingSync = true;
  state.settings.syncStatus = "pending";
  addEvent(state, { type: "progress", previousProgress: previous, newProgress: actualPoint });
  return state;
}

export function chaptersFromInput(input: Array<{ chapterNumber: number; title: string; totalPages: number; startDate: string; targetEndDate: string }>): MangaState["chapters"] {
  const now = new Date().toISOString();
  return input.map((chapter, order) => ({ ...chapter, id: randomUUID(), actualCompletedPages: 0, status: "not-started", createdAt: now, updatedAt: now, order }));
}
