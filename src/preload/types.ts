import type {
  AppSettings,
  ChapterTotalPagesUpdate,
  LegacyImportPreview,
  OperationResult,
  ProgressPoint,
  WorkspaceState,
} from "../shared/types";

export interface ChapterInput {
  chapterNumber: number;
  title: string;
  totalPages: number;
  startDate: string;
  targetEndDate: string;
}
export interface ImportRequest {
  path: string;
  totals?: Record<number, number>;
  projectId?: string;
}

export interface MangaSprintApi {
  getInitialState(): Promise<WorkspaceState>;
  selectProject(projectId: string): Promise<WorkspaceState>;
  updateProgress(
    projectId: string,
    point: ProgressPoint,
  ): Promise<WorkspaceState>;
  updateChapterTotalPages(
    projectId: string,
    update: ChapterTotalPagesUpdate,
  ): Promise<WorkspaceState>;
  chooseExcelFile(mode: "open" | "save"): Promise<string | null>;
  getPathForFile(file: File): string;
  createExcelFile(payload?: {
    path?: string;
    projectName?: string;
    chapters?: ChapterInput[];
  }): Promise<WorkspaceState>;
  importLegacyExcel(
    request: ImportRequest,
  ): Promise<LegacyImportPreview | WorkspaceState>;
  syncExcel(projectId: string): Promise<OperationResult>;
  syncAllExcel(): Promise<void>;
  createBackup(projectId: string): Promise<OperationResult>;
  updateSettings(settings: Partial<AppSettings>): Promise<WorkspaceState>;
  setAlwaysOnTop(enabled: boolean): Promise<WorkspaceState>;
  setLaunchAtStartup(enabled: boolean): Promise<WorkspaceState>;
  toggleWidgetCollapsed(): Promise<WorkspaceState>;
  horizontalDragStart(screenX: number): void;
  horizontalDragMove(screenX: number): void;
  horizontalDragEnd(): void;
  openSettings(): Promise<void>;
  hideWindow(): Promise<void>;
  exitApp(): Promise<void>;
}

declare global {
  interface Window {
    mangaSprint: MangaSprintApi;
  }
}
