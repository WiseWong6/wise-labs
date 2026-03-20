# Agent 可视化 PRD & 实施计划 (星露谷风)

## 1. 产品概述
**目标：** 创建一个极简的 Web 可视化工具（单页面 HTML 工具），作为 openclaw-office 的轻量级伴生视图。
**核心理念：** 采用“星露谷级别”的纯像素风格，将不同的 AI Agent 通道呈现为屏幕上独立的像素小人。通过监听真实的 Server-Sent Events (SSE) 事件流，实时驱动角色的状态切换（待机/工作/反馈）和动漫风气泡文本。

## 2. 核心功能 (V1 PRD)

### 2.1 角色与通道映射 (基于 Sprite)
不再使用简单的 Emoji，而是使用真正的像素精灵图（参考 `openclawd_office/public/agent_sprites.png`）实现角色。
- **配置 (3 个角色)：**
  1. **Main (主节点)**
  2. **TUI/Web (终端/网页前端通道)**
  3. **Feishu (飞书通道)**

### 2.2 真实数据源驱动与行为映射
- **数据流对接：** 建立 `EventSource` 监听真实的 `http://127.0.0.1:3100/stream?roomId=room-42` 事件流。
- **事件解析：** 解析返回的 OpenClaw JSON 事件（如 `task.started`, `tool.called`, `task.completed`）。
- **状态映射：**
  1. **Idle (待机)：** 最近无事件时，播放待机/睡觉像素动画。
  2. **Listening/Working (工作)：** 接收到 `task.started` 或 `tool.called` 时，播放工作动画，头上可冒出对应小图标（如 🧠 思考或 👂 倾听）。
  3. **Speaking (输出)：** 结合动漫风气泡展示任务进展或反馈。

### 2.3 自动滚动动漫气泡 (Anime-Style Chat Bubbles)
- **视觉：** 悬浮在像素角色头上的像素风或毛玻璃对话气泡。
- **机制：** 当接从 SSE 收到新事件或 message（如 `summary` 字段）时，将文本推入气泡。
- **动画：** 气泡内文字进行平滑的上卷切换效果（类似滚动的弹幕或短文本队列），呈现简要的流式过程（例："OpenClaw starts retrieval"）。

## 3. 设计风格与技术栈
- **架构：** 极简的“单文件应用”或“三件套 (HTML+CSS+JS)”形态，方便插拔。
- **样式：** Modern Pixel Art（星露谷风）。可以配以简单的等距视角像素地板背景，角色在上面排布。CSS 负责 Sprite sheet step 动画。
- **无须后端：** 本项目自身无需任何 Node.js 后端，完全前端跨域读取用户本地启动的 openclawd_office 后端。

## 4. 实施清单

### [NEW] `index.html`
界面骨架、引入样式和脚本。
### [NEW] `styles.css`
- 像素字体的引入。
- 气泡对话框的现代及像素混合风格（圆角、阴影）。
- **Sprite 动画**：使用 `steps()` 实现角色的 sprite 帧播放类（`idle`, `work`）。
### [NEW] `app.js`
- `new EventSource("http://127.0.0.1:3100/stream?...&channel=...")`
- 按 `event.channel` 将事件分发给 3 个角色。
- 管理状态机的超时切换（例如 5 秒无新事件则回退 idle 状态）。
- 控制 DOM 渲染，更新气泡内的滚动队列。
### [NEW] 静态资产 (`assets/`)
- 复制/复用 `agent_sprites.png` 以及背景图（如果有）。

## 5. 验证计划
1. 要求用户本地开启 `openclawd_office`（如 `npm run dev -- --port 3100`）。
2. 在浏览器中打开我们做好的 `index.html`。
3. 观察 SSE 连接建立。触发一次实际 Agent 任务（或执行 seed.js 发送 mock）。
4. 验证各个通道的像素小人能根据事件做出反应，气泡文本正确滚动。
