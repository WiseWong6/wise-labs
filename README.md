# terminal-window-tiler

一个为 macOS 终端重度用户准备的窗口分屏工具。  
A macOS terminal window tiler for people who open too many terminal windows.

## 为什么会有这个工具 | Why This Exists

**中文**
- 常见“分屏插件”大多解决的是**单个终端内部**（pane/tab）布局，不解决“我习惯开很多独立窗口”的问题。
- 真实使用中常见混合：iTerm2 + Terminal + Ghostty 同时开。
- 需求不是“在某个终端里分 pane”，而是“把当前所有终端窗口快速排整齐”。
- 目标是：一条命令，立即整理窗口，减少手动拖拽和排版成本。

**English**
- Most popular “split” tools optimize layouts **inside one terminal app** (panes/tabs), not many independent windows.
- Real workflows are often mixed: iTerm2 + Terminal + Ghostty together.
- The requirement is not “split panes in one app”, but “quickly tile all terminal windows on screen(s)”.
- Goal: one command, instant layout, less manual dragging.

## 痛点验证（调研结论）| Pain-Point Validation

**结论（简版）**
- 你的痛点成立：主流终端分屏能力确实主要是“应用内分屏”。
- 跨终端类型、跨应用统一平铺，通常需要额外脚本或窗口管理器，不是默认能力。

**依据（公开文档）**
1. tmux 的 `split-window` 是 session/window 内 pane 操作。  
   Source: https://man7.org/linux/man-pages/man1/tmux.1.html
2. Zellij 的 `new-pane` / `move-focus` 同样是应用内 pane 模型。  
   Source: https://zellij.dev/documentation/cli-actions.html
3. iTerm2 文档核心是 split panes 与 window arrangement（固定模板恢复），并非跨终端统一编排。  
   Sources:  
   - https://iterm2.com/documentation-split-panes.html  
   - https://iterm2.com/documentation-arrangements.html
4. macOS Spaces 本身会影响窗口可见与管理语义（同一显示器多桌面是独立上下文）。  
   Source: https://support.apple.com/guide/mac-help/work-in-multiple-spaces-mh14112/mac

## 特性 | Features

- 按显示器分组平铺（per-display grouping）
- 固定布局策略（2~10 窗口）
  - 2 -> 2x1
  - 3 -> 3x1
  - 4 -> 2x2
  - 5 -> 3x2
  - 6 -> 3x2
  - 7 -> 4x2
  - 8 -> 4x2
  - 9 -> 3x3
  - 10 -> 4x3
- 支持 iTerm2 / Terminal / Ghostty（Ghostty 依赖辅助功能权限）

## 安装 | Install

```bash
git clone https://github.com/WiseWong6/terminal-window-tiler.git
cd terminal-window-tiler

mkdir -p ~/.local/bin
cp scripts/terminal-tile-all ~/.local/bin/
chmod +x ~/.local/bin/terminal-tile-all

# 推荐：中文主命令 + 英文短命令
echo "alias 分屏='~/.local/bin/terminal-tile-all'" >> ~/.zshrc
echo "alias tile='~/.local/bin/terminal-tile-all'" >> ~/.zshrc
source ~/.zshrc
```

## 使用 | Usage

```bash
分屏
# or
tile
```

调试模式：

```bash
TILE_DEBUG=1 分屏
```

可选参数：

- `TILE_GAP`（默认 `10`）
- `TILE_MARGIN_TOP`（默认 `6`）
- `TILE_MARGIN_RIGHT`（默认 `8`）
- `TILE_MARGIN_BOTTOM`（默认 `8`）
- `TILE_MARGIN_LEFT`（默认 `8`）

## 社媒与公众号 | Socials & WeChat

- 全网账号：`@歪斯Wise`
- 平台：小红书 / Twitter(X) / 公众号
- 公众号：**歪斯**
- 小红书：<https://www.xiaohongshu.com/user/profile/61f3ea4f000000001000db73>
- x：[x](https://x.com/killthewhys)

扫码关注公众号（歪斯）：

![公众号歪斯二维码](assets/wechat-wise-qr.jpg)

## 备注 | Notes

- Ghostty 若未参与平铺，先检查：系统设置 -> 隐私与安全性 -> 辅助功能。
- 单显示器多桌面（Spaces）场景下，窗口管理语义会受当前桌面上下文影响，这是 macOS 机制，不是终端脚本单点问题。
