// District: Common Ground — Capacitor Android packaging config (M18).
// Produces a self-contained offline APK for sideloading or F-Droid, per
// docs/planning/18-OFFLINE-FIRST-DEVICE-STORAGE-AND-DELAYED-SYNC.md §6.
// Config only: no `android/` native project has been generated here (that
// requires `npx cap add android` against an installed Android SDK, which
// this environment doesn't have) — unverified, same boundary as M17's
// Meshtastic hardware drivers.
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'org.districtcommonground.app',
  appName: 'District: Common Ground',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
