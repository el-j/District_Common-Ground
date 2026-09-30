// @vitest-environment jsdom
// TownHallAssembly mounts real DOM nodes and reads inputManager's locked
// flag — needs jsdom, same opt-in pattern as ConstructionModal.test.ts.
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../world/InputManager', () => ({
  inputManager: { setLocked: vi.fn() },
}));

import { TownHallAssembly, POLICIES, applyPolicyEffects, canAffordPolicy } from './TownHallAssembly';
import { useGameStore } from '../core/state/useGameStore';

function resetStore() {
  useGameStore.setState({
    meta: { day: 30, tick: 0, activeSkin: 'default', skinRevision: 0, phase: 'playing', lastAssemblyDay: 0, regionCode: 'GENERIC', saveVersion: 2, savedAt: 0 },
    player: {
      classRole: 'pip', cash: 50, energy: 50, maxEnergy: 100,
      socialTrust: 40, stressLevel: 30, position: { x: 0, y: 0 }, facing: 'down', lastWorkedDay: null,
        name: '', gender: 'prefer-not-to-say', appearance: 'APPEARANCE_TONE_1',
    },
    commons: {
      resilienceScore: 20,
      solarGridProgress: 0, kitchenProgress: 0, legalFundProgress: 0,
      toolLibraryProgress: 0, landTrustProgress: 0,
      constructionSpeedBuff: 0, greenhouseUnlocked: false, safeHavenUnlocked: false, resilienceModifier: 0,
    },
    crisisState: { activeCrisisId: null, pendingQueue: [], historyLog: [], lastCrisisDay: 0, scapegoatStreak: 0, worldSaturation: 1 },
  });
}

// M31 Section 4 — this was the one modal in the audit genuinely missing a
// visible × (Escape-only, with just a text hint). See EPIC-31/M31 Section 4.
describe('TownHallAssembly close affordance', () => {
  beforeEach(() => resetStore());

  it('renders a visible × close button', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    new TownHallAssembly(root, () => undefined);

    const closeBtn = root.querySelector<HTMLButtonElement>('.assembly-close');
    expect(closeBtn).not.toBeNull();
    expect(closeBtn!.textContent).toContain('×');
  });

  it('closes and calls onClose when the × is clicked', () => {
    const onClose = vi.fn();
    const root = document.createElement('div');
    document.body.appendChild(root);
    new TownHallAssembly(root, onClose);

    root.querySelector<HTMLButtonElement>('.assembly-close')!.click();

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(root.querySelector('.town-hall-overlay')).toBeNull();
  });

  it('still closes via Escape (shared bindEscapeClose helper)', () => {
    const onClose = vi.fn();
    const root = document.createElement('div');
    document.body.appendChild(root);
    new TownHallAssembly(root, onClose);

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('records the assembly day on close', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    new TownHallAssembly(root, () => undefined);

    root.querySelector<HTMLButtonElement>('.assembly-close')!.click();

    expect(useGameStore.getState().meta.lastAssemblyDay).toBe(30);
  });
});

// 2026-09-29 launch audit §1.7 — vote texts promised effects ("energy
// cost", "speeds construction") that never happened. Effects are now data,
// shown as chips, applied exactly, and unaffordable options are disabled.
describe('TownHallAssembly votes do what they say', () => {
  beforeEach(() => resetStore());

  it('every option has at least one effect and its description never promises an unmodelled effect', () => {
    for (const vote of POLICIES) {
      for (const opt of [vote.optionA, vote.optionB]) {
        expect(Object.values(opt.effects).some(v => v !== 0), `${vote.id}/${opt.label}`).toBe(true);
        if (/energy/i.test(opt.description)) expect(opt.effects.energy ?? 0).not.toBe(0);
        if (/faster|speed/i.test(opt.description)) expect(opt.effects.buildBuff ?? 0).toBeGreaterThan(0);
      }
    }
  });

  it('the mutual-aid pledge really costs energy', () => {
    const pledge = POLICIES.find(p => p.id === 'mutual-aid-mandate')!.optionA;
    applyPolicyEffects(pledge.effects);
    expect(useGameStore.getState().player.energy).toBe(50 + (pledge.effects.energy ?? 0));
    expect(pledge.effects.energy).toBeLessThan(0);
  });

  it('funding the commons really speeds up construction', () => {
    const fund = POLICIES.find(p => p.id === 'commons-fund')!.optionA;
    applyPolicyEffects(fund.effects);
    expect(useGameStore.getState().commons.constructionSpeedBuff).toBeGreaterThan(0);
  });

  it('an option the player cannot pay for is not affordable', () => {
    const pledge = POLICIES.find(p => p.id === 'mutual-aid-mandate')!.optionA;
    useGameStore.setState(st => ({ player: { ...st.player, energy: 0 } }));
    expect(canAffordPolicy(pledge.effects, useGameStore.getState().player)).toBe(false);
  });
});
