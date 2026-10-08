import { defineField, defineType } from 'sanity';
export default defineType({
  name: 'person', title: 'Instructor', type: 'document',
  fields: [
    defineField({ name: 'name', type: 'string', title: 'Name' }),
    defineField({ name: 'role', type: 'string', title: 'Role' }),
    defineField({ name: 'rank', type: 'string', title: 'Rank (e.g. Renshi Rokudan)' }),
    defineField({ name: 'credentials', type: 'array', title: 'Credentials', of: [{ type: 'string' }] }),
    defineField({ name: 'email', type: 'string', title: 'Email' }),
    defineField({ name: 'portrait', type: 'image', title: 'Portrait', options: { hotspot: true } }),
    defineField({ name: 'order', type: 'number', title: 'Order' }),
  ],
});
