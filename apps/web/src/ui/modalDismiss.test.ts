// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { bindEscapeClose } from './modalDismiss';

describe('bindEscapeClose', () => {
  it('invokes onClose when Escape is pressed', () => {
    const onClose = vi.fn();
    bindEscapeClose(onClose);

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('ignores non-Escape keys', () => {
    const onClose = vi.fn();
    bindEscapeClose(onClose);

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

    expect(onClose).not.toHaveBeenCalled();
  });

  it('stops listening after the returned dispose function runs', () => {
    const onClose = vi.fn();
    const dispose = bindEscapeClose(onClose);

    dispose();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(onClose).not.toHaveBeenCalled();
  });

  it('is safe to dispose twice (close() called via two affordances)', () => {
    const onClose = vi.fn();
    const dispose = bindEscapeClose(onClose);

    expect(() => {
      dispose();
      dispose();
    }).not.toThrow();
  });
});
