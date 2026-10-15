import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WorkspaceState } from "../../src/shared/types";

const electron = vi.hoisted(() => {
  const windows: Array<{
    options: Record<string, unknown>;
    on: ReturnType<typeof vi.fn>;
    once: ReturnType<typeof vi.fn>;
    show: ReturnType<typeof vi.fn>;
    focus: ReturnType<typeof vi.fn>;
    loadFile: ReturnType<typeof vi.fn>;
    webContents: { on: ReturnType<typeof vi.fn> };
  }> = [];
  const popup = vi.fn();
  return {
    windows,
    popup,
    Menu: {
      buildFromTemplate: vi.fn<
        (template: Electron.MenuItemConstructorOptions[]) => {
          popup: typeof popup;
        }
      >(() => ({ popup })),
    },
    BrowserWindow: vi.fn(function (options: Record<string, unknown>) {
      const window = {
        options,
        on: vi.fn(),
        once: vi.fn(),
        show: vi.fn(),
        focus: vi.fn(),
        loadFile: vi.fn(),
        loadURL: vi.fn(),
        setShape: vi.fn(),
        setOpacity: vi.fn(),
        webContents: { on: vi.fn() },
      };
      windows.push(window);
      return window;
    }),
    app: { quit: vi.fn() },
    screen: {
      getCursorScreenPoint: vi.fn(() => ({ x: 300, y: 100 })),
      getDisplayNearestPoint: vi.fn(() => ({
        workArea: { x: 0, y: 0, width: 1920, height: 1080 },
      })),
    },
  };
});

vi.mock("electron", () => electron);

const state: WorkspaceState = {
  projects: [],
  settings: {
    schemaVersion: 1,
    projectName: "MangaSprint",
    excelFilePath: "",
    opacity: 0.95,
    alwaysOnTop: true,
    launchAtStartup: false,
    theme: "dark",
    lockWindowPosition: false,
    dockPosition: "top-center",
    widgetCollapsed: true,
    lastOpenedAt: "2026-10-15T00:00:00.000Z",
    syncStatus: "synced",
    hasPendingSync: false,
  },
};

async function createFixture() {
  const { createWidget } = await import("../../src/main/windows");
  createWidget(state, () => state);
  const widget = electron.windows[0];
  const eventHandler = (name: string) => {
    const call = widget.webContents.on.mock.calls.find(
      ([eventName]) => eventName === name,
    );
    if (!call) throw new Error(`Missing ${name} handler`);
    return call[1] as (...args: unknown[]) => void;
  };
  return { widget, eventHandler };
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  electron.windows.length = 0;
});

describe("Widget settings access", () => {
  it("opens settings from the native right-click menu, including when collapsed", async () => {
    const { widget, eventHandler } = await createFixture();
    eventHandler("context-menu")({}, { isEditable: false });
    const template = electron.Menu.buildFromTemplate.mock.calls[0][0] as
      Electron.MenuItemConstructorOptions[] | undefined;
    const settings = template?.find((item) => item.label === "設定");
    expect(settings).toBeDefined();
    expect(electron.popup).toHaveBeenCalledWith({ window: widget });
    const click = settings?.click as (() => void) | undefined;
    click?.();
    expect(electron.windows).toHaveLength(2);
    expect(electron.windows[1].loadFile).toHaveBeenCalledWith(
      expect.any(String),
      { query: { mode: "settings" } },
    );
  });

  it("keeps editing commands in editable fields", async () => {
    const { eventHandler } = await createFixture();
    eventHandler("context-menu")({}, { isEditable: true });
    expect(electron.Menu.buildFromTemplate).toHaveBeenCalledWith(
      expect.arrayContaining([
        { role: "copy" },
        { role: "paste" },
        expect.objectContaining({ label: "設定" }),
      ]),
    );
  });

  it("Ctrl+, opens and reuses settings while an ordinary comma does not", async () => {
    const { eventHandler } = await createFixture();
    const handler = eventHandler("before-input-event");
    const event = { preventDefault: vi.fn() };
    handler(event, { type: "keyDown", key: ",", control: false });
    expect(electron.windows).toHaveLength(1);
    handler(event, {
      type: "keyDown",
      key: "Process",
      code: "Comma",
      control: true,
    });
    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(electron.windows).toHaveLength(2);
    handler(event, { type: "keyDown", key: ",", control: true });
    expect(electron.windows).toHaveLength(2);
    expect(electron.windows[1].show).toHaveBeenCalledOnce();
    expect(electron.windows[1].focus).toHaveBeenCalledOnce();
  });
});
