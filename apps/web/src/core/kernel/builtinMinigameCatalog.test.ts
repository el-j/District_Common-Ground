import { describe, it, expect, vi, afterEach } from 'vitest';
import type { ServerGameManifest } from '../../api/endpoints/games';

// M29 — builtinMinigameCatalog.ts replaces main.ts's old static imports of
// the 5 minigame packages. These tests cover its merge-and-fallback logic:
// the server catalog (GET /api/v1/games) overrides the local fallback per
// id, extends it with any server-only id, and — critically for offline
// resilience — the fallback survives untouched if the fetch fails entirely.
vi.mock('../../api/endpoints/games', () => ({
  listGames: vi.fn(),
}));

describe('builtinMinigameCatalog', () => {
  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('has one fallback manifest per built-in id, each with a real static entrypointUrl', async () => {
    const { BUILTIN_MINIGAME_MANIFESTS } = await import('./builtinMinigameCatalog');
    const ids = BUILTIN_MINIGAME_MANIFESTS.map((m) => m.id).sort();
    expect(ids).toEqual(['courier-rush', 'kitchen-rush', 'solidarity-line', 'tenant-match', 'tool-workshop']);
    for (const manifest of BUILTIN_MINIGAME_MANIFESTS) {
      expect(manifest.entrypointUrl).toBe(`/plugins/${manifest.id}/index.js`);
    }
  });

  it('overrides a fallback entry with the server catalog when reachable', async () => {
    const { listGames } = await import('../../api/endpoints/games');
    const serverGame: ServerGameManifest = {
      id: 'courier-rush',
      version: '2.0.0',
      title: 'Cargo Courier Rush (Updated)',
      description: 'Updated server-side, no redeploy needed.',
      category: 'delivery',
      thumbnailUrl: '/assets/minigames/courier-rush.png',
      entrypointUrl: '/plugins/courier-rush/index.js',
      targetHardware: 'canvas',
    };
    vi.mocked(listGames).mockResolvedValue([serverGame]);

    const { fetchAndMergeMinigameCatalog } = await import('./builtinMinigameCatalog');
    const catalog = await fetchAndMergeMinigameCatalog();
    const courierRush = catalog.find((m) => m.id === 'courier-rush');

    expect(courierRush?.version).toBe('2.0.0');
    expect(courierRush?.title).toBe('Cargo Courier Rush (Updated)');
    // Every other built-in id stays present, untouched by the override.
    expect(catalog.map((m) => m.id).sort()).toEqual(
      ['courier-rush', 'kitchen-rush', 'solidarity-line', 'tenant-match', 'tool-workshop'].sort(),
    );
  });

  it('adds a server-only game not present in the local fallback list', async () => {
    const { listGames } = await import('../../api/endpoints/games');
    const newGame: ServerGameManifest = {
      id: 'brand-new-game',
      version: '1.0.0',
      title: 'Brand New Game',
      description: 'Added server-side with no app redeploy.',
      category: 'puzzle',
      thumbnailUrl: '/assets/minigames/brand-new-game.png',
      entrypointUrl: '/plugins/brand-new-game/index.js',
      targetHardware: 'canvas',
    };
    vi.mocked(listGames).mockResolvedValue([newGame]);

    const { fetchAndMergeMinigameCatalog } = await import('./builtinMinigameCatalog');
    const catalog = await fetchAndMergeMinigameCatalog();

    expect(catalog.some((m) => m.id === 'brand-new-game')).toBe(true);
    expect(catalog.length).toBe(6); // 5 built-ins + the new one
  });

  it('falls back to the local list unchanged when the catalog fetch fails', async () => {
    const { listGames } = await import('../../api/endpoints/games');
    vi.mocked(listGames).mockRejectedValue(new Error('network error'));

    const { fetchAndMergeMinigameCatalog, BUILTIN_MINIGAME_MANIFESTS } = await import('./builtinMinigameCatalog');
    const catalog = await fetchAndMergeMinigameCatalog();

    expect(catalog).toEqual(BUILTIN_MINIGAME_MANIFESTS);
  });
});
