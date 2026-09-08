#!/bin/sh
# Fast-forward origin/main from upstream CPAMC, then rebase the lab overlay
# branch. Does not force-push; that is left to the operator after tests.
set -eu
root=$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)
branch="${1:-lab-opencode-go-quota}"

cd "$root"
if ! git remote get-url upstream >/dev/null 2>&1; then
  git remote add upstream https://github.com/router-for-me/Cli-Proxy-API-Management-Center.git
fi
git fetch upstream
git fetch origin
git checkout main
git merge --ff-only upstream/main
git push origin main
git checkout "$branch"
git rebase main
echo
echo "Rebase stopped at $(git rev-parse --short HEAD) on $branch."
echo "If the rebase finished cleanly:"
echo "  bun test && bun run type-check"
echo "  git push --force-with-lease origin $branch"
echo "  ./lab/scripts/rebuild-panel.sh"
echo "  cd ~/proxy && docker compose up -d cliproxy"
