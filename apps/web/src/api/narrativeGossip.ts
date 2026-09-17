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

// M23 §4 — two authored variants per NPC × archetype (plus a second,
// deliberately lighter DEFAULT variant) so the same archetype doesn't
// produce an identical line every time it recurs. pickGossipLine() picks
// between them with `day % 2`.
const FALLBACK_LINES: Record<string, Partial<Record<string, [string, string]>>> = {
  mira: {
    FOOD_HEALTH: [
      "Corner store prices are up again. Some families can't make it through the week.",
      "Started a produce swap on the stoop — whatever's extra in your fridge goes on the table for anyone who needs it.",
    ],
    HOUSING_SPECULATE: [
      "Another building sold to investors. People are scared about their leases.",
      "Three tenants on the block just learned their rights at the same meeting. Knowledge spreads faster than rent hikes when we share it.",
    ],
    MIGRATION_SANCT: [
      "Families are scared to leave home. ICE was spotted a few blocks over.",
      "Set up a phone tree so nobody has to face a knock on the door alone. Twelve numbers deep already.",
    ],
    CIVIC_DISINFO: [
      "Someone spread fake flyers about the assembly meeting — trying to keep folks home.",
      "We printed our own flyers with the real time and date, in three languages. Turnout was the best it's been all year.",
    ],
    LABOR_TRANSIT: [
      "My neighbour lost her courier job when the rate got slashed. No warning, no recourse.",
      "She's got three new gigs lined up already, all found through the block's group chat. We look out for each other.",
    ],
    CLIMATE_EXTREME: [
      "The heat this summer is dangerous. Elderly folks on this block can't afford to cool down.",
      "Turned my front room into a cooling station on the hottest days. Bring a fan, everyone's welcome.",
    ],
    DIVISION_AGITATION: [
      "There were flyers on the corners this morning. Trying to split the block along old lines.",
      "We had a block potluck the same night the flyers went up. Nothing kills that nonsense faster than shared food.",
    ],
    DEFAULT: [
      "Things are tense, but people are still checking in on each other.",
      "Quiet day, actually. Sat on the stoop with coffee and just watched the block wake up. Good to have those too.",
    ],
  },
  leo: {
    CIVIC_DISINFO: [
      "Someone's running a campaign to keep people away from the assembly. Classic move.",
      "Doubled the assembly turnout anyway by texting everyone directly instead of trusting the flyer. Old-fashioned works.",
    ],
    LABOR_TRANSIT: [
      "Transit fares up again — seventh time this year. Workers can't catch a break.",
      "Organized a carpool board at the plaza kiosk. Saved four households a fare hike already this week.",
    ],
    DIVISION_AGITATION: [
      "There's a march being planned. Town Hall hasn't said a word about it yet.",
      "Town Hall finally responded — because forty of us showed up with the same question. That's what numbers do.",
    ],
    HOUSING_SPECULATE: [
      "Three more eviction notices on the block. The investors know exactly what they're doing.",
      "Two of those three notices got withdrawn once residents showed up with a lawyer from the fund. Paper trails work.",
    ],
    FOOD_HEALTH: [
      "Lunch program got cut at the school. It's always the kids who pay.",
      "The kitchen picked up the slack for the school lunch gap within a week. Not a permanent fix, but nobody went hungry.",
    ],
    CLIMATE_EXTREME: [
      "City's doing nothing about the flooding risk. We have to organise ourselves.",
      "Built our own sandbag rotation with volunteers from four buildings. The city noticed — now they're asking us for the plan.",
    ],
    MIGRATION_SANCT: [
      "Council vote on sanctuary status is tomorrow. Lot of pressure on both sides.",
      "Packed the council chamber tonight — standing room only, all in support. Hard to ignore a room that full.",
    ],
    DEFAULT: [
      "Power never concedes on its own. We have to push back constantly.",
      "Slow day at Town Hall, which honestly is its own small victory. Take the win.",
    ],
  },
  elena: {
    CLIMATE_EXTREME: [
      "Heat dome's building again. Without the solar co-op, this block would be in real trouble.",
      "The co-op's battery bank kept three fridges running through yesterday's peak heat. That's the whole point, working exactly as planned.",
    ],
    LABOR_TRANSIT: [
      "Energy prices spiked overnight. Co-op members are insulated — everyone else takes the hit.",
      "A non-member asked how to join after seeing their neighbour's bill stay flat. That's the best kind of advertising.",
    ],
    HOUSING_SPECULATE: [
      "A solar company tried to buy the rooftop rights on three buildings. We blocked it.",
      "Turned that same rooftop fight into a win — those three buildings joined the co-op instead. Funny how that works out.",
    ],
    CIVIC_DISINFO: [
      "The utility company's running ads against community solar. They're scared of losing the monopoly.",
      "Countered their ad campaign with an open house on the roof. Nothing beats seeing the panels work with your own eyes.",
    ],
    FOOD_HEALTH: [
      "Community fridge is running low. Energy costs are squeezing the kitchen too.",
      "Rewired the fridge onto the co-op grid this week — its power bill just dropped to zero.",
    ],
    MIGRATION_SANCT: [
      "New families joining the neighbourhood need to know the co-op is open to everyone.",
      "Signed up two new families this week. No paperwork barrier, no waiting list. That's the whole design.",
    ],
    DIVISION_AGITATION: [
      "They were handing out flyers near the Solar Quarter. We took them all down.",
      "Replaced every flyer we took down with a co-op sign-up sheet. Efficient use of a corkboard, if you ask me.",
    ],
    DEFAULT: [
      "Every solar panel we install is one less family depending on the grid monopoly.",
      "Quiet day on the roofs. Sunny, actually — good for the panels and good for morale.",
    ],
  },
  // M26 — three new NPCs, same authored-line convention as above.
  sal: {
    FOOD_HEALTH: [
      "Produce distributor jacked up prices again — I'm eating the difference so the shelf price stays the same.",
      "Started tucking the almost-day-old bread straight into the Community Fridge before the delivery truck even leaves. Nobody needs to ask.",
    ],
    HOUSING_SPECULATE: [
      "Heard the landlord upstairs sold to some holding company. Didn't even get a letter about it — just a new name on the rent stub.",
      "Half my regulars showed up together to the tenant meeting after that sale. Numbers, not the letter, moved the needle.",
    ],
    MIGRATION_SANCT: [
      "Family that just moved in three doors down is scared to even ask where the clinic is.",
      "Left a note taped to my register in three languages: 'ask me anything, no charge for advice.' Somebody used it yesterday.",
    ],
    CIVIC_DISINFO: [
      "Some flyer said the assembly got cancelled. Wasn't true — just wanted to keep folks home.",
      "Started handing out the real meeting time with every receipt this week. Ink's cheap. Trust isn't.",
    ],
    LABOR_TRANSIT: [
      "Delivery driver got his hours cut without warning again. That's twice this year.",
      "Gave him a standing Tuesday shift stocking shelves. Not much, but it's steady.",
    ],
    CLIMATE_EXTREME: [
      "Fridge compressor's straining in this heat. Praying it holds till the co-op gets us backup power.",
      "Propped the door open with a fan running all day so anyone can duck in and cool off. Bad for the electric bill, good for the block.",
    ],
    DIVISION_AGITATION: [
      "Somebody scrawled ugly stuff on the mailbox out front. Third time this month.",
      "Painted right over it before the kids walked to school. Some things you just don't let sit.",
    ],
    DEFAULT: [
      "Pennies make nickels, kid. Some days that's the whole philosophy.",
      "Quiet morning. Restocked the shelves and watched the block wake up one coffee at a time.",
    ],
  },
  marcus: {
    FOOD_HEALTH: [
      "Fridge compressor's rattling again — bring it by, I'll take a look between appointments.",
      "Rewired the community fridge's old compressor myself. Runs quieter than it did new.",
    ],
    HOUSING_SPECULATE: [
      "Landlord wants to gut the basement workshop for 'storage units.' Convenient timing, right before the sale.",
      "Got the workshop declared a protected tenant amenity in writing. Paperwork's a tool too, if you know how to use it.",
    ],
    MIGRATION_SANCT: [
      "New engineer down the block has certifications nobody local will recognize. Waste of good hands.",
      "Vouched for him myself at the union hall. He's rewiring half the courtyard for free out of gratitude.",
    ],
    CIVIC_DISINFO: [
      "Some rumor going around that the tool library charges a hidden membership fee. Never has, never will.",
      "Printed the real price list — zero — on cardstock and nailed it to the door. Rumors don't survive daylight.",
    ],
    LABOR_TRANSIT: [
      "My knees remind me every winter what forty years on a factory floor costs a body.",
      "Taught three neighbors basic bike repair this week so they're not stuck paying shop rates. Pass it on.",
    ],
    CLIMATE_EXTREME: [
      "Heat's bad for the lathe motors and worse for old joints like mine.",
      "Built a shade awning over the workshop entrance out of scrap. Cools the tools and the people both.",
    ],
    DIVISION_AGITATION: [
      "Somebody's trying to turn 'who fixed what first' into a turf war at the workshop. Pettiest thing I've heard all year.",
      "Made everyone sign a shared tool log instead. Turns out credit's easy when nobody's hiding anything.",
    ],
    DEFAULT: [
      "A tool kept in a private closet is a tool being murdered by rust. Come use the good ones.",
      "Slow day. Oiled every lathe in the shop out of pure spite against entropy.",
    ],
  },
  higgins: {
    FOOD_HEALTH: [
      "Watched three different grocers come and go on this block since '68. Prices always climb, portions always shrink.",
      "Told the new kid running the corner store exactly which wholesaler won't gouge him. Man listened, too.",
    ],
    HOUSING_SPECULATE: [
      "This building's had four owners since I moved in. Same rent-squeeze, different letterhead every time.",
      "Pulled my old tenant covenant out of the trunk and made three copies for the block. Paper outlives landlords.",
    ],
    MIGRATION_SANCT: [
      "Watched this block fill with new families in every decade I've been here. Same fear in their eyes every time.",
      "Sat with the family downstairs and told them exactly which agency actually helps and which just takes numbers. Free advice, seventy-nine years in the making.",
    ],
    CIVIC_DISINFO: [
      "Saw them try this exact 'meeting moved' trick on us in 1974. Still doesn't work.",
      "Called twelve neighbors myself with the real time. Some tricks age like milk.",
    ],
    LABOR_TRANSIT: [
      "My late husband worked the rail yards for thirty years before they automated his job away in a single afternoon.",
      "Told his old union stories to the transit workers organizing now. Some fights just get handed down.",
    ],
    CLIMATE_EXTREME: [
      "Summers didn't used to feel like this. My generation built for winters, not for this kind of heat.",
      "Opened my front room as a cooling stoop for anyone who needs it. Seen worse decades, we'll see through this one too.",
    ],
    DIVISION_AGITATION: [
      "They tried to turn neighbors against each other on this very street in '81. Different names, same old trick.",
      "Told that whole story on the stoop tonight, loud enough for the flyer crew to hear it too. History's a pretty good weapon.",
    ],
    DEFAULT: [
      "Landlord tactics never change; only the names on the private equity firms rotate.",
      "Quiet evening on the stoop. Best kind, and the rarest.",
    ],
  },
};

