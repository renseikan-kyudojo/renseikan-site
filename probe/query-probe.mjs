const u = new URL('https://bfgbeqq4.api.sanity.io/v2025-02-19/data/query/production');
u.searchParams.set('query', `*[_type == "album"].photos[defined(hdr)][0].hdr.asset->url`);
const url = (await (await fetch(u)).json()).result.find(Boolean);
for (const q of ['', '?v=1', '?v=4']) {
  const r = await fetch(url + q);
  const b = Buffer.from(await r.arrayBuffer());
  console.log(`${q || '(none)'}: ${r.status} ${r.headers.get('content-type')} ${b.length} bytes, gain map ${b.includes(Buffer.from('hdrgm:'))}`);
}
