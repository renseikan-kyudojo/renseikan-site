import { defineField, defineType } from 'sanity';
export default defineType({
  name: 'event', title: 'Event', type: 'document',
  fields: [
    defineField({ name: 'title', type: 'string', title: 'Title' }),
    defineField({ name: 'slug', type: 'slug', title: 'Slug', options: { source: 'title' } }),
    defineField({ name: 'date', type: 'date', title: 'Date' }),
    defineField({ name: 'endDate', type: 'date', title: 'End date (optional)' }),
    defineField({ name: 'place', type: 'string', title: 'Place' }),
    defineField({ name: 'kind', type: 'string', title: 'Kind', options: { list: ['Taikai', 'Seminar', 'Demonstration', 'Closure', 'Other'] } }),
    defineField({ name: 'photo', type: 'image', title: 'Photo', options: { hotspot: true } }),
    defineField({ name: 'body', type: 'array', title: 'Details', of: [{ type: 'block' }] }),
  ],
});
