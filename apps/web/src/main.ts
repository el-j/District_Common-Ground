import './style.css';
import Phaser from 'phaser';
import { WorldScene } from './world/WorldScene';
import { loadSave, getToken } from './core/state/persistence';
import { useGameStore } from './core/state/useGameStore';
import { CharacterSelect } from './ui/CharacterSelect';
import { TopHUD } from './ui/TopHUD';
import { AuthOverlay } from './ui/AuthOverlay';
import { setupAudioOnInteraction } from './core/audio/SoundSynth';

export const VIRTUAL_WIDTH = 320;
export const VIRTUAL_HEIGHT = 240;

function getViewportSize(): { width: number; height: number } {
  return {
    width: Math.max(window.innerWidth, 320),
    height: Math.max(window.innerHeight, 480),
  };
}

async function boot(): Promise<void> {
  const uiRoot = document.getElementById('ui-root');
  if (!uiRoot) throw new Error('ui-root element not found');

  if (!getToken()) {
    await new Promise<void>((resolve) => { new AuthOverlay(uiRoot, resolve); });
  }

  await loadSave();

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

  const hud = new TopHUD(uiRoot);
  WorldScene.setHud(hud);

  if (useGameStore.getState().meta.phase === 'select') {
    new CharacterSelect(uiRoot, () => { /* WorldScene already running beneath */ });
  }
}

void boot();
