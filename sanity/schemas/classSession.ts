import { defineField, defineType } from 'sanity';
// One document per weekly class. The site lists the next dates it falls on; an Event of kind "Closure" covering a date
// marks that date "No class". With no Class documents the site assumes one Sunday class at the Dojo settings hours.
export default defineType({
  name: 'classSession',
  title: 'Class',
  type: 'document',
  fields: [
    defineField({ name: 'title', type: 'string', title: 'Title', initialValue: 'Kyudo class' }),
    defineField({
      name: 'weekday',
      type: 'string',
      title: 'Weekday',
      validation: (r) => r.required(),
      options: { list: ['Sunday', 'Saturday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] },
      initialValue: 'Sunday',
    }),
    defineField({
      name: 'start',
      type: 'string',
      title: 'Start',
      description: 'e.g. 4:00 pm. Leave blank to use the hours in Dojo settings.',
    }),
    defineField({ name: 'end', type: 'string', title: 'End', description: 'e.g. 6:00 pm' }),
    defineField({ name: 'place', type: 'string', title: 'Place', initialValue: 'JACC, San Jose' }),
    defineField({
      name: 'status',
      type: 'string',
      title: 'Status',
      description:
        '"Cancelled" stops the class from being listed. To skip one date, add an Event of kind Closure instead.',
      options: { list: ['Open', 'Members only', 'Cancelled'] },
      initialValue: 'Open',
    }),
    defineField({ name: 'note', type: 'string', title: 'Note (shown under the row)' }),
  ],
  preview: {
    select: { title: 'title', weekday: 'weekday', start: 'start', status: 'status' },
    prepare: ({ title, weekday, start, status }) => ({
      title: title || 'Class',
      subtitle: [weekday, start, status !== 'Open' ? status : ''].filter(Boolean).join(' · '),
    }),
  },
});
