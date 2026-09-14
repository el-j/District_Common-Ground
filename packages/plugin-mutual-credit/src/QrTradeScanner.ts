// M17 — Offline scan-to-pay handshake.
// Scoping note: no camera-scanning infra or QR encoder library exists in
// this project (same decision already made for PeerVerification.ts in M16
// and for the WebRTC signaling text in mesh-comms/WebRtcP2pDriver.ts). A
// trade offer is encoded as a short base64 text blob — exactly the payload
// a real QR encoder would render, and a real scanner would decode back to
// this same shape — so swapping in a camera/QR library later only touches
// the transport, not this format or CreditTransferModal.ts's calling code.
import type { MutualCreditTransaction } from './CryptoLedger';

export interface TradeOffer {
  fromPeerId: string;
  toPeerId: string;
  amount: number;
  memo: string;
  offeredAt: number;
}

const QR_PAYLOAD_PREFIX = 'dcg-trade:';

export function encodeTradeOfferText(offer: TradeOffer): string {
  return `${QR_PAYLOAD_PREFIX}${btoa(JSON.stringify(offer))}`;
}

export function decodeTradeOfferText(text: string): TradeOffer {
  const trimmed = text.trim();
  if (!trimmed.startsWith(QR_PAYLOAD_PREFIX)) {
    throw new Error('Not a valid trade offer code');
  }
  const parsed = JSON.parse(atob(trimmed.slice(QR_PAYLOAD_PREFIX.length))) as TradeOffer;
  if (!parsed.fromPeerId || !parsed.toPeerId || typeof parsed.amount !== 'number') {
    throw new Error('Trade offer code is malformed');
  }
  return parsed;
}

/** Encodes a signed receipt for display/relay once a trade transaction has been committed. */
export function encodeReceiptText(tx: MutualCreditTransaction): string {
  return `${QR_PAYLOAD_PREFIX}receipt:${btoa(JSON.stringify(tx))}`;
}
