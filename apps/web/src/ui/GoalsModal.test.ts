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
});
