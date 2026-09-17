import { defineConfig } from 'vite';

// M27 follow-up of the M20 standalone-package convention: a minimal dev
// harness so this package can be run/typechecked in isolation, matching
// packages/minigame-courier-rush/vite.config.ts exactly. Not part of any
// bundled app build, not used by apps/web at runtime.
export default defineConfig({
  root: import.meta.dirname,
  server: { port: 0 },
});
