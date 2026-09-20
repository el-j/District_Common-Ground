# M51 — Art Pipeline & Direction Bible

Story: [`docs/stories/EPIC-37-hifi-art-direction-rayman-pivot.md`](../stories/EPIC-37-hifi-art-direction-rayman-pivot.md)

Planning: [`docs/planning/21-OPEN-WORLD-CRAFTING-BUILDINGS-AND-IDENTITY-VISION.md`](../planning/21-OPEN-WORLD-CRAFTING-BUILDINGS-AND-IDENTITY-VISION.md) — Pillar 5.

Status: **Implemented.**

Companion doc: [`docs/planning/22-HIFI-ART-PIPELINE-AND-DIRECTION-BIBLE.md`](../planning/22-HIFI-ART-PIPELINE-AND-DIRECTION-BIBLE.md) — all 3 sections below are written there; this task doc records what was decided and why.

## Section 1 — Asset format & atlas conventions (if M50 chose a real-art-asset approach)

- [x] **N/A, explicitly recorded rather than silently skipped.** M50 found only the procedural-canvas approach feasible in this environment (no image-generation tool available, no licensed art source) — there is no real asset file to define a format for yet. The bible's §1 states this plainly and leaves the atlas/format convention as an intentionally open slot for whenever a real illustration pipeline becomes available, rather than speculatively designing a format against tooling that doesn't exist. `skin.manifest.json`'s `assetMap` field already exists structurally (vestigially populated by every hi-fi skin since M30) and needs no schema change either way.

## Section 2 — Parallax & lighting-layer convention

- [x] Documented in the bible's §2, extracted directly from what `skin-painterly-depth` (M50) actually built, not designed in the abstract: a 5-stop painted-fill convention (§2.1), per-tile ambient occlusion + whole-canvas depth vignette with the vignette's parallax limitation explicitly flagged as M52's inherited forward dependency (§2.2), and a fixed top-left light source with 3-tone shading + rim light (§2.3). The fixed light-source direction is called out specifically as the piece that matters once multiple hi-fi packages might render in the same scene — inconsistent shadow directions across packages would read as a visible defect.

## Section 3 — Production process documentation

- [x] Written as the bible's §3: the exact scaffold → apply-conventions → register-at-4-points → add-to-build-step → verify → review-criterion sequence, generalized from how `skin-painterly-depth` and the 3 M30 packages were actually built (not a new process invented for this doc). §3 step 5 explicitly calls out that any milestone touching `apps/api/internal/theme/handler.go` requires the live Docker-stack verification M50 just performed, not just a frontend dev-server check — carrying that verification-rigor lesson forward as a named process step, not something each future milestone has to rediscover. §3 step 6 sets a moving-bar review criterion (clear the *most recent* flagship, not just M30's original bar).

## Architecture notes / non-goals

See [EPIC-37](../stories/EPIC-37-hifi-art-direction-rayman-pivot.md)'s epic-wide non-goals — no WebGL/shader-pipeline rewrite; this stays within Phaser's existing renderer. Confirmed upheld: no engine code was touched this milestone at all — purely documentation, consistent with the epic's own "no engine/perspective change" framing.

## Verification

1. `cd apps/web && npx tsc --noEmit` — clean (no code changed this milestone; ran to confirm no incidental regression).
2. `cd apps/web && npx vitest run` — 591/591, unchanged from M50 — no new manifest fields were introduced (Section 1 is N/A), so no new palette-fallback tests were needed.
3. `cd apps/web && npx oxlint src/` — clean, same pre-existing non-blocking warning.
4. This milestone is purely documentation/convention, exactly as scoped — no manifest-schema extension was made, so there is nothing new for existing skins to fail to load; confirmed via the unchanged `vitest run` count above rather than a redundant live check.
