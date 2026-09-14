import type { KernelPluginManifest, KernelPluginModule } from '@district-cg/shared-types';

// No HUD surface exists for weather yet — WeatherModifierBridge isn't wired
// into WorldScene (see docs/tasks/M17-offgrid-mesh-weather-currency.md scoping
// note 2). register() is a no-op today; it exists so this plugin registers
// with the kernel like every other one, giving future WorldScene wiring a
// real place to attach without inventing a new registration path then.
export const manifest: KernelPluginManifest = {
  id: 'geo-weather',
  version: '0.1.0',
  title: 'Real-Time Geo-Weather',
  description: 'Astronomical solar cycle sync (SunCalc) plus live Open-Meteo weather, mapped to district ambient lighting and resource modifiers.',
  permissions: ['geo:read', 'weather:sync'],
  requiresHardware: false,
};

export function register(): void {
  // Intentional no-op — see comment above.
}

export const geoWeatherPlugin: KernelPluginModule = { manifest, register };
