<!--
Blueprint conventions:
- status is one of: active | paused | done | shelved
- Log entries are newest-first, one per work session.
- Agents edit this file; the gallery page is generated from it — never edit the HTML.
-->
---
title: Link Dictate Co
one_liner: Obsidian sidebar plugin that inserts vault links into the Handy voice dictation app over a loopback HTTP API.
status: active
updated: 2026-11-16
discord_channel: https://discord.com/channels/1486966847810043924/1571844263661277194
---

## Where it stands

- v0.1.0 scaffolded with Obsidian plugin skeleton + release scripts adapted from `obsidian-sticky-headings-no-flicker`.
- Right-sidebar panel lists current-note links and top 25 vault-wide frequent links from `metadataCache.resolvedLinks`.
- Clicking a link POSTs `{"text":"[[Target]]"}` (or alias form when enabled) to `127.0.0.1:<port>/insert` with Bearer auth.
- Polls `/state` every 2 s while the view is open; applies `ldc-idle` / `ldc-recording` CSS classes.
- Settings tab configures port, secret, insert style, and a test-connection button.
- All unit + integration tests pass under `bun test`; build produces `main.js` + `manifest.json` + `styles.css`.

## How to run

```bash
bun install
bun run build   # typecheck + esbuild; outputs main.js
bun run test
```

## Architecture

- `main.ts` re-exports `src/plugin.ts`.
- `src/plugin.ts` loads merged settings, registers the sidebar view, ribbon icon, setting tab, and debounces metadata-cache refreshes.
- `src/view.ts` renders current-note and frequent-link sections, polls Handy state, and dispatches inserts.
- `src/handy-client.ts` is transport-agnostic (injected `Transport`) so tests never touch the real Handy app.
- `src/transport.ts` wires Obsidian's `requestUrl` for the production transport.
- `src/links.ts`, `src/token.ts`, and `src/settings-core.ts` are pure helpers with full test coverage.
- `src/settings.ts` provides the Obsidian `SettingTab` UI.

## Log

### 2026-11-16 — v0.1.0 build + tests green

Built the plugin end-to-end, copied release scripts from `obsidian-sticky-headings-no-flicker`, wrote bun integration tests against a throwaway server, and verified `bun run build` plus `bun test`.

Next: runtime test inside Obsidian once the Handy voice-insert API is running locally.
