CREATE TABLE IF NOT EXISTS plugin_sessions (
    id            TEXT        PRIMARY KEY,
    user_id       UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plugin_id     TEXT        NOT NULL,
    score         BIGINT      NOT NULL,
    completed     BOOLEAN     NOT NULL,
    duration_sec  DOUBLE PRECISION NOT NULL,
    rewards       JSONB       NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_plugin_sessions_user_id ON plugin_sessions (user_id, created_at DESC);
