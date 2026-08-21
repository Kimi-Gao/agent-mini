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