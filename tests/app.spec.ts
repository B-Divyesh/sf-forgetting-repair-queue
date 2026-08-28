import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function clearLocalState(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.evaluate(async () => {
    localStorage.clear();
    await new Promise<void>((resolve) => {
      const request = indexedDB.deleteDatabase('repair-queue-local');
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
      request.onblocked = () => resolve();
    });
  });
  await page.reload();
}

test.beforeEach(async ({ page }) => {
  await clearLocalState(page);
});

test('imports a sample, explains the rank, and saves a repair', async ({ page }) => {
  await expect(page.getByRole('heading', { level: 1, name: /Find the prompt/ })).toBeVisible();
  await page.getByRole('button', { name: 'Try a sample file' }).click();
  await expect(page.getByText('18 cards · card summary')).toBeVisible();
  await expect(page.getByText(/recent_failures → failures/)).toBeVisible();
  await page.getByRole('button', { name: /Build the repair queue/ }).click();

  await expect(page.getByRole('heading', { level: 2, name: 'Flagged cards' })).toBeVisible();
  await expect(page.getByText('3 more ranked cards')).toBeVisible();
  await expect(page.getByText(/This card failed 7 of 12/)).toBeVisible();
  await expect(page.getByText('Recent failures', { exact: true })).toBeVisible();

  await page.getByLabel('Revised prompt').fill('Which major political revolution began in France in 1789?');
  await page.getByLabel('It asks one thing').check();
  await page.getByRole('button', { name: /Save revise & next/ }).click();
  await expect(page.getByRole('status')).toContainText('Revise saved');
  await expect(page.getByText('1 repaired')).toBeVisible();
});

test('reports malformed or unmapped data with a next step', async ({ page }) => {
  await page.getByText('Or paste CSV text').click();
  await page.getByLabel('CSV or tab-separated text').fill('foo,bar\none,two');
  await page.getByRole('button', { name: 'Preview columns' }).click();
  await expect(page.getByRole('alert')).toContainText('Include a header such as Front');
});

test('has no serious accessibility issues on landing and workbench', async ({ page }) => {
  let results = await new AxeBuilder({ page: page as never }).analyze();
  expect(results.violations.filter((item) => ['serious', 'critical'].includes(item.impact ?? ''))).toEqual([]);

  await page.getByRole('button', { name: 'Try a sample file' }).click();
  await page.getByRole('button', { name: /Build the repair queue/ }).click();
  results = await new AxeBuilder({ page: page as never }).analyze();
  expect(results.violations.filter((item) => ['serious', 'critical'].includes(item.impact ?? ''))).toEqual([]);
  await expect(page.locator('h1')).toHaveCount(1);
});

test('works at 390px without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Try a sample file' }).click();
  await page.getByRole('button', { name: /Build the repair queue/ }).click();
  const sizes = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, width: document.documentElement.clientWidth }));
  expect(sizes.scroll).toBeLessThanOrEqual(sizes.width);
  await expect(page.getByRole('button', { name: /Save revise & next/ })).toBeVisible();
});

test('reopens a saved queue while offline', async ({ page, context }) => {
  await page.getByRole('button', { name: 'Try a sample file' }).click();
  await page.getByRole('button', { name: /Build the repair queue/ }).click();
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => navigator.serviceWorker.controller?.state === 'activated');
  await page.waitForTimeout(500);
  await page.reload();
  await expect(page.getByRole('heading', { level: 2, name: 'Flagged cards' })).toBeVisible();
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: 'Repair Queue' })).toBeVisible();
  await expect(page.getByText('Offline · changes save locally')).toBeVisible();
});

test('serves privacy and terms as standalone accessible pages', async ({ page }) => {
  await page.goto('/privacy/');
  await expect(page).toHaveTitle(/Privacy/);
  await expect(page.locator('main')).toHaveCount(1);
  await page.goto('/terms/');
  await expect(page).toHaveTitle(/Terms/);
  await expect(page.getByText('$12 USD one-time purchase')).toBeVisible();
});
