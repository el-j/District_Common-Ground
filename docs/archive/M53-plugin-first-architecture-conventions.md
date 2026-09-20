# M53 — Plugin-First Architecture Conventions

Story: [`docs/stories/EPIC-38-hub-plugin-universe-and-proximity-multiplayer.md`](../stories/EPIC-38-hub-plugin-universe-and-proximity-multiplayer.md)

Planning: [`docs/planning/21-OPEN-WORLD-CRAFTING-BUILDINGS-AND-IDENTITY-VISION.md`](../planning/21-OPEN-WORLD-CRAFTING-BUILDINGS-AND-IDENTITY-VISION.md) — Pillar 6.

Status: **Implemented.**

Companion doc: [`docs/planning/23-PLUGIN-LOADER-CONVENTIONS.md`](../planning/23-PLUGIN-LOADER-CONVENTIONS.md) — the full audit table, canonical loader shape, and Section 2's spike writeup all live there; this task doc records what was decided and why.

## Section 1 — Formalize the plugin-first convention

- [x] Added a real "Plugin-First Architecture Convention" section to `CLAUDE.md` (not just the planning doc), stating the default explicitly and naming all 3 existing loader proofs plus the `InteriorProps.ts`-style small-data escape hatch, with a pointer to the new conventions doc for the canonical loader contract.

## Section 2 — Container-hosted plugin feasibility spike

- [x] Investigated against the real `docker-compose.dev.yml`/`docker-compose.yml`/`nginx.conf` (not in the abstract): a container-hosted plugin would need its own Dockerfile + compose service (mirroring `api`'s shape) and, critically, its own reverse-proxy route in both `nginx.conf` and Vite's dev proxy — real, recurring cost today's static-bundle plugins pay zero of, since they're served straight from `public/`. It would also reopen the independently-versioned/community-code trust question EPIC-30's Non-Goals already deferred. **Conclusion, recorded honestly per this section's own instruction: not worth it yet** — none of the 3 existing plugin types (minigames, skin renderers, building interiors) do or need server-side execution or persistent state, so the cost has no matching benefit for anything that exists today. Flagged the one plausible future need (M54's proximity-visiting-over-the-mesh) as a materially different problem with its own existing infrastructure precedent (the mesh/peer-discovery layer), not a reason to build generic container-hosting now.

## Section 3 — Consistency check across existing plugin systems

- [x] Audited all 3 loaders side-by-side (full audit table in the companion doc) and found the drift is real but narrower than it first looks: `SkinRendererLoader`'s url-keyed cache is a deliberate, correct difference (a renderer bundle is genuinely anonymous — many skin ids could share one), not a bug. The two real gaps: method-naming inconsistency across all 3 (`registerLocalMinigame` vs `registerLocal`, etc.), and `BuildingInteriorLoader` never retaining manifests after `loadRemote()` (no `getManifest()`/`listInteriors()` equivalent to `MinigameLoader`'s). **Closed the manifest-retention gap for real** — added `manifests`/`getManifest()`/`listInteriors()` to `BuildingInteriorLoader`, safe because grep confirmed it has zero real call sites outside its own test file, so this is purely additive. **Left the naming divergence alone, as an explicit scope decision, not an oversight**: `MinigameLoader` and `SkinRendererLoader` both have real call sites across the app; renaming either for cosmetic consistency risks real regressions for no functional gain. The companion doc's §2 instead documents the canonical shape (unprefixed method names, always-retained manifests, id-keyed unless genuinely anonymous) that **new** loader types should follow going forward — a forward convention, not a retrofit mandate for the 3 that predate it.

## Architecture notes / non-goals

See [EPIC-38](../stories/EPIC-38-hub-plugin-universe-and-proximity-multiplayer.md)'s epic-wide non-goals — no server/phone-hosted plugin execution committed in this milestone, Section 2 is a feasibility spike only. Confirmed upheld: no new Docker service was created, Section 2 concluded "not worth it yet" honestly rather than being forced toward a shipped proof.

## Verification

1. `cd apps/web && npx tsc --noEmit` — clean.
2. `cd apps/web && npx vitest run` — 593/593 (2 new, covering `BuildingInteriorLoader`'s new `getManifest()`/`listInteriors()`/manifest-clearing-on-`unregister()` behavior), no regressions.
3. `cd apps/web && npx oxlint src/` — clean, same pre-existing non-blocking warning.
4. Section 2's spike concluded "not worth it yet" with written findings (see companion doc §3) — no container-hosted plugin proof was built, so there is nothing to confirm reachable from the dev stack; this satisfies the milestone's own stated fallback verification path.
