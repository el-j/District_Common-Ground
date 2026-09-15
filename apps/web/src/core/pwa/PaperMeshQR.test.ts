import { describe, it, expect } from 'vitest';
import { encodeToFrames, MeshQrFrameAssembler } from './PaperMeshQR';

describe('encodeToFrames / MeshQrFrameAssembler', () => {
  it('round-trips a small payload through a single frame', async () => {
    const payload = { hello: 'world', n: 42 };
    const frames = await encodeToFrames(payload);
    expect(frames).toHaveLength(1);

    const assembler = new MeshQrFrameAssembler();
    assembler.addFrame(frames[0]!);
    expect(assembler.isComplete).toBe(true);
    await expect(assembler.decode()).resolves.toEqual(payload);
  });

  it('splits a large payload into multiple frames and reassembles them out of order', async () => {
    const payload = { deltas: Array.from({ length: 50 }, (_, i) => ({ id: `delta-${i}`, note: 'x'.repeat(50) })) };
    const frames = await encodeToFrames(payload, 100);
    expect(frames.length).toBeGreaterThan(1);

    const assembler = new MeshQrFrameAssembler();
    // Scan in reverse order, simulating a camera picking up frames non-sequentially.
    for (const frame of [...frames].reverse()) assembler.addFrame(frame);

    expect(assembler.isComplete).toBe(true);
    await expect(assembler.decode()).resolves.toEqual(payload);
  });

  it('reports missing indices while incomplete and throws on decode()', async () => {
    const frames = await encodeToFrames({ x: 'y'.repeat(1000) }, 50);
    expect(frames.length).toBeGreaterThan(1);

    const assembler = new MeshQrFrameAssembler();
    assembler.addFrame(frames[0]!);
    expect(assembler.isComplete).toBe(false);
    expect(assembler.missingIndices).toEqual(frames.slice(1).map(f => f.index));
    await expect(assembler.decode()).rejects.toThrow(/incomplete/);
  });

  it('tolerates duplicate frame deliveries', async () => {
    const frames = await encodeToFrames({ a: 1 });
    const assembler = new MeshQrFrameAssembler();
    assembler.addFrame(frames[0]!);
    assembler.addFrame(frames[0]!);
    expect(assembler.isComplete).toBe(true);
  });

  it('starting a new bundleId discards a previous in-progress partial bundle', async () => {
    const bundleOne = await encodeToFrames({ big: 'z'.repeat(1000) }, 50);
    const bundleTwo = await encodeToFrames({ small: 1 });

    const assembler = new MeshQrFrameAssembler();
    assembler.addFrame(bundleOne[0]!); // partial — bundleOne is incomplete
    assembler.addFrame(bundleTwo[0]!); // a fresh bundle arrives instead
    expect(assembler.isComplete).toBe(true);
    await expect(assembler.decode()).resolves.toEqual({ small: 1 });
  });

  it('rejects a tampered chunk via checksum verification', async () => {
    const frames = await encodeToFrames({ a: 1 });
    const chunk = frames[0]!.chunk;
    const mid = Math.floor(chunk.length / 2);
    const replacement = chunk[mid] === 'a' ? 'b' : 'a'; // stays a valid base64 alphabet character
    const tamperedChunk = chunk.slice(0, mid) + replacement + chunk.slice(mid + 1);
    const tampered = { ...frames[0]!, chunk: tamperedChunk };

    const assembler = new MeshQrFrameAssembler();
    assembler.addFrame(tampered);
    await expect(assembler.decode()).rejects.toThrow(/checksum mismatch/);
  });

  it('round-trips an empty array payload as exactly one frame', async () => {
    const frames = await encodeToFrames([]);
    expect(frames).toHaveLength(1);
    const assembler = new MeshQrFrameAssembler();
    assembler.addFrame(frames[0]!);
    await expect(assembler.decode()).resolves.toEqual([]);
  });
});
