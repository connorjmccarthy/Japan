import { test, expect } from '@playwright/test';

const VIEWS = ['overview', 'itinerary', 'go', 'flights', 'stays', 'food', 'budget', 'checklist', 'map', 'souvenirs', 'decisions', 'vault', 'settings'];
// Storage is namespaced per trip now; these tests all run against the Japan trip.
const TRIP_KEY = 't:japan:trip';

async function boot(page, hash = '#/overview', opts = {}) {
  const { trip = 'japan', seedSettings = true } = opts;
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
  await page.route(/fonts\.googleapis\.com|fonts\.gstatic\.com|tile\.openstreetmap\.org/, (r) => r.abort());
  // Shipped defaults hide money and the private trips because the link is shared.
  // Most tests are about the owner's view, so seed the switches on and pin the
  // Japan trip. Both guards mean a test that changes either in the UI still wins.
  await page.addInitScript(({ t, seed }) => {
    try {
      if (!localStorage.getItem('app:tripId')) localStorage.setItem('app:tripId', JSON.stringify(t));
      if (seed && !localStorage.getItem('app:settings')) localStorage.setItem('app:settings', JSON.stringify({ showAllTrips: true, showBudget: true }));
    } catch { /* blocked storage */ }
  }, { t: trip, seed: seedSettings });
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
      const [w, vw] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
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
    const json = await page.evaluate((k) => localStorage.getItem(k), TRIP_KEY);
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
    await page.getByLabel('To do', { exact: true }).fill('Test: buy eSIM');
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
    const ics = await page.evaluate(async (k) => { const m = await import('../src/ics.js'); const s = JSON.parse(localStorage.getItem(k)); return m.buildIcs(s); }, TRIP_KEY);
    expect(ics.startsWith('BEGIN:VCALENDAR')).toBe(true);
    const items = await page.evaluate((k) => { const t = JSON.parse(localStorage.getItem(k)); const v = t.variants?.active; return t.days.flatMap((d) => d.items.filter((i) => i.status !== 'skip' && (!v || !i.variant || i.variant === v))).length; }, TRIP_KEY);
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
    await page.getByLabel('To do', { exact: true }).fill('Local-only edit');
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

test.describe('plan variants', () => {
  test('switching plans changes the itinerary, stays and budget', async ({ page, isMobile }) => {
    await boot(page, '#/itinerary/2027-02-13');
    if (isMobile) await page.getByRole('button', { name: 'More' }).click();
    await page.locator('#variant-switch').getByRole('button', { name: 'A: Ski' }).click();
    await expect(page.locator('.day-title')).toContainText('Ski Nozawa');
    if (isMobile) await page.getByRole('button', { name: 'More' }).click();
    await page.locator('#variant-switch').getByRole('button', { name: 'B: Culture' }).click();
    await expect(page.locator('.day-title')).toContainText('Shirakawa-go');
    await expect(page.locator('.tl-title', { hasText: 'Nozawa Onsen Snow Resort' })).toHaveCount(0);
    await page.goto('/#/stays');
    await expect(page.locator('.row-title', { hasText: 'gassho' })).toBeVisible();
    await expect(page.locator('.row-title', { hasText: 'Nozawa Peaks' })).toHaveCount(0);
    await page.goto('/#/budget');
    const totalB = await page.locator('.stat-value').first().textContent();
    if (isMobile) await page.getByRole('button', { name: 'More' }).click();
    await page.locator('#variant-switch').getByRole('button', { name: 'A: Ski' }).click();
    await expect(page.locator('.stat-value').first()).not.toHaveText(totalB);
    const totalA = await page.locator('.stat-value').first().textContent();
    expect(totalA).not.toEqual(totalB);
    // a new item defaults to the plan you are looking at (A is active now)
    await page.goto('/#/itinerary/2027-02-12');
    await page.getByRole('button', { name: '+ Add', exact: true }).click();
    await expect(page.getByLabel('Applies to')).toHaveValue('ski');
  });
});


test.describe('day map', () => {
  test('the plan page shows numbered pins for the day', async ({ page }) => {
    await boot(page, '#/itinerary/2027-02-11');
    await expect(page.locator('.daymap-head')).toContainText('stops');
    await expect(page.locator('.daymap-legend li').first()).toBeVisible();
    const pins = await page.locator('.leaflet-marker-icon').count();
    expect(pins).toBeGreaterThan(2);
    await page.locator('.daymap-head').click();
    await expect(page.locator('.daymap-canvas')).toBeHidden();
  });

  test('each day shows a walking estimate that follows the active plan', async ({ page, isMobile }) => {
    await boot(page, '#/itinerary/2027-02-11');
    await expect(page.locator('.day-walk')).toContainText('steps');
    const text = await page.locator('.day-walk').textContent();
    if (isMobile) await page.getByRole('button', { name: 'More' }).click();
    await page.locator('#variant-switch').getByRole('button', { name: 'A: Ski' }).click();
    await expect(page.locator('.day-walk')).not.toHaveText(text);
    await expect(page.locator('.day-walk')).toContainText('Narai');
  });
});


test.describe('vault encryption', () => {
  test('round-trips with the right passphrase and fails with the wrong one', async ({ page }) => {
    await boot(page, '#/settings');
    const result = await page.evaluate(async () => {
      const m = await import('../src/crypto.js');
      const blob = await m.encryptJson({ fields: { passportNumber: 'X123' }, itemSecrets: {}, updatedAt: '2026-09-14T00:00:00Z' }, 'correct horse battery staple');
      const back = await m.decryptJson(blob, 'correct horse battery staple');
      let wrong = null;
      try { await m.decryptJson(blob, 'wrong'); } catch (e) { wrong = e.message; }
      return { hasCipher: blob.cipher === 'AES-256-GCM' && !JSON.stringify(blob).includes('X123'), back: back.fields.passportNumber, wrong };
    });
    expect(result.hasCipher).toBe(true);
    expect(result.back).toBe('X123');
    expect(result.wrong).toContain('Wrong passphrase');
  });

  test('vault sync writes only an encrypted blob to GitHub', async ({ page }) => {
    await boot(page, '#/vault');
    await page.getByLabel('Passport number').fill('SECRET-PP-42');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    const puts = [];
    await page.route(/api\.github\.com\/repos\/.*\/contents\/data\/vault\.enc/, (route) => {
      if (route.request().method() === 'PUT') { puts.push(JSON.parse(route.request().postData())); return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: { sha: 'vsha' } }) }); }
      return route.fulfill({ status: 404, contentType: 'application/json', body: '{}' });
    });
    await page.route(/api\.github\.com\/repos\/.*\/contents\/data\/trip\.json/, (route) => route.fulfill({ status: 404, contentType: 'application/json', body: '{}' }));
    await page.route(/api\.github\.com\/repos\/[^/]+\/[^/]+$/, (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ private: false, default_branch: 'main', permissions: { push: true } }) }));
    await page.goto('/#/settings');
    await page.getByLabel('GitHub token').fill('ghp_test');
    await page.getByRole('button', { name: 'Save & test' }).click();
    await page.getByLabel('Sync the Private vault between devices (encrypted)').check();
    await page.getByLabel('Vault passphrase').fill('a long passphrase for testing');
    await page.getByRole('button', { name: 'Save & sync vault' }).click();
    await expect.poll(() => puts.length).toBeGreaterThan(0);
    const uploaded = Buffer.from(puts[0].content, 'base64').toString('utf8');
    expect(uploaded).not.toContain('SECRET-PP-42');
    expect(JSON.parse(uploaded).cipher).toBe('AES-256-GCM');
  });
});

