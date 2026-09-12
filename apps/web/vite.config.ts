import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: false, // we supply our own manifest.webmanifest in /public
      workbox: {
        // Cache game assets (skins, data) with cache-first strategy
        runtimeCaching: [
          {
            urlPattern: /\/assets\/skins\/.+\.(webp|json)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'skin-assets',
              expiration: { maxEntries: 64, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            urlPattern: /\/assets\/data\/.+\.json$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'game-data',
              expiration: { maxEntries: 16, maxAgeSeconds: 60 * 60 * 24 },
            },
          },
        ],
        // Pre-cache everything in the build output
        globPatterns: ['**/*.{js,css,html,png,svg,webp,json,webmanifest}'],
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api\//],
      },
      devOptions: {
        enabled: false, // service worker disabled in dev to avoid caching pain
      },
    }),
  ],
  base: './',
  build: {
    target: 'es2020',
    outDir: 'dist',
    assetsDir: 'assets',
    // Phaser is ~1.2 MB minified — expected for a full game engine
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        // Rolldown (Vite 8) requires manualChunks as a function
        manualChunks(id: string) {
          if (id.includes('node_modules/phaser')) return 'phaser';
          if (id.includes('node_modules/zustand') || id.includes('node_modules/idb-keyval')) return 'vendor';
          return undefined;
        },
      },
    },
  },
  server: {
    port: 9300,
    open: false,
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL ?? 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
});
