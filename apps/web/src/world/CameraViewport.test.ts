import { describe, it, expect } from 'vitest';
import { computeViewportZoom, DEFAULT_TILES_WIDE, DEFAULT_TILES_TALL } from './CameraViewport';

const TS = 16;

function tilesOnScreen(viewport: number, zoom: number): number {
  return viewport / zoom / TS;
}

describe('computeViewportZoom', () => {
  // "Contain" semantics: the zoom is chosen so the player never sees FEWER
  // than the 12x10 target tiles on either axis — the more constrained axis
  // (the one closer to the 12:10 aspect ratio) lands exactly on target,
  // while the other axis reveals a bit more world rather than cropping.
  // This is what actually fixes the Ant Farm bug: today's viewport-tracking
  // RESIZE + static zoom(2) can show 60+ tiles wide on a big monitor; with
  // this function it can never show fewer than 12, and the "more on one
  // axis" tradeoff is a deliberate, bounded one instead of an open-ended one.

  it('never shows fewer than the 12x10 target on a 1280x800 desktop viewport', () => {
    const zoom = computeViewportZoom(1280, 800, TS);
    expect(tilesOnScreen(1280, zoom)).toBeGreaterThanOrEqual(DEFAULT_TILES_WIDE - 0.01);
    expect(tilesOnScreen(800, zoom)).toBeCloseTo(DEFAULT_TILES_TALL, 0);
  });

  it('never shows fewer than the 12x10 target on a 390x844 mobile viewport', () => {
    const zoom = computeViewportZoom(390, 844, TS);
    expect(tilesOnScreen(390, zoom)).toBeCloseTo(DEFAULT_TILES_WIDE, 0);
    expect(tilesOnScreen(844, zoom)).toBeGreaterThanOrEqual(DEFAULT_TILES_TALL - 0.01);
  });

  it('the binding axis matches the 12x10 target on both a desktop and a mobile viewport (Test 21.1)', () => {
    const desktopZoom = computeViewportZoom(1280, 800, TS);
    const mobileZoom = computeViewportZoom(390, 844, TS);
    // Desktop (1280x800) is wider than 12:10, so height is the binding axis.
    expect(tilesOnScreen(800, desktopZoom)).toBeCloseTo(DEFAULT_TILES_TALL, 0);
    // Mobile (390x844) is taller than 12:10, so width is the binding axis.
    expect(tilesOnScreen(390, mobileZoom)).toBeCloseTo(DEFAULT_TILES_WIDE, 0);
  });

  it('scales down (zooms in less) as the viewport shrinks, and up as it grows', () => {
    const small = computeViewportZoom(320, 480, TS);
    const large = computeViewportZoom(2560, 1440, TS);
    expect(large).toBeGreaterThan(small);
  });

  it('supports a custom tile-count target', () => {
    const zoom = computeViewportZoom(640, 480, TS, 20, 15);
    expect(tilesOnScreen(640, zoom)).toBeCloseTo(20, 0);
  });
});
