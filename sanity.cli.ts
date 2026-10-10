import { defineCliConfig } from 'sanity/cli';
import { SANITY_PROJECT_ID, SANITY_DATASET } from './sanity/project';
export default defineCliConfig({
  api: { projectId: SANITY_PROJECT_ID, dataset: SANITY_DATASET },
  // Built into dist/studio and served from renseikan.org/studio, so assets must resolve under /studio.
  project: { basePath: '/studio' },
  deployment: { autoUpdates: false },
  // public/ belongs to the Astro site; don't copy it into the Studio build.
  vite: (config) => ({ ...config, publicDir: false }),
});
