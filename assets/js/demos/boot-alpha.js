/* ==========================================================================
   boot-alpha.js — Chapter 5, §5.2: the bootstrap on the Portfolio example.

   Left:   the 100 real X/Y returns and the estimate α̂ built from them.
   Middle: a histogram of α̂ — either from 1,000 *fresh* datasets drawn from
           the population (which real data never lets you do) or from B
           *bootstrap* samples of this one dataset (which it does).
   Right:  the two distributions as boxplots, side by side, the way the
           book's Figure 5.10 puts them.  The point of the section: the
           bootstrap spread tracks the fresh-sample spread without needing
           a population to sample from.
   ========================================================================== */
(function () {
  'use strict';
  var cvS = document.getElementById('cv-boot-scatter');
  var cvH = document.getElementById('cv-boot-hist');
  var cvB = document.getElementById('cv-boot-box');
  if (!cvS || !cvH || !cvB || typeof Plot === 'undefined') return;

  var P = window.CH05_PORTFOLIO;
  if (!P) return;

  var TRUE_ALPHA = 0.6;                 // σY²=1.25, σXY=0.5, σX²=1 → (5.6)
  var N = P.x.length;                   // 100
  var SIMS = 1000;

  function meanOf(a) {
    var s = 0;
    for (var i = 0; i < a.length; i++) s += a[i];
    return s / a.length;
  }

  // eq. (5.7) on the given rows
  function alphaOf(xs, ys, idx) {
    var n = idx ? idx.length : xs.length;
    var mx = 0, my = 0, i;
    for (i = 0; i < n; i++) {
      var j = idx ? idx[i] : i;
      mx += xs[j]; my += ys[j];
    }
    mx /= n; my /= n;
    var sxx = 0, syy = 0, sxy = 0;
    for (i = 0; i < n; i++) {
      var k = idx ? idx[i] : i;
      var dx = xs[k] - mx, dy = ys[k] - my;
      sxx += dx * dx; syy += dy * dy; sxy += dx * dy;
    }
    sxx /= (n - 1); syy /= (n - 1); sxy /= (n - 1);
    return { alpha: (syy - sxy) / (sxx + syy - 2 * sxy), sxx: sxx, syy: syy, sxy: sxy };
  }

  function sdOf(a) {
    var m = meanOf(a), s = 0;
    for (var i = 0; i < a.length; i++) s += (a[i] - m) * (a[i] - m);
    return Math.sqrt(s / (a.length - 1));
  }

  var full = alphaOf(P.x, P.y);
  var ALPHA_HAT = full.alpha;

  var state = { mode: 'sim', B: 1000, seed: 5, fresh: [], boot: [] };

  function freshSamples(seed) {
    var rnd = mulberry32(seed), out = [];
    for (var r = 0; r < SIMS; r++) {
      var xs = [], ys = [];
      for (var i = 0; i < N; i++) {
        var x = gauss(rnd);
        xs.push(x);
        ys.push(0.5 * x + gauss(rnd));      // σX²=1, σY²=1.25, σXY=0.5
      }
      out.push(alphaOf(xs, ys).alpha);
    }
    return out;
  }

  function bootSamples(seed, B) {
    var rnd = mulberry32(seed), out = [];
    for (var r = 0; r < B; r++) {
      var idx = [];
      for (var i = 0; i < N; i++) idx.push(Math.floor(rnd() * N));
      out.push(alphaOf(P.x, P.y, idx).alpha);
    }
    return out;
  }

  function set(id, html) {
    var el = document.getElementById(id);
    if (el) el.innerHTML = html;
  }

  function shown() { return state.mode === 'sim' ? state.fresh : state.boot; }

  /* ------------------------------------------------------------- scatter */
  var plotS = new Plot(cvS, {
    range: { xmin: -3, xmax: 3, ymin: -3, ymax: 3.4 },
    height: 320,
    xlabel: 'return X',
    ylabel: 'return Y',
    draw: function (p) {
      var col = p.colors;
      p.axes();
      var pts = [];
      for (var i = 0; i < N; i++) pts.push([P.x[i], P.y[i]]);
      p.points(pts, { color: col.accent, r: 4, alpha: 0.75 });

      p.text('100 real returns for investments X and Y',
        -2.9, 3.1, { color: col.fg, font: '11.5px system-ui' });
      p.text('σ̂X² = ' + full.sxx.toFixed(3) + '  σ̂Y² = ' + full.syy.toFixed(3) +
        '  σ̂XY = ' + full.sxy.toFixed(3), -2.9, -2.75,
      { color: col.axis, font: '11px system-ui' });
      p.dot(-2.6, -3.05, { r: 5, color: col.accent, ring: col.surface });
      p.text('α̂ = ' + ALPHA_HAT.toFixed(4), -2.4, -3.05, { color: col.fg });
    }
  });

  /* ----------------------------------------------------------- histogram */
  var plotH = new Plot(cvH, {
    range: { xmin: 0.3, xmax: 0.95, ymin: 0, ymax: 100 },
    height: 320,
    xlabel: 'estimate of α',
    ylabel: 'how often',
    draw: function (p) {
      var col = p.colors;
      var arr = shown();
      var lo = 0.3, hi = 0.95;
      var bins = 32, counts = [];
      for (var b = 0; b < bins; b++) counts.push(0);
      arr.forEach(function (v) {
        var t = Math.floor((v - lo) / (hi - lo) * bins);
        if (t < 0 || t >= bins) return;
        counts[t]++;
      });
      var max = 1;
      counts.forEach(function (c) { max = Math.max(max, c); });
      p.range.ymin = 0;
      p.range.ymax = max * 1.35;
      p.axes();

      var w = (hi - lo) / bins;
      counts.forEach(function (c, b2) {
        if (!c) return;
        var x0 = lo + b2 * w;
        p.cell(x0, x0 + w, 0, c, col.accent, 0.75);
      });

      var m = meanOf(arr);
      if (state.mode === 'sim') {
        p.vline(TRUE_ALPHA, { color: col.accent2, width: 2.4 });
        p.text('true α = 0.6', TRUE_ALPHA, p.range.ymax * 0.95,
          { align: 'center', base: 'top', color: col.accent2, font: '11.5px system-ui' });
        p.vline(m, { color: col.fg, width: 1.6, dash: [5, 4] });
        p.text('average = ' + m.toFixed(4), m, p.range.ymax * 0.84,
          { align: 'center', base: 'top', color: col.fg, font: '11.5px system-ui' });
        p.text('1,000 fresh datasets from the population', lo + 0.01, p.range.ymax * 0.72,
          { base: 'top', color: col.axis, font: '11px system-ui' });
        set('ba-se', 'SE from 1,000 fresh datasets: <b>' + sdOf(arr).toFixed(4) + '</b>');
        set('ba-mean', 'average of the 1,000 estimates: <b>' + m.toFixed(4) +
          '</b> (true 0.6)');
        set('ba-count', 'fresh datasets drawn: <b>' + arr.length + '</b>');
      } else {
        p.vline(ALPHA_HAT, { color: col.accent2, width: 2.4 });
        p.text('α̂ from this data set = ' + ALPHA_HAT.toFixed(4), ALPHA_HAT,
          p.range.ymax * 0.95,
          { align: 'center', base: 'top', color: col.accent2, font: '11.5px system-ui' });
        p.vline(m, { color: col.fg, width: 1.6, dash: [5, 4] });
        p.text('average = ' + m.toFixed(4), m, p.range.ymax * 0.84,
          { align: 'center', base: 'top', color: col.fg, font: '11.5px system-ui' });
        p.text('B = ' + arr.length + ' bootstrap samples of the one data set',
          lo + 0.01, p.range.ymax * 0.72,
          { base: 'top', color: col.axis, font: '11px system-ui' });
        set('ba-se', 'bootstrap SE (eq. 5.8): <b>' + sdOf(arr).toFixed(4) + '</b>');
        set('ba-mean', 'average of the bootstrap estimates: <b>' + m.toFixed(4) + '</b>');
        set('ba-count', 'bootstrap samples: <b>' + arr.length + '</b>');
      }
    }
  });

  /* ------------------------------------------------------------- boxplots */
  function quart(a) {
    var s = a.slice().sort(function (x, y) { return x - y; });
    function q(f) {
      var pos = (s.length - 1) * f, base = Math.floor(pos), rest = pos - base;
      return s[base + 1] !== undefined ? s[base] + rest * (s[base + 1] - s[base]) : s[base];
    }
    return { lo: s[0], q1: q(0.25), med: q(0.5), q3: q(0.75), hi: s[s.length - 1] };
  }

  var plotB = new Plot(cvB, {
    range: { xmin: 0.3, xmax: 0.95, ymin: 0, ymax: 2 },
    height: 200,
    draw: function (p) {
      var col = p.colors;
      p.range.ymin = -0.2;
      p.range.ymax = 2.4;
      p.o.noYTicks = true;
      p.o.noXTicks = false;
      p.o.xlabel = 'estimate of α';
      p.axes();

      function box(arr, y, label, color, refLine) {
        var q = quart(arr);
        p.line([[q.lo, y], [q.hi, y]], { color: color, width: 1.6 });
        p.line([[q.lo, y - 0.14], [q.lo, y + 0.14]], { color: color, width: 1.6 });
        p.line([[q.hi, y - 0.14], [q.hi, y + 0.14]], { color: color, width: 1.6 });
        p.cell(q.q1, q.q3, y - 0.26, y + 0.26, color, 0.35);
        p.line([[q.med, y - 0.26], [q.med, y + 0.26]], { color: color, width: 2.6 });
        p.vline(refLine, { color: col.accent2, width: 2, dash: [5, 4] });
        p.text(label, 0.305, y + 0.55, { align: 'left', color: col.fg, font: '11.5px system-ui' });
        p.text('median ' + q.med.toFixed(3), q.med, y - 0.44,
          { align: 'center', base: 'top', color: col.fg, font: '10.5px system-ui' });
      }
      box(state.fresh, 1.7, 'fresh samples', col.accent, TRUE_ALPHA);
      box(state.boot, 0.55, 'bootstrap samples', col.accent, ALPHA_HAT);
      p.text('red dashed: 0.6 (true) and α̂ = ' + ALPHA_HAT.toFixed(4),
        p.range.xmax, 0.02,
        { align: 'right', base: 'bottom', color: col.accent2, font: '10.5px system-ui' });
    }
  });

  /* ------------------------------------------------------------ controls */
  function syncMode() {
    ['sim', 'boot'].forEach(function (m) {
      var b = document.getElementById('ba-mode-' + m);
      if (b) b.setAttribute('aria-pressed', String(m === state.mode));
    });
  }

  ['sim', 'boot'].forEach(function (m) {
    var el = document.getElementById('ba-mode-' + m);
    if (!el) return;
    el.addEventListener('click', function () {
      state.mode = m;
      syncMode();
      plotH.render();
    });
  });

  var slider = document.getElementById('ba-b');
  if (slider) slider.addEventListener('input', function () {
    state.B = parseInt(this.value, 10);
    state.boot = bootSamples(state.seed, state.B);
    renderBread();
    if (state.mode === 'boot') plotH.render();
    plotB.render();
  });

  var rerun = document.getElementById('ba-rerun');
  if (rerun) rerun.addEventListener('click', function () {
    state.seed += 61;
    state.fresh = freshSamples(state.seed);
    state.boot = bootSamples(state.seed + 1, state.B);
    renderAll();
  });

  function renderBread() {
    set('ba-bread', 'B = <b>' + state.B + '</b>');
  }

  function renderAll() {
    renderBread();
    set('ba-alpha', 'α̂ on all 100 rows = <b>' + ALPHA_HAT.toFixed(4) + '</b>');
    plotH.render();
    plotB.render();
  }

  state.fresh = freshSamples(state.seed);
  state.boot = bootSamples(state.seed + 1, state.B);
  syncMode();
  renderAll();
})();
