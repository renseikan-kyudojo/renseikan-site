import { defineField, defineType } from 'sanity';
export default defineType({
  name: 'post',
  title: 'News post',
  type: 'document',
  fields: [
    defineField({ name: 'title', type: 'string', title: 'Title' }),
    defineField({ name: 'slug', type: 'slug', title: 'Slug', options: { source: 'title' } }),
    defineField({ name: 'date', type: 'date', title: 'Date' }),
    defineField({ name: 'photo', type: 'image', title: 'Photo', options: { hotspot: true } }),
    defineField({ name: 'body', type: 'array', title: 'Body', of: [{ type: 'block' }] }),
  ],
});
