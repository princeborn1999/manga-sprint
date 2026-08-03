export type PlatformType = "x" | "instagram" | "pixiv" | "mangaPlus";
export type PlatformStatus = "not-prepared" | "ready" | "published" | "skipped" | "failed";
export type PostType = "new-chapter" | "drawing-progress" | "character-introduction" | "manga-panel" | "announcement" | "custom";

export interface PostImage { id: string; path: string; fileName: string; extension: string; missing: boolean }
export interface PublishRecord { publishedAt: string; content: string; imagePaths: string[]; publishedUrl?: string; note?: string }
export interface PlatformPost {
  platform: PlatformType;
  enabled: boolean;
  imageIds: string[];
  title: string;
  content: string;
  tags: string;
  status: PlatformStatus;
  dirty: boolean;
  generatedContent?: string;
  publishedUrl?: string;
  publishRecord?: PublishRecord;
}
export interface PostProject {
  id: string;
  workTitle: string;
  englishWorkTitle: string;
  chapterNumber: number;
  chapterTitle: string;
  englishChapterTitle: string;
  postType: PostType;
  shortHighlight: string;
  readingUrl: string;
  publishDate: string;
  note: string;
  images: PostImage[];
  platforms: Record<PlatformType, PlatformPost>;
  createdAt: string;
  updatedAt: string;
}
export interface PostTemplate { platform: PlatformType; title: string; content: string; tags: string }
export interface PostStudioState {
  version: number;
  projects: PostProject[];
  templates: Record<PlatformType, PostTemplate>;
  platformUrls: Record<PlatformType, string>;
}
export interface SelectedPostImage extends PostImage { previewDataUrl: string }

