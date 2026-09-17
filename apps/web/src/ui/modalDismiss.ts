/**
 * M28 — shared Escape-to-close wiring.
 *
 * An audit found 11 modals rendered a working × button (+ backdrop click)
 * but had no `keydown`/Escape handling at all, and a separate 3 modals that
 * *did* wire up their own ad hoc `window.addEventListener('keydown', ...)`
 * for Escape but only ever removed that listener inside the Escape branch
 * itself — closing via the × button left a stale listener on `window`
 * forever, closing over that now-dead modal instance. A later Escape press
 * (meant for whatever's actually open now) would also fire every such
 * leaked listener.
 *
 * `bindEscapeClose()` centralizes both: call it once from a modal's
 * constructor, and call the returned dispose function from the modal's
 * single close() method (which must already be the only path every close
 * affordance — ×, backdrop click, Escape — funnels through). Removing an
 * already-removed listener is a no-op, so calling dispose more than once
 * (e.g. close() invoked twice) is harmless.
 */
export function bindEscapeClose(onClose: () => void): () => void {
  const onKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') onClose();
  };
  window.addEventListener('keydown', onKeyDown);
  return () => window.removeEventListener('keydown', onKeyDown);
}
