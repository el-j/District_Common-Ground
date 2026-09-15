# M16 — Real-World Geo-Mode (OSM Proof of Concept) & Universal Empathy Design

Story: [`docs/archive/EPIC-16-real-world-geo-mode-and-irl-actions.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/archive/EPIC-16-real-world-geo-mode-and-irl-actions.md)  
Planning: [`docs/planning/16-REAL-WORLD-GEO-MODE-AND-UNIVERSAL-SOLIDARITY.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/planning/16-REAL-WORLD-GEO-MODE-AND-UNIVERSAL-SOLIDARITY.md)  
Status: `[x] PoC Complete` — see scoping notes below for two deliberate PoC-level simplifications (Phaser world integration and QR transport).

> **Scoping notes (read before extending):**
> 1. **Geo-Mode rendering.** The OSM ingestion → rasterization → amenity-classification pipeline is fully implemented and tested, but it renders into a standalone `GeoPreviewModal.ts` canvas preview (opened from Character Select), not into the live `WorldScene` Phaser tilemap. Splicing a dynamically-generated tilemap into the existing hand-authored 64×80 world is a much larger, riskier change (collision layers, camera bounds, NPC/portal placement all assume the fixed map) — reasonable full-integration follow-up work, out of scope for a PoC.
> 2. **Peer verification transport.** `PeerVerification.ts` implements the planning doc's explicitly-sanctioned alternative to a QR scan: a short-lived 4-word code ("solar-bread-solidarity-tree") shown on the initiating device and re-entered by the confirming neighbor. This avoids requiring camera permissions / a QR encoder library for a PoC, and is swappable later for a real QR transport without changing `CivicJournal.ts`'s calling code.

---

## 1. Universal Lexicon & Tone Audit (All Existing Docs & Content)
- [x] Scan and update existing documentation and crisis strings:
  - [x] Remove all occurrences of "fascist" and "anti-fascist" (found live in `crisis_scenarios.json`, `CrisisWireModal.ts`, `CrisisEngine.ts`, `narrativeGossip.ts`, `WorldScene.ts` — archetype renamed `FASCIST_AGITATION` → `DIVISION_AGITATION`, 3 crisis scenario ids/bodies rewritten, also removed the related "far-right" phrasing in the same 3 scenarios).
  - [x] Replace with "Community Unity", "Neighborhood Defense", "Authoritarian Greed", "Outside Speculators" (used "outside agitator(s)"/"division network"/"hateful division flyers" in the rewritten scenario text).
  - [x] Verify that cause-and-effect mechanics speak louder than ideological labels (scenario consequences unchanged — only naming/labeling was rewritten, not the choice mechanics).
  - [x] Automated regression coverage: `apps/web/src/core/util/lexiconAudit.test.ts` scans all `.ts` source and `public/assets/data/*.json` content for banned terms (fascist/fascism, anti-fascist, far-right, alt-right, comrade, cadre) — this is also Test 16.3 below.

---

## 2. OpenStreetMap (OSM) Ingestion Engine (`apps/web/src/geo/`)
- [x] `OverpassClient.ts`:
  - [x] Query builder: BBox query for `highway`, `building`, `leisure=park`, `amenity`, plus `shop` and `landuse=grass`.
  - [x] Fallback sample GeoJSON dataset (offline demo neighborhood in Berlin-Neukölln & London-Hackney) — used automatically whenever the live Overpass fetch fails or returns non-OK, so the pipeline never throws.
- [x] `GeoJsonToTilemap.ts`:
  - [x] Vector polygon rasterizer: convert OSM building footprints to WALL tiles (bounding-box fill — a deliberate v1 simplification over true point-in-polygon fill, noted in-code).
  - [x] Road network rasterizer: convert OSM highway line strings to ROAD / SIDEWALK tiles (footway/pedestrian/path → SIDEWALK, everything else tagged `highway` → ROAD).
  - [x] Green space rasterizer: convert parks and grass polygons to GRASS tiles (explicit, not just left at the default).
