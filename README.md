# Wise Labs 🧪

<p align="center">
  <strong>面向 AI 工作流的开发者工具集</strong>
</p>

<p align="center">
  一系列提升 AI 开发效率的实验性工具 —— 从窗口管理到 Agent 可视化
</p>

---

## 这是什么

Wise Labs 是一个面向 AI 时代开发者的工作台。它包含多个独立但互补的工具，覆盖终端管理和 Agent 调试等场景。

每个项目都可以独立使用，组合起来则构成一套完整的 AI 开发辅助工具链。

---

## 项目地图

```
┌──────────────────────────────────────────────────────────────┐
│                        Wise Labs                             │
├─────────────┬─────────────┬──────────────────────────────────┤
│       窗口管理        │              Agent 可视化              │
├───────────────────────┼──────────────────────────────────────┤
│     ai-workstation    │            openclaw_game              │
├───────────────────────┴──────────────────────────────────────┤
│                        工具定位                               │
│              整理窗口 → 看 Agent 运行                         │
└──────────────────────────────────────────────────────────────┘
```

---

## 项目一览

### 🖥️ [ai-workstation](./ai-workstation)

> AI Workstation / AI工位分配 —— 一键安排散乱的终端窗口

**核心功能**
- ⌨️ 快捷键一键整理 2~10 个终端窗口
- 🖥️ 支持全屏/分区两种模式
- 🔧 支持 iTerm2 / Terminal / Ghostty 混用
- 🎯 专为 Claude Code / Codex / OpenClaw 工作流设计
- ⚡ 支持 Agent 直接调用 (`/tile` 命令)

**Tech Stack:** Swift, AppleScript, Shell

**[查看详情 →](./ai-workstation)**

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
cd ai-workstation / openclaw_game

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

所有工具都考虑 AI Agent 的使用场景。ai-workstation 支持 Agent 直接调用，openclaw_game 用于可视化 Agent 运行。

**本地优先**

工具尽量在本地运行，不依赖云端服务。你的数据留在你的机器上。

---

## 社交媒体

<div align="center">
  <p>全网同名：<code>@歪斯Wise</code></p>
  <p>
    <a href="https://github.com/WiseWong6/wise-labs">GitHub Star</a> /
    <a href="https://www.xiaohongshu.com/user/profile/61f3ea4f000000001000db73">小红书</a> /
    <a href="https://x.com/killthewhys">Twitter(X)</a> /
    扫码关注公众号
  </p>
  <img src="./assets/wechat-wise-qr.jpg" alt="公众号歪斯二维码" width="220" />
</div>

---

## Star History

<a href="https://www.star-history.com/#WiseWong6/wise-labs&Date">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/chart?repos=WiseWong6/wise-labs&type=date&theme=dark" />
    <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/chart?repos=WiseWong6/wise-labs&type=date" />
    <img alt="Star History Chart" src="https://api.star-history.com/chart?repos=WiseWong6/wise-labs&type=date" />
  </picture>
</a>

---

## License

MIT License - 详见 [LICENSE](./LICENSE) 文件
