// The site's copy, section by section: src/data/pages.json is what the site ships, the Studio's page documents
// (sanity/schemas/pages.ts) hold what the dojo edits, and this module is what both sides share. Plain JavaScript with
// JSDoc types so the Studio, the Astro build and scripts/seed-content.mjs can all import it.
//
// - Rich text is written in pages.json as an array of paragraphs with *italic*, **bold** and [links](url); `blocks()`
//   turns that into Portable Text with stable keys, so the same defaults serve as the Studio's initial values.
// - Any string may hold a placeholder like {days} or {email}; `fill()` replaces it with the current fact at build time,
//   so copy in the Studio never goes stale when the hours or the address change in Dojo settings.

/** The Studio document type (and id) that holds each page's copy. */
export const PAGE_TYPES = /** @type {const} */ ({
  shared: 'siteText',
  home: 'homePage',
  about: 'aboutPage',
  classes: 'classesPage',
  join: 'joinPage',
  visit: 'visitPage',
  instructor: 'instructorPage',
  faq: 'faqPage',
  news: 'newsPage',
  gallery: 'galleryPage',
  ja: 'jaPage',
  notFound: 'notFoundPage',
});

/** The placeholders `fill()` understands, for field descriptions in the Studio. */
export const PLACEHOLDERS =
  '{name}, {days}, {hours}, {email}, {venue}, {address}, {city}, {state}, {policy}, {instructor}, {booking}, {instagram}, {nckf}, {akr}';

/** True for a value that counts as filled in (a blank string or an empty array does not). */
export const filled = (/** @type {unknown} */ v) =>
  v !== undefined && v !== null && !(typeof v === 'string' && v.trim() === '') && !(Array.isArray(v) && v.length === 0);

/**
 * `over` laid on `base`: every filled field of `over` replaces the base's, nested objects merge, arrays replace whole.
 * @template {Record<string, any>} T
 * @param {T} base
 * @param {Record<string, any> | null | undefined} over
 * @returns {T}
 */
export function overlay(base, over) {
  if (!over) return base;
  /** @type {Record<string, any>} */
  const out = { ...base };
  for (const [k, v] of Object.entries(over)) {
    if (
      v &&
      typeof v === 'object' &&
      !Array.isArray(v) &&
      base[k] &&
      typeof base[k] === 'object' &&
      !Array.isArray(base[k])
    )
      out[k] = overlay(base[k], v);
    else if (filled(v)) out[k] = v;
  }
  return /** @type {T} */ (out);
}

/**
 * Replaces {placeholders} in a string with the given values; unknown ones are left as written.
 * @param {string} s
 * @param {Record<string, string | undefined>} vars
 */
export function fill(s, vars) {
  return s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k] ?? '') : m));
}

/**
 * `fill()` applied to every string in a value (objects, arrays and Portable Text included).
 * @template T
 * @param {T} v
 * @param {Record<string, string | undefined>} vars
 * @returns {T}
 */
export function fillDeep(v, vars) {
  if (typeof v === 'string') return /** @type {T} */ (fill(v, vars));
  if (Array.isArray(v)) return /** @type {T} */ (v.map((x) => fillDeep(x, vars)));
  if (v && typeof v === 'object')
    return /** @type {T} */ (Object.fromEntries(Object.entries(v).map(([k, x]) => [k, fillDeep(x, vars)])));
  return v;
}

const INLINE = /\*\*(.+?)\*\*|\*(.+?)\*|\[([^\]]+)\]\(([^)]+)\)/g;

/**
 * One paragraph of light markup (*italic*, **bold**, [text](url)) as a Portable Text block with stable keys.
 * @param {string} text
 * @param {string} key
 */
export function block(text, key) {
  /** @type {{ _type: 'span', text: string, marks: string[] }[]} */
  const children = [];
  /** @type {{ _key: string, _type: 'link', href: string }[]} */
  const markDefs = [];
  const span = (/** @type {string} */ t, /** @type {string[]} */ marks = []) =>
    children.push({ _type: 'span', text: t, marks });
  let last = 0;
  for (const m of text.matchAll(INLINE)) {
    const at = m.index ?? 0;
    if (at > last) span(text.slice(last, at));
    if (m[1] !== undefined) span(m[1], ['strong']);
    else if (m[2] !== undefined) span(m[2], ['em']);
    else {
      const k = `${key}l${markDefs.length}`;
      markDefs.push({ _key: k, _type: 'link', href: m[4] });
      span(m[3], [k]);
    }
    last = at + m[0].length;
  }
  if (last < text.length || !children.length) span(text.slice(last));
  return {
    _type: 'block',
    _key: key,
    style: 'normal',
    markDefs,
    children: children.map((c, i) => ({ ...c, _key: `${key}s${i}` })),
  };
}

