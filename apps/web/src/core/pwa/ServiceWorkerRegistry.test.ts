import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('../offline/DeviceStorageEngine', () => ({ requestPersistentStorage: vi.fn() }));

import { requestPersistentStorage } from '../offline/DeviceStorageEngine';
import { isControlledByServiceWorker, initOfflineReadiness } from './ServiceWorkerRegistry';

describe('ServiceWorkerRegistry', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('isControlledByServiceWorker is false with no navigator.serviceWorker (node test env)', () => {
    expect(isControlledByServiceWorker()).toBe(false);
  });

  it('isControlledByServiceWorker is true only when a controller is present', () => {
    vi.stubGlobal('navigator', { serviceWorker: { controller: {} } });
    expect(isControlledByServiceWorker()).toBe(true);
  });

  it('initOfflineReadiness reports unsupported + uncontrolled without navigator.serviceWorker, but still requests persistence', async () => {
    vi.mocked(requestPersistentStorage).mockResolvedValue(true);
    const status = await initOfflineReadiness();
    expect(status).toEqual({ supported: false, controlled: false, persistentStorageGranted: true });
  });

  it('initOfflineReadiness reports supported + controlled when a service worker is active', async () => {
    vi.stubGlobal('navigator', { serviceWorker: { controller: {} } });
    vi.mocked(requestPersistentStorage).mockResolvedValue(false);
    const status = await initOfflineReadiness();
    expect(status).toEqual({ supported: true, controlled: true, persistentStorageGranted: false });
  });
});
