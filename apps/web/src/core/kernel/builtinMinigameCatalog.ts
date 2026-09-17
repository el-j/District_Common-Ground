import type { MinigameManifest, MinigameCategory, MinigameHardwareTarget } from '@district-cg/shared-types';
import { listGames, type ServerGameManifest } from '../../api/endpoints/games';

// M29 — the 5 built-in minigames used to be wired via static top-level
// imports of each package's source into main.ts, compiling their gameplay
// code directly into the main app bundle. This file replaces that: it holds
// only small manifest literals (no import from any @district-cg/minigame-*
// package), pointing at the standalone ESM bundles each package's `npm run
// build` now emits to apps/web/public/plugins/<id>/index.js (see each
// package's vite.config.ts). The actual game code loads at runtime via
// MinigameLoader.loadRemoteMinigame(), never as part of this bundle.
//
// This list is also the offline-safe fallback: if GET /api/v1/games can't be
// reached, these 5 games still load from their known, same-origin, shipped-
// with-the-app static path — no network dependency required, matching the
// project's IndexedDB-first persistence philosophy.
export const BUILTIN_MINIGAME_MANIFESTS: MinigameManifest[] = [
  {
    id: 'courier-rush',
    version: '1.0.0',
    title: 'Cargo Courier Rush',
    description: 'High-speed bike delivery through bustling cobblestone streets. Pick up warm soup rations and deliver them to isolated neighbors before time runs out!',
    category: 'delivery',
    thumbnailUrl: '/assets/minigames/courier-rush.png',
    entrypointUrl: '/plugins/courier-rush/index.js',
    targetHardware: 'canvas',
    permissions: ['wallet:grant', 'audio:sfx'],
  },
  {
    id: 'kitchen-rush',
    version: '1.0.0',
    title: 'Community Kitchen Rush',
    description: "Work the Community Kitchen's stove: click ingredients in the right order to fulfill each ticket before hungry neighbors give up waiting.",
    category: 'cooking',
    thumbnailUrl: '/assets/minigames/kitchen-rush.png',
    entrypointUrl: '/plugins/kitchen-rush/index.js',
    targetHardware: 'canvas',
    permissions: ['wallet:grant', 'audio:sfx'],
  },
  {
    id: 'solidarity-line',
    version: '1.0.0',
    title: 'Solidarity Line',
    description: 'Displacement pressure is closing in on three fronts. Place mutual-aid shields along the line to turn eviction notices back before they reach the Land Trust.',
    category: 'defense',
    thumbnailUrl: '/assets/minigames/solidarity-line.png',
    entrypointUrl: '/plugins/solidarity-line/index.js',
    targetHardware: 'canvas',
    permissions: ['wallet:grant', 'audio:sfx'],
  },
  {
    id: 'tenant-match',
    version: '1.0.0',
    title: 'Tenant Rights Match',
    description: 'A memory-match challenge through two rounds of legal paperwork — pair up lease clauses, code citations, and covenants before the clock runs out.',
    category: 'puzzle',
    thumbnailUrl: '/assets/minigames/tenant-match.png',
    entrypointUrl: '/plugins/tenant-match/index.js',
    targetHardware: 'canvas',
    permissions: ['wallet:grant', 'audio:sfx'],
  },
  {
    id: 'tool-workshop',
    version: '1.0.0',
    title: 'Tool Library Workshop',
    description: "Marcus's belt is backed up. Sort mechanical, electrical, and bike parts into the right bin — and send anything truly broken to scrap — before the line jams.",
    category: 'assembly',
    thumbnailUrl: '/assets/minigames/tool-workshop.png',
    entrypointUrl: '/plugins/tool-workshop/index.js',
    targetHardware: 'canvas',
    permissions: ['wallet:grant', 'audio:sfx'],
  },
];

function toMinigameManifest(server: ServerGameManifest): MinigameManifest {
  return {
    id: server.id,
    version: server.version,
    title: server.title,
    description: server.description,
    category: server.category as MinigameCategory,
    thumbnailUrl: server.thumbnailUrl,
    entrypointUrl: server.entrypointUrl,
    permissions: server.permissions,
    targetHardware: server.targetHardware as MinigameHardwareTarget,
  };
}

/**
 * Fetches the live GET /api/v1/games catalog and merges it with the local
 * fallback list: a server entry overrides the fallback for a matching id
 * (so title/description/etc. can be updated server-side with no app
 * redeploy), and any server-only id is added too (the path for adding a 6th
 * built-in game without touching this file). If the fetch fails entirely
 * (offline, API down), the fallback list is returned unchanged so the 5
 * built-ins keep working with zero network dependency.
 */
export async function fetchAndMergeMinigameCatalog(): Promise<MinigameManifest[]> {
  const merged = new Map(BUILTIN_MINIGAME_MANIFESTS.map((m) => [m.id, m]));

  try {
    const serverGames = await listGames();
    for (const server of serverGames) {
      merged.set(server.id, toMinigameManifest(server));
    }
  } catch {
    // Offline or API unreachable — keep the fallback list as-is.
  }

  return Array.from(merged.values());
}
