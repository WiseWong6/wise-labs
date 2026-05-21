# Mira Open

<p align="center">
  <a href="./README.md">中文</a> | <a href="./README.en.md">English</a>
</p>

> A basic preview workspace between agent generation and human delivery.
>
> Put Markdown, JSON, Mermaid, HTML, and mixed AI output into one place so you can inspect it clearly.
>
> This is not the full delivery editor. It is the open preview build of Mira: useful, runnable, and directionally honest without exposing delivery-grade capabilities.

## At a Glance

- Preview Markdown, JSON / JSON5, Mermaid, HTML iframes, and mixed documents
- Auto-detect common AI output formats without jumping between separate tools
- Format JSON and copy the formatted result
- Render Mermaid diagrams with zoom plus SVG / PNG download
- Preview complete HTML documents or fragments inside an isolated iframe
- Keep source copy in the editor and basic HTML export in the preview
- Run locally for developer verification of agent output

## Quick Start

This is a sub-project inside the `wise-labs` repository. If you are at the repository root, enter `mira-open` first.

```bash
git clone https://github.com/WiseWong6/wise-labs.git
cd wise-labs/mira-open

npm install
npm run dev
```

Useful verification commands:

```bash
npm run lint
npm test
npm run build
```

---

## What Problem It Solves

**If you also work with agent output like this**

You ask an AI agent for a proposal, a flowchart, a JSON config, or an HTML prototype. The result is often not a single clean format. It may be a Markdown explanation mixed with Mermaid diagrams, JSON data, code blocks, and HTML fragments.

You can view pieces of that output in an IDE, Mermaid Live, a JSON formatter, a browser, or a Markdown previewer. But reviewing the whole artifact means constantly switching contexts.

Mira Open handles this step: **after the agent generates, before the human delivers, make the artifact readable first.**

---

## Why Existing Tools Are Not Enough

| Tool | Good At | Why It Falls Short | What Mira Open Adds |
|------|---------|--------------------|---------------------|
| **IDE / Agent IDE** | Coding, running projects, basic Markdown preview | Not focused on reviewing mixed AI artifacts as deliverables | A focused preview workspace for agent output |
| **Mermaid Live** | Mermaid diagram preview | Only handles diagrams, not the surrounding document | View diagrams inside the document context |
| **JSON Formatter** | JSON formatting | Only handles structured data | Review JSON together with prose, diagrams, and HTML |
| **Browser** | HTML preview | Does not understand Markdown, JSON, or Mermaid output | Treat HTML as one block inside a mixed artifact |
| **Markdown Editor** | Writing long-form documents | Limited support for full HTML, complex Mermaid, and mixed AI output | Optimized for agent artifacts rather than general writing |

---

## Supported Content

### Markdown

Supports common Markdown, GFM tables, task lists, code blocks, and basic typography. Useful for reviewing agent-written notes, proposals, and prompt outputs.

### JSON

Supports JSON / JSON5 parsing and formatting. Useful for checking generated configs, structured data, schema drafts, and API examples.

### Mermaid

Supports basic Mermaid rendering, zoom, SVG download, and PNG download. Useful for reviewing flowcharts, architecture diagrams, sequence diagrams, and simple charts.

### HTML

Complete HTML documents or fragments render inside a sandboxed iframe so user styles do not leak into the outer UI. The open build keeps basic HTML export, without promising high-fidelity delivery output.

### Mixed Content

A Markdown document can contain JSON, Mermaid, and HTML fragments together. Mira Open tries to render them in one preview surface.

---

## Usage

### Start Locally

```bash
cd wise-labs/mira-open
npm install
npm run dev
```

Open the local URL reported by Vite, usually:

```text
http://127.0.0.1:3000/
```

### Basic Workflow

- Paste agent output into the editor on the left
- Review the auto-detected preview on the right
- Use the sample menu to switch built-in examples
- Copy formatted JSON when reviewing JSON content
- Download Mermaid diagrams as SVG / PNG
- Export the current preview as a basic HTML file

---

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Lint
npm run lint

# Test
npm test

# Production build
npm run build
```

## Project Layout

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

## Star / Follow

<div align="center">
  <p>
    If Mira Open is useful to you, please consider starring
    <a href="https://github.com/WiseWong6/wise-labs">wise-labs</a>.
  </p>
  <p>
    <a href="https://github.com/WiseWong6/wise-labs">GitHub Star</a> /
    <a href="https://www.xiaohongshu.com/user/profile/61f3ea4f000000001000db73">Xiaohongshu</a> /
    <a href="https://x.com/killthewhys">Twitter(X)</a> /
    scan the QR code to follow the WeChat official account
  </p>
  <img src="./public/qrcode.jpg" alt="Wise WeChat QR code" width="220" />
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
