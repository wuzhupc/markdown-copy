# Changelog

本项目的重要变更记录在此。格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [Unreleased]

## [1.2.2] - 2026-11-24

首个公开发布版本。

### Added

- 会话消息选择器：`Alt+M`、`/mdsrc`（别名 `/copymd`、`/md-copy`）、命令面板 `View message as Markdown`。
- 只读 Markdown 源码面板：鼠标拖选 + `Alt+C` 复制选区，`y` 复制整条，`Esc` 关闭。
- 选区在拖选结束时缓存，规避按键时选区被宿主清空导致复制失败。
- 剪贴板双通道：Windows 使用 `Set-Clipboard`（UTF-8 stdin）；macOS / Linux / SSH 优先 OSC 52，超长或不可用时回退 `pbcopy` / `wl-copy` / `xclip` / `xsel`。
- 面板不可用时退化为复制整条消息。
- Windows 部署脚本 `deploy.ps1`（含打包校验）与 macOS / Linux 部署脚本 `install.sh`。
- 单元测试 `tests/messages.test.mjs`、剪贴板测试 `tests/clipboard.test.mjs`，以及 GitHub Actions CI。

[Unreleased]: https://github.com/wuzhupc/markdown-copy/compare/v1.2.2...HEAD
[1.2.2]: https://github.com/wuzhupc/markdown-copy/releases/tag/v1.2.2
