// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const sounds = vi.hoisted(() => ({ playCoin: vi.fn(), playSoftDrop: vi.fn(), playWarmRise: vi.fn() }));
vi.mock('../core/audio/SoundSynth', () => sounds);

import { attachStatPops } from './StatPops';
import { useGameStore, INITIAL_STATE } from '../core/state/useGameStore';

function start(): void {
  const s = structuredClone(INITIAL_STATE);
  s.meta.phase = 'playing';
  s.player = { ...s.player, classRole: 'pip', cash: 25, energy: 80, socialTrust: 40, stressLevel: 60 };
  useGameStore.setState(s, true);
}
const setPlayer = (p: Partial<typeof INITIAL_STATE.player>) =>
  useGameStore.setState(s => ({ player: { ...s.player, ...p } }));

describe('attachStatPops', () => {
  let root: HTMLElement;
  let detach: () => void;

  beforeEach(() => {
    vi.useFakeTimers();
    Object.values(sounds).forEach(f => f.mockClear());
    document.body.innerHTML = '';
    root = document.createElement('div');
    document.body.appendChild(root);
    start();
    detach = attachStatPops(root);
  });
  afterEach(() => { detach(); vi.useRealTimers(); });

  it('floats a coloured delta for each stat that changed', () => {
    setPlayer({ cash: 37, energy: 70 });
    const pops = [...root.querySelectorAll<HTMLElement>('.stat-pop')];
    expect(pops.map(p => p.textContent)).toEqual(['+$12', '−10⚡']);
    expect(pops[0].classList).toContain('stat-pop--good');
    expect(pops[1].classList).toContain('stat-pop--bad');
  });

  it('anchors a pop to its HUD stat when that stat is on screen', () => {
    const anchor = document.createElement('span');
    anchor.dataset['stat'] = 'cash';
    anchor.getBoundingClientRect = () => ({ left: 100, top: 20, width: 40, height: 16, right: 140, bottom: 36, x: 100, y: 20, toJSON: () => ({}) });
    document.body.appendChild(anchor);
    setPlayer({ cash: 30 });
    const pop = root.querySelector<HTMLElement>('.stat-pop')!;
    expect(pop.style.left).toBe('120px');
    expect(pop.style.top).toBe('36px');
  });

  it('keeps a pop on screen when its stat sits at the edge', () => {
    const anchor = document.createElement('span');
    anchor.dataset['stat'] = 'cash';
    const w = window.innerWidth;
    anchor.getBoundingClientRect = () => ({ left: w - 10, top: 20, width: 10, height: 16, right: w, bottom: 36, x: w - 10, y: 20, toJSON: () => ({}) });
    document.body.appendChild(anchor);
    setPlayer({ cash: 30 });
    expect(parseFloat(root.querySelector<HTMLElement>('.stat-pop')!.style.left)).toBeLessThanOrEqual(w - 70);
  });

  it('plays one fitting sound per change: coin for money in, a soft drop for money out', () => {
    setPlayer({ cash: 30, energy: 60 });
    expect(sounds.playCoin).toHaveBeenCalledTimes(1);
    setPlayer({ cash: 10 });
    expect(sounds.playSoftDrop).toHaveBeenCalledTimes(1);
    setPlayer({ socialTrust: 45 });
    expect(sounds.playWarmRise).toHaveBeenCalledTimes(1);
    setPlayer({ energy: 50 });
    expect(sounds.playCoin).toHaveBeenCalledTimes(1);
    expect(sounds.playSoftDrop).toHaveBeenCalledTimes(1);
  });

  it('cleans each pop up after its animation', () => {
    setPlayer({ cash: 30 });
    vi.advanceTimersByTime(2000);
    expect(root.querySelector('.stat-pop')).toBeNull();
  });

  it('stops listening once detached', () => {
    detach();
    setPlayer({ cash: 99 });
    expect(root.querySelector('.stat-pop')).toBeNull();
  });
});
