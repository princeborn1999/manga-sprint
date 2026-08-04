import type { PostProject } from "./types";

export type SimplePostType = "new-chapter" | "character-introduction" | "cover";

export function captionFor(project: PostProject, type: SimplePostType): string {
  if (type === "character-introduction") return `${project.chapterTitle.trim() || "Dragon"}\n\nRage Gorilla\n\n#manga\n#mangaart\n#ragegorilla`;
  if (type === "cover") return `${project.chapterTitle.trim() || "Volume 1 Cover"}\n\nComing Soon.\n\n#originalmanga\n#manga`;
  return `Chapter ${project.chapterNumber}\n\nRage Gorilla\n\nRead the full chapter.\n\nLink in bio.\n\n#manga\n#originalmanga\n#ragegorilla`;
}

