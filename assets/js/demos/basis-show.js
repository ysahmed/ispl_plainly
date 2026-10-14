/* ==========================================================================
   basis-show.js — Chapter 7, §7.3: equation (7.7) made visible.

   Four families of basis functions — powers, step indicators, truncated
   powers, natural-spline columns — fitted the same way, through
   y = b0 + b1 b1(x) + ... + bK bK(x) and ordinary least squares.

   Left panel: the basis columns the fit actually uses.  Right panel: the
   fitted curve and the data.  The readout under it reports the maximum
   difference between two parametrisations of the *same* family — the plain
   columns the book writes down and the orthonormal rotation this site fits
   with — because the whole point of section 7.3 is that the choice of
   coordinates is ours and the fitted curve does not care.
   ========================================================================== */
(function () {
  'use strict';
  var cBasis = document.getElementById('bs-basis');
  var cFit = document.getElementById('bs-fit');
  if (!cBasis || !cFit || typeof Plot === 'undefined' || typeof Stats === 'undefined' ||
      typeof CH07_WAGE === 'undefined') return;

  var W = window.CH07_WAGE;
  var age = W.age.map(Number), y = W.wage.map(Number), n = y.length;
  var XMIN = 18, XMAX = 80, grid = [], i, j;
  for (i = XMIN; i <= XMAX; i++) grid.push(i);
  var scatter = age.map(function (a, r) { return [a, y[r]]; });

  var elFlex = document.getElementById('bs-knot');
  var elKind = document.getElementById('bs-kindread');
  var elDf = document.getElementById('bs-df');
  var elRss = document.getElementById('bs-rss');
  var elDiff = document.getElementById('bs-diff');
  var btns = ['bs-poly', 'bs-step', 'bs-cub', 'bs-ns'].map(function (id) {
    return document.getElementById(id);
  });
  if (!elFlex || btns.indexOf(null) >= 0) return;

  /* Age in standard deviations.  The plain bases below are written in z
     rather than in years, so that powers of age stay well conditioned — and
     a change of units is itself a change of basis, which is the lesson. */
  var mu = Stats.mean(age), ss = 0;
  for (i = 0; i < n; i++) ss += (age[i] - mu) * (age[i] - mu);
  var sd = Math.sqrt(ss / (n - 1));
  function zOf(v) { return (v - mu) / sd; }
  var zs = age.map(zOf), zg = grid.map(zOf);

  var fam = 'poly';
  var FAMNAME = {
    poly: 'powers of age', step: 'step indicators', cub: 'truncated powers',
    ns: 'natural spline columns'
  };

  /* Build the basis for the chosen family.  The slider is K: the number of
     basis functions in equation (7.7), excluding the intercept, which is how
     the book writes (7.5) and (7.7) and how R counts a spline's df.  Every
     family therefore fits K + 1 coefficients.  A cubic spline cannot go
     below three columns — a cubic already has three before any knot. */
  function build(family, flex) {
    if (family === 'poly') {
      var b = Stats.polyBasis(age, flex);
      return { b: b, df: flex, knots: [], name: 'degree ' + flex + ' polynomial' };
    }
    if (family === 'step') {
      var cs = Stats.quantileCuts(age, flex);
      var sb = Stats.stepBasis(age, cs);
      return { b: sb, df: flex, knots: cs,
        name: flex + (flex === 1 ? ' cutpoint, ' : ' cutpoints, ') +
              (flex + 1) + ' levels' };
    }
    if (family === 'ns') {
      var nb = Stats.natSpline(age, flex);
      return { b: nb, df: flex, knots: nb.knots,
        name: 'df ' + flex + ', ' + nb.knots.length +
              (nb.knots.length === 1 ? ' interior knot' : ' interior knots') };
    }
    var d = Math.max(3, flex);
    var cb = Stats.cubSpline(age, d);
    return { b: cb, df: d, knots: cb.knots,
      name: 'df ' + d + ', ' + cb.knots.length +
            (cb.knots.length === 1 ? ' interior knot' : ' interior knots') };
  }

  function rowsFrom(cols) {
    var N = cols.length ? cols[0].length : 0, X = [], r, row;
    for (r = 0; r < N; r++) {
      row = [];
      for (j = 0; j < cols.length; j++) row.push(cols[j][r]);
      X.push(row);
    }
    return X;
  }

  function pow(xs, k) {
    var out = new Array(xs.length), r;
    for (r = 0; r < xs.length; r++) out[r] = Math.pow(xs[r], k);
    return out;
  }

  /* The same function space, written the way the book writes it: plain
     powers, all K+1 indicators with no intercept, raw truncated powers,
     raw natural-spline columns.  Everything is in z. */
  function altFor(family, spec) {
    if (family === 'poly') {
      var t = [], g = [], k;
      for (k = 1; k <= spec.df; k++) { t.push(pow(zs, k)); g.push(pow(zg, k)); }
      return { train: t, grid: g, intercept: true };
    }
    if (family === 'step') {
      return { train: Stats.stepRaw(age, spec.b.cuts),
               grid: Stats.stepRaw(grid, spec.b.cuts), intercept: false };
    }
    if (family === 'cub') {
      var kz = spec.b.knots.map(zOf);
      return { train: Stats.truncRaw(zs, kz), grid: Stats.truncRaw(zg, kz),
               intercept: true };
    }
    var nz = spec.b.knots.map(zOf);
    return { train: Stats.nsRaw(zs, nz, zOf(spec.b.lo), zOf(spec.b.hi)),
             grid: Stats.nsRaw(zg, nz, zOf(spec.b.lo), zOf(spec.b.hi)),
             intercept: true };
  }

  var state = null;

  function compute() {
    var flex = +elFlex.value;
    var spec = build(fam, flex);
    var f = Stats.ols(Stats.design(spec.b.cols, n), y);

    var mainCols = spec.b.apply(grid), main = [], r, c, v;
    for (r = 0; r < grid.length; r++) {
      v = f.beta[0];
      for (j = 0; j < mainCols.length; j++) v += mainCols[j][r] * f.beta[j + 1];
      main.push(v);
    }

    var alt = altFor(fam, spec);
    var fa = Stats.ols(alt.intercept ? Stats.design(alt.train, n) : rowsFrom(alt.train), y);
    var altFit = [];
    for (r = 0; r < grid.length; r++) {
      v = alt.intercept ? fa.beta[0] : 0;
      for (j = 0; j < alt.grid.length; j++) v += alt.grid[j][r] * fa.beta[j + (alt.intercept ? 1 : 0)];
      altFit.push(v);
    }

    var diff = 0;
    for (r = 0; r < grid.length; r++) diff = Math.max(diff, Math.abs(main[r] - altFit[r]));

    var lo = 0, hi = 0;
    for (j = 0; j < mainCols.length; j++) {
      for (r = 0; r < grid.length; r++) {
        c = mainCols[j][r];
        if (c < lo) lo = c;
        if (c > hi) hi = c;
      }
    }
    var pad = (hi - lo) * 0.14 + 1e-6;

    state = {
      spec: spec, f: f, cols: mainCols, fit: main, diff: diff,
      lo: lo - pad, hi: hi + pad
    };
    return state;
  }

  var basisPlot = new Plot(cBasis, {
    range: { xmin: XMIN - 1, xmax: XMAX + 1, ymin: -0.2, ymax: 1.2 },
    height: 300, xlabel: 'Age', ylabel: 'value of the basis function',
    draw: function (p) {
      if (!state) return;
      p.axes();
      p.hline(0, { color: p.colors.grid, width: 1 });
      state.spec.knots.forEach(function (kn) {
        p.vline(kn, { color: p.colors.axis, width: 1, dash: [3, 4] });
      });
      for (var c = 0; c < state.cols.length; c++) {
        p.line(grid.map(function (g, r) { return [g, state.cols[c][r]]; }),
          { color: c % 2 ? p.colors.accent2 : p.colors.accent, width: 1.9 });
      }
      p.text(state.spec.name, XMIN + 1, state.lo + (state.hi - state.lo) * 0.93, {
        color: p.colors.fg, font: 'bold 12.5px system-ui, sans-serif'
      });
      p.text(state.cols.length + (state.cols.length === 1 ? ' column' : ' columns'),
        XMIN + 1, state.lo + (state.hi - state.lo) * 0.8, {
          color: p.colors.axis, font: '11.5px system-ui, sans-serif'
        });
    }
  });

  var fitPlot = new Plot(cFit, {
    range: { xmin: XMIN - 1, xmax: XMAX + 1, ymin: 0, ymax: 330 },
    height: 300, xlabel: 'Age', ylabel: 'Wage (thousands of dollars)',
    draw: function (p) {
      if (!state) return;
      p.axes();
      p.points(scatter, { color: p.colors.grid, alpha: 0.4, r: 2 });
      state.spec.knots.forEach(function (kn) {
        p.vline(kn, { color: p.colors.axis, width: 1, dash: [3, 4] });
      });
      p.line(grid.map(function (g, r) { return [g, state.fit[r]]; }),
        { color: p.colors.accent, width: 2.4 });
      p.text(FAMNAME[fam] + ' · ' + state.spec.name, XMIN + 1, 318, {
        color: p.colors.accent, font: 'bold 12.5px system-ui, sans-serif'
      });
    }
  });

  function render() {
    var s = compute();
    basisPlot.setRange({ ymin: s.lo, ymax: s.hi });
    elKind.textContent = FAMNAME[fam] + ' · ' + s.spec.name;
    elDf.textContent = 'df ' + s.spec.df + ' · ' + (s.spec.df + 1) + ' coefficients';
    elRss.textContent = 'RSS ' + Math.round(s.f.rss).toLocaleString('en-US');
    elDiff.textContent = 'max |difference| between the two forms ' +
      (s.diff < 1e-6 ? s.diff.toExponential(1) : s.diff.toFixed(4));
    basisPlot.render();
    fitPlot.render();
  }

  btns.forEach(function (b, k) {
    b.addEventListener('click', function () {
      fam = ['poly', 'step', 'cub', 'ns'][k];
      btns.forEach(function (o, m) { o.setAttribute('aria-pressed', String(m === k)); });
      render();
    });
  });
  elFlex.addEventListener('input', render);
  render();
})();
