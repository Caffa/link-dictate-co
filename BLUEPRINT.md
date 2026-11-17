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

- v0.3.0 + v0.3.1 released after a Discord user request: panel rows show the note basename with the path hidden (faint grey parent-folder suffix only when two targets in the same list share a basename), plus nested frontmatter-alias sub-rows — an alias click always inserts `[[Target|Alias]]`, the main row follows the insert-style setting, so no manual alias map is needed.
- Link Colorer integration (`src/colorer.ts` + `src/colorer-palettes.ts`) replicates the user's own link-colorer plugin pipeline — djb2 seed hash, prefix strip, least-used palette slot with scoped usage normalization, HSL jitter — reads live instance settings via `getColorUsageStats`, applies inline `--link-color` styles, refreshes on `css-change`, and falls back to the default text color when the plugin is absent.
- The 0.3.1 fixes were found by a byte-level diff against link-colorer's main.js plus a pipeline simulation over the real vault (three color divergences + the inert-alias bug). Core flow unchanged: row click POSTs `{"text":"[[Target]]"}` with Bearer auth to `127.0.0.1:<port>/insert`, `/state` polled ~2 s for idle/recording styling, per-section toggles and same-folder aggregation from v0.2.x intact.
- 73 bun tests pass, build/typecheck green; deployed to Novel-Writing, ZettelPublish, and Journal via `sendToNovelVault.sh`; vault-wide top-25 aggregation still 6–12 ms on the 13k-file Novel-Writing vault.
- Unverified in Obsidian: the color match against the user's live link-colorer rendering and the panel redesign runtime behavior; Handy Phase-1 API also unverified at runtime; "relevant links" (2-hop) section still future.

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
- `src/display.ts` holds basename/collision/alias row helpers; `src/colorer.ts` + `src/colorer-palettes.ts` replicate link-colorer's color pipeline.
- `src/settings.ts` provides the Obsidian `SettingTab` UI.

## Log

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
