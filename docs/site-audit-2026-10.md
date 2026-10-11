# Renseikan Kyudojo website: audit and modernization plan

Date: 2026-10-10. Audited at commit `4acd6b0` (main). Method: full read of the repo, a local production build, Playwright
screenshots of all seven pages at 390px and 1280px in light and dark themes, axe-core 4.10 accessibility scan, web-vitals
capture (LCP / CLS), request and byte counts, `npm audit`, and `npm outdated`. The live site (renseikan.org) and the Sanity
API are not reachable from the audit container, so the build ran on the `site.json` fallback content; everything below
applies to the code as committed.

## 1. Summary

The site is in good shape for a dojo of this size. It is a small static Astro 5 site, deployed on Vercel, with a Sanity
Studio at `/studio` so Sensei Steve can edit facts, instructors, classes and events. The visual identity (washi paper,
sumi ink, the brush-painted 弓道 hero, the wind of petals, the stamped seals) is distinctive and consistent across light and
dark themes. Content accuracy fixes from the last week (history, email, emblem, copy) have landed.

What holds it back is not the design language but three things:

1. **A thin information architecture.** Six pages, mostly repeating the same five facts (hours, address, instructor,
   policy, booking link). There is no answer to the questions a prospective student asks next: what does it cost after
   the free lesson, what is the path from beginner to member, what are the age and physical requirements, where do I park,
   what do classes look like (photos), what happens at a taikai. There is no gallery, no FAQ, no event detail pages, no
   Japanese-language entry point, and the Instagram integration is wired in the backend but never rendered.
2. **Weight and polish on the home page.** The home page is 183 KB of HTML because the same 34 KB brush-mark SVG is inlined
   five times; the CSS is 119 KB because of data-URI masks; 87 KB of logo path data loads on every page; the share image is
   a 551 KB PNG; fonts load render-blocking from Google. The hero's `h1` is invisible for the first 0.9 s by design, so
   the largest contentful paint is the paragraph under it rather than the name.
3. **No engineering safety net.** No CI, no lint or format config, `npm run check` cannot run (`@astrojs/check` is not a
   dependency), no tests, no README at the root, the Sanity project ID is hard-coded in three places while
   `.env.example` implies it is an environment variable, and `npm audit` reports a critical advisory on Astro 5.18.

Nothing is broken in a way that blocks visitors, but there are two genuine layout bugs (the News page row layout, a
logo animation that Chrome rejects), several accessibility gaps (no `<main>`, no `h1` on inner pages, no skip link, touch
targets under 44 px), and a dead-code Instagram module.

## 2. Scorecard

| Area                    | Grade | One-line verdict                                                                                     |
| ----------------------- | ----- | ---------------------------------------------------------------------------------------------------- |
| Visual design and brand | A-    | Distinctive, coherent, both themes work; a few composition issues in the bento and hero.             |
| Content and IA          | C     | Accurate but thin; repeats facts across pages; no pricing, FAQ, gallery, event pages.                |
| Accessibility           | B-    | Good alt text, focus rings, reduced-motion support; missing landmarks, h1s, skip link, target sizes. |
| Performance             | B-    | Fast enough on a good connection; 630 KB per home visit before fonts, avoidable duplication.         |
| SEO and sharing         | B+    | Canonical, OG, JSON-LD, sitemap, robots all present; schema could be richer, share image is heavy.   |
| CMS and content ops     | B     | Resilient fallbacks, friendly Studio; three schemas unused, Instagram unfinished.                    |
| Code quality            | B     | Small, well-commented; raw HTML partial with token replacement is fragile; inline styles.            |
| Security                | B     | Static output, no secrets in repo, fails-closed cron; outdated Astro, no CSP, raw embed field.       |
| Engineering process     | D     | No CI, no lint, no type-check, no tests, no root README, runbooks referenced but absent.             |

## 3. Findings

Severity: **P1** fix now (bug or user-facing defect), **P2** fix in the next pass, **P3** improvement.

### 3.1 Bugs

- **P1 News page rows render in three narrow columns.** `src/pages/news/index.astro` reuses `.rows` for events, but
  `.rows li` is styled as the class-date grid (`64px 1fr auto`), so the date, title and body sit side by side in cramped
  columns on every viewport. Give events their own list style or a card layout.
- **P1 Footer lockup intro animation is rejected by Chrome.** `public/lib/renseikan-logo.js:278-279` animates `width`
  with a unitless number; Chrome logs "Invalid keyframe value for property width" on every inner page and skips the
  tween. Use `width: '...px'` or animate `transform: scaleX()`.
