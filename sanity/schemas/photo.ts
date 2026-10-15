import { defineField, defineType } from 'sanity';
import { ImageFromHdrInput } from '../components/photoInputs';
export default defineType({
  name: 'photo',
  title: 'Gallery photo',
  type: 'document',
  fields: [
    defineField({
      name: 'image',
      type: 'image',
      title: 'Image',
      options: { hotspot: true },
      components: { input: ImageFromHdrInput },
    }),
    defineField({
      name: 'hdr',
      type: 'file',
      title: 'HDR original',
      description:
        'The same photo as an Ultra HDR JPEG, kept byte for byte (an Image loses its HDR on upload). If the Image is empty, it is made from this file, so an HDR photo needs only this. Shown full size on HDR screens; export it at about 4000 px on the long edge so phones load it quickly.',
      options: { accept: 'image/jpeg' },
    }),
    defineField({ name: 'caption', type: 'string', title: 'Caption' }),
    defineField({ name: 'credit', type: 'string', title: 'Photographer' }),
    defineField({ name: 'taken', type: 'date', title: 'Taken' }),
    defineField({ name: 'order', type: 'number', title: 'Order' }),
  ],
});
