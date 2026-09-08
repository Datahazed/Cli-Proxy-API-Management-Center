# lab/

Lab-only tooling. Upstream CPAMC does not have this directory. It lives
on `lab-opencode-go-quota` so `main` can fast-forward from upstream.

**Day-to-day (rebuild, rebase, bump CPA, plugin): [LAB.md](../LAB.md).**

| Path | What |
|---|---|
| `management.html` | Built single-file panel. Mini compose bind-mounts this. |
| `pin.json` | CPA image digest + this branch SHA. |
| `scripts/rebuild-panel.sh` | bun test/type-check/build → `management.html` |
| `scripts/build-plugin.sh` | linux/arm64 `.so` for the OpenCode Go plugin |
| `scripts/install-plugin.sh` | copy `.so` into Mini `~/proxy/data/cliproxy/plugins` |
| `scripts/rebase-upstream.sh` | ff-only `main` from `upstream`, rebase this branch |
| `plugin/` | Lab-patched `opencode-go-cliproxyapi` (Keys page + empty-key register) |

Mini checkout: `~/projects/cli-proxy-management-center`.
Remotes: `origin` = Datahazed fork, `upstream` = router-for-me CPAMC.
