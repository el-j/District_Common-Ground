CREATE TABLE IF NOT EXISTS trade_offers (
    id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    proposer_id            UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_id           UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    offer_resource_type    TEXT        NOT NULL CHECK (offer_resource_type IN ('energy', 'food', 'cash')),
    offer_amount           BIGINT      NOT NULL CHECK (offer_amount > 0),
    request_resource_type  TEXT        NOT NULL CHECK (request_resource_type IN ('energy', 'food', 'cash')),
    request_amount         BIGINT      NOT NULL CHECK (request_amount > 0),
    note                   TEXT        NOT NULL DEFAULT '',
    -- 'pending' (awaiting recipient) -> 'accepted'/'declined' (recipient responded)
    -- or 'cancelled' (proposer withdrew while still pending).
    status                 TEXT        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled')),
    -- False until the proposer has collected the outcome (receipt on accept,
    -- refund on decline). Cancel settles synchronously, so it's set TRUE at
    -- the same time status becomes 'cancelled'.
    proposer_settled       BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at            TIMESTAMPTZ,
    CHECK (proposer_id <> recipient_id)
);

CREATE INDEX IF NOT EXISTS trade_offers_recipient_pending_idx ON trade_offers (recipient_id, status);
CREATE INDEX IF NOT EXISTS trade_offers_proposer_outbox_idx ON trade_offers (proposer_id, proposer_settled);
