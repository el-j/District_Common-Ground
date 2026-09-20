// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { DistrictSnapshot } from '@district-cg/shared-types';

const { getFriendDistrict } = vi.hoisted(() => ({ getFriendDistrict: vi.fn() }));
vi.mock('../api/endpoints/social', () => ({ getFriendDistrict }));

import { FriendDistrictViewer, renderDistrictSnapshotHtml } from './FriendDistrictViewer';

function flushMicrotasks() {
  return new Promise(resolve => setTimeout(resolve, 0));
}

function makeSnapshot(overrides: Partial<DistrictSnapshot> = {}): DistrictSnapshot {
  return {
    handle: 'neighbor',
    day: 12,
    resilienceScore: 63.4,
    activeCrisis: null,
    commons: {
      solarGridProgress: 40,
      kitchenProgress: 100,
      legalFundProgress: 10,
      toolLibraryProgress: 0,
      landTrustProgress: 0,
    },
    ...overrides,
  };
}

describe('renderDistrictSnapshotHtml', () => {
  it('renders day, rounded resilience, and a bar per commons progress key', () => {
    const html = renderDistrictSnapshotHtml(makeSnapshot());
    expect(html).toContain('Day 12');
    expect(html).toContain('Resilience 63');
    expect(html).toContain('width: 100%'); // kitchenProgress clamped/shown
    expect(html).not.toContain('⚠');
  });

  it('shows the active-crisis flag when present', () => {
    const html = renderDistrictSnapshotHtml(makeSnapshot({ activeCrisis: 'Flooding on the canal' }));
    expect(html).toContain('⚠ Flooding on the canal');
  });

  it('clamps out-of-range progress values into the 0-100 bar width', () => {
    const html = renderDistrictSnapshotHtml(makeSnapshot({ commons: { ...makeSnapshot().commons, solarGridProgress: 150 } }));
    expect(html).toContain('width: 100%');
  });
});

describe('FriendDistrictViewer', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    getFriendDistrict.mockReset();
  });

  it('shows a loading state, then the fetched snapshot', async () => {
    getFriendDistrict.mockResolvedValueOnce(makeSnapshot());
    const root = document.createElement('div');
    document.body.appendChild(root);
    new FriendDistrictViewer(root, 'neighbor', 'user-42');

    expect(root.querySelector('.shop-status')!.textContent).toMatch(/Loading/i);

    await flushMicrotasks();

    expect(getFriendDistrict).toHaveBeenCalledWith('user-42');
    expect(root.querySelector('.district-viewer-summary')).not.toBeNull();
    expect(root.querySelector('.settings-title')!.textContent).toContain('neighbor');
  });

  it('shows a friendly error when the fetch fails', async () => {
    getFriendDistrict.mockRejectedValueOnce(new Error('network down'));
    const root = document.createElement('div');
    document.body.appendChild(root);
    new FriendDistrictViewer(root, 'neighbor', 'user-42');

    await flushMicrotasks();

    expect(root.querySelector('.shop-status')!.textContent).toContain("Could not load neighbor's district");
  });

  it('closes on × click', async () => {
    vi.useFakeTimers();
    getFriendDistrict.mockResolvedValueOnce(makeSnapshot());
    const root = document.createElement('div');
    document.body.appendChild(root);
    new FriendDistrictViewer(root, 'neighbor', 'user-42');
    await Promise.resolve();
    await Promise.resolve();

    root.querySelector<HTMLButtonElement>('.settings-close')!.click();
    vi.runAllTimers();

    expect(root.querySelector('.settings-overlay')).toBeNull();
    vi.useRealTimers();
  });
});
