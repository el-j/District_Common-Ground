# 00 — Master Index & Studio Design Bible (District: Common Ground v2.0)

**Studio Agent Consortium:** Game Designer 🎮, Narrative Designer 📖, Economy Designer 💰, Level Designer 🏛️, Backend Architect 🛠️, Frontend Developer 💻, Whimsy Injector ✨, Technical Artist 🎨, Brand Guardian 🛡️, Audio Engineer 🎵, UX Researcher 🔍, SRE ⚙️  
**Status:** Master Design Bible (Living Document)  
**Workspace:** [`CLAUDE.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/CLAUDE.md) · [`docs/TASK-STATUS.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/TASK-STATUS.md)  

---

## The Vision at a Glance

*District: Common Ground* is a browser-based, top-down urban resilience simulation demonstrating that individualist survivalism is an exhausting, destructive dead end under systemic pressure, while collective solidarity creates an engineered safety net capable of absorbing real-world economic, climate, and social shocks.

Grounding the game in **real-world open data, macroeconomic indices, climate trajectories, and free AI-driven news synthesis**, the simulation bridges digital mechanics with lived civic reality, remaining relevant, living, and adaptive over the next 10+ years (2026–2036+).

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    THE LIVING DISTRICT ECOSYSTEM                        │
│                                                                         │
│  [REAL-WORLD PULSE]          [DISTRICT COMMONS]     [STREET LIFE]       │
│  • BLS Food Inflation    ──> • Community Kitchen ─> • Sal's Grocer      │
│  • EIA Energy Tariffs    ──> • Solar Cooperative ─> • Tariq's Inverter  │
│  • Gig Wage Volatility   ──> • Tool Library      ─> • Pip's Cargo Bike  │
│  • Transit Strikes       ──> • Tenant Legal Fund ─> • Morgan's Commute  │
│  • NOAA Climate Anomalies──> • Cooling Sanctuary ─> • Rosa's ER Triage  │
│  • UNHCR Climate Influx  ──> • Community Land    ─> • Arthur's Brown-   │
│  • Far-Right Smears/Rallies  Trust (Deeded)         stone Transition    │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Master Specification Directory (`docs/planning/`)

