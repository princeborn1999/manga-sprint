import type { PostProject, PostStudioState, PlatformType } from "./types";
import { PLATFORM_TYPES } from "./templates";

export function validatePostProject(project: PostProject): void {
  if (!project.id || !project.workTitle.trim() || !project.englishWorkTitle.trim()) throw new Error("作品名稱不可留空");
  if (!Number.isInteger(project.chapterNumber) || project.chapterNumber < 0 || project.chapterNumber > 100_000) throw new Error("Chapter 編號無效");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(project.publishDate)) throw new Error("發布日期無效");
  if (project.images.some((image) => !image.path || ![".jpg", ".jpeg", ".png", ".webp"].includes(image.extension.toLowerCase()))) throw new Error("圖片格式無效");
  for (const platform of PLATFORM_TYPES) {
    const post = project.platforms[platform];
    if (!post || post.platform !== platform) throw new Error(`平台資料無效：${platform}`);
  }
}

export function safePostStudioState(input: unknown, fallback: PostStudioState): PostStudioState {
  if (!input || typeof input !== "object") return structuredClone(fallback);
  const candidate = input as Partial<PostStudioState>;
  const projects = Array.isArray(candidate.projects) ? candidate.projects.filter((project): project is PostProject => {
    try { validatePostProject(project as PostProject); return true; } catch { return false; }
  }) : [];
  const templates = { ...fallback.templates, ...(candidate.templates ?? {}) };
  const platformUrls = { ...fallback.platformUrls, ...(candidate.platformUrls ?? {}) } as Record<PlatformType, string>;
  return { version: 1, projects, templates, platformUrls };
}

