// Section marks: the red brush mark under each title is painted as its own take, so no two titles share a stroke. The
// pool below is walked in order and only wraps round if the page ever has more titles than takes. The static <use>
// symbol stays for no-JS and is what the first take replaces; it is swapped for a canvas of the same size. Used by the
// home page and the Gallery (one title per album).
import RenseikanBrush from '../lib/ink/brush.js';

const TAKES = [
  ['mark', 59],
  ['rule', 61],
  ['mark', 71],
  ['rule', 73],
  ['mark', 83],
  ['rule', 89],
  ['mark', 97],
  ['rule', 101],
];

export function paintMarks() {
  const root = document.documentElement;
  const canvases = [];
  const shu = () => getComputedStyle(root).getPropertyValue('--shu').trim() || '#c4382a';
  const paint = (c, i) => {
    const [preset, seed] = TAKES[i % TAKES.length];
    RenseikanBrush.stroke(c, { preset, seed, ink: shu() });
  };
  document.querySelectorAll('svg.mark').forEach((svg, i) => {
    const c = document.createElement('canvas');
    c.className = svg.getAttribute('class');
    c.setAttribute('aria-hidden', 'true');
    svg.replaceWith(c);
    canvases.push(c);
    paint(c, i);
  });
  const repaint = () => canvases.forEach(paint);
  new MutationObserver(repaint).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', repaint);
  let rt;
  addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(repaint, 150);
  });
}
