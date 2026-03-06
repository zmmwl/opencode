# OpenCode 大模型交互机制详解

## 目录

1. [核心问题概述](#1-核心问题概述)
2. [提示词格式](#2-提示词格式)
3. [工具定义格式](#3-工具定义格式)
4. [大模型返回格式](#4-大模型返回格式)
5. [响应处理机制](#5-响应处理机制)
6. [Function Calling 原理](#6-function-calling-原理)
7. [为什么这样设计](#7-为什么这样设计)

---

## 1. 核心问题概述

你的问题涉及 OpenCode 与大模型交互的核心机制：

1. **传入的提示词格式是什么？**
2. **大模型返回的格式是什么？**
3. **如何根据返回确定下一步动作？**
4. **为什么大模型会以这样的机制返回？**（特殊训练 vs 提示词工程）

**答案预告**：
- 这不是通过特殊训练实现的
- 而是利用了标准的 **Function Calling** 机制
- 提示词中定义工具描述，Schema 定义参数格式
- AI SDK 处理协议转换和事件流

---

## 2. 提示词格式

### 2.1 系统提示词结构

当 OpenCode 调用大模型时，传入的提示词由以下几部分组成：

```
┌─────────────────────────────────────────────────────┐
│  系统提示词 (System Prompt)                         │
│  ├─ Agent 提示词 (如果有)                          │
│  ├─ Provider 提示词 (根据模型选择)                 │
│  ├─ 环境信息 (工作目录、日期、平台等)              │
│  └─ 用户自定义提示词                               │
├─────────────────────────────────────────────────────┤
│  工具定义 (Tools Definitions)                       │
│  ├─ 工具名称 (id)                                   │
│  ├─ 工具描述 (description)                         │
│  └─ 参数 Schema (JSON Schema 格式)                 │
├─────────────────────────────────────────────────────┤
│  消息历史 (Conversation History)                    │
│  └─ 之前的用户消息和助手响应                       │
├─────────────────────────────────────────────────────┤
│  当前用户消息                                       │
│  └─ 用户输入的文本和附件                           │
└─────────────────────────────────────────────────────┘
```

### 2.2 系统提示词示例

**文件位置**: [`packages/opencode/src/session/prompt/anthropic.txt`](packages/opencode/src/session/prompt/anthropic.txt:1)

```text
You are OpenCode, the best coding agent on the planet.

You are an interactive CLI tool that helps users with software engineering tasks.

...

# Task Management
You have access to the TodoWrite tools to help you manage and plan tasks.

# Tool usage policy
- When doing file search, prefer to use the Task tool...
...
```

### 2.3 不同模型的提示词

OpenCode 根据不同模型使用不同的提示词：

```typescript
// packages/opencode/src/session/system.ts
export function provider(model: Provider.Model) {
  if (model.api.id.includes("gpt-5")) return [PROMPT_CODEX]
  if (model.api.id.includes("gpt-") || model.api.id.includes("o1") || model.api.id.includes("o3"))
    return [PROMPT_BEAST]
  if (model.api.id.includes("gemini-")) return [PROMPT_GEMINI]
  if (model.api.id.includes("claude")) return [PROMPT_ANTHROPIC]
  // ...
}
```

| 模型 | 提示词文件 |
|-----|-----------|
| Claude | `anthropic.txt` |
| GPT-5 | `codex_header.txt` |
| GPT-4/o1/o3 | `beast.txt` |
| Gemini | `gemini.txt` |

### 2.4 环境信息

系统会自动添加环境信息：

```typescript
// packages/opencode/src/session/system.ts
export async function environment(model: Provider.Model) {
  return [
    `You are powered by the model named ${model.api.id}.`,
    `<env>
      Working directory: ${Instance.directory}
      Is directory a git repo: ${project.vcs === "git" ? "yes" : "no"}
      Platform: ${process.platform}
      Today's date: ${new Date().toDateString()}
    </env>`
  ]
}
```

---

## 3. 工具定义格式

### 3.1 工具定义转换流程

```
┌─────────────────────────────────────────────────────┐
│  Tool.define() (TypeScript)                         │
│  └─ Zod Schema 定义参数                            │
└─────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────┐
│  转换为 JSON Schema                                 │
│  └─ ProviderTransform.schema()                     │
└─────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────┐
│  AI SDK tool() 函数                                │
│  └─ tool({ description, inputSchema, execute })    │
└─────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────┐
│  传递给大模型                                       │
│  └─ OpenAI Function Calling 格式                  │
└─────────────────────────────────────────────────────┘
```

### 3.2 工具定义示例（代码）

```typescript
// packages/opencode/src/tool/read.ts
export const ReadTool = Tool.define("read", {
  description: DESCRIPTION,  // 从 read.txt 文件读取
  parameters: z.object({
    filePath: z.string().describe("The path to the file to read"),
    offset: z.coerce.number().describe("Line number to start from").optional(),
    limit: z.coerce.number().describe("Number of lines to read").optional(),
  }),
  async execute(params, ctx) {
    // 工具执行逻辑
  }
})
```

### 3.3 工具描述示例（文本）

**文件位置**: [`packages/opencode/src/tool/read.txt`](packages/opencode/src/tool/read.txt:1)

```text
Reads a file from the local filesystem. You can access any file directly by using this tool.

Usage:
- The filePath parameter must be an absolute path, not a relative path
- By default, it reads up to 2000 lines starting from the beginning of the file
- You can optionally specify a line offset and limit
- Results are returned using cat -n format, with line numbers starting at 1
...
```

### 3.4 工具定义示例（Bash）

**文件位置**: [`packages/opencode/src/tool/bash.txt`](packages/opencode/src/tool/bash.txt:1)

```text
Executes a given bash command in a persistent shell session with optional timeout...

IMPORTANT: This tool is for terminal operations like git, npm, docker, etc.
DO NOT use it for file operations - use the specialized tools for this instead.
...
```

### 3.5 传给大模型的工具定义格式

最终，工具被转换为以下格式传给大模型：

```json
{
  "type": "function",
  "function": {
    "name": "read",
    "description": "Reads a file from the local filesystem...",
    "parameters": {
      "type": "object",
      "properties": {
        "filePath": {
          "type": "string",
          "description": "The path to the file to read"
        },
        "offset": {
          "type": "number",
          "description": "Line number to start from"
        },
        "limit": {
          "type": "number",
          "description": "Number of lines to read"
        }
      },
      "required": ["filePath"]
    }
  }
}
```

---

## 4. 大模型返回格式

### 4.1 返回格式概述

大模型使用 **Function Calling** 协议返回：

```
┌─────────────────────────────────────────────────────┐
│  AI SDK streamText()                                │
│  └─ 返回异步可迭代对象 (Async Iterable)             │
└─────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────┐
│  流式事件 (Full Stream)                             │
│  ├─ text-delta: 文本增量                           │
│  ├─ tool-call: 工具调用请求                        │
│  ├─ reasoning-delta: 推理内容增量 (Claude)          │
│  └─ finish: 完成标记                                │
└─────────────────────────────────────────────────────┘
```

### 4.2 文本响应示例

当大模型只需要返回文本时：

```
事件流:
text-start → text-delta → text-delta → ... → text-end

示例（大模型返回）:
content: "I'll help you read that file."
```

### 4.3 工具调用示例

当大模型需要调用工具时：

```
事件流:
tool-input-start → tool-input-delta → tool-input-end → tool-call

示例（大模型返回）:
{
  "type": "tool-call",
  "toolName": "read",
  "toolCallId": "call_abc123",
  "args": {
    "filePath": "/path/to/file.txt",
    "offset": 0,
    "limit": 100
  }
}
```

### 4.4 混合响应示例

大模型可以先说一段话，然后调用工具：

```
text-start
  → text-delta: "Let me check the file..."
  → text-end
tool-input-start
  → tool-input-end
tool-call: { toolName: "read", args: {...} }
```

### 4.5 完整对话示例

```
用户: "帮我看看 package.json 文件"

提示词 + 工具定义 + 消息历史
                    ↓
            发送给大模型
                    ↓
┌─────────────────────────────────────────────────────┐
│  大模型响应 (流式)                                   │
├─────────────────────────────────────────────────────┤
│  text-start                                         │
│    text-delta: "I'll read the package.json file"    │
│  text-end                                           │
│  tool-input-start                                   │
│  tool-input-end                                     │
│  tool-call: {                                       │
│    toolName: "read",                                │
│    toolCallId: "call_123",                          │
│    args: {                                          │
│      filePath: "/project/package.json"             │
│    }                                                 │
│  }                                                  │
└─────────────────────────────────────────────────────┘
                    ↓
            OpenCode 执行 read 工具
                    ↓
┌─────────────────────────────────────────────────────┐
│  工具结果返回给大模型                               │
├─────────────────────────────────────────────────────┤
│  {                                                  │
│    type: "tool-result",                             │
│    toolCallId: "call_123",                          │
│    result: {                                        │
│      output: "00001| {..."  // 文件内容            │
│    }                                                 │
│  }                                                  │
└─────────────────────────────────────────────────────┘
                    ↓
            大模型继续生成...
```

---

## 5. 响应处理机制

### 5.1 SessionProcessor 核心处理

**文件位置**: [`packages/opencode/src/session/processor.ts`](packages/opencode/src/session/processor.ts:1)

```typescript
export function create(input: {...}) {
  const toolcalls: Record<string, MessageV2.ToolPart> = {}

  return {
    async process(streamInput: LLM.StreamInput) {
      while (true) {
        const stream = await LLM.stream(streamInput)

        for await (const value of stream.fullStream) {
          switch (value.type) {
            case "text-start":
              // 开始接收文本
              break
            case "text-delta":
              // 文本增量
              await Session.updatePart({
                part: currentText,
                delta: value.text
              })
              break
            case "tool-call":
              // 工具调用
              await executeTool(value)
              break
            case "tool-result":
              // 工具结果返回
              break
            case "finish":
              // 完成生成
              break
          }
        }
      }
    }
  }
}
```

### 5.2 事件处理表

| 事件 | 处理动作 | 代码位置 |
|-----|---------|---------|
| `reasoning-start/delta/end` | 更新推理内容 | processor.ts:62-101 |
| `tool-input-start/delta/end` | 创建工具 Part | processor.ts:103-124 |
| `tool-call` | 执行工具 | processor.ts:126-171 |
| `tool-result` | 更新工具结果 | processor.ts:172-194 |
| `tool-error` | 处理工具错误 | processor.ts:196-221 |
| `text-start/delta/end` | 更新文本内容 | processor.ts:279-326 |
| `start-step/finish-step` | 步骤标记和快照 | processor.ts:225-277 |

### 5.3 工具执行流程

```typescript
// 1. tool-call 事件触发
case "tool-call": {
  const match = toolcalls[value.toolCallId]
  await Session.updatePart({
    ...match,
    tool: value.toolName,
    state: {
      status: "running",
      input: value.input,
    },
  })

  // 2. AI SDK 自动调用工具的 execute 函数
  // 工具定义在 packages/opencode/src/session/prompt.ts:714-742
  tools[item.id] = tool({
    description: item.description,
    inputSchema: jsonSchema(schema),
    async execute(args, options) {
      // 3. 执行工具逻辑
      const ctx = context(args, options)
      const result = await item.execute(args, ctx)
      return result
    },
  })

  // 4. 工具结果自动返回给大模型
  // 通过 tool-result 事件
}
```

---

## 6. Function Calling 原理

### 6.1 什么是 Function Calling

Function Calling 是大模型的一种标准能力，允许模型：

1. **理解工具定义**：通过工具描述和参数 Schema
2. **决定何时调用**：根据用户请求选择合适的工具
3. **生成调用参数**：按照 Schema 生成正确的参数
4. **处理工具结果**：基于工具结果继续响应

### 6.2 标准 Function Calling 流程

```
┌─────────────────────────────────────────────────────────┐
│  1. 定义工具 (Tool Definition)                          │
│     { name, description, parameters }                   │
└─────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│  2. 发送请求 (Request)                                  │
│     messages + tools + system prompt                    │
└─────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│  3. 模型响应 (Response)                                 │
│     text + tool_calls (如果有)                          │
└─────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│  4. 执行工具 (Execute Tools)                            │
│     本地执行工具函数                                     │
└─────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│  5. 返回结果 (Tool Results)                             │
│     将工具结果添加到消息历史                             │
└─────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│  6. 继续对话 (Continue)                                  │
│     模型基于工具结果继续生成                             │
└─────────────────────────────────────────────────────────┘
```

### 6.3 协议格式（OpenAI 风格）

**请求格式**：
```json
{
  "messages": [
    {"role": "system", "content": "You are..."},
    {"role": "user", "content": "Read package.json"}
  ],
  "tools": [
    {
      "type": "function",
      "function": {
        "name": "read",
        "description": "Reads a file...",
        "parameters": {
          "type": "object",
          "properties": {
            "filePath": {"type": "string"}
          },
          "required": ["filePath"]
        }
      }
    }
  ]
}
```

**响应格式（工具调用）**：
```json
{
  "content": [
    {
      "type": "text",
      "text": "I'll read the package.json file for you."
    },
    {
      "type": "tool_use",
      "id": "toolu_abc123",
      "name": "read",
      "input": {
        "filePath": "/project/package.json"
      }
    }
  ]
}
```

**工具结果格式**：
```json
{
  "role": "user",
  "content": [
    {
      "type": "tool_result",
      "tool_use_id": "toolu_abc123",
      "content": "00001| {\n00002|   \"name\": \"project\"..."
    }
  ]
}
```

---

## 7. 为什么这样设计

### 7.1 不是特殊训练，而是标准能力

**答案**：大模型返回这种格式 **不是因为特殊训练**，而是因为：

1. **标准 Function Calling 能力**
   - Claude、GPT-4、Gemini 等主流模型都原生支持
   - 这是模型的基础能力，不需要额外训练

2. **提示词工程**
   - 系统提示词告诉模型它有这些工具可用
   - 工具描述告诉模型每个工具的作用
   - 参数 Schema 告诉模型如何正确调用

3. **SDK 处理协议**
   - Vercel AI SDK 处理所有协议转换
   - 将工具定义转换为模型需要的格式
   - 将模型响应转换为统一的事件流

### 7.2 提示词的作用

提示词 **不定义返回格式**，而是：

```
┌─────────────────────────────────────────────────────┐
│  提示词的作用                                        │
├─────────────────────────────────────────────────────┤
│  ✓ 定义角色和行为 ("You are OpenCode...")          │
│  ✓ 指导使用工具 ("Use the Read tool to...")        │
│  ✓ 设置约束条件 ("NEVER create files unless...")    │
│  ✗ 不定义返回格式 (由模型和 SDK 处理)              │
└─────────────────────────────────────────────────────┘
```

### 7.3 SDK 的关键作用

Vercel AI SDK 在这里扮演了关键角色：

```typescript
// packages/opencode/src/session/llm.ts:183-265
return streamText({
  tools,  // SDK 自动处理工具定义
  model: wrapLanguageModel({ model: language }),
  messages,

  // SDK 处理所有协议细节
  experimental_repairToolCall(failed) {
    // 修复工具调用错误
  },

  // 返回统一的事件流
  // fullStream: AsyncIterable<StreamEvent>
})
```

**SDK 负责**：
- 将工具定义转换为模型特定格式
- 将模型响应转换为统一事件
- 处理流式传输
- 错误修复和重试

### 7.4 为什么能工作

| 组件 | 职责 | 为什么有效 |
|-----|------|-----------|
| 大模型 | 理解意图，决定调用工具 | 原生支持 Function Calling |
| 提示词 | 指导行为，设置约束 | 模型理解自然语言指令 |
| 工具描述 | 说明工具用途 | 模型根据描述选择工具 |
| 参数 Schema | 定义参数格式 | 模型按 Schema 生成参数 |
| AI SDK | 协议转换，事件流 | 统一不同模型的差异 |

### 7.5 代码层面的证据

**工具定义转换为 AI SDK 格式**：
```typescript
// packages/opencode/src/session/prompt.ts:714-743
tools[item.id] = tool({
  id: item.id,
  description: item.description,
  inputSchema: jsonSchema(schema),  // Zod → JSON Schema
  async execute(args, options) {
    // 工具执行逻辑
  }
})
```

**AI SDK 调用**：
```typescript
// packages/opencode/src/session/llm.ts:183
return streamText({
  tools,        // AI SDK 处理
  model,
  messages,
  // ...
})
```

**事件处理**：
```typescript
// packages/opencode/src/session/processor.ts:55-336
for await (const value of stream.fullStream) {
  switch (value.type) {
    // SDK 统一的事件格式
    case "tool-call":
    case "text-delta":
    case "reasoning-delta":
    // ...
  }
}
```

---

## 总结

### 核心答案

1. **传入的提示词格式**：
   - 系统提示词（角色定义、行为指导）
   - 工具定义（名称、描述、参数 Schema）
   - 消息历史
   - 当前用户消息

2. **大模型返回的格式**：
   - 流式事件（text-delta、tool-call、tool-result）
   - 由 AI SDK 统一处理
   - 基于 Function Calling 标准

3. **如何确定下一步动作**：
   - SessionProcessor 监听事件流
   - 根据事件类型执行对应操作
   - 工具调用由 AI SDK 自动触发

4. **为什么这样返回**：
   - **不是特殊训练**，而是标准 Function Calling 能力
   - 提示词定义行为，不定义格式
   - AI SDK 处理所有协议转换
   - 大模型原生支持这种交互模式

### 关键文件索引

| 功能 | 文件 |
|-----|------|
| 系统提示词 | [packages/opencode/src/session/prompt/anthropic.txt](packages/opencode/src/session/prompt/anthropic.txt:1) |
| 工具定义 | [packages/opencode/src/tool/read.ts](packages/opencode/src/tool/read.ts:1) |
| 工具描述 | [packages/opencode/src/tool/read.txt](packages/opencode/src/tool/read.txt:1) |
| 工具转换 | [packages/opencode/src/session/prompt.ts:662-840](packages/opencode/src/session/prompt.ts:662) |
| LLM 调用 | [packages/opencode/src/session/llm.ts:46-266](packages/opencode/src/session/llm.ts:46) |
| 响应处理 | [packages/opencode/src/session/processor.ts:26-407](packages/opencode/src/session/processor.ts:26) |

这种设计使得 OpenCode 能够：
- 支持多种大模型（Claude、GPT、Gemini 等）
- 统一的接口处理不同的模型协议
- 灵活扩展新工具
- 流式响应提供更好的用户体验