// M26 — full six-NPC roster, used as the default for scenariosToGossip()/
// fetchDailyGossip() so new NPCs get daily gossip lines exactly like the
// original three.
const ALL_NPC_IDS = ['mira', 'leo', 'elena', 'sal', 'marcus', 'higgins'];

const SESSION_KEY = 'dcg-gossip-v1';
const TTL_MS = 3_600_000;

interface CachedGossip {
  lines: Record<string, string>;
  ts: number;
}

// M23 §4 — `day` picks between the two authored variants (odd day → variant
// 0, even day → variant 1) so the same archetype doesn't always read
// identically; defaults to 1 (variant 0) so existing single-day-unaware
// callers/tests keep their original behaviour.
export function pickGossipLine(npcId: string, archetype: string, day = 1): string {
  const byNPC = FALLBACK_LINES[npcId];
  const variants = byNPC?.[archetype] ?? byNPC?.['DEFAULT'];
  if (!variants) return 'Quiet day. Just watching and waiting.';
  return variants[day % 2 === 0 ? 1 : 0];
}

export function scenariosToGossip(
  scenarios: DailyScenario[],
  npcIds: string[] = ALL_NPC_IDS,
  day = 1,
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const npcId of npcIds) {
    const match = scenarios.find(s => FALLBACK_LINES[npcId]?.[s.archetype] !== undefined);
    if (match) {
      const baseLine = pickGossipLine(npcId, match.archetype, day);
      result[npcId] = `[On "${match.title}"] ${baseLine}`;
    } else {
      result[npcId] = pickGossipLine(npcId, 'DEFAULT', day);
    }
  }
  return result;
}

