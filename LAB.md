# Lab overlay

This Datahazed fork of
[router-for-me/Cli-Proxy-API-Management-Center](https://github.com/router-for-me/Cli-Proxy-API-Management-Center)
adds **OpenCode Go** as a sixth native Usage provider. Upstream closed
that as "not our provider"; the official path is a plugin page. The lab
wants Go on the same Usage board as Claude / Codex / Grok.

`origin/main` tracks upstream. Overlay work lives on
`lab-opencode-go-quota`. Do not merge the overlay into `main` — that
makes the next upstream rebase painful.

## What the overlay does

- Auth files with `type: opencode-go` (or `opencode`) appear on
  **Usage** (`#/quota`) with the same card chrome as the other
  providers: 5-hour, weekly, and monthly meters.
- Quota is fetched from the lab plugin, not from CPA's native quota
  API: `POST /v0/management/plugins/opencode-go-cliproxyapi/quota`
  with `{ "key_id": "<auth file id>" }`.
- Plugin percent is *used*. The card shows remaining as `100 - percent`.
  `rate-limited` is treated as 100% used.

The built single-file panel is **not** committed here (`dist/` is
gitignored). `Datahazed/lab-proxy` pins a SHA of this branch and
bind-mounts the built `management.html` over the CLI Proxy image asset.

## Rebase when upstream moves

```text
git fetch upstream
git checkout main
git merge --ff-only upstream/main
git push origin main
git checkout lab-opencode-go-quota
git rebase main
# fix conflicts (usually src/features/quota/* and i18n)
bun test
bun run type-check
bun run build
git push --force-with-lease origin lab-opencode-go-quota
```

Then in `lab-proxy`, run `scripts/rebuild-cliproxy-panel.sh` and commit
the new `config/cliproxy/management.html`.

## Bump CLI Proxy without a panel rebase

Pin a new `eceasy/cli-proxy-api` digest in `lab-proxy/compose.yml`.
Keep `remote-management.disable-auto-update-panel: true` so the image
does not download upstream CPAMC over the overlay. Recreate `cliproxy`
only. If the management API changed, rebase this branch first.

## Do not

- Open a Usage-provider PR against upstream CPAMC (already rejected).
- Turn panel auto-update back on in the live CLI Proxy config.
- Commit `dist/` or OpenCode Go API keys here.
