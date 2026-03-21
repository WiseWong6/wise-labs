# Mixed Preview

<p align="center">
  <a href="./README.md">中文</a> | <a href="./README.en.md">English</a>
</p>

> 一个实时混合内容编辑器 —— 在同一个编辑器里写 Markdown、Mermaid、JSON、HTML
>
> 右边立刻看到渲染结果，不用在四个工具之间来回切换

---

## 预览

左侧写内容，右侧实时渲染：

```
┌──────────────────────────────────────────────────────┐
│  Mixed Preview                [samples]  ⚙  ☰       │
├──────────────┬───────────────────────────────────────┤
│              │                                       │
│   Editor     │   Preview                             │
│              │                                       │
│  # Hello     │   Hello                               │
│  ```mermaid  │   ┌───┐    ┌───┐                      │
│  graph LR    │   │ A │───→│ B │                      │
│    A --> B   │   └───┘    └───┘                      │
│  ```         │                                       │
│              │                                       │
│  ```json     │   ┌─────────────────┐                 │
│  {"a": 1}    │   │ { "a": 1 }     │                 │
│  ```         │   └─────────────────┘                 │
│              │                                       │
└──────────────┴───────────────────────────────────────┘
```

---

## 它有什么用 | At a Glance

- ⚡ **输入即预览**，600ms 防抖，不会卡
- 🎯 **自动检测内容类型** —— 纯 JSON 直接贴进去能渲染，纯 Mermaid 语法也行
- 📊 **Mermaid 图表导出** SVG / PNG（PNG 自动放大到 2500px 宽，白底）
- 🔒 **HTML 沙盒渲染** —— 完整 HTML 文档在 iframe 中渲染，带样式隔离
- 🎨 **内置 6 个示例** —— Mixed / Markdown / HTML / JSON / Flowchart / Sequence 一键切换
- 🤖 **AI 修复** —— 写错了让 AI 帮你修，支持自定义 API 提供商

---

## 快速开始 | Quick Start

```bash
git clone https://github.com/WiseWong6/wise-labs.git
cd wise-labs/mixed-preview

npm install
npm run dev
# → http://localhost:3000
```

---

## 它解决了什么问题

**如果你也这样工作**

写技术文档的时候，内容经常是混合的：一段 Markdown 说明、一个 JSON 配置示例、一张 Mermaid 流程图、再加几行 HTML 做特殊排版。

现有的工具要么只支持 Markdown（Typora、StackEdit），要么只做 Mermaid（mermaid.live），要么只做 JSON（jsoneditor）。结果就是同一份文档要在三四个窗口之间来回切换预览。

而且每次切到 mermaid.live 画个图，还得手动把代码复制回文档里。

---

## 为什么现有方案还没完全解决

| 方案 | 擅长什么 | 为什么还不够 | 这个工具补哪一段 |
|------|---------|-------------|-----------------|
| **mermaid.live** | Mermaid 图表预览和导出 | 只做 Mermaid，不支持 Markdown 混排 | 在同一个编辑器里同时写文字和画图 |
| **Typora / StackEdit** | Markdown 实时预览 | 对 Mermaid 支持有限，不渲染 JSON，不支持完整 HTML 文档 | 一个编辑器搞定所有内容类型 |
| **CodePen / JSFiddle** | HTML/CSS/JS 在线预览 | 面向前端开发，不是文档编辑器 | 为文档写作场景优化 |
| **VS Code 预览** | Markdown 预览 | 需要装插件才支持 Mermaid，JSON 和 HTML 要分别用不同的预览方式 | 开箱即用，自动检测内容类型 |

---

## 支持的内容类型

### Markdown

完整支持 GFM（GitHub Flavored Markdown）：表格、任务列表、删除线、代码高亮。原生 HTML 标签也可以直接混在 Markdown 里写。

### Mermaid

支持所有主流图表类型：

| 类型 | 关键词 |
|------|--------|
| 流程图 | `graph` / `flowchart` |
| 时序图 | `sequenceDiagram` |
| 类图 | `classDiagram` |
| 状态图 | `stateDiagram` |
| ER 图 | `erDiagram` |
| 甘特图 | `gantt` |
| 饼图 | `pie` |
| 用户旅程 | `journey` |
| 思维导图 | `mindmap` |
| 时间线 | `timeline` |
| Git 图 | `gitGraph` |

每张图表上方有 SVG 和 PNG 导出按钮。PNG 导出自动缩放到高分辨率，白色背景，可以直接贴到文档或 PPT 里。

### JSON

支持 JSON5 语法（允许注释、尾随逗号、单引号）。输入后自动格式化并高亮显示。

### HTML

检测到完整 HTML 文档（以 `<!DOCTYPE html>` 或 `<html` 开头）时，在 iframe 沙盒中渲染，带完整样式支持。

---

## AI 修复

当预览出现语法错误时，编辑器会显示错误信息和「Fix with AI」按钮。点击后会把当前代码和错误信息发给你配置的 AI 提供商，返回修复后的代码。

点击右上角齿轮图标配置 AI：

| 提供商类型 | 支持的服务 |
|-----------|-----------|
| OpenAI 兼容 | OpenAI、DeepSeek、Gemini、Groq、Ollama |
| Anthropic | Claude API |

配置存在 localStorage，不会发送到任何服务器。API 请求直接从浏览器发出。

---

## 这个工具的边界

**它做**
- 一个编辑器里混合写 Markdown、HTML、JSON、Mermaid，实时预览
- 自动检测内容类型，不需要手动指定
- 高分辨率图表导出（SVG / PNG）
- 可选的 AI 辅助修复

**它不做**
- 不是协作编辑器（没有多人实时协作）
- 不是文件管理器（只有一个编辑区，不管理多个文件）
- 不做持久化存储（内容在页面刷新后会重置为示例）
- 不是 IDE（没有文件树、终端、Git 集成）

---

## 技术栈

| 依赖 | 用途 |
|------|------|
| React 19 | UI 框架 |
| Vite | 构建工具 |
| Tailwind CSS | 样式（CDN 加载） |
| mermaid | 图表渲染 |
| react-markdown + remark-gfm + rehype-raw | Markdown 渲染 |
| react-syntax-highlighter | 代码高亮 |
| json5 | 宽松 JSON 解析 |
| lucide-react | 图标 |

---

## 开发

```bash
npm install          # 安装依赖
npm run dev          # 启动开发服务器 (http://localhost:3000)
npm run build        # 生产构建
npm run preview      # 预览生产构建
npm run lint         # ESLint 检查
npm run format       # Prettier 格式化
```

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
