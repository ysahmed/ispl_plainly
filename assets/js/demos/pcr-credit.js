/* ==========================================================================
   pcr-credit.js — Chapter 6, §6.3.1: principal components regression on the
   Credit data (ISLP Figure 6.20).

   Two panels, both against the number of components M:

     left   the standardised coefficient path — what the model actually says
            once you rebuild it out of the first M principal components;
     right  the ten-fold cross-validation MSE, with the fold's means and sds
            computed from the training rows alone, as the book insists.

   The point of the figure is in the gap between the two panels.  The first
   nine components carry 97.6% of the predictors' variance and the model is
   still hopeless; the tenth component carries 2.4% and fixes everything,
   because Balance needs Income set against Limit and Rating — a *contrast*,
   which PC1 (all three rising together) cannot express.  Nothing in the
   variance shares warns you about that, which is exactly why PCR's M is
   chosen with the right-hand panel and not the left.
   ========================================================================== */
(function () {
  'use strict';
  var cPath = document.getElementById('prc-path');
  var cCv = document.getElementById('prc-cvc');
  if (!cPath || !cCv || typeof Plot === 'undefined' || typeof Stats === 'undefined') return;
  if (!window.CH03_CREDIT) return;

  var C = window.CH03_CREDIT;
  var y = C.balance, n = y.length, i, j, k, f, M;
  function dummy(codes, kk) { return codes.map(function (c) { return c === kk ? 1 : 0; }); }
  var COLS = [
    C.income, C.limit, C.rating, C.cards, C.age, C.education,
    C.student, C.gender, C.married, dummy(C.ethnicity, 1), dummy(C.ethnicity, 2)
  ];
  var NAMES = ['Income', 'Limit', 'Rating', 'Cards', 'Age', 'Education',
               'Student', 'Gender', 'Married', 'EthAsian', 'EthCauc'];
  // the four the book calls the most important predictors on this data (§6.2)
  var EMPH = [0, 1, 2, 6];
  var P = COLS.length;

  /* ---------------------------------------------- the full-sample path */
  var pre = Stats.prepare(COLS, y);           // eq. (6.6), sd over n
  var Z = pre.Z, yc = pre.y;

  var prFull = Stats.pca(Z);
  var tot = 0;
  for (j = 0; j < P; j++) tot += prFull.values[j];
  var share = [], cum = 0;                     // share[m-1] = first m components
  for (M = 0; M < P; M++) { cum += prFull.values[M]; share.push(cum / tot); }

  var path = [];
  for (M = 1; M <= P; M++) path.push(Stats.pcr(Z, yc, M).beta);

  // the book's remark that PCR with M = p is just least squares, checked
  var olsB = Stats.ols(Z, yc).beta, lsGap = 0;
  for (j = 0; j < P; j++) lsGap = Math.max(lsGap, Math.abs(path[P - 1][j] - olsB[j]));

  // how well each component correlates with the response — the reason the
  // variance shares in share[] are the wrong guide to choosing M
  function corrWithY(v) {
    var mv = 0, my = 0;
    for (i = 0; i < n; i++) { mv += v[i]; my += y[i]; }
    mv /= n; my /= n;
    var sv = 0, sy = 0, cp = 0, a, b;
    for (i = 0; i < n; i++) { a = v[i] - mv; b = y[i] - my; sv += a * a; sy += b * b; cp += a * b; }
    return cp / Math.sqrt(sv * sy);
  }
  var ry = [];
  for (k = 0; k < P; k++) ry.push(corrWithY(prFull.scores[k]));
  var PC1_R = ry[0], PC10_R = ry[9];

  /* ------------------------------------------------ ten-fold cross-val */
  // Fold k gets its own means and sds — every aspect of the fit, including
  // the standardisation, is learned from the training rows only.
  var ids = Stats.kfolds(n, 10, 7);
  var cv = [];
  for (M = 1; M <= P; M++) cv.push(0);

  for (f = 0; f < 10; f++) {
    // fold f is the *held-out* fold: the other nine train it
    var trX = [], teX = [], trY = [], teY = [];
    for (i = 0; i < n; i++) {
      var row = [];
      for (j = 0; j < P; j++) row.push(COLS[j][i]);
      if (ids[i] === f) { teX.push(row); teY.push(y[i]); }
      else { trX.push(row); trY.push(y[i]); }
    }
    var mu = [], sd = [];
    for (j = 0; j < P; j++) {
      var m0 = 0;
      for (i = 0; i < trX.length; i++) m0 += trX[i][j];
      m0 /= trX.length;
      var s1 = 0, d0;
      for (i = 0; i < trX.length; i++) { d0 = trX[i][j] - m0; s1 += d0 * d0; }
      mu[j] = m0;
      // eq. (6.6) again.  360 training rows — no column is ever constant
      // here, but a silent 0/0 would poison every number on the panel.
      sd[j] = s1 > 0 ? Math.sqrt(s1 / trX.length) : 1;
    }
    var Ztr = trX.map(function (r) {
      return r.map(function (v, jj) { return (v - mu[jj]) / sd[jj]; });
    });
    var Zte = teX.map(function (r) {
      return r.map(function (v, jj) { return (v - mu[jj]) / sd[jj]; });
    });

    var pr = Stats.pca(Ztr);                   // one decomposition per fold
    for (M = 1; M <= P; M++) {
      var Xs = [];
      for (i = 0; i < Ztr.length; i++) {
        var rr = [1];
        for (k = 0; k < M; k++) rr.push(pr.scores[k][i]);
        Xs.push(rr);
      }
      var ff = Stats.ols(Xs, trY);
      var beta = new Array(P).fill(0);
      for (k = 0; k < M; k++) for (j = 0; j < P; j++) beta[j] += ff.beta[k + 1] * pr.dirs[k][j];
      var sse = 0, yh, e;
      for (i = 0; i < Zte.length; i++) {
        yh = ff.beta[0];
        for (j = 0; j < P; j++) yh += Zte[i][j] * beta[j];
        e = teY[i] - yh;
        sse += e * e;
      }
      cv[M - 1] += sse;
    }
  }
  for (M = 1; M <= P; M++) cv[M - 1] /= n;

  var iMin = 0;
  for (M = 1; M < P; M++) if (cv[M] < cv[iMin]) iMin = M;

  var xLo = 0.5, xHi = P + 0.5;
  var bLo = 0, bHi = 0;
  path.forEach(function (b) {
    b.forEach(function (v) { if (v < bLo) bLo = v; if (v > bHi) bHi = v; });
  });
  bLo = Math.floor(bLo / 50) * 50 - 25;
  bHi = Math.ceil(bHi / 50) * 50 + 25;

  var state = { m: iMin + 1 };

  /* -------------------------------------------------------------- plots */
  var pathPlot = new Plot(cPath, {
    range: { xmin: xLo, xmax: xHi, ymin: bLo, ymax: bHi },
    height: 300, xlabel: 'number of components M', ylabel: 'standardised coefficient',
    draw: function (p) {
      p.setRange({ xmin: xLo, xmax: xHi, ymin: bLo, ymax: bHi });
      p.axes();
      for (j = 0; j < P; j++) {
        var pts = [];
        for (M = 1; M <= P; M++) pts.push([M, path[M - 1][j]]);
        var big = EMPH.indexOf(j) >= 0;
        p.line(pts, { color: big ? p.colors.accent : p.colors.axis,
                      width: big ? 2.2 : 1.1 });
      }
      // the labels sit at M = P, ordered by how the paths end up there
      [1, 2, 6, 0].forEach(function (jj) {
        var last = path[P - 1][jj];
        p.text(NAMES[jj], P - 0.35, last,
          { color: p.colors.accent, align: 'right',
            base: jj === 0 ? 'top' : 'bottom', font: '11px system-ui, sans-serif' });
      });
      p.vline(state.m, { color: p.colors.accent2, width: 1.8 });
      p.text('M = ' + state.m, state.m, bHi,
        { color: p.colors.accent2, align: 'left', base: 'top', font: '11px system-ui, sans-serif' });
    }
  });

  var cvTop = Math.max.apply(null, cv) * 1.12;
  var cvPlot = new Plot(cCv, {
    range: { xmin: xLo, xmax: xHi, ymin: 0, ymax: cvTop },
    height: 300, xlabel: 'number of components M', ylabel: 'ten-fold CV mean squared error',
    draw: function (p) {
      p.setRange({ xmin: xLo, xmax: xHi, ymin: 0, ymax: cvTop });
      p.axes();
      var pts = [];
      for (M = 1; M <= P; M++) pts.push([M, cv[M - 1]]);
      p.line(pts, { color: p.colors.accent, width: 2.4 });
      for (M = 1; M <= P; M++) p.dot(M, cv[M - 1], { color: p.colors.accent, r: 3.6 });
      p.dot(iMin + 1, cv[iMin], { color: p.colors.accent2, r: 6 });
      p.text('CV minimum', iMin + 1, cv[iMin] + cvTop * 0.06,
        { color: p.colors.accent2, align: iMin >= P - 1 ? 'right' : 'center',
          base: 'bottom', font: '11px system-ui, sans-serif' });
      p.vline(state.m, { color: p.colors.accent2, width: 1.8 });
    }
  });

  /* ---------------------------------------------------------- interaction */
  var slider = document.getElementById('prc-m');
  var elNow = document.getElementById('prc-now');
  var elCv = document.getElementById('prc-cv');
  var elBest = document.getElementById('prc-best');
  var elShare = document.getElementById('prc-share');
  var elTop = document.getElementById('prc-top');
  var elPc = document.getElementById('prc-pc');

  function num(v, d) {
    var s = Math.abs(v).toFixed(d || 0);
    var parts = s.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return (v < 0 ? '−' : '') + parts.join('.');
  }

  function update() {
    pathPlot.render();
    cvPlot.render();
    var m = state.m;
    if (elNow) {
      elNow.innerHTML = 'M = <b>' + m + '</b> component' + (m === 1 ? '' : 's') +
        (m === P ? ' · the whole predictor space, and least squares again — ' +
                   'largest coefficient gap <b>' + lsGap.toExponential(1).replace('e-', 'e−') +
                   '</b>' : '');
    }
    if (elCv) elCv.innerHTML = 'CV MSE at this M: <b>' + num(cv[m - 1], 1) + '</b>';
    if (elBest) {
      elBest.innerHTML = 'CV minimum at M = <b>' + (iMin + 1) + '</b> (' + num(cv[iMin], 1) +
        ') · the book reports <b>M = 10</b>';
    }
    if (elShare) {
      elShare.innerHTML = 'those M components carry <b>' + (share[m - 1] * 100).toFixed(1) +
        '%</b> of the predictors&rsquo; variance';
    }
    if (elPc) {
      function sgn2(v) { return (v < 0 ? '−' : '+') + Math.abs(v).toFixed(2); }
      elPc.innerHTML = 'PC1 ↔ Balance <b>' + sgn2(PC1_R) + '</b> with Income/Limit/Rating ' +
        'loading <b>' + sgn2(prFull.dirs[0][0]) + '/' + sgn2(prFull.dirs[0][1]) + '/' +
        sgn2(prFull.dirs[0][2]) + '</b> · PC10 ↔ Balance <b>' + sgn2(PC10_R) +
        '</b> with loading <b>' + sgn2(prFull.dirs[9][0]) + '/' + sgn2(prFull.dirs[9][1]) +
        '/' + sgn2(prFull.dirs[9][2]) + '</b> — Income set against the other two';
    }
    if (elTop) {
      var order = EMPH.slice().sort(function (a, b) {
        return Math.abs(path[m - 1][b]) - Math.abs(path[m - 1][a]);
      });
      var txt = '';
      order.forEach(function (jj) {
        var v = path[m - 1][jj];
        txt += (txt ? ' · ' : '') + NAMES[jj] + ' ' + (v < 0 ? '−' : '+') + Math.abs(v).toFixed(0);
      });
      elTop.innerHTML = txt;
    }
  }
  function setM(v) {
    state.m = Math.max(1, Math.min(P, Math.round(v)));
    if (slider) slider.value = String(state.m);
    update();
  }
  if (slider) slider.addEventListener('input', function () { setM(+slider.value); });

  setM(iMin + 1);

  window.__PRC = { cv: cv, iMin: iMin, share: share, lsGap: lsGap,
                   path: path, names: NAMES, ids: ids, ry: ry };
})();
