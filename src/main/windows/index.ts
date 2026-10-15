import { BrowserWindow, Menu, app, screen } from "electron";
import path from "node:path";
import {
  EXPANDED_WIDGET_OPACITY,
  WIDGET_COLLAPSED_HEIGHT,
  WIDGET_COLLAPSED_WIDTH,
  WIDGET_HEIGHT,
  WIDGET_WIDTH,
} from "../../shared/constants";
import type { WorkspaceState } from "../../shared/types";

let widget: BrowserWindow | null = null;
let settingsWindow: BrowserWindow | null = null;
let quitting = false;
let layoutState: WorkspaceState | null = null;
let applyingLayout = false;
let horizontalDragOffset = 0;
let horizontalDragPosition: { x: number; y: number } | null = null;

function applyWidgetShape(state: WorkspaceState): void {
  if (!widget) return;

  const width = state.settings.widgetCollapsed
    ? WIDGET_COLLAPSED_WIDTH
    : WIDGET_WIDTH;
  const height = state.settings.widgetCollapsed
    ? WIDGET_COLLAPSED_HEIGHT
    : WIDGET_HEIGHT;

  // Keep the top edge square and match the rounded lower corners so transparent
  // pixels are not part of the native window hit area in either layout.
  widget.setShape([
    { x: 0, y: 0, width, height: height - 15 },
    { x: 1, y: height - 15, width: width - 2, height: 4 },
    { x: 2, y: height - 11, width: width - 4, height: 3 },
    { x: 4, y: height - 8, width: width - 8, height: 2 },
    { x: 5, y: height - 6, width: width - 10, height: 2 },
    { x: 7, y: height - 4, width: width - 14, height: 2 },
    { x: 9, y: height - 2, width: width - 18, height: 1 },
    { x: 13, y: height - 1, width: width - 26, height: 1 },
  ]);
}

function rendererUrl(window: BrowserWindow, mode = "widget"): void {
  if (process.env.ELECTRON_RENDERER_URL)
    window.loadURL(`${process.env.ELECTRON_RENDERER_URL}?mode=${mode}`);
  else
    window.loadFile(path.join(__dirname, "../renderer/index.html"), {
      query: { mode },
    });
}

function safePosition(state: WorkspaceState): { x?: number; y?: number } {
  const saved = state.settings.windowPosition;
  if (!saved) return {};
  const valid = screen.getAllDisplays().some((display) => {
    const b = display.workArea;
    return (
      saved.x >= b.x - WIDGET_WIDTH + 50 &&
      saved.x <= b.x + b.width - 50 &&
      saved.y >= b.y &&
      saved.y <= b.y + b.height - 50
    );
  });
  return valid ? saved : {};
}

function dockedBounds(state: WorkspaceState): Electron.Rectangle {
  const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
  const area = display.workArea;
  const height = state.settings.widgetCollapsed
    ? WIDGET_COLLAPSED_HEIGHT
    : WIDGET_HEIGHT;
  const width = state.settings.widgetCollapsed
    ? WIDGET_COLLAPSED_WIDTH
    : WIDGET_WIDTH;
  if (state.settings.dockPosition === "top-center")
    return {
      x: Math.round(area.x + (area.width - width) / 2),
      y: area.y - 1,
      width,
      height,
    };
  if (state.settings.dockPosition === "top-right")
    return { x: area.x + area.width - width, y: area.y - 1, width, height };
  if (state.settings.dockPosition === "top-free") {
    const savedX =
      state.settings.windowPosition?.x ??
      Math.round(area.x + (area.width - width) / 2);
    const x = Math.max(area.x, Math.min(savedX, area.x + area.width - width));
    return { x, y: area.y - 1, width, height };
  }
  if (state.settings.dockPosition === "right-center")
    return {
      x: area.x + area.width - width,
      y: Math.round(area.y + (area.height - height) / 2),
      width,
      height,
    };
  const current = widget?.getBounds();
  return {
    x: current?.x ?? safePosition(state).x ?? area.x,
    y: current?.y ?? safePosition(state).y ?? area.y,
    width,
    height,
  };
}

