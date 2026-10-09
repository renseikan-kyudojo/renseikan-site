/* @ds-lib renseikan-wind 1.3.0 — the guiding wind: a flow field with wisps and ink-drawn leaves.
   window.RenseikanWind = { start(canvas, opts) -> { gust(strength), aim(x, y), release(), setInk(color), stop() }, version }
   opts.follow: an element whose pointer the wind follows (the wind eases round to blow toward the cursor; a quick sweep throws a gust).
   A mouse is followed while it hovers; a finger or pen only while it is held down, and the wind lets go the moment it lifts or the
   browser takes the touch to scroll. A resize carries the living scene across (scaled) rather than starting it over, so the address
   bar sliding away on a phone, a pull-to-refresh or a rotation never makes the air jump.

   Wind is a field, not a direction: a steady drift plus the curl of a slowly moving noise potential, so every
   wisp and leaf follows a coherent, curving current. Gusts arrive as waves (a scroll adds one; the air also
   breathes on its own). Wisps are the trails of invisible particles: tapered, fading, longer when the air
   moves faster. Petals are ink silhouettes (sakura petal and blossom, California poppy petal and cup) pre-drawn once, that tumble in three
   dimensions (a flip around their own axis changes how much of them you see), flutter sideways, spin, drift
   down a little, and are lifted and spun by gusts. Reduced motion: one still frame. No dependencies. */
