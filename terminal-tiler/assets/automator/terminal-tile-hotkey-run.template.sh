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

if [[ -x "$HOME/.local/bin/tile" ]]; then
  TILE_SKIP_HOTKEY_BOOTSTRAP=1 exec "$HOME/.local/bin/tile"
fi

if command -v tile >/dev/null 2>&1; then
  TILE_SKIP_HOTKEY_BOOTSTRAP=1 exec "$(command -v tile)"
fi

echo "tile 未找到，请先安装到 ~/.local/bin/tile。" >&2
exit 1
