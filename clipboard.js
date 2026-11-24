// 剪贴板写入：Windows 本机直接用系统命令（结果确定）；其他平台优先终端 OSC 52（快、SSH 也能用），
// 不支持或内容过大时回退到 pbcopy / wl-copy / xclip / xsel。
// 插件上下文没有剪贴板 API，OSC 52 通过 context.renderer 写。
import { spawn } from "node:child_process"

/** OSC 52 载荷过大时部分终端会截断，超过该字节数直接走系统命令。 */
const OSC52_LIMIT = 100_000

/**
 * 把文本写入剪贴板；失败时抛错，成功时返回实际使用的通道。
 * Windows 本机优先用系统命令（结果确定），其余平台优先 OSC 52（SSH 也能用）。
 * @param {string} text
 * @param {{ copyToClipboardOSC52?: (text: string) => boolean, isOsc52Supported?: () => boolean }} [renderer]
 * @returns {Promise<"osc52" | "system">}
 */
export async function copyText(text, renderer) {
  const value = String(text ?? "").replaceAll("\0", "")
  if (value.length === 0) throw new Error("没有可复制的内容")

  const size = Buffer.byteLength(value, "utf8")

  if (process.platform === "win32") {
    await windows(value)
    return "system"
  }

  if (size <= OSC52_LIMIT && writeOsc52(renderer, value)) return "osc52"

  if (process.platform === "darwin") await run("pbcopy", [], value)
  else await unix(value)
  return "system"
}

/** 返回是否已经通过终端写入。 */
function writeOsc52(renderer, value) {
  try {
    if (!renderer || typeof renderer.copyToClipboardOSC52 !== "function") return false
    if (typeof renderer.isOsc52Supported === "function" && !renderer.isOsc52Supported()) return false
    return renderer.copyToClipboardOSC52(value) !== false
  } catch {
    return false
  }
}

/** 启动子进程并等待退出；input 传入时写进 stdin。 */
function run(cmd, args, input) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      windowsHide: true,
      stdio: [input === undefined ? "ignore" : "pipe", "ignore", "pipe"],
    })
    let stderr = ""
    child.stderr?.on("data", (chunk) => {
      stderr += chunk.toString()
    })
    child.on("error", reject)
    child.on("close", (code) => {
      if (code === 0) resolve()
      else reject(new Error(stderr.trim() || `${cmd} 退出码 ${code}`))
    })
    if (input !== undefined) {
      child.stdin.write(input)
      child.stdin.end()
    }
  })
}

async function unix(value) {
  const candidates = [
    ["wl-copy", []],
    ["xclip", ["-selection", "clipboard"]],
    ["xsel", ["--clipboard", "--input"]],
  ]
  let lastError
  for (const [cmd, args] of candidates) {
    try {
      await run(cmd, args, value)
      return
    } catch (error) {
      lastError = error
    }
  }
  throw lastError ?? new Error("没有可用的剪贴板命令（wl-copy / xclip / xsel）")
}

async function windows(value) {
  const powershell = process.env.SystemRoot
    ? `${process.env.SystemRoot}\\System32\\WindowsPowerShell\\v1.0\\powershell.exe`
    : "powershell.exe"
  // 用 UTF-8 读 stdin，避免控制台代码页（936）把中文弄乱
  const script =
    "[Console]::InputEncoding = [Text.Encoding]::UTF8; " +
    "Set-Clipboard -Value ([Console]::In.ReadToEnd())"
  await run(powershell, [
    "-NonInteractive",
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-Command",
    script,
  ], value)
}
