// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { TutorialCoach, TUTORIAL_STEPS } from './TutorialCoach';
import { useGameStore, INITIAL_STATE } from '../core/state/useGameStore';

// Audit §3.3 — a new player got 16 unexplained buttons and no goal.
describe('TutorialCoach', () => {
  let root: HTMLElement;
  const card = () => root.querySelector('.tutorial-card');

  beforeEach(() => {
    const s = structuredClone(INITIAL_STATE);
    s.meta.phase = 'playing';
    s.player.classRole = 'pip';
    useGameStore.setState(s, true);
    document.body.innerHTML = '';
    root = document.createElement('div');
    document.body.appendChild(root);
  });

  it('shows the first hint in a new game and moves on with Next', () => {
    new TutorialCoach(root);
    expect(card()!.textContent).toContain(TUTORIAL_STEPS[0]!.text.slice(0, 20));
    root.querySelector<HTMLButtonElement>('.tutorial-next')!.click();
    expect(useGameStore.getState().tutorial.step).toBe(1);
    expect(card()!.textContent).toContain(TUTORIAL_STEPS[1]!.text.slice(0, 20));
  });

  it('advances by itself when the player does what the hint asks', () => {
    new TutorialCoach(root);
    const workStep = TUTORIAL_STEPS.findIndex(s => s.id === 'work');
    useGameStore.setState(s => ({ tutorial: { ...s.tutorial, step: workStep } }));
    useGameStore.setState(s => ({ player: { ...s.player, lastWorkedDay: 1 } }));
    expect(useGameStore.getState().tutorial.step).toBe(workStep + 1);
  });

  it('can be skipped, and stays gone', () => {
    new TutorialCoach(root);
    root.querySelector<HTMLButtonElement>('.tutorial-skip')!.click();
    expect(useGameStore.getState().tutorial.done).toBe(true);
    expect(card()).toBeNull();
    new TutorialCoach(root);
    expect(card()).toBeNull();
  });

  it('finishes after the last step', () => {
    new TutorialCoach(root);
    useGameStore.setState(s => ({ tutorial: { ...s.tutorial, step: TUTORIAL_STEPS.length - 1 } }));
    root.querySelector<HTMLButtonElement>('.tutorial-next')!.click();
    expect(useGameStore.getState().tutorial.done).toBe(true);
    expect(card()).toBeNull();
  });

  it('stays hidden on the character-select screen', () => {
    useGameStore.setState(s => ({ meta: { ...s.meta, phase: 'select' } }));
    new TutorialCoach(root);
    expect(card()).toBeNull();
  });
});
