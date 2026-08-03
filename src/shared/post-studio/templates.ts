import type { PlatformPost, PlatformType, PostProject, PostTemplate } from "./types";

export const PLATFORM_LABELS: Record<PlatformType, string> = { x: "X / Twitter", instagram: "Instagram", pixiv: "Pixiv", mangaPlus: "MANGA Plus Creators" };
export const PLATFORM_TYPES: PlatformType[] = ["x", "instagram", "pixiv", "mangaPlus"];
export const TEMPLATE_VARIABLES = ["workTitle", "englishWorkTitle", "chapterNumber", "chapterTitle", "englishChapterTitle", "shortHighlight", "readingUrl", "publishDate"] as const;

export const DEFAULT_TEMPLATES: Record<PlatformType, PostTemplate> = {
  x: { platform: "x", title: "", content: "{{englishWorkTitle}}\n\nChapter {{chapterNumber}} is now available.\n\n{{shortHighlight}}\n\nRead the full chapter:\n{{readingUrl}}", tags: "#RageGorilla #OriginalManga" },
  instagram: { platform: "instagram", title: "", content: "{{englishWorkTitle}} — Chapter {{chapterNumber}}\n\n{{shortHighlight}}\n\nThe new chapter is now available.\n\nRead the full chapter through the link in bio.", tags: "#RageGorilla #OriginalManga #MangaArtist #BlackAndWhiteManga #ActionManga" },
  pixiv: { platform: "pixiv", title: "{{englishWorkTitle}} — Chapter {{chapterNumber}}", content: "{{shortHighlight}}\n\nRead the full chapter and follow the latest updates:\n{{readingUrl}}", tags: "Original\nManga\nAction\nBattle\nBlack and White\nRage Gorilla" },
  mangaPlus: { platform: "mangaPlus", title: "{{englishWorkTitle}} — Chapter {{chapterNumber}}", content: "Episode: Chapter {{chapterNumber}}\n\n{{shortHighlight}}\n\nLanguage: English", tags: "" },
};

export const DEFAULT_PLATFORM_URLS: Record<PlatformType, string> = {
  x: "https://x.com/compose/post",
  instagram: "https://www.instagram.com/",
  pixiv: "https://www.pixiv.net/",
  mangaPlus: "https://mangaplus-creators.jp/",
};

export function renderTemplate(template: string, project: Pick<PostProject, typeof TEMPLATE_VARIABLES[number]>): string {
  const rendered = template.replace(/{{\s*([a-zA-Z]+)\s*}}/g, (_match, key: string) => {
    if (!TEMPLATE_VARIABLES.includes(key as typeof TEMPLATE_VARIABLES[number])) return "";
    return String(project[key as typeof TEMPLATE_VARIABLES[number]] ?? "").trim();
  });
  return rendered.split("\n").map((line) => line.trimEnd()).filter((line, index, lines) => line !== "" || (index > 0 && lines[index - 1] !== "")).join("\n").trim();
}

export function generatePlatformPost(project: PostProject, platform: PlatformType, template: PostTemplate): PlatformPost {
  const previous = project.platforms[platform];
  const title = renderTemplate(template.title, project);
  const content = renderTemplate(template.content, project);
  const tags = renderTemplate(template.tags, project);
  return { ...previous, platform, title, content, tags, dirty: false, generatedContent: combinePlatformContent(platform, { ...previous, title, content, tags }) };
}

export function combinePlatformContent(platform: PlatformType, post: Pick<PlatformPost, "title" | "content" | "tags">): string {
  if (platform === "pixiv") return [`Title:\n${post.title}`, `Description:\n${post.content}`, `Tags:\n${post.tags}`].filter((part) => !part.endsWith("\n")).join("\n\n");
  if (platform === "mangaPlus") return [`Title:\n${post.title}`, post.content].filter(Boolean).join("\n\n");
  return [post.title, post.content, post.tags].filter((value) => value.trim()).join("\n\n");
}

