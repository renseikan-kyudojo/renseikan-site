# Sanity (content system)

Project `bfgbeqq4`, dataset `production` (public read). The Studio is built with `sanity build` into `dist/studio` by the
`build` script and served at **renseikan.org/studio** (vercel.json rewrites `/studio/*` to its `index.html`). Run it locally
with `npm run studio`.

- `sanity.config.ts` (repo root): the Studio, its menu (`sanity/structure.ts`) and the schema (`sanity/schemas`).
- `src/lib/sanity.ts`: the build reads `settings`, `person`, `classSession` and upcoming `event`s over the public API. Every
  field falls back to `src/data/site.json` (or the page's defaults), so an empty dataset or an outage never breaks a build.
  `src/lib/render.ts` holds the HTML shared by the home page and the inner pages.
- Wired so far:
  - Dojo settings: name, tagline, description, class time, venue/address, email, policy, booking URL, JACC widget code
    (the widget shows on the home and Classes pages once pasted; until then only the booking button).
  - Instructors: the first (lowest Order) is on the home page; all are on /instructor. A blank field on the first one
    keeps site.json's text. Portrait is cropped 5:6 around the hotspot.
  - Classes: one document per weekly class. The home and Classes pages list the next dates it falls on (built 8 ahead;
    `public/js/site.js` hides past ones and marks today). An Event of kind **Closure** marks its dates "No class".
    No Class documents = one Sunday class at the Dojo settings time. Footer, Visit and schema.org hours follow them.
  - Events: the News page.
  - Next: Pages, Posts, Photos.
- Home page: `src/partials/home.html` is the prototype markup with `<!--@name-->` tokens; `src/pages/index.astro` fills
  them (an unknown token fails the build).
- Studio action **Fill blanks with the site's current text** (`sanity/actions/fillFromSite.ts`) on Dojo settings and the
  first instructor: copies site.json into empty fields as a draft; nothing filled in is overwritten.
- The daily cron (`api/instagram.ts`, 09:00 UTC) calls the deploy hook too, so class dates roll forward even with no
  edits. It needs `CRON_SECRET` and `VERCEL_DEPLOY_HOOK` in Vercel; without them it does nothing.
- Publishing rebuilds the site through a Sanity webhook to the Vercel deploy hook `content-publish` (runbook 04, step 9).
