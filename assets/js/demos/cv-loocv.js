/* ==========================================================================
   cv-loocv.js — Chapter 5, §5.1.2: leave-one-out CV and the magic formula.

   Left panel: the LOOCV error curve for Auto (Figure 5.4, left) beside the
   training MSE that keeps falling — the estimate you want vs the one that
   lies.  Right panel: where a squared miss gets inflated by 1/(1-h)^2 —
   the observation that contributes most to the LOOCV estimate.  The button
   actually refits the model 392 times and proves formula (5.2) matches.
   ========================================================================== */
(function () {
  'use strict';
  var cvC = document.getElementById('cv-loo-curve');
  var cvP = document.getElementById('cv-loo-point');
  if (!cvC || !cvP || typeof Plot === 'undefined' || typeof Stats === 'undefined') return;

  var A = window.CH03_AUTO;
  var xs = A.horsepower, ys = A.mpg, n = xs.length;      // 392
  var DEGS = 10;

  var mean = 0, sd = 0, i, d;
  for (i = 0; i < n; i++) mean += xs[i];
  mean /= n;
  for (i = 0; i < n; i++) sd += (xs[i] - mean) * (xs[i] - mean);
  sd = Math.sqrt(sd / n);

  function design(idx, deg) {
    var X = [];
    for (var j = 0; j < idx.length; j++) {
      var z = (xs[idx[j]] - mean) / sd, row = [1], p = 1;
      for (var k = 1; k <= deg; k++) { p *= z; row.push(p); }
      X.push(row);
    }
    return X;
  }

  function fullIdx() { var a = []; for (var j = 0; j < n; j++) a.push(j); return a; }
  var ALL = fullIdx();

  // one fit on the whole data at one degree, with leverages h_i
  function fitAt(deg) {
    var X = design(ALL, deg), k = deg + 1;
    var XtX = [], Xty = [];
    for (i = 0; i < k; i++) { XtX.push(new Array(k).fill(0)); Xty.push(0); }
    for (var m = 0; m < n; m++) {
      for (i = 0; i < k; i++) {
        Xty[i] += X[m][i] * ys[m];
        for (var j = 0; j < k; j++) XtX[i][j] += X[m][i] * X[m][j];
      }
    }
    var inv = Stats.inverse(XtX);
    var beta = Stats.solve(XtX, Xty);
    var fitted = [], resid = [], h = [], press = 0, rss = 0;
    for (m = 0; m < n; m++) {
      var yh = 0, hv = 0;
      for (i = 0; i < k; i++) {
        yh += beta[i] * X[m][i];
        var xinv = 0;
        for (j = 0; j < k; j++) xinv += X[m][j] * inv[j][i];
        hv += X[m][i] * xinv;
      }
      var e = ys[m] - yh;
      fitted.push(yh); resid.push(e); h.push(hv);
      rss += e * e;
      press += (e * e) / ((1 - hv) * (1 - hv));
    }
    return {
      deg: deg, beta: beta, fitted: fitted, resid: resid, h: h,
      press: press / n,                                   // LOOCV MSE, eq. (5.2)
      trainMse: rss / n
    };
  }

  var fits = [];
  for (d = 1; d <= DEGS; d++) fits.push(fitAt(d));

  var state = { deg: 2, brute: null };

  function set(id, html) {
    var el = document.getElementById(id);
    if (el) el.innerHTML = html;
  }

  /* -------------------------------------------------------------- panel A */
  var plotC = new Plot(cvC, {
    range: { xmin: 0.5, xmax: DEGS + 0.5, ymin: 0, ymax: 40 },
    height: 300,
    xlabel: 'degree of polynomial',
    ylabel: 'mean squared error',
    draw: function (p) {
      var col = p.colors;
      var lo = Infinity, hi = -Infinity;
      fits.forEach(function (f) {
        lo = Math.min(lo, f.press, f.trainMse);
        hi = Math.max(hi, f.press, f.trainMse);
      });
      p.range.ymin = Math.max(0, lo - (hi - lo) * 0.12);
      p.range.ymax = hi + (hi - lo) * 0.12;
      p.axes();

      var train = fits.map(function (f, x) { return [x + 1, f.trainMse]; });
      var press = fits.map(function (x, j) { return [j + 1, x.press]; });

      p.line(train, { color: col.axis, width: 2, dash: [6, 4] });
      p.line(press, { color: col.accent2, width: 2.6 });
      p.points(press, { color: col.accent2, r: 4 });

      var cur = fits[state.deg - 1];
      p.dot(state.deg, cur.press, { r: 6.5, color: col.accent, ring: col.surface });

      var best = 1;
      for (d = 2; d <= DEGS; d++) if (fits[d - 1].press < fits[best - 1].press) best = d;
      p.vline(best, { color: col.good, width: 1.6, dash: [5, 4] });
      p.text('LOOCV minimum: degree ' + best, best, p.range.ymax * 0.95,
        { align: best > 6 ? 'right' : 'left', base: 'top', color: col.good, font: '11.5px system-ui' });
      p.text('training MSE', DEGS, fits[DEGS - 1].trainMse,
        { align: 'right', base: 'top', color: col.axis, font: '11.5px system-ui' });
      p.text('LOOCV estimate', 1, fits[0].press,
        { align: 'left', base: 'bottom', color: col.accent2, font: '11.5px system-ui' });
    }
  });

  /* -------------------------------------------------------------- panel B */
  var plotP = new Plot(cvP, {
    range: { xmin: 0, xmax: 0.5, ymin: 0, ymax: 100 },
    height: 300,
    xlabel: 'leverage h of the observation',
    ylabel: 'squared miss (y − ŷ)²',
    draw: function (p) {
      var col = p.colors;
      var f = fits[state.deg - 1];
      var maxH = 0, maxQ = 0, worst = 0;
      for (var j = 0; j < n; j++) {
        var q = f.resid[j] * f.resid[j];
        maxH = Math.max(maxH, f.h[j]);
        maxQ = Math.max(maxQ, q);
        if (q / ((1 - f.h[j]) * (1 - f.h[j])) >
            f.resid[worst] * f.resid[worst] / ((1 - f.h[worst]) * (1 - f.h[worst]))) worst = j;
      }
      p.range.xmin = 0;
      p.range.xmax = maxH * 1.15 + 0.01;
      p.range.ymin = 0;
      p.range.ymax = maxQ * 1.12;
      p.axes();

      // every observation: where it sits, and what its miss counts for
      var pts = [];
      for (j = 0; j < n; j++) pts.push([f.h[j], f.resid[j] * f.resid[j]]);
      p.points(pts, { color: col.accent, r: 3.4, alpha: 0.7 });

      // the biggest contributor: its squared miss, stretched to its real value
      var qw = f.resid[worst] * f.resid[worst];
      var contrib = qw / ((1 - f.h[worst]) * (1 - f.h[worst]));
      p.vline(f.h[worst], { color: col.accent2, width: 1.4, dash: [4, 4] });
      p.line([[f.h[worst], qw], [f.h[worst], contrib]],
        { color: col.accent2, width: 2.4 });
      p.dot(f.h[worst], qw, { r: 5, color: col.accent, ring: col.surface });
      p.dot(f.h[worst], contrib, { r: 5.5, color: col.accent2, ring: col.surface });
      p.text('counts as ' + contrib.toFixed(1), f.h[worst], contrib,
        { align: f.h[worst] > p.range.xmax * 0.6 ? 'right' : 'left', base: 'bottom',
          color: col.accent2, font: '11.5px system-ui' });
      p.text('was only ' + qw.toFixed(1), f.h[worst], qw,
        { align: f.h[worst] > p.range.xmax * 0.6 ? 'right' : 'left', base: 'top',
          color: col.fg, font: '11.5px system-ui' });

      set('loo-mse', 'degree ' + state.deg + ': LOOCV MSE = <b>' +
        f.press.toFixed(3) + '</b> · training MSE = <b>' + f.trainMse.toFixed(3) + '</b>');
      set('loo-obs', 'biggest contributor: observation <b>' + (worst + 1) +
        '</b> (h = ' + f.h[worst].toFixed(3) + ')');
      set('loo-lever', 'its miss counts <b>' + contrib.toFixed(1) + '</b> instead of ' +
        qw.toFixed(1) + ' — a ×' + (1 / ((1 - f.h[worst]) * (1 - f.h[worst]))).toFixed(2) +
        ' inflation');
      set('loo-degread', 'degree = <b>' + state.deg + '</b>');
    }
  });

  /* ---------------------------------------------- the brute-force check */
  function bruteForce(deg) {
    var sum = 0;
    for (var j = 0; j < n; j++) {
      var idx = [];
      for (var m = 0; m < n; m++) if (m !== j) idx.push(m);
      var f = Stats.ols(design(idx, deg), idx.map(function (q) { return ys[q]; }));
      var row = [], p = 1, z = (xs[j] - mean) / sd;
      row.push(1);
      for (var k = 1; k <= deg; k++) { p *= z; row.push(p); }
      var yh = 0;
      for (k = 0; k <= deg; k++) yh += f.beta[k] * row[k];
      var e = ys[j] - yh;
      sum += e * e;
    }
    return sum / n;
  }

  var btn = document.getElementById('loo-brute');
  if (btn) btn.addEventListener('click', function () {
    var bf = bruteForce(state.deg);
    var formula = fits[state.deg - 1].press;
    set('loo-brute-r', n + ' refits: <b>' + bf.toFixed(6) + '</b> · formula (5.2): <b>' +
      formula.toFixed(6) + '</b> · difference ' + Math.abs(bf - formula).toExponential(1));
    plotC.render();
    plotP.render();
  });

  var slider = document.getElementById('loo-deg');
  if (slider) slider.addEventListener('input', function () {
    state.deg = parseInt(this.value, 10);
    plotC.render();
    plotP.render();
  });

  set('loo-brute-r', 'press: refits the model ' + n + ' times, leaving one car out each time');
  plotC.render();
  plotP.render();
})();
