// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { recordCrisisChoice, recordEconomicSnapshot } from './district';
import { setTelemetryConsent } from '../../core/privacy/consent';

/** Launch audit Phase 6 — gameplay statistics leave the device only when the
 *  player has signed in AND opted in. */
describe('district telemetry gating', () => {
  const fetchMock = vi.fn(() => Promise.resolve({ ok: true, status: 204, text: () => Promise.resolve('') }));

  beforeEach(() => {
    localStorage.clear();
    fetchMock.mockClear();
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('sends nothing without consent, even when signed in', () => {
    localStorage.setItem('dcg-token', 'tok');
    recordCrisisChoice('c1', 2, 'solidarity');
    recordEconomicSnapshot(2, 'pip', 10, 50);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends nothing with consent but no account', () => {
    setTelemetryConsent(true);
    recordCrisisChoice('c1', 2, 'solidarity');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends both records when signed in and opted in', () => {
    localStorage.setItem('dcg-token', 'tok');
    setTelemetryConsent(true);
    recordCrisisChoice('c1', 2, 'solidarity');
    recordEconomicSnapshot(2, 'pip', 10, 50);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/api/v1/district/crisis-log'), expect.objectContaining({ method: 'POST' }));
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/api/v1/district/economic-snapshot'), expect.objectContaining({ method: 'POST' }));
  });
});
