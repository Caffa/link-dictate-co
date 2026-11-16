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

- v0.1.1 released: right-sidebar panel lists current-note links and top vault-wide frequent links from `metadataCache.resolvedLinks`.
- Clicking a row POSTs `{"text":"[[Target]]"}` with Bearer auth to `127.0.0.1:<port>/insert`; `/state` polled ~2 s styles the panel idle/recording.
- Deep-review fixes shipped: `requestUrl` `throw:false` (401/409 handled), distinct 413 notice, view `containerEl`→`rootEl` per the Obsidian leaf contract, tab-switch refreshes only the current-note section, dead code removed.
- Repo pushed to github.com/Caffa/link-dictate-co with releases 0.1.0 and 0.1.1; 22 tests + build typecheck green.
- Known gaps: never runtime-tested inside Obsidian; the alias insert-style option is inert until a v0.2 alias map; the Handy Phase-1 API is unverified at runtime.

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

### 2026-11-16 — v0.1.1: deep-review fixes

Shipped the deep-review fixes as release 0.1.1: `requestUrl` now uses `throw:false` so 401/409 responses are handled, the view's `containerEl` was renamed `rootEl` per the Obsidian leaf contract, tab switches refresh only the current-note section, and 413 buffer-full responses get a distinct notice; dead settings code was removed. Repo pushed to github.com/Caffa/link-dictate-co with releases 0.1.0 and 0.1.1; 22 tests and the build typecheck are green.

Next: runtime-test the plugin inside Obsidian against a running Handy app.

https://discord.com/channels/1486966847810043924/1571844263661277194

### 2026-11-16 — v0.1.0 build + tests green

Built the plugin end-to-end, copied release scripts from `obsidian-sticky-headings-no-flicker`, wrote bun integration tests against a throwaway server, and verified `bun run build` plus `bun test`.

Next: runtime test inside Obsidian once the Handy voice-insert API is running locally.
