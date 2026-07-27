import { contextBridge, ipcRenderer, webUtils } from "electron";
import { IPC } from "../shared/constants";
import type { MangaSprintApi } from "./types";

const api: MangaSprintApi = {
  getInitialState: () => ipcRenderer.invoke(IPC.getInitialState),
  updateProgress: (point) => ipcRenderer.invoke(IPC.updateProgress, point),
  updateChapterTotalPages: (update) => ipcRenderer.invoke(IPC.updateChapterTotalPages, update),
  chooseExcelFile: (mode) => ipcRenderer.invoke(IPC.chooseExcelFile, mode),
  getPathForFile: (file) => webUtils.getPathForFile(file),
  createExcelFile: (payload) => ipcRenderer.invoke(IPC.createExcelFile, payload),
  importLegacyExcel: (request) => ipcRenderer.invoke(IPC.importLegacyExcel, request),
  syncExcel: () => ipcRenderer.invoke(IPC.syncExcel),
  createBackup: () => ipcRenderer.invoke(IPC.createBackup),
  updateSettings: (settings) => ipcRenderer.invoke(IPC.updateSettings, settings),
  setAlwaysOnTop: (enabled) => ipcRenderer.invoke(IPC.setAlwaysOnTop, enabled),
  setLaunchAtStartup: (enabled) => ipcRenderer.invoke(IPC.setLaunchAtStartup, enabled),
  toggleWidgetCollapsed: () => ipcRenderer.invoke(IPC.toggleWidgetCollapsed),
  horizontalDragStart: (screenX) => ipcRenderer.send(IPC.horizontalDragStart, screenX),
  horizontalDragMove: (screenX) => ipcRenderer.send(IPC.horizontalDragMove, screenX),
  horizontalDragEnd: () => ipcRenderer.send(IPC.horizontalDragEnd),
  openSettings: () => ipcRenderer.invoke(IPC.openSettings),
  hideWindow: () => ipcRenderer.invoke(IPC.hideWindow),
  exitApp: () => ipcRenderer.invoke(IPC.exitApp),
};

contextBridge.exposeInMainWorld("mangaSprint", api);
