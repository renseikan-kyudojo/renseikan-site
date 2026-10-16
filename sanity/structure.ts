import type { StructureResolver } from 'sanity/structure';
import { PAGE_TYPES } from '../src/lib/copy.js';

// The Studio's left-hand menu, in the order Steve will use it. "Dojo settings" and each page are single documents that
// open directly; the rest are lists.
const one = (S: Parameters<StructureResolver>[0], type: string, title: string) =>
  S.listItem().title(title).id(type).child(S.document().schemaType(type).documentId(type).title(title));

export const structure: StructureResolver = (S) =>
  S.list()
    .title('Renseikan')
    .items([
      one(S, 'settings', 'Dojo settings'),
      S.divider(),
      S.listItem()
        .title('Pages')
        .id('pages')
        .child(
          S.list()
            .title('Pages')
            .items([
              one(S, PAGE_TYPES.home, 'Home'),
              one(S, PAGE_TYPES.about, 'About'),
              one(S, PAGE_TYPES.classes, 'Classes'),
              one(S, PAGE_TYPES.join, 'Joining'),
              one(S, PAGE_TYPES.visit, 'Visit'),
              one(S, PAGE_TYPES.instructor, 'Instructor'),
              one(S, PAGE_TYPES.faq, 'Questions'),
              one(S, PAGE_TYPES.news, 'News and events'),
              one(S, PAGE_TYPES.gallery, 'Gallery'),
              one(S, PAGE_TYPES.ja, '日本語 (Japanese)'),
              one(S, PAGE_TYPES.notFound, 'Not found (404)'),
              S.divider(),
              one(S, PAGE_TYPES.shared, 'Navigation and shared text'),
            ]),
        ),
      S.divider(),
      S.documentTypeListItem('event').title('Events'),
      S.documentTypeListItem('post').title('News posts'),
      S.documentTypeListItem('classSession').title('Classes'),
      S.documentTypeListItem('person').title('Instructors'),
      S.documentTypeListItem('faq').title('FAQ entries'),
      S.documentTypeListItem('album').title('Albums'),
      S.documentTypeListItem('photo').title('Gallery photos'),
    ]);
