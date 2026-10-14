/* ==========================================================================
   sm-shrink.js — Chapter 7, §7.5.1: equation (7.11), the two ends of lambda.

   The book defines the smoothing spline as the function minimising

       SUM (y_i - g(x_i))^2  +  lambda INT g''(t)^2 dt

   and then describes both extremes in words: at lambda = 0 the penalty
   vanishes and the fit interpolates; at lambda -> infinity the answer is
   the least squares straight line.  This demo puts both ends on one dial
   so the middle can be seen to be a genuine interpolation between them,
   and prints the two terms of the objective while you drag.

   Three readouts are set once, at load, and do not move:

     * the lambda = 0 fit, which on this data can only reach the 61 distinct
       ages — its RSS is the spread between men of the same age, the floor
       no function of age can get under;
     * the same RSS computed by an ordinary natural spline with a knot at
       every distinct age (page 7.3's family, at its largest size), which is
       the book's claim that the smoothing spline at lambda = 0 is a natural
       cubic spline with knots at x_1, ..., x_n;
     * the leverage at lambda = 0, which reaches 1.000000000000 for the one
       age that has a single man in it — the fact that will make equation
       (7.14) divide by zero in the third demo.
   ========================================================================== */
(function () {
  'use strict';
  var cPlot = document.getElementById('sm-sh-plot');
  var cPath = document.getElementById('sm-sh-path');
  if (!cPlot || !cPath || typeof Plot === 'undefined' || typeof Stats === 'undefined' ||
      typeof CH07_WAGE === 'undefined') return;

  var W = window.CH07_WAGE;
  var age = W.age, y = W.wage;          /* the shared arrays: memo key */
  var SS = Stats.smoothSpline(age, y);
  var XMIN = 18, XMAX = 80, grid = [], i;
  for (i = XMIN; i <= XMAX + 0.001; i += 0.2) grid.push(Math.round(i * 10) / 10);
  var scatter = age.map(function (a, r) { return [a, y[r]]; });

  var elL = document.getElementById('sm-sh-l');
  var elDf = document.getElementById('sm-sh-df');
  var elLam = document.getElementById('sm-sh-lam');
  var elRss = document.getElementById('sm-sh-rss');
  var elRough = document.getElementById('sm-sh-rough');
  var elGap = document.getElementById('sm-sh-gap');
  var elZero = document.getElementById('sm-sh-zero');
  var elSame = document.getElementById('sm-sh-same');
  if (!elL || !elDf || !elLam || !elRss || !elRough || !elGap || !elZero || !elSame) return;

  /* ---- the two facts that do not depend on the slider ------------------- */
  var zero = SS.fitL(-Infinity);
  elZero.textContent = 'λ = 0: ' + SS.knots.length + ' interior knots at ' + SS.M +
    ' distinct ages · df ' + zero.df.toFixed(2) + ' · RSS ' +
    Math.round(zero.rss).toLocaleString('en-US') + ' · largest leverage ' +
    Math.max.apply(null, zero.Sii).toFixed(12);

  var ns = Stats.natSpline(age, SS.M - 1, { knots: SS.knots, lo: SS.lo, hi: SS.hi });
  var nsFit = Stats.ols(Stats.design(ns.cols), y);
  elSame.textContent = 'same RSS from a plain natural spline with those knots: λ 0 ' +
    Math.round(zero.rss).toLocaleString('en-US') + ' · ns ' +
    Math.round(nsFit.rss).toLocaleString('en-US');

  /* ---- straight line and the unfitted spline, drawn once as ghosts ------ */
  var lin = Stats.polyBasis(age, 1);
  var linFit = Stats.ols(Stats.design(lin.cols), y);
  var linCols = lin.apply(grid), linV = [], r;
  for (r = 0; r < grid.length; r++) {
    var lv = linFit.beta[0], q;
    for (q = 0; q < linCols.length; q++) lv += linCols[q][r] * linFit.beta[q + 1];
    linV.push(lv);
  }
  var zeroV = SS.curve(zero, grid);
  var tbl = SS.table();

  var cache = {}, cur = null;
  function fit() {
    var L = +elL.value;
    if (cache[L]) return cache[L];
    var f = SS.fitL(L), v = SS.curve(f, grid), r, gap = 0;
    for (r = 0; r < grid.length; r++) gap = Math.max(gap, Math.abs(v[r] - linV[r]));
    cache[L] = { L: L, f: f, v: v, gap: gap };
    return cache[L];
  }

  var plot = new Plot(cPlot, {
    range: { xmin: XMIN - 1, xmax: XMAX + 1, ymin: 0, ymax: 330 },
    height: 300, xlabel: 'Age', ylabel: 'Wage (thousands of dollars)',
    draw: function (p) {
      cur = fit();
      p.axes();
      p.points(scatter, { color: p.colors.grid, alpha: 0.45, r: 2 });
      p.clip(function () {
        /* the two ends of the dial, in grey: lambda = 0 and lambda = infinity */
        p.line(grid.map(function (g, r) { return [g, zeroV[r]]; }),
          { color: p.colors.axis, width: 1.4 });
        p.line(grid.map(function (g, r) { return [g, linV[r]]; }),
          { color: p.colors.axis, width: 1.6, dash: [5, 4] });
        p.line(grid.map(function (g, r) { return [g, cur.v[r]]; }),
          { color: p.colors.accent, width: 2.4 });
      });
      p.text('λ = 0: every distinct age gets its own knot', XMIN, 46, {
        color: p.colors.axis, font: '11.5px system-ui, sans-serif'
      });
      p.text('λ → ∞: the least squares line', XMIN, 30, {
        color: p.colors.axis, font: '11.5px system-ui, sans-serif'
      });
      p.text('λ = 10^' + cur.L.toFixed(1), XMAX, 46, {
        align: 'right', color: p.colors.accent, font: 'bold 12px system-ui, sans-serif'
      });
    }
  });

  var pathPlot = new Plot(cPath, {
    range: { xmin: 0, xmax: 64, ymin: 4.65e6, ymax: 5.06e6 },
    height: 300, xlabel: 'Effective degrees of freedom (eq. 7.13)',
    ylabel: 'RSS (thousands of dollars squared)',
    draw: function (p) {
      p.axes();
      p.line(tbl.map(function (t) { return [t.df, t.rss]; }),
        { color: p.colors.accent, width: 2.2 });
      p.dot(2, 5022216.1, { color: p.colors.axis, r: 3.5 });
      p.dot(61, 4686410.7, { color: p.colors.axis, r: 3.5 });
      p.dot(cur.f.df, cur.f.rss, { color: p.colors.accent2, r: 5 });
      p.text('the price of smoothness', 4, 4.70e6, {
        color: p.colors.fg, font: 'bold 12px system-ui, sans-serif'
      });
      p.text('df 2 · RSS 5,022,216', 3.5, 5.02e6, {
        color: p.colors.axis, font: '11px system-ui, sans-serif'
      });
      p.text('df 61 · RSS 4,686,411', 40, 4.715e6, {
        color: p.colors.axis, font: '11px system-ui, sans-serif'
      });
    }
  });

  function fmtRough(v) {
    return v >= 100 ? Math.round(v).toLocaleString('en-US') : v.toFixed(4);
  }

  function render() {
    cur = fit();
    elDf.textContent = 'effective df ' + cur.f.df.toFixed(2);
    elLam.textContent = 'log10 λ ' + cur.L.toFixed(2);
    elRss.textContent = 'RSS ' + Math.round(cur.f.rss).toLocaleString('en-US');
    elRough.textContent = 'roughness ∫g″² ' + fmtRough(cur.f.rough);
    elGap.textContent = 'distance from the line ' + cur.gap.toFixed(1);
    plot.render();
    pathPlot.render();
  }

  elL.addEventListener('input', render);
  render();
})();
