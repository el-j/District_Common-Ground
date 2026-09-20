# EPIC-24 — Economy & Energy Rebalance

## Origin

Direct follow-up to the user's "make the game much more enjoyable" request (M23), specifically the ask to "deeply investigate the game dynamics and how a player can really earn more money and get more energy." A grounded audit of the real code (not the design docs) found:

1. **There is no repeatable player-driven earn action.** Cash/energy movement is 100% passive daily-tick math (`EconomyMath.ts`'s `applyDailyTick()`, called once per `advanceDay()`) plus a capped 3-quest/day rotation plus probabilistic crises. A player cannot *choose* to work for money today; they can only wait for tomorrow's tick or hope a quest/crisis lands favorably.
2. **Morgan (Exhausted Commuter) loses net energy every single day** (+5 regen − 10 upkeep = −5/day) with no passive fix — by design (the archetype is meant to read as precarious), but with no *player-initiated* counter-lever either, this reads as a dead end rather than a challenge.
3. **A real documented bug**: `BalanceSimulator.ts` already flags (in a code comment, not silently) that the design intent "energy costs +75% during inflation" is a no-op — `applyDailyTick()` never reads `multipliers.energy` at all.
4. **`digital-deescalation` (one of the 6 daily quests) grants a wildly oversized reward** — energy set to 110% of max (a full overflow refill) — versus every other energy lever in the game, which moves in single digits (`check-in-call`'s +10).

## Design intent

Give players a real, repeatable, archetype-flavored way to trade energy for cash on demand ("Work"), wire the already-designed inflation-affects-energy-cost mechanic into the real math, and rebalance the one outlier quest reward — without inventing new state systems where the existing quest/tick infrastructure already fits.

This is scoped as a numbers/mechanics fix, not a new UI subsystem: the new "Work" action reuses the exact `QuestModal.ts` render pattern and the exact once-per-day `completedOnDay`-style gating already proven by the quest system.

## Non-goals (explicitly out of scope for M24)

- Not touching the crisis-scenario cash/energy deltas (23 scenarios) — those are event-driven, not the daily baseline, and were audited as already having a wide, deliberate spread.
- Not changing archetype starting stats or the passive `ENERGY_REGEN` table — Morgan's daily net-negative energy is a deliberate precarity signal, not a bug; this epic gives players a *lever* against it, not a rewrite of the baseline.
- Not adding a "job board" with multiple work options — one archetype-flavored action is enough to prove the loop; a richer job system is a future milestone if this lands well.
