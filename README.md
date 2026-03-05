# terminal-window-tiler

macOS terminal window tiling scripts for:
- iTerm2 only (`iterm2-tile-windows`)
- mixed terminals (`terminal-tile-all`) across iTerm2 + Terminal + Ghostty

## Features

- Per-display tiling (each monitor is tiled independently)
- Fixed layout policy for 2..10 windows:
  - 2 -> 2x1
  - 3 -> 3x1
  - 4 -> 2x2
  - 5 -> 3x2
  - 6 -> 3x2
  - 7 -> 4x2
  - 8 -> 4x2
  - 9 -> 3x3
  - 10 -> 4x3
- Optional spacing/margins via env vars

## Requirements

- macOS
- `zsh`
- `osascript`
- iTerm2 (for `iterm2-tile-windows`)
- Accessibility permission may be required for Ghostty in mixed mode

## Files

- `scripts/iterm2-tile-windows`
- `scripts/terminal-tile-all`

## Install

```bash
# clone
cd ~
git clone https://github.com/<your-user>/terminal-window-tiler.git
cd terminal-window-tiler

# install to ~/.local/bin
mkdir -p ~/.local/bin
cp scripts/iterm2-tile-windows ~/.local/bin/
cp scripts/terminal-tile-all ~/.local/bin/
chmod +x ~/.local/bin/iterm2-tile-windows ~/.local/bin/terminal-tile-all

# optional aliases
cat >> ~/.zshrc <<'ZSH'
alias 分屏='~/.local/bin/iterm2-tile-windows'
alias 分屏-all='~/.local/bin/terminal-tile-all'
alias ttw='~/.local/bin/iterm2-tile-windows'
alias ttwa='~/.local/bin/terminal-tile-all'
ZSH
source ~/.zshrc
```

## Usage

### iTerm2 only

```bash
iterm2-tile-windows
# or
分屏
```

### Mixed terminals

```bash
terminal-tile-all
# or
分屏-all
```

### Debug mixed mode

```bash
TILE_DEBUG=1 terminal-tile-all
```

## Optional env vars

- `TILE_GAP` (default `10`)
- `TILE_MARGIN_TOP` (default `6`)
- `TILE_MARGIN_RIGHT` (default `8`)
- `TILE_MARGIN_BOTTOM` (default `8`)
- `TILE_MARGIN_LEFT` (default `8`)

Example:

```bash
TILE_GAP=16 TILE_MARGIN_TOP=12 terminal-tile-all
```

## Ghostty notes

`terminal-tile-all` tries to control Ghostty via macOS Accessibility API (`System Events`).

If Ghostty windows are not detected, enable permission:
- System Settings -> Privacy & Security -> Accessibility
- allow Terminal / iTerm2 (whichever runs the script)

Some Ghostty versions may still not expose window controls through AX. In that case, the script will tile iTerm2/Terminal and skip Ghostty.
