// One-off production probe: is the HDR fix deployed, are the gallery originals Ultra HDR, does the viewer show them?
import { chromium } from '@playwright/test';
const SITE = 'https://renseikan.org';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const has = (buf, s) => buf.includes(Buffer.from(s));

// 1. wait for the deploy carrying the fix (the gallery script mentions dynamic-range)
let html = '', deployed = false;
for (let i = 0; i < 40 && !deployed; i++) {
  html = await (await fetch(`${SITE}/gallery`, { cache: 'no-store' })).text();
  const scripts = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => new URL(m[1], SITE).href);
  const inline = html.includes('dynamic-range');
  const bodies = await Promise.all(scripts.map(async (u) => (await fetch(u)).text()));
  deployed = inline || bodies.some((b) => b.includes('dynamic-range'));
  if (!deployed) await sleep(15000);
}
console.log('fix deployed on production:', deployed);

// 2. the originals: size, type, and HDR gain-map markers (Ultra HDR XMP, MPF index, ISO 21496-1)
const originals = [...new Set([...html.matchAll(/href="(https:\/\/cdn\.sanity\.io\/images\/[^"?]+)"/g)].map((m) => m[1]))];
console.log('photos on /gallery:', originals.length);
let hdrCount = 0;
for (const u of originals) {
  const r = await fetch(u);
  const b = Buffer.from(await r.arrayBuffer());
  const f = { hdrgm: has(b, 'hdrgm:'), mpf: has(b, 'MPF\0'), iso21496: has(b, 'urn:iso:std:iso:ts:21496'), jpegs: b.toString('latin1').split('\xff\xd8\xff').length - 1 };
  const hdr = f.hdrgm || f.iso21496;
  if (hdr) hdrCount++;
  console.log(`${hdr ? 'HDR ' : 'SDR '} ${u.split('/').pop()} ${r.headers.get('content-type')} ${(b.length / 1e6).toFixed(2)}MB ${JSON.stringify(f)}`);
}
console.log(`originals with a gain map: ${hdrCount}/${originals.length}`);
if (originals[0]) {
  const r = await fetch(`${originals[0]}?w=1800&auto=format&q=82`, { headers: { accept: 'image/avif,image/webp,*/*' } });
  const b = Buffer.from(await r.arrayBuffer());
  console.log('resized copy:', r.headers.get('content-type'), 'gain map kept:', has(b, 'hdrgm:') || has(b, 'urn:iso:std:iso:ts:21496'));
}

// 3. the live viewer on an HDR screen
const browser = await chromium.launch({ args: ['--force-color-profile=hdr10'] });
const page = await browser.newPage();
await page.goto(`${SITE}/gallery`);
console.log('HDR screen reported:', await page.evaluate(() => matchMedia('(dynamic-range: high)').matches));
const first = page.locator('[data-gallery] a').first();
if (await first.count()) {
  const href = await first.getAttribute('href');
  await first.click();
  const img = page.locator('.viewer-slide img').first();
  try {
    await img.waitFor({ state: 'attached' });
    await page.waitForFunction(() => document.querySelector('.viewer-slide img')?.dataset.original === '1', null, { timeout: 30000 });
  } catch {}
  const src = await img.evaluate((i) => ({ src: i.currentSrc, state: i.dataset.original ?? '-' }));
  console.log('viewer slide 1:', src.state, src.src === href ? 'shows the ORIGINAL' : `shows ${src.src}`);
}
await browser.close();
