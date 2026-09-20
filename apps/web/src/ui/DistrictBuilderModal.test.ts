// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../core/offline/offlineRuntime', () => ({ recordAction: vi.fn() }));

import { DistrictBuilderModal } from './DistrictBuilderModal';

describe('DistrictBuilderModal', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('mounts the district grid into the backdrop', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    new DistrictBuilderModal(root);

    expect(root.querySelector('.district-builder-card')).not.toBeNull();
    // DistrictGrid.render() takes over the mount point's className/content itself.
    expect(root.querySelector('.district-grid-wrapper')).not.toBeNull();
  });

  it('closes via the × button and calls onClose', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const onClose = vi.fn();
    new DistrictBuilderModal(root, onClose);

    root.querySelector<HTMLButtonElement>('.district-builder-close')!.click();

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(root.querySelector('.district-builder-modal-backdrop')).toBeNull();
  });

  it('closes on Escape and calls onClose', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const onClose = vi.fn();
    new DistrictBuilderModal(root, onClose);

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('stops listening for Escape after being closed once', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const onClose = vi.fn();
    new DistrictBuilderModal(root, onClose);

    root.querySelector<HTMLButtonElement>('.district-builder-close')!.click();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
