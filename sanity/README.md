# Sanity (content system) — drafts

These schema files are ready to drop into a Sanity Studio once the project exists (runbook 04). They are not wired into the
Astro build yet; the pages read `src/data/site.json` and inline arrays until then.

Seven document types: `settings` (hours, address, emails, the new-student policy, the JACC widget code, social links),
`page` (About and Classes copy as portable text), `person`, `classSession`, `event`, `post`, `photo`.

Wiring steps: `npm i @sanity/astro @sanity/client sanity @sanity/vision`, add `sanity()` to `astro.config.mjs` with the project
id and dataset, mount the Studio at `/studio`, replace the inline data with GROQ queries in `src/lib/sanity.ts`, and add the
Vercel deploy hook as a Sanity webhook on publish.
