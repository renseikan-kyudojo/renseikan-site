// Read-only: which photos have an HDR original, is each file really HDR, and does production's gallery link it?
const has = (b, s) => b.includes(Buffer.from(s));
const u = new URL('https://bfgbeqq4.api.sanity.io/v2025-02-19/data/query/production');
u.searchParams.set('query', `{
  "albums": *[_type == "album"]{ title, "photos": photos[]{ "file": asset->originalFilename, "hdr": hdr.asset->url, "hdrName": hdr.asset->originalFilename, "hdrMime": hdr.asset->mimeType, "hdrSize": hdr.asset->size } },
  "drafts": *[_id in path("drafts.**") && _type == "album"]{ title, "withHdr": count(photos[defined(hdr)]) }
}`);
const { result } = await (await fetch(u)).json();
for (const a of result.albums) {
  const withHdr = a.photos.filter((p) => p.hdr);
  console.log(`album "${a.title}": ${a.photos.length} photos, ${withHdr.length} with an HDR original`);
  for (const p of withHdr) {
    const b = Buffer.from(await (await fetch(p.hdr)).arrayBuffer());
    const f = { ultraHdr: has(b, 'hdrgm:'), mpf: has(b, 'MPF\0'), iso21496: has(b, 'urn:iso:std:iso:ts:21496'), apple: has(b, 'HDRGainMap') || has(b, 'apdi:'), jpegs: b.toString('latin1').split('\xff\xd8\xff').length - 1 };
    console.log(`  image ${p.file} | HDR original ${p.hdrName} ${p.hdrMime} ${(p.hdrSize / 1e6).toFixed(2)}MB`, JSON.stringify(f));
  }
}
console.log('unpublished drafts:', JSON.stringify(result.drafts));
const html = await (await fetch('https://renseikan.org/gallery', { cache: 'no-store' })).text();
console.log('production /gallery photos with data-hdr:', (html.match(/data-hdr="/g) || []).length);
