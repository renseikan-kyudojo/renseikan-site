import { defineField, defineType } from 'sanity';
export default defineType({
  name: 'photo',
  title: 'Gallery photo',
  type: 'document',
  fields: [
    defineField({ name: 'image', type: 'image', title: 'Image', options: { hotspot: true } }),
    defineField({
      name: 'hdr',
      type: 'file',
      title: 'HDR original',
      description:
        'Optional. The same photo as an Ultra HDR JPEG, kept byte for byte (the Image above loses its HDR on upload). Shown full size on HDR screens.',
      options: { accept: 'image/jpeg' },
    }),
    defineField({ name: 'caption', type: 'string', title: 'Caption' }),
    defineField({ name: 'credit', type: 'string', title: 'Photographer' }),
    defineField({ name: 'taken', type: 'date', title: 'Taken' }),
    defineField({ name: 'order', type: 'number', title: 'Order' }),
  ],
});
