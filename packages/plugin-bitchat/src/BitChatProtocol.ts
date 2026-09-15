// M19 — WebRTC RTCDataChannel connection pool for bitchat.free, with
// ephemeral X25519 key agreement (end-to-end encryption of every data
// channel message via AES-GCM) and a Hashcash proof-of-work gate on new
// connection handshakes. No signaling server exists — the offer/answer
// exchange happens out-of-band (paste, or relayed automatically over
// SubnetBeacon's BroadcastChannel for same-device peers — see index.ts),
// the exact same boundary M17's WebRtcP2pDriver.ts already drew, generalized
// here into a multi-peer pool instead of a single 1:1 connection.
import { solveProofOfWork, verifyProofOfWork, DEFAULT_DIFFICULTY_BITS } from './ProofOfWork';

export interface RtcDataChannelLike {
  readyState: string;
  send(data: string): void;
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

export interface SignalingEnvelope {
  sdp: RTCSessionDescriptionInit;
  ephemeralPublicKey: string;
  powNonce: number;
}

function toBase64(bytes: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)));
}

function fromBase64(text: string): Uint8Array<ArrayBuffer> {
  const binary = atob(text);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Deterministic from the offer/answer's own content, so both sides compute the same PoW challenge independently. */
function powChallengeFor(sdp: RTCSessionDescriptionInit): string {
  return `${sdp.type ?? ''}:${(sdp.sdp ?? '').length}`;
}

async function deriveSharedKey(privateKey: CryptoKey, peerPublicKey: CryptoKey): Promise<CryptoKey> {
  const bits = await crypto.subtle.deriveBits({ name: 'X25519', public: peerPublicKey } as EcdhKeyDeriveParams, privateKey, 256);
  return crypto.subtle.importKey('raw', bits, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

interface PoolEntry {
  connection: RtcPeerConnectionLike;
  channel: RtcDataChannelLike | null;
  ephemeralKeyPair: CryptoKeyPair;
  sharedKey: CryptoKey | null;
}

export class BitChatConnectionPool {
  private readonly connections = new Map<string, PoolEntry>();

  constructor(
    private readonly onReceive: (peerId: string, plaintext: string) => void,
    private readonly factory: RtcPeerConnectionFactory = defaultFactory,
    private readonly difficultyBits: number = DEFAULT_DIFFICULTY_BITS,
  ) {}

  isConnected(peerId: string): boolean {
    return this.connections.get(peerId)?.channel?.readyState === 'open';
  }

  private async newEphemeralKeyPair(): Promise<CryptoKeyPair> {
    return (await crypto.subtle.generateKey({ name: 'X25519' }, true, ['deriveBits'])) as CryptoKeyPair;
  }

  private bindChannel(peerId: string, entry: PoolEntry, channel: RtcDataChannelLike): void {
    entry.channel = channel;
    channel.addEventListener('message', (event) => {
      void this.handleIncoming(peerId, entry, event.data);
    });
  }

  private async handleIncoming(peerId: string, entry: PoolEntry, data: unknown): Promise<void> {
    if (!entry.sharedKey || typeof data !== 'string') return;
    try {
      const raw = fromBase64(data);
      const iv = raw.slice(0, 12);
      const ciphertext = raw.slice(12);
      const plaintextBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, entry.sharedKey, ciphertext);
      this.onReceive(peerId, new TextDecoder().decode(plaintextBuf));
    } catch {
      // Undecryptable/malformed frame — drop it, keep the channel open.
    }
  }

  /** Device A: begin a handshake with peerId, returning the offer envelope to relay/paste to device B. */
  async createOfferEnvelope(peerId: string): Promise<SignalingEnvelope> {
    const connection = this.factory();
    const ephemeralKeyPair = await this.newEphemeralKeyPair();
    const entry: PoolEntry = { connection, channel: null, ephemeralKeyPair, sharedKey: null };
    this.connections.set(peerId, entry);

    const channel = connection.createDataChannel('district-cg-bitchat');
    this.bindChannel(peerId, entry, channel);

    const offer = await connection.createOffer();
    await connection.setLocalDescription(offer);
    const sdp = connection.localDescription ?? offer;

    const rawPublicKey = await crypto.subtle.exportKey('raw', ephemeralKeyPair.publicKey);
    const { nonce } = await solveProofOfWork(powChallengeFor(sdp), this.difficultyBits);
    return { sdp, ephemeralPublicKey: toBase64(rawPublicKey), powNonce: nonce };
  }

  /** Device B: consumes A's offer envelope; rejects it outright if the PoW is invalid. Returns the answer envelope. */
  async acceptOfferEnvelope(peerId: string, envelope: SignalingEnvelope): Promise<SignalingEnvelope> {
    const valid = await verifyProofOfWork(powChallengeFor(envelope.sdp), envelope.powNonce, this.difficultyBits);
    if (!valid) {
      throw new Error(`Rejected handshake from ${peerId}: invalid proof-of-work`);
    }

    const connection = this.factory();
    const ephemeralKeyPair = await this.newEphemeralKeyPair();
    const entry: PoolEntry = { connection, channel: null, ephemeralKeyPair, sharedKey: null };
    this.connections.set(peerId, entry);

    connection.addEventListener('datachannel', (event) => this.bindChannel(peerId, entry, event.channel));

    await connection.setRemoteDescription(envelope.sdp);
    const peerPublicKey = await crypto.subtle.importKey('raw', fromBase64(envelope.ephemeralPublicKey), { name: 'X25519' }, true, []);
    entry.sharedKey = await deriveSharedKey(ephemeralKeyPair.privateKey, peerPublicKey);

    const answer = await connection.createAnswer();
    await connection.setLocalDescription(answer);
    const sdp = connection.localDescription ?? answer;

    const rawPublicKey = await crypto.subtle.exportKey('raw', ephemeralKeyPair.publicKey);
    const { nonce } = await solveProofOfWork(powChallengeFor(sdp), this.difficultyBits);
    return { sdp, ephemeralPublicKey: toBase64(rawPublicKey), powNonce: nonce };
  }

  /** Device A: consumes B's answer envelope to complete the handshake and derive the shared encryption key. */
  async acceptAnswerEnvelope(peerId: string, envelope: SignalingEnvelope): Promise<void> {
    const entry = this.connections.get(peerId);
    if (!entry) throw new Error(`No pending offer for peer ${peerId}`);

    const valid = await verifyProofOfWork(powChallengeFor(envelope.sdp), envelope.powNonce, this.difficultyBits);
    if (!valid) throw new Error(`Rejected handshake from ${peerId}: invalid proof-of-work`);

    await entry.connection.setRemoteDescription(envelope.sdp);
    const peerPublicKey = await crypto.subtle.importKey('raw', fromBase64(envelope.ephemeralPublicKey), { name: 'X25519' }, true, []);
    entry.sharedKey = await deriveSharedKey(entry.ephemeralKeyPair.privateKey, peerPublicKey);
  }

  async send(peerId: string, plaintext: string): Promise<void> {
    const entry = this.connections.get(peerId);
    if (!entry?.channel || entry.channel.readyState !== 'open') {
      throw new Error(`BitChatConnectionPool has no open channel to ${peerId}`);
    }
    if (!entry.sharedKey) {
      throw new Error(`No shared encryption key established with ${peerId} yet`);
    }
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, entry.sharedKey, new TextEncoder().encode(plaintext));
    const framed = new Uint8Array(iv.length + ciphertext.byteLength);
    framed.set(iv, 0);
    framed.set(new Uint8Array(ciphertext), iv.length);
    entry.channel.send(toBase64(framed.buffer));
  }

  close(peerId: string): void {
    const entry = this.connections.get(peerId);
    entry?.connection.close();
    this.connections.delete(peerId);
  }

  activePeerIds(): string[] {
    return Array.from(this.connections.entries())
      .filter(([, entry]) => entry.channel?.readyState === 'open')
      .map(([peerId]) => peerId);
  }
}
