# Task Status — District: Common Ground

Last updated: 2026-09-15
Status: **Full repo audit completed 2026-09-15 (see [`docs/AUDIT-2026-09-15.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/AUDIT-2026-09-15.md)), followed by a same-day close-out sprint (see [`docs/SPRINT-2026-09-15-PLAN.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/SPRINT-2026-09-15-PLAN.md)) that closed every tracked gap. M12, M15, M16, M17, M18, M19 were audit-verified genuinely complete and archived. M11's hollow Global Solidarity Pool and missing Safe Haven ending are now real (real write path, proven end-to-end + real ending trigger). M9's Broadsheet headline is now genuinely AI-driven with a citation pill, the Go/frontend archetype-naming mismatch is fixed, and a radio ticker was added; real RSS ingestion stays formally deferred (a scope decision, not a gap). M14's 3 missing QA tests were built. M20's 3 concrete gaps (scripts, remote loading, naming) are all closed. M8 was formally re-scoped as a fully synthetic economy (Wage/Transit fixed from a permanent no-op to real seasonal curves). M10's EPIC-10 Weather System vision was built (frost/rain canvas layers + a tested pure classifier). **M14 and M20 are now archived too**, alongside the six original audit-clean milestones. Every milestone through M20 is `[x] Complete` — see "Post-Audit Follow-ups" below for the full resolution history.**

Phase 1 (M1–M7) and eight milestones (M12, M14, M15–M19, M20) are archived under `docs/archive/`.

---

## Milestone Overview

### Phase 1 — MVP Foundation (Archived)
All Phase 1 task files and story epics are archived under [`docs/archive/`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/archive).

| # | Milestone | Status | Acceptance Tests |
|---|---|---|---|
| M1 | Engine Foundation & Top-Down Canvas | `[x] Complete` | 3 tests |
| M2 | State Store, Archetype Selection & HUD | `[x] Complete` | 3 tests |
| M3 | NPC Interactions & Commons Construction | `[x] Complete` | 3 tests |
| M4 | Crisis Engine & Real-World News System | `[x] Complete` | 3 tests |
| M5 | Multi-Skin Architecture & IRL Quests | `[x] Complete` | 2 tests |
| M6 | PWA Packaging, Performance & Release | `[x] Complete` | 3 tests |
| M7 | Infrastructure, Docker & Go Backend | `[x] Complete` | 3 tests |

### Phase 2 — Living World & Real-World Data Expansion (Active Development)
Specifications authored under [`docs/planning/`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/planning).
Story epics under [`docs/stories/`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/stories).
Task files under [`docs/tasks/`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/tasks).

| # | Milestone | Focus Area | Status | Story | Tasks |
|---|---|---|---|---|---|
| **M14** | **Dynamic Microkernel, Living District Builder & Extensible Minigames** | Microkernel plugin engine (Go + TS), trust-gated plugin store, Farmville-style tactile district builder, street questing mode, *Pizza Taxi* reference minigame | `[x] Complete` — audit-verified 2026-09-15 (checkboxes were stale, corrected; all 5 QA acceptance tests now covered), **archived** | [EPIC-14](archive/EPIC-14-dynamic-microkernel-and-extensible-minigames.md) | [M14 tasks](archive/M14-microkernel-minigames.md) · [QA follow-up (resolved)](tasks/M14-FOLLOWUP-qa-coverage.md) |
| **M15** | **Pluggable Theming, Commons Bazaar, Social Graph & Civic Protest Ticker** | Theme/skin plugins, ethical in-game shop, friend district visiting & caravans, real-world community finder & democratic protest news-ticker | `[x] Complete` — **audit-verified 2026-09-15, no gaps, archived** | [EPIC-15](archive/EPIC-15-civic-networking-theme-shop-and-demo-ticker.md) | [M15 tasks](archive/M15-civic-networking-theme-shop.md) |
| **M16** | **Real-World Geo-Mode (OSM PoC) & Universal Empathy Design** | OpenStreetMap playable city generation, real-world IRL deed logging (ST & CAB rewards), zero-ideological-jargon universal empathy standard | `[x] PoC Complete` — **audit-verified 2026-09-15, no gaps, archived** | [EPIC-16](archive/EPIC-16-real-world-geo-mode-and-irl-actions.md) | [M16 tasks](archive/M16-real-world-geo-mode.md) |
| **M17** | **Off-Grid Mesh Networks, Real-Time Weather & Mutual Credit** | Real-time solar/weather sync (SunCalc/Open-Meteo), LoRa Meshtastic & BitChat P2P mesh, decentralized mutual credit ledger | `[x] PoC Complete` — **audit-verified 2026-09-15, no gaps, archived** | [EPIC-17](archive/EPIC-17-offgrid-mesh-weather-and-mutual-credit.md) | [M17 tasks](archive/M17-offgrid-mesh-weather-currency.md) |
| **M18** | **Offline-First Device Storage, Autonomous Local Runtime & Delayed Mesh/Grid Sync** | 100% on-device autonomous execution, IndexedDB/OPFS permanent storage, Ed25519-signed append-only event log, conflict-free CRDT reconciliation, delayed multi-hop sync | `[x] PoC Complete` — **audit-verified 2026-09-15, no gaps, archived** | [EPIC-18](archive/EPIC-18-offline-first-device-storage-and-sync.md) | [M18 tasks](archive/M18-offline-first-device-storage-and-sync.md) |
| **M19** | **BitChat.free Integration & Pluggable Mesh Transport Architecture** | Zero-hardware off-grid local communication via BitChat.free, headless `MeshTransportPlugin` contract, multi-hop packet relay | `[x] PoC Complete` — **audit-verified 2026-09-15, no gaps, archived** | [EPIC-19](archive/EPIC-19-bitchat-free-and-pluggable-mesh-transports.md) | [M19 tasks](archive/M19-bitchat-mesh-transports.md) |
| **M20** | **Standalone Package Architecture for Minigames & Plugins** | Every plugin/minigame as an independent `packages/*` package, no internal `apps/web` subfolders | `[x] Complete` — all 3 concrete gaps closed 2026-09-15 | [EPIC-20](archive/EPIC-20-standalone-package-architecture.md) | [M20 tasks](archive/M20-standalone-packages-cleanup.md) |
| M8 | The Living Economy & District Pulse Engine | Real-world macroeconomic indices, dynamic income/upkeep math, NOAA climate indices | `[x] Complete` — **resolved 2026-09-15**: formally re-scoped as a fully synthetic seasonal model (real external fetch deferred, not planned); `Wage`/`Transit` fixed from a permanent no-op to real seasonal curves | [EPIC-08](stories/EPIC-08-living-economy.md) | [M8 tasks](tasks/M8-living-economy.md) · [follow-up (resolved)](tasks/M8-FOLLOWUP-live-data-feeds.md) |
| M9 | "The District Dispatch" & Dynamic AI Narrative Engine | Free AI model pipeline (Ollama/Groq), news-to-crisis synthesis, dynamic NPC rumors | `[x] Complete` — **resolved 2026-09-15**: naming fixed, Broadsheet headline now genuinely AI-driven with a citation pill, radio ticker added; real RSS ingestion formally deferred (not a gap, a scope decision) | [EPIC-09](stories/EPIC-09-district-dispatch.md) | [M9 tasks](tasks/M9-district-dispatch.md) · [follow-up (resolved)](tasks/M9-FOLLOWUP-narrative-gaps.md) |
| M10 | District Expansion & Living World Systems | North Transit Hub, East Canal, day/night cycles, resilience visual tiers, Scraps the cat, weather system | `[x] Complete` — **Weather System built 2026-09-15**, closing the last vision-to-task gap (see follow-up) | [EPIC-10](stories/EPIC-10-district-expansion.md) | [M10 tasks](tasks/M10-district-expansion.md) · [follow-up (resolved)](tasks/M10-FOLLOWUP-weather-system.md) |
| M11 | Shared Commons, Climate Displacement & Community Defense | Community Land Trust, Tool Library, climate migrant mechanic, solidarity pool | `[x] Complete` — **resolved 2026-09-15**: Global Solidarity Pool now has a real write path (proven end-to-end, not fixture-seeded) and the "Safe Haven" ending is built | [EPIC-11](stories/EPIC-11-shared-commons.md) | [M11 tasks](tasks/M11-shared-commons.md) · [follow-up (resolved)](tasks/M11-FOLLOWUP-solidarity-pool-and-safe-haven.md) |
| M12 | Procedural Web Audio Synth v2, Mobile Polish & Release QA | Rain/cat purr synthesis, mobile haptics, accessibility WCAG AA, Lighthouse 95+ | `[x] Complete` — **audit-verified 2026-09-15, only minor stale doc text found (now corrected), archived** (WCAG contrast + Lighthouse still need a real browser) | [EPIC-12](archive/EPIC-12-audio-v2-polish.md) | [M12 tasks](archive/M12-audio-v2-polish.md) |

