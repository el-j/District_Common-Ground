# 12 — Art Direction, Multi-Skin Architecture & Shader Pipeline

**Authored by:** Technical Artist 🎨, Design Brand Guardian 🛡️ & Design Inclusive Visuals Specialist 👁️  
**Status:** Living Core Specification (v2.0)  
**Parent Documents:** [`01-VISION-AND-CORE-LOOP.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/planning/01-VISION-AND-CORE-LOOP.md), [`04-DISTRICT-EXPANSION-AND-WORLD.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/planning/04-DISTRICT-EXPANSION-AND-WORLD.md)  

---

## 1. Executive Summary & Aesthetic Thesis

*District: Common Ground* is visually defined by a philosophy of **Warm Working-Class Dignity**. It deliberately avoids both sterile corporate minimalism and grimdark post-apocalyptic misery.

Instead, the world feels lived-in, textured, and full of human care: brick tenements painted with vibrant community murals, hand-built solar canopies on tar roofs, bicycles leaning against iron stoop railings, and warm amber light spilling from shopfront windows into rainy dusk streets.

### The Critical Architectural Rule: Headless Simulation
The simulation layer (Zustand store, economic math, crisis logic) **never references sprite filenames, hex color codes, or raster dimensions**. Entities exist in code purely as abstract **`EntityToken`** strings (`'HERO_AVATAR'`, `'BUILDING_COMMUNITY_KITCHEN'`, `'CAT_SCRAPS'`). 

At render time, the active **Skin Module** resolves these tokens into textures, tile indices, and shader parameters via `skin.manifest.json`. This makes runtime skin switching instantaneous without resetting game state.

