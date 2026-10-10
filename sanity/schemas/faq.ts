import { defineField, defineType } from 'sanity';
// One question and its answer. The FAQ page lists them in Order; the site ships a few built-in answers that show
// until the first one is published here.
export default defineType({
  name: 'faq',
  title: 'FAQ entry',
  type: 'document',
  fields: [
    defineField({ name: 'question', type: 'string', title: 'Question', validation: (r) => r.required() }),
    defineField({
      name: 'answer',
      type: 'array',
      title: 'Answer',
      of: [{ type: 'block' }],
      validation: (r) => r.required(),
    }),
    defineField({ name: 'order', type: 'number', title: 'Order', description: '1 is shown first.' }),
  ],
  preview: {
    select: { title: 'question', order: 'order' },
    prepare: ({ title, order }) => ({ title, subtitle: order ? `#${order}` : '' }),
  },
});