---

## Known Issues / Technical Debt

| # | Issue | Status | Task |
|---|---|---|---|
| TD1 | `internal/plugins/register.go`'s runtime `.so` hot-loader uses Go's native `plugin` package, which conflicts with `CGO_ENABLED=0` + `FROM scratch` — fails safe (dead code in prod), not build/crash breaking | `[!] Blocked` | [TD1 task](tasks/TD1-native-plugin-loader-cgo-conflict.md) |

---

## Post-Audit Follow-ups (opened 2026-09-15)

A full repo audit (all test suites run + every milestone doc cross-checked against actual code by dedicated verification passes, not just trusting checkboxes) found these genuine, tracked gaps. None of them are broken/crashing — all fail safe — but each represents a real difference between what a doc claimed and what the code does. See [`docs/AUDIT-2026-09-15.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/AUDIT-2026-09-15.md) for the full methodology and findings.

| # | Milestone | Gap | Task |
|---|---|---|---|
| F1 | M8 | ~~No live external economic/climate data fetch exists — always synthetic~~ — **resolved 2026-09-15** (formally re-scoped, not built) | [M8-FOLLOWUP-live-data-feeds.md](tasks/M8-FOLLOWUP-live-data-feeds.md) |
| F2 | M9 | ~~News ingestion stub, Broadsheet headline not AI-driven, fake crossword, no citation badge, archetype naming inconsistency~~ — **resolved 2026-09-15** (real RSS ingestion formally deferred, not a gap) | [M9-FOLLOWUP-narrative-gaps.md](tasks/M9-FOLLOWUP-narrative-gaps.md) |
| F3 | M10 | ~~EPIC-10's Weather System (rain/frost) was never implemented~~ — **resolved 2026-09-15** | [M10-FOLLOWUP-weather-system.md](tasks/M10-FOLLOWUP-weather-system.md) |
| F4 | M11 | ~~Global Solidarity Pool is hollow in production; Safe Haven ending missing~~ — **resolved 2026-09-15** | [M11-FOLLOWUP-solidarity-pool-and-safe-haven.md](tasks/M11-FOLLOWUP-solidarity-pool-and-safe-haven.md) |
| F5 | M14 | ~~3 of 5 QA acceptance tests lacked coverage~~ — **resolved 2026-09-15**, M14 archived | [M14-FOLLOWUP-qa-coverage.md](tasks/M14-FOLLOWUP-qa-coverage.md) |
| F6 | M20 | ~~Per-package dev/build scripts, remote dynamic-loading path, and a naming mismatch~~ — **resolved 2026-09-15** | [M20-standalone-packages-cleanup.md](archive/M20-standalone-packages-cleanup.md) |

---

## M14 — Dynamic Microkernel, Living District Builder & Extensible Minigames

Story: [`docs/archive/EPIC-14-dynamic-microkernel-and-extensible-minigames.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/archive/EPIC-14-dynamic-microkernel-and-extensible-minigames.md)  
Tasks: [`docs/archive/M14-microkernel-minigames.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/archive/M14-microkernel-minigames.md)  
Planning: [`docs/planning/14-DYNAMIC-MICROKERNEL-AND-EXTENSIBLE-MINIGAMES.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/planning/14-DYNAMIC-MICROKERNEL-AND-EXTENSIBLE-MINIGAMES.md)

