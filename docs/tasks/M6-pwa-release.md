# M6 Tasks — PWA Packaging, Performance Tuning & Release

**Sprint:** 6
**Status:** [ ] Not Started
**Stories:** EPIC-06
**Depends on:** M5 complete

---

## PWA Configuration

- [ ] Configure `vite-plugin-pwa` in `vite.config.ts`:
  - `registerType: 'autoUpdate'`
  - `workbox` strategy: `CacheFirst` for assets, `NetworkFirst` for data
  - Cache all skin assets, tilemap JSON, and crisis_scenarios.json for offline play
  - Cache busting on new deployments
- [ ] Create `public/manifest.webmanifest`:
  ```json
  {
    "name": "District: Common Ground",
    "short_name": "District",
    "start_url": "/",
    "display": "standalone",
    "background_color": "#1a1a2e",
    "theme_color": "#4a90d9",
    "icons": [...]
  }
  ```
- [ ] Generate PWA icons: 192x192 and 512x512 (PNG + maskable variant)
- [ ] Test "Add to Home Screen" on iOS Safari and Android Chrome

---

## Asset Optimization

- [ ] Convert all sprite atlas PNGs to WebP format
  - Tool: `cwebp` or Vite plugin (`vite-imagetools`)
  - Target: total initial skin download within budget (see tech spec)
- [ ] Compress tilemap JSON (remove whitespace)
- [ ] Enable Vite build minification and tree-shaking
- [ ] Enable Brotli/gzip compression at server level (or via Vite plugin)
- [ ] Audit bundle: run `npx vite-bundle-visualizer` and eliminate dead code

---

## Cross-Browser Testing

Run full manual regression on all target platforms:

**Mobile Safari (iOS):**
- [ ] Touch thumbstick works correctly
- [ ] Web Audio initializes on first tap (no errors)
- [ ] PWA installable via "Add to Home Screen"
- [ ] Offline play works after install

**Mobile Chrome (Android):**
- [ ] Touch thumbstick works correctly
- [ ] Web Audio initializes on first tap
- [ ] PWA installable via browser prompt
- [ ] Offline play works after install

**Desktop Chrome:**
- [ ] WASD and Arrow key movement functional
- [ ] HUD layout not broken at wide viewports
- [ ] Audio works without interaction gate issues

**Desktop Firefox:**
- [ ] All features functional
- [ ] No Phaser/PixiJS WebGL compatibility issues

---

## Social Sharing

- [ ] Implement share link generator:
  - Use Web Share API: `navigator.share({ title, text, url })`
  - Fallback: copy to clipboard
- [ ] Dynamic share text format:
  ```
  Day {day} in District: Common Ground. {characterName}'s neighborhood has {resilienceScore}% Commons Resilience.
  Play: {url}
  ```
- [ ] Add share button to HUD or end-of-day summary screen

---

## Lighthouse Audit

- [ ] Run Lighthouse on production build (`npm run build && npm run preview`)
- [ ] **Performance: 90+**
  - Eliminate render-blocking resources
  - Lazy-load non-critical skin packs after initial boot
- [ ] **Accessibility: 95+**
  - All interactive elements have ARIA labels
  - Dialogue overlay keyboard navigable
  - Color contrast meets WCAG AA (HUD text especially)
  - Crisis modal focus trapping
- [ ] **Best Practices: 95+**
  - No console errors in production build
  - HTTPS required (deploy to HTTPS host)
- [ ] **PWA: 95+**
  - Service worker registered and active
  - Manifest valid and complete
  - Offline fallback page

---

## Launch Checklist

- [ ] All M1–M5 acceptance tests passing
- [ ] Lighthouse targets met on production build
- [ ] Cold start under target threshold on standard 4G (Chrome DevTools → Network throttling → "Fast 4G")
- [ ] IndexedDB persistence verified across devices
- [ ] Crisis history log verified to persist across sessions
- [ ] No TypeScript compiler errors (`tsc --noEmit`)
- [ ] Final bundle size within asset budget

---

## Acceptance Tests (M6)

- [ ] **Lighthouse:** Performance 90+, Accessibility 95+, Best Practices 95+, PWA 95+
- [ ] **Cold start:** Boot time under target threshold on 4G throttled connection
- [ ] **Cross-device:** Touch controls, UI modals, and Web Audio function without degradation across all 4 test targets
