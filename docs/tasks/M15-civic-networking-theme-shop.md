# M15 — Pluggable Theming Engine, Commons Bazaar, Social Graph & Democratic Action Ticker

Story: [`docs/stories/EPIC-15-civic-networking-theme-shop-and-demo-ticker.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/stories/EPIC-15-civic-networking-theme-shop-and-demo-ticker.md)  
Planning: [`docs/planning/15-COMMUNITY-NETWORKING-CIVIC-TICKER-AND-THEME-SHOP.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/planning/15-COMMUNITY-NETWORKING-CIVIC-TICKER-AND-THEME-SHOP.md)  
Status: `[ ] Planned`

> System guardrail: all future theme/shop/social integrations remain standalone modules, but they must follow the M14 trust gate: install -> quarantine -> manifest + hash validation -> owner review -> sandboxed runtime approval. No theme or plugin is allowed to execute directly in the host app without passing this flow.

---

## 1. Shared Types (`packages/shared-types/src/`)
- [ ] `theme.ts`:
  - [ ] `ThemeManifest` (palette, assetOverrides, shaderPreset, author, version)
  - [ ] `BuildingSkinOverride` (stage0..stage3 sprite URLs)
- [ ] `shop.ts`:
  - [ ] `ShopItem` (id, title, category, priceST, priceCAB, unlockCriteria, previewUrl)
  - [ ] `UserInventory` & `UserWallet` (solidarityTokens, civicBadges)
- [ ] `social.ts`:
  - [ ] `FriendProfile` (userId, handle, districtName, day, resilienceScore, activeCrisis)
  - [ ] `SolidarityCaravan` (id, senderHandle, resourceType, amount, note, claimed)
- [ ] `civic.ts`:
  - [ ] `CivicAction` (id, title, organizer, startTime, locationSummary, sourceUrl, regionCode)
  - [ ] `LocalChapter` (id, name, type, distanceKm, address, websiteUrl)

---

## 2. Go Backend Tasks (`apps/api/`)
- [ ] Database Migrations:
  - [ ] `000003_social_and_shop.up.sql` (`user_inventory`, `user_wallets`, `user_friends`, `mutual_aid_caravans`, `civic_actions`)
- [ ] Theming Engine (`internal/theme/`):
  - [ ] `GET /api/v1/themes` — List verified installed theme bundles
- [ ] Commons Bazaar (`internal/shop/`):
  - [ ] `GET /api/v1/shop/catalog` — Return available blueprints and skins
  - [ ] `POST /api/v1/shop/purchase` — Validate balance, debit ST, grant item atomically
- [ ] Social Graph & Visiting (`internal/social/`):
  - [ ] `GET /api/v1/social/friends` — List player's connected friends and live crisis status
  - [ ] `POST /api/v1/social/friends/add` — Add friend by handle or invite code
  - [ ] `GET /api/v1/social/district/:userId` — Return sanitized snapshot of friend's district layout
  - [ ] `POST /api/v1/social/caravan/dispatch` — Send mutual aid caravan to friend
  - [ ] `POST /api/v1/social/caravan/:id/claim` — Claim incoming caravan shipment
- [ ] Civic Action & Protest Ticker (`internal/civic/`):
  - [ ] `GET /api/v1/civic/ticker` — Fetch upcoming verified pro-democracy rallies filtered by regional code
  - [ ] `GET /api/v1/civic/chapters` — Query nearest mutual aid tool libraries, fridges, and community land trusts

---

## 3. Frontend Tasks (`apps/web/`)
- [ ] Theming & Skin Engine:
  - [ ] `ThemePluginManager.ts` — Dynamic theme loader applying color variables and sprite swaps
  - [ ] Build 3 initial starter themes: Solarpunk 2036, Retro Game Boy 1989, 1930s Labor Woodcut
  - [ ] Theme switcher dropdown in Game Settings modal
- [ ] The Commons Bazaar (Shop UI):
  - [ ] `ShopModal.ts` — Tactile wooden storefront modal with tabbed item categories
  - [ ] Live ST wallet balance counter in HUD
  - [ ] One-click preview & purchase confirmation with celebratory sound chime
- [ ] "Common Grounds" Social Hub:
  - [ ] `SocialHubModal.ts` — Friends list, invite code copy button, friend request form
  - [ ] `FriendDistrictViewer.ts` — Read-only overlay rendering friend's district parcels and status
  - [ ] Caravan Dispatch Widget: Send battery power or food rations to friends during crises
- [ ] Civic Action Ticker & Real-World Bridge:
  - [ ] `CivicTickerWidget.ts` — Rolling alert ticker at bottom of morning broadsheet and HUD
  - [ ] `CivicDirectoryModal.ts` — Searchable local chapter directory with map links
  - [ ] In-browser PDF generator for "Found a Commons" organizing starter kit

---

## 4. Tests & Quality Verification
- [ ] Unit Test: Purchasing a 50 ST building facade correctly debits wallet and rejects on insufficient funds
- [ ] Unit Test: Dynamic theme loading overrides building stage textures without full page reload
- [ ] Integration Test: Dispatched caravan correctly decrements sender resources and credits recipient upon claim
- [ ] Security & Privacy: Verify `/api/v1/civic/ticker` requires only coarse region code (no GPS/IP storage)
