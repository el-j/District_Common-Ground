import { defineConfig } from 'vite';

// M27 follow-up of the M20 standalone-package convention: a minimal dev
// harness so this package can be run/typechecked in isolation, matching
// packages/minigame-courier-rush/vite.config.ts exactly.
//
// M29 — `build` now also emits a real standalone ESM bundle to
// apps/web/public/plugins/tenant-match/index.js, so this package can be
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
    outDir: '../../apps/web/public/plugins/tenant-match',
    emptyOutDir: true,
  },
});
