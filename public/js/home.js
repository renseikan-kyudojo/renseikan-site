/* Home page: the painted hero sequence (kanji by stroke, mon seal, brushstroke). Ported from the prototype. */
(function () {
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var root = document.documentElement;
  var ink = document.getElementById('inkCanvas'), wet = document.getElementById('wetCanvas');
  function inkColor() { return getComputedStyle(root).getPropertyValue('--sumi').trim() || '#1f1c19'; }
  function stroke(animated) {
    ink.width = 0; ink.height = 0; wet.width = 0; wet.height = 0;
    if (!window.RenseikanBrush) return Promise.resolve();
    var o = { preset: 'yoko', ink: inkColor(), duration: 1700, timing: 'yoko', wetCanvas: wet };
    return animated ? RenseikanBrush.animate(ink, o) : (RenseikanBrush.stroke(ink, o), Promise.resolve());
  }
  var hanko = document.getElementById('hanko'), seal = document.getElementById('strokeSeal');
  var kCol = document.getElementById('heroKanji'), kRow = document.getElementById('heroKanjiInline');
  // 練誠館 written stroke by stroke in the logo's own calligraphy (KanjiVG order fitted to this face): 14, 13 and 16 strokes,
  // 900ms a character, each starting as the last one's final stroke lifts. Both copies are written; only one is shown.
  function writeKanji() {
    if (!window.RenseikanLogo) return;
    [[kCol, 'column'], [kRow, 'row']].forEach(function (h) { RenseikanLogo.kanji(h[0], { text: '練誠館', direction: h[1], mode: 'strokes', charDuration: 900, delay: 120 }); });
  }
  writeKanji();
  if (reduce) { if (hanko) hanko.classList.add('in'); seal.classList.add('in'); stroke(false); }
  else {
    // then the mon is pressed as the seal, the stroke is painted while 館 is finishing, and its seal lands last
    setTimeout(function () { if (hanko) hanko.classList.add('in'); }, 2900);
    setTimeout(function () { stroke(true).then(function () { setTimeout(function () { seal.classList.add('in'); }, 220); }); }, 2300);
  }
  // theme change: repaint the finished stroke in the new ink; resize: repaint
  new MutationObserver(function () { stroke(false); }).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () { stroke(false); });
  var rt; addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { stroke(false); }, 150); });
})();
