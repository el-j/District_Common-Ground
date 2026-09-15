# M15 — Pluggable Theming Engine, Commons Bazaar, Social Graph & Democratic Action Ticker

Story: [`docs/archive/EPIC-15-civic-networking-theme-shop-and-demo-ticker.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/archive/EPIC-15-civic-networking-theme-shop-and-demo-ticker.md)  
Planning: [`docs/planning/15-COMMUNITY-NETWORKING-CIVIC-TICKER-AND-THEME-SHOP.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/planning/15-COMMUNITY-NETWORKING-CIVIC-TICKER-AND-THEME-SHOP.md)  
Status: `[x] Complete`

> System guardrail: all future theme/shop/social integrations remain standalone modules, but they must follow the M14 trust gate: install -> quarantine -> manifest + hash validation -> owner review -> sandboxed runtime approval. No theme or plugin is allowed to execute directly in the host app without passing this flow.

---

## 1. Shared Types (`packages/shared-types/src/`)
- [x] `theme.ts`:
  - [x] `ThemeManifest` (palette, assetOverrides, shaderPreset, author, version)
  - [x] `BuildingSkinOverride` (stage0..stage3 sprite URLs)
- [x] `shop.ts`:
  - [x] `ShopItem` (id, title, category, priceST, priceCAB, unlockCriteria, previewUrl)
  - [x] `UserInventory` & `UserWallet` (solidarityTokens, civicBadges)
- [x] `social.ts`:
  - [x] `FriendProfile` (userId, handle, districtName, day, resilienceScore, activeCrisis)
  - [x] `SolidarityCaravan` (id, senderHandle, resourceType, amount, note, claimed)
  - [x] `DistrictSnapshot`, `MyProfile` — added beyond the literal spec; needed by the district viewer and the invite-code copy button respectively
- [x] `civic.ts`:
  - [x] `CivicAction` (id, title, organizer, startTime, locationSummary, sourceUrl, regionCode)
  - [x] `LocalChapter` (id, name, type, distanceKm, address, websiteUrl)

---

## 2. Go Backend Tasks (`apps/api/`)
- [x] Database Migrations:
  - [x] `007_create_shop_wallets.up.sql` (`user_wallets`, `user_inventory`)
  - [x] `008_create_social_graph.up.sql` (`handle`/`invite_code` columns on `users`, `user_friends`, `mutual_aid_caravans`)
  - [x] `009_create_civic_actions.up.sql` (`civic_actions`, `local_chapters`, seeded with illustrative in-fiction "GENERIC" region data)
- [x] Theming Engine (`internal/theme/`):
  - [x] `GET /api/v1/themes` — List verified installed theme bundles
- [x] Commons Bazaar (`internal/shop/`):
  - [x] `GET /api/v1/shop/catalog` — Return available blueprints and skins
  - [x] `GET /api/v1/shop/wallet` & `GET /api/v1/shop/inventory` — Read current balance/ownership (auth required)
  - [x] `POST /api/v1/shop/purchase` — Validate balance, debit ST, grant item atomically (row-locked transaction; rejects insufficient funds and duplicate ownership)
- [x] Social Graph & Visiting (`internal/social/`):
  - [x] `GET /api/v1/social/friends` — List player's connected friends and live crisis status (joins `game_saves` JSONB for live day/resilience/activeCrisis)
  - [x] `POST /api/v1/social/friends/add` — Add friend by handle or invite code (symmetric friendship, rejects self-add and duplicates)
  - [x] `GET /api/v1/social/district/:userId` — Return sanitized snapshot of friend's district layout (friendship-gated, 403 otherwise)
  - [x] `POST /api/v1/social/caravan/dispatch` — Send mutual aid caravan to friend (friendship-gated)
  - [x] `POST /api/v1/social/caravan/:id/claim` — Claim incoming caravan shipment (row-locked; idempotent — a second claim is rejected)
  - [x] `GET /api/v1/social/me` & `GET /api/v1/social/caravan/inbox` — added beyond the literal spec; needed for the invite-code display and the Caravan Dispatch Widget's inbox
- [x] Civic Action & Protest Ticker (`internal/civic/`):
  - [x] `GET /api/v1/civic/ticker` — Fetch upcoming verified pro-democracy rallies filtered by regional code (reads only `?region=`, defaults to `GENERIC`; public, no auth)
  - [x] `GET /api/v1/civic/chapters` — Query nearest mutual aid tool libraries, fridges, and community land trusts (sorted by curated `distance_km`, filtered by the same coarse `?region=`)

---

## 3. Frontend Tasks (`apps/web/`)
- [x] Theming & Skin Engine:
  - [x] `ThemePluginManager.ts` — Dynamic theme loader applying color variables and sprite swaps
  - [x] Build 3 initial starter themes: Solarpunk 2036, Retro Game Boy 1989, 1930s Labor Woodcut
  - [x] Theme switcher dropdown in Game Settings modal
- [x] The Commons Bazaar (Shop UI):
  - [x] `ShopModal.ts` — Wooden storefront modal with tabbed item categories (facade/cosmetic/blueprint)
  - [x] Live ST wallet balance counter in HUD
  - [x] One-click preview & purchase confirmation with celebratory sound chime (`playSolidarityChime`)
- [x] "Common Grounds" Social Hub:
  - [x] `SocialHubModal.ts` — Friends list, invite code copy button, friend request form
  - [x] `FriendDistrictViewer.ts` — Read-only overlay rendering friend's district parcels and status
  - [x] Caravan Dispatch Widget: Send energy/food/cash to friends during crises (built as the modal's "Caravans" tab rather than a separate widget file — same consolidation `ShopModal.ts` already used for its tabs)
- [x] Civic Action Ticker & Real-World Bridge:
  - [x] `CivicTickerWidget.ts` — Rolling alert ticker at bottom of HUD (fixed marquee bar) and condensed into the morning broadsheet sidebar
  - [x] `CivicDirectoryModal.ts` — Searchable local chapter directory with map/website links, opened via a new HUD button
  - [x] In-browser PDF generator for "Found a Commons" organizing starter kit (`core/util/PdfGenerator.ts` — dependency-free, hand-written PDF 1.4 byte stream, no new npm package)

---

## 4. Tests & Quality Verification
- [x] Unit Test: Purchasing a 50 ST building facade correctly debits wallet and rejects on insufficient funds (`apps/api/internal/shop/repository_test.go`, verified against real Postgres via testcontainers)
- [x] Unit Test: Dynamic theme loading overrides building stage textures without full page reload (`apps/web/src/skins/ThemeManager.test.ts` — a `switchSkin()` call against a live scene mock removes and reloads a `BUILD_KITCHEN_BUILT` texture via `scene.textures.remove`/`scene.load.image`, never touches `location.reload`, and cleanly skips a token whose texture 404s)
- [x] Integration Test: Dispatched caravan correctly decrements sender resources and credits recipient upon claim (`apps/api/internal/social/repository_test.go`, verified against real Postgres — dispatch is friendship-gated, a stranger cannot claim, and a second claim is rejected as already-claimed; the actual client-side resource debit/credit reuses the already-tested `spendCash`/`spendEnergy`/`gainCash` actions in `apps/web/src/core/state/actions.test.ts`, per the same reward-settlement pattern used for minigame rewards)
- [x] Security & Privacy: Verify `/api/v1/civic/ticker` requires only coarse region code (no GPS/IP storage) (`apps/api/internal/civic/handler_test.go` — asserts the handler serves correctly from a request with no `RemoteAddr` and no geolocation headers, using only `?region=`; region is a Settings-modal dropdown value, never derived from GPS/IP anywhere in the client)
