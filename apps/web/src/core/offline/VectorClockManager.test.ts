import { describe, it, expect } from 'vitest';
import { increment, merge, compare, isConcurrent } from './VectorClockManager';

describe('VectorClockManager', () => {
  it('increment starts an unseen device at 1 and bumps an existing one by 1', () => {
    expect(increment({}, 'a')).toEqual({ a: 1 });
    expect(increment({ a: 3, b: 1 }, 'a')).toEqual({ a: 4, b: 1 });
  });

  it('merge takes the pointwise max across both clocks', () => {
    expect(merge({ a: 2, b: 5 }, { a: 4, c: 1 })).toEqual({ a: 4, b: 5, c: 1 });
  });

  it('compare reports equal for identical clocks', () => {
    expect(compare({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe('equal');
  });

  it('compare reports before/after when one clock strictly dominates', () => {
    expect(compare({ a: 1 }, { a: 2 })).toBe('before');
    expect(compare({ a: 2 }, { a: 1 })).toBe('after');
    expect(compare({ a: 1, b: 5 }, { a: 2, b: 5 })).toBe('before');
  });

  it('compare reports concurrent when neither clock dominates', () => {
    expect(compare({ a: 2, b: 1 }, { a: 1, b: 2 })).toBe('concurrent');
  });

  it('missing entries are treated as 0', () => {
    expect(compare({}, { a: 1 })).toBe('before');
    expect(compare({ a: 1 }, {})).toBe('after');
  });

  it('isConcurrent mirrors compare', () => {
    expect(isConcurrent({ a: 2, b: 1 }, { a: 1, b: 2 })).toBe(true);
    expect(isConcurrent({ a: 1 }, { a: 1 })).toBe(false);
  });
});
