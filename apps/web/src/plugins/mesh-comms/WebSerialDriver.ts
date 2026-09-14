// M17 — Web Serial bridge to a Meshtastic-class LoRa radio over USB.
// Scoping note: this repo/CI has no physical LoRa hardware to integration
// test against. `WebSerialDriver` is written against the real Web Serial
// API shape (`navigator.serial`, `SerialPort.open/readable/writable`) and
// is feature-detected everywhere, but its correctness against an actual
// radio is unverified — tests here exercise the connect/send/receive
// contract against a minimal fake `navigator.serial`, not real hardware.
import { encodePacket, decodePacket, type MeshPacket } from './PacketCodec';

export const MESHTASTIC_BAUD_RATE = 115_200;

export interface SerialPortLike {
  open(options: { baudRate: number }): Promise<void>;
  close(): Promise<void>;
  readable: ReadableStream<Uint8Array> | null;
  writable: WritableStream<Uint8Array> | null;
}

export interface SerialLike {
  requestPort(): Promise<SerialPortLike>;
  getPorts(): Promise<SerialPortLike[]>;
}

function getNavigatorSerial(): SerialLike | undefined {
  return (globalThis as { navigator?: { serial?: SerialLike } }).navigator?.serial;
}

export function isWebSerialSupported(): boolean {
  return getNavigatorSerial() !== undefined;
}

export class WebSerialDriver {
  private port: SerialPortLike | null = null;
  private writer: WritableStreamDefaultWriter<Uint8Array> | null = null;
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private readLoopAbort = false;

  constructor(private readonly serial: SerialLike | undefined = getNavigatorSerial()) {}

  get isConnected(): boolean {
    return this.port !== null;
  }

  async connect(onReceive?: (packet: MeshPacket) => void): Promise<void> {
    if (!this.serial) {
      throw new Error('Web Serial API is not available in this browser');
    }
    this.port = await this.serial.requestPort();
    await this.port.open({ baudRate: MESHTASTIC_BAUD_RATE });
    this.writer = this.port.writable?.getWriter() ?? null;

    if (onReceive && this.port.readable) {
      this.reader = this.port.readable.getReader();
      this.readLoopAbort = false;
      void this.runReadLoop(onReceive);
    }
  }

  private async runReadLoop(onReceive: (packet: MeshPacket) => void): Promise<void> {
    while (!this.readLoopAbort && this.reader) {
      const { value, done } = await this.reader.read();
      if (done) return;
      if (value) {
        try {
          onReceive(decodePacket(value));
        } catch {
          // Malformed/partial frame — drop it, keep listening.
        }
      }
    }
  }

  async send(packet: MeshPacket): Promise<void> {
    if (!this.writer) {
      throw new Error('WebSerialDriver is not connected');
    }
    await this.writer.write(encodePacket(packet));
  }

  async disconnect(): Promise<void> {
    this.readLoopAbort = true;
    await this.reader?.cancel().catch(() => undefined);
    await this.writer?.close().catch(() => undefined);
    await this.port?.close().catch(() => undefined);
    this.reader = null;
    this.writer = null;
    this.port = null;
  }
}
