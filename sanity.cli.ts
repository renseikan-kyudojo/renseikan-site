import { defineCliConfig } from 'sanity/cli';
export default defineCliConfig({
  api: { projectId: 'bfgbeqq4', dataset: 'production' },
  // Built into dist/studio and served from renseikan.org/studio, so assets must resolve under /studio.
  project: { basePath: '/studio' },
  deployment: { autoUpdates: false },
  // public/ belongs to the Astro site; don't copy it into the Studio build.
  vite: (config) => ({ ...config, publicDir: false }),
});
