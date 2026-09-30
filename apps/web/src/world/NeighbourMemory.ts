import type { GameState } from '../core/state/useGameStore';
import type { DialogueNode } from './NpcDialogues';

/** Puts a memory line in front of a dialogue tree as its new first node,
 *  flowing into the usual conversation. */
export function withMemoryOpener(
  tree: Record<string, DialogueNode>,
  startKey: string,
  memory: NeighbourMemory | null,
): { tree: Record<string, DialogueNode>; startKey: string } {
  if (!memory) return { tree, startKey };
  const key = `${startKey}__memory`;
  return {
    tree: { ...tree, [key]: { text: memory.text, mood: memory.mood, responses: [{ label: '…', next: startKey }] } },
    startKey: key,
  };
}

/** How a neighbour greets the player before their usual conversation —
 *  proof that the district remembers what the player did and notices how
 *  they are doing. Pure, so it's testable without Phaser. */
export interface NeighbourMemory {
  text: string;
  mood: 'happy' | 'tired' | 'determined';
}

type Topic = 'solidarity' | 'scapegoat' | 'pattern' | 'hungry' | 'stressed' | 'trusted';

const LINES: Record<string, Record<Topic, string>> = {
  mira: {
    solidarity: "Word travels fast down here — people are saying you stood with everyone when it counted. That's how a block becomes a neighbourhood.",
    scapegoat: "I heard what you went along with. I get it, money's tight… but the people it hit live three doors from us.",
    pattern: "That's the third time you've pointed the finger at someone. The kitchen crew stopped saving you a seat. I'm sorry — I just don't know who you are lately.",
    hungry: "You look like you haven't eaten properly in days. Come by the fridge later — nobody's asking questions.",
    stressed: "Hey. Breathe with me a second. You're carrying too much on your own.",
    trusted: "There you are! Honestly, the block feels steadier when you're around.",
  },
  leo: {
    solidarity: "On the train this morning two strangers were talking about what you did. Didn't even know it was you. Felt good to say I know you.",
    scapegoat: "You picked the easy option, huh. I've done it too. Still — somebody else paid for it.",
    pattern: "Every time things get hard you find someone to blame. The commuter group chat's gone quiet when your name comes up.",
    hungry: "I've got half a sandwich and a long commute ahead. Take it — I mean it.",
    stressed: "You look how I feel after a double shift. Get some sleep tonight, promise me.",
    trusted: "My favourite neighbour. Seriously, you make the two-hour commute worth coming home for.",
  },
  elena: {
    solidarity: "That was organising, what you did. Not charity — power. The tenants' meeting wants you there next week.",
    scapegoat: "Divide and rule only works when we let it. They got what they wanted from you this time.",
    pattern: "I've watched you side against your neighbours again and again. I won't pretend that doesn't change how people organise around you.",
    hungry: "Nobody organises on an empty stomach. There's soup at the meeting — come for the food, stay if you like.",
    stressed: "You're burning out. Rest is a collective responsibility — let somebody else carry it for a day.",
    trusted: "Good to see you, friend. People listen when you speak up now. Use it well.",
  },
  sal: {
    solidarity: "Customers keep asking if I know you. After what you did, I tell them yes, proudly.",
    scapegoat: "Folks came in angry this morning about what you backed. I just stock the shelves — but I heard every word.",
    pattern: "You keep choosing against the people who shop here. I'll still sell to you. I just won't pretend it's nothing.",
    hungry: "You're thin, kid. Day-old bread's on the house — don't argue with me.",
    stressed: "You look like the rent notice I got last spring. Sit down a minute, I'll put the kettle on.",
    trusted: "Ah, my regular! I've been keeping the good apples aside for you.",
  },
  marcus: {
    solidarity: "Solidarity isn't a feeling, it's a practice — and you practised it. The co-op noticed.",
    scapegoat: "Blame flows downhill. You just pushed it onto someone with even less than you.",
    pattern: "You've sided with the landlords' story every single time. Don't expect the co-op to vote for you when you need it.",
    hungry: "When you can't cover food, that's not a personal failure — it's a system working as designed. Eat at the kitchen. That's what it's for.",
    stressed: "Your stress isn't yours alone to fix. Come to the Legal Fund meeting; we share the load there.",
    trusted: "Good to see you. The whole co-op trusts your judgement now — that's rare.",
  },
  higgins: {
    solidarity: "Oh, love. I heard. My late husband would have shaken your hand. Stop by for tea sometime.",
    scapegoat: "I've lived on this street fifty years, dear. I've seen where that kind of choice leads.",
    pattern: "You remind me of the people who stopped saying hello in the seventies, before the block emptied out. Don't become that.",
    hungry: "Sit, sit. I made too much soup again — you'll do me a favour eating it.",
    stressed: "You're pale as a sheet. Go home and sleep, young one. The world will still be broken tomorrow.",
    trusted: "Here's my favourite! I told the whole building you're the one to call.",
  },
};

export const NEIGHBOUR_IDS = Object.keys(LINES);

/** A crisis choice is fresh gossip for this many days. */
const FRESH_DAYS = 2;
/** Scapegoat choices within this window that make a pattern. */
const PATTERN_WINDOW = 10;
const PATTERN_COUNT = 3;

export function neighbourMemory(npcId: string, state: GameState): NeighbourMemory | null {
  const lines = LINES[npcId];
  if (!lines) return null;
  const day = state.meta.day;
  const crises = state.crisisState.historyLog.filter(e => !e.id.startsWith('assembly-'));

  const recentScapegoats = crises.filter(e => e.choice === 'scapegoat' && day - e.day <= PATTERN_WINDOW);
  const latest = crises.length ? crises.reduce((a, b) => (b.day >= a.day ? b : a)) : null;
  const fresh = latest && day - latest.day <= FRESH_DAYS ? latest : null;

  if (recentScapegoats.length >= PATTERN_COUNT && (!fresh || fresh.choice === 'scapegoat')) {
    return { text: lines.pattern, mood: 'tired' };
  }
  if (fresh) {
    return fresh.choice === 'solidarity'
      ? { text: lines.solidarity, mood: 'happy' }
      : { text: lines.scapegoat, mood: 'tired' };
  }
  if (state.economy.starvingDays > 0) return { text: lines.hungry, mood: 'determined' };
  if (state.player.stressLevel >= 75) return { text: lines.stressed, mood: 'tired' };
  if (state.player.socialTrust >= 70) return { text: lines.trusted, mood: 'happy' };
  return null;
}
