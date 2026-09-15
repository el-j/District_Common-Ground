import { describe, it, expect } from 'vitest';
import { solveProofOfWork, verifyProofOfWork } from './ProofOfWork';

describe('ProofOfWork', () => {
  it('solves a low-difficulty challenge and the solution verifies at that difficulty', async () => {
    const { nonce, hash } = await solveProofOfWork('challenge-1', 8);
    expect(hash).toMatch(/^0/);
    await expect(verifyProofOfWork('challenge-1', nonce, 8)).resolves.toBe(true);
  });

  it('solves at the default production difficulty (12 leading zero bits)', async () => {
    const { nonce } = await solveProofOfWork('challenge-default');
    await expect(verifyProofOfWork('challenge-default', nonce)).resolves.toBe(true);
  });

  it('Test 19.4 (PoW Anti-Spam Gate): rejects a solution that does not meet the required difficulty', async () => {
    // nonce 0 essentially never satisfies a real difficulty target — stands in for a
    // spam sender that skips solving the puzzle and just submits a message anyway.
    await expect(verifyProofOfWork('challenge-2', 0, 16)).resolves.toBe(false);
  });

  it('Test 19.4 (PoW Anti-Spam Gate): rejects a solution that is valid for a different challenge', async () => {
    const { nonce } = await solveProofOfWork('challenge-real', 8);
    await expect(verifyProofOfWork('challenge-spoofed', nonce, 8)).resolves.toBe(false);
  });

  it('rejects a non-integer or negative nonce outright', async () => {
    await expect(verifyProofOfWork('challenge-3', -1, 8)).resolves.toBe(false);
    await expect(verifyProofOfWork('challenge-3', 1.5, 8)).resolves.toBe(false);
  });
});
