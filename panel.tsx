// 消息原文面板：把一条消息的 Markdown 源码逐字显示出来，用户自己选中需要的片段复制。
// 选区在「选区结束」时就缓存下来：部分终端/版本会在按键时清掉选区，导致 Alt+C 读不到。
import { Show, createEffect, createSignal, onCleanup } from "solid-js"
import { copyText } from "./clipboard.js"

export const PANEL_NAME = "markdown-copy.source"

type Props = {
  context: any
  panel: any
  source: () => string
  heading: () => string
  style: any
}

/** 注册到 session.panel 的入口：只有当前面板名匹配时才渲染。 */
export function renderSourcePanel(props: Props) {
  return (
    <Show when={props.panel.name === PANEL_NAME}>
      <SourcePanel {...props} />
    </Show>
  )
}

function SourcePanel(props: Props) {
  const context = props.context
  const notify = (message: string, variant: "info" | "success" | "warning" | "error") =>
    context.ui.toast.show({ title: "Markdown 源码", message, variant })

  const [captured, setCaptured] = createSignal("")

  const live = (): string => {
    try {
      return context.renderer.getSelection?.()?.getSelectedText?.() ?? ""
    } catch {
      return ""
    }
  }

  // 选区结束（鼠标抬起）时缓存；按键时选区可能已经被宿主清掉
  const capture = () => {
    if (context.ui.panel.current?.()?.name !== PANEL_NAME) return
    setCaptured(live())
  }

  try {
    context.renderer.on?.("selection", capture)
    onCleanup(() => context.renderer.off?.("selection", capture))
  } catch {}

  // 切换到另一条消息时丢弃旧选区
  createEffect(() => {
    props.source()
    setCaptured("")
  })

  const copySelection = async () => {
    const text = captured() || live()
    if (text.trim().length === 0) {
      notify(
        "没读到 TUI 选区：若你是 Shift+拖动（终端选区），请用终端复制键；否则重新拖选后再按 Alt+C",
        "warning",
      )
      return
    }
    try {
      const via = await copyText(text, context.renderer)
      notify(`已复制选区（${text.length} 字符 · ${via === "osc52" ? "终端 OSC52" : "系统剪贴板"}）`, "success")
    } catch (error) {
      notify(`复制失败：${error instanceof Error ? error.message : String(error)}`, "error")
    }
  }

  const copyAll = async () => {
    const text = props.source()
    if (text.length === 0) return
    try {
      const via = await copyText(text, context.renderer)
      notify(`已复制整条消息（${text.length} 字符 · ${via === "osc52" ? "终端 OSC52" : "系统剪贴板"}）`, "success")
    } catch (error) {
      notify(`复制失败：${error instanceof Error ? error.message : String(error)}`, "error")
    }
  }

  context.keymap.layer(() => ({
    mode: "global",
    priority: 10,
    commands: [
      { id: "markdown.copy.selection", title: "Copy selection", bind: "alt+c", run: copySelection },
      { id: "markdown.copy.all", title: "Copy whole message", bind: "y", run: copyAll },
      { id: "markdown.copy.close", title: "Close source view", bind: "escape", run: () => props.panel.close() },
    ],
  }))

  return (
    <box
      flexDirection="column"
      flexGrow={1}
      minHeight={0}
      paddingLeft={1}
      paddingRight={1}
      onMouseUp={capture}
    >
      <box paddingBottom={1}>
        <text fg={context.theme.text.muted}>
          {props.heading()} ·{" "}
          {captured() ? `已选 ${captured().length} 字符 · Alt+C 复制` : "鼠标拖选片段 · Alt+C 复制"} · y 全文 ·
          Esc 关闭
        </text>
      </box>
      <scrollbox flexGrow={1} minHeight={0}>
        <code
          width="100%"
          filetype="markdown"
          content={props.source()}
          syntaxStyle={props.style}
          conceal={false}
          streaming={false}
          wrapMode="word"
        />
      </scrollbox>
    </box>
  )
}
