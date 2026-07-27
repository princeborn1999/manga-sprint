import Store from "electron-store";
import { randomUUID } from "node:crypto";
import type { LocalEvent, MangaState } from "../../shared/types";
import { EXCEL_SCHEMA_VERSION, MAX_EVENTS } from "../../shared/constants";

const now = new Date().toISOString();

export const defaultState: MangaState = {
  chapters: [],
  dailyPlan: [],
  dailyHistory: [],
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
    lastOpenedAt: now,
    syncStatus: "synced",
    hasPendingSync: false,
  },
  events: [],
};

const store = new Store<{ state: MangaState }>({ name: "mangasprint", defaults: { state: defaultState } });

function isLegacySampleState(state: MangaState): boolean {
  return state.settings.excelFilePath === "" &&
    state.settings.projectName === "MangaSprint Vol.2" &&
    state.chapters.length === 3 &&
    state.chapters[0]?.chapterNumber === 11 &&
    state.chapters[1]?.chapterNumber === 12 &&
    state.chapters[2]?.chapterNumber === 13 &&
    state.chapters[0]?.totalPages === 18 &&
    state.chapters[1]?.totalPages === 18 &&
    state.chapters[2]?.totalPages === 20;
}

export function getState(): MangaState {
  const state = store.get("state");
  const merged = { ...defaultState, ...state, settings: { ...defaultState.settings, ...state.settings } };
  if (isLegacySampleState(merged)) {
    const cleaned: MangaState = {
      ...merged,
      chapters: [],
      dailyPlan: [],
      dailyHistory: [],
      events: [],
      settings: {
        ...merged.settings,
        projectName: "MangaSprint",
        widgetCollapsed: false,
        syncStatus: "synced",
        hasPendingSync: false,
      },
    };
    store.set("state", cleaned);
    return structuredClone(cleaned);
  }
  return structuredClone(merged);
}

export function saveState(state: MangaState): MangaState {
  store.set("state", state);
  return structuredClone(state);
}

export function addEvent(state: MangaState, event: Omit<LocalEvent, "id" | "timestamp">): void {
  state.events.unshift({ ...event, id: randomUUID(), timestamp: new Date().toISOString() });
  state.events = state.events.slice(0, MAX_EVENTS);
}
