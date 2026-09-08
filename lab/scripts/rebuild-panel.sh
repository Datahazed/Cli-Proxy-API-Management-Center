#!/bin/sh
# Rebuild lab/management.html from this checkout.
# Run on the Mini (needs Docker oven/bun). Does not bump the CLI Proxy image.
#
# Usage:
#   ./lab/scripts/rebuild-panel.sh
set -eu
root=$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)
out="$root/lab/management.html"
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

cp "$root/dist/index.html" "$out"
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
echo "Recreate cliproxy: cd ~/proxy && docker compose up -d cliproxy"
