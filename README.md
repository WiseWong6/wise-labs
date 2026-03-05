# terminal-window-tiler

一个为 macOS 终端重度用户准备的窗口分屏工具。  
A macOS terminal window tiler for people who open too many terminal windows.

## 为什么会有这个工具 | Why This Exists

**中文**
- 我在写代码时，习惯是“直接再开一个新终端窗口”，而不是在当前窗口里继续 split pane。
- 有些场景里，Claude Code 在 Ghostty 的体验更顺手，所以会和 iTerm2 / Terminal 混着用。
- 结果就是桌面上会堆出一批独立终端窗口，手动逐个拖拽和排版很蠢、很耗时间。
- 我希望桌面长期保持整齐有序：左边或右边固定给终端，另一侧留给浏览器/微信，不要每次都重新摆。
- 我经常一边做多终端并行测试，一边查资料、同步写文章，窗口不稳定会直接打断节奏。
- 这个工具要解决的不是“单终端内分 pane”，而是“把当前终端窗口一键整理好”。

**English**
- In day-to-day coding, I usually open another terminal window instead of splitting the current one.
- Claude Code also feels better in Ghostty for some workflows, so I end up mixing iTerm2 / Terminal / Ghostty.
- This creates many independent terminal windows, and manual arranging becomes repetitive and wasteful.
- I want the desktop to stay tidy: keep terminal windows in a fixed left/right zone and leave the rest for browser/chat apps.
- I often run multi-terminal testing while researching and drafting articles, so unstable window layouts break focus.
- This tool focuses on one-click window tiling, not in-app pane splitting.

## 典型工作流场景 | Typical Workflows

- `二分屏协作`：左侧 `1/2` 放终端并上下堆叠，右侧固定浏览器或微信。
- `三分区协作`：左侧 `1/3` 放终端，中间浏览器，右侧聊天窗口（浏览器/聊天区由你手动摆放，脚本只管理终端区）。
- `内容与开发并行`：同时开多个终端跑服务/测试，保留可视区域给文档、资料与写作窗口。

## 痛点验证（调研结论）| Pain-Point Validation

**结论（简版）**
- 这个痛点成立：主流“分屏”方案主要覆盖应用内 pane/tab，不覆盖跨终端窗口统一编排。
- 我们用 GPT-5.3 做过一轮调研，在当时范围内没有找到可直接满足该场景的现成方案。
- 所以最后选择自己做一个命令行小工具。

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
- 默认使用系统快捷键触发窗口整理（默认 `ctrl+opt+t`，可手动修改）

## 测试与兼容性 | Tested Compatibility

**已验证（mac）**
- macOS: `26.2` (`25C56`)
- iTerm2: `3.6.8`
- Terminal: `2.15`
- Ghostty: `1.2.3`

**当前结论**
- macOS 场景可用（重点验证了终端窗口分屏流程）。
- 单显示器、单桌面（单 Space）场景最稳定。
- Windows 尚未验证。
- 其他终端（除 iTerm2 / Terminal / Ghostty）暂未验证。

## 安装 | Install

```bash
git clone https://github.com/WiseWong6/terminal-window-tiler.git
cd terminal-window-tiler

mkdir -p ~/.local/bin
cp scripts/terminal-tile-all ~/.local/bin/
cp scripts/terminal-tile-hotkey ~/.local/bin/
cp scripts/zone ~/.local/bin/
chmod +x ~/.local/bin/terminal-tile-all
chmod +x ~/.local/bin/terminal-tile-hotkey
chmod +x ~/.local/bin/zone

# 初始化系统快捷键（首次安装建议执行一次）
~/.local/bin/terminal-tile-hotkey bootstrap
```

## 使用 | Usage

默认使用系统快捷键触发（推荐）：

- 默认绑定：`ctrl+opt+t`
- 若默认键冲突：会在终端提示你输入新的组合（例如 `cmd+shift+t`），也可以输入 `skip` 跳过

系统快捷键管理：

```bash
# 查看快捷键状态
~/.local/bin/terminal-tile-hotkey status

# 手动改键（示例）
~/.local/bin/terminal-tile-hotkey set cmd+shift+t

# 卸载系统快捷键服务
~/.local/bin/terminal-tile-hotkey uninstall
```

调试模式：

```bash
TILE_DEBUG=1 ~/.local/bin/terminal-tile-all
```

性能模式（iTerm2 优先场景，速度更快）：

```bash
TILE_MODE=iterm_fast ~/.local/bin/terminal-tile-all
```

高级分区模式（仅管理终端区，手动命令触发）：

适合你的“终端 + 浏览器/微信”桌面协作流：脚本只整理终端区，其他应用区保持你手动安排的结构（例如二分屏或三分区）。

```bash
# 最短写法
~/.local/bin/terminal-tile-all 左4
~/.local/bin/terminal-tile-all left4
~/.local/bin/zone 左4
~/.local/bin/zone left4

# 短命令写法
~/.local/bin/terminal-tile-all zone 左4
~/.local/bin/terminal-tile-all zone left4

# 中文方向+数字（推荐）
~/.local/bin/terminal-tile-all --分区 左2
~/.local/bin/terminal-tile-all --分区 左3
~/.local/bin/terminal-tile-all --分区 左4

# 同义写法
~/.local/bin/terminal-tile-all --zone 右2
~/.local/bin/terminal-tile-all --zone 右3
~/.local/bin/terminal-tile-all --zone 右4

# 兼容旧写法（仍可用）
~/.local/bin/terminal-tile-all --profile term-left-quarter
```

说明：
- 快捷键行为不变，仍走默认全屏终端整理。
- `--分区/--zone/--profile` 只移动终端窗口（iTerm2 / Terminal / Ghostty），不会移动浏览器、微信等非终端窗口。
- 终端区内：`n <= 6` 时上下堆叠；`n > 6` 时回退为终端区内网格布局。
- 若同时设置 `TILE_MODE=iterm_fast` 与 `--profile`，会优先 `--profile`（自动走 full multi-terminal 模式）。

可选参数：

- `TILE_GAP`（默认 `10`）
- `TILE_MARGIN_TOP`（默认 `6`）
- `TILE_MARGIN_RIGHT`（默认 `8`）
- `TILE_MARGIN_BOTTOM`（默认 `8`）
- `TILE_MARGIN_LEFT`（默认 `8`）
- `TILE_MODE`（`iterm_fast` 为 iTerm2 快速模式）
- `TILE_PROFILE`（与 `--profile` 一致；`--profile` 优先级更高）

## 社媒与公众号 | Socials & WeChat

- 全网账号：`@歪斯Wise`
- 平台：[小红书](https://www.xiaohongshu.com/user/profile/61f3ea4f000000001000db73)/  [Twitter(X)](https://x.com/killthewhys)/ 公众号

扫码关注公众号（@歪斯Wise）：

![公众号歪斯二维码](assets/wechat-wise-qr.jpg)

## 备注 | Notes

- Ghostty 若未参与平铺，先检查：系统设置 -> 隐私与安全性 -> 辅助功能。
- 单显示器多桌面（Spaces）场景下，窗口管理语义会受当前桌面上下文影响，这是 macOS 机制，不是终端脚本单点问题。
- 当前版本在“混用多种终端应用（例如 iTerm2 + Terminal + Ghostty）”场景下仍有边界问题；单一终端应用场景更稳定。
