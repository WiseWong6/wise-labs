# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

OpenClaw Game 是一个独立的单页面 Web 应用，用于实时可视化 OpenClaw Agent 的运行状态。采用像素艺术风格（星露谷海滩风格），通过 SSE 事件流和 API 轮询驱动界面更新。

**V4.1 特性：**
- 🏢 多 Agent 办公室布局（6 个工位）
- 🦞 海滩主题背景 + 像素龙虾
- 🎮 统一 1.5x 像素高清精灵
- ✨ 玻璃拟态 UI + 动态 SVG 连线
- 🔄 自动显隐子 Agent 机制
- 🚀 初始化 Loading 遮罩动画

**核心功能：**
- 像素角色动画（基于 Sprite Sheet）
- 实时对话气泡
- 聊天日志面板（左右对齐区分用户和 Agent）
- 多通道可视化（TUI/Web, Feishu, Cron, Heartbeat）

## 运行方式

```bash
# 安装依赖
npm install

# 启动服务器
npm start

# 访问
open http://127.0.0.1:3101/
```

**调试模式：** 在浏览器控制台中可以使用：
```javascript
// 手动触发测试事件
debugTriggerEvent('feishu', '测试消息', 'task.started')
```

## 项目结构

```
openclaw_game/
├── index.html              # 前端入口：海滩背景、星露谷角色布局
├── app.js                  # 前端逻辑：SSE 连接、状态管理、龙虾动画
├── styles.css              # 海滩主题样式、Sprite 动画、玻璃拟态效果
├── assets/                 # 静态资源（Sprite 图等）
├── server/                 # 后端服务
│   ├── index.js            # Express 服务器
│   ├── db.js               # SQLite 封装
│   ├── eventHub.js         # 事件分发
│   ├── roomAuth.js         # Token 验证
│   ├── hub.js              # EventEmitter
│   ├── systemListener.js   # OpenClaw 监听
│   └── sessionRegistry.js  # 从 sessions.json 解析 canonical session/channel
├── openclawd.db            # SQLite 数据库
├── package.json            # Node 依赖
├── PROGRESS.md             # 开发进度记录
├── CLAUDE.md               # 本文件
└── LICENSE                 # MIT 协议
```

## 架构设计

### V4 新架构

**简化状态管理**：
```javascript
// 状态由 CSS 类控制，应用于 .sdv-character 或 .agent-station
sdv-idle, sdv-receiving, sdv-thinking, sdv-speaking
sdv-tool_calling, sdv-tool_waiting, sdv-processing
sdv-error, sdv-task_start, sdv-task_complete, sdv-heartbeat, sdv-done

// 动态子 Agent 显隐
agent-appear (动画类)
```

**缩放与清晰度规则**：
- 全局使用 `image-rendering: pixelated`。
- 角色统一缩放为 `scale(1.5)`，在 `.sdv-model` 层级实现，确保边框对齐且无抖动。
- 动画 Keyframes 必须同步使用 `scale(1.5)` 保持一致性。

**核心函数**：
- `updateAgentState(state, message)` - 更新 Agent 状态和 UI
- `showAgentSpeech(text) / hideAgentSpeech()` - 控制语音气泡
- `setupLobster()` - 初始化龙虾随机移动动画

### 双轨数据监听策略

项目采用两种数据源并行工作：

1. **SSE 事件流** (`setupEventStream`)
   - URL: `http://127.0.0.1:3101/api/rooms/room-42/stream`
   - 用途：实时系统事件（动效触发、状态切换）
   - 事件类型：`task.started`, `tool.called`, `task.completed` 等

2. **历史轮询** (`pollSessionHistory`)
   - URL: `http://127.0.0.1:3101/api/sessions/latest`
   - 用途：从 JSONL 文件获取完整对话历史
   - 频率：每 2 秒轮询一次

3. **Canonical Session 解析**
   - 数据源：`~/.openclaw/agents/main/sessions/sessions.json`
   - 用途：将 `sessionId` 精确映射回 OpenClaw 原生 `sessionKey`
   - 结果：统一得到 `tui / feishu / cron / heartbeat`

### 状态机

Agent 状态转换逻辑（`updateAgentState`）：

```
idle (默认) → receiving → thinking → speaking → done
                               ↓
                          tool_calling → tool_waiting
                               ↓
                          processing → error
```

- **idle**: 30秒无事件后自动进入
- **receiving**: 用户输入
- **thinking**: AI 思考中
- **speaking**: Agent 输出反馈
- **tool_calling/waiting**: 工具调用流程
- **done/error**: 任务完成或失败

### 龙虾动画

随机移动逻辑（`setupLobster`）：
```javascript
// 每 4 秒随机移动一次
- X: 随机 50px ~ (window.innerWidth / 3 + 50px)
- Y: 随机屏幕下半部分 (50% ~ 90%)
- 旋转: 0 ~ 360 度
```

### 通道识别

UI 和后端现在都跟随 OpenClaw 原生 `sessionKey` 做渠道归类，而不是猜第一条消息内容。

Canonical 映射规则：
- `agent:main:tui-*` → `tui`
- `agent:main:direct:*` / `agent:main:feishu:direct:*` → `feishu`
- `agent:main:cron:*` / `:run:*` → `cron`
- `agent:main:main` → `heartbeat`

### 办公室布局系统

