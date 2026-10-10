/* Site-wide behaviour: theme switch, mobile menu, copy buttons, brush-wipe reveals, the mark in motion where it is on
   the page, the class-date list and the booking widget's loading state, the map embed. Bundled by Astro from
   Base.astro; the logo library (87KB of path data) is loaded on demand, when something on the page asks for it. */
const root = document.documentElement;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

// Theme switch (per-viewer convenience): a role="switch" whose checked state is "dark theme on"
const tb = document.getElementById('themeBtn');
const isDark = () =>
  root.getAttribute('data-theme') === 'dark' ||
  (!root.getAttribute('data-theme') && matchMedia('(prefers-color-scheme: dark)').matches);
const reflectTheme = () => tb && tb.setAttribute('aria-checked', String(isDark()));
reflectTheme();
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', reflectTheme);
tb?.addEventListener('click', () => {
  const next = isDark() ? 'light' : 'dark';
  root.setAttribute('data-theme', next);
  try {
    localStorage.setItem('rk-theme', next);
  } catch {
    /* storage can be unavailable */
  }
  reflectTheme();
});

// Mobile menu: the button toggles it, Escape closes it, focus moves to the first link on open and back on close
const mb = document.getElementById('menuBtn');
const mm = document.getElementById('mobileMenu');
function setMenu(open) {
  if (!mb || !mm) return;
  mm.hidden = !open;
  mb.setAttribute('aria-expanded', String(open));
  mb.textContent = open ? 'Close' : 'Menu';
  if (open) mm.querySelector('a')?.focus();
}
if (mb && mm) {
  mb.addEventListener('click', () => setMenu(mm.hidden));
  mm.addEventListener('click', (e) => {
    if (e.target instanceof HTMLAnchorElement) setMenu(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !mm.hidden) {
      setMenu(false);
      mb.focus();
    }
  });
}

// Copy buttons
function selectPrev(b) {
  const s = b.previousElementSibling;
  if (!s) return;
  const r = document.createRange();
  r.selectNodeContents(s);
  const sel = getSelection();
  sel.removeAllRanges();
  sel.addRange(r);
}
for (const b of document.querySelectorAll('.copy')) {
  b.addEventListener('click', () => {
    const t = b.getAttribute('data-copy');
    const done = () => {
      b.textContent = 'Copied';
      setTimeout(() => (b.textContent = 'Copy'), 1500);
    };
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(t).then(done, () => selectPrev(b));
    else selectPrev(b);
  });
}

// Brush-wipe reveals: headings animate on when they enter the viewport; without an observer they simply stay visible.
if ('IntersectionObserver' in window && !reduceMotion) {
  const io = new IntersectionObserver(
    (es) => {
      for (const e of es) {
        if (!e.isIntersecting) continue;
        e.target.classList.add('in');
        io.unobserve(e.target);
      }
    },
    { rootMargin: '0px 0px -10% 0px' },
  );
  for (const el of document.querySelectorAll('.wipe:not(.in)')) io.observe(el);
} else {
  for (const m of document.querySelectorAll('.mark')) m.classList.add('in');
}

// The mark in motion: each sequence runs once, the first time its element is 40% in view. The library is fetched the
// first time any host asks for it (the home page already has it through the hero).
let logoPromise;
const logo = () => (logoPromise ??= import('../lib/ink/logo.js').then((m) => m.default));
function once(el, run) {
  if (!el) return;
  if (!('IntersectionObserver' in window) || reduceMotion) {
    run();
    return;
  }
  const o = new IntersectionObserver(
    (es) => {
      if (es[0].intersectionRatio < 0.4) return;
      o.disconnect();
      run();
    },
    { threshold: 0.4 },
  );
  o.observe(el);
}
const aboutMon = document.getElementById('aboutMon');
const foot = document.getElementById('footLockup');
const mono = document.querySelector('.photo.mono');
const mapFrame = document.getElementById('mapFrame');
const breath = document.getElementById('bookBreath');
once(aboutMon, () => logo().then((L) => L.mon(aboutMon, { mode: 'ink' })));
once(mono, () => logo().then((L) => L.fletch(mono, { size: 26 })));
once(mapFrame, () => logo().then((L) => L.fletch(mapFrame, { size: 30 })));
// the footer lockup assembles the first time it scrolls into view (the library is fetched then, not before)
once(foot, () => logo().then((L) => L.lockup(foot, { mode: 'intro' })));
if (breath) logo().then((L) => L.mon(breath, { mode: 'breathe', label: null }));

// Class dates are rendered at build time; hide the ones already past (Pacific time) and mark today's, so the list reads
// right however long ago the site was built. data-show is how many rows to keep visible.
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(new Date());
for (const ul of document.querySelectorAll('.rows[data-show]')) {
  const keep = +ul.getAttribute('data-show') || 4;
  let shown = 0;
  for (const li of ul.querySelectorAll('li[data-date]')) {
    const d = li.getAttribute('data-date');
    li.hidden = d < today || shown >= keep;
    if (li.hidden) continue;
    shown++;
    if (d === today && !li.classList.contains('off')) {
      li.classList.add('today');
      const st = li.querySelector('.status');
      st.textContent = 'TODAY';
      st.classList.add('on');
    }
  }
}

// The WellnessLiving widget: drop the breathing "Loading…" once the embed has drawn something, and say so plainly if
// it hasn't after 15 seconds (the button under it always works).
for (const slot of document.querySelectorAll('[data-widget]')) {
  const loading = slot.querySelector('.loading');
  if (!loading) continue;
  const drawn = () =>
    [...slot.children].some(
      (c) => c !== loading && c.tagName !== 'SCRIPT' && (c.offsetHeight > 40 || c.tagName === 'IFRAME'),
    );
  const mo = new MutationObserver(() => {
    if (drawn()) {
      loading.remove();
      mo.disconnect();
    }
  });
  mo.observe(slot, { childList: true, subtree: true });
  setTimeout(() => {
    if (loading.isConnected && !drawn()) {
      mo.disconnect();
      loading.textContent = 'The schedule didn’t load here. Use the button below to book on WellnessLiving.';
    }
  }, 15000);
}

// The map: a Google Maps embed (the classic embed needs no key). If a content-security policy blocks the frame, the
// browser reports it and the placeholder with the links beneath stays as the fallback.
if (mapFrame) {
  const f = document.createElement('iframe');
  const src =
    'https://maps.google.com/maps?q=Japanese+Art+%26+Cultural+Center%2C+4334+Moorpark+Ave%2C+San+Jose%2C+CA+95129&z=15&output=embed';
  document.addEventListener('securitypolicyviolation', (e) => {
    if (/frame-src|child-src|default-src/.test(e.violatedDirective) && /maps\.google\.com/.test(e.blockedURI || '')) {
      f.remove();
      mapFrame.setAttribute('aria-hidden', 'true');
      mapFrame.textContent = 'MAP';
    }
  });
  f.title = 'Map of the Japanese Art & Cultural Center, 4334 Moorpark Ave, San Jose';
  f.loading = 'lazy';
  f.referrerPolicy = 'no-referrer-when-downgrade';
  f.setAttribute('allowfullscreen', '');
  mapFrame.removeAttribute('aria-hidden');
  mapFrame.textContent = '';
  mapFrame.appendChild(f);
  f.src = src;
}
