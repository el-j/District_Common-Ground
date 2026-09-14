import { describe, it, expect, vi } from 'vitest';
import { WebSerialDriver, isWebSerialSupported, MESHTASTIC_BAUD_RATE, type SerialLike, type SerialPortLike } from './WebSerialDriver';
import { PacketType, encodePacket, type MeshPacket } from './PacketCodec';

function makeFakePort(): SerialPortLike & { writtenChunks: Uint8Array[] } {
  const writtenChunks: Uint8Array[] = [];
  return {
    writtenChunks,
    async open() {},
    async close() {},
    writable: {
      getWriter: () => ({
        write: async (chunk: Uint8Array) => { writtenChunks.push(chunk); },
        close: async () => {},
      }),
    } as unknown as WritableStream<Uint8Array>,
    readable: null,
  };
}

describe('WebSerialDriver', () => {
  it('reports unsupported when navigator.serial is absent', () => {
    expect(isWebSerialSupported()).toBe(false);
  });

  it('opens the port at the Meshtastic baud rate and reports connected', async () => {
    const port = makeFakePort();
    const openSpy = vi.spyOn(port, 'open');
    const serial: SerialLike = { requestPort: async () => port, getPorts: async () => [port] };
    const driver = new WebSerialDriver(serial);

    await driver.connect();
    expect(openSpy).toHaveBeenCalledWith({ baudRate: MESHTASTIC_BAUD_RATE });
    expect(driver.isConnected).toBe(true);
  });

  it('encodes and writes a packet to the port writable stream on send', async () => {
    const port = makeFakePort();
    const serial: SerialLike = { requestPort: async () => port, getPorts: async () => [port] };
    const driver = new WebSerialDriver(serial);
    await driver.connect();

    const packet: MeshPacket = { type: PacketType.MESH_CHAT, channel: 1, senderId: 'pip', message: 'hi', timestamp: 1 };
    await driver.send(packet);

    expect(port.writtenChunks).toHaveLength(1);
    expect(port.writtenChunks[0]).toEqual(encodePacket(packet));
  });

  it('throws on send before connect', async () => {
    const driver = new WebSerialDriver({ requestPort: async () => makeFakePort(), getPorts: async () => [] });
    await expect(driver.send({ type: PacketType.MESH_CHAT, channel: 0, senderId: 'x', message: 'y', timestamp: 1 }))
      .rejects.toThrow(/not connected/);
  });

  it('throws a clear error when Web Serial is unavailable', async () => {
    const driver = new WebSerialDriver(undefined);
    await expect(driver.connect()).rejects.toThrow(/Web Serial API is not available/);
  });

  it('disconnect clears connection state', async () => {
    const port = makeFakePort();
    const serial: SerialLike = { requestPort: async () => port, getPorts: async () => [port] };
    const driver = new WebSerialDriver(serial);
    await driver.connect();
    await driver.disconnect();
    expect(driver.isConnected).toBe(false);
  });
});
