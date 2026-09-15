# Task Status — District: Common Ground

Last updated: 2026-09-15
Status: **Phase 1 code-complete. Phase 2 (M8–M19) code-complete — remaining items are manual/browser-only smoke tests and audits, plus M18's unverified native-packaging targets and M19's unverified BLE hardware target (no Rust/Android toolchain or physical BLE test rig in this environment). M20 (standalone package architecture) is largely already satisfied by existing convention — see its note below — and is the next candidate milestone, not yet started.**

Phase 1 task files and story epics are archived under `docs/archive/`.

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
| **M14** | **Dynamic Microkernel, Living District Builder & Extensible Minigames** | Microkernel plugin engine (Go + TS), trust-gated plugin store, Farmville-style tactile district builder, street questing mode, *Pizza Taxi* reference minigame | `[x] Complete` | [EPIC-14](stories/EPIC-14-dynamic-microkernel-and-extensible-minigames.md) | [M14 tasks](tasks/M14-microkernel-minigames.md) |
| **M15** | **Pluggable Theming, Commons Bazaar, Social Graph & Civic Protest Ticker** | Theme/skin plugins, ethical in-game shop, friend district visiting & caravans, real-world community finder & democratic protest news-ticker | `[x] Complete` | [EPIC-15](stories/EPIC-15-civic-networking-theme-shop-and-demo-ticker.md) | [M15 tasks](tasks/M15-civic-networking-theme-shop.md) |
| **M16** | **Real-World Geo-Mode (OSM PoC) & Universal Empathy Design** | OpenStreetMap playable city generation, real-world IRL deed logging (ST & CAB rewards), zero-ideological-jargon universal empathy standard | `[x] PoC Complete` | [EPIC-16](stories/EPIC-16-real-world-geo-mode-and-irl-actions.md) | [M16 tasks](tasks/M16-real-world-geo-mode.md) |
| **M17** | **Off-Grid Mesh Networks, Real-Time Weather & Mutual Credit** | Real-time solar/weather sync (SunCalc/Open-Meteo), LoRa Meshtastic & BitChat P2P mesh, decentralized mutual credit ledger | `[x] PoC Complete` | [EPIC-17](stories/EPIC-17-offgrid-mesh-weather-and-mutual-credit.md) | [M17 tasks](tasks/M17-offgrid-mesh-weather-currency.md) |
| **M18** | **Offline-First Device Storage, Autonomous Local Runtime & Delayed Mesh/Grid Sync** | 100% on-device autonomous execution, IndexedDB/OPFS permanent storage, Ed25519-signed append-only event log, conflict-free CRDT reconciliation, delayed multi-hop sync | `[x] PoC Complete` | [EPIC-18](stories/EPIC-18-offline-first-device-storage-and-sync.md) | [M18 tasks](tasks/M18-offline-first-device-storage-and-sync.md) |
| **M19** | **BitChat.free Integration & Pluggable Mesh Transport Architecture** | Zero-hardware off-grid local communication via BitChat.free, headless `MeshTransportPlugin` contract, multi-hop packet relay | `[x] PoC Complete` | [EPIC-19](stories/EPIC-19-bitchat-free-and-pluggable-mesh-transports.md) | [M19 tasks](tasks/M19-bitchat-mesh-transports.md) |
| **M20** | **Standalone Package Architecture for Minigames & Plugins** | Every plugin/minigame as an independent `packages/*` package, no internal `apps/web` subfolders | `[~] Mostly already satisfied` (no EPIC/task doc yet) | — | [planning doc only](planning/20-STANDALONE-MONOREPO-PACKAGES-FOR-MINIGAMES-AND-PLUGINS.md) |
| M8 | The Living Economy & District Pulse Engine | Real-world macroeconomic indices, dynamic income/upkeep math, NOAA climate indices | `[x] Complete` | [EPIC-08](stories/EPIC-08-living-economy.md) | [M8 tasks](tasks/M8-living-economy.md) |
| M9 | "The District Dispatch" & Dynamic AI Narrative Engine | Free AI model pipeline (Ollama/Groq), news-to-crisis synthesis, dynamic NPC rumors | `[x] Complete` (1 manual smoke test outstanding) | [EPIC-09](stories/EPIC-09-district-dispatch.md) | [M9 tasks](tasks/M9-district-dispatch.md) |
| M10 | District Expansion & Living World Systems | North Transit Hub, East Canal, day/night cycles, resilience visual tiers, Scraps the cat | `[x] Complete` (3 manual smoke tests outstanding) | [EPIC-10](stories/EPIC-10-district-expansion.md) | [M10 tasks](tasks/M10-district-expansion.md) |
| M11 | Shared Commons, Climate Displacement & Community Defense | Community Land Trust, Tool Library, climate migrant mechanic, solidarity pool | `[x] Complete` (2 manual smoke tests outstanding) | [EPIC-11](stories/EPIC-11-shared-commons.md) | [M11 tasks](tasks/M11-shared-commons.md) |
| M12 | Procedural Web Audio Synth v2, Mobile Polish & Release QA | Rain/cat purr synthesis, mobile haptics, accessibility WCAG AA, Lighthouse 95+ | `[x] Complete` (WCAG contrast audit + Lighthouse report outstanding — need a real browser) | [EPIC-12](stories/EPIC-12-audio-v2-polish.md) | [M12 tasks](tasks/M12-audio-v2-polish.md) |

