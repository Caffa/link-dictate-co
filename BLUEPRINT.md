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

- Latest release 0.5.1: the current-note and same-folder sections merge into one when both toggles are on (current-note links prioritized by folder count, `fromCurrent` marker); alias display mode setting `all` | `used` (default `used` — only aliases actually used as `[[Target|Alias]]` in the current note or same folder, via a metadataCache links scan); clickable alias hover styling; filter-trimmed display names (`trimFilterFromBasename`, display-only). 0.5.1 fixed a review-caught regression where same-folder-only panels showed the "No links yet" hint under a populated list.
- Link Colorer integration migrated to the official public API (`src/linkcolor-api.ts`) introduced in link-colorer 2.1.0. The plugin defensively polls `app.plugins.plugins['link-colorer']?.getApi()` and `window.linkColorerApi`, validates the API shape (`version === 1`, `isReady`, `getColorForLink`, `getColorsForLinks`), and asks the host for colors directly instead of replicating its hash/palette pipeline. Per-link text is prepared as the target path with `.md` stripped and URI-decoded; the host handles its own normalization and theme-aware slot logic. Colors are applied to the main row span and alias sub-rows with the same four CSS properties as before. Refresh is triggered by the host's `link-colorer:recolor` workspace event and Obsidian's `css-change`; no onRecolor subscription is required because the workspace event is the maintained surface. User context: link-colorer is installed-but-disabled in Novel-Writing (only ZettelPublish has it enabled) and lazy-plugins delays plugin startup 5–15 s, so panel colors appear only after lazy load + panel refresh.
- Core flow unchanged: row click POSTs `{"text":"[[Target]]"}` with Bearer auth to `127.0.0.1:<port>/insert`, `/state` polled ~2 s for idle/recording styling; per-section toggles, same-folder aggregation (v0.2.x), basename display with collision suffixes (v0.3.x), and the v0.4.0 link filter (applied after ranking, before alias/collision/color treatment) all intact.
- 111 bun tests pass, build/typecheck green; deployed to Novel-Writing, ZettelPublish, and Journal via `sendToNovelVault.sh`; vault-wide top-25 aggregation still 6–12 ms on the 13k-file Novel-Writing vault.
- Unverified in Obsidian: all 0.5.x UI changes at runtime; also the color match against live link-colorer rendering and the Handy Phase-1 API; "relevant links" (2-hop) section still future.

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
- `src/display.ts` holds basename/collision/alias row helpers; `src/linkcolor-api.ts` wraps the official Link Colorer public API for panel colors.
- `src/settings.ts` provides the Obsidian `SettingTab` UI.

## Log

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
