# Lab overlay

This Datahazed fork of
[router-for-me/Cli-Proxy-API-Management-Center](https://github.com/router-for-me/Cli-Proxy-API-Management-Center)
is the dedicated CLI Proxy panel project.

Mini checkout: `~/projects/cli-proxy-management-center`

- `origin` = this fork
- `upstream` = router-for-me CPAMC
- `main` tracks upstream (fast-forward only)
- `lab-opencode-go-quota` carries the OpenCode Go Usage adapter **and**
  the `lab/` tooling directory

Do not merge the overlay into `main`. Rebase the lab branch onto `main`
when upstream moves.

## What lives where

| Path | What |
|---|---|
| `src/features/quota/providers/opencodeGo/` | Native Usage adapter (same cards as Claude/Codex/Grok) |
| `lab/` | Scripts, built `management.html`, lab-patched OpenCode Go plugin |
| `~/proxy` (`Datahazed/lab-proxy`) | Caddy + cliproxy container. Bind-mounts `lab/management.html`. |

`lab/dist` is not a thing. Root `dist/` is gitignored (vite output).
The artefact we keep is `lab/management.html`.

## Rebuild the panel

On the Mini:

```text
cd ~/projects/cli-proxy-management-center
./lab/scripts/rebuild-panel.sh
cd ~/proxy && docker compose up -d cliproxy
```

Compose mounts

`/Users/pmcd/projects/cli-proxy-management-center/lab/management.html`

over `/CLIProxyAPI/static/management.html`. Keep
`remote-management.disable-auto-update-panel: true` in the gitignored
runtime config so CPA does not download upstream CPAMC over it.

## OpenCode Go plugin

Sources: `lab/plugin/` (Keys page + empty-key register, from
massiveits/opencode-go-cliproxyapi). Build and install:

```text
./lab/scripts/build-plugin.sh
./lab/scripts/install-plugin.sh
cd ~/proxy && docker compose up -d cliproxy
```

That writes the `.so` into `~/proxy/data/cliproxy/plugins/` (gitignored).
Do not commit API keys.

## Rebase when upstream moves

```text
./lab/scripts/rebase-upstream.sh
# fix conflicts (usually src/features/quota/* and i18n)
bun test && bun run type-check
git push --force-with-lease origin lab-opencode-go-quota
./lab/scripts/rebuild-panel.sh
cd ~/proxy && docker compose up -d cliproxy
```

## Bump CLI Proxy without a panel rebase

Pin a new `eceasy/cli-proxy-api` digest in `~/proxy/compose.yml` and
`lab/pin.json`. Keep the overlay mount and auto-update disabled.
`docker compose up -d cliproxy` only. If the management API moved,
rebase this branch first.

## Do not

- Open a Usage-provider PR against upstream CPAMC (already rejected).
- Turn panel auto-update back on in the live CLI Proxy config.
- Commit `dist/`, `lab/plugin/dist/`, or OpenCode Go API keys.
- Merge `lab-opencode-go-quota` into `main`.
