// Read-only: do the new GROQ queries parse and run against the real dataset?
const q = async (query, params = {}) => {
  const u = new URL('https://bfgbeqq4.api.sanity.io/v2025-02-19/data/query/production');
  u.searchParams.set('query', query);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(`$${k}`, JSON.stringify(v));
  const r = await fetch(u);
  const j = await r.json();
  if (!r.ok) throw new Error(`${r.status} ${JSON.stringify(j).slice(0, 300)}`);
  return j.result;
};
const file = (at) => `"url": ${at}asset->url, "w": ${at}asset->metadata.dimensions.width, "h": ${at}asset->metadata.dimensions.height, "lqip": ${at}asset->metadata.lqip`;
const photos = await q(`{
  "albums": *[_type == "album" && count(photos) > 0]{ title, date, order, "photos": photos[defined(asset)]{ ${file('')}, "hdr": hdr.asset->url, caption, credit } },
  "singles": *[_type == "photo" && defined(image.asset)]{ order, taken, caption, credit, "hdr": hdr.asset->url, ${file('image.')} }
}`);
const all = [...photos.albums.flatMap((a) => a.photos), ...photos.singles];
console.log('site query OK:', photos.albums.length, 'albums,', all.length, 'photos,', all.filter((p) => p.hdr).length, 'with HDR originals');
const title = photos.albums[0]?.title ?? 'none';
const album = await q(`*[_type == "album" && title == $title][0]{ _id, "have": [...photos[].asset->{ originalFilename, size }, ...photos[].hdr.asset->{ originalFilename, size }] }`, { title });
console.log('upload-script query OK:', JSON.stringify({ title, have: album?.have?.length, sample: album?.have?.[0] }));
