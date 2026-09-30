# Launch-Readiness Audit — 2026-09-29

**Question asked:** Is *District: Common Ground* polished, fully playable, and free of gaps, and are earning and spending correct everywhere? Can we launch it publicly?

**Short answer: No, not yet.** The codebase is clean: `tsc` has 0 errors, `oxlint` has 0 warnings, 974/974 Vitest tests pass, and `vite build` succeeds. That was re-verified today. But the **game** has launch-blocking problems in five areas:

- **The economy.** There are two unlimited money loops. Three reward paths silently throw rewards away. The honest core loop is so slow that the build nodes can't realistically be finished.
- **Persistence.** Most progress is lost if the tab closes before "End Day". The District Builder is never saved at all.
- **Mobile UX.** On a phone, the End Day button is covered by the toolbar, so the game can't progress.
- **Features that don't do what they say.** Examples: shop items do nothing, the town-hall vote texts are wrong, the civic directory is fake.
- **Ops/legal.** CI has failed on every push since at least 2026-09-17. There is no privacy policy, license or README. nginx caching will freeze plugin updates.

`comprehensive_audit_and_plan.md` scores the project "100% compliant". Those scores measured code hygiene (types, lint, unit tests), not playability or economy. This audit covers what that one didn't.

**How this audit was done:**
- Read every earning/spending path in `core/state`, `core/simulation`, `ui/`, `builder/`, `world/`, the 5 minigame packages, and the Go handlers.
- Played the game end-to-end in a real browser with Playwright, at 1366×800 and 390×844, and went through every toolbar modal. Six in-game days were played on desktop; the mobile run stopped early (see 3.1).
- Ran the full local check suite.
- Pulled GitHub Actions history with `gh run list`.

---

## 0. Severity key

| Tag | Meaning |
|---|---|
| **P0** | Launch blocker: breaks the economy or progression, loses player data, or is a legal/ops blocker |
| **P1** | Must fix before launch: visibly broken, misleading, or unpolished |
| **P2** | Should fix soon after launch: depth and quality |

---

## 1. Economy — earning and spending (the core ask)

### 1.1 Every source and sink, as the code actually behaves today

| Source (+) / Sink (−) | Amount | Limit | Where |
|---|---|---|---|
| Daily archetype income | Pip +5 × wage mult, Morgan +8 − 2 × transit, Arthur +12 | per day | `EconomyMath.ts:57-65` |
| Food upkeep | −3 × food mult (0 once Kitchen is built) | per day | `EconomyMath.ts:51-54` |
| Rent (housing) | −5 / −8 / −18 | per day | `HousingOptions.ts` |
| Work | +$15 / +$20 / +$10 for 10 / 15 / 5 energy | 1× per day | `WorkSystem.ts` |
| IRL daily quests (self-attested) | +$30, +$20, energy, trust, −stress | 3 per day, rotating | `IrlQuestSystem.ts` |
| Broadsheet "Commons Clue" | +5 energy | daily; the answer is **always** `solidarity` | `broadsheetHTML.ts:52`, `BroadsheetModal.ts:57` |
| World quests | +$15, +$25, trust… | 3 in total | `WorldQuests.ts:121-140` |
| Crisis choices | −$20 … +$100 | at most 1 per 3 days, 60% chance | `crisis_scenarios.json` |
| Town Hall votes | +$20 / −$10 … | every N days | `TownHallAssembly.ts` |
| **Minigames (5)** | **~$35–$80 per run** | **no limit, no energy gate** | `packages/minigame-*/src/*Game.ts` |
| **Craft → sell** | **up to +$73 profit per item** | **no limit, no energy or time cost** | `Recipes.ts`, `Materials.ts`, `actions.ts:435-491` |
| Scraps the cat | −$1 → −10 stress | no limit | `WorldScene.ts:897-908` |
| Construction nodes | $25 = 1%, or 20 energy = 1% | 5 nodes × 100% | `ConstructionModal.ts:106` |
| District Builder parcels | $0–$50 + 10–30 energy per stage | resets every time the modal opens (see 2.2) | `DistrictGrid.ts` |
| Buying materials | $2–$8 each | no stock limit | `RetailModal.ts`, `Materials.ts:57` |

### 1.2 P0 — Unlimited money: buy materials → craft → sell

