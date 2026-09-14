import { describe, it, expect } from 'vitest';
import { encodeTradeOfferText, decodeTradeOfferText, encodeReceiptText, type TradeOffer } from './QrTradeScanner';
import { generateKeypair, createTransaction } from './CryptoLedger';

describe('QrTradeScanner', () => {
  it('round-trips a trade offer through the scan-to-pay text encoding', () => {
    const offer: TradeOffer = { fromPeerId: 'pip', toPeerId: 'morgan', amount: 8, memo: 'tomatoes for bread', offeredAt: Date.now() };
    const text = encodeTradeOfferText(offer);
    expect(text.startsWith('dcg-trade:')).toBe(true);
    expect(decodeTradeOfferText(text)).toEqual(offer);
  });

  it('rejects text that is not a trade offer code', () => {
    expect(() => decodeTradeOfferText('not-a-code')).toThrow(/Not a valid trade offer code/);
  });

  it('rejects a malformed payload missing required fields', () => {
    const bogus = `dcg-trade:${btoa(JSON.stringify({ amount: 5 }))}`;
    expect(() => decodeTradeOfferText(bogus)).toThrow(/malformed/);
  });

  it('encodes a signed transaction receipt distinctly from an offer', async () => {
    const keyPair = await generateKeypair();
    const tx = await createTransaction('pip', 'morgan', 8, '', keyPair, null);
    const receiptText = encodeReceiptText(tx);
    expect(receiptText.startsWith('dcg-trade:receipt:')).toBe(true);
  });
});
