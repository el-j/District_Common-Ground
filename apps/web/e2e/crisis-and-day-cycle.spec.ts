import { test, expect } from '@playwright/test';
import { createCharacterAndEnterWorld } from './helpers';

test.describe('Crisis and Day Cycle Flow', () => {
  test('end-day button opens Broadsheet dispatch, accepts commons clue, and advances to day 2', async ({ page }) => {
    await createCharacterAndEnterWorld(page);

    // Initial state check
    await expect(page.locator('#top-hud')).toBeVisible();
    await expect(page.locator('.hud-day')).toContainText('Day 1');

    // Click End Day button
    const endDayBtn = page.locator('.end-day-btn');
    await expect(endDayBtn).toBeVisible();
    await endDayBtn.click();

    // Broadsheet modal displays
    const broadsheet = page.locator('.broadsheet-overlay');
    await expect(broadsheet).toBeVisible();
    await expect(page.locator('.broadsheet-headline')).toBeVisible();

    // Solve Commons Clue
    const clueInput = page.locator('.commons-clue-input');
    await expect(clueInput).toBeVisible();
    await clueInput.fill('solidarity');
    await expect(page.locator('.commons-clue-feedback')).toContainText('Correct!');

    // Close Broadsheet via Begin the Day button
    const closeBtn = page.locator('.broadsheet-close');
    await expect(closeBtn).toBeVisible();
    await closeBtn.click();

    // Broadsheet is dismissed
    await expect(broadsheet).toBeHidden();

    // Day has advanced to Day 2
    await expect(page.locator('.hud-day')).toContainText('Day 2');
  });
});
