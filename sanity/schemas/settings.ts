import { defineField, defineType } from 'sanity';
export default defineType({
  name: 'settings', title: 'Dojo settings', type: 'document',
  fields: [
    defineField({ name: 'name', title: 'Name', type: 'string', initialValue: 'Renseikan Kyudojo' }),
    defineField({ name: 'tagline', title: 'Tagline', type: 'string' }),
    defineField({ name: 'hours', title: 'Class hours (shown as text)', type: 'string', initialValue: 'Sundays, 4:00 – 6:00 pm' }),
    defineField({ name: 'address', title: 'Address', type: 'object', fields: [
      { name: 'street', type: 'string', title: 'Street' }, { name: 'city', type: 'string', title: 'City' },
      { name: 'region', type: 'string', title: 'State' }, { name: 'postalCode', type: 'string', title: 'ZIP' } ] }),
    defineField({ name: 'email', title: 'General email', type: 'string' }),
    defineField({ name: 'policy', title: 'New-student policy (verbatim)', type: 'text', rows: 4 }),
    defineField({ name: 'bookingUrl', title: 'WellnessLiving schedule URL', type: 'url' }),
    defineField({ name: 'widgetEmbed', title: 'JACC schedule widget embed code', type: 'text', rows: 6 }),
    defineField({ name: 'instagram', title: 'Instagram URL', type: 'url' }),
  ],
});
