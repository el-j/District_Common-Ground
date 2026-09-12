# 10 — Community Land Trust, Municipal Assembly & Asynchronous Endgame

**Authored by:** Economy Designer 💰, Engineering Backend Architect 🛠️ & Game Designer 🎮  
**Status:** Living Core Specification (v2.0)  
**Parent Documents:** [`01-VISION-AND-CORE-LOOP.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/planning/01-VISION-AND-CORE-LOOP.md), [`02-LIVING-ECONOMY-AND-REAL-DATA.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/planning/02-LIVING-ECONOMY-AND-REAL-DATA.md)  

---

## 1. The Endgame Thesis: Decoupling from Speculative Capital

In most survival or tycoon games, the "endgame" is exponential private accumulation: owning all the properties, amassing millions of dollars, and dominating the map.

In **District: Common Ground**, private accumulation is an unsustainable trap that accelerates the collapse of the neighborhood. The true structural endgame is **permanently de-commodifying the land**: taking the neighborhood off the speculative real estate market forever by establishing a **Community Land Trust (CLT)**.

Once the Community Land Trust is ratified:
- Tenement rents are legally capped to 20% of median neighborhood wages in perpetuity.
- Evictions by outside private equity firms (like Horizon Capital) become legally impossible.
- Ground leases are owned collectively by all residents through the democratic Municipal Assembly.
- The district achieves **Systemic Immunity**: external housing crashes and speculative bubbles can no longer dispossess the residents.

