# OpenCode LLM 交互调试指南

本文档说明如何查看 OpenCode 与大模型之间的完整交互过程，包括发送给 LLM 的请求和 LLM 返回的响应。

## 快速开始

```bash
# 1. 编译（如果还没编译）
cd /mnt/c/dev/tmp/opencode
bun run --cwd packages/opencode build --single

# 2. 启用调试模式运行
OPENCODE_DEBUG_LLM=1 /mnt/c/dev/tmp/opencode/packages/opencode/dist/opencode-linux-x64/bin/opencode

# 3. 在另一个终端查看日志
tail -f ~/.local/share/opencode/logs/llm-debug.log
```

## 环境变量说明

| 环境变量 | 作用 | 示例 |
|---------|------|------|
| `OPENCODE_DEBUG_LLM=1` | 启用 LLM 调试日志 | `OPENCODE_DEBUG_LLM=1 opencode` |
| `OPENCODE_DEBUG_LLM_FILE` | 自定义日志文件路径 | `OPENCODE_DEBUG_LLM_FILE=/tmp/llm.log opencode` |

## 日志文件位置

- **默认路径**: `~/.local/share/opencode/logs/llm-debug.log`
- **自定义路径**: 通过 `OPENCODE_DEBUG_LLM_FILE` 环境变量指定

## 日志内容说明

### 请求日志 (REQUEST)

每次向 LLM 发送请求时记录：

```json
{
  "model": {
    "provider": "anthropic",
    "id": "claude-sonnet-4-6"
  },
  "agent": "build",
  "tools": ["read", "edit", "bash", "write", "glob", "grep", ...],
  "systemPrompt": "You are Claude Code, Anthropic's official CLI...",
  "messages": [
    {
      "index": 0,
      "role": "system",
      "content": "..."
    },
    {
      "index": 1,
      "role": "user",
      "content": "你好"
    }
  ],
  "options": {
    "temperature": 0.7,
    "topP": 1,
    "maxOutputTokens": 32000
  }
}
```

### 响应日志 (RESPONSE)

LLM 返回的每个事件都会记录：

| 事件类型 | 说明 |
|---------|------|
| `RESPONSE: start` | 流开始 |
| `RESPONSE: start-step` | 步骤开始 |
| `RESPONSE: reasoning-start` | 思考开始 |
| `RESPONSE: reasoning-delta` | 思考增量（模型在思考过程中的输出） |
| `RESPONSE: reasoning-end` | 思考结束 |
| `RESPONSE: text-start` | 文本输出开始 |
| `RESPONSE: text-delta` | 文本增量（模型的实际回复） |
| `RESPONSE: text-end` | 文本输出结束 |
| `RESPONSE: tool-input-start` | 工具调用开始 |
| `RESPONSE: tool-call` | 工具调用（包含工具名和输入参数） |
| `RESPONSE: tool-result` | 工具执行结果 |
| `RESPONSE: tool-error` | 工具执行错误 |
| `RESPONSE: finish-step` | 步骤结束（包含 token 使用量） |
| `RESPONSE: finish` | 流结束 |

## 交互流程示例

```
用户输入: "你好"
    ↓
[REQUEST] → 发送给 LLM
    {
      model: "claude-sonnet-4-6",
      messages: [{ role: "user", content: "你好" }],
      tools: [...],
      systemPrompt: "..."
    }
    ↓
[RESPONSE: start] → LLM 开始响应
[RESPONSE: reasoning-start] → 模型开始思考
[RESPONSE: reasoning-delta] → 思考内容增量...
[RESPONSE: reasoning-end] → 思考结束
[RESPONSE: text-start] → 开始输出文本
[RESPONSE: text-delta] → "你好！"
[RESPONSE: text-delta] → "有什么"
[RESPONSE: text-delta] → "我可以帮助你的吗？"
[RESPONSE: text-end] → 文本输出结束
[RESPONSE: finish-step] → 步骤结束，统计 token 使用
    ↓
用户看到回复: "你好！有什么我可以帮助你的吗？"
```

## 常用命令

```bash
# 查看完整日志
cat ~/.local/share/opencode/logs/llm-debug.log

# 实时查看日志
tail -f ~/.local/share/opencode/logs/llm-debug.log

# 只看请求日志
grep "REQUEST" ~/.local/share/opencode/logs/llm-debug.log -A 50

# 只看工具调用
grep "tool-call\|tool-result" ~/.local/share/opencode/logs/llm-debug.log -A 10

# 清空日志
> ~/.local/share/opencode/logs/llm-debug.log

# 保存到自定义位置
OPENCODE_DEBUG_LLM=1 OPENCODE_DEBUG_LLM_FILE=./my-debug.log ./opencode
```

## 代码修改位置

如果需要修改调试功能，相关代码在：

| 文件 | 说明 |
|------|------|
| `packages/opencode/src/flag/flag.ts` | `OPENCODE_DEBUG_LLM` 环境变量定义 |
| `packages/opencode/src/session/llm.ts` | `debugLLM` 函数和请求日志 |
| `packages/opencode/src/session/processor.ts` | 响应日志 |

## 注意事项

1. 调试日志会产生大量输出，建议只在需要调试时启用
2. 日志文件会不断追加，记得定期清理
3. 日志中会截断过长的内容（system prompt 截取前 2000 字符，消息截取前 500 字符）
4. 工具输出截取前 500 字符，避免日志过大
