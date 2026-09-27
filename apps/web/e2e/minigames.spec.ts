import { test, expect } from '@playwright/test';
import { createCharacterAndEnterWorld } from './helpers';

test.describe('Minigame Extensible Architecture E2E', () => {
  test('loads remote minigame into container, renders canvas, and unmounts cleanly', async ({ page }) => {
    await createCharacterAndEnterWorld(page);

    // Launch courier-rush minigame
    await page.evaluate(async () => {
      const loader = (window as any).__MinigameLoader;
      if (!loader) throw new Error('MinigameLoader not exposed on window');
      await loader.launchMinigame('courier-rush');
    });

    // Check minigame overlay, container, and canvas
    const container = page.locator('.minigame-container-root');
    await expect(container).toBeVisible();
    await expect(page.locator('.minigame-container-title')).toContainText('Cargo Courier Rush');

    const canvas = page.locator('.courier-rush-canvas');
    await expect(canvas).toBeVisible();

    // Close minigame via close button
    const closeBtn = page.locator('.minigame-container-close-btn');
    await expect(closeBtn).toBeVisible();
    await closeBtn.click();

    // Verify container and canvas are unmounted
    await expect(container).toBeHidden();
    await expect(canvas).toBeHidden();
  });
});
