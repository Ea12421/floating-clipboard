import { useEffect, useRef, useState, type ReactElement, type ReactNode } from "react";

type View = "bubble" | "menu" | "settings" | "history" | "screenshot";
type Settings = Awaited<ReturnType<typeof window.floatingClipboard.getSettings>>;

function applyTheme(theme: Settings["theme"]): void {
  const resolved = theme === "system"
    ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
    : theme;
  document.documentElement.dataset.theme = resolved;
}

function currentView(): View {
  const view = new URLSearchParams(window.location.search).get("view");
  return view === "menu" || view === "settings" || view === "history" || view === "screenshot" ? view : "bubble";
}

export function App(): ReactElement {
  const view = currentView();
  if (view === "menu") return <ActionMenu />;
  if (view === "settings") return <SettingsWindow />;
  if (view === "history") return <HistoryWindow />;
  if (view === "screenshot") return <ScreenshotOverlay />;
  return <Bubble />;
}

function Bubble(): ReactElement {
  const [locked, setLocked] = useState(false);
  const dragStarted = useRef(false);
  const dragMoved = useRef(false);
  const pointerStart = useRef({ x: 0, y: 0 });

  useEffect(() => {
    void window.floatingClipboard.getSettings().then((settings) => {
      setLocked(settings.locked);
      applyTheme(settings.theme);
    });
  }, []);

  return (
    <button
      className="bubble"
      aria-label={locked ? "浮标已锁定，点击打开菜单" : "打开截图剪贴板菜单"}
      data-locked={locked}
      onClick={(event) => {
        if (dragMoved.current) {
          event.preventDefault();
          return;
        }
        window.floatingClipboard.openMenu();
      }}
      onContextMenu={(event) => {
        event.preventDefault();
        void window.floatingClipboard.toggleBubbleLock().then((next) => setLocked(next.locked));
      }}
      onPointerDown={(event) => {
        if (event.button === 0 && !locked) {
          dragStarted.current = true;
          dragMoved.current = false;
          pointerStart.current = { x: event.clientX, y: event.clientY };
          window.floatingClipboard.startBubbleDrag();
        }
      }}
      onPointerMove={(event) => {
        if (dragStarted.current && Math.hypot(event.clientX - pointerStart.current.x, event.clientY - pointerStart.current.y) > 4) dragMoved.current = true;
      }}
      onPointerUp={() => {
        if (!dragStarted.current) return;
        window.floatingClipboard.endBubbleDrag();
        window.setTimeout(() => {
          dragStarted.current = false;
          dragMoved.current = false;
        }, 0);
      }}
      onPointerCancel={() => {
        dragStarted.current = false;
        dragMoved.current = false;
        window.floatingClipboard.endBubbleDrag();
      }}
    >
      <span className="bubble-mark" aria-hidden="true">⌗</span>
    </button>
  );
}

function ActionMenu(): ReactElement {
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    void window.floatingClipboard.getSettings().then((settings) => {
      setLocked(settings.locked);
      applyTheme(settings.theme);
    });
  }, []);

  return (
    <main className="menu-shell" aria-label="动作菜单">
      <div className="menu-heading">
        <span className="eyebrow">截图剪贴板</span>
        <button className="icon-button" aria-label="关闭菜单" onClick={() => window.floatingClipboard.closeMenu()}>×</button>
      </div>
      <div className="action-list">
        <ActionItem icon="⌗" label="截图" hint="拖动选区" onClick={() => void window.floatingClipboard.startScreenshot().then((result) => { if (!result.success) window.alert(result.reason ?? "截图启动失败"); })} />
        <ActionItem icon="文" label="截图翻译" hint="未配置服务" onClick={() => window.alert("截图翻译尚未配置翻译服务。基础截图与剪贴板功能不受影响。")} />
        <ActionItem icon="▣" label="打开剪贴板" onClick={() => window.floatingClipboard.openHistory()} />
        <ActionItem icon="⚙" label="设置" onClick={() => window.floatingClipboard.openSettings()} />
      </div>
      <div className="menu-footer">
        <button className="menu-toggle" onClick={() => void window.floatingClipboard.toggleBubbleLock().then((next) => setLocked(next.locked))}>
          <span className="status-dot" data-active={locked} />
          {locked ? "浮标已锁定" : "锁定浮标位置"}
        </button>
        <button className="menu-secondary" onClick={() => void window.floatingClipboard.hideBubble()}>
          隐藏浮标
        </button>
      </div>
    </main>
  );
}

