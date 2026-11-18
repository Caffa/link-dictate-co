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

- v0.6.1 fixes a live bug: clicking a panel row moved keyboard focus to the sidebar, so Handy pasted the mid-recording transcription into a sidebar row and it was lost. New `src/editor-focus.ts` duck-typed tracker registers the last active markdown view via the `active-leaf-change` event, and `handleInsert` refocuses that editor only on a successful insert. Sent-link dots: new pure `src/sent-links.ts` tracker (cap 6, drops oldest) shows one green dot per token accepted by Handy during the current recording, rendered next to the status pill (hover title = the token text), cleared when state polling reports not-recording, re-rendered on panel reopen so mid-recording state survives.
- Panel colors come from Link Colorer 2.1.0's official public plugin API via `src/linkcolor-api.ts` (0.6.0 replaced the 809-line reverse-engineered replica `colorer.ts`/`colorer-palettes.ts`): `pickApi` resolves `getApi()` / `window.linkColorerApi` guarded on `version === 1` + `isReady`, `getColorForLink` is called per panel refresh so colors exactly match already-rendered links by contract, and the API is re-resolved every refresh so lazy-load stays resilient; refresh triggers remain the host's `link-colorer:recolor` workspace event plus Obsidian's `css-change`.
- The 0.5.x panel UX is intact: merged current-note + same-folder section when both toggles are on (`fromCurrent` priority), alias display mode `all` | `used` (default `used`, via a metadataCache links scan), clickable alias hover styling, and filter-trimmed display names (`trimFilterFromBasename`); 0.5.1 fixed a review-caught regression where same-folder-only panels showed the "No links yet" hint under a populated list.
- Core flow unchanged: row click POSTs `{"text":"[[Target]]"}` with Bearer auth to `127.0.0.1:<port>/insert`, `/state` polled ~2 s for idle/recording styling; per-section toggles, same-folder aggregation (v0.2.x), basename display with collision suffixes (v0.3.x), and the v0.4.0 link filter (applied after ranking, before alias/collision/color treatment) all intact.
- 121 bun tests pass (including the new editor-focus and sent-links trackers), tsc + esbuild green; released 0.6.1 (e2d6284) and deployed to Novel-Writing, ZettelPublish, and Journal via `sendToNovelVault.sh`; vault-wide top-25 aggregation still 6–12 ms on the 13k-file Novel-Writing vault. Unverified in Obsidian: the 0.6.1 fixes end-to-end (refocus on link click mid-recording, dot rendering), the 0.6.0 color contract against live rendering (only ZettelPublish has link-colorer enabled; lazy-plugins delays startup 5–15 s), the 0.5.x UI changes, and the Handy Phase-1 API; "relevant links" (2-hop) section still future.

## How to run

```bash
bun install
bun run build   # typecheck + esbuild; outputs main.js
bun run test
```

## Architecture

- `main.ts` re-exports `src/plugin.ts`.
- `src/plugin.ts` loads merged settings, registers the sidebar view, ribbon icon, setting tab, and debounces metadata-cache refreshes.
- `src/view.ts` renders the current-note, same-folder, and vault-wide link sections, applies colorer colors, polls Handy state, and dispatches inserts.
- `src/handy-client.ts` is transport-agnostic (injected `Transport`) so tests never touch the real Handy app.
- `src/transport.ts` wires Obsidian's `requestUrl` for the production transport.
- `src/links.ts`, `src/token.ts`, and `src/settings-core.ts` are pure helpers with full test coverage.
- `src/display.ts` holds basename/collision/alias row helpers; `src/linkcolor-api.ts` wraps the official Link Colorer public API (`pickApi` selector) for panel colors.
- `src/editor-focus.ts` duck-types and remembers the last active markdown editor leaf (via `active-leaf-change`) so `handleInsert` can refocus it after a successful insert.
- `src/sent-links.ts` is a pure sent-link dot tracker (cap 6) for tokens Handy accepted during the current recording; `view.ts` renders the dots next to the status pill.
- `src/settings.ts` provides the Obsidian `SettingTab` UI.

## Log

### 2026-11-18 — v0.6.2: first-click fix + pending queue

