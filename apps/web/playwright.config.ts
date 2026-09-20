import { defineConfig, devices } from '@playwright/test';

// 2026-09-20 audit (docs/AUDIT-2026-09-20.md §9): every interactive
// milestone from M21 onward recorded its real round-trip as "stays
// manual, no headless browser available in this environment" — that
// turned out to be true of a more restricted sandbox, not of this
// machine, which already has a cached Playwright Chromium build. This is
// the first real e2e coverage in the repo; see apps/web/e2e/ for what it
// actually drives end-to-end (currently the single biggest named gap:
// character creation through to a loaded, playable world).
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:9300',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:9300',
    reuseExistingServer: !process.env['CI'],
    timeout: 30_000,
  },
});
