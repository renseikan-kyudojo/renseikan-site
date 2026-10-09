// Content from Sanity (runbook 04), read at build time from the public `production` dataset — no token needed.
// Every reader falls back to src/data/site.json (or the inline defaults) when Sanity is unreachable, empty or a field is
// blank, so a build never fails on content. A publish in the Studio triggers the `content-publish` deploy hook.
import local from '../data/site.json';

export const SANITY = { projectId: 'bfgbeqq4', dataset: 'production', apiVersion: '2025-02-19' };

async function query<T>(groq: string): Promise<T | null> {
  // The live API (not the CDN), so a rebuild fired right after a publish sees the new content.
  const url = new URL(`https://${SANITY.projectId}.api.sanity.io/v${SANITY.apiVersion}/data/query/${SANITY.dataset}`);
  url.searchParams.set('query', groq);
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!r.ok) return null;
    return ((await r.json()).result ?? null) as T | null;
  } catch {
    return null;
  }
}

const filled = (v: unknown) => v !== undefined && v !== null && !(typeof v === 'string' && v.trim() === '');
function overlay<T extends Record<string, any>>(base: T, over: Record<string, any> | null | undefined): T {
  if (!over) return base;
  const out: Record<string, any> = { ...base };
  for (const [k, v] of Object.entries(over)) {
    if (v && typeof v === 'object' && !Array.isArray(v) && base[k] && typeof base[k] === 'object') out[k] = overlay(base[k], v);
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

export interface Ev { date: string; title: string; place?: string; kind?: string; body?: string }
/** Upcoming events, soonest first; the given defaults if the dataset has none. */
export async function getEvents(defaults: Ev[]): Promise<Ev[]> {
  const today = new Date().toISOString().slice(0, 10);
  const evs = await query<Ev[]>(`*[_type == "event" && defined(date) && coalesce(endDate, date) >= "${today}"] | order(date asc){
    title, date, place, kind, "body": pt::text(body)
  }`);
  return evs && evs.length ? evs : defaults;
}