function ScreenshotOverlay(): ReactElement {
  const [frame, setFrame] = useState<string | null>(null);
  const [selection, setSelection] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const selectionRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    void window.floatingClipboard.getScreenshotFrame().then(setFrame);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") void window.floatingClipboard.cancelScreenshot();
      if (event.key === "Enter" && selectionRef.current && selectionRef.current.width >= 4 && selectionRef.current.height >= 4) {
        void window.floatingClipboard.completeScreenshot(selectionRef.current);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const point = (event: React.PointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
  };
  const updateSelection = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!start.current) return;
    const end = point(event);
    const next = { x: Math.min(start.current.x, end.x), y: Math.min(start.current.y, end.y), width: Math.abs(end.x - start.current.x), height: Math.abs(end.y - start.current.y) };
    selectionRef.current = next;
    setSelection(next);
  };

  return <div
    className="screenshot-overlay"
    style={frame ? { backgroundImage: `linear-gradient(rgba(7, 12, 18, .34), rgba(7, 12, 18, .34)), url(${frame})` } : undefined}
    onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); start.current = point(event); selectionRef.current = { x: start.current.x, y: start.current.y, width: 0, height: 0 }; setSelection(selectionRef.current); }}
    onPointerMove={updateSelection}
    onPointerUp={(event) => {
      updateSelection(event);
      const finalSelection = selectionRef.current;
      start.current = null;
      if (!finalSelection || finalSelection.width < 4 || finalSelection.height < 4) {
        void window.floatingClipboard.cancelScreenshot();
        return;
      }
      void window.floatingClipboard.completeScreenshot(finalSelection).then((result) => { if (!result.success) window.alert(result.reason ?? "截图失败"); });
    }}
  >
    <div className="screenshot-help">拖动选择区域 · Enter 确认 · Esc 取消</div>
    {selection && selection.width >= 1 && selection.height >= 1 ? <div className="screenshot-selection" style={{ left: selection.x, top: selection.y, width: selection.width, height: selection.height }} /> : null}
  </div>;
}

function ActionItem({ icon, label, hint, disabled, onClick }: { icon: string; label: string; hint?: string; disabled?: boolean; onClick?: () => void }): ReactElement {
  return (
    <button className="action-item" disabled={disabled} aria-disabled={disabled} onClick={onClick}>
      <span className="action-icon" aria-hidden="true">{icon}</span>
      <span>{label}</span>
      {hint ? <span className="action-hint">{hint}</span> : null}
    </button>
  );
}

