/* ==========================================================================
   poly-logit.js — Chapter 7, §7.1: ISLP Figure 7.1's right panel.  The
   high earners (wage over 250 thousand dollars) are 79 of the 3,000 rows, so
   the book models the binary event with logistic regression on the same
   degree-4 polynomial.  The right panel of the figure below counts those 79
   by age, which is the whole reason the confidence interval on the left is
   so wide.
   ========================================================================== */
(function () {
  'use strict';
  var cPlot = document.getElementById('pl-plot');
  var cCount = document.getElementById('pl-count');
  if (!cPlot || !cCount || typeof Plot === 'undefined' || typeof Stats === 'undefined' ||
      typeof CH07_WAGE === 'undefined') return;

  var W = window.CH07_WAGE;
  var age = W.age.map(Number), wage = W.wage.map(Number), n = wage.length;
  var hi = wage.map(function (v) { return v > 250 ? 1 : 0; });
  var nhi = hi.reduce(function (s, v) { return s + v; }, 0);
  var XMIN = 18, XMAX = 80, grid = [], i;
  for (i = XMIN; i <= XMAX; i++) grid.push(i);

  var elDeg = document.getElementById('pl-deg');
  var elAge = document.getElementById('pl-age');
  var elDegread = document.getElementById('pl-degread');
  var elP = document.getElementById('pl-p');
  var elOr = document.getElementById('pl-or');
  var elCi = document.getElementById('pl-ci');
  var elDev = document.getElementById('pl-dev');
  var elNhi = document.getElementById('pl-nhi');
  if (!elDeg || !elAge) return;

  var cache = {};

  /* Logistic regression on the orthogonal polynomial, by IRLS.  The band on
     the probability scale uses the delta method: se(p) = p(1-p) se(eta),
     which is the same 2x-standard-error construction the book uses here. */
  function fitCurve(deg) {
    if (cache[deg]) return cache[deg];
    var b = Stats.polyBasis(age, deg);
    var fit = Stats.logit(Stats.design(b.cols), hi);
    var cols = b.apply(grid);
    var pr = [], half = [], r, j, k;
    for (r = 0; r < grid.length; r++) {
      var x0 = [1];
      for (j = 0; j < cols.length; j++) x0.push(cols[j][r]);
      var eta = 0, varv = 0;
      for (j = 0; j < x0.length; j++) {
        eta += x0[j] * fit.beta[j];
        for (k = 0; k < x0.length; k++) varv += x0[j] * fit.inv[j][k] * x0[k];
      }
      var p = 1 / (1 + Math.exp(-eta));
      pr.push(p);
      half.push(1.96 * p * (1 - p) * Math.sqrt(Math.max(0, varv)));
    }
    var out = { p: pr, half: half, beta: fit.beta, se: fit.se, dev: fit.dev,
                nullDev: fit.nullDev, deg: deg };
    cache[deg] = out;
    return out;
  }

  function pAt(deg, a) {
    var cur = fitCurve(deg);
    return cur.p[Math.max(0, Math.min(grid.length - 1, Math.round(a) - XMIN))];
  }

  var plot = new Plot(cPlot, {
    // the book's axis: 0.00 to 0.20, with the high-earner rug along the top
    range: { xmin: XMIN - 1, xmax: XMAX + 1, ymin: 0, ymax: 0.20 },
    height: 300, xlabel: 'Age', ylabel: 'Pr(Wage > 250 | Age)',
    draw: function (p) {
      var cur = fitCurve(+elDeg.value);
      p.axes();
      // the book's grey rug: high earners along the top, everyone else below
      p.clip(function () {
        var c = p.ctx;
        c.strokeStyle = p.colors.axis;
        c.lineWidth = 1;
        c.globalAlpha = 0.5;
        c.beginPath();
        for (var r = 0; r < n; r++) {
          if (!hi[r]) continue;
          var X = p.xToPx(age[r]);
          c.moveTo(X, p.o.pad.t + 2); c.lineTo(X, p.o.pad.t + 11);
        }
        c.stroke();
        c.globalAlpha = 1;
      });
      p.clip(function () {
        var c = p.ctx, up = [], dn = [];
        for (var r = 0; r < grid.length; r++) {
          up.push([grid[r], Math.min(0.20, cur.p[r] + cur.half[r])]);
          dn.push([grid[r], Math.max(0, cur.p[r] - cur.half[r])]);
        }
        c.fillStyle = p.colors.accent2;
        c.globalAlpha = 0.13;
        c.beginPath();
        c.moveTo(p.xToPx(up[0][0]), p.yToPx(up[0][1]));
        for (r = 1; r < up.length; r++) c.lineTo(p.xToPx(up[r][0]), p.yToPx(up[r][1]));
        for (r = dn.length - 1; r >= 0; r--) c.lineTo(p.xToPx(dn[r][0]), p.yToPx(dn[r][1]));
        c.closePath();
        c.fill();
        c.globalAlpha = 1;
      });
      p.line(grid.map(function (g, r) { return [g, cur.p[r]]; }),
        { color: p.colors.accent2, width: 2.4 });
      p.vline(+elAge.value, { color: p.colors.accent, width: 1.4, dash: [4, 4] });
      var here = cur.p[Math.max(0, Math.min(grid.length - 1, +elAge.value - XMIN))];
      p.dot(+elAge.value, here, { color: p.colors.accent, r: 4.5 });
    }
  });

  /* High earners by age — 79 scattered across sixty years of age. */
  var counts = [], lo = null, hiAge = null;
  for (i = XMIN; i <= XMAX; i++) counts.push(0);
  for (i = 0; i < n; i++) {
    if (hi[i]) {
      counts[Math.round(age[i]) - XMIN]++;
      if (lo === null || age[i] < lo) lo = age[i];
      if (hiAge === null || age[i] > hiAge) hiAge = age[i];
    }
  }

  var countPlot = new Plot(cCount, {
    range: { xmin: XMIN - 1, xmax: XMAX + 1, ymin: 0, ymax: 6 },
    height: 300, xlabel: 'Age', ylabel: 'high earners observed',
    draw: function (p) {
      p.axes();
      counts.forEach(function (c, r) {
        if (!c) return;
        p.cell(XMIN + r - 0.36, XMIN + r + 0.36, 0, c, p.colors.accent2, 0.7);
      });
      p.text(nhi + ' high earners in 3,000 rows', XMIN + 1, 5.4, {
        color: p.colors.accent2, font: 'bold 12px system-ui, sans-serif'
      });
      p.text('ages ' + lo + ' to ' + hiAge, XMIN + 1, 4.6, {
        color: p.colors.axis, font: '11.5px system-ui, sans-serif'
      });
    }
  });

  function render() {
    var deg = +elDeg.value, a = +elAge.value;
    var cur = fitCurve(deg);
    var r = Math.max(0, Math.min(grid.length - 1, a - XMIN));
    var pr = cur.p[r], hw = cur.half[r];
    elDegread.textContent = 'degree ' + deg;
    elP.textContent = 'Pr = ' + (pr * 100).toFixed(2) + '%';
    elOr.textContent = 'odds = ' + (pr / (1 - pr)).toFixed(4);
    elCi.textContent = '95% band ' + ((pr - hw) * 100).toFixed(2) + ' to ' +
      ((pr + hw) * 100).toFixed(2) + '%';
    elDev.textContent = 'deviance ' + cur.dev.toFixed(1) + ' / ' + cur.nullDev.toFixed(1);
    elNhi.textContent = nhi + ' of ' + n;
    plot.render();
    countPlot.render();
  }

  elDeg.addEventListener('input', render);
  elAge.addEventListener('input', render);
  render();
})();
