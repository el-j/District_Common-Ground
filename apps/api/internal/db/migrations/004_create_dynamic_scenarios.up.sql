CREATE TABLE IF NOT EXISTS dynamic_scenarios (
    id            TEXT        PRIMARY KEY,
    archetype     TEXT        NOT NULL,
    payload       JSONB       NOT NULL,
    generated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dynamic_scenarios_generated_at ON dynamic_scenarios (generated_at DESC);
