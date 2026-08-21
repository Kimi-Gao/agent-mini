# agent-mini

基于 [pi](https://github.com/earendil-works/pi) SDK 的最小对话 agent —— 教学示例。

A minimal chat agent built on the pi SDK — a teaching scaffold.

## 为什么 / Why

目标是用最少代码看清 SDK 的核心调用，方便后续深入学习扩展。

The goal is to expose the SDK's core calls in the smallest amount of code,
so you can extend from a known-good baseline.

## 运行 / Run

需要 Node ≥ 22.6（24 已默认开启 `--experimental-strip-types`，无需 tsx/编译）。
Requires Node ≥ 22.6 (Node 24 enables `--experimental-strip-types` by default).

```bash
cd day1

# 把全局已装的 pi-coding-agent link 到本地 node_modules（一次即可）
# Link the globally installed pi-coding-agent into this project (once).
npm link @earendil-works/pi-coding-agent

# 启动 / Start
npm start
# 或 / or:
node --experimental-strip-types agent.ts
```

## 核心 SDK 调用一览 / SDK calls at a glance

文件 `agent.ts` 中依次出现（按出现顺序）：

| #  | 调用 / Call | 作用 / Purpose |
| -- | ---------- | -------------- |
| ①  | `ModelRuntime.create()` | 加载 `~/.pi/agent/auth.json` + `models.json`，管理凭据和模型目录 |
| ②  | `modelRuntime.getAvailable()` | 列出当前可调用的模型 |
| ③  | `createAgentSession({...})` | 创建一个 AgentSession（对话状态 + 工具 + LLM 循环） |
| ④  | `session.subscribe(cb)` | 订阅事件流（流式文本、tool 调用、生命周期） |
| ⑤  | `session.prompt(text)` | 发送用户消息并 await 本轮结束 |
| ⑥  | `session.dispose()` | 释放事件订阅和资源 |

## pi monorepo 包结构 / pi monorepo packages

pi 是一个分层的 monorepo，`@earendil-works/pi-coding-agent` 只是最外层的“产品壳”。
理解各包的分工后，你才知道“什么时候该读哪个仓库 / import 哪个包”。
pi is a layered monorepo; `pi-coding-agent` is just the top-level product shell.
Understanding the split tells you which repo to read / which package to import.

仓库：<https://github.com/earendil-works/pi/tree/main/packages>

### 依赖关系 / Dependency graph

```
┌─────────────────────────────────────────────────────────────┐
│  pi-coding-agent   ← CLI / SDK 入口，本仓库用的就是这个     │
│       │              product shell (this is what we use)   │
│       ├──► pi-agent-core    有状态 agent（tool 执行 + 事件流）│
│       │         │                                            │
│       │         └──► pi-ai    统一 LLM API（多 provider 适配）│
│       │                                                        │
│       ├──► pi-protocol   运行时无关的协议 schema + CBOR 编码  │
│       │       ▲                                              │
│       │       │                                              │
│       └──► pi-client     远程会话客户端（走 pi-protocol）     │
│                                                                │
│  pi-tui            终端 UI 框架（差分渲染、防闪烁）           │
│  pi-telemetry      供应商中立的遥测契约与类型化 schema          │
└─────────────────────────────────────────────────────────────┘
```

### 各包职责 / Package responsibilities

| 包 / Package | 职责 / Responsibility | 何时需要看 / When to read it |
| --- | --- | --- |
| **[`pi-ai`](https://github.com/earendil-works/pi/tree/main/packages/ai)** | 统一 LLM API：多 provider 适配（Anthropic / OpenAI / Gemini / 自定义…）、自动凭据解析、token & cost 跟踪、会话中途换模型。只收录支持 tool calling 的模型。 | 你想直接调 LLM（不带 agent 循环），或想加自定义 provider。 |
| **[`pi-agent-core`](https://github.com/earendil-works/pi/tree/main/packages/agent-core)** | 有状态 agent：`Agent` 类负责 tool 执行 + 事件流。基于 `pi-ai`，不依赖 TUI/CLI。SQLite 会话后端是独立包 `pi-session-backend-sqlite-node`。 | 你想自己写一个 agent 框架 / 想直接操作 `state.messages` / `.tools`。 |
| **[`pi-protocol`](https://github.com/earendil-works/pi/tree/main/packages/protocol)** | 运行时无关的协议：消息 schema、CBOR 编码、长度前缀字节流帧。协议版本 1：4 字节大端长度 + 一条 CBOR 消息。 | 你要实现自定义传输（WebSocket / Unix socket / IPC）让 pi 跑在远端。 |
| **[`pi-tui`](https://github.com/earendil-works/pi/tree/main/packages/tui)** | 极简终端 UI 框架：差分渲染、CSI 2026 同步输出（防闪烁）、Markdown / Editor / SelectList 等组件、Kitty / iTerm2 内联图片。 | 你要给 pi 写一套自定义 TUI，或复用它的组件做别的 CLI。 |
| **[`pi-client`](https://github.com/earendil-works/pi/tree/main/packages/client)** | 远程 pi 会话的传输中立客户端：`PiClient` 走长度前缀 CBOR，通过 `ByteTransport` 接口接入。无 Node 专用依赖。 | 你的前端 / 服务端要连接一个远端 pi 进程。 |
| **[`pi-telemetry`](https://github.com/earendil-works/pi/tree/main/packages/telemetry)** | 供应商中立的遥测契约：`TelemetryContext` / `TelemetrySpan`、可序列化 schema、内存实现参考。无 exporter，不绑 OpenTelemetry。 | 你想把 pi 接入自家可观测性平台（OpenTelemetry / Sentry / 日志）。 |
| **[`pi-coding-agent`](https://github.com/earendil-works/pi/tree/main/packages/coding-agent)** | 把上面拼起来的 CLI + SDK：内置 `read` / `bash` / `edit` / `write` 等工具、会话管理、扩展机制、3 种运行模式（interactive / print / RPC）。 | **默认起点。** `agent.ts` 里 import 的就是它。 |

### 本教程 import 的是哪个 / What we import here

`agent.ts` 里只有一行 import，全部来自 **`pi-coding-agent`**：

```ts
import { createAgentSession, ModelRuntime, SessionManager } from "@earendil-works/pi-coding-agent";
```

这意味着：
- `createAgentSession()` 内部组装了 `pi-agent-core` + `pi-ai` + 各种工具。
- `ModelRuntime` 是 `pi-ai` 凭据解析 + 模型目录的薄包装，加上 SDK 层的诊断信息。
- `SessionManager` 是 SDK 层的会话树管理（fork / branch / 持久化）。

如果你只做“嵌入式 agent”，`pi-coding-agent` 就够了。
当你要做“自定义传输 / 自定义 UI / 接入自己模型目录”时，再去直接读下面的子包。

## 下一步学习路径 / Next steps

按这个顺序读官方文档，循序渐进：

1. [docs/sdk.md](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/sdk.md) — 全量 SDK 参考
2. [examples/sdk/01-minimal.ts](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/examples/sdk/01-minimal.ts) — 最简示例
3. `02-custom-model.ts` — 指定具体模型 / 自定义模型目录
4. `03-custom-prompt.ts` — 通过 `DefaultResourceLoader` 覆盖系统提示词
5. `05-tools.ts` — 工具白名单 + 自定义工具 (`defineTool`)
6. `06-extensions.ts` — 扩展（可在 `pi.registerTool` / 监听事件）
7. `11-sessions.ts` — 持久化会话、`fork` / `branch`
8. `12-full-control.ts` — 直接操作 `session.agent.state`（消息、工具、模型）

## 常用扩展点 / Common extension points

- **加 bash/edit/write 工具**：把 `agent.ts` 里 `tools: [...]` 改成 `["read","bash","edit","write"]`。
- **持久化对话**：把 `SessionManager.inMemory()` 换成 `SessionManager.create(process.cwd())`。
- **自定义系统提示词**：用 `new DefaultResourceLoader({ systemPromptOverride: () => "..." })`，传给 `createAgentSession`。
- **添加自定义工具**：用 `defineTool({ name, description, parameters, execute })`，通过 `customTools` 传入。
- **切换模型**：`session.setModel(getModel("anthropic", "claude-opus-4-5"))`。