function HistoryWindow(): ReactElement {
  const [filter, setFilter] = useState<"all" | "text" | "image" | "pinned">("all");
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [captureEnabled, setCaptureEnabled] = useState(false);
  const [notice, setNotice] = useState("");

  const load = () => {
    const options = filter === "all" ? {} : filter === "pinned" ? { pinnedOnly: true } : { kind: filter };
    void Promise.all([window.floatingClipboard.listHistory({ ...options, search }), window.floatingClipboard.getSettings()]).then(([nextItems, settings]) => {
      setItems(nextItems);
      setCaptureEnabled(settings.clipboardCaptureEnabled);
    });
  };

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 1000);
    return () => window.clearInterval(timer);
  }, [filter, search]);

  const copy = (id: string) => void window.floatingClipboard.copyHistory(id).then((result) => {
    setNotice(result.success ? "已复制到系统剪贴板" : result.reason ?? "复制失败");
    window.setTimeout(() => setNotice(""), 1800);
  });

  const clear = () => {
    if (!window.confirm("清空全部剪贴板历史？此操作会删除本地记录和图片文件。")) return;
    void window.floatingClipboard.clearHistory().then(load);
  };

  return (
    <main className="history-shell">
      <header className="window-toolbar">
        <div><span className="eyebrow">本地记录</span><h1>剪贴板</h1></div>
        <div className="toolbar-actions">
          <button className="capture-toggle" aria-pressed={captureEnabled} onClick={() => void window.floatingClipboard.setClipboardCaptureEnabled(!captureEnabled).then(() => setCaptureEnabled(!captureEnabled))}>{captureEnabled ? "正在采集" : "采集已关闭"}</button>
          <button className="icon-button" aria-label="关闭历史" onClick={() => window.floatingClipboard.closeCurrentWindow()}>×</button>
        </div>
      </header>
      <section className="history-content">
        <nav className="history-filters" aria-label="历史筛选">
          {(["all", "text", "image", "pinned"] as const).map((value) => <button key={value} className={filter === value ? "active" : ""} onClick={() => setFilter(value)}>{value === "all" ? "全部" : value === "text" ? "文字" : value === "image" ? "图片" : "固定"}</button>)}
        </nav>
        <div className="history-list-panel">
          <div className="history-toolbar"><input aria-label="搜索历史" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索本地记录" /><button className="button danger-button" onClick={clear} disabled={items.length === 0}>清空历史</button></div>
          {notice ? <div className="state-banner" data-state="success">{notice}</div> : null}
          <div className="history-list">
            {items.length === 0 ? <div className="empty-state"><strong>还没有可显示的记录</strong><span>开启采集或从截图动作开始。</span></div> : items.map((item) => <HistoryRow key={item.id} item={item} onCopy={() => copy(item.id)} onPin={() => void window.floatingClipboard.toggleHistoryPin(item.id).then(load)} onDelete={() => void window.floatingClipboard.deleteHistory(item.id).then(load)} />)}
          </div>
        </div>
      </section>
    </main>
  );
}

function HistoryRow({ item, onCopy, onPin, onDelete }: { item: HistoryItem; onCopy: () => void; onPin: () => void; onDelete: () => void }): ReactElement {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  useEffect(() => {
    if (item.kind !== "image") return;
    let active = true;
    void window.floatingClipboard.getHistoryImagePreview(item.id).then((src) => {
      if (active) setImagePreview(src);
    });
    return () => { active = false; };
  }, [item.id, item.kind]);
  const preview = item.kind === "image" ? "图片内容" : item.content.replace(/\s+/g, " ").slice(0, 100);
  return <article className="history-row"><div className="history-kind" aria-hidden="true">{item.kind === "image" ? (imagePreview ? <img className="history-thumb" src={imagePreview} alt="" /> : "图") : "T"}</div><div className="history-copy"><strong>{preview}</strong><span>{new Date(item.createdAt).toLocaleString()} · {item.source === "screenshot" ? "截图" : "剪贴板"}</span></div><div className="history-actions"><button onClick={onCopy}>复制</button><button className={item.pinned ? "pinned" : ""} onClick={onPin}>{item.pinned ? "已固定" : "固定"}</button><button onClick={onDelete}>删除</button></div></article>;
}

