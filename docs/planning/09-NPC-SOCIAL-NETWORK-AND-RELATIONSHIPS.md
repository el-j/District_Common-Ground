# 09 — NPC Social Network, Relational Graph & Community Favors

**Authored by:** Narrative Designer 📖, Design Persona Walkthrough 👤 & Game Designer 🎮  
**Status:** Living Core Specification (v2.0)  
**Parent Documents:** [`01-VISION-AND-CORE-LOOP.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/planning/01-VISION-AND-CORE-LOOP.md), [`08-DYNAMIC-AI-NARRATIVE-PIPELINE.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/planning/08-DYNAMIC-AI-NARRATIVE-PIPELINE.md)  

---

## 1. Vision: A Neighborhood of Humans, Not Vendors

In conventional city builders or RPGs, non-player characters are transactional vending machines: the merchant sells potions, the blacksmith upgrades swords, the quest-giver dishes out bounties.

In **District: Common Ground (v2.0)**, the neighborhood is modeled as a **living relational web**. Every resident has a distinct history, family obligations, anxieties, and mutual debts. They remember whether you stood with them during the winter freeze or looked away during the tenant eviction.

Crucially, **social trust is not a solitary number; it is an interconnected graph**. If you help Rosa with childcare so she can work her hospital shift, her brother Marcus at the Tool Library will gladly loan you a solar crimper for free. When you hurt one neighbor through a selfish scapegoating choice, the reverberation ripples across the entire block.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     THE NEIGHBORHOOD SOCIAL WEB                         │
│                                                                         │
│           [Mrs. Higgins] ◄─── checks in on ───► [Sal (Grocer)]          │
│            (Tenement Elder)                       │                     │
│                   │                         stocks goods                │
│             mentors youth                         │                     │
│                   ▼                               ▼                     │
│           [Pip (Courier)] ◄── deliveries ──► [Elena (Kitchen)]          │
│                   ▲                               ▲                     │
│              repairs bike                   cooks for crew              │
│                   │                               │                     │
│           [Marcus (Machinist)] ── siblings ──► [Rosa (Nurse)]           │
│            (Tool Library)                         ▲                     │
│                   ▲                               │                     │
│              builds grid                    shares medical care         │
│                   │                               │                     │
│           [Tariq (Electrician)] ───────────── [Arthur (Landlord)]       │
│            (Climate Migrant)                   (Building Owner)         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Character Dossiers: The Seven Pillars of Common Ground

### 1. Salvatore "Sal" Corvo — The Corner Grocer
- **Role & Location**: Owner of *Corvo's Corner Grocer & Sundries* (South Plaza).
- **Background**: 62 years old. Third-generation grocer whose family ran the store through strikes, recessions, and gentrification waves. His margins are razor-thin.
- **Voice Pillars**:
  - *Vocabulary*: Working-class colloquial, metric-aware, mercantile pragmatism (*"Pennies make nickels, kid"*).
  - *Vulnerability*: Terrified that a corporate supermarket chain will buy out his lease.
  - *Subtext*: Acts gruff and cynical to hide that he quietly leaves day-old bread in the Community Fridge every night.
- **Relational Mechanics**:
  - High Trust: Sal gives the player trade discounts, extends emergency store credit, and tips off the player about incoming grocery inflation before it hits the news.

### 2. Elena Vasquez — The Community Organizer
- **Role & Location**: Lead Coordinator at the *Community Kitchen & Dining Hall* (Central Plaza).
- **Background**: 38 years old. Former municipal worker who quit after witnessing city budget cuts to public housing. Tireless, clear-eyed, and strategically brilliant.
- **Voice Pillars**:
  - *Vocabulary*: Direct, organizing terminology, logistical clarity (*"Quorums", "shift rosters", "food safety temps"*).
  - *Vulnerability*: Chronic caregiver burnout; forgets to eat her own meals while feeding eighty neighbors.
  - *Subtext*: Despises self-righteous moralizing; values two hours of potato peeling far more than passionate speeches.
- **Relational Mechanics**:
  - High Trust: Elena introduces the player to citywide mutual aid funds, unlocks communal dining buffs (+15 Energy per day), and defends the player during Town Hall disputes.

### 3. Marcus Thorne — The Retired Union Machinist
- **Role & Location**: Master Craftsman at the *Community Tool Library & Workshop* (East Canal).
- **Background**: 67 years old. Retired automotive tooling specialist. Hands scarred from decades of industrial lathe work. Believes that "a tool kept in a private closet is a tool being murdered by rust."
- **Voice Pillars**:
  - *Vocabulary*: Technical, dry humor, industrial metaphors (*"Tolerances", "lubrication", "stress fatigue"*).
  - *Vulnerability*: Struggles with progressive arthritis; terrified of losing his manual dexterity.
  - *Subtext*: Sees fixing appliances as a quiet act of defiance against disposable consumer capitalism.
- **Relational Mechanics**:
  - High Trust: Marcus upgrades Pip's cargo bicycle (speed +25%, energy cost -20%) and teaches Morgan and Arthur basic home electrical repair.

