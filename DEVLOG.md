# 开发日志

## 2026-09-01 — Slice 1 骨架首轮

- 建立 Electron + TypeScript + React/Vite 工程入口与生产构建脚本。
- 完成 main / preload / renderer 边界；renderer 仅通过白名单 IPC 访问主进程。
- 完成浮标显示、隐藏、拖动、锁定、托盘入口、动作菜单和设置窗口。
- 位置、锁定、隐藏和主题状态使用主进程原子 JSON adapter 持久化；SQLite 留到 Slice 2 的历史数据接入。
- 依赖安装完成；npm 报告 2 个 high severity 漏洞，未执行自动升级。
- 验证：`npm run typecheck` PASS；`npm run build` PASS；`npm run dev` 与 `npm start` 均能启动真实 Electron 进程，并生成 `~/Library/Application Support/floating-clipboard/settings.json`。
- 修正：对齐 TypeScript 输出的 main 入口与 production renderer 路径；浮标增加拖动阈值，避免拖动结束误触发菜单点击。
- 未完成：Windows 启动/重启回读证据、真实 GUI 交互走查；本 Slice 不包含截图、剪贴板历史或翻译。

## 2026-09-01 — Slice 2 本地历史骨架

- 安装 `better-sqlite3` 与类型声明，建立 `history.sqlite`、WAL 和 `images/` 目录。
- 接入文本/图片条目、SHA-256 去重、固定、搜索、复制、物理删除、清空、上限清理和隐藏剪贴板类型过滤。
- 接入可关闭的系统剪贴板轮询监听；历史窗口支持分栏筛选、搜索、复制、固定、删除和清空确认。
- 验证：`npm run typecheck` PASS；`npm run build` PASS；production Electron 初始化数据库；隔离目录 `HISTORY_SMOKE=PASS`（去重、固定、物理清空）。

## 2026-09-01 — Slice 2 图片预览与验证收口

- 新增 `history:preview` 白名单 IPC：主进程从受控图片 ID 读取本地 PNG，并缩放为 120×80 缩略图 data URL；renderer 历史行显示真实图片缩略图。
- 历史窗口改为单例复用，避免重复打开产生多个窗口；设置页状态提示同步到当前能力范围。
- 验证：`npm run typecheck` PASS；`npm run build` PASS；隔离目录 `HISTORY_IMAGE_SMOKE=PASS`（图片插入、读取、SHA-256 去重、清空物理删除）。
- 生产 Electron 最新一次启动在当前 macOS 会话触发 Electron 36.9.5 的 `SIGABRT`（`NSApplication` 初始化阶段，已做一次 `--no-sandbox` 有界重试仍复现）；此前同一构建已有启动并创建 `history.sqlite/WAL/images` 的证据，当前不把本次环境崩溃误判为代码通过。
- 未完成：真实系统剪贴板文字/图片采集手动走查（不自动覆盖用户当前剪贴板）、Windows 运行证据；截图来源将在 Slice 3 接入。

## 2026-09-01 — Slice 3 单屏截图闭环首轮

- 新增 `ScreenshotAdapter`：按触发瞬间鼠标所在显示器调用 `desktopCapturer`，按显示器缩放因子把逻辑选区裁成 PNG。
- 新增透明选区窗口：支持拖动选择、Esc 取消、Enter 确认；确认后写入图片历史并复制到系统剪贴板，取消不产生记录。
- 验证：`npm run typecheck` PASS；生产 `npm run build` PASS（通过受控外部权限刷新 `/Users/m4air/Projects/截图剪贴板浮块/dist`）；`SCREENSHOT_ADAPTER_LOAD=PASS`；Electron 进程已成功保持运行。
- 未完成：当前会话尚未做真实屏幕录制权限与选区边界的人工 GUI 走查；快捷键配置、翻译适配器、Windows 运行证据待后续切片。

## 2026-09-01 — Slice 4/5 核心能力接入

- 接入默认全局快捷键：截图 `CommandOrControl+Shift+2`、打开剪贴板 `CommandOrControl+Shift+H`；设置页可编辑 accelerator，主进程返回 `registered / conflict / invalid` 状态。
- 截图翻译入口改为明确的未配置提示，不调用网络、不上传图片，基础截图与历史能力保持独立可用。
- 验证：`npm run typecheck` PASS；`npm run build` PASS；Electron 已使用最新构建重启并保持运行。
- 未完成：真实屏幕录制权限与选区边界的人工 GUI 走查、Windows 启动/重启回读和安装包签名证据。

## 2026-09-01 — macOS 本地安装包

- 修正 `package.json`：将 `electron` 移到 `devDependencies`，同步 `package-lock.json`，满足 electron-builder 依赖约束。
- 生成未签名本地安装包：`dist/截图剪贴板浮块-0.1.0-arm64.dmg`、`dist/截图剪贴板浮块-0.1.0-arm64-mac.zip`。
- 产物 SHA-256（含最新历史自动刷新与快捷键默认策略修复）：DMG `a2c8c9747002c971efcd60eb061d4e7cfe3143c7196a0ddd83110c2bd5084ad5`；ZIP `6762c328a3a3a93bd9a546fcf65782db2667435a9b5301a7019b2e299d84dc96`。
- 打包日志明确记录：未找到 Developer ID，未执行 macOS 代码签名；当前交付级别为 built/verified，不宣称安装包签名或两平台完成。

## 2026-09-01 — Computer Use macOS GUI 闭环验收

- 通过真实 Electron 界面完成浮标 → 动作菜单 → 截图选区 → 图片复制/历史回读；拖动选区后窗口回到浮标，历史出现图片条目。
- 通过历史窗口完成图片固定、采集开关切换；设置窗口显示截图与历史快捷键均为“已注册”，并完成浅色/深色/系统主题往返。
- 首次观察到历史窗口不会自动刷新；数据层核验确认监听器已写入文字，根因为 renderer 只在打开/筛选变化时加载列表。
- 最小修复：历史窗口打开期间每秒回读一次历史；不改变监听器、IPC 或存储协议。
- 复现验证：在 TextEdit 中真实输入并执行全选/复制，历史窗口在保持打开状态下自动出现 `CUA live refresh 2026-09-01 · 剪贴板`；`npm run typecheck` PASS、`npm run build` PASS。
- 当前仍未完成：Windows 真实启动/重启与安装包证据；macOS 安装包未签名，截图权限需在目标机器首次运行时由系统授予。

## 2026-09-01 — 快捷键默认策略与打包输出修正

- 默认截图/历史快捷键改为空值，启动时不注册任何全局组合键；设置页提示“未设置（当前不注册）”。
- 注册前要求至少一个修饰键和一个主键；单个字母/数字不会被注册，冲突仍明确报告。
- 保留已有用户主动保存的快捷键，不在加载配置时覆盖。
- electron-builder 输出改至 `release/`，应用文件白名单收窄为 `dist/main` 与 `dist/renderer`，避免旧产物递归进入新安装包。
- 验证：干净配置读取 `screenshotShortcut=""`、`historyShortcut=""`；`npm run typecheck` PASS；`npm run dist` PASS；ZIP 完整性检查 PASS；DMG 115MB、ZIP 116MB。