> **Audit note (2026-09-15):** the table below (sections 1–6 of the task doc) had been left 100% unchecked despite the real implementation existing and passing — pure doc staleness, corrected in the task doc itself. 3 of the milestone's 5 QA acceptance tests genuinely lacked automated coverage (memory-leak, full delivery loop, plugin review flow) — all 3 were built the same day (see [`M14-FOLLOWUP-qa-coverage.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/tasks/M14-FOLLOWUP-qa-coverage.md)), closing the last gap and moving M14 into `docs/archive/` alongside M12/M15–M19.

| Task | Status |
|---|---|
| `packages/shared-types` — `MinigameManifest`, `GameSessionContext`, `MinigameInstance` contracts | `[x]` |
| `packages/shared-types` — `DistrictParcelState` builder grid definitions | `[x]` |
| `apps/api/internal/kernel/` — Go microkernel plugin registry & manifest scanner | `[x]` |
| `apps/api/internal/kernel/` — Session token signing & server-side anti-cheat scoring | `[x]` |
| `GET /api/v1/games` & `POST /api/v1/games/:id/session` endpoints | `[x]` |
| `apps/web/src/core/kernel/MinigameLoader.ts` — Sandboxed ESM dynamic module loader | `[x]` |
| `apps/web/src/core/kernel/MinigameContainer.ts` — Canvas/DOM container lifecycle management | `[x]` |
| `apps/web/src/core/kernel/HostPlatformAPI.ts` — Zustand wallet & state bridge | `[x]` |
| `apps/web/src/core/kernel/PluginRegistry.ts` — quarantine-first plugin store, update checks, verified-store promotion | `[x]` |
| `apps/web/src/core/kernel/PluginSandbox.ts` — sandboxed manifest inspector for untrusted bundles | `[x]` |
| `DistrictGrid.ts` — 12-plot interactive district builder ("Farmville for the Commons") | `[x]` |
| `ConstructionStages.ts` — 4 visual tiers (Blight -> Scaffolding -> Operational -> Solarpunk) | `[x]` |
| `TactileEffects.ts` — Hammering audio, wood chip particles, confetti, celebration chimes | `[x]` |
| Camera Zoom Controller — Seamless macro builder <-> micro street questing transition | `[x]` |
| `WorldScene.ts` — In-world physical minigame portals (Cargo bike, kitchen door) | `[x]` |
| `apps/web/src/minigames/courier-rush/` — Reference *Pizza Taxi* style bike delivery minigame | `[x]` |
| End-to-end integration test: Courier run completion commits rewards to DB with zero core touch | `[x]` |
| Third-party plugin verification queue and owner approval workflow | `[x]` |

---

## M15 — Pluggable Theming, Commons Bazaar, Social Graph & Civic Protest Ticker

Story: [`docs/archive/EPIC-15-civic-networking-theme-shop-and-demo-ticker.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/archive/EPIC-15-civic-networking-theme-shop-and-demo-ticker.md)  
Tasks: [`docs/archive/M15-civic-networking-theme-shop.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/archive/M15-civic-networking-theme-shop.md)  
Planning: [`docs/planning/15-COMMUNITY-NETWORKING-CIVIC-TICKER-AND-THEME-SHOP.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/planning/15-COMMUNITY-NETWORKING-CIVIC-TICKER-AND-THEME-SHOP.md)

| Task | Status |
|---|---|
| `packages/shared-types` — `ThemeManifest`, `ShopItem`, `FriendProfile`, `CivicAction` | `[x]` |
| `apps/api/migrations/` — wallets, inventory (`007`); friends, caravans (`008`); civic actions & chapters (`009`) | `[x]` |
| `apps/api/internal/theme/` — Dynamic theme catalog & manifest loader | `[x]` |
| `apps/api/internal/shop/` — In-game Commons Bazaar catalog & atomic purchase handler | `[x]` |
| `apps/api/internal/social/` — Friend graph, district snapshot serializer & mutual-aid caravan queue | `[x]` |
| `apps/api/internal/civic/` — Regional civic action ticker & mutual-aid chapter directory (curated seed data, coarse region filter, no GPS/IP) | `[x]` |
| `ThemePluginManager.ts` — Dynamic theme loader, palette swapper, building facade overrides | `[x]` |
| `ShopModal.ts` — Tactile wooden storefront modal, ST wallet counter, cosmetic unlocks | `[x]` |
| `SocialHubModal.ts` & `FriendDistrictViewer.ts` — Friend browser, invite codes, read-only visiting | `[x]` |
| Caravan Dispatch Widget — Send emergency kilowatts, soup, or legal kits to friends in crisis | `[x]` |
| `CivicTickerWidget.ts` — Rolling civic action alert ticker on morning broadsheet & HUD | `[x]` |
| `CivicDirectoryModal.ts` — Searchable real-world mutual-aid directory & "Found a Commons" PDF toolkit | `[x]` |

---

## M16 — Real-World Geo-Mode (OSM PoC) & Universal Empathy Design

Story: [`docs/archive/EPIC-16-real-world-geo-mode-and-irl-actions.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/archive/EPIC-16-real-world-geo-mode-and-irl-actions.md)  
Tasks: [`docs/archive/M16-real-world-geo-mode.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/archive/M16-real-world-geo-mode.md)  
Planning: [`docs/planning/16-REAL-WORLD-GEO-MODE-AND-UNIVERSAL-SOLIDARITY.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/planning/16-REAL-WORLD-GEO-MODE-AND-UNIVERSAL-SOLIDARITY.md)

