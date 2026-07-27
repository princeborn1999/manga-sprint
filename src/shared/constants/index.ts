export const IPC = {
  getInitialState: "state:get-initial",
  updateProgress: "progress:update",
  chooseExcelFile: "excel:choose",
  createExcelFile: "excel:create",
  importLegacyExcel: "excel:import-legacy",
  syncExcel: "excel:sync",
  createBackup: "excel:backup",
  updateSettings: "settings:update",
  setAlwaysOnTop: "window:always-on-top",
  setLaunchAtStartup: "app:launch-at-startup",
  toggleWidgetCollapsed: "window:toggle-collapsed",
  horizontalDragStart: "window:horizontal-drag-start",
  horizontalDragMove: "window:horizontal-drag-move",
  horizontalDragEnd: "window:horizontal-drag-end",
  openSettings: "window:open-settings",
  hideWindow: "window:hide",
  exitApp: "app:exit",
} as const;

export const EXCEL_SCHEMA_VERSION = 1;
export const WIDGET_WIDTH = 268;
export const WIDGET_COLLAPSED_WIDTH = 268;
export const WIDGET_HEIGHT = 390;
export const WIDGET_COLLAPSED_HEIGHT = 34;
export const EXPANDED_WIDGET_OPACITY = 0.95;
export const MAX_EVENTS = 500;
export const BACKUP_RETENTION_DAYS = 30;
