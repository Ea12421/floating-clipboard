export {};

type BubbleSettings = {
  x: number | null;
  y: number | null;
  locked: boolean;
  hidden: boolean;
  theme: "light" | "dark" | "system";
  screenshotShortcut: string;
  historyShortcut: string;
  clipboardCaptureEnabled: boolean;
  historyMaxItems: number;
  historyMaxItemBytes: number;
  historyMaxBytes: number;
};

type HistoryItemShape = {
  id: string;
  kind: "text" | "image";
  content: string;
  fingerprint: string;
  createdAt: string;
  lastUsedAt: string;
  pinned: boolean;
  source: "clipboard" | "screenshot";
  sizeBytes: number;
};

declare global {
  interface Window {
    floatingClipboard: {
      getSettings: () => Promise<BubbleSettings>;
      updateSettings: (patch: Partial<BubbleSettings>) => Promise<BubbleSettings>;
      hideBubble: () => Promise<void>;
      showBubble: () => Promise<BubbleSettings>;
      toggleBubbleLock: () => Promise<BubbleSettings>;
      startBubbleDrag: () => void;
      endBubbleDrag: () => void;
      openMenu: () => void;
      openSettings: () => void;
      closeMenu: () => void;
      closeCurrentWindow: () => void;
      listHistory: (options?: { kind?: "text" | "image"; pinnedOnly?: boolean; search?: string }) => Promise<HistoryItem[]>;
      getHistoryImagePreview: (id: string) => Promise<string | null>;
      copyHistory: (id: string) => Promise<{ success: boolean; reason?: string }>;
      toggleHistoryPin: (id: string) => Promise<HistoryItemShape | null>;
      deleteHistory: (id: string) => Promise<boolean>;
      clearHistory: () => Promise<{ success: boolean }>;
      setClipboardCaptureEnabled: (enabled: boolean) => Promise<boolean>;
      openHistory: () => void;
      startScreenshot: () => Promise<{ success: boolean; reason?: string }>;
      getScreenshotFrame: () => Promise<string | null>;
      completeScreenshot: (selection: { x: number; y: number; width: number; height: number }) => Promise<{ success: boolean; reason?: string; item?: HistoryItemShape | null }>;
      cancelScreenshot: () => Promise<{ success: boolean }>;
      getShortcutStatus: () => Promise<{ screenshot: "registered" | "conflict" | "invalid" | "unset"; history: "registered" | "conflict" | "invalid" | "unset" }>;
    };
  }

  type HistoryItem = HistoryItemShape;
}
