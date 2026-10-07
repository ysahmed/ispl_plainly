/* ==========================================================================
   cv-biasvar.js — Chapter 5, §5.1.4: the bias-variance trade-off for k.

   Simulated data where the truth is known, so the true test MSE can be
   computed exactly.  For each way of splitting (validation half, 5-fold,
   10-fold, LOOCV) we repeat the whole experiment many times and record the
   CV estimate — then show its average against the truth (bias) and how far
   it travels between repeats (variance).

   Left panel:  mean CV estimate ± 1 sd across repeats, vs the true curve.
   Right panel: at the best degree, the bias and the spread for all four.
   ========================================================================== */
(function () {
  'use strict';
  var cvM = document.getElementById('cv-bvmean');
  var cvB = document.getElementById('cv-bvbars');
  if (!cvM || !cvB || typeof Plot === 'undefined' || typeof Stats === 'undefined') return;

  var NOISE = 0.45, XSC = 1.7, N = 60, REPS = 40, DEGS = 10;
  var GRID = [];
  for (var gi = 0; gi <= 80; gi++) GRID.push(-XSC + (2 * XSC) * gi / 80);

  var TRUTHS = {
    line: { label: 'almost a straight line', f: function (x) { return 1.15 * x + 0.1; } },
    curve: { label: 'a real curve', f: function (x) { return 0.9 * x - 0.55 * x * x * x; } },
    wild: { label: 'wildly non-linear', f: function (x) { return 1.7 * Math.sin(2.6 * x) + 0.7 * Math.sin(6.1 * x); } }
  };
  var KEYS = ['half', '5', '10', 'loo'];
  var LABEL = { half: 'validation half', '5': '5-fold', '10': '10-fold', loo: 'LOOCV' };

  var state = { k: '10', truth: 'curve', seed: 5, res: null };

  /* ------------------------------------------------------------- the maths */
  function solveFit(zs, yy, idx, deg) {
    var k = deg + 1, XtX = [], Xty = [], i, j;
    for (i = 0; i < k; i++) { XtX.push(new Array(k).fill(0)); Xty.push(0); }
    for (var m = 0; m < idx.length; m++) {
      var z = zs[idx[m]], row = [1], p = 1;
      for (i = 1; i < k; i++) { p *= z; row.push(p); }
      for (i = 0; i < k; i++) {
        Xty[i] += row[i] * yy[idx[m]];
        for (j = 0; j < k; j++) XtX[i][j] += row[i] * row[j];
      }
    }
    return Stats.solve(XtX, Xty);
  }

  function predict(beta, z) {
    var s = beta[0], p = 1;
    for (var i = 1; i < beta.length; i++) { p *= z; s += beta[i] * p; }
    return s;
  }

  // full fit at one degree: coefficients, leverages, LOOCV by formula (5.2)
  function fullFit(zs, yy, deg) {
    var k = deg + 1, n = zs.length, XtX = [], Xty = [], i, j, m;
    for (i = 0; i < k; i++) { XtX.push(new Array(k).fill(0)); Xty.push(0); }
    var rows = [];
    for (m = 0; m < n; m++) {
      var z = zs[m], row = [1], p = 1;
      for (i = 1; i < k; i++) { p *= z; row.push(p); }
      rows.push(row);
      for (i = 0; i < k; i++) {
        Xty[i] += row[i] * yy[m];
        for (j = 0; j < k; j++) XtX[i][j] += row[i] * row[j];
      }
    }
    var inv = Stats.inverse(XtX), beta = Stats.solve(XtX, Xty);
    var loo = 0, resids = [];
    for (m = 0; m < n; m++) {
      var yh = 0, hv = 0;
      for (i = 0; i < k; i++) {
        yh += beta[i] * rows[m][i];
        var xv = 0;
        for (j = 0; j < k; j++) xv += rows[m][j] * inv[j][i];
        hv += rows[m][i] * xv;
      }
      var e = yy[m] - yh;
      resids.push(e);
      loo += (e * e) / ((1 - hv) * (1 - hv));
    }
    return { beta: beta, loo: loo / n, resids: resids };
  }

  function foldMSE(zs, yy, order, kfold, deg) {
    var base = Math.floor(N / kfold), start = 0, total = 0;
    for (var fo = 0; fo < kfold; fo++) {
      var size = base, test = order.slice(start, start + size);
      var train = order.slice(0, start).concat(order.slice(start + size));
      var beta = solveFit(zs, yy, train, deg), s = 0;
      for (var t = 0; t < test.length; t++) {
        var e = yy[test[t]] - predict(beta, zs[test[t]]);
        s += e * e;
      }
      total += s / test.length;
      start += size;
    }
    return total / kfold;
  }

  function experiment(truthKey, seed) {
    var f = TRUTHS[truthKey].f;
    var out = { true: [], half: [], '5': [], '10': [], loo: [] };
    for (var deg = 1; deg <= DEGS; deg++) { out.true.push(0); out.half.push([]); out['5'].push([]); out['10'].push([]); out.loo.push([]); }

    for (var rep = 0; rep < REPS; rep++) {
      var rnd = mulberry32(seed + rep * 104729);
      var xsA = [], yy = [], zs = [], i;
      for (i = 0; i < N; i++) {
        var x = (rnd() * 2 - 1) * XSC;
        xsA.push(x);
        zs.push(x / XSC);
        yy.push(f(x) + gauss(rnd) * NOISE);
      }
      var order = [];
      for (i = 0; i < N; i++) order.push(i);
      for (i = N - 1; i > 0; i--) {
        var w = Math.floor(rnd() * (i + 1)), tmp = order[i]; order[i] = order[w]; order[w] = tmp;
      }

      for (var d = 1; d <= DEGS; d++) {
        var full = fullFit(zs, yy, d);

        // exact test MSE: (truth - fit)^2 averaged over a grid, plus noise
        var err = 0;
        for (i = 0; i < GRID.length; i++) {
          var diff = f(GRID[i]) - predict(full.beta, GRID[i] / XSC);
          err += diff * diff;
        }
        out.true[d - 1] += err / GRID.length + NOISE * NOISE;

        out.loo[d - 1].push(full.loo);
        out['5'][d - 1].push(foldMSE(zs, yy, order, 5, d));
        out['10'][d - 1].push(foldMSE(zs, yy, order, 10, d));
        out.half[d - 1].push(foldMSE(zs, yy, order, 2, d));
      }
    }

    // mean / sd across repeats for every k, mean of the truth
    out.mean = {}; out.sd = {};
    KEYS.forEach(function (kk) {
      out.mean[kk] = []; out.sd[kk] = [];
      for (var d = 0; d < DEGS; d++) {
        var arr = out[kk][d], m = arr.reduce(function (s, v) { return s + v; }, 0) / arr.length;
        var v = arr.reduce(function (s, x) { return s + (x - m) * (x - m); }, 0) / (arr.length - 1);
        out.mean[kk].push(m);
        out.sd[kk].push(Math.sqrt(v));
      }
    });
    for (var d2 = 0; d2 < DEGS; d2++) out.true[d2] /= REPS;
    return out;
  }

  function bestDegree(res) {
    var best = 1;
    for (var d = 2; d <= DEGS; d++) if (res.true[d - 1] < res.true[best - 1]) best = d;
    return best;
  }

  function set(id, html) {
    var el = document.getElementById(id);
    if (el) el.innerHTML = html;
  }

  /* ---------------------------------------------------------- left panel */
  var plotM = new Plot(cvM, {
    range: { xmin: 0.5, xmax: DEGS + 0.5, ymin: 0, ymax: 40 },
    height: 300,
    xlabel: 'degree of polynomial',
    ylabel: 'error estimate',
    draw: function (p) {
      var col = p.colors, res = state.res;
      if (!res) return;
      var lo = Infinity, hi = -Infinity, kk = state.k;
      for (var d = 0; d < DEGS; d++) {
        lo = Math.min(lo, res.true[d], res.mean[kk][d] - res.sd[kk][d]);
        hi = Math.max(hi, res.true[d], res.mean[kk][d] + res.sd[kk][d]);
      }
      p.range.ymin = Math.max(0, lo - (hi - lo) * 0.10);
      p.range.ymax = hi + (hi - lo) * 0.10;
      p.axes();

      // the truth: exact test MSE at every degree
      var tPts = res.true.map(function (v, d) { return [d + 1, v]; });
      p.line(tPts, { color: col.fg, width: 2.2, dash: [7, 5] });

      // the CV estimate: mean over repeats, with ±1 sd as a whisker
      for (d = 0; d < DEGS; d++) {
        var x = d + 1, m = res.mean[kk][d], s = res.sd[kk][d];
        p.line([[x, m - s], [x, m + s]], { color: col.accent2, width: 2 });
        p.line([[x - 0.12, m + s], [x + 0.12, m + s]], { color: col.accent2, width: 1.6 });
        p.line([[x - 0.12, m - s], [x + 0.12, m - s]], { color: col.accent2, width: 1.6 });
      }
      var mPts = res.mean[kk].map(function (v, d) { return [d + 1, v]; });
      p.line(mPts, { color: col.accent2, width: 2.6 });
      p.points(mPts, { color: col.accent2, r: 3.4 });

      p.text('true test MSE', DEGS, res.true[DEGS - 1],
        { align: 'right', base: 'top', color: col.fg, font: '11.5px system-ui' });
      p.text(LABEL[kk] + ' CV estimate ± 1 sd', 1, res.mean[kk][0],
        { align: 'left', base: 'bottom', color: col.accent2, font: '11.5px system-ui' });
    }
  });

  /* --------------------------------------------------------- right panel */
  var plotB = new Plot(cvB, {
    range: { xmin: 0.5, xmax: KEYS.length + 0.5, ymin: -1, ymax: 1 },
    height: 300,
    draw: function (p) {
      var col = p.colors, res = state.res;
      if (!res) return;
      var b = bestDegree(res);
      var lo = 0, hi = 0;
      KEYS.forEach(function (kk) {
        var bias = res.mean[kk][b - 1] - res.true[b - 1];
        var s = res.sd[kk][b - 1];
        lo = Math.min(lo, bias); hi = Math.max(hi, bias, s);
      });
      var pad = (hi - lo) * 0.18 || 0.5;
      p.range.ymin = lo - pad;
      p.range.ymax = hi + pad;
      p.o.ylabel = 'how far off, in MSE';
      p.axes();
      p.hline(0, { color: col.fg, width: 1.6 });

      var gw = 0.62, bw = gw / 2.4;
      KEYS.forEach(function (kk, g) {
        var cx = g + 1;
        var bias = res.mean[kk][b - 1] - res.true[b - 1];
        var s = res.sd[kk][b - 1];
        var on = kk === state.k;
        var dim = on ? 0.9 : 0.38;
        p.cell(cx - gw / 2, cx - gw / 2 + bw, Math.min(0, bias), Math.max(0, bias),
          col.accent2, dim);
        p.cell(cx - gw / 2 + bw + 0.04, cx + gw / 2, 0, s, col.accent, dim);
        p.text(LABEL[kk], cx, p.range.ymin + (p.range.ymax - p.range.ymin) * 0.04,
          { align: 'center', color: on ? col.fg : col.axis, font: (on ? 'bold ' : '') + '11px system-ui' });
        p.text('±' + s.toFixed(2), cx + bw / 2 + 0.02, s,
          { align: 'center', base: 'bottom', color: col.accent, font: '10.5px system-ui' });
        p.text((bias >= 0 ? '+' : '') + bias.toFixed(2), cx - gw / 2 + bw / 2, bias,
          { align: 'center', base: bias >= 0 ? 'bottom' : 'top', color: col.accent2, font: '10.5px system-ui' });
      });
      p.text('bias (red) and spread (blue) of the CV estimate at degree ' + b,
        1, p.range.ymax * 0.97, { base: 'top', color: col.fg, font: '11.5px system-ui' });
    }
  });

  /* -------------------------------------------------------------- readouts */
  function refresh() {
    var res = state.res, kk = state.k;
    if (!res) return;
    var b = bestDegree(res);
    var bias = res.mean[kk][b - 1] - res.true[b - 1];
    var s = res.sd[kk][b - 1];
    var keys = ['half', '5', '10', 'loo'];
    var widest = keys.reduce(function (a, k2) {
      return res.sd[k2][b - 1] > res.sd[a][b - 1] ? k2 : a;
    }, keys[0]);
    set('bv-kread', 'splitting: <b>' + LABEL[kk] + '</b>');
    set('bv-true', 'true test MSE at degree ' + b + ': <b>' + res.true[b - 1].toFixed(3) + '</b>');
    set('bv-bias', 'bias of this CV estimate: <b>' + (bias >= 0 ? '+' : '') +
      bias.toFixed(3) + '</b>');
    set('bv-sd', 'spread across ' + REPS + ' repeats: <b>±' + s.toFixed(3) + '</b>');
    // verdict is computed from this run's numbers, never asserted in advance
    var biasStr = Math.abs(bias) < 0.01 ? 'no bias worth mentioning'
      : bias > 0 ? 'sits ' + bias.toFixed(3) + ' above the truth'
        : 'sits ' + (-bias).toFixed(3) + ' below the truth';
    var spreadStr = kk === widest ? 'and it has the widest spread of the four'
      : 'spread ±' + s.toFixed(3) + ' — widest here: ' + LABEL[widest];
    set('bv-note', 'verdict: <b>' + biasStr + ', ' + spreadStr + '</b>');
    set('bv-reps', 'truth: <b>' + TRUTHS[state.truth].label + '</b> · ' + REPS +
      ' repeats of n = ' + N);
  }

  function redraw() {
    state.res = experiment(state.truth, state.seed);
    refresh();
    plotM.render();
    plotB.render();
  }

  /* -------------------------------------------------------------- controls */
  function group(ids, key) {
    ids.forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.setAttribute('aria-pressed', String(id === key));
    });
  }

  ['half', '5', '10', 'loo'].forEach(function (kk) {
    var el = document.getElementById('bv-k-' + kk);
    if (!el) return;
    el.addEventListener('click', function () {
      state.k = kk;
      group(['bv-k-half', 'bv-k-5', 'bv-k-10', 'bv-k-loo'], 'bv-k-' + kk);
      refresh();
      plotM.render();
      plotB.render();
    });
  });

  ['line', 'curve', 'wild'].forEach(function (tk) {
    var el = document.getElementById('bv-truth-' + tk);
    if (!el) return;
    el.addEventListener('click', function () {
      state.truth = tk;
      group(['bv-truth-line', 'bv-truth-curve', 'bv-truth-wild'], 'bv-truth-' + tk);
      redraw();
    });
  });

  var rd = document.getElementById('bv-redraw');
  if (rd) rd.addEventListener('click', function () {
    state.seed += 37;
    redraw();
  });

  group(['bv-k-half', 'bv-k-5', 'bv-k-10', 'bv-k-loo'], 'bv-k-10');
  group(['bv-truth-line', 'bv-truth-curve', 'bv-truth-wild'], 'bv-truth-curve');
  redraw();
})();