- **P2 Classes page heading spacing.** "What to wear and bring" and "Members' booking" sit flush against the previous
  block; `h3` has `margin: 0` and nothing adds space above it on inner pages.
- **P2 Duplicate label on Classes page.** The `h3` "Members' booking" is followed by a panel whose eyebrow is also
  "Members' booking".
- **P2 Instagram module is dead code.** `src/lib/instagram.ts` is never imported, `src/data/instagram.sample.json` is
  never read, and the cron in `api/instagram.ts` only refreshes a token for a feed that is not displayed.
- **P2 `npm run check` fails.** `@astrojs/check` is not in `devDependencies`; the script prompts to install it.
- **P3 Footer address and hours wrap mid-range on phones** ("Sundays 4:00 / – 6:00 pm"). Use a non-breaking range.
- **P3 Instructor portrait is `loading="lazy"` on the Instructor page** where it is above the fold and the natural LCP
  candidate. The card helper should accept an `eager` flag.

### 3.2 Accessibility (axe-core + manual)

- **P1 No `<main>` landmark on any page** (axe `landmark-one-main`). Wrap `<slot />` in `<main id="main">`.
- **P1 Inner pages have no `h1`** (axe `page-has-heading-one` on About, Classes, Instructor, Visit, News, 404). Each
  inner page's title is an `h2`. Promote the page title to `h1` and keep section titles as `h2`.
- **P2 No skip link.** Keyboard users tab through seven nav controls before content.
- **P2 Touch targets under 44 px:** desktop nav links (33 px tall), Theme button (30 px), Copy buttons (26 px), map
  links (32 px), 404 "Back to the dojo" link (24 px). Add padding; keep the visual size with negative margins if needed.
- **P2 Theme button has no state.** It reads "Theme" in both modes. Use `aria-pressed` and an icon or "Dark"/"Light".
- **P2 Mobile menu:** the button label stays "Menu" when open, Escape does not close it, focus does not move into it.
- **P3 Hero wind petals drift over the lede text** at desktop widths and reduce legibility for low-vision readers
  (visible in the reduced-motion screenshot too, where leaves rest on the paragraph). Keep the wind field out of the
  text column or lower its opacity behind text.
- **P3 Contrast is fine** (no axe colour-contrast violations in light or dark), the ink-stage has a proper
  `role="img"` label, decorative canvases and SVGs are `aria-hidden`, and reduced motion is handled in CSS and JS. Keep
  this.

### 3.3 Performance (local build, no fonts counted)

| Page            | Transfer | Requests | HTML   | LCP               | CLS   |
| --------------- | -------- | -------- | ------ | ----------------- | ----- |
| Home, desktop   | 642 KB   | 14       | 183 KB | 628 ms (`p.lede`) | 0.045 |
| Home, mobile    | 629 KB   | 12       | 183 KB | 512 ms (`p.lede`) | 0.000 |
| Classes, mobile | 497 KB   | 8        | 8 KB   | 456 ms            | 0.001 |

- **P2 Home HTML is 183 KB** because the brush-mark SVG under each section title is inlined five times (169 KB of SVG
  in total, with five copies of the same `<style>` and filter defs). Emit it once as a `<symbol>` and `<use>` it, or
  make it a CSS mask like the section rule.
- **P2 CSS is 119 KB** for 258 lines; two long data-URI SVG masks (`section::before`, `.stamp`) dominate. Move them to
  files in `public/ink/` so they cache separately and the stylesheet drops under 20 KB.
- **P2 `renseikan-logo.js` (87 KB) loads on every page** but inner pages use only `mon()` and `lockup()`. Split the
  path data, or defer the script and load it only when a host element is in view.
- **P2 `share/renseikan-share.png` is 551 KB.** Re-export at 1200x630 as JPEG or WebP under 150 KB.
- **P2 `logo/nckf-mon.png` is 83 KB for a 72 px tile.** Serve a 144 px WebP or an SVG.
- **P2 Fonts load render-blocking from Google Fonts** (three families). Self-host subset WOFF2 files, `preload` the
  serif used for headings, and use `font-display: swap` with `size-adjust` fallbacks to avoid reflow. Yuji Syuku is used
  for three glyphs (礼 型 的) and can be a 3-glyph subset.
- **P3 `washi-tile.png` is 136 KB.** A 512 px WebP tile at the same quality is about 40 KB.
- **P3 Nothing in `public/` is content-hashed,** so every deploy relies on revalidation. Move `js/` and `lib/` under
  `src/` so Astro bundles, minifies and hashes them.
