/* ==========================================================================
   poly-wage.js — Chapter 7, §7.1: the degree-4 polynomial of ISLP
   Figure 7.1's left panel, fitted live on the real 3,000-row Wage data.

   Left panel: wage against age with the fitted curve and its pointwise
   2x standard error band, eq. (7.2).  Right panel: the width of that band
   on its own, against the residual standard error of the fit — the
   difference between "where is the mean response" and "where will the next
   observation land".
   ========================================================================== */
(function () {
  'use strict';
  var cPlot = document.getElementById('pw-plot');
  var cBand = document.getElementById('pw-band');
  if (!cPlot || !cBand || typeof Plot === 'undefined' || typeof Stats === 'undefined' ||
      typeof CH07_WAGE === 'undefined') return;

  var W = window.CH07_WAGE;
  var age = W.age.map(Number), y = W.wage.map(Number), n = y.length;
  var XMIN = age[0], XMAX = 0, i;
  for (i = 0; i < n; i++) { if (age[i] < XMIN) XMIN = age[i]; if (age[i] > XMAX) XMAX = age[i]; }

  var grid = [];
  for (i = XMIN; i <= XMAX; i++) grid.push(i);        // the book's 63 values of age
  var scatter = age.map(function (a, r) { return [a, y[r]]; });
  var cache = {};

  var elDeg = document.getElementById('pw-deg');
  var elRead = document.getElementById('pw-degread');
  var elRse = document.getElementById('pw-rse');
  var elR2 = document.getElementById('pw-r2');
  var elCoef = document.getElementById('pw-coef');
  var elN = document.getElementById('pw-n');
  if (!elDeg) return;

  /* Fit wage ~ poly(age, degree) and evaluate the fit and its pointwise
     standard error on the age grid.  Var(f-hat(x0)) = sigma^2 x0'(X'X)^-1 x0,
     which is footnote 1's C-hat sandwich, one row of the grid at a time. */
  function fitCurve(deg) {
    if (cache[deg]) return cache[deg];
    var b = Stats.polyBasis(age, deg);
    var f = Stats.ols(Stats.design(b.cols), y);
    var cols = b.apply(grid);
    var fit = [], half = [], r, j, k;
    for (r = 0; r < grid.length; r++) {
      var x0 = [1];
      for (j = 0; j < cols.length; j++) x0.push(cols[j][r]);
      var fitv = 0, varv = 0;
      for (j = 0; j < x0.length; j++) {
        fitv += x0[j] * f.beta[j];
        for (k = 0; k < x0.length; k++) varv += x0[j] * f.inv[j][k] * x0[k];
      }
      fit.push(fitv);
      half.push(2 * Math.sqrt(Math.max(0, varv) * f.sigma2));
    }
    var out = { fit: fit, half: half, rse: f.rse, r2: f.r2, beta: f.beta, se: f.se, deg: deg };
    cache[deg] = out;
    return out;
  }

  var plot = new Plot(cPlot, {
    range: { xmin: XMIN - 1, xmax: XMAX + 1, ymin: 0, ymax: 330 },
    height: 300, xlabel: 'Age', ylabel: 'Wage (thousands of dollars)',
    draw: function (p) {
      var cur = fitCurve(+elDeg.value);
      p.axes();
      p.points(scatter, { color: p.colors.grid, alpha: 0.45, r: 2.1 });
      p.clip(function () {
        var up = [], dn = [];
        for (var r = 0; r < grid.length; r++) {
          up.push([grid[r], cur.fit[r] + cur.half[r]]);
          dn.push([grid[r], cur.fit[r] - cur.half[r]]);
        }
        var c = p.ctx;
        c.fillStyle = p.colors.accent;
        c.globalAlpha = 0.13;
        c.beginPath();
        c.moveTo(p.xToPx(up[0][0]), p.yToPx(up[0][1]));
        for (r = 1; r < up.length; r++) c.lineTo(p.xToPx(up[r][0]), p.yToPx(up[r][1]));
        for (r = dn.length - 1; r >= 0; r--) c.lineTo(p.xToPx(dn[r][0]), p.yToPx(dn[r][1]));
        c.closePath();
        c.fill();
        c.globalAlpha = 1;
      });
      p.line(grid.map(function (g, r) { return [g, cur.fit[r]]; }),
        { color: p.colors.accent, width: 2.4 });
      p.line(grid.map(function (g, r) { return [g, cur.fit[r] + cur.half[r]]; }),
        { color: p.colors.accent2, width: 1.4, dash: [5, 4] });
      p.line(grid.map(function (g, r) { return [g, cur.fit[r] - cur.half[r]]; }),
        { color: p.colors.accent2, width: 1.4, dash: [5, 4] });
      p.text('degree ' + cur.deg, XMIN + 1.5, 314, {
        color: p.colors.accent, font: 'bold 12.5px system-ui, sans-serif'
      });
    }
  });

  var bandPlot = new Plot(cBand, {
    range: { xmin: XMIN - 1, xmax: XMAX + 1, ymin: 0, ymax: 48 },
    height: 300, xlabel: 'Age', ylabel: '2 x standard error (thousands)',
    draw: function (p) {
      var cur = fitCurve(+elDeg.value);
      p.axes();
      p.hline(cur.rse, { color: p.colors.axis, width: 1.4, dash: [3, 4] });
      p.text('residual standard error — where a new observation lands', XMAX - 1, cur.rse - 1,
        { align: 'right', base: 'bottom', color: p.colors.axis,
          font: '11.5px system-ui, sans-serif' });
      p.line(grid.map(function (g, r) { return [g, cur.half[r]]; }),
        { color: p.colors.accent2, width: 2.2 });
      p.text('2× s.e. of the fitted curve — where it lands', XMIN + 1.5, 45, {
        color: p.colors.accent2, font: '11.5px system-ui, sans-serif'
      });
    }
  });

  var elDeg = document.getElementById('pw-deg');
  var elRead = document.getElementById('pw-degread');
  var elRse = document.getElementById('pw-rse');
  var elR2 = document.getElementById('pw-r2');
  var elCoef = document.getElementById('pw-coef');
  var elN = document.getElementById('pw-n');

  function render() {
    var cur = fitCurve(+elDeg.value);
    elRead.textContent = 'degree ' + cur.deg;
    elRse.textContent = 'RSE ' + cur.rse.toFixed(3);
    elR2.textContent = 'R² ' + cur.r2.toFixed(4);
    // the book's lab table prints this fit's coefficients; show ours beside it
    elCoef.textContent = cur.beta.map(function (b, j) {
      return (j === 0 ? '' : 'b' + j + ' ') + b.toFixed(4) + ' ± ' + cur.se[j].toFixed(4);
    }).join('   ');
    elN.textContent = n + ' rows, ' + (cur.deg + 1) + ' parameters';
    plot.render();
    bandPlot.render();
  }

  elDeg.addEventListener('input', render);
  render();
})();
