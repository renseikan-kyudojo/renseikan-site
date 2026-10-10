/* Home page: the painted hero sequence. The name 練誠館 is written stroke by stroke in the logo face and its mon is
   pressed; then 弓道 (kyūdō) is painted in live ink on the right, stroke by stroke in proper order, with the bristle
   brush following the face's own thick and thin, and a red seal lands beside it. Ported from the prototype. */
(function () {
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var root = document.documentElement;
  var ink = document.getElementById('inkCanvas'), wet = document.getElementById('wetCanvas');
  var hanko = document.getElementById('hanko'), seal = document.getElementById('strokeSeal');
  var kCol = document.getElementById('heroKanji'), kRow = document.getElementById('heroKanjiInline');
  function inkColor() { return getComputedStyle(root).getPropertyValue('--sumi').trim() || '#1f1c19'; }

  // --- the painted word: 弓道, from the logo's stroke centrelines (KanjiVG order, fitted to the face) -------------
  var WORD = ['yumi', 'do'], CHAR_MS = { yumi: 1250, do: 2050 }, LIFT = 70;
  var LIFTS = /[㇒㇏㇓㇀㇚]/;                                   // sweeps and flicks thin out as the brush lifts
  function word() {
    if (!window.RenseikanBrush || !window.RenseikanLogo || !RenseikanLogo.data || !RenseikanLogo.data.strokes) return null;
    var W = ink.clientWidth, H = ink.clientHeight; if (!W || !H) return null;
    var D = RenseikanLogo.data, col = D.colL, EM = col[2], n = WORD.length, gap = 0.1, pad = 0.04;
    // one em square per character, as large as the stage allows, centred as a row
    var em = Math.min(H * (1 - 2 * pad), W * (1 - 2 * pad) / (n + (n - 1) * gap));
    var total = em * (n + (n - 1) * gap), x0 = (W - total) / 2, y0 = (H - em) / 2, list = [], seed = 101;
    WORD.forEach(function (part, i) {
      var S = D.strokes[part], b = D.box[part], box = { x: x0 + i * em * (1 + gap), y: y0, w: em, h: em };
      var maxw = 0, lenSum = 0;
      S.strokes.forEach(function (st) { lenSum += st.len; st.segs.forEach(function (sg) { maxw = Math.max(maxw, sg.w); }); });
      var dy = (EM - b[3]) / 2 - b[1];                                      // the glyph box sits centred in its em
      var budget = CHAR_MS[part] - LIFT * (S.strokes.length - 1), durs = [], sum = 0;
      S.strokes.forEach(function (st) { var d = Math.max(130, budget * st.len / lenSum); durs.push(d); sum += d; });
      S.strokes.forEach(function (st, k) {
        var pts = [], ws = [], type = S.types[k] || '';
        st.segs.forEach(function (sg) {
          sg.d.replace(/[ML]\s*([\d.\-]+),([\d.\-]+)/g, function (_, x, y) { pts.push([(+x - col[0]) / EM, (+y + dy) / EM]); ws.push(sg.w); return ''; });
        });
        var lifts = LIFTS.test(type);
        var preset = RenseikanBrush.path(pts, { widths: ws, maxWidth: maxw, contrast: 1.3, width: maxw * 0.44 / EM, exit: lifts ? 'lift' : 'press',
          hairs: em > 150 ? 84 : 64, dryness: 1.0, retouch: 1.0, spatter: lifts && st.len > 90 ? 2 : 0, seed: seed++ });
        var timing = /㇐/.test(type) ? 'yoko' : LIFTS.test(type) ? 'sweep' : 'even';
        list.push({ preset: preset, box: box, duration: durs[k] * budget / sum, timing: timing, ink: inkColor(), wetCanvas: wet });
      });
    });
    // the seal is pressed to the right of the last character, on its baseline, like a signature
    var sz = em * 0.17;
    seal.style.left = ((x0 + total + em * 0.07) / W * 100) + '%'; seal.style.top = ((y0 + em * 0.76) / H * 100) + '%'; seal.style.width = (sz / W * 100) + '%';
    return list;
  }
  function paint(animated) {
    ink.width = 0; ink.height = 0; wet.width = 0; wet.height = 0;
    var list = word(); if (!list) return Promise.resolve();
    return RenseikanBrush.sequence(ink, list, { gap: LIFT, animate: animated });
  }

  // --- the name: 練誠館 written stroke by stroke in the logo's own calligraphy (14, 13 and 16 strokes, 900ms a
  // character, each starting as the last one's final stroke lifts). Both copies are written; only one is shown. ------
  function writeKanji() {
    if (!window.RenseikanLogo) return;
    [[kCol, 'column'], [kRow, 'row']].forEach(function (h) { RenseikanLogo.kanji(h[0], { text: '練誠館', direction: h[1], mode: 'strokes', charDuration: 900, delay: 120 }); });
  }
  writeKanji();
  if (reduce) { if (hanko) hanko.classList.add('in'); paint(false); seal.classList.add('in'); }
  else {
    // the mon is pressed as 館 finishes; the painting starts while the name is still being written and its seal lands last
    setTimeout(function () { if (hanko) hanko.classList.add('in'); }, 2900);
    setTimeout(function () { paint(true).then(function () { setTimeout(function () { seal.classList.add('in'); }, 260); }); }, 1400);
  }
  // theme change: repaint the finished word in the new ink; resize: repaint
  new MutationObserver(function () { paint(false); }).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () { paint(false); });
  var rt; addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { paint(false); }, 150); });
})();