- **P3 Hero `h1` is hidden for 900 ms** (`.wipe.late`) so the brush wipe can follow the kanji. That delays the
  largest paint and reads as a blank hero on slow phones. Consider wiping on from a visible low-contrast state, or drop
  the delay on mobile where the column kanji is hidden anyway.

### 3.4 Design and layout

- **P2 Bento "Where" tile** is a solid tan block with the address pinned to the bottom and two-thirds empty. Either
  give it content (a small ink map, parking note, "Open in Maps" link) or make it a normal-height tile.
- **P2 Bento "Chief Instructor" tile** breaks the name into "Steve / Scott" at 40 px and crowds four lines of rank
  text beneath it. Use a smaller name size in the tile and a one-line rank.
- **P2 Three different labels for one action:** "Members: book a class", "Reserve your place", "Book on
  WellnessLiving". Pick one verb and object and reuse it.
- **P2 Home section "Classes and events" lists no events.** Either pull the next two events in from Sanity or rename it
  "Coming up".
- **P3 Inner pages are text-only.** About, Classes and Visit have no photographs; the design system's monochrome photo
  treatment (`.mono`) exists but has nothing to apply to. One strong photo per page would change the feel more than any
  CSS work.
- **P3 Inline styles** in `Base.astro`, `home.html`, `classes.astro`, `404.astro` (`style="margin-left:auto"`,
  `style="font-size:40px"`, etc.) bypass the token system. Move them into `site.css` utility classes.
- **P3 The Visit page map** is a Google Maps iframe injected by JS with a grayscale filter; it has no static fallback
  image, so the tan placeholder with "MAP" shows whenever the frame is slow or blocked. A static map image (or an SVG
  sketch of the JACC block) behind the iframe would cover that state.

### 3.5 Content and information architecture

- **P1 No answer to "what does it cost?"** The first lesson is free; nothing on the site says what happens after it
  (JACC membership, class fee, equipment loan period, when a student buys a glove or bow). This is the single most
  common question for a martial-arts site and its absence sends people to email.
- **P2 No FAQ.** Age minimum, physical requirements, left-handed archers, glasses, what to wear (partly covered), how
  long until shooting at the mato, whether visitors can watch, parking at JACC, rain or heat policy.
- **P2 No gallery.** The `photo` schema exists in Sanity and is unused.
- **P2 No event detail pages.** Events have slugs and rich-text bodies in Sanity but render as a flat list with
  `pt::text`, losing links and formatting. Taikai and seminars need a page each (date, place, schedule, registration).
- **P2 No posts.** The `post` schema exists; News shows only events.
- **P2 No outbound links to the federation bodies** (NCKF, American Kyudo Renmei, ANKF/IKYF) despite naming them.
- **P3 No Japanese-language entry point** for a dojo whose name, hero and crest are in Japanese and whose venue is a
  Japanese cultural centre. A short `/ja` landing page (name, hours, address, how to visit) is cheap and signals welcome.
- **P3 No contact form.** Email with a Copy button is fine for members; prospective students expect a form.
- **P3 No calendar export.** An `.ics` feed of class dates and closures would let members subscribe once.
- **P3 Testimonials or a short "a student's first year" story** would do more for conversion than more facts.

### 3.6 SEO and sharing

- Present and correct: `<title>` pattern, meta description per page, canonical with clean URLs, OG tags, Twitter card,
  theme-color per scheme, SVG favicon, `sitemap-index.xml`, `robots.txt`, JSON-LD `SportsActivityLocation` with
  opening hours derived from the Sanity classes.
- **P2 No `apple-touch-icon` or web manifest.** iOS home-screen and Android install show a blank tile.
- **P3 Richer schema:** `Organization` with `logo` and `sameAs` (Instagram, NCKF), `Person` for the instructor,
  `Event` per event page, `FAQPage` once a FAQ exists.
- **P3 `og:image:width/height/alt` and `og:locale`** are missing.
- **P3 Home `<title>`** is "Renseikan Kyudojo · Traditional Japanese archery in San Jose, California" (76 chars);
  search engines truncate around 60. Consider "Renseikan Kyudojo · Kyudo in San Jose".

### 3.7 CMS (Sanity) and content operations

- The fallback design is good: every query falls back to `site.json`, so an outage never breaks a build. One gap: the
  build does not say which source it used. Log "Sanity: live" or "Sanity: fallback (reason)" so a stale deploy is
  noticed.
