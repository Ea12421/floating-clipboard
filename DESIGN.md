# DESIGN.md

> 一件安静的桌面工具：让截图、暂存和回用只在需要时出现，并把每个状态说清楚。
>
> **方向状态：已由用户选定（2026-09-01）**。当前概念板作为唯一主方向；浅色/深色是同一系统的主题状态，不是两套风格。

## 1. Visual Theme & Atmosphere

**Style**：Quiet Utility / 安静工具感

**Keywords**：低打扰、清晰状态、冷静中性、单一强调、轻量层级、可恢复、跨平台、非装饰化

**Tone**：可靠、克制、像工作台上的一件顺手工具 — NOT 科技炫技、玻璃堆叠、营销面板、游戏化

**Feel**：像桌面边缘一枚有磁性的金属书签；平时几乎隐形，触发时给出明确的下一步。

**Design Read**：这是任务型桌面 UI，不是 Landing Page。视觉重点放在入口、当前动作、结果和恢复路径。

**Primary profile**：视觉设计系统 `STYLE_PROFILES_V0.2` 的“产品科技”任务策略，结合桌面工具的低密度常驻与中密度操作窗口。该档案是方法参考，不是已验证品牌皮肤。

**Motion Role**：feedback + continuity。只用于打开/关闭、选区反馈、复制/保存完成、错误和恢复；不使用循环背景动画。

**Dependencies**：优先沿用项目已有依赖；本底稿不授权新增字体、图标包或动效库。

## 2. Color Palette & Roles

```css
:root {
  color-scheme: light;
  --bg: #f3f6f9;                 /* 应用背景 */
  --surface: #ffffff;            /* 窗口、菜单、卡片 */
  --surface-alt: #eaf0f5;        /* 分栏、输入区、禁用底 */
  --surface-hover: #e5edf5;      /* 悬停表面 */
  --border: #d4dee8;             /* 默认边框 */
  --border-hover: #aebdcb;       /* 悬停边框 */
  --text: #17212b;               /* 主文字 */
  --text-secondary: #586878;     /* 正文与描述 */
  --text-tertiary: #788694;      /* 标签与辅助信息 */
  --accent: #2f6fed;             /* 唯一品牌强调色 */
  --accent-hover: #245bc9;
  --accent-soft: #e8efff;
  --bg-rgb: 243, 246, 249;
  --accent-rgb: 47, 111, 237;
  --success: #2d8a62;
  --success-soft: #e7f5ed;
  --warning: #a66a17;
  --warning-soft: #fff3df;
  --error: #c94343;
  --error-soft: #fdeaea;
  --focus-ring: rgba(var(--accent-rgb), 0.34);
  --shadow-menu: 0 12px 32px rgba(35, 57, 79, 0.16), 0 2px 6px rgba(35, 57, 79, 0.08);
  --shadow-window: 0 18px 48px rgba(35, 57, 79, 0.16), 0 3px 10px rgba(35, 57, 79, 0.08);
}

[data-theme="dark"] {
  color-scheme: dark;
  --bg: #10161d;
  --surface: #18212a;
  --surface-alt: #202c37;
  --surface-hover: #263542;
  --border: #334351;
  --border-hover: #506374;
  --text: #edf3f8;
  --text-secondary: #b7c3ce;
  --text-tertiary: #8493a1;
  --accent: #6d9cff;
  --accent-hover: #86adff;
  --accent-soft: #20365f;
  --bg-rgb: 16, 22, 29;
  --accent-rgb: 109, 156, 255;
  --success: #67c596;
  --success-soft: #18372a;
  --warning: #e5ad5d;
  --warning-soft: #3e2e18;
  --error: #ff8585;
  --error-soft: #482326;
  --focus-ring: rgba(var(--accent-rgb), 0.42);
  --shadow-menu: 0 16px 36px rgba(0, 0, 0, 0.34), 0 2px 8px rgba(0, 0, 0, 0.24);
  --shadow-window: 0 24px 54px rgba(0, 0, 0, 0.38), 0 4px 12px rgba(0, 0, 0, 0.24);
}
```

