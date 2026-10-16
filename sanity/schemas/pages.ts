import { defineField, defineType, type FieldDefinition } from 'sanity';
import pagesJson from '../../src/data/pages.json';
import { PAGE_TYPES, PLACEHOLDERS, toDefaults } from '../../src/lib/copy.js';
// One document per page of the site, section by section: every title, lede, paragraph and button label the page shows,
// in the order it shows them. Each starts with the text the site ships (src/data/pages.json), so publishing one as is
// changes nothing; a field left blank keeps that shipped text. "Fill blanks with the site's current text" restores it.

const defaults = toDefaults(pagesJson) as Record<keyof typeof pagesJson, Record<string, unknown>>;
const PH = `Placeholders are filled in from Dojo settings and Classes: ${PLACEHOLDERS}.`;

const str = (name: string, title: string, description?: string) =>
  defineField({ name, title, type: 'string', description });
const text = (name: string, title: string, description?: string, rows = 3) =>
  defineField({ name, title, type: 'text', rows, description });
/** A paragraph or a few, with bold, italic and links; nothing else, so the page keeps its typography. */
const rich = (name: string, title: string, description?: string) =>
  defineField({
    name,
    title,
    type: 'array',
    description,
    of: [
      {
        type: 'block',
        styles: [{ title: 'Paragraph', value: 'normal' }],
        lists: [],
        marks: {
          decorators: [
            { title: 'Bold', value: 'strong' },
            { title: 'Italic', value: 'em' },
          ],
          annotations: [
            {
              name: 'link',
              type: 'object',
              title: 'Link',
              fields: [
                {
                  name: 'href',
                  type: 'string',
                  title: 'URL',
                  description:
                    'A web address, a page of this site such as /classes, mailto:, or {nckf}, {akr}, {instagram}, {booking}.',
                },
              ],
            },
          ],
        },
      },
    ],
  });
const group = (name: string, title: string, fields: FieldDefinition[], description?: string) =>
  defineField({ name, title, type: 'object', fields, description, options: { collapsible: true, collapsed: false } });
const list = (name: string, title: string, of: string, description?: string) =>
  defineField({ name, title, type: 'array', of: [{ type: of }], description });
const seo = [
  str(
    'seoTitle',
    'Browser tab and search title',
    'Shown after the dojo’s name in the browser tab and in search results.',
  ),
  text('seoDescription', 'Search description', `One or two sentences for search engines and link previews. ${PH}`, 2),
];
const seoFieldset = {
  name: 'seo',
  title: 'Browser tab and search results',
  options: { collapsible: true, collapsed: true },
};
const withSeo = (fields: FieldDefinition[]) => fields.map((f) => ({ ...f, fieldset: 'seo' }));

function page(key: keyof typeof PAGE_TYPES, title: string, fields: FieldDefinition[], hasSeo = true) {
  const initialValue = { ...(defaults[key] as Record<string, unknown>) };
  delete initialValue.entries; // the Questions page's entries are FAQ documents, not fields of the page
  return defineType({
    name: PAGE_TYPES[key],
    title,
    type: 'document',
    fieldsets: hasSeo ? [seoFieldset] : [],
    fields: hasSeo ? [...fields, ...withSeo(seo)] : fields,
    initialValue,
    preview: { prepare: () => ({ title }) },
  });
}

// ---- Shared pieces -----------------------------------------------------------------------------------------------

export const linkItem = defineType({
  name: 'linkItem',
  title: 'Link',
  type: 'object',
  fields: [
    str('label', 'Label'),
    str(
      'href',
      'Goes to',
      'A page of this site such as /classes, a web address, or {instagram}, {nckf}, {akr}, {booking}.',
    ),
  ],
  preview: { select: { title: 'label', subtitle: 'href' } },
});

export const textSection = defineType({
  name: 'textSection',
  title: 'Section',
  type: 'object',
  fields: [str('title', 'Heading'), rich('body', 'Text', PH)],
  preview: { select: { title: 'title' } },
});

