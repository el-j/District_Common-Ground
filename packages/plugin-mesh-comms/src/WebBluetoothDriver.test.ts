import { describe, it, expect, vi } from 'vitest';
import {
  WebBluetoothDriver, isWebBluetoothSupported, MESHTASTIC_SERVICE_UUID,
  MESHTASTIC_TX_CHARACTERISTIC_UUID, type BluetoothLike, type BleCharacteristicLike,
} from './WebBluetoothDriver';
import { PacketType, encodePacket, type MeshPacket } from './PacketCodec';

function makeFakeDevice() {
  const writtenChunks: Uint8Array[] = [];
  const txCharacteristic: BleCharacteristicLike = {
    writeValue: async (data) => { writtenChunks.push(data); },
    startNotifications: async () => {},
    addEventListener: () => {},
  };
  const gatt = {
    connect: async () => gatt,
    disconnect: vi.fn(),
    getPrimaryService: async (uuid: string) => ({
      getCharacteristic: async (charUuid: string) => {
        expect(uuid).toBe(MESHTASTIC_SERVICE_UUID);
        expect([MESHTASTIC_TX_CHARACTERISTIC_UUID]).toContain(charUuid);
        return txCharacteristic;
      },
    }),
  };
  return { gatt: { connect: gatt.connect, disconnect: gatt.disconnect, getPrimaryService: gatt.getPrimaryService }, writtenChunks };
}

describe('WebBluetoothDriver', () => {
  it('reports unsupported when navigator.bluetooth is absent', () => {
    expect(isWebBluetoothSupported()).toBe(false);
  });

  it('connects via GATT and reports connected once the TX characteristic resolves', async () => {
    const { gatt } = makeFakeDevice();
    const bluetooth: BluetoothLike = { requestDevice: async () => ({ gatt }) };
    const driver = new WebBluetoothDriver(bluetooth);
    await driver.connect();
    expect(driver.isConnected).toBe(true);
  });

  it('encodes and writes a packet via characteristic.writeValue on send', async () => {
    const { gatt, writtenChunks } = makeFakeDevice();
    const bluetooth: BluetoothLike = { requestDevice: async () => ({ gatt }) };
    const driver = new WebBluetoothDriver(bluetooth);
    await driver.connect();

    const packet: MeshPacket = { type: PacketType.COMMONS_ALERT, severity: 'warning', message: 'Blackout on 5th', timestamp: 1 };
    await driver.send(packet);
    expect(writtenChunks).toEqual([encodePacket(packet)]);
  });

  it('throws a clear error when Web Bluetooth is unavailable', async () => {
    const driver = new WebBluetoothDriver(undefined);
    await expect(driver.connect()).rejects.toThrow(/Web Bluetooth API is not available/);
  });

  it('throws on send before connect', async () => {
    const driver = new WebBluetoothDriver({ requestDevice: async () => ({}) });
    await expect(driver.send({ type: PacketType.MESH_CHAT, channel: 0, senderId: 'x', message: 'y', timestamp: 1 }))
      .rejects.toThrow(/not connected/);
  });

  it('disconnect resets connection state and calls gatt.disconnect', async () => {
    const { gatt } = makeFakeDevice();
    const bluetooth: BluetoothLike = { requestDevice: async () => ({ gatt }) };
    const driver = new WebBluetoothDriver(bluetooth);
    await driver.connect();
    driver.disconnect();
    expect(gatt.disconnect).toHaveBeenCalled();
    expect(driver.isConnected).toBe(false);
  });
});