Crafting costs no energy and no time. Materials can be bought without limit at a fixed price. Items can be sold from the HUD 🛠 button anywhere, not only at a shop. Mastery rises +1 per craft up to 10, which doubles the sell value (`Recipes.ts:96-102`, `actions.ts:452`).

| Recipe | Material cost | Profit at min mastery | Profit at mastery 10 |
|---|---|---|---|
| Upcycled Bike (mastery 3) | $23 | **+$35** | **+$67** |
| Upcycled Computer chain (tools → radio + board → computer) | $47 | +$31 | **+$73** |
| Mended Jacket | $14 | −$2 | +$10 |
| Planter Box | $7 | $0 | +$7 |
| Foraged Pouch | $13 | −$7 | −$1 (never profitable) |

Once a player learns the bike recipe, 40 bikes cost 40 clicks and earn about +$2,700. That is enough to fund a whole construction node in one sitting, which makes the rest of the economy pointless.

### 1.3 P0 — Unlimited money: minigames

All 5 minigames call `host.grantRewards({cashDelta, …, energyDelta: -5})`. Nothing checks energy before a game starts (`WorldScene.launchWorldMinigame`, `MinigameLoader.launchMinigame`). Energy loss is clamped at 0, so at 0 energy a run is completely free. There is no daily cap or cooldown. Payouts per run:

- Tenant Match: `pairsFound*6 + 30`
- Solidarity Line: `defeated*5 + 25`
- Courier Rush: `deliveries*8`
- and so on

That is 3–5× a whole day of Work, every 1–2 minutes.

### 1.4 P0 — Rewards that are silently thrown away

1. **Minigame and District Builder resilience rewards are lost.** Both call `updateCommonsProgress('resilienceScore', x)` (`HostPlatformAPI.ts:36-38`, `DistrictGrid.ts:112`). That function writes the bonus and then, on the same line, **overwrites `resilienceScore` with `computeResilienceScore(kitchen, solar, legal)`** (`actions.ts:217-239`). The bonus is never applied. It also runs the "node completed" and world-quest logic for a key that isn't a node.
2. **The first build contribution crashes resilience from 20 → 0.** `INITIAL_STATE.commons.resilienceScore = 20` (`useGameStore.ts:236`). The first contribution recomputes the score as `round(progress/3)`, which is 0. A player's first good deed flips the world into "emergency" visuals. For the same reason, every crisis `resilienceDelta` (±10–30) is erased by the next contribution. Resilience has two owners that disagree: crises nudge it directly, and contributions recompute it from scratch.
3. **Positive crisis energy is ignored.** `resolveCrisis` only applies `energyDelta < 0` (`CrisisEngine.ts:148`). Four choices show "+5/+10 Energy" on their card and grant nothing: `heat-dome-crisis` A, `sanctuary-council-vote` A, `division-march` A, `precarious-reclassification` A.

### 1.5 P0 — Spending that isn't enforced, or overcharges

- **Construction over-charges.** At 99% progress, contributing $500 takes all $500 and adds 1% (`ConstructionModal.ts:105-111`). There is no refund and no cap on the input. The input also accepts fractions like "12.5", which leaves cash and energy non-integer.
- **The "upfront energy cost" of solidarity isn't enforced.** Crisis costs go through `spendEnergy`, which clamps at 0. At 0 energy every solidarity choice is free. The same happens with rent, food and crisis cash costs, all clamped at 0 (`actions.ts:183`). **Being broke costs nothing:** rent debt disappears.
- **Scapegoating has a hidden extra −15 trust** (`CrisisEngine.ts:179-180`) that the choice card never shows. Solidarity has a hidden +30% build speed and a Greenhouse unlock that the card also never shows.
- **Crisis cards colour stress backwards.** `+8 Stress` shows as a green "positive" chip with 😟, and stress relief shows as red (`CrisisWireModal.ts:39-47`). Confirmed on screen.

### 1.6 P0 — The honest core loop can't be finished

With no exploits, the math is:

