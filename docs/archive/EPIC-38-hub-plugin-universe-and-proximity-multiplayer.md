# EPIC-38 — Hub-and-Plugin Universe & Proximity Multiplayer

## Origin

From a direct follow-up during planning of the broader vision [`docs/planning/21-OPEN-WORLD-CRAFTING-BUILDINGS-AND-IDENTITY-VISION.md`](../planning/21-OPEN-WORLD-CRAFTING-BUILDINGS-AND-IDENTITY-VISION.md) (2026-09-19): think of the whole idea as plugins attaching to the main game engine — potentially loaded from standalone containers in the stack, later from servers or other players' phones — with the base game as a "hub" everything docks onto. A player could run a plugin for only part of a session, and plugins could connect over the existing mesh system: if another real player is nearby, and they allow it, you could enter their shop or home.

## Design Intent — grounded in the real current code

**This is not a new architectural mechanism — it generalizes two the codebase already has, twice.** `MinigameLoader`/`MinigameModule` (M14/M29) and `SkinRendererLoader`/`SkinRenderer` (M30) both already prove the "hub + dynamically-loaded plugin package" shape this epic asks to make the default. [EPIC-34](EPIC-34-buildings-as-plugins-and-interiors.md) already applies the same shape to buildings. This epic's first milestone (M53) is explicitly about stating that pattern as the project's default implementation posture — not building a fourth, different loading mechanism.

**Real mesh-networking infrastructure already exists and is exactly what proximity visiting needs.** `packages/shared-types/src/mesh.ts` defines a genuinely working `MeshTransportPlugin` contract (confirmed by direct read): `PeerDescriptor` for discovered nearby peers (with `transportId`/`signalStrength`/`lastSeen`), `MeshPacket` for signed, TTL-based multi-hop relay, and `MESH_CHANNELS` for routed topics — built across M17–M19 (off-grid mesh/weather/mutual-credit, offline-first CRDT sync, BitChat.free pluggable transports) specifically so any transport (BitChat, LoRa/Meshtastic, BLE, local WiFi) can plug in without the core game caring which one is active. `TransportRegistry` (`apps/web/src/core/mesh/TransportRegistry.ts`) is the existing registry this epic's peer-discovery-to-visit flow attaches to, not a new discovery layer.

**A permissioned, read-only "visit someone else's space" precedent already exists and already works.** `FriendDistrictViewer.ts`/`SocialHubModal.ts` (M15) already let a player view a friend's district read-only, over the normal API, opt-in via a friend relationship. This epic's proximity-visiting feature (M54) is the mesh-based, opt-in-per-building variant of the exact same idea, not a new consent/visiting model.

**The user asked directly whether this is too broad for the project, and that question is answered explicitly, not avoided.** Taken as a whole, yes — which is why this is the smallest new epic (2 milestones, not 3), sequenced last, and structured so neither of the other 5 new pillars, nor the existing game, ever depends on it landing. See the Non-Goals below and the vision doc's own Pillar 6 section for the full reasoning.

## Scope and sequencing

Two milestones, deliberately smaller than every other new epic:

- **M53 — Plugin-First Architecture Conventions** (no new player-facing feature; formalizes "every substantial new system is a `packages/*` plugin docking onto the hub" as this project's documented default going forward, and investigates — as a feasibility spike, not a commitment — running a plugin as its own containerized service in the existing Docker Compose stack)
- **M54 — Proximity Visiting Over the Mesh** (a small, real proof: when a nearby peer is discovered over an active `MeshTransportPlugin` and that peer has opted a specific building in as visitable, the visitor can enter it read-only — deliberately scoped to one visitable building type and reuses `FriendDistrictViewer`'s existing read-only rendering rather than building new interaction logic)

M53 has no hard dependency on anything. M54 depends on M53's conventions being in place and, practically, benefits from [EPIC-34](EPIC-34-buildings-as-plugins-and-interiors.md)'s building-plugin framework existing first (there needs to be a real building-plugin to visit) — but is not blocked from starting its own design/spike work in parallel.

## Non-Goals (epic-wide)

- **No live multiplayer state synchronization or shared-world simulation.** A proximity visit is read-only viewing (exactly like `FriendDistrictViewer` today), never two players editing the same shared state in real time — that would be a categorically larger project, explicitly not attempted here.
- **No requirement that this epic ships before, or blocks, any of EPIC-33 through EPIC-37.** Every one of those pillars is fully playable single-player with zero dependency on this epic landing.
- **No commitment to remote/server-hosted or phone-hosted plugin execution in v1.** M53 investigates container-hosted plugins as a feasibility spike only; server- or peer-device-hosted plugins are named in the vision as a future direction, not built here.
- **No expansion of the mesh transport roster.** This epic uses whichever `MeshTransportPlugin` implementations already exist (from M17–M19); building new transports is out of scope.
- **No default-on visiting.** Every visitable building is opt-in per owner, per the existing consent model `FriendDistrictViewer` already established — never a default, never automatic just because a peer is nearby.
