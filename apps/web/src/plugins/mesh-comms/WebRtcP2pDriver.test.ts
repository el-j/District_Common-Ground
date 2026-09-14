import { describe, it, expect, vi } from 'vitest';
import {
  WebRtcP2pDriver, isWebRtcSupported, encodeSignalText, decodeSignalText,
  type RtcPeerConnectionLike, type RtcDataChannelLike,
} from './WebRtcP2pDriver';
import { PacketType, encodePacket, type MeshPacket } from './PacketCodec';

function makeFakeChannel(): RtcDataChannelLike & { sent: unknown[]; handlers: Record<string, (e: { data?: unknown }) => void> } {
  const handlers: Record<string, (e: { data?: unknown }) => void> = {};
  return {
    readyState: 'open',
    sent: [],
    handlers,
    send(data) { (this as { sent: unknown[] }).sent.push(data); },
    addEventListener(type, handler) { handlers[type] = handler; },
  };
}

function makeFakeConnection(channel: RtcDataChannelLike): RtcPeerConnectionLike {
  let localDescription: RTCSessionDescriptionInit | null = null;
  const eventHandlers: Record<string, (e: { channel: RtcDataChannelLike }) => void> = {};
  return {
    createDataChannel: () => channel,
    async createOffer() { return { type: 'offer', sdp: 'fake-offer-sdp' }; },
    async createAnswer() { return { type: 'answer', sdp: 'fake-answer-sdp' }; },
    async setLocalDescription(description: RTCSessionDescriptionInit) { localDescription = description; },
    async setRemoteDescription() {},
    get localDescription() { return localDescription; },
    addEventListener: (type: string, handler: (e: { channel: RtcDataChannelLike }) => void) => { eventHandlers[type] = handler; },
    close: vi.fn(),
    // test-only helper to fire the datachannel event
    __fireDataChannel(ch: RtcDataChannelLike) { eventHandlers['datachannel']?.({ channel: ch }); },
  } as unknown as RtcPeerConnectionLike & { __fireDataChannel: (ch: RtcDataChannelLike) => void };
}

describe('WebRtcP2pDriver — signaling text encoding', () => {
  it('round-trips an SDP description through the QR-friendly text encoding', () => {
    const description: RTCSessionDescriptionInit = { type: 'offer', sdp: 'v=0\r\n...' };
    expect(decodeSignalText(encodeSignalText(description))).toEqual(description);
  });

  it('reports unsupported when RTCPeerConnection is absent', () => {
    expect(isWebRtcSupported()).toBe(false);
  });
});

describe('WebRtcP2pDriver — handshake and messaging', () => {
  it('device A creates an offer text and device B accepts it, producing an answer text', async () => {
    const channelA = makeFakeChannel();
    const connectionA = makeFakeConnection(channelA);
    const driverA = new WebRtcP2pDriver(() => connectionA);

    const offerText = await driverA.createOfferText();
    const decodedOffer = decodeSignalText(offerText);
    expect(decodedOffer.type).toBe('offer');

    const channelB = makeFakeChannel();
    const connectionB = makeFakeConnection(channelB);
    const driverB = new WebRtcP2pDriver(() => connectionB);

    const answerText = await driverB.acceptOfferText(offerText);
    expect(decodeSignalText(answerText).type).toBe('answer');

    await driverA.acceptAnswerText(answerText);
    expect(driverA.isConnected).toBe(true);
  });

  it('acceptAnswerText throws if no offer was created on this driver', async () => {
    const driver = new WebRtcP2pDriver(() => makeFakeConnection(makeFakeChannel()));
    await expect(driver.acceptAnswerText('does-not-matter')).rejects.toThrow(/No offer has been created/);
  });

  it('send() writes an encoded packet to the open data channel', async () => {
    const channel = makeFakeChannel();
    const driver = new WebRtcP2pDriver(() => makeFakeConnection(channel));
    await driver.createOfferText();

    const packet: MeshPacket = { type: PacketType.MESH_CHAT, channel: 0, senderId: 'pip', message: 'hi', timestamp: 1 };
    driver.send(packet);
    expect(channel.sent).toEqual([encodePacket(packet)]);
  });

  it('send() throws when the data channel is not open', async () => {
    const channel = makeFakeChannel();
    channel.readyState = 'connecting';
    const driver = new WebRtcP2pDriver(() => makeFakeConnection(channel));
    await driver.createOfferText();
    expect(() => driver.send({ type: PacketType.MESH_CHAT, channel: 0, senderId: 'x', message: 'y', timestamp: 1 }))
      .toThrow(/not open/);
  });

  it('delivers a received packet from the bound channel to the onReceive callback', async () => {
    const channel = makeFakeChannel();
    const driver = new WebRtcP2pDriver(() => makeFakeConnection(channel));
    const received: MeshPacket[] = [];
    await driver.createOfferText((packet) => received.push(packet));

    const packet: MeshPacket = { type: PacketType.COMMONS_ALERT, severity: 'info', message: 'test', timestamp: 1 };
    channel.handlers['message']?.({ data: encodePacket(packet) });
    expect(received).toEqual([packet]);
  });
});
