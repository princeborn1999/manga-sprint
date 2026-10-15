import { Menu, Tray, app, nativeImage } from "electron";
import { getState, saveState } from "../storage";
import {
  getWidget,
  hideWidget,
  openSettings,
  quitApp,
  showWidget,
} from "../windows";

let tray: Tray | null = null;

export function createTray(sync: () => Promise<void>): Tray {
  const icon = nativeImage.createFromDataURL(
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAhUlEQVR4nO3XSw6AIAwEUM7nFT0OB9OdQUSZsdQWU5NusJ9ngoumdcnJMlqHm3I8ArSHXxAWw08Iq+EHIgD+AeXDNAfrJgOgCKKGB/QQZP47wF1TJlcMqBujeeJL2GreOxv+FyBfqwpALps6QPLuP4ABdQEIwAQA5QiAn8XExWrmYjn9PHa2N85PKC2xawAAAABJRU5ErkJggg==",
  );
  tray = new Tray(icon);
  tray.setToolTip("MangaSprint");
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: "顯示 Widget", click: showWidget },
      { label: "隱藏 Widget", click: hideWidget },
      {
        label: "永遠置頂",
        type: "checkbox",
        checked: getState().settings.alwaysOnTop,
        click: (item) => {
          const state = getState();
          state.settings.alwaysOnTop = item.checked;
          saveState(state);
          getWidget()?.setAlwaysOnTop(item.checked);
        },
      },
      { type: "separator" },
      { label: "同步全部 Excel", click: () => void sync() },
      { label: "設定", click: openSettings },
      { type: "separator" },
      { label: "結束程式", click: quitApp },
    ]),
  );
  tray.on("double-click", showWidget);
  app.on("before-quit", () => {
    tray?.destroy();
    tray = null;
  });
  return tray;
}
