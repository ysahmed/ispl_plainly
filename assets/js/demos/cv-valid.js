/* ==========================================================================
   cv-valid.js — Chapter 5, §5.1.1: the validation set approach.

   Auto data, mpg predicted by polynomial functions of horsepower.  Left
   panel: one random 50/50 split (Figure 5.2, left).  Right panel: ten
   different splits at once (Figure 5.2, right) — same data, ten answers,
   which is the method's first drawback.  "New splits" redraws all ten.
   ========================================================================== */
(function () {
  'use strict';
  var cv1 = document.getElementById('cv-cvval-1');
  var cv10 = document.getElementById('cv-cvval-10');
  if (!cv1 || !cv10 || typeof Plot === 'undefined' || typeof Stats === 'undefined') return;

  var A = window.CH03_AUTO;
  var xs = A.horsepower, ys = A.mpg, n = xs.length;      // 392
  var DEGS = 10, RUNS = 10;

  var mean = 0, sd = 0, i;
  for (i = 0; i < n; i++) mean += xs[i];
  mean /= n;
  for (i = 0; i < n; i++) sd += (xs[i] - mean) * (xs[i] - mean);
  sd = Math.sqrt(sd / n);
  // z^d for every observation and every degree, computed once
  var zpow = [];
  for (i = 0; i < n; i++) {
    var z = (xs[i] - mean) / sd, row = [1], p = 1;
    for (var d = 1; d <= DEGS; d++) { p *= z; row.push(p); }
    zpow.push(row);
  }

  var state = { splitSeed: 11, splits: [], curves: [] };

  // Figure 5.2's axis (the book draws 16–28); high-degree fits sometimes
  // explode into the hundreds, so those points are pinned to the top line
  // and their values are quoted in the readout instead of stretching the axis.
  var YLO = 14, YHI = 32;
  function pinned(curve) {
    var out = [];
    curve.forEach(function (v, d) { if (v > YHI) out.push([d + 1, v]); });
    return out;
  }

  function makeSplit(seed) {
    var rnd = mulberry32(seed), idx = [];
    for (var j = 0; j < n; j++) idx.push(j);
    for (var k = n - 1; k > 0; k--) {
      var t = Math.floor(rnd() * (k + 1)), tmp = idx[k]; idx[k] = idx[t]; idx[t] = tmp;
    }
    var isTrain = new Array(n).fill(false);
    for (var m = 0; m < n / 2; m++) isTrain[idx[m]] = true;
    return isTrain;
  }

  // validation MSE for one degree under one split
  function mse(split, deg) {
    var X = [], y = [], Xv = [], yv = [];
    for (var j = 0; j < n; j++) {
      var row = zpow[j].slice(0, deg + 1);
      if (split[j]) { X.push(row); y.push(ys[j]); }
      else { Xv.push(row); yv.push(ys[j]); }
    }
    var f = Stats.ols(X, y), s = 0;
    for (var v = 0; v < Xv.length; v++) {
      var yh = 0;
      for (var c = 0; c <= deg; c++) yh += f.beta[c] * Xv[v][c];
      var e = yv[v] - yh;
      s += e * e;
    }
    return s / Xv.length;
  }

  function recompute() {
    state.splits = [];
    state.curves = [];
    for (var r = 0; r < RUNS; r++) {
      var split = makeSplit(state.splitSeed + r * 7919);
      state.splits.push(split);
      var curve = [];
      for (var d = 1; d <= DEGS; d++) curve.push(mse(split, d));
      state.curves.push(curve);
    }
  }

  function curveRange() {
    return { xmin: 0.5, xmax: DEGS + 0.5, ymin: YLO, ymax: YHI };
  }

  function lineStyle(curve) {
    return curve.map(function (v, d) { return [d + 1, v]; });
  }

  // draw one curve clipped to the box; anything above YHI rides the top line
  function drawCurve(p, curve, color, width, r, alpha) {
    var pts = lineStyle(curve);
    p.ctx.save();
    p.ctx.globalAlpha = alpha == null ? 1 : alpha;
    p.clip(function () { p.line(pts, { color: color, width: width }); });
    p.points(pts.filter(function (q) { return q[1] <= YHI; }), { color: color, r: r });
    p.ctx.restore();
    pinned(curve).forEach(function (q) {
      p.dot(q[0], YHI - (YHI - YLO) * 0.02,
        { r: 4, color: color, ring: p.colors.surface });
    });
  }

  function offNote(p, col) {
    p.text('● riding the top line = off the scale (values in the readout)',
      1, YLO + (YHI - YLO) * 0.055,
      { base: 'bottom', color: col.axis, font: '11px system-ui' });
  }

  var plot1 = new Plot(cv1, {
    range: { xmin: 0.5, xmax: DEGS + 0.5, ymin: YLO, ymax: YHI },
    height: 300,
    xlabel: 'degree of polynomial',
    ylabel: 'validation MSE',
    draw: function (p) {
      var col = p.colors;
      Object.assign(p.range, curveRange());
      p.axes();
      var curve = state.curves[0];
      drawCurve(p, curve, col.accent2, 2.6, 4);

      var best = 1;
      for (var d = 2; d <= DEGS; d++) if (curve[d - 1] < curve[best - 1]) best = d;
      if (curve[best - 1] <= YHI) {
        p.dot(best, curve[best - 1], { r: 6.5, color: col.accent, ring: col.surface });
        p.text('best here: degree ' + best, best, curve[best - 1],
          { align: best > 7 ? 'right' : 'left', base: 'bottom', color: col.accent, font: '11.5px system-ui' });
      }
      p.text('one random half', 1, YHI - (YHI - YLO) * 0.06,
        { base: 'top', color: col.accent2, font: '11.5px system-ui' });
      if (pinned(curve).length) offNote(p, col);
    }
  });

  var plot10 = new Plot(cv10, {
    range: { xmin: 0.5, xmax: DEGS + 0.5, ymin: YLO, ymax: YHI },
    height: 300,
    xlabel: 'degree of polynomial',
    ylabel: 'validation MSE',
    draw: function (p) {
      var col = p.colors;
      Object.assign(p.range, curveRange());
      p.axes();
      state.curves.forEach(function (curve, r) {
        if (r === 0) drawCurve(p, curve, col.accent2, 2.4, 3.6);
        else drawCurve(p, curve, col.accent, 1.4, 2.6, 0.55);
      });
      p.text('ten different splits of the same 392 cars', 1, YHI - (YHI - YLO) * 0.06,
        { base: 'top', color: col.fg, font: '11.5px system-ui' });
      if (state.curves.some(function (cv) { return pinned(cv).length; })) offNote(p, col);
    }
  });

  function refresh() {
    var curve = state.curves[0];
    var best = 1;
    for (var d = 2; d <= DEGS; d++) if (curve[d - 1] < curve[best - 1]) best = d;
    var lo = Infinity, hi = -Infinity;
    state.curves.forEach(function (cv) {
      lo = Math.min(lo, cv[1]); hi = Math.max(hi, cv[1]);
    });
    set('val-best', 'this split likes degree <b>' + best + '</b> (MSE ' +
      curve[best - 1].toFixed(1) + ')');
    set('val-d1d2', 'degree 1: <b>' + curve[0].toFixed(1) + '</b> · degree 2: <b>' +
      curve[1].toFixed(1) + '</b>');
    set('val-range', 'degree 2 across 10 splits: <b>' + lo.toFixed(1) + '–' +
      hi.toFixed(1) + '</b>');
    set('val-split', 'splits drawn: <b>' + RUNS + '</b>, seed ' + state.splitSeed);
    // anything the axis cannot show is printed here instead of being hidden
    var off1 = pinned(curve).map(function (q) {
      return 'degree ' + q[0] + ' = ' + q[1].toFixed(0);
    });
    var nOff = state.curves.filter(function (cv) { return pinned(cv).length; }).length;
    set('val-off', off1.length
      ? 'off the top (this split): <b>' + off1.join(' · ') + '</b> — and ' +
        nOff + ' of ' + RUNS + ' splits have a point above the axis'
      : 'this split stays on the axis · ' + nOff + ' of ' + RUNS +
        ' splits have a point above it');
  }

  function set(id, html) {
    var el = document.getElementById(id);
    if (el) el.innerHTML = html;
  }

  var btn = document.getElementById('val-resplit');
  if (btn) btn.addEventListener('click', function () {
    state.splitSeed += 101;
    recompute();
    refresh();
    plot1.render();
    plot10.render();
  });

  recompute();
  refresh();
})();