- **Office Floor**: 6个工位固定坐标，包含地毯、机柜等装饰逻辑。
- **SVG 连接线**: 通过像素坐标动态连接活跃 Agent 与主 Agent，支持流动动画。
- **角色状态机**: `updateAgentState(state, agentId)`，支持指定 Agent 更新。
- **模型解耦**: `.sdv-model` 承载动画，`.desk` 保持静止。
- **极简桌面设计**: 移除所有显示器装饰，保持工作位视觉统一；角色腿部在 z-space 上隐藏于桌面后方。

## API 端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/rooms/:roomId/stream` | GET | SSE 事件流 |
| `/api/rooms/:roomId/history` | GET | 房间历史事件 |
| `/api/sessions/list` | GET | Session 列表（含 canonical channel / sessionKey） |
| `/api/sessions/latest` | GET | Session JSONL 数据，支持 `session` / `channel` 参数 |
| `/` | GET | 前端页面 |

## 关键文件

| 文件 | 用途 |
|------|------|
| `app.js` | 主应用逻辑：SSE 连接、状态管理、DOM 更新、龙虾动画 |
| `styles.css` | 海滩主题、像素风格、玻璃拟态、动画效果 |
| `index.html` | 页面结构：海滩背景、角色容器、聊天面板、龙虾 SVG |
| `assets/agent_sprites.png` | 角色精灵图（待机/工作状态） |

## UI 布局结构

```
┌─────────────────────────────────────────────────────────┐
│  Beach Background (Ocean + Sand)                        │
│  ┌─────────────────────────────────────────────────┐    │
│  │ Header: OpenClaw Core + Connection Status       │    │
│  ├─────────────────────────────┬───────────────────┤    │
│  │                             │                   │    │
│  │  Left Channel (TUI/Web)     │   Chat Log Panel  │    │
│  │        ↕                    │   (Glass Effect)  │    │
│  │  [Stardew Valley Agent]     │                   │    │
│  │        ↕                    │   - Filter Toggle │    │
│  │  Right Channel (Feishu)     │   - Expand JSON   │    │
│  │                             │   - Copy Button   │    │
│  ├─────────────────────────────┴───────────────────┤    │
│  │ User Input Area (bottom, glass effect)          │    │
│  └─────────────────────────────────────────────────┘    │
│  🦞 Lobster (randomly moving on beach)                  │
└─────────────────────────────────────────────────────────┘
```

## 样式系统

### CSS 变量
```css
:root {
  --bg-dark: #1c1917;        /* 深色背景 */
  --bg-stone: #292524;       /* 石质背景 */
  --accent-emerald: #10b981; /* 翡翠绿强调 */
  --accent-amber: #f59e0b;   /* 琥珀黄 */
  --accent-rose: #f43f5e;    /* 玫瑰红 */
  --glass-bg: rgba(28, 25, 23, 0.8);  /* 玻璃背景 */
  --glass-border: rgba(255, 255, 255, 0.1); /* 玻璃边框 */
}
```

### 海滩背景
```css
.beach-ocean { height: 40%; background: linear-gradient(to bottom, #7dd3fc, #60a5fa); }
.beach-sand  { background: linear-gradient(to bottom, #fde68a, #d4b483); }
```

## 数据清洗逻辑

用户输入消息需要清理系统噪声（`cleanUserInput`）：

```javascript
// 移除 "[feishu]" "[tui]" "[web]" 前缀
text.replace(/\[(feishu|tui|web)\]/ig, '').trim()

// 移除系统元数据头
text.replace(/Sender \(untrusted metadata\)[\s\S]*?\]\s*/g, '').trim()
```

## 开发注意事项

### 修改 API 端点

在 `app.js` 顶部的 `CONFIG` 对象中修改：

```javascript
const CONFIG = {
    STREAM_URL: '/api/rooms/room-42/stream?token=admin-demo-token',
    IDLE_TIMEOUT_MS: 30000,
    LOBSTER_MOVE_INTERVAL: 4000
};
```

### 添加新状态

1. 在 `styles.css` 中添加 `.sdv-newstate` 类
2. 在 `updateAgentState()` 中处理新状态
3. 更新 `setupStateToggles()` 中的状态切换按钮

### 修改龙虾行为

编辑 `setupLobster()` 函数：
```javascript
function setupLobster() {
    const container = document.getElementById('lobster-container');
    const move = () => {
        // 自定义移动逻辑
        const x = ...;
        const y = ...;
        container.style.transform = `translate(${x}px, ${y}px)`;
    };
    setInterval(move, 自定义间隔);
}
```

### 聊天日志限制

默认保留最近 50 条日志（在 `addLogEntry` 中控制）：

```javascript
while (logContainer.children.length > 50) {
    logContainer.removeChild(logContainer.firstChild);
}
```

### Channel / Session 联动

- `channel-selector` 选中某个 channel 后，会自动筛出该 channel 的 sessions
- 若该 channel 下存在 session，会自动选中最新一条并刷新历史面板
- 当前支持筛选：`tui`、`feishu`、`cron`、`heartbeat`

## 设计决策

### 为什么使用海滩主题？

- 🦞 龙虾是 OpenClaw 的吉祥物
- 🏖️ 海滩氛围轻松有趣，适合长时间监控
- 🎮 星露谷风格契合像素艺术理念
- ✨ 玻璃拟态现代且优雅

### 为什么简化状态机？

- 减少复杂度，更易维护
- CSS 类驱动状态，性能更好
- 30秒空闲超时更符合实际使用

### 为什么保留双轨监听？

- SSE 提供实时性，用于触发视觉效果
- JSONL 轮询提供完整数据，确保内容不截断
- 两者结合确保既实时又完整
