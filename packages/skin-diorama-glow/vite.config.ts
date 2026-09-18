import { defineConfig } from 'vite';

// M30 — same shape as packages/minigame-*'s own vite.config.ts: a minimal
// dev harness for standalone typecheck/dev, and a real Vite lib-mode build
// step that emits a standalone ESM bundle to
// apps/web/public/plugins/skins/diorama_glow/index.js (skinId spelling,
// matching apps/web/public/assets/skins/diorama_glow/), loaded at runtime
// via SkinRendererLoader.loadRemoteSkinRenderer() — never compiled into the
// main app bundle. The /plugins/skins/<id>/ path (not /plugins/<id>/) keeps
// skin bundles out of the minigame-id namespace MinigameLoader already
// owns; the existing M29 dev-only middleware (apps/web/vite.config.ts)
// already serves any /plugins/*.js path, so no change is needed there.
export default defineConfig({
  root: import.meta.dirname,
  server: { port: 0 },
  build: {
    lib: {
      entry: 'src/index.ts',
      formats: ['es'],
      fileName: () => 'index.js',
    },
    outDir: '../../apps/web/public/plugins/skins/diorama_glow',
    emptyOutDir: true,
  },
});
