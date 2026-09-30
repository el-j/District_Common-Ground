import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

/** Shared by every spec that needs a loaded world, not just character-creation.spec.ts's own coverage of the flow itself. */
export async function createCharacterAndEnterWorld(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: 'Play', exact: true }).click();

  const familyCards = page.locator('[data-template]');
  await expect(familyCards.first()).toBeVisible();
  await familyCards.first().click();

  await expect(page.locator('#cs-name-input')).toBeVisible();
  await page.locator('[data-continue]').click();

  await expect(page.locator('.cs-family-member').first()).toBeVisible();
  await page.locator('[data-begin]').click();

  await expect(page.locator('#top-hud')).toBeVisible();
}
