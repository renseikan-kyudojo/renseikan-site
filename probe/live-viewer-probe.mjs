// The live viewer on an HDR screen: does the photo with an HDR original end up showing that file?
import { chromium } from '@playwright/test';
const browser = await chromium.launch({ args: ['--force-color-profile=hdr10'] });
const page = await browser.newPage();
await page.goto('https://renseikan.org/gallery');
const a = page.locator('[data-gallery] a[data-hdr]').first();
const [file, index, id] = await Promise.all([a.getAttribute('data-hdr'), a.getAttribute('data-index'), a.getAttribute('id')]);
console.log('photo with HDR original:', id, '(link: https://renseikan.org/gallery#' + id + ')');
const t0 = Date.now();
await a.click();
const img = page.locator('.viewer-slide img').nth(Number(index));
await page.waitForFunction((i) => document.querySelectorAll('.viewer-slide img')[i]?.dataset.original === '1', Number(index), { timeout: 120000 });
const src = await img.evaluate((i) => i.currentSrc);
console.log('viewer shows the HDR original:', src === file, `after ${((Date.now() - t0) / 1000).toFixed(1)}s`);
await browser.close();
