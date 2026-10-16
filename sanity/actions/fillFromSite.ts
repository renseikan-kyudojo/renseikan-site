// "Fill blanks with the site's current text": a document action on Dojo settings, every page document and the (first)
// instructor. It copies what the live site shows today (src/data/site.json and src/data/pages.json) into the fields
// that are empty, as a draft to review and publish. Nothing is overwritten. Shown only while something is blank.
import { useDocumentOperation, type DocumentActionComponent } from 'sanity';
import site from '../../src/data/site.json';
import pages from '../../src/data/pages.json';
import { PAGE_TYPES, toDefaults, fillPatch } from '../../src/lib/copy.js';

const t = site.instructor;
const DEFAULTS: Record<string, Record<string, unknown>> = {
  settings: {
    name: site.name,
    tagline: site.tagline,
    description: site.description,
    hours: site.hours,
    email: site.email,
    policy: site.policy,
    bookingUrl: site.booking,
    address: {
      venue: site.address.venue,
      street: site.address.street,
      city: site.address.city,
      region: site.address.region,
      postalCode: site.address.postalCode,
    },
  },
  person: {
    name: t.name,
    title: 'Chief Instructor',
    rank: t.rank,
    rankPlain: t.rankPlain,
    credentials: [t.role, t.former],
    email: t.email,
    order: 1,
  },
};
const pageDefaults = toDefaults(pages) as Record<keyof typeof PAGE_TYPES, Record<string, unknown>>;
for (const [key, type] of Object.entries(PAGE_TYPES) as [keyof typeof PAGE_TYPES, string][]) {
  const rest = { ...pageDefaults[key] };
  delete rest.entries; // the Questions page's entries are FAQ documents, not fields of the page
  DEFAULTS[type] = rest;
}

export const FillFromSite: DocumentActionComponent = (props) => {
  const { patch } = useDocumentOperation(props.id, props.type);
  const defaults = DEFAULTS[props.type];
  if (!defaults) return null;
  const doc = (props.draft ?? props.published ?? {}) as Record<string, any>;
  // for instructors, only the one that is (or will be) Steve: another instructor shouldn't be offered his details
  if (props.type === 'person' && doc.name && doc.name.trim() && doc.name !== t.name) return null;
  const ops = fillPatch(defaults, doc);
  if (!ops.length) return null;
  const n = Object.keys(ops.at(-1)?.set ?? {}).length;
  return {
    label: 'Fill blanks with the site’s current text',
    title: `Copies the text the website shows today into the ${n} empty field${n > 1 ? 's' : ''}. Nothing filled in is changed. Review, then Publish.`,
    onHandle: () => {
      patch.execute(ops);
      props.onComplete();
    },
  };
};
