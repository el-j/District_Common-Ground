# EPIC-13 — Playtesting, Economy Balancing, Telemetry & 10-Year Resilience

**Agent roles:** economy-designer, ux-researcher, sre
**Planning doc:** `docs/planning/13-PLAYTESTING-BALANCING-AND-TELEMETRY.md` ("Living Core Specification v2.0")
**Origin:** not a direct user request — surfaced 2026-09-15 during a "what's still open in our visions/plannings" audit. The planning doc has existed since early in the project but was **never turned into a milestone**: no EPIC, no task doc, not even a row in `TASK-STATUS.md`. The milestone numbering jumps M12 → M14 everywhere, including `docs/planning/00-MASTER-INDEX-AND-DESIGN-BIBLE.md`'s own active-milestone list. This is the one genuine "unscheduled vision" gap found in that audit — everything else open was either a documented scope decision or a manual-test item.

## Vision

The planning doc has three pillars, authored by three different design voices:

1. **90-Day Solvency Balancing** (Economy Designer) — every archetype's economy must be stress-tested across 90 simulated days, including two named adversarial scenarios ("Permanent Inflation," "Algorithm Pay Slash"), against concrete Day 1/30/60/90 target bands per archetype.
2. **Zero-PII Telemetry** (UX Researcher + SRE) — three anonymized civic events (`crisis_resolved`, `commons_milestone`, `land_trust_ratified`) and two live-tuning dashboard metrics (Solidarity Ratio, Economic Attrition Rate), explicitly **not** tracking cookies, marketing SDKs, or personal data.
3. **10-Year Sustainability** (SRE) — four antifragile architecture principles (zero-deprecation stack, offline self-sufficiency, API degradation, no build debt) meant to keep the game running for a decade with no maintenance.

## Grounded diagnosis (verified against the actual code, not assumed)

- **Pillar 1 has zero implementation, and the spec's literal ask doesn't match the code's actual shape.** `EconomyMath.ts`'s `applyDailyTick()` is **fully deterministic** — seasonal multipliers come from `SeasonalWave.ts`'s sine curves, there is no random-number source anywhere in the simulation. "10,000 Monte Carlo runs" implies stochastic sampling across a distribution; there is no distribution to sample from today. A literal Monte Carlo harness would need a new randomization layer bolted on top of a system designed to be reproducible — that would be *adding* noise, not testing what exists. The honest fix is a **deterministic exhaustive sweep**: run `applyDailyTick()` 90 times per archetype under baseline and under both named stress scenarios, and assert the results land in the spec's target bands. This is strictly more useful for regression testing than random sampling would be, and costs nothing extra to add later if true stochastic crisis-choice variance is ever introduced.
- **Pillar 2 already has real infrastructure to extend, not a blank slate.** Two things already exist that the planning doc's authors didn't know about (it predates them):
  - `apps/web/src/core/offline/SignedEventLog.ts`'s `recordAction()` (built in M18) is **already** a local-first, Ed25519-signed, zero-PII action log — `updateCommonsProgress()` in `actions.ts` already calls `recordAction('COMMONS_RESOURCE_CONTRIBUTION', ...)` on every commons contribution. This satisfies the spec's "zero tracking cookies, zero third-party SDKs, zero personal data" requirement more strictly than a new telemetry SDK would, since it never leaves the device unless M18's sync/gateway path is active.
  - `GET /api/v1/district/resilience` (`apps/api/internal/save/solidarity_pool.go`, built in M11) **already computes the spec's "Solidarity Ratio"** — `solidarityCount`/`scapegoatCount`/`globalIndex` aggregated straight from the `crisis_log` table. It's real, it's live, it's just not labeled "telemetry" and doesn't yet break down by `crisis_id` (needed for the spec's per-scenario 85%/15% skew check) even though `crisis_log.crisis_id` and `.day` are already columns (`003_create_crisis_log.up.sql`) — the breakdown is a `GROUP BY`, not new infrastructure.
  - **"Economic Attrition Rate" (% of players hitting zero-cash/zero-energy before Day 10) has no existing infrastructure at all.** `crisis_log` only ever recorded crisis choices, never economic state. This is the one piece of Pillar 2 that's genuinely new backend work: a small append-only log of daily archetype/cash/energy snapshots, mirroring `crisis_log`'s exact shape and privacy posture (no free text, no PII, `user_id` only for the existing per-account dedupe pattern already used elsewhere).