- **Pip:** +5 income −3 food −5 rent = −$3/day. Work (+$15) is possible roughly every other day because energy is net +5/day vs. 10 per work shift. That comes to about **+$5–10/day**.
- **One node** needs $2,500, or $1,560 with the maximum solidarity buff. That is **~150–300 in-game days per node**, and there are 5 nodes. The "Safe Haven" ending (Land Trust at 100%) is out of reach.
- **Morgan:** energy regen 5 − upkeep 10 = −5/day, starting at 40. Morgan hits 0 energy around **day 8 and stays there**, so can never work again (a shift costs 15). With 0 energy, solidarity choices then cost nothing (see 1.5).
- **Arthur:** starts with $1,200 and makes +$9/day. Half a node on day 1. There is no challenge.
- **The first NPC quest locks the player in.** Mira (near spawn) gives "fund the kitchen to 50%" (= $1,250). Only one world quest can be active, and there is no way to abandon it (`actions.ts:294-297`). The other two quests stay locked for hundreds of days.

`BalanceSimulator.ts` only sweeps the passive daily tick. It never models Work, quests, construction, crafting or minigames, so it could not have caught any of this.

### 1.7 P1 — Stats with no consequences

- **Stress** only changes the HUD colour (`TopHUD.ts:388`). Nothing happens at 100%. In the Playwright run Pip went 60% → 75% in 6 days. Rent choices, Scraps, and "stress" rewards therefore do nothing.
- **Energy at 0** only blocks Work. Every other action still works (see 1.3 and 1.5).
- **Cash at 0** has no effect. There is no fail state and no debt.
- **Housing is a pure loss.** A flat costs $5–18/day, and its benefits (energy, stress) either don't matter or are tiny. Having no home is the best economic choice.
- **Shop (Solidarity Tokens):** purchased items (`solar_facade_mural`, `pip_courier_cap`, …) are never read by the game. The client only calls `getInventory` to show "Owned". Players pay for nothing.
- **District Builder "harvest"** only calls `console.info` (`DistrictBuilderModal.ts:48-50`).
- **Town Hall vote texts don't match their effects** (`TownHallAssembly.ts:14-52`):
  - "Energy cost" → no energy is spent.
  - "Speeds construction for everyone" → no build effect.
  - "commons stall" → no effect.
  - `loseTrust(0)` is dead code.

### 1.8 P1 — Money-adjacent server issues (online play)

- **Unlimited Solidarity Tokens.** `POST /irl/deeds` has no rate or daily limit. `verificationMethod: "peer"` is taken from the client and trusted, and pays 50 ST (`apps/api/internal/irl/repository.go:53-58`).
- **Caravans and trades trust client-side amounts.** The server only checks `amount > 0` (`social/handler.go:127`). A modified client, or a second account, can send any amount of cash or energy.
- **No rate limiting anywhere.** Login and register run bcrypt at cost 12 with no throttle, which is a CPU-exhaustion and brute-force risk. `auth/handler.go` decodes request bodies with no size limit.

---

## 2. Persistence and save integrity

| # | Sev | Finding | Evidence |
|---|---|---|---|
| 2.1 | **P0** | **Saves only happen on End Day.** Crafting, purchases, pickups, quests, construction contributions and crisis choices made during a day are **lost if the tab closes or crashes**. Reloading mid-day also lets players save-scum a crisis choice (the crisis stays active in the saved state). There is no `visibilitychange`/`pagehide` save. | `saveToDB` is called only from `actions.ts:189`, `SettingsModal.ts:270`, `SocialHubModal.ts:531/537` |
| 2.2 | **P0** | **The District Builder is never saved.** `new DistrictGrid()` builds 12 fresh default parcels **every time the modal opens**. Upgrades charge cash and energy and grant trust, then disappear on close. Reopening allows the same upgrades again, which is a repeatable trust farm. | `DistrictBuilderModal.ts:47`, `DistrictGrid.ts:25-41`; no `parcels` field in `GameState` |
| 2.3 | **P0** | **"New Game" doesn't reset signed-in players.** It clears only IndexedDB. On the next boot the server-first load restores the old save. | `SettingsModal.ts:280-286`, `persistence.ts` `loadSave()` |
| 2.4 | P1 | New Game doesn't reset the live world either: collected pickups stay gone, player position is kept, `CrisisEngine`'s module state (`scapegoatStreak`, `lastCrisisDay`) and the `world--police-state`/inline `saturate()` styles on `#game-container` persist until reload. | `CrisisEngine.ts:48-49,183,223` |
| 2.5 | P1 | Crisis world effects (desaturate/bloom, police-state) live only in the DOM and module variables, so a reload resets the look while game state is unchanged. The crisis cooldown also resets on reload. | `CrisisEngine.ts:47-49` |
| 2.6 | P1 | **Server-first load has no conflict handling.** Offline play followed by an online boot means the older server save overwrites newer local progress. | `persistence.ts` `loadSave()` |
| 2.7 | P2 | `mergeWithDefaults` only deep-merges `player` and `housing`. The next new field on any other nested slice will load as `undefined` from old saves. There is no save `version` number or migration step. | `persistence.ts` |

