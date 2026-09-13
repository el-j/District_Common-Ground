# EPIC-16 — Real-World Geo-Mode (OSM Proof of Concept) & Universal Empathy Design

**Agent roles:** game-designer, level-designer, engineering-frontend-developer, narrative-designer, brand-guardian  
**Planning doc:** [`docs/planning/16-REAL-WORLD-GEO-MODE-AND-UNIVERSAL-SOLIDARITY.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/planning/16-REAL-WORLD-GEO-MODE-AND-UNIVERSAL-SOLIDARITY.md)  
**Parent vision:** [`docs/planning/15-COMMUNITY-NETWORKING-CIVIC-TICKER-AND-THEME-SHOP.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/planning/15-COMMUNITY-NETWORKING-CIVIC-TICKER-AND-THEME-SHOP.md) · [`docs/planning/14-DYNAMIC-MICROKERNEL-AND-EXTENSIBLE-MINIGAMES.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/planning/14-DYNAMIC-MICROKERNEL-AND-EXTENSIBLE-MINIGAMES.md)

---

## Vision
1. **Real-World Geo-Mode (Proof of Concept):** Give players the choice to play the game on a real geographic map of their own city/neighborhood, synthesized dynamically from **OpenStreetMap (OSM)** data, transforming their actual local streets, parks, and libraries into a playable commons.
2. **IRL Real-World Actions:** Enable players to step out into their physical community to do real good (helping an elderly neighbor, sharing food, repairing bikes, cleaning parks) and log verified deeds to earn Solidarity Tokens (ST) and Civic Action Badges (CAB) in their digital game account.
3. **Universal Empathy Design (The "Trojan Horse of Solidarity"):** Eliminate polarizing ideological buzzwords ("fascist", "anti-fascist") from all dialogue and mechanics. Frame conflicts around universal values—**Community Unity, Good Neighborliness, Fairness, and Standing Together Against Division & Greed**—so that anyone, including skeptical or right-leaning players, can play, enjoy, and naturally discover through gameplay systems that solidarity is the superior path.

---

## User Stories & Acceptance Criteria

### User Story 1: Play in Your Real City (OSM Geo-Mode PoC)
> **As a player**, I want to generate a playable game map based on my real-life neighborhood using OpenStreetMap, so that I can experience building community right on my own home streets.

* **Acceptance Criteria:**
  * Mode selection screen offers "Classic Canal District" or "Real-World Neighborhood Mode".
  * Player selects a city or enters a postal code / GPS coordinate.
  * Overpass API fetches road networks, green spaces, and buildings within a 1.0–2.0 km radius.
  * Vector geometry is rasterized into a 16px Phaser tilemap with collisions and pathfinding.
  * Real-world amenities automatically map to game hubs (Library ➔ Tool Hub, Bakery ➔ Community Kitchen, Park ➔ Commons Garden).
  * Generated map is cached in IndexedDB for 100% offline play.

### User Story 2: IRL Deeds Earn Digital Rewards
> **As a player**, I want to log real-life mutual aid actions I perform in my physical neighborhood, so that my real-world kindness empowers my digital community.

* **Acceptance Criteria:**
  * "Civic Journal" UI allows selecting real-world deed categories (Food Sharing, Eldercare, Park Greening, Community Repair).
  * Proof-of-concept verification supports local peer-to-peer QR code handshake or trusted honour-system logging.
  * Verified actions award in-game Solidarity Tokens (ST) and Civic Action Badges (CAB).

### User Story 3: Universal, Non-Alienating Tone
> **As a developer and storyteller**, I want all narrative text, crisis descriptions, and NPC dialogues to avoid polarizing political jargon ("fascist", "anti-fascist"), so that players of all backgrounds feel invited and learn solidarity through cause-and-effect gameplay.

* **Acceptance Criteria:**
  * Complete audit of game dialogues and crisis cards: zero instances of "fascist" or "anti-fascist".
  * Antagonistic forces are portrayed through concrete bad actions: "Predatory Speculators", "Authoritarian Officials", "Divide-and-Conquer Schemes".
  * Solidarity actions are portrayed as common-sense neighborly virtues: "Standing Together", "Looking Out for Each Other", "Defending Our Homes".
  * System dynamics clearly demonstrate that scapegoating leads to neighborhood ruin, while mutual aid leads to collective thriving.

---

## Technical Deliverables

### Frontend (`apps/web/src/geo/`)
* `OverpassClient.ts` — Query OSM elements via public Overpass API endpoints.
* `GeoJsonToTilemap.ts` — Rasterize OSM highway lines and building polygons into Phaser tile layers.
* `AmenityClassifier.ts` — Semantic tag mapping (`amenity=library` ➔ Tool Hub).
* `GpsController.ts` & `GeoCache.ts` — Coarse location handling and IndexedDB caching.

### Frontend (`apps/web/src/irl/`)
* `CivicJournal.ts` — Action logger and categories.
* `PeerVerification.ts` — QR code generator and reader for peer handshakes.
* `BadgeRegistry.ts` — Digital reward dispatcher granting ST/CAB.
