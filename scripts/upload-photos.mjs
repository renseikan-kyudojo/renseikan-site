#!/usr/bin/env node
// Bulk-upload a folder of photos into an Album in Sanity, for batches too big to drag into the Studio comfortably.
//
//   SANITY_WRITE_TOKEN=... node scripts/upload-photos.mjs "Autumn taikai 2026" ./photos --date 2026-10-05 --credit "A. Name"
//
// Makes the album if no album has that title, otherwise appends to it. Files are sent as they are, so an Ultra HDR
// JPEG keeps its gain map and the Gallery's full-size link shows it in HDR. Files already in the album (same name
// and size) are skipped, so a rerun after a failure picks up where it stopped. Needs a token with Editor rights from
// sanity.io/manage; never commit it (.env is ignored).
import { createReadStream } from 'node:fs';
import { readdir, readFile, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@sanity/client';

// sanity/project.ts is the one place the project is named; read its constants without needing TypeScript at runtime.
const projectTs = await readFile(join(dirname(fileURLToPath(import.meta.url)), '../sanity/project.ts'), 'utf8');
const constant = (name) => projectTs.match(new RegExp(`${name} = '([^']+)'`))?.[1];
const SANITY_PROJECT_ID = constant('SANITY_PROJECT_ID');
const SANITY_DATASET = constant('SANITY_DATASET');
const SANITY_API_VERSION = constant('SANITY_API_VERSION');

const IMAGE = /\.(jpe?g|png|webp|avif|tiff?|heic|heif)$/i;

function usage(msg) {
  if (msg) console.error(msg);
  console.error(
    'usage: node scripts/upload-photos.mjs "<album title>" <folder> [--date YYYY-MM-DD] [--order N] [--credit "Name"]',
  );
  process.exit(1);
}

const [title, folder, ...rest] = process.argv.slice(2);
if (!title || !folder) usage();
const opts = {};
for (let i = 0; i < rest.length; i += 2) {
  const key = rest[i].replace(/^--/, '');
  if (!['date', 'order', 'credit'].includes(key) || rest[i + 1] === undefined) usage(`unknown option ${rest[i]}`);
  opts[key] = rest[i + 1];
}
const token = process.env.SANITY_WRITE_TOKEN;
if (!token) usage('set SANITY_WRITE_TOKEN to a token with Editor rights');

const client = createClient({
  projectId: process.env.PUBLIC_SANITY_PROJECT_ID || SANITY_PROJECT_ID,
  dataset: process.env.PUBLIC_SANITY_DATASET || SANITY_DATASET,
  apiVersion: SANITY_API_VERSION,
  token,
  useCdn: false,
});

const files = (await readdir(folder)).filter((f) => IMAGE.test(f)).sort();
if (!files.length) usage(`no photos in ${folder}`);

let album = await client.fetch(
  `*[_type == "album" && title == $title][0]{ _id, "have": photos[].asset->{ originalFilename, size } }`,
  { title },
);
if (!album) {
  album = await client.create({
    _type: 'album',
    title,
    date: opts.date,
    order: opts.order === undefined ? undefined : Number(opts.order),
    photos: [],
  });
  album.have = [];
  console.log(`made album "${title}"`);
} else {
  console.log(`adding to album "${title}" (${album.have?.length ?? 0} photos already)`);
}
const have = new Set((album.have ?? []).filter(Boolean).map((a) => `${a.originalFilename}:${a.size}`));

let added = 0;
for (const name of files) {
  const path = join(folder, name);
  const { size } = await stat(path);
  if (have.has(`${name}:${size}`)) {
    console.log(`  = ${name} (already there)`);
    continue;
  }
  const asset = await client.assets.upload('image', createReadStream(path), { filename: name });
  const photo = {
    _type: 'image',
    _key: asset._id.replace(/^image-/, '').slice(0, 24),
    asset: { _type: 'reference', _ref: asset._id },
    ...(opts.credit ? { credit: opts.credit } : {}),
  };
  await client.patch(album._id).setIfMissing({ photos: [] }).append('photos', [photo]).commit();
  added++;
  console.log(`  + ${name} (${asset.metadata?.dimensions?.width}×${asset.metadata?.dimensions?.height})`);
}
console.log(`${added} added to "${title}". Captions can be filled in the Studio; the site rebuilds on publish.`);
