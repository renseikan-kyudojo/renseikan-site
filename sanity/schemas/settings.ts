import { defineField, defineType } from 'sanity';
// One document (id "settings"). Every field is optional: a blank field keeps the site's built-in text.
export default defineType({
  name: 'settings', title: 'Dojo settings', type: 'document',
  fields: [
    defineField({ name: 'name', title: 'Name', type: 'string', initialValue: 'Renseikan Kyudojo' }),
    defineField({ name: 'tagline', title: 'Tagline', type: 'string', description: 'Shown in search results and the browser tab on the home page.' }),
    defineField({ name: 'description', title: 'Short description', type: 'text', rows: 3, description: 'One or two sentences for search engines and link previews.' }),
    defineField({ name: 'hours', title: 'Class time', type: 'string', description: 'Time only, e.g. "4:00 – 6:00 pm". The site adds "Sundays".' }),
    defineField({ name: 'address', title: 'Where classes are held', type: 'object', fields: [
      { name: 'venue', type: 'string', title: 'Venue', description: 'e.g. Japanese Art & Cultural Center (JACC)' },
      { name: 'street', type: 'string', title: 'Street' }, { name: 'city', type: 'string', title: 'City' },
      { name: 'region', type: 'string', title: 'State' }, { name: 'postalCode', type: 'string', title: 'ZIP' } ],
      description: 'The map and directions links stay pinned to JACC; tell Fernando if the dojo moves.' }),
    defineField({ name: 'email', title: 'General email', type: 'string' }),
    defineField({ name: 'policy', title: 'New-student policy (verbatim)', type: 'text', rows: 4 }),
    defineField({ name: 'bookingUrl', title: 'WellnessLiving schedule URL', type: 'url' }),
    defineField({ name: 'widgetEmbed', title: 'JACC schedule widget embed code', type: 'text', rows: 6, description: 'Paste the code JACC sends; it appears on the Classes page.' }),
    defineField({ name: 'instagram', title: 'Instagram URL', type: 'url' }),
  ],
  preview: { prepare: () => ({ title: 'Dojo settings' }) },
});
