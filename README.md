# Renseikan Kyudojo — renseikan.org

The website of Renseikan Kyudojo, a kyudo (Japanese archery) dojo in San Jose, California. A static
[Astro](https://astro.build) site on Vercel, with a [Sanity](https://www.sanity.io) Studio at `/studio` where the dojo
edits its facts, instructors, classes and events.

## Run it

```sh
npm ci            # Node 22
npm run dev       # the site at http://localhost:4321
npm run studio    # the Sanity Studio at http://localhost:3333
```

Copy `.env.example` to `.env` for local builds; nothing in it is required (the build falls back to `src/data/site.json`
when Sanity is unreachable, and logs which source it used).

## Check it

```sh
npm run lint          # eslint
npm run format:check  # prettier (npm run format to fix)
npm run check         # astro check (types)
npx astro build       # the site into dist/
npm run test:smoke    # Playwright: every page renders, no console errors, no serious axe findings (needs dist/)
```

CI (`.github/workflows/ci.yml`) runs all of the above on every pull request; Vercel builds a preview per PR.

## Where things are

| Path                           | What                                                                                                         |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| `src/pages/`                   | One file per page: home, about, classes, instructor, visit, news, 404                                        |
| `src/layouts/Base.astro`       | Head, nav, `<main>`, footer, the site script; used by every page                                             |
| `src/lib/sanity.ts`            | Reads settings, instructors, classes and events from Sanity, with `site.json` fallbacks                      |
| `src/components/`              | Hero, Bento, Steps, ClassList, BookingPanel, InstructorCard, VisitBlock, PageHeader, SectionTitle, BrushMark |
| `src/lib/format.ts`            | Small text helpers (`src/lib/format.ts`)                                                                     |
| `src/data/site.json`           | The dojo's facts as shipped; the Studio's values override them                                               |
| `src/styles/site.css`          | All styles; self-hosted font faces and design tokens at the top                                              |
| `src/lib/ink/`                 | The ink libraries as ES modules: logo (the mark in motion), brush (live ink), wind (the petals)              |
| `src/scripts/`                 | `site.js` (theme, menu, copy, reveals, class dates, map) and `home.js` (wind and the painted hero)           |
| `src/assets/`                  | Images Astro optimizes at build (the shipped portrait)                                                       |
| `public/fonts/`, `public/ink/` | Subset WOFF2 files; the brushed rule, stamp and grain masks                                                  |
| `brand/`                       | Logo source SVGs the site does not use (not deployed)                                                        |
| `sanity/`                      | Studio schema, menu and actions; `sanity/project.ts` names the project once                                  |
| `api/daily.ts`                 | Vercel cron: rebuilds daily so class dates roll forward                                                      |
| `docs/`                        | The site audit and plan                                                                                      |

## Deploy

Pushes to `main` deploy to renseikan.org through Vercel. Publishing in the Studio calls a Vercel deploy hook; the daily
cron calls it too. The Studio is built into `dist/studio` by `npm run build`; `vercel.json` rewrites `/studio/*` to it
and sets the security headers. The Sanity project must allow `https://renseikan.org` as a CORS origin for the Studio to
sign in.
