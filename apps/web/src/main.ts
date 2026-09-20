import './style.css';
import Phaser from 'phaser';
import { WorldScene } from './world/WorldScene';
import { InteriorScene } from './world/InteriorScene';
import { RegionScene } from './world/regions/RegionScene';
import { loadSave, getToken } from './core/state/persistence';
import { useGameStore } from './core/state/useGameStore';
import { CharacterSelect } from './ui/CharacterSelect';
import { TopHUD } from './ui/TopHUD';
import { AuthOverlay } from './ui/AuthOverlay';
import { setupAudioOnInteraction, playUIClick, playSolidarityChime } from './core/audio/SoundSynth';
import { MinigameLoader } from './core/kernel/MinigameLoader';
import { bootstrapInstalledPlugins } from './core/kernel/PluginRegistry';
import { Kernel } from './core/kernel/Kernel';
import { switchSkin, getActiveSkinId } from './skins/ThemeManager';
import { inputManager } from './world/InputManager';
import { BUILTIN_KERNEL_PLUGINS } from './core/kernel/builtinKernelPlugins';
import { getDisabledKernelPluginIds } from './core/kernel/KernelPluginPrefs';
import { fetchAndMergeMinigameCatalog } from './core/kernel/builtinMinigameCatalog';
import { initOfflineReadiness } from './core/pwa/ServiceWorkerRegistry';
import { initMeshRuntime, sendChatMessage, onChatMessage, getActivePeerCount, getTransportBadges } from './core/mesh/meshRuntime';

function getViewportSize(): { width: number; height: number } {
  return {
    width: Math.max(window.innerWidth, 320),
    height: Math.max(window.innerHeight, 480),
  };
}

async function boot(): Promise<void> {
  const uiRoot = document.getElementById('ui-root');
  if (!uiRoot) throw new Error('ui-root element not found');

  // M18 — request the persistent-storage lease so IndexedDB survives browser
  // eviction under memory pressure; asset precaching itself is already
  // handled by vite-plugin-pwa's auto-injected service worker registration.
  void initOfflineReadiness();

  // M19 — start the mesh network + bitchat.free transport listening for
  // same-device peers immediately, independent of whether the player ever
  // opens the walkie-talkie modal.
  initMeshRuntime();

  if (!getToken()) {
    await new Promise<void>((resolve) => { new AuthOverlay(uiRoot, resolve); });
  }

  await loadSave();
  await bootstrapInstalledPlugins().catch(() => undefined);

  // M29 — the 5 built-in minigames now load via MinigameLoader.loadRemoteMinigame()
  // instead of being statically imported into this bundle. One bad/missing
  // game logs and is skipped rather than blocking boot.
  const minigameCatalog = await fetchAndMergeMinigameCatalog();
  await Promise.all(
    minigameCatalog.map((manifest) =>
      MinigameLoader.loadRemoteMinigame(manifest).catch((err) => {
        console.error(`Failed to load minigame "${manifest.id}"`, err);
      }),
    ),
  );

  const kernel = new Kernel(uiRoot, {
    switchSkin,
    getActiveSkinId,
    playUIClick,
    playSolidarityChime,
    setInputLocked: (locked) => inputManager.setLocked(locked),
    sendChatMessage,
    onChatMessage,
    getActivePeerCount,
    getTransportBadges,
  });
  // Plugin Library's "Built-in Plugins" section can disable any non-core
  // entry (skins/world stay mandatory); that preference only takes effect
  // on the next load, since KernelPluginModule has no live unregister path.
  const disabledKernelPluginIds = await getDisabledKernelPluginIds();
  for (const entry of BUILTIN_KERNEL_PLUGINS) {
    if (entry.core || !disabledKernelPluginIds.has(entry.module.manifest.id)) {
      kernel.use(entry.module);
    }
  }

  const viewport = getViewportSize();

  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent: 'game-container',
    width: viewport.width,
    height: viewport.height,
    pixelArt: true,
    backgroundColor: '#1a1a2e',
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: import.meta.env.DEV,
      },
    },
    scale: {
      mode: Phaser.Scale.RESIZE,
      width: viewport.width,
      height: viewport.height,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    // M41 — EPIC-34 §1. InteriorScene is launched over WorldScene (which is
    // put to sleep, not stopped) via `this.scene.launch('InteriorScene', ...)`
    // — added to the scene manager here so that string key resolves.
    // M44 — EPIC-35 §2. RegionScene reuses the exact same mechanism for
    // travel to a non-Common-Ground region.
    scene: [WorldScene, InteriorScene, RegionScene],
  };

  const game = new Phaser.Game(config);

  window.addEventListener('resize', () => {
    const next = getViewportSize();
    game.scale.resize(next.width, next.height);
  });

  setupAudioOnInteraction();

  const hud = new TopHUD(uiRoot, kernel);
  WorldScene.setHud(hud);

  await kernel.boot();

  // M31 — CharacterSelect used to be instantiated only here, once, at boot.
  // SettingsModal's "New Game" flow correctly resets meta.phase to 'select'
  // and TopHUD correctly hides itself, but nothing ever re-mounted
  // CharacterSelect afterward, leaving a blank screen on restart. It now
  // mounts reactively off meta.phase (same store-subscribe pattern TopHUD
  // itself uses), so every 'select' transition — not just the first one —
  // gets a fresh CharacterSelect, and it tears itself down when a role is
  // actually chosen so a later reset can't stack duplicate DOM nodes.
  let characterSelect: CharacterSelect | null = null;
  const mountCharacterSelect = (): void => {
    if (characterSelect) return;
    characterSelect = new CharacterSelect(uiRoot, () => { characterSelect = null; });
  };

  if (useGameStore.getState().meta.phase === 'select') {
    mountCharacterSelect();
  }

  let previousPhase = useGameStore.getState().meta.phase;
  useGameStore.subscribe((s) => {
    const phase = s.meta.phase;
    if (phase === previousPhase) return;
    previousPhase = phase;
    if (phase === 'select') {
      mountCharacterSelect();
    } else if (characterSelect) {
      // Defensive: normally CharacterSelect already dismissed and nulled
      // itself via its onComplete callback before phase left 'select'.
      characterSelect = null;
    }
  });
}

void boot();
