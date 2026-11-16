---
title: Build Link Dictate Co (Obsidian voice-insert plugin)
description: >
  Managed by a kimaki routine (one-time run). Do not move or delete this file
  without also updating the routine (kimaki routine list / kimaki routine delete).
---

# Build "Link Dictate Co" — Obsidian plugin client for Handy's Voice Insert API

User Discord ID for completion mentions: `141798255112617984` (mention ONLY after meaningful work worth reviewing, or to report a blocker).

## Context (read first)

- Handy (this user's dictation app) gained a **Voice Insert API** on branch `feature/voice-insert-api` in `/Users/caffae/Local-Projects-2026/Handy-Fork/stable-handy` (see `voice_insert/server.rs` for the source-of-truth contract and `DECISIONS.md` ADR "Voice insert API"). Phase 1 is built + pushed but NOT runtime-tested against a live app — do not block on it.
- API contract (loopback only, 127.0.0.1):
  - `POST /insert` — body `{"text": "…"}` with header `Authorization: Bearer <secret>`; returns 200 `{"ok":true}` while recording, 409 `{"error":"not_recording"}`, 413 `{"error":"buffer_full"}`, 400/401/404/405 on bad input/auth/path/method.
  - `GET /state` (auth required) → `{"state":"recording"|"idle",...}`.
  - `GET /health` (no auth) → `{"ok":true,"version":1}`.
  - Token text Handy receives is inserted verbatim into the final transcription (wikilinks survive; the colored alias rendering of `[[Target|Alias]]` is Handy's job, not yours).

## Build this, in this folder

Work inside `/Users/caffae/Local-Projects-2026/Link-Dictate-Co` (this project). Scaffold an Obsidian plugin from the official `obsidian-sample-plugin` template (fetch from GitHub). Manifest: id `link-dictate-co`, name **Link Dictate Co**, minAppVersion 1.4.0, author Caffa, description "Click vault links to insert them into Handy voice dictation". Do NOT publish to the community plugin store or npm.

### Feature scope (v0.1)

1. Right-sidebar panel (register a leaf view + ribbon icon) listing links for voice dictation:
   - Top section: links present in the current note.
   - Below: **most frequently used links vault-wide**, ranked by occurrence count.
   - Data from Obsidian's `metadataCache` (`resolvedLinks` / per-file caches); compute on open, refresh debounced (≥2s), never block the UI thread on large vaults.
2. Click a link → `POST /insert {"text": "[[Target]]"}` (use `[Target|Alias]` alias form only if the user maintains an alias map in plugin settings — v0.1 may just send `[[Target]]` with Target exactly as resolved).
3. Panel state: poll `GET /state` every ~2s while visible (and `GET /health` for connectivity). Idle → muted panel; recording → accent styling. Click while 409 → Obsidian Notice "Handy isn't recording", nothing sent.
4. Plugin settings tab: Handy port (default 48213), secret (paste from Handy's Integrations pane; Handy-side vault sync comes later), "Test connection" button hitting `/health`, insert-target style choice (`[[Target]]` vs `[Target|Alias]`).
5. Persist with loadData/saveData. i18n not required (en only).

### Release scripts (explicit user requirement)

Find the user's existing Obsidian plugin development under `~/Local-Projects-2026` (hint: repos with a root `manifest.json` + release tooling, possibly `.github/workflows` release or `scripts/`), and **copy the release-script patterns from ONE existing plugin repo** into this one (version-sync script, esbuild config, GitHub Actions release workflow if that's their pattern). Cite in the final report which repo you copied from. If you find several candidates, pick the most recently updated and note the others.

### Quality gates (all must pass before you report done)

- `bun run build` (or the template's dev command) produces `main.js` + `manifest.json` (+ styles.css if used) at repo root.
- Unit tests in the repo's runnable pattern (bun is available): frequency ranking, token formatting (`[[Target]]` / alias), settings defaults.
- One integration test: throwaway bun/node mock HTTP server asserting method, `Authorization` header, `/insert` body shape, and 409 handling. Do NOT hit the real Handy.
- `git` initialized; commits tiny + atomic with conventional prefixes; push to GitHub: create `Caffa/link-dictate-co` via `gh` (match the visibility of the user's other plugin repos if determinable, else private and note it). End every commit message with the Discord thread URL of the routine session that did the work.
- Create `BLUEPRINT.md` at the repo root (template: `~/.opencode/skills/visual-explainer/scripts/blueprint-template.md`).
- End-of-session: delegate to the `blueprint-keeper` subagent per house rules.

### Out of scope (do not build now)

- Vault/secret sync from Handy's side (Phase 3, Handy repo), alias-map maintenance UI beyond the settings toggle, community-store submission, publishing, mobile support.

## Completion criteria

Post a final report in the thread: what was built, which existing repo the release scripts came from, test results, push/GitHub URLs, and honest gaps (runtime-vs-Obsidian verification you could not do). Then mention the user ID above.

## Reconsider when

- Handy's API contract changes (check `voice_insert/server.rs` on `feature/voice-insert-api`).
- User asks for per-vault secret sync (Phase 3) or community-store release.
