# 11 — Procedural Web Audio Soundscapes & Generative Synth Engine

**Authored by:** Game Audio Engineer 🎵 & Design Whimsy Injector ✨  
**Status:** Living Core Specification (v2.0)  
**Parent Documents:** [`01-VISION-AND-CORE-LOOP.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/planning/01-VISION-AND-CORE-LOOP.md), [`05-WHIMSY-AND-TACTILE-UX.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/planning/05-WHIMSY-AND-TACTILE-UX.md)  

---

## 1. Executive Summary & Sound Design Thesis

In conventional web and mobile games, audio is treated as an afterthought: megabytes of heavy, static MP3 files that repeat on loop, burn mobile battery, take seconds to buffer, and sound sterile.

In **District: Common Ground (v2.0)**, audio is **100% procedural, synthesized natively in real time via the browser's Web Audio API (`AudioContext`)**:
- **Zero Asset Downloads**: The entire soundscape weighs **0 bytes** of audio files. The game loads instantaneously, even on congested mobile 3G networks.
- **Dynamic & Reactive**: Audio responds at the millisecond sample level to the district's economic state, weather, time of day, and player actions.
- **Infinite Variation**: Because rain, footsteps, bicycle bells, and radio songs are synthesized mathematically from oscillators and noise buffers, no two sound events ever sound identically the same.

