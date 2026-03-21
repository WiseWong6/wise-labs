# Model Evaluation Workbench

<p align="center">
  <a href="./README.md">中文</a> | <a href="./README.en.md">English</a>
</p>

> AI 模型评测工作台 —— 在同一界面并排对比多个 LLM 的回复质量
>
> 支持 OCR 评测、Prompt 对比、Markdown 渲染，帮你选出最适合的模型

---

## 它有什么用 | At a Glance

- 🔄 **多模型并排对比** —— 同一 Prompt 同时发给 Gemini、OpenAI、Claude 等，直观对比回复差异
- 📄 **PDF OCR 评测** —— 上传扫描文档，对比不同模型的 OCR 识别准确率
- 📝 **Markdown 实时渲染** —— 支持表格、公式、代码块等复杂格式的渲染对比
- 💬 **Prompt 管理与历史** —— 保存常用 Prompt，快速切换对比
- ⚡ **实时流式响应** —— 模型回复实时展示，不用等完整输出

---

## 快速开始 | Quick Start

```bash
git clone https://github.com/WiseWong6/wise-labs.git
cd wise-labs/model-eval-workbench

npm install
npm run dev

# 打开 http://localhost:5173
```

首次使用需要配置 API Key（点击右上角设置图标）：
- 支持 OpenAI、Google Gemini、Anthropic Claude 等主流模型
- API Key 仅存储在本地，不会发送到任何服务器

---

## 它解决了什么问题

**如果你也这样工作**

你在选一个模型来做项目，或者在评估新出的模型是否值得接入。于是你打开 ChatGPT、Claude、Gemini 三个网页，把同一个 Prompt 分别贴进去，然后在三个标签页之间来回切换对比。

你想比较它们对同一份 PDF 的 OCR 识别效果，需要分别上传、分别记录结果、再手动对齐对比。

你写了一组测试 Prompt，想系统性地对比几个模型的表现，结果发现没有趁手的工具。

---

## 为什么现有方案还没完全解决

| 方案 | 擅长什么 | 为什么还不够 | 这个工具补哪一段 |
|------|---------|-------------|-----------------|
| **ChatGPT / Claude 官网** | 单模型对话体验好 | 只能一次看一个模型的回复，无法并排对比 | 同时展示多个模型的回复，支持左右/网格布局对比 |
| **LMSYS Chatbot Arena** | 匿名盲测、众包评测 | 无法控制测试集，不能评测自己的私有文档 | 用自己的 Prompt、自己的 PDF 做定向评测 |
| **Vercel AI SDK Playground** | 技术原型快速验证 | 面向开发者，需要写代码配置 | 开箱即用，配置 API Key 即可开始评测 |
| **人工对比** | 完全可控 | 最准确也最耗时，不适合批量评测 | 自动化批量对比，结果可复现 |

---

## 功能详解

### 双模式工作区

**Prompt 对比模式**
- 输入 Prompt，同时发送给多个模型
- 支持流式响应，实时看到每个模型的思考过程
- 支持重新生成、复制、导出对比结果

**OCR 评测模式**
- 上传 PDF 或图片（PNG/JPG）
- 选择页码范围（全部/单页/自定义范围）
- 对比不同模型的 OCR 识别结果
- 支持数学公式、表格等复杂排版

### 支持的模型

| 提供商 | 模型 |
|--------|------|
| Google | Gemini 2.5 Pro/Flash, Gemini 1.5 Pro/Flash |
| OpenAI | GPT-4o, GPT-4o-mini, GPT-4-turbo |
| Anthropic | Claude 3.5 Sonnet, Claude 3 Opus |

（通过配置兼容 OpenAI API 格式的服务商也可以接入）

---

## 这个工具的边界

**它做**
- 多模型回复的并排对比展示
- PDF/图片的 OCR 能力评测
- Prompt 历史管理和快速复用
- Markdown 和 LaTeX 公式渲染

**它不做**
- 不替代模型官方 Playground 的深度调试功能
- 不做模型训练或微调
- 不做自动化评测打分（依赖人工判断）
- 不是生产环境的模型网关

---

## 技术栈

| 依赖 | 用途 |
|------|------|
| React 18 | UI 框架 |
| TypeScript | 类型安全 |
| Vite | 构建工具 |
| TailwindCSS | 样式系统 |
| @google/genai | Gemini API 客户端 |
| react-pdf / pdfjs-dist | PDF 渲染与处理 |
| remark-gfm / rehype-raw / rehype-katex | Markdown 渲染增强 |

---

## 开发

```bash
npm install          # 安装依赖
npm run dev          # 启动开发服务器 (http://localhost:5173)
npm run build        # 生产构建
npm run preview      # 预览生产构建
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
