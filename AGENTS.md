# Repository Guidelines

## Project Structure & Module Organization
This repository is a macOS terminal-window tiling utility.

- `scripts/terminal-tile-all`: main executable (`zsh` + embedded AppleScript).
- `scripts/tile`: primary user-facing entrypoint.
- `scripts/zl2` .. `scripts/zr4`: short zone wrappers that forward to `tile`.
- `scripts/ghostty-window-helper`: Ghostty helper used for window discovery and movement.
- `scripts/install-agent-commands`: installer for local bin scripts, agent commands, and shortcuts.
- `scripts/terminal-tile-hotkey`: installs and manages the default hotkeys.
- `scripts/terminal-tile-zone-picker`: zone chooser used by the zone hotkey.
- `assets/`: static assets used by documentation.
- `README.md`: product behavior, install flow, scope/performance notes, and compatibility guidance.

Keep runtime logic in `scripts/`. Keep documentation assets in `assets/` only.

## Build, Test, and Development Commands
There is no build step for the main tool, but the Ghostty helper is compiled during install.

- `zsh -n scripts/terminal-tile-all`: syntax-check the main script.
- `zsh -n scripts/install-agent-commands scripts/tile scripts/zl2 scripts/zr3`: syntax-check installer and entrypoints.
- `TILE_DEBUG=1 scripts/tile`: run with debug output.
- `TILE_SCOPE=all scripts/tile`: force cross-terminal tiling.
- `./scripts/install-agent-commands`: install local commands and rebuild the Ghostty helper binary in `~/.local/bin`.
- `shellcheck scripts/terminal-tile-all`: optional static analysis for shell pitfalls.

## Coding Style & Naming Conventions
- Shell: use `zsh` (`#!/bin/zsh`), 2-space indentation, and clear section comments.
- Environment variables: uppercase with `TILE_` prefix.
- Filenames: kebab-case for scripts.
- Prefer deterministic layout logic and explicit defaults over implicit behavior.
- Preserve the user-facing command model:
  - `tile` is the primary command.
  - `zl2` .. `zr4` are compatibility wrappers.
  - Default scope is `current` unless `TILE_SCOPE=all` is explicitly configured.
  - Keep the command-word model stable across environments:
    - Shell uses `tile` / `zl2`
    - Claude Code and OpenClaw use `/tile` / `/zl2`
    - Codex uses `/prompts:tile` / `/prompts:zl2`
  - Do not document shell commands with a leading `/`; `/zl2` is not valid shell syntax.

## Behavior Notes
- `TILE_SCOPE=current` means "current terminal app", not "current window".
- `TILE_SCOPE=all` means tiling across supported terminal apps (`iTerm2`, `Terminal`, `Ghostty`).
- Default behavior should optimize for responsiveness in the common case.
- Any new behavior that changes scope, latency, or hotkeys must be reflected in `README.md`.

## Testing Guidelines
No automated test framework is configured yet. Validate changes with:

1. `zsh -n` for touched scripts.
2. `./scripts/install-agent-commands` after helper or installer changes.
3. Manual runs on macOS with at least 2 windows open.
4. Smoke checks across supported apps (`iTerm2` / `Terminal` / `Ghostty`) when behavior touches scope or compatibility.
5. If behavior changes, update `README.md` accordingly.

## Commit & Pull Request Guidelines
Recent history follows Conventional Commit prefixes (`feat:`, `docs:`). Continue this style:

- Example: `feat: add current-app tiling scope`
- Example: `docs: clarify TILE_SCOPE behavior`

PRs should include:
- a concise summary of user-visible changes,
- validation steps and environment (macOS/app versions),
- before/after terminal output when behavior or latency changes,
- linked issue(s) when applicable.

## Security & Configuration Tips
- Do not commit machine-specific absolute paths unless intentionally required.
- Keep AppleScript interactions limited to terminal apps and window management scope.
- Document new `TILE_*` environment variables and config-file behavior in `README.md`.
