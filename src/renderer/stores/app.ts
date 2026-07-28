import { create } from "zustand";
import type { AppSettings, ChapterTotalPagesUpdate, LegacyImportPreview, MangaState, OperationResult, ProgressPoint } from "../../shared/types";
import type { ChapterInput } from "../../preload/types";

interface AppStore {
  state?: MangaState;
  busy: boolean;
  error?: string;
  notice?: string;
  importPreview?: LegacyImportPreview;
  load(): Promise<void>;
  updateProgress(point: ProgressPoint): Promise<void>;
  updateChapterTotalPages(update: ChapterTotalPagesUpdate): Promise<void>;
  sync(): Promise<void>;
  createExcel(projectName: string, chapters: ChapterInput[]): Promise<void>;
  previewImport(filePath?: string): Promise<void>;
  finishImport(defaultTotalPages: number): Promise<void>;
  updateSettings(patch: Partial<AppSettings>): Promise<void>;
  setAlwaysOnTop(enabled: boolean): Promise<void>;
  setLaunchAtStartup(enabled: boolean): Promise<void>;
  toggleCollapsed(): Promise<void>;
  clearMessage(): void;
}

async function perform(set: (patch: Partial<AppStore>) => void, task: () => Promise<MangaState | OperationResult | void>): Promise<void> {
  set({ busy: true, error: undefined, notice: undefined });
  try {
    const result = await task();
    if (result && "settings" in result) set({ state: result });
    if (result && "message" in result) set({ notice: result.message });
  } catch (error) { set({ error: error instanceof Error ? error.message : String(error) }); }
  finally { set({ busy: false }); }
}

export const useAppStore = create<AppStore>((set, get) => ({
  busy: false,
  async load() { await perform(set, async () => window.mangaSprint.getInitialState()); },
  async updateProgress(point) { await perform(set, async () => window.mangaSprint.updateProgress(point)); },
  async updateChapterTotalPages(update) { await perform(set, async () => window.mangaSprint.updateChapterTotalPages(update)); },
  async sync() { await perform(set, async () => { const result = await window.mangaSprint.syncExcel(); const state = await window.mangaSprint.getInitialState(); set({ state }); return result; }); },
  async createExcel(projectName, chapters) { await perform(set, async () => window.mangaSprint.createExcelFile({ projectName, chapters })); },
  async previewImport(filePath) {
    const file = filePath ?? await window.mangaSprint.chooseExcelFile("open");
    if (!file) return;
    await perform(set, async () => {
      const result = await window.mangaSprint.importLegacyExcel({ path: file });
      if ("sourcePath" in result) set({ importPreview: result });
    });
  },
  async finishImport(defaultTotalPages) {
    const preview = get().importPreview;
    if (!preview) return;
    const totals = Object.fromEntries(preview.chapters.map((chapter) => [
      chapter.chapterNumber,
      preview.preserveTotalPages ? chapter.totalPages ?? defaultTotalPages : defaultTotalPages,
    ]));
    await perform(set, async () => {
      const result = await window.mangaSprint.importLegacyExcel({ path: preview.sourcePath, totals });
      if ("settings" in result) { set({ state: result, importPreview: undefined, notice: "舊 Excel 已匯入，新檔已建立" }); return result; }
    });
  },
  async updateSettings(patch) { await perform(set, async () => window.mangaSprint.updateSettings(patch)); },
  async setAlwaysOnTop(enabled) { await perform(set, async () => window.mangaSprint.setAlwaysOnTop(enabled)); },
  async setLaunchAtStartup(enabled) { await perform(set, async () => window.mangaSprint.setLaunchAtStartup(enabled)); },
  async toggleCollapsed() { await perform(set, async () => window.mangaSprint.toggleWidgetCollapsed()); },
  clearMessage() { set({ error: undefined, notice: undefined }); },
}));
