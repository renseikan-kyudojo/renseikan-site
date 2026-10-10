import type { StructureResolver } from 'sanity/structure';

// The Studio's left-hand menu, in the order Steve will use it. "Dojo settings" opens the one settings document directly.
export const structure: StructureResolver = (S) =>
  S.list()
    .title('Renseikan')
    .items([
      S.listItem()
        .title('Dojo settings')
        .id('settings')
        .child(S.document().schemaType('settings').documentId('settings').title('Dojo settings')),
      S.divider(),
      S.documentTypeListItem('event').title('Events'),
      S.documentTypeListItem('post').title('News posts'),
      S.documentTypeListItem('classSession').title('Classes'),
      S.documentTypeListItem('person').title('Instructors'),
      S.documentTypeListItem('page').title('Pages'),
      S.documentTypeListItem('photo').title('Gallery photos'),
      S.documentTypeListItem('faq').title('FAQ'),
    ]);
