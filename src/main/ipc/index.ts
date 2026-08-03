import { app, clipboard, dialog, ipcMain, shell } from "electron";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { AppSettings, ChapterTotalPagesUpdate, LegacyImportPreview, MangaState, ProgressPoint } from "../../shared/types";
import type { ChapterInput, ImportRequest } from "../../preload/types";
import type { PlatformType, PostProject, PostTemplate, SelectedPostImage } from "../../shared/post-studio/types";
import { PLATFORM_TYPES } from "../../shared/post-studio/templates";
import { EXPANDED_WIDGET_OPACITY, IPC } from "../../shared/constants";
import { buildDailyPlan } from "../../shared/calculations";
import { validateChapter, validateSettings } from "../../shared/validation";
import { completeLegacyImport, createBackup, importLegacy, syncWorkbook } from "../excel";
import { addEvent, getState, saveState } from "../storage";
import { applyChapterTotalPages, applyProgress, chaptersFromInput } from "../services/progress";
import { applyWidgetLayout, endHorizontalDrag, getWidget, hideWidget, moveHorizontalDrag, openSettings, quitApp, startHorizontalDrag } from "../windows";
import { openPostStudio } from "../windows";
import { createPostProject, deletePostProject, duplicatePostProject, getPostStudioState, isSavedImagePath, savePostStudioState, upsertPostProject } from "../post-studio/storage";

function safeError(error: unknown): Error {
  return new Error(error instanceof Error ? error.message : String(error));
}

async function syncCurrent(): Promise<ReturnType<typeof syncWorkbook> extends Promise<infer R> ? R : never> {
  const state = getState();
  if (!state.settings.excelFilePath) throw new Error("尚未設定 Excel 檔案");
  try {
    const result = await syncWorkbook(state, state.settings.excelFilePath);
    state.settings.hasPendingSync = false;
    state.settings.syncStatus = "synced";
    addEvent(state, { type: "sync", syncResult: "synced" });
    saveState(state);
    return result;
  } catch (error) {
    state.settings.hasPendingSync = true;
    state.settings.syncStatus = "error";
    addEvent(state, { type: "sync", syncResult: "error", errorMessage: error instanceof Error ? error.message : String(error) });
    saveState(state);
    throw error;
  }
}

