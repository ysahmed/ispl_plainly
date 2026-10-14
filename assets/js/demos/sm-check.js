/* ==========================================================================
   sm-check.js — Chapter 7, §7.5.2: checking the leave-one-out shortcut.

   The book claims, after the leave-one-out formula, that it lets you "compute
   each of these leave-one-out fits using only ĝ_λ, the original fit to all of
   the data" — no refitting, at essentially the cost of one fit.  That is an
   exact algebraic claim, and it can be tested the way this site tests
   everything: by doing the expensive thing anyway and comparing.

   So this demo deletes the first man at each of the 61 distinct ages, one at
   a time, and for each of them solves the 61x61 normal equations again from
   scratch with that one observation's row removed — the same knots, the same
   lambda, one row of Z'Z and one piece of Z'y gone.  Then it compares

       (y_i - ĝ_λ(x_i)) / (1 - S_ii)          the book's formula,
       y_i - ĝ_λ(x_i) refitted without i      the slow truth.

   The two agree to about a dozen decimal places, which is what "exactly" is
   worth in floating point.  The middle panel shows what the formula actually
   does to a residual: it divides it by 1 - S_ii, and it is worth seeing that
   amplification, because it is the whole of the bias that leave-one-out
   exists to pay for.

   No random number is drawn: the 61 men are the first in the table at each
   distinct age, so the sample is fixed, spread over the whole age range, and
   reproducible from the page source alone.
   ========================================================================== */
(function () {
  'use strict';
  var cPlot = document.getElementById('sm-ck-plot');
  var cRes = document.getElementById('sm-ck-res');
  if (!cPlot || !cRes || typeof Plot === 'undefined' || typeof Stats === 'undefined' ||
      typeof CH07_WAGE === 'undefined') return;

  var W = window.CH07_WAGE;
  var age = W.age, y = W.wage;          /* the shared arrays: memo key */
  var SS = Stats.smoothSpline(age, y);
  var XMIN = 18, XMAX = 80, grid = [], i;
  for (i = XMIN; i <= XMAX + 0.001; i += 0.2) grid.push(Math.round(i * 10) / 10);
  var scatter = age.map(function (a, r) { return [a, y[r]]; });

  var elDf = document.getElementById('sm-ck-df');
  var elDfread = document.getElementById('sm-ck-dfread');
  var elN = document.getElementById('sm-ck-n');
  var elMax = document.getElementById('sm-ck-max');
  var elSum = document.getElementById('sm-ck-sum');
  var elAmp = document.getElementById('sm-ck-amp');
  if (!elDf || !elDfread || !elN || !elMax || !elSum || !elAmp) return;

  /* the 61 men: first row in the table at each distinct age */
  var first = {}, a;
  for (i = 0; i < age.length; i++) if (first[age[i]] === undefined) first[age[i]] = i;
  var ages = SS.ages.slice(), rows = ages.map(function (g) { return first[g]; });
  elN.textContent = rows.length + ' men checked — the first at each of the ' +
    SS.M + ' distinct ages';

  var cache = {}, cur = null, timer = null;
  function fit() {
    var target = +elDf.value;
    if (cache[target]) return cache[target];
    var L = SS.lamForDf(target);
    var f = SS.fitL(L), v = SS.curve(f, grid);
    cache[target] = { df: target, L: L, f: f, v: v };
    return cache[target];
  }

  /* The slow half: one full refit per man.  Deferred behind the cheap half
     so the slider keeps moving while it runs. */
  function check() {
    var lam = Math.pow(10, cur.L), worst = 0, sf = 0, se = 0, amp = 0, res = [];
    rows.forEach(function (i0) {
      var g = SS.group[i0], den = 1 - cur.f.Sii[g];
      var shortcut = (y[i0] - cur.f.fit[g]) / den;
      var refit = y[i0] - SS.fitWithout(g, y[i0], lam);
      if (Math.abs(shortcut - refit) > worst) worst = Math.abs(shortcut - refit);
      sf += shortcut * shortcut; se += refit * refit;
      if (1 / den > amp) amp = 1 / den;
      res.push({ a: age[i0], s: y[i0] - cur.f.fit[g], l: shortcut });
    });
    elMax.textContent = 'largest |shortcut − refit| ' + worst.toExponential(2);
    var f6 = { minimumFractionDigits: 6, maximumFractionDigits: 6 };
    elSum.textContent = 'sum of squares: shortcut ' + sf.toLocaleString('en-US', f6) +
      ' · refit ' + se.toLocaleString('en-US', f6);
    elAmp.textContent = 'largest ÷(1 − S_ii) ' + amp.toFixed(4);
    cur.res = res;
    resPlot.render();
  }
  function schedule() {
    if (timer) clearTimeout(timer);
    timer = setTimeout(function () { timer = null; check(); }, 40);
  }

  var plot = new Plot(cPlot, {
    range: { xmin: XMIN - 1, xmax: XMAX + 1, ymin: 0, ymax: 330 },
    height: 300, xlabel: 'Age', ylabel: 'Wage (thousands of dollars)',
    draw: function (p) {
      cur = fit();
      p.axes();
      p.points(scatter, { color: p.colors.grid, alpha: 0.4, r: 2 });
      p.clip(function () {
        p.line(grid.map(function (g, r) { return [g, cur.v[r]]; }),
          { color: p.colors.accent, width: 2.4 });
      });
      /* the men that get deleted, one at a time */
      p.points(rows.map(function (i0) { return [age[i0], y[i0]]; }),
        { color: p.colors.accent2, r: 3, alpha: 0.9 });
      p.text('the ' + rows.length + ' men we delete', 19, 46, {
        color: p.colors.accent2, font: 'bold 12px system-ui, sans-serif'
      });
      p.text('the smoother they are deleted from: df ' + cur.f.df.toFixed(2), 19, 30, {
        color: p.colors.accent, font: '12px system-ui, sans-serif'
      });
    }
  });

  var resPlot = new Plot(cRes, {
    range: { xmin: XMIN - 1, xmax: XMAX + 1, ymin: -160, ymax: 160 },
    height: 260, xlabel: 'Age', ylabel: 'Residual (thousands of dollars)',
    draw: function (p) {
      p.axes();
      p.hline(0, { color: p.colors.axis, width: 1.2 });
      if (!cur.res) return;
      p.points(cur.res.map(function (d) { return [d.a, d.s]; }),
        { color: p.colors.axis, r: 3.4 });
      p.points(cur.res.map(function (d) { return [d.a, d.l]; }),
        { color: p.colors.accent2, r: 3, ring: true, ringWidth: 1.5 });
      p.text('grey: what the fit reports', XMIN, 138, {
        color: p.colors.axis, font: '11.5px system-ui, sans-serif'
      });
      p.text('red rings: what it should have reported, had that man never turned up',
        XMIN, 122, { color: p.colors.accent2, font: '11.5px system-ui, sans-serif' });
    }
  });

  function render() {
    cur = fit();
    elDfread.textContent = 'smoother: effective df ' + cur.f.df.toFixed(2);
    plot.render();
    schedule();
  }

  elDf.addEventListener('input', render);
  render();
})();