---

## Known Issues / Technical Debt

| # | Issue | Status | Task |
|---|---|---|---|
| TD1 | `internal/plugins/register.go`'s runtime `.so` hot-loader uses Go's native `plugin` package, which conflicts with `CGO_ENABLED=0` + `FROM scratch` — fails safe (dead code in prod), not build/crash breaking | `[!] Blocked` | [TD1 task](tasks/TD1-native-plugin-loader-cgo-conflict.md) |

---

## M14 — Dynamic Microkernel, Living District Builder & Extensible Minigames

Story: [`docs/stories/EPIC-14-dynamic-microkernel-and-extensible-minigames.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/stories/EPIC-14-dynamic-microkernel-and-extensible-minigames.md)  
Tasks: [`docs/tasks/M14-microkernel-minigames.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/tasks/M14-microkernel-minigames.md)  
Planning: [`docs/planning/14-DYNAMIC-MICROKERNEL-AND-EXTENSIBLE-MINIGAMES.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/planning/14-DYNAMIC-MICROKERNEL-AND-EXTENSIBLE-MINIGAMES.md)

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

Story: [`docs/stories/EPIC-15-civic-networking-theme-shop-and-demo-ticker.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/stories/EPIC-15-civic-networking-theme-shop-and-demo-ticker.md)  
Tasks: [`docs/tasks/M15-civic-networking-theme-shop.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/tasks/M15-civic-networking-theme-shop.md)  
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

Story: [`docs/stories/EPIC-16-real-world-geo-mode-and-irl-actions.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/stories/EPIC-16-real-world-geo-mode-and-irl-actions.md)  
Tasks: [`docs/tasks/M16-real-world-geo-mode.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/tasks/M16-real-world-geo-mode.md)  
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

Story: [`docs/stories/EPIC-17-offgrid-mesh-weather-and-mutual-credit.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/stories/EPIC-17-offgrid-mesh-weather-and-mutual-credit.md)  
Tasks: [`docs/tasks/M17-offgrid-mesh-weather-currency.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/tasks/M17-offgrid-mesh-weather-currency.md)  
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

Story: [`docs/stories/EPIC-18-offline-first-device-storage-and-sync.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/stories/EPIC-18-offline-first-device-storage-and-sync.md)  
Tasks: [`docs/tasks/M18-offline-first-device-storage-and-sync.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/tasks/M18-offline-first-device-storage-and-sync.md)  
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

Story: [`docs/stories/EPIC-19-bitchat-free-and-pluggable-mesh-transports.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/stories/EPIC-19-bitchat-free-and-pluggable-mesh-transports.md)  
Tasks: [`docs/tasks/M19-bitchat-mesh-transports.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/tasks/M19-bitchat-mesh-transports.md)  
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

## M20 — Standalone Package Architecture for Minigames & Plugins (observation, not yet scoped into an EPIC/task doc)

Planning: [`docs/planning/20-STANDALONE-MONOREPO-PACKAGES-FOR-MINIGAMES-AND-PLUGINS.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/planning/20-STANDALONE-MONOREPO-PACKAGES-FOR-MINIGAMES-AND-PLUGINS.md)

This milestone's core requirement — "minigames and transports are not internal subfolders of `apps/web`" — is **already largely true** of the current codebase, independent of this doc: `packages/plugin-geo-weather`, `packages/plugin-mesh-comms`, `packages/plugin-mutual-credit`, `packages/minigame-courier-rush`, and (as of M19) `packages/plugin-bitchat` are all already standalone `@district-cg/*` packages with their own `package.json`/`tsconfig.json`, depending only on `@district-cg/shared-types`. Remaining, genuinely open gaps if this becomes a real milestone:
- Naming convention: the doc's mockup names the bitchat package `transport-bitchat`; every existing plugin (including bitchat) uses a `plugin-*` prefix instead. Pick one and rename, or formalize `plugin-*` as the actual convention in the doc.
- Per-package independent dev/build scripts (`npm run dev --workspace=...`) — today's packages only have a `typecheck` script, not a standalone Vite dev server, so "iterate on bicycle physics in an isolated browser window" isn't possible yet.
- Remote/external URL dynamic loading (`import(minigameManifest.entrypointUrl)` for community-hosted, non-monorepo minigames) is unverified — `MinigameLoader`'s local-package registration path is exercised, its remote-import path is not.