(function () {
  'use strict';

  function rng(seed) { var s = seed >>> 0 || 1; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

  /* potential field P(x,y,t) = sum of travelling sines; the flow is base + curl(P) so it is divergence-free (air-like) */
  function makeField(r) {
    var waves = [];
    for (var i = 0; i < 5; i++) waves.push({ kx: (0.5 + r()) * 0.004, ky: (0.5 + r()) * 0.006, w: (0.3 + r()) * 0.0006, ph: r() * 6.28, a: 40 + r() * 60 });
    return function (x, y, t, out, dir) {
      var dPdx = 0, dPdy = 0;
      for (var i = 0; i < waves.length; i++) { var W = waves[i], c = Math.cos(W.kx * x + W.ky * y + W.w * t + W.ph) * W.a; dPdx += c * W.kx; dPdy += c * W.ky; }
      out[0] = dir[0] + dPdy; out[1] = dir[1] - dPdx;   // steady drift along `dir`, plus curl
      return out;
    };
  }

  /* ---- sprites: ink silhouettes of sakura and California poppy, drawn once per colour ----
     sakura-petal: a single petal, notched at the tip, the classic shape of hanafubuki
     sakura:       the whole blossom, five notched petals round a small centre
     poppy-petal:  one California poppy petal, a broad fan with a soft ruffled edge
     poppy:        the four-petal cup seen from above, petals overlapping */
  function leafSprite(kind, size, ink, r) {
    var c = document.createElement('canvas'), s = size, ctx; c.width = s * 2; c.height = s * 2; ctx = c.getContext('2d');
    ctx.translate(s, s); ctx.fillStyle = ink; ctx.strokeStyle = ink; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    var h = s * 0.92;
    function sakuraPetal(scale, alpha) {
      // base at (0, h), tip with a notch at (0, -h)
      var w = h * 0.78 * scale, L = h * scale;
      ctx.globalAlpha = alpha; ctx.beginPath(); ctx.moveTo(0, L);
      ctx.bezierCurveTo(-w * 0.55, L * 0.75, -w * 1.1, -L * 0.2, -w * 0.72, -L * 0.78);
      ctx.quadraticCurveTo(-w * 0.5, -L * 1.0, -w * 0.3, -L * 0.96);
      ctx.quadraticCurveTo(-w * 0.1, -L * 0.9, 0, -L * 0.62);                   // the notch, deep and soft
      ctx.quadraticCurveTo(w * 0.1, -L * 0.9, w * 0.3, -L * 0.96);
      ctx.quadraticCurveTo(w * 0.5, -L * 1.0, w * 0.72, -L * 0.78);
      ctx.bezierCurveTo(w * 1.1, -L * 0.2, w * 0.55, L * 0.75, 0, L); ctx.fill();
    }
    function poppyPetal(scale, alpha) {
      // narrow base at (0, h), broad ruffled rim across the top
      var w = h * 1.15 * scale, L = h * scale;   // a fan: wider than it is long
      ctx.globalAlpha = alpha; ctx.beginPath(); ctx.moveTo(0, L);
      ctx.bezierCurveTo(-w * 0.35, L * 0.75, -w * 0.95, L * 0.15, -w * 1.0, -L * 0.35);
      ctx.quadraticCurveTo(-w * 0.78, -L * 0.72, -w * 0.5, -L * 0.62);            // a gently waved rim
      ctx.quadraticCurveTo(-w * 0.25, -L * 0.86, 0, -L * 0.7);
      ctx.quadraticCurveTo(w * 0.25, -L * 0.86, w * 0.5, -L * 0.62);
      ctx.quadraticCurveTo(w * 0.78, -L * 0.72, w * 1.0, -L * 0.35);
      ctx.bezierCurveTo(w * 0.95, L * 0.15, w * 0.35, L * 0.75, 0, L); ctx.fill();
    }
    if (kind === 'sakura-petal') {
      sakuraPetal(1, 0.72);
      ctx.globalAlpha = 0.45; ctx.strokeStyle = '#f6f1e7'; ctx.lineWidth = Math.max(0.6, s * 0.05);
      ctx.beginPath(); ctx.moveTo(0, h * 0.85); ctx.quadraticCurveTo(-h * 0.06, 0, 0, -h * 0.55); ctx.stroke();   // the faint midline
    } else if (kind === 'sakura') {
      for (var k = 0; k < 5; k++) { ctx.save(); ctx.rotate(k * 1.2566); ctx.translate(0, -h * 0.52); sakuraPetal(0.5, 0.78); ctx.restore(); }
      ctx.globalAlpha = 0.9; ctx.beginPath(); ctx.arc(0, 0, h * 0.11, 0, 6.283); ctx.fill();
      ctx.globalAlpha = 0.5; ctx.strokeStyle = '#f6f1e7'; ctx.lineWidth = Math.max(0.5, s * 0.04);
      for (var st = 0; st < 5; st++) { var a = st * 1.2566 - 1.5708; ctx.beginPath(); ctx.moveTo(Math.cos(a) * h * 0.14, Math.sin(a) * h * 0.14); ctx.lineTo(Math.cos(a) * h * 0.34, Math.sin(a) * h * 0.34); ctx.stroke(); }   // stamens
    } else if (kind === 'poppy-petal') {
      poppyPetal(1, 0.7);
      ctx.globalAlpha = 0.35; ctx.strokeStyle = '#f6f1e7'; ctx.lineWidth = Math.max(0.5, s * 0.04);
      for (var v = -1; v <= 1; v++) { ctx.beginPath(); ctx.moveTo(0, h * 0.8); ctx.quadraticCurveTo(v * h * 0.3, 0, v * h * 0.62, -h * 0.5); ctx.stroke(); }   // the fan's veins
    } else {   // poppy: four petals round the cup
      for (var q = 0; q < 4; q++) { ctx.save(); ctx.rotate(q * 1.5708 + 0.785); ctx.translate(0, -h * 0.3); poppyPetal(0.62, 1.0); ctx.restore(); }
      ctx.globalAlpha = 1; ctx.strokeStyle = '#f6f1e7'; ctx.lineWidth = Math.max(0.8, s * 0.07);
      for (var sm = 0; sm < 4; sm++) { var sa = sm * 1.5708 + 0.785 + 0.785; ctx.beginPath(); ctx.moveTo(Math.cos(sa) * h * 0.1, Math.sin(sa) * h * 0.1); ctx.lineTo(Math.cos(sa) * h * 0.95, Math.sin(sa) * h * 0.95); ctx.stroke(); }   // seams between the petals
      ctx.globalAlpha = 0.6; ctx.lineWidth = Math.max(0.5, s * 0.04);
      for (var vn = 0; vn < 4; vn++) { var va = vn * 1.5708 + 0.785; ctx.beginPath(); ctx.moveTo(Math.cos(va) * h * 0.14, Math.sin(va) * h * 0.14); ctx.lineTo(Math.cos(va) * h * 0.7, Math.sin(va) * h * 0.7); ctx.stroke(); }   // a vein down each petal
      ctx.globalAlpha = 1; ctx.fillStyle = '#f6f1e7'; ctx.beginPath(); ctx.arc(0, 0, h * 0.1, 0, 6.283); ctx.fill(); ctx.fillStyle = ink; ctx.beginPath(); ctx.arc(0, 0, h * 0.05, 0, 6.283); ctx.fill();
    }
    return c;
  }

  function start(canvas, opts) {
    opts = opts || {};
    var r = rng(opts.seed || 7), field = makeField(r), ctx = canvas.getContext('2d');
    var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    var ink = opts.ink || '#1f1c19', w = 0, h = 0, dpr = 1, running = true, t = 0, last = 0;
    var gust = 0, gustTarget = 0, gustS = -1, breathPh = r() * 6.28, sprites = {}, wisps = [], leaves = [], tmp = [0, 0];
    var HOME = [1, 0.12], dir = [1, 0.12], aimDir = null, aimAt = 0, ptr = { x: 0, y: 0, t: 0 };
    var TAU_DIR = 1400, TAU_UP = 320, TAU_DOWN = 1900;   // breathing time constants (ms): slow to turn, swell a gust, slower to let it go
    var density = opts.density == null ? 1 : opts.density;

    function size() {
      var nd = Math.min(window.devicePixelRatio || 1, 2), nw = canvas.clientWidth || canvas.width, nh = canvas.clientHeight || canvas.height;
      if (!nw || !nh) return;                                   // not laid out (hidden): keep what we have
      if (nw === w && nh === h && nd === dpr) return;           // phones fire resize as the address bar slides; the canvas itself has not changed
      var ow = w, oh = h; dpr = nd; w = nw; h = nh;
      canvas.width = w * dpr; canvas.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!ow || !oh) seed(); else reflow(ow, oh);
    }
    /* the canvas changed size under a living scene: carry everything across, scaled, then top up or thin out to the new density */
    function reflow(ow, oh) {
      var sx = w / ow, sy = h / oh, i, k;
      for (i = 0; i < wisps.length; i++) { var p = wisps[i]; p.x *= sx; p.y *= sy; for (k = 0; k < p.hist.length; k += 2) { p.hist[k] *= sx; p.hist[k + 1] *= sy; } }
      for (i = 0; i < leaves.length; i++) { leaves[i].x *= sx; leaves[i].y *= sy; }
      var nw = Math.round(w / 22 * density), nl = Math.round(w / 110 * density);
      while (wisps.length < nw) { var q = wisp(true); q.life = r() * q.ttl; wisps.push(q); }
      while (leaves.length < nl) leaves.push(leaf(true));
      if (wisps.length > Math.round(nw * 1.8)) wisps.length = Math.round(nw * 1.8);
      if (leaves.length > nl) leaves.length = nl;
    }
    function makeSprites() { var kinds = ['sakura-petal', 'sakura', 'poppy-petal', 'poppy']; sprites = {}; for (var i = 0; i < kinds.length; i++) sprites[kinds[i]] = [leafSprite(kinds[i], 10, ink, r), leafSprite(kinds[i], 16, ink, r), leafSprite(kinds[i], 24, ink, r)]; }
    /* a point just outside the canvas on the side the wind comes from, spread along that edge */
    function upwind(margin) {
      var cx = w / 2, cy = h / 2, R = Math.hypot(w, h) / 2 + margin, px = -dir[1], py = dir[0], along = (r() - 0.5) * (Math.abs(px) * w + Math.abs(py) * h) * 1.1;
      return [cx - dir[0] * R + px * along, cy - dir[1] * R + py * along];
    }
    function wisp(anywhere) {
      var depth = r();
      var up = upwind(20 + r() * 60);
      return { x: anywhere ? r() * w : up[0], y: anywhere ? r() * h : up[1], depth: depth, speed: 0.8 + depth * 1.1, a: 0.08 + depth * 0.17,
        life: 0, ttl: 2600 + r() * 3600, hist: [], n: 14 + Math.floor(depth * 24), width: 0.5 + depth * 1.0 };
    }
    function leaf(anywhere) {
      var kinds = ['sakura-petal', 'sakura-petal', 'sakura-petal', 'poppy-petal', 'poppy-petal', 'sakura', 'poppy'], kind = kinds[Math.floor(r() * kinds.length)], depth = r();
      var up = upwind(30 + r() * 80);
      return { kind: kind, sz: Math.floor(depth * 2.999), x: anywhere ? r() * w : up[0], y: anywhere ? r() * h * 0.9 : up[1], depth: depth,
        vx: 0, vy: 0, rot: r() * 6.28, rotV: (r() - 0.5) * 0.005, flip: r() * 6.28, flipV: 0.0025 + r() * 0.005, flut: r() * 6.28, flutF: 0.005 + r() * 0.006,
        a: 0.35 + depth * 0.5, drag: 0.02 + depth * 0.03 };
    }
    function seed() {
      wisps = []; leaves = [];
      var nw = Math.round(w / 22 * density), nl = Math.round(w / 110 * density);
      for (var i = 0; i < nw; i++) { var p = wisp(true); p.life = r() * p.ttl; wisps.push(p); }
      for (var j = 0; j < nl; j++) leaves.push(leaf(true));
    }
    function windAt(x, y) {
      field(x, y, t, tmp, dir);
      // the air breathes: a slow swell and ebb (about a 9 s cycle) with a lighter second rhythm over it
      var breath = 0.75 + 0.3 * Math.sin(t * 0.0007 + breathPh) + 0.12 * Math.sin(t * 0.0019 + breathPh * 2);
      // a gust is a wave front travelling along the wind; air just behind the front moves fastest
      var g = 0;
      if (gust > 0.01) { var d = (x * dir[0] + y * dir[1]) - gustS; g = gust * Math.exp(-(d * d) / (2 * 260 * 260)) * (d < 0 ? 1 : 0.35); }
      var k = breath + g * 2.4;
      tmp[0] *= k; tmp[1] = tmp[1] * k + g * -0.25;   // gusts lift
      return tmp;
    }
    function ease(cur, target, dt, tau) { return cur + (target - cur) * (1 - Math.exp(-dt / tau)); }
    /* projection of the canvas onto the wind direction: [min, max] */
    function span() { var c = [0, w, 0, w], d = [0, 0, h, h], lo = Infinity, hi = -Infinity; for (var i = 0; i < 4; i++) { var v = c[i] * dir[0] + d[i] * dir[1]; if (v < lo) lo = v; if (v > hi) hi = v; } return [lo, hi]; }
    function step(dt) {
      t += dt;
      // direction eases round toward the aim (or home when the pointer has gone); never snaps
      var want = aimDir || HOME;
      dir[0] = ease(dir[0], want[0], dt, TAU_DIR); dir[1] = ease(dir[1], want[1], dt, TAU_DIR);
      var m = Math.hypot(dir[0], dir[1]) || 1; dir[0] /= m; dir[1] /= m;
      // a gust swells in, then is let go slowly
      gust = ease(gust, gustTarget, dt, gust < gustTarget ? TAU_UP : TAU_DOWN);
      gustTarget = ease(gustTarget, 0, dt, TAU_DOWN);
      if (gust > 0.01) {
        gustS += dt * 0.75;
        var sp = span();
        if (gustS > sp[1] + 500) { gust = 0; gustTarget = 0; }
        // the front tears loose a few extra wisps as it passes: spawn on the front line, inside the canvas
        if (gust > 0.25 && r() < gust * 0.5 && gustS > sp[0] - 150 && gustS < sp[1]) {
          var b = wisp(false), px = r() * w, py = r() * h, proj = px * dir[0] + py * dir[1], shift = gustS - 120 + r() * 160 - proj;
          b.x = px + dir[0] * shift; b.y = py + dir[1] * shift;
          if (b.x < -60 || b.x > w + 60 || b.y < -60 || b.y > h + 60) { b.x = px; b.y = py; }
          b.ttl = 1400 + r() * 1200; b.a *= 1.4; wisps.push(b);
        }
        if (wisps.length > Math.round(w / 22 * density) * 1.8) wisps.splice(0, 1);
      }
      // wisps: particles with a short memory; the memory is what you see
      for (var i = 0; i < wisps.length; i++) {
        var p = wisps[i], v = windAt(p.x, p.y), sp = p.speed * dt * 0.09;
        p.x += v[0] * sp; p.y += v[1] * sp; p.life += dt;
        p.hist.push(p.x, p.y); if (p.hist.length > p.n * 2) p.hist.splice(0, 2);
        if (p.x > w + 80 || p.x < -80 || p.y > h + 80 || p.y < -80 || p.life > p.ttl) wisps[i] = wisp(false);
      }
      // leaves: carried by the air with drag, tumbling, fluttering, settling
      for (var j = 0; j < leaves.length; j++) {
        var L = leaves[j], vw = windAt(L.x, L.y), target = 0.055 * (0.5 + L.depth);
        L.vx += (vw[0] * target - L.vx) * L.drag * dt * 0.12; L.vy += ((vw[1] * target + 0.008) - L.vy) * L.drag * dt * 0.12;
        L.flut += L.flutF * dt; L.flip += L.flipV * dt * (1 + Math.abs(vw[0]) * 0.4); L.rot += L.rotV * dt * (1 + Math.abs(vw[0]));
        L.x += L.vx * dt + Math.sin(L.flut) * 0.05 * dt * 0.3; L.y += L.vy * dt + Math.cos(L.flut * 0.7) * 0.03 * dt * 0.3;
        if (L.x > w + 90 || L.x < -90 || L.y > h + 90 || L.y < -90) leaves[j] = leaf(false);
      }
    }
    function draw() {
      ctx.clearRect(0, 0, w, h); ctx.lineCap = 'round'; ctx.strokeStyle = ink;
      for (var i = 0; i < wisps.length; i++) {
        var p = wisps[i], hs = p.hist, n = hs.length / 2; if (n < 3) continue;
        var fade = Math.min(1, p.life / 600) * Math.min(1, (p.ttl - p.life) / 800);
        for (var k = 1; k < n; k++) {
          var q = k / n; ctx.globalAlpha = p.a * fade * q * q; ctx.lineWidth = p.width * (0.3 + q);
          ctx.beginPath(); ctx.moveTo(hs[(k - 1) * 2], hs[(k - 1) * 2 + 1]); ctx.lineTo(hs[k * 2], hs[k * 2 + 1]); ctx.stroke();
        }
      }
      for (var j = 0; j < leaves.length; j++) {
        var L = leaves[j], sp = sprites[L.kind][L.sz], face = Math.cos(L.flip);   // edge-on when cos ~ 0
        ctx.save(); ctx.translate(L.x, L.y); ctx.rotate(L.rot); ctx.scale(1, Math.max(0.08, Math.abs(face)));
        ctx.globalAlpha = L.a * (0.55 + 0.45 * Math.abs(face));                   // a leaf seen flat is darker than one seen on edge
        ctx.drawImage(sp, -sp.width / 2, -sp.height / 2); ctx.restore();
      }
      ctx.globalAlpha = 1;
    }
    function loop(now) { if (!running) return; var dt = Math.min(now - (last || now), 50); last = now; step(dt); draw(); requestAnimationFrame(loop); }

    makeSprites(); size();
    if (reduce) { for (var s0 = 0; s0 < 120; s0++) step(16); draw(); }
    else requestAnimationFrame(loop);
    // resizes are coalesced to one per frame; the canvas is also watched directly, since the hero grows when its fonts arrive
    var resizeQueued = false, ro = null;
    var onResize = function () { if (resizeQueued) return; resizeQueued = true; requestAnimationFrame(function () { resizeQueued = false; size(); draw(); }); };
    window.addEventListener('resize', onResize);
    if (window.ResizeObserver) { ro = new ResizeObserver(onResize); ro.observe(canvas); }
    // coming back to the tab (or from a reload gesture) starts the clock afresh instead of taking one long step
    var onVisible = function () { last = 0; };
    document.addEventListener('visibilitychange', onVisible);

    /* aim: the wind turns, slowly, to blow toward a point (canvas coordinates); release: it drifts home */
    function aim(x, y) {
      var cx = w / 2, cy = h / 2, dx = x - cx, dy = y - cy, m = Math.hypot(dx, dy);
      if (m < 24) return;
      aimDir = [dx / m, dy / m + 0.06]; aimAt = t;
    }
    function release() { aimDir = null; }
    var follow = opts.follow, onDown = null, onMove = null, onUp = null, held = false;
    if (follow) {
      var local = function (e) { var rect = canvas.getBoundingClientRect(); return [e.clientX - rect.left, e.clientY - rect.top]; };
      var track = function (x, y, now, mouse) {
        aim(x, y);
        // a quick sweep of the hand throws a gust along the wind; a finger moves faster than a mouse, so it takes a real flick
        if (ptr.t) {
          var dtp = now - ptr.t, v = Math.hypot(x - ptr.x, y - ptr.y) / Math.max(1, dtp), lim = mouse ? 1.6 : 2.4;
          if (dtp > 30 && v > lim) api.gust(Math.min(mouse ? 0.6 : 0.45, (v - lim) * 0.25));
        }
        ptr.x = x; ptr.y = y; ptr.t = now;
      };
      onDown = function (e) {
        var p = local(e); ptr.x = p[0]; ptr.y = p[1]; ptr.t = performance.now();   // speed is measured from here, never from where the last touch ended
        if (e.pointerType !== 'mouse') { held = true; aim(p[0], p[1]); }           // a finger or pen is followed only while it is down
      };
      onMove = function (e) {
        if (e.pointerType !== 'mouse' && !held) return;                            // a hovering pen, or a touch the browser already took to scroll
        var p = local(e); track(p[0], p[1], performance.now(), e.pointerType === 'mouse');
      };
      // pointerup and pointercancel (the browser took the touch to scroll or refresh) let a finger go; a mouse is let go only when it leaves
      onUp = function (e) { if (e.type === 'pointerleave' || e.pointerType !== 'mouse') { held = false; release(); ptr.t = 0; } };
      follow.addEventListener('pointerdown', onDown, { passive: true });
      follow.addEventListener('pointermove', onMove, { passive: true });
      follow.addEventListener('pointerup', onUp, { passive: true });
      follow.addEventListener('pointercancel', onUp, { passive: true });
      follow.addEventListener('pointerleave', onUp, { passive: true });
    }

    var api = {
      gust: function (strength) {
        gustTarget = Math.min(1, gustTarget + (strength == null ? 0.5 : strength));
        var sp = span();
        if (gust < 0.05 || gustS < sp[0] - 250 || gustS > sp[1]) gustS = sp[0] - 200;   // a new front starts at the upwind edge
      },
      aim: aim, release: release,
      setInk: function (color) { ink = color; makeSprites(); draw(); },
      stop: function () {
        running = false; window.removeEventListener('resize', onResize); document.removeEventListener('visibilitychange', onVisible); if (ro) ro.disconnect();
        if (follow) { follow.removeEventListener('pointerdown', onDown); follow.removeEventListener('pointermove', onMove); follow.removeEventListener('pointerup', onUp); follow.removeEventListener('pointercancel', onUp); follow.removeEventListener('pointerleave', onUp); }
      }
    };
    return api;
  }

  window.RenseikanWind = { start: start, sprite: function (kind, size, ink) { return leafSprite(kind, size, ink || '#1f1c19', rng(3)); }, version: '1.3.0' };
})();