- **P2 Project ID is hard-coded** in `sanity.config.ts`, `sanity.cli.ts` and `src/lib/sanity.ts` while `.env.example`
  defines `PUBLIC_SANITY_PROJECT_ID`. Pick one. Reading from env is better so a preview dataset is possible.
- **P2 `widgetEmbed` is raw HTML rendered unescaped.** Fine while only Fernando and Steve have Studio access, but it is
  a script-injection point for any future editor. Validate it (allow only the WellnessLiving widget pattern) or
  replace it with structured fields.
- **P3 `page`, `post`, `photo` schemas exist with no routes.** Either wire them (Phase 2 below) or remove them so the
  Studio menu does not promise pages that never appear.
- **P3 Events lose formatting** (`pt::text`). Use `@portabletext/astro` or a small block renderer.
- **P3 Studio sign-in** is Sanity's own; CORS origins for `renseikan.org` must be allowed in the Sanity project. Add a
  line to the README.

### 3.8 Code quality and architecture

- **P2 The home page is a raw HTML partial with `<!--@token-->` replacement** (`src/partials/home.html` +
  `index.astro`). It was a quick port of the prototype; it blocks component reuse, type checking and Astro's own
  escaping, and any new home section means more string tokens. Convert it to `.astro` components (Hero, Bento,
  Steps, ClassList, BookingPanel, InstructorCard, VisitBlock) that the inner pages share.
- **P2 `render.ts` builds HTML with template strings** for the same reason; the same components replace it.
- **P3 Three vanilla IIFE libraries in `public/lib/`** (logo, brush, wind: 888 lines) are the heart of the identity and
  well documented. Keep them, but move them into `src/lib/` as modules so they are bundled, minified and tree-shaken,
  with the path data loaded on demand.
- **P3 Vendor React and styled-components** are in `dependencies` only for the Sanity Studio build. Keep them, but
  the Studio could move into its own workspace so the site's dependency tree stays tiny.
- **P3 No ESLint, Prettier or EditorConfig.** Formatting is consistent today because one author wrote it; it will not
  stay that way.

### 3.9 Security and dependencies

- **P1 `npm audit`: Astro 5.18.2 carries a critical advisory set** (XSS in `define:vars`, spread attributes, view
  transitions, server-island replay, AVIF image RCE through sharp, path-boundary bypass). This site is fully static
  with no islands, no `define:vars`, no view transitions and no image optimization, so the practical exposure today is
  low, but the fix is `astro@7`. Plan the major upgrade (Phase 1) and re-run the audit.
- **P2 `sanity@6.18` and `@sanity/cli`** carry high advisories via build-time tooling (`@sanity/codegen`, `globby`,
  `js-yaml`). Build-time only; upgrade with Sanity's next release.
- **P2 No Content-Security-Policy.** `vercel.json` sets `X-Content-Type-Options` and `Referrer-Policy` only. A CSP with
  `frame-src maps.google.com *.wellnessliving.com`, `script-src 'self' 'unsafe-inline' /_vercel`, and
  `frame-ancestors 'none'` is feasible once the inline scripts are nonce'd or moved to files. Add
  `Permissions-Policy` and `X-Frame-Options: DENY` now.
- `api/instagram.ts` fails closed without `CRON_SECRET`. Good. The `.env.example` and `.gitignore` are correct; no
  secrets are committed.

### 3.10 Engineering process

- **P1 No CI.** Add a GitHub Actions workflow: `npm ci`, `astro check`, `astro build`, a Playwright smoke test (every
  page returns 200, no console errors, axe has no serious violations). Vercel preview deploys already exist per PR.
- **P2 No root README or CLAUDE.md.** The Sanity README references "runbook 04/05/06/09" that are not in the repo.
  Add `README.md` (what it is, how to run, how to deploy, where content lives) and a short `CLAUDE.md` for future
  sessions.
- **P3 No tests** for the date logic in `src/lib/sanity.ts` (`getClassDates`, `daysLabel`, `timeRange`, `to24`),
  which is the only non-trivial logic and the easiest to break around DST and closures.

## 4. Plan

Four phases. Each is a reviewable PR set of a few days' work; phases 1 and 2 can run in parallel with Steve's content
gathering for phase 3.

### Phase 1: Fix and harden (1 week)

Goal: ship the bugs and the safety net before touching design.

1. Accessibility baseline: `<main>`, skip link, `h1` on every inner page, 44 px targets, theme button state, menu
   close on Escape and label change.
2. Bugs: News row layout, logo keyframe units, Classes heading spacing, duplicate booking label, footer range wrap,
   eager portrait on the Instructor page.
