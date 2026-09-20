// @vitest-environment jsdom
// CharacterSelect.ts imports GeoPreviewModal.ts, which imports
// world/InputManager.ts, which does `import Phaser from 'phaser'` at
// module scope — loading that (even without instantiating anything)
// crashes under plain jsdom (no `canvas` npm package installed), the same
// issue DialogueOverlay.test.ts's own comment already documents. Mocked
// out here rather than pulling the real Phaser runtime into this modal's
// unit tests — this file never needed GeoPreviewModal's real behavior
// (that button isn't under test).
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../world/InputManager', () => ({
  inputManager: { setLocked: vi.fn() },
}));

import { CharacterSelect } from './CharacterSelect';
import { FAMILY_TEMPLATES } from '../core/simulation/FamilyTemplates';
import { useGameStore, INITIAL_STATE } from '../core/state/useGameStore';

function pickFirstFamily(root: HTMLElement): void {
  root.querySelector<HTMLButtonElement>('[data-template]')?.click();
}

// M47/M48 — EPIC-36 §2/§3. See docs/tasks/M47-birth-and-family-generation.md
// and docs/tasks/M48-name-and-identity-customization.md. 3-step flow:
// family → identity → confirm.
describe('CharacterSelect (family + identity origin flow)', () => {
  beforeEach(() => {
    useGameStore.setState(INITIAL_STATE, true);
  });

  it('renders one card per family template on the first step', () => {
    const root = document.createElement('div');
    new CharacterSelect(root, () => {});
    const cards = root.querySelectorAll('[data-template]');
    expect(cards.length).toBe(FAMILY_TEMPLATES.length);
  });

  it('advances to the identity step (name/gender/appearance) after picking a family, without completing yet', () => {
    const root = document.createElement('div');
    let completed = false;
    new CharacterSelect(root, () => { completed = true; });

    pickFirstFamily(root);

    expect(root.querySelector('#cs-name-input')).not.toBeNull();
    expect(root.querySelectorAll('[data-gender]').length).toBeGreaterThan(0);
    expect(root.querySelectorAll('[data-appearance]').length).toBe(4);
    expect(completed).toBe(false);
    expect(useGameStore.getState().origin.familyTemplateId).toBeNull();
    expect(useGameStore.getState().meta.phase).toBe('select');
  });

  it('choosing "Self-describe" reveals a free-text input; other choices don\'t', () => {
    const root = document.createElement('div');
    new CharacterSelect(root, () => {});
    pickFirstFamily(root);

    expect(root.querySelector('#cs-gender-self-describe')).toBeNull();
    root.querySelector<HTMLButtonElement>('[data-gender="self-describe"]')?.click();
    expect(root.querySelector('#cs-gender-self-describe')).not.toBeNull();

    root.querySelector<HTMLButtonElement>('[data-gender="man"]')?.click();
    expect(root.querySelector('#cs-gender-self-describe')).toBeNull();
  });

  it('advances from identity to the confirm step showing the chosen family\'s members', () => {
    const root = document.createElement('div');
    new CharacterSelect(root, () => {});
    pickFirstFamily(root);
    root.querySelector<HTMLButtonElement>('[data-continue]')?.click();

    const memberCards = root.querySelectorAll('.cs-family-member');
    expect(memberCards.length).toBe(FAMILY_TEMPLATES[0]!.members.length);
  });

  it('"Choose a different family" from the identity step returns to the family-pick step', () => {
    const root = document.createElement('div');
    new CharacterSelect(root, () => {});
    pickFirstFamily(root);
    root.querySelector<HTMLButtonElement>('[data-back]')?.click();

    expect(root.querySelectorAll('[data-template]').length).toBe(FAMILY_TEMPLATES.length);
  });

  it('"Begin Your Story" records the family template + chosen identity, seeds the mapped archetype, and completes', () => {
    const root = document.createElement('div');
    let completed = false;
    new CharacterSelect(root, () => { completed = true; });

    const template = FAMILY_TEMPLATES[0]!;
    root.querySelector<HTMLButtonElement>(`[data-template="${template.id}"]`)?.click();

    const nameInput = root.querySelector<HTMLInputElement>('#cs-name-input')!;
    nameInput.value = 'Rosa';
    nameInput.dispatchEvent(new Event('input'));
    root.querySelector<HTMLButtonElement>('[data-gender="non-binary"]')?.click();
    root.querySelector<HTMLButtonElement>('[data-appearance="APPEARANCE_TONE_3"]')?.click();

    root.querySelector<HTMLButtonElement>('[data-continue]')?.click();
    root.querySelector<HTMLButtonElement>('[data-begin]')?.click();

    const state = useGameStore.getState();
    expect(state.origin.familyTemplateId).toBe(template.id);
    expect(state.player.classRole).toBe(template.classRole);
    expect(state.player.cash).toBe(template.startingStats.cash);
    expect(state.player.name).toBe('Rosa');
    expect(state.player.gender).toBe('non-binary');
    expect(state.player.appearance).toBe('APPEARANCE_TONE_3');
    expect(state.meta.phase).toBe('playing');
    expect(completed).toBe(true);
  });

  it('leaving the name blank falls back to the template\'s classRole flavor name', () => {
    const root = document.createElement('div');
    new CharacterSelect(root, () => {});

    const template = FAMILY_TEMPLATES.find(t => t.classRole === 'pip')!;
    root.querySelector<HTMLButtonElement>(`[data-template="${template.id}"]`)?.click();
    root.querySelector<HTMLButtonElement>('[data-continue]')?.click();
    root.querySelector<HTMLButtonElement>('[data-begin]')?.click();

    expect(useGameStore.getState().player.name).toBe('Pip');
  });
});
