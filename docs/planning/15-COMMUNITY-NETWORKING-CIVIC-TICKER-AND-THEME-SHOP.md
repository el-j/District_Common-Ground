# 15 — Pluggable Theming Engine, Commons Shop, Real-World Community Foundation & Civic Action Ticker

**Studio Agent Consortium:** Game Designer 🎮, Narrative Designer 📖, Economy Designer 💰, Level Designer 🏛️, Backend Architect 🛠️, Frontend Developer 💻, Whimsy Injector ✨, Brand Guardian 🛡️  
**Status:** Living Architectural Specification & Vision Bible  
**Parent Vision Documents:** [`docs/kickstart/Architecture Vision & Epic.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/kickstart/Architecture%20Vision%20&%20Epic.md) · [`docs/planning/14-DYNAMIC-MICROKERNEL-AND-EXTENSIBLE-MINIGAMES.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/planning/14-DYNAMIC-MICROKERNEL-AND-EXTENSIBLE-MINIGAMES.md) · [`docs/planning/00-MASTER-INDEX-AND-DESIGN-BIBLE.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/planning/00-MASTER-INDEX-AND-DESIGN-BIBLE.md)  

---

## 1. Vision Statement & Core Pillars

*District: Common Ground* is more than a digital city simulation: it is a **civic bridge connecting online solidarity play to physical, real-world community power**. 

This specification introduces four transformative gameplay and architectural systems:
1. **Pluggable Skin & Theming Engine (Zero-Core-Touch Cosmetics):** Anyone can author a theme plugin that reskins buildings, characters, pavements, street furniture, and vegetation (Solarpunk 2036, Neo-Bauhaus, 1930s Labor Woodcut, Cyber-Eco, Mediterranean Clay).
2. **The Commons Bazaar (Ethical In-Game Shop):** An in-game marketplace where players exchange earned Solidarity Tokens, Community Credits, and mutual-aid points for architectural facades, atmospheric weather filters, and visual decorations. Strictly zero pay-to-win, zero predatory microtransactions.
3. **"Common Grounds" Social Graph & Friend Visiting:** Players connect with friends, inspect each other’s customized districts, and send cross-district mutual aid caravans (kilowatts, soup rations, legal toolkits) when a friend’s neighborhood is hit by a crisis.
4. **Real-World Civic Foundation & Democratic Protest Ticker:** Connect in-game neighborhoods to physical community initiatives (tool libraries, tenant unions, mutual-aid fridges) and display verified live news-tickers of regional pro-democracy demonstrations, climate marches, and community unity rallies.

```
┌───────────────────────────────────────────────────────────────────────────────────────────┐
│                    THE CIVIC & SOCIAL DISTRICT ECOSYSTEM (v2.5)                           │
│                                                                                           │
│   ┌────────────────────────┐   ┌─────────────────────────┐   ┌─────────────────────────┐  │
│   │ PLUGGABLE THEME ENGINE │   │   THE COMMONS BAZAAR    │   │  "COMMON GROUNDS" GRAPH │  │
│   │ • Facades, Tilesets    │   │ • Solidarity Currency   │   │ • Add Friends & Inspect │  │
│   │ • Dynamic Palette Swap │──>│ • Fair Architectural    │──>│ • Cross-District Aid    │  │
│   │ • Audio Soundfonts     │   │   Cosmetics & Blueprints│   │   Caravans during crisis│  │
│   └────────────────────────┘   └─────────────────────────┘   └─────────────────────────┘  │
│                                              │                                            │
│                                              ▼                                            │
│   ┌───────────────────────────────────────────────────────────────────────────────────┐   │
│   │                  REAL-WORLD CIVIC BRIDGE & PROTEST TICKER                         │   │
│   │  • Real-World Community Chapter Registry (Find/Found a local tool library/fridge) │   │
│   │  • Live Regional Democratic Action Ticker (Verified rallies, climate strikes)     │   │
│   │  • Coarse-grained Geolocation (Privacy-first; zero exact GPS tracking)            │   │
│   └───────────────────────────────────────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. System 1: Pluggable Skin & Theming Engine

### 2.1 The Plugin Theme Architecture
In alignment with the Microkernel architecture defined in [`docs/planning/14-DYNAMIC-MICROKERNEL-AND-EXTENSIBLE-MINIGAMES.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/planning/14-DYNAMIC-MICROKERNEL-AND-EXTENSIBLE-MINIGAMES.md), skin packs are **autonomous plugins** that require **zero modifications to the core engine**. However, they are not executed directly from the host app. They follow the same trust gate as every other third-party bundle: quarantine on install, manifest and bundle hash validation, owner review, and only then sandboxed runtime launch in the verified catalog.

A theme plugin can override:
* **Building Facades & Stages:** Custom sprites/textures for each of the 4 construction tiers (Groundwork, Scaffolding, Operational, Solarpunk Bloom).
* **Ground Tiles & Infrastructure:** Cobblestone, bioswale grass, brick sidewalks, retro asphalt.
* **Character Outfits & Tokens:** Customized spritesheets for Pip, Morgan, Arthur, and neighborhood NPCs.
* **Atmospheric Color Grading & Shaders:** Day/night tint curves, bloom, saturation, CRT scanlines, or warm golden-hour lighting.
* **Procedural Soundfonts:** Custom frequency presets for the procedural Web Audio synthesizer.

### 2.2 Theme Manifest Specification (`packages/shared-types/src/theme.ts`)
```typescript
export interface ThemeManifest {
  id: string;
  version: string;
  name: string;
  author: string;
  description: string;
  thumbnailUrl: string;
  palette: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
    crisisWarning: string;
    solidarityBloom: string;
  };
  assetOverrides: {
    tilesetUrl?: string;
    buildings?: Record<string, {
      stage0?: string; // Blight
      stage1?: string; // Foundation
      stage2?: string; // Framing
      stage3?: string; // Complete Bloom
    }>;
    playerSprites?: Record<'pip' | 'morgan' | 'arthur', string>;
    uiStyleUrl?: string; // Scoped CSS bundle
  };
  shaderPreset?: 'default' | 'solarpunk-glow' | 'woodcut-sepia' | 'gameboy-green' | 'neon-eco';
}
```

### 2.3 Curated Starter Theme Bundles
1. **Solarpunk 2036 (Default):** Vibrant lush greens, photovoltaic cobalt glass, terracotta pots, clean white framing, warm sunlight bloom.
2. **Retro Game Boy 1989:** 4-shade olive green dot-matrix aesthetic, 8-bit procedural square-wave audio, nostalgic handheld frame.
3. **1930s Labor Broadsheet:** High-contrast woodcut engraving textures, sepia ink stains, linocut typography, industrial brass steam elements.
4. **Neo-Bauhaus Cooperative:** Geometric bold primary shapes, clean constructivist typography, minimalist brickwork, vibrant primary color accents.
5. **Mediterranean Earth:** Sun-baked adobe clay, olive branch trellises, shaded canvas pergolas, acoustic Spanish guitar procedural chimes.

---

## 3. System 2: The Commons Bazaar (Ethical In-Game Shop)

### 3.1 Ethical Economy & Currencies
Most modern mobile and browser games use predatory microtransactions, FOMO timers, and loot boxes. *District: Common Ground* completely subverts this by creating a **purely meritocratic and solidarity-driven in-game shop**:

* **Solidarity Tokens (⭐️ ST):** Earned through:
  - Completing daily community quests in Street Quest Mode.
  - Playing district minigames (*Cargo Courier Rush*, *Kitchen Solidarity Frenzy*).
  - Assisting neighbors during morning crisis resolution.
  - Visiting a friend's district and donating mutual-aid resources.
* **Civic Action Badges (🎖️ CAB):** Awarded when players complete real-world civic actions (e.g. logging a community garden volunteer shift or verifying attendance at a democratic rally).
* **Zero Real Money Pay-to-Win:** Real cash cannot buy game advantage. If optional supporter packs are introduced in the future, 100% of proceeds go to real-world grassroots mutual aid and tenant defense organizations, verified via open ledger.

### 3.2 Catalog Categories in the Commons Bazaar
1. **Architectural Blueprints & Skins:**
   - *Rooftop Greenhouse Dome* (Translucent geodesic glass canopy).
   - *Bicycle Repair Hub Facade* (Vintage pegboard, colorful hanging wheels).
   - *Community Bakery Oven* (Cob wood-fired clay oven with smoking stovepipe).
2. **Street Furnishings & Public Art:**
   - *Solidarity Murals* ("Housing is a Human Right", "Climate Justice Now").
   - *Planter Boxes & Tree Wells* (Ginkgo trees, wildflower pollinator patches).
   - *Scraps’ Playground* (Cat climbing towers, cardboard boxes on sidewalks).
3. **Atmospheric Weather & Mood Filters:**
   - *Summer Rainstorm with Raindroplets on Glass*.
   - *Golden Autumn Twilight*.
   - *May Day Festive Bunting & Paper Lanterns*.

---

## 4. System 3: "Common Grounds" Social Graph & Friend Visiting

### 4.1 Asynchronous District Visiting
Players can link with friends using a **Friend Handle** or **District Invite Code** (e.g., `@pip_berlin` or `dcg-8x7a-9k21`):
* **District Inspection ("Visit Common Ground"):**
  - Load a read-only, fully interactive view of your friend's district.
  - Walk around their custom-built neighborhood as a visiting delegate.
  - Marvel at how they organized their solar arrays, community kitchens, and gardens.
  - Check their **Resilience History** (which crisis choices they made, how their Community Land Trust is deeded).
* **Cross-District Mutual Aid Caravans:**
  - If your friend's district is currently in a crisis (e.g., a "Heat Dome" with high energy demand or a "Transit Strike"), an alert icon appears next to their name.
  - You can dispatch a **Solidarity Caravan** from your surplus supplies:
    - Send 20 kW from your solar battery reserve.
    - Send 10 soup ration baskets from your community kitchen.
    - Send legal defense templates to stop an eviction streak.
  - The recipient receives the supplies next time they log in with a heartwarming thank-you note from your avatar!

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      FRIEND DISTRICT INSPECTION HUD                     │
│                                                                         │
│  Visiting: [Elena's Kreuzberg Commons]  •  District Day: 42             │
│  Resilience Score: 88%  •  Theme: Solarpunk 2036                        │
│                                                                         │
│  [STATUS: HEAT DOME BLACKOUT ACTIVE!]                                    │
│  "Elena's neighborhood is short on battery power for the cooling hub!"  │
│                                                                         │
│  ┌───────────────────────────┐      ┌────────────────────────────────┐  │
│  │  [DISPATCH 25 kW BATTERY] │      │  [LEAVE SOLIDARITY NOTE 📝]    │  │
│  └───────────────────────────┘      └────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Finding Neighbors & Federated Local Communities
* **Regional Matching:** Match with players in the same metropolitan area or bioregion (e.g., "Berlin-Brandenburg", "Pacific Northwest", "London Greater Area").
* **Federated Protocol Support (ActivityPub / Matrix Stubs):** Future-proof social architecture designed to bridge into federated open networks without lock-in.

---

## 5. System 4: Real-World Community Foundation & Democratic Action Ticker

### 5.1 Real-World Community Chapters ("Found a Commons")
The ultimate triumph of the game is when digital play fosters physical real-world collaboration:
* **The "Commons Finder":**
  - An in-game map directory integrating open-source mutual aid indexes (e.g. Mutual Aid Hub, Community Fridge directories, OpenStreetMap community centers).
  - Players can search their coarse postal code to discover real local initiatives:
    - *Berlin: Solidarische Küche e.V. (3.2 km)*
    - *London: Hackney Tool Library (1.8 km)*
    - *New York: Bushwick Community Fridge (0.9 km)*
* **"Found a Local Chapter":**
  - If no local initiative exists in the player's area, the game provides an open-source **"Kickstart Your Commons" Toolkit**:
    - Printable PDF templates for setting up a neighborhood WhatsApp/Signal mutual-aid group.
    - Step-by-step legal guide to founding a community land trust or tenant association.
    - Blueprint for building a weatherproof wooden sharing shelf / street pantry.

### 5.2 Live Democratic Protest & Rally Ticker
In times of democratic backsliding, rising far-right extremism, and climate breakdown, public democratic mobilization is a critical frontline:
* **The Civic Action Ticker:**
  - A subtle, tactile news-ticker running at the base of the morning broadsheet (*The Daily District Ground*) and in the District Dispatch modal.
  - Displays verified upcoming non-violent civic actions, pro-democracy rallies, anti-racist demonstrations, and climate strikes.
* **Privacy-First Regional Aggregation:**
  - **No exact GPS:** Location is derived purely from user-selected coarse region (e.g. Country + State/City) or opt-in GeoIP lookup rounded to the nearest 50 km.
  - **Curated Open Ingestion:**
    - RSS/JSON ingestion from verified civic strike registries (e.g. *Fridays for Future Global Strike Map*, *Democracy Defense Rallies*, *Tenant Union Action Calendars*).
    - AI-assisted moderation filter that strips partisan smears, hate speech, or unverified events, strictly highlighting broad pro-human-rights, pro-democracy, and community unity gatherings.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    THE CIVIC ACTION DISPATCH (LIVE)                     │
│                                                                         │
│  📍 Region: Central Europe / Berlin-Brandenburg                         │
│  📢 UPCOMING DEMOCRATIC MOBILIZATIONS:                                  │
│                                                                         │
│  • [SAT 14:00] Brandenburg Gate — "Stand Together for Democracy & Equal │
│    Rights: Protest Against Far-Right Extremism" (Est. 45,000 attending) │
│  • [SUN 11:00] Hermannplatz — "Community Land & Housing Assembly:       │
│    Rally for Affordable Rents"                                          │
│  • [FRI 15:00] Invalidenpark — "Global Climate Strike: Clean Energy     │
│    for All Neighborhoods"                                               │
│                                                                         │
│  [➕ ADD LOCAL CIVIC EVENT]        [DOWNLOAD ORGANISING TOOLKIT (PDF)]   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Architecture & Technical Implementation

### 6.1 Backend Architecture (Go)

```
apps/api/internal/
├── theme/
│   ├── registry.go              # Dynamic theme bundle discovery & validation
│   └── handlers.go              # GET /api/v1/themes (catalog & manifests)
├── shop/
│   ├── catalog.go               # In-game items, blueprints, price tables in ST / CAB
│   ├── repository.go            # User inventory & transactions (PostgreSQL)
│   └── handlers.go              # POST /api/v1/shop/purchase, GET /api/v1/shop/catalog
├── social/
│   ├── friends.go               # Friend requests, invite codes, mutual relationships
│   ├── visitor.go               # Read-only district snapshot serializer
│   ├── caravan.go               # Cross-district mutual aid transaction queue
│   └── handlers.go              # /api/v1/social/friends, /api/v1/social/visit/:id
└── civic/
    ├── ticker.go                # Verified demo & strike aggregator (RSS / Civic Feeds)
    ├── chapters.go              # Real-world community hubs database
    └── handlers.go              # GET /api/v1/civic/ticker?region=XYZ
```

### 6.2 Database Schema Additions (`apps/api/migrations/000003_social_and_shop.up.sql`)
```sql
-- User inventory for purchased/unlocked skins and cosmetics
CREATE TABLE user_inventory (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    item_id VARCHAR(64) NOT NULL,
    item_type VARCHAR(32) NOT NULL, -- 'theme', 'facade', 'decoration', 'badge'
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (user_id, item_id)
);

-- Player currency wallets
CREATE TABLE user_wallets (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    solidarity_tokens INT NOT NULL DEFAULT 100,
    civic_badges INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Friend relationships and social graph
CREATE TABLE user_friends (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    friend_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (user_id, friend_id)
);

-- Cross-district mutual aid caravans
CREATE TABLE mutual_aid_caravans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
    recipient_id UUID REFERENCES users(id) ON DELETE CASCADE,
    resource_type VARCHAR(32) NOT NULL, -- 'kilowatts', 'soup', 'legal_kit'
    amount INT NOT NULL,
    note TEXT,
    claimed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Regional civic demonstration ticker cache
CREATE TABLE civic_actions (
    id VARCHAR(128) PRIMARY KEY,
    region_code VARCHAR(32) NOT NULL,
    title TEXT NOT NULL,
    organizer TEXT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    location_summary TEXT NOT NULL,
    source_url TEXT,
    verified BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_civic_region ON civic_actions(region_code, start_time);
```

### 6.3 Frontend Architecture (TypeScript)

```
apps/web/src/
├── skins/
│   ├── ThemePluginManager.ts    # Loads and compiles dynamic theme manifests
│   └── shaders/                 # Dynamic fragment shaders per active theme
├── shop/
│   ├── ShopModal.ts             # Tactile Commons Bazaar UI modal
│   └── ShopCatalog.ts           # Client price definitions & preview renderer
├── social/
│   ├── SocialHubModal.ts        # Friends list, invite code, caravan dispatch
│   ├── FriendDistrictViewer.ts  # Sandboxed read-only District renderer for visiting
│   └── CaravanManager.ts        # Send and claim incoming solidarity shipments
└── civic/
    ├── CivicTickerWidget.ts     # Compact rolling ticker on HUD / Broadsheet
    ├── CivicDirectoryModal.ts   # Local community initiatives finder & map list
    └── ToolkitDownloader.ts     # In-browser generator for printable mutual-aid flyers
```

---

## 7. Quality Assurance & Success Criteria

1. **Theming Independence:** A new theme bundle placed in `apps/web/public/themes/my-custom-theme/` is detected and applied with **zero core source code recompilation**.
2. **Ethical Shop Verification:** 100% of store items are purchasable using in-game earned Solidarity Tokens. Zero real-money checkout gates or lootbox gambling.
3. **Cross-District Aid:** Sending a caravan of 20 kilowatts to a friend in crisis deducts 20 kW from the sender and arrives in the friend's inbox with zero race conditions.
4. **Civic Safety & Privacy:** Civic action ticker never transmits precise GPS coordinates; feeds are sanitized against extremist infiltration and corporate advertising.
5. **Tactile Delight:** Browsing the Bazaar, equipping a new facade, or dispatching a caravan plays rich procedural Web Audio chimes and custom animations.
