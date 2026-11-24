# 参与贡献

感谢你愿意改进 `markdown-copy`。这是一个无构建步骤的 OpenCode TUI 插件，改动很小、验证很快。

## 环境

- Node.js 18+
- OpenCode TUI v2.4.1+（手工验证用）
- Bun（可选，用于打包校验与 `deploy.ps1`）

```bash
git clone https://github.com/wuzhupc/markdown-copy.git
cd markdown-copy
node tests/messages.test.mjs
```

Windows 上额外可以跑 `node tests/clipboard.test.mjs`（会覆盖当前剪贴板），并用 `pwsh -File ./deploy.ps1` 部署到本机插件目录后手工验收。

## 提交改动

1. 从 `main` 开分支：`fix/selection-cache`、`feat/picker-filter`。
2. 保持改动聚焦，一个 PR 只做一件事。
3. 补充或更新测试：
   - 逻辑改动 → `tests/messages.test.mjs` 或新增测试文件；
   - 剪贴板通道改动 → `tests/clipboard.test.mjs`；
   - 打包行为改动 → `npm run check`（需要 bun）。
4. 更新 `README.md` / `README.en.md` 与 `CHANGELOG.md` 的 `Unreleased` 段落（如果用户可见）。
5. 本地全绿后再开 PR，并在描述里写清：动机、行为变化、验证方式、终端/平台。

## 代码约定

- 源码注释用中文，标识符与提交信息用英文。
- `.ps1` 脚本内部一律英文（规避 PowerShell 的编码问题）。
- 不引入运行时 npm 依赖，插件保持"复制文件即可用"。
- 面板相关代码注意：`context.renderer` / `context.ui` 的 API 在不同 OpenCode 版本间可能变动，调用处保留 `try/catch` 或可选链。
- 提交信息使用 Conventional Commits：`feat:`、`fix:`、`docs:`、`test:`、`chore:`。

## 发布流程

1. 更新 `package.json` 的 `version` 与 `CHANGELOG.md`（把 `Unreleased` 内容移到新版本标题下）。
2. `node tests/messages.test.mjs && npm run check`。
3. 提 PR 合入 `main`，然后打标签：

   ```bash
   git tag -a v1.2.2 -m "markdown-copy 1.2.2"
   git push origin main --tags
   ```

4. 在 GitHub Releases 中用 `CHANGELOG.md` 对应段落写发布说明。

## 问题反馈

开 issue 时请附上：OpenCode 版本（`opencode --version`）、操作系统与终端（含 tmux/SSH 情况）、复现步骤、toast 里显示的通道、期望结果与实际结果。
