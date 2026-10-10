// RSS feed of events and posts, newest first.
import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getAllEvents, getPosts, getSite } from '../lib/sanity';
import { toHtml } from '../lib/portable';

export async function GET(context: APIContext) {
  const [site, events, posts] = await Promise.all([getSite(), getAllEvents(), getPosts()]);
  const items = [
    ...events.map((e) => ({
      title: e.title,
      pubDate: new Date(e.date + 'T12:00:00-08:00'),
      description: e.summary,
      content: toHtml(e.body),
      link: `/events/${e.slug}`,
    })),
    ...posts.map((p) => ({
      title: p.title,
      pubDate: new Date(p.date + 'T12:00:00-08:00'),
      description: p.summary,
      content: toHtml(p.body),
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
  });
}
