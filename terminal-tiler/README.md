# wise-terminal-tiler

<p align="center">
  <a href="./README.md">中文</a> | <a href="./README.en.md">English</a> | <a href="./AGENTS.md">Agent / AI</a>
</p>

> 一个面向 macOS 的终端窗口平铺小工具。
>
> 用一个快捷键，把散乱的多个终端窗口整理成清晰可用的工作区。
>
> 专门为多终端、多显示器、键盘优先的工作流设计。
>
> 最重要的是让你在 claude code、codex、openclaw 里面都能直接整理窗口，虽说依赖于模型响应速度

## 一键整理
![Full-screen tiling demo](./assets/demo-fullscreen.gif)

## 分区模式
![Zone mode demo](./assets/demo-zone.gif)

## 它有什么用 | At a Glance

- 一键整理 2~10 个终端窗口，按显示器分组平铺
- 额外支持分区模式，给浏览器/微信留出固定区域
- 默认只整理当前终端 app；可选开启跨终端模式
- 支持 iTerm2 / Terminal / Ghostty 混用（跨终端模式）
- 推荐给偏爱独立窗口而不是 pane 的用户

## 快速开始 | Quick Start

```bash
git clone https://github.com/WiseWong6/wise-terminal-tiler.git
cd wise-terminal-tiler

mkdir -p ~/.local/bin
./scripts/install-agent-commands
```

---

## 它解决了什么问题

**如果你也这样工作**

习惯于屏幕的左边或者右边是终端窗口，另一部分是你的浏览器、或者聊天窗口。
或者写代码时，你的习惯是「再开一个新窗口」，而不是在当前终端里继续切分。Claude Code 在 Ghostty 里用着顺手，有些任务又离不开 iTerm2。结果就是桌面上堆出一批独立的终端窗口，像随手摊开的草稿纸。

然后你切到浏览器查文档、回微信、切回来——窗口乱了。手动拖拽调整？可以，但每次都要打断思路。

而且厌倦了，每次拔插显示屏的连接线，终端窗口就全乱了。
---

## 为什么现有方案还没完全解决

