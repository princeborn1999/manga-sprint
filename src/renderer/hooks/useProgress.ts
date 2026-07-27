import type { Chapter, ProgressPoint } from "../../shared/types";
import { currentChapter } from "../../shared/calculations";

export function moveProgress(chapters: Chapter[], delta: -1 | 1): ProgressPoint | undefined {
  const ordered = [...chapters].sort((a, b) => a.order - b.order);
  const chapter = currentChapter(ordered);
  if (!chapter) return undefined;
  const index = ordered.findIndex((item) => item.id === chapter.id);
  if (delta === 1) {
    if (chapter.actualCompletedPages < chapter.totalPages) return { chapterNumber: chapter.chapterNumber, page: chapter.actualCompletedPages + 1 };
    const next = ordered[index + 1];
    return next ? { chapterNumber: next.chapterNumber, page: 1 } : undefined;
  }
  if (chapter.actualCompletedPages > 0) return { chapterNumber: chapter.chapterNumber, page: chapter.actualCompletedPages - 1 };
  const previous = ordered[index - 1];
  return previous ? { chapterNumber: previous.chapterNumber, page: Math.max(0, previous.totalPages - 1) } : undefined;
}