- [x] `AmenityClassifier.ts`:
  - [x] Match real libraries ➔ Tool Hub node.
  - [x] Match real bakeries/supermarkets ➔ Community Kitchen node.
  - [x] Match real parks/grass ➔ Commons Garden plot.
  - [x] Added beyond the literal spec: community_centre/social_facility ➔ Town Hall node, school/kindergarten ➔ Care Center node (both already in the planning doc's semantic mapping table, just not called out in this task's checklist).
- [x] `GeoCache.ts`:
  - [x] Cache generated tilemaps in `idb-keyval` / `IndexedDB` for instant offline replay, keyed by rounded lat/lon/radius so GPS jitter reuses the same cache entry.
- [x] `GeoPreviewModal.ts` (`apps/web/src/ui/`) — added beyond the literal spec; the actual "Real-World Neighborhood Mode" entry point from Character Select, rendering the generated tile grid + amenity list on a canvas (see scoping note above).

---

## 3. IRL Real-World Action Engine (`apps/web/src/irl/`)
- [x] `CivicJournal.ts`:
  - [x] Action logging modal with preset categories (Eldercare, Food Sharing, Park Greening, Community Repair).
  - [x] Honour-system mode with local timestamp (server `created_at`); photo attachment omitted (no file upload/storage infra in this PoC — note field is free text).
- [x] `PeerVerification.ts`:
  - [x] Local handshake: Device A generates a 60-second 4-word code; confirming neighbor re-enters it to upgrade the deed to `peer_verified` (see scoping note above re: QR vs. word-code).
- [x] `BadgeRegistry.ts`:
  - [x] Award 25 ST / 1 CAB (honour system) or 50 ST / 2 CAB (peer-verified) upon deed completion — within the planning doc's 25-50 ST range.
  - [x] Added beyond the literal spec: an offline outbox (`idb-keyval`) so a deed logged while signed out or offline is never lost — it queues locally and syncs via `flushOutbox()` once connectivity + auth return, consistent with this project's existing hybrid IndexedDB/server persistence pattern.
- [x] Go backend (`apps/api/internal/irl/`) — not called out as a separate checklist item in this doc, but required to actually credit a durable wallet: migration `010_create_irl_deeds`, `POST /api/v1/irl/deeds` (validates category + verification method, credits `user_wallets` atomically, row-locked like `internal/shop`'s purchase flow), `GET /api/v1/irl/deeds` (history, for the Civic Journal's "recent deeds" list).

---

## 4. PoC Verification Tests
- [x] **Test 16.1 (OSM Vector to Tilemap):** `apps/web/src/geo/GeoJsonToTilemap.test.ts` — mock GeoJSON of a 4-block neighborhood (two crossing streets, a park, a building) produces a 50×50 grid containing WALL, ROAD, and GRASS tiles; also covers sidewalk-vs-road tagging and building-over-road precedence.
- [x] **Test 16.2 (Amenity Auto-Spawn):** `apps/web/src/geo/AmenityClassifier.test.ts` — a GeoJSON `amenity=library` point spawns a `tool_hub` marker at its exact input lat/lon.
- [x] **Test 16.3 (Tone & Lexicon Audit):** `apps/web/src/core/util/lexiconAudit.test.ts` — regex scan of all TS source + game content JSON confirms 0 instances of fascist/anti-fascist/far-right/alt-right/comrade/cadre.
- [x] **Test 16.4 (IRL Deed Reward):** `apps/api/internal/irl/repository_test.go` + `handler_test.go` (5 tests, real Postgres via testcontainers) — logging a deed credits ST/CAB to the wallet, accumulates across multiple deeds, and rejects invalid category/verification-method input; `apps/web/src/irl/BadgeRegistry.test.ts` covers the client-side sync/offline-outbox behavior around the same endpoint.
