# OpenClaw Game

<p align="center">
  <a href="./README.md">中文</a> | <a href="./README.en.md">English</a>
</p>

> OpenClaw Agent 可视化看板 —— 实时观察多 Agent 协作运行状态
>
> 把黑盒的 Agent 执行过程变成可视化的舞台，一眼看清谁在做什么

---

## 它有什么用 | At a Glance

- 👁️ **可视化 Agent 运行** —— 主 Agent、常驻 Agent、临时 Sub-agent 状态一目了然
- 📊 **实时事件流** —— SSE 推送的实时事件，追踪每个 Agent 的生命周期
- 🔄 **Demo / Live 双模式** —— 开箱即用体验，或连接真实 OpenClaw 数据
- 🏗️ **动态舞台渲染** —— 不再写死工位数量，按实际数据动态展示
- 📡 **Session 归一化** —— 支持 `agent:<agentId>:subagent:<uuid>` 等复杂 Session Key

---

## 快速开始 | Quick Start

```bash
git clone https://github.com/WiseWong6/wise-labs.git
cd wise-labs/openclaw_game

npm install
npm start

# 打开 http://127.0.0.1:3101
```

默认是 `auto` 模式：
- 如果检测到有效的 `~/.openclaw/openclaw.json`，自动进入 live 模式
- 否则自动回退到 demo 模式

---

## 它解决了什么问题

**如果你也这样工作**

你在使用 OpenClaw 或类似的多 Agent 系统。主 Agent 派发任务给常驻 Agent，常驻 Agent 又 spawn 出临时 Sub-agent 来并行处理子任务。

问题来了：这些 Agent 什么时候启动的？什么时候结束的？哪个 Sub-agent 属于哪个父 Agent？它们分别在执行什么任务？

看日志？日志是线性的，但 Agent 执行是并行的。你很难从日志中还原出完整的执行图景。

想调试一个复杂的 Agent 协作流程，却像是在盲人摸象。

---

## 为什么现有方案还没完全解决

| 方案 | 擅长什么 | 为什么还不够 | 这个工具补哪一段 |
|------|---------|-------------|-----------------|
| **命令行日志输出** | 信息完整、可搜索 | 线性输出无法展示并行关系，大量日志难以快速定位关键信息 | 可视化并行执行，一眼看清谁在做什么 |
| **日志文件查看器** | 大文件处理、过滤搜索 | 仍然是线性展示，无法体现 Agent 之间的层级和协作关系 | 按 Agent 层级组织展示，追踪父子关系 |
| **分布式追踪系统** | 微服务调用链路追踪 | 需要额外部署，配置复杂，不适合本地开发调试 | 开箱即用，零配置启动 |
| **LLM 平台自带监控** | 与平台深度集成 | 只支持特定平台，无法自定义 | 开源、可连接任意 OpenClaw 兼容数据 |

---

## 运行模式

### 1. Demo 模式

```bash
npm run start:demo
```

适合第一次体验项目，不依赖本地 OpenClaw。内置样例数据展示：
- 主 Agent 派发任务
- 常驻 Agent 持续运行
- 临时 Sub-agent 生命周期演示

### 2. Live 模式

```bash
OPENCLAWD_OPENCLAW_HOME="$HOME/.openclaw" npm run start:live
```

读取本机 OpenClaw 数据目录，展示真实的 Session、事件流和 Agent 生命周期。

如果你的 OpenClaw 数据目录不在默认位置，可以显式指定：

```bash
OPENCLAWD_DATA_MODE=live OPENCLAWD_OPENCLAW_HOME="/path/to/.openclaw" npm start
```

---

## 功能详解

### 动态舞台

- 不再写死 6 个工位
- 按数据动态渲染常驻 Agent 与临时 Sub-agent
- Agent 卡片显示状态、当前任务、运行时长

### 事件流

- 实时 SSE 推送
- 支持事件过滤和搜索
- 按时间线或按 Agent 分组查看

### Sub-agent 生命周期

- Demo 模式下会回放一段完整的 Sub-agent 生命周期
- 验证动态舞台渲染和事件流展示
- 适合演示和开发调试

---

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `OPENCLAWD_DATA_MODE` | `auto` | `auto` / `demo` / `live` |
| `OPENCLAWD_OPENCLAW_HOME` | `~/.openclaw` | OpenClaw 数据目录路径 |
| `OPENCLAWD_ADMIN_TOKEN` | — | 管理员 Token |
| `OPENCLAWD_READONLY_TOKEN` | — | 只读 Token |
| `PORT` | `3101` | 服务器端口 |

---

## 这个工具的边界

**它做**
- 可视化展示 OpenClaw Agent 运行状态
- 实时事件流追踪
- Demo 模式用于体验和演示
- Live 模式连接真实 OpenClaw 数据

**它不做**
- 不是 OpenClaw 的控制台（不能启动/停止 Agent）
- 不存储历史数据（仅展示实时/当前状态）
- 不是通用的日志可视化工具（针对 OpenClaw 数据格式优化）
- 不替代 OpenClaw 本身的调试功能

---

## 技术栈

| 依赖 | 用途 |
|------|------|
| Node.js | 运行时 |
| Express | Web 服务器 |
| better-sqlite3 | 本地数据存储 |
| marked | Markdown 渲染 |
| Vanilla JS | 前端（无框架，轻量） |
| SSE | 服务端推送 |

---

## 开发

```bash
npm install          # 安装依赖
npm start            # 启动服务器（auto 模式）
npm run dev          # 开发模式（文件变更自动重启）
npm run start:demo   # Demo 模式
npm run start:live   # Live 模式
```

---

## 与 OpenClaw 的关系

OpenClaw Game 是 OpenClaw 的可视化看板，但不是 OpenClaw 的一部分：

- OpenClaw 是 Agent 框架，负责运行 Agent
- OpenClaw Game 是可视化工具，负责展示 OpenClaw 的运行状态
- OpenClaw Game 可以独立运行，通过读取 OpenClaw 的数据目录来展示状态

---

## 社交媒体

<div align="center">
  <p>全网同名：<code>@歪斯Wise</code></p>
  <p>
    <a href="https://www.xiaohongshu.com/user/profile/61f3ea4f000000001000db73">小红书</a> /
    <a href="https://x.com/killthewhys">Twitter(X)</a> /
    <a href="https://github.com/WiseWong6">GitHub</a>
  </p>
</div>

---

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=WiseWong6/wise-labs&type=Date)](https://www.star-history.com/#WiseWong6/wise-labs&Date)

---

## License

MIT License
