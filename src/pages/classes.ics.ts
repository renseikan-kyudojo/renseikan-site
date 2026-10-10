// An iCalendar feed of the next six months of class dates (closures included as cancelled), so members can subscribe
// once. Rebuilt daily by the cron, like the class list.
import type { APIContext } from 'astro';
import { getClassDates, getSite, SANITY } from '../lib/sanity';

const fold = (line: string) => line.replace(/(.{72})/g, '$1\r\n ');
const ics = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
/** "4:00 – 6:00 pm" + a date -> ["20261011T160000", "20261011T180000"] in Pacific time. */
function times(date: string, range: string): [string, string] | null {
  const parts = range.split(/[–-]/).map((x) => x.trim());
  if (parts.length !== 2) return null;
  const pm = (range.match(/(am|pm)\s*$/i)?.[1] ?? 'pm').toLowerCase();
  const to = (t: string) => {
    const m = t.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
    if (!m) return null;
    let h = +m[1] % 12;
    if ((m[3] || pm).toLowerCase() === 'pm') h += 12;
    return `${date.replace(/-/g, '')}T${String(h).padStart(2, '0')}${m[2] ?? '00'}00`;
  };
  const a = to(parts[0]),
    b = to(parts[1]);
  return a && b ? [a, b] : null;
}

export async function GET(_context: APIContext) {
  const [site, dates] = await Promise.all([getSite(), getClassDates(26)]);
  const stamp = new Date()
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d+Z$/, 'Z');
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//${site.name}//classes//EN`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${ics(site.name)} classes`,
    'X-WR-TIMEZONE:America/Los_Angeles',
    'REFRESH-INTERVAL;VALUE=DURATION:P1D',
  ];
  for (const d of dates) {
    const t = times(d.date, d.time);
    lines.push('BEGIN:VEVENT', `UID:${d.date}-${SANITY.dataset}@renseikan.org`, `DTSTAMP:${stamp}`);
    if (t) lines.push(`DTSTART;TZID=America/Los_Angeles:${t[0]}`, `DTEND;TZID=America/Los_Angeles:${t[1]}`);
    else lines.push(`DTSTART;VALUE=DATE:${d.date.replace(/-/g, '')}`);
    lines.push(
      `SUMMARY:${ics(d.off ? `No class: ${d.note || 'closed'}` : d.title)}`,
      `LOCATION:${ics(`${site.address.venue}, ${site.address.street}, ${site.address.city}, ${site.address.region} ${site.address.postalCode}`)}`,
      `STATUS:${d.off ? 'CANCELLED' : 'CONFIRMED'}`,
    );
    if (d.note && !d.off) lines.push(`DESCRIPTION:${ics(d.note)}`);
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return new Response(lines.map(fold).join('\r\n') + '\r\n', {
    headers: { 'content-type': 'text/calendar; charset=utf-8' },
  });
}
