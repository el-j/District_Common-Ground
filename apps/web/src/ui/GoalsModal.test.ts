// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../world/InputManager', () => ({ inputManager: { setLocked: vi.fn() } }));

import { GoalsModal } from './GoalsModal';
import { useGameStore, INITIAL_STATE } from '../core/state/useGameStore';

describe('GoalsModal', () => {
  beforeEach(() => {
    const s = structuredClone(INITIAL_STATE);
    s.commons.kitchenProgress = 100;
    s.commons.solarGridProgress = 42;
    s.economy.focusNode = 'solarGridProgress';
    useGameStore.setState(s, true);
    document.body.innerHTML = '';
  });

  it('lists all five builds with progress, benefits, the focus build and the locked finale', () => {
    new GoalsModal(document.body);
    const text = document.body.textContent!;
    expect(document.querySelectorAll('.goal-row')).toHaveLength(5);
    expect(text).toContain('✅ Built');
    expect(text).toContain('42%');
    expect(text).toMatch(/neighbours \+[\d.]+%\/night/);
    expect(text).toContain('Opens after the other four');
    expect(text).toContain('Safe Haven');
  });

  it('closes with the × button', () => {
    new GoalsModal(document.body);
    document.querySelector<HTMLButtonElement>('.settings-close')!.click();
    expect(document.querySelector('.goal-list')).toBeNull();
  });

  it('shows owned Bazaar decorations and, with the blueprint pack, plaques on finished builds', () => {
    useGameStore.setState(() => ({ shop: { owned: ['kitchen_awning_deluxe', 'neighborhood_blueprint_pack'] } }));
    new GoalsModal(document.body);
    const text = document.body.textContent!;
    expect(text).toContain('Striped awning');
    expect(document.querySelectorAll('.goal-plaque')).toHaveLength(1); // only the finished kitchen
  });

  it('switches between Commons and Milestones tabs', () => {
    useGameStore.setState(() => ({
      milestones: {
        unlockedIds: ['first-dawn'],
        unlockedAt: { 'first-dawn': Date.now() },
      },
    }));

    new GoalsModal(document.body);
    const commonsTab = document.querySelector<HTMLButtonElement>('.goals-tab-btn[data-tab="commons"]')!;
    const milestonesTab = document.querySelector<HTMLButtonElement>('.goals-tab-btn[data-tab="milestones"]')!;
    const commonsContent = document.querySelector<HTMLElement>('.goals-tab-content--commons')!;
    const milestonesContent = document.querySelector<HTMLElement>('.goals-tab-content--milestones')!;

    expect(commonsContent.hidden).toBe(false);
    expect(milestonesContent.hidden).toBe(true);

    // Switch to milestones tab
    milestonesTab.click();
    expect(commonsContent.hidden).toBe(true);
    expect(milestonesContent.hidden).toBe(false);
    expect(milestonesTab.classList.contains('goals-tab-btn--active')).toBe(true);

    // Verify milestone rows are rendered
    const rows = document.querySelectorAll('.milestone-row');
    expect(rows.length).toBeGreaterThanOrEqual(14);
    expect(document.querySelector('.milestone-row--done')?.textContent).toContain('First Morning');
    expect(document.querySelector('.milestone-row--done')?.textContent).toContain('✅ Completed');

    // Switch back to commons tab
    commonsTab.click();
    expect(commonsContent.hidden).toBe(false);
    expect(milestonesContent.hidden).toBe(true);
  });
});
