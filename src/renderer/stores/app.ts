import { create } from "zustand";
import type {
  AppSettings,
  ChapterTotalPagesUpdate,
  LegacyImportPreview,
  OperationResult,
  ProgressPoint,
  WorkspaceState,
} from "../../shared/types";
import type { ChapterInput } from "../../preload/types";

type ViewTab = string | "summary";
interface AppStore {
  workspace?: WorkspaceState;
  viewTab: ViewTab;
  busy: boolean;
  error?: string;
  notice?: string;
  importPreview?: LegacyImportPreview;
  importTargetProjectId?: string;
  load(): Promise<void>;
  selectTab(tab: ViewTab): Promise<void>;
  updateProgress(projectId: string, point: ProgressPoint): Promise<void>;
  updateChapterTotalPages(
    projectId: string,
    update: ChapterTotalPagesUpdate,
  ): Promise<void>;
  sync(projectId: string): Promise<void>;
  syncAll(): Promise<void>;
  createExcel(projectName: string, chapters: ChapterInput[]): Promise<void>;
  previewImport(filePath?: string, projectId?: string): Promise<void>;
  finishImport(defaultTotalPages: number): Promise<void>;
  updateSettings(patch: Partial<AppSettings>): Promise<void>;
  setAlwaysOnTop(enabled: boolean): Promise<void>;
  setLaunchAtStartup(enabled: boolean): Promise<void>;
  toggleCollapsed(): Promise<void>;
  clearMessage(): void;
}

async function perform(
  set: (patch: Partial<AppStore>) => void,
  task: () => Promise<WorkspaceState | OperationResult | void>,
): Promise<void> {
  set({ busy: true, error: undefined, notice: undefined });
  try {
    const result = await task();
    if (result && "projects" in result) set({ workspace: result });
    if (result && "message" in result) set({ notice: result.message });
  } catch (error) {
    set({ error: error instanceof Error ? error.message : String(error) });
  } finally {
    set({ busy: false });
  }
}

export const useAppStore = create<AppStore>((set, get) => ({
  viewTab: "summary",
  busy: false,
  async load() {
    await perform(set, async () => {
      const workspace = await window.mangaSprint.getInitialState();
      set({ viewTab: workspace.activeProjectId ?? "summary" });
      return workspace;
    });
  },
  async selectTab(tab) {
    set({ viewTab: tab });
    if (tab === "summary") return;
    await perform(set, async () => window.mangaSprint.selectProject(tab));
  },
  async updateProgress(projectId, point) {
    await perform(set, async () =>
      window.mangaSprint.updateProgress(projectId, point),
    );
  },
  async updateChapterTotalPages(projectId, update) {
    await perform(set, async () =>
      window.mangaSprint.updateChapterTotalPages(projectId, update),
    );
  },
  async sync(projectId) {
    await perform(set, async () => {
      const result = await window.mangaSprint.syncExcel(projectId);
      set({ workspace: await window.mangaSprint.getInitialState() });
      return result;
    });
  },
  async syncAll() {
    await perform(set, async () => {
      await window.mangaSprint.syncAllExcel();
      const workspace = await window.mangaSprint.getInitialState();
      set({ workspace, notice: "全部 Excel 已同步" });
      return workspace;
    });
  },
  async createExcel(projectName, chapters) {
    await perform(set, async () =>
      window.mangaSprint.createExcelFile({ projectName, chapters }),
    );
  },
  async previewImport(filePath, projectId) {
    const file = filePath ?? (await window.mangaSprint.chooseExcelFile("open"));
    if (!file) return;
    await perform(set, async () => {
      const result = await window.mangaSprint.importLegacyExcel({ path: file });
      if ("sourcePath" in result)
        set({ importPreview: result, importTargetProjectId: projectId });
    });
  },
  async finishImport(defaultTotalPages) {
    const preview = get().importPreview;
    if (!preview) return;
    const totals = Object.fromEntries(
      preview.chapters.map((chapter) => [
        chapter.chapterNumber,
        preview.preserveTotalPages
          ? (chapter.totalPages ?? defaultTotalPages)
          : defaultTotalPages,
      ]),
    );
    await perform(set, async () => {
      const result = await window.mangaSprint.importLegacyExcel({
        path: preview.sourcePath,
        totals,
        projectId: get().importTargetProjectId,
      });
      if ("projects" in result) {
        set({
          workspace: result,
          viewTab: result.activeProjectId ?? "summary",
          importPreview: undefined,
          importTargetProjectId: undefined,
          notice: "漫畫 Excel 已匯入",
        });
        return result;
      }
    });
  },
  async updateSettings(patch) {
    await perform(set, async () => window.mangaSprint.updateSettings(patch));
  },
  async setAlwaysOnTop(enabled) {
    await perform(set, async () => window.mangaSprint.setAlwaysOnTop(enabled));
  },
  async setLaunchAtStartup(enabled) {
    await perform(set, async () =>
      window.mangaSprint.setLaunchAtStartup(enabled),
    );
  },
  async toggleCollapsed() {
    await perform(set, async () => window.mangaSprint.toggleWidgetCollapsed());
  },
  clearMessage() {
    set({ error: undefined, notice: undefined });
  },
}));
