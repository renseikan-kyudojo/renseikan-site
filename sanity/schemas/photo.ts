import { defineField, defineType } from 'sanity';
export default defineType({
  name: 'photo', title: 'Gallery photo', type: 'document',
  fields: [
    defineField({ name: 'image', type: 'image', title: 'Image', options: { hotspot: true } }),
    defineField({ name: 'caption', type: 'string', title: 'Caption' }),
    defineField({ name: 'credit', type: 'string', title: 'Photographer' }),
    defineField({ name: 'taken', type: 'date', title: 'Taken' }),
    defineField({ name: 'order', type: 'number', title: 'Order' }),
  ],
});
