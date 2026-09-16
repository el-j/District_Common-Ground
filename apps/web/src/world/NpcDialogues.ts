// M23 §3 — dialogue data + selection logic extracted from WorldScene.ts so
// they're testable without pulling Phaser into a node-environment Vitest
// run. Content and behaviour are unchanged from what previously lived
// inline in WorldScene.ts, plus two new trees per NPC (see below).

// M21 §8 — mood is an abstract token; DialogueOverlay resolves it to a
// portrait emoji/frame, never a hardcoded sprite path baked in here.
export type DialogueNode = { text: string; responses: { label: string; next: string | null }[]; mood?: 'happy' | 'tired' | 'determined' };

export const DIALOGUES: Record<string, Record<string, DialogueNode>> = {
  // ── Mira (rotation: 5 trees) ───────────────────────────────────────────────
  mira_intro: {
    mira_intro: {
      text: "Hey. I'm Mira. Things have been tense lately, but people still look out for each other down here.",
      mood: 'happy',
      responses: [
        { label: "What's going on?", next: 'mira_tension' },
        { label: 'Nice to meet you', next: null },
      ],
    },
    mira_tension: {
      text: "The corner store almost closed last month. If we keep the kitchen going, folks won't go hungry when money's tight.",
      mood: 'tired',
      responses: [
        { label: 'I can help with that', next: 'mira_kitchen' },
        { label: "I'll keep that in mind", next: null },
      ],
    },
    mira_kitchen: {
      text: "Every bit helps. Even $5 or a few hours of energy goes a long way. Hit the build node nearby to contribute.",
      mood: 'determined',
      responses: [{ label: 'Got it, thanks', next: null }],
    },
  },
  mira_day2: {
    mira_day2: {
      text: "My grandma grew up on this block. She'd say the neighbourhood was alive back then — everyone knew everyone. We can get that back.",
      mood: 'happy',
      responses: [
        { label: "What changed?", next: 'mira_change' },
        { label: "That's beautiful", next: null },
      ],
    },
    mira_change: {
      text: "Rents tripled in twelve years. Half the old families moved out. The new folks don't have time to connect — they're grinding just to survive.",
      mood: 'tired',
      responses: [
        { label: "What can we do?", next: 'mira_action' },
        { label: "Hard to hear", next: null },
      ],
    },
    mira_action: {
      text: "Start small. A shared meal. A community fridge. Once people eat together, they organize together. That's the whole game.",
      mood: 'determined',
      responses: [{ label: 'I hear you', next: null }],
    },
  },
  mira_day3: {
    mira_day3: {
      text: "Heard someone tried to get the community kitchen shut down — noise complaints filed by a landlord who bought the building next door.",
      mood: 'tired',
      responses: [
        { label: "That's outrageous", next: 'mira_outrage' },
        { label: "What happened?", next: 'mira_outrage' },
      ],
    },
    mira_outrage: {
      text: "Thirty neighbors showed up to the planning meeting. Landlord backed off. That's what solidarity looks like. Numbers matter.",
      mood: 'determined',
      responses: [
        { label: 'How can I help?', next: 'mira_help' },
        { label: 'Inspiring', next: null },
      ],
    },
    mira_help: {
      text: "Keep building. Keep showing up. And if you have cash or energy to spare — the kitchen fund never turns it away.",
      mood: 'happy',
      responses: [{ label: "I'm with you", next: null }],
    },
  },
  mira_day4: {
    mira_day4: {
      text: "Ha — you should've seen it. Little Nayeli made me a 'Community Kitchen Employee of the Month' badge out of cardboard and pinned it to my shirt. Best paycheck I've gotten all year.",
      mood: 'happy',
      responses: [
        { label: "That's amazing", next: 'mira_day4b' },
        { label: 'She sounds great', next: 'mira_day4b' },
      ],
    },
    mira_day4b: {
      text: "Kids notice everything, you know. If we build a place worth loving, they grow up trusting it. That's the actual mission.",
      mood: 'happy',
      responses: [{ label: 'I love that', next: null }],
    },
  },
  mira_day5: {
    mira_day5: {
      text: "We hit fifty people at the shared meal last week. Fifty! Had to borrow chairs from the church three blocks over.",
      mood: 'happy',
      responses: [
        { label: "That's incredible growth", next: 'mira_day5b' },
        { label: "How'd you manage food for fifty?", next: 'mira_day5b' },
      ],
    },
    mira_day5b: {
      text: "Everyone brings something. That's the trick — nobody has to carry it alone. Come by sometime, there's always a seat.",
      mood: 'determined',
      responses: [{ label: 'I will', next: null }],
    },
  },

  // ── Leo (rotation: 5 trees) ────────────────────────────────────────────────
  leo_intro: {
    leo_intro: {
      text: "Leo. I spend most of my time at the plaza — trying to keep the Town Hall accountable. Full-time job.",
      mood: 'tired',
      responses: [
        { label: "What does the Town Hall do?", next: 'leo_hall' },
        { label: 'Sounds exhausting', next: null },
      ],
    },
    leo_hall: {
      text: "Officially? Manages disputes. In practice? Decides who gets squeezed and who gets protected. The Legal Fund changes that math.",
      mood: 'tired',
      responses: [
        { label: 'How does the Legal Fund help?', next: 'leo_legal' },
        { label: 'I see. Thanks', next: null },
      ],
    },
    leo_legal: {
      text: "Gives people options when they can't afford a lawyer. Keeps power from just rolling over the block.",
      mood: 'determined',
      responses: [{ label: "I'll try to fund it", next: null }],
    },
  },
  leo_day2: {
    leo_day2: {
      text: "You know what the most powerful thing in this district is? A resident who shows up informed. Most people don't realize that.",
      mood: 'happy',
      responses: [
        { label: "Informed about what?", next: 'leo_info' },
        { label: 'How do I get informed?', next: 'leo_info' },
      ],
    },
    leo_info: {
      text: "Zoning laws, eviction rules, tenants' rights. The Town Hall keeps records — if you dig in, you can catch them bending the rules.",
      mood: 'happy',
      responses: [
        { label: "And then what?", next: 'leo_then' },
        { label: "I'll look into it", next: null },
      ],
    },
    leo_then: {
      text: "You show up, you cite the code, you bring three friends. They can ignore one person. They can't ignore a crowd with evidence.",
      mood: 'determined',
      responses: [{ label: 'Power move', next: null }],
    },
  },
  leo_day3: {
    leo_day3: {
      text: "Big vote coming up at Town Hall. They want to rezone the empty lot on 5th — market housing, no affordable units required.",
      mood: 'tired',
      responses: [
        { label: "Can we stop it?", next: 'leo_stop' },
        { label: "What happens if it passes?", next: 'leo_stop' },
      ],
    },
    leo_stop: {
      text: "Only if we make noise. The Legal Fund lets us challenge bad decisions in writing. Paper trails scare developers more than protests.",
      mood: 'determined',
      responses: [
        { label: "How do I help fund it?", next: 'leo_fund' },
        { label: "I'll spread the word", next: null },
      ],
    },
    leo_fund: {
      text: "Hit the Legal Fund build node in the plaza. Every dollar we raise is one more letter their lawyer has to answer.",
      mood: 'determined',
      responses: [{ label: "On it", next: null }],
    },
  },
  leo_day4: {
    leo_day4: {
      text: "Off the record? I actually laughed today. The zoning board tried to reschedule our hearing to dodge a crowd — forgot half the block already has the calendar memorized.",
      mood: 'happy',
      responses: [
        { label: 'Ha, nice', next: 'leo_day4b' },
        { label: 'What happened?', next: 'leo_day4b' },
      ],
    },
    leo_day4b: {
      text: "Showed up anyway, twenty of us. They rescheduled again. We'll show up again. It's almost funny how predictable they are.",
      mood: 'determined',
      responses: [{ label: 'Persistence wins', next: null }],
    },
  },
  leo_day5: {
    leo_day5: {
      text: "Got a handwritten thank-you note today. First one in months. From someone whose eviction we stopped with the Legal Fund.",
      mood: 'happy',
      responses: [{ label: 'That must feel good', next: 'leo_day5b' }],
    },
    leo_day5b: {
      text: "It's why I keep doing this even when it's thankless. One note like that outweighs a hundred bad meetings.",
      mood: 'happy',
      responses: [{ label: "You're doing important work", next: null }],
    },
  },

  // ── Elena (rotation: 5 trees) ──────────────────────────────────────────────
  elena_intro: {
    elena_intro: {
      text: "Elena. I organize the Solar Cooperative up here. The utility company wants us dependent on them forever.",
      mood: 'determined',
      responses: [
        { label: 'Why solar?', next: 'elena_solar' },
        { label: 'Interesting approach', next: null },
      ],
    },
    elena_solar: {
      text: "Energy independence. When the grid goes down during a crisis, neighbors with solar can still share power.",
      mood: 'happy',
      responses: [
        { label: 'How can I help?', next: 'elena_help' },
        { label: 'I understand', next: null },
      ],
    },
    elena_help: {
      text: "Find the solar node nearby. Cash buys panels. Your energy buys installation time. Every bit lowers stress across the district.",
      mood: 'determined',
      responses: [{ label: "I'm on it", next: null }],
    },
  },
  elena_day2: {
    elena_day2: {
      text: "People think solar is expensive. It was — ten years ago. Now the panels cost less than a month's rent.",
      mood: 'happy',
      responses: [
        { label: "So why aren't more people doing it?", next: 'elena_barrier' },
        { label: 'Good to know', next: null },
      ],
    },
    elena_barrier: {
      text: "Landlords. They own the rooftops. They could install panels and share the savings — but there's no short-term profit, so they don't.",
      mood: 'tired',
      responses: [
        { label: "What's the workaround?", next: 'elena_coop' },
        { label: "That's frustrating", next: null },
      ],
    },
    elena_coop: {
      text: "A co-op buys the roof space collectively. We've done it on three buildings. The fourth is in progress — that's the node you can fund.",
      mood: 'determined',
      responses: [{ label: 'Count me in', next: null }],
    },
  },
  elena_day3: {
    elena_day3: {
      text: "Had a call with a city planner last week. They're interested in subsidizing co-op solar if we hit a critical mass of installs.",
      mood: 'happy',
      responses: [
        { label: "Critical mass meaning what?", next: 'elena_threshold' },
        { label: "That's promising", next: null },
      ],
    },
    elena_threshold: {
      text: "Twenty percent of rooftops in the district. We're at eleven. Get us to twenty and the city covers forty percent of future costs.",
      mood: 'tired',
      responses: [
        { label: "So every install counts double", next: 'elena_double' },
        { label: "I'll help push it", next: null },
      ],
    },
    elena_double: {
      text: "Exactly. One install brings the next one closer to free. Collective action has compound interest — people forget that.",
      mood: 'determined',
      responses: [{ label: 'I love that', next: null }],
    },
  },
  elena_day4: {
    elena_day4: {
      text: "Installed panel number twelve today. The homeowner insisted on naming it. It's called 'Sunny.' I have no notes.",
      mood: 'happy',
      responses: [{ label: 'Ha, love it', next: 'elena_day4b' }],
    },
    elena_day4b: {
      text: "Small joys keep this work sustainable. Twelve panels closer to twenty percent, and one very good panel name.",
      mood: 'happy',
      responses: [{ label: 'Onward to thirteen', next: null }],
    },
  },
  elena_day5: {
    elena_day5: {
      text: "A kid from the block asked me today if solar panels get tired. Best question I've had all year.",
      mood: 'happy',
      responses: [{ label: "What'd you tell her?", next: 'elena_day5b' }],
    },
    elena_day5b: {
      text: "Told her they just get sleepy at night, like everyone else, and wake up ready to work. She seemed satisfied.",
      mood: 'happy',
      responses: [{ label: 'Perfect answer', next: null }],
    },
  },
};

// Pick which dialogue tree to use for an NPC based on day number
export function pickDialogueKey(npcId: string, day: number): string {
  const trees: Record<string, string[]> = {
    mira:  ['mira_intro',  'mira_day2',  'mira_day3',  'mira_day4',  'mira_day5'],
    leo:   ['leo_intro',   'leo_day2',   'leo_day3',   'leo_day4',   'leo_day5'],
    elena: ['elena_intro', 'elena_day2', 'elena_day3', 'elena_day4', 'elena_day5'],
  };
  const options = trees[npcId] ?? ['mira_intro'];
  return options[(day - 1) % options.length];
}