| Doc # | Specification Document | Lead Agents | Focus & Key Contributions |
|---|---|---|---|
| **01** | [**01-VISION-AND-CORE-LOOP.md**](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/planning/01-VISION-AND-CORE-LOOP.md) | 🎮 Game Designer<br>📖 Narrative Designer | 4 Design Pillars; 3 core gameplay loops (0-30s, 5-15m, meta weeks); asymmetric class realities (Pip, Morgan, Arthur); psychological scapegoat vs. solidarity framework. |
| **02** | [**02-LIVING-ECONOMY-AND-REAL-DATA.md**](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/planning/02-LIVING-ECONOMY-AND-REAL-DATA.md) | 💰 Economy Designer<br>🛠️ Backend Architect | Open macroeconomic data ingestion (CPI, energy, gig pay, rent); dynamic upkeep math in `EconomyMath.ts`; Commons Dividends ($0 bills at 100%); seasonal wave synthesizer. |
| **03** | [**03-NEWS-TO-CRISIS-PIPELINE.md**](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/planning/03-NEWS-TO-CRISIS-PIPELINE.md) | 📖 Narrative Designer<br>🛠️ Backend Architect | Civic RSS aggregator; 7 Crisis Archetypes; tactile morning broadsheet (*"The Daily District Ground"*); pirate radio tuner (*"Radio Free Commons"*); real headline citations. |
| **04** | [**04-DISTRICT-EXPANSION-AND-WORLD.md**](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/planning/04-DISTRICT-EXPANSION-AND-WORLD.md) | 🏛️ Level Designer<br>🎨 Technical Artist | 5 interconnected map zones (Transit Hub, Plaza, East Canal, Tenements, Solar Quarter); dynamic day/night light transitions; weather shaders; Crisis Decay vs. Solidarity Bloom. |
| **05** | [**05-WHIMSY-AND-TACTILE-UX.md**](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/planning/05-WHIMSY-AND-TACTILE-UX.md) | ✨ Whimsy Injector<br>🎨 UI/UX Designer | "Scraps" the stray calico cat (purring haptics, stress relief); interactive corkboard with draggable polaroids; analog pirate radio dial; zero-MP3 procedural sound design. |
| **06** | [**06-TECHNICAL-ROADMAP-M8-M12.md**](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/planning/06-TECHNICAL-ROADMAP-M8-M12.md) | 💻 Frontend Developer<br>🛠️ Backend Architect | Granular engineering roadmap for Milestones M8 through M12 with explicit acceptance tests, dependency chains, and verification commands. |
| **07** | [**07-CLIMATE-MIGRATION-AND-ANTI-FASCISM.md**](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/planning/07-CLIMATE-MIGRATION-AND-ANTI-FASCISM.md) | 📖 Narrative Designer<br>👁️ Visuals Specialist | Welcoming climate newcomers (demographic & labor dividend); community defense against division; tearing down hate flyers; 10-year NOAA/UNHCR open-data integration. |
| **08** | [**08-DYNAMIC-AI-NARRATIVE-PIPELINE.md**](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/planning/08-DYNAMIC-AI-NARRATIVE-PIPELINE.md) | 📖 Narrative Designer<br>🛠️ Backend Architect | Free, open-weight AI model pipeline (Ollama local / Groq free cloud); prompt guardrails; strict JSON schema validation; mathematical clamping; dynamic NPC street rumors. |
| **09** | [**09-NPC-SOCIAL-NETWORK-AND-RELATIONSHIPS.md**](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/planning/09-NPC-SOCIAL-NETWORK-AND-RELATIONSHIPS.md) | 📖 Narrative Designer<br>👤 Persona Walkthrough | Deep dossiers for 7 neighborhood pillars (Sal, Elena, Marcus, Rosa, Tariq, Mrs. Higgins, Officer Vance); relational web; informal mutual aid favor and reciprocity buffs. |
| **10** | [**10-COMMUNITY-LAND-TRUST-AND-ENDGAME.md**](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/planning/10-COMMUNITY-LAND-TRUST-AND-ENDGAME.md) | 💰 Economy Designer<br>🛠️ Backend Architect | The de-commodification endgame; Community Land Trust ratification; Arthur's class conversion arc; monthly participatory budgeting assembly; global asynchronous solidarity pool. |
| **11** | [**11-AUDIO-SOUNDSCAPE-AND-PROCEDURAL-SYNTH.md**](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/planning/11-AUDIO-SOUNDSCAPE-AND-PROCEDURAL-SYNTH.md) | 🎵 Audio Engineer<br>✨ Whimsy Injector | 100% procedural Web Audio synthesis (0 bytes MP3s); resilience harmonic spectrum (Locrian drone vs. Major 9th bloom); rain droplet physics; generative 4/4 lo-fi hip-hop radio. |
| **12** | [**12-ART-DIRECTION-SKINS-AND-SHADERS.md**](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/planning/12-ART-DIRECTION-SKINS-AND-SHADERS.md) | 🎨 Technical Artist<br>🛡️ Brand Guardian | Headless `EntityToken` skin mapping; 3 skins (Solarpunk 2036, Retro Game Boy 1989, 1930s Woodcut Broadsheet); Phaser 3 fragment shaders; inclusive representation standards. |
| **13** | [**13-PLAYTESTING-BALANCING-AND-TELEMETRY.md**](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/planning/13-PLAYTESTING-BALANCING-AND-TELEMETRY.md) | 💰 Economy Designer<br>⚙️ SRE / DevOps | 90-day archetype solvency models (Monte Carlo stress runs); ethical zero-PII telemetry; 10-year antifragile software maintenance principles (scratch Docker, PWA offline caching). |
| **14** | [**14-DYNAMIC-MICROKERNEL-AND-EXTENSIBLE-MINIGAMES.md**](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/planning/14-DYNAMIC-MICROKERNEL-AND-EXTENSIBLE-MINIGAMES.md) | 🎮 Game Designer<br>🛠️ Backend Architect<br>💻 Frontend Developer | 🚨 **Immediate Next Refactor:** Go & TypeScript Microkernel Architecture; Farmville-style Living District Builder (parcel progression, visual bloom, harvest); Street-Level Questing Mode; Pizza Taxi Courier Reference Minigame. |
| **15** | [**15-COMMUNITY-NETWORKING-CIVIC-TICKER-AND-THEME-SHOP.md**](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/planning/15-COMMUNITY-NETWORKING-CIVIC-TICKER-AND-THEME-SHOP.md) | 🎨 Technical Artist<br>🛡️ Brand Guardian<br>📖 Narrative Designer | Pluggable Skin & Theming Engine; The Commons Bazaar (Ethical In-Game Shop); "Common Grounds" Social Graph & Friend District Visiting; Real-World Community Chapter Finder & Live Democratic Protest Ticker. |
| **16** | [**16-REAL-WORLD-GEO-MODE-AND-UNIVERSAL-SOLIDARITY.md**](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/planning/16-REAL-WORLD-GEO-MODE-AND-UNIVERSAL-SOLIDARITY.md) | 🏛️ Level Designer<br>🎮 Game Designer<br>🛡️ Brand Guardian | Real-World Neighborhood Mode via OpenStreetMap (OSM PoC); digital rewards for real-life mutual aid deeds (ST/CAB); Universal Empathy Design (Trojan Horse of Solidarity — zero polarizing jargon). |
| **17** | [**17-OFF-GRID-MESH-REALTIME-WEATHER-AND-LOCAL-CURRENCY.md**](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/planning/17-OFF-GRID-MESH-REALTIME-WEATHER-AND-LOCAL-CURRENCY.md) | 📡 Mesh Systems Architect<br>☀️ Climate Physicist<br>💰 Economy Designer | Real-time astronomical solar cycle & live weather sync (SunCalc & Open-Meteo); off-grid peer communication via LoRa radio (Meshtastic over WebSerial/WebBluetooth) & BitChat/WebRTC; decentralized mutual credit ledger for local trading. |
| **18** | [**18-OFFLINE-FIRST-DEVICE-STORAGE-AND-DELAYED-SYNC.md**](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/planning/18-OFFLINE-FIRST-DEVICE-STORAGE-AND-DELAYED-SYNC.md) | 💾 Offline Systems Architect<br>🔒 Cryptographic Engineer<br>⚙️ DevOps / SRE | 100% on-device autonomous execution; IndexedDB/OPFS permanent storage; Ed25519-signed append-only event log; conflict-free CRDT reconciliation; delayed multi-hop sync to mesh and internet grid. |
| **19** | [**19-BITCHAT-FREE-AND-PLUGGABLE-MESH-TRANSPORTS.md**](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/planning/19-BITCHAT-FREE-AND-PLUGGABLE-MESH-TRANSPORTS.md) | 📡 Mesh Systems Architect<br>🛠️ Backend Architect<br>🔒 Security Auditor | Zero-hardware off-grid local communication via BitChat.free (mDNS/Subnet WebRTC + BLE); 100% pluggable MeshTransportPlugin microkernel contract; multi-hop gossip relaying without central servers. |
| **20** | [**20-STANDALONE-MONOREPO-PACKAGES-FOR-MINIGAMES-AND-PLUGINS.md**](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/planning/20-STANDALONE-MONOREPO-PACKAGES-FOR-MINIGAMES-AND-PLUGINS.md) | 🏗️ Architecture Lead<br>📦 Monorepo Specialist | Standalone packages/apps for minigames (`packages/minigame-*`) and transports/plugins (`packages/plugin-*`); zero coupling with `apps/web`; dynamic micro-frontend loader. |

