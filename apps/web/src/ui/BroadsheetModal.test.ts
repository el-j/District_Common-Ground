// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { clueForDay, COMMONS_CLUES } from './broadsheetHTML';
import { BroadsheetModal, buildBroadsheetHTML, type BroadsheetData } from './BroadsheetModal';
import { useGameStore } from '../core/state/useGameStore';
import { inputManager } from '../world/InputManager';

vi.mock('../world/InputManager', () => ({
  inputManager: {
    setLocked: vi.fn(),
  },
}));

const BASE_DATA: BroadsheetData = {
  headline: 'District Holds Steady Amid Economic Pressure',
  subheadline: 'Neighbours, we weather this together.',
  npcQuote: 'Every bit of solidarity counts.',
  npcName: 'Mira',
  foodIndex: 1.0,
  energyIndex: 1.0,
  dayNumber: 1,
};

describe('buildBroadsheetHTML', () => {
  it('renders without throwing on baseline data', () => {
    expect(() => buildBroadsheetHTML(BASE_DATA)).not.toThrow();
  });

  it('includes the headline in output', () => {
    const html = buildBroadsheetHTML(BASE_DATA);
    expect(html).toContain('District Holds Steady Amid Economic Pressure');
  });

  it('includes the day number', () => {
    const html = buildBroadsheetHTML({ ...BASE_DATA, dayNumber: 42 });
    expect(html).toContain('Day 42');
  });

  it('includes NPC quote and name', () => {
    const html = buildBroadsheetHTML(BASE_DATA);
    expect(html).toContain('Every bit of solidarity counts.');
    expect(html).toContain('Mira');
  });

  it('renders dynamic scenario data — food surge headline', () => {
    const html = buildBroadsheetHTML({
      ...BASE_DATA,
      headline: 'Food Prices Surge: Kitchen Coalition Responds',
      foodIndex: 1.35,
    });
    expect(() => html).not.toThrow();
    expect(html).toContain('Food Prices Surge');
    expect(html).toContain('index-high');
  });

  it('renders dynamic scenario data — energy spike', () => {
    const html = buildBroadsheetHTML({
      ...BASE_DATA,
      headline: 'Energy Costs Spike — Solar Co-op Sees New Members',
      energyIndex: 1.28,
    });
    expect(html).toContain('Energy Costs Spike');
    expect(html).toContain('index-high');
  });

  it('marks food as index-low when foodIndex < 0.95', () => {
    const html = buildBroadsheetHTML({ ...BASE_DATA, foodIndex: 0.90 });
    expect(html).toContain('index-low');
  });

  it('marks food as index-ok at baseline', () => {
    const html = buildBroadsheetHTML({ ...BASE_DATA, foodIndex: 1.0 });
    expect(html).toContain('index-ok');
  });

  it('includes the Commons Clue prompt for commons engagement', () => {
    const html = buildBroadsheetHTML(BASE_DATA);
    expect(html).toContain('Commons Clue');
    expect(html).toContain('commons-clue-input');
    expect(html).toContain('solidarity');
  });

  it('includes accessible close button', () => {
    const html = buildBroadsheetHTML(BASE_DATA);
    expect(html).toContain('broadsheet-close');
    expect(html).toContain('Begin the Day');
  });

  it('renders a source citation pill when source is set', () => {
    const html = buildBroadsheetHTML({ ...BASE_DATA, source: 'live' });
    expect(html).toContain('AI Narrative Wire');
    expect(html).toContain('live');
  });

  it('omits the citation pill when source is unset (hardcoded fallback path)', () => {
    const html = buildBroadsheetHTML(BASE_DATA);
    expect(html).not.toContain('broadsheet-citation');
  });
});

describe('BroadsheetModal Class', () => {
  let root: HTMLElement;

  beforeEach(() => {
    root = document.createElement('div');
    document.body.appendChild(root);
    useGameStore.setState({
      player: {
        classRole: 'pip',
        cash: 100,
        energy: 50,
        maxEnergy: 100,
        socialTrust: 50,
        stressLevel: 20,
        position: { x: 0, y: 0 },
        facing: 'down',
        lastWorkedDay: null,
        name: '',
        gender: 'prefer-not-to-say',
        appearance: 'APPEARANCE_TONE_1',
      },
    });
  });

  it('initializes overlay and paper elements in root', () => {
    const modal = new BroadsheetModal(root);
    const overlay = root.querySelector('.broadsheet-overlay') as HTMLElement;
    expect(overlay).not.toBeNull();
    expect(overlay.hidden).toBe(true);
    expect(overlay.getAttribute('role')).toBe('dialog');

    modal.destroy();
    expect(root.querySelector('.broadsheet-overlay')).toBeNull();
  });

  it('opens modal, locks input, and wires close button', () => {
    const modal = new BroadsheetModal(root);
    const onClose = vi.fn();
    modal.open(BASE_DATA, onClose);

    const overlay = root.querySelector('.broadsheet-overlay') as HTMLElement;
    expect(overlay.hidden).toBe(false);
    expect(inputManager.setLocked).toHaveBeenCalledWith(true);

    const closeBtn = root.querySelector<HTMLButtonElement>('.broadsheet-close');
    expect(closeBtn).not.toBeNull();
    closeBtn?.click();

    expect(overlay.hidden).toBe(true);
    expect(inputManager.setLocked).toHaveBeenCalledWith(false);
    expect(onClose).toHaveBeenCalled();
    modal.destroy();
  });

  it('closes on Escape key press when visible', () => {
    const modal = new BroadsheetModal(root);
    const onClose = vi.fn();
    modal.open(BASE_DATA, onClose);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    const overlay = root.querySelector('.broadsheet-overlay') as HTMLElement;
    expect(overlay.hidden).toBe(true);
    expect(onClose).toHaveBeenCalled();
    modal.destroy();
  });

  it('wires commons clue and grants energy on correct answer', () => {
    const modal = new BroadsheetModal(root);
    modal.open(BASE_DATA);

    const clueInput = root.querySelector<HTMLInputElement>('.commons-clue-input');
    const feedback = root.querySelector<HTMLElement>('.commons-clue-feedback');
    expect(clueInput).not.toBeNull();
    expect(feedback).not.toBeNull();

    if (clueInput) {
      clueInput.value = 'solidarity';
      clueInput.dispatchEvent(new Event('input'));
    }

    expect(feedback?.textContent).toContain('Correct!');
    expect(useGameStore.getState().player.energy).toBe(55);
    expect(clueInput?.disabled).toBe(true);
    modal.destroy();
  });

  it('the clue rotates by day and accepts spaced/capitalised answers', () => {
    expect(clueForDay(1).answer).not.toBe(clueForDay(2).answer);
    const modal = new BroadsheetModal(root);
    const day = COMMONS_CLUES.findIndex(c => c.answer === 'mutualaid') + 1;
    modal.open({ ...BASE_DATA, dayNumber: day });
    const input = root.querySelector<HTMLInputElement>('.commons-clue-input')!;
    input.value = 'Mutual Aid';
    input.dispatchEvent(new Event('input'));
    expect(root.querySelector('.commons-clue-feedback')!.textContent).toContain('Correct!');
    modal.destroy();
  });
});
