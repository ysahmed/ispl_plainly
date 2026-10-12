/* ==========================================================================
   shrink-sparse.js — Chapter 6, §6.2: ten-fold cross-validation for the
   lasso on a sparse simulated data set (ISLP Figure 6.13).

   Our simulation, not the book's (the book does not print its parameters):
   n = 50 observations, p = 45 predictors, all drawn as independent standard
   normals, with only two of them actually carrying signal — column 4 with
   coefficient +4 and column 22 with coefficient -4 — plus N(0,1) noise on
   the response.  Data seed 137, fold seed 1; both are fixed so every reload
   reproduces the same picture.  (The seed is one particular draw out of the
   many we tried: cross-validation does not always land on exactly these two
   variables at n = 50, p = 45, and the "another draw" button lets you watch
   that happen.)

   Everything is fitted live, one fold per animation frame, so the page
   never freezes: 10 folds x 40 values of lambda, plus the full-data path.
   Both panels are drawn against the book's own shrinkage index
   ||beta_hat_lambda||_1 / ||beta_hat||_1, which runs 0 (everything zero)
   to 1 (plain least squares).

   Left panel:  the ten-fold CV error.  Right panel: the coefficient paths,
   the two signal predictors in colour and the 43 noise predictors in grey.

   The "another draw" button re-runs the whole experiment on a fresh sample
   and says plainly whether cross-validation isolated the two signal
   variables or let a noise variable ride along.  It sometimes does the
   latter — that is the honest state of affairs at n = 50, p = 45, and
   watching it happen is the point.
   ========================================================================== */
