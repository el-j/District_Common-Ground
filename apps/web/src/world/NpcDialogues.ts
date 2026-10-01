// M23 §3 — dialogue data + selection logic extracted from WorldScene.ts so
// they're testable without pulling Phaser into a node-environment Vitest
// run. Content and behaviour are unchanged from what previously lived
// inline in WorldScene.ts, plus two new trees per NPC (see below).
//
// M26 — added three new NPCs (sal, marcus, higgins), drawn from the existing
// "Seven Pillars" character bible (docs/planning/09-NPC-SOCIAL-NETWORK-AND-
// RELATIONSHIPS.md) rather than invented from scratch, with the same 5-tree
// rotation as the original three.

// M21 §8 — mood is an abstract token; DialogueOverlay resolves it to a
// portrait emoji/frame, never a hardcoded sprite path baked in here.
//
// M39 §2 — EPIC-33. `teachesRecipe`/`minTrust` extend a small, fixed set of
// existing nodes (never a new gate mechanism) — DialogueOverlay checks
// `minTrust` against a `playerTrust` value it's given at construction, and
// fires `onTeach(recipeId)` the moment this node renders. No trust-gating
// pattern existed anywhere in the dialogue system before this milestone
// (confirmed by direct read — trees only ever rotated by day number); this
// is the real mechanism the M39 task doc's Section 2 referred to.
import type { RecipeId } from '../core/simulation/Recipes';
import type { WorldQuestId } from '../core/state/useGameStore';