export function createWidget(
  state: WorkspaceState,
  onMoved: (x: number, y: number) => WorkspaceState,
): BrowserWindow {
  layoutState = state;
  const position = safePosition(state);
  const initial =
    state.settings.dockPosition === "free"
      ? {
          width: state.settings.widgetCollapsed
            ? WIDGET_COLLAPSED_WIDTH
            : WIDGET_WIDTH,
          height: state.settings.widgetCollapsed
            ? WIDGET_COLLAPSED_HEIGHT
            : WIDGET_HEIGHT,
          ...position,
        }
      : dockedBounds(state);
  widget = new BrowserWindow({
    ...initial,
    frame: false,
    transparent: true,
    alwaysOnTop: state.settings.alwaysOnTop,
    resizable: false,
    skipTaskbar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  applyWidgetShape(state);
  widget.setOpacity(
    state.settings.widgetCollapsed
      ? state.settings.opacity
      : EXPANDED_WIDGET_OPACITY,
  );
  widget.once("ready-to-show", () => widget?.show());
  widget.on("move", () => {
    if (!widget || applyingLayout || layoutState?.settings.lockWindowPosition)
      return;
    const [x, y] = widget.getPosition();
    const isTopDock = layoutState?.settings.dockPosition.startsWith("top-");
    if (isTopDock) {
      const top = screen.getDisplayNearestPoint({ x, y }).workArea.y - 1;
      if (y !== top) {
        applyingLayout = true;
        widget.setPosition(x, top);
        setTimeout(() => {
          applyingLayout = false;
        }, 0);
      }
      layoutState = onMoved(x, top);
      return;
    }
    layoutState = onMoved(x, y);
  });
  widget.on("close", (event) => {
    if (!quitting) {
      event.preventDefault();
      widget?.hide();
    }
  });
  widget.webContents.on("context-menu", (_event, params) => {
    if (!widget) return;
    const items: Electron.MenuItemConstructorOptions[] = params.isEditable
      ? [
          { role: "undo" },
          { role: "redo" },
          { type: "separator" },
          { role: "cut" },
          { role: "copy" },
          { role: "paste" },
          { role: "selectAll" },
          { type: "separator" },
        ]
      : [];
    items.push({
      label: "設定",
      accelerator: "CommandOrControl+,",
      click: openSettings,
    });
    Menu.buildFromTemplate(items).popup({ window: widget });
  });
  widget.webContents.on("before-input-event", (event, input) => {
    if (
      input.type === "keyDown" &&
      (input.control || input.meta) &&
      !input.alt &&
      (input.key === "," || input.code === "Comma")
    ) {
      event.preventDefault();
      openSettings();
    }
  });
  rendererUrl(widget);
  return widget;
}

export function openSettings(): void {
  if (settingsWindow) {
    settingsWindow.show();
    settingsWindow.focus();
    return;
  }
  settingsWindow = new BrowserWindow({
    width: 680,
    height: 620,
    minWidth: 620,
    minHeight: 540,
    title: "MangaSprint 設定",
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  settingsWindow.on("closed", () => {
    settingsWindow = null;
  });
  rendererUrl(settingsWindow, "settings");
}

export function getWidget(): BrowserWindow | null {
  return widget;
}
export function applyWidgetLayout(state: WorkspaceState, animate = true): void {
  if (!widget) return;
  layoutState = state;
  applyingLayout = true;
  widget.setBounds(dockedBounds(state), animate);
  applyWidgetShape(state);
  widget.setOpacity(
    state.settings.widgetCollapsed
      ? state.settings.opacity
      : EXPANDED_WIDGET_OPACITY,
  );
  setTimeout(() => {
    applyingLayout = false;
  }, 0);
}
export function startHorizontalDrag(screenX: number): void {
  if (!widget || !Number.isFinite(screenX)) return;
  horizontalDragOffset = screenX - widget.getBounds().x;
  const [x, y] = widget.getPosition();
  horizontalDragPosition = { x, y };
}
export function moveHorizontalDrag(screenX: number): void {
  if (
    !widget ||
    !layoutState ||
    !horizontalDragPosition ||
    !Number.isFinite(screenX)
  )
    return;
  const display = screen.getDisplayNearestPoint({
    x: Math.round(screenX),
    y: widget.getBounds().y,
  });
  const area = display.workArea;
  const width = widget.getBounds().width;
  const x = Math.max(
    area.x,
    Math.min(
      Math.round(screenX - horizontalDragOffset),
      area.x + area.width - width,
    ),
  );
  const y = area.y - 1;
  applyingLayout = true;
  widget.setPosition(x, y, false);
  setTimeout(() => {
    applyingLayout = false;
  }, 0);
  horizontalDragPosition = { x, y };
}
export function endHorizontalDrag(): { x: number; y: number } | null {
  const result = horizontalDragPosition;
  horizontalDragPosition = null;
  return result;
}
export function showWidget(): void {
  widget?.show();
  widget?.focus();
}
export function hideWidget(): void {
  widget?.hide();
}
export function setQuitting(): void {
  quitting = true;
}
export function quitApp(): void {
  setQuitting();
  app.quit();
}