```
┌────────────────────────────────────────────────────────────────────────┐
│                   THE COMMUNITY LAND TRUST TRANSITION                  │
│                                                                        │
│  [PHASE 1: PRIVATE PRECARITY]                                          │
│  Private Equity Buyouts ──> Rent Spikes ──> Mass Eviction Notices      │
│  (Landlords squeeze tenants; tenants burn out; community fragments)   │
│                                                                        │
│                           │ (Player Organizing)                        │
│                           ▼                                            │
│  [PHASE 2: THE SOLIDARITY POOL]                                        │
│  Tenant Coalition + Legal Fund + Arthur's Brownstone Equity            │
│  • Rent strikes force buyout discount                                  │
│  • Community bond campaign raises seed equity                          │
│                                                                        │
│                           │ (Ratification Vote)                        │
│                           ▼                                            │
│  [PHASE 3: THE COMMUNITY LAND TRUST (PERMANENT COMMONS)]               │
│  • Deeds transferred to democratic community trust                     │
│  • Zero speculative evictions forever                                  │
│  • Surplus revenues fund free community kitchen & off-grid solar       │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. The Mechanics of the Land Trust Transition

To complete the Community Land Trust endgame, the player must fulfill three interdependent conditions over the course of the simulation:

```
┌────────────────────────────────────────────────────────────────────────┐
│                     LAND TRUST RATIFICATION CRITERIA                   │
├──────────────────────────┬─────────────────────────────────────────────┤
│ Requirement              │ Strategic Fulfillment Path                  │
├──────────────────────────┼─────────────────────────────────────────────┤
│ 1. Legal Defense Fund    │ Reaching 100% on Node C; unlocks historical │
│    Covenant Research     │ tenant covenants from Mrs. Higgins.         │
├──────────────────────────┼─────────────────────────────────────────────┤
│ 2. Arthur's Conversion   │ Raising Arthur's Trust to ≥ 60. Arthur     │
│    (Brownstone Equity)   │ voluntarily deeds his 6-unit brownstone     │
│                          │ into the trust in exchange for life tenancy │
│                          │ and community governance membership.        │
├──────────────────────────┼─────────────────────────────────────────────┤
│ 3. Community Bond Drive  │ Pooling $1,500 from community donations,   │
│    ($1,500 Equity Pool)  │ kitchen surplus, and solidarity grants to   │
│                          │ retire private bank mortgages.              │
└──────────────────────────┴─────────────────────────────────────────────┘
```

### Arthur's Transformative Class Arc
Arthur's storyline provides the emotional and ideological heart of the endgame.
- In Act 1, Arthur is an anxious, socially isolated landlord who views his tenants as liabilities who might damage his boiler or fall behind on rent.
- In Act 2, as crises hit (winter freeze, water shutoffs), Arthur witnesses the tenants and Pip risking their own health to protect the pipes and feed elderly neighbors.
- In Act 3, Arthur is given the culminating choice:
  - **Option A (The Speculative Sellout)**: Sell the brownstone to Horizon Capital for $120,000 cash. (Arthur ends the game wealthy, but the building is cleared by police, the tenants are displaced, and the screen fades to cold gray).
  - **Option B (Deed to the Trust)**: Deed the building into the Community Land Trust. Arthur retains his private top-floor apartment for life, his maintenance costs drop to $0, and he is welcomed onto the governing board as a respected elder.

---

## 3. The Monthly Municipal Assembly & Participatory Budgeting

Every 30 in-game days, the Central Plaza hosts the **District Assembly**. Gameplay pauses as residents gather around the Town Hall steps.

```
┌────────────────────────────────────────────────────────────────────────┐
│                    PARTICIPATORY BUDGETING OVERLAY                     │
├────────────────────────────────────────────────────────────────────────┤
│ Total District Commons Surplus: $420 (from solar co-op & food credits) │
├────────────────────────────────────────────────────────────────────────┤
│ [POLICY BALLOT — CHOOSE 1 PRIORITY FOR THE MONTH]                      │
│                                                                        │
│ [ ] Measure 1: High-Capacity Battery Bank (Solar Expansion)            │
│     • Reduces winter blackout risk to 0%                               │
│     • Grants all households +5 Energy/day baseline                     │
│                                                                        │
│ [ ] Measure 2: Community Agro-Greenhouse (Food Autonomy)               │
│     • Doubles fresh vegetable yield at Community Kitchen               │
│     • Reduces food upkeep across all archetypes by an extra -$3/day    │
│                                                                        │
│ [ ] Measure 3: Emergency Rapid-Response Defense Escrow                 │
│     • Funds emergency bail and legal injunctions against raids         │
│     • Increases collective resilience cushion by +15 points            │
└────────────────────────────────────────────────────────────────────────┘
```

The outcome of the assembly visibly alters the district's physical environment: greenhouse glass panes appear in the South Garden, lithium battery banks hum behind the Utility Station, or a legal defense placard is bolted to the Town Hall facade.

---

## 4. The Asynchronous Cross-Player Solidarity Network

To create a global sense of collective human purpose, *District: Common Ground* incorporates an **asynchronous cross-player solidarity network** managed by the Go backend:

```
┌─────────────────────────────────────────────────────────────────────────┐
│              ASYNCHRONOUS CROSS-PLAYER SOLIDARITY NETWORK               │
│                                                                         │
│  [PLAYER A (London)]        [GO API AGGREGATOR]    [PLAYER B (Tokyo)]   │
│  Generates excess solar ──>   /api/v1/solidarity/  ──> Receives power   │
│  power in their district      global-pool              buffer during a  │
│                                                        winter cold snap │
│                                    │                                    │
│                                    ▼                                    │
│                      [THE GLOBAL RESILIENCE INDEX]                      │
│                      • 72.4% Global Solidarity Average                  │
│                      • Real-time map of resilient sister districts      │
│                      • Shared mutual-aid defense telegrams              │
└─────────────────────────────────────────────────────────────────────────┘
```

### 4.1 How Asynchronous Mutual Aid Works
1. **The Global Solidarity Pool**:
   - When any player achieves 100% on a Commons Node, 5% of their daily surplus resources (stored kilowatt-hours, food bushels, legal templates) are anonymously uploaded to the global Go API pool (`apps/api/internal/save/solidarity_pool.go`).
2. **Receiving Aid in Dire Need**:
   - If a player in another corner of the world experiences a catastrophic crisis (e.g. 3 consecutive scapegoat choices, resilience drops below 20%), a pop-up dispatch appears on their doorstep:
     > *"Sister District #4102 has transferred 30 kWh of solar reserve and $40 in emergency food aid to your community fridge. You are not alone."*
3. **The Global Planetary Compass**:
   - The Town Hall features a world map showing the collective resilience score of all active players globally. It visually illustrates that human solidarity is not an isolated local struggle, but a planetary network of ordinary people protecting one another.
