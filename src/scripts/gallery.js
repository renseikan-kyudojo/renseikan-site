// Gallery page behaviour: the full-screen viewer, the album index that follows the scroll, and the colour lift on
// touch screens. The viewer is a modal <dialog> over a horizontal scroll-snap track, so swiping is the browser's own
// scrolling; buttons, arrow keys and the thumbnail strip move the same track. Photos load as they come near. Without
// this script every photo is a plain link to its original file.
const root = document.documentElement;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const links = [...document.querySelectorAll('[data-gallery] a[data-index]')];
const dialog = document.getElementById('viewer');
const sized = (url, w) => `${url}?w=${w}&auto=format&q=82`;

if (dialog && links.length) {
  const track = dialog.querySelector('.viewer-track');
  const strip = dialog.querySelector('.viewer-strip');
  const counter = dialog.querySelector('.viewer-count');
  const caption = dialog.querySelector('.viewer-caption');
  const original = dialog.querySelector('.viewer-original');
  const prev = dialog.querySelector('.prev');
  const next = dialog.querySelector('.next');
  const items = links.map((a) => {
    const img = a.querySelector('img');
    return {
      url: a.href,
      w: a.dataset.w,
      h: a.dataset.h,
      album: a.dataset.album,
      alt: img?.alt ?? '',
      lqip: img?.style.backgroundImage ?? '',
      caption: a.closest('figure')?.querySelector('figcaption')?.textContent.trim() ?? '',
    };
  });
  let slides = [];
  let thumbs = [];
  let current = -1;
  let target = null; // where a button, key or thumbnail is taking the track; passing photos are not shown on the way

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

  function load(i) {
    const img = slides[i]?.querySelector('img');
    if (!img || img.src) return;
    const url = items[i].url;
    img.srcset = [1200, 1800, 2400].map((w) => `${sized(url, w)} ${w}w`).join(', ');
    img.sizes = '100vw';
    img.src = sized(url, 1800);
  }

  function show(i) {
    if (i === current) return;
    current = i;
    for (const j of [i, i + 1, i - 1, i + 2]) load(j);
    const it = items[i];
    counter.textContent = `${i + 1} / ${items.length}${it.album ? ` · ${it.album}` : ''}`;
    caption.textContent = it.caption;
    caption.hidden = !it.caption;
    original.href = it.url;
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

  let opener = null;
  function open(i) {
    if (!slides.length) build();
    opener = links[i];
    current = -1;
    dialog.showModal();
    root.classList.add('viewing');
    go(i, true);
    track.focus({ preventScroll: true });
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
        if (!dialog.open || !track.clientWidth) return;
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
    if (dialog.open && track.clientWidth) show(Math.round(track.scrollLeft / track.clientWidth));
  });
  addEventListener('resize', () => dialog.open && go(current, true));

  for (const a of links) {
    a.addEventListener('click', (e) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      open(Number(a.dataset.index));
    });
  }
  for (const b of dialog.querySelectorAll('[data-step]')) {
    b.addEventListener('click', () => go(current + Number(b.dataset.step)));
  }
  dialog.querySelector('[data-close]').addEventListener('click', () => dialog.close());
  // A click on the dark around a photo closes, like a click outside any dialog
  track.addEventListener('click', (e) => {
    if (e.target.classList?.contains('viewer-slide')) dialog.close();
  });
  dialog.addEventListener('keydown', (e) => {
    const step = { ArrowRight: 1, ArrowLeft: -1, PageDown: 1, PageUp: -1 }[e.key];
    if (step) go(current + step);
    else if (e.key === 'Home') go(0);
    else if (e.key === 'End') go(items.length - 1);
    else return;
    e.preventDefault();
  });
  // Back on the page, focus returns to the photo last seen (scrolled to, if the viewer moved past the one opened)
  dialog.addEventListener('close', () => {
    root.classList.remove('viewing');
    history.replaceState(null, '', location.pathname + location.search);
    const a = links[current] ?? opener;
    if (!a) return;
    a.focus({ preventScroll: true });
    const r = a.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight) a.scrollIntoView({ block: 'center' });
  });

  // A shared link to #photo-N opens the viewer on that photo
  const m = /^#photo-(\d+)$/.exec(location.hash);
  if (m && links[Number(m[1]) - 1]) open(Number(m[1]) - 1);
}

// The album index marks the album in view and keeps its chip visible in the row
const nav = document.querySelector('.album-nav ul');
if (nav && 'IntersectionObserver' in window) {
  const chips = new Map([...nav.querySelectorAll('a')].map((a) => [a.hash.slice(1), a]));
  const spy = new IntersectionObserver(
    (es) => {
      for (const e of es) {
        if (!e.isIntersecting) continue;
        const chip = chips.get(e.target.querySelector('h2')?.id);
        if (!chip) continue;
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
