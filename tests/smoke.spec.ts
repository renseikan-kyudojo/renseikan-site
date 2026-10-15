import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const pages = [
  '/',
  '/about',
  '/classes',
  '/join',
  '/faq',
  '/instructor',
  '/gallery',
  '/visit',
  '/news',
  '/events/winter-practice-continues',
  '/ja',
];

// Requests that are expected to fail off Vercel (analytics) or off the public internet (maps, fonts) are not errors.
const ignorable = /_vercel\/insights|maps\.google\.com|fonts\.g(oogleapis|static)\.com|ERR_NAME_NOT_RESOLVED|net::ERR/;

async function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on('console', (m) => {
    // a failed resource logs only "Failed to load resource"; the URL is in the message's location
    const where = m.location()?.url ?? '';
    if (m.type() === 'error' && !ignorable.test(m.text()) && !ignorable.test(where))
      errors.push(`${m.text()} (${where})`);
  });
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('requestfailed', (r) => {
    if (!ignorable.test(r.url()) && !ignorable.test(r.failure()?.errorText ?? ''))
      errors.push(`request failed: ${r.url()}`);
  });
  return errors;
}

for (const path of pages) {
  test(`${path} renders without errors and passes axe`, async ({ page }) => {
    const errors = await collectErrors(page);
    const res = await page.goto(path);
    expect(res?.status()).toBe(200);
    await expect(page.locator('main h1')).toHaveCount(1);
    await expect(page.locator('main')).toBeVisible();
    await page.waitForTimeout(500);
    expect(errors, `console/network errors on ${path}`).toEqual([]);
    const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    const serious = axe.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(
      serious.map((v) => `${v.id}: ${v.help} (${v.nodes.length})`),
      `axe on ${path}`,
    ).toEqual([]);
  });
}

test('unknown paths get the 404 page', async ({ page }) => {
  const res = await page.goto('/no-such-page');
  expect(res?.status()).toBe(404);
  await expect(page.locator('main h1')).toHaveText(/not here/);
});

test('the mobile menu opens, closes on Escape and returns focus', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'mobile only');
  await page.goto('/about');
  const btn = page.locator('#menuBtn');
  await btn.click();
  await expect(page.locator('#mobileMenu')).toBeVisible();
  await expect(btn).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Escape');
  await expect(page.locator('#mobileMenu')).toBeHidden();
  await expect(btn).toBeFocused();
});

test('the theme switch toggles and persists', async ({ page }) => {
  await page.goto('/');
  const sw = page.locator('#themeBtn');
  const before = await sw.getAttribute('aria-checked');
  await sw.click();
  await expect(sw).toHaveAttribute('aria-checked', before === 'true' ? 'false' : 'true');
  await page.reload();
  await expect(sw).toHaveAttribute('aria-checked', before === 'true' ? 'false' : 'true');
});

test('the gallery viewer opens, steps, passes axe and returns focus', async ({ page }) => {
  await page.goto('/gallery');
  const photos = page.locator('[data-gallery] a');
  test.skip((await photos.count()) < 2, 'the dataset has fewer than two photos');
  const viewer = page.locator('#viewer');
  await photos.first().click();
  await expect(viewer).toBeVisible();
  await expect(viewer.locator('.viewer-num')).toHaveText('1');
  await page.keyboard.press('ArrowRight');
  await expect(viewer.locator('.viewer-num')).toHaveText('2');
  await expect(page).toHaveURL(/#photo-2$/);
  const axe = await new AxeBuilder({ page }).include('#viewer').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  const serious = axe.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(serious.map((v) => `${v.id}: ${v.help} (${v.nodes.length})`)).toEqual([]);
  await page.keyboard.press('Escape');
  await expect(viewer).toBeHidden();
  await expect(photos.nth(1)).toBeFocused();
});

// Sanity strips an Ultra HDR JPEG's gain map from images, so a photo's HDR original is a separate file; on an HDR screen
// the viewer must end up showing that file. Chromium reports an HDR screen when forced to an HDR colour profile.
test('on an HDR screen the viewer shows the HDR original of the photo in view', async ({ playwright, baseURL }) => {
  const browser = await playwright.chromium.launch({
    executablePath: process.env.PW_CHROMIUM || undefined,
    args: ['--force-color-profile=hdr10'],
  });
  const page = await browser.newPage({ baseURL });
  try {
    await page.goto('/gallery');
    const photos = page.locator('[data-gallery] a[data-hdr]');
    test.skip((await photos.count()) < 1, 'no photo has an HDR original');
    expect(await page.evaluate(() => matchMedia('(dynamic-range: high)').matches)).toBe(true);
    const photo = photos.first();
    const [file, index] = await Promise.all([photo.getAttribute('data-hdr'), photo.getAttribute('data-index')]);
    await photo.click();
    const slide = page.locator('.viewer-slide img').nth(Number(index));
    await expect(slide).toHaveAttribute('data-original', '1', { timeout: 30_000 });
    expect(await slide.evaluate((img: HTMLImageElement) => img.currentSrc)).toBe(file);
  } finally {
    await browser.close();
  }
});

test('the class calendar is served', async ({ request }) => {
  const ics = await request.get('/classes.ics');
  expect(ics.status()).toBe(200);
  expect(ics.headers()['content-type']).toContain('text/calendar');
  const body = await ics.text();
  expect(body).toContain('BEGIN:VCALENDAR');
  expect(body).toContain('BEGIN:VEVENT');
});

test('the RSS feed is well-formed XML', async ({ page }) => {
  // a browser shows an XML error page for a feed with an undeclared namespace prefix; DOMParser reports the same
  const res = await page.request.get('/rss.xml');
  expect(res.status()).toBe(200);
  const xml = await res.text();
  await page.goto('/');
  const result = await page.evaluate((text) => {
    const doc = new DOMParser().parseFromString(text, 'application/xml');
    const err = doc.querySelector('parsererror');
    return {
      error: err ? err.textContent : null,
      root: doc.documentElement.nodeName,
      items: doc.querySelectorAll('item').length,
    };
  }, xml);
  expect(result.error).toBeNull();
  expect(result.root).toBe('rss');
  expect(result.items).toBeGreaterThan(0);
});
