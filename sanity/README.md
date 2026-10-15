# Sanity (content system)

Project `bfgbeqq4`, dataset `production` (public read). The Studio is built with `sanity build` into `dist/studio` by the
`build` script and served at **renseikan.org/studio** (vercel.json rewrites `/studio/*` to its `index.html`). Run it locally
with `npm run studio`.

- `sanity.config.ts` (repo root): the Studio, its menu (`sanity/structure.ts`) and the schema (`sanity/schemas`).
- `src/lib/sanity.ts`: the build reads `settings`, `person`, `classSession` and upcoming `event`s over the public API. Every
  field falls back to `src/data/site.json` (or the page's defaults), so an empty dataset or an outage never breaks a build;
  the build log says which source it used. The components in `src/components/` render the same content on the home
  page and the inner pages.
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
    Lightroom, Pixel and Android export) when it is uploaded as an image, but keeps files byte for byte. So a photo's
    HDR original (in its edit dialog) holds the same JPEG as a file; on a screen that can show HDR the viewer swaps the
    photo in view for that file, and its Original button opens it. `scripts/upload-photos.mjs` fills it in for every
    Ultra HDR JPEG it uploads; in the Studio, add it by hand. The grid is monochrome until hovered, so only the
    full-size view is HDR.
  - FAQ: the Questions page, in Order; built-in answers show until the first entry is published.
  - Dojo settings also holds the Joining page's facts (after the first lesson, fees, equipment, grading); blank fields
    fall back to cautious wording that says to ask.
  - Next: Pages.
- Home page: `src/pages/index.astro` composes the components (Hero, Bento, Steps, ClassList, BookingPanel,
  InstructorCard, VisitBlock).
- Studio action **Fill blanks with the site's current text** (`sanity/actions/fillFromSite.ts`) on Dojo settings and the
  first instructor: copies site.json into empty fields as a draft; nothing filled in is overwritten.
- The daily cron (`api/daily.ts`, 09:00 UTC) calls the deploy hook too, so class dates roll forward even with no
  edits. It needs `CRON_SECRET` and `VERCEL_DEPLOY_HOOK` in Vercel; without them it does nothing.
- Publishing rebuilds the site through a Sanity webhook to the Vercel deploy hook `content-publish` (runbook 04, step 9).