**Color Rules**

- 全部 UI 颜色通过语义变量消费；组件不得散落硬编码颜色。
- `--accent` 只表示当前可操作、选中或链接，不同时承担成功、警告和权限含义。
- 关键状态至少有文字/图标 + 颜色两种独立通道；不能只看颜色判断成功或失败。
- 透明度用于层级，不用于掩盖低对比度；文字与焦点环在浅色、深色和系统对比度增强模式下都要可见。
- 不使用 AI 紫蓝渐变、霓虹外发光、彩色背景轮换或大面积半透明玻璃。

## 3. Typography Rules

**Font Stack**：不加载远程字体，优先使用系统字体以减少安装和跨平台差异。

```css
:root {
  --font-ui: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI",
    "Noto Sans SC", "Microsoft YaHei", sans-serif;
  --font-mono: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
}
```

| Role | Font | Size | Weight | Line Height | Letter Spacing |
|---|---|---:|---:|---:|---:|
| Window title | `--font-ui` | 16px | 650 | 1.3 | -0.01em |
| Section title | `--font-ui` | 14px | 650 | 1.35 | 0 |
| Body | `--font-ui` | 13px | 400 | 1.6 | 0 |
| Compact label | `--font-ui` | 12px | 550 | 1.4 | 0.01em |
| Caption / timestamp | `--font-ui` | 11px | 450 | 1.4 | 0 |
| Shortcut / path | `--font-mono` | 11px | 500 | 1.4 | 0 |

**Typography Rules**

- 窗口标题、动作名称、状态文案优先于装饰性大字；桌面工具不使用 Hero 排版。
- 中文正文默认 13–14px、行高 1.55–1.7；不得为了密度压成 10px 以下。
- 只有路径、快捷键、技术值使用等宽字体；不要用全大写或等宽字体制造“科技感”。
- 禁止依赖远程 Google Fonts；禁止将 Inter、衬线字体或品牌字体作为无依据的默认选择。

**Text Decoration**：无渐变文字、无文字投影、无描边；强调通过字重、位置和 `--accent` 完成。

## 4. Component Stylings

### Floating Bubble

```css
.bubble {
  width: 56px;
  height: 56px;
  border: 1px solid var(--border);
  border-radius: 16px;
  background: color-mix(in srgb, var(--surface) 92%, transparent);
  color: var(--text);
  box-shadow: var(--shadow-menu);
  -webkit-app-region: no-drag;
  transition: transform 120ms ease, border-color 120ms ease, background 120ms ease;
}
.bubble:hover { transform: scale(1.02); border-color: var(--border-hover); background: var(--surface-hover); }
.bubble:active { transform: scale(0.98); }
.bubble[data-locked="true"] { border-color: var(--accent); }
.bubble:focus-visible { outline: 3px solid var(--focus-ring); outline-offset: 2px; }
```

### Action Menu

```css
.action-menu {
  width: 244px;
  padding: 8px;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--surface);
  box-shadow: var(--shadow-menu);
}
.action-item {
  min-height: 38px;
  display: grid;
  grid-template-columns: 22px 1fr auto;
  align-items: center;
  gap: 9px;
  padding: 0 10px;
  border: 0;
  border-radius: 9px;
  background: transparent;
  color: var(--text);
  text-align: left;
}
.action-item:hover { background: var(--surface-hover); }
.action-item:active { background: var(--accent-soft); }
.action-item:focus-visible { outline: 3px solid var(--focus-ring); outline-offset: -2px; }
.action-item[aria-disabled="true"] { color: var(--text-tertiary); cursor: not-allowed; }
```

### Window / Toolbar / Buttons

