/* ==========================================================================
   sub-criteria.js — Chapter 6, §6.1.3: choosing the model's size on Credit
   (ISLP Figures 6.2 and 6.3).

   Upper figure: the three "adjusted training error" rulers — C_p, BIC and
   adjusted R², formulas (6.2)–(6.4), with σ̂² estimated from the full model
   exactly as the book prescribes.  Lower figure: the two direct estimates
   from Chapter 5 (a validation quarter-split and ten-fold CV) beside √BIC, all
   three on one shared square-root scale so their minima can be compared by
   eye, each with the book's blue cross at its own winner.
   ========================================================================== */
(function () {
  'use strict';
  var elCpBic = document.getElementById('crit-cp-bic');
  var elAdj = document.getElementById('crit-adj');
  var elBic = document.getElementById('est-bic');
  var elVal = document.getElementById('est-val');
  var elCv = document.getElementById('est-cv');
  if (!elCpBic || !elAdj || !elBic || !elVal || !elCv ||
      typeof Plot === 'undefined' || typeof Stats === 'undefined') return;

  var C = window.CH03_CREDIT;
  var y = C.balance, n = y.length, i, j;

  function dummy(codes, k) { return codes.map(function (c) { return c === k ? 1 : 0; }); }
  var COLS = [
    C.income, C.limit, C.rating, C.cards, C.age, C.education,
    C.student, C.gender, C.married, dummy(C.ethnicity, 1), dummy(C.ethnicity, 2)
  ];
  var NAMES = ['Income', 'Limit', 'Rating', 'Cards', 'Age', 'Education',
               'Student', 'Gender', 'Married', 'Ethnicity[Asian]',
               'Ethnicity[Caucasian]'];
  var P = COLS.length;

  function namesOf(idxs) {
    return idxs.map(function (jj) { return NAMES[jj]; }).join(', ');
  }
  function fitOn(idxs, rows) {
    var X = [], a, t;
    for (a = 0; a < rows.length; a++) X.push([1]);
    for (t = 0; t < idxs.length; t++) {
      var col = COLS[idxs[t]];
      for (a = 0; a < rows.length; a++) X[a].push(col[rows[a]]);
    }
    var yy = rows.map(function (a2) { return y[a2]; });
    return Stats.ols(X, yy);
  }

  /* -------------------------------------- the frontier, on all 400 rows */
  var allRows = [];
  for (i = 0; i < n; i++) allRows.push(i);
  var pre = Stats.prepare(COLS, y);
  var cpG = Stats.crossprod(pre.Z, pre.y);
  var yty = 0;
  for (i = 0; i < n; i++) yty += pre.y[i] * pre.y[i];
  var tss = yty;

  function bestPerSize(rows, colsIn, yIn) {
    var colsF = colsIn.map(function (c) { return rows.map(function (a) { return c[a]; }); });
    var yF = rows.map(function (a) { return yIn[a]; });
    var preF = Stats.prepare(colsF, yF);
    var cpF = Stats.crossprod(preF.Z, preF.y);
    var ytyF = 0;
    for (var a = 0; a < yF.length; a++) ytyF += preF.y[a] * preF.y[a];
    var best = [];
    for (var d2 = 0; d2 <= colsIn.length; d2++) best.push(null);
    for (var mask = 1; mask < (1 << colsIn.length); mask++) {
      var idx = [];
      for (var jj = 0; jj < colsIn.length; jj++) if (mask & (1 << jj)) idx.push(jj);
      var r = Stats.rssFrom(cpF.G, cpF.g, ytyF, idx);
      if (!best[idx.length] || r < best[idx.length].rss) best[idx.length] = { rss: r, idx: idx };
    }
    return best;
  }

  var sel = bestPerSize(allRows, COLS, y);
  var frontier = [];
  for (var d = 1; d <= P; d++) frontier.push(fitOn(sel[d].idx, allRows).rss);

  var sigma2 = frontier[P - 1] / (n - P - 1);        // from the full model, per the book
  var crit = frontier.map(function (rss, k) {
    return Stats.criteria(rss, n, k + 1, sigma2, tss);
  });

  function argmin(key) {
    var b = 0;
    for (var k = 1; k < P; k++) if (crit[k][key] < crit[b][key]) b = k;
    return b;                                        // 0-based; size = b + 1
  }
  function argmax(key) {
    var b = 0;
    for (var k = 1; k < P; k++) if (crit[k][key] > crit[b][key]) b = k;
    return b;                                        // 0-based; size = b + 1
  }
  var cpWin = argmin('cp'), bicWin = argmin('bic'), adjWin = argmax('adjr2');
  var bicSqrt = crit.map(function (c) { return Math.sqrt(c.bic); });

  /* ------------------------------------ direct estimates: split and folds */
  var valSeed = 11, cvSeed = 7;

  function valCurve() {
    // the book's Figure 6.3 used a three-quarter / one-quarter split
    var ids = Stats.kfolds(n, 4, valSeed);
    var train = [], valid = [];
    for (var a = 0; a < n; a++) (ids[a] === 0 ? valid : train).push(a);
    var best = bestPerSize(train, COLS, y);
    var out = [];
    for (var d2 = 1; d2 <= P; d2++) {
      var f = fitOn(best[d2].idx, train);
      var sse = 0;
      valid.forEach(function (a3) {
        var yh = f.beta[0];
        best[d2].idx.forEach(function (t, k) { yh += f.beta[k + 1] * COLS[t][a3]; });
        sse += (y[a3] - yh) * (y[a3] - yh);
      });
      out.push(sse / valid.length);
    }
    return out;
  }

  function cvCurve() {
    var ids = Stats.kfolds(n, 10, cvSeed);
    var sse = [];
    for (var d2 = 0; d2 <= P; d2++) sse.push(0);
    for (var f = 0; f < 10; f++) {
      var train = [], test = [];
      for (var a = 0; a < n; a++) (ids[a] === f ? test : train).push(a);
      var best = bestPerSize(train, COLS, y);
      for (var d3 = 1; d3 <= P; d3++) {
        var fit = fitOn(best[d3].idx, train);
        test.forEach(function (a4) {
          var yh = fit.beta[0];
          best[d3].idx.forEach(function (t, k) { yh += fit.beta[k + 1] * COLS[t][a4]; });
          sse[d3] += (y[a4] - yh) * (y[a4] - yh);
        });
      }
    }
    // index 0..P-1 -> size d = index+1, same shape as valCurve()
    return sse.slice(1).map(function (v) { return v / n; });
  }

  var trainMse = frontier.map(function (r) { return r / n; });
  var val = valCurve(), cv = cvCurve();
  var valWin = 0, cvWin = 0;
  for (d = 1; d < P; d++) {
    if (val[d] < val[valWin]) valWin = d;
    if (cv[d] < cv[cvWin]) cvWin = d;
  }

  /* ------------------------------------------------------------- drawing */
  function cross(p, x, v) {
    p.text('✕', x, v, { color: p.colors.accent, align: 'center', base: 'middle',
      font: 'bold 15px system-ui, sans-serif' });
  }

  var state = { hover: 0 };

  var cpBicPlot = new Plot(elCpBic, {
    range: { xmin: 0.5, xmax: P + 0.5, ymin: 0, ymax: Math.max(crit[0].cp, crit[0].bic) * 1.08 },
    height: 280, xlabel: 'number of variables (d)', ylabel: 'C_p (red) · BIC (blue)',
    draw: function (p) {
      p.axes();
      p.line(crit.map(function (c, k) { return [k + 1, c.cp]; }), { color: p.colors.accent2, width: 2 });
      p.line(crit.map(function (c, k) { return [k + 1, c.bic]; }), { color: p.colors.accent, width: 2 });
      p.points(crit.map(function (c, k) { return [k + 1, c.cp]; }), { color: p.colors.accent2, r: 3 });
      p.points(crit.map(function (c, k) { return [k + 1, c.bic]; }), { color: p.colors.accent, r: 3 });
      cross(p, cpWin + 1, crit[cpWin].cp);
      cross(p, bicWin + 1, crit[bicWin].bic);
      p.vline(state.hover + 1, { color: p.colors.axis, dash: [3, 3] });
      p.text('C_p', 9.4, crit[8].cp, { color: p.colors.accent2, base: 'bottom' });
      p.text('BIC', 9.4, crit[8].bic, { color: p.colors.accent, base: 'top' });
    }
  });

  var adjPlot = new Plot(elAdj, {
    range: { xmin: 0.5, xmax: P + 0.5,
             ymin: Math.min.apply(null, crit.map(function (c) { return c.adjr2; })) - 0.02,
             ymax: 0.965 },
    height: 280, xlabel: 'number of variables (d)', ylabel: 'adjusted R²',
    draw: function (p) {
      p.axes();
      p.line(crit.map(function (c, k) { return [k + 1, c.adjr2]; }), { color: p.colors.good, width: 2 });
      p.points(crit.map(function (c, k) { return [k + 1, c.adjr2]; }), { color: p.colors.good, r: 3 });
      cross(p, adjWin + 1, crit[adjWin].adjr2);
      p.vline(state.hover + 1, { color: p.colors.axis, dash: [3, 3] });
    }
  });

  /* the three direct panels share one y-scale, as in the book's Figure 6.3 */
  function sharedRange(curves) {
    var lo = Infinity, hi = -Infinity;
    curves.forEach(function (c) {
      c.forEach(function (v, k) {
        if (k === 0) return;
        if (v < lo) lo = v;
        if (v > hi) hi = v;
      });
    });
    var pad = (hi - lo) * 0.08;
    return { ymin: Math.max(0, lo - pad), ymax: hi + pad };
  }
  var sr = sharedRange([bicSqrt, val, cv, trainMse.map(Math.sqrt)]);

  function estPanel(el, curve, trainCurve, label) {
    return new Plot(el, {
      range: { xmin: 0.5, xmax: P + 0.5, ymin: sr.ymin, ymax: sr.ymax },
      height: 260, xlabel: 'number of variables (d)', ylabel: label,
      draw: function (p) {
        p.axes();
        if (trainCurve) {
          p.line(trainCurve.map(function (v, k) { return [k + 1, v]; }),
            { color: p.colors.axis, dash: [5, 4], width: 1.5 });
        }
        p.line(curve.map(function (v, k) { return [k + 1, v]; }), { color: p.colors.fg, width: 2 });
        p.points(curve.map(function (v, k) { return [k + 1, v]; }), { color: p.colors.fg, r: 3 });
        var win = 0;
        for (var k2 = 1; k2 < P; k2++) if (curve[k2] < curve[win]) win = k2;
        cross(p, win + 1, curve[win]);
      }
    });
  }
  var bicPlot = estPanel(elBic, bicSqrt, null, '√BIC');
  var valPlot = estPanel(elVal, val, trainMse.map(Math.sqrt), '√validation MSE');
  var cvPlot = estPanel(elCv, cv, trainMse.map(Math.sqrt), '√CV MSE');

  /* ------------------------------------------------------------ controls */
  var elHover = document.getElementById('crit-hover');
  var elSigma = document.getElementById('crit-sigma');
  var elCpW = document.getElementById('crit-cp');
  var elBicW = document.getElementById('crit-bic');
  var elAdjW = document.getElementById('crit-adj');
  var elWins = document.getElementById('est-wins');
  var elSeeds = document.getElementById('est-seeds');
  var btnVal = document.getElementById('est-newval');
  var btnCv = document.getElementById('est-newcv');

  function hoverUpdate() {
    var k = state.hover;
    if (elHover) {
      elHover.innerHTML = 'd = <b>' + (k + 1) + '</b> · C_p ' + crit[k].cp.toFixed(1) +
        ' · BIC ' + crit[k].bic.toFixed(1) + ' · adj R² ' + crit[k].adjr2.toFixed(5);
    }
    cpBicPlot.render();
    adjPlot.render();
  }
  cpBicPlot.o.onPointer = function (pt) {
    if (!pt) return;
    var k = Math.max(1, Math.min(P, Math.round(pt.x))) - 1;
    if (k !== state.hover) { state.hover = k; hoverUpdate(); }
  };

  function estUpdate() {
    valPlot.render();
    cvPlot.render();
    if (elWins) {
      elWins.innerHTML = 'winner: √BIC at <b>d = ' + (bicWin + 1) + '</b> · validation at <b>d = ' +
        (valWin + 1) + '</b> · 10-fold CV at <b>d = ' + (cvWin + 1) + '</b>';
    }
    if (elSeeds) {
      elSeeds.innerHTML = 'split #' + valSeed + ' (¼ held out) · fold seed ' + cvSeed;
    }
  }
  if (btnVal) btnVal.addEventListener('click', function () { valSeed++; val = valCurve();
    valWin = 0; for (d = 1; d < P; d++) if (val[d] < val[valWin]) valWin = d; estUpdate(); });
  if (btnCv) btnCv.addEventListener('click', function () { cvSeed += 3; cv = cvCurve();
    cvWin = 0; for (d = 1; d < P; d++) if (cv[d] < cv[cvWin]) cvWin = d; estUpdate(); });

  if (elSigma) {
    elSigma.innerHTML = 'σ̂² = <b>' + sigma2.toFixed(1) + '</b> (full model, ' + (P + 1) +
      ' columns incl. intercept)';
  }
  if (elCpW) {
    elCpW.innerHTML = 'C_p picks <b>' + (cpWin + 1) + ' variables</b>: ' + namesOf(sel[cpWin + 1].idx);
  }
  if (elBicW) {
    elBicW.innerHTML = 'BIC picks <b>' + (bicWin + 1) + ' variables</b>: ' + namesOf(sel[bicWin + 1].idx);
  }
  if (elAdjW) {
    elAdjW.innerHTML = 'adjusted R² picks <b>' + (adjWin + 1) + ' variables</b>: ' + namesOf(sel[adjWin + 1].idx);
  }
  hoverUpdate();
  estUpdate();

  window.__CRIT = {
    frontier: frontier, crit: crit, val: val, cv: cv, trainMse: trainMse,
    sigma2: sigma2, tss: tss, n: n, P: P,
    wins: { cp: cpWin, bic: bicWin, adj: adjWin, val: valWin, cv: cvWin },
    idx: sel.slice(1).map(function (s) { return s.idx; }), names: NAMES
  };
})();
