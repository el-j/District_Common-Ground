CREATE TABLE civic_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    organizer TEXT NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    location_summary TEXT NOT NULL,
    source_url TEXT NOT NULL,
    region_code TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX civic_actions_region_start_idx ON civic_actions (region_code, start_time);

CREATE TABLE local_chapters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('tool_library', 'community_fridge', 'land_trust')),
    distance_km DOUBLE PRECISION NOT NULL CHECK (distance_km >= 0),
    address TEXT NOT NULL,
    website_url TEXT NOT NULL,
    region_code TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX local_chapters_region_distance_idx ON local_chapters (region_code, distance_km);

-- Seed data: illustrative in-fiction civic actions & mutual-aid chapters for the
-- default "GENERIC" region, matching the game's existing fictional world (Central
-- Plaza, Old Warehouse Tool Library, etc. — see docs/tasks/M11-shared-commons.md).
-- Source URLs point at example.org (IANA-reserved documentation domain) since
-- these are not real-world events; a real curation/admin pipeline is future work.
INSERT INTO civic_actions (title, organizer, start_time, location_summary, source_url, region_code) VALUES
    ('Neighborhood Solidarity Rally', 'District Tenants Union', NOW() + INTERVAL '2 days', 'Central Plaza steps', 'https://example.org/events/solidarity-rally', 'GENERIC'),
    ('Community Rent Freeze Assembly', 'Commons Defense Coalition', NOW() + INTERVAL '5 days', 'Town Hall auditorium', 'https://example.org/events/rent-freeze', 'GENERIC'),
    ('Mutual Aid Volunteer Day', 'Neighbors Helping Neighbors', NOW() + INTERVAL '9 days', 'Old Warehouse courtyard', 'https://example.org/events/volunteer-day', 'GENERIC'),
    ('Democracy Watch Town Hall', 'District Civic League', NOW() + INTERVAL '14 days', 'North Utility Station green', 'https://example.org/events/town-hall', 'GENERIC');

INSERT INTO local_chapters (name, type, distance_km, address, website_url, region_code) VALUES
    ('Old Warehouse Tool Library', 'tool_library', 0.6, '12 Foundry Row', 'https://example.org/chapters/tool-library', 'GENERIC'),
    ('Central Plaza Community Fridge', 'community_fridge', 0.3, 'Central Plaza, near the bulletin board', 'https://example.org/chapters/community-fridge', 'GENERIC'),
    ('Southside Community Land Trust', 'land_trust', 1.4, '88 Courtyard Lane', 'https://example.org/chapters/land-trust', 'GENERIC'),
    ('Riverside Tool Share', 'tool_library', 2.1, '4 Canal Street', 'https://example.org/chapters/riverside-tools', 'GENERIC'),
    ('North Station Fridge Co-op', 'community_fridge', 1.8, 'North Transit Hub concourse', 'https://example.org/chapters/north-fridge', 'GENERIC'),
    ('Commons Land Stewardship Trust', 'land_trust', 3.2, '201 Greenbelt Ave', 'https://example.org/chapters/stewardship-trust', 'GENERIC');
