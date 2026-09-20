import { describe, it, expect } from 'vitest';
import { ALL_INTERIOR_IDS, propsForInterior, findInteriorByDoorTile, INTERIORS } from './InteriorProps';
import { DOOR_TILES } from './MapData';
import { HOUSING_OPTIONS } from '../core/simulation/HousingOptions';

describe('InteriorProps', () => {
  it('gives every named interior at least 3 props (Test 21.3)', () => {
    for (const id of ALL_INTERIOR_IDS) {
      expect(propsForInterior(id).length).toBeGreaterThanOrEqual(3);
    }
  });

  it('places every prop inside its own interior rect', () => {
    for (const id of ALL_INTERIOR_IDS) {
      const { rect, props } = INTERIORS[id];
      for (const prop of props) {
        expect(prop.x).toBeGreaterThanOrEqual(rect.x1);
        expect(prop.x).toBeLessThanOrEqual(rect.x2);
        expect(prop.y).toBeGreaterThanOrEqual(rect.y1);
        expect(prop.y).toBeLessThanOrEqual(rect.y2);
      }
    }
  });

  // M41 — EPIC-34 §1/§2. Real isolation is door-triggered, not rect-entry.
  // M45 — scoped to Common Ground interiors only: a non-Common-Ground
  // interior's doorTile lives in its own region's coordinate space
  // (RegionScene.ts's grid), never MapData.ts's DOOR_TILES.
  it('resolves each Common Ground interior\'s doorTile to a real MapData.ts DOOR_TILES coordinate', () => {
    for (const id of ALL_INTERIOR_IDS) {
      const def = INTERIORS[id];
      if (def.homeRegion !== 'REGION_COMMON_GROUND') continue;
      expect(DOOR_TILES.some(d => d.x === def.doorTile.x && d.y === def.doorTile.y)).toBe(true);
    }
  });

  it('findInteriorByDoorTile resolves a doorTile coordinate to that interior, scoped to its own region', () => {
    const kitchen = INTERIORS.communityKitchen;
    expect(findInteriorByDoorTile('REGION_COMMON_GROUND', kitchen.doorTile.x, kitchen.doorTile.y)?.id).toBe('communityKitchen');
  });

  it('returns null for a coordinate that is not a known interior\'s door in that region', () => {
    expect(findInteriorByDoorTile('REGION_COMMON_GROUND', 0, 0)).toBeNull();
  });

  it('does not cross-match a door that exists in a different region', () => {
    const depot = INTERIORS.scrapyardDepot;
    expect(findInteriorByDoorTile('REGION_COMMON_GROUND', depot.doorTile.x, depot.doorTile.y)).toBeNull();
    expect(findInteriorByDoorTile('REGION_INDUSTRIAL_OUTSKIRTS', depot.doorTile.x, depot.doorTile.y)?.id).toBe('scrapyardDepot');
  });


  // M42 — EPIC-34 §1/§2/§3. South Canal Workshop & Retail Row.
  it('gives both workshops a real, distinct crafting station', () => {
    const metal = INTERIORS.metalworkWorkshop.craftingStation;
    const wood = INTERIORS.woodworkingWorkshop.craftingStation;
    expect(metal).toEqual({ id: 'metalwork-workshop', discipline: 'metalwork', requiredTier: 'advanced' });
    expect(wood).toEqual({ id: 'woodworking-workshop', discipline: 'woodwork', requiredTier: 'advanced' });
    expect(INTERIORS.baumarkt.craftingStation).toBeUndefined();
  });

  it('gives Baumarkt and Supermarket distinct, complementary retail categories', () => {
    expect(INTERIORS.baumarkt.retailCategory).toBe('salvage');
    expect(INTERIORS.supermarket.retailCategory).toBe('raw');
    expect(INTERIORS.library.retailCategory).toBeUndefined();
  });

  it('places every cookbook pickup and NPC inside its own interior rect', () => {
    for (const id of ALL_INTERIOR_IDS) {
      const { rect, cookbookPickups, npc } = INTERIORS[id];
      (cookbookPickups ?? []).forEach(p => {
        expect(p.x).toBeGreaterThanOrEqual(rect.x1);
        expect(p.x).toBeLessThanOrEqual(rect.x2);
        expect(p.y).toBeGreaterThanOrEqual(rect.y1);
        expect(p.y).toBeLessThanOrEqual(rect.y2);
      });
      if (npc) {
        expect(npc.x).toBeGreaterThanOrEqual(rect.x1);
        expect(npc.x).toBeLessThanOrEqual(rect.x2);
        expect(npc.y).toBeGreaterThanOrEqual(rect.y1);
        expect(npc.y).toBeLessThanOrEqual(rect.y2);
      }
    }
  });

  it('gives the Library exactly 3 cookbook pickups, each a real recipe, and never RECIPE_UPCYCLED_BIKE (taught by Priya instead)', () => {
    const pickups = INTERIORS.library.cookbookPickups ?? [];
    expect(pickups.length).toBe(3);
    const ids = new Set(pickups.map(p => p.id));
    expect(ids.size).toBe(pickups.length);
    expect(pickups.some(p => p.recipe === 'RECIPE_CIRCUIT_BOARD')).toBe(true);
  });

  it('no two placements (props/cookbooks/npc) share a tile within the same interior', () => {
    for (const id of ALL_INTERIOR_IDS) {
      const def = INTERIORS[id];
      const points: string[] = [
        ...def.props.map(p => `${p.x},${p.y}`),
        ...(def.cookbookPickups ?? []).map(p => `${p.x},${p.y}`),
        ...(def.npc ? [`${def.npc.x},${def.npc.y}`] : []),
      ];
      expect(new Set(points).size).toBe(points.length);
    }
  });

  // M43 — EPIC-34 §1/§2, absorbing EPIC-32's M36/M37 scope.
  it('Apartment Block B has a real interior — the original audit gap this milestone closes', () => {
    expect(INTERIORS.apartmentBlockB).toBeDefined();
    expect(INTERIORS.apartmentBlockB.props.length).toBeGreaterThanOrEqual(3);
  });

  it('every housingOptionIds entry references a real HOUSING_OPTIONS id, and vice versa', () => {
    const allOptionIds = new Set(HOUSING_OPTIONS.map(o => o.id));
    for (const id of ALL_INTERIOR_IDS) {
      (INTERIORS[id].housingOptionIds ?? []).forEach(oid => expect(allOptionIds.has(oid)).toBe(true));
    }
    HOUSING_OPTIONS.forEach(o => {
      expect((INTERIORS[o.buildingInteriorId as keyof typeof INTERIORS]?.housingOptionIds ?? []).includes(o.id)).toBe(true);
    });
  });

  it('places every furnitureSlot inside its own interior rect, distinct from every other placement', () => {
    for (const id of ALL_INTERIOR_IDS) {
      const def = INTERIORS[id];
      if (!def.furnitureSlots) continue;
      const occupied = new Set([
        ...def.props.map(p => `${p.x},${p.y}`),
        ...(def.cookbookPickups ?? []).map(p => `${p.x},${p.y}`),
        ...(def.npc ? [`${def.npc.x},${def.npc.y}`] : []),
      ]);
      def.furnitureSlots.forEach(slot => {
        expect(slot.x).toBeGreaterThanOrEqual(def.rect.x1);
        expect(slot.x).toBeLessThanOrEqual(def.rect.x2);
        expect(slot.y).toBeGreaterThanOrEqual(def.rect.y1);
        expect(slot.y).toBeLessThanOrEqual(def.rect.y2);
        expect(occupied.has(`${slot.x},${slot.y}`)).toBe(false);
      });
      const slotPoints = def.furnitureSlots.map(s => `${s.x},${s.y}`);
      expect(new Set(slotPoints).size).toBe(slotPoints.length);
    }
  });

  it('the 2 apartment interiors and only they carry housing/furniture fields', () => {
    const withHousing = ALL_INTERIOR_IDS.filter(id => INTERIORS[id].housingOptionIds);
    expect(withHousing.sort()).toEqual(['apartmentBlockB', 'pipsCourierRoom'].sort());
  });

  // M45 — EPIC-35 §3.
  it('every interior declares exactly one homeRegion, and exactly one interior belongs to Industrial Outskirts', () => {
    const byRegion = new Map<string, number>();
    ALL_INTERIOR_IDS.forEach(id => {
      const region = INTERIORS[id].homeRegion;
      expect(region).toBeTruthy();
      byRegion.set(region, (byRegion.get(region) ?? 0) + 1);
    });
    expect(byRegion.get('REGION_INDUSTRIAL_OUTSKIRTS')).toBe(1);
    expect(byRegion.get('REGION_COMMON_GROUND')).toBe(ALL_INTERIOR_IDS.length - 1);
  });

  it('the Scrapyard Depot is a real interior distinct from Common Ground\'s coordinate space', () => {
    const depot = INTERIORS.scrapyardDepot;
    expect(depot.homeRegion).toBe('REGION_INDUSTRIAL_OUTSKIRTS');
    expect(depot.props.length).toBeGreaterThanOrEqual(3);
    depot.props.forEach(p => {
      expect(p.x).toBeGreaterThanOrEqual(depot.rect.x1);
      expect(p.x).toBeLessThanOrEqual(depot.rect.x2);
      expect(p.y).toBeGreaterThanOrEqual(depot.rect.y1);
      expect(p.y).toBeLessThanOrEqual(depot.rect.y2);
    });
  });

  // M49 — EPIC-36 §2.
  it('the 2 apartment interiors each declare 2 familyNpcSlots, inside the rect and not colliding with anything else', () => {
    for (const id of ['pipsCourierRoom', 'apartmentBlockB'] as const) {
      const def = INTERIORS[id];
      expect(def.familyNpcSlots?.length).toBe(2);
      const occupied = new Set([
        ...def.props.map(p => `${p.x},${p.y}`),
        ...(def.furnitureSlots ?? []).map(p => `${p.x},${p.y}`),
      ]);
      def.familyNpcSlots!.forEach(slot => {
        expect(slot.x).toBeGreaterThanOrEqual(def.rect.x1);
        expect(slot.x).toBeLessThanOrEqual(def.rect.x2);
        expect(slot.y).toBeGreaterThanOrEqual(def.rect.y1);
        expect(slot.y).toBeLessThanOrEqual(def.rect.y2);
        expect(occupied.has(`${slot.x},${slot.y}`)).toBe(false);
      });
    }
  });

  it('every FamilyTemplates.ts homeInteriorId references a real interior that actually declares familyNpcSlots', async () => {
    const { FAMILY_TEMPLATES } = await import('../core/simulation/FamilyTemplates');
    FAMILY_TEMPLATES.forEach(t => {
      const interior = INTERIORS[t.homeInteriorId as keyof typeof INTERIORS];
      expect(interior).toBeDefined();
      expect(interior.familyNpcSlots?.length).toBeGreaterThanOrEqual(t.members.length);
    });
  });
});