v0.6.2 ships two fixes from live Handy logs. First-click bug: clicking from the editor into the panel made the panel leaf active, Obsidian fired `active-leaf-change`, and the handler rebuilt the row DOM synchronously so the browser never fired the click event. New pure `src/refresh-guard.ts` exports `shouldRefreshForLeafChange`, and `src/plugin.ts` now skips `refreshView(true)` when the newly-active leaf is the plugin's own view, so editor-to-panel clicks register. Pending queue: Handy's POST `/insert` returns 409 `not_recording` when clicked while Handy is idle; the token was dropped with only a transient notice. New pure `src/pending-links.ts` tracker (cap 5, drops oldest) queues the token, `view.ts` renders amber pending dots, and `pollState()` drains the queue once Handy reports `recording`, moving successful inserts into the green sent-link dots; unauthorized and buffer-full responses drop with the existing notices, while error/not_recording leave the token to retry next poll. Pruning expires entries after 60 s. Both trackers are unit-tested; all bun tests pass with `bun run build` green.

Next: user runtime-verify — start Handy idle, click a link (amber dot appears), start Handy recording, confirm the queued link is inserted and turns green; also verify editor-to-panel clicks work on the first try.

https://discord.com/channels/1486966847810043924/1572311227974025228

### 2026-11-17 — v0.6.1: editor refocus + sent-link dots

