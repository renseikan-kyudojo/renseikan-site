// Small text helpers shared by components.
export const shortVenue = (venue: string) => venue.replace(/\s*\([^)]*\)\s*$/, '');
export const regionName = (r: string) => (r === 'CA' ? 'California' : r);

/** "Sun, Dec 6, 2026" */
export const when = (d: string) =>
  new Date(d + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

/** A Google Calendar "add event" link for an event (all-day unless it has a start and end). */
export function googleCalendarUrl(
  e: { title: string; date: string; endDate?: string; start?: string; end?: string; summary?: string },
  place: string,
): string {
  const day = (d: string) => d.replace(/-/g, '');
  const next = (d: string) => {
    const t = new Date(d + 'T12:00:00Z');
    t.setUTCDate(t.getUTCDate() + 1);
    return t.toISOString().slice(0, 10).replace(/-/g, '');
  };
  const u = new URL('https://calendar.google.com/calendar/render');
  u.searchParams.set('action', 'TEMPLATE');
  u.searchParams.set('text', e.title);
  u.searchParams.set('dates', `${day(e.date)}/${next(e.endDate || e.date)}`);
  if (e.summary) u.searchParams.set('details', e.summary);
  u.searchParams.set('location', place);
  return u.toString();
}
