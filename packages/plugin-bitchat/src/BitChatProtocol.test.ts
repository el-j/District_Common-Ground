import { describe, it, expect, vi } from 'vitest';
import { BitChatConnectionPool, isWebRtcSupported, type RtcPeerConnectionLike, type RtcDataChannelLike, type SignalingEnvelope } from './BitChatProtocol';

type FakeChannel = RtcDataChannelLike & { sent: string[]; handlers: Record<string, (e: { data?: unknown }) => void> };

function makeFakeChannel(): FakeChannel {
  const handlers: Record<string, (e: { data?: unknown }) => void> = {};
  const channel: FakeChannel = {
    readyState: 'open',
    sent: [],
    handlers,
    send(data: string) {
      channel.sent.push(data);
    },
    addEventListener(type, handler) {
      handlers[type] = handler;
    },
  };
  return channel;
}

/** Wires two fake channels so sending on one delivers a 'message' event on the other, like a real live wire. */
function link(a: FakeChannel, b: FakeChannel): void {
  a.send = (data: string) => {
    a.sent.push(data);
    b.handlers['message']?.({ data });
  };
  b.send = (data: string) => {
    b.sent.push(data);
    a.handlers['message']?.({ data });
  };
}

function makeOffererConnection(channel: RtcDataChannelLike): RtcPeerConnectionLike {
  let localDescription: RTCSessionDescriptionInit | null = null;
  return {
    createDataChannel: () => channel,
    async createOffer() {
      return { type: 'offer', sdp: 'v=0 offer-sdp' };
    },
    async createAnswer() {
      throw new Error('offerer does not create an answer');
    },
    async setLocalDescription(description) {
      localDescription = description;
    },
    async setRemoteDescription() {},
    get localDescription() {
      return localDescription;
    },
    addEventListener: () => {},
    close: vi.fn(),
  };
}

function makeCalleeConnection(channel: RtcDataChannelLike): RtcPeerConnectionLike {
  let localDescription: RTCSessionDescriptionInit | null = null;
  let dataChannelHandler: ((event: { channel: RtcDataChannelLike }) => void) | null = null;
  return {
    createDataChannel: () => {
      throw new Error('callee should not create its own data channel');
    },
    async createOffer() {
      throw new Error('callee does not create an offer');
    },
    async createAnswer() {
      return { type: 'answer', sdp: 'v=0 answer-sdp-longer' };
    },
    async setLocalDescription(description) {
      localDescription = description;
    },
    async setRemoteDescription() {
      dataChannelHandler?.({ channel });
    },
    get localDescription() {
      return localDescription;
    },
    addEventListener: (type, handler) => {
      if (type === 'datachannel') dataChannelHandler = handler;
    },
    close: vi.fn(),
  };
}

/** The channel 'message' handler fires the async decrypt fire-and-forget (real WebRTC delivery
 *  is inherently async, and Node's WebCrypto AES-GCM ops resolve via the threadpool rather than
 *  a plain microtask), so tests poll for the expected delivery instead of assuming a fixed
 *  number of ticks is always enough under load. */
async function waitUntil(predicate: () => boolean, timeoutMs = 2000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!predicate()) {
    if (Date.now() > deadline) throw new Error('waitUntil: condition was never met');
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}

async function establishConnectedPools(difficultyBits = 4) {
  const channelA = makeFakeChannel();
  const channelB = makeFakeChannel();
  link(channelA, channelB);

  const receivedByA: Array<[string, string]> = [];
  const receivedByB: Array<[string, string]> = [];
  const poolA = new BitChatConnectionPool((peerId, msg) => receivedByA.push([peerId, msg]), () => makeOffererConnection(channelA), difficultyBits);
  const poolB = new BitChatConnectionPool((peerId, msg) => receivedByB.push([peerId, msg]), () => makeCalleeConnection(channelB), difficultyBits);

  const offerEnvelope = await poolA.createOfferEnvelope('peer-b');
  const answerEnvelope = await poolB.acceptOfferEnvelope('peer-a', offerEnvelope);
  await poolA.acceptAnswerEnvelope('peer-b', answerEnvelope);

  return { poolA, poolB, receivedByA, receivedByB, offerEnvelope, answerEnvelope, channelA, channelB };
}

