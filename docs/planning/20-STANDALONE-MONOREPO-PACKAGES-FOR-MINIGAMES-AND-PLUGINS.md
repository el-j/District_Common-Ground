# Specification 20: Standalone Package/App Architecture for Minigames and Plugins

## 1. Architectural Philosophy: Micro-Frontend & Autonomous Packages

The core requirement of *District: Common Ground* is that **Minigames and Transports are not internal subfolders of `apps/web`**. They are independent, standalone packages or applications.

### Why This Matters
1. **Third-Party Contributor Freedom**: A game designer or community organizer wanting to create a new minigame (e.g. *Kitchen Frenzy*, *Solar Inverter Puzzle*, *Eviction Defense*) or a new transport (e.g. *bitchat.free*, *Reticulum*) should never need to touch the main game engine repo or understand Phaser 3 physics. They create a standalone npm package or static web bundle conforming strictly to `@district-cg/shared-types`.
2. **Independent Versioning & Release Cycles**: Minigames can be upgraded, tested, and released independently of the main game.
3. **Decoupled Bundling**: The main `apps/web` bundle remains lean and lightweight (< 1.5 MB initial load). Minigames are loaded as external packages or dynamic micro-frontends only when launched in-game, and only after the platform's quarantine, validation, and owner approval flow promotes them to the verified catalog.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     DISTRICT MONOREPO TOPOLOGY                          │
├─────────────────────────────────────────────────────────────────────────┤
│  apps/                                                                  │
│  ├── api/                       (Go Backend Microkernel API)            │
│  └── web/                       (Main Shell: TopHUD, WorldScene, Phaser)│
│                                                                         │
│  packages/                                                              │
│  ├── shared-types/              (Shared TypeScript interfaces & SDK)    │
│  ├── minigame-courier-rush/     (STANDALONE Minigame Package / App)     │
│  │   ├── package.json           (@district-cg/minigame-courier-rush)    │
│  │   ├── manifest.json          (MinigameManifest contract)             │
│  │   ├── tsconfig.json                                                  │
│  │   └── src/                                                           │
│  │       ├── CourierGame.ts     (Canvas bike delivery arcade logic)     │
│  │       └── index.ts           (createMinigame(): MinigameInstance)    │
│  │                                                                      │
│  └── transport-bitchat/         (STANDALONE Mesh Transport Package)     │
│      ├── package.json           (@district-cg/transport-bitchat)        │
│      ├── manifest.json          (Transport plugin declaration)          │
│      └── src/                                                           │
│          ├── BitChatProtocol.ts (Subnet WebRTC + BLE driver)            │
│          └── index.ts           (createTransport(): MeshTransport)      │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Package Contract: `@district-cg/minigame-*`

Every standalone minigame package conforms to this directory layout and dependencies:

### `package.json`
```json
{
  "name": "@district-cg/minigame-courier-rush",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "main": "src/index.ts",
  "types": "src/index.ts",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit",
    "check": "tsc --noEmit"
  },
  "dependencies": {
    "@district-cg/shared-types": "*"
  },
  "devDependencies": {
    "typescript": "^7.0.2",
    "vite": "^8.3.0"
  }
}
```

### Export Interface
The package exports a single factory function conforming to `MinigameModule`:
```typescript
import type { MinigameInstance, MinigameManifest } from '@district-cg/shared-types';

export function createMinigame(): MinigameInstance {
  return new CourierRushInstance();
}

export const manifest: MinigameManifest = { ... };
```

---

## 3. Host Dynamic Loading Protocol

The main shell (`apps/web`) interacts with minigames exclusively through the abstract `MinigameLoader`:

1. **Monorepo Local Import**:
   ```typescript
   import { manifest, createMinigame } from '@district-cg/minigame-courier-rush';
   MinigameLoader.registerPackage(manifest, createMinigame);
   ```
2. **External Remote URL Loading (ESM Dynamic Import)**:
   For community-hosted minigames:
   ```typescript
   const module = await import(/* @vite-ignore */ minigameManifest.entrypointUrl);
   const instance = module.createMinigame();
   ```
   The minigame receives its sandboxed DOM container and `GameSessionContext` (which provides `context.host.grantRewards`, `context.host.playSFX`, and `context.host.closeMinigame`). It has **zero access to the internal Zustand store or Phaser canvas**.

---

## 4. Verification & Testing Independence

Each minigame package has its own independent test runner and dev server. A developer working on *Courier Rush* can run:
```bash
npm run dev --workspace=@district-cg/minigame-courier-rush
```
and iterate on bicycle physics in an isolated browser window with a mock `GameSessionContext`, completely detached from the main district simulator.
