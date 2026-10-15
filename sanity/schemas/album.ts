import { defineArrayMember, defineField, defineType } from 'sanity';

// A set of gallery photos added together (a taikai, a seminar, a season). Dropping several files onto Photos makes one
// entry per file, which is how many photos go in at once; each entry's caption and credit sit in its edit dialog.
// For HDR, also put the Ultra HDR JPEG (a JPEG with a gain map) in a photo's HDR original: Sanity strips the gain map
// from images but keeps files byte for byte, so the Gallery viewer shows that file on HDR screens.
// scripts/upload-photos.mjs fills it in for every Ultra HDR JPEG it uploads.
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
            defineField({
              name: 'hdr',
              type: 'file',
              title: 'HDR original',
              description:
                'Optional. The same photo as an Ultra HDR JPEG, kept byte for byte (the Image above loses its HDR on upload). Shown full size on HDR screens; export it at about 4000 px on the long edge so phones load it quickly.',
              options: { accept: 'image/jpeg' },
            }),
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
