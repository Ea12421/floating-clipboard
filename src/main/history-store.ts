import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

export type ClipboardKind = "text" | "image";
export type ClipboardSource = "clipboard" | "screenshot";

export type HistoryItem = {
  id: string;
  kind: ClipboardKind;
  content: string;
  fingerprint: string;
  createdAt: string;
  lastUsedAt: string;
  pinned: boolean;
  source: ClipboardSource;
  sizeBytes: number;
};

type Row = {
  id: string;
  kind: ClipboardKind;
  content: string;
  fingerprint: string;
  created_at: string;
  last_used_at: string;
  pinned: number;
  source: ClipboardSource;
  size_bytes: number;
};

export class HistoryStore {
  private readonly db: Database.Database;
  private readonly imagesDir: string;

  constructor(userDataPath: string) {
    this.imagesDir = path.join(userDataPath, "images");
    fs.mkdirSync(this.imagesDir, { recursive: true });
    this.db = new Database(path.join(userDataPath, "history.sqlite"));
    this.db.pragma("journal_mode = WAL");
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS clipboard_items (
        id TEXT PRIMARY KEY,
        kind TEXT NOT NULL CHECK(kind IN ('text', 'image')),
        content TEXT NOT NULL,
        fingerprint TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL,
        last_used_at TEXT NOT NULL,
        pinned INTEGER NOT NULL DEFAULT 0,
        source TEXT NOT NULL CHECK(source IN ('clipboard', 'screenshot')),
        size_bytes INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_clipboard_items_created ON clipboard_items(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_clipboard_items_kind ON clipboard_items(kind);
    `);
  }

  addText(text: string, source: ClipboardSource = "clipboard"): HistoryItem | null {
    const content = text.trim();
    if (!content) return null;
    return this.insert({ kind: "text", content, source, sizeBytes: Buffer.byteLength(content, "utf8") });
  }

  addImage(buffer: Buffer, source: ClipboardSource = "clipboard"): HistoryItem | null {
    if (buffer.length === 0) return null;
    const id = crypto.randomUUID();
    const fingerprint = crypto.createHash("sha256").update(buffer).digest("hex");
    const existing = this.db.prepare("SELECT * FROM clipboard_items WHERE fingerprint = ?").get(fingerprint) as Row | undefined;
    if (existing) {
      this.db.prepare("UPDATE clipboard_items SET last_used_at = ? WHERE id = ?").run(new Date().toISOString(), existing.id);
      return this.toItem(existing);
    }
    const fileName = `${id}.png`;
    const temporaryPath = path.join(this.imagesDir, `${fileName}.tmp`);
    const imagePath = path.join(this.imagesDir, fileName);
    fs.writeFileSync(temporaryPath, buffer);
    fs.renameSync(temporaryPath, imagePath);
    const now = new Date().toISOString();
    this.db.prepare(`INSERT INTO clipboard_items (id, kind, content, fingerprint, created_at, last_used_at, pinned, source, size_bytes) VALUES (?, 'image', ?, ?, ?, ?, 0, ?, ?)`).run(id, fileName, fingerprint, now, now, source, buffer.length);
    return this.get(id);
  }

  list(options: { kind?: ClipboardKind; pinnedOnly?: boolean; search?: string } = {}): HistoryItem[] {
    const conditions: string[] = [];
    const values: unknown[] = [];
    if (options.kind) { conditions.push("kind = ?"); values.push(options.kind); }
    if (options.pinnedOnly) conditions.push("pinned = 1");
    if (options.search?.trim()) { conditions.push("(content LIKE ? OR id LIKE ?)"); values.push(`%${options.search.trim()}%`, `%${options.search.trim()}%`); }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const rows = this.db.prepare(`SELECT * FROM clipboard_items ${where} ORDER BY pinned DESC, created_at DESC`).all(...values) as Row[];
    return rows.map((row) => this.toItem(row));
  }

  get(id: string): HistoryItem | null {
    const row = this.db.prepare("SELECT * FROM clipboard_items WHERE id = ?").get(id) as Row | undefined;
    return row ? this.toItem(row) : null;
  }

  readImage(id: string): Buffer | null {
    const item = this.get(id);
    if (!item || item.kind !== "image") return null;
    const filePath = path.join(this.imagesDir, item.content);
    if (path.dirname(filePath) !== this.imagesDir) return null;
    try { return fs.readFileSync(filePath); } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") console.warn("Unable to read history image.", error);
      return null;
    }
  }

  togglePinned(id: string): HistoryItem | null {
    this.db.prepare("UPDATE clipboard_items SET pinned = CASE pinned WHEN 1 THEN 0 ELSE 1 END WHERE id = ?").run(id);
    return this.get(id);
  }

  delete(id: string): boolean {
    const item = this.get(id);
    if (!item) return false;
    this.db.prepare("DELETE FROM clipboard_items WHERE id = ?").run(id);
    if (item.kind === "image") this.removeImage(item.content);
    return true;
  }

  clear(): void {
    const images = this.db.prepare("SELECT content FROM clipboard_items WHERE kind = 'image'").all() as Array<{ content: string }>;
    this.db.prepare("DELETE FROM clipboard_items").run();
    for (const image of images) this.removeImage(image.content);
    this.db.exec("VACUUM");
  }

  cleanup(maxItems: number, maxBytes: number): void {
    const rows = this.db.prepare("SELECT * FROM clipboard_items WHERE pinned = 0 ORDER BY created_at ASC").all() as Row[];
    let count = this.db.prepare("SELECT COUNT(*) AS count FROM clipboard_items").get() as { count: number };
    let bytes = this.db.prepare("SELECT COALESCE(SUM(size_bytes), 0) AS bytes FROM clipboard_items").get() as { bytes: number };
    for (const row of rows) {
      if (count.count <= maxItems && bytes.bytes <= maxBytes) break;
      this.delete(row.id);
      count = { count: count.count - 1 };
      bytes = { bytes: bytes.bytes - row.size_bytes };
    }
  }

  close(): void { this.db.close(); }

  private insert(input: { kind: ClipboardKind; content: string; source: ClipboardSource; sizeBytes: number }): HistoryItem | null {
    const fingerprint = crypto.createHash("sha256").update(input.content).digest("hex");
    const existing = this.db.prepare("SELECT * FROM clipboard_items WHERE fingerprint = ?").get(fingerprint) as Row | undefined;
    if (existing) {
      this.db.prepare("UPDATE clipboard_items SET last_used_at = ? WHERE id = ?").run(new Date().toISOString(), existing.id);
      return this.toItem(existing);
    }
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    this.db.prepare("INSERT INTO clipboard_items (id, kind, content, fingerprint, created_at, last_used_at, pinned, source, size_bytes) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)").run(id, input.kind, input.content, fingerprint, now, now, input.source, input.sizeBytes);
    return this.get(id);
  }

  private toItem(row: Row): HistoryItem {
    return { id: row.id, kind: row.kind, content: row.content, fingerprint: row.fingerprint, createdAt: row.created_at, lastUsedAt: row.last_used_at, pinned: row.pinned === 1, source: row.source, sizeBytes: row.size_bytes };
  }

  private removeImage(fileName: string): void {
    const filePath = path.join(this.imagesDir, fileName);
    if (path.dirname(filePath) !== this.imagesDir) return;
    try { fs.unlinkSync(filePath); } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") console.warn("Unable to remove history image.", error);
    }
  }
}
