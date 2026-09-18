import { defineConfig } from 'vite';

// M30 — see packages/skin-diorama-glow/vite.config.ts for the full
// rationale. Emits to apps/web/public/plugins/skins/neon_city/index.js.
export default defineConfig({
  root: import.meta.dirname,
  server: { port: 0 },
  build: {
    lib: {
      entry: 'src/index.ts',
      formats: ['es'],
      fileName: () => 'index.js',
    },
    outDir: '../../apps/web/public/plugins/skins/neon_city',
    emptyOutDir: true,
  },
});
