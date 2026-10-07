/* ==========================================================================
   boot-reg.js — Chapter 5, §5.2: bootstrap standard errors for a fit.

   Auto data, mpg ~ horsepower — the same fit as Section 3.1's formula,
   but this time the standard errors come from resampling: draw B bootstrap
   data sets (n draws with replacement, over and over), refit on each, and
   read the spread of the answers off the histogram.  Then compare with the
   analytic SE from Chapter 3: if the two bands agree, the shortcut works.
   ========================================================================== */
(function () {
  'use strict';
  var cvL = document.getElementById('cv-bootreg-lines');
  var cvH = document.getElementById('cv-bootreg-hist');
  if (!cvL || !cvH || typeof Plot === 'undefined' || typeof Stats === 'undefined') return;

  var A = window.CH03_AUTO;
  var xs = A.horsepower, ys = A.mpg, n = xs.length;      // 392
  var KEEP_LINES = 50;

  function fit(idx) {
    var sxx = 0, sxy = 0, sx = 0, sy = 0, m;
    for (m = 0; m < idx.length; m++) {
      var x = xs[idx[m]], y = ys[idx[m]];
      sx += x; sy += y; sxx += x * x; sxy += x * y;
    }
    var nn = idx.length;
    var den = nn * sxx - sx * sx;
    var b1 = (nn * sxy - sx * sy) / den;
    var b0 = sy / nn - b1 * sx / nn;
    return [b0, b1];
  }

  // the analytic answers, straight from Chapter 3's machinery
  var ALL = [];
  for (var i = 0; i < n; i++) ALL.push(i);
  var ana = Stats.ols(ALL.map(function (j) { return [1, xs[j]]; }), ys);

  var state = { B: 1000, seed: 5, b0: [], b1: [], lines: [] };

  function bootstrap(seed, B) {
    var rnd = mulberry32(seed), b0 = [], b1 = [], lines = [];
    for (var r = 0; r < B; r++) {
      var idx = [];
      for (var m = 0; m < n; m++) idx.push(Math.floor(rnd() * n));
      var f = fit(idx);
      b0.push(f[0]);
      b1.push(f[1]);
      if (lines.length < KEEP_LINES && r % Math.max(1, Math.floor(B / KEEP_LINES)) === 0) {
        lines.push(f);
      }
    }
    return { b0: b0, b1: b1, lines: lines };
  }

  function sdOf(a) {
    var m = a.reduce(function (s, v) { return s + v; }, 0) / a.length;
    var v = a.reduce(function (s, x) { return s + (x - m) * (x - m); }, 0) / (a.length - 1);
    return Math.sqrt(v);
  }

  function set(id, html) {
    var el = document.getElementById(id);
    if (el) el.innerHTML = html;
  }

  /* --------------------------------------------------------------- lines */
  var plotL = new Plot(cvL, {
    range: { xmin: 40, xmax: 250, ymin: 0, ymax: 50 },
    height: 320,
    xlabel: 'horsepower',
    ylabel: 'miles per gallon',
    draw: function (p) {
      var col = p.colors;
      p.axes();
      var pts = [];
      for (var i = 0; i < n; i++) pts.push([xs[i], ys[i]]);
      p.points(pts, { color: '#3b82f6', r: 3, alpha: 0.55 });

      // a handful of the bootstrap fits, faint — every one used a different
      // 392 cars, drawn from these 392 cars
      p.ctx.save();
      p.ctx.globalAlpha = 0.30;
      state.lines.forEach(function (f) {
        p.line([[45, f[0] + f[1] * 45], [248, f[0] + f[1] * 248]],
          { color: col.accent, width: 1.4 });
      });
      p.ctx.restore();
      p.line([[45, ana.beta[0] + ana.beta[1] * 45], [248, ana.beta[0] + ana.beta[1] * 248]],
        { color: col.accent2, width: 2.8 });
      p.text('red = the one fit on all 392 cars', 47, 46,
        { color: col.accent2, font: '11.5px system-ui' });
      p.text('blue = ' + state.lines.length + ' bootstrap fits', 47, 42.5,
        { color: col.accent, font: '11.5px system-ui' });
    }
  });

  /* ------------------------------------------------------------ histogram */
  var plotH = new Plot(cvH, {
    range: { xmin: -0.17, xmax: -0.14, ymin: 0, ymax: 60 },
    height: 320,
    xlabel: 'bootstrap slope β̂₁',
    ylabel: 'how often',
    draw: function (p) {
      var col = p.colors;
      var arr = state.b1;
      if (!arr.length) return;
      var anaLo = ana.beta[1] - 1.96 * ana.se[1];
      var anaHi = ana.beta[1] + 1.96 * ana.se[1];
      var bLo = ana.beta[1] - 1.96 * sdOf(arr);
      var bHi = ana.beta[1] + 1.96 * sdOf(arr);
      var lo = Math.min(anaLo, bLo, Math.min.apply(null, arr));
      var hi = Math.max(anaHi, bHi, Math.max.apply(null, arr));
      var pad = (hi - lo) * 0.08;
      lo -= pad; hi += pad;

      var bins = 30, counts = [];
      for (var b = 0; b < bins; b++) counts.push(0);
      arr.forEach(function (v) {
        var t = Math.floor((v - lo) / (hi - lo) * bins);
        if (t < 0 || t >= bins) return;
        counts[t]++;
      });
      var max = 1;
      counts.forEach(function (c) { max = Math.max(max, c); });
      p.range.xmin = lo;
      p.range.xmax = hi;
      p.range.ymin = 0;
      p.range.ymax = max * 1.3;
      p.axes();

      // the two 95% bands, drawn under the bars
      p.cell(anaLo, anaHi, 0, p.range.ymax, col.accent2, 0.14);
      p.cell(bLo, bHi, 0, p.range.ymax, col.accent, 0.20);

      var w = (hi - lo) / bins;
      counts.forEach(function (c, b2) {
        if (!c) return;
        var x0 = lo + b2 * w;
        p.cell(x0, x0 + w, 0, c, col.fg, 0.55);
      });

      p.vline(ana.beta[1], { color: col.accent2, width: 2.4 });
      p.text('analytic fit', ana.beta[1], p.range.ymax * 0.97,
        { align: 'right', base: 'top', color: col.accent2, font: '11.5px system-ui' });
      p.text('bootstrap average = ' +
        (arr.reduce(function (s, v) { return s + v; }, 0) / arr.length).toFixed(4),
      ana.beta[1], p.range.ymax * 0.86,
        { align: 'left', base: 'top', color: col.fg, font: '11.5px system-ui' });

      var bootSd = sdOf(arr);
      set('br-analytic', 'analytic SE(β̂₁) = <b>' + ana.se[1].toFixed(5) + '</b>');
      set('br-boot', 'bootstrap SE(β̂₁) = <b>' + bootSd.toFixed(5) + '</b>');
      set('br-ratio', 'bootstrap / analytic = <b>' + (bootSd / ana.se[1]).toFixed(3) + '</b>');
      set('br-int', 'intercept: analytic <b>' + ana.se[0].toFixed(4) +
        '</b> · bootstrap <b>' + sdOf(state.b0).toFixed(4) + '</b>');
      set('br-bread', 'B = <b>' + state.B + '</b> bootstrap data sets');
    }
  });

  /* ------------------------------------------------------------ controls */
  var slider = document.getElementById('br-b');
  if (slider) slider.addEventListener('input', function () {
    state.B = parseInt(this.value, 10);
    var out = bootstrap(state.seed, state.B);
    state.b0 = out.b0;
    state.b1 = out.b1;
    state.lines = out.lines;
    plotL.render();
    plotH.render();
  });

  var rerun = document.getElementById('br-rerun');
  if (rerun) rerun.addEventListener('click', function () {
    state.seed += 97;
    var out = bootstrap(state.seed, state.B);
    state.b0 = out.b0;
    state.b1 = out.b1;
    state.lines = out.lines;
    plotL.render();
    plotH.render();
  });

  var first = bootstrap(state.seed, state.B);
  state.b0 = first.b0;
  state.b1 = first.b1;
  state.lines = first.lines;
  plotL.render();
  plotH.render();
})();
