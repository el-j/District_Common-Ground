export interface DailyScenario {
  id: string;
  archetype: string;
  title: string;
  context: string;
}

export interface NarrativeResponse {
  scenarios: DailyScenario[];
  source: string;
  generatedAt: string;
}

// Authored fallback lines per NPC × archetype — used when API is offline
const FALLBACK_LINES: Record<string, Partial<Record<string, string>>> = {
  mira: {
    FOOD_HEALTH: "Corner store prices are up again. Some families can't make it through the week.",
    HOUSING_SPECULATE: "Another building sold to investors. People are scared about their leases.",
    MIGRATION_SANCT: "Families are scared to leave home. ICE was spotted a few blocks over.",
    CIVIC_DISINFO: "Someone spread fake flyers about the assembly meeting — trying to keep folks home.",
    LABOR_TRANSIT: "My neighbour lost her courier job when the rate got slashed. No warning, no recourse.",
    CLIMATE_EXTREME: "The heat this summer is dangerous. Elderly folks on this block can't afford to cool down.",
    DIVISION_AGITATION: "There were flyers on the corners this morning. Trying to split the block along old lines.",
    DEFAULT: "Things are tense, but people are still checking in on each other.",
  },
  leo: {
    CIVIC_DISINFO: "Someone's running a campaign to keep people away from the assembly. Classic move.",
    LABOR_TRANSIT: "Transit fares up again — seventh time this year. Workers can't catch a break.",
    DIVISION_AGITATION: "There's a march being planned. Town Hall hasn't said a word about it yet.",
    HOUSING_SPECULATE: "Three more eviction notices on the block. The investors know exactly what they're doing.",
    FOOD_HEALTH: "Lunch program got cut at the school. It's always the kids who pay.",
    CLIMATE_EXTREME: "City's doing nothing about the flooding risk. We have to organise ourselves.",
    MIGRATION_SANCT: "Council vote on sanctuary status is tomorrow. Lot of pressure on both sides.",
    DEFAULT: "Power never concedes on its own. We have to push back constantly.",
  },
  elena: {
    CLIMATE_EXTREME: "Heat dome's building again. Without the solar co-op, this block would be in real trouble.",
    LABOR_TRANSIT: "Energy prices spiked overnight. Co-op members are insulated — everyone else takes the hit.",
    HOUSING_SPECULATE: "A solar company tried to buy the rooftop rights on three buildings. We blocked it.",
    CIVIC_DISINFO: "The utility company's running ads against community solar. They're scared of losing the monopoly.",
    FOOD_HEALTH: "Community fridge is running low. Energy costs are squeezing the kitchen too.",
    MIGRATION_SANCT: "New families joining the neighbourhood need to know the co-op is open to everyone.",
    DIVISION_AGITATION: "They were handing out flyers near the Solar Quarter. We took them all down.",
    DEFAULT: "Every solar panel we install is one less family depending on the grid monopoly.",
  },
};

const SESSION_KEY = 'dcg-gossip-v1';
const TTL_MS = 3_600_000;

interface CachedGossip {
  lines: Record<string, string>;
  ts: number;
}

export function pickGossipLine(npcId: string, archetype: string): string {
  const byNPC = FALLBACK_LINES[npcId];
  return byNPC?.[archetype] ?? byNPC?.['DEFAULT'] ?? 'Quiet day. Just watching and waiting.';
}

export function scenariosToGossip(
  scenarios: DailyScenario[],
  npcIds: string[] = ['mira', 'leo', 'elena'],
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const npcId of npcIds) {
    const match = scenarios.find(s => FALLBACK_LINES[npcId]?.[s.archetype] !== undefined);
    if (match) {
      const baseLine = pickGossipLine(npcId, match.archetype);
      result[npcId] = `[On "${match.title}"] ${baseLine}`;
    } else {
      result[npcId] = pickGossipLine(npcId, 'DEFAULT');
    }
  }
  return result;
}

export async function fetchDailyGossip(): Promise<Record<string, string>> {
  // Try session cache
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (raw) {
      const cached: CachedGossip = JSON.parse(raw);
      if (Date.now() - cached.ts < TTL_MS) return cached.lines;
    }
  } catch { /* ignore */ }

  try {
    const res = await fetch('/api/v1/narrative/daily-scenarios');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as NarrativeResponse;
    const lines = scenariosToGossip(data.scenarios ?? []);
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ lines, ts: Date.now() }));
    } catch { /* ignore */ }
    return lines;
  } catch {
    return scenariosToGossip([]);
  }
}
