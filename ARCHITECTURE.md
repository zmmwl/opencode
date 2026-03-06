# OpenCode 项目完整架构分析

> **版本**: 1.1.53  
> **最后更新**: 2026年2月9日  
> **项目状态**: Active Development

## 目录

- [1. 项目概述](#1-项目概述)
- [2. 整体架构](#2-整体架构)
- [3. 核心模块详细分析](#3-核心模块详细分析)
  - [3.1 CLI系统模块](#31-cli系统模块)
  - [3.2 Server/HTTP API模块](#32-serverhttp-api模块)
  - [3.3 Session管理模块](#33-session管理模块)
  - [3.4 LLM Provider模块](#34-llm-provider模块)
  - [3.5 Tool工具系统](#35-tool工具系统)
  - [3.6 Agent代理系统](#36-agent代理系统)
  - [3.7 Skill技能系统](#37-skill技能系统)
  - [3.8 LSP语言服务器](#38-lsp语言服务器)
  - [3.9 Storage存储模块](#39-storage存储模块)
  - [3.10 Auth认证模块](#310-auth认证模块)
- [4. 前端架构](#4-前端架构)
- [5. 数据流和控制流](#5-数据流和控制流)
- [6. 插件和扩展机制](#6-插件和扩展机制)
- [7. 部署和基础设施](#7-部署和基础设施)
- [8. 开发指南](#8-开发指南)

---

## 1. 项目概述

### 1.1 项目简介

OpenCode是一个开源的AI编程助手项目，类似于Claude Code，旨在为开发者提供智能的代码助手功能。它采用现代化的技术栈和架构设计，支持多种AI模型提供商，提供灵活的开发工具集成。

**核心特性**：

- 100%开源，不绑定任何特定提供商
- 支持多种AI模型（Claude、OpenAI、Google、本地模型等）
- 开箱即用的LSP（语言服务器协议）支持
- 专注TUI（终端用户界面）体验
- Client/Server分离架构，支持多种前端

**设计理念**：

- **模块化**：高度模块化的架构，便于维护和扩展
- **可扩展性**：插件化的工具系统、技能系统和代理系统
- **Provider-agnostic**：不依赖特定AI提供商，保持灵活性
- **现代化**：使用Bun、TypeScript、SolidJS等现代技术栈

### 1.2 技术栈

**后端技术栈**：

- **运行时**：Bun 1.3.8（高性能JavaScript运行时）
- **语言**：TypeScript 5.8.2（强类型支持）
- **Web框架**：Hono 4.10.7（轻量级HTTP框架）
- **AI SDK**：Vercel AI SDK（统一的AI接口）
- **CLI框架**：Yargs 18.0.0（命令行解析）
- **验证**：Zod 4.1.8（模式验证）
- **工具函数**：Remeda 2.26.0（函数式编程）

**前端技术栈**：

- **UI框架**：SolidJS 1.9.10（响应式UI框架）
- **TUI框架**：OpenTUI 0.1.77（终端用户界面）
- **构建工具**：Vite 7.1.4（现代构建工具）
- **桌面应用**：Tauri（跨平台桌面应用）

**AI提供商支持**：

- Anthropic (Claude系列)
- OpenAI (GPT系列)
- Google (Gemini系列)
- 本地模型
- 其他第三方提供商（通过OpenRouter等）

**Monorepo管理**：

- **构建工具**：TurboRepo 2.5.6（高效的Monorepo构建）
- **包管理**：Workspaces管理多个子包
- **依赖管理**：Bun内置包管理器

### 1.3 与Claude Code的对比

| 特性       | OpenCode          | Claude Code     |
| ---------- | ----------------- | --------------- |
| 开源状态   | 100%开源          | 闭源            |
| 提供商绑定 | Provider-agnostic | 仅支持Anthropic |
| LSP支持    | 开箱即用          | 集成但非核心    |
| TUI支持    | 专注TUI           | Web为主         |
| 架构       | Client/Server分离 | 客户端为主      |
| 扩展性     | 插件化架构        | 有限扩展        |
| 多提供商   | 支持+10+提供商    | 主要Anthropic   |
| 自托管     | 完全支持          | 云端为主        |

---

## 2. 整体架构

### 2.1 Client/Server分离架构

OpenCode采用Client/Server分离架构，实现了前后端的解耦和灵活性。

**架构图示**：

```
┌─────────────────────────────────────────────────────────────────┐
│                    OpenCode 整体架构                          │
├─────────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌────────────────┐    ┌──────────────┐    ┌──────────┐ │
│  │   CLI Client  │────▶│  HTTP Server │────▶│  LLM API │ │
│  │  (run/serve)  │    │  (Hono)      │    │(Provider)│ │
│  └────────────────┘    └──────────────┘    └──────────┘ │
│         │                                         │          │
│         │                    ┌──────────────┐          │
│         └────────────────────▶│  Frontend    │          │
│                              │ (TUI/Web)    │          │
│                              └──────────────┘          │
│                                                             │
└─────────────────────────────────────────────────────────────────┘
         ▲                                     ▲
         │                                     │
    命令行交互                          用户界面交互
```

**核心组件**：

1. **CLI客户端**：命令行接口，提供`opencode run`、`opencode serve`等命令
2. **HTTP服务器**：基于Hono的REST API服务，提供所有功能接口
3. **LLM集成层**：统一的AI模型调用接口，支持多种提供商
4. **前端客户端**：TUI、Web、Desktop三种界面
5. **插件系统**：工具、技能、代理的扩展机制

### 2.2 Monorepo组织结构

OpenCode使用Monorepo结构管理多个子包，采用TurboRepo进行高效的构建和任务管理。

**包结构**：

```
opencode/
├── packages/
│   ├── opencode/          # 核心包（CLI、服务器、工具等）
│   ├── sdk/js/            # JavaScript/TypeScript SDK
│   ├── app/               # Web应用
│   ├── console/           # TUI控制台
│   ├── desktop/           # 桌面应用
│   ├── web/               # Web UI组件库
│   ├── enterprise/         # 企业功能
│   ├── function/           # 函数库
│   ├── plugin/            # 插件系统
│   └── script/            # 构建脚本
├── infra/                # 基础设施代码（SST配置）
├── specs/                # 设计规范文档
├── themes/               # UI主题
├── nix/                  # Nix包定义
└── logs/                 # 日志目录
```

**关键配置文件**：

- `turbo.json`：TurboRepo任务定义和依赖管理
- `package.json`：根包配置和workspaces定义
- `tsconfig.json`：TypeScript全局配置
- `bunfig.toml`：Bun运行时配置

### 2.3 核心设计原则

**1. 模块化设计**

- 每个模块职责单一，高内聚低耦合
- 清晰的模块边界和接口定义
- 便于独立测试和替换

**2. 插件化架构**

- 工具系统：可插拔的工具定义和注册
- 技能系统：可扩展的技能加载和执行
- 代理系统：可配置的代理类型和能力

**3. Provider-agnostic**

- 统一的LLM调用接口
- 支持多种AI提供商无缝切换
- 不依赖特定提供商的特性

**4. 类型安全**

- 全面的TypeScript类型定义
- Zod模式验证确保输入安全
- 编译时类型检查

**5. 错误处理和日志**

- 统一的错误类型和处理机制
- 结构化日志输出
- 详细的错误上下文

**6. 性能优化**

- Bun运行时提供高性能执行
- 流式处理减少响应延迟
- 懒加载和缓存机制

---

## 3. 核心模块详细分析

### 3.1 CLI系统模块

#### 3.1.1 CLI框架使用方式

**入口点**：`/mnt/c/dev/tmp/opencode/packages/opencode/src/index.ts`

OpenCode使用Yargs框架构建CLI系统，提供了完整的命令行接口。

**核心架构**：

```typescript
import yargs from "yargs"
import { hideBin } from "yargs/helpers"

const cli = yargs(hideBin(process.argv))
  .scriptName("opencode")
  .wrap(100)
  .middleware(globalMiddleware) // 全局中间件
  .command(RunCommand)
  .command(ServeCommand)
  .command(WebCommand)
  // ... 其他命令
  .help("help", "show help")
  .version("version", "show version number")
  .fail(errorHandler)
```

**主要特性**：

1. **命令定义**：通过`.command()`方法注册所有子命令
2. **参数解析**：支持位置参数和选项参数
3. **中间件系统**：全局中间件用于日志初始化和环境设置
4. **错误处理**：统一的错误处理和用户友好的错误信息
5. **帮助系统**：自动生成帮助文档

#### 3.1.2 主要命令实现

**Run命令** (`packages/opencode/src/cli/cmd/run.ts`)

- **功能**：主要的交互式命令，与AI代理对话
- **参数**：
  - `message`：用户消息（位置参数）
  - `--command`：直接执行命令
  - `--continue`：继续之前的会话
  - `--session`：指定会话ID
  - `--fork`：分叉会话
  - `--share`：共享会话
  - `--model`：指定AI模型
  - `--agent`：选择代理类型
  - `--format`：输出格式
  - `--file`：附加文件
- **执行流程**：
  1. 解析用户输入和参数
  2. 创建或继续会话
  3. 通过SDK连接到服务器（本地或远程）
  4. 发送消息到AI代理
  5. 处理工具调用和响应
  6. 显示结果给用户

**Serve命令** (`packages/opencode/src/cli/cmd/serve.ts`)

- **功能**：启动HTTP服务器
- **参数**：
  - `--port`：服务器端口（默认4096）
  - `--host`：服务器主机
  - `--mdns`：启用mDNS服务发现
  - `--cors`：CORS白名单
- **执行流程**：
  1. 解析网络选项
  2. 初始化HTTP服务器
  3. 配置中间件和路由
  4. 启动服务器监听
  5. 启用mDNS广播

**Web命令** (`packages/opencode/src/cli/cmd/web.ts`)

- **功能**：启动服务器并打开Web界面
- **参数**：与Serve命令相同的网络选项
- **执行流程**：
  1. 启动HTTP服务器
  2. 在默认浏览器中打开Web界面
  3. 显示访问URL

**Auth命令** (`packages/opencode/src/cli/cmd/auth.ts`)

- **功能**：管理AI提供商的认证凭据
- **子命令**：
  - `login`：登录到提供商
  - `logout`：登出
  - `list`：列出已保存的凭据
- **执行流程**：
  1. 交互式引导用户选择提供商
  2. 支持OAuth流程或API密钥输入
  3. 安全存储凭据到本地配置
  4. 验证凭据有效性

**Agent命令** (`packages/opencode/src/cli/cmd/agent.ts`)

- **功能**：管理和创建自定义AI代理
- **子命令**：
  - `create`：创建新代理
  - `list`：列出可用代理
- **执行流程**：
  1. 交互式收集代理配置
  2. 生成代理定义文件
  3. 注册代理到系统

**Models命令** (`packages/opencode/src/cli/cmd/models.ts`)

- **功能**：列出可用的AI模型
- **参数**：
  - `--provider`：指定提供商
  - `--verbose`：显示详细信息
- **执行流程**：
  1. 查询所有提供商
  2. 显示模型列表和能力

**其他重要命令**：

- `generate`：基于OpenAPI规范生成示例代码
- `session`：管理会话历史
- `export/import`：导出/导入会话数据
- `github`：GitHub集成
- `pr`：Pull Request管理
- `mcp`：Model Context Protocol集成
- `debug`：开发调试工具

#### 3.1.3 命令执行流程

**流程图示**：

```
用户输入
    │
    ▼
┌─────────────────┐
│  Yargs解析器  │─▶┌───────────────┐
│  (参数验证)    │  │  命令路由器  │
└─────────────────┘  └───────────────┘
                               │
                               ▼
                    ┌─────────────────┐
                    │  全局中间件    │─▶┌───────────────┐
                    │  (日志/环境)   │  │  命令处理器  │
                    └─────────────────┘  └───────────────┘
                                          │
                                          ▼
                                  ┌─────────────────┐
                                  │  错误处理器  │
                                  └─────────────────┘
```

#### 3.1.4 错误处理机制

**错误处理策略**：

1. **全局错误捕获**：

   ```typescript
   process.on("unhandledRejection", (e) => {
     Log.Default.error("rejection", { e })
   })
   process.on("uncaughtException", (e) => {
     Log.Default.error("exception", { e })
   })
   ```

2. **命令级错误处理**：
   - 使用`NamedError`体系进行错误分类
   - 提供用户友好的错误信息
   - 建议解决方案或下一步操作

3. **验证错误**：
   - Zod模式验证输入参数
   - 参数缺失或类型错误时给出明确提示

---

### 3.2 Server/HTTP API模块

#### 3.2.1 Hono框架使用方式

**核心文件**：`/mnt/c/dev/tmp/opencode/packages/opencode/src/server/server.ts`

OpenCode使用Hono框架构建HTTP API服务器，提供了现代化、高性能的REST API接口。

**架构设计**：

```typescript
const app = new Hono()
  .onError(globalErrorHandler) // 全局错误处理
  .use(basicAuthMiddleware) // 基础认证
  .use(loggingMiddleware) // 请求日志
  .use(corsMiddleware) // CORS配置
  .use(instanceMiddleware) // 实例上下文注入
  .route("/global", GlobalRoutes()) // 全局路由
  .route("/project", ProjectRoutes()) // 项目路由
  .route("/session", SessionRoutes()) // 会话路由
// ... 其他路由
```

#### 3.2.2 路由系统

**主要路由模块**：

**GlobalRoutes** (`packages/opencode/src/server/routes/global.ts`)

- 端点：
  - `GET /doc`：OpenAPI文档
  - `POST /log`：日志事件提交
  - 其他全局级端点

**ProjectRoutes** (`packages/opencode/src/server/routes/project.ts`)

- 端点：
  - `GET /project`：获取当前项目信息
  - `PUT /project`：更新项目配置
  - 项目级别的配置和管理

**SessionRoutes** (`packages/opencode/src/server/routes/session.ts`)

- 端点：
  - `POST /session`：创建新会话
  - `GET /session/:id`：获取会话详情
  - `DELETE /session/:id`：删除会话
  - 会话生命周期管理

**FileRoutes** (`packages/opencode/src/server/routes/file.ts`)

- 端点：
  - `GET /file/find`：文件查找
  - `GET /file/read`：文件读取
  - `POST /file/edit`：文件编辑
  - `POST /file/write`：文件写入
  - 文件操作API

**PtyRoutes** (`packages/opencode/src/server/routes/pty.ts`)

- 端点：
  - `POST /pty`：创建伪终端会话
  - `PTY`事件流：实时终端输出
  - 终端集成

**McpRoutes** (`packages/opencode/src/server/routes/mcp.ts`)

- 端点：
  - `GET /mcp`：MCP服务器列表
  - `POST /mcp`：创建MCP连接
  - Model Context Protocol集成

**ConfigRoutes** (`packages/opencode/src/server/routes/config.ts`)

- 端点：
  - `GET /config`：获取配置
  - `PUT /config`：更新配置
  - 配置管理API

**ProviderRoutes** (`packages/opencode/src/server/routes/provider.ts`)

- 端点：
  - `GET /provider`：提供商列表
  - `GET /provider/:id`：提供商详情
  - `GET /provider/:id/models`：模型列表
  - 提供商管理

**QuestionRoutes** (`packages/opencode/src/server/routes/question.ts`)

- 端点：
  - `POST /question`：用户问题处理
  - `GET /question/:id`：获取问题历史
  - 交互式问题API

**PermissionRoutes** (`packages/opencode/src/server/routes/permission.ts`)

- 端点：
  - `POST /permission`：权限检查
  - `GET /permission`：权限列表
  - 权限管理API

**TuiRoutes** (`packages/opencode/src/server/routes/tui.ts`)

- 端点：
  - TUI特定的路由
  - 终端界面专用端点

**ExperimentalRoutes** (`packages/opencode/src/server/routes/experimental.ts`)

- 端点：
  - 实验性功能路由
  - 新功能的测试端点

#### 3.2.3 中间件链

**执行顺序**：

```
请求 → onError → basicAuth → logging → cors → instance → routes → 响应
```

**中间件详解**：

1. **onError（全局错误处理）**：

   ```typescript
   .onError((err, c) => {
     log.error("failed", { error: err })
     if (err instanceof NamedError) {
       let status: ContentfulStatusCode
       if (err instanceof Storage.NotFoundError) status = 404
       else if (err instanceof Provider.ModelNotFoundError) status = 400
       else if (err.name.startsWith("Worktree")) status = 400
       else status = 500
       return c.json(err.toObject(), { status })
     }
     // ... HTTPException处理
   })
   ```

   - 统一的错误格式化
   - 适当的HTTP状态码
   - 详细的错误上下文

2. **basicAuth（基础认证）**：

   ```typescript
   .use((c, next) => {
     const password = Flag.OPENCODE_SERVER_PASSWORD
     if (!password) return next()
     const username = Flag.OPENCODE_SERVER_USERNAME ?? "opencode"
     return basicAuth({ username, password })(c, next)
   })
   ```

   - 可选的服务器密码保护
   - 自定义用户名
   - 支持环境变量配置

3. **logging（日志中间件）**：

   ```typescript
   .use(async (c, next) => {
     const skipLogging = c.req.path === "/log"
     if (!skipLogging) {
       log.info("request", {
         method: c.req.method,
         path: c.req.path,
       })
     }
     const timer = log.time("request", {
       method: c.req.method,
       path: c.req.path,
     })
     await next()
     if (!skipLogging) {
       timer.stop()
     }
   })
   ```

   - 请求方法记录
   - 请求路径记录
   - 请求计时

4. **cors（跨域资源共享）**：

   ```typescript
   .use(cors({
     origin(input) {
       // localhost和127.0.0.1直接允许
       if (input.startsWith("http://localhost:")) return input
       if (input.startsWith("http://127.0.0.1:")) return input
       if (input === "tauri://localhost" || input === "http://tauri.localhost") return input

       // *.opencode.ai域名允许
       if (/^https:\/\/([a-z0-9-]+\.)*opencode\.ai$/.test(input)) {
         return input
       }

       // 白名单域名
       if (_corsWhitelist.includes(input)) {
         return input
       }

       return  // 其他拒绝
     },
   }))
   ```

   - 本地开发环境直接允许
   - 生产域名白名单
   - 安全的跨域策略

5. **instance（实例注入）**：
   ```typescript
   Instance.provide({
     directory,
     init: InstanceBootstrap,
     async fn() {
       return next()
     },
   })
   ```

   - 工作目录注入
   - 实例初始化
   - 资源生命周期管理

#### 3.2.4 API端点设计

**RESTful设计原则**：

- 资源导向的URL设计
- 标准HTTP方法使用（GET、POST、PUT、DELETE）
- 统一的响应格式
- OpenAPI规范的完整文档

**认证和安全**：

- 基础认证中间件
- HTTPS支持（生产环境）
- CORS策略配置
- 请求验证和清理

---

### 3.3 Session管理模块

#### 3.3.1 会话生命周期

**核心功能**：

1. **会话创建**：
   - 生成唯一会话ID（ULID）
   - 初始化会话状态
   - 设置初始上下文
   - 持久化会话信息

2. **会话执行**：
   - 管理对话历史
   - 处理工具调用
   - 维护上下文状态
   - 流式响应处理

3. **会话终止**：
   - 保存最终状态
   - 清理临时资源
   - 归档会话数据

**会话数据结构**：

```typescript
{
  id: string              // ULID格式唯一标识
  createdAt: Date        // 创建时间
  updatedAt: Date        // 最后更新时间
  messages: Message[]     // 消息历史
  context: Context         // 会话上下文
  metadata: {            // 元数据
    agent: string
    model: string
    project: string
  }
}
```

#### 3.3.2 上下文管理

**上下文组成**：

1. **系统提示上下文**：
   - AI模型行为定义
   - 环境信息
   - 用户指令

2. **对话历史上下文**：
   - 消息历史记录
   - 工具调用记录
   - 用户偏好记忆

3. **项目上下文**：
   - 工作目录信息
   - 项目类型
   - Git仓库信息
   - 文件系统状态

**上下文更新策略**：

- 增量更新：每次交互只更新必要的信息
- 智能裁剪：保持上下文在合理大小内
- 优先级排序：重要的上下文信息保持可用

#### 3.3.3 状态持久化

**持久化机制**：

1. **文件系统存储**：
   - 会话数据保存在`.opencode`目录
   - 按项目和会话ID组织
   - JSON格式存储

2. **索引和缓存**：
   - 快速检索的会话索引
   - 热会话缓存
   - 查询优化

3. **状态同步**：
   - 多客户端状态同步
   - 冲突解决策略
   - 最终一致性保证

---

### 3.4 LLM Provider模块

#### 3.4.1 提供商抽象接口

**核心文件**：`/mnt/c/dev/tmp/opencode/packages/opencode/src/provider/provider.ts`

OpenCode实现了统一的LLM提供商抽象层，支持多种AI模型提供商。

**接口设计**：

```typescript
export namespace Provider {
  // 获取语言模型
  async function getLanguage(model: Model): Promise<LanguageModelV2>

  // 获取提供商信息
  async function getProvider(providerID: string): Promise<ProviderInfo>

  // 获取模型信息
  async function getModel(providerID: string, modelID: string): Promise<ModelInfo>

  // 内置提供商列表
  const BUNDLED_PROVIDERS: Provider[]
}
```

**支持的提供商**：

1. **Anthropic** (`@ai-sdk/anthropic`)
   - Claude 3.5/3 Opus系列
   - 完整的模型支持

2. **OpenAI** (`@ai-sdk/openai`)
   - GPT-4/GPT-4.1系列
   - O1/O3模型
   - 完整的API支持

3. **Google** (`@ai-sdk/google`)
   - Gemini系列模型
   - Google Vertex AI

4. **本地模型**：
   - Ollama
   - LM Studio
   - 其他本地推理引擎

5. **OpenRouter** (`@openrouter/ai-sdk-provider`)
   - 多提供商聚合
   - 模型路由
   - 成本优化

#### 3.4.2 模型调用机制

**调用流程**：

```
请求 → Provider抽象 → AI SDK → 具体提供商API → 响应
```

**核心组件**：

1. **模型选择**：

   ```typescript
   const language = await Provider.getLanguage(input.model)
   const [language, cfg, provider, auth] = await Promise.all([
     Provider.getLanguage(input.model),
     Config.get(),
     Provider.getProvider(input.model.providerID),
     Auth.get(input.model.providerID),
   ])
   ```

   - 动态加载模型
   - 配置管理
   - 认证信息获取

2. **提示词构建**：

   ```typescript
   const system = []
   system.push(
     [
       input.agent.prompt ? [input.agent.prompt] : isCodex ? [] : SystemPrompt.provider(input.model),
       ...input.system,
       ...(input.user.system ? [input.user.system] : []),
     ]
       .filter((x) => x)
       .join("\n"),
   )
   ```

   - 提供商特定提示
   - 用户自定义提示
   - 系统提示注入

3. **流式调用**：
   ```typescript
   const result = await streamText({
     model: language,
     messages: normalizedMessages,
     tools: tools,
     temperature,
     maxRetries,
     experimental_repairToolCall,
     onToolCall,
     onFinish,
     headers,
     abortSignal,
   })
   ```

   - 流式响应处理
   - 工具调用支持
   - 重试机制
   - 超时控制

#### 3.4.3 响应处理机制

**响应处理**：

1. **流式响应**：
   - 实时流式输出
   - 分块数据传输
   - 进度事件

2. **工具调用**：
   - 工具调用检测
   - 参数提取
   - 工具执行
   - 结果返回

3. **错误处理**：
   - 提供商错误映射
   - 统一错误格式
   - 重试逻辑

---

### 3.5 Tool工具系统

#### 3.5.1 工具接口定义

**核心文件**：`/mnt/c/dev/tmp/opencode/packages/opencode/src/tool/tool.ts`

```typescript
export interface Info<Parameters extends z.ZodType = z.ZodType, M extends Metadata = Metadata> {
  id: string
  init: (ctx?: InitContext) => Promise<{
    description: string
    parameters: Parameters // Zod模式
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

#### 3.5.2 内置工具详细分析

**GlobTool** (`packages/opencode/src/tool/glob/`)

- **功能**：基于glob模式匹配文件
- **参数**：pattern、path、options
- **返回**：匹配的文件路径列表
- **使用场景**：快速定位文件、批量文件操作

**GrepTool** (`packages/opencode/src/tool/grep/`)

- **功能**：文本/正则搜索
- **参数**：pattern、path、include、exclude
- **返回**：匹配的文件和行号
- **使用场景**：代码搜索、日志分析、批量替换

**ListTool** (`packages/opencode/src/tool/ls/`)

- **功能**：列出目录内容
- **参数**：path、recursive、detailed
- **返回**：文件和子目录列表
- **使用场景**：浏览文件系统、目录遍历

**ReadTool** (`packages/opencode/src/tool/read/`)

- **功能**：读取文件内容
- **参数**：path、offset、limit
- **返回**：文件内容（文本或二进制）
- **使用场景**：查看代码、配置文件、日志文件

**EditTool** (`packages/opencode/src/tool/edit/`)

- **功能**：编辑文件内容
- **参数**：path、edits、dryRun
- **返回**：编辑结果和差异
- **使用场景**：代码修改、批量更新、补丁应用

**WriteTool** (`packages/opencode/src/tool/write/`)

- **功能**：写入文件内容
- **参数**：path、content、createPath
- **返回**：写入结果
- **使用场景**：创建新文件、保存结果、配置更新

**CodeSearchTool** (`packages/opencode/src/tool/codesearch/`)

- **功能**：代码级搜索
- **参数**：query、language、framework
- **返回**：代码匹配和上下文
- **使用场景**：查找函数定义、理解代码库、语义搜索

**WebSearchTool** (`packages/opencode/src/tool/websearch/`)

- **功能**：网络搜索
- **参数**：query、count、source
- **返回**：搜索结果摘要
- **使用场景**：查找文档、获取最新信息、技术调研

**WebFetchTool** (`packages/opencode/src/tool/webfetch/`)

- **功能**：HTTP请求和内容获取
- **参数**：url、method、headers、body
- **返回**：响应内容（HTML/JSON/文本）
- **使用场景**：API调用、数据抓取、外部服务集成

**BashTool** (`packages/opencode/src/tool/bash/`)

- **功能**：执行shell命令
- **参数**：command、cwd、env
- **返回**：命令输出和退出码
- **使用场景**：系统操作、运行脚本、构建任务
- **安全考虑**：沙箱执行、权限控制、输入验证

**TaskTool** (`packages/opencode/src/tool/task/`)

- **功能**：任务编排和执行
- **参数**：prompt、context、tools
- **返回**：任务执行结果
- **使用场景**：多步骤任务、复杂工作流

**SkillTool** (`packages/opencode/src/tool/skill/`)

- **功能**：调用技能系统
- **参数**：skill、arguments
- **返回**：技能执行结果
- **使用场景**：执行自定义技能、扩展能力

**TodoWriteTool** (`packages/opencode/src/tool/todo/`)

- **功能**：待办事项管理
- **参数**：todos、action
- **返回**：操作结果
- **使用场景**：任务跟踪、团队协作

#### 3.5.3 工具执行机制

**执行流程**：

```
工具调用请求
    │
    ▼
┌─────────────────┐
│  Tool Registry │─▶┌───────────────┐
│  (工具注册表)   │  │  Tool Executor │
└─────────────────┘  └───────────────┘
                               │
                               ▼
                    ┌─────────────────┐
                    │  参数验证      │─▶┌───────────────┐
                    │  (Zod)        │  │  权限检查    │
                    └─────────────────┘  └───────────────┘
                                          │
                                          ▼
                                  ┌─────────────────┐
                                  │  工具执行      │
                                  └─────────────────┘
                                          │
                                          ▼
                                    返回结构化结果
```

**执行步骤**：

1. **工具发现**：从注册表查找工具定义
2. **参数验证**：使用Zod模式验证输入
3. **权限检查**：验证调用者是否有权限
4. **工具执行**：在受控环境中执行工具
5. **结果处理**：格式化输出和错误处理
6. **日志记录**：记录工具调用和结果

#### 3.5.4 工具权限控制

**权限类型**：

- `read`：文件读取权限
- `write`：文件写入权限
- `exec`：命令执行权限
- `network`：网络访问权限
- `fs`：文件系统操作权限

**权限验证**：

```typescript
async function checkPermission(tool: Tool.Info, context: Context): Promise<boolean> {
  const required = tool.permissions
  const available = context.agent.permissions

  for (const perm of required) {
    if (!available.includes(perm)) {
      return false
    }
  }
  return true
}
```

---

### 3.6 Agent代理系统

#### 3.6.1 代理类型定义

**核心文件**：`/mnt/c/dev/tmp/opencode/packages/opencode/src/agent/agent.ts`

OpenCode实现了多类型的AI代理系统，支持不同的任务类型和能力配置。

**代理类型**：

1. **Build Agent**（构建代理）：
   - **目的**：执行构建和开发任务
   - **能力**：全文件系统访问、命令执行、网络请求
   - **工具集**：所有工具可用
   - **权限**：允许编辑操作
   - **使用场景**：代码生成、Bug修复、重构

2. **Plan Agent**（规划代理）：
   - **目的**：规划和分析任务
   - **能力**：只读操作、代码搜索、文件查看
   - **工具集**：read、search工具为主
   - **权限**：拒绝编辑操作
   - **使用场景**：代码审查、架构分析、任务分解

3. **General Agent**（通用代理）：
   - **目的**：通用推理和协作
   - **能力**：根据任务动态选择工具
   - **工具集**：所有工具可用
   - **权限**：可配置
   - **使用场景**：复杂问题解决、多步骤任务

#### 3.6.2 代理切换机制

**切换方式**：

1. **Tab键切换**：用户可通过Tab键在不同代理间切换
2. **自动切换**：根据任务类型自动选择合适代理
3. **显式指定**：通过`--agent`参数指定代理类型
4. **上下文感知**：基于会话上下文建议代理

**切换决策逻辑**：

```typescript
function selectAgent(task: Task): string {
  // 分析任务特征
  const isBuildTask = detectBuildTask(task)
  const isPlanTask = detectPlanTask(task)

  // 自动选择
  if (isBuildTask) return "build"
  if (isPlanTask) return "plan"

  // 默认使用当前代理
  return currentAgent
}
```

#### 3.6.3 能力配置

**能力定义**：

```typescript
export type AgentCapabilities = {
  code_search: boolean // 代码搜索能力
  web_fetch: boolean // 网络请求能力
  file_edit: boolean // 文件编辑能力
  file_write: boolean // 文件写入能力
  command_exec: boolean // 命令执行能力
  skill_execution: boolean // 技能执行能力
}

export type AgentConfig = {
  name: string
  description?: string
  mode: "subagent" | "primary" | "all"
  native: boolean
  hidden?: boolean
  topP?: number
  temperature?: number
  color?: string
  permission: PermissionNext.Ruleset
  model?: {
    modelID: string
    providerID: string
  }
  variant?: string
  prompt?: string
  options: Record<string, any>
  steps?: number
}
```

#### 3.6.4 自定义代理支持

**代理创建**：

```typescript
// 代理定义文件
{
  "name": "custom-agent",
  "description": "Custom agent for specific tasks",
  "mode": "primary",
  "model": {
    "modelID": "claude-3-5-sonnet-20240229",
    "providerID": "anthropic"
  },
  "permission": {
    "write": "allow",
    "network": "allow",
    "bash": "ask"
  },
  "options": {
    "custom_param": "value"
  }
}
```

**代理加载**：

- 从配置目录加载代理定义
- 验证代理配置
- 注册到代理系统
- 支持热加载和更新

---

### 3.7 Skill技能系统

#### 3.7.1 技能定义和加载

**核心文件**：

- `/mnt/c/dev/tmp/opencode/packages/opencode/src/skill/index.ts`
- `/mnt/c/dev/tmp/opencode/packages/opencode/src/skill/loader.ts`
- `/mnt/c/dev/tmp/opencode/packages/opencode/src/skill/registry.ts`

**技能定义**：

```typescript
export interface Skill {
  id: string
  name: string
  description: string
  execute(input: SkillInput, context: SkillContext): Promise<SkillOutput>
}

export type SkillInput = {
  prompt: string
  context: Record<string, any>
  parameters: Record<string, any>
}

export type SkillOutput = {
  result: any
  tools: ToolCall[]
  context?: Record<string, any>
}
```

**技能加载机制**：

1. **目录扫描**：

   ```typescript
   const skillDirs = await Skill.dirs()
   // 从多个目录加载技能
   // 支持项目级和全局技能
   ```

2. **技能注册**：

   ```typescript
   const registry = new SkillRegistry()
   await registry.loadDirectory(skillDir)
   // 扫描技能文件
   // 解析技能定义
   // 注册到注册表
   ```

3. **技能发现**：
   - 自动发现可用技能
   - 技能元数据提取
   - 依赖关系解析

#### 3.7.2 技能与工具集成

**集成模式**：

```
用户请求
    │
    ▼
┌─────────────────┐
│  Agent/用户  │─▶┌───────────────┐
│               │  │  Skill System │
│               │  └───────────────┘
│               │              │
│               │              ▼
│               │      ┌─────────────────┐
│               │      │  Skill Execute  │
│               │      └─────────────────┘
│               │              │
│               │              ▼
│               │      ┌─────────────────┐
│               │      │  Tool System   │
│               │      └─────────────────┘
│               │              │
│               │              ▼
│               │         返回结果
└─────────────────┘
```

**技能执行流程**：

1. **技能解析**：理解用户请求和技能参数
2. **任务分解**：将复杂任务分解为工具调用序列
3. **工具编排**：按正确顺序调用所需工具
4. **结果聚合**：组合多个工具的返回结果
5. **上下文更新**：维护技能执行上下文

#### 3.7.3 技能执行流程

**执行策略**：

- **串行执行**：依赖性操作按顺序执行
- **并行执行**：独立操作并行执行
- **条件执行**：根据结果决定后续步骤
- **错误恢复**：失败时的重试或降级策略

---

### 3.8 LSP语言服务器

#### 3.8.1 LSP协议实现

**核心文件**：

- `/mnt/c/dev/tmp/opencode/packages/opencode/src/lsp/index.ts`
- `/mnt/c/dev/tmp/opencode/packages/opencode/src/lsp/server.ts`

OpenCode实现了完整的语言服务器协议（LSP），为编辑器提供代码智能功能。

**LSP功能**：

1. **代码补全**：自动完成和方法签名
2. **跳转定义**：快速导航到符号定义
3. **悬停信息**：显示类型信息和文档
4. **诊断信息**：错误和警告提示
5. **代码格式化**：自动格式化代码
6. **代码重构**：智能重构建议
7. **符号搜索**：查找文件中的符号引用

#### 3.8.2 支持的语言

**语言支持**：

- **TypeScript/JavaScript**：完整支持
- **Python**：完整支持
- **Go**：完整支持
- **Rust**：部分支持
- **Java**：部分支持
- **其他语言**：通过Tree-sitter扩展

#### 3.8.3 前端集成

**集成方式**：

1. **客户端-服务器通信**：
   - LSP客户端通过WebSocket或IPC与LSP服务器通信
   - 标准LSP协议消息交换

2. **功能映射**：
   - 编辑器命令 → LSP服务器
   - LSP功能 → 工具系统
   - 实时代码分析和AI能力结合

3. **实时同步**：
   - 文件变更实时通知
   - 诊断信息及时更新
   - 光标位置同步

---

### 3.9 Storage存储模块

#### 3.9.1 数据持久化

**存储架构**：

```
应用数据
    │
    ▼
┌─────────────────────────────────────────┐
│         Storage Layer              │
├─────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
│  │ File Store │  │ Session   │  │  Config    │ │
│  │           │  │ Store     │  │           │ │
│  └──────────┘  └──────────┘  └──────────┘ │
└─────────────────────────────────────────┘
         │             │         │
         ▼             ▼         ▼
    JSON文件      SQLite    环境变量
```

**存储类型**：

1. **文件系统存储**：
   - 会话数据（JSON文件）
   - 配置文件（JSON/YAML）
   - 日志文件（结构化日志）
   - 缓存数据（临时文件）

2. **SQLite存储**：
   - 会话索引
   - 元数据存储
   - 查询优化

3. **环境变量**：
   - 敏感配置（API密钥）
   - 运行时选项
   - 用户偏好

#### 3.9.2 缓存机制

**缓存策略**：

1. **响应缓存**：
   - LLM响应缓存
   - 工具调用结果缓存
   - 会话状态缓存

2. **内容缓存**：
   - 文件内容缓存
   - 代码搜索结果缓存
   - LSP符号缓存

3. **缓存失效**：
   - 时间TTL
   - 文件变更监听
   - 显式失效

#### 3.9.3 版本控制集成

**Git集成**：

- 工作目录Git状态检测
- 分支信息提取
- 文件变更追踪
- 提交集成

**版本信息使用**：

- 在提示词中包含仓库信息
- 基于分支调整行为
- 文件历史上下文

---

### 3.10 Auth认证模块

#### 3.10.1 认证流程

**认证类型**：

1. **API密钥认证**：
   - 直接输入API密钥
   - 本地安全存储
   - 密钥验证

2. **OAuth认证**：
   - 第三方登录流程
   - 授权回调处理
   - Token刷新

3. **自定义提供商**：
   - 插件系统支持
   - 扩展认证方式
   - 自定义认证逻辑

#### 3.10.2 Provider认证

**认证抽象**：

```typescript
export interface Auth {
  type: "oauth" | "api-key" | "custom"
  scopes?: string[]
  endpoints: {
    authorization: string
    token: string
    refresh?: string
  }
}
```

**认证流程**：

```
用户请求认证
    │
    ▼
┌─────────────────┐
│  Auth Manager │─▶┌───────────────┐
│              │  │  Provider      │
│              │  └───────────────┘
│              │              │
│              │              ▼
│              │      ┌─────────────────┐
│              │      │  OAuth/API Key  │
│              │      └─────────────────┘
│              │              │
│              │              ▼
│              │         ┌─────────────────┐
│              │         │  Credential Store│
│              │         └─────────────────┘
│              │              │
│              │              ▼
│              │         返回认证Token
└─────────────────┘
```

#### 3.10.3 安全机制

**安全措施**：

1. **密钥保护**：
   - 环境变量存储
   - 系统密钥链支持
   - 访问控制

2. **Token管理**：
   - 访问Token和刷新Token
   - Token过期处理
   - 安全撤销机制

3. **权限隔离**：
   - 认证信息与应用逻辑隔离
   - 最小权限原则
   - 审计日志

---

## 4. 前端架构

### 4.1 TUI控制台

**目录位置**：`/mnt/c/dev/tmp/opencode/packages/console/`

OpenCode的TUI（终端用户界面）采用OpenTUI框架构建，提供现代化的终端体验。

**核心特性**：

1. **组件化架构**：
   - 可复用的UI组件
   - 状态驱动的渲染
   - 响应式布局

2. **路由系统**：
   - 工作区选择路由
   - 会话管理路由
   - 配置页面路由
   - 嵌套路由支持

3. **状态管理**：
   - 全局应用状态
   - 会话状态
   - 用户偏好状态

4. **键盘交互**：
   - Vi键绑定支持
   - 高效键盘导航
   - 快捷命令系统

5. **主题支持**：
   - 明暗主题切换
   - 自定义主题
   - 现代色彩系统

### 4.2 Web应用

**目录位置**：`/mnt/c/dev/tmp/opencode/packages/app/`

Web应用采用SolidJS框架，提供现代化的Web界面。

**架构设计**：

```typescript
// 应用入口
export function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" component={WorkspacePicker} />
        <Route path="/session/:id" component={SessionView} />
        {/* 其他路由 */}
      </Routes>
    </Router>
  )
}
```

**核心特性**：

1. **SolidJS响应式UI**：
   - 组件化设计
   - 精细粒度响应式更新
   - 高性能渲染

2. **Vite构建系统**：
   - 快速热模块替换（HMR）
   - 优化的生产构建
   - 现代构建工具链

3. **路由设计**：
   - 基于Solid Router的声明式路由
   - 嵌套路由支持
   - 路由守卫和权限控制

4. **状态管理**：
   - 使用SolidJS响应式状态
   - Context API跨组件数据共享
   - 本地状态持久化

5. **API集成**：
   - TypeScript SDK客户端
   - 类型安全的API调用
   - 统一的错误处理

### 4.3 Web UI组件

**目录位置**：`/mnt/c/dev/tmp/opencode/packages/web/`

可复用的UI组件库，支持多种前端。

**组件分类**：

1. **基础组件**：
   - 按钮、输入框、选择器
   - 模态对话框
   - 加载指示器

2. **布局组件**：
   - 容器和网格布局
   - 侧边栏和主内容区
   - 响应式布局

3. **显示组件**：
   - 代码高亮显示
   - Markdown渲染器
   - 文件列表组件

4. **交互组件**：
   - 拖放支持
   - 键盘导航
   - 无障碍支持

**样式系统**：

- Tailwind CSS集成
- 自定义主题支持
- 响应式设计
- 明暗主题切换

### 4.4 桌面应用

**目录位置**：`/mnt/c/dev/tmp/opencode/packages/desktop/`

使用Tauri框架构建跨平台桌面应用。

**架构设计**：

```
┌─────────────────────────────────────────┐
│         Desktop Application            │
├─────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
│  │ Tauri    │  │  Web UI   │  │  Native   │ │
│  │ Runtime  │  │  (Embed)  │  │  Modules  │ │
│  └──────────┘  └──────────┘  └──────────┘ │
└─────────────────────────────────────────┘
         │             │         │
         ▼             ▼         ▼
    操作系统API      浏览器引擎   文件系统访问
```

**核心特性**：

1. **原生功能集成**：
   - 系统托盘图标
   - 全局快捷键
   - 原生文件对话框
   - 剪贴板访问

2. **Web内容嵌入**：
   - 集成Web UI组件
   - 共享状态管理
   - 统一的样式系统

3. **本地服务通信**：
   - 与本地OpenCode服务器通信
   - WebSocket实时更新
   - 离线模式支持

4. **打包和分发**：
   - 跨平台构建
   - 自动更新机制
   - 安装包生成

**支持平台**：

- macOS（Intel和Apple Silicon）
- Windows（x64）
- Linux（多种发行版）

### 4.5 前端SDK

**目录位置**：`/mnt/c/dev/tmp/opencode/packages/sdk/js/`

TypeScript SDK，为前端提供类型安全的API客户端。

**SDK架构**：

```typescript
// SDK客户端创建
const client = createOpencodeClient({
  base: "http://localhost:4096",
  auth: credentials
})

// 类型化API调用
const result = await client.session.create({
  model: "claude-3-5-sonnet-20240229",
  messages: [...]
})
```

**核心功能**：

1. **类型定义**：
   - 完整的TypeScript类型
   - 接口和枚举定义
   - 泛型支持

2. **API客户端**：
   - HTTP客户端封装
   - 请求/响应拦截
   - 错误处理

3. **状态同步**：
   - 客户端状态管理
   - 服务器状态同步
   - 冲突解决

4. **错误处理**：
   - 统一的错误类型
   - 用户友好的错误消息
   - 重试机制

---

## 5. 数据流和控制流

### 5.1 用户请求处理流程

**完整流程图**：

```
用户输入命令
      │
      ▼
┌──────────────┐
│ CLI Parser   │
└──────────────┘
      │
      ▼
┌──────────────┐
│ Command      │
│ Router      │
└──────────────┘
      │
      ▼
┌──────────────┐
│ Command      │
│ Handler     │
└──────────────┘
      │
      ▼
┌──────────────┐
│ API Client   │
│ (if remote) │
└──────────────┘
      │
      ▼
┌──────────────┐
│ HTTP Server │
│ Middleware   │
│ Chain       │
└──────────────┘
      │
      ▼
┌──────────────┐
│ Route        │
│ Handler     │
└──────────────┘
      │
      ▼
┌──────────────┐
│ Business    │
│ Logic       │
└──────────────┘
      │
      ▼
┌──────────────┐
│ LLM/Tool    │
│ Provider    │
└──────────────┘
      │
      ▼
┌──────────────┐
│ Response     │
│ Formatter   │
└──────────────┘
      │
      ▼
返回用户结果
```

### 5.2 LLM调用流程

**详细流程**：

```
用户消息
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│                  Agent Selection                │
├─────────────────────────────────────────────────────────┤
│  分析任务类型、用户偏好、历史上下文           │
└─────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│                  Prompt Construction          │
├─────────────────────────────────────────────────────────┤
│  系统提示 + 用户消息 + 上下文 + 历史记录   │
│  模型特定提示注入                            │
└─────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│                  Provider Selection           │
├─────────────────────────────────────────────────────────┤
│  模型ID提供商ID解析                            │
│  Provider抽象加载                               │
│  认证信息获取                                 │
└─────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│                  LLM API Call               │
├─────────────────────────────────────────────────────────┤
│  流式请求发送                                  │
│  工具定义注入                                  │
│  超时和重试配置                                │
└─────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│                  Stream Processing           │
├─────────────────────────────────────────────────────────┤
│  实时响应处理                                  │
│  工具调用检测                                  │
│  内容块传输                                    │
└─────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│                  Tool Execution           │
├─────────────────────────────────────────────────────────┤
│  工具调用调度                                  │
│  参数验证和权限检查                            │
│  执行结果收集                                    │
└─────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│                  Response Aggregation           │
├─────────────────────────────────────────────────────────┤
│  工具结果整合                                  │
│  LLM响应组合                                   │
│  格式化输出                                      │
└─────────────────────────────────────────────────────────┘
                    │
                    ▼
返回给用户
```

### 5.3 工具执行流程

**工具调用机制**：

```
AI决策需要工具
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│              Tool Registry Lookup               │
├─────────────────────────────────────────────────────────┤
│  查找工具定义                                │
│  获取工具接口                                  │
│  加载工具实现                                    │
└─────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│              Permission Check               │
├─────────────────────────────────────────────────────────┤
│  验证代理权限                                │
│  检查工具权限要求                              │
│  用户确认（如需要）                             │
└─────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│              Parameter Validation               │
├─────────────────────────────────────────────────────────┤
│  Zod模式验证                                   │
│  类型检查                                       │
│  约束验证                                       │
└─────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│              Tool Execution               │
├─────────────────────────────────────────────────────────┤
│  执行工具逻辑                                  │
│  超时控制                                      │
│  错误处理和重试                                 │
└─────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│              Result Processing               │
├─────────────────────────────────────────────────────────┤
│  输出格式化                                    │
│  元数据附加                                      │
│  错误转换                                       │
└─────────────────────────────────────────────────────────┘
                    │
                    ▼
返回给AI
```

### 5.4 错误处理流程

**错误分类和处理**：

1. **用户错误**：
   - 输入验证错误
   - 参数错误
   - 权限错误
   - 处理：友好提示 + 重试建议

2. **工具错误**：
   - 工具执行失败
   - 超时错误
   - 文件系统错误
   - 处理：错误重试 + 降级策略

3. **提供商错误**：
   - API限制错误
   - 认证错误
   - 网络错误
   - 处理：自动重试 + 用户通知

4. **系统错误**：
   - 存储错误
   - 配置错误
   - 内部错误
   - 处理：日志记录 + 恢复机制

**错误恢复策略**：

- **重试机制**：指数退避重试
- **降级策略**：功能降级或替代方案
- **状态保存**：保存当前状态便于恢复
- **用户通知**：清晰的错误信息和建议

---

## 6. 插件和扩展机制

### 6.1 工具扩展机制

**扩展方式**：

1. **工具定义**：

   ```typescript
   export const MyTool = Tool.define("my-tool", {
     description: "My custom tool",
     parameters: z.object({
       // 参数定义
     }),
     async execute(args, ctx) {
       // 工具实现
       return {
         title: "My Tool",
         output: "Result",
         metadata: {}
       }
     }
     }
   })
   ```

2. **工具注册**：
   - 自动发现机制
   - 手动注册API
   - 工具元数据声明

3. **工具权限**：
   - 声明所需权限
   - 权限验证集成
   - 细粒度权限控制

### 6.2 技能扩展机制

**扩展方式**：

1. **技能定义**：

   ```typescript
   export const MySkill = {
     id: "my-skill",
     name: "My Skill",
     description: "Custom skill description",
     async execute(input, context) {
       // 技能实现
       const toolResults = await context.tool.execute(...)
       return {
         result: toolResults,
         tools: toolResults.map(r => r.toolCall)
       }
     }
     }
   }
   ```

2. **技能加载**：
   - 目录扫描
   - 技能文件解析
   - 依赖管理

3. **技能执行**：
   - 与工具系统集成
   - 任务编排能力
   - 结果聚合

### 6.3 代理扩展机制

**扩展方式**：

1. **代理定义**：

   ```json
   {
     "name": "custom-agent",
     "description": "Custom agent for specific tasks",
     "mode": "primary",
     "model": {
       "modelID": "claude-3-5-sonnet-20240229",
       "providerID": "anthropic"
     },
     "permission": {
       "write": "allow",
       "network": "allow"
     },
     "options": {
       "custom_option": "value"
     }
   }
   ```

2. **代理配置**：
   - 环境变量配置
   - 配置文件管理
   - 运行时选项

3. **代理集成**：
   - 与工具系统集成
   - 与技能系统集成
   - 自定义逻辑

### 6.4 Provider扩展机制

**扩展方式**：

1. **自定义提供商**：
   - 实现Provider接口
   - 模型定义和配置
   - API适配层

2. **提供商注册**：
   - 提供商发现机制
   - 动态加载支持
   - 配置验证

3. **认证集成**：
   - OAuth支持
   - API密钥管理
   - 自定义认证流程

---

## 7. 部署和基础设施

### 7.1 SST配置

**配置文件**：

- `infra/app.ts`：应用定义和资源
- `infra/stage.ts`：阶段配置
- `infra/enterprise.ts`：企业配置
- `infra/console.ts`：控制台配置
- `infra/secret.ts`：密钥管理

**Cloudflare Workers集成**：

```typescript
// 应用定义
export default {
  config(app) {
    // 配置Cloudflare Workers
    name: "opencode-api"
    region: "auto"

    // 资源定义
    api: {
      name: "opencode-api"
      routes: "./api"
    },

    // 环境变量
    bindings: {
      DATABASE: service
    }
  }
}
```

### 7.2 部署流程

**CI/CD配置**：

- **GitHub Actions**：`.github/workflows/`
  - 自动化测试
  - 构建和部署
  - 多环境支持

**部署策略**：

1. **自动化部署**：
   - 代码推送触发部署
   - PR合并自动部署
   - 环境隔离

2. **环境管理**：
   - 开发环境
   - 预发布环境
   - 生产环境

3. **域名和SSL**：
   - 自动SSL证书
   - 自定义域名支持
   - HTTPS强制

### 7.3 监控和日志

**日志收集**：

1. **结构化日志**：
   - JSON格式日志
   - 日志级别控制
   - 服务标识

2. **集中收集**：
   - Cloudflare日志集成
   - 错误追踪
   - 性能指标

3. **监控指标**：
   - API响应时间
   - 错误率
   - 资源使用情况

### 7.4 Nix支持

**跨平台支持**：

- **Nix包定义**：`nix/opencode.nix`
- **依赖管理**：Nix flakes
- **系统兼容**：Linux、macOS、WSL

---

## 8. 开发指南

### 8.1 环境设置

**环境要求**：

```bash
# 安装依赖
bun install

# 环境变量
export OPENCODE_MODEL="claude-3-5-sonnet-20240229"
export OPENCODE_API_KEY="your-api-key"
export OPENCODE_DISABLE_SHARE="true"
```

**开发工具**：

- **编辑器**：VSCode（推荐）或Neovim
- **Node版本**：Bun 1.3.8+
- **Git**：Git 2.x+
- **系统**：macOS、Linux、Windows（WSL）

### 8.2 构建和测试

**构建命令**：

```bash
# 开发模式
bun run dev

# 类型检查
bun run typecheck

# 构建
bun run build

# 运行测试
bun test

# 运行特定测试
bun test test/session/llm.test.ts
```

**测试策略**：

1. **单元测试**：
   - 核心逻辑测试
   - 工具测试
   - 模块隔离测试

2. **集成测试**：
   - API端点测试
   - 数据流测试
   - 多模块协作测试

3. **端到端测试**：
   - 完整流程测试
   - 用户场景模拟
   - 性能测试

### 8.3 代码风格

**核心原则**（来自AGENTS.md）：

1. **函数设计**：
   - 保持函数单一职责
   - 避免不必要的try/catch
   - 优先函数式编程

2. **命名规范**：
   - 优先单字变量名
   - 避免不必要的多词变量
   - 内联单次使用的变量

3. **类型使用**：
   - 避免any类型
   - 依赖类型推断
   - 仅在必要时显式类型

4. **控制流**：
   - 避免else语句
   - 优先早期返回
   - 使用三元运算符

5. **Drizzle Schema**：
   - 使用snake_case字段名
   - 避免重复定义

### 8.4 贡献流程

**贡献步骤**：

1. **Fork仓库**：

   ```bash
   gh repo fork anomalyco/opencode
   cd opencode
   ```

2. **创建功能分支**：

   ```bash
   git checkout -b feature/my-new-feature
   ```

3. **开发和测试**：
   - 编写代码
   - 添加测试
   - 确保测试通过

4. **提交和推送**：

   ```bash
   git add .
   git commit -m "Add my new feature"
   git push origin feature/my-new-feature
   ```

5. **创建Pull Request**：
   ```bash
   gh pr create --title "My new feature"
   ```

**代码审查要点**：

- 遵循代码风格指南
- 添加适当的测试
- 更新文档
- 保持向后兼容

---

## 附录

### A. 关键文件索引

**CLI系统**：

- `/mnt/c/dev/tmp/opencode/packages/opencode/src/index.ts` - CLI入口
- `/mnt/c/dev/tmp/opencode/packages/opencode/src/cli/cmd/run.ts` - Run命令
- `/mnt/c/dev/tmp/opencode/packages/opencode/src/cli/cmd/serve.ts` - Serve命令
- `/mnt/c/dev/tmp/opencode/packages/opencode/src/cli/cmd/web.ts` - Web命令
- `/mnt/c/dev/tmp/opencode/packages/opencode/src/cli/cmd/auth.ts` - Auth命令
- `/mnt/c/dev/tmp/opencode/packages/opencode/src/cli/cmd/agent.ts` - Agent命令
- `/mnt/c/dev/tmp/opencode/packages/opencode/src/cli/cmd/models.ts` - Models命令
- `/mnt/c/dev/tmp/opencode/packages/opencode/src/cli/cmd/session.ts` - Session命令
- `/mnt/c/dev/tmp/opencode/packages/opencode/src/cli/cmd/cmd.ts` - 命令包装器
- `/mnt/c/dev/tmp/opencode/packages/opencode/src/cli/network.ts` - 网络选项
- `/mnt/c/dev/tmp/opencode/packages/opencode/src/cli/bootstrap.ts` - 生命周期管理

**服务器模块**：

- `/mnt/c/dev/tmp/opencode/packages/opencode/src/server/server.ts` - HTTP服务器
- `/mnt/c/dev/tmp/opencode/packages/opencode/src/server/routes/global.ts` - 全局路由
- `/mnt/c/dev/tmp/opencode/packages/opencode/src/server/routes/project.ts` - 项目路由
- `/mnt/c/dev/tmp/opencode/packages/opencode/src/server/routes/session.ts` - 会话路由
- `/mnt/c/dev/tmp/opencode/packages/opencode/src/server/routes/file.ts` - 文件路由
- `/mnt/c/dev/tmp/opencode/packages/opencode/src/server/routes/pty.ts` - PTY路由
- `/mnt/c/dev/tmp/opencode/packages/opencode/src/server/routes/mcp.ts` - MCP路由
- `/mnt/c/dev/tmp/opencode/packages/opencode/src/server/routes/config.ts` - 配置路由
- `/mnt/c/dev/tmp/opencode/packages/opencode/src/server/routes/experimental.ts` - 实验路由
- `/mnt/c/dev/tmp/opencode/packages/opencode/src/server/routes/provider.ts` - 提供商路由
- `/mnt/c/dev/tmp/opencode/packages/opencode/src/server/routes/question.ts` - 问题路由
- `/mnt/c/dev/tmp/opencode/packages/opencode/src/server/routes/permission.ts` - 权限路由
- `/mnt/c/dev/tmp/opencode/packages/opencode/src/server/routes/tui.ts` - TUI路由

**Session和LLM模块**：

- `/mnt/c/dev/tmp/opencode/packages/opencode/src/session/llm.ts` - LLM客户端
- `/mnt/c/dev/tmp/opencode/packages/opencode/src/session/system.ts` - 系统提示
- `/mnt/c/dev/tmp/opencode/packages/opencode/src/provider/provider.ts` - Provider抽象
- `/mnt/c/dev/tmp/opencode/packages/opencode/src/provider/transform.ts` - Provider转换
- `/mnt/c/dev/tmp/opencode/packages/opencode/src/session/message-v2.ts` - 消息类型

**工具系统**：

- `/mnt/c/dev/tmp/opencode/packages/opencode/src/tool/tool.ts` - 工具接口
- `/mnt/c/dev/tmp/opencode/packages/opencode/src/tool/glob/` - Glob工具
- `/mnt/c/dev/tmp/opencode/packages/opencode/src/tool/grep/` - Grep工具
- `/mnt/c/dev/tmp/opencode/packages/opencode/src/tool/ls/` - List工具
- `/mnt/c/dev/tmp/opencode/packages/opencode/src/tool/read/` - Read工具
- `/mnt/c/dev/tmp/opencode/packages/opencode/src/tool/edit/` - Edit工具
- `/mnt/c/dev/tmp/opencode/packages/opencode/src/tool/write/` - Write工具
- `/mnt/c/dev/tmp/opencode/packages/opencode/src/tool/bash/` - Bash工具
- `/mnt/c/dev/tmp/opencode/packages/opencode/src/tool/skill/` - Skill工具
- `/mnt/c/dev/tmp/opencode/packages/opencode/src/tool/task/` - Task工具
- `/mnt/c/dev/tmp/opencode/packages/opencode/src/tool/todo/` - Todo工具

**代理系统**：

- `/mnt/c/dev/tmp/opencode/packages/opencode/src/agent/agent.ts` - 代理系统

**技能系统**：

- `/mnt/c/dev/tmp/opencode/packages/opencode/src/skill/index.ts` - 技能入口
- `/mnt/c/dev/tmp/opencode/packages/opencode/src/skill/loader.ts` - 技能加载器
- `/mnt/c/dev/tmp/opencode/packages/opencode/src/skill/registry.ts` - 技能注册表

**LSP系统**：

- `/mnt/c/dev/tmp/opencode/packages/opencode/src/lsp/index.ts` - LSP入口
- `/mnt/c/dev/tmp/opencode/packages/opencode/src/lsp/server.ts` - LSP服务器

**存储和认证**：

- `/mnt/c/dev/tmp/opencode/packages/opencode/src/storage/` - 存储模块
- `/mnt/c/dev/tmp/opencode/packages/opencode/src/auth/` - 认证模块

**前端模块**：

- `/mnt/c/dev/tmp/opencode/packages/app/` - Web应用
- `/mnt/c/dev/tmp/opencode/packages/console/` - TUI控制台
- `/mnt/c/dev/tmp/opencode/packages/web/` - Web UI组件
- `/mnt/c/dev/tmp/opencode/packages/desktop/` - 桌面应用
- `/mnt/c/dev/tmp/opencode/packages/sdk/js/` - 前端SDK

**基础设施**：

- `/mnt/c/dev/tmp/opencode/infra/app.ts` - SST应用定义
- `/mnt/c/dev/tmp/opencode/infra/stage.ts` - 阶段配置
- `/mnt/c/dev/tmp/opencode/infra/enterprise.ts` - 企业配置

### B. 技术术语表

| 术语           | 说明                                     |
| -------------- | ---------------------------------------- |
| **Monorepo**   | 单一仓库中管理多个包的项目结构           |
| **Workspaces** | 包管理器中的工作区定义                   |
| **TUI**        | Terminal User Interface，终端用户界面    |
| **LSP**        | Language Server Protocol，语言服务器协议 |
| **Provider**   | AI模型提供商的抽象接口                   |
| **Agent**      | AI代理，负责任务执行和规划               |
| **Skill**      | 技能，将工具组合成更高层次的能力         |
| **Tool**       | 工具，具体的可执行操作                   |
| **SDK**        | Software Development Kit，软件开发工具包 |
| **SST**        | Serverless Stack，无服务器技术栈         |
| **Zod**        | TypeScript-first schema validation库     |
| **Hono**       | 轻量级Web框架                            |
| **SolidJS**    | 响应式JavaScript UI框架                  |
| **Vite**       | 下一代前端构建工具                       |
| **Tauri**      | 跨平台桌面应用框架                       |
| **TurboRepo**  | 高性能Monorepo构建系统                   |

### C. 架构模式总结

**设计模式应用**：

1. **Provider模式**：
   - 统一的LLM提供商抽象
   - 可插拔的提供商系统
   - 配置驱动的模型选择

2. **Strategy模式**：
   - 多种AI代理策略
   - 可配置的执行策略
   - 动态工具选择

3. **Builder模式**：
   - 命令构建器
   - 提示词构建器
   - 工具调用构建器

4. **Observer模式**：
   - 事件总线系统
   - 响应式状态更新
   - 日志和监控

5. **Decorator模式**：
   - 工具能力装饰
   - 中间件链装饰
   - 权限检查装饰

6. **Factory模式**：
   - 工具实例工厂
   - 模型实例工厂
   - 代理实例工厂

---

## 结论

OpenCode项目展现了现代软件架构的最佳实践，通过模块化设计、插件化架构和类型安全的实现，构建了一个灵活、可扩展的AI编程助手系统。

**核心优势**：

1. **高度模块化**：清晰的模块边界和职责分离
2. **可扩展性**：完整的插件系统和扩展机制
3. **类型安全**：全面的TypeScript类型定义和验证
4. **性能优化**：Bun运行时和流式处理
5. **开发体验**：完善的工具链和开发指南

**适用场景**：

- 个人开发者项目
- 团队协作项目
- 企业级应用开发
- AI工具和插件开发
- 前端应用开发

这个架构分析为理解OpenCode项目提供了全面的参考，无论是学习、贡献还是扩展功能，都能找到清晰的指导和实现路径。

---

## 附录 B: PDF转换说明

由于当前环境的限制，无法直接生成PDF文件。以下是几种推荐的PDF转换方案：

### 方法1：在线转换（推荐）

访问 [https://www.markdowntopdf.com/](https://www.markdowntopdf.com/)
1. 点击 "Choose File" 按钮
2. 上传本markdown文档文件
3. 选择输出格式为PDF
4. 点击 "Convert to PDF"
5. 下载生成的PDF文件

这是最可靠和快速的方法，无需安装任何软件。

### 方法2：使用编辑器

如果您使用的编辑器支持markdown导出为PDF：

1. **VS Code**：
   - 安装"Markdown PDF"扩展
   - 打开ARCHITECTURE.md文件
   - 使用命令面板输入"Markdown PDF: Export (preview)"
   - 选择保存位置

2. **Typora**：
   - 打开文档
   - 选择"文件" → "导出为PDF" → "PDF"
   - 选择布局和样式

3. **Sublime Text**：
   - 通过Package Control安装"Markdown Editing"和"Markdown PDF"插件
   - 打开文档
   - 使用"Tools" → "Markdown PDF: Export as PDF"

### 方法3：安装pandoc

如果您的系统支持包管理器，可以安装pandoc：

```bash
# Ubuntu/Debian
sudo apt-get install pandoc

# macOS (使用Homebrew)
brew install pandoc

# Fedora/Arch Linux
sudo dnf install pandoc

# 使用命令转换
pandoc ARCHITECTURE.md -o ARCHITECTURE.pdf --pdf-engine=xelatex -V CJKmainfont="Noto Sans CJK SC" -V CJKsansfont="Noto Sans CJK SC Regular"
```

### 方法4：使用命令行工具

如果您有安装了命令行markdown到PDF工具：

```bash
# 如果有markdown-pdf
markdown-pdf ARCHITECTURE.md -o ARCHITECTURE.pdf

# 如果有wkhtmltopdf
wkhtmltopdf ARCHITECTURE.md -o ARCHITECTURE.pdf

# 如果有prince
prince ARCHITECTURE.md -o ARCHITECTURE.pdf
```

---

**注意**：
- 本文档包含大量代码示例和ASCII流程图，建议使用方法1（在线转换）以获得最佳的PDF渲染效果
- 如果需要经常转换，建议安装pandoc以获得更快的本地转换体验
- 转换后的PDF可能会比较大（约25,000字），因为包含完整的架构文档

---

**文档统计**：
- 总行数：约2,470行
- 章节数：8个主要章节
- 包含内容：项目概述、整体架构、核心模块、前端架构、数据流、插件机制、部署基础设施、开发指南、附录

这份架构文档为理解OpenCode项目提供了全面的技术地图。
