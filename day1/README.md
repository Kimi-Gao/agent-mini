# day1：命令行 REPL 最小对话

本目录是 `agent-mini` 项目的 **day1** —— 第一篇基础的开端。
整体规划见仓库根目录的 [README.md](../README.md)。

## 目标

用最少的代码，跑通一个能跟 agent 对话的命令行程序。看清 pi SDK 的核心调用，方便后续每天在这个骨架上演进。

## 运行

需要 Node ≥ 22.6（Node 24 默认开启 `--experimental-strip-types`，无需 tsx 或编译）。

```bash
cd day1

# 把全局已装的 pi-coding-agent 链接到本地 node_modules（一次即可）
npm link @earendil-works/pi-coding-agent

# 启动
npm start
# 等价于：
node --experimental-strip-types agent.ts
```

启动后会看到 `[model] xxx/xxx`，然后进入 REPL，输入消息即可对话，输入 `exit` 退出。

## 核心 SDK 调用一览

`agent.ts` 里依次出现的 6 个 SDK 调用：

| # | 调用 | 作用 |
| - | ---- | ---- |
| ① | `ModelRuntime.create()` | 加载 `~/.pi/agent/auth.json` 和 `models.json`，管理凭据和模型目录 |
| ② | `modelRuntime.getAvailable()` | 列出已认证可用的模型 |
| ③ | `createAgentSession({...})` | 创建一个 `AgentSession`（对话状态 + 工具 + LLM 循环） |
| ④ | `session.subscribe(cb)` | 订阅事件流（流式文本、工具调用、生命周期） |
| ⑤ | `session.prompt(text)` | 发送用户消息，并 `await` 到本轮结束 |
| ⑥ | `session.dispose()` | 释放事件订阅和持有的资源 |

## 代码骨架（按行速览）

```
① ModelRuntime.create()        ←  加载凭据 + 模型目录
② getAvailable() / 取首个模型  ←  选模型
③ createAgentSession()         ←  组装一个会话（工具 + 会话管理器 + 模型）
④ session.subscribe()          ←  开始监听事件（流式文本 / 工具 / 生命周期）
⑤ REPL 循环 + session.prompt() ←  每次输入发一条消息，等本轮结束
⑥ finally 里 dispose           ←  释放资源
```

## 三种事件类型（day1 只用到）

- `message_update`：当 `assistantMessageEvent.type === "text_delta"` 时，是 LLM 的增量输出文本，直接 `write` 到 stdout 就是流式效果
- `tool_execution_start`：工具被调用前触发（虽然 day1 工具都是只读的，看不到副作用，但日志里能体现）
- `agent_end`：一轮结束（LLM 回复 + 所有工具调用 + 重试都完成后），用来换行

后续 day 会用到更多事件：`tool_execution_update` / `tool_execution_end`（day4）、`thinking_delta`（day6）、`compaction_*`（day12）等。

## 下一步

进入 **day2：Web UI 最小版**。把 day1 的 REPL 替换成 HTTP handler，前端用 `EventSource` 接收 SSE 流。

根 README 的"第一篇"表格里有 day2-day6 的完整路线图。