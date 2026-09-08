#!/bin/sh
# Build the lab OpenCode Go plugin as linux/arm64 (OrbStack cliproxy).
# Writes lab/plugin/dist/opencode-go-cliproxyapi.so. Does not install it.
set -eu
root=$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)
src="$root/lab/plugin"
image='golang:1.26.6-bookworm'

export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"
docker run --rm --platform linux/arm64 \
  -v "$src":/src -w /src \
  -e CGO_ENABLED=1 \
  -e GOTOOLCHAIN=auto \
  "$image" \
  bash -c 'set -euo pipefail
command -v gcc >/dev/null || (apt-get update -qq && DEBIAN_FRONTEND=noninteractive apt-get install -y -qq gcc >/dev/null)
mkdir -p dist
go build -trimpath -buildmode=c-shared -ldflags "-s -w" -o dist/opencode-go-cliproxyapi.so .
rm -f dist/opencode-go-cliproxyapi.h
ls -l dist/opencode-go-cliproxyapi.so
'

echo "Built $src/dist/opencode-go-cliproxyapi.so"
echo "Install with: $root/lab/scripts/install-plugin.sh"
