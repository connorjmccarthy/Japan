import { test, expect } from '@playwright/test';

const VIEWS = ['overview', 'itinerary', 'flights', 'stays', 'food', 'budget', 'checklist', 'map', 'decisions', 'vault', 'settings'];

async function boot(page, hash = '#/overview') {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
  await page.route(/fonts\.googleapis\.com|fonts\.gstatic\.com|tile\.openstreetmap\.org/, (r) => r.abort());
  await page.goto(`/${hash}`);
  await expect(page.locator('#topbar-heading')).not.toHaveText('');
  return errors;
}

test.describe('shell', () => {
  test('every view renders without JS errors and without horizontal overflow', async ({ page }) => {
    const errors = await boot(page);
    for (const v of VIEWS) {
      await page.goto(`/#/${v}`);
      await page.waitForTimeout(150);
      await expect(page.locator('#main')).not.toBeEmpty();
      const w = await page.evaluate(() => document.documentElement.scrollWidth);
      const vw = await page.evaluate(() => window.innerWidth);
      expect(w, `${v} overflows horizontally`).toBeLessThanOrEqual(vw + 1);
    }
    expect(errors).toEqual([]);
  });

  test('navigation chrome matches the viewport', async ({ page, isMobile }) => {
    await boot(page);
    if (isMobile) {
      await expect(page.locator('#tabbar')).toBeVisible();
      await expect(page.locator('#sidebar')).not.toBeInViewport();
      await page.getByRole('button', { name: 'More' }).click();
      await expect(page.locator('#sidebar')).toHaveClass(/open/);
      await page.locator('#nav-list').getByRole('button', { name: /Food/ }).click();
      await expect(page.locator('#topbar-heading')).toHaveText('Food');
      await expect(page.locator('#sidebar')).not.toHaveClass(/open/);
    } else {
      await expect(page.locator('#sidebar')).toBeVisible();
      await expect(page.locator('#tabbar')).toBeHidden();
      await page.locator('#nav-list').getByRole('button', { name: /Budget/ }).click();
      await expect(page.locator('#topbar-heading')).toHaveText('Budget');
    }
  });
});

test.describe('itinerary editing', () => {
  test('add, edit, delete an item and persist across reload', async ({ page }) => {
    await boot(page, '#/itinerary');
    await page.getByRole('button', { name: '+ Add', exact: true }).click();
    await page.getByLabel('Title').fill('Test ramen stop');
    await page.getByLabel('Start time').fill('12:30');
    await page.getByLabel('Cost', { exact: true }).fill('1500');
    await page.getByLabel('Currency').selectOption('JPY');
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    await expect(page.locator('.tl-title', { hasText: 'Test ramen stop' })).toBeVisible();
    await expect(page.locator('.tl-foot', { hasText: '¥1,500' })).toBeVisible();

    await page.reload();
    await expect(page.locator('.tl-title', { hasText: 'Test ramen stop' })).toBeVisible();

    await page.locator('.tl-body', { hasText: 'Test ramen stop' }).click();
    await page.getByLabel('Title').fill('Test ramen stop (edited)');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.locator('.tl-title', { hasText: 'Test ramen stop (edited)' })).toBeVisible();

    await page.locator('.tl-body', { hasText: 'Test ramen stop (edited)' }).click();
    await page.getByRole('button', { name: 'Delete', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true }).click();
    await expect(page.locator('.tl-title', { hasText: 'Test ramen stop' })).toHaveCount(0);
  });

  test('a private note never reaches the exported plan', async ({ page }) => {
    await boot(page, '#/itinerary');
    await page.getByRole('button', { name: '+ Add', exact: true }).click();
    await page.getByLabel('Title').fill('Secret holder');
    await page.getByLabel(/Private note/).fill('SECRETREF123');
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    await expect(page.locator('.tl-foot', { hasText: 'SECRETREF123' })).toBeVisible();
    const json = await page.evaluate(() => localStorage.getItem('jp27:trip'));
    expect(json).toContain('Secret holder');
    expect(json).not.toContain('SECRETREF123');
    await page.goto('/#/vault');
    await expect(page.getByText('SECRETREF123')).toBeVisible();
  });
});

