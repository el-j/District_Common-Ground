# EPIC-15 — Pluggable Theming Engine, Commons Bazaar, Social Networking & Democratic Action Ticker

**Agent roles:** engineering-backend-architect, engineering-frontend-developer, game-designer, narrative-designer, whimsy-injector, brand-guardian  
**Planning doc:** [`docs/planning/15-COMMUNITY-NETWORKING-CIVIC-TICKER-AND-THEME-SHOP.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/planning/15-COMMUNITY-NETWORKING-CIVIC-TICKER-AND-THEME-SHOP.md)  
**Parent vision:** [`docs/planning/14-DYNAMIC-MICROKERNEL-AND-EXTENSIBLE-MINIGAMES.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/planning/14-DYNAMIC-MICROKERNEL-AND-EXTENSIBLE-MINIGAMES.md) · [`docs/kickstart/Architecture Vision & Epic.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/kickstart/Architecture%20Vision%20&%20Epic.md)

---

## Vision
Transform the game into a **civic nexus and customizable living universe**:
1. **Pluggable Skinning & Theming System:** Introduce new architectural aesthetics, color grades, and sprites dynamically via zero-core-touch theme plugins.
2. **The Commons Bazaar (Ethical In-Game Shop):** An in-game marketplace where players spend earned Solidarity Tokens (ST) on architectural facades, street foliage, and aesthetic upgrades with zero predatory microtransactions.
3. **"Common Grounds" Social Graph & Friend Visiting:** Connect with real players as friends, inspect their custom-built districts, and dispatch cross-district mutual aid caravans during crises.
4. **Real-World Community Bridge & Democratic Action Ticker:** Discover or found physical local community initiatives (tool libraries, food pantries) and follow a live regional news-ticker of verified pro-democracy demonstrations and climate strikes.

---

## User Stories & Acceptance Criteria

### User Story 1: Pluggable Skinning & Custom Building Facades
> **As a player**, I want to customize the look and feel of my district buildings, ground tiles, and characters with community-created theme packs, so that my neighborhood expresses our unique collective identity.

* **Acceptance Criteria:**
  * Theme manifests conform to `ThemeManifest` schema (`packages/shared-types`).
  * Themes can be toggled in real time without refreshing the page or restarting the game.
  * Overrides apply to all 4 visual construction tiers of buildings.

### User Story 2: The Commons Bazaar (Ethical Shop)
> **As a player**, I want to spend the Solidarity Tokens I earn from minigames and mutual-aid actions on gorgeous architectural blueprints, public murals, and garden plants, so that my gameplay achievements feel deeply rewarding.

* **Acceptance Criteria:**
  * In-game shop modal rendered with tabbed categories (Facades, Murals, Foliage, Themes).
  * Items cost Solidarity Tokens (earned in-game) or Civic Action Badges (earned via IRL civic quests).
  * Zero pay-to-win mechanics or real-money loot boxes.
  * Purchases persist to PostgreSQL (`user_inventory` and `user_wallets`).

### User Story 3: "Common Grounds" Social Graph & District Visiting
> **As a player**, I want to add friends via handle or code, walk around their created districts to see how they solved urban challenges, and send them emergency supplies when they face a crisis.

* **Acceptance Criteria:**
  * Friend invitation by unique player handle or code.
  * "Visit Common Ground" button loads a lightweight, interactive snapshot of the friend's district.
  * If a friend is in an active crisis, player can dispatch a **Solidarity Caravan** (kW of power, soup rations, legal aid).
  * Recipient receives a notification and claims supplies upon next login.

### User Story 4: Real-World Community Chapter Finder & Democratic Protest Ticker
> **As a civic-minded citizen**, I want the game to connect me to real local mutual aid initiatives and alert me to upcoming pro-democracy and community unity rallies in my area, so that my digital solidarity translates into physical community defense.

* **Acceptance Criteria:**
  * Coarse regional ticker displays upcoming verified non-violent demonstrations (date, time, location, theme).
  * Local chapter finder lists nearby physical tool libraries, community gardens, and fridges by city/postal area.
  * "Found a Commons" button opens downloadable open-source community organizing toolkits (PDF flyers, legal templates).
  * Zero exact GPS tracking (privacy-first coarse city-level resolution).

---

## Technical Deliverables

### Backend (`apps/api/`)
* `internal/theme/` — Theme catalog endpoint and manifest validation.
* `internal/shop/` — Inventory, wallet persistence, and transaction validation.
* `internal/social/` — Friend graph, district snapshot serializer, and mutual-aid caravan queue.
* `internal/civic/` — Regional demo aggregator and open mutual-aid directory endpoints.

### Frontend (`apps/web/`)
* `src/skins/ThemePluginManager.ts` — Dynamic theme loader and palette swapper.
* `src/shop/ShopModal.ts` — Interactive Commons Bazaar shopping experience.
* `src/social/SocialHubModal.ts` & `FriendDistrictViewer.ts` — Friend browser and visiting engine.
* `src/civic/CivicTickerWidget.ts` & `CivicDirectoryModal.ts` — Action ticker and community finder.