- **Pillar 3 is close to already true, but not audited as a set.** `CGO_ENABLED=0` + `FROM scratch` (Go Dockerfile), the PWA's Workbox precaching (`vite-plugin-pwa`, M18), the Go backend's synthetic-seasonal-fallback-on-fetch-failure pattern (M8/M9, formally re-scoped 2026-09-15), and the Rolldown/OXC/Vite 8 toolchain (repo-wide, `CLAUDE.md`) are each real and already shipped — but no doc has ever checked all four principles against the code as a single pass and recorded the result. This pillar is a **documentation/audit deliverable**, not new code, matching M20's "already largely true, formalize it" precedent.

## What this epic builds concretely

1. **`BalanceSimulator.ts`** — a pure, deterministic 90-day simulation harness over the existing `applyDailyTick()`, run per archetype (Pip/Morgan/Arthur) under baseline multipliers and the two named stress scenarios, asserting against the spec's Day 1/30/60/90 target table.
2. **Telemetry event wiring** — three new named event types (`crisis_resolved`, `commons_milestone`, `land_trust_ratified`) recorded through the *existing* M18 `SignedEventLog`, wired at the three real call sites that already exist (`resolveCrisis()`, `updateCommonsProgress()`'s per-node 100%-crossing detection, and the `safeHavenUnlocked` flip) — no new logging pipeline, no new SDK.
3. **A new, small `economic_snapshot_log` table + endpoint** — the one genuinely missing piece — capturing per-day archetype/cash/energy state (anonymized, no free text) so "Economic Attrition Rate" can actually be computed, mirroring `crisis_log`'s migration/handler/test shape exactly.
4. **A per-`crisis_id` breakdown on the existing `/api/v1/district/resilience` aggregate** (or a sibling endpoint) so the spec's ">85% or <15% skew → re-balance" check is something a designer can actually read off a live number, not just a global aggregate.
5. **A 10-Year Sustainability audit note** — one doc section checking each of the four principles against the current code and recording pass/fail, no code changes expected unless a real gap turns up.

## Scope decisions (documented up front, not discovered mid-implementation this time)

- **No stochastic Monte Carlo sampling is being added.** The deterministic sweep is the honest substitute — see the grounded diagnosis above. If true crisis-choice randomness is ever added to the sim, revisit this.
- **No third-party analytics/telemetry SDK is being added, ever.** Every event rides the existing M18 signed local log and the existing M11 aggregate-endpoint pattern. This is a *stricter* reading of the spec's own "zero-PII" rule, not a shortcut.
- **No live "Telemetry Dashboard" UI is in scope.** The spec's dashboard framing implies an ops-facing view; this epic exposes the *data* (aggregate endpoints/fields) a future dashboard would read, not a rendered dashboard itself — matching how M15's civic ticker and M11's resilience badge each started as data-only before UI was added.

## Acceptance Criteria

- **Test 13.1:** `BalanceSimulator` run for each archetype under baseline multipliers lands within the spec's Day 30/60/90 cash/energy/stress target bands (±reasonable tolerance, documented per-archetype).
- **Test 13.2:** The "Permanent Inflation" run (food ×1.5, energy ×1.75, 30 days) reproduces the spec's qualitative claim directionally — an unbuffered archetype's cash trends toward zero well before day 30, while an archetype with Kitchen+Solar built stays net-positive.
- **Test 13.3:** The "Algorithm Pay Slash" run (wage ×0.7) measurably reduces Pip's cash trajectory relative to baseline, without affecting Morgan/Arthur (who don't use the wage multiplier).
- **Test 13.4:** `resolveCrisis()`, `updateCommonsProgress()`'s 100%-crossing case, and the `safeHavenUnlocked` flip each call `recordAction()` with the correct new event type and payload shape (no PII fields).
- **Test 13.5 (Go httptest):** The new economic-snapshot endpoint accepts a snapshot write and the resilience/attrition read reflects it, mirroring `solidarity_pool_test.go`'s style.
- **Test 13.6 (Go httptest):** The per-`crisis_id` solidarity breakdown returns correct counts for a seeded set of mixed-choice rows.
