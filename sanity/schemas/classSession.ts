import { defineField, defineType } from 'sanity';
export default defineType({
  name: 'classSession', title: 'Class', type: 'document',
  fields: [
    defineField({ name: 'title', type: 'string', title: 'Title', initialValue: 'Kyudo class' }),
    defineField({ name: 'weekday', type: 'string', title: 'Weekday', options: { list: ['Sunday', 'Saturday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] } }),
    defineField({ name: 'start', type: 'string', title: 'Start (e.g. 4:00 pm)' }),
    defineField({ name: 'end', type: 'string', title: 'End' }),
    defineField({ name: 'place', type: 'string', title: 'Place' }),
    defineField({ name: 'status', type: 'string', title: 'Status', options: { list: ['Open', 'Members only', 'Cancelled'] }, initialValue: 'Open' }),
    defineField({ name: 'note', type: 'string', title: 'Note (shown under the row)' }),
  ],
});
