CREATE TABLE economic_snapshot_log (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day        INT         NOT NULL,
  archetype  TEXT        NOT NULL,
  cash       INT         NOT NULL,
  energy     INT         NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ON economic_snapshot_log (user_id, day);
