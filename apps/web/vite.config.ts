import fs from 'node:fs';
import path from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

// M29 — apps/web/public/plugins/<id>/index.js holds each built-in minigame's
// standalone ESM bundle (built by each packages/minigame-* package's own
// `npm run build`, Vite lib mode). In production these are plain static
// files nginx serves with zero Vite involvement. But Vite's OWN dev server
// unconditionally refuses to serve any .js file inside publicDir through its
// module-transform pipeline ("This file is in /public ... should not be
// imported from source code") — even for a genuine same-origin runtime
// import() the browser itself issues, not just static analysis. Registering
// this middleware directly inside configureServer (rather than returning a
// post-hook function) runs it before Vite's internal middlewares, so these
// specific requests are served as plain static JS and never reach that check.
function serveMinigamePluginBundlesInDev(): Plugin {
  return {
    name: 'serve-minigame-plugin-bundles-dev',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const pathname = (req.url ?? '').split('?')[0];
        if (!pathname.startsWith('/plugins/') || !pathname.endsWith('.js')) {
          next();
          return;
        }
        const publicDir = server.config.publicDir;
        const filePath = path.normalize(path.join(publicDir, pathname));
        if (!filePath.startsWith(publicDir) || !fs.existsSync(filePath)) {
          next();
          return;
        }
        res.setHeader('Content-Type', 'text/javascript');
        fs.createReadStream(filePath).pipe(res);
      });
    },
  };
}

export default defineConfig({
  plugins: [
    tailwindcss(),
    serveMinigamePluginBundlesInDev(),
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
