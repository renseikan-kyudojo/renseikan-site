import { defineField, defineType } from 'sanity';
import site from '../../src/data/site.json';
// One document (id "settings"). Every field is optional: a blank field keeps the site's built-in text.
// The first time it is opened, every field starts with the site's current text (from site.json), so publishing it as is
// changes nothing on the site; the "Fill blanks with the site's current text" action does the same for a document that
// already exists with empty fields.
export default defineType({
  name: 'settings',
  title: 'Dojo settings',
  type: 'document',
  initialValue: {
    name: site.name,
    tagline: site.tagline,
    description: site.description,
    hours: site.hours,
    email: site.email,
    policy: site.policy,
    bookingUrl: site.booking,
    address: {
      venue: site.address.venue,
      street: site.address.street,
      city: site.address.city,
      region: site.address.region,
      postalCode: site.address.postalCode,
    },
  },
  fields: [
    defineField({ name: 'name', title: 'Name', type: 'string' }),
    defineField({
      name: 'tagline',
      title: 'Tagline',
      type: 'string',
      description: 'Shown in search results and the browser tab on the home page.',
    }),
    defineField({
      name: 'description',
      title: 'Short description',
      type: 'text',
      rows: 3,
      description: 'One or two sentences for search engines and link previews.',
    }),
    defineField({
      name: 'hours',
      title: 'Class time',
      type: 'string',
      description: 'Time only, e.g. "4:00 – 6:00 pm". The site adds the class days from Classes (e.g. "Sundays").',
    }),
    defineField({
      name: 'address',
      title: 'Where classes are held',
      type: 'object',
      fields: [
        { name: 'venue', type: 'string', title: 'Venue', description: 'e.g. Japanese Art & Cultural Center (JACC)' },
        { name: 'street', type: 'string', title: 'Street' },
        { name: 'city', type: 'string', title: 'City' },
        { name: 'region', type: 'string', title: 'State' },
        { name: 'postalCode', type: 'string', title: 'ZIP' },
      ],
      description: 'The map and directions links stay pinned to JACC; tell Fernando if the dojo moves.',
    }),
    defineField({ name: 'email', title: 'General email', type: 'string' }),
    defineField({ name: 'policy', title: 'New-student policy (verbatim)', type: 'text', rows: 4 }),
    defineField({ name: 'bookingUrl', title: 'WellnessLiving schedule URL', type: 'url' }),
    defineField({
      name: 'widgetEmbed',
      title: 'JACC schedule widget embed code',
      type: 'text',
      rows: 6,
      description:
        'Paste the code JACC sends; it appears on the home and Classes pages. Until then only the booking button shows.',
    }),
    defineField({ name: 'instagram', title: 'Instagram URL', type: 'url' }),
    defineField({
      name: 'membershipNote',
      title: 'After the first lesson',
      type: 'text',
      rows: 4,
      description:
        "Shown on the Joining page: how someone continues after the free lesson (JACC membership, how classes are paid for). Leave blank for the site's built-in wording.",
    }),
    defineField({
      name: 'fees',
      title: 'Fees',
      type: 'array',
      description: 'Shown as a table on the Joining page once any row is filled in.',
      of: [
        {
          type: 'object',
          fields: [
            { name: 'item', type: 'string', title: 'Item', description: 'e.g. Monthly class fee' },
            { name: 'amount', type: 'string', title: 'Amount', description: 'e.g. $80' },
            { name: 'note', type: 'string', title: 'Note', description: 'e.g. Paid to JACC' },
          ],
          preview: { select: { title: 'item', subtitle: 'amount' } },
        },
      ],
    }),
    defineField({
      name: 'equipmentNote',
      title: 'Equipment',
      type: 'text',
      rows: 4,
      description:
        'Shown on the Joining page: what the dojo lends, for how long, and when a student buys a glove and bow. Leave blank for the built-in wording.',
    }),
    defineField({
      name: 'gradingNote',
      title: 'Grading',
      type: 'text',
      rows: 4,
      description: 'Shown on the Joining page if filled in: how ranks and examinations work.',
    }),
  ],
  preview: { prepare: () => ({ title: 'Dojo settings' }) },
});
