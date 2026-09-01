import path from "node:path";
import {
  app,
  BrowserWindow,
  Menu,
  Tray,
  clipboard,
  globalShortcut,
  ipcMain,
  nativeImage,
} from "electron";
import { SettingsStore, type BubbleSettings } from "./settings-store";
import { WindowManager } from "./window-manager";
import { HistoryStore } from "./history-store";
import { ClipboardMonitor } from "./clipboard-adapter";
import { ScreenshotAdapter } from "./screenshot-adapter";

let tray: Tray | null = null;
let settingsStore: SettingsStore;
let windowManager: WindowManager;
let historyStore: HistoryStore;
let clipboardMonitor: ClipboardMonitor;
let screenshotAdapter: ScreenshotAdapter;
const shortcutStatus: { screenshot: "registered" | "conflict" | "invalid" | "unset"; history: "registered" | "conflict" | "invalid" | "unset" } = { screenshot: "unset", history: "unset" };
const registeredShortcuts: string[] = [];

const trayIcon = nativeImage.createFromDataURL(
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18"><rect x="2" y="2" width="14" height="14" rx="4" fill="#2f6fed"/><path d="M6 9h6M9 6v6" stroke="white" stroke-width="1.5" stroke-linecap="round"/></svg>`)}`,
);

function startScreenshot(): void {
  void screenshotAdapter.captureFrame().then(async (frame) => {
    await windowManager.openView("screenshot", frame.bounds);
  }).catch((error: unknown) => {
    screenshotAdapter.clear();
    const reason = error instanceof Error ? error.message : "截图启动失败";
    console.warn(reason);
  });
}

function registerShortcuts(): void {
  for (const accelerator of registeredShortcuts.splice(0)) globalShortcut.unregister(accelerator);
  const settings = settingsStore.get();
  const bindings = [
    { key: "screenshot" as const, accelerator: settings.screenshotShortcut, callback: startScreenshot },
    { key: "history" as const, accelerator: settings.historyShortcut, callback: () => void windowManager.openView("history") },
  ];
  for (const binding of bindings) {
    if (!binding.accelerator.trim()) { shortcutStatus[binding.key] = "unset"; continue; }
    if (!isCompoundShortcut(binding.accelerator)) { shortcutStatus[binding.key] = "invalid"; continue; }
    try {
      const registered = globalShortcut.register(binding.accelerator, binding.callback);
      shortcutStatus[binding.key] = registered ? "registered" : "conflict";
      if (registered) registeredShortcuts.push(binding.accelerator);
    } catch (error) {
      shortcutStatus[binding.key] = "invalid";
      console.warn(`Unable to register ${binding.key} shortcut.`, error);
    }
  }
}

function isCompoundShortcut(accelerator: string): boolean {
  const parts = accelerator.split("+").map((part) => part.trim().toLowerCase()).filter(Boolean);
  const modifiers = new Set(["commandorcontrol", "command", "control", "ctrl", "alt", "option", "shift", "super", "meta"]);
  return parts.length >= 2 && parts.some((part) => modifiers.has(part));
}

