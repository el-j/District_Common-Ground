import { describe, it, expect, vi } from 'vitest';
import type { KernelContext, KernelHudButtonDescriptor } from '@district-cg/shared-types';
import { manifest, register, mutualCreditPlugin } from './plugin';

function makeFakeContext(): KernelContext & { registered: KernelHudButtonDescriptor[] } {
  const registered: KernelHudButtonDescriptor[] = [];
  const ctx = {
    uiRoot: {} as HTMLElement,
    hud: { registerButton: (b: KernelHudButtonDescriptor) => registered.push(b) },
    theme: { switchSkin: vi.fn(), getActiveSkinId: vi.fn(() => 'default') },
    audio: { playUIClick: vi.fn(), playSolidarityChime: vi.fn() },
    input: { setLocked: vi.fn() },
    mesh: { sendChatMessage: vi.fn(), onChatMessage: vi.fn(() => () => {}), getActivePeerCount: vi.fn(() => 0), getTransportBadges: vi.fn(() => []) },
    registered,
  };
  return ctx;
}

describe('mutual-credit kernel plugin', () => {
  it('exposes a manifest matching the standard kernel plugin shape', () => {
    expect(manifest.id).toBe('mutual-credit');
    expect(mutualCreditPlugin.manifest).toBe(manifest);
  });

  it('registers exactly one HUD button describing the credit trade terminal', () => {
    const ctx = makeFakeContext();
    register(ctx);
    expect(ctx.registered).toHaveLength(1);
    expect(ctx.registered[0]).toMatchObject({ id: 'credit', icon: '🪙', className: 'credit-open-btn' });
  });
});
