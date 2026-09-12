# 05 — Whimsy, Tactile UX & Soundscapes Specification

**Authored by:** Design Whimsy Injector ✨ & Design UI Designer 🎨  
**Status:** Living Specification (v2.0)  
**Parent Document:** [`CLAUDE.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/CLAUDE.md)  

---

## 1. Vision: The Soul in the Machine

A simulation about economic stress and community survival risks feeling clinical or depressing if it lacks **joy, tangible tactility, and micro-delight**.

Urban communities are defined by small, beautiful idiosyncrasies: the stray cat that everyone feeds, the handwritten note pinned to the bakery door, the sound of rain on a corrugated tin awning, the crackle of a pirated radio broadcast playing nostalgic music.

In **District: Common Ground (v2.0)**, whimsy is not frivolous decoration—it is the emotional glue that makes the player fall in love with the neighborhood they are fighting to protect.

---

## 2. The Neighborhood Micro-Interactions

```
┌────────────────────────────────────────────────────────────────────────┐
│                     WHIMSICAL MICRO-INTERACTIONS                       │
├─────────────────────────┬──────────────────────────────────────────────┤
│ Interaction             │ Delight & Mechanical Consequence             │
├─────────────────────────┼──────────────────────────────────────────────┤
│ 🐱 Scraps the Stray Cat │ Wanders the district; finds sunny patches;   │
│                         │ petting triggers purr haptics + Stress -5%.  │
├─────────────────────────┼──────────────────────────────────────────────┤
│ 📌 Community Corkboard  │ Draggable polaroids, lost dog flyers,        │
│                         │ stampable solidarity badges and stickers.    │
├─────────────────────────┼──────────────────────────────────────────────┤
│ 🗞️ Morning Broadsheet   │ Unfolds with paper rustle audio; authentic   │
│                         │ woodcut art, weather icons & crossword beat. │
├─────────────────────────┼──────────────────────────────────────────────┤
│ 📻 Pirate Radio Tuner   │ Tactile rotating tuning dial; tuning static; │
│                         │ procedural lo-fi beats + amber ticker.       │
├─────────────────────────┼──────────────────────────────────────────────┤
│ 🔔 Cargo Bike Bell      │ Tap bell while walking/riding as Pip: ding!  │
│                         │ Pedestrians wave, pigeons scatter in fright. │
└─────────────────────────┴──────────────────────────────────────────────┘
```

### 2.1 "Scraps" the Neighborhood Cat
- **Location**: Moves procedurally across the district based on time of day:
  - *Morning (08:00)*: Napping on the warm metal hood of the Corner Grocer's delivery van.
  - *Midday (13:00)*: Sitting near the Community Fridge waiting for scraps.
  - *Dusk (18:00)*: Walking along the brick wall behind the solar panels.
- **Interaction**:
  - Approaching Scraps displays the action prompt `[E / Tap] Pet Scraps`.
  - A warm purr sound plays via Web Audio synthesis, small floating hearts float up, and player stress drops by $5\%$.
  - If the player has bread or leftover soup from the Community Kitchen, they can feed Scraps (`Purr Buff: Stress -10% for the day`).

### 2.2 The Interactive Community Corkboard (Town Hall & Plaza)
- Instead of a sterile list of quests, the Town Hall features a photorealistic wooden corkboard overlay.
- Items are pinned with colorful push-pins:
  - Polaroid photos of community events with scribbled dates.
  - Handwritten index cards offering mutual aid (*"Can fix toasters — see Mario at 14 Elm"*).
  - Urgent crisis bulletins stamped with red ink (*"RATE HIKE PROTEST TONIGHT"*).
- **Interactive Toy**: Players can drag pins, rearrange cards, and stamp their own custom solidarity rubber stamp onto the board.

---

## 3. Tactile UI Design: Newsprint & Analog Hardware

### 3.1 "The Daily District Ground" (Broadsheet Modal)
- **Aesthetic**: Authentic 1930s-meets-solarpunk newsprint styling.
- **Tactile Transitions**:
  - Page unfolds from a folded roll with a subtle 3D CSS rotate and gentle paper-rustle sound effect.
  - Realistic paper texture with subtle newsprint halftone dot patterns and woodcut banner engravings.
- **Sections**:
  1. **Main Headline**: Real-world civic crisis translated into local impact.
  2. **The Barometer**: Daily economic weather (Food index, Transit risk, Grid load).
  3. **The Street Interview**: Quote from an NPC neighbor offering advice or humor.
  4. **The Daily Mini-Game / Puzzle**: A tiny 4x4 community crossword or civic riddle rewarding 5 bonus energy.

### 3.2 "Radio Free Commons" (Pirate FM Tuner)
- Located on the player's HUD or bedside table.
- Features a vintage brushed-metal faceplate with an analog slide needle and tuning knob.
- **Frequencies**:
  - `89.7 FM`: *Radio Free Commons* — Lo-fi procedural ambient hip-hop and chill chiptune chords.
  - `94.2 FM`: *Municipal Civil Defense* — Monotone weather alerts and official utility warnings.
  - `103.5 FM`: *The Pirate Dispatch* — Jazz chords and breaking street-level crisis dispatches.
- Includes an amber incandescent LED frequency display and realistic dial-spin clicking audio.

---

## 4. Procedural Web Audio Soundscapes (SoundSynth v2)

The game maintains its **zero-MP3, zero-bandwidth procedural audio architecture**, synthesized natively via the browser's `AudioContext`:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   PROCEDURAL AUDIO PIPELINE (v2.0)                     │
├─────────────────────────┬──────────────────────────────────────────────┤
│ Sound Effect            │ Synthesis Method                             │
├─────────────────────────┼──────────────────────────────────────────────┤
│ 🌧️ Rain on Tin Roof    │ Bandpass-filtered white noise with random    │
│                         │ high-resonance droplet spikes.               │
├─────────────────────────┼──────────────────────────────────────────────┤
│ 🐱 Cat Purring          │ Dual low-frequency triangle oscillators (28Hz│
│                         │ & 32Hz) modulated by a 4Hz LFO tremolo.      │
├─────────────────────────┼──────────────────────────────────────────────┤
│ 🔔 Cargo Bicycle Bell   │ Dual sine oscillators (2048Hz + 2056Hz) with │
│                         │ rapid ring decay (1.2s exponential curve).   │
├─────────────────────────┼──────────────────────────────────────────────┤
│ 🗞️ Paper Rustle         │ Modulated pink noise burst with randomized   │
│                         │ envelope filter sweeps.                      │
├─────────────────────────┼──────────────────────────────────────────────┤
│ 📻 Radio Tuning Static  │ Filtered white noise with random frequency   │
│                         │ notches as the needle crosses bands.         │
├─────────────────────────┼──────────────────────────────────────────────┤
│ ☕ Community Cafe Murmur│ Pink noise modulated with slow formant       │
│                         │ filters simulating distant speech cadence.   │
└─────────────────────────┴──────────────────────────────────────────────┘
```

- **Dynamic District Mix**: As resilience rises, musical harmony shifts from minor/dissonant drones to warm major 7th chord arpeggios played on procedural Rhodes and kalimba synth patches.
