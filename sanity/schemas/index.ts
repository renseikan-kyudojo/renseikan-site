import settings from './settings';
import person from './person';
import classSession from './classSession';
import event from './event';
import post from './post';
import photo from './photo';
import album from './album';
import faq from './faq';
import { pageTypes, linkItem, textSection, stepItem } from './pages';
export const schemaTypes = [
  settings,
  person,
  classSession,
  event,
  post,
  photo,
  album,
  faq,
  ...pageTypes,
  linkItem,
  textSection,
  stepItem,
];