---

## 3. Playability and UX (from a real browser playthrough)

| # | Sev | Finding |
|---|---|---|
| 3.1 | **P0** | **Mobile (390×844): the toolbar covers the End Day button and the context-action button.** The Playwright run could not click End Day and timed out, so on a phone the game can't progress. The toolbar also wraps to 3 rows of 16 icons and takes about 20% of the screen. |
| 3.2 | P1 | Mobile District Builder: the 4-column grid is cut off on the right with no scrolling. |
| 3.3 | P1 | **No onboarding or tutorial.** A new player gets 16 unexplained emoji buttons, no goal, and no explanation of build nodes, End Day, or what stats mean. |
| 3.4 | P1 | **Crisis text is cut mid-sentence.** The context is sliced at 220 characters and choice descriptions at 100 with "…" appended (`CrisisWireModal.ts:68,82,90`). Players can't read the full story before a choice the game calls defining. |
| 3.5 | P1 | Online-only features (Common Grounds, Bazaar, Civic directory, Proximity, Journal rewards) are fully shown to offline players and fail with "Could not reach…". They should be hidden, or shown with a "sign in to use" state. |
| 3.6 | P1 | Offline players get the **login wall on every launch**. The "Play offline" choice isn't remembered (`main.ts:44-46`, `AuthOverlay.ts:88`). |
| 3.7 | P1 | Minigame portal labels ("Courier Rush", "Kitchen Rush") render as huge, blurry, zoomed 8px text, cut off at screen edges and overlapping sprites. The zone name ("South Quarter") is hidden behind the top HUD bar. |
| 3.8 | P1 | The virtual thumbstick circle is drawn on desktop (keyboard) sessions too. |
| 3.9 | P1 | The toolbar mixes styles: plugin buttons (🌐 📡 ⚽) and some built-ins have no background disc, while others do. |
| 3.10 | P1 | The Broadsheet shown after ending day N is labelled "DAY N" rather than N+1. The Commons Clue is the same word every day (a free +5 energy). |
| 3.11 | P1 | The CraftingModal shows player-facing "(coming soon)" (`CraftingModal.ts:18`). |
| 3.12 | P1 | The Civic "Found a Commons" directory and ticker show **fake organisations with `example.org` links**, presented as real-world civic actions. Event dates are `NOW()+N days` **at migration time**, so they are in the past soon after deploy (`migrations/009_create_civic_actions.up.sql:32-42`). |
| 3.13 | P2 | Crisis choices and Town Hall votes are logged into the same `historyLog` (`assembly-*` ids). History and analytics can't tell them apart. |
| 3.14 | P2 | The DistrictBuilderModal doesn't lock input, so the player can walk around with the modal open. |
| 3.15 | P2 | `user-scalable=no, maximum-scale=1` blocks pinch-zoom (WCAG 1.4.4). `100vh` layout causes the iOS address-bar jump; use `100dvh`. |
| 3.16 | P2 | There is no loading screen. Boot waits for plugin bootstrap and the minigame catalog before anything renders. `void boot()` has no error UI, so a boot failure leaves a blank page. |
| 3.17 | P2 | Content depth for launch: 23 crises, 6 IRL quests, 3 world quests, 12 recipes, 1 extra region, and 1 ending. The replay loop runs dry within a few hours. |

---

## 4. Engineering, ops and legal

