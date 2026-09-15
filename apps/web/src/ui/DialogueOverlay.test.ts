// @vitest-environment jsdom
// DialogueOverlay mounts real DOM nodes and reads/writes inputManager's
// locked flag — needs jsdom, same opt-in pattern as MinigameLoader.test.ts.
// InputManager.ts imports Phaser at module scope, and Phaser's module-load-time
// canvas capability check (`checkInverseAlpha`) crashes under plain jsdom
// (no `canvas` npm package installed) — so it's mocked out here rather than
// pulling the whole Phaser runtime into a DOM-overlay unit test.
import { describe, it, expect, vi } from 'vitest';

vi.mock('../world/InputManager', () => ({
  inputManager: { setLocked: vi.fn() },
}));

import { DialogueOverlay, type DialogueTree } from './DialogueOverlay';

describe('DialogueOverlay portrait (Test 21.5)', () => {
  it('renders the mood of the starting node on open', () => {
    const root = document.createElement('div');
    const tree: DialogueTree = {
      start: { text: 'Hey.', responses: [{ label: 'Hi', next: 'sad' }], mood: 'happy' },
      sad: { text: 'Things are tense.', responses: [{ label: 'Ok', next: null }], mood: 'tired' },
    };
    const overlay = new DialogueOverlay(root, tree, 'start');
    expect(overlay.getCurrentMood()).toBe('happy');
  });

  it('changes the portrait frame when the dialogue advances to a node with a different mood', () => {
    const root = document.createElement('div');
    const tree: DialogueTree = {
      start: { text: 'Hey.', responses: [{ label: 'Go on', next: 'resolved' }], mood: 'tired' },
      resolved: { text: 'We got through it.', responses: [{ label: 'Great', next: null }], mood: 'determined' },
    };
    const overlay = new DialogueOverlay(root, tree, 'start');
    expect(overlay.getCurrentMood()).toBe('tired');

    const button = root.querySelector<HTMLButtonElement>('.dialogue-choice');
    button?.click();

    expect(overlay.getCurrentMood()).toBe('determined');
  });

  it('defaults to a happy mood when the node has none set', () => {
    const root = document.createElement('div');
    const tree: DialogueTree = {
      start: { text: 'Hey.', responses: [{ label: 'Bye', next: null }] },
    };
    const overlay = new DialogueOverlay(root, tree, 'start');
    expect(overlay.getCurrentMood()).toBe('happy');
  });
});
