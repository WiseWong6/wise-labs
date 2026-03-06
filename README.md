# terminal-window-tiler

> 把散落的终端窗口一键摆好，不打断你的节奏。
>
> One keystroke to tidy up your scattered terminal windows.

---

## 这解决的是什么问题 | What Problem This Solves

**如果你也这样工作**

写代码时，你的习惯是「再开一个新窗口」，而不是在当前终端里继续切分。Claude Code 在 Ghostty 里用着顺手，有些任务又离不开 iTerm2。结果就是桌面上堆出一批独立的终端窗口，像随手摊开的草稿纸。

然后你切到浏览器查文档、回微信、切回来——窗口乱了。手动拖拽调整？可以，但每次都要打断思路。

**如果你也这样工作 | If this sounds familiar**

You open another terminal window instead of splitting the current one. Claude Code feels right in Ghostty, but some tasks keep you in iTerm2. Over time, your desktop accumulates independent terminal windows like scattered scratch paper.

Then you switch to the browser, check WeChat, come back—and the layout is a mess. Dragging windows around works, but it breaks your flow every single time.

---

## 为什么现有方案还没完全解决 | Why Existing Tools Fall Short

| 方案 | 擅长什么 | 为什么还不够 | 这个工具补哪一段 |
|------|---------|-------------|-----------------|
| **tmux** | session 管理、pane 分割、远程保持 | 需要记一套快捷键和状态机；对本地多终端混用场景（Ghostty + iTerm2）无能为力 | 不替代 tmux，解决「本地多独立窗口」的排版 |
| **iTerm2 Split Panes** | 单窗口内 pane 切分 | 只能在现有窗口内继续切，不是跨窗口编排；[Arrangements](https://iterm2.com/documentation-arrangements.html) 是固定模板恢复，不是动态整理 |
| **iTerm2 Tiling** | — | [官方 issue #9561](https://gitlab.com/gnachman/iterm2/-/issues/9561) 显示用户确实需要真正的窗口 tiling，但目前未内置 |
| **手动拖拽 / 通用窗口管理** | 完全可控 | 最原始也最打断节奏，尤其在多终端并行、切显示器、切工作流时 | 一键完成，不离开键盘 |

**Sources**

- tmux 的 `split-window` 是 session/window 内 pane 操作：[man page](https://man7.org/linux/man-pages/man1/tmux.1.html)
- iTerm2 文档核心是 split panes 与 window arrangement：[split panes](https://iterm2.com/documentation-split-panes.html)、[arrangements](https://iterm2.com/documentation-arrangements.html)
- 多终端窗口排布是真实存在的痛点，社区用 AppleScript/Automator 自行解决：[示例](https://cybercafe.dev/arrange-multiple-terminal-windows-using-applescript-and-automator/)

---

## 这个工具的边界 | What This Tool Does (and Doesn't)

**它做**
- 检测当前所有 iTerm2 / Terminal / Ghostty 窗口
- 按显示器分组，一键平铺到固定布局（2~10 窗口）
- 可选「分区模式」：只管理屏幕左侧或右侧的终端区，留另一半给浏览器/微信
- 用系统快捷键触发（默认 `ctrl+opt+t`）

**它不做**
- 不是 pane 管理器（不替代 tmux/Zellij 的 split）
- 不是窗口管理器（不管其他应用窗口）
- 不支持远程/SSH 场景（本地 macOS only）

**It does**
- Detect all iTerm2 / Terminal / Ghostty windows
- Group by display, tile into fixed layouts (2–10 windows)
- Optional "zone mode": manage only left/right terminal zone, leave the other half for browser/chat
- Trigger via system hotkey (default `ctrl+opt+t`)

**It doesn't**
- Replace pane managers (not a tmux/Zellij alternative)
- Manage non-terminal windows
- Work over SSH (local macOS only)

---

## 典型使用场景 | Typical Workflows

**二分屏协作 | Split-screen workflow**
- 左侧 1/2：终端上下堆叠，跑服务/测试/Claude Code
- 右侧：浏览器或微信，固定不动

**三分区协作 | Three-zone workflow**
- 左侧 1/3：终端区（脚本管理）
- 中间：浏览器
- 右侧：聊天窗口

**内容并行 | Content + development**
- 多终端跑并行任务
- 保留可视区域给文档、资料、写作窗口

---

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

---

## 使用 | Usage

### 快捷键触发（推荐）

- 默认绑定：`ctrl+opt+t`
- 若冲突：终端会提示输入新组合（如 `cmd+shift+t`），或输入 `skip` 跳过

```bash
# 查看快捷键状态
terminal-tile-hotkey status

# 手动改键
terminal-tile-hotkey set cmd+shift+t

# 卸载快捷键服务
terminal-tile-hotkey uninstall
```

### 分区模式 | Zone Mode

适合「终端 + 浏览器/微信」桌面协作流：脚本只整理终端区，其他应用保持你手动安排的结构。

```bash
# 最短写法
zone 左4
zone left4

# 中文方向+数字
terminal-tile-all --分区 左2
terminal-tile-all --分区 左3
terminal-tile-all --分区 右4

# 英文写法
terminal-tile-all --zone right2
terminal-tile-all --zone right3

# 兼容旧写法
terminal-tile-all --profile term-left-quarter
```

说明：
- 快捷键行为不变，仍走默认全屏终端整理
- `--分区/--zone/--profile` 只移动终端窗口，不会移动浏览器、微信等非终端窗口
- 终端区内：`n <= 6` 时上下堆叠；`n > 6` 时回退为网格布局

### 高级参数

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `TILE_GAP` | `10` | 窗口间距 |
| `TILE_MARGIN_TOP` | `6` | 上边缘留白 |
| `TILE_MARGIN_RIGHT` | `8` | 右边缘留白 |
| `TILE_MARGIN_BOTTOM` | `8` | 下边缘留白 |
| `TILE_MARGIN_LEFT` | `8` | 左边缘留白 |
| `TILE_MODE` | — | 设 `iterm_fast` 启用 iTerm2 快速模式 |
| `TILE_PROFILE` | — | 等价于 `--profile`，命令行参数优先级更高 |

```bash
# 调试模式
TILE_DEBUG=1 terminal-tile-all

# iTerm2 快速模式（纯 iTerm2 场景速度更快）
TILE_MODE=iterm_fast terminal-tile-all

# 同时设置模式和分区（分区优先，自动走 full multi-terminal 模式）
TILE_MODE=iterm_fast terminal-tile-all --zone 左4
```

---

## 布局矩阵 | Layout Policy

| 窗口数 | 布局 |
|--------|------|
| 2 | 2×1 |
| 3 | 3×1 |
| 4 | 2×2 |
| 5–6 | 3×2 |
| 7–8 | 4×2 |
| 9 | 3×3 |
| 10 | 4×3 |

分区模式下（`--zone`），`n <= 6` 时采用上下堆叠（1 列 n 行）；`n > 6` 时回退为上述网格布局。

---

## 测试与兼容性 | Tested Compatibility

**已验证（macOS）**
- macOS: `26.2` (`25C56`)
- iTerm2: `3.6.8`
- Terminal: `2.15`
- Ghostty: `1.2.3`

**当前结论**
- macOS 场景可用（重点验证了终端窗口分屏流程）
- 单显示器、单桌面（单 Space）场景最稳定
- Windows 尚未验证
- 其他终端（除 iTerm2 / Terminal / Ghostty）暂未验证

**Ghostty 权限说明**

Ghostty 依赖辅助功能权限才能被脚本控制。若 Ghostty 窗口未被平铺：
- 系统设置 → 隐私与安全性 → 辅助功能 → 添加 Ghostty

---

## 社媒与公众号 | Socials & WeChat

- 全网账号：`@歪斯Wise`
- 平台：[小红书](https://www.xiaohongshu.com/user/profile/61f3ea4f000000001000db73) / [Twitter(X)](https://x.com/killthewhys) / 公众号

![公众号歪斯二维码](assets/wechat-wise-qr.jpg)
