import type { AppSettings, ChapterTotalPagesUpdate, LegacyImportPreview, MangaState, OperationResult, ProgressPoint } from "../shared/types";

export interface ChapterInput { chapterNumber: number; title: string; totalPages: number; startDate: string; targetEndDate: string }
export interface ImportRequest { path: string; totals?: Record<number, number> }

export interface MangaSprintApi {
  getInitialState(): Promise<MangaState>;
  updateProgress(point: ProgressPoint): Promise<MangaState>;
  updateChapterTotalPages(update: ChapterTotalPagesUpdate): Promise<MangaState>;
  chooseExcelFile(mode: "open" | "save"): Promise<string | null>;
  getPathForFile(file: File): string;
  createExcelFile(payload?: { path?: string; projectName?: string; chapters?: ChapterInput[] }): Promise<MangaState>;
  importLegacyExcel(request: ImportRequest): Promise<LegacyImportPreview | MangaState>;
  syncExcel(): Promise<OperationResult>;
  createBackup(): Promise<OperationResult>;
  updateSettings(settings: Partial<AppSettings>): Promise<MangaState>;
  setAlwaysOnTop(enabled: boolean): Promise<MangaState>;
  setLaunchAtStartup(enabled: boolean): Promise<MangaState>;
  toggleWidgetCollapsed(): Promise<MangaState>;
  horizontalDragStart(screenX: number): void;
  horizontalDragMove(screenX: number): void;
  horizontalDragEnd(): void;
  openSettings(): Promise<void>;
  hideWindow(): Promise<void>;
  exitApp(): Promise<void>;
}

declare global { interface Window { mangaSprint: MangaSprintApi } }
