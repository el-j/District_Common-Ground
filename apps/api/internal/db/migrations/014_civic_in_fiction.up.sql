-- 2026-09-29 launch audit §3.12: the seeded civic actions and chapters are
-- the game's own fictional places, but they were shown like real listings
-- with placeholder example.org links and dates frozen at migration time.
-- They are now flagged in-fiction (shown as "In the game world"), carry no
-- external link, and repeat on a schedule so they never go stale.
ALTER TABLE civic_actions
    ADD COLUMN in_fiction BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN recurs_every_days INT CHECK (recurs_every_days IS NULL OR recurs_every_days > 0);

ALTER TABLE local_chapters
    ADD COLUMN in_fiction BOOLEAN NOT NULL DEFAULT false;

UPDATE civic_actions
SET in_fiction = true,
    source_url = '',
    recurs_every_days = CASE title
        WHEN 'Neighborhood Solidarity Rally' THEN 7
        WHEN 'Community Rent Freeze Assembly' THEN 14
        WHEN 'Mutual Aid Volunteer Day' THEN 7
        ELSE 14
    END
WHERE source_url LIKE 'https://example.org/%';

UPDATE local_chapters
SET in_fiction = true,
    website_url = ''
WHERE website_url LIKE 'https://example.org/%';
