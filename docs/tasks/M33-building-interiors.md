# M33 — Real Building Interiors

Story: [`docs/stories/EPIC-31-world-hud-progression-overhaul.md`](../stories/EPIC-31-world-hud-progression-overhaul.md)

Planning: none new under `docs/planning/` — scoped ad hoc from a direct user complaint ("buildings are all empty nothing inside"), grounded by an Explore-agent audit of `InteriorProps.ts`/`WorldScene.ts`'s interior-rendering code before writing this doc.

Status: **Superseded 2026-09-19** by [EPIC-34](../archive/EPIC-34-buildings-as-plugins-and-interiors.md)'s M41/M42 — kept in `docs/tasks/` (not archived) so the as-planned-vs-as-shipped delta stays inspectable. See `docs/TASK-STATUS.md`'s Milestone Overview.

## Section 1 — Resolve the interior-isolation design question

`apps/web/src/world/WorldScene.ts` (`renderInteriorProps()`, `updateInteriorFraming()`) + `apps/web/src/world/InteriorProps.ts`:
- [ ] Before extending content, decide the rendering approach: (a) keep today's shared-tilemap prop-overlay pattern (props drawn over the same tilemap, camera pans/zooms toward the building — cheap, consistent with current architecture), or (b) build true interior isolation (a camera-bounded room that visually hides the exterior — e.g. a second interior-only tilemap layer, or a full-viewport opaque interior fill drawn on entry). Investigate Phaser camera-bounds/layer feasibility as the first concrete step of implementing this section; default to (a) unless (b) proves cheap to add, and record the decision + reasoning in this doc before proceeding to Section 2.

## Section 2 — Extend interiors to all 14 buildings

`apps/web/src/world/InteriorProps.ts` (`INTERIORS`, currently 3 entries) + `apps/web/src/world/WorldScene.ts`:
- [ ] Add interior definitions for the remaining 11 building footprints (Ticket booth, Cargo dock shell, High-Rise/Corporate Block, Utility Station, Apartment Block A, Apartment Block B, Corner Grocer, East Canal community building, Flood management office, Solar building A, Solar building B — cross-check the exact current list against `buildMap()`'s `drawBuilding()` calls before finalizing names/IDs).
- [ ] Give each a small set of role-appropriate props using the existing colored-rectangle prop-drawing technique (`renderInteriorProps()`): e.g. Corner Grocer gets shelves/a register counter, apartments get a bed/table, the Corporate Block gets desks/a reception counter, the Utility Station gets control-panel props, Solar buildings get panel-rack props.
- [ ] Confirm `updateInteriorFraming()`'s camera pan-to-center logic generalizes cleanly to all 14 footprints (different sizes/aspect ratios) without per-building special-casing beyond data (prop list + room bounds).

## Architecture notes / non-goals

See [EPIC-31](../stories/EPIC-31-world-hud-progression-overhaul.md)'s epic-wide non-goals. No new art assets (same procedural colored-rectangle/shape technique as the 3 existing interiors); no NPC-placement or quest-content changes here (that's M35's job, though M35 may reference specific interiors added here as quest locations).

## Verification

1. `cd apps/web && npx tsc --noEmit` — clean.
2. `cd apps/web && npm test` — full suite green; new tests confirming all 14 buildings now resolve an interior prop set (not just the original 3).
3. `cd apps/web && npx oxlint src/` — clean.
4. Live via `make dev-d`: walk into each of the 14 buildings and confirm each now shows distinct, role-appropriate interior props instead of empty floor; confirm the camera-framing/isolation approach chosen in Section 1 works consistently across all 14 regardless of footprint size.
