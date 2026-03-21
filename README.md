<div align="center">

# wise-labs

**A collection of developer tools by [@歪斯Wise](https://x.com/killthewhys)**

一站式开发者工具集合，提升编程与创作效率。

</div>

---

## 仓库说明

`wise-labs` 是一个多项目仓库。每个工具都放在自己的子目录里，安装或启动时要先 `cd` 到对应项目目录，再执行它自己的脚本或 `npm` 命令。

根目录没有统一的 `./scripts/install-agent-commands`。例如 `terminal-tiler` 的安装脚本实际路径是 `terminal-tiler/scripts/install-agent-commands`。

---

## Projects

### [terminal-tiler](./terminal-tiler)

> macOS 终端窗口一键平铺工具

- 一键整理 2~10 个终端窗口，按显示器分组平铺
- 支持左/右分区模式，给浏览器、微信或文档留固定区域
- 分区热键会弹出原生 macOS 风格选择器，直接选 `zl2` 到 `zr4`
- 支持 iTerm2 / Terminal / Ghostty，可在 Claude Code / Codex / OpenClaw 中直接使用

```bash
cd terminal-tiler
./scripts/install-agent-commands
```

### [mixed-preview](./mixed-preview)

> 实时混合内容编辑器

- 在同一个编辑器里混排 Markdown、HTML、JSON、Mermaid
- 右侧实时预览，自动识别内容类型
- Mermaid 支持导出 SVG / PNG
- 内置示例内容和 AI 修复入口，适合写文档、方案和演示稿

```bash
cd mixed-preview
npm install
npm run dev
```

### [openclaw_game](./openclaw_game)

> OpenClaw agent / sub-agent 可视化项目

- 可视化展示 OpenClaw agent、常驻 agent 和 sub-agent run
- 支持 demo 模式和 live 模式
- 读取本机 OpenClaw 数据目录，展示真实 session 和事件流
- 适合调试 agent 编排、观察任务生命周期

```bash
cd openclaw_game
npm install
npm start
```

---

## 社交媒体

<div align="center">
  <p>全网同名：<code>@歪斯Wise</code></p>
  <p>
    <a href="https://www.xiaohongshu.com/user/profile/61f3ea4f000000001000db73">小红书</a> /
    <a href="https://x.com/killthewhys">Twitter(X)</a> /
    扫码关注公众号
  </p>
  <img src="terminal-tiler/assets/wechat-wise-qr.jpg" alt="公众号歪斯二维码" width="220" />
</div>

---

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=WiseWong6/wise-labs&type=Date)](https://www.star-history.com/#WiseWong6/wise-labs&Date)