```css
.app-window { background: var(--bg); color: var(--text); }
.window-toolbar {
  min-height: 48px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 16px;
  border-bottom: 1px solid var(--border);
  background: var(--surface);
}
.button {
  min-height: 36px;
  padding: 0 12px;
  border: 1px solid var(--border);
  border-radius: 9px;
  background: var(--surface);
  color: var(--text);
  font: 550 13px/1 var(--font-ui);
}
.button:hover { border-color: var(--border-hover); background: var(--surface-hover); }
.button:active { transform: translateY(1px); }
.button:focus-visible { outline: 3px solid var(--focus-ring); outline-offset: 2px; }
.button[data-variant="primary"] { border-color: var(--accent); background: var(--accent); color: #fff; }
.button[data-variant="primary"]:hover { background: var(--accent-hover); }
.button[data-variant="danger"] { color: var(--error); }
.button:disabled { opacity: 0.5; cursor: not-allowed; }
```

### History Row / State Banner

```css
.history-row {
  min-height: 64px;
  display: grid;
  grid-template-columns: 36px minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  padding: 10px 14px;
  border-bottom: 1px solid var(--border);
  background: var(--surface);
}
.history-row:hover { background: var(--surface-hover); }
.history-row[data-selected="true"] { background: var(--accent-soft); }
.state-banner { border: 1px solid var(--border); border-radius: 10px; padding: 10px 12px; }
.state-banner[data-state="success"] { border-color: var(--success); background: var(--success-soft); }
.state-banner[data-state="warning"] { border-color: var(--warning); background: var(--warning-soft); }
.state-banner[data-state="error"] { border-color: var(--error); background: var(--error-soft); }
```

### Pinned Image Window

- 图片本身是主内容，控制条只在 hover、键盘聚焦或窗口边缘显示，不能遮挡主体。
- 默认背景为 `--surface`，控制条使用 `--surface-alt`；透明度变化只作用于图片内容，不让按钮一起消失。
- 缩放以 100% 为基准，提供适合窗口、放大和还原，不使用无限缩放。

## 5. Layout Principles

**窗口尺寸与安全区**

- 浮标：56×56px；距当前可见工作区边缘默认 16px。
- 动作菜单：244px 宽，最多 4 个核心动作，不滚动。
- 历史窗口：默认 760×620px，最小 560×420px；左右分栏在窄窗口退化为顶部筛选。
- 设置窗口：默认 680×560px，按“快捷键 / 常规 / 历史 / 权限与翻译”分组。
- 图片窗口：默认不超过可见工作区 42% 宽或高；保留 12px 可见边界，避免遮挡过大区域。

**Spacing Scale**：2、4、8、12、16、24、32、48px。组内间距 8–16px，组间间距 24px；不使用任意单次间距。

**Grid**

```css
.history-layout {
  display: grid;
  grid-template-columns: 168px minmax(0, 1fr);
  min-height: 0;
}
.settings-layout {
  display: grid;
  grid-template-columns: 176px minmax(0, 1fr);
  gap: 24px;
  padding: 24px;
}
@media (max-width: 640px) {
  .history-layout, .settings-layout { grid-template-columns: 1fr; }
  .settings-layout { gap: 16px; padding: 16px; }
}
```

## 6. Depth & Elevation

| Level | Treatment | Use |
|---|---|---|
| Flat | 无阴影，仅边框或分隔线 | 历史行、设置分组、输入区 |
| Subtle | `0 2px 6px` 级别的背景色阴影 | 浮标、悬停菜单 |
| Elevated | `--shadow-menu` | 动作菜单、临时状态提示 |
| Window | `--shadow-window` | 历史、设置、图片浮窗与主窗口边界 |

阴影使用冷灰透明层，不能使用纯黑硬投影；同一层级不叠加多个阴影和大面积 `backdrop-filter`。

## 7. Animation & Interaction

**Motion Purpose**：告诉用户“入口已打开、动作正在进行、结果已保存或失败可恢复”。没有这些目的的动效不采用。

**Modes**：full（默认）/ reduced（系统偏好）/ static（性能或透明度关闭）。

```css
.menu-enter { opacity: 0; transform: translateY(4px) scale(0.98); }
.menu-enter-active { opacity: 1; transform: translateY(0) scale(1); transition: opacity 120ms ease, transform 120ms ease; }
.status-progress { animation: status-pulse 1.2s ease-in-out infinite; }
@keyframes status-pulse { 0%, 100% { opacity: .62; } 50% { opacity: 1; } }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 1ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 1ms !important;
    scroll-behavior: auto !important;
  }
}
```

