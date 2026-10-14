/* ==========================================================================
   spl-tails.js — Chapter 7, §7.4.5: ISLP Figure 7.7.

   A degree-15 polynomial and a natural cubic spline with 15 degrees of
   freedom, both fitted to all 3,000 rows of Wage.  The book's caption is
   "polynomials can show wild behavior, especially near the tails", so the
   right panel magnifies the last ten years of age, where the two disagree
   violently: at the default settings the polynomial runs up to about 142
   thousand dollars at age 79 and then falls to about 86 at age 80, while
   the natural spline just keeps going down.

   The left panel shows the same two curves over the whole range, so the
   magnified end is seen in context.  Nothing here is simulated.
   ========================================================================== */
(function () {
  'use strict';
  var cPlot = document.getElementById('st-plot');
  var cZoom = document.getElementById('st-zoom');
  if (!cPlot || !cZoom || typeof Plot === 'undefined' || typeof Stats === 'undefined' ||
      typeof CH07_WAGE === 'undefined') return;

  var W = window.CH07_WAGE;
  var age = W.age.map(Number), y = W.wage.map(Number), n = y.length;
  var XMIN = 18, XMAX = 80, ZMIN = 70, grid = [], zgrid = [], i;
  for (i = XMIN; i <= XMAX; i++) grid.push(i);
  for (i = ZMIN; i <= XMAX; i++) zgrid.push(i);
  var scatter = age.map(function (a, r) { return [a, y[r]]; });
  var zi0 = ZMIN - XMIN;

  var elDeg = document.getElementById('st-deg');
  var elDf = document.getElementById('st-df');
  var elDegread = document.getElementById('st-degread');
  var elDfread = document.getElementById('st-dfread');
  var elPoly = document.getElementById('st-poly');
  var elNat = document.getElementById('st-nat');
  var elGap = document.getElementById('st-gap');
  if (!elDeg || !elDf || !elDegread || !elDfread || !elPoly || !elNat || !elGap) return;

  var polyCache = {}, natCache = {};

  /* One fitted model: its columns, the fitted curve on the whole grid, and
     its RSS — the zoomed panel is a slice of the same grid, so both panels
     are always the same fit. */
  function curveOf(build, key, cache) {
    if (cache[key]) return cache[key];
    var b = build();
    var f = Stats.ols(Stats.design(b.cols, n), y);
    var cols = b.apply(grid), v = [], r, j, s;
    for (r = 0; r < grid.length; r++) {
      s = f.beta[0];
      for (j = 0; j < cols.length; j++) s += cols[j][r] * f.beta[j + 1];
      v.push(s);
    }
    cache[key] = { v: v, rss: f.rss };
    return cache[key];
  }

  function curves() {
    var deg = +elDeg.value, df = +elDf.value;
    return {
      deg: deg, df: df,
      p: curveOf(function () { return Stats.polyBasis(age, deg); }, deg, polyCache),
      s: curveOf(function () { return Stats.natSpline(age, df); }, df, natCache)
    };
  }

  /* y limits of the zoomed window, taken from the curves actually in it:
     at degree 1 the two are the same straight line and a fixed range would
     be all blank paper. */
  function zoomRange(c) {
    var lo = 0, hi = 1, r;
    for (r = zi0; r < grid.length; r++) {
      lo = Math.min(lo, c.p.v[r], c.s.v[r]);
      hi = Math.max(hi, c.p.v[r], c.s.v[r]);
    }
    var pad = Math.max(8, (hi - lo) * 0.12);
    return {
      ymin: Math.floor((lo - pad) / 10) * 10,
      ymax: Math.ceil((hi + pad) / 10) * 10
    };
  }

  var plot = new Plot(cPlot, {
    range: { xmin: XMIN - 1, xmax: XMAX + 1, ymin: 0, ymax: 330 },
    height: 300, xlabel: 'Age', ylabel: 'Wage (thousands of dollars)',
    draw: function (p) {
      var c = curves();
      p.axes();
      p.points(scatter, { color: p.colors.grid, alpha: 0.4, r: 2 });
      p.clip(function () {
        p.line(grid.map(function (g, r2) { return [g, c.p.v[r2]]; }),
          { color: p.colors.accent2, width: 2.3 });
        p.line(grid.map(function (g, r2) { return [g, c.s.v[r2]]; }),
          { color: p.colors.accent, width: 2.3 });
      });
      p.vline(ZMIN, { color: p.colors.axis, width: 1, dash: [3, 4] });
      p.text('degree ' + c.deg + ' polynomial', XMIN + 1, 316, {
        color: p.colors.accent2, font: 'bold 12.5px system-ui, sans-serif'
      });
      p.text('natural cubic spline, df ' + c.df, XMIN + 1, 300, {
        color: p.colors.accent, font: 'bold 12.5px system-ui, sans-serif'
      });
      p.text('the right panel magnifies this end', ZMIN + 0.5, 20, {
        color: p.colors.axis, font: '11.5px system-ui, sans-serif'
      });
    }
  });

  var zoomPlot = new Plot(cZoom, {
    range: { xmin: ZMIN - 0.5, xmax: XMAX + 0.5, ymin: 0, ymax: 330 },
    height: 300, xlabel: 'Age (70 to 80)', ylabel: 'Wage (thousands of dollars)',
    draw: function (p) {
      var c = curves(), zr = zoomRange(c);
      p.axes();
      p.line(zgrid.map(function (g, r2) { return [g, c.p.v[zi0 + r2]]; }),
        { color: p.colors.accent2, width: 2.6 });
      p.line(zgrid.map(function (g, r2) { return [g, c.s.v[zi0 + r2]]; }),
        { color: p.colors.accent, width: 2.6 });
      p.text('the same two curves, last ten years', ZMIN, zr.ymax - 12, {
        color: p.colors.fg, font: 'bold 12px system-ui, sans-serif'
      });
    }
  });

  function render() {
    var c = curves();
    zoomPlot.setRange(zoomRange(c));
    var i79 = 79 - XMIN, i80 = 80 - XMIN, r, best = zi0, bestV = 0;
    for (r = zi0; r < grid.length; r++) {
      var g = Math.abs(c.p.v[r] - c.s.v[r]);
      if (g > bestV) { bestV = g; best = r; }
    }
    var step = c.p.v[i80] - c.p.v[i79];
    elDegread.textContent = 'polynomial degree ' + c.deg;
    elDfread.textContent = 'natural spline df ' + c.df;
    elPoly.textContent = 'poly 79 → 80: ' + c.p.v[i79].toFixed(1) + ' → ' +
      c.p.v[i80].toFixed(1) + ' (' + (step >= 0 ? '+' : '') + step.toFixed(1) + ')';
    elNat.textContent = 'natural at 80: ' + c.s.v[i80].toFixed(1);
    elGap.textContent = 'largest gap in 70–80: ' + bestV.toFixed(1) + ' at age ' +
      grid[best];
    plot.render();
    zoomPlot.render();
  }

  elDeg.addEventListener('input', render);
  elDf.addEventListener('input', render);
  render();
})();