### 4. Rosa Thorne — The Bilingual ER Nurse
- **Role & Location**: Rotating between the Tenements and the South Community Clinic; Marcus's younger sister.
- **Background**: 44 years old. Works 12-hour night shifts at the county general hospital. Manages informal street triage, asthma puffers for kids, and heatstroke response.
- **Voice Pillars**:
  - *Vocabulary*: Clinical urgency mixed with deep familial warmth; code-switches naturally.
  - *Vulnerability*: Exhaustion and systemic moral injury from seeing preventable poverty diseases.
  - *Subtext*: Can spot dehydration or malnutrition in an NPC from ten paces.
- **Relational Mechanics**:
  - High Trust: Rosa provides emergency medical supplies during crises, halving stress penalties and curing heatstroke/exhaustion debuffs.

### 5. Tariq Al-Mansoor — The Solar Technician & Climate Migrant
- **Role & Location**: Lead Engineer at the *Rooftop Solar Cooperative* (North Utility Station / South Roofs).
- **Background**: 31 years old. Arrived four years ago following catastrophic flooding and drought in his home region. Trained in electrical engineering; holds certifications unrecognized by local bureaucracy.
- **Voice Pillars**:
  - *Vocabulary*: Thoughtful, multilingual cadence, physics-focused, poetic appreciation for sunlight.
  - *Vulnerability*: Precarious legal status; anxiety over family members still trapped in climate disaster zones.
  - *Subtext*: Sees solar panels not just as kilowatt generators, but as decentralized political freedom.
- **Relational Mechanics**:
  - High Trust: Tariq teaches the player off-grid battery wiring, doubling solar yield during utility blackouts and insulating the block from energy monopoly rate spikes.

### 6. Mrs. Beatrice Higgins — The Tenement Historian
- **Role & Location**: Stoop of 14 Elm Street (West Tenements); neighborhood elder.
- **Background**: 79 years old. Has lived in the same rent-controlled apartment since 1968. Possesses an eidetic memory of every tenant strike, police raid, and building transfer in district history.
- **Voice Pillars**:
  - *Vocabulary*: Elegant, historical, rhythmic, razor-sharp ironies.
  - *Vulnerability*: Loneliness as older friends pass away or are priced out.
  - *Subtext*: Understands that landlord tactics never change; only the names of the private equity firms rotate.
- **Relational Mechanics**:
  - High Trust: Mrs. Higgins shares historical legal deeds and tenant covenants, providing legal evidence that halts Horizon Capital evictions in their tracks.

### 7. Officer Brian Vance — The Conflicted Community Liaison
- **Role & Location**: Patrols between Central Plaza and North Rail; municipal beat officer.
- **Background**: 35 years old. Grew up in an adjacent working-class borough. Caught between top-down municipal crackdowns (code citations, eviction enforcement, anti-vagrancy sweeps) and his personal respect for the neighbors.
- **Voice Pillars**:
  - *Vocabulary*: Bureaucratic police jargon under tension (*"Standard protocol", "directives from downtown"*).
  - *Vulnerability*: Moral compromise; knows city hall is using police to do the dirty work of speculative gentrification.
  - *Subtext*: Gives subtle warnings before raids when the player's community trust is sufficiently high.
- **Relational Mechanics**:
  - High Trust: Vance looks the other way when the Community Fridge is cited for sidewalk violations, delays eviction deadlines, and de-escalates vigilante provocations.

---

## 3. The Neighborhood Favor & Reciprocity System

Rather than generic quest checklists, interactions with NPCs take the form of **Informal Mutual Aid Favors**:

```
┌────────────────────────────────────────────────────────────────────────┐
│                      INFORMAL FAVOR MECHANIC                           │
├────────────────────────────────────────────────────────────────────────┤
│ 1. The Observation: NPC expresses a concrete daily dilemma.            │
│    • Rosa needs someone to escort her elderly patient to the grocer.   │
│    • Sal's refrigeration compressor is rattling.                       │
│    • Tariq needs a specialized multimeter from Marcus's workshop.       │
├────────────────────────────────────────────────────────────────────────┤
│ 2. The Decision: Spend personal Energy / Cash to assist.               │
│    • Player expends 10 Energy or runs an errand across the map.        │
├────────────────────────────────────────────────────────────────────────┤
│ 3. The Ripple Effect:                                                  │
│    • Target NPC Trust +20                                              │
│    • Connected NPC Trust +10 (family/friend network)                   │
│    • Unlocks reciprocal assistance when player faces scarcity.         │
└────────────────────────────────────────────────────────────────────────┘
```

### Reciprocal Buffs (When You Fall On Hard Times)
- **The Soup Bowl Buff (Elena)**: If the player's energy drops below 15, Elena stops the player at the plaza, presses a warm thermos into their hands, and restores 25 Energy for free.
- **The Loaner Bike (Marcus)**: If Pip's cargo bike breaks down, Marcus provides a spare cruiser without charging repair fees.
- **Stoop Vigilance (Mrs. Higgins)**: If bailiffs or private eviction guards enter the street, Mrs. Higgins sounds an emergency brass whistle, rallying the entire block within 30 seconds.
