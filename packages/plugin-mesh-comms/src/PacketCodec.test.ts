import { describe, it, expect } from 'vitest';
import { encodePacket, decodePacket, PacketType, LORA_MAX_PAYLOAD_BYTES } from './PacketCodec';
import type { MeshPacket } from './PacketCodec';

describe('PacketCodec — Test 17.3 (LoRa Serial Codec)', () => {
  it('encodes a 20kW caravan dispatch under the 200-byte LoRa budget and decodes it identically', () => {
    const packet: MeshPacket = {
      type: PacketType.CARAVAN_DISPATCH,
      senderId: 'pip-042',
      recipientId: 'morgan-017',
      kilowatts: 20,
      timestamp: 1_757_800_000,
    };

    const bytes = encodePacket(packet);
    expect(bytes.length).toBeLessThan(200);
    expect(bytes.length).toBeLessThanOrEqual(LORA_MAX_PAYLOAD_BYTES);
    expect(decodePacket(bytes)).toEqual(packet);
  });

  it('round-trips a commons alert with a warning severity', () => {
    const packet: MeshPacket = {
      type: PacketType.COMMONS_ALERT,
      severity: 'emergency',
      message: 'Water main burst on 5th Street',
      timestamp: 1_757_800_500,
    };
    expect(decodePacket(encodePacket(packet))).toEqual(packet);
  });

  it('round-trips a peer handshake', () => {
    const packet: MeshPacket = {
      type: PacketType.PEER_HANDSHAKE,
      peerId: 'arthur-003',
      code: 'solar-bread-solidarity-tree',
      timestamp: 1_757_800_600,
    };
    expect(decodePacket(encodePacket(packet))).toEqual(packet);
  });

  it('round-trips a mesh chat message', () => {
    const packet: MeshPacket = {
      type: PacketType.MESH_CHAT,
      channel: 2,
      senderId: 'leo',
      message: 'Anyone have a spare tarp for the garden beds?',
      timestamp: 1_757_800_700,
    };
    expect(decodePacket(encodePacket(packet))).toEqual(packet);
  });

  it('preserves fractional kilowatts to one decimal place', () => {
    const packet: MeshPacket = {
      type: PacketType.CARAVAN_DISPATCH,
      senderId: 'a', recipientId: 'b', kilowatts: 7.3, timestamp: 1,
    };
    expect((decodePacket(encodePacket(packet)) as typeof packet).kilowatts).toBe(7.3);
  });

  it('throws rather than silently truncating a packet that exceeds the LoRa payload budget', () => {
    const packet: MeshPacket = {
      type: PacketType.MESH_CHAT,
      channel: 0,
      senderId: 'x',
      message: 'a'.repeat(255),
      timestamp: 1,
    };
    expect(() => encodePacket(packet)).toThrow(/LoRa payload budget/);
  });

  it('rejects an unknown packet type on decode instead of returning a malformed packet', () => {
    expect(() => decodePacket(Uint8Array.from([0xff, 0, 0]))).toThrow(/Unknown mesh packet type/);
  });
});
