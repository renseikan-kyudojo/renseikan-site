// The Sanity Studio where Steve edits the site. Built as static files into dist/studio (see the build script) and served
// at renseikan.org/studio; vercel.json rewrites /studio/* to its index.html. Sign-in is Sanity's own (Google works).
import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { schemaTypes } from './sanity/schemas';
import { structure } from './sanity/structure';

const SINGLETONS = new Set(['settings']);

export default defineConfig({
  name: 'renseikan',
  title: 'Renseikan Kyudojo',
  projectId: 'bfgbeqq4',
  dataset: 'production',
  plugins: [structureTool({ structure })],
  schema: {
    types: schemaTypes,
    // "Dojo settings" is one document: hide it from the "create new" menu
    templates: (templates) => templates.filter(({ schemaType }) => !SINGLETONS.has(schemaType)),
  },
  document: {
    // and allow only publish / discard / restore on it (no duplicate or delete)
    actions: (input, { schemaType }) =>
      SINGLETONS.has(schemaType) ? input.filter(({ action }) => action && ['publish', 'discardChanges', 'restore'].includes(action)) : input,
  },
});