---

## Active Milestone Roadmap (Phase 2)

> **Note (2026-09-15):** this roadmap list had drifted out of sync with reality (wrong checkboxes, links pointing at files later archived). `docs/TASK-STATUS.md` is the authoritative status source — see it and `docs/AUDIT-2026-09-15.md`/`docs/SPRINT-2026-09-15-PLAN.md` for current detail. Checkboxes/links below corrected to match.

- [x] **Milestones M1 – M7**: MVP Foundation, Top-Down Canvas, Zustand Store, Construction Nodes, Crisis Baseline, Multi-Skin Architecture, Go API & Docker Infrastructure *(Archived under `docs/archive/`)*.
- [x] **Milestone M14**: [Dynamic Microkernel, Living District Builder & Extensible Minigames](../archive/M14-microkernel-minigames.md) *(Archived — zero-gap audit-verified 2026-09-15)*
- [x] **Milestone M15**: [Pluggable Theming, Commons Bazaar, Social Graph & Civic Protest Ticker](../archive/M15-civic-networking-theme-shop.md) *(Archived)*
- [x] **Milestone M16**: [Real-World Geo-Mode (OSM PoC) & Universal Empathy Design](../archive/M16-real-world-geo-mode.md) *(Archived)*
- [x] **Milestone M17**: [Off-Grid Mesh Networks, Real-Time Weather & Mutual Credit](../archive/M17-offgrid-mesh-weather-currency.md) *(Archived)*
- [x] **Milestone M18**: [Offline-First Device Storage, Autonomous Local Runtime & Delayed Mesh/Grid Sync](../archive/M18-offline-first-device-storage-and-sync.md) *(Archived)*
- [x] **Milestone M19**: [BitChat.free Integration & Pluggable Mesh Transport Architecture](../archive/M19-bitchat-mesh-transports.md) *(Archived)*
- [x] **Milestone M8**: [Living Economy & District Pulse Engine](../tasks/M8-living-economy.md) — resolved 2026-09-15; formally re-scoped as a synthetic economy, Wage/Transit fixed
- [x] **Milestone M9**: [The District Dispatch & Dynamic AI Narrative Engine](../tasks/M9-district-dispatch.md) — resolved 2026-09-15; real RSS ingestion formally deferred
- [x] **Milestone M10**: [District Expansion & Living World Systems](../tasks/M10-district-expansion.md) — resolved 2026-09-15; Weather System built
- [x] **Milestone M11**: [Shared Commons, Climate Displacement & Community Defense](../tasks/M11-shared-commons.md) — Solidarity Pool + Safe Haven fixed 2026-09-15
- [x] **Milestone M12**: [Procedural Audio Synth v2, Mobile Polish & Release QA](../archive/M12-audio-v2-polish.md) *(Archived)*
- [x] **Milestone M20**: [Standalone Package Architecture Cleanup](../tasks/M20-standalone-packages-cleanup.md) — all 3 concrete gaps closed 2026-09-15
- [x] **Milestone M13**: [Playtesting, Economy Balancing, Telemetry & 10-Year Resilience](../tasks/M13-playtesting-balancing-and-telemetry.md) — **planned and implemented 2026-09-15**; this planning doc had never been given a milestone number in this list at all until the "what's open in our visions" audit found it.
- [x] **Milestone M23**: [Content Variety & Delight](../tasks/M23-content-variety-and-delight.md) — planned and implemented same-day 2026-09-16, direct user request; no planning doc under this directory (ad hoc, matching the M21/M22 precedent).
- [x] **Milestone M24**: [Economy & Energy Rebalance](../tasks/M24-economy-and-energy-rebalance.md) — planned and implemented same-day 2026-09-16, first of a 5-part follow-up request (multiplayer trading, more NPCs/minigames, economy dynamics, real news feed); gave players a real repeatable earn action and fixed a documented energy-multiplier no-op.
- [x] **Milestone M25**: [Multiplayer Trading Between Neighbors](../tasks/M25-multiplayer-trading-between-neighbors.md) — implemented 2026-09-17, second of the same 5-part request. The friends graph only had one-directional gifting; added a real propose/accept/decline/cancel trade-offer flow (new `trade_offers` table + 7 Go endpoints + a new Trade tab in the Social Hub) reusing the caravan system's client-owns-resources trust model, with auto-settle-on-load so a proposer never has to remember to collect a resolved trade.
- [x] **Milestone M26**: [NPC Roster Expansion](../tasks/M26-npc-roster-expansion.md) — implemented 2026-09-17, third of the same 5-part request. The live roster was exactly 3 NPCs (Mira, Leo, Elena); added Sal, Marcus, and Mrs. Higgins from the pre-existing "Seven Pillars" character bible, each wired through the full existing dialogue/gossip/skin-token/texture pipeline.
- [x] **Milestone M27**: [Minigame Expansion](../tasks/M27-minigame-expansion.md) — implemented 2026-09-17, fourth of the same 5-part request, on a direct follow-up asking for more minigames with real polish. The M14 microkernel's own category contract named 5 minigame types but only 1 (delivery) was built; added the remaining 4 as standalone packages (Tenant Rights Match, Community Kitchen Rush, Solidarity Line, Tool Library Workshop), each with particle effects and combo scoring, reachable via new in-world portals. Real-news-feed integration is the remaining milestone from that request.
