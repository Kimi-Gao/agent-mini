/**
 * agent.ts — 基于 pi SDK 的最小对话 agent
 * A minimal chat agent built on the pi SDK.
 *
 * 教学目标 / Learning objectives
 * ────────────────────────────────
 * 1. 如何创建一个 ModelRuntime（管理凭据 + 模型目录）
 *    How to create a ModelRuntime (auth + model catalog)
 * 2. 如何创建一个 AgentSession（工具 + 对话上下文）
 *    How to create an AgentSession (tools + conversation state)
 * 3. 如何订阅事件流（拿到 LLM 的 token-by-token 输出）
 *    How to subscribe to the event stream (token-by-token deltas)
 * 4. 如何发送用户输入并等待回复
 *    How to send a prompt and wait for it to finish
 *
 * 运行 / Run:
 *   node --experimental-strip-types agent.ts
 *   npm start
 */

import * as readline from "node:readline/promises";
import { stdin, stdout } from "node:process";

// ① 导入 SDK 关键 API
// ─────────────────────
// Import the SDK surface we need. Everything lives in the main package,
// including ModelRuntime, SessionManager and createAgentSession.
import {
  createAgentSession, // 工厂函数：返回一个 AgentSession（对话状态 + 工具 + LLM 循环）
  ModelRuntime,       // 模型运行时：负责读 ~/.pi/agent/auth.json、models.json，提供 API key / 模型目录
  SessionManager,     // 会话管理：内存 / 持久化 / 恢复旧会话
} from "@earendil-works/pi-coding-agent";

// ② 初始化模型运行时
// ─────────────────────
// ModelRuntime 是 SDK 的“凭据中心 + 模型目录”。
// .create() 会读取 ~/.pi/agent/auth.json 和 ~/.pi/agent/models.json，
// 之后你可以 setRuntimeApiKey() / getAvailable() / refresh()。
// ModelRuntime owns credentials (auth.json) and the model catalog (models.json).
const modelRuntime = await ModelRuntime.create();

// 只列出已配置凭据的模型（避免选了模型却调不通）。
// getAvailable() returns only models whose provider credentials are usable.
const available = await modelRuntime.getAvailable();
if (available.length === 0) {
  console.error(
    "没有可用模型 / No available models.\n" +
      "请配置 ~/.pi/agent/auth.json 或设置环境变量 ANTHROPIC_API_KEY 等。\n" +
      "Configure ~/.pi/agent/auth.json or set e.g. ANTHROPIC_API_KEY.",
  );
  process.exit(1);
}

// 简单起见选第一个；想指定可用 getModel("anthropic","claude-opus-4-5")。
// We pick the first for simplicity; use getModel(...) to pin a specific one.
const model = available[0];
console.error(`[model] ${model.provider}/${model.id}`);

// ③ 创建一个 AgentSession
// ─────────────────────────
// createAgentSession() 是 SDK 的唯一入口；TUI / print / RPC 模式都建立在此之上。
// 参数说明 / Options:
//   modelRuntime    复用上面创建的 runtime（共享凭据，避免重复读取磁盘）
//                   Reuse the runtime above (shares credentials).
//   sessionManager  内存会话（不写磁盘，重启即丢；想持久化用 SessionManager.create(cwd)）
//                   In-memory; use SessionManager.create(cwd) for persistence.
//   tools           启用的内置工具白名单。常见值：
//                   "read" | "bash" | "edit" | "write" | "grep" | "find" | "ls"
//                   这里只开只读工具，避免 agent 误改你文件。
//                   Read-only tools only, to keep the agent from mutating files.
const { session } = await createAgentSession({
  modelRuntime,
  sessionManager: SessionManager.inMemory(),
  tools: ["read", "grep", "find", "ls"],
});

// ④ 订阅事件流
// ───────────────
// AgentSession 用事件流暴露 LLM 的增量输出、tool 调用、生命周期。
// 我们关心三种事件：
//   - message_update (assistantMessageEvent.type === "text_delta")  流式文本
//   - tool_execution_start                                            工具调用开始
//   - agent_end                                                       一轮结束（换行）
// AgentSession streams everything as events. We only consume a few here.
const unsubscribe = session.subscribe((event) => {
  switch (event.type) {
    case "message_update": {
      const e = event.assistantMessageEvent;
      // e.type 还有 "thinking_delta"（思考过程）等；这里只打印正文。
      if (e.type === "text_delta") process.stdout.write(e.delta);
      break;
    }
    case "tool_execution_start":
      process.stderr.write(`\n[tool] ${event.toolName}\n`);
      break;
    case "agent_end":
      process.stderr.write("\n");
      break;
  }
});

// ⑤ REPL 主循环
// ───────────────
// readline 每次拿到一行用户输入，调用 session.prompt() 发送给 agent。
// prompt() 会一直 await 到本轮结束（包含所有 tool 调用和重试）。
// prompt() awaits the full turn (LLM reply + tool calls + retries).
const rl = readline.createInterface({ input: stdin, output: stdout });
process.stderr.write("\n输入消息开始对话 / Type to chat. 'exit' to quit.\n\n");

try {
  while (true) {
    const text = (await rl.question("you> ")).trim();
    if (!text) continue;
    if (/^(exit|quit)$/i.test(text)) break;

    process.stdout.write("assistant> ");
    await session.prompt(text); // ★ SDK 核心调用 / core SDK call
    process.stdout.write("\n");
  }
} catch (err) {
  process.stderr.write(`\n[error] ${(err as Error).message}\n`);
} finally {
  // dispose() 释放事件订阅和 session 持有的资源，务必在退出前调用。
  // Always dispose() before exit to release event subscriptions.
  unsubscribe();
  session.dispose();
  rl.close();
}