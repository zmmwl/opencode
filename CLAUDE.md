# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

OpenCode is an open-source AI coding agent similar to Claude Code. It is built as a monorepo using TurboRepo and Bun, with a client/server architecture supporting multiple frontends (CLI/TUI, Web, Desktop).

## Development Commands

```bash
# Install dependencies
bun install

# Start development (TUI mode)
bun dev                    # runs in packages/opencode directory
bun dev <directory>        # run against specific directory
bun dev .                  # run against the opencode repo itself

# Start API server (headless)
bun dev serve              # port 4096 by default
bun dev serve --port 8080  # custom port

# Run web app for UI development (requires server running)
bun run --cwd packages/app dev

# Run desktop app (Tauri)
bun run --cwd packages/desktop tauri dev

# Build standalone executable
./packages/opencode/script/build.ts --single

# Type checking
bun turbo typecheck
# or for single package
bun run --cwd packages/opencode typecheck

# Run tests (from packages/opencode)
bun test                              # all tests
bun test test/session/session.test.ts # single test file
```

## Architecture Overview

### Monorepo Structure

```
packages/
├── opencode/          # Core CLI/Server - business logic, session management, tools
├── app/               # Shared web UI components (SolidJS)
├── desktop/           # Tauri desktop app (wraps packages/app)
├── plugin/            # Plugin system (@opencode-ai/plugin)
├── sdk/js/            # JavaScript SDK
└── console/           # Console application sub-packages
```

### Core Package Structure (`packages/opencode/src/`)

```
├── index.ts           # CLI entry point (yargs)
├── agent/             # Agent definitions (build, plan, explore, etc.)
├── provider/          # AI provider integrations (20+ providers)
├── session/           # Session management, LLM streaming, message handling
├── tool/              # Tool implementations (edit, bash, read, write, etc.)
├── cli/cmd/           # CLI commands (run, serve, tui, etc.)
├── cli/cmd/tui/       # Terminal UI (SolidJS + opentui)
├── permission/        # Permission system for tool access control
├── lsp/               # Language Server Protocol integration
├── mcp/               # Model Context Protocol server support
├── config/            # Configuration management
├── bus/               # Event bus for inter-component communication
├── storage/           # Persistent storage layer
└── project/           # Project instance management
```

### Key Architectural Patterns

#### 1. Agent System (`src/agent/agent.ts`)
- **build**: Default agent with full tool access
- **plan**: Read-only agent for code exploration (denies edits)
- **explore**: Subagent for codebase exploration
- **general**: Subagent for complex multi-step tasks
- Agents have configurable permissions, model preferences, and prompts

#### 2. Provider System (`src/provider/provider.ts`)
- Uses Vercel AI SDK as the unified interface
- Supports 20+ providers: Anthropic, OpenAI, Google, Azure, Bedrock, etc.
- Provider-specific transforms handle API differences
- Model configuration from models.dev

#### 3. Tool System (`src/tool/tool.ts`)
Tools are defined using `Tool.define()` with:
- Zod schema for parameters
- Description (from .txt files)
- Execute function with context (sessionID, abort signal, permission ask)

```typescript
export const MyTool = Tool.define("toolname", async () => ({
  description: "...",
  parameters: z.object({ ... }),
  async execute(params, ctx) {
    await ctx.ask({ permission: "...", patterns: [...] })
    return { title, metadata, output }
  }
}))
```

#### 4. Session Processing (`src/session/processor.ts`)
Core execution loop:
1. Stream LLM response via `LLM.stream()`
2. Handle stream events: text-delta, tool-call, reasoning, etc.
3. Execute tools and update message parts
4. Manage compaction when context overflows

#### 5. Permission System (`src/permission/next.ts`)
- Rule-based permission control per agent
- Patterns support wildcards and path matching
- Actions: allow, deny, ask
- Permissions: edit, read, bash, external_directory, question, etc.

### Data Flow

```
User Input → Session.create() → SessionPrompt.command()
    → LLM.stream() → SessionProcessor.process()
    → Tool Execution → Permission Check
    → Response Parts → MessageV2 Storage → UI Update
```

### Message Structure (`src/session/message-v2.ts`)
- User/Assistant messages with parts
- Part types: text, tool, reasoning, file, step-start, step-finish, patch
- Streaming updates via Bus events

## Configuration

- Config file: `~/.config/opencode/opencode.json`
- Priority: remote → global → project → inline
- Key configs: agents, providers, permissions, MCP servers

## Testing

Tests use Bun's built-in test runner:
- Located in `packages/opencode/test/`
- Pattern: `*.test.ts`
- Run specific tests: `bun test test/path/to/test.ts`

## Important Files for Understanding

| File | Purpose |
|------|---------|
| `src/session/processor.ts` | Core LLM streaming and tool execution loop |
| `src/session/llm.ts` | LLM API integration via Vercel AI SDK |
| `src/tool/edit.ts` | Edit tool with fuzzy matching strategies |
| `src/tool/bash.ts` | Shell command execution with tree-sitter parsing |
| `src/provider/provider.ts` | AI provider configuration and model registry |
| `src/permission/next.ts` | Permission rules engine |

## Style Notes

- Use Bun APIs where appropriate (e.g., `Bun.file()`)
- Functions: keep logic within single function unless reuse/composition benefits
- Avoid unnecessary destructuring
- Prefer `.catch()` over try/catch when possible
- Use precise types, avoid `any`
- Immutable patterns, avoid `let`
