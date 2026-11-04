import { expect, test } from '@playwright/test';

const WIDTHS = [360, 768, 1280, 1920];
const LEGAL_NOTICE =
  'Unofficial fan site. We claim no affiliation with Koei Tecmo. The game data, images and texts are owned by Koei Tecmo, the copyright holder of Nelke & the Legendary Alchemists.';

// Each test gets its own browser context, so the widths share no state and run in parallel.
for (const width of WIDTHS) {
  test(`root page at ${width} px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('./');

    await expect(page).toHaveTitle('Westwald Archive');

    const header = page.locator('header');
    await expect(header).toContainText('Westwald Archive');
    await expect(header).toContainText('Unofficial fansite for Nelke & the Legendary Alchemists');
    await expect(header.locator('i')).toHaveText('Nelke & the Legendary Alchemists');

    await expect(page.locator('footer')).toContainText(LEGAL_NOTICE);

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
}
