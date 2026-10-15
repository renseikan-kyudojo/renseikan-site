// Gallery page behaviour: photos brushed on as they come into view, the album titles' brush marks, the album bar that
// follows the scroll, the colour lift on touch screens, and the full-screen viewer.
// The viewer is a modal <dialog> over a horizontal scroll-snap track, so swiping is the browser's own scrolling;
// buttons, arrow keys and the thumbnail strip move the same track, and photos load as they come near. It opens by
// carrying the photo from its place in the grid to the stage (monochrome to colour on the way) and closes by carrying
// it back, quicker. Without this script every photo is a plain link to its original file.
import { paintMarks } from './marks.js';

const root = document.documentElement;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const links = [...document.querySelectorAll('[data-gallery] a[data-index]')];
const dialog = document.getElementById('viewer');
const sized = (url, w) => `${url}?w=${w}&auto=format&q=82`;
const token = (name, fallback) => getComputedStyle(root).getPropertyValue(name).trim() || fallback;
const BREATH = token('--ease-breath', 'ease-in-out');
const RELEASE = token('--ease-release', 'ease-out');
const MONO = 'grayscale(1) contrast(1.15)'; // the grid's resting treatment (.mono-lift)
// Sanity strips an Ultra HDR JPEG's gain map from images, so a photo's HDR original is kept as a separate file (data-hdr).
// On a screen that can show HDR, the photo the viewer settles on is swapped for that file once it has loaded. Only that
// one, and only photos that have one: the files are large, passing photos and SDR photos stay resized.
const hdr = matchMedia('(dynamic-range: high)');
const SETTLE = 400; // ms on a photo before its original is fetched

paintMarks();

// Photos are brushed on as they come into view: a wipe from the left, a few at a time, 60ms apart. Without an observer,
// or with reduced motion, they are simply there.
const cells = [...document.querySelectorAll('[data-gallery] > li')];
let brush = null;
if (!reduceMotion && 'IntersectionObserver' in window) {
  brush = new IntersectionObserver(
    (es) => {
      let k = 0;
      for (const e of es) {
        if (!e.isIntersecting) continue;
        brush.unobserve(e.target);
        e.target.style.setProperty('--delay', `${Math.min(k++, 6) * 60}ms`);
        e.target.classList.replace('pending', 'in');
      }
    },
    { rootMargin: '0px 0px -6% 0px' },
  );
  for (const li of cells) {
    li.classList.add('pending');
    brush.observe(li);
  }
}
// show a cell at once (the viewer is about to land a photo there)
function reveal(li) {
  if (!li?.classList.contains('pending')) return;
  brush?.unobserve(li);
  li.classList.remove('pending');
}

