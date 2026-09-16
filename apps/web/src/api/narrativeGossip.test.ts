import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { pickGossipLine, scenariosToGossip, fetchDailyGossip, fetchDailyNarrative, type DailyScenario } from './narrativeGossip';

function makeSessionStorage(): Storage {
  const store = new Map<string, string>();
  return {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => store.set(k, v),
    removeItem: (k: string) => store.delete(k),
    clear: () => store.clear(),
    key: () => null,
    get length() { return store.size; },
  } as Storage;
}

describe('pickGossipLine', () => {
  it('returns the authored line for a known npc/archetype pair', () => {
    expect(pickGossipLine('mira', 'FOOD_HEALTH')).toContain('Corner store prices');
  });

  it('falls back to DEFAULT for an unknown archetype', () => {
    expect(pickGossipLine('leo', 'NOT_A_REAL_ARCHETYPE')).toBe(
      'Power never concedes on its own. We have to push back constantly.',
    );
  });

  it('falls back to a generic line for an unknown npc', () => {
    expect(pickGossipLine('nobody', 'FOOD_HEALTH')).toBe('Quiet day. Just watching and waiting.');
  });
});

describe('scenariosToGossip', () => {
  const scenario = (archetype: string, title = 'Test Headline'): DailyScenario => ({
    id: 't1', archetype, title, context: 'context',
  });

  it('matches a scenario to an NPC that has an authored line for its archetype', () => {
    const result = scenariosToGossip([scenario('CLIMATE_EXTREME', 'Heat Dome Warning')], ['elena']);
    expect(result.elena).toContain('[On "Heat Dome Warning"]');
    expect(result.elena).toContain('Heat dome');
  });

  it('falls back to DEFAULT per-npc when no scenario matches any archetype', () => {
    const result = scenariosToGossip([scenario('SOME_UNKNOWN_ARCHETYPE')], ['mira', 'leo', 'elena']);
    expect(result.mira).toBe('Things are tense, but people are still checking in on each other.');
    expect(result.leo).toBe('Power never concedes on its own. We have to push back constantly.');
    expect(result.elena).toBe('Every solar panel we install is one less family depending on the grid monopoly.');
  });

  it('defaults to the standard mira/leo/elena roster when npcIds is omitted', () => {
    const result = scenariosToGossip([]);
    expect(Object.keys(result).sort()).toEqual(['elena', 'leo', 'mira']);
  });
});

// M23 Test 23.3b — gossip alternates between two authored variants by day
// instead of the same archetype always producing an identical line.
describe('pickGossipLine day-based variation', () => {
  it('returns a different line for a fixed archetype on an even vs. odd day', () => {
    const odd = pickGossipLine('mira', 'FOOD_HEALTH', 1);
    const even = pickGossipLine('mira', 'FOOD_HEALTH', 2);
    expect(odd).not.toBe(even);
  });

  it('is stable for the same day parity', () => {
    expect(pickGossipLine('leo', 'CIVIC_DISINFO', 1)).toBe(pickGossipLine('leo', 'CIVIC_DISINFO', 3));
    expect(pickGossipLine('leo', 'CIVIC_DISINFO', 2)).toBe(pickGossipLine('leo', 'CIVIC_DISINFO', 4));
  });

  it('defaults to day 1 (odd) behaviour when day is omitted', () => {
    expect(pickGossipLine('elena', 'CLIMATE_EXTREME')).toBe(pickGossipLine('elena', 'CLIMATE_EXTREME', 1));
  });
});

describe('fetchDailyGossip', () => {
  beforeEach(() => {
    vi.stubGlobal('sessionStorage', makeSessionStorage());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('falls back to offline gossip lines when fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));
    const lines = await fetchDailyGossip();
    expect(lines.mira).toBe('Things are tense, but people are still checking in on each other.');
  });

  it('falls back to offline gossip lines when the response is not ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    const lines = await fetchDailyGossip();
    expect(lines.leo).toBe('Power never concedes on its own. We have to push back constantly.');
  });

  it('parses a successful response into gossip lines and caches them in sessionStorage', async () => {
    const scenarios: DailyScenario[] = [{ id: 's1', archetype: 'CLIMATE_EXTREME', title: 'Heat Wave', context: 'x' }];
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ scenarios, source: 'test', generatedAt: '2026-01-01' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const lines = await fetchDailyGossip();
    expect(lines.elena).toContain('[On "Heat Wave"]');
    expect(sessionStorage.getItem('dcg-gossip-v1')).not.toBeNull();

    // Second call should hit the session cache and not re-fetch
    const lines2 = await fetchDailyGossip();
    expect(lines2).toEqual(lines);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

// M9 follow-up (2026-09-15): fetchDailyNarrative is the function TopHUD's
// Broadsheet headline now calls directly (see TopHUD.ts's onEndDay), so its
// fallback/cache behavior needs its own coverage independent of the
// gossip-derivation logic above.
describe('fetchDailyNarrative', () => {
  beforeEach(() => {
    vi.stubGlobal('sessionStorage', makeSessionStorage());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns an empty-source response when fetch fails, never throws', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));
    const result = await fetchDailyNarrative();
    expect(result.scenarios).toEqual([]);
    expect(result.source).toBe('empty');
  });

  it('returns the raw scenario list and source on a successful fetch', async () => {
    const scenarios: DailyScenario[] = [{ id: 's1', archetype: 'CLIMATE_EXTREME', title: 'Heat Wave', context: 'Danger rises.' }];
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ scenarios, source: 'live', generatedAt: '2026-01-01' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await fetchDailyNarrative();
    expect(result.scenarios).toEqual(scenarios);
    expect(result.source).toBe('live');
  });

  it('caches the raw response separately from the derived gossip cache and avoids a second fetch', async () => {
    const scenarios: DailyScenario[] = [{ id: 's1', archetype: 'CLIMATE_EXTREME', title: 'Heat Wave', context: 'x' }];
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ scenarios, source: 'live', generatedAt: '2026-01-01' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await fetchDailyNarrative();
    expect(sessionStorage.getItem('dcg-narrative-v1')).not.toBeNull();
    expect(sessionStorage.getItem('dcg-gossip-v1')).toBeNull();

    await fetchDailyNarrative();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('fetchDailyGossip and fetchDailyNarrative share one underlying fetch', async () => {
    const scenarios: DailyScenario[] = [{ id: 's1', archetype: 'CLIMATE_EXTREME', title: 'Heat Wave', context: 'x' }];
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ scenarios, source: 'live', generatedAt: '2026-01-01' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await fetchDailyGossip();
    await fetchDailyNarrative();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
