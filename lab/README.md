# lab/

Lab-only tooling for this Datahazed fork. Upstream CPAMC does not
have this directory. Keep it on `lab-opencode-go-quota` so `main` can
fast-forward from upstream without carrying our scripts.

| Path | What |
|---|---|
| `management.html` | Built single-file panel. Mini compose bind-mounts this over the CLI Proxy image asset. |
| `pin.json` | CPA image digest + this branch SHA. |
| `scripts/rebuild-panel.sh` | bun test/type-check/build → `management.html` |
| `scripts/build-plugin.sh` | linux/arm64 `.so` for the OpenCode Go plugin |
| `scripts/install-plugin.sh` | copy `.so` into Mini `~/proxy/data/cliproxy/plugins` |
| `scripts/rebase-upstream.sh` | ff-only `main` from `upstream`, rebase this branch |
| `plugin/` | Lab-patched `opencode-go-cliproxyapi` (Keys page + empty-key register) |

Home of this checkout on the Mini:

`~/projects/cli-proxy-management-center`

Remotes: `origin` = Datahazed fork, `upstream` = router-for-me CPAMC.

Operator steps: see `/LAB.md` at the repo root.
