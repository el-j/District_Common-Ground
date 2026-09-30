// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setBootStatus, hideBootScreen, showBootError } from './bootScreen';

describe('boot screen', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="boot-screen"><p class="boot-status">Loading…</p></div>';
  });

  it('shows progress text and hides when the game is ready', () => {
    setBootStatus('Loading your save…');
    const el = document.getElementById('boot-screen')!;
    expect(el.textContent).toContain('Loading your save…');
    hideBootScreen();
    expect(el.hidden).toBe(true);
  });

  it('shows an error with a working Retry button instead of a blank page', () => {
    const retry = vi.fn();
    hideBootScreen();
    showBootError(new Error('<img src=x> network down'), retry);
    const el = document.getElementById('boot-screen')!;
    expect(el.hidden).toBe(false);
    expect(el.textContent).toContain('network down');
    expect(el.querySelector('img')).toBeNull();
    el.querySelector<HTMLButtonElement>('.boot-retry')!.click();
    expect(retry).toHaveBeenCalled();
  });
});
