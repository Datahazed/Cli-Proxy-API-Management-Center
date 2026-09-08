#!/bin/sh
# Rebuild lab/management.html from this checkout.
# Run on the Mini (needs Docker oven/bun). Does not bump the CLI Proxy image.
#
# Usage:
#   ./lab/scripts/rebuild-panel.sh
set -eu
root=$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)
out="$root/lab/panel/management.html"
pin="$root/lab/pin.json"
image='oven/bun:1.3.14'

export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"
docker run --rm --platform linux/arm64 \
  -v "$root":/src -w /src \
  "$image" \
  bash -lc 'set -euo pipefail
bun install --frozen-lockfile
bun test tests/opencodeGoQuota.test.ts tests/quotaPageLogic.test.ts tests/quotaResetSchedule.test.ts tests/quotaTimeline.test.ts
bun run type-check
bun run build
test -f dist/index.html
'

python3 - "$root/dist/index.html" "$out" "$root/lab/management.html" <<'COPY'
import pathlib, shutil, sys
src, panel, alias = map(pathlib.Path, sys.argv[1:4])
data = src.read_bytes()
panel.parent.mkdir(parents=True, exist_ok=True)
# Truncate in place when the file already exists so a directory bind keeps working.
if panel.exists():
    with panel.open('wb') as f:
        f.write(data)
        f.truncate()
else:
    panel.write_bytes(data)
if alias.exists():
    with alias.open('wb') as f:
        f.write(data)
        f.truncate()
else:
    alias.write_bytes(data)
COPY
sha=$(git -C "$root" rev-parse HEAD)
branch=$(git -C "$root" rev-parse --abbrev-ref HEAD)
upstream=$(git -C "$root" merge-base HEAD origin/main 2>/dev/null || true)
python3 - "$pin" "$sha" "$upstream" "$branch" <<'PY'
import json, pathlib, sys
pin, sha, upstream, branch = sys.argv[1:5]
path = pathlib.Path(pin)
data = json.loads(path.read_text()) if path.exists() else {}
data.update({
    "cpamc_sha": sha,
    "cpamc_branch": branch,
})
if upstream:
    data["upstream_sha"] = upstream
path.write_text(json.dumps(data, indent=2) + "\n")
PY

echo "Wrote $out from $root@$sha"
echo "Panel is directory-mounted; recreate only if the mount is missing:"
echo "  cd ~/proxy && docker compose up -d cliproxy"
