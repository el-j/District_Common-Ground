# 04 — District Expansion & World Systems Specification

**Authored by:** Level Designer 🏛️ & Technical Artist 🎨  
**Status:** Living Specification (v2.0)  
**Parent Document:** [`CLAUDE.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/CLAUDE.md)  

---

## 1. Vision: A Breathing, Reactive Urban Landscape

In the initial release (M1–M7), the district consisted of a compact central quadrant. In **District: Common Ground (v2.0)**, the world expands into a interconnected urban ecosystem comprising three distinct socioeconomic zones, each with unique architectural identities, environmental hazards, and community build nodes.

Crucially, the visual and atmospheric state of the world is **systemically coupled to player decisions and real-world conditions**. When collective resilience drops, the world visibly degrades; when solidarity triumphs, the neighborhood blooms with life, art, and vibrant social warmth.

---

## 2. Expanded World Zone Architecture

```
                                  [NORTH ZONE]
                         Utility Station & Transit Hub
                      (Commuter Rails • Freight Loading)
                                       │
                                       ▼
    [WEST FLANK]                [CENTRAL PLAZA]               [EAST CANAL]
    Residential Tenements    Town Hall & Bulletin Board    Community Land Trust
  & Courtyard (Player Flat)     Fountain & Community       Tool Library & Workshop
  Corner Grocer & Fridge        Kitchen & Dining Hall       Flood Defense Dikes
                                       │
                                       ▼
                                  [SOUTH ZONE]
                         Rooftop Solar Cooperative
                       Community Greenhouse & Garden
```

### 2.1 Zone Breakdown & Narrative Function

| Zone | Primary Archetype Anchor | Build Node / Landmark | Mechanical Function |
|---|---|---|---|
| **North Transit Hub** | Morgan (Commuter) & Pip (Courier) | **Commuter Rail Depot & Cargo Dock** | Transit strike negotiation point; courier delivery dispatch hub. |
| **Central Plaza** | All Archetypes | **Town Hall & Community Corkboard** | Crisis voting, historical decision archive, morning newspaper drop. |
| **East Canal & Docks** | Collective Commons | **Community Tool Library & Flood Defense** | Flood mitigation during extreme weather; tool sharing upgrades. |
| **West Tenements** | Arthur (Landlord) & Pip (Tenant) | **Tenement Blocks & Courtyard** | Rent negotiation, tenant coalition meetings, stray animal hangouts. |
| **South Solar Quarter**| All Archetypes | **Rooftop Solar Co-op & Greenhouse** | Clean energy generation, fresh vegetable harvests, chillout zone. |

---

## 3. Dynamic Environmental Systems

### 3.1 Accelerated Day/Night Cycle
The district experiences a continuous, immersive light cycle synced with in-game actions:

```
┌───────────────────┬───────────────────┬──────────────────────────────────┐
│ Time of Day       │ Ambient Color     │ Environmental State              │
├───────────────────┼───────────────────┼──────────────────────────────────┤
│ Dawn (06:00-09:00)│ Warm Golden Peach │ Morning paper delivered; quiet   │
│ Midday (09:00-17:00) Neutral Sunlight  │ High foot traffic; bustling grocer│
│ Dusk (17:00-20:00)│ Deep Amber/Violet │ Streetlamps flicker on; cafe chatter│
│ Night (20:00-06:00) Midnight Indigo   │ Solitary porch lights; neon signs│
└───────────────────┴───────────────────┴──────────────────────────────────┘
```

- **Technical Implementation**: Implemented via Phaser 3 pipeline tinting (`cameras.main.setTint()`) or canvas post-processing shader overlay.
- **Streetlamp Illumination**: Dynamic point-light masks illuminate cobblestone circles around lanterns, the Community Fridge, and illuminated shop windows at night.

### 3.2 Real-World Weather Shaders
The weather in the district can either sync with real-world weather feeds (via Open-Meteo API) or cycle seasonally:

- **Rain & Thunderstorms**: Diagonal particle rain drops with procedural splash rings on asphalt; screen reflections; ambient rain audio on tin rooftops.
- **Winter Cold Snap**: Frost vignetting around screen borders; falling snow flakes; chimney smoke plumes; visible breath puffs from NPCs.
- **Summer Heat Haze**: Subtle vertex-displacement heat shimmering over asphalt; bleached sunlight palette; increased energy drain.

---

## 4. The Visual Bloom vs. Crisis Decay Spectrum

The neighborhood's physical state directly reflects the `resilienceScore` ($0–100$) and recent crisis choices:

```
[DECAY STATE: 0–35%] ◄──────── [EQUILIBRIUM: 36–74%] ────────► [BLOOM STATE: 75–100%]
• Desaturated, washed palette    • Working-class grit           • Vibrant saturated colors
• Boarded shop windows           • Moderate street activity     • Colorful wall murals & graffiti
• Police cruiser beacon strobes  • Community fridge functional  • String lights strung across alleys
• Trash drifts across streets    • Balanced lighting            • Flowering planter boxes on sills
• NPCs stand isolated & guarded                                 • NPCs chatting, guitar playing
```

### Tilemap Dynamic Layer Swapping
- In Phaser 3, three dedicated decorative tilemap layers (`Decor_Decay`, `Decor_Neutral`, `Decor_Bloom`) swap visibility based on the store's `resilienceScore`.
- When a crisis is resolved with **Solidarity**, a radial bloom effect emanates from the crisis location across the tilemap.
- When resolved with **Scapegoating**, shadows lengthen and saturation drops by $18\%$.