if (dialog && links.length) {
  const track = dialog.querySelector('.viewer-track');
  const strip = dialog.querySelector('.viewer-strip');
  const veil = dialog.querySelector('.viewer-veil');
  const num = dialog.querySelector('.viewer-num');
  const total = dialog.querySelector('.viewer-total');
  const albumName = dialog.querySelector('.viewer-album');
  const caption = dialog.querySelector('.viewer-caption');
  const original = dialog.querySelector('.viewer-original');
  const prev = dialog.querySelector('.prev');
  const next = dialog.querySelector('.next');
  const chrome = [...dialog.querySelectorAll('.viewer-chrome')];
  const items = links.map((a) => {
    const img = a.querySelector('img');
    return {
      url: img.src.split('?')[0], // the image's own URL (the link may point at the HDR original)
      hdr: a.dataset.hdr,
      w: a.dataset.w,
      h: a.dataset.h,
      album: a.dataset.album ?? '',
      alt: img?.alt ?? '',
      lqip: img?.style.backgroundImage ?? '',
      caption: a.closest('figure')?.querySelector('figcaption')?.textContent.trim() ?? '',
    };
  });
  let slides = [];
  let thumbs = [];
  let current = -1;
  let target = null; // where a button, key or thumbnail is taking the track; passing photos are not shown on the way
  let closing = false;
  total.textContent = `/ ${items.length}`;

  // Slides and thumbnails are made the first time the viewer opens; their images get a src only when needed.
  function build() {
    slides = items.map((it, i) => {
      const li = document.createElement('li');
      li.className = 'viewer-slide';
      li.setAttribute('aria-roledescription', 'slide');
      li.setAttribute('aria-label', `${i + 1} of ${items.length}`);
      li.style.setProperty('--r', String(it.w / it.h));
      const img = document.createElement('img');
      img.alt = it.alt;
      img.width = Number(it.w);
      img.height = Number(it.h);
      img.decoding = 'async';
      img.draggable = false;
      if (it.lqip) img.style.backgroundImage = it.lqip;
      li.append(img);
      track.append(li);
      return li;
    });
    thumbs = items.map((it, i) => {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-label', `Photo ${i + 1}${it.caption ? `: ${it.caption}` : ''}`);
      const img = document.createElement('img');
      img.alt = '';
      img.loading = 'lazy';
      img.src = sized(it.url, 160);
      b.append(img);
      b.addEventListener('click', () => go(i));
      li.append(b);
      strip.append(li);
      return b;
    });
  }

  // `interim` is a copy already in the cache (the grid's): shown at once, swapped for the full size once decoded
  function load(i, interim) {
    const img = slides[i]?.querySelector('img');
    if (!img || img.dataset.loading) return;
    img.dataset.loading = '1';
    const url = items[i].url;
    const srcset = [1200, 1800, 2400].map((w) => `${sized(url, w)} ${w}w`).join(', ');
    const full = () => {
      if (img.dataset.original) return; // the HDR original is up or on its way; a late resized copy must not replace it
      img.sizes = '100vw';
      img.srcset = srcset;
      img.src = sized(url, 1800);
    };
    if (!interim) return full();
    img.src = interim;
    const big = new Image();
    big.sizes = '100vw';
    big.srcset = srcset;
    big.src = sized(url, 1800);
    big.decode().then(full, full);
  }

  // TEMPORARY diagnostics (?hdrdebug): what the swap does on this device, printed over the viewer
  const debugOn = new URLSearchParams(location.search).has('hdrdebug');
  let debugBox = null;
  const t0 = performance.now();
  function dbg(msg) {
    if (!debugOn) return;
    if (!debugBox) {
      debugBox = document.createElement('pre');
      Object.assign(debugBox.style, {
        position: 'absolute',
        left: '8px',
        right: '8px',
        bottom: '8px',
        zIndex: 9,
        margin: 0,
        padding: '8px',
        font: '11px/1.35 monospace',
        color: '#0f0',
        background: 'rgba(0,0,0,.8)',
        whiteSpace: 'pre-wrap',
        maxHeight: '45%',
        overflow: 'auto',
      });
      dialog.append(debugBox);
    }
    debugBox.textContent += `${((performance.now() - t0) / 1000).toFixed(1)}s ${msg}\n`;
  }
  if (debugOn) addEventListener('error', (e) => dbg(`page error: ${e.message}`));

  // The HDR original in place of the resized copy (see `hdr` above). Safari settles whether a layer is drawn in HDR when
  // the layer is made, so changing the src of a slide already on screen (in the track's layer, made while it held the
  // resized copy) stays in standard range. The file is loaded into a fresh <img> instead, which replaces the slide's
  // once it has arrived and gets a layer of its own, made with the HDR image already in it.
  let settle = 0;
  function toOriginal(i) {
    clearTimeout(settle);
    dbg(`photo ${i + 1}: dynamic-range high=${hdr.matches}, has HDR original=${!!items[i].hdr}`);
    if (!hdr.matches || !items[i].hdr) return;
    settle = setTimeout(() => {
      const img = slides[i]?.querySelector('img');
      if (i !== current || !img || img.dataset.original) return;
      img.dataset.original = 'loading';
      dbg(`photo ${i + 1}: loading ${items[i].hdr.split('/').pop()} into a fresh image`);
      const file = new Image();
      file.alt = img.alt;
      file.width = img.width;
      file.height = img.height;
      file.draggable = false;
      file.dataset.loading = '1'; // load() must not put a resized copy back in
      file.dataset.original = '1';
      file.style.willChange = 'transform'; // its own layer, made now that the HDR image is in it
      file.onload = () => {
        if (!img.isConnected) return;
        img.replaceWith(file);
        dbg(
          `photo ${i + 1}: replaced; slide shows ${file.currentSrc.split('/').pop()} ${file.naturalWidth}x${file.naturalHeight}`,
        );
      };
      file.onerror = () => {
        dbg(`photo ${i + 1}: load FAILED`);
        delete img.dataset.original;
      };
      file.src = items[i].hdr;
    }, SETTLE);
  }

  // Text that changes with the photo fades in rather than snapping; the number rises or falls with the direction
  function swap(el, text, rise = 0) {
    if (el.textContent === text) return;
    el.textContent = text;
    if (reduceMotion || !dialog.open) return;
    el.animate(
      [
        { opacity: 0, transform: `translateY(${rise * 6}px)` },
        { opacity: 1, transform: 'none' },
      ],
      { duration: 260, easing: RELEASE },
    );
  }

  function show(i) {
    if (i === current) return;
    const rise = current < 0 ? 0 : Math.sign(i - current);
    current = i;
    for (const j of [i, i + 1, i - 1, i + 2]) load(j);
    toOriginal(i);
    const it = items[i];
    swap(num, String(i + 1), rise);
    swap(albumName, it.album);
    swap(caption, it.caption);
    original.href = it.hdr || it.url;
    prev.disabled = i === 0;
    next.disabled = i === items.length - 1;
    thumbs.forEach((b, j) => (j === i ? b.setAttribute('aria-current', 'true') : b.removeAttribute('aria-current')));
    const t = thumbs[i];
    strip.scrollTo({
      left: t.offsetLeft - strip.clientWidth / 2 + t.offsetWidth / 2,
      behavior: reduceMotion ? 'instant' : 'smooth',
    });
    history.replaceState(null, '', `#photo-${i + 1}`);
  }

  function go(i, instant = false) {
    const to = Math.max(0, Math.min(items.length - 1, i));
    const left = to * track.clientWidth;
    const glide = !instant && !reduceMotion && Math.abs(track.scrollLeft - left) > 1;
    target = glide ? to : null;
    track.scrollTo({ left, behavior: glide ? 'smooth' : 'instant' });
    show(to);
  }

  // A stand-in for the photo while it travels between the grid and the stage: drawn above everything, never clipped
  function ghost(src, r) {
    const g = document.createElement('img');
    g.className = 'viewer-ghost';
    g.alt = '';
    g.src = src;
    Object.assign(g.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` });
    dialog.append(g);
    return g;
  }
  const between = (a, b) =>
    `translate(${b.left - a.left}px, ${b.top - a.top}px) scale(${b.width / a.width}, ${b.height / a.height})`;
  const visible = (r) => r.width > 0 && r.bottom > 0 && r.top < innerHeight;

  function chromeIn(delay) {
    for (const el of chrome) {
      const dy = el.classList.contains('viewer-bar') ? -8 : el.classList.contains('viewer-strip') ? 8 : 0;
      el.animate(
        [
          { opacity: 0, transform: `translateY(${dy}px)` },
          { opacity: 1, transform: 'none' },
        ],
        {
          duration: 320,
          delay,
          easing: RELEASE,
          fill: 'backwards',
        },
      );
    }
  }

  let opener = null;
  function open(i, from) {
    if (!slides.length) build();
    opener = links[i];
    current = -1;
    closing = false;
    load(i, from?.currentSrc);
    dialog.showModal();
    root.classList.add('viewing');
    go(i, true);
    // focus on the dialog itself: the arrow keys work from anywhere in it, and nothing is ringed until Tab is used
    dialog.focus({ preventScroll: true });
    if (reduceMotion) return;
    const start = from?.getBoundingClientRect();
    const img = slides[i].querySelector('img');
    const end = img.getBoundingClientRect();
    if (!start || !visible(start)) {
      // opened from a link, not the grid: the stage simply fades up
      veil.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 280, easing: RELEASE });
      chromeIn(80);
      return;
    }
    // The photo leaves its place in the grid and grows onto the stage, coming into colour as it goes
    const g = ghost(from.currentSrc || from.src, end);
    img.style.visibility = 'hidden';
    from.style.visibility = 'hidden';
    veil.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 360, easing: RELEASE });
    chromeIn(160);
    g.animate(
      [
        { transform: between(end, start), filter: MONO },
        { transform: 'none', filter: 'none' },
      ],
      {
        duration: 520,
        easing: RELEASE,
      },
    ).finished.finally(() => {
      img.style.visibility = '';
      from.style.visibility = '';
      g.remove();
    });
  }

  // Closing carries the photo back to its place in the grid (scrolled into view first), faster than it came
  function shut() {
    if (closing || !dialog.open) return;
    const a = links[current];
    const thumb = a?.querySelector('img');
    const img = slides[current]?.querySelector('img');
    if (reduceMotion || !thumb || !img) return dialog.close();
    closing = true;
    reveal(a.closest('li'));
    // land it where it can be seen whole: clear of the sticky bars, inside the window
    const r = a.getBoundingClientRect();
    const top = parseFloat(getComputedStyle(root).scrollPaddingTop) || 0;
    if (r.top < top || r.bottom > innerHeight) a.scrollIntoView({ block: 'center', behavior: 'instant' });
    const start = img.getBoundingClientRect();
    const end = thumb.getBoundingClientRect();
    const g = ghost(img.currentSrc || thumb.currentSrc, start);
    img.style.visibility = 'hidden';
    thumb.style.visibility = 'hidden';
    for (const el of chrome) el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, fill: 'forwards' });
    veil.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 320, easing: BREATH, fill: 'forwards' });
    g.animate(
      [
        { transform: 'none', filter: 'none' },
        { transform: between(start, end), filter: MONO },
      ],
      {
        duration: 340,
        easing: BREATH,
        fill: 'forwards',
      },
    ).finished.finally(() => {
      thumb.style.visibility = '';
      img.style.visibility = '';
      g.remove();
      dialog.close();
    });
  }

  // The track's position is the truth: wherever a swipe or the snap leaves it, that photo is the current one.
  let ticking = false;
  track.addEventListener(
    'scroll',
    () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        if (!dialog.open || closing || !track.clientWidth) return;
        const at = Math.round(track.scrollLeft / track.clientWidth);
        if (target !== null && at !== target) return;
        target = null;
        show(at);
      });
    },
    { passive: true },
  );
  track.addEventListener('scrollend', () => {
    target = null;
    if (dialog.open && !closing && track.clientWidth) show(Math.round(track.scrollLeft / track.clientWidth));
  });
  addEventListener('resize', () => dialog.open && !closing && go(current, true));

  for (const a of links) {
    a.addEventListener('click', (e) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      open(Number(a.dataset.index), a.querySelector('img'));
    });
  }
  for (const b of dialog.querySelectorAll('[data-step]')) {
    b.addEventListener('click', () => go(current + Number(b.dataset.step)));
  }
  dialog.querySelector('[data-close]').addEventListener('click', shut);
  // A click on the dark around a photo closes, like a click outside any dialog
  track.addEventListener('click', (e) => {
    if (e.target.classList?.contains('viewer-slide')) shut();
  });
  dialog.addEventListener('keydown', (e) => {
    const step = { ArrowRight: 1, ArrowLeft: -1, PageDown: 1, PageUp: -1 }[e.key];
    if (e.key === 'Escape') shut();
    else if (step) go(current + step);
    else if (e.key === 'Home') go(0);
    else if (e.key === 'End') go(items.length - 1);
    else return;
    e.preventDefault();
  });
  // a close request the keydown did not catch (the Android back gesture, say) still closes the same way
  dialog.addEventListener('cancel', (e) => {
    e.preventDefault();
    shut();
  });
  // Back on the page, focus returns to the photo last seen (scrolled to, if the viewer moved past the one opened)
  dialog.addEventListener('close', () => {
    closing = false;
    clearTimeout(settle);
    root.classList.remove('viewing');
    for (const anim of dialog.getAnimations({ subtree: true })) anim.cancel();
    history.replaceState(null, '', location.pathname + location.search);
    const a = links[current] ?? opener;
    if (!a) return;
    reveal(a.closest('li'));
    a.focus({ preventScroll: true });
    if (!visible(a.getBoundingClientRect())) a.scrollIntoView({ block: 'center' });
  });

  // A shared link to #photo-N opens the viewer on that photo
  const m = /^#photo-(\d+)$/.exec(location.hash);
  if (m && links[Number(m[1]) - 1]) open(Number(m[1]) - 1);
}

// The album bar marks the album in view (its underline is brushed across in CSS) and keeps that link in the row
const nav = document.querySelector('.album-nav ul');
if (nav && 'IntersectionObserver' in window) {
  const chips = new Map([...nav.querySelectorAll('a')].map((a) => [a.hash.slice(1), a]));
  const spy = new IntersectionObserver(
    (es) => {
      for (const e of es) {
        if (!e.isIntersecting) continue;
        const chip = chips.get(e.target.querySelector('h2')?.id);
        if (!chip || chip.hasAttribute('aria-current')) continue;
        for (const c of chips.values()) c.removeAttribute('aria-current');
        chip.setAttribute('aria-current', 'true');
        nav.scrollTo({
          left: chip.offsetLeft - nav.clientWidth / 2 + chip.offsetWidth / 2,
          behavior: reduceMotion ? 'instant' : 'smooth',
        });
      }
    },
    { rootMargin: '-30% 0px -60% 0px' },
  );
  for (const s of document.querySelectorAll('.album')) spy.observe(s);
}

// Touch screens have no hover to lift a photo into colour, so the one crossing the middle of the screen lifts instead
if (matchMedia('(hover: none)').matches && 'IntersectionObserver' in window) {
  const lift = new IntersectionObserver((es) => es.forEach((e) => e.target.classList.toggle('lit', e.isIntersecting)), {
    rootMargin: '-35% 0px -35% 0px',
  });
  for (const a of links) lift.observe(a);
}
