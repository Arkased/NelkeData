import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { isPlaceholder, ItemCategoryName, readData, Shop } from '@nelke/model';
import { BASE_PATH } from '../packages/site/src/base.js';
import { formatNumber as format } from '../packages/site/src/format.js';
import { NAV_BREAKPOINT } from '../packages/site/src/nav.js';
import { StatTone } from '../packages/site/src/stat-tone.js';

const WIDTHS = [360, 768, 1280, 1920];
const LEGAL_NOTICE =
  'Unofficial fan site. We claim no affiliation with Koei Tecmo. The game data, images and texts are owned by Koei Tecmo, the copyright holder of Nelke & the Legendary Alchemists.';

const data = readData(path.join(import.meta.dirname, '..', 'data'));
const itemByName = (name: string) => {
  const item = data.items.find((i) => i.name === name);
  if (!item) throw new Error(`No item ${name}`);
  return item;
};
const recipeOf = (name: string) => {
  const recipe = data.recipes.find((r) => r.id === itemByName(name).recipeId);
  if (!recipe) throw new Error(`No recipe for ${name}`);
  return recipe;
};
const MERCHANDISE = ItemCategoryName.Merchandise;
const itemPath = (name: string) => `items/${itemByName(name).slug}/`;
const stat = (page: Page, id: string) => page.locator(`[data-stat="${id}"] .val`);

/** Opens the filter groups on a narrow window, where they are behind a button. */
async function openFilters(page: Page): Promise<void> {
  const toggle = page.locator('[data-filters-toggle]');
  if (await toggle.isVisible()) await toggle.click();
}

async function noHorizontalScroll(page: Page): Promise<void> {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}

