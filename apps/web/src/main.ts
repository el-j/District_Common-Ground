import './style.css';
import Phaser from 'phaser';
import { WorldScene } from './world/WorldScene';
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
import { skinsPlugin } from './skins/plugin';
import { worldPlugin } from './world/plugin';
import { fetchAndMergeMinigameCatalog } from './core/kernel/builtinMinigameCatalog';
import { geoWeatherPlugin } from '@district-cg/plugin-geo-weather';
import { meshCommsPlugin } from '@district-cg/plugin-mesh-comms';
import { mutualCreditPlugin } from '@district-cg/plugin-mutual-credit';
import { bitchatPlugin } from '@district-cg/plugin-bitchat';
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
  kernel
    .use(skinsPlugin)
    .use(worldPlugin)
    .use(geoWeatherPlugin)
    .use(meshCommsPlugin)
    .use(mutualCreditPlugin)
    .use(bitchatPlugin);

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
    scene: [WorldScene],
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

  if (useGameStore.getState().meta.phase === 'select') {
    new CharacterSelect(uiRoot, () => { /* WorldScene already running beneath */ });
  }
}

void boot();
