import { describe, it, expect, vi } from 'vitest';
import { BleBeacon, isBleScanSupported, type BluetoothLeScanLike, type BleAdvertisementEvent } from './BleBeacon';

function makeFakeBluetooth(): { bluetooth: BluetoothLeScanLike; emit: (event: BleAdvertisementEvent) => void; stopSpy: ReturnType<typeof vi.fn> } {
  const listeners = new Set<(event: BleAdvertisementEvent) => void>();
  const stopSpy = vi.fn();
  const bluetooth: BluetoothLeScanLike = {
    requestLEScan: vi.fn().mockResolvedValue({ stop: stopSpy }),
    addEventListener: (_type, handler) => listeners.add(handler),
    removeEventListener: (_type, handler) => listeners.delete(handler),
  };
  return { bluetooth, emit: (event) => listeners.forEach((l) => l(event)), stopSpy };
}

describe('isBleScanSupported', () => {
  it('is false when navigator.bluetooth is absent', () => {
    expect(isBleScanSupported()).toBe(false);
  });
});

describe('BleBeacon', () => {
  it('reports a newly discovered peer with its RSSI', async () => {
    const { bluetooth, emit } = makeFakeBluetooth();
    const onDiscovered = vi.fn();
    const beacon = new BleBeacon(onDiscovered, vi.fn(), bluetooth);

    await beacon.start();
    emit({ device: { id: 'ble-peer-1' }, rssi: -55 });

    expect(onDiscovered).toHaveBeenCalledWith({ peerId: 'ble-peer-1', rssi: -55, lastSeen: expect.any(Number) });
    expect(beacon.isScanning).toBe(true);
  });

  it('does not re-report an already-known peer, but does update its RSSI', async () => {
    const { bluetooth, emit } = makeFakeBluetooth();
    const onDiscovered = vi.fn();
    const beacon = new BleBeacon(onDiscovered, vi.fn(), bluetooth);
    await beacon.start();

    emit({ device: { id: 'ble-peer-1' }, rssi: -55 });
    emit({ device: { id: 'ble-peer-1' }, rssi: -40 });

    expect(onDiscovered).toHaveBeenCalledTimes(1);
    expect(beacon.listPeers()).toEqual([{ peerId: 'ble-peer-1', rssi: -40, lastSeen: expect.any(Number) }]);
  });

  it('stops the underlying scan and clears peers on stop()', async () => {
    const { bluetooth, emit, stopSpy } = makeFakeBluetooth();
    const beacon = new BleBeacon(vi.fn(), vi.fn(), bluetooth);
    await beacon.start();
    emit({ device: { id: 'ble-peer-1' } });

    beacon.stop();

    expect(stopSpy).toHaveBeenCalledTimes(1);
    expect(beacon.isScanning).toBe(false);
    expect(beacon.listPeers()).toEqual([]);
  });

  it('rejects start() when Web Bluetooth is unavailable', async () => {
    const beacon = new BleBeacon(vi.fn(), vi.fn(), undefined);
    await expect(beacon.start()).rejects.toThrow(/not available/);
  });

  it('prunes a peer that has not advertised within the timeout window', async () => {
    const { bluetooth, emit } = makeFakeBluetooth();
    let currentTime = 0;
    const onLost = vi.fn();
    const beacon = new BleBeacon(vi.fn(), onLost, bluetooth, () => currentTime);
    await beacon.start();
    emit({ device: { id: 'ble-peer-1' }, rssi: -50 });

    currentTime = 40_000;
    beacon.pruneStalePeers();

    expect(onLost).toHaveBeenCalledWith('ble-peer-1');
  });
});
