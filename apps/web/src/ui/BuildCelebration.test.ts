// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { playFanfare, setLocked } = vi.hoisted(() => ({ playFanfare: vi.fn(), setLocked: vi.fn() }));
vi.mock('../core/audio/SoundSynth', () => ({ playFanfare }));
vi.mock('../world/InputManager', () => ({ inputManager: { setLocked } }));

import { attachBuildCelebrations, justCompletedNodes } from './BuildCelebration';
import { useGameStore, INITIAL_STATE, type GameState } from '../core/state/useGameStore';
import { contributeToNode, updateCommonsProgress } from '../core/state/actions';

function playing(commons: Partial<GameState['commons']> = {}): GameState {
  const s = structuredClone(INITIAL_STATE);
  s.meta.phase = 'playing';
  s.player = { ...s.player, classRole: 'pip', cash: 500, energy: 80 };
  s.commons = { ...s.commons, ...commons };
  return s;
}

describe('justCompletedNodes', () => {
  it('finds builds that crossed 100% in this change', () => {
    expect(justCompletedNodes(playing({ kitchenProgress: 97 }), playing({ kitchenProgress: 100 }))).toEqual(['kitchenProgress']);
    expect(justCompletedNodes(playing({ kitchenProgress: 100 }), playing({ kitchenProgress: 100 }))).toEqual([]);
  });

  it('leaves the Land Trust to the Safe Haven ending', () => {
    expect(justCompletedNodes(playing({ landTrustProgress: 90 }), playing({ landTrustProgress: 100 }))).toEqual([]);
  });

  it('ignores loads, new games and character changes', () => {
    const select = structuredClone(INITIAL_STATE);
    expect(justCompletedNodes(select, playing({ kitchenProgress: 100 }))).toEqual([]);
    const other = playing({ kitchenProgress: 100 });
    other.player.classRole = 'arthur';
    expect(justCompletedNodes(playing(), other)).toEqual([]);
  });
});

describe('attachBuildCelebrations', () => {
  let root: HTMLElement;
  let detach: () => void;

  beforeEach(() => {
    vi.useFakeTimers();
    playFanfare.mockClear();
    setLocked.mockClear();
    document.body.innerHTML = '';
    root = document.createElement('div');
    document.body.appendChild(root);
    useGameStore.setState(playing({ kitchenProgress: 95 }), true);
    detach = attachBuildCelebrations(root);
  });
  afterEach(() => { detach(); vi.useRealTimers(); });

  it('celebrates the player finishing a build: name, benefit, fanfare and confetti', () => {
    contributeToNode('kitchenProgress', { cash: 50, energy: 0 });
    const el = root.querySelector('.build-celebration')!;
    expect(el).not.toBeNull();
    expect(el.querySelector('.celebration-title')!.textContent).toMatch(/Community Kitchen.*open/i);
    expect(el.textContent).toMatch(/Free food/);
    expect(el.textContent).toMatch(/resilience/i);
    expect(el.querySelectorAll('.confetti-piece').length).toBeGreaterThan(20);
    expect(playFanfare).toHaveBeenCalledTimes(1);
    expect(setLocked).toHaveBeenCalledWith(true);
  });

  it('also celebrates a build the neighbours finish overnight', () => {
    updateCommonsProgress('kitchenProgress', 5);
    expect(root.querySelector('.build-celebration')).not.toBeNull();
  });

  it('shows two finished builds one after the other and unlocks input at the end', () => {
    useGameStore.setState(s => ({ commons: { ...s.commons, kitchenProgress: 100, solarGridProgress: 100 } }));
    expect(root.querySelectorAll('.build-celebration')).toHaveLength(1);
    root.querySelector<HTMLButtonElement>('.celebration-close')!.click();
    expect(root.querySelector('.celebration-title')!.textContent).toMatch(/Solar/);
    root.querySelector<HTMLButtonElement>('.celebration-close')!.click();
    expect(root.querySelector('.build-celebration')).toBeNull();
    expect(setLocked).toHaveBeenLastCalledWith(false);
    expect(playFanfare).toHaveBeenCalledTimes(2);
  });

  it('stays quiet on partial progress', () => {
    updateCommonsProgress('kitchenProgress', 2);
    expect(root.querySelector('.build-celebration')).toBeNull();
  });
});
