import Store from "electron-store";
import { randomUUID } from "node:crypto";
import type {
  LocalEvent,
  MangaProject,
  MangaState,
  WorkspaceState,
} from "../../shared/types";
import { EXCEL_SCHEMA_VERSION, MAX_EVENTS } from "../../shared/constants";

function createDefaultState(): MangaState {
  return {
    chapters: [],
    dailyPlan: [],
    dailyHistory: [],
    events: [],
    settings: {
      schemaVersion: EXCEL_SCHEMA_VERSION,
      projectName: "MangaSprint",
      excelFilePath: "",
      opacity: 0.96,
      alwaysOnTop: true,
      launchAtStartup: false,
      theme: "dark",
      lockWindowPosition: false,
      dockPosition: "top-center",
      widgetCollapsed: false,
      lastOpenedAt: new Date().toISOString(),
      syncStatus: "synced",
      hasPendingSync: false,
    },
  };
}

export const defaultState = createDefaultState();
export function createEmptyMangaState(): MangaState {
  return structuredClone(createDefaultState());
}
function createDefaultWorkspace(): WorkspaceState {
  return { projects: [], settings: createDefaultState().settings };
}

const store = new Store<{ workspace: WorkspaceState; state?: MangaState }>({
  name: "mangasprint",
  defaults: { workspace: createDefaultWorkspace() },
});

function normalizeMangaState(state: MangaState): MangaState {
  const defaults = createDefaultState();
  return {
    ...defaults,
    ...state,
    chapters: (state.chapters ?? []).map((chapter) => ({
      ...chapter,
      dialogueComplete:
        chapter.dialogueComplete ?? chapter.status === "completed",
    })),
    dailyPlan: state.dailyPlan ?? [],
    dailyHistory: state.dailyHistory ?? [],
    events: state.events ?? [],
    settings: { ...defaults.settings, ...state.settings },
  };
}

function isLegacySampleState(state: MangaState): boolean {
  return (
    state.settings.excelFilePath === "" &&
    state.settings.projectName === "MangaSprint Vol.2" &&
    state.chapters.length === 3 &&
    state.chapters[0]?.chapterNumber === 11 &&
    state.chapters[1]?.chapterNumber === 12 &&
    state.chapters[2]?.chapterNumber === 13
  );
}

function migrateLegacyState(): WorkspaceState | undefined {
  const legacy = store.get("state");
  if (!legacy) return undefined;
  const normalized = normalizeMangaState(legacy);
  const workspace = createDefaultWorkspace();
  workspace.settings = {
    ...workspace.settings,
    ...normalized.settings,
    projectName: "MangaSprint",
    excelFilePath: "",
    syncStatus: "synced",
    hasPendingSync: false,
  };
  if (
    !isLegacySampleState(normalized) &&
    (normalized.chapters.length > 0 || normalized.settings.excelFilePath)
  ) {
    const id = randomUUID();
    workspace.projects.push({
      id,
      state: normalized,
      createdAt: normalized.settings.lastOpenedAt,
      updatedAt: new Date().toISOString(),
    });
    workspace.activeProjectId = id;
  }
  store.set("workspace", workspace);
  store.delete("state");
  return workspace;
}

export function getState(): WorkspaceState {
  const stored = migrateLegacyState() ?? store.get("workspace");
  const defaults = createDefaultWorkspace();
  const workspace: WorkspaceState = {
    ...defaults,
    ...stored,
    projects: (stored.projects ?? []).map((project) => ({
      ...project,
      state: normalizeMangaState(project.state),
    })),
    settings: {
      ...defaults.settings,
      ...stored.settings,
      projectName: "MangaSprint",
      excelFilePath: "",
      syncStatus: "synced",
      hasPendingSync: false,
    },
  };
  if (
    workspace.activeProjectId &&
    !workspace.projects.some(
      (project) => project.id === workspace.activeProjectId,
    )
  )
    workspace.activeProjectId = workspace.projects[0]?.id;
  return structuredClone(workspace);
}

export function saveState(state: WorkspaceState): WorkspaceState {
  store.set("workspace", state);
  return structuredClone(state);
}

export function findProject(
  workspace: WorkspaceState,
  projectId?: string,
): MangaProject {
  const project = workspace.projects.find(
    (item) => item.id === (projectId ?? workspace.activeProjectId),
  );
  if (!project) throw new Error("找不到漫畫專案");
  return project;
}

export function addEvent(
  state: MangaState,
  event: Omit<LocalEvent, "id" | "timestamp">,
): void {
  state.events.unshift({
    ...event,
    id: randomUUID(),
    timestamp: new Date().toISOString(),
  });
  state.events = state.events.slice(0, MAX_EVENTS);
}