describe('isWebRtcSupported', () => {
  it('is false when RTCPeerConnection is absent', () => {
    expect(isWebRtcSupported()).toBe(false);
  });
});

describe('BitChatConnectionPool', () => {
  it('completes a full offer/answer handshake and both sides report the channel open', async () => {
    const { poolA, poolB } = await establishConnectedPools();
    expect(poolA.isConnected('peer-b')).toBe(true);
    expect(poolB.isConnected('peer-a')).toBe(true);
  });

  it('encrypts a message end-to-end via the derived shared key — the receiver decrypts it correctly', async () => {
    const { poolA, receivedByB } = await establishConnectedPools();

    await poolA.send('peer-b', 'mutual aid dispatch: need 3 volunteers at the corner grocer');
    await waitUntil(() => receivedByB.length > 0);

    expect(receivedByB).toEqual([['peer-a', 'mutual aid dispatch: need 3 volunteers at the corner grocer']]);
  });

  it('supports bidirectional messaging over the same pool of connections', async () => {
    const { poolB, receivedByA } = await establishConnectedPools();
    await poolB.send('peer-a', 'copy that, en route');
    await waitUntil(() => receivedByA.length > 0);
    expect(receivedByA).toEqual([['peer-b', 'copy that, en route']]);
  });

  it('never sends plaintext over the wire — only ciphertext hits the data channel', async () => {
    const { poolA, channelA } = await establishConnectedPools();
    const plaintext = 'this must not appear on the wire in the clear';
    await poolA.send('peer-b', plaintext);
    expect(channelA.sent).toHaveLength(1);
    expect(channelA.sent[0]).not.toContain(plaintext);
  });

  it('Test 19.4 (PoW Anti-Spam Gate): the callee rejects an offer envelope with an invalid proof-of-work', async () => {
    const channelA = makeFakeChannel();
    const channelB = makeFakeChannel();
    const poolA = new BitChatConnectionPool(vi.fn(), () => makeOffererConnection(channelA), 4);
    const poolB = new BitChatConnectionPool(vi.fn(), () => makeCalleeConnection(channelB), 20);

    const offerEnvelope = await poolA.createOfferEnvelope('peer-b');
    await expect(poolB.acceptOfferEnvelope('peer-a', offerEnvelope)).rejects.toThrow(/proof-of-work/);
  });

  it('Test 19.4 (PoW Anti-Spam Gate): the offerer rejects an answer envelope with a forged proof-of-work', async () => {
    const channelA = makeFakeChannel();
    const channelB = makeFakeChannel();
    link(channelA, channelB);
    const poolA = new BitChatConnectionPool(vi.fn(), () => makeOffererConnection(channelA), 4);
    const poolB = new BitChatConnectionPool(vi.fn(), () => makeCalleeConnection(channelB), 4);

    const offerEnvelope = await poolA.createOfferEnvelope('peer-b');
    const answerEnvelope = await poolB.acceptOfferEnvelope('peer-a', offerEnvelope);
    const forgedAnswer: SignalingEnvelope = { ...answerEnvelope, powNonce: 0 };

    await expect(poolA.acceptAnswerEnvelope('peer-b', forgedAnswer)).rejects.toThrow(/proof-of-work/);
  });

  it('throws sending to a peer with no established connection', async () => {
    const pool = new BitChatConnectionPool(vi.fn(), () => makeOffererConnection(makeFakeChannel()), 4);
    await expect(pool.send('ghost', 'hi')).rejects.toThrow(/no open channel/i);
  });

  it('close() tears down the connection and it no longer appears as an active peer', async () => {
    const { poolA } = await establishConnectedPools();
    expect(poolA.activePeerIds()).toEqual(['peer-b']);
    poolA.close('peer-b');
    expect(poolA.activePeerIds()).toEqual([]);
  });
});