const NARRATIVE_SESSION_KEY = 'dcg-narrative-v1';
interface CachedNarrative {
  data: NarrativeResponse;
  ts: number;
}

/**
 * Fetches (and session-caches) the raw AI-narrative response. Shared by
 * fetchDailyGossip() (NPC dialogue) and the Broadsheet's headline (M9
 * follow-up 2026-09-15) so both consumers reuse the same network call
 * instead of fetching /api/v1/narrative/daily-scenarios twice per day.
 */
export async function fetchDailyNarrative(): Promise<NarrativeResponse> {
  try {
    const raw = sessionStorage.getItem(NARRATIVE_SESSION_KEY);
    if (raw) {
      const cached: CachedNarrative = JSON.parse(raw);
      if (Date.now() - cached.ts < TTL_MS) return cached.data;
    }
  } catch { /* ignore */ }

  try {
    const res = await fetch('/api/v1/narrative/daily-scenarios');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as NarrativeResponse;
    try {
      sessionStorage.setItem(NARRATIVE_SESSION_KEY, JSON.stringify({ data, ts: Date.now() }));
    } catch { /* ignore */ }
    return data;
  } catch {
    return { scenarios: [], source: 'empty', generatedAt: new Date().toISOString() };
  }
}

export async function fetchDailyGossip(day = 1): Promise<Record<string, string>> {
  // Try session cache (gossip-derived lines are cached separately from the
  // raw narrative so a cache-hit here skips the scenariosToGossip() work too)
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (raw) {
      const cached: CachedGossip = JSON.parse(raw);
      if (Date.now() - cached.ts < TTL_MS) return cached.lines;
    }
  } catch { /* ignore */ }

  const data = await fetchDailyNarrative();
  const lines = scenariosToGossip(data.scenarios ?? [], ALL_NPC_IDS, day);
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ lines, ts: Date.now() }));
  } catch { /* ignore */ }
  return lines;
}
