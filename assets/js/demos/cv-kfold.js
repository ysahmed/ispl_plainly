/* ==========================================================================
   cv-kfold.js — Chapter 5, §5.1.3: k-fold cross-validation.

   Left panel: the k-fold error curve for Auto, with every previous run
   drawn faintly (Figure 5.4, right — nine different 10-fold splits).
   Right panel: how far each degree's estimate travels across runs, for
   k-fold (blue) and the validation set approach (red) side by side —
   the second method's variability is visibly wider (§5.1.1 drawback 1).
   ========================================================================== */
(function () {
  'use strict';
  var cvC = document.getElementById('cv-kf-curves');
  var cvS = document.getElementById('cv-kf-spread');
  if (!cvC || !cvS || typeof Plot === 'undefined' || typeof Stats === 'undefined') return;

  var A = window.CH03_AUTO;
  var xs = A.horsepower, ys = A.mpg, n = xs.length;      // 392
  var DEGS = 10, MAXRUNS = 9, START = 4;

  var mean = 0, sd = 0, zpow = [], i, d;
  for (i = 0; i < n; i++) mean += xs[i];
  mean /= n;
  for (i = 0; i < n; i++) sd += (xs[i] - mean) * (xs[i] - mean);
  sd = Math.sqrt(sd / n);
  for (i = 0; i < n; i++) {
    var z = (xs[i] - mean) / sd, row = [1], p = 1;
    for (var k2 = 1; k2 <= DEGS; k2++) { p *= z; row.push(p); }
    zpow.push(row);
  }

  var state = {
    k: 10,
    kfSeeds: [17, 29, 43, 57],
    valSeeds: [101, 113, 127, 139],
    cache: {}
  };

  function shuffled(seed) {
    var rnd = mulberry32(seed), idx = [];
    for (var j = 0; j < n; j++) idx.push(j);
    for (var t = n - 1; t > 0; t--) {
      var w = Math.floor(rnd() * (t + 1)), tmp = idx[t]; idx[t] = idx[w]; idx[w] = tmp;
    }
    return idx;
  }

  // fit on `train`, return MSE on `test`
  function mseOn(train, test, deg) {
    var X = [], y = [], t;
    for (t = 0; t < train.length; t++) {
      X.push(zpow[train[t]].slice(0, deg + 1));
      y.push(ys[train[t]]);
    }
    var f = Stats.ols(X, y), s = 0;
    for (t = 0; t < test.length; t++) {
      var row = zpow[test[t]], yh = 0;
      for (var c = 0; c <= deg; c++) yh += f.beta[c] * row[c];
      var e = ys[test[t]] - yh;
      s += e * e;
    }
    return s / test.length;
  }

  function kfoldCurve(seed, k) {
    var idx = shuffled(seed), curves = [];
    for (var deg = 1; deg <= DEGS; deg++) {
      var per = [];
      var base = Math.floor(n / k), extra = n % k, start = 0;
      for (var fo = 0; fo < k; fo++) {
        var size = base + (fo < extra ? 1 : 0);
        var test = idx.slice(start, start + size);
        var train = idx.slice(0, start).concat(idx.slice(start + size));
        per.push(mseOn(train, test, deg));
        start += size;
      }
      curves.push(per.reduce(function (s, v) { return s + v; }, 0) / k);
    }
    return curves;
  }

  function valCurve(seed) {
    var idx = shuffled(seed), train = idx.slice(0, n / 2), test = idx.slice(n / 2);
    var curves = [];
    for (var deg = 1; deg <= DEGS; deg++) curves.push(mseOn(train, test, deg));
    return curves;
  }

  function curvesFor(list, kind) {
    return list.map(function (seed) {
      var key = kind + ':' + seed + (kind === 'kf' ? ':' + state.k : '');
      if (!state.cache[key]) {
        state.cache[key] = kind === 'kf' ? kfoldCurve(seed, state.k) : valCurve(seed);
      }
      return state.cache[key];
    });
  }

  function set(id, html) {
    var el = document.getElementById(id);
    if (el) el.innerHTML = html;
  }

  function bounds(curves) {
    var lo = Infinity, hi = -Infinity;
    curves.forEach(function (cv) {
      cv.forEach(function (v) { lo = Math.min(lo, v); hi = Math.max(hi, v); });
    });
    var pad = (hi - lo) * 0.10 || 1;
    return { xmin: 0.5, xmax: DEGS + 0.5, ymin: Math.max(0, lo - pad), ymax: hi + pad };
  }

  /* ------------------------------------------------------------- panel A */
  var plotC = new Plot(cvC, {
    range: { xmin: 0.5, xmax: DEGS + 0.5, ymin: 0, ymax: 40 },
    height: 300,
    xlabel: 'degree of polynomial',
    ylabel: state.k + '-fold CV MSE',
    draw: function (p) {
      var col = p.colors;
      p.o.ylabel = state.k + '-fold CV MSE';
      var curves = curvesFor(state.kfSeeds, 'kf');
      Object.assign(p.range, bounds(curves));
      p.axes();

      curves.forEach(function (cv, r) {
        var pts = cv.map(function (v, j) { return [j + 1, v]; });
        if (r === curves.length - 1) {
          p.line(pts, { color: col.accent2, width: 2.6 });
          p.points(pts, { color: col.accent2, r: 3.6 });
        } else {
          p.ctx.save();
          p.ctx.globalAlpha = 0.5;
          p.line(pts, { color: col.accent, width: 1.4 });
          p.ctx.restore();
        }
      });

      var last = curves[curves.length - 1], best = 1;
      for (var j = 2; j <= DEGS; j++) if (last[j - 1] < last[best - 1]) best = j;
      p.dot(best, last[best - 1], { r: 6, color: col.accent, ring: col.surface });
      p.text(state.k + '-fold, ' + curves.length + ' runs — bold = the latest',
        1, p.range.ymax * 0.95,
        { base: 'top', color: col.fg, font: '11.5px system-ui' });
    }
  });

  /* ------------------------------------------------------------- panel B */
  var plotS = new Plot(cvS, {
    range: { xmin: 0.5, xmax: DEGS + 0.5, ymin: 0, ymax: 40 },
    height: 300,
    xlabel: 'degree of polynomial',
    ylabel: 'MSE range across runs',
    draw: function (p) {
      var col = p.colors;
      var kf = curvesFor(state.kfSeeds, 'kf');
      var val = curvesFor(state.valSeeds, 'val');

      var lo = Infinity, hi = -Infinity;
      function scan(cs) {
        cs.forEach(function (cv) {
          cv.forEach(function (v) { lo = Math.min(lo, v); hi = Math.max(hi, v); });
        });
      }
      scan(kf); scan(val);
      var pad = (hi - lo) * 0.10 || 1;
      p.range.ymin = Math.max(0, lo - pad);
      p.range.ymax = hi + pad;
      p.axes();

      var off = 0.16;
      function bars(cs, dx, color) {
        for (var j = 0; j < DEGS; j++) {
          var mn = Infinity, mx = -Infinity;
          cs.forEach(function (cv) { mn = Math.min(mn, cv[j]); mx = Math.max(mx, cv[j]); });
          var x = j + 1 + dx;
          p.line([[x, mn], [x, mx]], { color: color, width: 4 });
          p.line([[x - 0.13, mx], [x + 0.13, mx]], { color: color, width: 2 });
          p.line([[x - 0.13, mn], [x + 0.13, mn]], { color: color, width: 2 });
        }
      }
      bars(kf, -off, col.accent);
      bars(val, off, col.accent2);
      p.text('■ ' + state.k + '-fold', 1, p.range.ymax * 0.95,
        { base: 'top', color: col.accent, font: '11.5px system-ui' });
      p.text('■ validation set', 3.1, p.range.ymax * 0.95,
        { base: 'top', color: col.accent2, font: '11.5px system-ui' });

      // readouts: the spread at the degree the latest run liked best
      var last = kf[kf.length - 1], best = 1;
      for (var j2 = 2; j2 <= DEGS; j2++) if (last[j2 - 1] < last[best - 1]) best = j2;
      function span(cs) {
        var mn = Infinity, mx = -Infinity;
        cs.forEach(function (cv) { mn = Math.min(mn, cv[best - 1]); mx = Math.max(mx, cv[best - 1]); });
        return [mn, mx];
      }
      var s1 = span(kf), s2 = span(val);
      set('kf-kread', 'k = <b>' + state.k + '</b> folds');
      set('kf-best', 'this run likes degree <b>' + best + '</b> (MSE ' +
        last[best - 1].toFixed(2) + ')');
      set('kf-spread', 'at degree ' + best + ': ' + state.k + '-fold spans <b>' +
        s1[0].toFixed(2) + '–' + s1[1].toFixed(2) + '</b> · validation spans <b>' +
        s2[0].toFixed(2) + '–' + s2[1].toFixed(2) + '</b>');
      set('kf-runs', 'runs kept: <b>' + kf.length + '</b> ' + state.k + '-fold · <b>' +
        val.length + '</b> validation');
    }
  });

  function redraw() {
    plotC.render();
    plotS.render();
  }

  /* ------------------------------------------------------------ controls */
  var slider = document.getElementById('kf-k');
  if (slider) slider.addEventListener('input', function () {
    state.k = parseInt(this.value, 10);
    redraw();
  });

  var run = document.getElementById('kf-run');
  if (run) run.addEventListener('click', function () {
    var base = 1000 + state.kfSeeds.length * 61;
    state.kfSeeds.push(base + 7);
    state.valSeeds.push(base + 31);
    if (state.kfSeeds.length > MAXRUNS) { state.kfSeeds.shift(); state.valSeeds.shift(); }
    redraw();
  });

  var reset = document.getElementById('kf-reset');
  if (reset) reset.addEventListener('click', function () {
    state.kfSeeds = [17, 29, 43, 57];
    state.valSeeds = [101, 113, 127, 139];
    state.cache = {};
    redraw();
  });

  redraw();
})();
