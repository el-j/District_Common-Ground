import { test, expect, type Page } from '@playwright/test';
import { createCharacterAndEnterWorld } from './helpers';

// 2026-09-29 launch-readiness audit §3 Phase 3 — the core loop, run at both
// phone (390-wide) and desktop sizes. On a phone the toolbar used to cover
// End Day, so the game couldn't progress; Playwright's real clicks fail if
// anything covers the button, which is exactly what this guards.

async function cash(page: Page): Promise<number> {
  const text = await page.locator('#hud-stats').innerText();
  return Number(/\$(\d+)/.exec(text)?.[1] ?? NaN);
}

async function day(page: Page): Promise<number> {
  return Number(/Day (\d+)/.exec(await page.locator('.hud-day').innerText())?.[1] ?? NaN);
}

/** Ends the day and handles whatever the morning brings. */
async function endDay(page: Page): Promise<void> {
  await page.locator('.end-day-btn').click();
  await page.locator('.broadsheet-close').click();
  await expect(page.locator('.broadsheet-overlay')).toBeHidden();
  const appears = (l: ReturnType<Page['locator']>, ms: number) =>
    l.waitFor({ state: 'visible', timeout: ms }).then(() => true, () => false);
  const crisis = page.locator('.crisis-btn:not([disabled])').first();
  if (await appears(crisis, 2500)) {
    await crisis.click();
    await expect(page.locator('.crisis-overlay')).toHaveCount(0, { timeout: 3000 });
  }
  const vote = page.locator('.assembly-btn:not([disabled])').first();
  while (await appears(vote, 500)) await vote.click();
  // A quiet morning may bring a neighbour moment: answer it, then continue.
  const eventOption = page.locator('.event-option:not([disabled])').first();
  if (await appears(eventOption, 500)) {
    await eventOption.click();
    await page.locator('.event-continue').click();
    await expect(page.locator('.neighbour-event')).toHaveCount(0);
  }
  const ledger = page.locator('.ledger-close');
  if (await ledger.isVisible().catch(() => false)) await ledger.click();
}

test.setTimeout(90_000);

test('core loop: work, end several days, progress survives a reload, new game starts fresh', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', err => pageErrors.push(err.message));

  await createCharacterAndEnterWorld(page);
  await expect(page.locator('.end-day-btn')).toBeVisible();
  await expect(page.locator('.hud-day')).toContainText('Day 1');

  // Work pays cash for energy.
  const before = await cash(page);
  await page.locator('.work-open-btn').click();
  await page.locator('[data-work]').click();
  await page.locator('.settings-close').first().click();
  await expect.poll(() => cash(page)).toBeGreaterThan(before);

  // End three days.
  for (let i = 0; i < 3; i += 1) await endDay(page);
  expect(await day(page)).toBeGreaterThanOrEqual(4);
  const dayBeforeReload = await day(page);
  const cashBeforeReload = await cash(page);

  // Autosave + remembered "Play offline": a reload goes straight back in.
  await page.waitForTimeout(2500);
  await page.reload();
  await expect(page.locator('#top-hud')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toHaveCount(0);
  expect(await day(page)).toBe(dayBeforeReload);
  expect(await cash(page)).toBe(cashBeforeReload);

  // New Game really starts over, even after a reload.
  await page.locator('#hud-settings-btn').click();
  await page.locator('[data-tab="account"]').click();
  await page.locator('.new-game-btn').click();
  await page.locator('.new-game-yes').click();
  await expect(page.locator('[data-template]').first()).toBeVisible({ timeout: 10_000 });

  expect(pageErrors).toEqual([]);
});
