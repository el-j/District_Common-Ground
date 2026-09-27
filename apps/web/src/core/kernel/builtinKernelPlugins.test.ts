import { describe, it, expect } from 'vitest';
import { BUILTIN_KERNEL_PLUGINS } from './builtinKernelPlugins';

describe('BUILTIN_KERNEL_PLUGINS', () => {
  it('contains the expected core and non-core plugins', () => {
    expect(BUILTIN_KERNEL_PLUGINS.length).toBeGreaterThan(0);

    const skins = BUILTIN_KERNEL_PLUGINS.find(p => p.module.manifest.id === 'skins');
    expect(skins).toBeDefined();
    expect(skins?.core).toBe(true);

    const world = BUILTIN_KERNEL_PLUGINS.find(p => p.module.manifest.id === 'world');
    expect(world).toBeDefined();
    expect(world?.core).toBe(true);

    const optionalPlugins = BUILTIN_KERNEL_PLUGINS.filter(p => !p.core);
    expect(optionalPlugins.length).toBeGreaterThanOrEqual(3);
  });
});
