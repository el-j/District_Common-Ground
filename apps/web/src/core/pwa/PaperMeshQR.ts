// M18 — "PaperMesh" sneakernet air-gap sync. This is the chunking/reassembly
// *protocol* only: splitting an arbitrary JSON-serializable payload (a
// bundle of SignedActionDeltas, a relief-caravan snapshot, a credit
// transfer) into a sequence of small, checksummed, order-independent string
// frames sized to fit a single QR code's capacity, and reassembling +
// integrity-checking them back into the original payload.
//
// Scoping note: actual QR *rendering* (turning a frame string into a scannable
// image) and camera-based *scanning* are not implemented here — no QR
// library is added. That mirrors the boundary this project already drew in
// M16's apps/web/src/irl/PeerVerification.ts (a 4-word code, not a QR scan):
// the pure protocol is real and tested; wiring it to `<canvas>` rendering and
// `getUserMedia` camera capture is a follow-up, not silently claimed here.
// Any string-based QR library can consume/produce `MeshQrFrame.chunk` later
// without changing this protocol.
const DEFAULT_MAX_CHUNK_CHARS = 500;

export interface MeshQrFrame {
  bundleId: string;
  index: number;
  total: number;
  /** SHA-256 hex digest of the full encoded payload — identical on every frame in the bundle. */
  checksum: string;
  chunk: string;
}

function toHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function toBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

function fromBase64(text: string): Uint8Array<ArrayBuffer> {
  const binary = atob(text);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Splits any JSON-serializable payload into a sequence of QR-sized frames. */
export async function encodeToFrames<T>(payload: T, maxChunkChars: number = DEFAULT_MAX_CHUNK_CHARS): Promise<MeshQrFrame[]> {
  const json = JSON.stringify(payload);
  const jsonBytes = new TextEncoder().encode(json);
  const checksum = toHex(await crypto.subtle.digest('SHA-256', jsonBytes));
  const encoded = toBase64(jsonBytes);
  const bundleId = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

  const chunks: string[] = [];
  for (let i = 0; i < encoded.length; i += maxChunkChars) {
    chunks.push(encoded.slice(i, i + maxChunkChars));
  }
  if (chunks.length === 0) chunks.push(''); // an empty payload still yields exactly one frame

  return chunks.map((chunk, index) => ({ bundleId, index, total: chunks.length, checksum, chunk }));
}

/**
 * Accumulates frames scanned in any order (or with duplicates/retransmissions)
 * and reassembles the original payload once every frame in the bundle has
 * arrived, verifying the SHA-256 checksum before trusting the result.
 */
export class MeshQrFrameAssembler {
  private frames = new Map<number, string>();
  private bundleId: string | null = null;
  private total: number | null = null;
  private checksum: string | null = null;

  /** Adds a scanned frame. Starting a frame from a different bundleId discards any in-progress partial bundle. */
  addFrame(frame: MeshQrFrame): void {
    if (this.bundleId !== null && this.bundleId !== frame.bundleId) {
      this.frames.clear();
    }
    this.bundleId = frame.bundleId;
    this.total = frame.total;
    this.checksum = frame.checksum;
    this.frames.set(frame.index, frame.chunk);
  }

  get missingIndices(): number[] {
    if (this.total == null) return [];
    const missing: number[] = [];
    for (let i = 0; i < this.total; i += 1) {
      if (!this.frames.has(i)) missing.push(i);
    }
    return missing;
  }

  get isComplete(): boolean {
    return this.total != null && this.missingIndices.length === 0;
  }

  reset(): void {
    this.frames.clear();
    this.bundleId = null;
    this.total = null;
    this.checksum = null;
  }

  /** Reassembles and checksum-verifies the payload. Throws if incomplete or if the checksum doesn't match. */
  async decode<T>(): Promise<T> {
    if (!this.isComplete || this.total == null || this.checksum == null) {
      throw new Error('cannot decode an incomplete frame bundle');
    }
    const encoded = Array.from({ length: this.total }, (_, i) => this.frames.get(i) ?? '').join('');
    const jsonBytes = fromBase64(encoded);
    const recomputedChecksum = toHex(await crypto.subtle.digest('SHA-256', jsonBytes));
    if (recomputedChecksum !== this.checksum) {
      throw new Error('checksum mismatch — corrupted or tampered PaperMesh frame data');
    }
    return JSON.parse(new TextDecoder().decode(jsonBytes)) as T;
  }
}
