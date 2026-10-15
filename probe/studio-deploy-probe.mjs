// Read-only: has production's Studio picked up #21 (the "Add photos" button and HDR original wording)?
const SITE = 'https://renseikan.org';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function studioHas(needle) {
  const html = await (await fetch(`${SITE}/studio`, { cache: 'no-store' })).text();
  const seen = new Set();
  const queue = [...html.matchAll(/(?:src|href)="([^"]+\.js)"/g)].map((m) => new URL(m[1], `${SITE}/studio/`).href);
  while (queue.length && seen.size < 80) {
    const u = queue.shift();
    if (seen.has(u)) continue;
    seen.add(u);
    const js = await (await fetch(u)).text();
    if (js.includes(needle)) return true;
    for (const m of js.matchAll(/["'](\.{1,2}\/[^"']+?\.js)["']/g)) queue.push(new URL(m[1], u).href);
  }
  return false;
}
let ok = false;
for (let i = 0; i < 40 && !ok; i++) {
  ok = await studioHas('an HDR photo needs only this');
  if (!ok) await sleep(15000);
}
console.log('production Studio has the one-upload HDR inputs:', ok);
