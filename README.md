# Wise Labs 🧪

<p align="center">
  <strong>面向 AI 工作流的开发者工具集</strong>
</p>

<p align="center">
  一系列提升 AI 开发效率的实验性工具 —— 从模型评测到窗口管理，从内容预览到 Agent 可视化
</p>

---

## 这是什么

Wise Labs 是一个面向 AI 时代开发者的工作台。它包含 5 个独立但互补的工具，覆盖模型评测、内容编辑、终端管理和 Agent 调试等场景。

每个项目都可以独立使用，组合起来则构成一套完整的 AI 开发辅助工具链。

---

## 项目地图

```
┌─────────────────────────────────────────────────────────────────┐
│                        Wise Labs                                │
├─────────────┬─────────────┬─────────────┬─────────────────────┤
│   模型评测   │  内容编辑   │  窗口管理    │    Agent 可视化      │
├─────────────┼─────────────┼─────────────┼─────────────────────┤
│ model-eval  │  mixed-     │  terminal-  │   openclaw_game     │
│ -workbench  │   preview   │   -tiler    │                     │
├─────────────┴─────────────┴─────────────┴─────────────────────┤
│                         工具定位                               │
│  选模型 → 写内容 → 整理窗口 → 看 Agent 运行                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 项目一览

### 🧪 [model-eval-workbench](./model-eval-workbench)

> AI 模型评测工作台 —— 多模型 Prompt 对比测试工具

**核心功能**
- 🔄 多模型并排对比（Gemini、OpenAI、Claude 等）
- 📄 PDF 文档 OCR 评测与对比
- 📝 Markdown 实时渲染与对比
- 💬 Prompt 管理与历史记录
- ⚡ 实时流式响应展示

**Tech Stack:** React 18, TypeScript, Vite, TailwindCSS, @google/genai

**[查看详情 →](./model-eval-workbench)**

---

### 🖥️ [terminal-tiler](./terminal-tiler)

> macOS 终端窗口平铺工具 —— 一键整理散乱的终端窗口

**核心功能**
- ⌨️ 快捷键一键整理 2~10 个终端窗口
- 🖥️ 支持全屏/分区两种模式
- 🔧 支持 iTerm2 / Terminal / Ghostty 混用
- 🎯 专为 Claude Code / Codex / OpenClaw 工作流设计
- ⚡ 支持 Agent 直接调用 (`/tile` 命令)

**Tech Stack:** Swift, AppleScript, Shell

**[查看详情 →](./terminal-tiler)**

---

### 📝 [mixed-preview](./mixed-preview)

> 混合内容实时预览 —— 一个编辑器搞定 Markdown、Mermaid、JSON、HTML

**核心功能**
- 🔄 实时预览，600ms 防抖
- 🎯 自动检测内容类型（Markdown / Mermaid / JSON / HTML）
- 📊 Mermaid 图表导出 SVG / PNG（2500px 高清）
- 🔒 HTML 在 iframe 沙盒中渲染
- 🤖 AI 辅助修复语法错误

**Tech Stack:** React 19, Vite, Mermaid, react-markdown, Tailwind CSS

**[查看详情 →](./mixed-preview)**

---

### 🎮 [openclaw_game](./openclaw_game)

> OpenClaw Agent 可视化看板 —— 实时观察多 Agent 协作运行

**核心功能**
- 👁️ 可视化主 Agent、常驻 Agent 和临时 Sub-agent 状态
- 📊 实时事件流与生命周期追踪
- 🔄 Demo / Live 双模式（开箱即用或连接真实数据）
- 🏗️ 动态舞台渲染（不再写死工位数量）
- 📡 SSE 实时数据推送

**Tech Stack:** Node.js, Express, better-sqlite3, Vanilla JS

**[查看详情 →](./openclaw_game)**

---

### 📦 wise-labs (本仓库)

> 工具集的入口与导航 —— 你正在这里

这个仓库本身也是一个"项目"，作为整个 Wise Labs 的入口和导航中心。

---

## 快速开始

每个项目都是自包含的，可以独立克隆和运行：

```bash
# 克隆整个仓库
git clone https://github.com/WiseWong6/wise-labs.git
cd wise-labs

# 进入任意项目
cd model-eval-workbench    # 或 terminal-tiler / mixed-preview / openclaw_game

# 安装依赖并运行
npm install
npm run dev
```

每个子目录都有自己的 README，包含详细的安装和使用说明。

---

## 设计哲学

**单一职责，组合使用**

每个工具解决一个具体问题，不追求大而全。你可以只使用其中一个，也可以组合使用形成工作流。

**AI 优先**

所有工具都考虑 AI Agent 的使用场景。terminal-tiler 支持 Agent 直接调用，model-eval-workbench 用于评测模型能力，openclaw_game 用于可视化 Agent 运行。

**本地优先**

工具尽量在本地运行，不依赖云端服务。你的数据留在你的机器上。

---

## 社交媒体

<div align="center">
  <p><strong>全网同名：<code>@歪斯Wise</code></strong></p>
  <p>
    <a href="https://www.xiaohongshu.com/user/profile/61f3ea4f000000001000db73">小红书</a> •
    <a href="https://x.com/killthewhys">Twitter(X)</a> •
    <a href="https://github.com/WiseWong6">GitHub</a>
  </p>
</div>

---

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=WiseWong6/wise-labs&type=Date)](https://www.star-history.com/#WiseWong6/wise-labs&Date)

---

## License

MIT License - 详见 [LICENSE](./LICENSE) 文件
