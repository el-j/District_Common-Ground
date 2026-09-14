import { defineConfig } from 'vitest/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [tailwindcss()],
  test: {
    environment: 'node',
    include: [
      'src/**/*.test.ts',
      // Standalone first-party plugin packages (registered with the frontend
      // Kernel, not statically imported) live outside apps/web/src but are
      // still exercised by the same `npm test` invocation.
      '../../packages/plugin-*/src/**/*.test.ts',
    ],
  },
});
