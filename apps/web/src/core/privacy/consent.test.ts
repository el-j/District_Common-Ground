// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { hasTelemetryConsent, setTelemetryConsent, TELEMETRY_CONSENT_KEY } from './consent';

describe('telemetry consent (GDPR — off by default)', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.unstubAllGlobals());

  it('is off until the player opts in', () => {
    expect(hasTelemetryConsent()).toBe(false);
  });

  it('remembers opting in and opting back out', () => {
    setTelemetryConsent(true);
    expect(localStorage.getItem(TELEMETRY_CONSENT_KEY)).toBe('granted');
    expect(hasTelemetryConsent()).toBe(true);
    setTelemetryConsent(false);
    expect(hasTelemetryConsent()).toBe(false);
    expect(localStorage.getItem(TELEMETRY_CONSENT_KEY)).toBeNull();
  });

  it('only an exact "granted" value counts as consent', () => {
    localStorage.setItem(TELEMETRY_CONSENT_KEY, 'true');
    expect(hasTelemetryConsent()).toBe(false);
  });

  it('treats blocked storage as no consent and never throws', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => { throw new Error('blocked'); },
      setItem: () => { throw new Error('blocked'); },
      removeItem: () => { throw new Error('blocked'); },
    });
    expect(hasTelemetryConsent()).toBe(false);
    expect(() => setTelemetryConsent(true)).not.toThrow();
  });
});
