// The Sanity Studio where Steve edits the site. Built as static files into dist/studio (see the build script) and served
// at renseikan.org/studio; vercel.json rewrites /studio/* to its index.html. Sign-in is Sanity's own (Google works).
import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { schemaTypes } from './sanity/schemas';
import { structure } from './sanity/structure';
import { FillFromSite } from './sanity/actions/fillFromSite';
import { SANITY_PROJECT_ID, SANITY_DATASET } from './sanity/project';

const SINGLETONS = new Set(['settings']);

export default defineConfig({
  name: 'renseikan',
  title: 'Renseikan Kyudojo',
  projectId: SANITY_PROJECT_ID,
  dataset: SANITY_DATASET,
  plugins: [structureTool({ structure })],
  schema: {
    types: schemaTypes,
    // "Dojo settings" is one document: hide it from the "create new" menu
    templates: (templates) => templates.filter(({ schemaType }) => !SINGLETONS.has(schemaType)),
  },
  document: {
    // allow only publish / discard / restore on it (no duplicate or delete); settings and instructors also get
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
