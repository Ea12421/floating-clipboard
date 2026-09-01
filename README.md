# 截图剪贴板浮块

一个本地优先的 macOS / Windows 桌面工具：平时只显示一个小悬浮浮标，按需截图、复制图片、查看文字与图片剪贴板历史。

## 当前状态

- macOS：已在真实 Electron 界面完成截图、剪贴板监听、历史、固定、设置与主题走查。
- Windows：已按 Electron 跨平台实现并提供构建配置；当前没有 Windows 实机运行证据，请将 Windows 下载包视为“可试用、未实机验证”。
- 翻译：当前只保留可插拔入口，未配置翻译服务时不会上传图片，也不会影响基础截图与剪贴板能力。
- 默认快捷键：为空，不会启动时抢占全局快捷键；用户可在设置中填写至少包含修饰键的复合组合。

## 下载

请到 [GitHub Releases](https://github.com/Ea12421/floating-clipboard/releases) 下载对应平台附件：

- macOS Apple Silicon：`.dmg` 或 `.zip`
- Windows：`.exe` 安装包或 portable 版本（未在 Windows 实机验证）

macOS 安装包当前未进行 Developer ID 签名。首次运行可能需要在系统设置中授予屏幕录制权限。

## 本地开发

```bash
npm install
npm run typecheck
npm run build
npm start
```

生成 macOS 安装包：

```bash
npm run dist
```

electron-builder 配置了 macOS 与 Windows 的 NSIS / portable 目标。Windows 安装包需要在 Windows 或配置好 Wine 的环境中生成和验证。

## 范围边界

当前只处理单屏、本地数据和单机使用，不包含账号、云同步、多显示器联动、远程控制或自动粘贴。

## 许可证

MIT，见 [LICENSE](./LICENSE)。
