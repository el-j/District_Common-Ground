// M17 — Serverless phone-to-phone data channel. No signaling server exists
// (that would reintroduce a central dependency this epic is explicitly
// avoiding), so the SDP offer/answer exchange happens out-of-band: as a
// short text blob one device shows and the other pastes/scans. Real QR
// rendering is a documented follow-up (see QrTradeScanner.ts's identical
// scoping note in the mutual-credit plugin) — the payload format here
// (base64 JSON) is exactly what a QR encoder would render today.
import { encodePacket, decodePacket, type MeshPacket } from './PacketCodec';

export interface RtcDataChannelLike {
  readyState: string;
  send(data: string | Uint8Array): void;
  addEventListener(type: 'open' | 'message', handler: (event: { data?: unknown }) => void): void;
}

export interface RtcPeerConnectionLike {
  createDataChannel(label: string): RtcDataChannelLike;
  createOffer(): Promise<RTCSessionDescriptionInit>;
  createAnswer(): Promise<RTCSessionDescriptionInit>;
  setLocalDescription(description: RTCSessionDescriptionInit): Promise<void>;
  setRemoteDescription(description: RTCSessionDescriptionInit): Promise<void>;
  localDescription: RTCSessionDescriptionInit | null;
  addEventListener(type: 'datachannel', handler: (event: { channel: RtcDataChannelLike }) => void): void;
  close(): void;
}

export type RtcPeerConnectionFactory = () => RtcPeerConnectionLike;

function defaultFactory(): RtcPeerConnectionLike {
  return new RTCPeerConnection({ iceServers: [] }) as unknown as RtcPeerConnectionLike;
}

export function isWebRtcSupported(): boolean {
  return typeof (globalThis as { RTCPeerConnection?: unknown }).RTCPeerConnection !== 'undefined';
}

/** Encodes an SDP description as a compact text blob suitable for a QR code or manual paste. */
export function encodeSignalText(description: RTCSessionDescriptionInit): string {
  return btoa(JSON.stringify(description));
}

export function decodeSignalText(text: string): RTCSessionDescriptionInit {
  return JSON.parse(atob(text)) as RTCSessionDescriptionInit;
}

export class WebRtcP2pDriver {
  private connection: RtcPeerConnectionLike | null = null;
  private channel: RtcDataChannelLike | null = null;

  constructor(private readonly factory: RtcPeerConnectionFactory = defaultFactory) {}

  get isConnected(): boolean {
    return this.channel?.readyState === 'open';
  }

  /** Device A: creates the offer text to show/scan on device B. */
  async createOfferText(onReceive?: (packet: MeshPacket) => void): Promise<string> {
    const connection = this.factory();
    this.connection = connection;
    const channel = connection.createDataChannel('district-cg-mesh');
    this.bindChannel(channel, onReceive);

    const offer = await connection.createOffer();
    await connection.setLocalDescription(offer);
    return encodeSignalText(connection.localDescription ?? offer);
  }

  /** Device B: consumes A's offer text, returns the answer text to relay back. */
  async acceptOfferText(offerText: string, onReceive?: (packet: MeshPacket) => void): Promise<string> {
    const connection = this.factory();
    this.connection = connection;
    connection.addEventListener('datachannel', (event) => {
      this.bindChannel(event.channel, onReceive);
    });

    await connection.setRemoteDescription(decodeSignalText(offerText));
    const answer = await connection.createAnswer();
    await connection.setLocalDescription(answer);
    return encodeSignalText(connection.localDescription ?? answer);
  }

  /** Device A: consumes B's answer text to complete the handshake. */
  async acceptAnswerText(answerText: string): Promise<void> {
    if (!this.connection) {
      throw new Error('No offer has been created on this driver yet');
    }
    await this.connection.setRemoteDescription(decodeSignalText(answerText));
  }

  private bindChannel(channel: RtcDataChannelLike, onReceive?: (packet: MeshPacket) => void): void {
    this.channel = channel;
    if (!onReceive) return;
    channel.addEventListener('message', (event) => {
      try {
        const data = event.data instanceof Uint8Array ? event.data : new Uint8Array(event.data as ArrayBufferLike);
        onReceive(decodePacket(data));
      } catch {
        // Malformed frame — drop it, keep listening.
      }
    });
  }

  send(packet: MeshPacket): void {
    if (!this.channel || this.channel.readyState !== 'open') {
      throw new Error('WebRtcP2pDriver data channel is not open');
    }
    this.channel.send(encodePacket(packet));
  }

  close(): void {
    this.connection?.close();
    this.connection = null;
    this.channel = null;
  }
}
