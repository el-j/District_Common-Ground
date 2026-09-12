# EPIC 04 — Crisis Engine & Real-World News System

**Milestone:** M4 — Sprint 4
**Status:** [ ] Not Started

## Context

The game's core argument is delivered through the crisis system. Real-world allegory events interrupt play and force a binary choice: scapegoat a vulnerable group for short-term relief, or spend resources on collective action. Repeated scapegoating compounds into visible decline. This is how the game teaches systems thinking without lecturing.

## User Stories

### S4.1 — Crisis Interruption
As a player in the middle of my day,
I want a crisis event to halt gameplay and demand my attention,
so that crises feel urgent and consequential rather than optional menu items.

**Acceptance criteria:**
- CrisisEngine.ts pauses player movement when an active crisis triggers
- CrisisWireModal.ts displays a breaking-news-style card with scenario text
- Two resolution options clearly presented: a scapegoating path and a solidarity path
- Player cannot dismiss the modal without making a choice

### S4.2 — Branching Consequences
As a player who makes a crisis choice,
I want to immediately see the resource and world consequences of my decision,
so that the feedback loop is tight and I build intuition about systemic cause and effect.

**Scapegoating consequences:**
- Short-term cash bonus
- Resilience score decreases
- Social Trust decreases
- World palette desaturates slightly

**Solidarity consequences:**
- Upfront energy cost
- Resilience score increases
- Social Trust increases
- World blooms, new tiles unlock

**Acceptance criteria:**
- Each path applies correct stat deltas immediately to the Zustand store
- HUD updates reflect changes within the same frame
- Choosing scapegoating 3 times triggers a visible emergency visual state (world in crisis zone)

### S4.3 — Crisis History Log
As a player late in the game,
I want to review every crisis decision I've made and its outcome,
so that I can reflect on the arc of my choices and understand the compounding consequences.

**Acceptance criteria:**
- Town Hall building opens a historical log interface
- Log shows: day number, crisis name, choice made, consequence summary
- All resolved events persist accurately in IndexedDB

### S4.4 — Crisis Scenario Content
As a player experiencing a crisis,
I want the scenarios to feel grounded in real-world events and systemic dynamics I recognize,
so that the game bridges fiction and reality rather than feeling like arbitrary game mechanics.

**Initial 5 crisis scenarios (to encode in crisis_scenarios.json):**
1. **The Winter Power Surge** — energy monopoly raises rates, blames immigrant families
2. **The Social App Disinformation Wave** — viral false video about a cultural center
3. *(3 additional scenarios to be written — see narrative design spec)*
4. *(TBD)*
5. *(TBD)*

**Acceptance criteria:**
- crisis_scenarios.json encodes all 5 scenarios with both resolution branches
- Each scenario has: id, title, context text, choiceA (scapegoat), choiceB (solidarity), consequences