// M35 — EPIC-31 §4. `assignsQuest` extends the same small, fixed set of
// existing nodes `teachesRecipe` (M39) already established — fires the
// moment this node renders, independent of `teachesRecipe`/`minTrust` (a
// node may carry both, as `higgins_memory` below now does). No new
// dialogue-gate mechanism, reusing the one M39 built.
export type DialogueNode = {
  text: string;
  responses: { label: string; next: string | null }[];
  mood?: 'happy' | 'tired' | 'determined';
  teachesRecipe?: RecipeId;
  minTrust?: number;
  assignsQuest?: WorldQuestId;
};

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
      text: "Every bit helps. Even $5 or a few hours of energy goes a long way. Hit the build node nearby to contribute. Tell you what — get us to the halfway mark and I'll make sure you eat well for a week.",
      mood: 'determined',
      responses: [{ label: 'Got it, thanks', next: null }],
      assignsQuest: 'fund-the-kitchen',
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
      text: "Everyone brings something. That's the trick — nobody has to carry it alone. Could you walk down to the South Solar Quarter to see how our planter greens are coming along?",
      mood: 'determined',
      responses: [
        { label: "I'll inspect the greenhouse", next: null },
        { label: 'I will', next: null },
      ],
      assignsQuest: 'mira-garden-scout',
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
      text: "Gives people options when they can't afford a lawyer. Keeps power from just rolling over the block. Actually — do me a favor and swing by the Transit Hub. I need a read on what the Utility Station's really up to before the next vote.",
      mood: 'determined',
      responses: [{ label: "I'll try to fund it", next: null }],
      assignsQuest: 'scout-the-transit-hub',
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
      text: "Hit the Legal Fund build node in the plaza. If we get the fund to 40%, we can file an injunction and protect the block from arbitrary evictions.",
      mood: 'determined',
      responses: [{ label: "On it", next: null }],
      assignsQuest: 'legal-fund-rally',
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
      text: "Find the solar node nearby. Cash buys panels. Your energy buys installation time. Help us push the Solar Co-op to 40% and we'll have emergency batteries online.",
      mood: 'determined',
      responses: [{ label: "I'm on it", next: null }],
      teachesRecipe: 'RECIPE_WIRED_LAMP',
      minTrust: 20,
      assignsQuest: 'inspect-solar-grid',
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
      text: "Small joys keep this work sustainable. Say, if you're taking a walk, could you check the canal water runoff by the East Canal? We're tracking drainage.",
      mood: 'happy',
      responses: [
        { label: "I'll check the canal", next: null },
        { label: 'Onward to thirteen', next: null },
      ],
      assignsQuest: 'canal-water-watch',
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

  // ── Sal (rotation: 5 trees) ────────────────────────────────────────────────
  sal_intro: {
    sal_intro: {
      text: "Sal. Corvo's Corner Grocer, three generations running. Margins are razor thin these days, but the doors stay open.",
      mood: 'tired',
      responses: [
        { label: 'Why razor thin?', next: 'sal_margins' },
        { label: 'Good to meet you', next: null },
      ],
    },
    sal_margins: {
      text: "Corporate chain wants to buy out my lease. I say no every time, but every time the offer's a little higher.",
      mood: 'tired',
      responses: [
        { label: 'How do you keep going?', next: 'sal_fridge' },
        { label: 'Hope you hold out', next: null },
      ],
    },
    sal_fridge: {
      text: "Simple. Every night, whatever doesn't sell goes straight in the Community Fridge out back. Keeps the shelves honest and the block fed. In fact, I've got an extra sourdough loaf for Mrs. Higgins — mind taking it by her place?",
      mood: 'determined',
      responses: [{ label: "I'll take it over", next: null }],
      assignsQuest: 'sal-bread-run',
    },
  },
  sal_day2: {
    sal_day2: {
      text: "Had a corporate rep in here again this morning, clipboard and all. Offered me triple what the lease is worth.",
      mood: 'tired',
      responses: [
        { label: 'Are you going to sell?', next: 'sal_sell' },
        { label: "That's a lot of money", next: 'sal_sell' },
      ],
    },
    sal_sell: {
      text: "Third generation behind this counter. Some things don't have a price tag, kid. Told him no and went back to stocking.",
      mood: 'determined',
      responses: [{ label: 'Respect', next: null }],
    },
  },
  sal_day3: {
    sal_day3: {
      text: "Funny thing happened today — a regular I've known twenty years brought her kid in to 'help me with rent negotiations.' Little guy's twelve.",
      mood: 'happy',
      responses: [
        { label: "That's sweet", next: 'sal_kid' },
        { label: "What'd he say?", next: 'sal_kid' },
      ],
    },
    sal_kid: {
      text: "Kid slid a drawing across the counter — 'Sal's Store, Est. Forever.' Taped it right by the register. Best lease renewal I never asked for.",
      mood: 'happy',
      responses: [{ label: 'I love that', next: null }],
    },
  },
  sal_day4: {
    sal_day4: {
      text: "Delivery truck broke down two blocks over. Had bread going stale in the back of it before anyone even called me.",
      mood: 'tired',
      responses: [{ label: "What'd you do?", next: 'sal_rescue' }],
    },
    sal_rescue: {
      text: "Grabbed a cart, walked it all over myself, split what didn't sell between three doorsteps and the Fridge. Actually, I have a surplus crate of flour for Mira's lunch prep. Mind letting her know it's ready?",
      mood: 'determined',
      responses: [
        { label: "I'll let Mira know", next: null },
        { label: "That's a lot of walking", next: null },
      ],
      assignsQuest: 'sal-kitchen-support',
    },
  },
  sal_day5: {
    sal_day5: {
      text: "Twenty years behind this counter today. Didn't think I'd make it past year two, honestly.",
      mood: 'happy',
      responses: [{ label: 'Congratulations', next: 'sal_reflect' }],
    },
    sal_reflect: {
      text: "Neighbors chipped in and covered my whole register for the day — insisted I take the money instead. Never had customers turn the tables like that.",
      mood: 'happy',
      responses: [{ label: 'That says a lot about this block', next: null }],
    },
  },

  // ── Marcus (rotation: 5 trees) ─────────────────────────────────────────────
  marcus_intro: {
    marcus_intro: {
      text: "Marcus. Forty years turning wrenches on a factory floor, now I run the Tool Library. Tolerances don't lie, people sometimes do.",
      mood: 'tired',
      responses: [
        { label: "What's the Tool Library?", next: 'marcus_library' },
        { label: 'Nice to meet you', next: null },
      ],
    },
    marcus_library: {
      text: "Borrow what you need, return it clean, and don't be a stranger about the arthritis jokes. We're stocking up the Tool Library, but I need discarded bike cables from the East Canal if you're heading that way.",
      mood: 'determined',
      responses: [
        { label: 'Defiance against what?', next: 'marcus_defiance' },
        { label: "I'll look along the canal", next: null },
      ],
      assignsQuest: 'marcus-salvage-run',
    },
    marcus_defiance: {
      text: "Disposable everything, kid. They want you to throw it out and buy new. I want you to fix it and keep the twenty bucks.",
      mood: 'happy',
      responses: [{ label: 'I like that philosophy', next: null }],
      teachesRecipe: 'RECIPE_UPCYCLED_WORKBENCH',
      minTrust: 30,
    },
  },
  marcus_day2: {
    marcus_day2: {
      text: "Hands are worse in the cold mornings now. Arthritis doesn't care how many bikes need fixing.",
      mood: 'tired',
      responses: [
        { label: 'You should slow down', next: 'marcus_slow' },
        { label: 'That sounds hard', next: 'marcus_slow' },
      ],
    },
    marcus_slow: {
      text: "Slowing down's not really on the menu. Taught two neighbors how to do the basic repairs instead. If you can help stock the Tool Library to 30%, we'll open tool loans to the whole block.",
      mood: 'determined',
      responses: [{ label: 'Smart move, I will help', next: null }],
      assignsQuest: 'tool-library-stocking',
    },
  },
  marcus_day3: {
    marcus_day3: {
      text: "Landlord's sniffing around the basement again, talking about 'storage unit conversions.'",
      mood: 'tired',
      responses: [{ label: 'Can they do that?', next: 'marcus_fight' }],
    },
    marcus_fight: {
      text: "Not if the lease says community amenity, which — funny thing — it does, since I made sure of it years back. Paperwork's a tool too.",
      mood: 'determined',
      responses: [{ label: 'You think of everything', next: null }],
    },
  },
  marcus_day4: {
    marcus_day4: {
      text: "Fixed my hundredth bike this year today. Little milestone, but I counted.",
      mood: 'happy',
      responses: [{ label: "That's impressive", next: 'marcus_milestone' }],
    },
    marcus_milestone: {
      text: "Every one of those bikes is somebody who didn't have to pay shop rates or walk. Numbers like that matter more to me than a plaque would.",
      mood: 'happy',
      responses: [{ label: 'Well earned', next: null }],
    },
  },
  marcus_day5: {
    marcus_day5: {
      text: "Sister came by the shop today — Rosa, works the night shift at the clinic. Hadn't seen her in two weeks with our schedules.",
      mood: 'happy',
      responses: [{ label: "How's she doing?", next: 'marcus_rosa' }],
    },
    marcus_rosa: {
      text: "Exhausted, same as always, but she brought coffee and we swapped block gossip for twenty minutes. Best break I've had all month.",
      mood: 'happy',
      responses: [{ label: "Family's important", next: null }],
    },
  },

  // ── Higgins (rotation: 5 trees) ────────────────────────────────────────────
  higgins_intro: {
    higgins_intro: {
      text: "Beatrice Higgins. Fifty-eight years on this stoop, same rent-controlled apartment the whole time. I've seen every trick this block has to offer.",
      mood: 'determined',
      responses: [
        { label: 'What kind of tricks?', next: 'higgins_tricks' },
        { label: "That's a long time", next: null },
      ],
    },
    higgins_tricks: {
      text: "Landlord tactics never change, dear. Only the names on the private equity firms rotate. I remember every one of them.",
      mood: 'tired',
      responses: [
        { label: 'How do you remember it all?', next: 'higgins_memory' },
        { label: "I'll listen anytime", next: null },
      ],
    },
    higgins_memory: {
      text: "When you've watched the same play performed four times, you start recognizing the actors even in different costumes. Here — take my old tenant covenant copy over to Leo at the plaza. He'll know what to do with it.",
      mood: 'happy',
      responses: [{ label: "That's a sharp way to put it", next: null }],
      teachesRecipe: 'RECIPE_MENDED_JACKET',
      minTrust: 20,
      assignsQuest: 'deliver-higgins-letter',
    },
  },
  higgins_day2: {
    higgins_day2: {
      text: "Lost another old friend from the building this week. Third one this year. Loneliness is the part nobody warns you about.",
      mood: 'tired',
      responses: [{ label: "I'm sorry to hear that", next: 'higgins_comfort' }],
    },
    higgins_comfort: {
      text: "Thank you, dear. Truth is, new faces on this stoop help more than folks realize. Sit a while sometime — the company's good for both of us.",
      mood: 'happy',
      responses: [{ label: 'I will', next: null }],
    },
  },
  higgins_day3: {
    higgins_day3: {
      text: "They tried the 'the meeting got moved' trick on us back in '74, you know. Still doesn't work.",
      mood: 'determined',
      responses: [{ label: "What happened in '74?", next: 'higgins_74' }],
    },
    higgins_74: {
      text: "Called every neighbor by hand with the real time. Packed the hall anyway. Some tricks age like milk, and this block never forgets a recipe.",
      mood: 'happy',
      responses: [{ label: "I'll remember that", next: null }],
    },
  },
  higgins_day4: {
    higgins_day4: {
      text: "Found my old tenant covenant in the trunk this morning, dusting off boxes I hadn't touched in years.",
      mood: 'happy',
      responses: [{ label: "What's in it?", next: 'higgins_covenant' }],
    },
    higgins_covenant: {
      text: "Rights this block fought for decades ago that landlords keep hoping we've forgotten. I'm taking a copy down to the Central Plaza assembly. Would you meet us there?",
      mood: 'determined',
      responses: [
        { label: "I'll meet you at the plaza", next: null },
        { label: "That's powerful history", next: null },
      ],
      assignsQuest: 'higgins-plaza-covenant',
    },
  },
  higgins_day5: {
    higgins_day5: {
      text: "Whole block turned out for my birthday on the stoop last night. Eighty candles would've been a fire hazard, so we did one big one instead.",
      mood: 'happy',
      responses: [{ label: 'Happy birthday, Mrs. Higgins', next: 'higgins_birthday' }],
    },
    higgins_birthday: {
      text: "Fifty-eight years here, and last night was one of the finest. Funny how a stoop can hold that much love if you let it.",
      mood: 'happy',
      responses: [{ label: 'This block is lucky to have you', next: null }],
    },
  },

  // ── M42 — South Canal Workshop & Retail Row NPCs ────────────────────────
  // Deliberately a single fixed tree each, not the 5-tree day rotation the
  // open-world roster uses (M23/M26) — a recorded scope reduction: these
  // are minor, static, one-room interior NPCs, not full roster members.
  priya_workshop: {
    priya_workshop: {
      text: "Priya. Forty pounds of scrap metal came through that door this morning — by tonight it's someone's stove repair.",
      mood: 'determined',
      responses: [
        { label: 'What are you working on?', next: 'priya_bike' },
        { label: 'Nice to meet you', next: null },
      ],
    },
    priya_bike: {
      text: "Frames, mostly — bent ones nobody wanted. Straighten the tubing, true the wheels, and you've got a bike worth more than scrap. I can show you, if you've earned some trust around here.",
      mood: 'happy',
      responses: [{ label: 'Teach me', next: null }],
      teachesRecipe: 'RECIPE_UPCYCLED_BIKE',
      minTrust: 25,
    },
  },
  dax_workshop: {
    dax_workshop: {
      text: "Dax. Sawdust's basically my cologne at this point. Every offcut in this shop has a second life waiting in it.",
      mood: 'happy',
      responses: [
        { label: 'How long have you done this?', next: 'dax_history' },
        { label: 'Good to meet you', next: null },
      ],
    },
    dax_history: {
      text: "Since I was twelve, fixing my grandfather's chairs. Still do the same joinery he taught me — some things don't need reinventing.",
      mood: 'determined',
      responses: [{ label: "That's a good tradition", next: null }],
    },
  },
  ezra_library: {
    ezra_library: {
      text: "Ezra. Keeper of whatever this block hasn't thrown away yet — manuals, schematics, the odd cookbook someone left behind.",
      mood: 'happy',
      responses: [
        { label: "Got anything on electronics?", next: 'ezra_radio' },
        { label: 'Just browsing, thanks', next: null },
      ],
    },
    ezra_radio: {
      text: "A whole shelf on pre-digital radio repair, actually. Wire, glass, salvaged components — once you've earned my trust I'll walk you through building one from scratch.",
      mood: 'determined',
      responses: [{ label: 'Teach me', next: null }],
      teachesRecipe: 'RECIPE_SALVAGE_RADIO',
      minTrust: 20,
    },
  },

  // ── M45 — EPIC-35 §3. Industrial Outskirts NPCs ─────────────────────────
  // Same "single fixed tree, not the 5-tree rotation" scope reduction M42
  // recorded for its own minor interior NPCs — these are open-region
  // flavor characters, not full roster members.
  rusty_outskirts: {
    rusty_outskirts: {
      text: "Name's Rusty. Been picking this yard clean for twenty years — one crew's scrap is another crew's roof.",
      mood: 'tired',
      responses: [
        { label: "What do you find out here?", next: 'rusty_finds' },
        { label: 'Good to meet you', next: null },
      ],
    },
    rusty_finds: {
      text: "Iron mostly, some good scrap metal if the trucks haven't beaten you to it. Watch your step near the crane arm.",
      mood: 'determined',
      responses: [{ label: "I'll be careful", next: null }],
    },
  },
  ember_outskirts: {
    ember_outskirts: {
      text: "Ember. I haul the coal seams out past the sidings — dirty work, but it keeps the forges running back in town.",
      mood: 'tired',
      responses: [
        { label: "Which forges?", next: 'ember_forges' },
        { label: 'Nice to meet you', next: null },
      ],
    },
    ember_forges: {
      text: "The Metalwork Workshop, mostly. Priya doesn't ask where the coal comes from — she just knows it burns clean.",
      mood: 'happy',
      responses: [{ label: "Small world", next: null }],
    },
  },

  // ── M49 — EPIC-36 §2. Family member NPCs, spawned by InteriorScene.ts
  // inside the player's own chosen home (see FamilyTemplates.ts's
  // homeInteriorId). Same single-fixed-tree scope as every other minor
  // interior NPC this project has added since M42.
  marisol_family: {
    marisol_family: {
      text: "There you are. Table's set if you're hungry — I know money's tight right now, but nobody eats alone in this house.",
      mood: 'happy',
      responses: [
        { label: "Thanks, Mom.", next: 'marisol_advice' },
        { label: 'I\'ll be back later.', next: null },
      ],
    },
    marisol_advice: {
      text: "Whatever you're chasing out there — the district needs people who still show up for their neighbors. Don't lose that.",
      mood: 'determined',
      responses: [{ label: "I won't.", next: null }],
    },
  },
  teo_family: {
    teo_family: {
      text: "Hey! I fixed Mrs. Alvarez's bike chain today — well, she's not related, everyone just calls her that. Anyway, I only charged her two dollars.",
      mood: 'happy',
      responses: [
        { label: "That's generous of you.", next: 'teo_dream' },
        { label: 'Nice work.', next: null },
      ],
    },
    teo_dream: {
      text: "Someday I want a real shop. Not like Marcus's — smaller, just for bikes. You think that's silly?",
      mood: 'determined',
      responses: [{ label: 'Not silly at all.', next: null }],
    },
  },
  david_family: {
    david_family: {
      text: "Back from the line already? Feels like I just got in myself. This district runs on people who never quite catch up on sleep.",
      mood: 'tired',
      responses: [
        { label: "You work too hard.", next: 'david_reason' },
        { label: "Get some rest.", next: null },
      ],
    },
    david_reason: {
      text: "Somebody's got to. Just — don't let the grind eat the years the way it's eaten mine. Find time for the people down the hall.",
      mood: 'tired',
      responses: [{ label: "I'll try.", next: null }],
    },
  },
  priya_family: {
    priya_family: {
      text: "Still can't believe your family took me in without a second thought. Third apartment fell through this year — this couch is a palace by comparison.",
      mood: 'happy',
      responses: [
        { label: "You're welcome here.", next: 'priya_plan' },
        { label: "Glad you're settled.", next: null },
      ],
    },
    priya_plan: {
      text: "Soon as I've got steady footing, I want to pay it forward — maybe volunteer at the tool library or the kitchen. This block gave me a chance. I owe it one back.",
      mood: 'determined',
      responses: [{ label: 'That\'s a good plan.', next: null }],
    },
  },
  harold_family: {
    harold_family: {
      text: "Ah. You're up. I was reviewing the ledgers — the renters on the third floor are three days late again. Third floor, always the third floor.",
      mood: 'tired',
      responses: [
        { label: "Maybe check in on them?", next: 'harold_pushback' },
        { label: "I'll leave you to it.", next: null },
      ],
    },
    harold_pushback: {
      text: "Check in? I built this portfolio brick by brick without anyone checking in on me. But — you're young. Maybe you'll do it differently. We'll see.",
      mood: 'determined',
      responses: [{ label: 'Maybe I will.', next: null }],
    },
  },
  constance_family: {
    constance_family: {
      text: "Didn't expect to run into family out here, of all places. Harold still doesn't know I moved back to the district, and I intend to keep it that way for now.",
      mood: 'tired',
      responses: [
        { label: 'Why the distance?', next: 'constance_reason' },
        { label: "Your secret's safe.", next: null },
      ],
    },
    constance_reason: {
      text: "He treats every tenant like a line item. I couldn't stomach it anymore, so I left the business and never looked back. Doesn't mean I don't think about him.",
      mood: 'tired',
      responses: [{ label: "That's understandable.", next: null }],
    },
  },
};

// Pick which dialogue tree to use for an NPC based on day number
export function pickDialogueKey(npcId: string, day: number): string {
  const trees: Record<string, string[]> = {
    mira:    ['mira_intro',    'mira_day2',    'mira_day3',    'mira_day4',    'mira_day5'],
    leo:     ['leo_intro',     'leo_day2',     'leo_day3',     'leo_day4',     'leo_day5'],
    elena:   ['elena_intro',   'elena_day2',   'elena_day3',   'elena_day4',   'elena_day5'],
    sal:     ['sal_intro',     'sal_day2',     'sal_day3',     'sal_day4',     'sal_day5'],
    marcus:  ['marcus_intro',  'marcus_day2',  'marcus_day3',  'marcus_day4',  'marcus_day5'],
    higgins: ['higgins_intro', 'higgins_day2', 'higgins_day3', 'higgins_day4', 'higgins_day5'],
  };
  const options = trees[npcId] ?? ['mira_intro'];
  return options[(day - 1) % options.length];
}
