/**
 * Small neighbour moments on quiet mornings: a knock at the door that
 * depends on how the player is doing — hungry, stressed, flush, trusted, or
 * frozen out after blaming neighbours. Two options each, small stakes. They
 * make the district feel like it notices the player, between the big crises.
 */
import { useGameStore, type GameState } from '../state/useGameStore';
import {
  gainCash, spendCash, spendEnergy, regenEnergy, addTrust, loseTrust, addStress, reduceStress,
  adjustResilience, updateCommonsProgress,
} from '../state/actions';

export interface EventEffects {
  cash?: number;
  energy?: number;
  trust?: number;
  stress?: number;
  resilience?: number;
  /** % added to the build the neighbours are focused on. */
  build?: number;
}

export interface NeighbourEventOption {
  label: string;
  effects: EventEffects;
  outcome: string;
}

export interface NeighbourEvent {
  id: string;
  icon: string;
  who: string;
  title: string;
  text: string;
  /** Needs that come before everything else (hunger, burnout). */
  urgent?: boolean;
  when: (s: GameState) => boolean;
  options: [NeighbourEventOption, NeighbourEventOption];
}

export const EVENT_COOLDOWN_DAYS = 7;
/** Chance of a neighbour moment on a morning without a crisis. */
export const EVENT_CHANCE = 0.55;

