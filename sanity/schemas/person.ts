import { defineField, defineType } from 'sanity';
// The first instructor (lowest Order) is the one the home page shows. Blank fields on that first one fall back to the
// site's current text (src/data/site.json), so a half-filled document never blanks the page.
export default defineType({
  name: 'person', title: 'Instructor', type: 'document',
  fields: [
    defineField({ name: 'name', type: 'string', title: 'Name' }),
    defineField({ name: 'title', type: 'string', title: 'Title', description: 'Shown small above the name, e.g. "Chief Instructor".' }),
    defineField({ name: 'rank', type: 'string', title: 'Rank', description: 'e.g. Renshi Rokudan' }),
    defineField({ name: 'rankPlain', type: 'string', title: 'Rank in plain words', description: 'For readers who don\'t know the ranks, e.g. "Holding 6th Degree Master Ranking with the distinction of Instructor". Kyudo has no belts.' }),
    defineField({ name: 'credentials', type: 'array', title: 'Credentials', description: 'One line each, e.g. "Former President, American Kyudo Renmei".', of: [{ type: 'string' }] }),
    defineField({ name: 'email', type: 'string', title: 'Email', description: 'Shown on the site with a Copy button. Leave blank to hide.' }),
    defineField({ name: 'portrait', type: 'image', title: 'Portrait', description: 'Cropped to a 5:6 portrait. Click the crop icon to set the focus on the face.', options: { hotspot: true } }),
    defineField({ name: 'order', type: 'number', title: 'Order', description: '1 is shown first and on the home page.' }),
  ],
  preview: { select: { title: 'name', subtitle: 'title', media: 'portrait' } },
});
