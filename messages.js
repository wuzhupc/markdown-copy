// 从会话消息里提取「可以复制为 Markdown」的候选条目。
// 只取用户消息、助手正文、压缩摘要；工具调用、reasoning、系统注入不参与。

/** 一条消息的原始 Markdown 文本（没有则返回空串）。 */
export function messageText(message) {
  if (!message) return ""
  if (message.type === "user") return typeof message.text === "string" ? message.text.trim() : ""
  if (message.type === "assistant") {
    const parts = Array.isArray(message.content) ? message.content : []
    return parts
      .filter((part) => part && part.type === "text" && typeof part.text === "string")
      .map((part) => part.text)
      .join("\n\n")
      .trim()
  }
  if (message.type === "compaction") {
    return message.status === "completed" && typeof message.summary === "string" ? message.summary.trim() : ""
  }
  return ""
}

/** 角色标签。 */
export function roleLabel(role) {
  if (role === "user") return "你"
  if (role === "assistant") return "助手"
  if (role === "compaction") return "摘要"
  return role
}

function clock(created) {
  if (typeof created !== "number" || !Number.isFinite(created)) return ""
  const date = new Date(created)
  const pad = (value) => String(value).padStart(2, "0")
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function preview(text, limit = 60) {
  const flat = text
    .replace(/```[\s\S]*?```/g, " [代码块] ")
    .replace(/[#>*_`~|-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
  if (flat.length <= limit) return flat
  return flat.slice(0, limit) + "…"
}

/**
 * 生成对话框候选：按时间顺序返回 { value, title, description, footer, role, text }。
 * `value` 用消息 ID，选择后再回查原文。
 */
export function candidates(messages) {
  const list = Array.isArray(messages) ? messages : []
  const result = []
  for (const message of list) {
    const text = messageText(message)
    if (!text) continue
    const role = message.type
    const time = clock(message.time?.created)
    const head = [roleLabel(role), time].filter(Boolean).join(" · ")
    result.push({
      value: message.id,
      title: `${head} · ${preview(text)}`,
      heading: head,
      description: text.length > 400 ? `长消息，${text.length} 字符` : undefined,
      footer: `${text.length} 字符`,
      role,
      text,
    })
  }
  return result
}

/** 最后一条助手消息的 value，用作对话框默认选中项。 */
export function lastAssistantValue(items) {
  for (let index = items.length - 1; index >= 0; index -= 1) {
    if (items[index].role === "assistant") return items[index].value
  }
  return items.length > 0 ? items[items.length - 1].value : undefined
}