| # | Sev | Finding |
|---|---|---|
| 4.1 | **P0** | **CI has been red on every push since at least 2026-09-17.** The web job fails at `actions/setup-node` because `cache-dependency-path: apps/web/package-lock.json` doesn't exist (the lockfile is at the workspace root). Check, test, e2e and docker build **have never run in CI** for these commits. |
| 4.2 | **P0** | **nginx serves every `.js` as `Cache-Control: public, immutable; expires 1y`** (`apps/web/nginx.conf:17-19`). That includes the non-hashed `/plugins/*.js` minigame and skin bundles and `registerSW.js`/`sw.js`. Updates will not reach players. |
| 4.3 | **P0** | **No privacy policy, no terms, no LICENSE, no README.** The game has accounts, stores saves on a server, sends telemetry (`/district/economic-snapshot`, `/district/crisis-log`), has social features, mesh networking, and Overpass geo lookups. That makes this a legal blocker for a public (especially EU) launch. There is also no in-game consent or telemetry toggle. |
| 4.4 | P1 | There is no deploy pipeline or hosting target in the repo. Only `docker compose build` runs, and it has never run in CI (see 4.1). No HTTPS/TLS config, no DB backup plan, no restart policies in `docker-compose.yml`. |
| 4.5 | P1 | No security headers (CSP, `X-Content-Type-Options`, `Referrer-Policy`) in nginx. This matters more because the plugin sandbox loads remote code. |
| 4.6 | P1 | Crisis data has drifted: the Go API's embedded copy has **5** scenarios and the client has **23**. `GET /data/crises` and `addDynamicScenario()` are unused (dead code). |
| 4.7 | P2 | Test coverage has no thresholds (`vitest.config.ts`). Stryker mutation testing doesn't run (upstream runner issue). E2E covers "modal opens", not economy correctness. |
| 4.8 | P2 | Bundle size: Phaser is 1.37 MB (358 kB gzipped) and the app is 379 kB. Acceptable, but first load has no loading indicator (see 3.16). |

---

## 5. What is genuinely good (keep it)

- The code is clean and well layered: headless simulation, state mutation only in `actions.ts`, and pure `EconomyMath`/`Recipes` functions. Every economy fix below lands in a small number of pure functions.
- Crisis writing, the family-origin flow, dialogue content and the broadsheet are strong, and the tone is on-message.
- The plugin, skin and minigame architecture works at runtime. In the desktop playthrough every modal opened without a page error; the only console errors were from the local API not running.
- Idempotency guards on pickups and cookbooks, and affordability checks in `buyMaterial`/`DistrictGrid`, are correct. The problem is the systems around them.

---

## 6. The plan

Ordered so that each phase unblocks the next. Every item follows the project's TDD rule: **write a failing test that reproduces the bug first, then fix it.**

### Phase 0 — Make CI tell the truth (½ day)
1. Fix `ci.yml`: point `cache-dependency-path` at the root `package-lock.json`, run `npm ci` at the workspace root, then run the web steps. Confirm web, api and docker all go green.
2. Add `npx tsc -p` for the packages, plus the package vitest suites, to CI if they aren't already covered.
- **Done when:** a push to `main` shows 3 green jobs.

### Phase 1 — Economy integrity (P0, ~3–4 days)
Needs design decisions D1–D4 (§7) first.
1. **One owner for resilience.** Make `resilienceScore` = computed base from nodes + a persisted `resilienceModifier` from crises, votes, minigames and parcels (clamped). Add a real `adjustResilience(delta)` action. Route `HostPlatformAPI` and `DistrictGrid` to it instead of `updateCommonsProgress('resilienceScore')`. Make the starting 20 part of the model so the first contribution doesn't reset it.
2. **Apply positive crisis energy** (`regenEnergy`). Show the hidden scapegoat −15 trust and the solidarity buff/Greenhouse on the cards. Fix the stress chip colours.
3. **Enforce costs.** Crisis and vote choices whose cash or energy cost can't be paid are disabled, with the reason shown. Minigames need ≥5 energy to start. Construction clamps the contribution to what's needed to reach 100% and to whole numbers.
4. **Close the crafting loop.** Crafting costs energy (e.g. 3–8 by tier) and optionally only works at a station. Selling only happens at the Baumarkt/Supermarket/market (not from the HUD). Add a sell price floor below input cost for basic items. Possibly add a daily sell limit per item or diminishing demand. Add a `BalanceSimulator` check that **no recipe is profitable above X per energy spent**.
5. **Close the minigame loop.** Add a daily reward cap per game (e.g. full rewards on the first 1–2 runs per day, then trust-only), plus the energy gate.
6. **Debt and zero states.** Unpaid rent or food becomes debt, or raises stress, instead of disappearing (D2).
7. **Retune the honest loop.** Extend `BalanceSimulator` to model Work, quests, crises, construction and capped minigames. Set concrete targets, e.g. "first node at day ~10–15 for Pip playing normally, Safe Haven reachable at ~day 45–60". Fix Morgan's energy death spiral and Arthur's instant half-node.
8. **Quests.** Allow abandoning or switching a world quest, or make Mira's kitchen quest non-blocking.
9. **Make promised effects real, or rewrite the text:** Town Hall votes, stress, housing benefits, Scraps (limit to once per day), and Broadsheet clues (a rotating word list).
- **Done when:**
  - Every source and sink in §1.1 has a unit test covering both its cap and its effect.
  - `BalanceSimulator` has sweeps for all 3 archetypes.
  - A "no infinite loop" regression test exists for crafting and minigames.

