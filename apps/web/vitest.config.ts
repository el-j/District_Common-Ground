import { defineConfig } from 'vitest/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [tailwindcss()],
  test: {
    environment: 'node',
    include: [
      'src/**/*.test.ts',
      // Standalone first-party packages (plugins, minigames, skins) live outside
      // apps/web/src but are tested within the workspace vitest runner.
      '../../packages/plugin-*/src/**/*.test.ts',
      '../../packages/minigame-*/src/**/*.test.ts',
      '../../packages/skin-*/src/**/*.test.ts',
    ],
    // 2026-09-20 audit: real coverage is well under 100% in several
    // high-risk spots (the plugin-sandbox kernel, most UI modals, all 4
    // Phaser entity classes — see docs/AUDIT-2026-09-20.md §3). A failing
    // threshold set now would just block every unrelated change, so this
    // deliberately stays reporting-only (no `thresholds` block) — it
    // makes the real percentage visible (`npm run test:coverage`) without
    // pretending a number was chosen and enforced. Once the real gaps in
    // that audit are closed, add a `thresholds` block here so the bar,
    // once actually met, can't silently regress again.
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/**/__fixtures__/**'],
    },
  },
});
