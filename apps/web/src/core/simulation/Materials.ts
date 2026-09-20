// M38 — Materials, Scavenging & Inventory Foundation (EPIC-33 §1)
// See docs/planning/21-OPEN-WORLD-CRAFTING-BUILDINGS-AND-IDENTITY-VISION.md
// (Pillar 1) and docs/tasks/M38-materials-scavenging-and-inventory.md.
//
// The base material taxonomy is genuinely raw/natural (wood, stone, iron,
// coal, resin, wool, cotton, leather, mushroom), complemented by a second
// urban-salvage layer (scrap metal, reclaimed wood, glass, rubber,
// electronic components, wire) — both first-class, per the vision doc's
// explicit "both coexist deliberately" decision. No hardcoded colors/icons
// live here — a MaterialToken is resolved only at the Phaser render
// boundary, per CLAUDE.md's Critical Architecture Rule.

export type MaterialToken =
  // raw / natural
  | 'MATERIAL_WOOD'
  | 'MATERIAL_STONE'
  | 'MATERIAL_IRON'
  | 'MATERIAL_COAL'
  | 'MATERIAL_RESIN'
  | 'MATERIAL_WOOL'
  | 'MATERIAL_COTTON'
  | 'MATERIAL_LEATHER'
  | 'MATERIAL_MUSHROOM'
  // urban salvage
  | 'MATERIAL_SCRAP_METAL'
  | 'MATERIAL_RECLAIMED_WOOD'
  | 'MATERIAL_GLASS'
  | 'MATERIAL_RUBBER'
  | 'MATERIAL_ELECTRONIC_COMPONENT'
  | 'MATERIAL_WIRE';

export type MaterialCategory = 'raw' | 'salvage';

export const MATERIAL_CATEGORY: Record<MaterialToken, MaterialCategory> = {
  MATERIAL_WOOD: 'raw',
  MATERIAL_STONE: 'raw',
  MATERIAL_IRON: 'raw',
  MATERIAL_COAL: 'raw',
  MATERIAL_RESIN: 'raw',
  MATERIAL_WOOL: 'raw',
  MATERIAL_COTTON: 'raw',
  MATERIAL_LEATHER: 'raw',
  MATERIAL_MUSHROOM: 'raw',
  MATERIAL_SCRAP_METAL: 'salvage',
  MATERIAL_RECLAIMED_WOOD: 'salvage',
  MATERIAL_GLASS: 'salvage',
  MATERIAL_RUBBER: 'salvage',
  MATERIAL_ELECTRONIC_COMPONENT: 'salvage',
  MATERIAL_WIRE: 'salvage',
};

export const MATERIAL_TOKENS: readonly MaterialToken[] =
  Object.keys(MATERIAL_CATEGORY) as MaterialToken[];

// M38 §3 — a data stub only. The real Baumarkt/Supermarket buy UI is
// EPIC-34's M42; this exists now so M42 has real numbers to wire a UI to
// rather than inventing its own pricing table later.
export const MATERIAL_PRICES: Record<MaterialToken, number> = {
  MATERIAL_WOOD: 3,
  MATERIAL_STONE: 4,
  MATERIAL_IRON: 6,
  MATERIAL_COAL: 5,
  MATERIAL_RESIN: 4,
  MATERIAL_WOOL: 3,
  MATERIAL_COTTON: 3,
  MATERIAL_LEATHER: 5,
  MATERIAL_MUSHROOM: 2,
  MATERIAL_SCRAP_METAL: 2,
  MATERIAL_RECLAIMED_WOOD: 2,
  MATERIAL_GLASS: 3,
  MATERIAL_RUBBER: 3,
  MATERIAL_ELECTRONIC_COMPONENT: 8,
  MATERIAL_WIRE: 2,
};
