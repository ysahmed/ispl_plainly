/* ==========================================================================
   shrink-ridge-cv.js — Chapter 6, §6.2.1: choosing λ for ridge regression
   by leave-one-out cross-validation on the Credit data (ISLP Figure 6.12).

   Leave-one-out is normally n separate refits, which would be 400 fits of an
   11-predictor model — slow to watch.  But a ridge fit is a *linear*
   smoother: there is a matrix H(λ) with yhat = H(λ)y, and the leave-one-out
   residual of row i is then exactly

        (y_i - yhat_i) / (1 - h_ii)

   where h_ii is the i-th diagonal of H.  Diagonalising Z'Z once turns both
   yhat and every h_ii into a sum over 11 terms, so all 400 leave-one-out
   fits for a given λ cost O(n p) rather than O(n p^2) — and the whole
   path of 60 λ values is built live as the page loads.

   Left panel:  the LOOCV curve against λ.  Right panel: the ridge
   coefficient path, so the reader can see what "a small amount of
   shrinkage" actually buys.
   ========================================================================== */
(function () {
  'use strict';
  var cCv = document.getElementById('rc-cv');
  var cPath = document.getElementById('rc-path');
  if (!cCv || !cPath || typeof Plot === 'undefined' || typeof Stats === 'undefined') return;
  if (!window.CH03_CREDIT) return;

  var C = window.CH03_CREDIT;
  var y = C.balance, n = y.length, i, j, k;
  function dummy(codes, kk) { return codes.map(function (c) { return c === kk ? 1 : 0; }); }
  var COLS = [
    C.income, C.limit, C.rating, C.cards, C.age, C.education,
    C.student, C.gender, C.married, dummy(C.ethnicity, 1), dummy(C.ethnicity, 2)
  ];
  var NAMES = ['Income', 'Limit', 'Rating', 'Cards', 'Age', 'Education',
               'Student', 'Gender', 'Married', 'Ethnicity[Asian]',
               'Ethnicity[Caucasian]'];
  var P = COLS.length;

  var pre = Stats.prepare(COLS, y);
  var Z = pre.Z, yc = pre.y;

  var eg = Stats.eigSym(Stats.crossprod(Z, yc).G);   // Z'Z = U diag(d) U'
  var d = eg.values, U = eg.vectors;
  // W = Z U, so that H = W diag(1/(d+λ)) Wᵀ and β̂λ = W (c/(d+λ)) with c = Wᵀy
  var W = [], cvec = new Array(P).fill(0);
  for (i = 0; i < n; i++) {
    var row = [];
    for (k = 0; k < P; k++) {
      var s = 0;
      for (j = 0; j < P; j++) s += Z[i][j] * U[k][j];
      row.push(s);
      cvec[k] += s * yc[i];
    }
    W.push(row);
  }

  /* ------------------------------------------------------------- the grid
     Book scale (RSS + λΣβ²).  λ from 1e-2 to 1e4 spans "no shrinkage at
     all" through "everything is zero", and the LOOCV minimum sits inside
     it rather than on either edge. */
  var M = 60, LAM0 = 1e-2, LAM1 = 1e4;
  var lambdas = [], mse = [], ses = [], path = [];
  for (k = 0; k < M; k++) lambdas.push(LAM0 * Math.pow(LAM1 / LAM0, k / (M - 1)));

  for (k = 0; k < M; k++) {
    var lam = lambdas[k], inv = new Array(P), ss = 0, ss2 = 0;
    for (var q = 0; q < P; q++) inv[q] = 1 / (d[q] + lam);
    for (i = 0; i < n; i++) {
      var yh = 0, hh = 0;
      for (var kk = 0; kk < P; kk++) {
        var w = W[i][kk];
        yh += w * cvec[kk] * inv[kk];
        hh += w * w * inv[kk];
      }
      var e = (yc[i] - yh) / (1 - hh);
      ss += e * e; ss2 += e * e * e * e;
    }
    mse.push(ss / n);
    ses.push(Math.sqrt(Math.max(0, ss2 / n - (ss / n) * (ss / n)) / n));
    // β̂λ = U (c ⊙ inv): the ridge estimate at this λ
    var bvec = [];
    for (var jj = 0; jj < P; jj++) {
      var acc = 0;
      for (var q2 = 0; q2 < P; q2++) acc += U[q2][jj] * cvec[q2] * inv[q2];
      bvec.push(acc);
    }
    path.push(bvec);
  }

  /* ------------------------------------------------- the two chosen λ values */
  var iMin = 0;
  for (k = 1; k < M; k++) if (mse[k] < mse[iMin]) iMin = k;
  var iSe = 0;                       // most-regularised λ within 1 SE of the
  for (k = 0; k < M; k++) if (mse[k] <= mse[iMin] + ses[iMin]) iSe = k;   // minimum
  // "within 1 percent" — the book's point that the dip is not pronounced
  var iLo = 0, iHi = M - 1;
  for (k = 0; k < M; k++) if (mse[k] <= mse[iMin] * 1.01) { iLo = k; break; }
  for (k = M - 1; k >= 0; k--) if (mse[k] <= mse[iMin] * 1.01) { iHi = k; break; }

  var state = { xi: iMin };

  function xOf(kk) { return Math.log10(lambdas[kk]); }
  var xLo = Math.log10(LAM0), xHi = Math.log10(LAM1);

  var cvPlot = new Plot(cCv, {
    range: { xmin: xLo, xmax: xHi, ymin: 0, ymax: 0 },
    height: 300, xlabel: 'log₁₀ λ   (book scale)', ylabel: 'LOOCV mean squared error',
    draw: function (p) {
      var top = Math.max(mse[0], mse[iLo] * 1.15, mse[iMin] * 2);
      p.setRange({ xmin: xLo, xmax: xHi, ymin: 0, ymax: top });
      p.axes();
      // the flat "good enough" band the book describes
      p.cell(xLo, xHi, 0, mse[iMin] * 1.01, p.colors.good, 0.10);
      var pts = [];
      for (var q = 0; q < M; q++) pts.push([xOf(q), mse[q]]);
      p.line(pts, { color: p.colors.accent2, width: 2.5 });
      p.vline(xOf(iMin), { color: p.colors.accent2, dash: [6, 4], width: 1.5 });
      p.vline(xOf(iSe), { color: p.colors.accent, dash: [4, 4], width: 1.5 });
      p.dot(xOf(iMin), mse[iMin], { color: p.colors.accent2, r: 5 });
      p.text('λ min', xOf(iMin), mse[iMin] + top * 0.05,
        { color: p.colors.accent2, align: 'center', base: 'bottom', font: '11px system-ui, sans-serif' });
      p.text('λ 1-SE', xOf(iSe), mse[iMin] + top * 0.05,
        { color: p.colors.accent, align: 'center', base: 'bottom', font: '11px system-ui, sans-serif' });
      p.text('within 1% of the minimum', xOf((iLo + iHi) / 2), top * 0.94,
        { color: p.colors.good, align: 'center', base: 'top', font: '11px system-ui, sans-serif' });
      p.vline(xOf(state.xi), { color: p.colors.fg, dash: [2, 3] });
    }
  });

  var pathPlot = new Plot(cPath, {
    range: { xmin: xLo, xmax: xHi, ymin: -1, ymax: 1 },
    height: 300, xlabel: 'log₁₀ λ   (book scale)', ylabel: 'standardised coefficient',
    draw: function (p) {
      var lo = 0, hi = 0;
      path.forEach(function (b) { b.forEach(function (v) { if (v < lo) lo = v; if (v > hi) hi = v; }); });
      lo = Math.floor(lo); hi = Math.ceil(hi);
      p.setRange({ xmin: xLo, xmax: xHi, ymin: lo, ymax: hi });
      p.axes();
      p.vline(xOf(iMin), { color: p.colors.accent2, dash: [6, 4], width: 1.5 });
      p.vline(xOf(iSe), { color: p.colors.accent, dash: [4, 4], width: 1.5 });
      for (var jj = 0; jj < P; jj++) {
        var pts = [];
        for (var q = 0; q < M; q++) pts.push([xOf(q), path[q][jj]]);
        var big = (jj === 0 || jj === 1 || jj === 2);
        p.line(pts, { color: big ? p.colors.accent : p.colors.axis,
                      width: big ? 2 : 1.2, alpha: big ? 1 : 0.75 });
      }
      [0, 1, 2].forEach(function (jj) {
        p.text(NAMES[jj], xHi, path[M - 1][jj],
          { color: p.colors.accent, align: 'right', base: 'bottom', font: '11px system-ui, sans-serif' });
      });
      p.vline(xOf(state.xi), { color: p.colors.fg, dash: [2, 3] });
    }
  });

  /* ---------------------------------------------------------- interaction */
  var slider = document.getElementById('rc-lam');
  var elMin = document.getElementById('rc-min');
  var elSe = document.getElementById('rc-se');
  var elFlat = document.getElementById('rc-flat');
  var elNow = document.getElementById('rc-now');
  var elCoef = document.getElementById('rc-coef');

  function fmt(v) { return (v >= 0 ? '' : '−') + Math.abs(v).toFixed(2); }

  function update() {
    cvPlot.render();
    pathPlot.render();
    if (elMin) {
      elMin.innerHTML = 'CV minimum at λ = <b>' + lambdas[iMin].toFixed(2) +
        '</b> · MSE <b>' + mse[iMin].toFixed(1) + '</b>';
    }
    if (elSe) elSe.innerHTML = 'one-SE λ = <b>' + lambdas[iSe].toFixed(2) + '</b>';
    if (elFlat) {
      elFlat.innerHTML = 'within 1% of the minimum: λ from <b>' + lambdas[iLo].toFixed(3) +
        '</b> to <b>' + lambdas[iHi].toFixed(1) + '</b>';
    }
    var b = path[state.xi];
    if (elNow) elNow.innerHTML = 'slider λ = <b>' + lambdas[state.xi].toFixed(2) + '</b>';
    if (elCoef) {
      var txt = '';
      [1, 2, 0].forEach(function (jj) { txt += (txt ? ' · ' : '') + NAMES[jj] + ' ' + fmt(b[jj]); });
      elCoef.innerHTML = txt;
    }
  }
  function setXi(v) {
    state.xi = Math.max(0, Math.min(M - 1, v));
    if (slider) slider.value = String(state.xi);
    update();
  }
  if (slider) slider.addEventListener('input', function () { setXi(+slider.value); });

  setXi(iMin);
  window.__RC = { lambdas: lambdas, mse: mse, iMin: iMin, iSe: iSe, iLo: iLo, iHi: iHi };
})();
