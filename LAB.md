# Datahazed lab fork

This is the Datahazed fork of
[router-for-me/Cli-Proxy-API-Management-Center](https://github.com/router-for-me/Cli-Proxy-API-Management-Center)
(CPAMC). It is the dedicated CLI Proxy **panel** project for the lab.

Live panel: `https://cliproxy.lab.datahaze.co.uk/management.html`

Mini checkout: `~/projects/cli-proxy-management-center`

Upstream closed OpenCode Go as “not our provider”. This fork puts Go on
the native **Usage** board (`#/quota`) next to Claude, Codex, and Grok,
and keeps the rebuild/rebase scripts in `lab/` so `main` can still
track upstream.

## Git layout

| Remote | URL |
|---|---|
| `origin` | `git@github.com:Datahazed/Cli-Proxy-API-Management-Center.git` |
| `upstream` | `https://github.com/router-for-me/Cli-Proxy-API-Management-Center.git` |

| Branch | What |
|---|---|
| `main` | Fast-forward only from `upstream/main`. No lab overlay. |
| `lab-opencode-go-quota` | **Working branch.** OpenCode Go Usage adapter + `lab/` tooling. Default on GitHub. |

Do not merge `lab-opencode-go-quota` into `main`. Rebase it onto `main`
when upstream moves.

```text
git clone --branch lab-opencode-go-quota \
  git@github.com:Datahazed/Cli-Proxy-API-Management-Center.git \
  ~/projects/cli-proxy-management-center
cd ~/projects/cli-proxy-management-center
git remote add upstream https://github.com/router-for-me/Cli-Proxy-API-Management-Center.git
git fetch upstream
git branch --track main origin/main
```

The Mini already has that checkout. Do not clone a second copy under
`~/src` or `/tmp`.

## How the pieces fit

```text
Cloud OAuth / OpenCode Go keys
        │
        ▼
eceasy/cli-proxy-api  (digest-pinned in lab-proxy compose.yml)
        │
        ├── /management.html  ← bind-mount of lab/management.html (this repo)
        └── plugins/*.so      ← built from lab/plugin, installed into
                                ~/proxy/data/cliproxy/plugins (gitignored)
        │
        ▼
Caddy on Mini  →  https://cliproxy.lab.datahaze.co.uk
```

| Piece | Repo / path | Upgrade how |
|---|---|---|
| CLI Proxy API | `eceasy/cli-proxy-api` in `~/proxy/compose.yml` | Pin a new digest. Recreate `cliproxy` only. |
| This panel | this repo, `lab-opencode-go-quota` | Rebase onto `main`, rebuild, remount. |
| OpenCode Go plugin | `lab/plugin/` | `build-plugin.sh` then `install-plugin.sh`. |
| Caddy / compose | `Datahazed/lab-proxy` (`cliproxy` branch) | Bind-mount only. No panel sources there. |

Runtime secrets stay in `~/proxy/data/cliproxy/` (gitignored). Do not
copy keys into this repo.

## Day-to-day

All of these run on the Mini. Panel and plugin builds use Docker
(`oven/bun:1.3.14`, `golang:1.26.6-bookworm`). Host bun is not required.

After any ship step: open Usage and confirm Claude, Codex, Grok, **and**
OpenCode Go cards still load.

### Ship a panel change

Edit sources on `lab-opencode-go-quota` (`src/features/quota/…` for
Usage). Then:

```text
cd ~/projects/cli-proxy-management-center
./lab/scripts/rebuild-panel.sh
git add lab/management.html lab/pin.json
git commit -m "Rebuild lab panel"
git push origin lab-opencode-go-quota
cd ~/proxy && docker compose up -d cliproxy
```

`rebuild-panel.sh` runs tests, type-check, and vite, then writes
`lab/management.html`. Compose already bind-mounts that file over
`/CLIProxyAPI/static/management.html`. Keep
`remote-management.disable-auto-update-panel: true` in the gitignored
runtime config so CPA does not download upstream CPAMC over it.

### Ship a plugin change

```text
cd ~/projects/cli-proxy-management-center
./lab/scripts/build-plugin.sh
./lab/scripts/install-plugin.sh
cd ~/proxy && docker compose up -d cliproxy
```

That writes linux/arm64 `opencode-go-cliproxyapi.so` into
`~/proxy/data/cliproxy/plugins/linux/arm64/`. Do not commit `dist/` or
the `.so`.

Add or rotate Go keys from the panel: **OpenCode Go Keys** (plugin
menu). Enable **Remember password** so the page can call the management
API. Keys land in the gitignored runtime config, not here.

### Pull upstream Management Center features

When router-for-me ships panel UI you want:

```text
cd ~/projects/cli-proxy-management-center
./lab/scripts/rebase-upstream.sh
# fix conflicts if any (usually src/features/quota/* and i18n)
# the script does not force-push
git push --force-with-lease origin lab-opencode-go-quota
./lab/scripts/rebuild-panel.sh
git add lab/management.html lab/pin.json
git commit -m "Rebuild lab panel after upstream rebase"
git push origin lab-opencode-go-quota
cd ~/proxy && docker compose up -d cliproxy
```

`rebase-upstream.sh` fast-forwards `main` from `upstream/main`, pushes
`origin/main`, then rebases `lab-opencode-go-quota` onto `main`.

### Bump CLI Proxy (API / OAuth / plugin host)

No panel rebase required unless the management API moved.

1. Pin the new `eceasy/cli-proxy-api` digest in `~/proxy/compose.yml`
   and in `lab/pin.json`.
2. Leave the overlay mount and `disable-auto-update-panel: true`.
3. `cd ~/proxy && docker compose up -d cliproxy` only. Do not full-stack
   recreate.
4. If Usage or `/v0/management` broke, rebase this branch first, then
   rebuild the panel.

### First-time Mini (already done)

```text
git clone --branch lab-opencode-go-quota \
  git@github.com:Datahazed/Cli-Proxy-API-Management-Center.git \
  ~/projects/cli-proxy-management-center
cd ~/projects/cli-proxy-management-center
git remote add upstream https://github.com/router-for-me/Cli-Proxy-API-Management-Center.git
git fetch upstream
git branch --track main origin/main
# lab-proxy compose already bind-mounts lab/management.html
cd ~/proxy && docker compose up -d cliproxy
```

## Layout

| Path | What |
|---|---|
| `src/features/quota/providers/opencodeGo/` | Native Usage adapter (5-hour / weekly / monthly) |
| `lab/management.html` | Built single-file panel (committed artefact) |
| `lab/pin.json` | CPA image digest + this branch SHA |
| `lab/scripts/rebuild-panel.sh` | test + type-check + build → `lab/management.html` |
| `lab/scripts/build-plugin.sh` | linux/arm64 `.so` into `lab/plugin/dist/` (gitignored) |
| `lab/scripts/install-plugin.sh` | copy `.so` into Mini cliproxy data dir |
| `lab/scripts/rebase-upstream.sh` | ff-only `main`, rebase this branch |
| `lab/plugin/` | Lab-patched OpenCode Go plugin (Keys page, empty-key register) |
| `~/proxy` | Caddy + cliproxy container. Not this repo. |

Root `dist/` is gitignored (vite output). The artefact we keep is
`lab/management.html`. Quota percent from the plugin is *used*; the
card shows remaining as `100 - percent`. `rate-limited` is 100% used.

## Do not

- Open a Usage-provider PR against upstream CPAMC (already rejected).
- Merge `lab-opencode-go-quota` into `main`.
- Turn panel auto-update back on in the live CLI Proxy config.
- Commit `dist/`, `lab/plugin/dist/`, `.so` files, or OpenCode Go keys.
- Put this on `gateway.lab.datahaze.co.uk` or publish host port 8317.
- Clone extra copies under `~/src` or `/tmp`. This project is the copy.
