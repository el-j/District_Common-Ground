import Phaser from 'phaser';
import { useGameStore } from '../../core/state/useGameStore';

const WAYPOINTS = [
  { x: 80, y: 220 },   // near grocer
  { x: 160, y: 140 },  // central plaza
  { x: 200, y: 280 },  // south courtyard
];

export class ScrapsEntity {
  private sprite: Phaser.GameObjects.Rectangle;
  private promptText: Phaser.GameObjects.Text;
  private waypointIdx = 0;
  private speed = 30; // px/s
  private readonly interactRange = 48;

  constructor(private readonly scene: Phaser.Scene, x: number, y: number) {
    this.sprite = scene.add.rectangle(x, y, 12, 10, 0xe8a844).setDepth(5);

    this.promptText = scene.add.text(x, y - 16, '[E] Feed Scraps 🐱', {
      fontSize: '10px',
      color: '#ffeecc',
      backgroundColor: '#2a1a0a',
      padding: { x: 4, y: 2 },
    }).setOrigin(0.5, 1).setDepth(6).setVisible(false);
  }

  /** Display and movement only. Feeding is the once-a-day `feedScraps()`
   *  action, triggered by WorldScene's single [E] handler — this entity
   *  used to run its own second, unlimited feed/pet on the same keypress. */
  update(playerX: number, playerY: number, delta: number): void {
    const dist = Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, playerX, playerY);
    const inRange = dist < this.interactRange;

    this.promptText.setVisible(inRange);
    this.promptText.setPosition(this.sprite.x, this.sprite.y - 16);
    this.promptText.setText(scrapsPrompt());

    this.patrol(delta);
  }

  private patrol(delta: number): void {
    const target = WAYPOINTS[this.waypointIdx];
    const dx = target.x - this.sprite.x;
    const dy = target.y - this.sprite.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 4) {
      this.waypointIdx = (this.waypointIdx + 1) % WAYPOINTS.length;
      return;
    }

    const move = this.speed * (delta / 1000);
    this.sprite.x += (dx / dist) * move;
    this.sprite.y += (dy / dist) * move;
  }

  spawnHearts(): void {
    const symbols = ['♥', '♡', '♥'];
    symbols.forEach((h, i) => {
      const txt = this.scene.add.text(
        this.sprite.x + (i - 1) * 10,
        this.sprite.y - 10,
        h,
        { fontSize: '14px', color: '#ff88aa' },
      ).setOrigin(0.5, 1).setDepth(20);

      this.scene.tweens.add({
        targets: txt,
        y: txt.y - 30,
        alpha: 0,
        duration: 800,
        delay: i * 150,
        ease: 'Power2',
        onComplete: () => txt.destroy(),
      });
    });
  }
}

export function scrapsPrompt(): string {
  const { player, economy, meta } = useGameStore.getState();
  if (economy.lastScrapsDay === meta.day) return 'Scraps is napping 😺 (fed today)';
  if (player.cash < 1) return "Scraps 🐱 (a treat costs $1)";
  return '[E] Feed Scraps 🐱 ($1)';
}