test.describe('souvenirs', () => {
  test('the page counts the duty-free alcohol allowance and warns when it is blown', async ({ page }) => {
    const errors = await boot(page, '#/souvenirs');
    const meter = page.locator('.card', { hasText: 'Duty-free alcohol' });
    const plan = async (name) => {
      await page.locator('.check-text', { hasText: name }).click();
      await page.getByLabel('Status').selectOption('planned');
      await page.getByRole('button', { name: 'Save', exact: true }).click();
    };
    await expect(page.locator('#topbar-heading')).toHaveText('Souvenirs');
    // Seeded list leaves room: yuzushu, sake and the bitters come to 1.51 L.
    await expect(meter).toContainText('1.51 L of 2.25 L');
    await expect(page.locator('.meter-fill.near, .meter-fill.over')).toHaveCount(0);
    // The gin fits, but uses the lot, so the page says nothing else will.
    await plan('Ki No Bi');
    await expect(meter).toContainText('2.21 L of 2.25 L');
    await expect(page.locator('.meter-fill.near')).toHaveCount(1);
    await expect(meter).toContainText('nothing else fits');
    // One more bottle blows it, and the page says that too.
    await plan('Shiso or sakura');
    await expect(meter).toContainText('2.71 L of 2.25 L');
    await expect(page.locator('.meter-fill.over')).toHaveCount(1);
    await expect(page.locator('#main')).toContainText('Over the limit');
    expect(errors).toEqual([]);
  });

  test('ticking something off marks it bought and stops it counting twice', async ({ page }) => {
    await boot(page, '#/souvenirs');
    const row = page.locator('.check', { hasText: 'Yuzu liqueur' }).first();
    await expect(row).not.toHaveClass(/done/);
    await row.locator('input[type=checkbox]').check();
    await expect(row).toHaveClass(/done/);
    // Bought still counts against the allowance: it is in your bag either way.
    await expect(page.locator('.card', { hasText: 'Duty-free alcohol' })).toContainText('1.51 L');
    const status = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)).souvenirs.find((s) => s.id === 'sv1').status, TRIP_KEY);
    expect(status).toBe('bought');
  });

  test('a trip with no souvenirs has no Souvenirs page', async ({ page, isMobile }) => {
    await boot(page, '#/overview', { trip: 'bali' });
    await expect(page.locator('#brand-title')).toHaveText('Bali 2026');
    if (isMobile) await page.locator('#menu-btn').click();
    await expect(page.locator('.nav-link', { hasText: 'Souvenirs' })).toHaveCount(0);
    await page.goto('/#/souvenirs');
    await expect(page.locator('#topbar-heading')).toHaveText('Overview');
  });
});

