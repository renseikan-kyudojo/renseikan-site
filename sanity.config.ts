// The Sanity Studio where Steve edits the site. Built as static files into dist/studio (see the build script) and served
// at renseikan.org/studio; vercel.json rewrites /studio/* to its index.html. Sign-in is Sanity's own (Google works).
import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { schemaTypes } from './sanity/schemas';
import { structure } from './sanity/structure';
import { FillFromSite } from './sanity/actions/fillFromSite';
import { SANITY_PROJECT_ID, SANITY_DATASET } from './sanity/project';
import { pageTypeNames } from './sanity/schemas/pages';

// one document each: Dojo settings and every page's copy
const SINGLETONS = new Set(['settings', ...pageTypeNames]);

export default defineConfig({
  name: 'renseikan',
  title: 'Renseikan Kyudojo',
  projectId: SANITY_PROJECT_ID,
  dataset: SANITY_DATASET,
  plugins: [structureTool({ structure })],
  schema: {
    types: schemaTypes,
    // the singletons are one document each: hide them from the "create new" menu
    templates: (templates) => templates.filter(({ schemaType }) => !SINGLETONS.has(schemaType)),
  },
  document: {
    // allow only publish / discard / restore on them (no duplicate or delete); they and the instructor also get
    // "Fill blanks with the site's current text" (sanity/actions/fillFromSite.ts)
    actions: (input, { schemaType }) => {
      if (SINGLETONS.has(schemaType))
        return [
          ...input.filter(({ action }) => action && ['publish', 'discardChanges', 'restore'].includes(action)),
          FillFromSite,
        ];
      return schemaType === 'person' ? [...input, FillFromSite] : input;
    },
  },
});
