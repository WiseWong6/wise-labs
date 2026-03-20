# Agent Guide

This file is optimized for AI agents, not human readers.

If you need a machine-readable summary, read `agent-manifest.json` first.

## Purpose

`wise-terminal-tiler` is a macOS terminal-window tiling utility.

Primary user goal:
- restore a scattered terminal workspace quickly
- default to the current terminal app for speed
- optionally tile across `iTerm2`, `Terminal`, and `Ghostty`

## Canonical Entrypoints

- Primary command: `tile`
- Zone wrappers: `zl2`, `zl3`, `zl4`, `zr2`, `zr3`, `zr4`
- Main implementation: `scripts/terminal-tile-all`
- Ghostty helper: `scripts/ghostty-window-helper`
- Installer: `scripts/install-agent-commands`
- Hotkey manager: `scripts/terminal-tile-hotkey`
- Zone chooser: `scripts/terminal-tile-zone-picker`

## Command Matrix

Use the same command words everywhere. Only the prefix changes by environment.

| Environment | Valid form |
|-------------|------------|
| Shell | `tile`, `zl2`, `zr3` |
| Claude Code | `/tile`, `/zl2`, `/zr3` |
| OpenClaw | `/tile`, `/zl2`, `/zr3` |
| Codex | `/prompts:tile`, `/prompts:zl2`, `/prompts:zr3` |

Important:
- Do not document shell commands with a leading `/`
- `/zl2` is invalid in `zsh` and is interpreted as an absolute path

## Scope Model

Default:
- `TILE_SCOPE=current`

Meaning:
- `current` = current terminal app, not current window
- `all` = all supported terminal apps

Supported apps:
- `iTerm2`
- `Terminal`
- `Ghostty`

Performance expectation:
- `current` should be the fast path
- `all` is slower because it scans and moves windows across multiple apps

## Install Model

Primary install command:

```bash
./scripts/install-agent-commands
```

What it installs:
- local bin commands in `~/.local/bin`
- Claude commands in `~/.claude/commands`
- Codex prompts in `~/.codex/prompts`
- OpenClaw skills in `~/.openclaw/workspace/skills`
- hotkeys via `terminal-tile-hotkey`
- compiled Ghostty helper binary

## Configuration Model

Persistent config file:

```bash
~/.config/terminal-window-tiler/config
```

Recognized config:
- `TILE_SCOPE=current`
- `TILE_SCOPE=all`

Environment variables:
- `TILE_SCOPE`
- `TILE_DEBUG`
- `TILE_MODE`
- `TILE_GAP`
- `TILE_MARGIN_TOP`
- `TILE_MARGIN_RIGHT`
- `TILE_MARGIN_BOTTOM`
- `TILE_MARGIN_LEFT`

## Verification Commands

Use these when validating behavior:

```bash
zsh -n scripts/terminal-tile-all
zsh -n scripts/install-agent-commands scripts/tile scripts/zl2 scripts/zr3
./scripts/install-agent-commands
TILE_DEBUG=1 tile
terminal-tile-hotkey status
terminal-tile-hotkey zone-status
```

Ghostty-specific validation:

```bash
ghostty-window-helper list
```

## Editing Rules

- Keep runtime logic in `scripts/`
- Keep human-facing product copy in `README.md` and `README.en.md`
- Reflect any scope, hotkey, or command-model change in the README files
- Preserve the command-word model: `tile`, `zl2` .. `zr4`
- Prefer deterministic behavior and explicit defaults

## Commit Style

Use Conventional Commits.

Examples:
- `feat: add current-app tiling scope`
- `docs: clarify command prefixes`
- `fix: stabilize ghostty window detection`
