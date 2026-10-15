// The live viewer on an HDR screen: does the photo with an HDR original end up showing that file?
import { chromium } from '@playwright/test';
const browser = await chromium.launch({ args: ['--force-color-profile=hdr10'] });
const page = await browser.newPage();
await page.goto('https://renseikan.org/gallery');
const a = page.locator('[data-gallery] a[data-hdr]').first();
const [file, index, id] = await Promise.all([a.getAttribute('data-hdr'), a.getAttribute('data-index'), a.getAttribute('id')]);
console.log('photo with HDR original:', id, '(link: https://renseikan.org/gallery#' + id + ')');
// wait for the deploy carrying the layer fix (the viewer script sets willChange)
for (let i = 0; i < 40; i++) {
  const html = await (await fetch('https://renseikan.org/gallery', { cache: 'no-store' })).text();
  const srcs = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => new URL(m[1], 'https://renseikan.org').href);
  const js = (await Promise.all(srcs.map(async (u) => (await fetch(u)).text()))).join('') + html;
  if (js.includes('willChange')) break;
  await new Promise((r) => setTimeout(r, 15000));
}
await page.reload();
const t0 = Date.now();
await a.click();
const img = page.locator('.viewer-slide img').nth(Number(index));
await page.waitForFunction((i) => document.querySelectorAll('.viewer-slide img')[i]?.dataset.original === '1', Number(index), { timeout: 120000 });
const [src, layer] = await img.evaluate((i) => [i.currentSrc, i.style.willChange]);
console.log('viewer shows the HDR original:', src === file, `after ${((Date.now() - t0) / 1000).toFixed(1)}s`, 'own layer:', layer);
await browser.close();