v0.6.1 shipped two fixes from a live debugging session: live Handy logs proved that clicking a panel row moved keyboard focus to the sidebar, so Handy pasted the mid-recording transcription into a sidebar row and it was lost (a 26-char dictation + 45-char token showed up in a sidebar row, flagged by AX paste-verify). New `src/editor-focus.ts` is a duck-typed tracker that registers the last active markdown view via the `active-leaf-change` event, and `handleInsert` refocuses that editor only on a successful insert. Sent-link dots: a new pure `src/sent-links.ts` tracker (cap 6, drops oldest) records one token per accept, renders a green dot per token Handy accepted during the current recording next to the status pill (hover title = the token text), clears when state polling reports not-recording, and re-renders on panel reopen so mid-recording state survives; both trackers are unit-tested, 121 bun tests total with tsc + esbuild green. Analytic and deep reviews passed (deep verdict SHIP, no required changes; non-blocking nits: second panel leaf repaints on poll only, and clear fires on network-blip statuses too). Released 0.6.1 (e2d6284, https://github.com/Caffa/link-dictate-co/releases/tag/0.6.1), deployed to Novel-Writing, ZettelPublish, and Journal via `sendToNovelVault.sh`.

Next: user runtime-test — start Handy recording, dictate, click a link, keep dictating, stop: transcription + `[[link]]` should land in the note and a dot should appear while recording.

https://discord.com/channels/1486966847810043924/1572199421456814152

### 2026-11-17 — v0.6.0: official Link Colorer API replaces the color replica

v0.6.0 deleted the 809-line reverse-engineered color pipeline (`colorer.ts`, `colorer-palettes.ts`, and its 27 pipeline tests) and replaced it with Link Colorer 2.1.0's official public plugin API: the new ~57-line `src/linkcolor-api.ts` resolves the API defensively (`pickApi` picks `getApi()` / `window.linkColorerApi`), guards on `version === 1` and `isReady`, and calls `getColorForLink` per panel refresh, so panel colors exactly match already-rendered links by contract — misses recompute deterministically and the API is re-resolved every refresh, keeping lazy-load resilient. The `link-colorer:recolor` workspace event and `css-change` refresh triggers are retained; no onRecolor subscription is needed. A post-migration review pass extracted the `pickApi` selector into its own tested unit, added throttled debug logging for incompatible API versions, and fixed the blueprint test count (909f159, 899d0f5, c51f3c7). 111 bun tests pass; released 0.6.0 (https://github.com/Caffa/link-dictate-co/releases/tag/0.6.0) and deployed to Novel-Writing, ZettelPublish, and Journal via `sendToNovelVault.sh`.

Next: runtime-verify inside Obsidian — panel colors vs reading view in ZettelPublish, including lazy-load timing.

https://discord.com/channels/1486966847810043924/1571844263661277194

### 2026-11-17 — v0.5.0 + v0.5.1: merged panel section, alias display mode, colorer re-verified

v0.5.0 (7 commits) merged the current-note and same-folder sections into a single section when both toggles are on (current-note links prioritized by folder count, marked with a `fromCurrent` marker), added an alias display mode setting (`all` | `used`, default `used` — only aliases actually used as `[[Target|Alias]]` in the current note or same folder, found via a metadataCache links scan), clickable alias hover styling, and display-only filter trimming (`trimFilterFromBasename` strips the matched filter substring from shown names). The colorer normalize step was re-verified byte-level against link-colorer 2.0.8 main.js (decodeURIComponent + single stripPrefixOnce + trim/lowercase, `.md` not stripped), switched to the live `getLinkColorMap` lookup with lazy-plugins load resilience, and proven equivalent 630/630 identical hex vs the ground-truth pipeline over real vault paths. A review pass caught a v0.5.0 regression — same-folder-only panels showed the "No links yet" hint under a populated list — fixed in 0.5.1; 107 bun tests pass, released 0.5.0 + 0.5.1 (https://github.com/Caffa/link-dictate-co/releases/tag/0.5.1) and deployed to Novel-Writing, ZettelPublish, and Journal.

Next: runtime-test all 0.5.x UI changes inside Obsidian (colors will only appear after lazy-plugins loads link-colorer 5–15 s in and the panel refreshes).

https://discord.com/channels/1486966847810043924/1571844263661277194

### 2026-11-17 — v0.4.0: configurable link filter

Added a user-configurable link filter so only notes whose display name or full path match a comma-separated substring list appear in the panel. Implemented as a new `linkFilters: string` setting (default empty, non-string values coerced to `""`), a "Link filter" text input placed before the Panel sections group, and two pure helpers in `src/display.ts`: `parseLinkFilters` splits/trim/lowercases the raw string, and `targetMatchesFilters` checks the lowercased target basename and full path against the filters. The filter is applied in `src/view.ts` to each section's ranked target list immediately before rendering, so alias rows, collision folder suffixes, and Link Colorer styling only run on surviving rows. Existing per-section "No links available" hints cover fully filtered sections automatically. Tests increased from 73 to 85; `bun test`, `bun run build`, and typecheck green. Released 0.4.0 (https://github.com/Caffa/link-dictate-co/releases/tag/0.4.0) and deployed to Novel-Writing, ZettelPublish, and Journal vaults via `sendToNovelVault.sh`.

Next: runtime-test the filter inside Obsidian with a live vault; verify entering "Char - " hides non-character notes across all three sections while preserving ranking.

https://discord.com/channels/1486966847810043924/1571844263661277194

### 2026-11-17 — v0.3.1: colorer matches reading view, alias rows always insert alias form

Ran a byte-level diff against the user's link-colorer main.js plus a pipeline simulation over the real vault, which caught three color divergences and the inert-alias behavior; fixed all four so colors match the reading view: read `instance.getColorUsageStats` first (falling back to `getColorUsageMap`), normalize usage counts only over the active palette/theme/seed slot keys, strip prefixes once like the live plugin, and fall back to the vibrant palette for unknown palette names. Alias sub-row clicks now bypass the `insertStyle` setting and always insert `[[Target|Alias]]`, while main rows keep the existing `insertStyle` semantics. Also deduped alias rows per target and skipped aliases that match the note basename case-insensitively, computed the basename once per row, and removed an unused `row.dataset.target`. Total tests now 73, build and typecheck green. Released 0.3.1 (https://github.com/Caffa/link-dictate-co/releases/tag/0.3.1) and deployed to Novel-Writing, ZettelPublish, and Journal vaults via `sendToNovelVault.sh`.

Next: runtime-test the updated color integration inside Obsidian against the user's actual Link Colorer setup; verify alias rows insert the alias form.

https://discord.com/channels/1486966847810043924/1571844263661277194

### 2026-11-17 — v0.3.0: basename display, aliases, and Link Colorer colors

Shipped after a Discord user request: redesigned panel rows to show note basenames with `.md` stripped (path hidden; a faint parent-folder suffix appears only when a section list contains multiple targets with the same basename), and added nested frontmatter-alias sub-rows that insert `[[Target|Alias]]` on click. The main row uses frontmatter aliases when `insertStyle` is `alias`, so the setting is no longer inert and no manual alias map is needed. Added Link Colorer integration (`src/colorer.ts` + `src/colorer-palettes.ts`) that replicates the live plugin's djb2-variant hash, recursive prefix stripping, least-used palette slot, and HSL jitter; it defensively reads the link-colorer instance's settings and usage stats, and bails to the default panel text color if anything is missing. Registered the `css-change` workspace event to refresh the panel when the user re-rolls colors. Added `src/display.ts` helpers and tests; total test count is now 65, with `bun run build` and `bun run typecheck` green. Released 0.3.0 (https://github.com/Caffa/link-dictate-co/releases/tag/0.3.0) and deployed to Novel-Writing, ZettelPublish, and Journal vaults via `sendToNovelVault.sh`.

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
