CREATE TABLE IF NOT EXISTS user_wallets (
    user_id           UUID        PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    solidarity_tokens BIGINT      NOT NULL DEFAULT 0 CHECK (solidarity_tokens >= 0),
    civic_badges      BIGINT      NOT NULL DEFAULT 0 CHECK (civic_badges >= 0),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_inventory (
    user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_id     TEXT        NOT NULL,
    acquired_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, item_id)
);
