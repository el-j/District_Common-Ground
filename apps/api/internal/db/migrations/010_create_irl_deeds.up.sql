CREATE TABLE IF NOT EXISTS irl_deeds (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category            TEXT        NOT NULL CHECK (category IN ('food_sharing', 'eldercare', 'park_greening', 'community_repair')),
    note                TEXT        NOT NULL DEFAULT '',
    verification_method TEXT        NOT NULL CHECK (verification_method IN ('honor_system', 'peer_verified')),
    st_awarded          INTEGER     NOT NULL CHECK (st_awarded >= 0),
    cab_awarded         INTEGER     NOT NULL CHECK (cab_awarded >= 0),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS irl_deeds_user_created_idx ON irl_deeds (user_id, created_at DESC);