```
┌────────────────────────────────────────────────────────────────────────┐
│                   PROCEDURAL AUDIO PIPELINE ARCHITECTURE               │
│                                                                        │
│  [GAME SIMULATION STATE] (Zustand: day, weather, resilience, action)   │
│                      │                                                 │
│                      ▼                                                 │
│  [SOUNDSYNTH V2 CORE ENGINE: apps/web/src/core/audio/SoundSynth.ts]   │
│  • Master Dynamic Compressor (prevents clipping on mobile speakers)    │
│  • Master Volume & Spatial Panner Node                                 │
│                      │                                                 │
│         ┌────────────┼───────────────────────────┐                     │
│         ▼            ▼                           ▼                     │
│  [ENVIRONMENT]    [TACTILE FOLEY]         [GENERATIVE MUSIC]           │
│  • Rain & drops   • Bike bell ring        • Adaptive Harmonic Drone    │
│  • Wind & storms  • Cat purr vibration    • Pirate Radio Lo-Fi Beats   │
│  • Street murmur  • Paper rustle unfold   • Solidarity Victory Arpeggio│
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. The Adaptive Harmonic Engine (The "Sound of Resilience")

The district's ambient musical atmosphere is continuously calculated by evaluating the `resilienceScore` ($0–100$) and the time of day:

```
┌────────────────────────────────────────────────────────────────────────┐
│                    RESILIENCE HARMONIC SPECTRUM                        │
├─────────────────────┬───────────────────┬──────────────────────────────┤
│ Resilience Tier     │ Harmonic Mode     │ Sonic Character              │
├─────────────────────┼───────────────────┼──────────────────────────────┤
│ 1. Decay State      │ D Minor / Locrian │ Dissonant sawtooth pair;     │
│    (Score 0–35%)    │ Diminished 5ths   │ harsh industrial hum;        │
│                     │                   │ distant sirens; muffled beat │
├─────────────────────┼───────────────────┼──────────────────────────────┤
│ 2. Equilibrium      │ A Minor Pentatonic│ Warm triangle-sine Rhodes    │
│    (Score 36–74%)   │ Dorian intervals  │ chord pads; soft ticking;    │
│                     │                   │ gentle acoustic guitar pluck │
├─────────────────────┼───────────────────┼──────────────────────────────┤
│ 3. Bloom State      │ C Major 7th /     │ Rich polyphonic arpeggios;   │
│    (Score 75–100%)  │ Lydian mode       │ kalimba chime melodies;      │
│                     │                   │ warm bass; birdsong chirps   │
└─────────────────────┴───────────────────┴──────────────────────────────┘
```

### Mathematical Chord Progression Generator
```typescript
// Generates chord frequencies dynamically based on resilience tier
export function getResilienceChordFrequencies(resilience: number): number[] {
  if (resilience < 35) {
    // Dissonant minor second / tritone drone: D2 (73.4Hz), Ab2 (103.8Hz), Eb3 (155.6Hz)
    return [73.42, 103.83, 155.56];
  } else if (resilience < 75) {
    // Neutral contemplative Dorian chord: A2 (110Hz), C3 (130.8Hz), E3 (164.8Hz), G3 (196Hz)
    return [110.00, 130.81, 164.81, 196.00];
  } else {
    // Bright flourishing Major 9th chord: F2 (87.3Hz), A2 (110Hz), C3 (130.8Hz), E3 (164.8Hz), G3 (196Hz)
    return [87.31, 110.00, 130.81, 164.81, 196.00];
  }
}
```

---

## 3. Procedural Foley Sound Specifications

### 3.1 Rain on Tin Roof (`playRain()`)
- **Synthesis Architecture**:
  1. Pink noise generator passed through a 2nd-order bandpass filter centered at $1,200\text{ Hz}$ with $Q = 1.8$ to create the constant ambient downpour roar.
  2. A scheduled Poisson process generates micro-bursts of randomized high-Q resonant bandpass spikes ($3,000–5,500\text{ Hz}$) lasting $15\text{ ms}$, simulating distinct heavy water droplets striking corrugated metal awnings.
- **Audio Output**: Indistinguishable from real studio-recorded rain, costing zero bytes of bandwidth.

### 3.2 "Scraps" Cat Purr (`playCatPurr()`)
- **Synthesis Architecture**:
  - Dual triangle wave oscillators set to $27.5\text{ Hz}$ and $31.0\text{ Hz}$ creating a natural low-frequency acoustic beating effect.
  - Modulated by a $4.2\text{ Hz}$ sine LFO routed to an `AudioGainNode` to simulate the diaphragmatic inhalation/exhalation cycle of a purring cat.
  - Duration: $3.5\text{ s}$ with smooth $0.4\text{ s}$ attack and $0.8\text{ s}$ release envelopes.

### 3.3 Cargo Bicycle Bell (`playBikeBell()`)
- **Synthesis Architecture**:
  - Dual pure sine oscillators tuned to harmonic strike frequencies: $f_1 = 2048\text{ Hz}$, $f_2 = 2056\text{ Hz}$ (yielding an authentic $8\text{ Hz}$ mechanical ring beat).
  - High initial attack ($1\text{ ms}$) into an exponential decay gain curve ($\tau = 0.45\text{ s}$), followed by a subtle high-frequency harmonic strike transient ($6,144\text{ Hz}$) decaying within $40\text{ ms}$.

### 3.4 Tactile Paper Rustle (`playPaperRustle()`)
- **Synthesis Architecture**:
  - White noise burst filtered through a dynamic sweep bandpass ($400\text{ Hz} \to 2,400\text{ Hz}$) with random amplitude fluttering, simulating the physical unfold of a broadsheet newspaper.

### 3.5 Analog Pirate Radio Tuning Static (`playRadioStatic(tuningFraction)`)
- **Synthesis Architecture**:
  - Filtered white noise with dynamic notch filters. As the player spins the analog radio knob, the static frequency notches sweep across the spectrum until centering cleanly on a broadcast station frequency.

---

## 4. "Radio Free Commons": Generative Lo-Fi Music Synthesizer

When the player tunes their radio to `89.7 FM` (*Radio Free Commons*), the engine generates an endless, non-repeating procedural chill-hop track:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   GENERATIVE 4/4 LO-FI CHILL-HOP BEAT                  │
├───────────────┬────────────────────────────────────────────────────────┤
│ Instrument    │ Synthesis Method                                       │
├───────────────┼────────────────────────────────────────────────────────┤
│ Kick Drum     │ Sine oscillator sweeping rapidly from 120Hz to 38Hz in │
│               │ 80ms, paired with exponential gain decay.              │
├───────────────┼────────────────────────────────────────────────────────┤
│ Noise Snare   │ High-pass filtered white noise burst (1,800Hz) with    │
│               │ 120ms decay, layered over a 180Hz triangle transient.  │
├───────────────┼────────────────────────────────────────────────────────┤
│ Hi-Hat        │ High-pass white noise (8,000Hz) with ultra-fast 30ms   │
│               │ decay, played with humanized micro-swing timing.       │
├───────────────┼────────────────────────────────────────────────────────┤
│ Rhodes Chords │ Detuned triangle-sine oscillators through a 2-pole low-│
│               │ pass filter (800Hz) with subtle 0.2Hz vibrato tremolo. │
├───────────────┼────────────────────────────────────────────────────────┤
│ Vinyl Crackle │ Randomized low-amplitude impulses simulating vintage   │
│               │ dust on an analog 33 RPM turntable record.             │
└───────────────┴────────────────────────────────────────────────────────┘
```

The result is a warm, deeply comforting lo-fi soundscape that players can leave playing in the background while studying the morning newspaper or managing their district.
