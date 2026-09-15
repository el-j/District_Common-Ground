// M18 — offline-boot support. Asset pre-caching itself is already handled by
// apps/web/vite.config.ts's `vite-plugin-pwa` (Workbox `globPatterns` covers
// every build asset, `navigateFallback: 'index.html'`, cache-first runtime
// caching for skin/data assets) — this module does not duplicate that. It
// covers the two pieces the Workbox config doesn't: requesting the
// persistent-storage lease (see DeviceStorageEngine.ts) at the moment a
// service worker becomes active, and exposing that a controlling SW exists
// so the UI can show the "playable offline" state truthfully.
import { requestPersistentStorage } from '../offline/DeviceStorageEngine';

export interface ServiceWorkerStatus {
  supported: boolean;
  controlled: boolean;
  persistentStorageGranted: boolean;
}

function hasServiceWorkerSupport(): boolean {
  return typeof navigator !== 'undefined' && 'serviceWorker' in navigator;
}

/** True once a service worker is actively controlling this page (installed + activated, not just registered). */
export function isControlledByServiceWorker(): boolean {
  return hasServiceWorkerSupport() && navigator.serviceWorker.controller != null;
}

/**
 * Call once at boot, after `vite-plugin-pwa`'s auto-registered service worker
 * has had a chance to install. Requests the permanent-storage grant and
 * reports current offline-readiness for the "Anchor this District to this
 * device" prompt described in the M18 planning doc.
 */
export async function initOfflineReadiness(): Promise<ServiceWorkerStatus> {
  const persistentStorageGranted = await requestPersistentStorage();
  return {
    supported: hasServiceWorkerSupport(),
    controlled: isControlledByServiceWorker(),
    persistentStorageGranted,
  };
}
