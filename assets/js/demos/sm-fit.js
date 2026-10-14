/* ==========================================================================
   sm-fit.js — Chapter 7, §7.5.2: ISLP Figure 7.8.

   The book draws two smoothing splines on the same Wage data: a red one
   asked for by its effective degrees of freedom (16, "rather wigglier") and
   a blue one whose lambda was picked by leave-one-out cross-validation,
   which "results in 6.8 effective degrees of freedom".  Both are here,
   fitted live from equation (7.11) and equation (7.13) — the red one on a
   slider, the blue one by minimising the leave-one-out formula over
   lambda.  The lower panel is the criterion the blue curve minimises:
   the leave-one-out RSS against the effective degrees of freedom it was
   bought with.

   Two honest notes that belong on the figure, not in the prose:

     * our leave-one-out minimum sits at 6.82 degrees of freedom against
       the book's 6.8 — the same choice, to the digit the book prints.  The
       criterion is extremely flat around it: from df 4 to df 60 it never
       rises more than about 1.6 percent above its minimum, while the fall
       into the minimum from the straight line is about 5 percent.
     * the book says the two curves show "little discernible difference".
       That is a claim about a number, so this demo prints the number: the
       largest gap between the two curves anywhere on the plot, and where
       it is.
   ========================================================================== */
(function () {
  'use strict';
  var cCurves = document.getElementById('sm-fi-curves');
  var cCv = document.getElementById('sm-fi-cv');
  if (!cCurves || !cCv || typeof Plot === 'undefined' || typeof Stats === 'undefined' ||
      typeof CH07_WAGE === 'undefined') return;

  var W = window.CH07_WAGE;
  var age = W.age, y = W.wage;          /* the shared arrays: memo key */
  var SS = Stats.smoothSpline(age, y);
  var XMIN = 18, XMAX = 80, grid = [], i;
  for (i = XMIN; i <= XMAX + 0.001; i += 0.2) grid.push(Math.round(i * 10) / 10);
  var scatter = age.map(function (a, r) { return [a, y[r]]; });

  var elDf = document.getElementById('sm-fi-df');
  var elDfread = document.getElementById('sm-fi-dfread');
  var elRss = document.getElementById('sm-fi-rss');
  var elCv = document.getElementById('sm-fi-cvread');
  var elGap = document.getElementById('sm-fi-gap');
  if (!elDf || !elDfread || !elRss || !elCv || !elGap) return;

  function fmtRough(v) {
    return v >= 100 ? Math.round(v).toLocaleString('en-US') : v.toFixed(4);
  }
  function money2(v) {
    return v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  var tbl = SS.table();
  var loo = SS.loocv();                       /* the blue curve's lambda */
  var blueV = SS.curve(loo.f, grid);

  /* the book's blue curve, in numbers: its effective df, its criterion, and
     the same criterion per observation for comparison with section 7.1 */
  elCv.textContent = 'LOOCV chose df ' + loo.f.df.toFixed(2) + ' · CV RSS ' +
    Math.round(loo.f.cv).toLocaleString('en-US') + ' · CV MSE ' +
    money2(loo.f.cv / SS.n) + ' · fit RSS ' +
    Math.round(loo.f.rss).toLocaleString('en-US') + ' · roughness ' +
    fmtRough(loo.f.rough);

  var cache = {}, cur = null;
  function fit() {
    var target = +elDf.value;
    if (cache[target]) return cache[target];
    var f = SS.fitL(SS.lamForDf(target)), v = SS.curve(f, grid), r, j, gap = 0, at = 0, sum = 0;
    for (r = 0; r < grid.length; r++) {
      var d2 = Math.abs(v[r] - blueV[r]);
      if (d2 > gap) { gap = d2; at = grid[r]; }
      sum += d2;
    }
    cache[target] = { df: target, f: f, v: v, gap: gap, at: at, mean: sum / grid.length };
    return cache[target];
  }

  var curvePlot = new Plot(cCurves, {
    range: { xmin: XMIN - 1, xmax: XMAX + 1, ymin: 0, ymax: 330 },
    height: 300, xlabel: 'Age', ylabel: 'Wage (thousands of dollars)',
    draw: function (p) {
      cur = fit();
      p.axes();
      p.points(scatter, { color: p.colors.grid, alpha: 0.45, r: 2 });
      p.clip(function () {
        p.line(grid.map(function (g, r) { return [g, cur.v[r]]; }),
          { color: p.colors.accent2, width: 2.4 });
        p.line(grid.map(function (g, r) { return [g, blueV[r]]; }),
          { color: p.colors.accent, width: 2.2 });
      });
      p.text('λ = 10^' + SS.lamForDf(cur.df).toFixed(2) + ' · df ' + cur.f.df.toFixed(2), 19, 46, {
        color: p.colors.accent2, font: 'bold 12px system-ui, sans-serif'
      });
      p.text('λ chosen by leave-one-out · df ' + loo.f.df.toFixed(2), 19, 30, {
        color: p.colors.accent, font: 'bold 12px system-ui, sans-serif'
      });
    }
  });

  var cvPlot = new Plot(cCv, {
    range: { xmin: 0, xmax: 62, ymin: 4.75e6, ymax: 5.06e6 },
    height: 260, xlabel: 'Effective degrees of freedom (eq. 7.13)',
    ylabel: 'Leave-one-out RSS (eq. after 7.13)',
    draw: function (p) {
      p.axes();
      p.clip(function () {
        p.line(tbl.map(function (t) { return [t.df, t.cv]; }),
          { color: p.colors.accent, width: 2.2 });
        p.vline(cur.f.df, { color: p.colors.accent2, dash: [5, 4], width: 1.6 });
      });
      p.dot(loo.f.df, loo.f.cv, { color: p.colors.accent, r: 5 });
      p.text('lowest here: df ' + loo.f.df.toFixed(2), 12, 4.86e6, {
        color: p.colors.accent, font: 'bold 11.5px system-ui, sans-serif'
      });
      p.text('the straight line costs 5,028,705', 3, 5.035e6, {
        color: p.colors.axis, font: '11px system-ui, sans-serif'
      });
    }
  });

  function render() {
    cur = fit();
    elDfread.textContent = 'red curve: effective df ' + cur.f.df.toFixed(2);
    elRss.textContent = 'red RSS ' + Math.round(cur.f.rss).toLocaleString('en-US') +
      ' · leave-one-out ' + Math.round(cur.f.cv).toLocaleString('en-US') +
      ' · roughness ' + fmtRough(cur.f.rough);
    elGap.textContent = 'largest gap red vs blue ' + cur.gap.toFixed(1) +
      ' at age ' + cur.at + ' · mean ' + cur.mean.toFixed(1);
    curvePlot.render();
    cvPlot.render();
  }

  elDf.addEventListener('input', render);
  render();
})();