// Each test gets its own browser context, so the widths share no state and run in parallel.
for (const width of WIDTHS) {
  test.describe(`at ${width} px`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
    });

    test('root page is the Items page with the site name, the tagline and the legal notice', async ({ page }) => {
      await page.goto('./');
      await expect(page).toHaveTitle('Westwald Archive');
      const header = page.locator('header');
      await expect(header).toContainText('Westwald Archive');
      await expect(header).toContainText('Unofficial fansite for Nelke & the Legendary Alchemists');
      await expect(header.locator('i')).toHaveText('Nelke & the Legendary Alchemists');
      await expect(page.locator('footer')).toContainText(LEGAL_NOTICE);
      await noHorizontalScroll(page);
      await expect(page.locator('[data-grid] a.mini')).toHaveCount(data.items.length);
    });

    test('every grid cell shows the name of its item under the icon', async ({ page }) => {
      await page.goto('./');
      const names = await page.locator('[data-grid] a.mini .nm').allTextContents();
      expect(names).toEqual(data.items.map((i) => i.name));
      const tile = page.locator('[data-grid] a.mini').first();
      const [icon, name] = await Promise.all([tile.locator('.slot').boundingBox(), tile.locator('.nm').boundingBox()]);
      expect(name?.y ?? 0).toBeGreaterThanOrEqual((icon?.y ?? 0) + (icon?.height ?? 0));
    });

    test('Craftable shows a recipe item and hides an item with no recipe', async ({ page }) => {
      await page.goto('./');
      await openFilters(page);
      await page.getByRole('button', { name: 'Craftable' }).click();
      await expect(page.getByRole('link', { name: 'Iron Board', exact: true })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Fire Element', exact: true })).toBeHidden();
      await expect(page.locator('[data-grid] a.mini:visible')).toHaveCount(data.recipes.length);
      expect(new URL(page.url()).search).toBe('?craft=1');
      await noHorizontalScroll(page);
    });

    test('2 filters combine and stay in the URL', async ({ page }) => {
      await page.goto('./');
      await openFilters(page);
      await page.getByRole('button', { name: MERCHANDISE }).click();
      await page.getByRole('button', { name: 'Weapon/Armor Shop' }).click();
      const expected = data.items.filter((i) => i.category === MERCHANDISE && i.shops.includes(Shop.Weapon));
      expect(expected.length).toBeGreaterThan(0);
      await expect(page.locator('[data-grid] a.mini:visible')).toHaveCount(expected.length);
      expect(new URL(page.url()).search).toBe(`?cat=${MERCHANDISE}&shop=${Shop.Weapon}`);
      await page.reload();
      await openFilters(page);
      await expect(page.locator('[data-grid] a.mini:visible')).toHaveCount(expected.length);
      await expect(page.getByRole('button', { name: MERCHANDISE })).toHaveAttribute('aria-pressed', 'true');
    });

    test('a filter with no match shows the empty state with a clear button', async ({ page }) => {
      await page.goto(`./?cat=${ItemCategoryName.Construction}&shop=${Shop.General}`);
      await expect(page.getByText('Nothing matches the filters.')).toBeVisible();
      await page.locator('[data-empty]').getByRole('button', { name: 'Clear filters' }).click();
      await expect(page.locator('[data-grid] a.mini:visible')).toHaveCount(data.items.length);
      expect(new URL(page.url()).search).toBe('');
    });

    test('an icon opens the modal with the URL of the item, and Back closes it', async ({ page }) => {
      await page.goto('./?craft=1');
      const tile = page.getByRole('link', { name: 'Iron Board', exact: true });
      await tile.click();
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      await expect(dialog.getByRole('heading', { name: 'Iron Board' })).toBeVisible();
      expect(new URL(page.url()).pathname).toBe(`${BASE_PATH}${itemPath('Iron Board')}`);
      await noHorizontalScroll(page);
      await page.goBack();
      await expect(dialog).toBeHidden();
      expect(new URL(page.url()).pathname + new URL(page.url()).search).toBe(`${BASE_PATH}?craft=1`);
    });

    test('Esc closes the modal and the focus goes back to the icon', async ({ page }) => {
      await page.goto('./');
      const tile = page.getByRole('link', { name: 'Iron Board', exact: true });
      await tile.click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).toBeHidden();
      await expect(tile).toBeFocused();
      expect(new URL(page.url()).pathname).toBe(BASE_PATH);
    });

    test('a link in the modal replaces its content, and Back shows the content before', async ({ page }) => {
      await page.goto('./');
      await page.getByRole('link', { name: 'Iron Board', exact: true }).click();
      const dialog = page.getByRole('dialog');
      const material = itemByName(data.items.find((i) => i.id === recipeOf('Iron Board').materials[0]?.itemId)?.name ?? '');
      await dialog.locator('[data-section="synthesis"] a.mini', { hasText: material.name }).first().click();
      await expect(dialog.getByRole('heading', { name: material.name, level: 1 })).toBeVisible();
      expect(new URL(page.url()).pathname).toBe(`${BASE_PATH}items/${material.slug}/`);
      await page.goBack();
      await expect(dialog.getByRole('heading', { name: 'Iron Board', level: 1 })).toBeVisible();
      await page.goBack();
      await expect(dialog).toBeHidden();
    });

    test('Esc before the load of a link in the modal ends leaves the list, with no item URL', async ({ page }) => {
      // The handler of a load runs after the page reads the text of the response; the URL is recorded in the task after that run.
      await page.addInitScript(() => {
        const { value: read } = Object.getOwnPropertyDescriptor(Response.prototype, 'text') as {
          value: (this: Response) => Promise<string>;
        };
        Response.prototype.text = async function text(this: Response) {
          const result = await read.call(this);
          setTimeout(() => {
            (window as unknown as { handledUrls: string[] }).handledUrls.push(this.url);
          });
          return result;
        };
        (window as unknown as { handledUrls: string[] }).handledUrls = [];
      });
      await page.goto('./');
      await page.getByRole('link', { name: 'Iron Board', exact: true }).click();
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      const material = itemByName(data.items.find((i) => i.id === recipeOf('Iron Board').materials[0]?.itemId)?.name ?? '');
      const materialPage = new RegExp(`/items/${material.slug}/$`);
      let release!: () => void;
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      await page.route(materialPage, async (route) => {
        await gate;
        await route.continue();
      });
      await dialog.locator('[data-section="synthesis"] a.mini', { hasText: material.name }).first().click();
      await page.keyboard.press('Escape');
      await expect(dialog).toBeHidden();
      expect(new URL(page.url()).pathname).toBe(BASE_PATH);

      const loaded = page.waitForResponse(materialPage);
      release();
      await loaded;
      // The handler of the cancelled load has ended when the page recorded the URL of its response.
      await expect
        .poll(() => page.evaluate(() => (window as unknown as { handledUrls: string[] }).handledUrls.map((url) => new URL(url).pathname)))
        .toContain(`${BASE_PATH}items/${material.slug}/`);
      await expect(dialog).toBeHidden();
      expect(new URL(page.url()).pathname).toBe(BASE_PATH);
      await expect(page.locator('.page')).not.toHaveAttribute('inert');
    });

    test('a craftable item page has the Synthesis section and no horizontal scroll', async ({ page }) => {
      await page.goto(itemPath('Iron Board'));
      await expect(page).toHaveTitle('Iron Board · Westwald Archive');
      await expect(page.getByRole('heading', { name: 'Synthesis', exact: true })).toBeVisible();
      await noHorizontalScroll(page);
    });
  });

  test(`root page footer links to the About page at ${width} px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('./');

    await page.locator('footer').getByRole('link', { name: 'About' }).click();
    await expect(page).toHaveURL(/\/about\/$/);
    await expect(page).toHaveTitle('About · Westwald Archive');
  });

  test(`About page at ${width} px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('about/');

    await expect(page).toHaveTitle('About · Westwald Archive');
    await expect(page.locator('header')).toContainText('Westwald Archive');

    const main = page.locator('main');
    await expect(main.getByRole('heading', { level: 2 })).toHaveText(['Contact', 'Source', 'Legal']);
    const section = (title: string) => main.locator('section', { has: page.getByRole('heading', { name: title }) });
    await expect(section('Contact').locator('a[href="https://github.com/Arkased/NelkeData/issues"]')).toHaveCount(1);
    await expect(section('Source').locator('a[href="https://github.com/Arkased/NelkeData"]')).toHaveCount(1);
    await expect(main.locator('section', { hasText: 'Legal' })).toContainText(LEGAL_NOTICE);

    await expect(page.locator('footer')).toHaveCount(0);

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
}

