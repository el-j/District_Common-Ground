# EPIC-25 — Multiplayer Trading Between Neighbors

## Origin

Second of the 5-part follow-up request that started with [M24](../tasks/M24-economy-and-energy-rebalance.md): "add multiplayer trading between neighbors." The M24-time fork audit found the building blocks but not the feature itself:

- A real friends graph exists (`apps/api/internal/social/`, `user_friends` table, handle/invite-code lookup).
- A real **one-directional gift** exists ("Dispatch Caravan"): sender picks a resource/amount, it's deducted from them immediately, and the recipient can claim it whenever they next check their inbox. There is no acceptance step — the recipient has no say.
- There is **no bidirectional trade** anywhere: no "I'll give you X for Y" offer that the other party can accept or decline. `packages/plugin-mutual-credit/` is a disconnected, unrelated offline mutual-credit ledger (its own signed-transaction system for a different plugin surface), not a friends-graph trade.
- There is **no live/real-time layer** — every social feature (friends, caravans) is request/response, checked when a player opens the relevant screen.

## Design intent

Add a **Trade Offer** flow to the existing Social Hub, reusing the friends graph and the "server gates + records, client owns resources" architecture the caravan system already established (`DispatchCaravan`'s own doc comment: the sender's resources are decremented client-side; the server call is just the record and the recipient's gate). Trading needs the same trust model extended to both directions:

- **Propose**: pick a friend, offer a resource+amount, ask for a resource+amount, optional note. The proposer's offered resource is escrowed (spent locally) immediately, matching how caravan dispatch already spends locally on send.
- **Respond**: the recipient sees the offer in a new "Trade" tab and can **Accept** (pay their side locally, receive the proposer's offered resource) or **Decline** (no change for them).
- **Settle**: because the proposer isn't necessarily online when the recipient responds, the proposer's own outcome (receive what they asked for, or get their escrow refunded) is collected the next time they open the Trade tab — an "outbox" of resolved-but-uncollected offers, auto-settled on load with a status message, so the proposer never has to remember to come back and claim it manually.
- **Cancel**: a still-pending offer can be withdrawn by its proposer, refunding the escrow immediately (synchronous, since the proposer is present for that call).

## Non-goals (explicitly out of scope for M25)

- **No real-time/push layer.** Trade state is polled on Social Hub open, exactly like friends and caravans already are. A live WebSocket layer would be a separate, much larger infrastructure milestone across every social feature, not just trading — out of scope here.
- **No counter-offers or negotiation.** A recipient accepts or declines the offer as proposed; they cannot propose a different amount back. That's a genuine future enhancement, not required to satisfy "multiplayer trading between neighbors" as a first cut.
- **No server-side resource authority.** Exactly like the existing caravan system, the Go backend never reads or writes a player's live cash/energy — those live in the client's `game_saves` JSONB, and the client is trusted to apply its own deltas. Building real anti-cheat validation would mean giving the server authority over the whole economy, a much bigger architectural change than this milestone, and not something the existing caravan system has either.
- **No new resource types.** Trades move the same three `CaravanResourceType`s the caravan system already supports (`energy`, `food`, `cash`).
