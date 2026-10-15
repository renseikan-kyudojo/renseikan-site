// Read-only: has production picked up #19 (viewer reads data-hdr; Studio has the HDR original field)?
const SITE = 'https://renseikan.org';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const scriptsOf = async (path) => {
  const html = await (await fetch(SITE + path, { cache: 'no-store' })).text();
  const srcs = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => new URL(m[1], SITE + path).href);
  return [html, ...(await Promise.all(srcs.map(async (u) => (await fetch(u)).text())))].join('\n');
};
let viewer = false, studio = false;
for (let i = 0; i < 40 && !(viewer && studio); i++) {
  viewer ||= (await scriptsOf('/gallery')).includes('dataset.hdr');
  if (!studio) {
    const html = await (await fetch(`${SITE}/studio`, { cache: 'no-store' })).text();
    const srcs = [...html.matchAll(/(?:src|href)="([^"]+\.js)"/g)].map((m) => new URL(m[1], `${SITE}/studio/`).href);
    for (const u of srcs) {
      const js = await (await fetch(u)).text();
      if (js.includes('HDR original')) studio = true;
      // the Studio loads its schema from chunks; follow one level of imports
      for (const m of js.matchAll(/["'](\.\/[^"']+\.js)["']/g)) {
        if (studio) break;
        if ((await (await fetch(new URL(m[1], u))).text()).includes('HDR original')) studio = true;
      }
    }
  }
  if (!(viewer && studio)) await sleep(15000);
}
console.log('viewer reads HDR originals on production:', viewer);
console.log('Studio on production has the HDR original field:', studio);
