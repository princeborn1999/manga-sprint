import Store from "electron-store";
import { randomUUID } from "node:crypto";
import { stat } from "node:fs/promises";
import path from "node:path";
import { localDate } from "../../shared/date";
import { DEFAULT_PLATFORM_URLS, DEFAULT_TEMPLATES, PLATFORM_TYPES } from "../../shared/post-studio/templates";
import type { PlatformPost, PostProject, PostStudioState } from "../../shared/post-studio/types";
import { safePostStudioState, validatePostProject } from "../../shared/post-studio/validation";

export const defaultPostStudioState: PostStudioState = { version: 1, projects: [], templates: DEFAULT_TEMPLATES, platformUrls: DEFAULT_PLATFORM_URLS };
const store = new Store<{ state: PostStudioState }>({ name: "mangasprint-post-studio", defaults: { state: defaultPostStudioState } });

export function getPostStudioState(): PostStudioState {
  const state = safePostStudioState(store.get("state"), defaultPostStudioState);
  return structuredClone(state);
}

export function savePostStudioState(state: PostStudioState): PostStudioState {
  store.set("state", safePostStudioState(state, defaultPostStudioState));
  return getPostStudioState();
}

function emptyPlatform(platform: PlatformPost["platform"]): PlatformPost {
  return { platform, enabled: true, imageIds: [], title: "", content: "", tags: "", status: "not-prepared", dirty: false };
}

export function createPostProject(chapterNumber = 1): PostProject {
  const now = new Date().toISOString();
  return {
    id: randomUUID(), workTitle: "葛瑞拉之怒", englishWorkTitle: "RAGE GORILLA", chapterNumber,
    chapterTitle: "", englishChapterTitle: "", postType: "new-chapter", shortHighlight: "", readingUrl: "",
    publishDate: localDate(), note: "", images: [],
    platforms: Object.fromEntries(PLATFORM_TYPES.map((platform) => [platform, emptyPlatform(platform)])) as PostProject["platforms"],
    createdAt: now, updatedAt: now,
  };
}

export async function refreshMissingImages(project: PostProject): Promise<PostProject> {
  const images = await Promise.all(project.images.map(async (image) => {
    try { await stat(image.path); return { ...image, missing: false }; } catch { return { ...image, missing: true }; }
  }));
  return { ...project, images };
}

export function upsertPostProject(project: PostProject): PostStudioState {
  validatePostProject(project);
  const state = getPostStudioState();
  const updated = { ...project, updatedAt: new Date().toISOString() };
  const index = state.projects.findIndex((item) => item.id === project.id);
  if (index >= 0) state.projects[index] = updated; else state.projects.unshift(updated);
  return savePostStudioState(state);
}

export function deletePostProject(id: string): PostStudioState {
  if (!id || id.length > 100) throw new Error("發文專案 ID 無效");
  const state = getPostStudioState();
  state.projects = state.projects.filter((project) => project.id !== id);
  return savePostStudioState(state);
}

export function duplicatePostProject(id: string): PostStudioState {
  const state = getPostStudioState();
  const source = state.projects.find((project) => project.id === id);
  if (!source) throw new Error("找不到發文專案");
  const now = new Date().toISOString();
  const copy = structuredClone(source);
  copy.id = randomUUID(); copy.createdAt = now; copy.updatedAt = now;
  for (const platform of PLATFORM_TYPES) { copy.platforms[platform].status = "not-prepared"; copy.platforms[platform].publishRecord = undefined; }
  state.projects.unshift(copy);
  return savePostStudioState(state);
}

export function isSavedImagePath(filePath: string): boolean {
  const resolved = path.resolve(filePath);
  return getPostStudioState().projects.some((project) => project.images.some((image) => path.resolve(image.path) === resolved));
}

