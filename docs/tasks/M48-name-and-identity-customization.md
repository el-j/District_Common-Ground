# M48 — Name & Identity Customization

Story: [`docs/stories/EPIC-36-character-origin-family-and-identity.md`](../stories/EPIC-36-character-origin-family-and-identity.md)

Planning: [`docs/planning/21-OPEN-WORLD-CRAFTING-BUILDINGS-AND-IDENTITY-VISION.md`](../planning/21-OPEN-WORLD-CRAFTING-BUILDINGS-AND-IDENTITY-VISION.md) — Pillar 4.

Status: **Implemented 2026-09-19.**

## Section 1 — Name input

- [x] `player.name: string` added to `GameState`, defaulting to the template's classRole flavor name (Pip/Morgan/Arthur — the pre-M47 archetype names) when left blank. New `sanitizePlayerName()` in `actions.ts`: strips control characters, collapses whitespace, trims, caps at 40 characters — no real-name requirement, no external validation.
- [x] A text-input step (`#cs-name-input`, a stable id per this project's modal conventions) in the origin flow, inserted exactly where M47's own doc comment said it would slot in: between the family-pick and confirm steps.
- [x] **A real, correctly-identified defensive-merge requirement, not a precautionary one:** `player.name`/`gender`/`genderSelfDescribe`/`appearance` are new fields on the *already-existing* `player` nested slice — the genuine unsafe case `useGameStore.test.ts` (M38) proved zustand's shallow-merge `setState()` does **not** protect (every other new field added since M38 landed as a brand-new top-level slice specifically to avoid this). `persistence.ts`'s `loadSave()` now defensively merges `player` against `INITIAL_STATE.player` for real, proven by a new `persistence.test.ts` (this project's first ever test for that file).

## Section 2 — Inclusive gender-identity selector

- [x] `player.gender: GenderIdentity` (`'woman' | 'man' | 'non-binary' | 'prefer-not-to-say' | 'self-describe'`) plus `player.genderSelfDescribe?: string` carrying free text only when `gender === 'self-describe'` — genuinely respects "can also be diverse," not a cosmetic reskin of a binary choice. Purely a data/flavor field: no gameplay branches on it anywhere, and the doc comment on the type itself says so explicitly to prevent future misuse as a gating mechanism.

## Section 3 — Appearance token, resolved via the skin architecture

- [x] `player.appearance: AppearanceToken` (`'APPEARANCE_TONE_1'`..`'APPEARANCE_TONE_4'`) — an abstract token only, never a hardcoded hex value in game logic. **Scope decision, recorded not silent:** resolving this token inside each skin's real `createPlayerTexture()` would mean extending the `SkinRenderer` contract (M30) and updating all 8 existing skin packages — a substantially bigger lift than this milestone's "data field + selection UI" scope. Every skin currently falls back to its single existing player texture regardless of which token is chosen — the "documented default per skin" EPIC-36's own non-goals explicitly allow, taken to its honest conclusion (every skin uses the fallback today). Wiring real per-token rendering is a tracked forward dependency, not built here.

## Architecture notes / non-goals

See [EPIC-36](../stories/EPIC-36-character-origin-family-and-identity.md)'s epic-wide non-goals — no identity verification, no requirement every skin supports every appearance token on day one. `CharacterSelect.ts`'s flow is now `family → identity → confirm` (3 steps, exactly as M47's own forward-looking design predicted); the confirm step's title now reads "{name}, of {familyName}" instead of just the family name. `TopHUD.ts`'s top-left badge (previously a fixed classRole-letter badge) now shows the player's own chosen name's first letter with a full-name tooltip — a real, minimal, tested "HUD reflects the chosen name" wire-up, closing what the doc's own live-check named. **Scope note, recorded not silent:** NPC dialogue text itself (`NpcDialogues.ts`) still never addresses the player by name — every tree is pre-authored, fixed narrative text; wiring `player.name` into that content would mean rewriting dialogue across the whole existing roster, well beyond this milestone's "add the identity fields + selection UI + one real display surface" scope. `oxlint` flags `sanitizePlayerName()`'s control-character regex with a non-blocking warning (`no-control-regex`, exit code still 0) — a deliberate pattern (the whole point is stripping those characters), not a mistake to silence with an unclear suppression directive this codebase has no existing precedent for.

## Verification

1. `cd apps/web && npx tsc --noEmit` — clean.
2. `cd apps/web && npx vitest run` — 582/582 passing (16 new: `actions.test.ts`'s `sanitizePlayerName`/`setPlayerName`/`setPlayerGender`/`setPlayerAppearance` blocks, `persistence.test.ts` (new file, the defensive-merge proof for both the old-save and real-save cases), `CharacterSelect.test.ts` expanded for the 3-step flow (identity-step rendering, self-describe reveal/hide, full begin-flow asserting name/gender/appearance all land, blank-name fallback), `TopHUD.test.ts`'s new player-name-badge block). Fixed 10 pre-existing test files' hand-written `player` object-literal fixtures (now type-checking against the 3 new required fields) — a mechanical, non-behavioral fix required by making the fields real and required, not optional.
3. `cd apps/web && npx oxlint src/` — clean (exit 0; one non-blocking warning, see Architecture notes).
4. `cd apps/web && npm run build` — clean production build (160 modules).
5. Live via the Vite dev server (no Docker rebuild needed — no backend changes this milestone): confirmed all changed/new source files return HTTP 200. Full interactive origin-flow walkthrough (custom name/gender/appearance, confirming the HUD badge reflects the chosen name) stays manual — no headless browser available, the same limitation noted for every prior visual/interaction milestone.
