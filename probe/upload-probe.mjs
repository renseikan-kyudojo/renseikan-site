// Does Sanity keep an Ultra HDR JPEG's gain map? Upload a test file as a loose asset (in no album, so never on the
// site), read it back from the CDN, then delete it.
import { readFileSync } from 'node:fs';
import { createClient } from '@sanity/client';
const token = process.env.SANITY_WRITE_TOKEN;
if (!token) {
  console.log('upload test: skipped, the repo has no SANITY_WRITE_TOKEN secret');
  process.exit(0);
}
const has = (buf, s) => buf.includes(Buffer.from(s));
const markers = (b) => ({ hdrgm: has(b, 'hdrgm:'), mpf: has(b, 'MPF\0'), jpegs: b.toString('latin1').split('\xff\xd8\xff').length - 1, bytes: b.length });
const client = createClient({ projectId: 'bfgbeqq4', dataset: 'production', apiVersion: '2025-02-19', token, useCdn: false });
const file = readFileSync('probe/uhdr-fixture.jpg');
console.log('sent:    ', JSON.stringify(markers(file)));
for (const kind of ['image', 'file']) {
  const asset = await client.assets.upload(kind, file, { filename: 'hdr-probe-delete-me.jpg', contentType: 'image/jpeg' });
  try {
    const r = await fetch(asset.url);
    const back = Buffer.from(await r.arrayBuffer());
    console.log(`${kind} asset stored:`, JSON.stringify(markers(back)), back.equals(file) ? '(byte-identical)' : '(CHANGED)', r.headers.get('content-type'));
    console.log(`${kind} asset:`, has(back, 'hdrgm:') && has(back, 'MPF\0') ? 'KEEPS the gain map' : 'STRIPS the gain map');
  } finally {
    await client.delete(asset._id);
    console.log(`${kind} test asset deleted`);
  }
}