### Phase 2 — Saves you can trust (P0, ~2 days)
1. Debounced autosave on every store change, plus a `visibilitychange`/`pagehide` flush.
2. Add `districtGrid.parcels` to `GameState` (a new top-level slice, which is safe with old saves). `DistrictGrid` reads and writes the store. Harvest grants real resources.
3. Add `saveVersion`, a migration function, and a generic deep-merge against `INITIAL_STATE` for every slice.
4. Server sync: send `meta.updatedAt`/`day` with the save and use last-writer-wins by timestamp (or ask the player on conflict). New Game also clears the server save, or starts a new slot.
5. New Game fully resets: persisted crisis streak and cooldown, world-effect classes, and a `WorldScene` restart.
- **Done when:** unit tests exist for autosave, migration and merge, plus an e2e test that does "craft → reload → still crafted" and "New Game while signed in → fresh state after reload".

### Phase 3 — Playable on every screen (P0/P1, ~3 days)
1. Mobile layout: split the toolbar into a collapsible "more" drawer for secondary features (radio, share, plugins, civic, proximity, mesh). Reserve safe zones for End Day and the action button. Use `100dvh` and safe-area insets.
2. Make the District Builder and every modal responsive at 360px wide.
3. Hide the thumbstick on non-touch devices. Fix world label scale (render at world resolution or use bitmap text) and move the zone label out from under the HUD.
4. Show the full crisis text (scrollable body) with no truncation.
5. Hide online-only features for offline players, or put them behind a "Sign in to use" state. Remember the "Play offline" choice.
6. Boot: add a loading screen and a boot-error screen with Retry.
7. Add Playwright e2e at 390×844 **and** 1366×800: new game → work → craft → contribute → end 3 days → resolve crisis. Assert that End Day is clickable and the HUD numbers match expectations.

### Phase 4 — Onboarding and honesty in content (P1, ~2–3 days)
1. A first-day guided flow: 4–6 contextual hints (move, talk to Mira, contribute to a build node, End Day, what stress, trust and resilience do). Keep it skippable and remember when it's done.
2. A goal and progress panel: the 5 nodes, what each unlocks, and the Safe Haven goal.
3. Remove "(coming soon)". Replace the fake civic data with a real curated source or remove the feature. At minimum, label it "sample data" in-UI and make the seed dates relative at query time.
4. Make shop items do something visible (cosmetics on the player or facades), or remove the shop for launch.
5. Endgame: a Safe Haven ending screen with a run summary (days, choices, nodes), plus "continue" or "new game".

### Phase 5 — Server hardening (P1, ~2 days)
1. Rate limits (per IP and per user) on auth, deeds, caravans and trades. `MaxBytesReader` on the auth handlers.
2. IRL deeds: a daily cap. "Peer-verified" only counts when the server has actually verified the handshake.
3. Caravans and trades: cap amounts per day. Ideally the server tracks the transferable balance, or amounts are limited to a small gift size.
4. Decide on one source of truth for crisis data: either the client fetches `/data/crises`, or the dead endpoint and `addDynamicScenario` are removed.

