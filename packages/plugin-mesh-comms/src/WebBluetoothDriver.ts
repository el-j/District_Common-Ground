// M17 — Web Bluetooth bridge to a Meshtastic BLE peripheral (mobile/desktop
// path where USB serial isn't available). Same hardware-availability caveat
// as WebSerialDriver.ts: written against the real Web Bluetooth API shape,
// feature-detected, but unverified against a physical radio — tests mock
// `navigator.bluetooth` and the GATT characteristic surface.
import { encodePacket, decodePacket, type MeshPacket } from './PacketCodec';

// Meshtastic's public BLE service/characteristic UUIDs.
export const MESHTASTIC_SERVICE_UUID = '6ba1b218-15a8-461f-9fa8-5dcae273eafd';
export const MESHTASTIC_TX_CHARACTERISTIC_UUID = 'f75c76d2-129e-4dad-a1dd-7866124401e7';
export const MESHTASTIC_RX_CHARACTERISTIC_UUID = '2c55e69e-4993-11ed-b878-0242ac120002';

export interface BleCharacteristicLike {
  writeValue(data: Uint8Array): Promise<void>;
  startNotifications(): Promise<void>;
  addEventListener(type: 'characteristicvaluechanged', handler: (event: { target: { value: DataView } }) => void): void;
}

export interface BleServiceLike {
  getCharacteristic(uuid: string): Promise<BleCharacteristicLike>;
}

export interface BleGattServerLike {
  connect(): Promise<BleGattServerLike>;
  disconnect(): void;
  getPrimaryService(uuid: string): Promise<BleServiceLike>;
}

export interface BleDeviceLike {
  gatt?: BleGattServerLike;
}

export interface BluetoothLike {
  requestDevice(options: { filters: Array<{ services: string[] }> }): Promise<BleDeviceLike>;
}

function getNavigatorBluetooth(): BluetoothLike | undefined {
  return (globalThis as { navigator?: { bluetooth?: BluetoothLike } }).navigator?.bluetooth;
}

export function isWebBluetoothSupported(): boolean {
  return getNavigatorBluetooth() !== undefined;
}

export class WebBluetoothDriver {
  private device: BleDeviceLike | null = null;
  private txCharacteristic: BleCharacteristicLike | null = null;

  constructor(private readonly bluetooth: BluetoothLike | undefined = getNavigatorBluetooth()) {}

  get isConnected(): boolean {
    return this.txCharacteristic !== null;
  }

  async connect(onReceive?: (packet: MeshPacket) => void): Promise<void> {
    if (!this.bluetooth) {
      throw new Error('Web Bluetooth API is not available in this browser');
    }
    this.device = await this.bluetooth.requestDevice({ filters: [{ services: [MESHTASTIC_SERVICE_UUID] }] });
    const gatt = await this.device.gatt?.connect();
    if (!gatt) {
      throw new Error('Meshtastic device did not expose a GATT server');
    }
    const service = await gatt.getPrimaryService(MESHTASTIC_SERVICE_UUID);
    this.txCharacteristic = await service.getCharacteristic(MESHTASTIC_TX_CHARACTERISTIC_UUID);

    if (onReceive) {
      const rxCharacteristic = await service.getCharacteristic(MESHTASTIC_RX_CHARACTERISTIC_UUID);
      await rxCharacteristic.startNotifications();
      rxCharacteristic.addEventListener('characteristicvaluechanged', (event) => {
        try {
          onReceive(decodePacket(new Uint8Array(event.target.value.buffer)));
        } catch {
          // Malformed notification — drop it, keep listening.
        }
      });
    }
  }

  async send(packet: MeshPacket): Promise<void> {
    if (!this.txCharacteristic) {
      throw new Error('WebBluetoothDriver is not connected');
    }
    await this.txCharacteristic.writeValue(encodePacket(packet));
  }

  disconnect(): void {
    this.device?.gatt?.disconnect();
    this.device = null;
    this.txCharacteristic = null;
  }
}