```
┌────────────────────────────────────────────────────────────────────────┐
│                   HEADLESS MULTI-SKIN ARCHITECTURE                     │
│                                                                        │
│  [SIMULATION STATE] (Zustand: entities, day, resilience, crisis)       │
│                      │                                                 │
│                      ▼                                                 │
│  [ABSTRACT ENTITY TOKENS]                                              │
│  'HERO_AVATAR' • 'COMMUNITY_KITCHEN' • 'CAT_SCRAPS' • 'NEWSPAPER'      │
│                      │                                                 │
│         ┌────────────┼───────────────────────────┐                     │
│         ▼            ▼                           ▼                     │
│  [SOLARPUNK 2036]  [RETRO GAME BOY 1989]  [1930s WOODCUT BROADSHEET]   │
│  Lush greenery,    4-shade DMG palette,   Rough ink linocut,           │
│  terracotta, brass,16x16 pixel sprites,   sepia newsprint,             │
│  glass vector art  chiptune synthesis     hatching shadows             │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. The Three Canonical Skin Profiles

```
┌────────────────────────────────────────────────────────────────────────┐
│                        SKIN MANIFEST COMPARISON                        │
├────────────────────┬────────────────────┬──────────────────────────────┤
│ Skin               │ Visual Palette     │ Typography & Texture         │
├────────────────────┼────────────────────┼──────────────────────────────┤
│ 1. Solarpunk 2036  │ Sage green (#5B8266) Modern grotesque sans-serif  │
│    (Default)       │ Terracotta (#D36135) (Inter / Outfit); crisp SVG  │
│                    │ Warm gold (#F1D302)  halftones and brass trim     │
├────────────────────┼────────────────────┼──────────────────────────────┤
│ 2. Retro Game Boy  │ Darkest: #0f380f   Pixel monospaced (Press Start  │
│    (1989 Pocket)   │ Dark:    #306230   2P); pixel-art dithered       │
│                    │ Light:   #8bac0f   shadows; CRT green phosphor    │
│                    │ Lightest:#9bbc0f                                  │
├────────────────────┼────────────────────┼──────────────────────────────┤
│ 3. 1930s Woodcut   │ Newsprint (#F4ECD8) Authentic serif (Playfair /   │
│    (Broadsheet)    │ India ink (#1C1A17) Libre Baskerville); rough     │
│                    │ Rust red (#9E2A2B) linocut wood-grain hatching    │
└────────────────────┴────────────────────┴──────────────────────────────┘
```

### 2.1 Skin Manifest Token Mapping (`skin.manifest.json`)
```json
{
  "skinId": "solarpunk",
  "name": "Solarpunk 2036",
  "version": "2.0.0",
  "author": "District Design Collective",
  "tokens": {
    "HERO_AVATAR": { "texture": "hero_spritesheet", "frameWidth": 32, "frameHeight": 32 },
    "BUILDING_COMMUNITY_KITCHEN": { "texture": "kitchen_base", "bloomTexture": "kitchen_flourish" },
    "BUILDING_SOLAR_COOP": { "texture": "solar_inverter_rack" },
    "BUILDING_TOOL_LIBRARY": { "texture": "tool_workshop_facade" },
    "CAT_SCRAPS": { "texture": "calico_cat_idle", "frameWidth": 16, "frameHeight": 16 },
    "NEWSPAPER_PORCH": { "texture": "rolled_broadsheet" }
  },
  "shaderConfig": {
    "bloomIntensity": 1.25,
    "desaturateFloor": 0.20,
    "scanlines": false
  },
  "audioProfile": "solarpunk_lofi"
}
```

---

## 3. The Shader & Visual Consequence Pipeline

The physical visual tone of the viewport dynamically reflects the neighborhood's resilience balance:

```
┌────────────────────────────────────────────────────────────────────────┐
│                     SHADER POST-PROCESSING MODES                       │
├──────────────────────┬─────────────────────────────────────────────────┤
│ Mode                 │ Technical Shader Pipeline                       │
├──────────────────────┼─────────────────────────────────────────────────┤
│ 1. Crisis Decay      │ Fragment shader reduces saturation:             │
│    (Resilience <35%) │ `color.rgb = mix(color.rgb, vec3(gray), 0.75);` │
│                      │ Vignette shadow darkens screen corners;         │
│                      │ subtle red strobe alarm pulse on emergency.     │
├──────────────────────┼─────────────────────────────────────────────────┤
│ 2. Solidarity Bloom  │ Two-pass Gaussian blur combined with additive   │
│    (Resilience >75%) │ color threshold: warm golden glow on windows,   │
│                      │ planter boxes, and solar inverters.             │
├──────────────────────┼─────────────────────────────────────────────────┤
│ 3. Atmospheric Rain  │ Screen-space diagonal particle streaks with     │
│    Shader            │ dynamic ripple rings spawned on ground plane.   │
├──────────────────────┼─────────────────────────────────────────────────┤
│ 4. Summer Heat Haze  │ Sinusoidal vertex distortion simulating wave-   │
│    Shader            │ like optical refraction over hot cobblestones.  │
└──────────────────────┴─────────────────────────────────────────────────┘
```

---

## 4. Inclusive Visual Design Standards

*Lead Rule from Design Inclusive Visuals Specialist*: "A diverse city must never look like generic stock clip art. It must reflect the authentic textures of working-class multiracial communities."

1. **Authentic Human Diversity**:
   - Natural skin tones across the full Fitzpatrick scale (no yellowish cartoon shortcuts).
   - Religious attire integrated with working-class practicality: Tariq's electrician toolbelt over his tunic; Amina wearing a linen hijab while adjusting solar crimpers; elderly Mr. Klein wearing a knit yarmulke at the stoop chess table.
2. **Physical Accessibility in Architecture**:
   - The Community Kitchen and Town Hall prominently feature concrete wheelchair access ramps alongside traditional stairs.
   - Paved sidewalks include tactile yellow paving studs near curbs.
3. **High-Contrast & Colorblind Accessibility**:
   - All interactive UI buttons maintain a minimum **4.8:1 contrast ratio** against backgrounds (WCAG AA compliant).
   - Critical informational states never rely on color alone: warning states use both amber tints AND distinct hazard stripe iconography; solidarity gains use both green hues AND upward arrow badges.
