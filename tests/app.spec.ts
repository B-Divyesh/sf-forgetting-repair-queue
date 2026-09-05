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

async function openDemo(page: import('@playwright/test').Page) {
  await page.goto('/demo');
  await expect(page.getByRole('heading', { level: 2, name: 'Flagged cards' })).toBeVisible();
  await expect(page.getByText('Demo — sample data, nothing is saved')).toBeVisible();
}

async function saveSampleRepair(page: import('@playwright/test').Page, prompt = 'Which political revolution began in France in 1789?') {
  await page.getByLabel('Revised prompt').fill(prompt);
  await page.getByLabel('It asks one thing').check();
  await page.getByRole('button', { name: /Save revise & next/ }).click();
  await expect(page.getByRole('status')).toContainText('Revise saved');
}

test.beforeEach(async ({ page }) => {
  await clearLocalState(page);
});

test('@claim:demo-one-click Try it with sample data opens a ranked queue in one click', async ({ page }) => {
  await expect(page.getByRole('heading', { level: 1, name: 'Repair weak flashcard prompts' })).toBeVisible();
  await page.getByRole('button', { name: /Try it with sample data/ }).click();

  await expect(page).toHaveURL(/\/demo$/);
  await expect(page.getByRole('heading', { level: 2, name: 'Flagged cards' })).toBeVisible();
  await expect(page.getByText('15 in this queue')).toBeVisible();
  await expect(page.getByText('3 more ranked cards')).toBeVisible();
  await expect(page.getByText('Demo — sample data, nothing is saved')).toBeVisible();
  await expect(page.getByRole('button', { name: /Build the repair queue/ })).toHaveCount(0);
});

test('@claim:score-explanation Each flagged sample card shows the evidence behind its score', async ({ page }) => {
  await openDemo(page);
  await expect(page.getByText('This card failed 7 of 12 recent reviews (58%).')).toBeVisible();
  await expect(page.getByLabel('Score breakdown')).toContainText('44 of 75 points');
  await expect(page.getByLabel('Score breakdown')).toContainText('18 of 20 points');
  await expect(page.getByLabel('Score breakdown')).toContainText('5 of 5 points');
});

test('@claim:demo-isolation Demo changes do not replace a real queue', async ({ page }) => {
  await page.getByRole('button', { name: 'Analyse your export' }).click();
  await page.getByText('Or paste CSV text').click();
  await page.getByLabel('CSV or tab-separated text').fill('card_id,front,back,recent_reviews,recent_failures,average_ms\nreal-1,Real prompt,Real answer,8,5,12000');
  await page.getByRole('button', { name: 'Preview pasted CSV columns' }).click();
  await page.getByRole('button', { name: /Build the repair queue/ }).click();
  await expect(page.getByText('1 in this queue')).toBeVisible();

  await page.getByRole('link', { name: 'Demo' }).click();
  await expect(page.getByText('15 in this queue')).toBeVisible();
  await expect(page.getByText('3 more ranked cards')).toBeVisible();
  await saveSampleRepair(page);
  await page.getByRole('button', { name: 'Start for real' }).click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText('1 in this queue')).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Revised prompt' })).toHaveValue('Real prompt');
  await expect(page.getByText('Demo — sample data, nothing is saved')).toHaveCount(0);
});

test('@claim:local-browser-only Sample analysis sends no request away from this origin', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  const requests: string[] = [];
  page.on('request', (request) => requests.push(request.url()));

  try {
    await page.goto('/');
    await page.getByRole('button', { name: /Try it with sample data/ }).click();
    await saveSampleRepair(page);

    expect(requests.length).toBeGreaterThan(0);
    expect(requests.every((url) => new URL(url).origin === 'http://127.0.0.1:4173')).toBe(true);
  } finally {
    await context.close();
  }
});