export const NEIGHBOUR_EVENTS: NeighbourEvent[] = [
  {
    id: 'sal-bread', icon: '🍞', who: 'Sal', urgent: true,
    title: 'A paper bag on the doorstep',
    text: "Sal from the corner store is at your door with a paper bag. \"Day-old bread and some soup. I'd only throw it out. Don't make it weird.\"",
    when: s => s.economy.starvingDays > 0,
    options: [
      { label: 'Take it, gratefully', effects: { energy: 10, stress: -6, trust: 2 }, outcome: 'You eat properly for the first time in days. Sal waves it off: "Pay it forward."' },
      { label: "I'm fine, really", effects: { stress: 3 }, outcome: 'Sal leaves the bag anyway. Pride is heavy on an empty stomach.' },
    ],
  },
  {
    id: 'higgins-tea', icon: '🫖', who: 'Mrs. Higgins', urgent: true,
    title: 'An invitation for tea',
    text: '"You look like a storm cloud, dear. Come in. The kettle\'s already on, and I won\'t take no for an answer." (She will, actually.)',
    when: s => s.player.stressLevel >= 70,
    options: [
      { label: 'Sit down for an hour', effects: { energy: -5, stress: -12, trust: 2 }, outcome: 'Fifty years of block gossip and a biscuit tin. The knot in your chest loosens.' },
      { label: 'No time today', effects: { stress: 2 }, outcome: 'She pats your arm. "Tomorrow, then." You carry the day on your own.' },
    ],
  },
  {
    id: 'leo-rent', icon: '📨', who: 'Leo', title: 'Short on rent',
    text: '"This is embarrassing. My hours got cut and rent\'s due Friday. Could you spot me $20? I\'ll pay you back — or at least pay it forward."',
    when: s => s.player.cash >= 60 && s.player.socialTrust >= 15,
    options: [
      { label: 'Lend $20', effects: { cash: -20, trust: 10, stress: -2 }, outcome: 'Leo exhales like he\'s been holding his breath for a week. "I won\'t forget this."' },
      { label: "Can't right now", effects: { trust: -2 }, outcome: 'He nods. "Yeah. Everyone\'s stretched." It stings a little, for both of you.' },
    ],
  },
  {
    id: 'teo-bike', icon: '🚲', who: 'Teo', title: 'A broken chain',
    text: 'Twelve-year-old Teo holds up a snapped bike chain. "It\'s my delivery bike. Mum needs the money. Can you help me fix it?"',
    when: s => s.player.energy >= 15,
    options: [
      { label: 'Fix it together', effects: { energy: -10, trust: 6, stress: -3 }, outcome: 'Greasy hands, one skinned knuckle, and a very proud kid ringing his bell down the street.' },
      { label: 'Point him to the tool library', effects: {}, outcome: 'He jogs off. Maybe someone there will have time.' },
    ],
  },
  {
    id: 'leo-carpool', icon: '🚗', who: 'Leo', title: 'A seat in the carpool',
    text: '"We started a carpool to the industrial park. There\'s one seat left, if you want to skip the two-bus trek today."',
    when: s => s.player.energy <= 30,
    options: [
      { label: 'Take the seat', effects: { energy: 12, trust: 1 }, outcome: 'You doze against the window. Someone passes round coffee. Small things matter.' },
      { label: 'Walk it', effects: { stress: 2 }, outcome: 'Two buses, one delay. You arrive tired and late.' },
    ],
  },
  {
    id: 'kitchen-potluck', icon: '🍲', who: 'Mira', title: 'Potluck at the kitchen',
    text: '"The kitchen\'s doing a potluck tonight — everyone brings something, even if it\'s just a chair. Come!"',
    when: s => s.commons.kitchenProgress >= 100,
    options: [
      { label: 'Bring a chair and an appetite', effects: { energy: -5, stress: -10, trust: 4 }, outcome: 'Long tables, loud laughter, three kinds of rice. The room feels like a home.' },
      { label: 'Maybe next time', effects: {}, outcome: 'You hear the laughter through the window on your way past.' },
    ],
  },
  {
    id: 'cold-shoulder', icon: '🥶', who: 'The block', title: 'Conversations stop when you arrive',
    text: 'On the stoop, the talk goes quiet as you walk up. Someone mutters about "people who side with whoever pays." There\'s a block meeting tonight.',
    when: s => s.crisisState.scapegoatStreak >= 2 || s.player.socialTrust < 12,
    options: [
      { label: 'Go to the meeting and listen', effects: { energy: -10, trust: 8, stress: 3 }, outcome: 'It\'s uncomfortable. You mostly listen. At the end, Mira hands you a flyer for the next one.' },
      { label: 'Keep your head down', effects: { stress: 4, trust: -1 }, outcome: 'You take the back stairs. It\'s quieter. Lonelier, too.' },
    ],
  },
  {
    id: 'thank-you-card', icon: '💌', who: 'Your neighbours', title: 'An envelope under the door',
    text: 'A hand-drawn card signed by half the building: "For always showing up." Tucked inside: $10 someone insisted on.',
    when: s => s.player.socialTrust >= 60,
    options: [
      { label: 'Keep it, and the card', effects: { cash: 10, stress: -4 }, outcome: 'The card goes on the fridge. You look at it more than you\'d admit.' },
      { label: 'Put the money in the community fridge fund', effects: { trust: 4, stress: -2, resilience: 1 }, outcome: 'You slip the $10 into the fridge jar. The card stays on your wall.' },
    ],
  },
  {
    id: 'work-day', icon: '🔨', who: 'Mira', title: 'A community work day',
    text: '"We\'ve got twenty people coming to the build site this Saturday. Could use one more pair of hands — and yours are good ones."',
    when: s => s.economy.focusNode !== null && s.player.socialTrust >= 25 && s.player.energy >= 12,
    options: [
      { label: 'Roll up your sleeves', effects: { energy: -12, trust: 3, build: 2 }, outcome: 'Twenty people, one playlist, and real progress by sunset.' },
      { label: 'Rest instead', effects: {}, outcome: 'The site hums without you. Next time.' },
    ],
  },
  {
    id: 'kids-mural', icon: '🎨', who: 'The youth club', title: 'Paint on the old wall',
    text: 'The kids from the youth club want to turn the grey wall by the courtyard into a mural. They need an adult to hold the ladder.',
    when: s => s.commons.resilienceScore >= 35,
    options: [
      { label: 'Hold the ladder (and a brush)', effects: { energy: -8, stress: -6, resilience: 1 }, outcome: 'By evening the wall is sunflowers, bikes and a giant cat that looks suspiciously like Scraps.' },
      { label: 'Wave and walk on', effects: {}, outcome: 'You catch a glimpse of colour going up as you pass.' },
    ],
  },
  {
    id: 'street-musician', icon: '🎻', who: 'A busker', title: 'Music in the plaza',
    text: 'An old man is playing violin by the bulletin board, case open. The tune is one your grandmother used to hum.',
    when: () => true,
    options: [
      { label: 'Stop, listen, tip $2', effects: { cash: -2, stress: -5 }, outcome: 'Three minutes of music. It feels like a whole afternoon off.' },
      { label: 'Hurry on', effects: {}, outcome: 'The melody follows you halfway down the block.' },
    ],
  },
  {
    id: 'lost-wallet', icon: '👛', who: 'You', title: 'A wallet on the pavement',
    text: 'A worn wallet lies by the bus stop: $15, a transit pass, and a photo of two kids. The ID says it belongs to someone three streets over.',
    when: s => s.player.energy >= 6,
    options: [
      { label: 'Walk it over', effects: { energy: -6, trust: 5, stress: -2 }, outcome: 'She cries a little. "That was my whole week." Word gets around.' },
      { label: 'Keep the cash, post the rest', effects: { cash: 15, trust: -4, stress: 4 }, outcome: 'The $15 buys groceries. The photo of the kids stays with you longer.' },
    ],
  },
];