### Phase 6 — Launch ops and legal (P0, ~1–2 days plus legal review)
1. nginx: long-lived immutable caching only for hashed `/assets/*`. Use `no-cache` for `sw.js`, `registerSW.js`, `/plugins/*`, `index.html` and the manifest. Add security headers and a CSP that is compatible with the plugin sandbox.
2. Privacy policy, imprint/terms (as required for the target region), a telemetry consent toggle in Settings (off by default for EU), account deletion and data export endpoints.
3. LICENSE, README with play and self-host instructions, `og:image` as an absolute URL.
4. Deploy target (TLS, restart policies, Postgres backups, health monitoring), a staging environment, and error reporting.

### Phase 7 — Post-launch depth (P2)
More crises, quests, recipes and regions. Stress and trust feeding into events. Coverage thresholds. Mutation testing once the Stryker/Vitest runner issue is fixed.

**Estimate:** Phases 0–6 take about **2.5–3.5 focused weeks**. Phase 1 is the critical path because Phases 2–4 build on its state model.

---

## 7. Design decisions only you can make (needed before Phase 1)

| # | Question | My recommendation |
|---|---|---|
| D1 | Should crafting be a real income source, or mainly a furnishing/utility system? | Utility first. Selling allowed at markets only, with modest margins, energy cost per craft, and diminishing demand. |
| D2 | What happens at $0, 0 energy, or 100% stress? Is there a fail state? | No hard game over (it fits the theme). Unpaid costs become stress. At 100% stress the player is forced into a rest day (loses a day, and energy is restored). Show this clearly in the HUD. |
| D3 | How often can minigames pay out? | Full cash reward on the first run per minigame per day, trust-only afterwards. Always needs ≥5 energy. |
| D4 | Target pacing: how many days to the first build node and to Safe Haven? | First node around day 10–15, Safe Haven around day 45–60, for a normal Pip/Morgan run. Arthur finishes faster but at a trust cost. |
| D5 | Keep the Solidarity Token shop and civic directory for launch, or cut them? | Cut both, or hide them behind a flag, until the items have real effects and the directory has real data. |
| D6 | Launch region (drives legal requirements: GDPR, imprint)? | Needed for Phase 6. |

### 7.1 Decisions (answered 2026-09-29)

| # | Decision | What it means for implementation |
|---|---|---|
| D1 | Crafting is **both** income and furnishing/tools. | Selling stays. Each craft costs energy (by tier), and each item's sell price drops with every unit sold that day (demand recovers overnight). A balance test pins profit-per-energy to at most roughly the Work rate. |
| D2 | **100% stress → breakdown.** **No money → starving**, which raises stress over time. | Unpaid food/rent is not forgiven: while starving, stress rises every day and energy regen is reduced. When stress reaches 100%, the player has a breakdown: the next day is lost, energy is partially restored, stress drops, and a modal explains what happened. No hard game over. |
| D3 | Minigames pay **as often as they are played**. | No daily cap. Each run requires and spends real energy, so energy is the natural limit, and payouts are normalised so $/energy is in line with Work. |
| D4 | Pacing is my call. | Targets: first build node around day 10–15 and Safe Haven around day 45–60 for a normal Pip/Morgan run; Arthur finishes faster at a trust cost. Enforced by `BalanceSimulator` sweeps. |
| D5 | **Ship** the Solidarity Token shop and civic directory, done properly. | Shop items get real in-game effects (cosmetics and small perks). The civic directory gets honest, curated content with query-time dates and no placeholder links. |
| D6 | Europe (details later). | GDPR baseline: telemetry opt-in (off by default), privacy policy, imprint, account deletion and data export. |

---

## 8. Verification snapshot (2026-09-29)

- `tsc --noEmit`: 0 errors · `oxlint src/`: 0 warnings · Vitest: 137 files, 974 tests passing · `vite build`: OK · `go vet ./...`: clean.
- GitHub Actions: the last 4 runs on `main` failed (web job at setup-node; docker never ran).
- Exploratory Playwright run:
  - Desktop 1366×800 passed: every toolbar modal opened, and 6 days were played with solidarity choices, ending at Day 7, $22, stress 75%, resilience 45%.
  - Mobile 390×844 **failed**: End Day was blocked by the toolbar (see 3.1).

---

## 9. Implementation status (2026-09-30)

