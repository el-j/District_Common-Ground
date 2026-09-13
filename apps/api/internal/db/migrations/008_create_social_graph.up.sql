ALTER TABLE users ADD COLUMN IF NOT EXISTS handle TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS invite_code TEXT;

UPDATE users
SET handle = 'neighbor_' || substr(id::text, 1, 8)
WHERE handle IS NULL;

UPDATE users
SET invite_code = substr(md5(random()::text || id::text), 1, 8)
WHERE invite_code IS NULL;

-- New signups go through auth.Service.Register, which only sets email and
-- password_hash — these defaults are evaluated per-row on INSERT so every
-- new user still gets a unique handle/invite_code without touching auth.
ALTER TABLE users ALTER COLUMN handle SET DEFAULT ('neighbor_' || substr(gen_random_uuid()::text, 1, 8));
ALTER TABLE users ALTER COLUMN invite_code SET DEFAULT substr(md5(random()::text), 1, 8);

ALTER TABLE users ALTER COLUMN handle SET NOT NULL;
ALTER TABLE users ALTER COLUMN invite_code SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS users_handle_key ON users (handle);
CREATE UNIQUE INDEX IF NOT EXISTS users_invite_code_key ON users (invite_code);

CREATE TABLE IF NOT EXISTS user_friends (
    user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    friend_id  UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, friend_id),
    CHECK (user_id <> friend_id)
);

CREATE TABLE IF NOT EXISTS mutual_aid_caravans (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_id  UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    resource_type TEXT        NOT NULL CHECK (resource_type IN ('energy', 'food', 'cash')),
    amount        BIGINT      NOT NULL CHECK (amount > 0),
    note          TEXT        NOT NULL DEFAULT '',
    claimed       BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    claimed_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS mutual_aid_caravans_recipient_idx ON mutual_aid_caravans (recipient_id, claimed);
