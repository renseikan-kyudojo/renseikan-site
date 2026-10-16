#!/usr/bin/env node
// Put the website's current text into the Studio, section by section, so the dojo edits what it sees on the site:
//
//   SANITY_WRITE_TOKEN=... node scripts/seed-content.mjs            # fill what is blank, create what is missing
//   SANITY_WRITE_TOKEN=... node scripts/seed-content.mjs --dry      # only say what would change
//   SANITY_WRITE_TOKEN=... node scripts/seed-content.mjs --reset    # also overwrite every page field with the shipped text
//   node scripts/seed-content.mjs --print                            # print the documents as JSON, for another tool
//
// It creates or fills: Dojo settings (src/data/site.json), the page documents (src/data/pages.json, one per page plus
// "Navigation and shared text"), and, only if the dataset has none, the first instructor, the Sunday class and the FAQ
// entries. Nothing already written in the Studio is changed unless --reset is given (and even then only page copy).
// Needs a token with Editor rights from sanity.io/manage; never commit it (.env is ignored).
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@sanity/client';
import site from '../src/data/site.json' with { type: 'json' };
import pages from '../src/data/pages.json' with { type: 'json' };
import { PAGE_TYPES, toDefaults, fillPatch, joinWithLegacyNotes, blocks } from '../src/lib/copy.js';

const here = dirname(fileURLToPath(import.meta.url));
const projectTs = await readFile(join(here, '../sanity/project.ts'), 'utf8');
const constant = (name) => projectTs.match(new RegExp(`${name} = '([^']+)'`))?.[1];

const dry = process.argv.includes('--dry');
const reset = process.argv.includes('--reset');
const print = process.argv.includes('--print');
const token = process.env.SANITY_WRITE_TOKEN;
if (!token && !dry && !print) {
  console.error('set SANITY_WRITE_TOKEN to a token with Editor rights (or pass --dry)');
  process.exit(1);
}
const client = createClient({
  projectId: process.env.PUBLIC_SANITY_PROJECT_ID || constant('SANITY_PROJECT_ID'),
  dataset: process.env.PUBLIC_SANITY_DATASET || constant('SANITY_DATASET'),
  apiVersion: constant('SANITY_API_VERSION'),
  token,
  useCdn: false,
});

/** The documents the site is seeded with, keyed by id. Exported for the dry run and for seeding by other means. */
export function seedDocuments(settings) {
  const defaults = toDefaults(pages);
  const docs = {};
  for (const [key, type] of Object.entries(PAGE_TYPES)) {
    const d = { ...defaults[key] };
    delete d.entries;
    docs[type] = { _id: type, _type: type, ...(key === 'join' ? joinWithLegacyNotes(d, settings) : d) };
  }
  docs.settings = {
    _id: 'settings',
    _type: 'settings',
    name: site.name,
    tagline: site.tagline,
    description: site.description,
    hours: site.hours,
    email: site.email,
    policy: site.policy,
    bookingUrl: site.booking,
    address: { ...site.address },
  };
  return docs;
}
/** The instructor, the Sunday class and the FAQ entries, created only when the dataset has none of that type. */
export function seedListDocuments() {
  const t = site.instructor;
  return [
    {
      _id: 'person-steve-scott',
      _type: 'person',
      name: t.name,
      title: 'Chief Instructor',
      rank: t.rank,
      rankPlain: t.rankPlain,
      credentials: [t.role, t.former],
      email: t.email,
      order: 1,
    },
    {
      _id: 'class-sunday',
      _type: 'classSession',
      title: 'Kyudo class',
      weekday: 'Sunday',
      start: site.hours.split(/[–-]/)[0].trim() + ' pm',
      end: site.hours.split(/[–-]/)[1]?.trim(),
      place: 'JACC, San Jose',
      status: 'Open',
    },
    ...pages.faq.entries.map((e, i) => ({
      _id: `faq-${i + 1}`,
      _type: 'faq',
      question: e.question,
      answer: blocks(e.answer, `a${i}`),
      order: i + 1,
    })),
  ];
}

if (print) {
  console.log(JSON.stringify({ singletons: seedDocuments(undefined), lists: seedListDocuments() }, null, 2));
  process.exit(0);
}
const say = (s) => console.log(s);
const existing = Object.fromEntries(
  (await client.fetch(`*[_id in $ids]`, { ids: [...Object.values(PAGE_TYPES), 'settings'] })).map((d) => [d._id, d]),
);
const docs = seedDocuments(existing.settings);
const tx = client.transaction();
let changes = 0;
for (const [id, doc] of Object.entries(docs)) {
  const { _id, _type, ...fields } = doc;
  const have = existing[id];
  const ops = reset && _type !== 'settings' ? [{ set: fields }] : fillPatch(fields, have);
  if (!ops.length) {
    say(`${id}: nothing blank`);
    continue;
  }
  const n = Object.keys(ops.at(-1).set).length;
  say(`${id}: ${have ? '' : 'create and '}set ${n} field${n === 1 ? '' : 's'}`);
  changes += n;
  if (!have) tx.createIfNotExists({ _id, _type });
  let patch = client.patch(_id);
  for (const op of ops) patch = op.setIfMissing ? patch.setIfMissing(op.setIfMissing) : patch.set(op.set);
  tx.patch(patch);
}
for (const doc of seedListDocuments()) {
  const count = await client.fetch(`count(*[_type == $type])`, { type: doc._type });
  if (count > 0) continue;
  // the FAQ comes as a set; count once per type
  say(`${doc._id}: create (no ${doc._type} documents yet)`);
  changes++;
  tx.createIfNotExists(doc);
}
if (!changes) say('Nothing to do.');
else if (dry) say(`Dry run: ${changes} change${changes === 1 ? '' : 's'} not written.`);
else {
  await tx.commit();
  say(
    `Done: ${changes} change${changes === 1 ? '' : 's'} written. Publishing in the Studio is not needed; they are live.`,
  );
}
