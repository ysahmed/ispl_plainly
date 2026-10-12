/* ==========================================================================
   hd-noise.js — Chapter 6, §6.4.2: what happens to least squares once the
   features start catching up with the rows (ISLP Figure 6.23, recomputed on
   our own simulated data while the page loads).

   Twenty training rows, twenty features, and a response that is nothing but
   noise — no feature is related to it — plus an independent test set of
   2,000 rows drawn the same way.  For every p from 1 to 19 we solve the
   least squares equations and record the book's three panels: training R²,
   training MSE and test MSE.  We stop at 19 because with n = 20 that is the
   last size at which the system still has a unique answer; the book draws
   its panel out to 20, where p + 1 parameters exceed n observations and the
   equations have no unique solution at all.
   ========================================================================== */
(function () {
  'use strict';
  var elP = document.getElementById('hd-p');
  var elN = document.getElementById('hd-n');
  var elR2 = document.getElementById('hd-r2');
  var elTr = document.getElementById('hd-tr');
  var elTe = document.getElementById('hd-te');
  var elSg = document.getElementById('hd-sg');
  var cR2 = document.getElementById('hd-r2c');
  var cTr = document.getElementById('hd-trc');
  var cTe = document.getElementById('hd-tec');
  if (!elP || !cR2 || !cTr || !cTe ||
      typeof Plot === 'undefined' || typeof Stats === 'undefined') return;

  var N = 20, PMAX = 19, NTEST = 2000, SEED = 263;
  var state = { p: 6 };

  /* mulberry32, the same integer step stats.js uses for its folds, so this
     demo's data is a fixed artefact rather than a fresh coin flip per reload. */
  function mulberry(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      var x = Math.imul(a ^ (a >>> 15), 1 | a);
      x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
      return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
  }
  var rnd = mulberry(SEED);
  function norm() {                       // Box–Muller
    var u = rnd();
    while (u <= 0) u = rnd();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rnd());
  }
  function grid(rows, cols) {
    var out = [], i, j, r;
    for (i = 0; i < rows; i++) {
      r = [];
      for (j = 0; j < cols; j++) r.push(norm());
      out.push(r);
    }
    return out;
  }

  /* Twenty columns are drawn so the stream of normals matches the checked
     run exactly; only the first PMAX are ever used. */
  var Xtr = grid(N, 20), ytr = grid(N, 1).map(function (r) { return r[0]; });
  var Xte = grid(NTEST, 20), yte = grid(NTEST, 1).map(function (r) { return r[0]; });

  var ybar = 0, i, j;
  for (i = 0; i < N; i++) ybar += ytr[i];
  ybar /= N;
  var tss = 0;
  for (i = 0; i < N; i++) tss += (ytr[i] - ybar) * (ytr[i] - ybar);

  /* One least squares fit per number of features: p columns plus an
     intercept.  Stats.solve is Gauss–Jordan with partial pivoting, the same
     routine the other demos use. */
  var res = [];
  for (var p = 1; p <= PMAX; p++) {
    var k = p + 1, XtX = [], Xty = [], m;
    for (i = 0; i < k; i++) { XtX.push(new Array(k).fill(0)); Xty.push(0); }
    for (m = 0; m < N; m++) {
      for (i = 0; i < k; i++) {
        var xi = i === 0 ? 1 : Xtr[m][i - 1];
        Xty[i] += xi * ytr[m];
        for (j = 0; j < k; j++) XtX[i][j] += xi * (j === 0 ? 1 : Xtr[m][j - 1]);
      }
    }
    var beta = Stats.solve(XtX, Xty);
    var rss = 0;
    for (m = 0; m < N; m++) {
      var yh = 0;
      for (i = 0; i < k; i++) yh += beta[i] * (i === 0 ? 1 : Xtr[m][i - 1]);
      rss += (ytr[m] - yh) * (ytr[m] - yh);
    }
    var te = 0;
    for (m = 0; m < NTEST; m++) {
      var y2 = beta[0];
      for (i = 0; i < p; i++) y2 += beta[i + 1] * Xte[m][i];
      te += (yte[m] - y2) * (yte[m] - y2);
    }
    res.push({ r2: 1 - rss / tss, tr: rss / N, te: te / NTEST, rss: rss, df: N - k });
  }

  /* ---------------------------------------------------------------- panels */
  var r2Plot = new Plot(cR2, {
    range: { xmin: 0, xmax: PMAX + 1, ymin: 0, ymax: 1.05 }, height: 210,
    xlabel: 'number of features p', ylabel: 'training R²', draw: function (pp) {
      var pts = res.map(function (r, ix) { return [ix + 1, r.r2]; });
      pp.line(pts, { color: '#9aa4b2', width: 2 });
      pp.points(pts, { color: '#9aa4b2', r: 2.6 });
      pp.vline(state.p, { color: '#dc2626', width: 1.4, dash: [4, 3] });
      pp.dot(state.p, res[state.p - 1].r2, { r: 4.6, color: '#dc2626' });
    }
  });
  var trPlot = new Plot(cTr, {
    range: { xmin: 0, xmax: PMAX + 1, ymin: 0, ymax: 1.3 }, height: 210,
    xlabel: 'number of features p', ylabel: 'training MSE', draw: function (pp) {
      var pts = res.map(function (r, ix) { return [ix + 1, r.tr]; });
      pp.line(pts, { color: '#9aa4b2', width: 2 });
      pp.points(pts, { color: '#9aa4b2', r: 2.6 });
      pp.vline(state.p, { color: '#dc2626', width: 1.4, dash: [4, 3] });
      pp.dot(state.p, res[state.p - 1].tr, { r: 4.6, color: '#dc2626' });
    }
  });
  var tePlot = new Plot(cTe, {
    range: { xmin: 0, xmax: PMAX + 1, ymin: 0, ymax: 39 }, height: 210,
    xlabel: 'number of features p', ylabel: 'test MSE', draw: function (pp) {
      var pts = res.map(function (r, ix) { return [ix + 1, r.te]; });
      pp.line(pts, { color: '#9aa4b2', width: 2 });
      pp.points(pts, { color: '#9aa4b2', r: 2.6 });
      pp.vline(state.p, { color: '#dc2626', width: 1.4, dash: [4, 3] });
      pp.dot(state.p, res[state.p - 1].te, { r: 4.6, color: '#dc2626' });
    }
  });

  /* --------------------------------------------------------------- readouts */
  function num(v) {
    if (v === 0) return '0';
    if (Math.abs(v) < 1e-4 || Math.abs(v) >= 1e4) return v.toExponential(1).replace('-', '−');
    return v.toFixed(Math.abs(v) >= 10 ? 2 : 3);
  }
  function update() {
    r2Plot.render(); trPlot.render(); tePlot.render();
    var r = res[state.p - 1];
    if (elN) elN.innerHTML = 'p = <b>' + state.p + '</b> feature' +
      (state.p === 1 ? '' : 's') + ' plus the intercept · residual degrees of freedom ' +
      '<b>' + r.df + '</b>';
    if (elR2) elR2.innerHTML = 'training R² <b>' + r.r2.toFixed(3) + '</b>';
    if (elTr) elTr.innerHTML = 'training MSE <b>' + num(r.tr) + '</b>';
    if (elTe) elTe.innerHTML = 'test MSE <b>' + num(r.te) + '</b>';
    if (elSg) {
      elSg.innerHTML = r.df > 0
        ? 'σ̂² = RSS / (n − p − 1) = <b>' + num(r.rss / r.df) + '</b>'
        : 'σ̂² — <b>nothing left to divide by</b> (n − p − 1 = 0)';
    }
  }
  function setP(v) {
    state.p = Math.max(1, Math.min(PMAX, Math.round(v)));
    elP.value = String(state.p);
    update();
  }
  elP.addEventListener('input', function () { setP(+elP.value); });
  setP(6);

  window.__HDN = { res: res, N: N, PMAX: PMAX, NTEST: NTEST, SEED: SEED };
})();
