# EPIC-37 — Hi-Fidelity Art Direction (a Rayman-Inspired Pivot)

## Origin

From the broader vision [`docs/planning/21-OPEN-WORLD-CRAFTING-BUILDINGS-AND-IDENTITY-VISION.md`](../planning/21-OPEN-WORLD-CRAFTING-BUILDINGS-AND-IDENTITY-VISION.md) (2026-09-19): a plan to move from simple 2D pixel graphics to real hi-fidelity graphics, comparable to the newer *Rayman* games' visual polish.

## Design Intent — grounded in the real current code

**Every visual pixel in the game today is a programmatic canvas primitive.** M30's own end-to-end audit (`docs/stories/EPIC-30-hifi-skin-plugin-architecture.md`) found this true across all 8 skins, including the 3 already-shipped "hi-fi" renderer packages (`skin-diorama-glow`, `skin-flat-vector`, `skin-neon-city`): rectangles, radial gradients, and one precomputed noise pattern, drawn fresh onto a `<canvas>` texture at load time. There are zero image, sprite-sheet, or illustrated-asset files anywhere in the render path — confirmed again this session while extending all 3 packages for M32's new tile types.

**The multi-skin `SkinRenderer` plugin architecture (M30) is the direct, proven on-ramp for this pivot.** Because renderer selection is already a dynamically-`import()`ed, per-skin-package contract (`SkinRendererLoader`, `packages/skin-*`, each with its own Vite library build emitting to `apps/web/public/plugins/skins/<id>/index.js`), a hi-fi art pivot does not require touching or risking the other 8 skins — it can ship as one new flagship package, validated in isolation, exactly the same low-risk shape M30 itself used to introduce 3 new renderers without touching the original 5.

**This narrows, not contradicts, EPIC-31's existing "no engine/perspective change" non-goal.** EPIC-31 explicitly ruled out becoming a non-top-down game; this epic is about visual *fidelity* (painterly color, lighting, depth/parallax) within the existing top-down Phaser engine, not a genre or perspective change — stated explicitly here so the two epics' non-goals don't read as contradicting each other.

**Real art assets are a genuinely open production question, not a solved one.** The skin manifest schema (`skin.manifest.json`) already supports referencing external asset paths structurally, but nothing in this codebase has ever actually loaded a real image/sprite asset for gameplay rendering — every "asset" today is generated at runtime. This epic's first milestone exists specifically to answer, with a real built proof rather than assumption, whether hand-illustrated assets, a pushed-further procedural technique, or a hybrid is the right path forward.

## Scope and sequencing

Three milestones, deliberately front-loaded with the highest-uncertainty work:

- **M50 — Hi-Fi Renderer Feasibility Skin** (a small, real proof — one flagship interior or region rendered at genuinely higher fidelity than any existing skin, using whichever of the 3 art-sourcing approaches the vision doc names turns out feasible; the explicit goal is to answer the open art-production question with evidence)
- **M51 — Art Pipeline & Direction Bible** (once M50 has picked an approach, formalize it: asset format/atlas conventions if real art files are involved, a parallax/lighting-layer convention, and an actual production process others — human or AI-assisted — can repeat)
- **M52 — Flagship Hi-Fi Rollout** (apply the M51 pipeline broadly: world tiles, character/NPC art, and key UI surfaces, promoting the result toward becoming a genuine flagship skin rather than a one-off proof)

M50 is a hard prerequisite for M51 (the pipeline can't be written before an approach is proven) and M51 for M52 (rollout needs a defined pipeline to scale, not one hand-tuned proof repeated ad hoc).

## Non-Goals (epic-wide)

- **No engine rewrite, no 3D, no side-scrolling/platformer perspective change.** The Rayman reference is about fidelity, not genre — carried forward explicitly from the vision doc.
- **No forced retirement of the existing 8 skins.** This epic adds a new flagship option; solarpunk/retro_gb/aurora/etc. remain fully supported, consistent with this project's entire skin-plugin philosophy.
- **No commitment, in this epic, to a specific art-production vendor, tool, or budget.** M50 is explicitly the milestone that investigates and reports back on real options — this epic doc does not pre-decide that question.
- **No WebGL/shader-pipeline rewrite.** Any lighting/parallax technique built here works within Phaser's existing Canvas/WebGL renderer as already used, not a new rendering backend (this mirrors EPIC-30's own explicit non-goal on the same point).
- **No sandboxing requirement for future third-party art-asset plugins.** Same open, flagged (not solved) risk already named in EPIC-30 for renderer code generally — not re-solved here.