(function () {
  'use strict';
  var cCv = document.getElementById('sp2-cv');
  var cPath = document.getElementById('sp2-path');
  if (!cCv || !cPath || typeof Plot === 'undefined' || typeof Stats === 'undefined') return;
  if (typeof mulberry32 !== 'function' || typeof gauss !== 'function') return;

  var N = 50, P = 45, M = 40, DECADES = 6;
  var SIG = [4, 22], BET = 4.0, SIGMA = 1.0;
  var NAMES = [];
  for (var q = 0; q < P; q++) NAMES.push('X' + (q + 1));

  /* ------------------------------------------------------------- the model */
  var state = {
    dataSeed: 137, foldSeed: 1,
    lam: [], mse: [], path: [], ratio: [], ols1: 0,
    iMin: 0, iSe: 0, nz: [], running: false, yvar: 0
  };

  function buildData(seed) {
    var rnd = mulberry32(seed), X = [], y = [], i, j;
    for (i = 0; i < N; i++) {
      var row = [];
      for (j = 0; j < P; j++) row.push(gauss(rnd));
      X.push(row);
    }
    for (i = 0; i < N; i++) {
      var acc = 0;
      for (j = 0; j < P; j++) acc += X[i][j] * (j === SIG[0] ? BET : (j === SIG[1] ? -BET : 0));
      y.push(acc + SIGMA * gauss(rnd));
    }
    var cols = [];
    for (j = 0; j < P; j++) {
      var c = [];
      for (i = 0; i < N; i++) c.push(X[i][j]);
      cols.push(c);
    }
    return Stats.prepare(cols, y);
  }

  function pathOf(lams, Zs, ys) {
    var beta = new Array(P).fill(0), out = [];
    for (var k = 0; k < lams.length; k++) {
      beta = Stats.lasso(Zs, ys, lams[k], beta);
      out.push(beta.slice());
    }
    return out;
  }

  var job = null;

  function render() { cvPlot.render(); pathPlot.render(); }

  function start(dataSeed, foldSeed) {
    var pre = buildData(dataSeed);
    var g = new Array(P).fill(0), i, j, k;
    for (i = 0; i < N; i++) for (j = 0; j < P; j++) g[j] += pre.Z[i][j] * pre.y[i];
    var lammax = 0;
    for (j = 0; j < P; j++) lammax = Math.max(lammax, 2 * Math.abs(g[j]));

    var lams = [], bot = lammax / Math.pow(10, DECADES);
    for (k = 0; k < M; k++) lams.push(lammax * Math.pow(bot / lammax, k / (M - 1)));

    var yvar = 0;
    for (i = 0; i < N; i++) yvar += pre.y[i] * pre.y[i];
    yvar /= N;

    state.dataSeed = dataSeed;
    state.foldSeed = foldSeed;
    state.lam = lams;
    state.mse = new Array(M).fill(0);
    state.path = [];
    state.ratio = [];
    state.yvar = yvar;
    state.running = true;
    state.ok = null;
    job = { pre: pre, ids: Stats.kfolds(N, 10, foldSeed), fold: 0, step: 0, ols1: 0 };
    tick();
  }

  /* One animation frame per fold, one per every tenth λ on the full-data
     path — 11 + 4 frames of work, none of them long enough to stutter. */
  function tick() {
    if (!job) return;
    var pre = job.pre, i, j, k, f = job.fold;
    if (f < 10) {
      var tr = [], te = [];
      for (i = 0; i < N; i++) { if (job.ids[i] === f) te.push(i); else tr.push(i); }
      var Ztr = [], ytr = [];
      for (i = 0; i < tr.length; i++) { Ztr.push(pre.Z[tr[i]]); ytr.push(pre.y[tr[i]]); }
      var Cf = pathOf(state.lam, Ztr, ytr);
      for (k = 0; k < M; k++) {
        for (i = 0; i < te.length; i++) {
          var pr = 0, zr = pre.Z[te[i]];
          for (j = 0; j < P; j++) pr += zr[j] * Cf[k][j];
          var e = pre.y[te[i]] - pr;
          state.mse[k] += e * e;
        }
      }
      job.fold++;
    } else {
      // full-data path, in ten chunks
      if (job.step === 0) {
        state.path = pathOf(state.lam, pre.Z, pre.y);
        // least-squares l1 norm = the denominator of the book's index
        var ols = Stats.ols(pre.Z.map(function (r) { return [1].concat(r); }), pre.y).beta.slice(1);
        var s = 0;
        for (j = 0; j < P; j++) s += Math.abs(ols[j]);
        job.ols1 = s;
        for (k = 0; k < M; k++) {
          var a = 0;
          for (j = 0; j < P; j++) a += Math.abs(state.path[k][j]);
          state.ratio.push(a / s);
        }
        for (k = 0; k < M; k++) state.mse[k] /= N;
        var iMin = 0;
        for (k = 1; k < M; k++) if (state.mse[k] < state.mse[iMin]) iMin = k;
        state.iMin = iMin;
        var se = 0;
        for (k = 0; k < M; k++) { var dv = state.mse[k] - state.mse[iMin]; se += dv * dv; }
        se = Math.sqrt(se / (M - 1));
        // the one-SE rule: the most regularised fit (largest λ, smallest
        // index) whose CV error is still within one SE of the minimum
        var iSe = iMin;
        for (k = 0; k < iMin; k++) if (state.mse[k] <= state.mse[iMin] + se) iSe = k;
        state.iSe = iSe;
        var nz = [];
        for (j = 0; j < P; j++) if (Math.abs(state.path[iMin][j]) > 1e-8) nz.push(j);
        state.nz = nz;
        state.ok = (nz.length === 2 && nz[0] === SIG[0] && nz[1] === SIG[1]);
        state.running = false;
        job = null;
        render();
        report();
        return;
      }
      job.step++;
    }
    render();
    report();
    setTimeout(tick, 0);
  }

  /* ------------------------------------------------------------------ plots */
  var cvPlot = new Plot(cCv, {
    range: { xmin: 0, xmax: 1, ymin: 0, ymax: 1 },
    height: 300,
    xlabel: '‖β̂λ‖₁ / ‖β̂‖₁', ylabel: 'ten-fold CV mean squared error',
    draw: function (p) {
      if (!state.mse.length) return;
      var top = 0;
      for (var k = 0; k < M; k++) top = Math.max(top, state.mse[k]);
      top = Math.min(top, state.mse[0] * 1.15);
      p.setRange({ xmin: 0, xmax: 1, ymin: 0, ymax: top });
      p.axes();
      if (state.running) {
        p.text('fitting…', 0.5, top / 2,
          { color: p.colors.axis, align: 'center', font: '13px system-ui, sans-serif' });
        return;
      }
      var pts = [];
      for (var k2 = 0; k2 < M; k2++) pts.push([state.ratio[k2], state.mse[k2]]);
      p.line(pts, { color: p.colors.accent2, width: 2.5 });
      p.vline(state.ratio[state.iMin], { color: p.colors.accent2, dash: [6, 4], width: 1.5 });
      p.vline(state.ratio[state.iSe], { color: p.colors.accent, dash: [4, 4], width: 1.5 });
      p.dot(state.ratio[state.iMin], state.mse[state.iMin], { color: p.colors.accent2, r: 5 });
      p.text('λ min', state.ratio[state.iMin], state.mse[state.iMin] + top * 0.04,
        { color: p.colors.accent2, align: 'center', base: 'bottom', font: '11px system-ui, sans-serif' });
      p.text('λ 1-SE', state.ratio[state.iSe], top * 0.92,
        { color: p.colors.accent, align: 'center', base: 'top', font: '11px system-ui, sans-serif' });
      p.text('least squares', 1, top * 0.06,
        { color: p.colors.axis, align: 'right', base: 'bottom', font: '10px system-ui, sans-serif' });
    }
  });

  var pathPlot = new Plot(cPath, {
    range: { xmin: 0, xmax: 1, ymin: -1, ymax: 1 },
    height: 300,
    xlabel: '‖β̂λ‖₁ / ‖β̂‖₁', ylabel: 'standardised coefficient',
    draw: function (p) {
      if (!state.mse.length) return;
      var lo = 0, hi = 0;
      if (!state.running) {
        state.path.forEach(function (b) {
          b.forEach(function (v) { if (v < lo) lo = v; if (v > hi) hi = v; });
        });
      }
      lo = Math.floor(lo) - 1; hi = Math.ceil(hi) + 1;
      p.setRange({ xmin: 0, xmax: 1, ymin: lo, ymax: hi });
      p.axes();
      if (state.running) return;
      for (var j = 0; j < P; j++) {
        var pts = [], sig = (j === SIG[0] || j === SIG[1]);
        for (var k = 0; k < M; k++) pts.push([state.ratio[k], state.path[k][j]]);
        p.line(pts, { color: sig ? (j === SIG[0] ? p.colors.accent : p.colors.accent2) : p.colors.axis,
                      width: sig ? 2.5 : 1, alpha: sig ? 1 : 0.55 });
      }
      p.vline(state.ratio[state.iMin], { color: p.colors.fg, dash: [6, 4], width: 1.5 });
      p.text('X' + (SIG[0] + 1), state.ratio[M - 1], state.path[M - 1][SIG[0]],
        { color: p.colors.accent, align: 'right', base: 'bottom', font: '11px system-ui, sans-serif' });
      p.text('X' + (SIG[1] + 1), state.ratio[M - 1], state.path[M - 1][SIG[1]],
        { color: p.colors.accent2, align: 'right', base: 'top', font: '11px system-ui, sans-serif' });
    }
  });

  /* ------------------------------------------------------------- readouts */
  var elMin = document.getElementById('sp2-min');
  var elNz = document.getElementById('sp2-nz');
  var elVerdict = document.getElementById('sp2-verdict');
  var elYvar = document.getElementById('sp2-yvar');
  var btnAgain = document.getElementById('sp2-again');

  function report() {
    if (state.running) {
      if (elMin) elMin.innerHTML = 'fitting 400 models…';
      if (elNz) elNz.innerHTML = 'non-zero at the CV minimum: —';
      if (elVerdict) elVerdict.innerHTML = 'running';
      return;
    }
    if (elMin) {
      elMin.innerHTML = 'CV minimum at index <b>' + state.iMin + '</b> · MSE <b>' +
        state.mse[state.iMin].toFixed(3) + '</b> · ‖β̂λ‖₁/‖β̂‖₁ = <b>' +
        state.ratio[state.iMin].toFixed(3) + '</b>';
    }
    if (elNz) {
      elNz.innerHTML = 'non-zero at the CV minimum: <b>' + state.nz.length +
        '</b> of 45 — ' + state.nz.map(function (j) {
          return NAMES[j] + (SIG.indexOf(j) >= 0 ? ' <em>(signal)</em>' : ' <em>(noise)</em>');
        }).join(', ');
    }
    if (elVerdict) {
      elVerdict.innerHTML = state.ok
        ? 'cross-validation isolated <b>exactly the two signal variables</b>'
        : 'cross-validation kept <b>' + (state.nz.length - 2) + ' noise variable' +
          (state.nz.length - 2 === 1 ? '' : 's') + '</b> as well';
      elVerdict.className = 'ro ' + (state.ok ? 'ok' : 'warn');
    }
    if (elYvar) {
      elYvar.innerHTML = 'var(y) = <b>' + state.yvar.toFixed(1) + '</b> · null-model MSE <b>' +
        state.yvar.toFixed(1) + '</b> · data seed <b>' + state.dataSeed +
        '</b> · fold seed <b>' + state.foldSeed + '</b>';
    }
  }

  if (btnAgain) {
    btnAgain.addEventListener('click', function () {
      if (state.running) return;
      // walk the seed until we land on a draw that is NOT the one we shipped,
      // so the reader sees a genuinely different sample each press
      state.dataSeed = state.dataSeed + 7;
      state.foldSeed = state.foldSeed + 3;
      start(state.dataSeed, state.foldSeed);
    });
  }

  start(137, 1);
  window.__SP2 = state;
})();
