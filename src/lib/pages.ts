// Each page's copy (titles, ledes, section text, labels) from its document in the Studio, laid over what the site ships
// in src/data/pages.json, with {placeholders} filled from the dojo's facts. A blank field in the Studio keeps the
// shipped text, so a half-edited page never loses a section.
import pagesJson from '../data/pages.json';
import { PAGE_TYPES, toDefaults, overlay, fillDeep, joinWithLegacyNotes } from './copy.js';
import { getSite, getClasses, getInstructors, daysLabel, queryDocument } from './sanity';
import { shortVenue, regionName } from './format';
import type { PortableBlock } from './portable';

/** pages.json's shape once its paragraph arrays are Portable Text. */
type Rich<T> = T extends string[]
  ? PortableBlock[]
  : T extends (infer U)[]
    ? (Rich<U> & { _key: string })[]
    : T extends object
      ? { [K in keyof T]: Rich<T[K]> }
      : T;
export type Pages = Rich<typeof pagesJson>;
export type PageKey = keyof Pages;

/** The shipped copy, in the Studio's shape. */
export const defaults = toDefaults(pagesJson) as Pages;

export type Vars = Record<string, string>;
let varsPromise: Promise<Vars> | undefined;
/** The facts a {placeholder} can stand for, from Dojo settings, the classes and the first instructor. */
export function getVars(): Promise<Vars> {
  varsPromise ??= (async () => {
    const [site, classes, instructors] = await Promise.all([getSite(), getClasses(), getInstructors()]);
    const a = site.address;
    return {
      name: site.name,
      tagline: site.tagline,
      days: daysLabel(classes),
      hours: site.hours,
      email: site.email,
      venue: a.venue,
      venueShort: shortVenue(a.venue),
      street: a.street,
      city: a.city,
      region: a.region,
      state: regionName(a.region),
      postalCode: a.postalCode,
      address: `${a.street}, ${a.city}, ${a.region} ${a.postalCode}`,
      policy: site.policy,
      instructor: instructors[0]?.name ?? '',
      booking: site.booking,
      instagram: site.instagram ?? '',
      nckf: site.links.nckf,
      akr: site.links.akr,
      mapsSearch: site.mapsSearch,
      mapsDirections: site.mapsDirections,
    };
  })();
  return varsPromise;
}

const raw = new Map<PageKey, Promise<Record<string, any> | null>>();
/**
 * A page's copy: its Studio document over the shipped defaults, every {placeholder} filled. `extra` adds or overrides
 * placeholders for the page (the Japanese page passes its own days and hours).
 */
export async function getPage<K extends PageKey>(key: K, extra: Vars = {}): Promise<Pages[K]> {
  if (!raw.has(key)) raw.set(key, queryDocument(PAGE_TYPES[key]));
  const [doc, vars, site] = await Promise.all([raw.get(key)!, getVars(), getSite()]);
  let base: Record<string, any> = defaults[key];
  // the Joining page used three Dojo settings fields before it had a document of its own; honour what was written there
  if (key === 'join') base = joinWithLegacyNotes(base as Pages['join'], site);
  return fillDeep(overlay(base, doc), { ...vars, ...extra }) as Pages[K];
}

/** The site's shared labels (navigation, footer, booking panel, visit block), filled. */
export const getShared = () => getPage('shared');