All work below is **uncommitted** in the working tree.

| Phase | Status | Notes |
|---|---|---|
| 0 CI | Done | `ci.yml` repaired |
| 1 Economy | Done | `EconomyRules.ts` + `settleDay`; single-owner resilience (base from nodes + persisted modifier); D1–D4 applied; `BalanceSimulator` sweeps |
| 2 Saves | Done | Debounced autosave, throttled upload, `pagehide` flush, newest-`savedAt`-wins, versioned deep-merge, builder parcels persisted |
| 3 Screens | Done | Account section, remembered offline choice, boot/error screen, responsive builder, `launch-loop` e2e at 1366×800 and 390×844 |
| 4 Onboarding/content | Done | Tutorial coach, 🎯 Goals panel, locked Land Trust finale, Safe Haven run summary, shop items with real effects (D5), honest civic directory with in-fiction badge and recurring dates (D5) |
| 5 Server | Done | Rate limits (IP + user) and body limits; deeds capped at 3/day, honor-system pay; caravan/trade gift caps; dead crisis endpoint removed |
| 6 Ops/legal | Done in code; **operator input needed** | See below |

**Phase 6 details**
- nginx: immutable caching only for `/assets/`, `no-cache` for SW/plugins/HTML, CSP and security headers, `/health` proxy.
- GDPR:
  - Telemetry is opt-in and off by default (`core/privacy/consent.ts`, gating `api/endpoints/district.ts`, toggle in Settings → Region & Privacy).
  - `GET /api/v1/account/export` and `DELETE /api/v1/account`, with Settings → Account "Download my data" and a two-step "Delete my account".
  - `privacy.html` and `imprint.html`, linked from sign-in and Settings.
- `README.md`, `docs/DEPLOYMENT.md` (TLS via Caddy, backups, restore test, monitoring), `restart: unless-stopped`, absolute `og:image`/`og:url` via `VITE_PUBLIC_ORIGIN` (= `VITE_ORIGIN`).

**Still open (needs a human decision or real-world details)**
1. Fill every `[PLACEHOLDER]` in `privacy.html` and `imprint.html` (operator, address, hosting provider, retention), then get them legally reviewed.
2. Choose a license and add `LICENSE`. The README says "all rights reserved" until then.
3. Choose a host (EU), set up the staging environment and error reporting.
4. Known limitations, accepted for a single-server launch:
   - The rate limiter is in-memory, per process.
   - The CSP still allows `'unsafe-inline'` scripts, because the plugin sandbox needs them.
   - There is no password reset by email.

---

## 10. Player-experience pass (2026-09-30)

Goal: every action and every night is felt and explained. All uncommitted, TDD.

| Change | Where |
|---|---|
| Title screen: animated dusk skyline, "▶ Play" first, sign-in tucked behind a toggle (no more login wall) | `ui/AuthOverlay.ts` |
| Morning ledger: every overnight change itemised (income, food, rest, flat, stress sources, hunger, breakdown) with real before → after totals. `applyDailyTick`/`settleDay` now derive their totals from these lines, so the ledger can't disagree with the economy | `EconomyMath.ts` (`LedgerLine`), `ui/MorningLedger.ts` |
| Floating stat deltas ("+$12", "−10⚡", "+4% resilience") under the HUD, with coin / soft-drop / warm-rise sounds | `core/feedback/statDiff.ts`, `ui/StatPops.ts`, `SoundSynth.ts` |
| Build celebration: full-screen card, confetti and fanfare when a commons opens — from the player **or** from neighbours overnight. Fixes a bug: the old particles spawned inside the build modal as it closed, so nobody saw them | `ui/BuildCelebration.ts` |
| Neighbour memory: the six named NPCs open with a line about the player's latest crisis choice, a pattern of scapegoating, hunger, high stress or high trust (once per NPC per day) | `world/NeighbourMemory.ts` |
| Bugfix: the "Heard anything lately?" gossip option was attached to each NPC's day-1 tree, so it only appeared on intro days | `WorldScene.openTalk` |
| Desktop camera shows 13 tiles of height (was 10); phones unchanged | `world/CameraViewport.ts` |

Next candidates: more crises/quests (Phase 7), stress- and trust-driven events, achievements/milestones, richer world art.
