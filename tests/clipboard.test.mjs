// 剪贴板行为测试：Windows 上做真实回读，会覆盖当前剪贴板。
// 运行：node tests/clipboard.test.mjs
import assert from "node:assert"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { execFileSync } from "node:child_process"
import { copyText } from "../clipboard.js"

const powershell = (script) =>
  execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], {
    windowsHide: true,
  })

function readClipboard() {
  const out = path.join(os.tmpdir(), `opencode-clipboard-readback-${process.pid}.txt`)
  const escaped = out.replaceAll("\\", "/").replaceAll("'", "''")
  fs.rmSync(out, { force: true })
  powershell(`[IO.File]::WriteAllText('${escaped}', (Get-Clipboard -Raw), [Text.Encoding]::UTF8)`)
  const text = fs.readFileSync(out, "utf8").replace(/^\uFEFF/, "")
  fs.rmSync(out, { force: true })
  return text.replace(/\r\n/g, "\n")
}

const sample = "## 表格\n| 名称 | 说明 |\n| --- | --- |\n| 中文 | `代码` |\n"

if (process.platform !== "win32") {
  console.log("skip (not Windows)")
  process.exit(0)
}

// 1) Windows 走系统命令：即使终端声称支持 OSC52，也不依赖它
{
  let captured
  const via = await copyText(sample, {
    isOsc52Supported: () => true,
    copyToClipboardOSC52: (value) => {
      captured = value
      return true
    },
  })
  assert.equal(via, "system")
  assert.equal(captured, undefined, "Windows must not rely on OSC52")
  assert.equal(readClipboard(), sample)
  console.log("Windows system clipboard OK")
}

// 2) 超过上限时同样只走系统命令
{
  let captured
  const big = "x".repeat(100_001)
  const via = await copyText(big, {
    isOsc52Supported: () => true,
    copyToClipboardOSC52: (value) => {
      captured = value
      return true
    },
  })
  assert.equal(via, "system")
  assert.equal(captured, undefined)
  assert.equal(readClipboard().length, big.length)
  console.log("oversized text OK")
}

// 3) 非 Windows 平台：模拟 OSC52 可用时只走终端
{
  const original = process.platform
  Object.defineProperty(process, "platform", { value: "linux" })
  try {
    let captured
    const via = await copyText(sample, {
      isOsc52Supported: () => true,
      copyToClipboardOSC52: (value) => {
        captured = value
        return true
      },
    })
    assert.equal(via, "osc52")
    assert.equal(captured, sample)
    console.log("OSC52 path OK")
  } finally {
    Object.defineProperty(process, "platform", { value: original })
  }
}

// 4) 空内容报错
await assert.rejects(() => copyText("", undefined), /没有可复制的内容/)

// 清理
powershell("Set-Clipboard -Value ' '")
console.log("clipboard.test.mjs OK")
