// TUI 插件：选一条会话消息 → 弹出它的 Markdown 原文 → 用户自选片段复制。
// 与内置 /copy 的区别：可以选历史消息，并且能复制消息里的任意片段（含表格的半张）。
import { createSignal } from "solid-js"
import { SyntaxStyle } from "@opentui/core"
import { Plugin } from "@opencode/plugin/tui"
import { copyText } from "./clipboard.js"
import { candidates, lastAssistantValue } from "./messages.js"
import { PANEL_NAME, renderSourcePanel } from "./panel.jsx"

export default Plugin.define({
  id: "markdown-copy",
  setup(context) {
    const [source, setSource] = createSignal("")
    const [heading, setHeading] = createSignal("")
    const style = SyntaxStyle.fromStyles(
      { default: { fg: context.theme.text.base } },
      context.renderer.nativeScene,
    )

    // 面板内容由这个 slot 提供；panel.open 只负责激活它
    context.ui.slot({
      append: "session.panel",
      render: (panel) => renderSourcePanel({ context, panel, source, heading, style }),
    })

    context.keymap.layer(() => ({
      mode: "global",
      commands: [
        {
          id: "markdown.view.message",
          title: "View message as Markdown",
          description: "选择一条消息，打开它的 Markdown 原文，自己选中片段复制",
          group: "Session",
          bind: "alt+m",
          palette: true,
          slash: { name: "mdsrc", aliases: ["copymd", "md-copy"] },
          async run() {
            const route = context.ui.router.current()
            if (route.type !== "session") {
              context.ui.toast.show({
                title: "Markdown 源码",
                message: "请先打开一个会话",
                variant: "warning",
              })
              return
            }

            try {
              await context.data.session.message.sync(route.sessionID)
            } catch {}

            const items = candidates(context.data.session.message.list(route.sessionID))
            if (items.length === 0) {
              context.ui.toast.show({
                title: "Markdown 源码",
                message: "这个会话还没有可查看的消息",
                variant: "warning",
              })
              return
            }

            const picked = await context.ui.dialog.select({
              title: "查看消息 Markdown",
              placeholder: "搜索消息…",
              current: lastAssistantValue(items),
              options: items.map((item) => ({
                title: item.title,
                value: item.value,
                description: item.description,
                footer: item.footer,
              })),
            })
            if (picked === undefined) return

            const item = items.find((entry) => entry.value === picked)
            if (!item) return

            setSource(item.text)
            setHeading(`${item.heading} · ${item.text.length} 字符`)

            if (context.ui.panel.open(PANEL_NAME, { presentation: "fullscreen" })) return

            // 面板打不开时退化为整条复制，至少不白选一次
            try {
              await copyText(item.text, context.renderer)
              context.ui.toast.show({
                title: "Markdown 源码",
                message: `面板不可用，已复制整条消息（${item.text.length} 字符）`,
                variant: "warning",
              })
            } catch (error) {
              context.ui.toast.show({
                title: "Markdown 源码",
                message: `复制失败：${error instanceof Error ? error.message : String(error)}`,
                variant: "error",
              })
            }
          },
        },
      ],
      bindings: ["markdown.view.message"],
    }))

    return () => context.renderer.idle().then(() => style.destroy())
  },
})