**行为规则**

- 浮标 hover 只做 1.02 倍缩放和边框变化；不漂浮、不旋转、不呼吸。
- 菜单打开/关闭 120ms 内完成；点击动作后立即关闭，并由目标窗口或状态条承接反馈。
- 截图选区使用边界线、尺寸文本和半透明遮罩；不使用闪烁或声音作为唯一确认。
- 翻译中显示进度状态；超时/失败保留原图并提供重试或继续使用基础功能。
- 浮标隐藏后不自动弹出；只能由托盘或显式快捷键恢复。

## 8. Do's and Don'ts

### Do

- 用一个稳定的入口承载高频动作，把复杂度放到按需窗口。
- 让“当前动作、结果、限制、下一步”在同一视线范围内可见。
- 用文字 + 图标/位置 + 颜色表达成功、失败、权限和采集状态。
- 保留空状态、加载、失败、重试、取消、清空确认和返回路径。
- 让键盘焦点、系统文字缩放、深色模式和 reduced motion 有真实效果。
- 让截图、图片历史和图片浮窗共享同一内容身份，不用不同缩略图伪装成不同对象。
- 优先使用本地、可追溯的图标和字体；记录第三方资产许可。

### Don't

- ❌ 不做持续顶部面板、全屏 dashboard 或默认展开的历史墙。
- ❌ 不使用紫蓝渐变、霓虹光晕、粒子、网格线或玻璃模糊制造“AI 科技感”。
- ❌ 不把截图、复制、钉住、翻译都画成同等权重的彩色 CTA。
- ❌ 不用颜色作为权限、成功、失败或采集状态的唯一通道。
- ❌ 不隐藏关键错误、权限缺失或清空确认在 hover、toast 或自动消失文本里。
- ❌ 不用等宽字体、全大写、版本号和装饰性状态点制造信息密度。
- ❌ 不将 mock、合成数据或一张成功截图当作真实功能证据。
- ❌ 不自动上传剪贴板、不自动粘贴、不在日志里记录原文、图片或密钥。
- ❌ 不把历史窗口、图片浮窗和设置窗口做成相同的卡片堆叠；它们的任务不同，布局也应不同。
- ❌ 不以“更多动画、更大圆角、更强阴影”代替可恢复的交互设计。

## 9. Responsive / Window Behavior

桌面应用不存在传统网页式移动端，但需要覆盖三种窗口状态：

| Mode | Width | Key Changes |
|---|---:|---|
| Wide desktop | ≥ 760px | 历史/设置双栏，完整工具栏和预览 |
| Compact window | 560–759px | 侧栏缩窄，次级文字减少，保留主操作 |
| Narrow fallback | < 560px | 单栏、顶部筛选、操作收进更多菜单；不隐藏错误和返回 |

**Touch / pointer targets**：可操作控件最小 36×36px；浮标 56×56px；焦点环外扩不改变点击命中区。

**Platform behavior**

- macOS：浮标和菜单尊重可见工作区、刘海/菜单栏安全区；设置和历史为正常可聚焦窗口。
- Windows：尊重任务栏工作区与系统缩放；窗口移动和缩放不得依赖固定物理像素。
- 深色模式由系统偏好或设置显式控制；不在运行中突然切换造成内容跳动。
- `prefers-reduced-motion`、高对比度和键盘导航关闭非必要效果，但保留状态文本和操作入口。

## 10. 视觉验收清单

每个实现切片至少检查：

- 浮标闲置不抢焦点，菜单打开后焦点可回收；
- 浅色/深色下正文、次级文字、错误和焦点环可读；
- 空、加载、成功、失败、权限拒绝、冲突、清空确认均有可见状态；
- 关键状态关闭颜色、动画或声音后仍可理解；
- 历史行、图片预览、设置表单在窄窗口不溢出；
- 截图选区、图片浮窗和浮标位置在不同 DPI 下保持语义正确；
- 不出现假数据、假截图、未登记资产或未声明功能。
