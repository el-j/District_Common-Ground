import { describe, it, expect, afterEach } from 'vitest';
import { BuildingInteriorLoader } from './BuildingInteriorLoader';

// M41 — EPIC-34 §2. Mirrors SkinRendererLoader.test.ts/MinigameLoader.test.ts's
// loadRemote coverage style exactly.
describe('BuildingInteriorLoader', () => {
  afterEach(() => {
    BuildingInteriorLoader.unregister('fixture-interior');
  });

  it('loads a real same-origin fixture module and registers it', async () => {
    expect(BuildingInteriorLoader.hasInterior('fixture-interior')).toBe(false);
    await BuildingInteriorLoader.loadRemote({ id: 'fixture-interior', label: 'Fixture Interior', entrypointUrl: './__fixtures__/remoteBuildingInteriorFixture.ts' });
    expect(BuildingInteriorLoader.hasInterior('fixture-interior')).toBe(true);

    const mod = await BuildingInteriorLoader.getModule('fixture-interior');
    expect(typeof mod.createScene).toBe('function');
  });

  it('is a no-op if the interior id is already registered', async () => {
    await BuildingInteriorLoader.loadRemote({ id: 'fixture-interior', label: 'Fixture Interior', entrypointUrl: './__fixtures__/remoteBuildingInteriorFixture.ts' });
    await expect(
      BuildingInteriorLoader.loadRemote({ id: 'fixture-interior', label: 'Fixture Interior', entrypointUrl: './__fixtures__/does-not-exist.ts' }),
    ).resolves.toBeUndefined();
  });

  it('throws for a manifest with no entrypointUrl', async () => {
    await expect(
      BuildingInteriorLoader.loadRemote({ id: 'fixture-interior', label: 'Fixture Interior' }),
    ).rejects.toThrow('no entrypointUrl');
  });

  it('rejects a malformed remote module without crashing the loader', async () => {
    await expect(
      BuildingInteriorLoader.loadRemote({ id: 'fixture-interior', label: 'Fixture Interior', entrypointUrl: './__fixtures__/malformedBuildingInteriorFixture.ts' }),
    ).rejects.toThrow('does not export a createScene');
  });

  it('getModule() throws for an id that was never registered', async () => {
    await expect(BuildingInteriorLoader.getModule('never-registered')).rejects.toThrow('is not registered');
  });

  // M53 — EPIC-38 §3. Closes the manifest-retention gap found auditing this
  // loader against MinigameLoader's getManifest()/listMinigames().
  it('retains and exposes the manifest after loadRemote()', async () => {
    expect(BuildingInteriorLoader.getManifest('fixture-interior')).toBeUndefined();
    await BuildingInteriorLoader.loadRemote({ id: 'fixture-interior', label: 'Fixture Interior', entrypointUrl: './__fixtures__/remoteBuildingInteriorFixture.ts' });
    expect(BuildingInteriorLoader.getManifest('fixture-interior')).toEqual({
      id: 'fixture-interior', label: 'Fixture Interior', entrypointUrl: './__fixtures__/remoteBuildingInteriorFixture.ts',
    });
    expect(BuildingInteriorLoader.listInteriors()).toContainEqual({
      id: 'fixture-interior', label: 'Fixture Interior', entrypointUrl: './__fixtures__/remoteBuildingInteriorFixture.ts',
    });
  });

  it('unregister() clears the manifest along with the loader', async () => {
    await BuildingInteriorLoader.loadRemote({ id: 'fixture-interior', label: 'Fixture Interior', entrypointUrl: './__fixtures__/remoteBuildingInteriorFixture.ts' });
    BuildingInteriorLoader.unregister('fixture-interior');
    expect(BuildingInteriorLoader.getManifest('fixture-interior')).toBeUndefined();
  });
});
