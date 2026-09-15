-- M18 — offline-first device storage & delayed CRDT sync. Stores the
-- Ed25519-signed SignedActionDelta rows each authenticated user's devices
-- upload, keyed so a device can never collide with or duplicate another
-- device's sequence, and re-uploading the same delta (a retried sync round)
-- is a safe no-op via the primary key.
CREATE TABLE IF NOT EXISTS sync_deltas (
    id           TEXT        NOT NULL,
    user_id      UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_id    TEXT        NOT NULL,
    sequence     BIGINT      NOT NULL CHECK (sequence > 0),
    action_type  TEXT        NOT NULL,
    vector_clock JSONB       NOT NULL,
    payload      JSONB       NOT NULL,
    prev_hash    TEXT,
    hash         TEXT        NOT NULL,
    signature    TEXT        NOT NULL,
    occurred_at  TIMESTAMPTZ NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, device_id, sequence)
);

CREATE INDEX IF NOT EXISTS sync_deltas_user_idx ON sync_deltas (user_id);