| Task | Status |
|---|---|
| Universal Lexicon Audit — remove polarizing labels ("fascist"/"anti-fascist") across all content | `[x]` (was falsely marked done previously; the actual audit — 3 crisis scenarios, an archetype key, and 4 other files — is now done, with regression coverage) |
| `OverpassClient.ts` — OpenStreetMap Overpass API client for roads, parks, buildings, amenities | `[x]` |
| `GeoJsonToTilemap.ts` — Vector polygon and highway rasterizer converting OSM to a 50×50 tile grid | `[x]` (renders via a standalone canvas preview modal, not the live Phaser `WorldScene` — see M16 task doc scoping note) |
| `AmenityClassifier.ts` — Semantic mapper connecting real libraries, bakeries, parks to game hubs | `[x]` |
| `GeoCache.ts` — Offline storage of generated neighborhood tilemaps in IndexedDB | `[x]` |
| `CivicJournal.ts` — Real-world mutual-aid action logger (Food Sharing, Eldercare, Greening, Repair) | `[x]` |
| `PeerVerification.ts` — Local peer verification handshake | `[x]` (4-word code, not a QR scan — see M16 task doc scoping note) |
| `BadgeRegistry.ts` — Award ST & CAB points to player wallet for real-world civic deeds | `[x]` (plus an offline outbox so deeds logged without connectivity aren't lost) |

---

## M17 — Off-Grid Mesh Networks, Real-Time Weather & Mutual Credit

Story: [`docs/archive/EPIC-17-offgrid-mesh-weather-and-mutual-credit.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/archive/EPIC-17-offgrid-mesh-weather-and-mutual-credit.md)  
Tasks: [`docs/archive/M17-offgrid-mesh-weather-currency.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/archive/M17-offgrid-mesh-weather-currency.md)  
Planning: [`docs/planning/17-OFF-GRID-MESH-REALTIME-WEATHER-AND-LOCAL-CURRENCY.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/planning/17-OFF-GRID-MESH-REALTIME-WEATHER-AND-LOCAL-CURRENCY.md)

| Task | Status |
|---|---|
| `SolarCycleEngine.ts` — Astronomical solar calculation (SunCalc) & dynamic game ambient tinting | `[x]` (implemented as `packages/plugin-geo-weather/src/SunCalcEngine.ts`; not wired into `WorldScene`'s ambient tint — see M17 task doc scoping note) |
| `LiveWeatherClient.ts` — Open-Meteo live hyper-local weather fetching with IndexedDB caching | `[x]` (`packages/plugin-geo-weather/src/OpenMeteoAdapter.ts`) |
| `WeatherFXPlugin.ts` — Procedural rain, storm, snow, heat haze canvas particle shaders | `[x]` (as `WeatherModifierBridge.ts`'s gameplay modifiers — no Phaser particle shaders were added, since nothing renders these into `WorldScene` yet; see M17 task doc scoping note) |
| `MeshtasticClient.ts` — Web Serial & Web Bluetooth LoRa hardware transceiver driver | `[x]` (`WebSerialDriver.ts` + `WebBluetoothDriver.ts`, unverified against real hardware — see M17 task doc scoping note) |
| `BitChatClient.ts` — Ephemeral peer-to-peer WebRTC mesh client with QR signaling | `[x]` (`WebRtcP2pDriver.ts`; pasteable text handshake, not a camera QR scan — see M17 task doc scoping note) |
| `OfflineChatModal.ts` — Decentralized off-grid community bulletin & emergency dispatch UI | `[x]` (`packages/plugin-mesh-comms/src/MeshChatModal.ts`, registered with the frontend `Kernel` — see M14 task doc's Kernel addendum) |
| `MutualCreditLedger.ts` — Zero-fiat cryptographic time-bank transaction ledger & double-spend validation | `[x]` (`packages/plugin-mutual-credit/src/CryptoLedger.ts`, Ed25519 + hash-chained) |
| `CreditTransferModal.ts` — Offline mutual credit QR payment terminal & balance inspection | `[x]` (`packages/plugin-mutual-credit/src/CreditTransferModal.ts`, registered with the frontend `Kernel`) |

---

## M18 — Offline-First Device Storage, Autonomous Local Runtime & Delayed Mesh/Grid Sync

Story: [`docs/archive/EPIC-18-offline-first-device-storage-and-sync.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/archive/EPIC-18-offline-first-device-storage-and-sync.md)  
Tasks: [`docs/archive/M18-offline-first-device-storage-and-sync.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/archive/M18-offline-first-device-storage-and-sync.md)  
Planning: [`docs/planning/18-OFFLINE-FIRST-DEVICE-STORAGE-AND-DELAYED-SYNC.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/planning/18-OFFLINE-FIRST-DEVICE-STORAGE-AND-DELAYED-SYNC.md)

| Task | Status |
|---|---|
| `DeviceStorageEngine.ts` — IndexedDB/OPFS manager with permanent storage lease (`navigator.storage.persist()`) | `[x]` (OPFS is feature-detected only, not a second storage backend — see M18 task doc) |
| `SignedEventLog.ts` — Append-only action delta ledger with on-device Ed25519 signing & hash-chaining | `[x]` |
| `VectorClockManager.ts` — Monotonic logical clock & multi-node causality tracker | `[x]` |
| `CRDTSyncEngine.ts` — PN-Counter, LWW, and OR-Set conflict-free reconciliation engine | `[x]` (incl. Test 18.4's zero-data-loss two-device merge scenario) |
| `SyncQueueService.ts` — Background delta sync worker with network listener & exponential backoff | `[x]` (built + unit-tested; not yet activated in `main.ts`'s boot sequence — see M18 task doc) |
| `DistrictGatewayClient.ts` — Lightweight HTTP vector clock delta synchronizer | `[x]` (JSON, not CBOR — see M18 task doc; real Go backend at `POST /api/v1/sync/deltas`, verified against Postgres) |
| `ServiceWorkerRegistry.ts` — Cache-first static asset pre-caching with instant offline boot (< 400ms) | `[x]` (pre-caching was already handled by `vite-plugin-pwa`'s Workbox config — this module adds persistent-storage request + SW-controlled status) |
| `PaperMeshQR.ts` — Chunking/reassembly protocol for high-density air-gapped sneakernet sync | `[x]` (protocol only — no QR rendering/camera-scan library added, matching M16's PeerVerification boundary) |
| Standalone Packaging — Tauri v2 desktop & Capacitor Android offline packaging recipes | `[x]` (config + Makefile targets added; unverified — no Rust/Android toolchain in this environment) |

---

## M19 — BitChat.free Integration & Pluggable Mesh Transport Architecture

Story: [`docs/archive/EPIC-19-bitchat-free-and-pluggable-mesh-transports.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/archive/EPIC-19-bitchat-free-and-pluggable-mesh-transports.md)  
Tasks: [`docs/archive/M19-bitchat-mesh-transports.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/archive/M19-bitchat-mesh-transports.md)  
Planning: [`docs/planning/19-BITCHAT-FREE-AND-PLUGGABLE-MESH-TRANSPORTS.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/planning/19-BITCHAT-FREE-AND-PLUGGABLE-MESH-TRANSPORTS.md)

Path deviation: built at `packages/plugin-bitchat/` (standalone package, matching `plugin-geo-weather`/`plugin-mesh-comms`/`plugin-mutual-credit`), not the doc's original `apps/web/src/plugins/bitchat/` — see the task doc's header note.

| Task | Status |
|---|---|
| `packages/shared-types/src/mesh.ts` — `MeshPacket`, `PeerDescriptor`, `MeshTransportPlugin` contracts | `[x]` |
| `apps/web/src/core/mesh/TransportRegistry.ts` — Dynamic multi-transport multiplexer & discovery registry | `[x]` |
| `apps/web/src/core/mesh/MeshNetworkService.ts` — Packet deduplication, TTL gossip relaying, signature verification | `[x]` |
| `packages/plugin-bitchat/src/SubnetBeacon.ts` — Local subnet discovery without internet (`BroadcastChannel`, same-device) | `[x]` (cross-device LAN mDNS/UDP has no browser API — documented gap) |
| `packages/plugin-bitchat/src/BleBeacon.ts` — Web Bluetooth LE discovery for close-range mobile handshakes | `[x]` (unverified against physical hardware, same M17 boundary) |
| `packages/plugin-bitchat/src/BitChatProtocol.ts` — Local WebRTC DataChannel connection pool & X25519 key agreement | `[x]` |
| `packages/plugin-bitchat/src/ProofOfWork.ts` — Client-side Hashcash anti-spam proof solver (12 zero bits) | `[x]` |
| `OfflineChatModal.ts` — Tactile retro walkie-talkie modal with rotary 4-channel frequency knob & chime audio | `[x]` |

---

## M20 — Standalone Package Architecture for Minigames & Plugins

Story: [`docs/archive/EPIC-20-standalone-package-architecture.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/archive/EPIC-20-standalone-package-architecture.md)  
Tasks: [`docs/archive/M20-standalone-packages-cleanup.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/archive/M20-standalone-packages-cleanup.md)  
Planning: [`docs/planning/20-STANDALONE-MONOREPO-PACKAGES-FOR-MINIGAMES-AND-PLUGINS.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/planning/20-STANDALONE-MONOREPO-PACKAGES-FOR-MINIGAMES-AND-PLUGINS.md)

This milestone's core requirement — "minigames and transports are not internal subfolders of `apps/web`" — is **already largely true** of the current codebase, independent of this doc: `packages/plugin-geo-weather`, `packages/plugin-mesh-comms`, `packages/plugin-mutual-credit`, `packages/minigame-courier-rush`, and (as of M19) `packages/plugin-bitchat` are all already standalone `@district-cg/*` packages with their own `package.json`/`tsconfig.json`, depending only on `@district-cg/shared-types`. **All 3 concrete gaps closed 2026-09-15:** naming fixed (`transport-bitchat` → `plugin-bitchat` in the planning docs), every package now has real `dev`/`build`/`check` scripts + a minimal `vite.config.ts` dev harness (smoke-tested), and `MinigameLoader.loadRemoteMinigame()` now does a real `import()` of a manifest's `entrypointUrl`, gated by the existing `GET /api/v1/games` trust boundary.

---

## M8 — Living Economy & District Pulse Engine

Story: `docs/stories/EPIC-08-living-economy.md`
Tasks: `docs/tasks/M8-living-economy.md`
Follow-up (audit 2026-09-15, resolved same day): [`M8-FOLLOWUP-live-data-feeds.md`](tasks/M8-FOLLOWUP-live-data-feeds.md)

| Task | Status |
|---|---|
| `apps/api/internal/pulse/` package skeleton | `[x]` |
| `economy.go` — seasonal sinusoidal multipliers + 24h in-memory cache | `[x]` |
| `economy.go` — synthetic seasonal model | `[x]` **formally re-scoped 2026-09-15** — there never was a network fetch to fail; `GetPulseState()` always returns the seasonal path by design now, not by accident. `Wage`/`Transit` also fixed from a permanent `1.0` no-op to real seasonal curves. |
| `news.go` stub — placeholder empty array | `[x]` (real ingestion formally deferred, mirrors this decision — see M9 follow-up) |
| `GET /api/v1/pulse/economy` + climate endpoints | `[x]` |
| `packages/shared-types` — `DistrictPulseState` type | `[x]` |
| `apps/web/src/api/endpoints/pulse.ts` | `[x]` |
| `EconomyMath.ts` — multiplier integration | `[x]` |
| `SeasonalWave.ts` — offline sinusoidal fallback | `[x]` |
| `useGameStore.ts` — `pulseState` field | `[x]` |
| `TopHUD.ts` — Economic Barometer chip | `[x]` |
| Vitest: multiplier combos + seasonal peaks | `[x]` |
| Go httptest: pulse economy + fail-safe | `[x]` |

---

## M9 — "The District Dispatch" & Dynamic AI Narrative Engine

Story: `docs/stories/EPIC-09-district-dispatch.md`
Tasks: `docs/tasks/M9-district-dispatch.md`
Follow-up (audit 2026-09-15, resolved same day): [`M9-FOLLOWUP-narrative-gaps.md`](tasks/M9-FOLLOWUP-narrative-gaps.md)

| Task | Status |
|---|---|
| `BroadsheetModal.ts` — 3D unfold, newsprint | `[x]` — citation pill **built 2026-09-15**; "4×4 crossword" was always a doc-wording gap, the real single "Commons Clue" prompt is correctly described now |
| `RadioWidget.ts` — pirate FM tuner, amber LED, 3 frequencies | `[x]` (dial still CSS not SVG — cosmetic, kept as-is; scrolling ticker **built 2026-09-15**) |
| `advanceDay()` — broadsheet trigger before day advances | `[x]` |
| `pulse/news.go` — RSS ingestion + 7-archetype classifier | `[~]` **RSS ingestion formally deferred 2026-09-15 (re-scoped, mirrors M8)** — `HandleNews` stays the M8 stub by decision, not by accident. Classifier itself is real; archetype naming fixed (`FASCIST_AGITATION` → `DIVISION_AGITATION`, matching frontend). |
| `narrative/client.go` — multi-provider AI client (Ollama/Groq/Cloudflare) | `[x]` |
| `narrative/prompts.go` — system prompt, character voice pillars, lore bible | `[x]` |
| `narrative/validator.go` — JSON schema validator + mathematical clamp | `[x]` |
| `narrative/cache.go` — DB persistence (`dynamic_scenarios` table) | `[x]` |
| `GET /api/v1/pulse/news` & `GET /api/v1/narrative/daily-scenarios` | `[x]` — **the Broadsheet headline now calls `daily-scenarios` too (fixed 2026-09-15)**, not just the NPC gossip mill; falls back to the original hardcoded templates when the pipeline is offline/empty |
| `crisis_scenarios.json` curated fallback scenarios | `[x]` (23 entries, not "25+") |
| Dynamic NPC Rumor Mill (`NPCEntity.ts` & `DialogueOverlay.ts`) | `[x]` (was stale — `apps/web/src/api/narrativeGossip.ts` + `WorldScene.ts`'s `openTalk()` "Heard anything lately?" branch were already wired end-to-end) |
| Tests (Vitest + Go httptest + validator clamping tests) | `[x]` (added `narrativeGossip.test.ts` for the previously-untested pure gossip logic; only the manual broadsheet→rumor smoke test below remains unautomated) |

---

## M10 — District Expansion & Living World Systems

Story: `docs/stories/EPIC-10-district-expansion.md`
Tasks: `docs/tasks/M10-district-expansion.md`
Follow-up (audit 2026-09-15, resolved same day): [`M10-FOLLOWUP-weather-system.md`](tasks/M10-FOLLOWUP-weather-system.md) — EPIC-10's Weather System (rain/frost) was never built; never falsely checked here, just missing from the task breakdown — built 2026-09-15

| Task | Status |
|---|---|
| Resilience visual tier CSS (crisis/stabilising/thriving/emergency) | `[x]` |
| `resilienceTier()` in EconomyMath + WorldScene subscribe | `[x]` |
| Day/night lighting — tint overlay rect, 4 phases, 2-min cycle | `[x]` |
| `ScrapsEntity.ts` — cat NPC, patrol, purr, hearts, Stress −5 | `[x]` |
| `WorldScene.ts` — instantiate ScrapsEntity | `[x]` |
| Map expansion to 64×80 (4 named zones) | `[x]` (was stale — `WorldScene.ts`'s `buildMap()` is already `COLS=64`/`ROWS=80` with 5 named zones: North Transit Hub, Central Plaza, South Quarter, East Canal, South Solar Quarter) |
| `PigeonEntity.ts` — scatter AI | `[x]` (was stale — already implemented and spawned in `WorldScene.ts`'s Central Plaza) |
| Zone detection → HUD zone label | `[x]` (was stale — `WorldScene.ts`'s `updateZone()` → `TopHUD.setZone()` already wired) |
| Streetlamp night overlay sprite | `[x]` (`WorldScene.ts`'s `spawnStreetlamps()`/`updateStreetlamps()` — additive-blend glow circles along each road strip, fading in/out with the day/night tint) |
| Feed interaction for Scraps (cash > 0, Stress −10) | `[x]` (`ScrapsEntity.ts`'s `onFeed()` — spends a small treat cost and reduces stress by 10 when the player has cash, otherwise a free pet still reduces stress by 5) |
| Tests (manual) | `[ ]` manual — unchanged, requires a browser |
| Weather System — `WeatherSystem.ts` (pure classifier) + `WorldScene.ts` frost/rain layers | `[x]` **built 2026-09-15** (previously the one genuine vision-to-task gap in this milestone) |

---

## M11 — Shared Commons, Climate Displacement & Community Defense

Story: `docs/stories/EPIC-11-shared-commons.md`
Tasks: `docs/tasks/M11-shared-commons.md`
Follow-up (audit 2026-09-15, resolved same day): [`M11-FOLLOWUP-solidarity-pool-and-safe-haven.md`](tasks/M11-FOLLOWUP-solidarity-pool-and-safe-haven.md)

| Task | Status |
|---|---|
| `useGameStore.ts` — `toolLibraryProgress` + `landTrustProgress` fields | `[x]` |
| Node D: Community Tool Library — WorldScene node + ConstructionModal | `[x]` |
| Node E: Community Land Trust — WorldScene node + ConstructionModal | `[x]` |
| `solidarity_pool.go` + `GET /api/v1/district/resilience` | `[x]` — **real write path added 2026-09-15** (`POST /api/v1/district/crisis-log`, wired from `CrisisEngine.resolveCrisis()`); proven end-to-end by a test that POSTs through the real handler and checks the very next GET reflects it |
| "Safe Haven" ending on Land Trust completion | `[x]` **built 2026-09-15** — `commons.safeHavenUnlocked` flips once at 100% Land Trust progress, shown via new `SafeHavenBanner.ts` |
| Tool Library 20% upkeep buff wired in EconomyMath | `[x]` (was stale — `EconomyMath.ts` already reduces energy upkeep 10→8 (20%) once `toolLibraryProgress` clears the build threshold) |
| Climate migration crisis archetype (3 scenarios) | `[x]` (was stale — `MIGRATION_SANCT` archetype, 3 authored scenarios already in `crisis_scenarios.json`) |
| Community unity flyer objects + tear-down action | `[x]` (was stale — `WorldScene.ts`'s `spawnFlyers()`/`tearDownFlyer()` already implemented) |
| `TownHallAssembly.ts` — monthly vote modal | `[x]` (was stale — already implemented, gated by `shouldOpen()`'s 30-day interval) |
| `TopHUD.ts` — District Pulse badge (global solidarity dot) | `[x]` (was stale — `pulseBadgeEl` already implemented) |
| Tests | `[~]` (Go httptest for `/api/v1/district/resilience` + the new end-to-end write-path test exist; the flyer manual smoke test remains — see `M11-shared-commons.md`) |

---

## M12 — Audio Synth v2, Mobile Polish & Release QA

Story: `docs/archive/EPIC-12-audio-v2-polish.md`
Tasks: `docs/archive/M12-audio-v2-polish.md`

| Task | Status |
|---|---|
| `SoundSynth.ts` v2 — rain, purr, bell, static, lo-fi, crisis, solidarity, BGM | `[x]` |
| Mobile haptics (`navigator.vibrate`) — bell, purr, crisis | `[x]` |
| All modals: `role="dialog"`, `aria-modal`, `aria-labelledby` | `[x]` |
| HUD `statsEl`: `aria-live="polite"` | `[x]` |
| `Escape` closes ConstructionModal + HistoryModal | `[x]` |
| `:focus-visible` 2px #66dd88 outline on `.interactive` / `button` / `input` | `[x]` |
| `@media (prefers-reduced-motion)` CSS | `[x]` |
| Arrow keys navigate dialogue choices | `[x]` (was stale — `DialogueOverlay.ts` already handles `ArrowUp`/`ArrowDown`/`ArrowLeft`/`ArrowRight`) |
| WCAG AA contrast check: all text 4.5:1 | `[ ]` manual — genuine gap, needs a real browser contrast audit |
| Vitest: EconomyMath multiplier combos (applyDailyTick) | `[x]` (was stale — `EconomyMath.test.ts`, 24 tests) |
| Vitest: CrisisEngine — enqueue, resolve, history | `[x]` (was stale — `CrisisEngine.test.ts`, 10 tests) |
| Vitest: IrlQuestSystem — day lock, buff application | `[x]` (was stale — `IrlQuestSystem.test.ts`, 9 tests) |
| Vitest: SeasonalWave — seasonal peaks | `[x]` (genuine gap, now closed — added `SeasonalWave.test.ts`, 5 tests: food/heat seasonal peaks, wage flatness, month-wraparound normalization) |
| Go: pulse economy + solidarity pool httptest | `[x]` (was stale — `economy_test.go` (6 tests) + `solidarity_pool_test.go` (4 tests) already existed) |
| Lighthouse audit — `docs/lighthouse-report.md` | `[ ]` manual — genuine gap, needs a real Lighthouse run against a served build |

---

## M1 — Engine Foundation

Task file: `docs/archive/M1-engine-foundation.md`
Stories: `docs/archive/EPIC-01-engine-foundation.md`

| Task | Status |
|---|---|
| Vite@8 (rolldown) + TypeScript project init | `[x]` |
| Dependency install (oxlint, phaser, zustand, idb-keyval) | `[x]` |
| Tailwind CSS config | `[x]` |
| Directory structure | `[x]` |
| WorldScene.ts — viewport + tilemap | `[x]` |
| InputManager.ts — WASD | `[x]` |
| InputManager.ts — virtual thumbstick | `[x]` |
| PlayerEntity.ts — movement + animation | `[x]` |
| CollisionSystem.ts — AABB tile checks | `[x]` |
| **Test 1.1:** Stable framerate mobile emulation | `[ ]` manual |
| **Test 1.2:** Collision stops player without clip | `[ ]` manual |
| **Test 1.3:** Touch release → velocity 0 | `[ ]` manual |

---

## M2 — State Store, Archetype Selection & HUD

Task file: `docs/archive/M2-state-hud.md`
Stories: `docs/archive/EPIC-02-state-hud.md`


| Task | Status |
|---|---|
| useGameStore.ts — GameState interface | `[x]` |
| actions.ts — all mutations | `[x]` |
| Archetype stat seeding (Pip/Morgan/Arthur) | `[x]` |
| IndexedDB persistence (idb-keyval) | `[x]` |
| Character Select Screen | `[x]` |
| TopHUD.ts — overlay component | `[x]` |
| SoundSynth.ts — procedural audio | `[x]` |
| **Test 2.1:** Archetype seeds correct stats | `[ ]` manual |
| **Test 2.2:** Browser refresh restores full state | `[ ]` manual |
| **Test 2.3:** Audio no autoplay errors on mobile | `[ ]` manual |

---

## M3 — NPC Interactions & Commons Construction

Task file: `docs/archive/M3-npc-construction.md`
Stories: `docs/archive/EPIC-03-npc-construction.md`

| Task | Status |
|---|---|
| NPCEntity.ts — proximity detection | `[x]` |
| Context Action Button — dynamic state | `[x]` |
| DialogueOverlay.ts — typewriter + choices | `[x]` |
| Construction node A: Community Kitchen | `[x]` |
| Construction node B: Rooftop Solar | `[x]` |
| Construction node C: Legal Defense Fund | `[x]` |
| Dynamic tilemap swap on build completion | `[x]` |
| EconomyMath.ts — resilience + buff scoring | `[x]` |
| **Test 3.1:** NPC proximity → action button → dialogue | `[ ]` manual |
| **Test 3.2:** Contribution updates progress + HUD | `[ ]` manual |
| **Test 3.3:** Build threshold → tilemap swap + buff | `[ ]` manual |

---

## M4 — Crisis Engine

Task file: `docs/archive/M4-crisis-engine.md`
Stories: `docs/archive/EPIC-04-crisis-engine.md`

| Task | Status |
|---|---|
| crisis_scenarios.json — schema + 5 scenarios | `[x]` |
| CrisisEngine.ts — queue + resolve logic | `[x]` |
| CrisisWireModal.ts — breaking news overlay | `[x]` |
| World visual consequence system | `[x]` |
| EconomyMath.ts — daily tick + buffs | `[x]` |
| Town Hall crisis history log | `[x]` |
| **Test 4.1:** Crisis triggers → movement paused → modal shown | `[ ]` manual |
| **Test 4.2:** 3x scapegoat → resilience drops → emergency state | `[ ]` manual |
| **Test 4.3:** History log persists across sessions | `[ ]` manual |

---

## M5 — Multi-Skin Architecture & IRL Quests

Task file: `docs/archive/M5-skins-quests.md`
Stories: `docs/archive/EPIC-05-skins-quests.md`

| Task | Status |
|---|---|
| SkinInterface.ts — SkinManifest type + EntityToken | `[x]` |
| solarpunk/skin.manifest.json | `[x]` |
| retro_gb/skin.manifest.json | `[x]` |
| ThemeManager.ts — runtime skin switcher | `[x]` |
| Solarpunk skin assets (all EntityTokens) | `[ ]` art assets |
| Retro GB skin assets (all EntityTokens) | `[ ]` art assets |
| Chiptune audio profile in SoundSynth | `[x]` (profile hooks; synthesis modes deferred) |
| Settings menu — skin switcher UI | `[x]` |
| IrlQuestSystem.ts — 3 quests + daily reset | `[x]` |
| **Test 5.1:** Skin switch — no state reset, within time budget | `[ ]` manual |
| **Test 5.2:** IRL quest buffs + day-lock | `[ ]` manual |

---

## M6 — PWA Packaging & Release

Task file: `docs/archive/M6-pwa-release.md`
Stories: `docs/archive/EPIC-06-pwa-release.md`

| Task | Status |
|---|---|
| vite-plugin-pwa config + service worker | `[x]` |
| manifest.webmanifest + PWA icons | `[x]` |
| All assets converted to WebP | `[x]` (skin art deferred; data JSON + manifests covered) |
| Bundle size within budget | `[x]` (Phaser 319 KB gz, app 18 KB gz, vendor 4 KB gz) |
| Social share link generator | `[x]` (ShareModal.ts, Web Share API + fallback) |
| Cross-browser test: Mobile Safari iOS | `[ ]` manual |
| Cross-browser test: Mobile Chrome Android | `[ ]` manual |
| Cross-browser test: Desktop Chrome | `[ ]` manual |
| Cross-browser test: Desktop Firefox | `[ ]` manual |
| **Lighthouse:** Performance 90+ | `[ ]` manual |
| **Lighthouse:** Accessibility 95+ | `[ ]` manual |
| **Lighthouse:** Best Practices 95+ | `[ ]` manual |
| **Lighthouse:** PWA 95+ | `[ ]` manual |
| Cold start under target threshold on 4G | `[ ]` manual |

---

## M7 — Infrastructure, Docker & Go Backend

Task file: `docs/archive/M7-infra-backend.md`
Stories: `docs/archive/EPIC-07-infra-backend.md`

| Task | Status |
|---|---|
| Mono-repo restructure → `apps/web/`, `apps/api/` | `[x]` |
| Root `package.json` npm workspaces | `[x]` |
| `packages/shared-types/` — cross-app TypeScript types | `[x]` |
| Go module init (`apps/api/go.mod`) | `[x]` |
| `cmd/server/main.go` — router + wiring | `[x]` |
| `internal/config/config.go` — env config | `[x]` |
| `internal/db/db.go` — pgx pool | `[x]` |
| `internal/middleware/` — CORS + JWT auth | `[x]` |
| `internal/auth/` — register, login, token | `[x]` |
| `internal/save/` — GET/PUT game state | `[x]` |
| `internal/gamedata/` — crisis scenarios endpoint | `[x]` |
| `db/migrations/` — users, saves, crisis_log | `[x]` |
| `apps/web/Dockerfile` — node build → nginx serve | `[x]` |
| `apps/web/nginx.conf` — SPA routing + caching | `[x]` |
| `apps/api/Dockerfile` — Go build → scratch image | `[x]` |
| `docker-compose.yml` — web + api + db + health checks | `[x]` |
| `docker-compose.dev.yml` — volume mounts, hot-reload | `[x]` |
| `.env.example` — all required secrets documented | `[x]` |
| `apps/web/src/api/client.ts` — typed fetch wrapper | `[x]` |
| `apps/web/src/api/endpoints/auth.ts` | `[x]` |
| `apps/web/src/api/endpoints/save.ts` | `[x]` |
| Hybrid persistence (server sync → IndexedDB fallback) | `[x]` |
| Auth overlay UI (`AuthOverlay.ts`) | `[x]` |
| Go unit tests — auth service (table-driven) | `[x]` |
| Go integration tests — save repository (testcontainers) | `[x]` |
| Go HTTP tests — all handlers (httptest) | `[x]` |
| `vitest.config.ts` + frontend unit tests | `[x]` |
| `.github/workflows/ci.yml` — lint + test + docker build | `[x]` |
| CLAUDE.md updated with mono-repo layout | `[x]` |
| **Test 7.1:** `docker compose up` → all services healthy ≤60s | `[ ]` manual |
| **Test 7.2:** Register → save → restart → state restored from server | `[ ]` manual |
| **Test 7.3:** `go test ./...` + `vitest run` both pass in CI | `[ ]` manual |

---

## Legend

| Symbol | Meaning |
|---|---|
| `[ ]` | Not started |
| `[~]` | In progress |
| `[x]` | Complete |
| `[!]` | Blocked |
