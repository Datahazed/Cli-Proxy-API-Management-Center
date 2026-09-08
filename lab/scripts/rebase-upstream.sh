#!/bin/sh
# Rebase the lab overlay onto upstream CPAMC main.
# Does not push origin/main — that branch is ruleset-locked and kept
# identical to upstream by .github/workflows/lab-sync-upstream-main.yml.
set -eu
root=$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)
branch="${1:-lab-opencode-go-quota}"

cd "$root"
if ! git remote get-url upstream >/dev/null 2>&1; then
  git remote add upstream https://github.com/router-for-me/Cli-Proxy-API-Management-Center.git
fi
git fetch upstream
git fetch origin
git checkout "$branch"
git rebase upstream/main
echo
echo "Rebase stopped at $(git rev-parse --short HEAD) on $branch."
echo "origin/main is updated by GitHub Actions, not this script."
echo "If the rebase finished cleanly:"
echo "  bun test && bun run type-check"
echo "  git push --force-with-lease origin $branch"
echo "  ./lab/scripts/rebuild-panel.sh"
echo "  cd ~/proxy && docker compose up -d cliproxy"
