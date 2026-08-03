import type { Chapter, ProgressPoint } from "../../shared/types";
import { currentChapter } from "../../shared/calculations";

export function moveProgress(chapters: Chapter[], delta: -1 | 1): ProgressPoint | undefined {
  const ordered = [...chapters].sort((a, b) => a.order - b.order);
  const chapter = currentChapter(ordered);
  if (!chapter) return undefined;
  const index = ordered.findIndex((item) => item.id === chapter.id);
  if (delta === 1) {
    if (chapter.actualCompletedPages < chapter.totalPages) return { chapterNumber: chapter.chapterNumber, page: chapter.actualCompletedPages + 1, dialogueComplete: false };
    if (!chapter.dialogueComplete) return { chapterNumber: chapter.chapterNumber, page: chapter.totalPages, dialogueComplete: true };
    const next = ordered[index + 1];
    return next ? { chapterNumber: next.chapterNumber, page: 1, dialogueComplete: false } : undefined;
  }
  if (chapter.dialogueComplete) return { chapterNumber: chapter.chapterNumber, page: chapter.totalPages, dialogueComplete: false };
  if (chapter.actualCompletedPages > 0) return { chapterNumber: chapter.chapterNumber, page: chapter.actualCompletedPages - 1, dialogueComplete: false };
  const previous = ordered[index - 1];
  return previous ? { chapterNumber: previous.chapterNumber, page: previous.totalPages, dialogueComplete: false } : undefined;
}
