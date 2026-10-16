# Sanity (content system)

Project `bfgbeqq4`, dataset `production` (public read). The Studio is built with `sanity build` into `dist/studio` by the
`build` script and served at **renseikan.org/studio** (vercel.json rewrites `/studio/*` to its `index.html`). Run it locally
with `npm run studio`.

- `sanity.config.ts` (repo root): the Studio, its menu (`sanity/structure.ts`) and the schema (`sanity/schemas`).
- `src/lib/sanity.ts`: the build reads `settings`, `person`, `classSession` and upcoming `event`s over the public API. Every
  field falls back to `src/data/site.json` (or the page's defaults), so an empty dataset or an outage never breaks a build;
  the build log says which source it used. The components in `src/components/` render the same content on the home
  page and the inner pages.
- `src/lib/pages.ts`: each page's words come from its own document under **Pages** in the Studio (Home, About, Classes,
  Joining, Visit, Instructor, Questions, News and events, Gallery, 日本語, Not found, and "Navigation and shared text" for
  the menu, footer, booking panel and visit block). The documents are laid over `src/data/pages.json`, which holds the
  same text as the site ships it, so a blank field keeps the shipped wording and a new field starts with it. Any text
  may hold a placeholder (`{days}`, `{hours}`, `{email}`, `{name}`, `{venue}`, `{address}`, `{policy}`, `{nckf}`,
  `{akr}`, `{instagram}`, `{booking}`), filled at build time from Dojo settings and Classes, so copy never goes stale
  when a fact changes. Rich-text fields allow bold, italic and links only. `src/lib/copy.js` is the shared piece: it
  turns `pages.json`'s light markup (`*italic*`, `**bold**`, `[text](url)`, one string per paragraph) into Portable
  Text with stable keys, fills placeholders, and computes the fill-blanks patch.
- Wired so far:
  - Dojo settings: name, tagline, description, class time, venue/address, email, policy, booking URL, JACC widget code
    (the widget shows on the home and Classes pages once pasted; until then only the booking button).
  - Instructors: the first (lowest Order) is on the home page; all are on /instructor. A blank field on the first one
    keeps site.json's text. Portrait is cropped 5:6 around the hotspot.
  - Classes: one document per weekly class. The home and Classes pages list the next dates it falls on (built 8 ahead;
    `public/js/site.js` hides past ones and marks today). An Event of kind **Closure** marks its dates "No class".
    No Class documents = one Sunday class at the Dojo settings time. Footer, Visit and schema.org hours follow them.
  - Events: the News page lists the upcoming ones; each has its own page at /events/<slug> with its details (rich
    text and images), a registration button if a link is set, and "Add to Google Calendar". Closures still mark class
    dates "No class".
  - News posts: listed under the events on the News page, each at /news/<slug>. Both feed /rss.xml.
  - Albums and Gallery photos: the Gallery page, each album under its own heading with its date, in Order (an album's
    photos keep the order they have in the Studio; single photos gather under "More photos"), with an album bar to
    jump between them and a full-screen viewer (swipe or arrow keys; `#photo-N` links open it on that photo);
    until there are any it points to Instagram when that URL is set. To add many at once, drop the files onto an
    Album's Photos field, or run `scripts/upload-photos.mjs` on a folder (needs `SANITY_WRITE_TOKEN`). The grid shows
    resized copies. **HDR:** Sanity strips the gain map from an **Ultra HDR JPEG** (a JPEG with a gain map, as
    Lightroom, Pixel and Android export) when it is uploaded as an image, but keeps files byte for byte, so a photo
    keeps the JPEG as its **HDR original** (a file) beside its Image. Upload each photo once: files dropped on an
    Album's Photos, or chosen with **Add photos**, become photos, and each Ultra HDR JPEG is also kept as its HDR
    original; on any single photo, putting the JPEG in HDR original alone makes the Image from it
    (`sanity/components/photoInputs.tsx`; `scripts/upload-photos.mjs` does the same). On a screen that can show HDR
    the viewer swaps the photo in view for its HDR original, on a layer of its own (iOS Safari draws an image inside
    the swipe track in standard range otherwise); its Original button opens it. Export HDR photos at about 4000 px
    on the long edge so phones load them quickly. The grid is monochrome until hovered, so only the full-size view
    is HDR.
  - FAQ: the Questions page, in Order; built-in answers show until the first entry is published.
  - Dojo settings holds the Fees table for the Joining page; the page's own wording (its steps, what shows while the
    table is empty) is under Pages, Joining. The three notes the settings document used to hold for that page (after
    the first lesson, equipment, grading) are still read as fallbacks for the page's steps, so nothing written there
    is lost, and `npm run seed` carries them into the Joining page document.
  - Pages: every page's titles, ledes, sections, labels and buttons, as above.
- Home page: `src/pages/index.astro` composes the components (Hero, Bento, Steps, ClassList, BookingPanel,
  InstructorCard, VisitBlock).
- Studio action **Fill blanks with the site's current text** (`sanity/actions/fillFromSite.ts`) on Dojo settings, every
  page document and the first instructor: copies site.json / pages.json into empty fields as a draft; nothing filled in
  is overwritten.
- `npm run seed` (`scripts/seed-content.mjs`, needs `SANITY_WRITE_TOKEN` with Editor rights) does the same for the whole
  dataset at once, without opening each document: it creates the page documents and fills the blanks in Dojo settings,
  and creates the first instructor, the Sunday class and the FAQ entries if the dataset has none of them. `--dry` only
  reports; `--reset` also overwrites every page field with the shipped text. The dataset was seeded this way on
  2026-10-16, so the Studio shows the site's text section by section.
- The daily cron (`api/daily.ts`, 09:00 UTC) calls the deploy hook too, so class dates roll forward even with no
  edits. It needs `CRON_SECRET` and `VERCEL_DEPLOY_HOOK` in Vercel; without them it does nothing.
- Publishing rebuilds the site through a Sanity webhook to the Vercel deploy hook `content-publish` (runbook 04, step 9).
