import { describe, it, expect } from 'vitest';
import { selectBgmChords } from './SoundSynth';

// M23 Test 23.5 — the BGM progression selector is pure and actually varies by input.
describe('selectBgmChords', () => {
  it('returns different chord progressions for day vs. night', () => {
    const day = selectBgmChords('day');
    const night = selectBgmChords('night');
    expect(day).not.toEqual(night);
  });

  it('returns a 4-bar progression for each phase', () => {
    expect(selectBgmChords('day').length).toBe(4);
    expect(selectBgmChords('night').length).toBe(4);
  });

  it('is pure — repeated calls with the same input return equal output', () => {
    expect(selectBgmChords('day')).toEqual(selectBgmChords('day'));
    expect(selectBgmChords('night')).toEqual(selectBgmChords('night'));
  });

  it('shares the same opening A-minor chord across both phases (same key family)', () => {
    expect(selectBgmChords('day')[0]).toEqual(selectBgmChords('night')[0]);
  });
});
