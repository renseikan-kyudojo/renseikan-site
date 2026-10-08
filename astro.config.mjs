// Renseikan Kyudojo — Astro config. Static output; Vercel serves the files and runs api/instagram.ts as a function.
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://renseikan.org',
  output: 'static',
  trailingSlash: 'never',
  build: { format: 'file' },
  devToolbar: { enabled: false },
  // sitemap-index.xml for Search Console (runbook 09); the 404 page is left out
  integrations: [sitemap({ filter: (page) => !page.includes('/404') })],
});
