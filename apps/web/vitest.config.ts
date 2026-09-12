import { defineConfig } from 'vitest/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [tailwindcss()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
