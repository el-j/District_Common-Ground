import { defineConfig } from 'vite';

// M50 — EPIC-37 §2. Same shape as packages/skin-diorama-glow's own
// vite.config.ts: a minimal dev harness for standalone typecheck/dev, and
// a real Vite lib-mode build step emitting a standalone ESM bundle to
// apps/web/public/plugins/skins/painterly_depth/index.js, loaded at
// runtime via SkinRendererLoader.loadRemoteSkinRenderer() — never compiled
// into the main app bundle.
export default defineConfig({
  root: import.meta.dirname,
  server: { port: 0 },
  build: {
    lib: {
      entry: 'src/index.ts',
      formats: ['es'],
      fileName: () => 'index.js',
    },
    outDir: '../../apps/web/public/plugins/skins/painterly_depth',
    emptyOutDir: true,
  },
});
