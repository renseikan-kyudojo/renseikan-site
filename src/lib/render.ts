// HTML for the pieces the home page (a raw partial) shares with the inner pages, so both render the same Sanity content
// the same way. Every value is escaped; only the WellnessLiving embed (pasted by Fernando/Steve in Dojo settings) is raw.
import type { ClassDate, Instructor, Site } from './sanity';

export const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Upcoming class dates. All of them are rendered; site.js hides past ones and marks today, so a page built days ago
 *  still reads right. Without JS the first four show. */
export function classRows(dates: ClassDate[], show = 4): string {
  if (!dates.length) return '<p class="muted">No classes are scheduled right now. Check the News page.</p>';
  const rows = dates.map((c, i) => {
    const meta = [c.time, c.place].filter(Boolean).map(esc).join(' · ');
    const note = c.note ? `<p class="meta">${esc(c.note)}</p>` : '';
    return `<li data-date="${c.date}"${c.off ? ' class="off"' : ''}${i >= show ? ' hidden' : ''}>
          <div class="day">${c.dow}<b>${c.day}</b></div>
          <div><p class="title">${esc(c.title)}</p><p class="meta">${meta}</p>${note}</div>
          <div class="status">${c.status}</div>
        </li>`;
  });
  return `<ul class="rows" data-show="${show}">\n        ${rows.join('\n        ')}\n      </ul>`;
}

/** The members' schedule widget, only once there is an embed code; before that, the booking button stands alone. */
export function widgetSlot(site: Site): string {
  if (!site.widgetEmbed?.trim()) return '';
  return `<div class="widget-slot" data-widget aria-label="Members' class schedule from WellnessLiving">
          <div class="loading" aria-live="polite"><span class="breath" id="bookBreath" aria-hidden="true"></span><span>Loading the schedule from WellnessLiving…</span></div>
          ${site.widgetEmbed}
        </div>`;
}

export function instructorCard(t: Instructor, headingTag: 'h2' | 'h3' = 'h2'): string {
  const photo = t.portrait
    ? `<img class="photo has-img" src="${esc(t.portrait)}" alt="${esc(t.name)}" width="160" height="192" loading="lazy" decoding="async">`
    : `<div class="photo mono" role="img" aria-label="Photo of ${esc(t.name)}, placeholder">PHOTO</div>`;
  const rank = t.rank ? `<p style="margin:var(--space-2) 0 0">${esc(t.rank)}${t.rankPlain ? ` <span class="muted">· ${esc(t.rankPlain)}</span>` : ''}</p>` : '';
  const creds = t.credentials?.length ? `<ul class="creds">${t.credentials.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>` : '';
  const email = t.email
    ? `<p><span class="small">${esc(t.email)}</span> <button class="copy" type="button" data-copy="${esc(t.email)}">Copy</button></p>`
    : '';
  return `<article class="card">
      ${photo}
      <div>
        <p class="eyebrow">${esc(t.title || 'Instructor')}</p>
        <${headingTag}>${esc(t.name)}</${headingTag}>
        ${rank}
        ${creds}
        ${email}
      </div>
    </article>`;
}

/** The short line under the name on the home page's instructor tile. */
export function instructorLine(t: Instructor): string {
  const rank = [t.rank, t.rankPlain].filter(Boolean).join(' · ');
  // the first credential usually repeats the title ("Chief Instructor, Renseikan Kyudo Dojo"), so the tile skips it
  const creds = (t.credentials ?? []).filter((c, i) => !(i === 0 && t.title && c.startsWith(t.title)));
  return [rank, ...creds].filter(Boolean).map((s) => esc(s.replace(/\.$/, '')) + '.').join(' ');
}

export const shortVenue = (venue: string) => venue.replace(/\s*\([^)]*\)\s*$/, '');
export const regionName = (r: string) => (r === 'CA' ? 'California' : r);