export const stepItem = defineType({
  name: 'stepItem',
  title: 'Step',
  type: 'object',
  fields: [
    str('kanji', 'Character', 'The single character painted above the step, e.g. 礼.'),
    str('title', 'Heading'),
    text('text', 'Text'),
  ],
  preview: { select: { title: 'title', subtitle: 'kanji' } },
});

// ---- The pages -----------------------------------------------------------------------------------------------------

const home = page(
  'home',
  'Home page',
  [
    group('hero', 'Opening (hero)', [
      str('eyebrow', 'Small line above the title', PH),
      str('title', 'Title'),
      text('lede', 'Introduction'),
      group('primary', 'First button', [str('label', 'Label'), str('href', 'Goes to')]),
      group('secondary', 'Second button', [str('label', 'Label'), str('href', 'Goes to')]),
    ]),
    group('glance', 'The dojo at a glance (four tiles)', [
      str('title', 'Section title'),
      str('hoursLabel', 'Hours tile: label', 'The hours themselves come from Classes and Dojo settings.'),
      str('instructorLabel', 'Instructor tile: label', 'The name and rank come from Instructors.'),
      str('instructorLink', 'Instructor tile: link text'),
      str('whereLabel', 'Where tile: label', 'The address comes from Dojo settings.'),
      str('mapLink', 'Where tile: map link text'),
      str('directionsLink', 'Where tile: directions link text'),
      str('federationLabel', 'Federation tile: label'),
      rich('federation', 'Federation tile: text'),
    ]),
    group('expect', 'Beginning your kyudo journey', [
      str('title', 'Section title'),
      str('subtitle', 'Heading above the steps'),
      text('lede', 'Line under the heading', undefined, 2),
      list('steps', 'Steps', 'stepItem', 'Three fit in a row; the page shows as many as there are.'),
    ]),
    group('classes', 'Coming up', [
      str(
        'title',
        'Section title',
        'The class dates come from Classes; the booking panel’s text is under Navigation and shared text.',
      ),
    ]),
    group('instructor', 'Who teaches here', [str('title', 'Section title', 'The card comes from Instructors.')]),
    group('visit', 'Visit the dojo', [
      str('title', 'Section title', 'Hours, address and contact come from Dojo settings and Classes.'),
    ]),
  ],
  false,
);

const about = page('about', 'About page', [
  str('eyebrow', 'Small line above the title'),
  str('title', 'Title'),
  text('lede', 'Introduction', PH, 4),
  list('sections', 'Sections', 'textSection', 'Each with its heading, in order.'),
]);

const classes = page('classes', 'Classes page', [
  str('eyebrow', 'Small line above the title'),
  str('title', 'Title', PH),
  text('lede', 'Introduction', PH),
  str('comingUpTitle', 'Heading above the class dates', 'The dates come from Classes.'),
  group('wear', 'What to wear and bring', [str('title', 'Heading'), rich('body', 'Text')]),
]);

const join = page('join', 'Joining page', [
  str('eyebrow', 'Small line above the title'),
  str('title', 'Title'),
  text('lede', 'Introduction', PH),
  list(
    'steps',
    'Steps',
    'textSection',
    `Numbered, in order: the first lesson, what follows, equipment, grading. ${PH}`,
  ),
  group('fees', 'Fees', [
    str('title', 'Heading'),
    str('itemLabel', 'Table column: item'),
    str('amountLabel', 'Table column: amount'),
    str('noteLabel', 'Table column: note'),
    rich('empty', 'Text shown while the Fees table in Dojo settings is empty', PH),
  ]),
  list('buttons', 'Buttons at the end', 'linkItem'),
]);

const visit = page('visit', 'Visit page', [
  str('eyebrow', 'Small line above the title'),
  str('title', 'Title'),
  text('lede', 'Introduction', `${PH} Hours, address, contact and the map come from Dojo settings and Classes.`),
]);

const instructor = page(
  'instructor',
  'Instructor page',
  [
    str('eyebrow', 'Small line above the title (one instructor)'),
    str('eyebrowPlural', 'Small line above the title (several instructors)'),
    str('title', 'Title', 'The cards come from Instructors.'),
  ],
  false,
);