test('@claim:original-download Original import download remains unchanged after a repair', async ({ page }) => {
  await openDemo(page);
  await saveSampleRepair(page, 'Which event began in France in 1789?');

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download original' }).click();
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  let contents = '';
  for await (const chunk of stream ?? []) contents += chunk.toString();

  expect(download.suggestedFilename()).toBe('original-sample-trouble-cards.csv');
  expect(contents).toContain('What happened in 1789?');
  expect(contents).not.toContain('Which event began in France in 1789?');
  expect(contents.trim().split('\n')).toHaveLength(19);
});

test('@claim:csv-export Export plan produces a CSV row for a saved repair', async ({ page }) => {
  await openDemo(page);
  await saveSampleRepair(page);

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export plan' }).click();
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  let contents = '';
  for await (const chunk of stream ?? []) contents += chunk.toString();

  expect(download.suggestedFilename()).toBe('repair-queue-plan.csv');
  const rows = contents.trim().split('\n');
  expect(rows).toHaveLength(2);
  expect(rows[0]).toContain('source_card_id');
  expect(rows[1]).toContain('revise');
});

test('@claim:one-time-unlock Workbench Plus shows its one-time price and unlimited queue feature', async ({ page }) => {
  await openDemo(page);
  await expect(page.getByText('One-time unlock · $12 USD')).toBeVisible();
  await expect(page.getByText(/unlocks unlimited ranked cards in every local repair queue/)).toBeVisible();
  await expect(page.getByRole('link', { name: 'Buy once · $12' })).toHaveAttribute(
    'href',
    'https://api.sociobot.in/api/v1/products/forgetting-repair-queue/checkout',
  );
});

test('@claim:offline-reload The saved demo queue reopens offline after first visit', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await openDemo(page);
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.waitForFunction(async () => Boolean(navigator.serviceWorker.controller && await caches.match('/index.html')));

    await context.setOffline(true);
    await page.reload();

    await expect(page.getByRole('heading', { level: 1, name: 'Repair weak flashcard prompts' })).toBeVisible();
    await expect(page.getByText('Offline · changes save locally')).toBeVisible();
    await expect(page.getByText('Demo — sample data, nothing is saved')).toBeVisible();
  } finally {
    await context.close();
  }
});

test('reports malformed or unmapped data with a next step', async ({ page }) => {
  await page.getByRole('button', { name: 'Analyse your export' }).click();
  await page.getByText('Or paste CSV text').click();
  await page.getByLabel('CSV or tab-separated text').fill('foo,bar\none,two');
  await page.getByRole('button', { name: 'Preview pasted CSV columns' }).click();
  await expect(page.getByRole('alert')).toContainText('Include a header such as Front');
});

test('has no serious accessibility issues on the landing page or demo queue', async ({ page }) => {
  let results = await new AxeBuilder({ page: page as never }).analyze();
  expect(results.violations.filter((item) => ['serious', 'critical'].includes(item.impact ?? ''))).toEqual([]);

  await openDemo(page);
  results = await new AxeBuilder({ page: page as never }).analyze();
  expect(results.violations.filter((item) => ['serious', 'critical'].includes(item.impact ?? ''))).toEqual([]);
  await expect(page.locator('h1')).toHaveCount(1);
});

test('works at 390px without horizontal overflow and keeps keyboard controls reachable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openDemo(page);
  const sizes = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, width: document.documentElement.clientWidth }));
  expect(sizes.scroll).toBeLessThanOrEqual(sizes.width);
  for (let index = 0; index < 7; index += 1) await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Start for real' })).toBeFocused();
  await expect(page.getByRole('button', { name: /Save revise & next/ })).toBeVisible();
});

test('serves privacy and terms as standalone accessible pages', async ({ page }) => {
  await page.goto('/privacy/');
  await expect(page).toHaveTitle(/Privacy/);
  await expect(page.locator('main')).toHaveCount(1);
  await page.goto('/terms/');
  await expect(page).toHaveTitle(/Terms/);
  await expect(page.getByText('$12 USD one-time purchase')).toBeVisible();
});
