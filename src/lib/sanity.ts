// Content from Sanity (runbook 04), read at build time from the public `production` dataset — no token needed.
// Every reader falls back to src/data/site.json (or the inline defaults) when Sanity is unreachable, empty or a field is
// blank, so a build never fails on content. A publish in the Studio triggers the `content-publish` deploy hook.
import local from '../data/site.json';
import { SANITY_PROJECT_ID, SANITY_DATASET, SANITY_API_VERSION } from '../../sanity/project';

export const SANITY = {
  projectId: import.meta.env.PUBLIC_SANITY_PROJECT_ID || SANITY_PROJECT_ID,
  dataset: import.meta.env.PUBLIC_SANITY_DATASET || SANITY_DATASET,
  apiVersion: SANITY_API_VERSION,
};

// Say once per build which source the content came from, so a stale deploy built on the fallback is noticed in the log.
let reported: string | undefined;
function report(source: string) {
  if (reported === source) return;
  reported = source;
  console.log(`[sanity] content source: ${source}`);
}

async function query<T>(groq: string): Promise<T | null> {
  // The live API (not the CDN), so a rebuild fired right after a publish sees the new content.
  const url = new URL(`https://${SANITY.projectId}.api.sanity.io/v${SANITY.apiVersion}/data/query/${SANITY.dataset}`);
  url.searchParams.set('query', groq);
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!r.ok) {
      report(`site.json fallback (Sanity responded ${r.status})`);
      return null;
    }
    report(`Sanity ${SANITY.projectId}/${SANITY.dataset}`);
    return ((await r.json()).result ?? null) as T | null;
  } catch (e) {
    report(`site.json fallback (Sanity unreachable: ${e instanceof Error ? e.message : e})`);
    return null;
  }
}

const filled = (v: unknown) =>
  v !== undefined && v !== null && !(typeof v === 'string' && v.trim() === '') && !(Array.isArray(v) && v.length === 0);
function overlay<T extends Record<string, any>>(base: T, over: Record<string, any> | null | undefined): T {
  if (!over) return base;
  const out: Record<string, any> = { ...base };
  for (const [k, v] of Object.entries(over)) {
    if (v && typeof v === 'object' && !Array.isArray(v) && base[k] && typeof base[k] === 'object')
      out[k] = overlay(base[k], v);
    else if (filled(v)) out[k] = v;
  }
  return out as T;
}

export type Site = typeof local & { widgetEmbed?: string; instagram?: string };

let sitePromise: Promise<Site> | undefined;
/** Dojo facts: the `settings` document over site.json. Map links and coordinates stay in site.json (tied to the JACC listing). */
export function getSite(): Promise<Site> {
  sitePromise ??= (async () => {
    const s = await query<Record<string, any>>(`*[_id == "settings"][0]{
      name, tagline, description, email, hours, policy, widgetEmbed, instagram,
      "booking": bookingUrl,
      address{ venue, street, city, region, postalCode }
    }`);
    return overlay(local as Site, s);
  })();
  return sitePromise;
}

export interface Ev {
  date: string;
  title: string;
  place?: string;
  kind?: string;
  body?: string;
}
/** Upcoming events, soonest first; the given defaults if the dataset has none. */
export async function getEvents(defaults: Ev[]): Promise<Ev[]> {
  const today = new Date().toISOString().slice(0, 10);
  const evs = await query<
    Ev[]
  >(`*[_type == "event" && defined(date) && coalesce(endDate, date) >= "${today}"] | order(date asc){
    title, date, place, kind, "body": pt::text(body)
  }`);
  return evs && evs.length ? evs : defaults;
}

// ---- Instructors (`person`) -------------------------------------------------------------------------------------

export interface Instructor {
  name: string;
  title?: string;
  rank?: string;
  rankPlain?: string;
  credentials: string[];
  email?: string;
  portrait?: string;
  portraitRatio?: [number, number];
}
/** Instructors in menu order. The first one is laid over site.json's instructor, so a half-filled document still renders. */
export async function getInstructors(): Promise<Instructor[]> {
  const t = (await getSite()).instructor;
  const fallback: Instructor = {
    name: t.name,
    title: 'Chief Instructor',
    rank: t.rank,
    rankPlain: t.rankPlain,
    credentials: [t.role, t.former],
    email: t.email,
    portrait: '/people/steve-scott.jpg',
    portraitRatio: [1, 1], // shown, uncropped, until a portrait is uploaded in the Studio
  };
  const docs = await query<
    Record<string, any>[]
  >(`*[_type == "person"] | order(coalesce(order, 999) asc, _createdAt asc){
    name, title, rank, rankPlain, credentials, email,
    "portrait": portrait.asset->url, "fp": portrait.hotspot{ x, y }
  }`);
  if (!docs || !docs.length) return [fallback];
  return docs
    .map((d, i) => {
      const { fp, portrait, ...rest } = d;
      const p: Instructor =
        i === 0 ? overlay(fallback, rest) : ({ name: '', credentials: [] as string[], ...rest } as Instructor);
      if (portrait) {
        // 5:6 crop around the hotspot Steve sets in the Studio, sized for the 160px card at 3x
        const x = fp?.x ?? 0.5,
          y = fp?.y ?? 0.4;
        p.portraitRatio = undefined;
        p.portrait = `${portrait}?w=480&h=576&fit=crop&crop=focalpoint&fp-x=${x}&fp-y=${y}&auto=format`;
      }
      return p;
    })
    .filter((p) => filled(p.name));
}

