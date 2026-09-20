# M25 — Multiplayer Trading Between Neighbors

Story: [`docs/stories/EPIC-25-multiplayer-trading-between-neighbors.md`](../stories/EPIC-25-multiplayer-trading-between-neighbors.md)

Planning: none under `docs/planning/` — direct-request feature, second of the 5-part M24–M28 follow-up sequence, scoped ad hoc matching the M21–M24 precedent.

Status: **Implemented 2026-09-17.** All sections built and tested; full verification suite green (see below).

## Section 1 — Backend: a real bidirectional trade-offer flow

- [x] New migration `013_create_trade_offers.{up,down}.sql`: `trade_offers` table (proposer/recipient, offer resource+amount, request resource+amount, note, `status` enum `pending`/`accepted`/`declined`/`cancelled`, `proposer_settled` flag, timestamps). Indexed on `(recipient_id, status)` for inbox lookups and `(proposer_id, proposer_settled)` for outbox lookups.
- [x] `apps/api/internal/social/repository.go`: extended (not a new package — mirrors how caravans already live alongside friends in this same package) with `TradeOffer`/`TradeSettleResult` structs and 5 methods: `ProposeTrade`, `ListTradeInbox`, `ListTradeOutbox`, `RespondTrade` (accept/decline, row-locked), `CancelTrade` (proposer-only, synchronous refund), `SettleTrade` (proposer collects an accept/decline outcome, idempotent).
- [x] `apps/api/internal/social/handler.go`: 7 new HTTP handlers wired in `main.go` under `/api/v1/social/trade/*` (`propose`, `inbox`, `outbox`, `{id}/accept`, `{id}/decline`, `{id}/cancel`, `{id}/settle`), all `requireAuth`.
- [x] **Tests** (`repository_test.go`, integration-style, `testing.Short()`-skipped like the existing friend/caravan tests): propose→accept→settle grants both sides and is idempotent on double-settle; decline refunds only the proposer; cancel refunds synchronously and blocks a late response; propose requires friendship and rejects self-trades. Run against real Postgres via `testutil.NewPostgres` (Docker was available in this environment — all 4 new tests plus the full existing `internal/social` suite passed for real, not just compiled-and-skipped).

## Section 2 — Frontend: propose, accept/decline, cancel, auto-settle

- [x] `packages/shared-types/src/social.ts`: added `TradeStatus`, `TradeOffer`, `TradeSettleResult`.
- [x] `apps/web/src/api/endpoints/social.ts`: added `proposeTrade`, `getTradeInbox`, `getTradeOutbox`, `acceptTrade`, `declineTrade`, `cancelTrade`, `settleTrade`.
- [x] `apps/web/src/ui/SocialHubModal.ts`: new third tab ("Trade") alongside the existing Friends/Caravans tabs (no new HUD button needed — reuses the existing 🤝 Common Grounds entry point).
  - Propose form: pick a friend, "Offer [amount] [resource]" / "For [amount] [resource]", optional note.
  - Incoming offers list with Accept/Decline.
  - Sent-and-still-pending offers list with Cancel.
  - **Auto-settle on load**: any resolved-but-uncollected outbox offer is settled automatically the moment the modal's data loads — the proposer sees "X accepted your trade — +N ⚡ Energy!" (or a decline/refund message) with a chime, rather than needing a manual "collect" button. This was a deliberate delight choice: the user's original request emphasized the feature needing to be "stunning and very very enjoyable," and a silent manual-claim step for the *other* side of a trade you already forgot about would be the opposite of that.
  - Both propose and accept re-check the acting player's live resource balance client-side before calling the API (mirrors the existing caravan-dispatch check) — the escrowed/requested resource is only spent locally after the server call succeeds.
- [x] `apps/web/src/style.css`: new `.social-trade-*` classes, styled consistently with the existing `.social-dispatch-*`/`.social-inbox-*` classes in the same panel.

## Architecture decision carried over from the caravan system

Exactly like `DispatchCaravan`, the Go backend never touches live cash/energy — those live in the client's `game_saves` JSONB. The server only gates (friendship required, correct party, correct state) and records the trade; the client applies its own resource deltas on both sides of every transition (propose escrows, accept pays+receives, decline collects a refund, cancel refunds synchronously). This is a documented non-goal in [EPIC-25](../stories/EPIC-25-multiplayer-trading-between-neighbors.md), not an oversight — building real server-side economy authority would be a much larger architectural change untouched by the existing caravan system either.

## Explicitly not built (non-goals, see EPIC-25)

- No real-time/push layer — Trade state is polled on Social Hub open, same as friends/caravans.
- No counter-offers/negotiation — accept or decline only.
- No new resource types beyond the 3 `CaravanResourceType`s the caravan system already has.
- No dedicated frontend unit tests for `SocialHubModal.ts` or the new `social.ts` endpoint functions — this matches the pre-existing coverage boundary in this exact area (the friends/caravan features they mirror have zero test coverage today either); the new business logic (trade state machine, escrow/settle correctness) is covered by the Go repository tests instead, which is where that logic actually lives given the client-trusts-itself architecture above.

## Verification

1. `cd apps/api && gofmt -l .` — clean; `go build ./...` — clean.
2. `cd apps/api && go test -race ./internal/social/...` (Docker available) — **all tests passed for real against Postgres 17** (not short-circuited), including all 4 new trade tests and the full pre-existing friend/caravan suite (no regressions).
3. `cd apps/web && npx tsc --noEmit` — clean.
4. `cd apps/web && npm test` — 383/383 passed (same count as M24 — no new frontend tests added, see non-goals above), full existing suite green, no regressions.
5. `cd apps/web && npx oxlint src/` — clean.
