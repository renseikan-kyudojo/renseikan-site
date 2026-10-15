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
const asset = await client.assets.upload('image', file, { filename: 'hdr-probe-delete-me.jpg' });
try {
  const back = Buffer.from(await (await fetch(asset.url)).arrayBuffer());
  console.log('stored:  ', JSON.stringify(markers(back)), back.equals(file) ? '(byte-identical)' : '(CHANGED)');
  console.log('upload test:', has(back, 'hdrgm:') && has(back, 'MPF\0') ? 'Sanity KEEPS the gain map' : 'Sanity STRIPS the gain map');
} finally {
  await client.delete(asset._id);
  console.log('test asset deleted');
}
