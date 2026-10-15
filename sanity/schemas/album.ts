import { defineArrayMember, defineField, defineType } from 'sanity';
import { ImageFromHdrInput, PhotosInput } from '../components/photoInputs';

// A set of gallery photos added together (a taikai, a seminar, a season). Dropping several files onto Photos (or "Add
// photos") makes one entry per file, which is how many photos go in at once; each entry's caption and credit sit in its
// edit dialog. Sanity strips the gain map from an Ultra HDR JPEG uploaded as an image but keeps files byte for byte, so
// each Ultra HDR JPEG is also kept as that photo's HDR original, which the Gallery viewer shows on HDR screens
// (sanity/components/photoInputs.tsx; scripts/upload-photos.mjs does the same).
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
      description:
        'Drop several files here at once, or use Add photos; each becomes a photo, and Ultra HDR JPEGs keep their HDR. Drag to reorder.',
      components: { input: PhotosInput },
      of: [
        defineArrayMember({
          type: 'image',
          options: { hotspot: true },
          components: { input: ImageFromHdrInput },
          fields: [
            defineField({ name: 'caption', type: 'string', title: 'Caption' }),
            defineField({ name: 'credit', type: 'string', title: 'Photographer' }),
            defineField({
              name: 'hdr',
              type: 'file',
              title: 'HDR original',
              description:
                'The same photo as an Ultra HDR JPEG, kept byte for byte (an Image loses its HDR on upload). If the Image is empty, it is made from this file, so an HDR photo needs only this. Shown full size on HDR screens; export it at about 4000 px on the long edge so phones load it quickly.',
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
