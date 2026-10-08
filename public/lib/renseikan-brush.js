/* @ds-lib renseikan-brush 2.2.1 — live ink strokes on a 2D canvas, bristle-bundle model.
   window.RenseikanBrush = { stroke, animate, presets, pressure, circle, version }

   A stroke is 60–130 hairs dragged along a centreline. Each hair has a seat in the bundle
   (dense core, sparse frayed edge), its own ink load, thickness, drift and lag (outer hairs
   trail the tip, so the bundle splays at the entry and drags through curves). Ink depletes
   along the stroke; a hair lifts when spent unless pressure pushes it back down, and it skips
   off the paper now and then — that is dry brush (kasure). The entry pools, thin fast tails
   throw spatter. No dependencies. Same model as gen_brushes.py, so SVG and canvas match. */
(function () {
  'use strict';

  function rng(seed) { var s = seed >>> 0 || 1; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  function gauss(r) { var u = 0, v = 0; while (u === 0) u = r(); while (v === 0) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(6.283 * v); }
  function noise(r, oct, lo, hi) {
    var w = [], tot = 0;
    for (var i = 0; i < oct; i++) { var a = 0.4 + r() * 0.6; w.push([lo + r() * (hi - lo), r() * 6.28, a]); tot += a; }
    return function (t) { var s = 0; for (var i = 0; i < w.length; i++) s += w[i][2] * Math.sin(t * w[i][0] * 6.28 + w[i][1]); return s / tot; };
  }
  function bez(s, t) { var u = 1 - t, p0 = s[0], p1 = s[1], p2 = s[2], p3 = s[3];
    return [u*u*u*p0[0] + 3*u*u*t*p1[0] + 3*u*t*t*p2[0] + t*t*t*p3[0], u*u*u*p0[1] + 3*u*u*t*p1[1] + 3*u*t*t*p2[1] + t*t*t*p3[1]]; }

  /* centreline → points ~spacing px apart with tangent and arc fraction */
  function sample(segs, box, spacing) {
    var raw = [], n = 240;
    for (var k = 0; k < segs.length; k++) for (var i = 0; i <= n; i++) { var p = bez(segs[k], i / n); raw.push([box.x + p[0] * box.w, box.y + p[1] * box.h]); }
    var pts = [raw[0]], acc = 0;
    for (var j = 1; j < raw.length; j++) { acc += Math.hypot(raw[j][0] - raw[j-1][0], raw[j][1] - raw[j-1][1]); if (acc >= spacing) { pts.push(raw[j]); acc = 0; } }
    pts.push(raw[raw.length - 1]);
    var L = [0]; for (var m = 1; m < pts.length; m++) L.push(L[m-1] + Math.hypot(pts[m][0] - pts[m-1][0], pts[m][1] - pts[m-1][1]));
    var total = L[L.length - 1] || 1, out = [];
    for (var q = 0; q < pts.length; q++) {
      var a = pts[Math.max(0, q-1)], b = pts[Math.min(pts.length-1, q+1)], dx = b[0]-a[0], dy = b[1]-a[1], mm = Math.hypot(dx, dy) || 1;
      out.push({ p: pts[q], d: [dx/mm, dy/mm], t: L[q] / total, s: L[q] });
    }
    return out;
  }

  /* Catmull-Rom through unit-space waypoints -> smooth cubic segments */
  function spline(points, tension) {
    tension = tension == null ? 0.5 : tension;
    var P = [points[0]].concat(points, [points[points.length - 1]]), segs = [];
    for (var i = 1; i < P.length - 2; i++) {
      var p0 = P[i-1], p1 = P[i], p2 = P[i+1], p3 = P[i+2];
      segs.push([p1, [p1[0] + (p2[0] - p0[0]) * tension / 3, p1[1] + (p2[1] - p0[1]) * tension / 3], [p2[0] - (p3[0] - p1[0]) * tension / 3, p2[1] - (p3[1] - p1[1]) * tension / 3], p2]);
    }
    return segs;
  }

  function circle(cx, cy, r, a0, a1, n) {
    var segs = [], step = (a1 - a0) / n, k = 4 / 3 * Math.tan(step * Math.PI / 180 / 4);
    for (var i = 0; i < n; i++) {
      var s = (a0 + step * i) * Math.PI / 180, e = (a0 + step * (i + 1)) * Math.PI / 180;
      var p0 = [cx + r * Math.cos(s), cy + r * Math.sin(s)], p3 = [cx + r * Math.cos(e), cy + r * Math.sin(e)];
      segs.push([p0, [p0[0] - r * k * Math.sin(s), p0[1] + r * k * Math.cos(s)], [p3[0] + r * k * Math.sin(e), p3[1] - r * k * Math.cos(e)], p3]);
    }
    return segs;
  }

  var pressure = {
    yoko:  function (t) { return 0.55 + 0.45 * Math.pow(Math.sin(t * Math.PI), 0.5) * (1 - 0.3 * t) + 0.25 * Math.exp(-Math.pow((t - 0.05) / 0.06, 2)) - 0.4 * Math.max(0, t - 0.84) / 0.16; },
    tate:  function (t) { return 0.7 + 0.3 * Math.pow(Math.sin(t * Math.PI), 0.4) + 0.15 * Math.exp(-Math.pow((t - 0.97) / 0.05, 2)); },
    harai: function (t) { return Math.pow(1 - t, 1.5) * 0.95 + 0.05; },
    hane:  function (t) { return t < 0.72 ? 0.8 * Math.pow(1 - t, 0.8) + 0.2 : 0.35 * Math.pow(1 - (t - 0.72) / 0.28, 1.3) + 0.03; },
    ten:   function (t) { return Math.pow(Math.sin(t * Math.PI), 0.35); },
    enso:  function (t) { return 0.92 * Math.pow(1 - t, 0.85) + 0.08 - 0.06 * Math.max(0, t - 0.9) / 0.1; },
    rule:  function (t) { return 0.9 * Math.pow(1 - t, 0.7) + 0.1; },
    scurve:function (t) { return 0.6 + 0.4 * Math.pow(Math.sin(t * Math.PI * 1.5 + 0.4), 2) * (1 - 0.25 * t) - 0.35 * Math.max(0, t - 0.9) / 0.1; },
    zigzag:function (t) { return 0.85 - 0.25 * Math.abs(Math.sin(t * Math.PI * 2.5)) - 0.5 * Math.max(0, t - 0.86) / 0.14; },
    tatew: function (t) { return 0.85 + 0.15 * Math.pow(Math.sin(t * Math.PI), 0.3) - 0.1 * Math.max(0, t - 0.95) / 0.05; }
  };

  /* presets in unit space; width = max half-width as a fraction of the box's short axis */
  var presets = {
    yoko:  { segs: spline([[0.05,0.55],[0.233,0.4],[0.533,0.35],[0.767,0.458],[0.975,0.417]]), press: 'yoko', width: 0.2, hairs: 96, dryness: 1.0, retouch: 1.0, spatter: 6, seed: 11 },
    tate:  { segs: spline([[0.5,0.05],[0.475,0.333],[0.533,0.633],[0.517,0.933]]), press: 'tate', width: 0.15, hairs: 90, dryness: 0.8, retouch: 1.0, spatter: 10, seed: 23 },
    'harai-left':  { segs: spline([[0.867,0.1],[0.717,0.383],[0.45,0.7],[0.1,0.933]]), press: 'harai', width: 0.073, hairs: 90, dryness: 1.25, retouch: 0.8, spatter: 14, seed: 31 },
    'harai-right': { segs: spline([[0.133,0.1],[0.283,0.383],[0.55,0.7],[0.9,0.933]]), press: 'harai', width: 0.073, hairs: 90, dryness: 1.25, retouch: 0.8, spatter: 14, seed: 37 },
    hane:  { segs: spline([[0.5,0.067],[0.48,0.367],[0.52,0.667],[0.512,0.842],[0.625,0.88],[0.8,0.797],[0.925,0.7]]), press: 'hane', width: 0.095, hairs: 90, dryness: 0.9, retouch: 1.0, spatter: 8, seed: 41 },
    ten:   { segs: spline([[0.29,0.375],[0.5,0.325],[0.6875,0.479],[0.73,0.69]]), press: 'ten', width: 0.167, hairs: 80, dryness: 0.4, retouch: 1.2, spatter: 3, seed: 47 },
    enso:  { segs: circle(0.5, 0.5, 0.37, -80, 250, 5), press: 'enso', width: 0.103, hairs: 100, dryness: 1.35, retouch: 0.9, spatter: 16, seed: 53 },
    mark:  { segs: spline([[0.04,0.55],[0.3,0.3],[0.65,0.35],[0.96,0.45]]), press: 'rule', width: 0.225, hairs: 54, dryness: 1.1, retouch: 0.8, spatter: 0, seed: 59 },
    rule:  { segs: spline([[0.004,0.5],[0.25,0.21],[0.6,0.71],[0.996,0.46]]), press: 'rule', width: 0.21, hairs: 46, dryness: 1.3, retouch: 0.8, spatter: 0, seed: 61 },
    scurve:{ segs: spline([[0.067,0.28],[0.217,0.11],[0.417,0.295],[0.55,0.588],[0.733,0.838],[0.913,0.75],[0.958,0.613]]), press: 'scurve', width: 0.115, hairs: 92, dryness: 1.1, retouch: 0.9, spatter: 10, seed: 67 },
    zigzag:{ segs: spline([[0.133,0.117],[0.383,0.08],[0.617,0.242],[0.667,0.383],[0.425,0.55],[0.267,0.667],[0.283,0.8],[0.533,0.887],[0.8,0.933],[0.933,0.9]], 0.6), press: 'zigzag', width: 0.06, hairs: 86, dryness: 1.2, retouch: 1.0, spatter: 12, seed: 71 },
    'tate-wet': { segs: spline([[0.5,0.1],[0.473,0.367],[0.527,0.667],[0.5,0.9]]), press: 'tatew', width: 0.167, hairs: 104, dryness: 0.55, retouch: 1.1, spatter: 60, seed: 73, spatterMode: 0.5 }
  };

  /* How far along the path the brush is at time fraction k (0..1). */
  var timing = {
    yoko:  function (k) { if (k < 0.1) return 0.02 * (k / 0.1); var x = (k - 0.1) / 0.9; return 0.02 + 0.98 * (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2); },
    sweep: function (k) { return 1 - Math.pow(1 - k, 2.4); },                       // harai, hane: fast start, long lift
    even:  function (k) { var x = k; return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; },
    enso:  function (k) { if (k < 0.08) return 0.015 * (k / 0.08); var x = (k - 0.08) / 0.92; return 0.015 + 0.985 * (1 - Math.pow(1 - x, 1.7)); }
  };

  function prepare(canvas, opts) {
    var pre = typeof opts.preset === 'string' ? presets[opts.preset] : opts.preset;
    if (!pre) throw new Error('RenseikanBrush: unknown preset ' + opts.preset);
    var box = opts.box || { x: 0, y: 0, w: canvas.clientWidth || canvas.width, h: canvas.clientHeight || canvas.height };
    var r = rng(opts.seed || pre.seed);
    var pts = sample(pre.segs, box, opts.spacing || 2);
    var short = Math.min(box.w, box.h), maxW = (opts.width || pre.width) * short;
    var pf = typeof pre.press === 'string' ? pressure[pre.press] : pre.press;
    var W = function (t) { return maxW * Math.max(0.025, pf(t)); };
    var dry = opts.dryness != null ? opts.dryness : pre.dryness, retouch = opts.retouch != null ? opts.retouch : pre.retouch;
    var nh = opts.hairs || pre.hairs, hairs = [];
    for (var i = 0; i < nh; i++) {
      var u = r() < 0.55 ? gauss(r) * 0.38 : (r() * 2 - 1) * (r() < 0.5 ? 1 : 1.08);
      u = Math.max(-1.2, Math.min(1.2, u));
      var edge = Math.abs(u) > 0.8;
      hairs.push({ u: u, ink: (0.7 + r() * 0.55) * (edge ? 0.85 : 1), rate: 0.7 + r() * 0.7,
        th: (edge ? 0.02 + r() * 0.03 : 0.045 + r() * 0.055) * (1.3 - 0.4 * Math.abs(u)),
        drift: noise(r, 3, 1.5, 7), bounce: noise(r, 4, 5, 16), skip: edge ? 0.35 + r() * 0.4 : 0.6 + r() * 0.35,
        lag: Math.abs(u) * (0.3 + r() * 0.6), alpha: edge ? 0.3 + r() * 0.4 : 0.62 + r() * 0.38 });
    }
    // precompute each hair's position + contact + thickness at every point
    var N = pts.length, tracks = [];
    for (var h = 0; h < hairs.length; h++) {
      var H = hairs[h], xs = new Float32Array(N), ys = new Float32Array(N), on = new Uint8Array(N), th = new Float32Array(N);
      for (var k = 0; k < N; k++) {
        var q = pts[k], t = q.t, w = W(t), back = H.lag * w, j = k;
        while (j > 0 && pts[k].s - pts[j].s < back) j--;
        var base = pts[j], nx = -base.d[1], ny = base.d[0], uu = H.u + 0.06 * H.drift(t), bx = base.p[0], by = base.p[1];
        if (j === 0 && pts[k].s - pts[j].s < back) { var rest = (back - (pts[k].s - pts[j].s)) * 0.3; bx -= base.d[0] * rest; by -= base.d[1] * rest; }
        xs[k] = bx + nx * w * uu; ys[k] = by + ny * w * uu;
        var ink = H.ink - t * dry * H.rate, p = w / maxW;
        var inked = ink + retouch * p * 0.6 > 0.42;
        var skips = H.bounce(t) > H.skip + 0.45 * Math.min(1, ink) + 0.25 * p - 0.5;
        on[k] = (inked && !skips) || t < 0.02 ? 1 : 0;
        th[k] = Math.max(0.25, H.th * maxW * (0.55 + 0.5 * Math.min(1, ink)) * (0.6 + 0.4 * p));
      }
      // taper each contact run: thinner over its first 15% and last 25%
      var start = -1;
      for (var m = 0; m <= N; m++) {
        var isOn = m < N && on[m];
        if (isOn && start < 0) start = m;
        if (!isOn && start >= 0) {
          var len = m - start;
          if (len < 8) { for (var z = start; z < m; z++) th[z] *= 0.6; }
          else { var ta = Math.max(2, Math.floor(len * 0.15)), tb = Math.max(2, Math.floor(len * 0.25));
            for (var z1 = start; z1 < start + ta; z1++) th[z1] *= 0.45; for (var z2 = m - tb; z2 < m; z2++) th[z2] *= 0.4; }
          start = -1;
        }
      }
      tracks.push({ xs: xs, ys: ys, on: on, th: th, alpha: H.alpha });
    }
    // spatter
    var dots = [], ns = opts.spatter != null ? opts.spatter : pre.spatter, mode = pre.spatterMode || 0.85;
    for (var d = 0; d < ns; d++) {
      var a = r(), b = r(), tri = a < mode ? Math.sqrt(a * mode) : 1 - Math.sqrt((1 - a) * (1 - mode));
      var qi = Math.min(N - 1, Math.floor(tri * (N - 1))), qq = pts[qi], ww = Math.max(4, W(qq.t)), nnx = -qq.d[1], nny = qq.d[0];
      var off = (1.2 + r() * 2) * ww * (r() < 0.5 ? 1 : -1), ahead = (-0.5 + r() * 2.5) * ww;
      dots.push({ x: qq.p[0] + nnx * off + qq.d[0] * ahead, y: qq.p[1] + nny * off + qq.d[1] * ahead, r: [0.5, 0.7, 0.9, 1.2, 1.6, 2.2][Math.floor(b * 6)], at: qi });
    }
    // entry pool
    var q0 = pts[Math.min(2, N - 1)], w0 = W(q0.t), pool = { x: q0.p[0] + q0.d[0] * w0 * 0.3, y: q0.p[1] + q0.d[1] * w0 * 0.3, a: w0 * 0.55, b: w0, rot: Math.atan2(q0.d[1], q0.d[0]), skew: 0.35 };
    var inkC = opts.ink || '#1f1c19';
    return { pts: pts, tracks: tracks, dots: dots, pool: pool, ink: inkC, N: N, maxW: maxW, W: W, blend: opts.blend || (isLight(inkC) ? 'screen' : 'multiply') };
  }

  function isLight(color) {
    var m = /^#?([0-9a-f]{6})$/i.exec(String(color).trim()); if (!m) return false;
    var n = parseInt(m[1], 16), r = n >> 16 & 255, g = n >> 8 & 255, b = n & 255;
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 > 0.5;
  }

  function setup(canvas, S) {
    var dpr = Math.min(window.devicePixelRatio || 1, 2), cw = canvas.clientWidth || canvas.width, ch = canvas.clientHeight || canvas.height;
    if (canvas.width !== cw * dpr || canvas.height !== ch * dpr) { canvas.width = cw * dpr; canvas.height = ch * dpr; }
    var ctx = canvas.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = S.ink; ctx.strokeStyle = S.ink; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    return ctx;
  }

  function paintPool(ctx, S) {
    var P = S.pool; ctx.save(); ctx.translate(P.x, P.y); ctx.rotate(P.rot); ctx.transform(1, 0, P.skew, 1, 0, 0);
    ctx.globalAlpha = 0.18; ctx.beginPath(); ctx.ellipse(0, 0, P.a * 1.25, P.b * 1.18, 0, 0, 6.283); ctx.fill();
    ctx.globalAlpha = 0.7; ctx.beginPath(); ctx.ellipse(0, 0, P.a, P.b, 0, 0, 6.283); ctx.fill();
    ctx.restore(); ctx.globalAlpha = 1;
  }
  /* halo: a few core hairs, wide and faint, in three widening passes — ink soaking into the sheet.
     (No canvas filter here: a blur per segment forces a full-canvas blur each call and stalls the animation.) */
  function paintHalo(ctx, S, from, to) {
    var T = S.tracks, step = Math.max(1, Math.floor(T.length / 12)), passes = [[2.2, 0.07], [3.1, 0.045], [4.0, 0.03]];
    ctx.save();
    for (var pI = 0; pI < passes.length; pI++) {
      ctx.globalAlpha = passes[pI][1];
      for (var h = 0; h < T.length; h += step) { var tr = T[h];
        for (var k = Math.max(1, from); k < to; k++) { if (!tr.on[k] || !tr.on[k - 1]) continue;
          ctx.lineWidth = tr.th[k] * passes[pI][0]; ctx.beginPath(); ctx.moveTo(tr.xs[k - 1], tr.ys[k - 1]); ctx.lineTo(tr.xs[k], tr.ys[k]); ctx.stroke(); } }
    }
    ctx.restore();
  }
  /* the wet sheen: the freshest ink gleams darker and glossier right behind the tip, then dries into the body */
  function paintWet(wctx, S, to, lag) {
    var cw = wctx.canvas.clientWidth || wctx.canvas.width, ch = wctx.canvas.clientHeight || wctx.canvas.height;
    wctx.clearRect(0, 0, cw, ch);
    if (to <= 0 || to >= S.N) return;
    var T = S.tracks, M = 22, step = Math.max(1, Math.floor(T.length / 26));
    wctx.lineCap = 'round'; wctx.strokeStyle = S.ink; wctx.fillStyle = S.ink;
    for (var h = 0; h < T.length; h += step) { var tr = T[h];
      for (var k = Math.max(1, to - M); k < to; k++) { if (!tr.on[k] || !tr.on[k - 1]) continue;
        var age = (to - k) / M; wctx.globalAlpha = 0.5 * (1 - age) * (1 - age);
        wctx.lineWidth = tr.th[k] * 1.9; wctx.beginPath(); wctx.moveTo(tr.xs[k - 1], tr.ys[k - 1]); wctx.lineTo(tr.xs[k], tr.ys[k]); wctx.stroke(); } }
    // the loaded tip: the brush belly sits just behind the point of contact, dark at the core and soft at the rim
    var q = S.pts[to - 1], w = S.W(q.t), ang = Math.atan2(q.d[1], q.d[0]), cx = q.p[0] - q.d[0] * w * 0.6, cy = q.p[1] - q.d[1] * w * 0.6;
    var rings = [[0.85, 0.05], [0.72, 0.06], [0.6, 0.08], [0.48, 0.1], [0.36, 0.13], [0.24, 0.16]];
    for (var r2 = 0; r2 < rings.length; r2++) { wctx.globalAlpha = rings[r2][1]; wctx.beginPath(); wctx.ellipse(cx, cy, w * rings[r2][0] * 1.2, w * rings[r2][0], ang, 0, 6.283); wctx.fill(); }
    wctx.globalAlpha = 1;
  }

  /* paint segments [from, to) for every hair; the halo trails the hairs by `lag` points (ink creeping into the sheet) */
  function paint(ctx, S, from, to, lag) {
    lag = lag || 0;
    paintHalo(ctx, S, Math.max(0, from - lag), Math.max(0, to - lag));
    if (from === 0) paintPool(ctx, S);
    var T = S.tracks;
    ctx.globalCompositeOperation = S.blend;   // dark ink multiplies toward black; light ink on a dark sheet screens toward white
    for (var h = 0; h < T.length; h++) {
      var tr = T[h]; ctx.globalAlpha = tr.alpha;
      for (var k = Math.max(1, from); k < to; k++) {
        if (!tr.on[k] || !tr.on[k - 1]) continue;
        ctx.lineWidth = tr.th[k]; ctx.beginPath(); ctx.moveTo(tr.xs[k - 1], tr.ys[k - 1]); ctx.lineTo(tr.xs[k], tr.ys[k]); ctx.stroke();
      }
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 0.75;
    for (var d = 0; d < S.dots.length; d++) { var D = S.dots[d]; if (D.at >= from && D.at < to) { ctx.beginPath(); ctx.arc(D.x, D.y, D.r, 0, 6.283); ctx.fill(); } }
    ctx.globalAlpha = 1;
  }

  /* stroke(canvas, {preset, box, ink, width, dryness, retouch, hairs, spatter, seed}) — paints at once. */
  function stroke(canvas, opts) { var S = prepare(canvas, opts); var ctx = setup(canvas, S); paint(ctx, S, 0, S.N); return S; }

  /* animate(canvas, {…, duration}) — paints along the path over `duration` ms (brush-lift easing); resolves when done.
     Reduced motion: paints at once. */
  function animate(canvas, opts) {
    var S = prepare(canvas, opts), ctx = setup(canvas, S), dur = opts.duration || 900, N = S.N;
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) { paint(ctx, S, 0, N); return Promise.resolve(S); }
    var tf = typeof opts.timing === 'function' ? opts.timing : (timing[opts.timing] || function (x) { return 1 - Math.pow(1 - x, 2.2); });
    var lag = Math.round(N * 0.06), done = 0, t0 = null, wctx = opts.wetCanvas ? setup(opts.wetCanvas, S) : null;
    return new Promise(function (res) {
      function step(now) {
        if (t0 === null) t0 = now;
        var k = Math.min(1, (now - t0) / dur), to = Math.floor(tf(k) * N);
        if (to > done) { paint(ctx, S, done, Math.min(N, to + 1), lag); done = to; }
        if (wctx) paintWet(wctx, S, done, lag);
        if (opts.onTip && done > 0 && done < N) { var q = S.pts[done - 1]; opts.onTip(q.p[0], q.p[1], k, S); }
        if (k < 1) requestAnimationFrame(step);
        else {
          paint(ctx, S, done, N, lag);
          // the trailing halo and the drying of the sheen finish after the brush lifts
          var t1 = null;
          (function dry(n2) { if (t1 === null) t1 = n2; var kk = Math.min(1, (n2 - t1) / 420);
            paintHalo(ctx, S, Math.max(0, N - lag), N); if (wctx) { var cw = opts.wetCanvas.clientWidth || opts.wetCanvas.width, ch = opts.wetCanvas.clientHeight || opts.wetCanvas.height; wctx.globalAlpha = 1; wctx.clearRect(0, 0, cw, ch); }
            if (kk < 1 && false) requestAnimationFrame(dry); else res(S); })(performance.now());
        }
      }
      requestAnimationFrame(step);
    });
  }

  window.RenseikanBrush = { stroke: stroke, animate: animate, presets: presets, pressure: pressure, timing: timing, circle: circle, spline: spline, version: '2.2.1' };
})();
