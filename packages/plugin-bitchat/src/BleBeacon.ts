// M19 — Web Bluetooth LE close-range peer discovery (~30m), for the case
// where two players are near each other but not on the same WiFi subnet.
// Same hardware-availability boundary M17's WebBluetoothDriver.ts already
// drew: written against the real API shape, feature-detected, unverified
// against physical hardware (`requestLEScan` is still an experimental
// Chrome-only API). Only presence + signal strength is reported here — real
// GATT-based packet relay over BLE is not implemented.
export interface BleAdvertisementEvent {
  device: { id: string; name?: string };
  rssi?: number;
}

export interface BleScanLike {
  stop(): void;
}

export interface BluetoothLeScanLike {
  requestLEScan(options: { acceptAllAdvertisements: boolean }): Promise<BleScanLike>;
  addEventListener(type: 'advertisementreceived', handler: (event: BleAdvertisementEvent) => void): void;
  removeEventListener(type: 'advertisementreceived', handler: (event: BleAdvertisementEvent) => void): void;
}

function getNavigatorBluetooth(): BluetoothLeScanLike | undefined {
  return (globalThis as { navigator?: { bluetooth?: BluetoothLeScanLike } }).navigator?.bluetooth;
}

export function isBleScanSupported(): boolean {
  const bluetooth = getNavigatorBluetooth();
  return bluetooth !== undefined && typeof bluetooth.requestLEScan === 'function';
}

export const BLE_PEER_TIMEOUT_MS = 30000;

export interface DiscoveredBlePeer {
  peerId: string;
  rssi: number | null;
  lastSeen: number;
}

export class BleBeacon {
  private scan: BleScanLike | null = null;
  private readonly listener = (event: BleAdvertisementEvent): void => this.handleAdvertisement(event);
  private readonly peers = new Map<string, { rssi: number | null; lastSeen: number }>();

  constructor(
    private readonly onDiscovered: (peer: DiscoveredBlePeer) => void,
    private readonly onLost: (peerId: string) => void,
    private readonly bluetooth: BluetoothLeScanLike | undefined = getNavigatorBluetooth(),
    private readonly now: () => number = Date.now,
  ) {}

  get isScanning(): boolean {
    return this.scan !== null;
  }

  async start(): Promise<void> {
    if (!this.bluetooth) {
      throw new Error('Web Bluetooth LE scanning is not available in this browser');
    }
    this.bluetooth.addEventListener('advertisementreceived', this.listener);
    this.scan = await this.bluetooth.requestLEScan({ acceptAllAdvertisements: true });
  }

  stop(): void {
    this.scan?.stop();
    this.scan = null;
    this.bluetooth?.removeEventListener('advertisementreceived', this.listener);
    this.peers.clear();
  }

  private handleAdvertisement(event: BleAdvertisementEvent): void {
    const peerId = event.device.id;
    const isNew = !this.peers.has(peerId);
    const rssi = event.rssi ?? null;
    const lastSeen = this.now();
    this.peers.set(peerId, { rssi, lastSeen });
    if (isNew) this.onDiscovered({ peerId, rssi, lastSeen });
  }

  pruneStalePeers(): void {
    const cutoff = this.now() - BLE_PEER_TIMEOUT_MS;
    for (const [peerId, info] of this.peers) {
      if (info.lastSeen < cutoff) {
        this.peers.delete(peerId);
        this.onLost(peerId);
      }
    }
  }

  listPeers(): DiscoveredBlePeer[] {
    return Array.from(this.peers.entries()).map(([peerId, info]) => ({ peerId, ...info }));
  }
}