No EPIC/task file has been written for this yet — flagging it here rather than fabricating a full task breakdown for work that's mostly already done.

---

## M8 — Living Economy & District Pulse Engine

Story: `docs/stories/EPIC-08-living-economy.md`
Tasks: `docs/tasks/M8-living-economy.md`

| Task | Status |
|---|---|
| `apps/api/internal/pulse/` package skeleton | `[x]` |
| `economy.go` — seasonal sinusoidal multipliers + 24h in-memory cache | `[x]` |
| `economy.go` — fail-safe defaults on network error | `[x]` |
| `news.go` stub — placeholder empty array | `[x]` |
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

| Task | Status |
|---|---|
| `BroadsheetModal.ts` — 3D unfold, newsprint, headline citation, crossword | `[x]` |
| `RadioWidget.ts` — pirate FM tuner, amber LED, 3 frequencies | `[x]` |
| `advanceDay()` — broadsheet trigger before day advances | `[x]` |
| `pulse/news.go` — RSS ingestion + 7-archetype classifier | `[x]` |
| `narrative/client.go` — multi-provider AI client (Ollama/Groq/Cloudflare) | `[x]` |
| `narrative/prompts.go` — system prompt, character voice pillars, lore bible | `[x]` |
| `narrative/validator.go` — JSON schema validator + mathematical clamp | `[x]` |
| `narrative/cache.go` — DB persistence (`dynamic_scenarios` table) | `[x]` |
| `GET /api/v1/pulse/news` & `GET /api/v1/narrative/daily-scenarios` | `[x]` |
| `crisis_scenarios.json` expanded to 25+ curated fallback scenarios | `[x]` |
| Dynamic NPC Rumor Mill (`NPCEntity.ts` & `DialogueOverlay.ts`) | `[x]` (was stale — `apps/web/src/api/narrativeGossip.ts` + `WorldScene.ts`'s `openTalk()` "Heard anything lately?" branch were already wired end-to-end) |
| Tests (Vitest + Go httptest + validator clamping tests) | `[x]` (added `narrativeGossip.test.ts` for the previously-untested pure gossip logic; only the manual broadsheet→rumor smoke test below remains unautomated) |

---

## M10 — District Expansion & Living World Systems

Story: `docs/stories/EPIC-10-district-expansion.md`
Tasks: `docs/tasks/M10-district-expansion.md`

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

---

## M11 — Shared Commons, Climate Displacement & Community Defense

Story: `docs/stories/EPIC-11-shared-commons.md`
Tasks: `docs/tasks/M11-shared-commons.md`

| Task | Status |
|---|---|
| `useGameStore.ts` — `toolLibraryProgress` + `landTrustProgress` fields | `[x]` |
| Node D: Community Tool Library — WorldScene node + ConstructionModal | `[x]` |
| Node E: Community Land Trust — WorldScene node + ConstructionModal | `[x]` |
| `solidarity_pool.go` + `GET /api/v1/district/resilience` | `[x]` |
| Tool Library 20% upkeep buff wired in EconomyMath | `[x]` (was stale — `EconomyMath.ts` already reduces energy upkeep 10→8 (20%) once `toolLibraryProgress` clears the build threshold) |
| Climate migration crisis archetype (3 scenarios) | `[x]` (was stale — `MIGRATION_SANCT` archetype, 3 authored scenarios already in `crisis_scenarios.json`) |
| Community unity flyer objects + tear-down action | `[x]` (was stale — `WorldScene.ts`'s `spawnFlyers()`/`tearDownFlyer()` already implemented) |
| `TownHallAssembly.ts` — monthly vote modal | `[x]` (was stale — already implemented, gated by `shouldOpen()`'s 30-day interval) |
| `TopHUD.ts` — District Pulse badge (global solidarity dot) | `[x]` (was stale — `pulseBadgeEl` already implemented) |
| Tests | `[~]` (Go httptest for `/api/v1/district/resilience` exists; two Land-Trust/flyer manual smoke tests remain — see `M11-shared-commons.md`) |

---

## M12 — Audio Synth v2, Mobile Polish & Release QA

Story: `docs/stories/EPIC-12-audio-v2-polish.md`
Tasks: `docs/tasks/M12-audio-v2-polish.md`

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
