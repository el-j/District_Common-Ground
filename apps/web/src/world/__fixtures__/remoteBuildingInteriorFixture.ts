import type { BuildingInteriorModule, BuildingInteriorHostAPI } from '../BuildingInteriorInterface';

/**
 * Test fixture for BuildingInteriorLoader.loadRemote() — a same-origin
 * module shaped exactly like a real building-interior plugin bundle would
 * be, without pulling in an actual `packages/building-*` package (none
 * exist yet — see BuildingInteriorLoader.ts's own doc comment).
 */
export const createScene: BuildingInteriorModule['createScene'] = (_host: BuildingInteriorHostAPI) => {
  return {} as ReturnType<BuildingInteriorModule['createScene']>;
};
