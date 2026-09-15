// M19 — Client-side Hashcash proof-of-work, gating new bitchat.free peer
// handshakes against connection-flood spam. Pure SHA-256-via-crypto.subtle,
// same primitive already proven working in this repo's Node test
// environment by SignedEventLog.ts/CryptoLedger.ts.
const NIBBLE_LEADING_ZEROS = [4, 3, 2, 2, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0];

export const DEFAULT_DIFFICULTY_BITS = 12;

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function countLeadingZeroBits(hex: string): number {
  let bits = 0;
  for (const ch of hex) {
    const nibble = parseInt(ch, 16);
    bits += NIBBLE_LEADING_ZEROS[nibble] ?? 0;
    if (nibble !== 0) break;
  }
  return bits;
}

export interface ProofOfWorkSolution {
  nonce: number;
  hash: string;
}

/** Finds the smallest nonce such that SHA-256(`${challenge}:${nonce}`) has at least `difficultyBits` leading zero bits. */
export async function solveProofOfWork(
  challenge: string,
  difficultyBits: number = DEFAULT_DIFFICULTY_BITS,
  maxIterations = 5_000_000,
): Promise<ProofOfWorkSolution> {
  for (let nonce = 0; nonce < maxIterations; nonce += 1) {
    const hash = await sha256Hex(`${challenge}:${nonce}`);
    if (countLeadingZeroBits(hash) >= difficultyBits) {
      return { nonce, hash };
    }
  }
  throw new Error(`Proof-of-work not found for challenge within ${maxIterations} iterations`);
}

/** The receiver-side check: rejects any solution that doesn't actually meet the required difficulty. */
export async function verifyProofOfWork(
  challenge: string,
  nonce: number,
  difficultyBits: number = DEFAULT_DIFFICULTY_BITS,
): Promise<boolean> {
  if (!Number.isInteger(nonce) || nonce < 0) return false;
  const hash = await sha256Hex(`${challenge}:${nonce}`);
  return countLeadingZeroBits(hash) >= difficultyBits;
}
