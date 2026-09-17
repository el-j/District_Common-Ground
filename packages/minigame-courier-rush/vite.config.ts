import { defineConfig } from 'vite';

// M20 follow-up (audit 2026-09-15): a minimal dev harness so this standalone
// package can be run/typechecked in isolation (`npm run dev --workspace=...`)
// per docs/planning/20-STANDALONE-MONOREPO-PACKAGES-FOR-MINIGAMES-AND-PLUGINS.md's
// "Verification & Testing Independence" contract — not part of any bundled
// app build, and not used by apps/web at runtime.
//
// M29 — `build` now also emits a real standalone ESM bundle to
// apps/web/public/plugins/courier-rush/index.js, so this package can be
// loaded at runtime via MinigameLoader.loadRemoteMinigame() instead of a
// static compile-time import into the main app bundle.
export default defineConfig({
  root: import.meta.dirname,
  server: { port: 0 },
  build: {
    lib: {
      entry: 'src/index.ts',
      formats: ['es'],
      fileName: () => 'index.js',
    },
    outDir: '../../apps/web/public/plugins/courier-rush',
    emptyOutDir: true,
  },
});
