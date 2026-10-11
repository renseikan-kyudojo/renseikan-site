import { defineArrayMember, defineField, defineType } from 'sanity';

// A set of gallery photos added together (a taikai, a seminar, a season). Dropping several files onto Photos makes one
// entry per file, which is how many photos go in at once; each entry's caption and credit sit in its edit dialog.
// For HDR, upload the photo as an Ultra HDR JPEG (a JPEG with a gain map): the Gallery links the untouched original,
// which HDR screens show in HDR and the rest show as a normal photo.
export default defineType({
  name: 'album',
  title: 'Album',
  type: 'document',
  fields: [
    defineField({ name: 'title', type: 'string', title: 'Title', validation: (r) => r.required() }),
    defineField({ name: 'date', type: 'date', title: 'Date' }),
    defineField({
      name: 'order',
      type: 'number',
      title: 'Order',
      description: 'Lower comes first on the Gallery page. Blank goes last.',
    }),
    defineField({
      name: 'photos',
      type: 'array',
      title: 'Photos',
      description: 'Drop several files here at once; each becomes a photo. Drag to reorder.',
      of: [
        defineArrayMember({
          type: 'image',
          options: { hotspot: true },
          fields: [
            defineField({ name: 'caption', type: 'string', title: 'Caption' }),
            defineField({ name: 'credit', type: 'string', title: 'Photographer' }),
          ],
        }),
      ],
    }),
  ],
  preview: {
    select: { title: 'title', date: 'date', photos: 'photos', media: 'photos.0' },
    prepare({ title, date, photos, media }) {
      const n = Array.isArray(photos) ? photos.length : 0;
      return { title, subtitle: [date, `${n} photo${n === 1 ? '' : 's'}`].filter(Boolean).join(' · '), media };
    },
  },
});
