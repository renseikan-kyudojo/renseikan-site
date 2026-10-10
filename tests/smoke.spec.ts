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

test('the calendar and RSS feeds are served', async ({ request }) => {
  const ics = await request.get('/classes.ics');
  expect(ics.status()).toBe(200);
  expect(ics.headers()['content-type']).toContain('text/calendar');
  const body = await ics.text();
  expect(body).toContain('BEGIN:VCALENDAR');
  expect(body).toContain('BEGIN:VEVENT');
  const rss = await request.get('/rss.xml');
  expect(rss.status()).toBe(200);
  expect(await rss.text()).toContain('<rss');
});
