#!/bin/sh
# Copy the built OpenCode Go plugin into the live CLI Proxy plugins dir.
# Runtime data stays gitignored under ~/proxy/data/cliproxy.
set -eu
root=$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)
so="$root/lab/plugin/dist/opencode-go-cliproxyapi.so"
dest="${CLIPROXY_PLUGINS:-$HOME/proxy/data/cliproxy/plugins/linux/arm64}"

if [ ! -f "$so" ]; then
  echo "missing $so — run lab/scripts/build-plugin.sh first" >&2
  exit 1
fi

mkdir -p "$dest"
if [ -f "$dest/opencode-go-cliproxyapi.so" ]; then
  cp "$dest/opencode-go-cliproxyapi.so" "$dest/opencode-go-cliproxyapi.so.bak"
fi
cp "$so" "$dest/opencode-go-cliproxyapi.so"
chmod 755 "$dest/opencode-go-cliproxyapi.so"
echo "Installed $dest/opencode-go-cliproxyapi.so"
echo "Recreate cliproxy: cd ~/proxy && docker compose up -d cliproxy"