test.describe('two trips in one app', () => {
  async function switchTo(page, label, isMobile) {
    if (isMobile) await page.locator('#menu-btn').click();
    await page.locator(`#trip-switch button:has-text("${label}")`).click();
    await expect(page.locator('#brand-title')).toContainText(label);
  }

  test('the switcher swaps the whole plan, and each trip keeps its own copy', async ({ page, isMobile }) => {
    const errors = await boot(page, '#/overview');
    await expect(page.locator('#brand-title')).toHaveText('Japan 2027');
    await switchTo(page, 'Bali', isMobile);
    await expect(page.locator('#brand-dates')).toHaveText('Wed 4 Nov to Wed 11 Nov');
    await expect(page.locator('#topbar-kicker')).toContainText('Bali 2026');
    await switchTo(page, 'Ubud', isMobile);
    await expect(page.locator('#brand-dates')).toHaveText('Wed 11 Nov to Sun 15 Nov');
    // Each trip is stored separately, so none of them can clobber another.
    const keys = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.endsWith(':trip')).sort());
    expect(keys).toEqual(['t:bali:trip', 't:japan:trip', 't:ubud:trip']);
    await switchTo(page, 'Japan', isMobile);
    await expect(page.locator('#brand-dates')).toHaveText('Mon 8 Feb to Wed 17 Feb');
    expect(errors).toEqual([]);
  });

  test('a brand new device opens whichever trip the registry calls active', async ({ page }) => {
    const active = await (await fetch('http://localhost:8123/data/trips.json')).json().then((r) => r.active);
    const expected = (await (await fetch('http://localhost:8123/data/trips.json')).json()).trips.find((t) => t.id === active).name;
    page.on('pageerror', () => {});
    await page.route(/fonts\.googleapis\.com|fonts\.gstatic\.com|tile\.openstreetmap\.org/, (r) => r.abort());
    await page.goto('/#/overview');   // no boot(): nothing pins a trip
    await expect(page.locator('#brand-title')).toHaveText(expected);
  });

  test('every Bali view renders without JS errors or horizontal overflow', async ({ page }) => {
    const errors = await boot(page);
    await page.evaluate(() => localStorage.setItem('app:tripId', JSON.stringify('bali')));
    await page.reload();
    await expect(page.locator('#brand-title')).toHaveText('Bali 2026');
    for (const v of VIEWS) {
      await page.goto(`/#/${v}`);
      await page.waitForTimeout(150);
      await expect(page.locator('#main')).not.toBeEmpty();
      const [w, vw] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
      expect(w, `bali ${v} overflows horizontally`).toBeLessThanOrEqual(vw + 1);
    }
    expect(errors).toEqual([]);
  });

  test('a plan left alone by the old single-trip app is adopted as Japan', async ({ page }) => {
    // Planted before any app code runs, so the migration is what the app sees on
    // its very first load rather than something racing against it.
    await page.addInitScript(() => {
      if (localStorage.getItem('__seeded')) return;
      localStorage.setItem('__seeded', '1');
      localStorage.setItem('jp27:trip', JSON.stringify({ meta: { title: 'Legacy plan', start: '2027-02-08', end: '2027-02-17', updatedAt: '2099-01-01T00:00:00Z' }, days: [], flights: { confirmed: [], legs: [], lounges: [] }, stays: [], food: [], budget: [], checklist: [], places: [], questions: [] }));
      localStorage.setItem('jp27:meta', JSON.stringify({ dirty: true }));
      localStorage.setItem('jp27:settings', JSON.stringify({ owner: 'someone', repo: 'Japan', path: 'data/trip.json', theme: 'dark', showAllTrips: true }));
    });
    await boot(page, '#/overview', { seedSettings: false });
    await expect(page.locator('#brand-title')).toHaveText('Japan 2027');
    // The old copy is still the one in use, under the new per-trip key.
    const moved = await page.evaluate(() => JSON.parse(localStorage.getItem('t:japan:trip'))?.meta?.title);
    expect(moved).toBe('Legacy plan');
    const settings = await page.evaluate(() => JSON.parse(localStorage.getItem('app:settings')));
    expect(settings.owner).toBe('someone');
    expect(settings.theme).toBe('dark');
    expect(settings.paths.japan.file).toBe('data/trip.json');
  });
});

