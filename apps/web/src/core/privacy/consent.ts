/**
 * Launch audit Phase 6 (GDPR) — anonymous gameplay statistics (crisis choices,
 * daily cash/energy snapshots) are only sent when the player has opted in.
 * Off by default; the toggle lives in Settings → Region & Privacy.
 */
export const TELEMETRY_CONSENT_KEY = 'dcg-telemetry-consent';

export function hasTelemetryConsent(): boolean {
  try {
    return localStorage.getItem(TELEMETRY_CONSENT_KEY) === 'granted';
  } catch {
    return false;
  }
}

export function setTelemetryConsent(granted: boolean): void {
  try {
    if (granted) localStorage.setItem(TELEMETRY_CONSENT_KEY, 'granted');
    else localStorage.removeItem(TELEMETRY_CONSENT_KEY);
  } catch {
    // storage blocked — stays off
  }
}
