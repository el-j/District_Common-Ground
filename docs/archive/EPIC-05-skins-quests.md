# EPIC 05 — Multi-Skin Architecture & IRL Quests

**Milestone:** M5 — Sprint 5
**Status:** [ ] Not Started

## Context

The game is designed to be reskinned without touching gameplay logic. This sprint delivers two distinct skin packs and a runtime switcher, plus the IRL Dual-Impact Quest system that extends the game's value into the player's real daily life.

## User Stories

### S5.1 — Runtime Skin Switching
As a player,
I want to switch the game's visual style from the settings menu and have it take effect immediately,
so that I can choose the aesthetic that resonates with me without interrupting my playthrough.

**Acceptance criteria:**
- ThemeManager.ts swaps texture atlases and UI color schemes without page reload
- Player coordinates, day counter, and story progress are fully preserved during skin switch
- Switch completes within the specified time threshold

### S5.2 — Solarpunk Skin Pack
As a player who prefers organic, hopeful aesthetics,
I want a Solarpunk skin that transforms the neighborhood into a lush 16-bit nature palette,
so that the visual world matches the solidarity-forward tone of that playstyle.

**Visual style:** 16-bit nature palette, organic tile details, warm colors
**Audio profile:** Nature-inspired chimes, ambient textures

**Acceptance criteria:**
- All EntityTokens resolved to Solarpunk asset variants
- Skin manifest valid and fully populated per `skin.manifest.json` contract
- No references to Solarpunk filenames in simulation code

### S5.3 — Retro Game Boy Skin Pack
As a player who prefers retro minimalism,
I want an 8-bit Game Boy skin with a 4-shade monochrome palette and chiptune audio,
so that I can experience the game's narrative through a different sensory register.

**Visual style:** 4-shade monochrome palette (classic Game Boy green: #0f380f, #306230, #8bac0f, #9bbc0f)
**Audio profile:** Square wave arpeggio BGM, pulse/noise SFX

**Skin manifest excerpt:**
```json
{
  "skinId": "gb_classic_1989",
  "palette": {
    "background": "#0f380f",
    "surface": "#306230",
    "accent": "#8bac0f",
    "text": "#9bbc0f"
  },
  "audioProfile": {
    "sfxType": "chiptune_pulse_noise",
    "bgmType": "square_wave_arpeggio"
  }
}
```

**Acceptance criteria:**
- All 4 palette colors applied consistently to tiles, UI, and sprites
- Chiptune audio procedurally generated via SoundSynth.ts (no audio files)
- Skin manifest valid and complete

### S5.4 — IRL Dual-Impact Quests
As a player who wants the game to have real-world impact,
I want daily quests that link small real-world actions to in-game rewards,
so that playing the game nudges me toward genuine community behaviors.

**Quest system:**
| Quest | Real Action | Game Reward |
|---|---|---|
| Digital De-escalation | Disconnect from social media 20 min + drink water | Energy capped at 110% ("Refreshed Clarity") |
| Community Reconnect | Send a supportive message to someone you haven't spoken to recently | Social Trust +, Stress - |
| Local Mutual Aid | Find a local pantry, library exchange, or community board | +Raw Materials added to satchel |

**Acceptance criteria:**
- Each quest resets at simulated morning (new day)
- Completing a quest applies the correct stat buffs to the Zustand store
- Completed quests are locked until next day reset
- Quests are self-reported (no external verification)
