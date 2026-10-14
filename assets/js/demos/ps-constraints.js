/* ==========================================================================
   ps-constraints.js — Chapter 7, §7.4.2: ISLP Figure 7.3.

   Four fits of Wage on age with a single knot, laid out in the book's
   order: unconstrained piecewise cubic, piecewise cubic forced continuous,
   cubic spline (first and second derivatives continuous too), and the
   linear spline.  Panel titles and the coefficient counts 8 / 7 / 5 / 3
   are the book's own.

   Everything on this page is fitted to all 3,000 rows of the Wage data;
   the book says it plots a subset, so the curves are ours.  What the demo
   is really for is the readouts: RSS falls from the unconstrained fit to
   the continuous one by a few units, and by almost nothing more once the
   derivative constraints are added, while the number of coefficients
   halves.  The jump the unconstrained fit takes at the knot is printed
   too, and is the reason its panel looks wrong.
   ========================================================================== */
(function () {
  'use strict';
  var ids = ['ps-unc', 'ps-con', 'ps-cub', 'ps-lin'];
  var canvases = ids.map(function (id) { return document.getElementById(id); });
  if (canvases.some(function (c) { return !c; }) ||
      typeof Plot === 'undefined' || typeof Stats === 'undefined' ||
      typeof CH07_WAGE === 'undefined') return;

  var W = window.CH07_WAGE;
  var age = W.age.map(Number), y = W.wage.map(Number), n = y.length;
  var XMIN = 18, XMAX = 80, grid = [], i;
  for (i = XMIN; i <= XMAX; i++) grid.push(i);
  var scatter = age.map(function (a, r) { return [a, y[r]]; });

  var elKnot = document.getElementById('ps-knot');
  var elKnotread = document.getElementById('ps-knotread');
  var elDf = document.getElementById('ps-df');
  var elRss = document.getElementById('ps-rss');
  var elJump = document.getElementById('ps-jump');
  if (!elKnot || !elKnotread || !elDf || !elRss || !elJump) return;

  var cache = {};

  /* The two indicator bases.  z is measured from the knot, so the left
     half is just a cubic in x and the right half adds its own cubic in z
     on top: eight coefficients free to take any values, seven once the
     three indicator terms are dropped (which forces continuity). */
  function rawPiecewise(xn, c, jump) {
    var z = [], ind = [], r;
    for (r = 0; r < xn.length; r++) {
      z.push(xn[r] - c);
      ind.push(xn[r] >= c ? 1 : 0);
    }
    var out = [
      new Array(xn.length).fill(1),
      xn.slice(),
      xn.map(function (v) { return v * v; }),
      xn.map(function (v) { return v * v * v; })
    ];
    if (jump) out.push(ind);
    out.push(z.map(function (v, r2) { return ind[r2] * v; }));
    out.push(z.map(function (v, r2) { return ind[r2] * v * v; }));
    out.push(z.map(function (v, r2) { return ind[r2] * v * v * v; }));
    return out;
  }

  /* Linear spline: x plus one truncated power term, three coefficients. */
  function rawLinear(xn, c) {
    return [
      new Array(xn.length).fill(1),
      xn.slice(),
      xn.map(function (v) { return v > c ? v - c : 0; })
    ];
  }

  /* Turn a raw column factory into the same kind of object the other
     demos use: orthonormalised columns without the intercept, plus the
     change of basis that lets the fit be evaluated on the age grid. */
  function ownBasis(rawFn, c) {
    var o = Stats.ortho(rawFn(age, c));
    var map = o.map.slice(1);
    return {
      cols: o.cols.slice(1), knots: [c],
      apply: function (xn) { return Stats.applyMap(map, rawFn(xn, c)); }
    };
  }

  function fit() {
    var c = +elKnot.value;
    if (cache[c]) return cache[c];
    var specs = [
      ownBasis(function (xn, cc) { return rawPiecewise(xn, cc, true); }, c),
      ownBasis(function (xn, cc) { return rawPiecewise(xn, cc, false); }, c),
      Stats.truncBasis(age, [c]),
      ownBasis(rawLinear, c)
    ];
    var fits = specs.map(function (b) {
      return { b: b, f: Stats.ols(Stats.design(b.cols, n), y) };
    });
    cache[c] = { c: c, fits: fits };
    return cache[c];
  }

  /* Evaluate one fitted model on the grid (or at a single age). */
  function at(fitObj, xn) {
    var cols = fitObj.b.apply(xn), v = [], r, j, s;
    for (r = 0; r < xn.length; r++) {
      s = fitObj.f.beta[0];
      for (j = 0; j < cols.length; j++) s += cols[j][r] * fitObj.f.beta[j + 1];
      v.push(s);
    }
    return v;
  }

  var TITLES = ['Piecewise Cubic', 'Continuous Piecewise Cubic',
                'Cubic Spline', 'Linear Spline'];
  var LABELS = ['unconstrained', 'continuous', 'continuous with derivatives',
                'continuous, linear pieces'];

  var plots = canvases.map(function (cv, idx) {
    return new Plot(cv, {
      range: { xmin: XMIN - 1, xmax: XMAX + 1, ymin: 0, ymax: 330 },
      height: 300, xlabel: 'Age', ylabel: 'Wage (thousands of dollars)',
      draw: function (p) {
        var cur = fit(), f = cur.fits[idx];
        p.axes();
        p.points(scatter, { color: p.colors.grid, alpha: 0.4, r: 2 });
        p.vline(cur.c, { color: p.colors.axis, width: 1.3, dash: [4, 4] });
        p.clip(function () {
          p.line(grid.map(function (g, r) { return [g, at(f, [g])[0]]; }),
            { color: p.colors.accent, width: 2.3 });
        });
        p.text(TITLES[idx] + ' · ' + (f.b.cols.length + 1) + ' coefficients',
          XMIN + 1, 316, { color: p.colors.fg, font: 'bold 12.5px system-ui, sans-serif' });
        p.text(LABELS[idx], XMIN + 1, 300, {
          color: p.colors.axis, font: '11.5px system-ui, sans-serif' });
      }
    });
  });

  function render() {
    var cur = fit();
    /* The unconstrained fit takes one step at the knot; evaluate just to
       either side of it to show how big that step is. */
    var eps = 1e-7;
    var right = at(cur.fits[0], [cur.c + eps])[0];
    var left = at(cur.fits[0], [cur.c - eps])[0];
    elKnotread.textContent = 'knot at ' + cur.c + ' (dashed)';
    elDf.textContent = 'coefficients ' + cur.fits.map(function (f) {
      return f.b.cols.length + 1;
    }).join(' · ');
    elRss.textContent = 'RSS ' + cur.fits.map(function (f) {
      return Math.round(f.f.rss).toLocaleString('en-US');
    }).join(' · ');
    elJump.textContent = 'unconstrained jump at the knot: ' +
      (right - left >= 0 ? '+' : '') + (right - left).toFixed(2) +
      ' thousand dollars';
    plots.forEach(function (p) { p.render(); });
  }

  elKnot.addEventListener('input', render);
  render();
})();
