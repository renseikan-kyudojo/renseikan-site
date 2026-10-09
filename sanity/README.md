# Sanity (content system)

Project `bfgbeqq4`, dataset `production` (public read). The Studio is built with `sanity build` into `dist/studio` by the
`build` script and served at **renseikan.org/studio** (vercel.json rewrites `/studio/*` to its `index.html`). Run it locally
with `npm run studio`.

- `sanity.config.ts` (repo root): the Studio, its menu (`sanity/structure.ts`) and the schema (`sanity/schemas`).
- `src/lib/sanity.ts`: the build reads the `settings` document and upcoming `event`s over the public API. Every field falls
  back to `src/data/site.json` (or the page's defaults), so an empty dataset or an outage never breaks a build.
- Wired so far: Dojo settings (name, tagline, description, class time, venue/address, email, policy, booking URL, JACC
  widget code) and Events (News page). Next: Instructor, Classes, Pages, Posts, Photos.
- Publishing rebuilds the site through a Sanity webhook to the Vercel deploy hook `content-publish` (runbook 04, step 9).
