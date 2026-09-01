import fs from "node:fs";
import path from "node:path";

export type BubbleSettings = {
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

const defaults: BubbleSettings = {
  x: null,
  y: null,
  locked: false,
  hidden: false,
  theme: "system",
  screenshotShortcut: "",
  historyShortcut: "",
  clipboardCaptureEnabled: false,
  historyMaxItems: 200,
  historyMaxItemBytes: 10 * 1024 * 1024,
  historyMaxBytes: 256 * 1024 * 1024,
};

export class SettingsStore {
  private readonly filePath: string;
  private value: BubbleSettings = { ...defaults };

  constructor(userDataPath: string) {
    this.filePath = path.join(userDataPath, "settings.json");
    this.load();
  }

  get(): BubbleSettings {
    return { ...this.value };
  }

  update(patch: Partial<BubbleSettings>): BubbleSettings {
    this.value = { ...this.value, ...patch };
    this.persist();
    return this.get();
  }

  private load(): void {
    try {
      const raw = fs.readFileSync(this.filePath, "utf8");
      const parsed = JSON.parse(raw) as Partial<BubbleSettings>;
      this.value = { ...defaults, ...parsed };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        console.warn("Unable to read settings; using defaults.", error);
      }
      this.persist();
    }
  }

  private persist(): void {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    const temporaryPath = `${this.filePath}.tmp`;
    fs.writeFileSync(temporaryPath, `${JSON.stringify(this.value, null, 2)}\n`, "utf8");
    fs.renameSync(temporaryPath, this.filePath);
  }
}
