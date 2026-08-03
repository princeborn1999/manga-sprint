import { app } from "electron";
import { registerIpc, syncCurrent } from "./ipc";
import { createTray } from "./tray";
import { getState, saveState } from "./storage";
import { createWidget, openPostStudio, setQuitting, showWidget } from "./windows";

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) app.quit();
else {
  app.on("second-instance", showWidget);
  app.whenReady().then(() => {
    const state = getState();
    state.settings.lastOpenedAt = new Date().toISOString();
    saveState(state);
    registerIpc();
    createWidget(state, (x, y) => {
      const latest = getState();
      latest.settings.windowPosition = { x, y };
      if (latest.settings.dockPosition === "top-center" || latest.settings.dockPosition === "top-right") latest.settings.dockPosition = "top-free";
      return saveState(latest);
    });
    if (process.argv.includes("--post-studio")) openPostStudio();
    createTray(async () => { await syncCurrent(); });
  });
  app.on("window-all-closed", () => { /* tray app remains active */ });
  app.on("before-quit", setQuitting);
}
