import { describe, it, expect, vi } from 'vitest';

vi.mock('./ThemeManager', () => ({
  getActivePropColorHex: (token: string) => (token === 'PROP_LAMP' ? '#ffdd88' : '#000000'),
}));

import { resolvePropColor } from './resolvePropColor';

describe('resolvePropColor', () => {
  it('converts the resolved hex string to a Phaser numeric color', () => {
    expect(resolvePropColor('PROP_LAMP')).toBe(0xffdd88);
  });

  it('handles black correctly (no leading-zero truncation)', () => {
    expect(resolvePropColor('PROP_UNKNOWN')).toBe(0x000000);
  });
});
