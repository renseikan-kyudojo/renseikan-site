import { defineField, defineType } from 'sanity';
export default defineType({
  name: 'page', title: 'Page', type: 'document',
  fields: [
    defineField({ name: 'title', type: 'string', title: 'Title' }),
    defineField({ name: 'slug', type: 'slug', title: 'Slug', options: { source: 'title' } }),
    defineField({ name: 'lede', type: 'text', title: 'Lede', rows: 3 }),
    defineField({ name: 'body', type: 'array', title: 'Body', of: [{ type: 'block' }, { type: 'image', options: { hotspot: true } }] }),
  ],
});