test.describe('header', () => {
  const HEIGHT = 900;

  test('below the breakpoint the Items link is behind the Menu button, until a click', async ({ page }) => {
    await page.setViewportSize({ width: NAV_BREAKPOINT - 1, height: HEIGHT });
    await page.goto('./');
    const nav = page.getByRole('navigation', { name: 'Pages' });
    const menu = page.getByRole('button', { name: 'Menu' });
    await expect(menu).toBeVisible();
    await expect(nav).toBeHidden();
    await menu.click();
    await expect(nav).toBeVisible();
    await expect(nav.getByRole('link')).toHaveText(['Items']);
    await expect(nav.getByRole('link', { name: 'Items' })).toHaveAttribute('aria-current', 'page');
  });

  test('at the breakpoint the Items link shows and there is no Menu button', async ({ page }) => {
    await page.setViewportSize({ width: NAV_BREAKPOINT, height: HEIGHT });
    await page.goto('./');
    const nav = page.getByRole('navigation', { name: 'Pages' });
    await expect(page.getByRole('button', { name: 'Menu' })).toBeHidden();
    await expect(nav).toBeVisible();
    await expect(nav.getByRole('link')).toHaveText(['Items']);
    await expect(nav.getByRole('link', { name: 'Items' })).toHaveAttribute('aria-current', 'page');
  });
});