test.describe('money and lists', () => {
  test('a manual budget line changes the total', async ({ page }) => {
    await boot(page, '#/budget');
    const before = await page.locator('.stat-value').first().textContent();
    await page.getByRole('button', { name: '+ Add line' }).click();
    await page.getByLabel('What').fill('Test insurance');
    await page.getByLabel('Amount').fill('123');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.locator('.row-title', { hasText: 'Test insurance' })).toBeVisible();
    const after = await page.locator('.stat-value').first().textContent();
    expect(after).not.toEqual(before);
  });

  test('a planned stay flows into the budget', async ({ page }) => {
    await boot(page, '#/stays');
    await page.getByRole('button', { name: '+ Add stay' }).click();
    await page.getByLabel('Name').fill('Test Ryokan');
    await page.getByLabel('Town').fill('Testville');
    await page.getByLabel('Status').selectOption('planned');
    await page.getByLabel('Price per night (AUD)').fill('150');
    await page.getByLabel('Nights').fill('2');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.locator('.row-title', { hasText: 'Test Ryokan' })).toBeVisible();
    await page.goto('/#/budget');
    await expect(page.locator('.row-title', { hasText: 'Test Ryokan (2 nt)' })).toBeVisible();
    await expect(page.locator('.row-side', { hasText: 'A$300' }).first()).toBeVisible();
  });

  test('checklist add and tick', async ({ page }) => {
    await boot(page, '#/checklist');
    await page.getByRole('button', { name: '+ Add', exact: true }).click();
    await page.getByLabel('To do').fill('Test: buy eSIM');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    const row = page.locator('.check', { hasText: 'Test: buy eSIM' });
    await expect(row).toBeVisible();
    await row.getByRole('checkbox').check();
    await expect(page.locator('.check', { hasText: 'Test: buy eSIM' })).toHaveCount(0); // "Open" filter hides done items
    await page.getByRole('button', { name: 'Done', exact: true }).click();
    await expect(page.locator('.check.done', { hasText: 'Test: buy eSIM' })).toBeVisible();
  });

  test('a decision can be answered', async ({ page }) => {
    await boot(page, '#/decisions');
    await page.getByRole('button', { name: '+ Add', exact: true }).click();
    await page.getByLabel('Question').fill('Test question?');
    await page.getByLabel('Your answer').fill('Yes');
    await page.getByLabel('Decided').check();
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.locator('.card', { hasText: 'Test question?' }).locator('.pill', { hasText: 'Decided' })).toBeVisible();
  });
});

test.describe('settings', () => {
  test('theme toggle and export', async ({ page }) => {
    await boot(page, '#/settings');
    await page.getByRole('button', { name: 'Dark', exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.getByRole('button', { name: 'Auto', exact: true }).click();
    await expect(page.locator('html')).not.toHaveAttribute('data-theme', /./);
    await page.getByRole('button', { name: 'Export', exact: true }).click();
    const val = await page.getByLabel('Plan JSON').inputValue();
    expect(JSON.parse(val).meta.title).toBeTruthy();
  });

  test('without a token the sync pill says on device', async ({ page }) => {
    await boot(page);
    await expect(page.locator('#sync-pill')).toHaveAttribute('data-state', 'local');
  });
});

test.describe('calendar export', () => {
  test('produces a valid ics with one event per item', async ({ page }) => {
    await boot(page, '#/settings');
    const ics = await page.evaluate(async () => { const m = await import('../src/ics.js'); const s = JSON.parse(localStorage.getItem('jp27:trip')); return m.buildIcs(s); });
    expect(ics.startsWith('BEGIN:VCALENDAR')).toBe(true);
    const items = await page.evaluate(() => JSON.parse(localStorage.getItem('jp27:trip')).days.flatMap((d) => d.items.filter((i) => i.status !== 'skip')).length);
    expect((ics.match(/BEGIN:VEVENT/g) || []).length).toBe(items);
    expect(ics).toContain('SUMMARY:QF481 Sydney → Melbourne');
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download calendar (.ics)' }).click()]);
    expect(download.suggestedFilename()).toBe('japan-2027.ics');
  });
});

test.describe('sync safety', () => {
  test('first sync with local edits never overwrites a different GitHub version', async ({ page }) => {
    await boot(page, '#/checklist');
    // make a local edit so the device copy is "dirty"
    await page.getByRole('button', { name: '+ Add', exact: true }).click();
    await page.getByLabel('To do').fill('Local-only edit');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    // fake GitHub: the repo already holds a different plan
    const remote = { meta: { title: 'Remote plan', start: '2027-02-08', end: '2027-02-17', jpyPerAud: 108, updatedAt: '2030-01-01T00:00:00Z' }, days: [], flights: { confirmed: [], legs: [], lounges: [] }, points: {}, stays: [], food: [], budget: [], checklist: [], places: [], questions: [] };
    const b64 = Buffer.from(JSON.stringify(remote)).toString('base64');
    let putCalls = 0;
    await page.route(/api\.github\.com\/repos\/.*\/contents\//, (route) => {
      if (route.request().method() === 'PUT') { putCalls++; return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: { sha: 'newsha' } }) }); }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ sha: 'remotesha', content: b64 }) });
    });
    await page.route(/api\.github\.com\/repos\/[^/]+\/[^/]+$/, (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ private: false, default_branch: 'main', permissions: { push: true } }) }));
    await page.goto('/#/settings');
    await page.getByLabel('GitHub token').fill('ghp_test');
    await page.getByRole('button', { name: 'Save & test' }).click();
    await expect(page.locator('#sync-pill')).toHaveAttribute('data-state', 'error'); // conflict shows as the red state
    await expect(page.getByRole('button', { name: 'Use GitHub version' })).toBeVisible();
    expect(putCalls).toBe(0);
    // choosing GitHub's version replaces the local plan
    await page.getByRole('button', { name: 'Use GitHub version' }).click();
    await expect(page.locator('#topbar-kicker')).toHaveText('Remote plan');
  });
});
