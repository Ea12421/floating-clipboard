import path from "node:path";
import {
  BrowserWindow,
  screen,
  type Rectangle,
} from "electron";
import type { BubbleSettings } from "./settings-store";

const mainDirectory = __dirname;
const rendererEntry = path.join(mainDirectory, "..", "..", "renderer", "index.html");

type WindowView = "menu" | "settings" | "history" | "screenshot";

export class WindowManager {
  bubble: BrowserWindow | null = null;
  menu: BrowserWindow | null = null;
  settings: BrowserWindow | null = null;
  history: BrowserWindow | null = null;
  screenshot: BrowserWindow | null = null;
  private dragTimer: NodeJS.Timeout | null = null;
  private dragOffset = { x: 0, y: 0 };

  constructor(private readonly getSettings: () => BubbleSettings) {}

  async createBubble(): Promise<BrowserWindow> {
    const bubble = new BrowserWindow({
      width: 56,
      height: 56,
      frame: false,
      transparent: true,
      resizable: false,
      movable: true,
      focusable: false,
      skipTaskbar: true,
      alwaysOnTop: true,
      show: false,
      webPreferences: {
        preload: path.join(mainDirectory, "..", "preload", "preload.js"),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    });
    bubble.setAlwaysOnTop(true, "floating");
    await this.loadView(bubble, "bubble");
    this.bubble = bubble;
    bubble.on("closed", () => {
      if (this.bubble === bubble) this.bubble = null;
    });
    return bubble;
  }

  showBubble(): void {
    if (!this.bubble) return;
    this.placeBubble(this.getSettings());
    this.bubble.showInactive();
  }

  hideBubble(): void {
    this.bubble?.hide();
  }

  placeBubble(settings: BubbleSettings): void {
    if (!this.bubble) return;
    const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
    const bounds = this.bubble.getBounds();
    const x = settings.x ?? display.workArea.x + display.workArea.width - bounds.width - 16;
    const y = settings.y ?? display.workArea.y + display.workArea.height - bounds.height - 24;
    this.bubble.setPosition(
      Math.max(display.workArea.x, Math.min(x, display.workArea.x + display.workArea.width - bounds.width)),
      Math.max(display.workArea.y, Math.min(y, display.workArea.y + display.workArea.height - bounds.height)),
    );
  }

  startDrag(): void {
    if (!this.bubble || this.getSettings().locked || this.dragTimer) return;
    const cursor = screen.getCursorScreenPoint();
    const bounds = this.bubble.getBounds();
    this.dragOffset = { x: cursor.x - bounds.x, y: cursor.y - bounds.y };
    this.dragTimer = setInterval(() => {
      if (!this.bubble) return;
      const point = screen.getCursorScreenPoint();
      const display = screen.getDisplayNearestPoint(point);
      const next = this.clampToWorkArea(
        { x: point.x - this.dragOffset.x, y: point.y - this.dragOffset.y, width: bounds.width, height: bounds.height },
        display.workArea,
      );
      this.bubble.setPosition(next.x, next.y);
    }, 16);
  }

  endDrag(): { x: number; y: number } | null {
    if (this.dragTimer) clearInterval(this.dragTimer);
    this.dragTimer = null;
    if (!this.bubble) return null;
    const { x, y } = this.bubble.getBounds();
    return { x, y };
  }

  async openView(view: WindowView, bounds?: Rectangle): Promise<void> {
    const existing = view === "menu" ? this.menu : view === "settings" ? this.settings : view === "history" ? this.history : this.screenshot;
    if (existing && !existing.isDestroyed()) {
      existing.show();
      existing.focus();
      return;
    }
    const window = new BrowserWindow({
      width: view === "menu" ? 244 : view === "history" ? 760 : view === "screenshot" ? bounds?.width ?? 800 : 680,
      height: view === "menu" ? 310 : view === "history" ? 620 : view === "screenshot" ? bounds?.height ?? 600 : 560,
      minWidth: view === "menu" ? 244 : view === "history" ? 560 : view === "screenshot" ? bounds?.width ?? 800 : 560,
      minHeight: view === "menu" ? 260 : view === "history" ? 420 : view === "screenshot" ? bounds?.height ?? 600 : 420,
      frame: false,
      backgroundColor: "#00000000",
      show: false,
      resizable: view !== "menu" && view !== "screenshot",
      alwaysOnTop: view === "menu" || view === "screenshot",
      skipTaskbar: view === "screenshot",
      transparent: view === "screenshot",
      webPreferences: {
        preload: path.join(mainDirectory, "..", "preload", "preload.js"),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    });
    await this.loadView(window, view);
    if (view === "menu") {
      this.menu = window;
      this.placeMenu(window);
    } else if (view === "settings") {
      this.settings = window;
      this.placeSettings(window);
    } else if (view === "history") {
      this.history = window;
    }
    if (view === "screenshot" && bounds) window.setBounds(bounds);
    window.once("ready-to-show", () => {
      window.show();
      window.focus();
    });
    window.on("closed", () => {
      if (view === "menu" && this.menu === window) this.menu = null;
      if (view === "settings" && this.settings === window) this.settings = null;
      if (view === "history" && this.history === window) this.history = null;
      if (view === "screenshot" && this.screenshot === window) this.screenshot = null;
    });
    if (view === "screenshot") this.screenshot = window;
  }

  closeMenu(): void {
    this.menu?.close();
  }

  closeCurrent(window: BrowserWindow | null): void {
    if (window && !window.isDestroyed()) window.close();
  }

  closeScreenshot(): void { this.screenshot?.close(); }

  private async loadView(window: BrowserWindow, view: "bubble" | WindowView): Promise<void> {
    const rendererUrl = process.env.ELECTRON_RENDERER_URL;
    if (rendererUrl) {
      await window.loadURL(`${rendererUrl}/?view=${view}`);
    } else {
      await window.loadFile(rendererEntry, { query: { view } });
    }
  }

  private placeMenu(window: BrowserWindow): void {
    if (!this.bubble) return;
    const bubble = this.bubble.getBounds();
    const menu = window.getBounds();
    const display = screen.getDisplayNearestPoint({ x: bubble.x, y: bubble.y });
    const right = bubble.x + bubble.width + 10;
    const left = bubble.x - menu.width - 10;
    const x = right + menu.width <= display.workArea.x + display.workArea.width ? right : left;
    const y = Math.max(display.workArea.y + 8, Math.min(bubble.y, display.workArea.y + display.workArea.height - menu.height - 8));
    window.setPosition(x, y);
  }

  private placeSettings(window: BrowserWindow): void {
    const display = screen.getPrimaryDisplay();
    const bounds = window.getBounds();
    window.setPosition(
      Math.round(display.workArea.x + (display.workArea.width - bounds.width) / 2),
      Math.round(display.workArea.y + (display.workArea.height - bounds.height) / 2),
    );
  }

  private clampToWorkArea(rect: Rectangle, workArea: Rectangle): Rectangle {
    return {
      ...rect,
      x: Math.max(workArea.x, Math.min(rect.x, workArea.x + workArea.width - rect.width)),
      y: Math.max(workArea.y, Math.min(rect.y, workArea.y + workArea.height - rect.height)),
    };
  }
}
