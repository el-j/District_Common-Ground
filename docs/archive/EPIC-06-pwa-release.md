# EPIC 06 — PWA Packaging, Performance & Release

**Milestone:** M6 — Sprint 6
**Status:** [ ] Not Started

## Context

This sprint ships the game. The goal is a production PWA that loads fast on 4G, works offline, passes Lighthouse, and reaches players via sharing. No features are added — existing features are hardened, optimized, and packaged for real-world use.

## User Stories

### S6.1 — Offline Installable PWA
As a player on a mobile device,
I want to install the game to my home screen and play it offline,
so that I have zero dependency on App Store approval or a live internet connection.

**Acceptance criteria:**
- vite-plugin-pwa configured with a service worker caching strategy for complete offline functionality
- Game is installable via "Add to Home Screen" on mobile Safari and Chrome
- Offline play works for at least a full session after first install

### S6.2 — Fast Initial Load
As a player on a mobile data connection,
I want the game to boot quickly,
so that slow load times don't kill the experience before it begins.

**Performance budget:**
- Initial download: under specified MB threshold (see tech spec)
- Cold start time: under specified seconds threshold on standard 4G
- All sprite atlases packed into optimized WebP format

**Acceptance criteria:**
- WebP assets pass size budget
- Lighthouse Performance score meets target
- No unoptimized PNG/JPG assets in release build

### S6.3 — Cross-Device Compatibility
As a player on any mainstream device,
I want touch controls, dialogue modals, and audio to all work correctly on my device,
so that the experience is first-class on phone and desktop alike.

**Test matrix:**
- Mobile Safari (iOS)
- Mobile Chrome (Android)
- Desktop Chrome
- Desktop Firefox

**Acceptance criteria:**
- Touch virtual thumbstick functions correctly on iOS and Android
- Web Audio synthesizer initializes without errors on all 4 targets
- Dialogue overlay scrolls and responds to touch on mobile

### S6.4 — Lighthouse Targets
As a developer shipping this product,
I want the Lighthouse audit to show high scores across all categories,
so that the game is fast, accessible, and recognized as a quality PWA.

**Targets:**
- Performance: 90+
- Accessibility: 95+
- Best Practices: 95+
- PWA: 95+

**Acceptance criteria:**
- Lighthouse audit run on production build (not dev server)
- All four scores meet targets
- No critical accessibility violations (WCAG AA minimum)

### S6.5 — Social Sharing
As a player who wants to spread the game,
I want a one-tap share link that includes my district's current status,
so that sharing the game tells a story rather than just dumping a URL.

**Acceptance criteria:**
- "Share to Signal / Messaging Apps" link generator implemented
- Share text dynamically includes: character name, current day, Commons Resilience score
- Works via Web Share API with clipboard fallback
