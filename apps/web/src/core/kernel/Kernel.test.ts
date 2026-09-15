import { describe, it, expect, vi } from 'vitest';
import { Kernel, type KernelHostBindings } from './Kernel';
import type { KernelContext, KernelHudButtonDescriptor, KernelPluginModule } from '@district-cg/shared-types';

function makeModule(id: string, onRegister: (ctx: KernelContext) => void): KernelPluginModule {
  return {
    manifest: { id, version: '1.0.0', title: id, description: id },
    register: onRegister,
  };
}

function makeBindings(): KernelHostBindings {
  return {
    switchSkin: vi.fn().mockResolvedValue(undefined),
    getActiveSkinId: vi.fn(() => 'default'),
    playUIClick: vi.fn(),
    playSolidarityChime: vi.fn(),
    setInputLocked: vi.fn(),
    sendChatMessage: vi.fn().mockResolvedValue(undefined),
    onChatMessage: vi.fn(() => () => {}),
    getActivePeerCount: vi.fn(() => 0),
    getTransportBadges: vi.fn(() => []),
  };
}

describe('Kernel', () => {
  it('registers modules in the order they were use()d', async () => {
    const order: string[] = [];
    const kernel = new Kernel({} as HTMLElement, makeBindings());
    kernel
      .use(makeModule('a', () => order.push('a')))
      .use(makeModule('b', () => order.push('b')));

    await kernel.boot();

    expect(order).toEqual(['a', 'b']);
    expect(kernel.list().map((m) => m.id)).toEqual(['a', 'b']);
  });

  it('forwards ctx.hud.registerButton() calls to the sink attached before boot()', async () => {
    const kernel = new Kernel({} as HTMLElement, makeBindings());
    const registered: KernelHudButtonDescriptor[] = [];
    kernel.attachHudSink({ registerButton: (b) => registered.push(b) });

    kernel.use(makeModule('feature', (ctx) => {
      ctx.hud.registerButton({ id: 'feature-btn', icon: '🧩', label: 'Open feature', onClick: () => {} });
    }));

    await kernel.boot();

    expect(registered).toHaveLength(1);
    expect(registered[0].id).toBe('feature-btn');
  });

  it('drops a registerButton call silently if no sink has been attached yet', async () => {
    const kernel = new Kernel({} as HTMLElement, makeBindings());
    kernel.use(makeModule('feature', (ctx) => {
      ctx.hud.registerButton({ id: 'feature-btn', icon: '🧩', label: 'Open feature', onClick: () => {} });
    }));

    await expect(kernel.boot()).resolves.not.toThrow();
  });

  it('routes ctx.theme/audio/input calls through the injected host bindings', async () => {
    const bindings = makeBindings();
    const kernel = new Kernel({} as HTMLElement, bindings);

    kernel.use(makeModule('feature', (ctx) => {
      void ctx.theme.switchSkin('retro_gb');
      ctx.theme.getActiveSkinId();
      ctx.audio.playUIClick();
      ctx.audio.playSolidarityChime();
      ctx.input.setLocked(true);
    }));

    await kernel.boot();

    expect(bindings.switchSkin).toHaveBeenCalledWith('retro_gb', undefined);
    expect(bindings.getActiveSkinId).toHaveBeenCalled();
    expect(bindings.playUIClick).toHaveBeenCalled();
    expect(bindings.playSolidarityChime).toHaveBeenCalled();
    expect(bindings.setInputLocked).toHaveBeenCalledWith(true);
  });

  it('routes ctx.mesh calls through the injected host bindings', async () => {
    const bindings = makeBindings();
    const kernel = new Kernel({} as HTMLElement, bindings);

    kernel.use(makeModule('feature', (ctx) => {
      void ctx.mesh.sendChatMessage('broadsheet', 'hi neighbors');
      ctx.mesh.onChatMessage(() => {});
      ctx.mesh.getActivePeerCount();
      ctx.mesh.getTransportBadges();
    }));

    await kernel.boot();

    expect(bindings.sendChatMessage).toHaveBeenCalledWith('broadsheet', 'hi neighbors');
    expect(bindings.onChatMessage).toHaveBeenCalled();
    expect(bindings.getActivePeerCount).toHaveBeenCalled();
    expect(bindings.getTransportBadges).toHaveBeenCalled();
  });
});