test.describe('sharing the link', () => {
  // A phone that has never touched Settings: this is what the group gets.
  async function asGuest(page, hash = '#/overview') {
    page.on('pageerror', () => {});
    await page.route(/fonts\.googleapis\.com|fonts\.gstatic\.com|tile\.openstreetmap\.org/, (r) => r.abort());
    await page.goto(`/${hash}`);
    await expect(page.locator('#topbar-heading')).not.toHaveText('');
  }

  test('a guest sees the group trip only, with no money and no flights', async ({ page, isMobile }) => {
    await asGuest(page);
    await expect(page.locator('#brand-title')).toHaveText('Bali 2026');
    if (isMobile) await page.locator('#menu-btn').click();
    // Bali is the only shared trip, so there is nothing to switch between.
    await expect(page.locator('#trip-switch')).toBeHidden();
    // The trip keeps no budget and no flights, so neither page exists at all.
    await expect(page.locator('.nav-link', { hasText: 'Budget' })).toHaveCount(0);
    await expect(page.locator('.nav-link', { hasText: 'Flights' })).toHaveCount(0);
    // The pages the group was promised are all there.
    for (const label of ['Plan', 'Go', 'Stays', 'Food', 'Checklists', 'Map', 'Decisions']) {
      await expect(page.locator('.nav-link', { hasText: label })).toHaveCount(1);
    }
    await expect(page.locator('.stat-label', { hasText: /Budget|Your share/ })).toHaveCount(0);
    // No prices on items or stays, and no flight numbers anywhere.
    await page.goto('/#/itinerary/2026-11-07');
    await expect(page.locator('.tl-title', { hasText: 'Speedboat to Nusa Penida' })).toBeVisible();
    await expect(page.locator('#main')).not.toContainText('Rp1,450,000');
    await page.goto('/#/stays');
    await expect(page.locator('.row', { hasText: 'Villa Bunia' })).toBeVisible();
    await expect(page.locator('#main')).not.toContainText('/nt');
    // Neither page is reachable by URL either.
    for (const hash of ['budget', 'flights']) {
      await page.goto(`/#/${hash}`);
      await expect(page.locator('#topbar-heading')).toHaveText('Overview');
    }
    // What the group does need is still there.
    await page.goto('/#/checklist');
    await expect(page.locator('#main')).toContainText('International Driving Permit');
  });

  test('no flight numbers survive anywhere in the group plan', async ({ page }) => {
    await asGuest(page);
    const plan = await page.evaluate(() => localStorage.getItem('t:bali:trip'));
    for (const flight of ['JQ787', 'JQ37', 'JQ87']) expect(plan, `${flight} is still in the group plan`).not.toContain(flight);
    expect(JSON.parse(plan).flights.confirmed).toEqual([]);
    // And no dollar amounts from anyone's bookings.
    for (const amount of ['2,655', '522']) expect(plan).not.toContain(amount);
  });

  test('Ubud is private: invisible until this device asks for it', async ({ page, isMobile }) => {
    await asGuest(page, '#/settings');
    await expect(page.locator('#trip-switch')).toBeHidden();
    await page.getByLabel('Show my private trips').check();
    await page.locator('.card', { hasText: 'Show money' }).getByRole('button', { name: 'Save', exact: true }).click();
    if (isMobile) await page.locator('#menu-btn').click();
    await expect(page.locator('#trip-switch button', { hasText: 'Ubud' })).toHaveCount(1);
    await expect(page.locator('#trip-switch button', { hasText: 'Japan' })).toHaveCount(1);
  });

  test('a device holding a write token is yours, so it sees the private trips', async ({ page, isMobile }) => {
    page.on('pageerror', () => {});
    await page.route(/fonts\.googleapis\.com|fonts\.gstatic\.com|tile\.openstreetmap\.org|api\.github\.com/, (r) => r.abort());
    // A token, and nothing said either way about private trips.
    await page.addInitScript(() => localStorage.setItem('app:settings', JSON.stringify({ token: 'ghp_test', owner: 'connorjmccarthy', repo: 'Trips', branch: 'main' })));
    await page.goto('/#/overview');
    await expect(page.locator('#topbar-heading')).not.toHaveText('');
    if (isMobile) await page.locator('#menu-btn').click();
    await expect(page.locator('#trip-switch button', { hasText: 'Japan' })).toHaveCount(1);
    await expect(page.locator('#trip-switch button', { hasText: 'Ubud' })).toHaveCount(1);
  });

  test('turning it off explicitly beats holding a token', async ({ page }) => {
    page.on('pageerror', () => {});
    await page.route(/fonts\.googleapis\.com|fonts\.gstatic\.com|tile\.openstreetmap\.org|api\.github\.com/, (r) => r.abort());
    await page.addInitScript(() => localStorage.setItem('app:settings', JSON.stringify({ token: 'ghp_test', showAllTrips: false })));
    await page.goto('/#/overview');
    await expect(page.locator('#brand-title')).toHaveText('Bali 2026');
    await expect(page.locator('#trip-switch')).toBeHidden();
  });

  test('the money switch brings the budget back on a trip that keeps one', async ({ page, isMobile }) => {
    await asGuest(page, '#/settings');
    await page.getByLabel('Show money (Budget page, totals and prices)').check();
    await page.getByLabel('Show my private trips').check();
    await page.locator('.card', { hasText: 'Show money' }).getByRole('button', { name: 'Save', exact: true }).click();
    // Bali keeps no budget, so the switch does nothing for it.
    if (isMobile) await page.locator('#menu-btn').click();
    await expect(page.locator('.nav-link', { hasText: 'Budget' })).toHaveCount(0);
    // Japan does, so there it comes back.
    await page.locator('#trip-switch button:has-text("Japan")').click();
    await expect(page.locator('#brand-title')).toHaveText('Japan 2027');
    if (isMobile) await page.locator('#menu-btn').click();
    await expect(page.locator('.nav-link', { hasText: 'Budget' })).toHaveCount(1);
    await page.goto('/#/budget');
    await expect(page.locator('#topbar-heading')).toHaveText('Budget');
    // Nothing about the choice is written into the plan that syncs to GitHub.
    const plan = await page.evaluate(() => localStorage.getItem('t:japan:trip'));
    expect(plan).not.toContain('showBudget');
  });

  test('hiding the money does not delete it', async ({ page }) => {
    await boot(page, '#/itinerary/2027-02-13');
    await expect(page.locator('#main')).toContainText('¥1,800');
    await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('app:settings')); s.showBudget = false; localStorage.setItem('app:settings', JSON.stringify(s)); });
    await page.reload();
    await expect(page.locator('.tl-title', { hasText: 'Nohi bus Takayama' })).toBeVisible();
    await expect(page.locator('#main')).not.toContainText('¥1,800');
    // Still in the data, just not on screen.
    const cost = await page.evaluate(() => JSON.parse(localStorage.getItem('t:japan:trip')).days.flatMap((d) => d.items).find((i) => i.id === 'c13b')?.cost);
    expect(cost).toBe(1800);
  });
});