/**
 * Paragraphs of light markup as Portable Text.
 * @param {string[]} paragraphs
 * @param {string} [key] a prefix for the keys, unique within the document
 */
export const blocks = (paragraphs, key = 'p') => paragraphs.map((p, i) => block(p, `${key}${i}`));

/**
 * The copy of pages.json in the shape the Studio and the site use: arrays of paragraphs become Portable Text, and
 * every item of an array of objects gets a `_key`.
 * @param {any} v
 * @param {string} [key]
 * @returns {any}
 */
export function toDefaults(v, key = 'k') {
  if (Array.isArray(v)) {
    if (v.every((x) => typeof x === 'string')) return blocks(v, key);
    return v.map((x, i) => ({ _key: `${key}${i}`, ...toDefaults(x, `${key}${i}`) }));
  }
  if (v && typeof v === 'object')
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, toDefaults(x, `${key}${k.slice(0, 2)}`)]));
  return v;
}

/**
 * The leaf paths of a defaults object ("hero.title", "sections"), each with its value: arrays (Portable Text among
 * them) are leaves, nested plain objects are not. The fill action and the seed script set the leaves that are blank.
 * @param {Record<string, any>} obj
 * @param {string} [prefix]
 * @returns {[string, unknown][]}
 */
export function leaves(obj, prefix = '') {
  /** @type {[string, unknown][]} */
  const out = [];
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) out.push(...leaves(v, path));
    else out.push([path, v]);
  }
  return out;
}

/** The value at a dotted path. */
export const at = (/** @type {Record<string, any> | undefined} */ o, /** @type {string} */ path) =>
  path.split('.').reduce(/** @type {any} */ (v, k) => (v == null ? v : v[k]), o);

/**
 * The patch that fills a document's blank fields from its defaults: `setIfMissing` for the parent objects, then `set`
 * for every leaf that is blank. Empty when nothing is blank.
 * @param {Record<string, any>} defaults
 * @param {Record<string, any> | undefined} doc
 * @returns {{ setIfMissing?: Record<string, unknown>, set?: Record<string, unknown> }[]}
 */
export function fillPatch(defaults, doc) {
  const missing = leaves(defaults).filter(([path]) => !filled(at(doc, path)));
  if (!missing.length) return [];
  /** @type {Record<string, unknown>} */
  const parents = {};
  for (const [path] of missing) {
    const parts = path.split('.');
    for (let i = 1; i < parts.length; i++) parents[parts.slice(0, i).join('.')] = {};
  }
  return [...(Object.keys(parents).length ? [{ setIfMissing: parents }] : []), { set: Object.fromEntries(missing) }];
}

/**
 * The Joining page's steps with what the dojo wrote in the Dojo settings fields the page used before it had its own
 * document (After the first lesson, Equipment, Grading): those notes replace the built-in wording, and a Grading note
 * adds a step.
 * @param {{ steps: { _key: string, _type: string, title: string, body: any[] }[] }} join the Joining page defaults
 * @param {{ membershipNote?: string, equipmentNote?: string, gradingNote?: string } | undefined} legacy
 */
export function joinWithLegacyNotes(join, legacy) {
  if (!legacy) return join;
  const steps = join.steps.map((s) => ({ ...s }));
  const note = (/** @type {number} */ i, /** @type {string | undefined} */ text) => {
    if (filled(text) && steps[i])
      steps[i] = { ...steps[i], body: blocks([/** @type {string} */ (text)], `${steps[i]._key}n`) };
  };
  note(1, legacy.membershipNote);
  note(2, legacy.equipmentNote);
  if (filled(legacy.gradingNote))
    steps.push({
      _key: 'grading',
      _type: 'textSection',
      title: 'Grading',
      body: blocks([legacy.gradingNote ?? ''], 'gradingn'),
    });
  return { ...join, steps };
}
