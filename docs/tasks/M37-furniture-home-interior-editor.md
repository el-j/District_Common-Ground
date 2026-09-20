# M37 — Furniture / Home Interior Editor

Story: [`docs/stories/EPIC-32-home-and-housing.md`](../stories/EPIC-32-home-and-housing.md)

**Depends on M36** (`docs/tasks/M36-housing-rental-system.md`) — this milestone needs `housing.currentFlatId` to know which interior the player is editing. Do not start before M36 lands.

Planning: none new under `docs/planning/` — scoped ad hoc from the same user request as M36 ("a 'home-mode' to adjust the furniture and what is in the flat"), grounded by an Explore-agent audit of `InteriorProps.ts`/`WorldScene.ts`'s prop-rendering code and `DistrictGrid.ts`'s existing placement-UI pattern, plus a Plan-agent design pass, before writing this doc.

Status: **Superseded 2026-09-19**, absorbed whole into [EPIC-34](../archive/EPIC-34-buildings-as-plugins-and-interiors.md)'s M43 (furniture sourced from EPIC-33's crafting system instead of a fixed catalog) — kept in `docs/tasks/` (not archived) so the as-planned-vs-as-shipped delta stays inspectable. See `docs/TASK-STATUS.md`'s Milestone Overview.

## Section 1 — Prerequisite: redraw/destroy capability for interior props

`apps/web/src/world/WorldScene.ts` (`renderInteriorProps()`, `:1211-1236`):
- [ ] Add a stored, destroyable structure for interior-prop game objects — modeled on `updateWorldDressing()`'s existing `dressingSprites: Phaser.GameObjects.Rectangle[]` array (`WorldScene.ts:409`, populated/cleared at `:1194-1195, 1207`) — since `renderInteriorProps()` currently draws one-shot rectangles with no stored references and therefore has no way to destroy/redraw props at all.
- [ ] Scope this redraw capability to just the player's currently-rented flat (via `housing.currentFlatId`), not all 14 building interiors — generalizing it to every interior is EPIC-31's M33's job, if/when that milestone lands.
- [ ] Cross-reference M33 at implementation time: if M33 has landed, reuse its interior definitions and shared-overlay-vs-isolation rendering decision for the two housing buildings as-is; if not, this section adds the minimal missing interior definition for Apartment Block B only (Block A's `pipsCourierRoom` already exists in `InteriorProps.ts:51-61`) rather than attempting the full 14-building sweep.

## Section 2 — Player-furniture state slice

`apps/web/src/core/state/useGameStore.ts` + `apps/web/src/core/state/persistence.ts`:
- [ ] Add `housing.furniture: PlacedFurniture[]`, where `PlacedFurniture` extends `InteriorProps.ts`'s existing `PropPlacement` shape (`{token, x, y}`) with an `instanceId: string` (multiple placed instances of the same token are now allowed, unlike the fixed one-per-slot `INTERIORS` registry) and a `flatId: HousingOptionId` (open decision below: furniture keyed by flat id vs. single current-flat-only state — default to keyed-by-flat, so layouts persist across a later flat switch, unless implementation reveals a strong reason not to).
- [ ] Apply the same defensive-merge treatment as M36 Section 1 in `persistence.ts`'s `loadSave()` for pre-M37 saves missing this field.
- [ ] On first move-in to a flat with no `PlacedFurniture` entries yet, seed a starter set from that building's existing `INTERIORS` entry (Block A's `pipsCourierRoom` already has 4 props to seed from; Block B needs its minimal starter interior from Section 1 first).

## Section 3 — Furniture catalog and placement UI

