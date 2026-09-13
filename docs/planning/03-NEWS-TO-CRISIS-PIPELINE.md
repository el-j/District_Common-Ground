# 03 — News-to-Crisis Pipeline & "The District Dispatch"

**Authored by:** Narrative Designer 📖 & Engineering Backend Architect 🛠️  
**Status:** Living Specification (v2.0)  
**Parent Document:** [`CLAUDE.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/CLAUDE.md)  

---

## 1. Vision: Transforming Real Headlines into Playable Empathy

A critical hazard in serious civic games is feeling like a lecture or a dry RSS reader. 

In **District: Common Ground (v2.0)**, real-world news is not dumped into a text window as raw data. Instead, news feeds pass through a narrative translation pipeline that reimagines global headlines as **street-level local dilemmas**.

When a real news alert reports:
> *"Regional rail workers announce three-day strike over staffing cuts"*

In the game, this does not show up as a generic popup. It manifests as:
- Morgan waking up to cancelled commuter trains at the North Station.
- Pip being inundated with urgent courier orders from stranded neighbors.
- An authoritarian city councillor calling the strikers "lazy troublemakers."
- A crisis card asking the player: Will you volunteer your cargo bike to run medication for elderly residents (Solidarity), or cross the digital picket line to take surge pricing jobs (Scapegoating)?

---

## 2. Ingestion Architecture: The "Pulse Wire" Service

```
┌────────────────────────────────────────────────────────────────────────┐
│                     NEWS-TO-CRISIS ARCHITECTURE                        │
│                                                                        │
│  [PUBLIC RSS / CIVIC FEEDS]                                            │
│  • Municipal Notices & City Council Dispatches                         │
│  • Public Transit & Environmental Alert Feeds                          │
│  • Labor & Tenant Union News Bulletins                                 │
│                   │                                                    │
│                   ▼                                                    │
│  [GO SERVICE: internal/pulse/news.go]                                  │
│  • Ingests RSS / JSON streams every 6 hours                            │
│  • Normalizes headlines & extracts keywords                            │
│  • Matches to 1 of 5 Crisis Archetypes                                 │
│                   │                                                    │
│                   ▼                                                    │
│  [PROCEDURAL CRISIS SYNTHESIZER]                                       │
│  • Template: [Real Context] + [District NPC Angle] + [Two Choices]     │
│  • Deterministic Fallback: 25 authored Evergreen Scenarios            │
│                   │                                                    │
│                   ▼                                                    │
│  [THE DISTRICT DISPATCH INTERFACES]                                    │
│  1. "The Daily District Ground" (Morning Doorstep Broadsheet)          │
│  2. "Radio Free Commons" (Pirate FM Ticker & Web Audio Synth)          │
│  3. CrisisWireModal.ts (Interactive Breaking Decision Card)            │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. The 5 Core Crisis Archetypes

Incoming real-world civic news items are classified into five systemic categories:

```
┌──────────────────────┬─────────────────────────┬─────────────────────────┐
│ Archetype            │ Real-World Trigger      │ In-Game Street Impact   │
├──────────────────────┼─────────────────────────┼─────────────────────────┤
│ 1. LABOR_TRANSIT     │ Rail strikes, courier   │ North Station shut down;│
│                      │ algorithm wage cuts,    │ courier order volume    │
│                      │ warehouse walkouts      │ surges or freezes       │
├──────────────────────┼─────────────────────────┼─────────────────────────┤
│ 2. CLIMATE_EXTREME   │ Heat dome alerts, flash │ Rooftops overheat; cold │
│                      │ floods, winter freeze,  │ snap freezes pipes;     │
│                      │ air quality warnings    │ energy upkeep spikes    │
├──────────────────────┼─────────────────────────┼─────────────────────────┤
│ 3. HOUSING_SPECULATE │ Private equity buyouts, │ Corporate eviction      │
│                      │ mass eviction notices,  │ notices on doors; rent  │
│                      │ rezoning disputes       │ hike ultimatums         │
├──────────────────────┼─────────────────────────┼─────────────────────────┤
│ 4. FOOD_HEALTH       │ Grocery price spikes,   │ Corner Grocer depleted; │
│                      │ health inspection raids │ community fridge cited  │
│                      │ on mutual aid fridges   │ for permit violations   │
├──────────────────────┼─────────────────────────┼─────────────────────────┤
│ 5. CIVIC_DISINFO     │ Viral social media      │ Rumors blame newcomers; │
│                      │ scapegoating, bot farms │ cultural center door    │
│                      │ targeting minorities    │ vandalized; fear rises  │
├──────────────────────┼─────────────────────────┼─────────────────────────┤
│ 6. MIGRATION_SANCT   │ Climate refugee influx, │ New arrivals at station;│
│                      │ municipal sanctuary rows│ shelter capacity crisis;│
│                      │ or documentation raids  │ ICE/police sweep threat │
├────────────────────────┼─────────────────────────┼─────────────────────────┤
│ 7. COMMUNITY_DIVISION  │ Divisive street march,  │ Neighborhood tension;   │
│                        │ hate group leafleting,  │ leafleting in alleys;   │
│                        │ vigilante intimidation  │ unity festival call     │
└────────────────────────┴─────────────────────────┴─────────────────────────┘
```

---

## 4. Scenario Schema v2: Blending Reality & Fiction

The schema in `crisis_scenarios.json` and `packages/shared-types` is expanded to support live grounding:

```typescript
export interface CrisisScenarioV2 {
  id: string;
  archetype: 'LABOR_TRANSIT' | 'CLIMATE_EXTREME' | 'HOUSING_SPECULATE' | 'FOOD_HEALTH' | 'CIVIC_DISINFO' | 'MIGRATION_SANCT' | 'COMMUNITY_DIVISION';
  title: string;
  realWorldAnchor: {
    headline: string;
    source: string;
    date: string;
    url?: string;
  };
  districtContext: string;
  involvedNPCs: string[]; // e.g. ['Grocer Sal', 'Elena', 'Transit Worker Joe']
  choiceA: {
    label: string;
    type: 'authoritarian';
    narrativeOutcome: string;
    consequences: {
      cashDelta: number;
      trustDelta: number;
      resilienceDelta: number;
      stressDelta: number;
      worldEffect: 'desaturate';
    };
  };
  choiceB: {
    label: string;
    type: 'solidarity';
    narrativeOutcome: string;
    consequences: {
      energyDelta: number;
      cashDelta: number;
      trustDelta: number;
      resilienceDelta: number;
      stressDelta: number;
      worldEffect: 'bloom';
    };
  };
}
```

---

## 5. Delivery Mediums in the Game

### 5.1 "The Daily District Ground" (Tactile Morning Broadsheet)
Every in-game morning at 07:00, a freshly rolled newspaper appears on the player's porch.
- **Visual Style**: Cream-colored tactile broadsheet with woodcut illustrations, authentic vintage newsprint typography, ink smudges, and fold creases.
- **Content**:
  1. **Banner Headline**: Real-world news hook translated into district events.
  2. **District Editorial**: Commentary from local personalities (e.g. Sal from the grocer or Elena from the community kitchen).
  3. **The Weather & Economic Barometer**: Today's food multiplier, energy surcharge, and transit delay risk.
  4. **Street Classifieds / Lost & Found**: Playful world-building (e.g., *"Lost: Calico cat answers to 'Scraps'. Frequents solar roof."*).

### 5.2 "Radio Free Commons" (Pirate FM Audio & Ticker)
Located on the shelf in the player's apartment or in the top HUD.
- An interactive retro radio receiver with a tuning dial.
- Plays procedurally generated low-fi chiptune tracks via `SoundSynth.ts`.
- Broadcasts breaking audio news chimes and a bottom scrolling amber-LED text ticker:
  > *"⚡ RADIO FREE COMMONS [89.7 FM]: Grid operator warns of rolling blackouts tonight... Solar Co-op battery banks at 84% capacity... Bring thermoses to the Community Kitchen..."*

---

## 6. Offline & Network Fallback Matrix

| Network State | Data Source | Behavior |
|---|---|---|
| **Online (API Connected)** | Live Go Pulse Service (`/api/v1/pulse/news`) | Ingests real daily civic RSS items; maps to dynamic crisis scenarios |
| **Online (API Unreachable)**| Cached Local Feed (`idb-keyval`) | Replays recent cached batch of live items |
| **Offline / PWA Disconnected** | Static Curated Vault (`crisis_scenarios.json`) | 25 hand-crafted evergreen scenarios rotating by day and season |
