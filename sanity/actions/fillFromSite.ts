// "Fill blanks with the site's current text": a document action on Dojo settings and on the (first) instructor. It copies
// what the live site shows today (src/data/site.json) into the fields that are empty, as a draft to review and publish.
// Nothing is overwritten. Shown only while something is blank.
import { useDocumentOperation, type DocumentActionComponent } from 'sanity';
import site from '../../src/data/site.json';

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
    'address.venue': site.address.venue,
    'address.street': site.address.street,
    'address.city': site.address.city,
    'address.region': site.address.region,
    'address.postalCode': site.address.postalCode,
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

const filled = (v: unknown) =>
  v !== undefined && v !== null && !(typeof v === 'string' && v.trim() === '') && !(Array.isArray(v) && v.length === 0);
const get = (o: Record<string, any>, path: string) => path.split('.').reduce<any>((v, k) => (v == null ? v : v[k]), o);

export const FillFromSite: DocumentActionComponent = (props) => {
  const { patch } = useDocumentOperation(props.id, props.type);
  const defaults = DEFAULTS[props.type];
  if (!defaults) return null;
  const doc = (props.draft ?? props.published ?? {}) as Record<string, any>;
  // for instructors, only the one that is (or will be) Steve: another instructor shouldn't be offered his details
  if (props.type === 'person' && filled(doc.name) && doc.name !== t.name) return null;
  const missing = Object.entries(defaults).filter(([path]) => !filled(get(doc, path)));
  if (!missing.length) return null;
  return {
    label: 'Fill blanks with the site’s current text',
    title: `Copies the text the website shows today into the ${missing.length} empty field${missing.length > 1 ? 's' : ''}. Nothing filled in is changed. Review, then Publish.`,
    onHandle: () => {
      const ops: Record<string, unknown>[] = [];
      if (missing.some(([p]) => p.startsWith('address.'))) ops.push({ setIfMissing: { address: {} } });
      ops.push({ set: Object.fromEntries(missing) });
      patch.execute(ops);
      props.onComplete();
    },
  };
};
