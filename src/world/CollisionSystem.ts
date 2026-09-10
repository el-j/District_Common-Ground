import Phaser from 'phaser';

export function setupTilemapCollision(
  scene: Phaser.Scene,
  sprite: Phaser.Physics.Arcade.Sprite,
  layer: Phaser.Tilemaps.TilemapLayer,
): void {
  scene.physics.add.collider(sprite, layer);
}

// Standalone pure AABB overlap — used for non-physics proximity checks (NPCs, build nodes)
export function aabbOverlap(
  ax: number,
  ay: number,
  aw: number,
  ah: number,
  bx: number,
  by: number,
  bw: number,
  bh: number,
): boolean {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}
