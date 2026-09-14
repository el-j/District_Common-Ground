import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generateKeypair, createTransaction, verifyTransactionSignature,
  verifyChainLinkage, computeBalances, MutualCreditLedger,
} from './CryptoLedger';

describe('CryptoLedger — Test 17.4 (Zero-Server P2P Transaction)', () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
  });

  it('signs a 15 ST mutual-aid credit transaction offline and its signature validates', async () => {
    const keyPair = await generateKeypair();
    const tx = await createTransaction('pip', 'morgan', 15, 'helped move furniture', keyPair, null);

    expect(tx.amount).toBe(15);
    const valid = await verifyTransactionSignature(tx, keyPair.publicKey);
    expect(valid).toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('fails verification if the amount is tampered with after signing', async () => {
    const keyPair = await generateKeypair();
    const tx = await createTransaction('pip', 'morgan', 15, 'helped move furniture', keyPair, null);
    const tampered = { ...tx, amount: 1500 };

    expect(await verifyTransactionSignature(tampered, keyPair.publicKey)).toBe(false);
  });

  it('fails verification against a different keypair', async () => {
    const keyPair = await generateKeypair();
    const otherKeyPair = await generateKeypair();
    const tx = await createTransaction('pip', 'morgan', 15, '', keyPair, null);

    expect(await verifyTransactionSignature(tx, otherKeyPair.publicKey)).toBe(false);
  });
});

describe('CryptoLedger — hash chaining', () => {
  it('chains a second transaction onto the first transaction\'s hash', async () => {
    const keyPair = await generateKeypair();
    const first = await createTransaction('pip', 'morgan', 5, '', keyPair, null);
    const second = await createTransaction('morgan', 'arthur', 3, '', keyPair, first.hash);

    expect(second.prevHash).toBe(first.hash);
    expect(verifyChainLinkage([first, second])).toBe(true);
  });

  it('detects a broken chain when a transaction is missing or reordered', async () => {
    const keyPair = await generateKeypair();
    const first = await createTransaction('pip', 'morgan', 5, '', keyPair, null);
    const second = await createTransaction('morgan', 'arthur', 3, '', keyPair, first.hash);
    const third = await createTransaction('arthur', 'pip', 1, '', keyPair, second.hash);

    expect(verifyChainLinkage([first, third])).toBe(false);
  });
});

describe('CryptoLedger — balances', () => {
  it('computes net balances from the owner\'s perspective', async () => {
    const keyPair = await generateKeypair();
    const first = await createTransaction('pip', 'morgan', 10, '', keyPair, null);
    const second = await createTransaction('morgan', 'pip', 4, '', keyPair, first.hash);

    const balances = computeBalances([first, second], 'pip');
    expect(balances.get('morgan')).toBe(6); // gave 10, received 4 back
  });
});

describe('MutualCreditLedger', () => {
  it('accepts transactions that chain correctly and rejects ones that do not', async () => {
    const keyPair = await generateKeypair();
    const ledger = new MutualCreditLedger();
    const first = await createTransaction('pip', 'morgan', 5, '', keyPair, null);
    ledger.append(first);

    const badSecond = await createTransaction('morgan', 'arthur', 3, '', keyPair, 'wrong-prev-hash');
    expect(() => ledger.append(badSecond)).toThrow(/does not chain/);

    const goodSecond = await createTransaction('morgan', 'arthur', 3, '', keyPair, first.hash);
    expect(() => ledger.append(goodSecond)).not.toThrow();
    expect(ledger.getTransactions()).toHaveLength(2);
  });
});