// ---- Classes (`classSession`) and the dates they fall on ----------------------------------------------------------

const WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export interface ClassSession {
  title: string;
  weekday: string;
  start?: string;
  end?: string;
  place: string;
  status: string;
  note?: string;
}

let classesPromise: Promise<ClassSession[]> | undefined;
/** The weekly classes; one Sunday class from site.json's hours if the Studio has none. */
export function getClasses(): Promise<ClassSession[]> {
  classesPromise ??= (async () => {
    const fallback: ClassSession = { title: 'Kyudo class', weekday: 'Sunday', place: 'JACC, San Jose', status: 'Open' };
    const docs = await query<Record<string, any>[]>(
      `*[_type == "classSession" && defined(weekday)]{ title, weekday, start, end, place, status, note }`,
    );
    if (!docs || !docs.length) return [fallback];
    return docs.map((d) => overlay(fallback, d)).sort((a, b) => WEEK.indexOf(a.weekday) - WEEK.indexOf(b.weekday));
  })();
  return classesPromise;
}

/** "Sundays", "Saturdays and Sundays": the days with a class that isn't cancelled. */
export function daysLabel(classes: ClassSession[]): string {
  const days = [...new Set(classes.filter((c) => c.status !== 'Cancelled').map((c) => c.weekday))]
    .sort((a, b) => ((WEEK.indexOf(a) + 6) % 7) - ((WEEK.indexOf(b) + 6) % 7))
    .map((d) => d + 's');
  if (!days.length) return 'Sundays';
  return days.length === 1 ? days[0] : `${days.slice(0, -1).join(', ')} and ${days.at(-1)}`;
}

const meridiem = (s: string) => (s.match(/\b(am|pm)\s*$/i)?.[1] ?? '').toLowerCase();
/** "4:00 pm" + "6:00 pm" -> "4:00 – 6:00 pm"; falls back to the Dojo settings hours. */
export function timeRange(c: Pick<ClassSession, 'start' | 'end'>, hours: string): string {
  if (!c.start) return hours;
  if (!c.end) return c.start;
  const m = meridiem(c.start);
  const start = m && m === meridiem(c.end) ? c.start.replace(/\s*(am|pm)\s*$/i, '') : c.start;
  return `${start} – ${c.end}`;
}
/** Start time with its am/pm: "4:00 pm". */
export function startTime(c: Pick<ClassSession, 'start'>, hours: string): string {
  if (c.start) return c.start;
  const first = hours.split(/[–-]/)[0].trim();
  return meridiem(first) ? first : `${first} ${meridiem(hours)}`.trim();
}

export interface ClassDate {
  date: string;
  dow: string;
  day: number;
  title: string;
  time: string;
  place: string;
  status: string;
  off: boolean;
  note?: string;
}
/** The next `n` class dates from today (Pacific time). A Closure event covering a date marks it "No class". */
export async function getClassDates(n = 8): Promise<ClassDate[]> {
  const [classes, site] = await Promise.all([getClasses(), getSite()]);
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(new Date());
  const closures =
    (await query<{ date: string; endDate?: string; title?: string }[]>(
      `*[_type == "event" && kind == "Closure" && defined(date) && coalesce(endDate, date) >= "${today}"]{ date, endDate, title }`,
    )) ?? [];
  const [y, m, d] = today.split('-').map(Number);
  const out: ClassDate[] = [];
  const live = classes.filter((c) => c.status !== 'Cancelled');
  for (let i = 0; i < 120 && out.length < n && live.length; i++) {
    const day = new Date(Date.UTC(y, m - 1, d + i));
    const iso = day.toISOString().slice(0, 10);
    for (const c of live) {
      if (WEEK.indexOf(c.weekday) !== day.getUTCDay()) continue;
      const closed = closures.find((e) => e.date <= iso && iso <= (e.endDate || e.date));
      out.push({
        date: iso,
        dow: c.weekday.slice(0, 3).toUpperCase(),
        day: day.getUTCDate(),
        title: c.title,
        time: timeRange(c, site.hours),
        place: c.place,
        status: closed ? 'NO CLASS' : c.status === 'Members only' ? 'MEMBERS' : 'OPEN',
        off: !!closed,
        note: closed ? closed.title : c.note,
      });
    }
  }
  return out.slice(0, n);
}
