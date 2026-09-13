CREATE TABLE IF NOT EXISTS plugin_verification_requests (
    id              TEXT        PRIMARY KEY,
    plugin_id       TEXT        NOT NULL,
    requester_user_id UUID       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    source_kind     TEXT        NOT NULL CHECK (source_kind IN ('url', 'file')),
    manifest_url    TEXT,
    bundle_sha256   TEXT        NOT NULL,
    plugin_metadata JSONB       NOT NULL,
    status          TEXT        NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
    review_notes    TEXT,
    reviewed_by     UUID        REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_plugin_verification_requests_status_created_at
    ON plugin_verification_requests (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_plugin_verification_requests_plugin_id
    ON plugin_verification_requests (plugin_id);
