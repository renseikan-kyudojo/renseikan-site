# Working on renseikan-site

- Static Astro site + Sanity Studio. `README.md` has the map; `sanity/README.md` has the content wiring;
  `docs/site-audit-2026-10.md` has the audit and the phased plan.
- Before pushing: `npm run lint && npm run format:check && npm run check && npx astro build && npm run test:smoke`.
  CI runs the same. In a cloud session set `PW_CHROMIUM=/opt/pw-browsers/chromium` for the smoke test.
- Content lives in Sanity; `src/data/site.json` is the fallback and the source for the Studio's "fill blanks" action.
  Keep the two in sync when a fact changes.
- The ink libraries in `public/lib/` are the identity of the site; keep their behaviour, including reduced-motion
  fallbacks, when touching them.
- Every page needs one `h1` inside `<main>`, 44px touch targets, and no serious axe findings; the smoke test checks.
- Design tokens are the custom properties at the top of `src/styles/site.css`; no new hex values in components.
- Don't commit `.env`; the Sanity project ID lives in `sanity/project.ts`.