function SettingsWindow(): ReactElement {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [shortcutStatus, setShortcutStatus] = useState<{ screenshot: "registered" | "conflict" | "invalid" | "unset"; history: "registered" | "conflict" | "invalid" | "unset" } | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void window.floatingClipboard.getSettings().then((next) => {
      setSettings(next);
      applyTheme(next.theme);
    });
    void window.floatingClipboard.getShortcutStatus().then(setShortcutStatus);
  }, []);

  if (!settings) return <main className="settings-shell loading">正在读取设置…</main>;

  const update = (patch: Partial<Settings>) => {
    void window.floatingClipboard.updateSettings(patch).then((next) => {
      setSettings(next);
      void window.floatingClipboard.getShortcutStatus().then(setShortcutStatus);
      applyTheme(next.theme);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1400);
    });
  };

  return (
    <main className="settings-shell">
      <header className="window-toolbar">
        <div>
          <span className="eyebrow">截图剪贴板浮块</span>
          <h1>设置</h1>
        </div>
        <button className="icon-button" aria-label="关闭设置" onClick={() => window.floatingClipboard.closeCurrentWindow()}>×</button>
      </header>
      <section className="settings-content">
        <aside className="settings-nav" aria-label="设置分组">
          <button className="nav-item active">通用</button>
          <button className="nav-item" disabled>截图 <small>后续</small></button>
          <button className="nav-item" disabled>剪贴板 <small>后续</small></button>
          <button className="nav-item" disabled>快捷键 <small>后续</small></button>
          <button className="nav-item" disabled>翻译 <small>后续</small></button>
        </aside>
        <div className="settings-panel">
          <div className="panel-heading">
            <div><h2>浮标</h2><p>控制入口的可见性和位置行为。</p></div>
            {saved ? <span className="saved-state">已保存</span> : null}
          </div>
          <SettingRow label="显示浮标" description="从托盘或菜单恢复常驻入口">
            <button className="switch" aria-pressed={!settings.hidden} onClick={() => update({ hidden: !settings.hidden })}><span /></button>
          </SettingRow>
          <SettingRow label="锁定位置" description="锁定后拖动不会改变浮标位置">
            <button className="switch" aria-pressed={settings.locked} onClick={() => update({ locked: !settings.locked })}><span /></button>
          </SettingRow>
          <div className="setting-group">
            <h2>快捷键</h2>
            <p>默认不注册快捷键；如需启用，请使用至少包含一个修饰键的复合组合。冲突时不会静默改用其他按键。</p>
            <SettingRow label="截图" description={shortcutStatus ? shortcutLabel(shortcutStatus.screenshot) : "读取注册状态…"}>
              <input className="shortcut-input" aria-label="截图快捷键" placeholder="例如 CommandOrControl+Shift+2" defaultValue={settings.screenshotShortcut} onBlur={(event) => update({ screenshotShortcut: event.currentTarget.value })} />
            </SettingRow>
            <SettingRow label="打开剪贴板" description={shortcutStatus ? shortcutLabel(shortcutStatus.history) : "读取注册状态…"}>
              <input className="shortcut-input" aria-label="打开剪贴板快捷键" placeholder="例如 CommandOrControl+Shift+H" defaultValue={settings.historyShortcut} onBlur={(event) => update({ historyShortcut: event.currentTarget.value })} />
            </SettingRow>
          </div>
          <div className="setting-group">
            <h2>主题</h2>
            <p>浅色/深色是同一视觉系统的主题状态。</p>
            <div className="segmented" role="radiogroup" aria-label="主题">
              {(["light", "dark", "system"] as const).map((theme) => <button key={theme} className={settings.theme === theme ? "selected" : ""} onClick={() => update({ theme })}>{theme === "light" ? "浅色" : theme === "dark" ? "深色" : "跟随系统"}</button>)}
            </div>
          </div>
          <div className="state-banner" data-state="success">截图与剪贴板历史已接入；快捷键默认不注册，可按需设置；翻译服务尚未配置。</div>
        </div>
      </section>
    </main>
  );
}

function shortcutLabel(status: "registered" | "conflict" | "invalid" | "unset"): string {
  return status === "registered" ? "已注册" : status === "conflict" ? "注册失败：快捷键冲突" : status === "unset" ? "未设置（当前不注册）" : "注册失败：请使用复合快捷键";
}

function SettingRow({ label, description, children }: { label: string; description: string; children: ReactNode }): ReactElement {
  return <div className="setting-row"><div><strong>{label}</strong><p>{description}</p></div>{children}</div>;
}
