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
updated: 2026-11-17
discord_channel: https://discord.com/channels/1486966847810043924/1571844263661277194
---

## Where it stands

- v0.3.0 released: panel rows now show the note basename instead of the full path, display a faint parent-folder suffix when basenames collide inside a section list, and expose nested alias sub-rows under each link. The alias insert-style now works via frontmatter aliases. Link Colorer integration replicates the live plugin's color pipeline (hash, prefix stripping, least-used palette slot, HSL jitter) and applies matching inline colors to main rows and aliases; panel refreshes on `css-change`.
- v0.2.1 released: right-sidebar sections are individually toggleable (showCurrentNote/showSameFolder/showVaultWide, all default on) and there's a new "Links in same folder" panel section — exact-directory aggregation ranked by count, refreshed on tab switch.
- Same-folder aggregation counts links only from files in the active note's directory, excluding the note itself; the no-active-file edge case (vault-root links leaking in) is fixed.
- Performance checked at scale: vault-wide top-25 aggregation is 6–12 ms at the 13k-file Novel-Writing vault — the toggles are a workflow choice, not a perf one.
- Clicking a row POSTs `{"text":"[[Target]]"}` with Bearer auth to `127.0.0.1:<port>/insert`; `/state` polled ~2 s styles the panel idle/recording. Deployed to Novel-Writing, ZettelPublish, and Journal vaults via `sendToNovelVault.sh`; 32 tests green.
- Known gaps: never runtime-tested inside Obsidian; the alias insert-style option is inert until a v0.2+ alias map; the Handy Phase-1 API unverified at runtime; "relevant links" (2-hop) section for Zettelkasten still future.

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

### 2026-11-17 — v0.3.0: basename display, aliases, and Link Colorer colors

Redesigned panel rows to show basenames with `.md` stripped, added a muted parent-folder collision suffix when a section list contains multiple targets with the same basename, and added nested alias sub-rows that insert `[[Target|Alias]]` on click. The main row now uses the first frontmatter alias when `insertStyle` is `alias`, so the setting is no longer inert. Added Link Colorer integration (`src/colorer.ts` + `src/colorer-palettes.ts`) that replicates the live plugin's djb2-variant hash, recursive prefix stripping, least-used palette slot, and HSL jitter; it defensively reads the link-colorer instance's settings and usage stats, and bails to the default panel text color if anything is missing. Registered the `css-change` workspace event to refresh the panel when the user re-rolls colors. Added `src/display.ts` helpers and tests; total test count is now 65, with `bun run build` and `bun run typecheck` green. Released 0.3.0 and deployed to Novel-Writing, ZettelPublish, and Journal vaults via `sendToNovelVault.sh`.

Next: runtime-test the new row display and color integration inside Obsidian against the user's actual Link Colorer setup; verify the replicated colors match the reading-view colors for a few sample notes.

https://discord.com/channels/1486966847810043924/1571844263661277194

### 2026-11-16 — v0.2.0/v0.2.1: per-section toggles + same-folder links

Added per-section settings toggles and a new "Links in same folder" panel section (exact-directory aggregation, ranked by count) after measuring vault-wide top-25 aggregation at 6–12 ms on the 13k-file Novel-Writing vault — negligible, so the toggles are about workflow choice rather than speed. Released 0.2.0, then fixed the no-active-file edge (vault-root links were showing under "Same folder") and excluded the current note from its own same-folder aggregation in 0.2.1. Deployed to Novel-Writing, ZettelPublish, and Journal vaults via the new sendToNovelVault.sh (pattern copied from obsidian-sticky-headings-no-flicker); 32 bun tests passing. Releases: https://github.com/Caffa/link-dictate-co/releases/tag/0.2.0 and https://github.com/Caffa/link-dictate-co/releases/tag/0.2.1.

Next: runtime-test inside Obsidian; add the "relevant links" (e.g. 2-hop) section for Zettelkasten.

https://discord.com/channels/1486966847810043924/1571844263661277194

### 2026-11-16 — v0.1.1: deep-review fixes

Shipped the deep-review fixes as release 0.1.1: `requestUrl` now uses `throw:false` so 401/409 responses are handled, the view's `containerEl` was renamed `rootEl` per the Obsidian leaf contract, tab switches refresh only the current-note section, and 413 buffer-full responses get a distinct notice; dead settings code was removed. Repo pushed to github.com/Caffa/link-dictate-co with releases 0.1.0 and 0.1.1; 22 tests and the build typecheck are green.

Next: runtime-test the plugin inside Obsidian against a running Handy app.

https://discord.com/channels/1486966847810043924/1571844263661277194

### 2026-11-16 — v0.1.0 build + tests green

Built the plugin end-to-end, copied release scripts from `obsidian-sticky-headings-no-flicker`, wrote bun integration tests against a throwaway server, and verified `bun run build` plus `bun test`.

Next: runtime test inside Obsidian once the Handy voice-insert API is running locally.
