// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { DistrictSnapshot, PeerDescriptor } from '@district-cg/shared-types';

vi.mock('../world/InputManager', () => ({
  inputManager: { setLocked: vi.fn() },
}));

const { getNearbyPeers, requestVisit } = vi.hoisted(() => ({
  getNearbyPeers: vi.fn(),
  requestVisit: vi.fn(),
}));
vi.mock('../core/mesh/meshRuntime', () => ({ getNearbyPeers, requestVisit }));

import { ProximityVisitModal } from './ProximityVisitModal';

function makePeer(overrides: Partial<PeerDescriptor> = {}): PeerDescriptor {
  return { peerId: 'peer-1', alias: 'River', transportId: 'ble', signalStrength: -60, lastSeen: Date.now(), ...overrides };
}

function makeSnapshot(): DistrictSnapshot {
  return {
    handle: 'River',
    day: 3,
    resilienceScore: 55,
    activeCrisis: null,
    commons: { solarGridProgress: 0, kitchenProgress: 0, legalFundProgress: 0, toolLibraryProgress: 0, landTrustProgress: 0 },
  };
}

describe('ProximityVisitModal', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  it('shows a no-one-nearby message when the peer list is empty', () => {
    getNearbyPeers.mockReturnValue([]);
    const root = document.createElement('div');
    document.body.appendChild(root);
    new ProximityVisitModal(root);

    expect(root.querySelector('.shop-status')!.textContent).toMatch(/No one nearby/i);
  });

  it('lists nearby peers by alias with a Visit button each', () => {
    getNearbyPeers.mockReturnValue([makePeer(), makePeer({ peerId: 'peer-2', alias: 'Sam' })]);
    const root = document.createElement('div');
    document.body.appendChild(root);
    new ProximityVisitModal(root);

    const rows = root.querySelectorAll('.proximity-peer-row');
    expect(rows).toHaveLength(2);
    expect(root.querySelector('[data-visit="peer-1"]')).not.toBeNull();
    expect(root.querySelector('[data-visit="peer-2"]')).not.toBeNull();
  });

  it('visiting a peer shows a loading state, then their district snapshot', async () => {
    getNearbyPeers.mockReturnValue([makePeer()]);
    requestVisit.mockResolvedValueOnce(makeSnapshot());
    const root = document.createElement('div');
    document.body.appendChild(root);
    new ProximityVisitModal(root);

    root.querySelector<HTMLButtonElement>('[data-visit="peer-1"]')!.click();
    expect(root.querySelector('.shop-status')!.textContent).toMatch(/Reaching out to River/i);

    await Promise.resolve();
    await Promise.resolve();

    expect(requestVisit).toHaveBeenCalledWith('peer-1');
    expect(root.querySelector('.district-viewer-summary-label')!.textContent).toContain("River's home");
    expect(root.querySelector('.district-viewer-summary')!.textContent).toContain('Day 3');
  });

  it('shows a decline/out-of-range message when the visit resolves null', async () => {
    getNearbyPeers.mockReturnValue([makePeer()]);
    requestVisit.mockResolvedValueOnce(null);
    const root = document.createElement('div');
    document.body.appendChild(root);
    new ProximityVisitModal(root);

    root.querySelector<HTMLButtonElement>('[data-visit="peer-1"]')!.click();
    await Promise.resolve();
    await Promise.resolve();

    expect(root.querySelector('.shop-status')!.textContent).toMatch(/isn't visitable right now/i);
  });
});