3. Tooling: add `@astrojs/check` + `typescript` dev deps, ESLint + Prettier, EditorConfig; `npm run check` green.
4. CI: GitHub Actions with check, build, Playwright smoke + axe; branch protection on `main`.
5. Dependencies: upgrade to Astro 7 (static site, low migration risk: re-check `build.format`, `trailingSlash`,
   sitemap integration), bump Sanity, re-run `npm audit`.
6. Headers: `Permissions-Policy`, `X-Frame-Options`; draft CSP in report-only mode.
7. README and CLAUDE.md; log the Sanity source at build time; read the project ID from env in one place.
8. Delete or finish the Instagram module (decision in Phase 3; default: remove the dead lib and keep the cron's
   rebuild role, renamed to `api/rebuild.ts`).

### Phase 2: Modernize the build and the UI foundation (1 to 2 weeks)

Goal: same look, half the weight, components instead of string templates.

1. Convert `home.html` + `render.ts` into Astro components shared by home and inner pages. No visual change.
2. Move `public/js` and `public/lib` under `src/` as ES modules; load logo path data on demand; bundle and hash.
3. Brush-mark SVG once as a `<symbol>`; data-URI masks to files; CSS under 20 KB.
4. Self-hosted subset fonts with `preload` and metric-matched fallbacks; drop the Google Fonts request.
5. Images: WebP washi tile, 144 px NCKF emblem, share image under 150 KB, Astro `<Image>` for portraits and any new
   photography, `apple-touch-icon` and `manifest.webmanifest`.
6. Design polish: bento tiles rebalanced (Where tile gets content, instructor tile sized), one booking label, wind
   kept out of the text column, hero `h1` visible earlier on mobile, utility classes replacing inline styles, inner
   pages get a consistent page-header component (eyebrow, h1, lede, optional kanji).
7. Target: Lighthouse 95+ on all four categories on mobile; home transfer under 300 KB including fonts.

### Phase 3: Expand the content (2 to 3 weeks, mostly content work with Steve)

Goal: answer every question a prospective student or a visiting kyudoka has.

1. **Pricing and path**: a "Joining" page (or section on Classes): free first lesson, then JACC membership and class
   fees, what the dojo lends and for how long, when to buy a glove and bow, how grading works. Sanity `settings` gets
   the numbers so Steve can change them.
2. **FAQ** page, `FAQPage` schema, content in Sanity (`faq` document type).
3. **Gallery**: wire the `photo` schema; masonry grid with the mono treatment lifting to colour on hover; captions and
   credits; Astro image pipeline.
4. **Events**: `/news/[slug]` pages from the `event` schema with Portable Text bodies, `Event` schema.org, "Add to
   calendar" link; the home page shows the next two.
5. **Posts**: wire the `post` schema; `/news` lists posts and events together; RSS feed.
6. **Instagram**: decide. If yes, render `latestPosts()` as a six-tile strip on the home page and finish the token
   runbook; if no, remove.
7. **Affiliation links** to NCKF, AKR, ANKF/IKYF; **Japanese landing page** `/ja` with the essentials;
   **contact form** (Vercel function or Formspree, spam-protected) alongside the email.
8. **Richer schema.org**: `Organization` + `Person` + `Event`; `og:image` per event with a generated card.
9. **Calendar feed**: `/classes.ics` built from the class dates and closures.

### Phase 4: Operate (ongoing)

1. Playwright visual-regression snapshots for the seven core pages in both themes, run in CI.
2. Unit tests for the date logic; a DST and closure test matrix.
3. Monthly dependency bump PR (Renovate or Dependabot), `npm audit` in CI.
4. Vercel Analytics review each quarter: which pages convert to the booking link.
5. Studio onboarding note for Steve covering the new document types (joining, FAQ, photos, posts).

## 5. Quick wins (under an hour each, all in Phase 1)

- `<main>` + skip link + inner-page `h1`s.
- News row CSS.
- Logo keyframe `px` units.
- Classes heading spacing and the duplicate label.
- `@astrojs/check` dev dependency.
- `apple-touch-icon.png` (180 px) and `manifest.webmanifest`.
- Share image re-export.
- `Permissions-Policy` and `X-Frame-Options` headers in `vercel.json`.
- Build log line for the Sanity source.

## 6. Evidence

Screenshots and the raw reports from this audit are in the session scratchpad (`audit/shots/*.png`, `audit/report.json`,
`audit/pass2.json`); the key numbers are reproduced above. The repo had no open issues or PRs at audit time; the last
eight PRs were content and hero fixes from 2026-10-09 and 2026-10-10.
