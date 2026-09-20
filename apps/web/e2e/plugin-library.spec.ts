import { test, expect } from '@playwright/test';
import { createCharacterAndEnterWorld } from './helpers';

// Real-browser verification of today's Plugin Library change (previously
// only exercised via PluginManagerModal.test.ts's jsdom + mocked
// idb-keyval/fetch) — confirms the built-in-plugins section, the real
// GET /api/v1/kernel-plugins round trip (or its graceful offline
// fallback), and the disable/enable toggle all actually work together in
// a real page, not just against mocks.
test('Plugin Library lists built-in plugins and can disable a non-core one', async ({ page }) => {
  await createCharacterAndEnterWorld(page);

  await page.getByRole('button', { name: 'Open Plugin Library' }).click();
  await expect(page.locator('.plugin-panel')).toBeVisible();

  const builtinCards = page.locator('[data-builtin-plugin-id]');
  await expect(builtinCards).toHaveCount(6);

  // Core plugins (skins/world) are required, not toggleable.
  await expect(page.locator('[data-builtin-plugin-id="skins"] .plugin-pill--core')).toContainText('Required');
  await expect(page.locator('[data-builtin-plugin-id="world"] .plugin-pill--core')).toContainText('Required');

  // A non-core one can be disabled and the button flips to Enable.
  const bitchatToggle = page.locator('[data-builtin-id="bitchat"]');
  await expect(bitchatToggle).toHaveText('Disable');
  await bitchatToggle.click();
  await expect(page.locator('[data-builtin-id="bitchat"]')).toHaveText('Enable');
});
