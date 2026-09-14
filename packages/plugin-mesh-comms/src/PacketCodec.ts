// M17 — Compact binary packet codec for the off-grid LoRa/Meshtastic mesh.
// Real LoRa hardware caps payloads at 237 bytes, so every packet type here
// is a hand-rolled TLV-ish binary layout (no CBOR/protobuf dependency
// needed for 4 small, fixed-shape packet types) rather than JSON, which
// would blow past that budget for even a short chat message.
export const LORA_MAX_PAYLOAD_BYTES = 237;

export enum PacketType {
  COMMONS_ALERT = 0x01,
  CARAVAN_DISPATCH = 0x02,
  PEER_HANDSHAKE = 0x03,
  MESH_CHAT = 0x04,
}

export interface CommonsAlertPacket {
  type: PacketType.COMMONS_ALERT;
  severity: 'info' | 'warning' | 'emergency';
  message: string;
  timestamp: number;
}

export interface CaravanDispatchPacket {
  type: PacketType.CARAVAN_DISPATCH;
  senderId: string;
  recipientId: string;
  kilowatts: number;
  timestamp: number;
}

export interface PeerHandshakePacket {
  type: PacketType.PEER_HANDSHAKE;
  peerId: string;
  code: string;
  timestamp: number;
}

export interface MeshChatPacket {
  type: PacketType.MESH_CHAT;
  channel: number;
  senderId: string;
  message: string;
  timestamp: number;
}

export type MeshPacket = CommonsAlertPacket | CaravanDispatchPacket | PeerHandshakePacket | MeshChatPacket;

const SEVERITY_CODES: Record<CommonsAlertPacket['severity'], number> = { info: 0, warning: 1, emergency: 2 };
const SEVERITY_NAMES: CommonsAlertPacket['severity'][] = ['info', 'warning', 'emergency'];

class ByteWriter {
  private bytes: number[] = [];

  u8(value: number): this {
    this.bytes.push(value & 0xff);
    return this;
  }

  u32(value: number): this {
    this.bytes.push((value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff);
    return this;
  }

  /** Fixed-point kilowatts, 1 decimal place, as a signed 16-bit int. */
  kilowattsFixed(value: number): this {
    const fixed = Math.round(value * 10);
    this.bytes.push((fixed >> 8) & 0xff, fixed & 0xff);
    return this;
  }

  str(value: string): this {
    const encoded = new TextEncoder().encode(value);
    if (encoded.length > 255) {
      throw new Error(`String too long for packet: ${value.slice(0, 20)}...`);
    }
    this.bytes.push(encoded.length, ...encoded);
    return this;
  }

  toUint8Array(): Uint8Array {
    return Uint8Array.from(this.bytes);
  }
}

class ByteReader {
  private offset = 0;
  constructor(private readonly bytes: Uint8Array) {}

  u8(): number {
    return this.bytes[this.offset++]!;
  }

  u32(): number {
    const value = (this.bytes[this.offset]! << 24) | (this.bytes[this.offset + 1]! << 16) |
      (this.bytes[this.offset + 2]! << 8) | this.bytes[this.offset + 3]!;
    this.offset += 4;
    return value >>> 0;
  }

  kilowattsFixed(): number {
    const raw = ((this.bytes[this.offset]! << 8) | this.bytes[this.offset + 1]!);
    const signed = raw >= 0x8000 ? raw - 0x10000 : raw;
    this.offset += 2;
    return signed / 10;
  }

  str(): string {
    const length = this.u8();
    const slice = this.bytes.slice(this.offset, this.offset + length);
    this.offset += length;
    return new TextDecoder().decode(slice);
  }
}

function assertBudget(bytes: Uint8Array): Uint8Array {
  if (bytes.length > LORA_MAX_PAYLOAD_BYTES) {
    throw new Error(`Packet exceeds LoRa payload budget: ${bytes.length} > ${LORA_MAX_PAYLOAD_BYTES} bytes`);
  }
  return bytes;
}

export function encodePacket(packet: MeshPacket): Uint8Array {
  const writer = new ByteWriter().u8(packet.type);

  switch (packet.type) {
    case PacketType.COMMONS_ALERT:
      writer.u8(SEVERITY_CODES[packet.severity]).str(packet.message).u32(packet.timestamp);
      break;
    case PacketType.CARAVAN_DISPATCH:
      writer.str(packet.senderId).str(packet.recipientId).kilowattsFixed(packet.kilowatts).u32(packet.timestamp);
      break;
    case PacketType.PEER_HANDSHAKE:
      writer.str(packet.peerId).str(packet.code).u32(packet.timestamp);
      break;
    case PacketType.MESH_CHAT:
      writer.u8(packet.channel).str(packet.senderId).str(packet.message).u32(packet.timestamp);
      break;
  }

  return assertBudget(writer.toUint8Array());
}

export function decodePacket(bytes: Uint8Array): MeshPacket {
  const reader = new ByteReader(bytes);
  const type = reader.u8() as PacketType;

  switch (type) {
    case PacketType.COMMONS_ALERT: {
      const severity = SEVERITY_NAMES[reader.u8()] ?? 'info';
      const message = reader.str();
      const timestamp = reader.u32();
      return { type, severity, message, timestamp };
    }
    case PacketType.CARAVAN_DISPATCH: {
      const senderId = reader.str();
      const recipientId = reader.str();
      const kilowatts = reader.kilowattsFixed();
      const timestamp = reader.u32();
      return { type, senderId, recipientId, kilowatts, timestamp };
    }
    case PacketType.PEER_HANDSHAKE: {
      const peerId = reader.str();
      const code = reader.str();
      const timestamp = reader.u32();
      return { type, peerId, code, timestamp };
    }
    case PacketType.MESH_CHAT: {
      const channel = reader.u8();
      const senderId = reader.str();
      const message = reader.str();
      const timestamp = reader.u32();
      return { type, channel, senderId, message, timestamp };
    }
    default:
      throw new Error(`Unknown mesh packet type: 0x${(type as number).toString(16)}`);
  }
}
