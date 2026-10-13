export type ChapterStatus = "not-started" | "in-progress" | "completed";
export type PaceStatus = "behind" | "on-track" | "ahead";
export type SyncStatus = "synced" | "pending" | "error";
export type DockPosition =
  "free" | "top-center" | "top-right" | "top-free" | "right-center";

export interface Chapter {
  id: string;
  chapterNumber: number;
  title: string;
  totalPages: number;
  startDate: string;
  targetEndDate: string;
  actualCompletedPages: number;
  dialogueComplete?: boolean;
  status: ChapterStatus;
  actualCompletedDate?: string;
  createdAt: string;
  updatedAt: string;
  order: number;
}

export interface DailyPlan {
  date: string;
  chapterNumber: number;
  idealPage: number;
  totalPages: number;
  idealPercent: number;
  isManualOverride: boolean;
}

export interface DailyHistory {
  date: string;
  actualChapterNumber: number;
  actualPage: number;
  actualChapterTotalPages: number;
  actualPercent: number;
  idealChapterNumber: number;
  idealPage: number;
  idealChapterTotalPages: number;
  idealPercent: number;
  cumulativeActualPages: number;
  cumulativeIdealPages: number;
  differencePages: number;
  status: PaceStatus;
  recordedAt: string;
}

export interface WindowPosition {
  x: number;
  y: number;
}
export interface AppSettings {
  schemaVersion: number;
  projectName: string;
  excelFilePath: string;
  opacity: number;
  alwaysOnTop: boolean;
  launchAtStartup: boolean;
  theme: "dark" | "light";
  windowPosition?: WindowPosition;
  lockWindowPosition: boolean;
  dockPosition: DockPosition;
  widgetCollapsed: boolean;
  lastOpenedAt: string;
  syncStatus: SyncStatus;
  hasPendingSync: boolean;
}

export interface ProgressPoint {
  chapterNumber: number;
  page: number;
  dialogueComplete?: boolean;
}
export interface ChapterTotalPagesUpdate {
  chapterNumber: number;
  totalPages: number;
}
export interface LocalEvent {
  id: string;
  timestamp: string;
  type: "progress" | "chapter-total-pages" | "sync" | "import" | "settings";
  previousProgress?: ProgressPoint;
  newProgress?: ProgressPoint;
  previousTotalPages?: number;
  newTotalPages?: number;
  removedCompletedPages?: number;
  syncResult?: SyncStatus;
  errorMessage?: string;
}

export interface MangaState {
  chapters: Chapter[];
  dailyPlan: DailyPlan[];
  dailyHistory: DailyHistory[];
  settings: AppSettings;
  events: LocalEvent[];
}

export interface MangaProject {
  id: string;
  state: MangaState;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceState {
  projects: MangaProject[];
  activeProjectId?: string;
  settings: AppSettings;
}

export interface ProjectProgressRequest {
  projectId: string;
  point: ProgressPoint;
}

export interface ProjectTotalPagesRequest {
  projectId: string;
  update: ChapterTotalPagesUpdate;
}

export interface ProjectTodaySummary {
  projectId: string;
  projectName: string;
  chapterNumber?: number;
  actualPage: number;
  idealPage: number;
  idealPercent: number;
  gapPages: number;
  missingPages: number;
}

export type LegacyImportChapter = Partial<
  Omit<Chapter, "chapterNumber" | "actualCompletedPages">
> &
  Pick<Chapter, "chapterNumber" | "actualCompletedPages"> & {
    actualValueIsPercent?: boolean;
  };

export interface LegacyImportPreview {
  sourcePath: string;
  projectName: string;
  chapters: LegacyImportChapter[];
  dailyPlan?: DailyPlan[];
  missingTotalPages: number[];
  preserveTotalPages?: boolean;
}

export interface OperationResult {
  ok: boolean;
  message: string;
  path?: string;
}
