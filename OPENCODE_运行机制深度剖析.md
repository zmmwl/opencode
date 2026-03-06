# OpenCode 运行机制深度剖析

## 目录

1. [概述](#1-概述)
2. [项目架构](#2-项目架构)
3. [入口分析](#3-入口分析)
4. [核心系统](#4-核心系统)
5. [大模型交互机制](#5-大模型交互机制)
6. [工具系统](#6-工具系统)
7. [会话管理](#7-会话管理)
8. [权限系统](#8-权限系统)
9. [完整执行流程](#9-完整执行流程)
10. [关键数据结构](#10-关键数据结构)

---

## 1. 概述

### 1.1 OpenCode 是什么

OpenCode 是一个开源的 AI 编程助手，采用 TypeScript 开发，使用 Bun 作为运行时。它的核心功能是通过与大语言模型（LLM）交互，帮助开发者完成代码编写、调试、重构等任务。

### 1.2 核心特点

- **多提供商支持**：支持 Anthropic Claude、OpenAI、Google Gemini、GitHub Copilot 等多种 AI 提供商
- **工具调用机制**：通过 Function Calling 让 LLM 能够执行文件操作、命令行工具等
- **Agent 系统**：支持不同模式的 Agent（build、plan、explore 等）
- **权限管理**：细粒度的权限控制系统
- **会话管理**：支持会话创建、分支、共享等功能

---

## 2. 项目架构

### 2.1 Monorepo 结构

```
opencode/
├── packages/
│   ├── opencode/          # 核心 CLI 包
│   ├── app/               # Web 应用 (SolidJS)
│   ├── ui/                # UI 组件库
│   ├── console/           # 控制台应用
│   ├── desktop/           # 桌面应用 (Tauri)
│   ├── web/               # Web API
│   ├── util/              # 共享工具库
│   └── ...
├── .opencode/             # 配置和工具目录
├── specs/                 # 规范文档
└── script/                # 构建脚本
```

### 2.2 核心包结构 (packages/opencode)

```
packages/opencode/src/
├── cli/                   # CLI 命令
│   ├── cmd/              # 具体命令实现
│   ├── ui.ts             # 用户界面
│   └── bootstrap.ts      # 启动引导
├── server/               # HTTP 服务器
│   ├── server.ts         # 服务器入口
│   └── routes/           # API 路由
├── agent/                # Agent 系统
│   └── agent.ts          # Agent 定义和管理
├── provider/             # AI 提供商
│   ├── provider.ts       # 提供商管理
│   ├── models.ts         # 模型数据
│   └── sdk/              # 各提供商 SDK
├── tool/                 # 工具系统
│   ├── tool.ts           # 工具定义
│   ├── registry.ts       # 工具注册
│   ├── bash.ts           # Shell 命令工具
│   ├── edit.ts           # 文件编辑工具
│   └── ...
├── session/              # 会话管理
│   ├── index.ts          # 会话核心
│   ├── llm.ts            # LLM 交互
│   ├── processor.ts      # 消息处理
│   └── message-v2.ts     # 消息结构
├── permission/           # 权限系统
│   └── next.ts           # 权限管理
├── storage/              # 存储系统
├── config/               # 配置管理
└── index.ts              # CLI 入口
```

---

## 3. 入口分析

### 3.1 CLI 入口文件

**文件位置**: [`packages/opencode/src/index.ts`](packages/opencode/src/index.ts:1)

```typescript
// 入口文件使用 yargs 构建 CLI
import yargs from "yargs"
import { hideBin } from "yargs/helpers"

const cli = yargs(hideBin(process.argv))
  .scriptName("opencode")
  .command(RunCommand)      // run 命令
  .command(AuthCommand)     // auth 命令
  .command(AgentCommand)    // agent 命令
  .command(ModelsCommand)   // models 命令
  // ... 更多命令
```

### 3.2 Run 命令详解

**文件位置**: [`packages/opencode/src/cli/cmd/run.ts`](packages/opencode/src/cli/cmd/run.ts:1)

这是用户执行 `opencode run "消息"` 时触发的核心命令。

#### 执行流程图

```
用户执行 opencode run
       ↓
解析参数 (message, session, model, agent 等)
       ↓
创建/获取会话
       ↓
订阅事件流
       ↓
调用 sdk.session.prompt() 发送消息
       ↓
监听事件并输出 (工具调用、文本响应等)
       ↓
会话进入 idle 状态后退出
```

#### 关键代码片段

```typescript
// 创建或获取会话
async function session(sdk: OpencodeClient) {
  const baseID = args.continue
    ? (await sdk.session.list()).data?.find((s) => !s.parentID)?.id
    : args.session

  if (baseID && args.fork) {
    const forked = await sdk.session.fork({ sessionID: baseID })
    return forked.data?.id
  }

  if (baseID) return baseID

  const result = await sdk.session.create({ title: name, permission: rules })
  return result.data?.id
}

// 发送消息
await sdk.session.prompt({
  sessionID,
  agent,
  model,
  variant: args.variant,
  parts: [...files, { type: "text", text: message }],
})
```

---

## 4. 核心系统

### 4.1 Agent 系统

**文件位置**: [`packages/opencode/src/agent/agent.ts`](packages/opencode/src/agent/agent.ts:1)

Agent 定义了 AI 助手的行为模式、权限和提示词。

#### 内置 Agent 类型

| Agent 名称 | 模式 | 描述 |
|-----------|------|------|
| `build` | primary | 默认 Agent，执行基于配置权限的工具 |
| `plan` | primary | 计划模式，禁止所有编辑工具 |
| `general` | subagent | 通用研究型 Agent |
| `explore` | subagent | 快速代码库探索专家 |
| `compaction` | primary | 会话压缩（隐藏） |
| `title` | primary | 生成标题（隐藏） |
| `summary` | primary | 生成摘要（隐藏） |

#### Agent 数据结构

```typescript
export namespace Agent {
  export const Info = z.object({
    name: z.string(),                    // Agent 名称
    description: z.string().optional(),  // 描述
    mode: z.enum(["subagent", "primary", "all"]),  // 模式
    native: z.boolean().optional(),       // 是否内置
    hidden: z.boolean().optional(),       // 是否隐藏
    temperature: z.number().optional(),   // 温度参数
    topP: z.number().optional(),          // topP 参数
    color: z.string().optional(),         // 颜色
    permission: PermissionNext.Ruleset,   // 权限规则
    model: z.object({                     // 模型配置
      modelID: z.string(),
      providerID: z.string(),
    }).optional(),
    variant: z.string().optional(),       // 模型变体
    prompt: z.string().optional(),        // 自定义提示词
    options: z.record(z.string(), z.any()), // 额外选项
    steps: z.number().int().positive().optional(), // 最大步骤数
  })
}
```

#### Agent 配置示例

```typescript
build: {
  name: "build",
  description: "The default agent. Executes tools based on configured permissions.",
  permission: PermissionNext.merge(
    defaults,
    PermissionNext.fromConfig({
      question: "allow",
      plan_enter: "allow",
    }),
    user,
  ),
  mode: "primary",
  native: true,
}
```

### 4.2 Provider 系统

**文件位置**: [`packages/opencode/src/provider/provider.ts`](packages/opencode/src/provider/provider.ts:1)

Provider 系统管理所有 AI 提供商和模型。

#### 支持的提供商

```typescript
const BUNDLED_PROVIDERS: Record<string, (options: any) => SDK> = {
  "@ai-sdk/amazon-bedrock": createAmazonBedrock,
  "@ai-sdk/anthropic": createAnthropic,
  "@ai-sdk/azure": createAzure,
  "@ai-sdk/google": createGoogleGenerativeAI,
  "@ai-sdk/google-vertex": createVertex,
  "@ai-sdk/openai": createOpenAI,
  "@ai-sdk/openai-compatible": createOpenAICompatible,
  "@openrouter/ai-sdk-provider": createOpenRouter,
  "@ai-sdk/xai": createXai,
  "@ai-sdk/mistral": createMistral,
  "@ai-sdk/groq": createGroq,
  // ... 更多
}
```

#### Provider 初始化流程

```
1. 从 models.dev 加载模型数据库
   ↓
2. 合并用户配置文件 (opencode.json)
   ↓
3. 加载环境变量中的 API Key
   ↓
4. 加载存储的认证信息
   ↓
5. 应用自定义加载器 (CUSTOM_LOADERS)
   ↓
6. 过滤禁用的提供商和模型
   ↓
7. 返回可用的提供商列表
```

#### 模型数据结构

```typescript
export const Model = z.object({
  id: z.string(),                    // 模型 ID
  providerID: z.string(),            // 提供商 ID
  api: z.object({
    id: z.string(),                  // API 调用 ID
    url: z.string(),                 // API 端点
    npm: z.string(),                 // npm 包名
  }),
  name: z.string(),                  // 显示名称
  family: z.string().optional(),     // 模型系列
  capabilities: z.object({           // 能力
    temperature: z.boolean(),
    reasoning: z.boolean(),
    attachment: z.boolean(),
    toolcall: z.boolean(),
    input: z.object({                // 输入模态
      text: z.boolean(),
      audio: z.boolean(),
      image: z.boolean(),
      video: z.boolean(),
      pdf: z.boolean(),
    }),
    output: z.object({               // 输出模态
      text: z.boolean(),
      audio: z.boolean(),
      image: z.boolean(),
      video: z.boolean(),
      pdf: z.boolean(),
    }),
    interleaved: z.union([           // 交错内容
      z.boolean(),
      z.object({
        field: z.enum(["reasoning_content", "reasoning_details"]),
      }),
    ]),
  }),
  cost: z.object({                    // 成本
    input: z.number(),
    output: z.number(),
    cache: z.object({
      read: z.number(),
      write: z.number(),
    }),
  }),
  limit: z.object({                   // 限制
    context: z.number(),
    input: z.number().optional(),
    output: z.number(),
  }),
  status: z.enum(["alpha", "beta", "deprecated", "active"]),
  options: z.record(z.string(), z.any()),
  headers: z.record(z.string(), z.string()),
  release_date: z.string(),
  variants: z.record(z.string(), z.record(z.string(), z.any())).optional(),
})
```

### 4.3 插件系统

**文件位置**: [`packages/opencode/src/plugin/`](packages/opencode/src/plugin/)

插件系统允许扩展 OpenCode 的功能：

- **自定义工具**：插件可以注册新的工具
- **认证提供**：插件可以提供自定义认证方式
- **钩子系统**：通过事件钩子扩展功能

---

## 5. 大模型交互机制

### 5.1 LLM 交互核心

**文件位置**: [`packages/opencode/src/session/llm.ts`](packages/opencode/src/session/llm.ts:1)

这是与 LLM 交互的核心模块，使用 Vercel AI SDK 的 `streamText` 函数。

#### 交互流程图

```
SessionPrompt.prompt()
       ↓
构建消息历史
       ↓
获取工具列表
       ↓
LLM.stream()
       ↓
调用 AI SDK streamText()
       ↓
流式接收响应
       ↓
SessionProcessor 处理事件
       ↓
更新消息和工具状态
```

#### 核心代码

```typescript
export async function stream(input: StreamInput) {
  const [language, cfg, provider, auth] = await Promise.all([
    Provider.getLanguage(input.model),
    Config.get(),
    Provider.getProvider(input.model.providerID),
    Auth.get(input.model.providerID),
  ])

  // 构建系统提示词
  const system = []
  system.push([
    ...(input.agent.prompt ? [input.agent.prompt] : isCodex ? [] : SystemPrompt.provider(input.model)),
    ...input.system,
    ...(input.user.system ? [input.user.system] : []),
  ].filter((x) => x).join("\n"))

  // 调用 AI SDK
  return streamText({
    temperature: params.temperature,
    topP: params.topP,
    topK: params.topK,
    providerOptions: ProviderTransform.providerOptions(input.model, params.options),
    activeTools: Object.keys(tools).filter((x) => x !== "invalid"),
    tools,
    maxOutputTokens,
    abortSignal: input.abort,
    headers: { /* ... */ },
    maxRetries: input.retries ?? 0,
    messages: [
      ...system.map((x): ModelMessage => ({ role: "system", content: x })),
      ...input.messages,
    ],
    model: wrapLanguageModel({
      model: language,
      middleware: [/* ... */],
    }),
  })
}
```

### 5.2 系统提示词

**文件位置**: [`packages/opencode/src/session/system.ts`](packages/opencode/src/session/system.ts:1)

系统提示词根据不同模型定制：

```typescript
export function provider(model: Provider.Model) {
  if (model.api.id.includes("gpt-5")) return [PROMPT_CODEX]
  if (model.api.id.includes("gpt-") || model.api.id.includes("o1") || model.api.id.includes("o3"))
    return [PROMPT_BEAST]
  if (model.api.id.includes("gemini-")) return [PROMPT_GEMINI]
  if (model.api.id.includes("claude")) return [PROMPT_ANTHROPIC]
  if (model.api.id.toLowerCase().includes("trinity")) return [PROMPT_TRINITY]
  return [PROMPT_ANTHROPIC_WITHOUT_TODO]
}
```

提示词文件位于 `packages/opencode/src/session/prompt/` 目录。

### 5.3 消息处理器

**文件位置**: [`packages/opencode/src/session/processor.ts`](packages/opencode/src/session/processor.ts:1)

消息处理器负责处理 LLM 返回的流式事件。

#### 事件类型处理

| 事件类型 | 说明 |
|---------|------|
| `start` | 开始生成 |
| `reasoning-start/delta/end` | 推理内容 |
| `tool-input-start/delta/end` | 工具输入准备 |
| `tool-call` | 工具调用 |
| `tool-result` | 工具执行结果 |
| `tool-error` | 工具执行错误 |
| `text-start/delta/end` | 文本内容 |
| `start-step/finish-step` | 步骤标记 |
| `finish` | 完成 |
| `error` | 错误 |

#### 命中循环检测

```typescript
const DOOM_LOOP_THRESHOLD = 3

// 检测连续三次相同的工具调用
const lastThree = parts.slice(-DOOM_LOOP_THRESHOLD)
if (
  lastThree.length === DOOM_LOOP_THRESHOLD &&
  lastThree.every(
    (p) =>
      p.type === "tool" &&
      p.tool === value.toolName &&
      p.state.status !== "pending" &&
      JSON.stringify(p.state.input) === JSON.stringify(value.input),
  )
) {
  // 触发权限询问
  await PermissionNext.ask({
    permission: "doom_loop",
    patterns: [value.toolName],
    sessionID: input.assistantMessage.sessionID,
    metadata: {
      tool: value.toolName,
      input: value.input,
    },
    always: [value.toolName],
    ruleset: agent.permission,
  })
}
```

---

## 6. 工具系统

### 6.1 工具定义

**文件位置**: [`packages/opencode/src/tool/tool.ts`](packages/opencode/src/tool/tool.ts:1)

工具是 LLM 可以调用的函数，使用 Zod 进行参数验证。

```typescript
export interface Info<Parameters extends z.ZodType = z.ZodType, M extends Metadata = Metadata> {
  id: string
  init: (ctx?: InitContext) => Promise<{
    description: string
    parameters: Parameters
    execute(
      args: z.infer<Parameters>,
      ctx: Context,
    ): Promise<{
      title: string
      metadata: M
      output: string
      attachments?: MessageV2.FilePart[]
    }>
    formatValidationError?(error: z.ZodError): string
  }>
}
```

### 6.2 内置工具

**文件位置**: [`packages/opencode/src/tool/registry.ts`](packages/opencode/src/tool/registry.ts:1)

| 工具 | 功能 | 文件 |
|-----|------|-----|
| `bash` | 执行 Shell 命令 | [bash.ts](packages/opencode/src/tool/bash.ts:1) |
| `read` | 读取文件 | [read.ts](packages/opencode/src/tool/read.ts:1) |
| `write` | 写入文件 | [write.ts](packages/opencode/src/tool/write.ts:1) |
| `edit` | 编辑文件 | [edit.ts](packages/opencode/src/tool/edit.ts:1) |
| `glob` | 文件模式匹配 | [glob.ts](packages/opencode/src/tool/glob.ts:1) |
| `grep` | 内容搜索 | [grep.ts](packages/opencode/src/tool/grep.ts:1) |
| `ls` | 列出目录 | [ls.ts](packages/opencode/src/tool/ls.ts:1) |
| `task` | 创建子任务 | [task.ts](packages/opencode/src/tool/task.ts:1) |
| `skill` | 调用技能 | [skill.ts](packages/opencode/src/tool/skill.ts:1) |
| `todowrite` | 更新待办 | [todo.ts](packages/opencode/src/tool/todo.ts:1) |
| `webfetch` | 获取网页 | [webfetch.ts](packages/opencode/src/tool/webfetch.ts:1) |
| `websearch` | 网页搜索 | [websearch.ts](packages/opencode/src/tool/websearch.ts:1) |
| `codesearch` | 代码搜索 | [codesearch.ts](packages/opencode/src/tool/codesearch.ts:1) |

### 6.3 工具注册流程

```typescript
export async function tools(
  model: { providerID: string; modelID: string },
  agent?: Agent.Info,
) {
  const tools = await all()
  const result = await Promise.all(
    tools
      .filter((t) => {
        // 特定工具的条件过滤
        if (t.id === "codesearch" || t.id === "websearch") {
          return model.providerID === "opencode" || Flag.OPENCODE_ENABLE_EXA
        }
        // GPT-5 使用 apply_patch
        const usePatch = model.modelID.includes("gpt-") &&
                        !model.modelID.includes("oss") &&
                        !model.modelID.includes("gpt-4")
        if (t.id === "apply_patch") return usePatch
        if (t.id === "edit" || t.id === "write") return !usePatch
        return true
      })
      .map(async (t) => ({
        id: t.id,
        ...(await t.init({ agent })),
      })),
  )
  return result
}
```

### 6.4 工具执行上下文

```typescript
export type Context<M extends Metadata = Metadata> = {
  sessionID: string
  messageID: string
  agent: string
  abort: AbortSignal
  callID?: string
  extra?: { [key: string]: any }
  messages: MessageV2.WithParts[]
  metadata(input: { title?: string; metadata?: M }): void
  ask(input: Omit<PermissionNext.Request, "id" | "sessionID" | "tool">): Promise<void>
}
```

---

## 7. 会话管理

### 7.1 会话数据结构

**文件位置**: [`packages/opencode/src/session/index.ts`](packages/opencode/src/session/index.ts:1)

```typescript
export const Info = z.object({
  id: Identifier.schema("session"),     // 会话 ID
  slug: z.string(),                      // URL 友好标识
  projectID: z.string(),                 // 项目 ID
  directory: z.string(),                 // 工作目录
  parentID: Identifier.schema("session").optional(),  // 父会话
  summary: z.object({
    additions: z.number(),
    deletions: z.number(),
    files: z.number(),
    diffs: Snapshot.FileDiff.array().optional(),
  }).optional(),
  share: z.object({
    url: z.string(),
  }).optional(),
  title: z.string(),                     // 标题
  version: z.string(),                   // OpenCode 版本
  time: z.object({
    created: z.number(),
    updated: z.number(),
    compacting: z.number().optional(),
    archived: z.number().optional(),
  }),
  permission: PermissionNext.Ruleset.optional(),
  revert: z.object({
    messageID: z.string(),
    partID: z.string().optional(),
    snapshot: z.string().optional(),
    diff: z.string().optional(),
  }).optional(),
})
```

### 7.2 会话操作

| 操作 | 说明 |
|-----|------|
| `create` | 创建新会话 |
| `fork` | 分支会话（从指定消息处） |
| `get` | 获取会话信息 |
| `touch` | 更新时间戳 |
| `share` | 创建分享链接 |
| `unshare` | 取消分享 |
| `remove` | 删除会话 |
| `messages` | 获取消息列表 |
| `children` | 获取子会话 |

### 7.3 消息结构

```typescript
// 消息类型
type Message =
  | User        // 用户消息
  | Assistant   // AI 助手消息
  | System      // 系统消息

// 消息 Part 类型
type Part =
  | Text         // 文本内容
  | Tool         // 工具调用
  | Reasoning    // 推理内容
  | File         // 文件附件
  | Patch        // 代码补丁
  | StepStart    // 步骤开始
  | StepFinish   // 步骤完成
```

---

## 8. 权限系统

### 8.1 权限规则

**文件位置**: [`packages/opencode/src/permission/next.ts`](packages/opencode/src/permission/next.ts:1)

权限系统控制工具和操作的访问。

#### 权限规则结构

```typescript
export type Rule = {
  permission: string     // 权限名称（工具名或特殊权限）
  action: "allow" | "deny" | "ask"  // 动作
  pattern: string        // 匹配模式
}

export type Ruleset = Rule[]
```

#### 特殊权限

| 权限 | 说明 |
|-----|------|
| `*` | 所有工具 |
| `doom_loop` | 命中循环检测 |
| `external_directory` | 外部目录访问 |
| `question` | AskUserQuestion 工具 |
| `plan_enter` | 进入计划模式 |
| `plan_exit` | 退出计划模式 |
| `read` | 文件读取 |
| `edit` | 文件编辑 |
| `todoread` | 读取待办 |
| `todowrite` | 写入待办 |

#### 默认权限

```typescript
const defaults = PermissionNext.fromConfig({
  "*": "allow",
  doom_loop: "ask",
  external_directory: {
    "*": "ask",
    [Truncate.GLOB]: "allow",  // 截断输出目录
  },
  question: "deny",
  plan_enter: "deny",
  plan_exit: "deny",
  read: {
    "*": "allow",
    "*.env": "ask",
    "*.env.*": "ask",
    "*.env.example": "allow",
  },
})
```

### 8.2 权限检查流程

```
工具被调用
    ↓
获取 Agent 权限规则
    ↓
获取会话权限规则
    ↓
合并权限规则
    ↓
检查工具是否被禁用
    ↓
执行权限检查
    ↓
allow → 直接执行
deny → 抛出错误
ask → 请求用户确认
```

---

## 9. 完整执行流程

### 9.1 用户消息处理流程

```
┌─────────────────────────────────────────────────────────────────┐
│  用户执行: opencode run "帮我写一个排序函数"                      │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  1. CLI 参数解析                                                 │
│     - 消息内容: "帮我写一个排序函数"                              │
│     - 模型: 默认模型                                             │
│     - Agent: build (默认)                                        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  2. 创建/获取会话                                                │
│     - 如果是新请求，创建新会话                                   │
│     - 如果使用 --continue，获取上一个会话                        │
│     - 如果使用 --fork，分支会话                                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  3. 构建用户消息                                                 │
│     - 创建 MessageV2.User 消息                                   │
│     - 包含文本、文件附件等 Part                                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  4. 构建历史消息                                                 │
│     - 获取会话历史消息                                           │
│     - 应用会话压缩（如需要）                                     │
│     - 转换为 AI SDK 格式                                         │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  5. 构建系统提示词                                               │
│     - Agent 提示词                                              │
│     - Provider 提示词                                           │
│     - 环境信息（工作目录、日期等）                               │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  6. 获取可用工具                                                 │
│     - 从 ToolRegistry 获取所有工具                               │
│     - 根据 Agent 权限过滤                                        │
│     - 根据会话权限过滤                                           │
│     - 根据模型能力过滤                                           │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  7. 调用 LLM.stream()                                            │
│     - 获取模型语言实例                                           │
│     - 构建流式请求参数                                           │
│     - 调用 AI SDK streamText()                                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  8. 流式处理响应                                                 │
│     - SessionProcessor 监听事件流                                │
│     - 处理 reasoning 事件                                        │
│     - 处理 tool-call 事件                                        │
│     - 处理 text 事件                                            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  9. 工具执行                                                     │
│     - 权限检查                                                   │
│     - 执行工具逻辑                                               │
│     - 返回结果给 LLM                                             │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  10. 循环继续                                                    │
│      - LLM 根据工具结果继续生成                                  │
│      - 可能调用更多工具                                          │
│      - 直到 finish 或错误                                        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  11. 完成                                                        │
│      - 更新消息状态                                             │
│      - 生成快照 diff                                            │
│      - 触发摘要压缩                                             │
│      - 会话状态变为 idle                                         │
└─────────────────────────────────────────────────────────────────┘
```

### 9.2 工具调用流程

```
LLM 决定调用工具
      ↓
生成 tool-call 事件
      ↓
SessionProcessor 处理
      ↓
更新 Part 状态为 pending
      ↓
工具输入接收完成
      ↓
更新 Part 状态为 running
      ↓
执行权限检查
      ↓
权限允许 → 执行工具
权限拒绝 → 返回错误
权限询问 → CLI 模式下自动拒绝
      ↓
工具执行完成
      ↓
生成 tool-result 事件
      ↓
LLM 收到结果继续生成
```

### 9.3 子 Agent 调用流程

```
主 Agent 决定使用 Task 工具
      ↓
TaskTool 参数解析
      ↓
创建新的 Assistant 消息
      ↓
递归调用 SessionPrompt.prompt()
      ↓
子 Agent 独立执行
      ↓
返回结果给主 Agent
      ↓
主 Agent 继续处理
```

---

## 10. 关键数据结构

### 10.1 ModelMessage (AI SDK 格式)

```typescript
type ModelMessage = {
  role: "system" | "user" | "assistant"
  content: string | Array<ContentPart>
}

type ContentPart =
  | { type: "text"; text: string }
  | { type: "image"; image: string }
  | { type: "tool-call"; toolName: string; toolCallId: string; args: any }
  | { type: "tool-result"; toolCallId: string; result: any }
```

### 10.2 MessageV2 (OpenCode 内部格式)

```typescript
type MessageV2 = {
  id: string
  sessionID: string
  role: "user" | "assistant" | "system"
  timestamp: number
  parts: Part[]
  // ... 其他字段
}

type Part =
  | TextPart     // 文本内容
  | ToolPart     // 工具调用
  | ReasoningPart // 推理内容
  | FilePart     // 文件附件
  | PatchPart    // 代码补丁
```

### 10.3 工具调用流程图

```
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│   User       │─────▶│    Session   │─────▶│  LLM Stream  │
└──────────────┘      └──────────────┘      └──────────────┘
                                                           │
                                                           ▼
                                                    ┌──────────────┐
                                                    │ Tool Call    │
                                                    └──────────────┘
                                                           │
                                                           ▼
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│   Output     │◀─────│    Event     │◀─────│ Permission    │
└──────────────┘      └──────────────┘      └──────────────┘
                                    │                 │
                                    ▼                 ▼
                             ┌──────────────┐ ┌──────────────┐
                             │  Processor   │ │   Execute    │
                             └──────────────┘ └──────────────┘
                                    │                 │
                                    └────────┬────────┘
                                             ▼
                                      ┌──────────────┐
                                      │ Tool Result  │
                                      └──────────────┘
```

---

## 总结

OpenCode 的运行机制可以概括为以下几个核心要点：

1. **分层架构**：CLI → Server → Session → LLM，每一层职责明确
2. **流式处理**：使用 AI SDK 的流式 API，实现实时响应
3. **工具系统**：通过 Function Calling 让 LLM 能执行实际操作
4. **权限控制**：细粒度的权限系统确保安全可控
5. **会话管理**：支持会话分支、历史回溯等功能
6. **多提供商**：统一的抽象层支持多种 AI 提供商

### 扩展 OpenCode

如果你想扩展 OpenCode 的功能，主要有以下几种方式：

1. **添加新工具**：在 `packages/opencode/src/tool/` 目录创建新的工具文件
2. **添加新 Agent**：在配置文件中定义自定义 Agent
3. **开发插件**：创建插件来提供新功能
4. **添加新提供商**：在 Provider 系统中注册新的 AI 提供商

### 关键文件索引

| 功能 | 文件路径 |
|-----|---------|
| CLI 入口 | [packages/opencode/src/index.ts](packages/opencode/src/index.ts:1) |
| Run 命令 | [packages/opencode/src/cli/cmd/run.ts](packages/opencode/src/cli/cmd/run.ts:1) |
| Agent 定义 | [packages/opencode/src/agent/agent.ts](packages/opencode/src/agent/agent.ts:1) |
| Provider 管理 | [packages/opencode/src/provider/provider.ts](packages/opencode/src/provider/provider.ts:1) |
| LLM 交互 | [packages/opencode/src/session/llm.ts](packages/opencode/src/session/llm.ts:1) |
| 消息处理 | [packages/opencode/src/session/processor.ts](packages/opencode/src/session/processor.ts:1) |
| 会话管理 | [packages/opencode/src/session/index.ts](packages/opencode/src/session/index.ts:1) |
| 工具注册 | [packages/opencode/src/tool/registry.ts](packages/opencode/src/tool/registry.ts:1) |
| 权限系统 | [packages/opencode/src/permission/next.ts](packages/opencode/src/permission/next.ts:1) |

希望这份文档能帮助你深入理解 OpenCode 的运行机制！
