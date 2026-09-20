import { test, expect } from '@playwright/test';

// First real e2e coverage in the repo (docs/AUDIT-2026-09-20.md §9) — drives
// the single biggest named gap end-to-end: boot -> offline auth -> family
// pick -> identity -> confirm -> a genuinely loaded, playable world, using
// a real browser and a real Vite dev server rather than mocked DOM nodes.
test('a new player can create a character and land in a loaded world', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', err => pageErrors.push(err.message));

  await page.goto('/');

  // Boot always shows AuthOverlay first when there's no saved token — use
  // the offline path so this doesn't depend on the Go API/Postgres being up.
  await page.getByRole('button', { name: 'Play offline (no account)' }).click();

  // Family step
  const familyCards = page.locator('[data-template]');
  await expect(familyCards.first()).toBeVisible();
  await familyCards.first().click();

  // Identity step
  await expect(page.locator('#cs-name-input')).toBeVisible();
  await page.locator('#cs-name-input').fill('E2E Tester');
  await page.locator('[data-gender="non-binary"]').click();
  await page.locator('[data-appearance="APPEARANCE_TONE_2"]').click();
  await page.locator('[data-continue]').click();

  // Confirm step
  await expect(page.locator('.cs-family-member').first()).toBeVisible();
  await page.locator('[data-begin]').click();

  // The world: HUD visible, Phaser canvas actually rendering, character-select gone.
  await expect(page.locator('#top-hud')).toBeVisible();
  // #game-container has two canvases (Phaser's own + LightLayer.ts's
  // ambient-light overlay canvas) — either being present confirms the
  // world actually rendered, so just assert at least one did.
  await expect(page.locator('#game-container canvas').first()).toBeVisible();
  await expect(page.locator('.character-select')).toHaveCount(0);
  await expect(page.locator('#hud-stats')).toContainText('Day 1');

  expect(pageErrors, `uncaught page errors: ${pageErrors.join('; ')}`).toEqual([]);
});
