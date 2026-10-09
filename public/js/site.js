/* Site-wide behaviour: theme switch, mobile menu, copy buttons, the guiding wind (home), brush-wipe reveals, logo motion on view, the map embed. Ported from the prototype. */
(function () {
  // Theme toggle (per-viewer convenience)
  var root = document.documentElement, tb = document.getElementById('themeBtn');
  try { var saved = localStorage.getItem('rk-theme'); if (saved) root.setAttribute('data-theme', saved); } catch (e) {}
  if (tb) tb.addEventListener('click', function () {
    var dark = root.getAttribute('data-theme') === 'dark' || (!root.getAttribute('data-theme') && matchMedia('(prefers-color-scheme: dark)').matches);
    var next = dark ? 'light' : 'dark'; root.setAttribute('data-theme', next);
    try { localStorage.setItem('rk-theme', next); } catch (e) {}
  });

  // Mobile menu
  var mb = document.getElementById('menuBtn'), mm = document.getElementById('mobileMenu');
  if (mb && mm) mb.addEventListener('click', function () { var open = mm.hidden; mm.hidden = !open; mb.setAttribute('aria-expanded', String(open)); });
  if (mm) mm.addEventListener('click', function (e) { if (e.target.tagName === 'A') { mm.hidden = true; mb.setAttribute('aria-expanded', 'false'); } });

  // Copy buttons
  document.querySelectorAll('.copy').forEach(function (b) {
    b.addEventListener('click', function () {
      var t = b.getAttribute('data-copy');
      var done = function () { b.textContent = 'Copied'; setTimeout(function () { b.textContent = 'Copy'; }, 1500); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(done, function () { selectPrev(b); });
      else selectPrev(b);
    });
  });
  function selectPrev(b) { var s = b.previousElementSibling; if (!s) return; var r = document.createRange(); r.selectNodeContents(s); var sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); }

  // Guiding wind: a flow field with curving wisps and ink-drawn leaves (RenseikanWind). A scroll adds a gust that travels across as a wave.
  var windCanvas = document.getElementById('wash');
  function inkFor() { return getComputedStyle(root).getPropertyValue('--sumi').trim() || '#1f1c19'; }
  var wind = (window.RenseikanWind && windCanvas) ? RenseikanWind.start(windCanvas, { ink: inkFor(), density: 1, follow: document.querySelector('.hero') }) : null;
  var lastGust = 0;
  addEventListener('scroll', function () { var n = Date.now(); if (wind && n - lastGust > 600) { wind.gust(0.35); lastGust = n; } }, { passive: true });
  new MutationObserver(function () { if (wind) wind.setInk(inkFor()); }).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () { if (wind) wind.setInk(inkFor()); });

  // Brush-wipe reveals: headings animate on when they enter the viewport; without an observer they simply stay visible.
  var reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if ('IntersectionObserver' in window && !reduceMotion) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }); }, { rootMargin: '0px 0px -10% 0px' });
    document.querySelectorAll('.wipe:not(.in)').forEach(function (el) { io.observe(el); });
  } else { document.querySelectorAll('.mark').forEach(function (m) { m.classList.add('in'); }); }

  // The mark in motion (RenseikanLogo): each sequence runs once, the first time its element is 40% in view.
  var L = window.RenseikanLogo;
  if (L) {
    var once = function (el, run) {
      if (!el) return;
      if (!('IntersectionObserver' in window) || reduceMotion) { run(); return; }
      var o = new IntersectionObserver(function (es) { if (es[0].intersectionRatio < .4) return; o.disconnect(); run(); }, { threshold: .4 });
      o.observe(el);
    };
    var aboutMon = document.getElementById('aboutMon'), foot = document.getElementById('footLockup');
    once(aboutMon, function () { L.mon(aboutMon, { mode: 'ink' }); });
    once(document.querySelector('.photo.mono'), function () { L.fletch(document.querySelector('.photo.mono'), { size: 26 }); });
    once(document.getElementById('mapFrame'), function () { L.fletch(document.getElementById('mapFrame'), { size: 30 }); });
    if (foot) { L.lockup(foot, { mode: 'static' }); once(foot, function () { L.lockup(foot, { mode: 'intro' }); }); }
    if (document.getElementById('bookBreath')) L.mon(document.getElementById('bookBreath'), { mode: 'breathe', label: null });
  }

  // Class dates are rendered at build time; hide the ones already past (Pacific time) and mark today's, so the list reads
  // right however long ago the site was built. data-show is how many rows to keep visible.
  var today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(new Date());
  document.querySelectorAll('.rows[data-show]').forEach(function (ul) {
    var keep = +ul.getAttribute('data-show') || 4, shown = 0;
    ul.querySelectorAll('li[data-date]').forEach(function (li) {
      var d = li.getAttribute('data-date');
      li.hidden = d < today || shown >= keep;
      if (li.hidden) return;
      shown++;
      if (d === today && !li.classList.contains('off')) {
        li.classList.add('today');
        var st = li.querySelector('.status'); st.textContent = 'TODAY'; st.classList.add('on');
      }
    });
  });

  // The WellnessLiving widget: drop the breathing "Loading…" once the embed has drawn something, and say so plainly if
  // it hasn't after 15 seconds (the button under it always works).
  document.querySelectorAll('[data-widget]').forEach(function (slot) {
    var loading = slot.querySelector('.loading'); if (!loading) return;
    var drawn = function () {
      return Array.prototype.some.call(slot.children, function (c) { return c !== loading && c.tagName !== 'SCRIPT' && (c.offsetHeight > 40 || c.tagName === 'IFRAME'); });
    };
    var mo = new MutationObserver(function () { if (drawn()) { loading.remove(); mo.disconnect(); } });
    mo.observe(slot, { childList: true, subtree: true });
    setTimeout(function () { if (loading.isConnected && !drawn()) { mo.disconnect(); loading.textContent = 'The schedule didn’t load here. Use the button below to book on WellnessLiving.'; } }, 15000);
  });

  // The map: a Google Maps embed (the classic embed needs no key). If the host's content-security policy blocks the frame
  // (the prototype host does), the browser reports it and the placeholder with the links beneath stays as the fallback.
  var mapFrame = document.getElementById('mapFrame');
  if (mapFrame) {
    var f = document.createElement('iframe'), src = 'https://maps.google.com/maps?q=Japanese+Art+%26+Cultural+Center%2C+4334+Moorpark+Ave%2C+San+Jose%2C+CA+95129&z=15&output=embed';
    document.addEventListener('securitypolicyviolation', function (e) {
      if (/frame-src|child-src|default-src/.test(e.violatedDirective) && /maps\.google\.com/.test(e.blockedURI || '')) { f.remove(); mapFrame.setAttribute('aria-hidden', 'true'); mapFrame.textContent = 'MAP'; }
    });
    f.title = 'Map of the Japanese Art & Cultural Center, 4334 Moorpark Ave, San Jose'; f.loading = 'lazy'; f.referrerPolicy = 'no-referrer-when-downgrade'; f.setAttribute('allowfullscreen', '');
    mapFrame.removeAttribute('aria-hidden'); mapFrame.textContent = ''; mapFrame.appendChild(f); f.src = src;
  }
})();
