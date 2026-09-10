import './style.css';
import Phaser from 'phaser';
import { WorldScene } from './world/WorldScene';
import { loadSave } from './core/state/persistence';
import { useGameStore } from './core/state/useGameStore';
import { CharacterSelect } from './ui/CharacterSelect';
import { TopHUD } from './ui/TopHUD';
import { setupAudioOnInteraction } from './core/audio/SoundSynth';

export const VIRTUAL_WIDTH = 320;
export const VIRTUAL_HEIGHT = 240;

function getIntegerZoom(): number {
  return Math.max(
    1,
    Math.floor(Math.min(window.innerWidth / VIRTUAL_WIDTH, window.innerHeight / VIRTUAL_HEIGHT)),
  );
}

async function boot(): Promise<void> {
  await loadSave();

  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent: 'game-container',
    width: VIRTUAL_WIDTH,
    height: VIRTUAL_HEIGHT,
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
      mode: Phaser.Scale.NONE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      zoom: getIntegerZoom(),
    },
    scene: [WorldScene],
  };

  const game = new Phaser.Game(config);

  window.addEventListener('resize', () => {
    const zoom = getIntegerZoom();
    game.scale.setZoom(zoom);
    game.scale.updateBounds();
  });

  setupAudioOnInteraction();

  const uiRoot = document.getElementById('ui-root');
  if (!uiRoot) throw new Error('ui-root element not found');

  new TopHUD(uiRoot);

  if (useGameStore.getState().meta.phase === 'select') {
    new CharacterSelect(uiRoot, () => { /* WorldScene already running beneath */ });
  }
}

void boot();
