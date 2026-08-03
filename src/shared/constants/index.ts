export const IPC = {
  getInitialState: "state:get-initial",
  updateProgress: "progress:update",
  updateChapterTotalPages: "chapter:update-total-pages",
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
  openPostStudio: "window:open-post-studio",
  getPostStudioState: "post-studio:get-state",
  createPostProject: "post-studio:create-project",
  savePostProject: "post-studio:save-project",
  deletePostProject: "post-studio:delete-project",
  duplicatePostProject: "post-studio:duplicate-project",
  savePostTemplates: "post-studio:save-templates",
  choosePostImages: "post-studio:choose-images",
  getPostImagePreview: "post-studio:image-preview",
  copyPostText: "post-studio:copy-text",
  openPostPlatform: "post-studio:open-platform",
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
