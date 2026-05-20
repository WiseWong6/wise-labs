# Mira Open

<p align="center">
  <a href="./README.md">中文</a> | <a href="./README.en.md">English</a>
</p>

> Agent 生成之后，人类交付之前的基础预览工作台。
>
> 把 AI 输出里的 Markdown、JSON、Mermaid、HTML 和混合内容放到同一个编辑器里看清楚。
>
> 它不是完整交付编辑器，而是 Mira 的开源预览版：可信、可运行、能说明方向，但不暴露交付级能力。

## 它有什么用 | At a Glance

- 预览 Markdown、JSON / JSON5、Mermaid、HTML iframe 和混合文档
- 自动识别常见 AI 输出格式，不用在多个工具之间来回切
- JSON 支持格式化和复制格式化结果
- Mermaid 支持基础渲染、缩放、SVG 下载和 PNG 下载
- HTML 文档或片段在 iframe 沙盒中预览
- 编辑区保留源码复制，预览区保留基础 HTML 导出
- 本地运行，适合开发者验证 Agent 输出

## 快速开始 | Quick Start

这是 `wise-labs` 仓库里的一个子项目。如果你现在人在仓库根目录，先执行 `cd mira-open`。

```bash
git clone https://github.com/WiseWong6/wise-labs.git
cd wise-labs/mira-open

npm install
npm run dev
```

常用验证命令：

```bash
npm run lint
npm test
npm run build
```

---

## 它解决了什么问题

**如果你也这样使用 Agent**

你让 AI 写一份方案、一个流程图、一段 JSON 配置、一个 HTML 原型，结果通常不是一个干净的单一格式。它可能是一段 Markdown 说明，中间夹着 Mermaid 图、JSON 数据、代码块和 HTML 片段。

这时你要么在 IDE 里凑合看，要么打开 Mermaid Live、JSON Formatter、浏览器、Markdown 预览器来回切。看一眼可以，但要审核内容是否正确、结构是否完整、图表是否渲染正常，就会被格式切换打断。

Mira Open 解决的是这一步：**Agent 输出之后，先让人类看清楚。**

---

## 为什么现有方案还没完全解决

| 方案 | 擅长什么 | 为什么还不够 | Mira Open 补哪一段 |
|------|---------|-------------|-------------------|
| **IDE / Agent IDE** | 写代码、运行项目、基础 Markdown 预览 | 不适合把混合内容当作“产物”来集中审核 | 把 Agent 输出集中放进一个预览工作台 |
| **Mermaid Live** | Mermaid 图预览 | 只能处理图，不能承载完整上下文 | 在文档上下文里看 Mermaid |
| **JSON Formatter** | JSON 格式化 | 只处理结构化数据 | 和说明文字、图表、HTML 一起看 |
| **浏览器** | HTML 预览 | 不理解 Markdown、JSON、Mermaid 混合输出 | HTML 只是 Mira Open 的其中一种内容块 |
| **Markdown 编辑器** | 长文写作 | 对完整 HTML、复杂 Mermaid 和混合内容支持有限 | 面向 Agent 产物，而不是通用写作 |

---

## 支持的内容

### Markdown

支持常见 Markdown、GFM 表格、任务列表、代码块和基础排版。适合快速查看 Agent 输出的说明文档、方案草稿和提示词结果。

### JSON

支持 JSON / JSON5 解析与格式化。适合检查 Agent 生成的配置、结构化数据、Schema 草稿和接口示例。

### Mermaid

支持基础 Mermaid 渲染、缩放、SVG 下载和 PNG 下载。适合审核流程图、架构图、时序图和简单图表。

### HTML

完整 HTML 文档或片段会在 iframe 沙盒中预览，避免样式污染外层界面。Open 版保留基础 HTML 导出，但不承诺高保真交付效果。

### 混合内容

Markdown 文档中可以同时包含 JSON、Mermaid 和 HTML 片段。Mira Open 会尽量把它们放在同一个预览区里呈现。

---

## 使用方式

### 本地启动

```bash
cd wise-labs/mira-open
npm install
npm run dev
```

打开 Vite 给出的本地地址，默认通常是：

```text
http://127.0.0.1:3000/
```

### 基础操作

- 左侧编辑区粘贴 Agent 输出
- 右侧预览区自动识别并渲染内容
- 点击「案例」切换内置示例
- JSON 内容可复制格式化结果
- Mermaid 图可下载 SVG / PNG
- 当前内容可导出为基础 HTML 文件

---

## 开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 代码检查
npm run lint

# 测试
npm test

# 生产构建
npm run build
```

## 项目结构

```text
.
├── App.tsx
├── components/
│   ├── ArtifactPreview.tsx
│   ├── Editor.tsx
│   └── AboutModal.tsx
├── utils/
├── index.html
├── index.css
└── package.json
```

---

## Star / 关注

<div align="center">
  <p>
    如果 Mira Open 对你有用，欢迎给
    <a href="https://github.com/WiseWong6/wise-labs">wise-labs</a>
    点个 Star。
  </p>
  <p>
    <a href="https://github.com/WiseWong6/wise-labs">GitHub Star</a> /
    <a href="https://www.xiaohongshu.com/user/profile/61f3ea4f000000001000db73">小红书</a> /
    <a href="https://x.com/killthewhys">Twitter(X)</a> /
    扫码关注公众号
  </p>
  <img src="./public/qrcode.jpg" alt="公众号歪斯二维码" width="220" />
</div>
