import { create } from "zustand";
import type { PlatformType, PostProject, PostStudioState, PostTemplate, SelectedPostImage } from "../../shared/post-studio/types";

interface PostStudioStore {
  state?: PostStudioState; selected?: PostProject; busy: boolean; error?: string; notice?: string; previews: Record<string, string>;
  load(): Promise<void>; newProject(chapterNumber?: number): Promise<void>; select(id: string): Promise<void>;
  update(project: PostProject): void; save(): Promise<void>; remove(id: string): Promise<void>; duplicate(id: string): Promise<void>;
  addImages(): Promise<void>; attachImages(paths: string[]): Promise<void>; saveTemplates(templates: PostTemplate[]): Promise<void>; copy(text: string): Promise<void>; openPlatform(platform: PlatformType): Promise<void>;
  clearMessage(): void;
}

function message(error: unknown): string { return error instanceof Error ? error.message : String(error); }

async function mergeImages(get: () => PostStudioStore, set: (patch: Partial<PostStudioStore>) => void, selected: SelectedPostImage[]): Promise<void> {
  const project = get().selected; if (!project || !selected.length) return;
  const previews = { ...get().previews }; selected.forEach((image) => { previews[image.id] = image.previewDataUrl; });
  const images = [...project.images, ...selected.map((image) => ({ id: image.id, path: image.path, fileName: image.fileName, extension: image.extension, missing: image.missing }))];
  const ids = selected.map((image) => image.id); const platforms = { ...project.platforms };
  for (const platform of Object.keys(platforms) as PlatformType[]) platforms[platform] = { ...platforms[platform], imageIds: [...platforms[platform].imageIds, ...ids] };
  set({ selected: { ...project, images, platforms }, previews }); await get().save();
}

export const usePostStudioStore = create<PostStudioStore>((set, get) => ({
  busy: false, previews: {},
  async load() {
    set({ busy: true, error: undefined });
    try {
      const state = await window.mangaSprint.getPostStudioState();
      set({ state, selected: state.projects[0], busy: false });
      const previews: Record<string, string> = {};
      for (const project of state.projects) for (const image of project.images.filter((item) => !item.missing)) {
        const data = await window.mangaSprint.getPostImagePreview(image.path); if (data) previews[image.id] = data;
      }
      set({ previews });
    } catch (error) { set({ busy: false, error: message(error) }); }
  },
  async newProject(chapterNumber) { try { set({ selected: await window.mangaSprint.createPostProject(chapterNumber), notice: undefined }); } catch (error) { set({ error: message(error) }); } },
  async select(id) { const project = get().state?.projects.find((item) => item.id === id); if (project) set({ selected: structuredClone(project) }); },
  update(project) { set({ selected: project }); },
  async save() {
    const project = get().selected; if (!project) return;
    set({ busy: true, error: undefined });
    try { const state = await window.mangaSprint.savePostProject(project); set({ state, selected: state.projects.find((item) => item.id === project.id), busy: false, notice: "已自動保存" }); }
    catch (error) { set({ busy: false, error: message(error) }); }
  },
  async remove(id) { try { const state = await window.mangaSprint.deletePostProject(id); set({ state, selected: state.projects[0], notice: "已刪除" }); } catch (error) { set({ error: message(error) }); } },
  async duplicate(id) { try { const state = await window.mangaSprint.duplicatePostProject(id); set({ state, selected: state.projects[0], notice: "已建立副本" }); } catch (error) { set({ error: message(error) }); } },
  async addImages() {
    try {
      const selected: SelectedPostImage[] = await window.mangaSprint.choosePostImages(); if (!selected.length) return;
      await mergeImages(get, set, selected);
    } catch (error) { set({ error: message(error) }); }
  },
  async attachImages(paths) { try { await mergeImages(get, set, await window.mangaSprint.attachPostImages(paths)); } catch (error) { set({ error: message(error) }); } },
  async saveTemplates(templates) { try { const state = await window.mangaSprint.savePostTemplates(templates); set({ state, notice: "模板已保存" }); } catch (error) { set({ error: message(error) }); } },
  async copy(text) { try { await window.mangaSprint.copyPostText(text); set({ notice: "已複製到剪貼簿" }); } catch (error) { set({ error: message(error) }); } },
  async openPlatform(platform) { try { await window.mangaSprint.openPostPlatform(platform); } catch (error) { set({ error: message(error) }); } },
  clearMessage() { set({ notice: undefined, error: undefined }); },
}));