function registerIpc(): void {
  ipcMain.handle("settings:get", () => settingsStore.get());
  ipcMain.handle("settings:update", (_event, patch: Partial<BubbleSettings>) => {
    const next = settingsStore.update(patch);
    if (patch.clipboardCaptureEnabled !== undefined) clipboardMonitor.setEnabled(next.clipboardCaptureEnabled);
    if (patch.screenshotShortcut !== undefined || patch.historyShortcut !== undefined) registerShortcuts();
    if (next.hidden) windowManager.hideBubble();
    else windowManager.showBubble();
    if (windowManager.bubble && patch.x !== undefined && patch.y !== undefined) {
      windowManager.placeBubble(next);
    }
    return next;
  });
  ipcMain.handle("bubble:hide", () => {
    settingsStore.update({ hidden: true });
    windowManager.hideBubble();
  });
  ipcMain.handle("bubble:show", () => {
    const next = settingsStore.update({ hidden: false });
    windowManager.showBubble();
    return next;
  });
  ipcMain.handle("bubble:toggle-lock", () => settingsStore.update({ locked: !settingsStore.get().locked }));
  ipcMain.handle("history:list", (_event, options: { kind?: "text" | "image"; pinnedOnly?: boolean; search?: string }) => historyStore.list(options));
  ipcMain.handle("history:preview", (_event, id: string) => {
    const buffer = historyStore.readImage(id);
    if (!buffer) return null;
    const preview = nativeImage.createFromBuffer(buffer).resize({ width: 120, height: 80, quality: "good" }).toPNG();
    return `data:image/png;base64,${preview.toString("base64")}`;
  });
  ipcMain.handle("screenshot:start", async () => {
    try {
      windowManager.closeMenu();
      const frame = await screenshotAdapter.captureFrame();
      await windowManager.openView("screenshot", frame.bounds);
      return { success: true };
    } catch (error) {
      screenshotAdapter.clear();
      return { success: false, reason: error instanceof Error ? error.message : "截图启动失败" };
    }
  });
  ipcMain.handle("shortcuts:status", () => ({ ...shortcutStatus }));
  ipcMain.handle("screenshot:frame", () => screenshotAdapter.getFrameDataUrl());
  ipcMain.handle("screenshot:complete", (_event, selection: { x: number; y: number; width: number; height: number }) => {
    const image = screenshotAdapter.crop(selection);
    screenshotAdapter.clear();
    windowManager.closeScreenshot();
    if (!image) return { success: false, reason: "选区太小或超出当前显示器范围" };
    const item = historyStore.addImage(image, "screenshot");
    clipboard.writeImage(nativeImage.createFromBuffer(image));
    return { success: true, item };
  });
  ipcMain.handle("screenshot:cancel", () => { screenshotAdapter.clear(); windowManager.closeScreenshot(); return { success: true }; });
  ipcMain.handle("history:copy", (_event, id: string) => {
    const item = historyStore.get(id);
    if (!item) return { success: false, reason: "历史条目不存在" };
    if (item.kind === "text") clipboard.writeText(item.content);
    else {
      const image = historyStore.readImage(id);
      if (!image) return { success: false, reason: "图片文件不存在" };
      clipboard.writeImage(nativeImage.createFromBuffer(image));
    }
    return { success: true };
  });
  ipcMain.handle("history:toggle-pin", (_event, id: string) => historyStore.togglePinned(id));
  ipcMain.handle("history:delete", (_event, id: string) => historyStore.delete(id));
  ipcMain.handle("history:clear", () => { historyStore.clear(); return { success: true }; });
  ipcMain.handle("clipboard:set-enabled", (_event, enabled: boolean) => { settingsStore.update({ clipboardCaptureEnabled: enabled }); clipboardMonitor.setEnabled(enabled); return enabled; });
  ipcMain.on("bubble:drag-start", () => windowManager.startDrag());
  ipcMain.on("bubble:drag-end", () => {
    const position = windowManager.endDrag();
    if (position) settingsStore.update(position);
  });
  ipcMain.on("window:open-menu", () => void windowManager.openView("menu"));
  ipcMain.on("window:open-settings", () => void windowManager.openView("settings"));
  ipcMain.on("window:open-history", () => void windowManager.openView("history"));
  ipcMain.on("window:close-menu", () => windowManager.closeMenu());
  ipcMain.on("window:close-current", (event) => {
    windowManager.closeCurrent(BrowserWindow.fromWebContents(event.sender));
  });
}

function createTray(): void {
  tray = new Tray(trayIcon);
  tray.setToolTip("截图剪贴板浮块");
  if (process.platform === "darwin") tray.setTitle("截");
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: "显示浮标", click: () => { settingsStore.update({ hidden: false }); windowManager.showBubble(); } },
    { label: "打开设置", click: () => void windowManager.openView("settings") },
    { type: "separator" },
    { label: "退出", click: () => app.quit() },
  ]));
  tray.on("click", () => {
    if (settingsStore.get().hidden) {
      settingsStore.update({ hidden: false });
      windowManager.showBubble();
    } else {
      void windowManager.openView("menu");
    }
  });
}

async function bootstrap(): Promise<void> {
  await app.whenReady();
  settingsStore = new SettingsStore(app.getPath("userData"));
  historyStore = new HistoryStore(app.getPath("userData"));
  screenshotAdapter = new ScreenshotAdapter();
  clipboardMonitor = new ClipboardMonitor(historyStore, () => ({ maxItems: settingsStore.get().historyMaxItems, maxBytes: settingsStore.get().historyMaxBytes }));
  windowManager = new WindowManager(() => settingsStore.get());
  registerIpc();
  registerShortcuts();
  await windowManager.createBubble();
  createTray();
  if (!settingsStore.get().hidden) windowManager.showBubble();
  clipboardMonitor.setEnabled(settingsStore.get().clipboardCaptureEnabled);
  app.on("will-quit", () => {
    for (const accelerator of registeredShortcuts.splice(0)) globalShortcut.unregister(accelerator);
  });
  app.on("activate", () => {
    if (!windowManager.bubble) void windowManager.createBubble().then(() => windowManager.showBubble());
  });
}

void bootstrap();
