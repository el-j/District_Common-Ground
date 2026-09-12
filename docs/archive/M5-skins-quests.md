# M5 Tasks — Multi-Skin Architecture & IRL Quests

**Sprint:** 5
**Status:** [ ] Not Started
**Stories:** EPIC-05
**Depends on:** M4 complete

---

## SkinInterface.ts

- [ ] Create `src/skins/SkinInterface.ts`
- [ ] Define `SkinManifest` TypeScript interface:
  ```typescript
  interface SkinManifest {
    skinId: string;
    version: string;
    palette: { background: string; surface: string; accent: string; text: string };
    assetMap: Record<EntityToken, { atlasUrl?: string; textureUrl?: string; frameRate?: number; tileSize?: [number, number]; footprint?: [number, number] }>;
    audioProfile: { sfxType: string; bgmType: string };
  }
  ```
- [ ] Validate that every `EntityToken` is covered in any given skin manifest
- [ ] Export `EntityToken` union type (canonical list — no skin-specific references in game logic)

---

## Skin Manifests

- [ ] Create `public/assets/skins/solarpunk/skin.manifest.json` — Solarpunk skin manifest
  - 16-bit nature palette
  - All EntityTokens mapped to solarpunk asset paths
  - Audio profile: `{ sfxType: "nature_chimes", bgmType: "warm_ambient" }`
- [ ] Create `public/assets/skins/retro_gb/skin.manifest.json` — Game Boy skin manifest
  - Palette: `{ background: "#0f380f", surface: "#306230", accent: "#8bac0f", text: "#9bbc0f" }`
  - All EntityTokens mapped to monochrome sprite paths
  - Audio profile: `{ sfxType: "chiptune_pulse_noise", bgmType: "square_wave_arpeggio" }`
- [ ] Create `public/assets/skins/cozy_vector/skin.manifest.json` — Cozy Vector skin manifest *(stretch goal)*

---

## ThemeManager.ts

- [ ] Create `src/skins/ThemeManager.ts`
- [ ] Load skin manifest JSON at runtime by `skinId`
- [ ] Swap Phaser texture atlases for all active EntityTokens
- [ ] Apply palette CSS variables to the document root (drives HUD color scheme)
- [ ] Switch SoundSynth audio profile (sfxType, bgmType)
- [ ] Skin switch must complete without resetting Zustand store
- [ ] Skin switch must complete within the target time threshold
- [ ] Expose `activeSkin` in Zustand `meta` state

---

## Skin Pack Assets — Solarpunk

- [ ] Design / source 16-bit tile sprites for all world zones (North, Central, South)
- [ ] Hero avatar spritesheet: 4-direction walk cycle, solarpunk palette
- [ ] NPC spritesheets: Elder Cook, Tenant Organizer, solarpunk palette
- [ ] Building textures: Kitchen, Solar Array, Tool Workshop — rundown + upgraded variants
- [ ] Pack all assets into WebP sprite atlases
- [ ] Write atlas JSON descriptor files compatible with Phaser texture packer format

---

## Skin Pack Assets — Retro Game Boy

- [ ] Design / source 4-shade monochrome tile sprites for all world zones
- [ ] Hero avatar spritesheet: 4-direction walk cycle, Game Boy palette
- [ ] NPC spritesheets: monochrome variants
- [ ] Building textures: monochrome rundown + upgraded variants
- [ ] Pack all assets into WebP sprite atlases
- [ ] Extend SoundSynth.ts with square wave / pulse / noise synthesis modes for chiptune profile

---

## Settings Menu — Skin Switcher

- [ ] Create settings menu accessible from HUD (gear icon or pause)
- [ ] Display available skins as selectable cards with preview thumbnails
- [ ] Selecting a skin calls `ThemeManager.switchSkin(skinId)`
- [ ] Active skin highlighted; persisted in Zustand `meta.activeSkin` + IndexedDB

---

## IRL Dual-Impact Quest System

- [ ] Create `src/core/simulation/IrlQuestSystem.ts`
- [ ] Define 3 daily quests:
  - `digital-deescalation`: Reward — Energy buff to 110%, "Refreshed Clarity" status
  - `community-reconnect`: Reward — Social Trust +, Stress -
  - `local-mutual-aid`: Reward — +Raw Materials to satchel
- [ ] Each quest has a self-report completion button (no external verification)
- [ ] Quest lock state stored in Zustand / IndexedDB: `{ questId, completedOnDay: number | null }`
- [ ] On `advanceDay()`: unlock all quests where `completedOnDay < currentDay`
- [ ] Completing a quest applies `actions` to Zustand store immediately

---

## Acceptance Tests (M5)

- [ ] **Test 5.1:** Switching skins swaps texture atlases and UI color schemes within the time threshold without resetting player coordinates or story progress
  - Note coordinates and day → open settings → switch skin → confirm visual change → confirm coordinates and day unchanged
- [ ] **Test 5.2:** Completing an IRL quest applies the configured stat buffs and locks the quest until the next simulated morning
  - Complete "digital-deescalation" quest → confirm Energy buff applied → confirm quest button disabled → advance day → confirm quest re-enabled
