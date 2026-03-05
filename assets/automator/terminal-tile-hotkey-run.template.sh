#!/bin/zsh
# managed-by=terminal-window-tiler

set -u

# Use frontmost app lookup that does not require System Events automation permission.
front_bundle_id="$(osascript -e 'id of app (path to frontmost application as text)' 2>/dev/null || true)"

case "$front_bundle_id" in
  com.googlecode.iterm2|com.apple.Terminal|com.mitchellh.ghostty)
    ;;
  *)
    exit 0
    ;;
esac

tile_mode=""
if [[ "$front_bundle_id" == "com.googlecode.iterm2" ]]; then
  tile_mode="iterm_fast"
fi

if command -v terminal-tile-all >/dev/null 2>&1; then
  TILE_SKIP_HOTKEY_BOOTSTRAP=1 TILE_MODE="$tile_mode" exec "$(command -v terminal-tile-all)"
fi

if [[ -x "$HOME/.local/bin/terminal-tile-all" ]]; then
  TILE_SKIP_HOTKEY_BOOTSTRAP=1 TILE_MODE="$tile_mode" exec "$HOME/.local/bin/terminal-tile-all"
fi

echo "terminal-tile-all 未找到，请先安装到 ~/.local/bin/terminal-tile-all。" >&2
exit 1
