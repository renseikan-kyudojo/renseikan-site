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
    once(document.querySelector('.photo'), function () { L.fletch(document.querySelector('.photo'), { size: 26 }); });
    once(document.getElementById('mapFrame'), function () { L.fletch(document.getElementById('mapFrame'), { size: 30 }); });
    if (foot) { L.lockup(foot, { mode: 'static' }); once(foot, function () { L.lockup(foot, { mode: 'intro' }); }); }
    if (document.getElementById('bookBreath')) L.mon(document.getElementById('bookBreath'), { mode: 'breathe', label: null });
  }

  // The map: a Google Maps embed (the classic embed needs no key). If the host's content-security policy blocks the frame
  // (the prototype host does), the browser reports it and the placeholder with the links beneath stays as the fallback.
  var mapFrame = document.getElementById('mapFrame');
  if (mapFrame) {
    var f = document.createElement('iframe'), src = 'https://maps.google.com/maps?q=167+Brahms+Way%2C+Sunnyvale%2C+CA+94087&z=15&output=embed';
    document.addEventListener('securitypolicyviolation', function (e) {
      if (/frame-src|child-src|default-src/.test(e.violatedDirective) && /maps\.google\.com/.test(e.blockedURI || '')) { f.remove(); mapFrame.setAttribute('aria-hidden', 'true'); mapFrame.textContent = 'MAP'; }
    });
    f.title = 'Map of 167 Brahms Way, Sunnyvale'; f.loading = 'lazy'; f.referrerPolicy = 'no-referrer-when-downgrade'; f.setAttribute('allowfullscreen', '');
    mapFrame.removeAttribute('aria-hidden'); mapFrame.textContent = ''; mapFrame.appendChild(f); f.src = src;
  }
})();
