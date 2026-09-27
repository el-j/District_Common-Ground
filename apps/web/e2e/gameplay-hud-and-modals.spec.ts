import { test, expect } from '@playwright/test';
import { createCharacterAndEnterWorld } from './helpers';

test.describe('Gameplay HUD and Modals Flow', () => {
  test('can open and close quest, work, builder, journal, radio, and settings modals', async ({ page }) => {
    await createCharacterAndEnterWorld(page);

    // 1. Quest Modal
    const questBtn = page.locator('.quest-open-btn');
    await expect(questBtn).toBeVisible();
    await questBtn.click();
    await expect(page.locator('.quest-panel, .settings-panel')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('.quest-panel, .settings-panel')).toBeHidden();

    // 2. Work Modal
    const workBtn = page.locator('.work-open-btn');
    await expect(workBtn).toBeVisible();
    await workBtn.click();
    await expect(page.locator('.settings-panel')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('.settings-panel')).toBeHidden();

    // 3. District Builder Modal
    const builderBtn = page.locator('.builder-open-btn');
    await expect(builderBtn).toBeVisible();
    await builderBtn.click();
    await expect(page.locator('.district-builder-card')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('.district-builder-card')).toBeHidden();

    // 4. Civic Journal Modal
    const journalBtn = page.locator('.journal-open-btn');
    await expect(journalBtn).toBeVisible();
    await journalBtn.click();
    await expect(page.locator('.civic-journal-panel')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('.civic-journal-panel')).toBeHidden();

    // 5. Radio Widget
    const radioBtn = page.locator('.radio-open-btn');
    await expect(radioBtn).toBeVisible();
    await radioBtn.click();
    await expect(page.locator('.radio-widget')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('.radio-widget')).toBeHidden();

    // 6. Settings Modal and Skin Switcher
    const settingsBtn = page.locator('#hud-settings-btn');
    await expect(settingsBtn).toBeVisible();
    await settingsBtn.click();
    await expect(page.locator('.settings-modal, .settings-overlay')).toBeVisible();

    // Verify skin select dropdown is present
    const skinSelect = page.locator('#skin-select');
    if (await skinSelect.isVisible()) {
      await skinSelect.selectOption('diorama-glow');
    }

    await page.keyboard.press('Escape');
    await expect(page.locator('.settings-modal, .settings-overlay')).toBeHidden();
  });
});
