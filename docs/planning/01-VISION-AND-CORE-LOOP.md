# 01 — Vision, Core Loop & Systems Architecture

**Authored by:** Game Designer 🎮 & Narrative Designer 📖  
**Status:** Living Design Specification (v2.0)  
**Parent Document:** [`CLAUDE.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/CLAUDE.md)  

---

## 1. Executive Summary & Creative Thesis

**District: Common Ground** is not an escapist fantasy. It is an empathetic, urgent, yet playful urban resilience simulation where individual survivalism is revealed to be an exhausting dead end, and collective solidarity is the only sustainable strategy for thriving under systemic pressure.

In conventional survival or management games, the player accumulates private capital, fortifies personal boundaries, and consumes resources competitively. In *District: Common Ground*, private accumulation offers only short-term triage while accelerating the collapse of the neighborhood around you. True security is built outward: by funding the Community Kitchen, electrifying the Rooftop Solar Co-op, establishing the Tenant Legal Defense Fund, and defending neighbors against scapegoating rhetoric.

### The Innovation: The "Living District"
The breakthrough of v2.0 is grounding the simulation in the pulse of the real world. By ingesting public macroeconomic indicators (inflation, energy price surges, gig-economy pay indexes) and real civic news streams, the game bridges digital mechanics with lived urban reality. When real-world food prices spike or utility rates climb, the district's residents feel that shock in real time—and player-built community commons absorb the blow.

---

## 2. Design Pillars

Every mechanic, narrative branch, audio cue, and interface element must align with three inviolable design pillars:

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│                                 DESIGN PILLARS                                    │
├───────────────────────┬─────────────────────────┬─────────────────┬───────────────┤
│ 1. SOLIDARITY IS A    │ 2. GROUNDED IN REALITY, │ 3. TACTILE      │ 4. SANCTUARY  │
│    TECHNOLOGY         │    NOT CYNICISM         │    WARMTH & JOY │    & DEFENSE  │
│ Mutual aid is not     │ Crises are real (rents, │ Even in hard    │ Defend against│
│ charity; it is an     │ inflation, climate),    │ times, joy is   │ fascism & hate│
│ engineered buffer     │ but collective response │ alive: cats,    │ propaganda;   │
│ against catastrophe.  │ creates real power.     │ soup, music.    │ welcome all.  │
└───────────────────────┴─────────────────────────┴─────────────────┴───────────────┘
```

1. **Solidarity is a Technology**: Mutual aid is treated as an engineered defense system. Just as an engineer designs redundant circuits, a neighborhood builds redundant care networks (food, power, legal defense, child care).
2. **Grounded in Reality, Not Cynicism**: The hardships are real—drawn from actual cost-of-living data and civic headlines—but the game rejects grimdark despair. It demonstrates that ordinary people have agency when they organize together.
3. **Tactile Warmth & Playful Life**: The aesthetic balances systemic weight with cozy, tangible whimsy: steaming communal soup pots, cats napping on solar inverters, chalk art on sidewalks, and pirate radio broadcasts.
4. **Sanctuary & Anti-Fascist Community Defense**: Rejecting the poison of far-right propaganda, racism, and scapegoating. When climate shocks displace people, a resilient community expands the table rather than building higher walls.

---

## 3. The Core Gameplay Loops

```
┌──────────────────────────────────────────────────────────────────────────┐
│                           CORE GAMEPLAY LOOPS                            │
│                                                                          │
│  [MOMENT-TO-MOMENT: 0-30s]                                               │
│  Explore District ──> Encounter NPC/Need ──> Perform Action (Deliver/Work)│
│       ▲                                              │                   │
│       └─────────── Gain Trust/Cash/Energy ───────────┘                   │
│                                                                          │
│  [SESSION LOOP: 5-15 min]                                                │
│  Morning Paper/Radio ──> Daily Upkeep Tick ──> Manage Energy/Cash        │
│       │                                              │                   │
│       ▼                                              ▼                   │
│  Encounter Real-World Crisis ◄───────────── Contribute to Commons Nodes  │
│  (Scapegoat vs Solidarity Choice)           (Kitchen / Solar / Legal)     │
│       │                                              │                   │
│       └──────────────> Advance Day & Save ───────────┘                   │
│                                                                          │
│  [LONG-TERM LOOP: Days to Weeks]                                         │
│  Complete Commons Infrastructure ──> Unlock Dividends & Safe Buffs       │
│       │                                              │                   │
│       ▼                                              ▼                   │
│  Resist Systemic Shocks (Disaster/Buyout) ──> District Metamorphosis     │
└──────────────────────────────────────────────────────────────────────────┘
```

### 3.1 Moment-to-Moment Loop (0–30 Seconds)
- **Action**: The player walks through the top-down district (keyboard, gamepad, or mobile virtual thumbstick). They spot an NPC with a contextual indicator, a stray animal, or an urgent neighborhood task.
- **Decision**: Stop to assist a neighbor (spending 5 energy), run a courier drop (earning cash), or pet a stray cat (reducing stress).
- **Feedback**: Immediate kinetic audio cue, visual floating delta (`+15 Trust`, `-$5 Cash`), and micro-animation.
- **Reward**: Micro-progression toward daily resource equilibrium.

### 3.2 Session Loop (5–15 Minutes / 1 In-Game Day)
- **Phase 1: Dawn & Ingestion**:
  - The day begins at 07:00. The player steps outside to collect *"The Daily District Ground"* broadsheet newspaper.
  - The paper reports real-world economic indicators (CPI inflation, local transit strikes, weather alerts) and local neighborhood news.
  - The daily upkeep tick applies baseline costs: energy regeneration vs. hunger, rent/heating expenses, and baseline stress.
- **Phase 2: Action & Allocation**:
  - The player has a finite pool of Energy (40–100 depending on archetype) to divide between personal wage work and communal construction.
  - Contributing cash or energy to Commons Nodes (Community Kitchen, Solar Co-op, Legal Fund, Tool Library) inches the neighborhood closer to systemic immunity.
- **Phase 3: The Crisis Interruption**:
  - As midday arrives, an urgent crisis wire interrupts play (e.g., utility shutoff raid, algorithmic gig pay slash, extreme heatwave).
  - The player must choose: **Authoritarian Scapegoating** (immediate private relief at the cost of collective trust and resilience) vs. **Democratic Solidarity** (expending collective energy to defend the vulnerable).
- **Phase 4: Dusk & Reflection**:
  - Night falls. Streetlamps turn on. The player visits the Town Hall bulletin or the pirate radio to review the neighborhood's resilience balance before sleeping.

### 3.3 Long-Term Meta Loop (Hours to Weeks)
- **Commons Completion**: Reaching 100% on Commons Nodes fundamentally alters the neighborhood's economic baseline. Completed nodes generate **Commons Dividends** (free daily meals, off-grid power credits, eviction resistance).
- **District Metamorphosis**: As the global Resilience Score fluctuates:
  - **Bloom State (Resilience > 75%)**: The district visibly flourishes. Community murals appear, planter boxes overflow with flowers, string lights glow across alleys, and ambient music becomes rich and polyphonic.
  - **Decay State (Resilience < 35%)**: The district desaturates. Boarded shop windows appear, police cruisers idle at corners, litter drifts through streets, and ambient audio degrades into harsh industrial drone.
- **Community Land Trust Endgame**: The final structural triumph is purchasing the neighborhood's deeds into a permanent Community Land Trust, freeing the district from speculative buyout forever.

---

## 4. Character Archetypes: Asymmetric Lived Realities

The three archetypes are not mere cosmetic classes; they embody distinct socioeconomic classes under pressure:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        ARCHETYPE SYSTEM MATRIX                         │
├─────────────┬────────────────┬──────────┬───────────┬──────────────────┤
│ Archetype   │ Class Reality  │ Capital  │ Capacity  │ Vulnerability    │
├─────────────┼────────────────┼──────────┼───────────┼──────────────────┤
│ Pip         │ Gig-Economy    │ $25 Cash │ 80 Energy │ High Stress (60%)│
│ Courier     │ Precariat      │ (Low)    │ (High)    │ Low Cash Margin  │
├─────────────┼────────────────┼──────────┼───────────┼──────────────────┤
│ Morgan      │ Exhausted Sub- │ $240     │ 40 Energy │ Depleted Energy  │
│ Commuter    │ urban Worker   │ (Medium) │ (Low)     │ Long Commute Tax │
├─────────────┼────────────────┼──────────┼───────────┼──────────────────┤
│ Arthur      │ Fixed-Income   │ $1,200   │ 65 Energy │ Social Isolation │
│ Landlord    │ Small Holder   │ (High)   │ (Medium)  │ Low Trust (10)   │
└─────────────┴────────────────┴──────────┴───────────┴──────────────────┘
```

### 1. Pip — The Precarious Courier
- **The Lived Reality**: Lives in a subdivided garret apartment; owns a modified cargo bicycle. Works for algorithmic delivery platforms whose base pay fluctuates with real-world gig labor market indices.
- **Special Verbs**: Can execute rapid courier deliveries in the district to earn quick cash; high social trust unlocks direct community courier tasks that bypass platform fees.
- **Arc**: From individual survival hustle to organizing a neighborhood dispatch cooperative.

### 2. Morgan — The Exhausted Commuter
- **The Lived Reality**: Works a grueling data-entry job at the North High-Rise Center. Trapped in two-hour daily commutes vulnerable to real transit delays and fuel spikes.
- **Special Verbs**: High institutional literacy; can draft legal briefs for the Tenant Defense Fund at half energy cost, but struggles with chronic exhaustion.
- **Arc**: Reclaiming time and purpose from corporate alienation through local community action.

### 3. Arthur — The Solitary Landlord
- **The Lived Reality**: Inherited a six-unit brownstone from his parents. Financially solvent but emotionally isolated, distrusted by tenants who anticipate rent hikes.
- **Special Verbs**: Can inject major capital into commons nodes; can grant rent holidays and freeze building maintenance charges.
- **Arc**: Overcoming fear and class defensiveness to deed his property into the Community Land Trust, finding belonging in the dusk of his life.

---

## 5. The Scapegoating vs. Solidarity Decision Framework

Every crisis in *District: Common Ground* is authored around a specific cognitive trap common to decaying societies: **the urge to blame an outgroup for an infrastructural failure**.

```
                           ┌─────────────────────────┐
                           │    SYSTEMIC CRISIS      │
                           │ (e.g. Grid Overheating) │
                           └────────────┬────────────┘
                                        │
                 ┌──────────────────────┴──────────────────────┐
                 ▼                                             ▼
     ┌───────────────────────┐                     ┌───────────────────────┐
     │     SCAPEGOATING      │                     │      SOLIDARITY       │
     │  (Authoritarian Path) │                     │   (Democratic Path)   │
     ├───────────────────────┤                     ├───────────────────────┤
     │ • Cash Bonus (+$30)   │                     │ • Energy Cost (-15)   │
     │ • Resilience -15%     │                     │ • Resilience +20%     │
     │ • Trust -20           │                     │ • Trust +25           │
     │ • World Desaturates   │                     │ • World Blooms        │
     │ • Neighbor resentment │                     │ • Mutual safety net   │
     └───────────────────────┘                     └───────────────────────┘
```

### Psychological Design Rules
1. **Never Make Scapegoating Cartoonishly Evil**:
   The authoritarian/scapegoat choice must always feel tempting, rationalized, or convenient. It offers immediate cash or saves scarce energy when the player is exhausted.
2. **Never Make Solidarity Free**:
   Solidarity must cost something immediate: sweat, time, cash, or emotional vulnerability. Its reward is structural resilience that pays off when the next shock hits.
3. **Compound Consequences**:
   Three consecutive scapegoat resolutions plunge the district into a state of martial panic (curfews, police checkpoints, soundscape sirens). Rebuilding trust from that state requires significant community work.

---

## 6. The 10-Year Horizon: Climate Migration & Anti-Fascist Community Defense

Over the next decade (2026–2036+), real-world urban centers will face increasing climate-driven displacement, regional water and heat stress, and predatory far-right agitation attempting to scapegoat migrants and minorities for systemic failures.

*District: Common Ground* is explicitly architected to absorb real-world climate and displacement trends through its open-data ingestion pipeline:
- **The Welcoming Commons**: Newcomers (both legal and undocumented climate refugees) arriving at the North Transit Station bring vital skills, labor capacity, and cultural vitality. Welcoming them expands construction throughput and unlocks advanced agro-greenhouse and solar co-op tiers.
- **Anti-Fascist Community Defense**: Countering far-right leafleting, astroturfed social media disinformation, and ICE/police sweeps through fact-checking broadsheets, street potlucks, and peaceful human sanctuary networks.
- **Future-Proof Real Data Feeds**: Integrating NOAA/NASA temperature anomalies and UNHCR displacement data so that as the real world warms and shifts over the next 10 years, the game's simulation remains a living, honest, and empowering mirror of real planetary conditions.

*(See full specification in [`docs/planning/07-CLIMATE-MIGRATION-AND-ANTI-FASCISM.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/planning/07-CLIMATE-MIGRATION-AND-ANTI-FASCISM.md)).*