export function registerIpc(): void {
  ipcMain.handle(IPC.getInitialState, () => getState());
  ipcMain.handle(IPC.updateProgress, async (_event, point: ProgressPoint) => {
    try {
      const state = saveState(applyProgress(getState(), point));
      if (state.settings.excelFilePath) void syncCurrent().catch(() => undefined);
      return state;
    } catch (error) { throw safeError(error); }
  });
  ipcMain.handle(IPC.updateChapterTotalPages, async (_event, update: ChapterTotalPagesUpdate) => {
    try {
      const state = saveState(applyChapterTotalPages(getState(), update));
      if (state.settings.excelFilePath) void syncCurrent().catch(() => undefined);
      return state;
    } catch (error) { throw safeError(error); }
  });
  ipcMain.handle(IPC.chooseExcelFile, async (_event, mode: "open" | "save") => {
    if (mode === "save") {
      const result = await dialog.showSaveDialog({ title: "建立 MangaSprint Excel", defaultPath: "MangaSprint.xlsx", filters: [{ name: "Excel", extensions: ["xlsx"] }] });
      return result.canceled ? null : result.filePath;
    }
    const result = await dialog.showOpenDialog({ title: "選擇 Excel", properties: ["openFile"], filters: [{ name: "Excel", extensions: ["xlsx"] }] });
    return result.canceled ? null : result.filePaths[0];
  });
  ipcMain.handle(IPC.createExcelFile, async (_event, payload?: { path?: string; projectName?: string; chapters?: ChapterInput[] }) => {
    try {
      let state = getState();
      if (payload?.chapters?.length) {
        state.chapters = chaptersFromInput(payload.chapters);
        state.chapters.forEach(validateChapter);
        state.dailyPlan = buildDailyPlan(state.chapters);
        state.dailyHistory = [];
      }
      if (payload?.projectName) state.settings.projectName = payload.projectName;
      let filePath = payload?.path;
      if (!filePath) {
        const result = await dialog.showSaveDialog({ title: "建立 MangaSprint Excel", defaultPath: `${state.settings.projectName}.xlsx`, filters: [{ name: "Excel", extensions: ["xlsx"] }] });
        if (result.canceled || !result.filePath) return state;
        filePath = result.filePath;
      }
      if (path.extname(filePath).toLowerCase() !== ".xlsx") filePath += ".xlsx";
      state.settings.excelFilePath = filePath;
      state.settings.hasPendingSync = true;
      state = saveState(state);
      await syncCurrent();
      return getState();
    } catch (error) { throw safeError(error); }
  });
  ipcMain.handle(IPC.importLegacyExcel, async (_event, request: ImportRequest): Promise<LegacyImportPreview | MangaState> => {
    try {
      const preview = importLegacy(request.path);
      if (!request.totals) return preview;
      const state = getState();
      state.chapters = completeLegacyImport(preview, request.totals);
      state.dailyPlan = buildDailyPlan(state.chapters);
      state.dailyHistory = [];
      state.settings.projectName = preview.projectName;
      state.settings.excelFilePath = path.join(path.dirname(preview.sourcePath), `${preview.projectName}-MangaSprint.xlsx`);
      state.settings.hasPendingSync = true;
      addEvent(state, { type: "import" });
      saveState(state);
      await syncCurrent();
      return getState();
    } catch (error) { throw safeError(error); }
  });
  ipcMain.handle(IPC.syncExcel, () => syncCurrent());
  ipcMain.handle(IPC.createBackup, async () => {
    const state = getState();
    if (!state.settings.excelFilePath) throw new Error("尚未設定 Excel 檔案");
    const backup = await createBackup(state.settings.excelFilePath);
    return { ok: true, message: backup ? "備份完成" : "正式 Excel 尚不存在", path: backup };
  });
  ipcMain.handle(IPC.updateSettings, (_event, patch: Partial<AppSettings>) => {
    validateSettings(patch);
    const state = getState();
    state.settings = { ...state.settings, ...patch };
    addEvent(state, { type: "settings" });
    saveState(state);
    if (patch.opacity !== undefined) getWidget()?.setOpacity(state.settings.widgetCollapsed ? patch.opacity : EXPANDED_WIDGET_OPACITY);
    if (patch.dockPosition !== undefined || patch.widgetCollapsed !== undefined) applyWidgetLayout(state);
    return state;
  });
  ipcMain.handle(IPC.setAlwaysOnTop, (_event, enabled: boolean) => {
    if (typeof enabled !== "boolean") throw new Error("設定值無效");
    const state = getState();
    state.settings.alwaysOnTop = enabled;
    saveState(state);
    getWidget()?.setAlwaysOnTop(enabled);
    return state;
  });
  ipcMain.handle(IPC.setLaunchAtStartup, (_event, enabled: boolean) => {
    if (typeof enabled !== "boolean") throw new Error("設定值無效");
    app.setLoginItemSettings({ openAtLogin: enabled, path: process.execPath });
    const state = getState();
    state.settings.launchAtStartup = enabled;
    saveState(state);
    return state;
  });
  ipcMain.handle(IPC.toggleWidgetCollapsed, () => {
    const state = getState();
    state.settings.widgetCollapsed = !state.settings.widgetCollapsed;
    saveState(state);
    applyWidgetLayout(state);
    return state;
  });
  ipcMain.on(IPC.horizontalDragStart, (_event, screenX: number) => {
    if (Number.isFinite(screenX)) startHorizontalDrag(screenX);
  });
  ipcMain.on(IPC.horizontalDragMove, (_event, screenX: number) => {
    if (Number.isFinite(screenX)) moveHorizontalDrag(screenX);
  });
  ipcMain.on(IPC.horizontalDragEnd, () => {
    const position = endHorizontalDrag();
    if (!position) return;
    const state = getState();
    state.settings.windowPosition = position;
    state.settings.dockPosition = "top-free";
    saveState(state);
  });
  ipcMain.handle(IPC.openSettings, () => openSettings());
  ipcMain.handle(IPC.openPostStudio, () => openPostStudio());
  ipcMain.handle(IPC.getPostStudioState, async () => {
    const state = getPostStudioState();
    state.projects = await Promise.all(state.projects.map(async (project) => ({ ...project, images: await Promise.all(project.images.map(async (image) => {
      try { await readFile(image.path); return { ...image, missing: false }; } catch { return { ...image, missing: true }; }
    })) })));
    return state;
  });
  ipcMain.handle(IPC.createPostProject, (_event, chapterNumber?: number) => createPostProject(Number.isInteger(chapterNumber) ? chapterNumber : 1));
  ipcMain.handle(IPC.savePostProject, (_event, project: PostProject) => upsertPostProject(project));
  ipcMain.handle(IPC.deletePostProject, (_event, id: string) => deletePostProject(id));
  ipcMain.handle(IPC.duplicatePostProject, (_event, id: string) => duplicatePostProject(id));
  ipcMain.handle(IPC.savePostTemplates, (_event, templates: PostTemplate[]) => {
    if (!Array.isArray(templates) || templates.length !== PLATFORM_TYPES.length) throw new Error("模板資料無效");
    const state = getPostStudioState();
    for (const template of templates) {
      if (!PLATFORM_TYPES.includes(template.platform) || [template.title, template.content, template.tags].some((value) => typeof value !== "string" || value.length > 20_000)) throw new Error("模板資料無效");
      state.templates[template.platform] = template;
    }
    return savePostStudioState(state);
  });
  ipcMain.handle(IPC.choosePostImages, async (): Promise<SelectedPostImage[]> => {
    const result = await dialog.showOpenDialog({ title: "選擇發文圖片", properties: ["openFile", "multiSelections"], filters: [{ name: "Images", extensions: ["jpg", "jpeg", "png", "webp"] }] });
    if (result.canceled) return [];
    return Promise.all(result.filePaths.map(async (filePath) => {
      const extension = path.extname(filePath).toLowerCase();
      if (![".jpg", ".jpeg", ".png", ".webp"].includes(extension)) throw new Error("圖片格式無效");
      const bytes = await readFile(filePath);
      const mime = extension === ".png" ? "image/png" : extension === ".webp" ? "image/webp" : "image/jpeg";
      return { id: crypto.randomUUID(), path: filePath, fileName: path.basename(filePath), extension, missing: false, previewDataUrl: `data:${mime};base64,${bytes.toString("base64")}` };
    }));
  });
  ipcMain.handle(IPC.getPostImagePreview, async (_event, filePath: string) => {
    if (typeof filePath !== "string" || !isSavedImagePath(filePath)) return null;
    const extension = path.extname(filePath).toLowerCase();
    if (![".jpg", ".jpeg", ".png", ".webp"].includes(extension)) return null;
    try {
      const bytes = await readFile(filePath);
      const mime = extension === ".png" ? "image/png" : extension === ".webp" ? "image/webp" : "image/jpeg";
      return `data:${mime};base64,${bytes.toString("base64")}`;
    } catch { return null; }
  });
  ipcMain.handle(IPC.copyPostText, (_event, text: string) => {
    if (typeof text !== "string" || text.length > 100_000) throw new Error("複製內容無效");
    clipboard.writeText(text);
  });
  ipcMain.handle(IPC.openPostPlatform, async (_event, platform: PlatformType) => {
    if (!PLATFORM_TYPES.includes(platform)) throw new Error("平台無效");
    const url = getPostStudioState().platformUrls[platform];
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") throw new Error("平台網址不安全");
    await shell.openExternal(url);
  });
  ipcMain.handle(IPC.hideWindow, () => hideWidget());
  ipcMain.handle(IPC.exitApp, () => quitApp());
}

export { syncCurrent };
