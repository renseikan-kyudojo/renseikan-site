import { defineField, defineType } from 'sanity';
export default defineType({
  name: 'event',
  title: 'Event',
  type: 'document',
  fields: [
    defineField({ name: 'title', type: 'string', title: 'Title' }),
    defineField({ name: 'slug', type: 'slug', title: 'Slug', options: { source: 'title' } }),
    defineField({ name: 'date', type: 'date', title: 'Date', validation: (r) => r.required() }),
    defineField({ name: 'start', type: 'string', title: 'Start time', description: 'e.g. 10:00 am. Optional.' }),
    defineField({ name: 'end', type: 'string', title: 'End time', description: 'e.g. 4:00 pm. Optional.' }),
    defineField({ name: 'endDate', type: 'date', title: 'End date (optional)' }),
    defineField({ name: 'place', type: 'string', title: 'Place', initialValue: 'JACC, San Jose' }),
    defineField({
      name: 'kind',
      type: 'string',
      title: 'Kind',
      description: 'Closure: no class on these dates. The class list shows them as "No class".',
      options: { list: ['Taikai', 'Seminar', 'Demonstration', 'Closure', 'Other'] },
    }),
    defineField({ name: 'photo', type: 'image', title: 'Photo', options: { hotspot: true } }),
    defineField({
      name: 'summary',
      type: 'text',
      title: 'Summary',
      rows: 2,
      description: 'One or two sentences for the list and for link previews.',
    }),
    defineField({
      name: 'body',
      type: 'array',
      title: 'Details',
      of: [{ type: 'block' }, { type: 'image', options: { hotspot: true } }],
    }),
    defineField({
      name: 'registrationUrl',
      type: 'url',
      title: 'Registration link',
      description: 'Optional. Shown as a button on the event page.',
    }),
  ],
});