test.describe('item pages', () => {
  test('a craftable item with no price shows Synth. Lv., the cost, the material cost and the materials with quantities', async ({
    page,
  }) => {
    const recipe = recipeOf('Iron Board');
    await page.goto(itemPath('Iron Board'));
    const synthesis = page.locator('[data-section="synthesis"]');
    await expect(stat(page, 'synth-level')).toHaveText(`Lv ${recipe.synthesisLevel}`);
    await expect(stat(page, 'synthesis-cost')).toHaveText(format(recipe.synthesisCost));
    await expect(stat(page, 'material-cost')).toHaveText(format(recipe.inputCost));
    await expect(page.locator('[data-stat="selling-price"]')).toHaveCount(0);
    await expect(page.locator('[data-stat="added-value"]')).toHaveCount(0);
    await expect(synthesis.locator('.minis a.mini')).toHaveCount(recipe.materials.length);
    await expect(synthesis.locator('.qty')).toHaveCount(recipe.materials.filter((m) => m.quantity >= 2).length);
  });

  test('a priced craftable item shows the calculation, the teacher, the heart and the event', async ({ page }) => {
    const item = itemByName('Harmonium');
    const recipe = recipeOf('Harmonium');
    await page.goto(itemPath('Harmonium'));
    await expect(stat(page, 'synth-level')).toHaveText(`Lv ${recipe.synthesisLevel}`);
    await expect(stat(page, 'selling-price')).toHaveText(format(item.price));
    await expect(stat(page, 'material-cost')).toHaveText(format(recipe.inputCost));
    await expect(stat(page, 'added-value')).toHaveText(format(recipe.addedValue ?? 0));
    await expect(stat(page, 'value-per-cost')).toContainText(format(recipe.addedValuePerCost ?? 0));
    const unlock = page.locator('[data-section="unlock"]');
    await expect(unlock.getByText('Taught by')).toBeVisible();
    await expect(unlock.getByText('Event')).toBeVisible();
    await expect(unlock).not.toContainText(/EVENT_/);
  });

  test('the friendship level of a teacher shows as the heart of the game with a digit sprite', async ({ page }) => {
    const set = data.recipeSets.find((s) => s.teacherId !== null && (s.friendship ?? 0) > 0 && s.recipeIds.length === 1);
    const recipe = data.recipes.find((r) => r.id === set?.recipeIds[0]);
    const item = data.items.find((i) => i.id === recipe?.resultItemId);
    if (!item) throw new Error('No recipe with a friendship level');
    await page.goto(`items/${item.slug}/`);
    const heart = page.locator('[data-section="unlock"] .fr');
    await expect(heart).toHaveCount(1);
    await expect(heart).toHaveAttribute('aria-label', `Friendship ${set?.friendship}`);
    await expect(heart.locator('img')).not.toHaveCount(0);
    await expect(heart).toHaveText('');
  });

  test('a loss shows the added value in red and a research recipe shows the research and the unpriced materials', async ({ page }) => {
    await page.goto(itemPath('Dark Water'));
    await expect(page.locator('[data-stat="added-value"]')).toHaveClass(new RegExp(StatTone.Bad));
    await page.goto(itemPath('Spruce'));
    await expect(page.locator('[data-section="unlock"]').getByText('Research', { exact: true })).toBeVisible();
    await expect(page.getByText('Counted as 0 (no price)')).toBeVisible();
  });

  test('an item that is not craftable has no Synthesis section', async ({ page }) => {
    await page.goto(itemPath('Fire Element'));
    await expect(page.getByRole('heading', { name: 'Fire Element', level: 1 })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Synthesis', exact: true })).toHaveCount(0);
    await expect(page.locator('[data-section="synthesis"]')).toHaveCount(0);
  });

  test('a gather item shows its areas, the highest rate first, with a rate under 100', async ({ page }) => {
    const item = itemByName('Fire Element');
    await page.goto(itemPath('Fire Element'));
    const how = page.locator('[data-section="how-to-get"]');
    await expect(page.getByRole('heading', { name: 'Gather', level: 3 })).toBeVisible();
    const first = item.gather.toSorted((a, b) => b.rate - a.rate)[0];
    const area = data.areas.find((a) => a.id === first?.areaId);
    await expect(how.locator('.link').first()).toContainText(area?.name ?? '');
    await expect(how).not.toContainText('100%');
    // An area has no page yet, so its name is plain text.
    await expect(how.locator('.link a')).toHaveCount(0);
  });

  test('a drop item shows its monster with no quantity badge', async ({ page }) => {
    const item = itemByName('Uni');
    await page.goto(itemPath('Uni'));
    await expect(page.getByRole('heading', { name: 'Monster drops', level: 3 })).toBeVisible();
    const how = page.locator('[data-section="how-to-get"]');
    const monster = data.monsters.find((m) => m.id === item.drops[0]?.monsterId);
    await expect(how.locator('.mini').first()).toContainText(monster?.name ?? '');
    await expect(how.locator('.qty')).toHaveCount(0);
  });

  test('a material shows the items that use it, as links', async ({ page }) => {
    const item = itemByName('Fire Element');
    await page.goto(itemPath('Fire Element'));
    const used = page.locator('[data-section="used-in"]');
    await expect(used.locator('a.mini')).toHaveCount(item.usedInRecipeIds.length);
    await expect(used.getByRole('link', { name: 'Iron Board' })).toHaveAttribute('href', `${BASE_PATH}${itemPath('Iron Board')}`);
  });

  test('an element of Reduce links to its element item', async ({ page }) => {
    await page.goto(itemPath('Iron Board'));
    await expect(page.locator('[data-fact="reduces-into"] a.el').first()).toHaveAttribute(
      'href',
      new RegExp(`${BASE_PATH}items/.+-element/`),
    );
  });

  test('an item with a price and shops shows them in the top block', async ({ page }) => {
    const item = data.items.find((i) => i.price > 0 && i.shops.length > 0);
    if (!item) throw new Error('No sold item');
    await page.goto(`items/${item.slug}/`);
    await expect(page.locator('[data-fact="price"]')).toHaveText(format(item.price));
    await expect(page.locator('[data-fact="sold-at"] .shop')).toHaveCount(item.shops.length);
  });

  test('the top block shows the category line, the price, "Sold at", "Reduces into" and the description', async ({ page }) => {
    const item = data.items.find(
      (i) => i.price > 0 && i.shops.length > 0 && Object.values(i.reduce).some((v) => v > 0) && i.description !== null,
    );
    if (!item) throw new Error('No item with a price, shops, a reduce and a description');
    await page.goto(`items/${item.slug}/`);
    const top = page.locator('.top');
    await expect(top.locator('.catline')).toContainText(item.category);
    await expect(top.locator('[data-fact="price"]')).toHaveText(format(item.price));
    await expect(top.locator('[data-fact="sold-at"]')).toContainText('Sold at');
    await expect(top.locator('[data-fact="sold-at"] .shop')).toHaveCount(item.shops.length);
    await expect(top.locator('[data-fact="reduces-into"]')).toContainText('Reduces into');
    await expect(top.locator('[data-fact="reduces-into"] a.el')).toHaveCount(Object.values(item.reduce).filter((v) => v > 0).length);
    await expect(page.locator('.desc')).toHaveText(item.description ?? '');
  });

  test('an item with no price, no shop and no reduce shows only the category line', async ({ page }) => {
    const item = data.items.find((i) => i.price === 0 && i.shops.length === 0 && Object.values(i.reduce).every((v) => v === 0));
    if (!item) throw new Error('No item without price, shops and reduce');
    await page.goto(`items/${item.slug}/`);
    await expect(page.locator('.top .catline')).toBeVisible();
    await expect(page.locator('[data-fact]')).toHaveCount(0);
  });

  test('the values of the recipes match data/recipes.json', async ({ page }) => {
    const SAMPLE_STEP = 12;
    const sample = data.recipes.filter((_, index) => index % SAMPLE_STEP === 0);
    expect(sample.length).toBeGreaterThan(10);
    for (const recipe of sample) {
      const item = data.items.find((i) => i.id === recipe.resultItemId);
      if (!item) throw new Error(`No item for ${recipe.id}`);
      await page.goto(`items/${item.slug}/`);
      await expect(stat(page, 'synth-level')).toHaveText(`Lv ${recipe.synthesisLevel}`);
      await expect(stat(page, 'synthesis-cost')).toHaveText(format(recipe.synthesisCost));
      await expect(stat(page, 'material-cost')).toHaveText(format(recipe.inputCost));
      if (recipe.addedValue === null) {
        await expect(page.locator('[data-stat="added-value"]')).toHaveCount(0);
      } else {
        await expect(stat(page, 'selling-price')).toHaveText(format(item.price));
        await expect(stat(page, 'added-value')).toHaveText(format(recipe.addedValue));
      }
      if (recipe.addedValuePerCost !== null) {
        await expect(stat(page, 'value-per-cost')).toContainText(format(recipe.addedValuePerCost));
      }
    }
  });

  test('every money and cost value has its game icon, and no stat is empty', async ({ page }) => {
    await page.goto(itemPath('Harmonium'));
    for (const unit of await page.locator('.unit').all()) {
      await expect(unit.locator('img.ico')).toHaveCount(1);
    }
    for (const value of await page.locator('.stat .val').all()) {
      expect((await value.textContent())?.trim()).not.toBe('');
    }
  });
});

test.describe('names and links', () => {
  test('no name on the site is a placeholder', async ({ page }) => {
    await page.goto('./');
    const names = await page.locator('[data-grid] .nm').allTextContents();
    expect(names.length).toBeGreaterThan(0);
    for (const name of names) expect(isPlaceholder(name, '')).toBe(false);
  });

  test('an entity with a page is a link, and one with no page is plain text', async ({ page }) => {
    await page.goto(itemPath('Spruce'));
    const how = page.locator('[data-section="synthesis"]');
    await expect(how.locator('.minis a.mini').first()).toHaveAttribute('href', new RegExp(`^${BASE_PATH}items/`));
    await expect(how.locator('[data-section="unlock"] a')).toHaveCount(0);
    await page.goto(itemPath('Uni'));
    await expect(page.locator('[data-section="how-to-get"] .mini').first()).not.toHaveAttribute('href', /.+/);
  });
});
