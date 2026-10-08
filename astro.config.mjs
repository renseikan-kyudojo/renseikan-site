// Renseikan Kyudojo — Astro config. Static output; Vercel serves the files and runs api/instagram.ts as a function.
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://renseikan.org',
  output: 'static',
  trailingSlash: 'never',
  build: { format: 'file' },
  devToolbar: { enabled: false },
});
