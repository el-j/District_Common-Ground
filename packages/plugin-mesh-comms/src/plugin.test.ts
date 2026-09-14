import { describe, it, expect, vi } from 'vitest';
import type { KernelContext, KernelHudButtonDescriptor } from '@district-cg/shared-types';
import { manifest, register, meshCommsPlugin } from './plugin';

function makeFakeContext(): KernelContext & { registered: KernelHudButtonDescriptor[] } {
  const registered: KernelHudButtonDescriptor[] = [];
  const ctx = {
    uiRoot: {} as HTMLElement,
    hud: { registerButton: (b: KernelHudButtonDescriptor) => registered.push(b) },
    theme: { switchSkin: vi.fn(), getActiveSkinId: vi.fn(() => 'default') },
    audio: { playUIClick: vi.fn(), playSolidarityChime: vi.fn() },
    input: { setLocked: vi.fn() },
    registered,
  };
  return ctx;
}

describe('mesh-comms kernel plugin', () => {
  it('exposes a manifest matching the standard kernel plugin shape', () => {
    expect(manifest.id).toBe('mesh-comms');
    expect(meshCommsPlugin.manifest).toBe(manifest);
  });

  it('registers exactly one HUD button describing the off-grid mesh terminal', () => {
    const ctx = makeFakeContext();
    register(ctx);
    expect(ctx.registered).toHaveLength(1);
    expect(ctx.registered[0]).toMatchObject({ id: 'mesh', icon: '📻', className: 'mesh-open-btn' });
  });
});