test.describe('group costs and currencies', () => {
  test('a budget line can be split, and the share is what shows', async ({ page }) => {
    await boot(page, '#/budget');
    await page.getByRole('button', { name: '+ Add line' }).click();
    await page.getByLabel('What').fill('Test shared villa');
    await page.getByLabel('Amount').fill('500');
    await page.getByLabel('Split how many ways').fill('4');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    const row = page.locator('.row', { hasText: 'Test shared villa' }).first();
    await expect(row).toContainText('÷4');
    await expect(row).toContainText('A$500 ÷ 4');
    await expect(row.locator('.big')).toHaveText('A$125');
    await expect(page.locator('.stat-label').first()).toHaveText('Your share');
  });

  test('Japan still converts yen in the day list', async ({ page }) => {
    await boot(page, '#/itinerary/2027-02-13');
    // A ¥1,800 bus fare should carry its AUD equivalent beside it, not an empty bracket.
    await expect(page.locator('.tl-foot .mono', { hasText: '¥1,800' }).first()).toHaveText(/¥1,800 \(~A\$\d+\)/);
  });
});

test.describe('go mode', () => {
  test('shows one card per stop with directions, and Done clears a card for good', async ({ page }) => {
    const errors = await boot(page, '#/go/2027-02-13');
    const cards = page.locator('.go-card');
    const before = await cards.count();
    expect(before).toBeGreaterThan(3);
    await expect(page.locator('.go-counter')).toHaveText(`1 / ${before}`);
    const first = cards.first();
    await expect(first.locator('.go-title')).toContainText(/\S/);
    await expect(first.locator('a', { hasText: 'Directions' })).toHaveAttribute('href', /google\.com\/maps/);
    await expect(page.locator('.go-card.go-stay .go-title')).toContainText('Ootaya');
    const title = await first.locator('.go-title').textContent();
    await first.getByRole('button', { name: 'Done' }).click();
    await expect(cards).toHaveCount(before - 1);
    await expect(page.locator('.go-donelist summary')).toContainText('Done today (1)');
    await page.reload();
    await expect(page.locator('#topbar-heading')).toHaveText('Go');
    await expect(page.locator('.go-card')).toHaveCount(before - 1);
    expect(await page.locator('.go-card .go-title').first().textContent()).not.toBe(title);
    await page.locator('.go-donelist summary').click();
    await page.locator('.go-done-list').getByRole('button', { name: 'Undo' }).click();
    await expect(page.locator('.go-card')).toHaveCount(before);
    expect(errors).toEqual([]);
  });

  test('swiping a card up marks it done; arrows move through the deck', async ({ page }) => {
    await boot(page, '#/go/2027-02-13');
    const before = await page.locator('.go-card').count();
    await page.getByRole('button', { name: 'Next stop' }).click();
    await expect(page.locator('.go-counter')).toHaveText(`2 / ${before}`);
    await page.getByRole('button', { name: 'Previous stop' }).click();
    await expect(page.locator('.go-counter')).toHaveText(`1 / ${before}`);
    const card = page.locator('.go-card').first();
    const box = await card.locator('.go-title').boundingBox();
    const x = box.x + box.width / 2, y = box.y + box.height / 2;
    const opts = (cy) => ({ pointerId: 1, isPrimary: true, pointerType: 'touch', clientX: x, clientY: cy, bubbles: true });
    await card.dispatchEvent('pointerdown', opts(y));
    await card.dispatchEvent('pointermove', opts(y - 60));
    await card.dispatchEvent('pointermove', opts(y - 140));
    await card.dispatchEvent('pointerup', opts(y - 140));
    await expect(page.locator('.go-card')).toHaveCount(before - 1);
  });

  test('the two Takayama bookings show the right room on each night', async ({ page }) => {
    await boot(page, '#/go/2027-02-12');
    await expect(page.locator('.go-card.go-stay .go-title')).toContainText('Moon room');
    await page.goto(page.url().replace('#/go/2027-02-12', '#/go/2027-02-15'));
    await expect(page.locator('.go-card.go-stay .go-title')).toContainText('Sakura room');
    // The nights away are not in Takayama at all, so no hotel card should appear for them.
    await page.goto(page.url().replace('#/go/2027-02-15', '#/go/2027-02-14'));
    await expect(page.locator('.go-card.go-stay .go-title')).toContainText('Hirayu no Mori');
  });

  test('cards never print a literal null, and the notes stay readable on a phone', async ({ page, isMobile }) => {
    // node.append(null) stringifies to the text "null"; optional lines used to leak it.
    for (const [trip, date] of [['japan', '2027-02-13'], ['bali', '2026-11-11']]) {
      await page.goto('/');
      await page.evaluate((t) => localStorage.setItem('app:tripId', JSON.stringify(t)), trip);
      await page.goto(`/#/go/${date}`);
      await page.reload();
      await expect(page.locator('.go-card').first()).toBeVisible();
      const stray = await page.locator('#main').evaluate((n) => /<\/(?:div|button|span)>null</.test(n.innerHTML));
      expect(stray, `${trip} renders a stray null`).toBe(false);
      const notes = await page.locator('.go-card .go-notes').first().evaluate((n) => n.clientHeight);
      expect(notes, `${trip} notes area collapsed`).toBeGreaterThan(60);
      if (isMobile) {
        // The primary action has to sit above the tab bar without scrolling.
        const ok = await page.evaluate(() => document.querySelector('.go-done-btn').getBoundingClientRect().bottom <= document.querySelector('#tabbar').getBoundingClientRect().top + 1);
        expect(ok, `${trip} Done button is hidden behind the tab bar`).toBe(true);
      }
    }
  });

  test('picks the stop happening now', async ({ page }) => {
    await boot(page, '#/go');
    const r = await page.evaluate(async () => {
      const m = await import('/src/views/go.js');
      const items = [{ time: '09:00', endTime: '10:00' }, { time: '11:00' }, { time: '13:00', endTime: '15:00' }];
      return [m.nowIndex(items, '09:30'), m.nowIndex(items, '10:30'), m.nowIndex(items, '14:00'), m.nowIndex(items, '18:00'), m.nowIndex([], '12:00'), m.localNow({ meta: { start: '2027-02-08', end: '2027-02-17' } }, '2027-02-12').tz];
    });
    expect(r).toEqual([0, 1, 2, 2, -1, 'Asia/Tokyo']);
  });
});

test.describe('the Osaka hotel decision', () => {
  test('the Osaka hotel is picked once, and the arrival day names it', async ({ page }) => {
    // The hotel is chosen on Stays, but the arrival, the USJ morning and both
    // Thursday departures are written around it. Two picks, or a day that names
    // a different hotel, means the plan and the booking have drifted apart.
    // (build-seed.py carries the matching assertion for the itinerary text.)
    await boot(page, '#/stays');
    const osaka = page.locator('section.section', { has: page.getByRole('heading', { name: 'Osaka', exact: true }) });
    const chosen = osaka.locator('.row', { has: page.locator('.pill', { hasText: /^(Planned|Booked)$/ }) });
    await expect(chosen).toHaveCount(1);
    const picked = (await chosen.locator('.row-title').first().innerText()).split('\n')[0].trim();
    expect(picked.length).toBeGreaterThan(3);
    await page.goto('/#/go/2027-02-09');
    await expect(page.locator('.go-card').first()).toBeVisible();
    await expect(page.locator('#main')).toContainText(picked.split(',')[0]);
  });
});
