// RSS feed of events and posts, newest first.
import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getAllEvents, getPosts, getSite } from '../lib/sanity';
import { toHtml } from '../lib/portable';

// content:encoded carries the full HTML of an item; it needs the content namespace declared on <rss>, and an empty
// one is noise, so it is only added when the item has a body.
const withContent = (html: string) => (html ? { content: html } : {});

export async function GET(context: APIContext) {
  const [site, events, posts] = await Promise.all([getSite(), getAllEvents(), getPosts()]);
  const items = [
    ...events.map((e) => ({
      title: e.title,
      pubDate: new Date(e.date + 'T12:00:00-08:00'),
      description: e.summary,
      ...withContent(toHtml(e.body)),
      link: `/events/${e.slug}`,
    })),
    ...posts.map((p) => ({
      title: p.title,
      pubDate: new Date(p.date + 'T12:00:00-08:00'),
      description: p.summary,
      ...withContent(toHtml(p.body)),
      link: `/news/${p.slug}`,
    })),
  ].sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime());
  return rss({
    title: `${site.name}: news and events`,
    description: site.description,
    site: context.site!,
    items,
    customData: '<language>en-us</language>',
    trailingSlash: false,
    xmlns: { content: 'http://purl.org/rss/1.0/modules/content/' },
  });
}