const byId = new Map(NEIGHBOUR_EVENTS.map(e => [e.id, e]));

export function eligibleEvents(s: GameState): NeighbourEvent[] {
  const day = s.meta.day;
  return NEIGHBOUR_EVENTS.filter(e => {
    const last = s.neighbourEvents.seen[e.id];
    return (last === undefined || day - last >= EVENT_COOLDOWN_DAYS) && e.when(s);
  });
}

/** At most one moment a day, never alongside a crisis or an unanswered
 *  event. Urgent needs come first. */
export function pickNeighbourEvent(s: GameState, rand: () => number = Math.random): string | null {
  if (s.meta.phase !== 'playing') return null;
  if (s.crisisState.activeCrisisId || s.neighbourEvents.pendingId) return null;
  if (s.neighbourEvents.lastDay === s.meta.day) return null;
  if (rand() >= EVENT_CHANCE) return null;
  const pool = eligibleEvents(s);
  if (pool.length === 0) return null;
  const urgent = pool.find(e => e.urgent);
  if (urgent) return urgent.id;
  return pool[Math.min(pool.length - 1, Math.floor(rand() * pool.length))].id;
}

/** Rolls today's moment and saves it as pending. Returns its id, or null. */
export function rollNeighbourEvent(rand: () => number = Math.random): string | null {
  const s = useGameStore.getState();
  const id = pickNeighbourEvent(s, rand);
  useGameStore.setState(st => ({
    neighbourEvents: {
      lastDay: st.meta.day,
      seen: id ? { ...st.neighbourEvents.seen, [id]: st.meta.day } : st.neighbourEvents.seen,
      pendingId: id ?? st.neighbourEvents.pendingId,
    },
  }));
  return id;
}

export function pendingNeighbourEvent(): NeighbourEvent | null {
  const id = useGameStore.getState().neighbourEvents.pendingId;
  return id ? byId.get(id) ?? null : null;
}

export function optionAffordable(o: NeighbourEventOption, player: Pick<GameState['player'], 'cash' | 'energy'>): boolean {
  return player.cash >= Math.max(0, -(o.effects.cash ?? 0)) && player.energy >= Math.max(0, -(o.effects.energy ?? 0));
}

/** Applies the chosen option. Returns its outcome text, or null (and
 *  changes nothing) when there's no event or the option can't be paid for. */
export function resolveNeighbourEvent(optionIndex: 0 | 1): string | null {
  const event = pendingNeighbourEvent();
  if (!event) return null;
  const option = event.options[optionIndex];
  const s = useGameStore.getState();
  if (!optionAffordable(option, s.player)) return null;

  const { cash = 0, energy = 0, trust = 0, stress = 0, resilience = 0, build = 0 } = option.effects;
  if (cash > 0) gainCash(cash); else if (cash < 0) spendCash(-cash);
  if (energy > 0) regenEnergy(energy); else if (energy < 0) spendEnergy(-energy);
  if (trust > 0) addTrust(trust); else if (trust < 0) loseTrust(-trust);
  if (stress > 0) addStress(stress); else if (stress < 0) reduceStress(-stress);
  if (resilience) adjustResilience(resilience);
  const focus = s.economy.focusNode;
  if (build > 0 && focus && s.commons[focus] < 100) updateCommonsProgress(focus, build);

  useGameStore.setState(st => ({ neighbourEvents: { ...st.neighbourEvents, pendingId: null } }));
  return option.outcome;
}
