# M16 — Real-World Geo-Mode (OSM Proof of Concept) & Universal Empathy Design

Story: [`docs/stories/EPIC-16-real-world-geo-mode-and-irl-actions.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/stories/EPIC-16-real-world-geo-mode-and-irl-actions.md)  
Planning: [`docs/planning/16-REAL-WORLD-GEO-MODE-AND-UNIVERSAL-SOLIDARITY.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/planning/16-REAL-WORLD-GEO-MODE-AND-UNIVERSAL-SOLIDARITY.md)  
Status: `[ ] Planned (PoC Track)`

---

## 1. Universal Lexicon & Tone Audit (All Existing Docs & Content)
- [ ] Scan and update existing documentation and crisis strings:
  - [ ] Remove all occurrences of "fascist" and "anti-fascist".
  - [ ] Replace with "Community Unity", "Neighborhood Defense", "Authoritarian Greed", "Outside Speculators".
  - [ ] Verify that cause-and-effect mechanics speak louder than ideological labels.

---

## 2. OpenStreetMap (OSM) Ingestion Engine (`apps/web/src/geo/`)
- [ ] `OverpassClient.ts`:
  - [ ] Query builder: BBox query for `highway`, `building`, `leisure=park`, `amenity`.
  - [ ] Fallback sample GeoJSON dataset (offline demo neighborhood in Berlin-Neukölln & London-Hackney).
- [ ] `GeoJsonToTilemap.ts`:
  - [ ] Vector polygon rasterizer: convert OSM building footprints to WALL tiles (`T.WALL`).
  - [ ] Road network rasterizer: convert OSM highway line strings to ROAD / SIDEWALK tiles.
  - [ ] Green space rasterizer: convert parks and grass polygons to GRASS tiles (`T.GRASS`).
- [ ] `AmenityClassifier.ts`:
  - [ ] Match real libraries ➔ Tool Hub node.
  - [ ] Match real bakeries/cafes ➔ Community Kitchen node.
  - [ ] Match real parks ➔ Commons Garden plot.
- [ ] `GeoCache.ts`:
  - [ ] Cache generated tilemaps in `idb-keyval` / `IndexedDB` for instant offline replay.

---

## 3. IRL Real-World Action Engine (`apps/web/src/irl/`)
- [ ] `CivicJournal.ts`:
  - [ ] Action logging modal with preset categories (Eldercare, Food Sharing, Park Greening, Mutual Aid Repair).
  - [ ] Honour-system mode with local timestamp and optional photo attachment.
- [ ] `PeerVerification.ts`:
  - [ ] P2P QR code handshake: Device A generates encrypted 60-second QR token; Device B scans to confirm.
- [ ] `BadgeRegistry.ts`:
  - [ ] Award 25–50 Solidarity Tokens (ST) and Civic Action Badges (CAB) upon verified deed completion.

---

## 4. PoC Verification Tests
- [ ] **Test 16.1 (OSM Vector to Tilemap):** Provide mock GeoJSON of 4 city blocks; verify generated tilemap contains correct walls, roads, and walkable tiles.
- [ ] **Test 16.2 (Amenity Auto-Spawn):** Verify a GeoJSON amenity tagged `amenity=library` correctly spawns an interactable Tool Library node at its real geographic coordinate.
- [ ] **Test 16.3 (Tone & Lexicon Audit):** Automated regex search confirms 0 instances of polarizing ideological slurs or buzzwords across all user-facing strings.
- [ ] **Test 16.4 (IRL Deed Reward):** Logging a verified civic deed credits user wallet with ST and persists to state store.
