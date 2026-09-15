import { describe, it, expect, vi } from 'vitest';
import { SubnetBeacon, type BroadcastChannelLike, type BroadcastChannelFactory } from './SubnetBeacon';

/** An in-process fan-out bus standing in for the browser's real same-origin BroadcastChannel,
 *  so two SubnetBeacon instances in one test process behave exactly like two real browser tabs. */
function makeFakeBus(): BroadcastChannelFactory {
  const listeners = new Set<(event: { data: unknown }) => void>();
  const factory: BroadcastChannelFactory = () => {
    const channel: BroadcastChannelLike = {
      postMessage: (data) => {
        for (const listener of listeners) listener({ data });
      },
      addEventListener: (_type, handler) => {
        listeners.add(handler);
      },
      close: () => {},
    };
    return channel;
  };
  return factory;
}

describe('SubnetBeacon', () => {
  it('Test 19.2 (Subnet Loopback Discovery): two same-device beacons discover each other without any external server', () => {
    const bus = makeFakeBus();
    const discoveredByA = vi.fn();
    const discoveredByB = vi.fn();

    const beaconA = new SubnetBeacon('peer-a', 'Tab A', discoveredByA, vi.fn(), bus);
    const beaconB = new SubnetBeacon('peer-b', 'Tab B', discoveredByB, vi.fn(), bus);

    beaconA.start();
    beaconB.start();

    expect(discoveredByA).toHaveBeenCalledWith(expect.objectContaining({ peerId: 'peer-b', alias: 'Tab B' }));
    expect(discoveredByB).toHaveBeenCalledWith(expect.objectContaining({ peerId: 'peer-a', alias: 'Tab A' }));
  });

  it('never reports itself as a discovered peer', () => {
    const bus = makeFakeBus();
    const discovered = vi.fn();
    const beacon = new SubnetBeacon('peer-a', 'Tab A', discovered, vi.fn(), bus);
    beacon.start();
    expect(discovered).not.toHaveBeenCalled();
  });

  it('reports a peer lost when that peer announces "bye" on stop()', () => {
    const bus = makeFakeBus();
    const lostByA = vi.fn();
    const beaconA = new SubnetBeacon('peer-a', 'Tab A', vi.fn(), lostByA, bus);
    const beaconB = new SubnetBeacon('peer-b', 'Tab B', vi.fn(), vi.fn(), bus);
    beaconA.start();
    beaconB.start();

    beaconB.stop();

    expect(lostByA).toHaveBeenCalledWith('peer-b');
    expect(beaconA.listPeers()).toEqual([]);
  });

  it('prunes a peer that has gone silent past the timeout window', () => {
    const bus = makeFakeBus();
    let currentTime = 0;
    const now = () => currentTime;
    const lostByA = vi.fn();
    const beaconA = new SubnetBeacon('peer-a', 'Tab A', vi.fn(), lostByA, bus, now);
    const beaconB = new SubnetBeacon('peer-b', 'Tab B', vi.fn(), vi.fn(), bus, now);
    beaconA.start();
    beaconB.start();

    currentTime = 20_000; // past PEER_TIMEOUT_MS with no further announces from B
    beaconA.pruneStalePeers();

    expect(lostByA).toHaveBeenCalledWith('peer-b');
  });
});
