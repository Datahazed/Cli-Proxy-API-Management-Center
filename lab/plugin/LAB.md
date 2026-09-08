# Lab OpenCode Go plugin

Vendored from https://github.com/massiveits/opencode-go-cliproxyapi
at the lab-keys-ui patch:

- empty `api-keys` list is allowed (register without a dummy key)
- Management Center resource **OpenCode Go Keys**
- quota endpoint used by the native Usage adapter in this fork

Build linux/arm64 with `../scripts/build-plugin.sh`. Install into the
Mini cliproxy data dir with `../scripts/install-plugin.sh`.

Do not commit `dist/` or live API keys.
