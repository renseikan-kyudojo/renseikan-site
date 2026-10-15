// The Studio's two HDR paths, as API calls (sanity/components/photoInputs.tsx), against the real project with test
// assets that are in no document and are deleted at the end.
import { readFileSync } from 'node:fs';
import { createClient } from '@sanity/client';
const token = process.env.SANITY_WRITE_TOKEN;
if (!token) throw new Error('no SANITY_WRITE_TOKEN');
const client = createClient({ projectId: 'bfgbeqq4', dataset: 'production', apiVersion: '2025-02-19', token, useCdn: false });
const has = (b, s) => Buffer.from(b).includes(Buffer.from(s));
const bytes = readFileSync('probe/uhdr-fixture.jpg');
const made = new Set();
try {
  // 1. PhotosInput: one File, uploaded as an image and (being Ultra HDR) as a file, at the same time
  const blob = new Blob([bytes], { type: 'image/jpeg' });
  const [image, file] = await Promise.all([
    client.assets.upload('image', blob, { filename: 'hdr-probe-delete-me.jpg' }),
    client.assets.upload('file', blob, { filename: 'hdr-probe-delete-me.jpg', contentType: 'image/jpeg' }),
  ]);
  made.add(image._id).add(file._id);
  console.log('1. image asset:', image._id, `${image.metadata?.dimensions?.width}x${image.metadata?.dimensions?.height}`, 'lqip', !!image.metadata?.lqip);
  const kept = Buffer.from(await (await fetch(file.url)).arrayBuffer());
  console.log('1. file asset keeps the gain map:', has(kept, 'hdrgm:') && has(kept, 'MPF\0'), kept.equals(bytes) ? '(byte-identical)' : '(CHANGED)');

  // 2. ImageFromHdrInput: from the HDR original's asset id, read the file back as the Studio would, then make the image
  const doc = await client.getDocument(file._id);
  for (const origin of ['https://renseikan.org', 'http://localhost:3333']) {
    const r = await fetch(doc.url, { headers: { Origin: origin } });
    console.log(`2. CDN read from ${origin}: ${r.status}, access-control-allow-origin: ${r.headers.get('access-control-allow-origin')}`);
  }
  const back = await (await fetch(doc.url)).blob();
  const image2 = await client.assets.upload('image', back, { filename: doc.originalFilename });
  made.add(image2._id);
  console.log('2. image made from the HDR original:', image2._id, `${image2.metadata?.dimensions?.width}x${image2.metadata?.dimensions?.height}`, image2._id === image._id ? '(same asset as 1, deduplicated)' : '');
} finally {
  for (const id of made) {
    await client.delete(id).then(() => console.log('deleted', id), (e) => console.log('delete failed', id, e.message));
  }
}
