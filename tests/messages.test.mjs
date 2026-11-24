import assert from "node:assert"
import { candidates, lastAssistantValue, messageText } from "../messages.js"

const base = 1730000000000

const messages = [
  { id: "m1", type: "user", time: { created: base }, text: "帮我整理一个表" },
  {
    id: "m2",
    type: "assistant",
    time: { created: base + 60_000 },
    content: [
      { type: "reasoning", text: "内部思考" },
      { type: "text", text: "结果如下：\n\n| A | B |\n| - | - |\n| 1 | 2 |" },
      { type: "tool", tool: "grep" },
      { type: "text", text: "完事。" },
    ],
  },
  {
    id: "m3",
    type: "assistant",
    time: { created: base + 120_000 },
    content: [{ type: "tool", tool: "read" }],
  },
  {
    id: "m4",
    type: "compaction",
    time: { created: base + 180_000 },
    status: "completed",
    summary: "## 摘要\n历史被压缩。",
  },
  { id: "m5", type: "system", time: { created: base + 200_000 }, text: "系统提示" },
]

assert.equal(messageText(messages[1]), "结果如下：\n\n| A | B |\n| - | - |\n| 1 | 2 |\n\n完事。")
assert.equal(messageText(messages[2]), "", "tool-only assistant message is not copyable")
assert.equal(messageText(messages[3]), "## 摘要\n历史被压缩。")
assert.equal(messageText(messages[4]), "", "system messages are skipped")

const items = candidates(messages)
assert.equal(items.length, 3, "user + assistant + compaction only")
assert.deepEqual(
  items.map((item) => item.role),
  ["user", "assistant", "compaction"],
)
assert.equal(items[1].value, "m2")
assert.match(items[1].title, /助手 · \d\d:\d\d · 结果如下/)
assert.equal(items[1].heading, "助手 · " + new Date(base + 60_000).getHours().toString().padStart(2, "0") + ":" +
  new Date(base + 60_000).getMinutes().toString().padStart(2, "0"))
assert.equal(items[1].footer, `${messageText(messages[1]).length} 字符`)
assert.equal(lastAssistantValue(items), "m2")

assert.equal(lastAssistantValue([{ value: "u1", role: "user" }]), "u1")
assert.deepEqual(candidates(undefined), [])
assert.equal(lastAssistantValue([]), undefined)

console.log("messages.test.mjs OK")
