// A small Portable Text renderer: paragraphs, headings, quotes, bullet and numbered lists, bold, italic, links, and
// images (with their CDN URL projected by the query). Enough for news posts and event details; nothing else is allowed
// in the Studio's editors. Every string is escaped here.
export interface Span {
  _type: 'span';
  text: string;
  marks?: string[];
}
export interface Block {
  _type: 'block';
  _key?: string;
  style?: string;
  listItem?: 'bullet' | 'number';
  level?: number;
  children?: Span[];
  markDefs?: { _key: string; _type: string; href?: string }[];
}
export interface ImageBlock {
  _type: 'image';
  _key?: string;
  url?: string;
  alt?: string;
  w?: number;
  h?: number;
}
export type PortableBlock = Block | ImageBlock;

export const esc = (s: unknown) =>
  String(s ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );

function spans(b: Block): string {
  const defs = new Map((b.markDefs ?? []).map((d) => [d._key, d]));
  return (b.children ?? [])
    .map((c) => {
      let t = esc(c.text).replace(/\n/g, '<br>');
      for (const m of c.marks ?? []) {
        const def = defs.get(m);
        if (def?._type === 'link' && def.href && /^(https?:|mailto:|\/)/.test(def.href))
          t = `<a href="${esc(def.href)}" rel="noopener">${t}</a>`;
        else if (m === 'strong') t = `<strong>${t}</strong>`;
        else if (m === 'em') t = `<em>${t}</em>`;
        else if (m === 'code') t = `<code>${t}</code>`;
        else if (m === 'underline') t = `<u>${t}</u>`;
      }
      return t;
    })
    .join('');
}

/** Portable Text blocks to HTML. */
export function toHtml(blocks: PortableBlock[] | undefined | null): string {
  if (!blocks?.length) return '';
  const out: string[] = [];
  let list: 'ul' | 'ol' | null = null;
  const closeList = () => {
    if (list) out.push(`</${list}>`);
    list = null;
  };
  for (const b of blocks) {
    if (b._type === 'image') {
      closeList();
      if (b.url) {
        const size = b.w && b.h ? ` width="${b.w}" height="${b.h}"` : '';
        out.push(
          `<figure><img src="${esc(b.url)}?w=1200&auto=format" alt="${esc(b.alt ?? '')}"${size} loading="lazy" decoding="async"></figure>`,
        );
      }
      continue;
    }
    if (b._type !== 'block') continue;
    if (b.listItem) {
      const tag = b.listItem === 'number' ? 'ol' : 'ul';
      if (list !== tag) {
        closeList();
        list = tag;
        out.push(`<${tag}>`);
      }
      out.push(`<li>${spans(b)}</li>`);
      continue;
    }
    closeList();
    const style = b.style ?? 'normal';
    const tag = /^h[1-6]$/.test(style) ? (style === 'h1' ? 'h2' : style) : style === 'blockquote' ? 'blockquote' : 'p';
    out.push(`<${tag}>${spans(b)}</${tag}>`);
  }
  closeList();
  return out.join('\n');
}

/** Plain text of the blocks, for descriptions and feeds. */
export function toText(blocks: PortableBlock[] | undefined | null): string {
  return (blocks ?? [])
    .filter((b): b is Block => b._type === 'block')
    .map((b) => (b.children ?? []).map((c) => c.text).join(''))
    .join('\n')
    .trim();
}
