import { app, dialog, ipcMain } from "electron";
import { randomUUID } from "node:crypto";
import path from "node:path";
import type {
  AppSettings,
  LegacyImportPreview,
  MangaProject,
  WorkspaceState,
} from "../../shared/types";
import type { ChapterInput, ImportRequest } from "../../preload/types";
import { EXPANDED_WIDGET_OPACITY, IPC } from "../../shared/constants";
import { buildDailyPlan } from "../../shared/calculations";
import { validateChapter, validateSettings } from "../../shared/validation";
import {
  completeLegacyImport,
  createBackup,
  importLegacy,
  syncWorkbook,
} from "../excel";
import {
  addEvent,
  createEmptyMangaState,
  findProject,
  getState,
  saveState,
} from "../storage";
import {
  applyChapterTotalPages,
  applyProgress,
  chaptersFromInput,
} from "../services/progress";
import {
  applyWidgetLayout,
  endHorizontalDrag,
  getWidget,
  hideWidget,
  moveHorizontalDrag,
  openSettings,
  quitApp,
  startHorizontalDrag,
} from "../windows";

function safeError(error: unknown): Error {
  return new Error(error instanceof Error ? error.message : String(error));
}

async function syncProject(
  projectId: string,
): Promise<Awaited<ReturnType<typeof syncWorkbook>>> {
  const workspace = getState();
  const project = findProject(workspace, projectId);
  const state = project.state;
  if (!state.settings.excelFilePath) throw new Error("尚未設定 Excel 檔案");
  try {
    const result = await syncWorkbook(state, state.settings.excelFilePath);
    state.settings.hasPendingSync = false;
    state.settings.syncStatus = "synced";
    project.updatedAt = new Date().toISOString();
    addEvent(state, { type: "sync", syncResult: "synced" });
    saveState(workspace);
    return result;
  } catch (error) {
    state.settings.hasPendingSync = true;
    state.settings.syncStatus = "error";
    addEvent(state, {
      type: "sync",
      syncResult: "error",
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    saveState(workspace);
    throw error;
  }
}

export async function syncAll(): Promise<void> {
  const ids = getState()
    .projects.filter((project) => project.state.settings.excelFilePath)
    .map((project) => project.id);
  const results = await Promise.allSettled(ids.map((id) => syncProject(id)));
  if (results.some((result) => result.status === "rejected"))
    throw new Error("部分漫畫 Excel 同步失敗，進度仍保存在 App");
}

function newProject(state: MangaProject["state"]): MangaProject {
  const now = new Date().toISOString();
  return { id: randomUUID(), state, createdAt: now, updatedAt: now };
}

export function registerIpc(): void {
  ipcMain.handle(IPC.getInitialState, () => getState());
  ipcMain.handle(IPC.selectProject, (_event, projectId: string) => {
    const workspace = getState();
    findProject(workspace, projectId);
    workspace.activeProjectId = projectId;
    return saveState(workspace);
  });
  ipcMain.handle(
    IPC.updateProgress,
    async (
      _event,
      request: {
        projectId: string;
        point: Parameters<typeof applyProgress>[1];
      },
    ) => {
      try {
        const workspace = getState();
        const project = findProject(workspace, request.projectId);
        project.state = applyProgress(project.state, request.point);
        project.updatedAt = new Date().toISOString();
        saveState(workspace);
        if (project.state.settings.excelFilePath)
          void syncProject(project.id).catch(() => undefined);
        return getState();
      } catch (error) {
        throw safeError(error);
      }
    },
  );
  ipcMain.handle(
    IPC.updateChapterTotalPages,
    async (
      _event,
      request: {
        projectId: string;
        update: Parameters<typeof applyChapterTotalPages>[1];
      },
    ) => {
      try {
        const workspace = getState();
        const project = findProject(workspace, request.projectId);
        project.state = applyChapterTotalPages(project.state, request.update);
        project.updatedAt = new Date().toISOString();
        saveState(workspace);
        if (project.state.settings.excelFilePath)
          void syncProject(project.id).catch(() => undefined);
        return getState();
      } catch (error) {
        throw safeError(error);
      }
    },
  );
  ipcMain.handle(IPC.chooseExcelFile, async (_event, mode: "open" | "save") => {
    if (mode === "save") {
      const result = await dialog.showSaveDialog({
        title: "建立 MangaSprint Excel",
        defaultPath: "MangaSprint.xlsx",
        filters: [{ name: "Excel", extensions: ["xlsx"] }],
      });
      return result.canceled ? null : result.filePath;
    }
    const result = await dialog.showOpenDialog({
      title: "選擇 Excel",
      properties: ["openFile"],
      filters: [{ name: "Excel", extensions: ["xlsx"] }],
    });
    return result.canceled ? null : result.filePaths[0];
  });
  ipcMain.handle(
    IPC.createExcelFile,
    async (
      _event,
      payload?: {
        path?: string;
        projectName?: string;
        chapters?: ChapterInput[];
      },
    ) => {
      try {
        const workspace = getState();
        const state = createEmptyMangaState();
        if (payload?.chapters?.length) {
          state.chapters = chaptersFromInput(payload.chapters);
          state.chapters.forEach(validateChapter);
          state.dailyPlan = buildDailyPlan(state.chapters);
        }
        if (payload?.projectName)
          state.settings.projectName = payload.projectName;
        let filePath = payload?.path;
        if (!filePath) {
          const result = await dialog.showSaveDialog({
            title: "建立 MangaSprint Excel",
            defaultPath: `${state.settings.projectName}.xlsx`,
            filters: [{ name: "Excel", extensions: ["xlsx"] }],
          });
          if (result.canceled || !result.filePath) return workspace;
          filePath = result.filePath;
        }
        if (path.extname(filePath).toLowerCase() !== ".xlsx")
          filePath += ".xlsx";
        state.settings.excelFilePath = filePath;
        state.settings.hasPendingSync = true;
        const project = newProject(state);
        workspace.projects.push(project);
        workspace.activeProjectId = project.id;
        saveState(workspace);
        await syncProject(project.id);
        return getState();
      } catch (error) {
        throw safeError(error);
      }
    },
  );
  ipcMain.handle(
    IPC.importLegacyExcel,
    async (
      _event,
      request: ImportRequest,
    ): Promise<LegacyImportPreview | WorkspaceState> => {
      try {
        const preview = importLegacy(request.path);
        if (!request.totals) return preview;
        const workspace = getState();
        const state = request.projectId
          ? findProject(workspace, request.projectId).state
          : createEmptyMangaState();
        state.chapters = completeLegacyImport(preview, request.totals);
        state.dailyPlan = buildDailyPlan(state.chapters);
        state.dailyHistory = [];
        state.settings.projectName = preview.projectName;
        state.settings.excelFilePath = path.join(
          path.dirname(preview.sourcePath),
          `${preview.projectName}-MangaSprint.xlsx`,
        );
        state.settings.hasPendingSync = true;
        state.settings.syncStatus = "pending";
        addEvent(state, { type: "import" });
        let project: MangaProject;
        if (request.projectId) {
          project = findProject(workspace, request.projectId);
          project.state = state;
          project.updatedAt = new Date().toISOString();
        } else {
          project = newProject(state);
          workspace.projects.push(project);
        }
        workspace.activeProjectId = project.id;
        saveState(workspace);
        await syncProject(project.id);
        return getState();
      } catch (error) {
        throw safeError(error);
      }
    },
  );
  ipcMain.handle(IPC.syncExcel, (_event, projectId: string) =>
    syncProject(projectId),
  );
  ipcMain.handle(IPC.syncAllExcel, () => syncAll());
  ipcMain.handle(IPC.createBackup, async (_event, projectId: string) => {
    const project = findProject(getState(), projectId);
    const filePath = project.state.settings.excelFilePath;
    if (!filePath) throw new Error("尚未設定 Excel 檔案");
    const backup = await createBackup(filePath);
    return {
      ok: true,
      message: backup ? "備份完成" : "正式 Excel 尚不存在",
      path: backup,
    };
  });
  ipcMain.handle(IPC.updateSettings, (_event, patch: Partial<AppSettings>) => {
    validateSettings(patch);
    const workspace = getState();
    workspace.settings = { ...workspace.settings, ...patch };
    saveState(workspace);
    if (patch.opacity !== undefined)
      getWidget()?.setOpacity(
        workspace.settings.widgetCollapsed
          ? patch.opacity
          : EXPANDED_WIDGET_OPACITY,
      );
    if (patch.dockPosition !== undefined || patch.widgetCollapsed !== undefined)
      applyWidgetLayout(workspace);
    return workspace;
  });
  ipcMain.handle(IPC.setAlwaysOnTop, (_event, enabled: boolean) => {
    if (typeof enabled !== "boolean") throw new Error("設定值無效");
    const workspace = getState();
    workspace.settings.alwaysOnTop = enabled;
    saveState(workspace);
    getWidget()?.setAlwaysOnTop(enabled);
    return workspace;
  });
  ipcMain.handle(IPC.setLaunchAtStartup, (_event, enabled: boolean) => {
    if (typeof enabled !== "boolean") throw new Error("設定值無效");
    app.setLoginItemSettings({ openAtLogin: enabled, path: process.execPath });
    const workspace = getState();
    workspace.settings.launchAtStartup = enabled;
    saveState(workspace);
    return workspace;
  });
  ipcMain.handle(IPC.toggleWidgetCollapsed, () => {
    const workspace = getState();
    workspace.settings.widgetCollapsed = !workspace.settings.widgetCollapsed;
    saveState(workspace);
    applyWidgetLayout(workspace);
    return workspace;
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
    const workspace = getState();
    workspace.settings.windowPosition = position;
    workspace.settings.dockPosition = "top-free";
    saveState(workspace);
  });
  ipcMain.handle(IPC.openSettings, () => openSettings());
  ipcMain.handle(IPC.hideWindow, () => hideWidget());
  ipcMain.handle(IPC.exitApp, () => quitApp());
}