const faq = page('faq', 'Questions page', [
  str('eyebrow', 'Small line above the title'),
  str('title', 'Title'),
  rich('lede', 'Introduction', `${PH} The questions and answers are the FAQ entries.`),
]);

const news = page('news', 'News page', [
  str('eyebrow', 'Small line above the title'),
  str('title', 'Title'),
  rich('lede', 'Introduction'),
  str('empty', 'Text shown when no event is coming up'),
  str('postsTitle', 'Heading above the news posts'),
  group('eventPage', 'An event’s own page', [
    str('eventEyebrow', 'Small line above the title when the event has no kind'),
    str('registerLabel', 'Registration button'),
    str('calendarLabel', 'Calendar button'),
    str('backLabel', 'Link back to the News page'),
  ]),
  str('postEyebrow', 'Small line above a news post’s title'),
]);

const gallery = page('gallery', 'Gallery page', [
  str('eyebrow', 'Small line above the title'),
  str('title', 'Title'),
  text(
    'intro',
    'Line under the title',
    '{count} becomes "12 photos" and {albums} becomes " in 3 albums" (nothing when there are no albums).',
    2,
  ),
  str('moreTitle', 'Heading for photos that are in no album'),
  str('empty', 'Text shown while there are no photos'),
  rich('instagram', 'Added to it when Dojo settings has an Instagram URL', '{instagram} is that URL.'),
  group('viewer', 'Full-screen viewer', [str('original', '"Original" button'), str('close', '"Close" button')]),
]);

const ja = page('ja', 'Japanese page (日本語)', [
  str('eyebrow', 'Small line above the title'),
  str('title', 'Title'),
  text('lede', 'Introduction', 'On this page {days} and {hours} are in Japanese (日曜日, 4:00〜6:00（午後）).', 4),
  group('labels', 'Labels of the facts table', [
    str('days', 'Class days'),
    str('place', 'Place'),
    str('teacher', 'Instructor'),
    str('contact', 'Contact'),
    str('affiliation', 'Affiliation'),
  ]),
  str('daysText', 'Class days, as written in the table', '{days} and {hours} in Japanese.'),
  str('affiliation', 'Affiliation, as written in the table'),
  list('sections', 'Sections', 'textSection'),
  list('buttons', 'Buttons at the end', 'linkItem'),
]);

const notFound = page('notFound', 'Not-found page', [
  str('title', 'Title'),
  str('text', 'Text'),
  str('linkLabel', 'Link back to the home page'),
]);

const shared = page(
  'shared',
  'Navigation and shared text',
  [
    list('nav', 'Menu links', 'linkItem', 'The links at the top of every page, in order.'),
    list(
      'footerLinks',
      'Footer links',
      'linkItem',
      'A link whose address is a placeholder with no value, such as {instagram} before an Instagram URL is set, is left out.',
    ),
    str('wordmark', 'Name in the top bar, next to the crest'),
    str('skipLink', '"Skip to content" link (keyboard users)'),
    str('menuLabel', 'Menu button (phones)'),
    str('themeLabel', 'Theme switch label'),
    str('copyLabel', '"Copy" button next to an email address'),
    group('booking', 'Booking panel (home and Classes pages)', [
      str('eyebrow', 'Small line above the heading'),
      str('title', 'Heading'),
      text('lede', 'Text'),
      str('button', 'Button', 'Opens the WellnessLiving schedule URL from Dojo settings.'),
      str('note', 'Note under the button'),
      str('loading', 'Shown while the JACC widget loads'),
    ]),
    group('visit', 'Visit block (home and Visit pages)', [
      str('hoursLabel', 'Hours row: label'),
      str('addressLabel', 'Address row: label'),
      str('contactLabel', 'Contact row: label'),
      str('mapLink', 'Map link'),
      str('directionsLink', 'Directions link'),
    ]),
    group('classList', 'Class dates list', [str('empty', 'Text shown when no class is scheduled')]),
    str('instructorTitle', 'Title shown on an instructor card that has none'),
  ],
  false,
);

export const pageTypes = [home, about, classes, join, visit, instructor, faq, news, gallery, ja, notFound, shared];
export const pageTypeNames = new Set<string>(Object.values(PAGE_TYPES));
