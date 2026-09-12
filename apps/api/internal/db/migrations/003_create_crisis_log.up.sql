CREATE TABLE crisis_log (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  crisis_id  TEXT        NOT NULL,
  day        INT         NOT NULL,
  choice     TEXT        NOT NULL CHECK (choice IN ('scapegoat', 'solidarity')),
  summary    TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ON crisis_log (user_id, day);