| 方案 | 擅长什么 | 为什么还不够 | 这个工具补哪一段 |
|------|---------|-------------|-----------------|
| **tmux** | session 管理、pane 分割、远程保持 | 需要记一套快捷键和状态机；对本地多终端混用场景（Ghostty + iTerm2）无能为力 | 不替代 tmux，解决「本地多独立窗口」的排版 |
| **iTerm2 Split Panes** | 单窗口内 pane 切分 | 只能在现有窗口内继续切，不是跨窗口编排；[Arrangements](https://iterm2.com/documentation-arrangements.html) 是固定模板恢复，不是动态整理 |
| **iTerm2 Tiling** | — | [官方 issue #9561](https://gitlab.com/gnachman/iterm2/-/issues/9561) 显示用户确实需要真正的窗口 tiling，但目前未内置 |
| **手动拖拽 / 通用窗口管理** | 完全可控 | 最原始也最打断节奏，尤其在多终端并行、切显示器、切工作流时 | 一键完成，不离开键盘 |

不支持在claude code、codex、openclaw 这些模式里输入指令整理窗口。

**Sources**

- tmux 的 `split-window` 是 session/window 内 pane 操作：[man page](https://man7.org/linux/man-pages/man1/tmux.1.html)
- iTerm2 文档核心是 split panes 与 window arrangement：[split panes](https://iterm2.com/documentation-split-panes.html)、[arrangements](https://iterm2.com/documentation-arrangements.html)
- 多终端窗口排布是真实存在的痛点，社区用 AppleScript/Automator 自行解决：[示例](https://cybercafe.dev/arrange-multiple-terminal-windows-using-applescript-and-automator/)

---

## 这个工具的边界

**它做**
- 默认检测当前终端 app 的窗口（更快，适合 90% 场景）
- 可选开启跨终端模式，同时检测 iTerm2 / Terminal / Ghostty
- 按显示器分组，一键平铺到固定布局（2~10 窗口）
- 可选「分区模式」：只管理屏幕左侧或右侧的终端区，留另一半给浏览器/微信
- 用系统快捷键触发（默认 `ctrl+command+t`，zone 选择器默认 `ctrl+command+shift+t`）

**它不做**
- 不是 pane 管理器（不替代 tmux/Zellij 的 split）
- 不是窗口管理器（不管其他应用窗口）
- 不支持远程/SSH 场景（仅面向 MacBook / macOS 本地使用）
- 不支持 Windows 或其他非 macOS 平台

---

## 典型使用场景

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

## 安装

仅适用于 macOS / MacBook 工作流；如果你主要在 Windows 上使用终端，这个项目还不具备这个能力，当然你可以去改造这份代码。

```bash
git clone https://github.com/WiseWong6/wise-terminal-tiler.git
cd wise-terminal-tiler

mkdir -p ~/.local/bin
./scripts/install-agent-commands
```

---

## 使用

### 快捷键触发（推荐）

- 默认绑定：`ctrl+command+t`
- Zone 选择器默认绑定：`ctrl+command+shift+t`
- 若冲突：终端会提示输入新组合（如 `cmd+shift+t`），或输入 `skip` 跳过
- 若安装阶段无法绑定 zone 快捷键，脚本会明确提示修复命令，不再静默跳过

```bash
# 查看快捷键状态
terminal-tile-hotkey status
terminal-tile-hotkey zone-status

# 手动改键
terminal-tile-hotkey set cmd+shift+t
terminal-tile-hotkey zone-set ctrl+command+shift+t

# 卸载快捷键服务
terminal-tile-hotkey uninstall
terminal-tile-hotkey zone-uninstall
```

说明：
- `ctrl+command+t` 直接执行默认全屏整理
- `ctrl+command+shift+t` 会弹出带中文说明的分区选择器，然后立即执行
- 选项文案为：`zl2 - 左边分屏 2 分之 1`、`zl3 - 左边分屏 3 分之 1`、`zl4 - 左边分屏 4 分之 1`、`zr2 - 右边分屏 2 分之 1`、`zr3 - 右边分屏 3 分之 1`、`zr4 - 右边分屏 4 分之 1`
- 这两个 Service 都只会在当前前台应用是 iTerm2 / Terminal / Ghostty 时生效
- `status` / `zone-status` 会分别显示 Service 绑定（`pbs.plist`）和各终端 app 的快捷键同步状态；如果只看到 app shortcut，没有 Service binding，说明热键还没真正注册成功

### 命令触发

```bash
# 默认全屏整理
tile

# 兼容最短写法
zl4
zr2
```

说明：
- Shell 里不要加前导 `/`；也就是用 `tile`、`zl2`、`zr3`，不要写 `/tile`、`/zl2`
- 默认模式下，`tile` / `zl2..zr4` 只会整理你当前所在的终端 app
- 例如你在 Ghostty 里执行，就只整理 Ghostty；在 iTerm2 里执行，就只整理 iTerm2
- 这条路径是默认值，因为明显更快，也更符合日常使用

### 分区模式

适合「终端 + 浏览器/微信」桌面协作流：脚本只整理终端区，其他应用保持你手动安排的结构。

![Zone mode demo](./assets/demo-zone.gif)

```bash
# 统一入口
tile zl4
tile zr2

# 最短写法
zl4
zr2
```

说明：
- `tile` 是统一 CLI；不带参数时等价于默认全屏整理
- `zl2/zl3/zl4` 对应左侧分区；`zr2/zr3/zr4` 对应右侧分区
- Zone 选择器里会显示对应中文说明，便于直接按视觉含义选择
- `zl2..zr4` 仍可直接使用，只是内部改为转发到 `tile`
- 这些命令只移动终端窗口，不会移动浏览器、微信等非终端窗口
- 终端区内：每列最多 `4` 个窗口，超出的窗口会自动分配到相邻列
- 分列规则尽量均衡：例如 `5 -> 3+2`、`7 -> 4+3`、`9 -> 3+3+3`
- 短列会复用满列的行高，剩余位置保留为空白，不会把窗口拉伸变高
- `left*` 从左往右展开；`right*` 贴右边界后再向左展开

### 高级参数

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `TILE_GAP` | `10` | 窗口间距 |
| `TILE_MARGIN_TOP` | `6` | 上边缘留白 |
| `TILE_MARGIN_RIGHT` | `8` | 右边缘留白 |
| `TILE_MARGIN_BOTTOM` | `8` | 下边缘留白 |
| `TILE_MARGIN_LEFT` | `8` | 左边缘留白 |
| `TILE_SCOPE` | `current` | `current` 只整理当前终端；`all` 跨终端整理 |
| `TILE_MODE` | — | 设 `iterm_fast` 启用 iTerm2 快速模式 |

```bash
# 调试模式
TILE_DEBUG=1 tile

# 临时开启跨终端模式
TILE_SCOPE=all tile

# iTerm2 快速模式（纯 iTerm2 场景速度更快）
TILE_MODE=iterm_fast tile
```

### Scope 与性能

- 默认 `TILE_SCOPE=current`
- 这意味着命令只整理当前终端 app，速度更快，适合绝大多数场景
- 如果你确实需要把 `Ghostty + iTerm2 + Terminal` 一起编排，再显式使用 `TILE_SCOPE=all`
- 跨终端模式会更慢，因为脚本必须同时探测多个终端并分别移动窗口

如果你想把跨终端模式设成长期默认值，可以写入配置文件：

```bash
mkdir -p ~/.config/terminal-window-tiler
cat > ~/.config/terminal-window-tiler/config <<'EOF'
TILE_SCOPE=all
EOF
```

改回默认快速模式时，把它改回：

```bash
mkdir -p ~/.config/terminal-window-tiler
cat > ~/.config/terminal-window-tiler/config <<'EOF'
TILE_SCOPE=current
EOF
```

### Agent 命令

安装脚本会同时写入三套 agent 入口：

- Claude Code：`/tile`、`/zl2` ... `/zr4`
- Codex：`/prompts:tile`、`/prompts:zl2` ... `/prompts:zr4`
- OpenClaw：安装独立 skill：`tile`、`zl2` ... `zr4`，可直接触发 `/tile`、`/zl2` ... `/zr4`

这些入口底层都只调用本机 `~/.local/bin/tile`，不复制平铺逻辑。

### 指令心智模型

- 核心指令词始终一致：`tile`、`zl2`、`zl3`、`zl4`、`zr2`、`zr3`、`zr4`
- 不同环境只是在前缀上不同
- Shell：`tile`、`zl2`
- Claude Code：`/tile`、`/zl2`
- OpenClaw：`/tile`、`/zl2`
- Codex：`/prompts:tile`、`/prompts:zl2`
- Shell 不能统一成 `/zl2`，因为前导 `/` 在 shell 里表示绝对路径，不是命令前缀

---

## 布局矩阵

| 窗口数 | 布局 |
|--------|------|
| 2 | 2×1 |
| 3 | 3×1 |
| 4 | 2×2 |
| 5–6 | 3×2 |
| 7–8 | 4×2 |
| 9 | 3×3 |
| 10 | 4×3 |

分区模式下（例如 `zl4`），采用专用列布局：每列最多 `4` 个窗口，并按尽量均衡的方式分配到相邻列。

---

## 测试与兼容性

**已验证（macOS）**
- macOS: `26.2` (`25C56`)
- iTerm2: `3.6.8`
- Terminal: `2.15`
- Ghostty: `1.2.3`

**当前结论**
- 当前版本专门面向 MacBook / macOS 场景
- macOS 场景可用（重点验证了终端窗口分屏流程）
- 单显示器、单桌面（单 Space）场景最稳定
- Windows 不在当前支持范围内
- 其他终端（除 iTerm2 / Terminal / Ghostty）暂未验证

**权限说明**

快捷键只基于当前的终端生效，iTerm/Ghostty都依赖辅助功能权限才能被脚本控制。
- 系统设置 → 隐私与安全性 → 辅助功能 → 添加 Ghostty

---

## 社交媒体

<div align="center">
  <p>全网同名：<code>@歪斯Wise</code></p>
  <p>
    <a href="https://www.xiaohongshu.com/user/profile/61f3ea4f000000001000db73">小红书</a> /
    <a href="https://x.com/killthewhys">Twitter(X)</a> /
    扫码关注公众号
  </p>
  <img src="assets/wechat-wise-qr.jpg" alt="公众号歪斯二维码" width="220" />
</div>

---

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=WiseWong6/wise-terminal-tiler&type=Date)](https://www.star-history.com/#WiseWong6/wise-terminal-tiler&Date)