New `apps/web/src/core/simulation/FurnitureCatalog.ts` + new `apps/web/src/ui/FurnitureEditorModal.ts`:
- [ ] `FurnitureCatalog.ts`: a small fixed list of `{token: FurnitureToken; label: string; cost: number}` entries, purchasable items the player can add to their current flat.
- [ ] `FurnitureEditorModal.ts`: reuse `DistrictGrid.ts`'s existing select-slot-then-confirm interaction (`DistrictGrid.ts:203-206, 291-310`) rather than building freeform drag-and-drop — divide the current interior's `InteriorDefinition.rect` into a small fixed number of placement slots; clicking an empty slot surfaces a catalog picker ("Place here"), clicking an occupied slot surfaces "Remove."
- [ ] Buying an item spends cash via the existing `spendCash()` (`actions.ts:37-41`); placing/removing an already-owned item is a pure edit of the `housing.furniture` array — no additional cash cost to rearrange owned items.
- [ ] Close via `bindEscapeClose()` (`modalDismiss.ts`), matching every other closable modal.

## Section 4 — Architecture-gap decision (scoped narrowly)

`apps/web/src/skins/SkinInterface.ts` / `skin.manifest.json` + new `FurnitureToken` type:
- [ ] New `FurnitureToken`s introduced by this milestone resolve their `{w,h,color}` (or equivalent render spec) via `skin.manifest.json`'s `assetMap`, following the existing `EntityToken` skin-resolution pattern in `ThemeManager.ts` — correct here because player-editable furniture makes previously-static prop colors newly player-visible/interactive, raising the cost of leaving them hardcoded.
- [ ] Explicitly do **not** retrofit the pre-existing `PropToken` (`InteriorProps.ts`) or `DressingPropToken` (`ResilienceDressing.ts`) hardcoded-color patterns elsewhere in the codebase — that is a separate, out-of-scope legacy-cleanup task, named here so it isn't mistaken for something this milestone silently left inconsistent.

## Section 5 — Live redraw wiring

`apps/web/src/world/WorldScene.ts`:
- [ ] Add `refreshInteriorFurniture(flatId)`, using Section 1's stored sprite references to destroy and redraw only the affected flat's props, modeled directly on `updateWorldDressing()`'s existing tier-swap redraw logic (`WorldScene.ts:1190-1209`).
- [ ] Wire the editor's add/remove/move actions to call this via the same store-subscription pattern already used elsewhere (e.g. `TopHUD.ts:164`) so furniture changes are visible live in the world without a page reload.

## Open design decisions (record resolution here when implemented)

- `housing.furniture` keyed by flat id (retains layouts across a later flat switch — the default assumption above) vs. single current-flat-only state.
- Whether furniture should carry its own stat effects (stacking on M36's flat-level tradeoffs) — default for v1 is **cosmetic-only**, since the user's "positive and negative things for health" language was about the housing choice itself, not furniture; revisit only if explicitly requested.
- Whether to generalize Section 1's redraw capability to all interiors now (useful groundwork for M33) or keep it scoped narrowly to the player's own flat as written above.

## Architecture notes / non-goals

See [EPIC-32](../stories/EPIC-32-home-and-housing.md)'s epic-wide non-goals. No freeform drag-and-drop. No retrofit of the pre-existing `PropToken`/`DressingPropToken` architecture gap outside the new furniture system. No new interior-isolation work — reuses whatever M33 decides, or the existing shared-overlay approach if M33 hasn't landed. No furniture-driven stat effects in v1.

## Verification

1. `cd apps/web && npx tsc --noEmit` — clean.
2. `cd apps/web && npm test` — full suite green; new tests for `FurnitureCatalog` data validity, a `housing.furniture` state-slice test mirroring `DistrictGrid.test.ts`'s pure-logic-class style (seeded via `useGameStore.setState()`, no DOM assertions), and a redraw test asserting old sprite references are destroyed before new ones are created on `refreshInteriorFurniture()`.
3. `cd apps/web && npx oxlint src/` — clean.
4. Live via `make dev-d`: rent a flat (M36), open the furniture editor, buy an item, place it in an empty slot, remove/relocate an existing item, confirm the world view updates live with no reload; reload the page and confirm the layout persists; switch to a different flat and confirm the original flat's layout is preserved (per the keyed-by-flat-id default) while the new flat starts from its own seeded/starter state.
