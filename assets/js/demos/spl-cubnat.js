/* ==========================================================================
   spl-cubnat.js — Chapter 7, §7.4.3: ISLP Figure 7.4.

   A cubic spline and a natural cubic spline through the same interior
   knots (the 25th, 50th and 75th percentiles of age at the default of
   three knots, which is the book's setting), both fitted to all 3,000 rows.

   The book's figure is drawn on a subset it does not identify, so these
   curves are ours, not a copy of it, and the vertical scale is not fixed:
   the cubic spline's band opens out so far past the boundary knots that
   the two panels would be unreadable on one common scale.  Instead the
   right panel reports the half-width at age 80 in numbers, and that is the
   whole difference between the families — past the last knot a cubic
   spline keeps being a cubic and its uncertainty runs away, while a
   natural spline is forced to be linear out there and its uncertainty
   closes down.
   ========================================================================== */
(function () {
  'use strict';
  var cPlot = document.getElementById('sn-plot');
  var cBand = document.getElementById('sn-band');
  if (!cPlot || !cBand || typeof Plot === 'undefined' || typeof Stats === 'undefined' ||
      typeof CH07_WAGE === 'undefined') return;

  var W = window.CH07_WAGE;
  var age = W.age.map(Number), y = W.wage.map(Number), n = y.length;
  var XMIN = 18, XMAX = 80, grid = [], i;
  for (i = XMIN; i <= XMAX; i++) grid.push(i);
  var scatter = age.map(function (a, r) { return [a, y[r]]; });

  var elK = document.getElementById('sn-k');
  var elKread = document.getElementById('sn-kread');
  var elDfcub = document.getElementById('sn-dfcub');
  var elDfnat = document.getElementById('sn-dfnat');
  var elCiband = document.getElementById('sn-ciband');
  var elRss = document.getElementById('sn-rss');
  if (!elK || !elKread || !elDfcub || !elDfnat || !elCiband || !elRss) return;

  var cache = {};

  /* One fitted model: the curve on the grid, and the pointwise 2x standard
     error half-width 2*sqrt(sigma^2 x0' (X'X)^-1 x0). */
  function fitOne(build) {
    var b = build();
    var f = Stats.ols(Stats.design(b.cols, n), y);
    var cols = b.apply(grid), v = [], half = [], r, j, m, row, val, vv;
    for (r = 0; r < grid.length; r++) {
      row = [1];
      for (j = 0; j < cols.length; j++) row.push(cols[j][r]);
      val = 0; vv = 0;
      for (j = 0; j < row.length; j++) {
        val += row[j] * f.beta[j];
        for (m = 0; m < row.length; m++) vv += row[j] * f.inv[j][m] * row[m];
      }
      v.push(val);
      half.push(2 * Math.sqrt(Math.max(0, vv) * f.sigma2));
    }
    return { b: b, f: f, v: v, half: half };
  }

  function fit() {
    var k = +elK.value;
    if (cache[k]) return cache[k];
    /* df conventions: a cubic spline with K interior knots needs 3 + K
       columns (x, x^2, x^3 and one truncated power per knot); a natural
       spline needs K + 1 (the linear term plus one per knot). */
    var out = {
      k: k,
      cub: fitOne(function () { return Stats.cubSpline(age, k + 3); }),
      nat: fitOne(function () { return Stats.natSpline(age, k + 1); })
    };
    cache[k] = out;
    return out;
  }

  var plot = new Plot(cPlot, {
    range: { xmin: XMIN - 1, xmax: XMAX + 1, ymin: 0, ymax: 330 },
    height: 300, xlabel: 'Age', ylabel: 'Wage (thousands of dollars)',
    draw: function (p) {
      var cur = fit();
      p.axes();
      p.points(scatter, { color: p.colors.grid, alpha: 0.4, r: 2 });
      cur.cub.b.knots.forEach(function (kn) {
        p.vline(kn, { color: p.colors.axis, width: 1.2, dash: [4, 4] });
      });
      p.clip(function () {
        p.line(grid.map(function (g, r) { return [g, cur.cub.v[r]]; }),
          { color: p.colors.accent, width: 2.3 });
        p.line(grid.map(function (g, r) { return [g, cur.nat.v[r]]; }),
          { color: p.colors.accent2, width: 2.3 });
      });
      p.text('cubic spline', XMIN + 1, 316, {
        color: p.colors.accent, font: 'bold 12.5px system-ui, sans-serif'
      });
      p.text('natural cubic spline', XMIN + 1, 300, {
        color: p.colors.accent2, font: 'bold 12.5px system-ui, sans-serif'
      });
      p.text(cur.cub.b.knots.length + ' interior knots, dashed', XMAX - 1, 316, {
        align: 'right', color: p.colors.axis, font: '11.5px system-ui, sans-serif'
      });
    }
  });

  var bandPlot = new Plot(cBand, {
    range: { xmin: XMIN - 1, xmax: XMAX + 1, ymin: 0, ymax: 330 },
    height: 300, xlabel: 'Age', ylabel: 'Wage (thousands of dollars)',
    draw: function (p) {
      var cur = fit(), r;
      p.axes();
      /* the natural spline's two band edges */
      p.line(grid.map(function (g, r2) { return [g, cur.nat.v[r2] + cur.nat.half[r2]]; }),
        { color: p.colors.accent2, width: 1.7 });
      p.line(grid.map(function (g, r2) { return [g, cur.nat.v[r2] - cur.nat.half[r2]]; }),
        { color: p.colors.accent2, width: 1.7 });
      /* the cubic spline's band as a filled wash — it leaves the frame */
      p.clip(function () {
        var c = p.ctx;
        c.fillStyle = p.colors.accent;
        c.globalAlpha = 0.13;
        c.beginPath();
        for (r = 0; r < grid.length; r++) {
          if (r === 0) c.moveTo(p.xToPx(grid[r]), p.yToPx(cur.cub.v[r] + cur.cub.half[r]));
          else c.lineTo(p.xToPx(grid[r]), p.yToPx(cur.cub.v[r] + cur.cub.half[r]));
        }
        for (r = grid.length - 1; r >= 0; r--) {
          c.lineTo(p.xToPx(grid[r]), p.yToPx(cur.cub.v[r] - cur.cub.half[r]));
        }
        c.closePath();
        c.fill();
        c.globalAlpha = 1;
      });
      cur.cub.b.knots.forEach(function (kn) {
        p.vline(kn, { color: p.colors.axis, width: 1.2, dash: [4, 4] });
      });
      p.text('2× standard error band: cubic (wash) against natural (lines)',
        XMIN + 1, 316, { color: p.colors.fg, font: 'bold 12px system-ui, sans-serif' });
    }
  });

  function render() {
    var cur = fit(), last = grid.length - 1, r;
    /* the band panel's own scale: fitted values only, so the cubic's
       exploding band is clipped by the frame rather than stretching it */
    var blo = Infinity, bhi = -Infinity;
    for (r = 0; r < grid.length; r++) {
      blo = Math.min(blo, cur.nat.v[r] - cur.nat.half[r], cur.cub.v[r]);
      bhi = Math.max(bhi, cur.nat.v[r] + cur.nat.half[r], cur.cub.v[r]);
    }
    bandPlot.setRange({
      ymin: Math.min(0, Math.floor(blo / 20) * 20),
      ymax: Math.ceil(bhi / 20) * 20 + 10
    });
    elKread.textContent = 'knots at age ' + cur.cub.b.knots.map(function (kn) {
      return kn.toFixed(1);
    }).join(' · ');
    elDfcub.textContent = 'cubic: ' + cur.k + (cur.k === 1 ? ' knot → ' : ' knots → ') +
      (cur.k + 4) + ' coefficients';
    elDfnat.textContent = 'natural: ' + cur.k + (cur.k === 1 ? ' knot → ' : ' knots → ') +
      (cur.k + 2) + ' coefficients';
    elCiband.textContent = '2×s.e. at age 80: cubic ' + fmt(cur.cub.half[last]) +
      ' · natural ' + fmt(cur.nat.half[last]);
    elRss.textContent = 'RSS cubic ' + Math.round(cur.cub.f.rss).toLocaleString('en-US') +
      ' · natural ' + Math.round(cur.nat.f.rss).toLocaleString('en-US');
    plot.render();
    bandPlot.render();
  }

  /* the cubic band at the right edge can be tens of thousands of dollars
     wide — abbreviate those rather than printing seven digits */
  function fmt(v) {
    return v >= 1000 ? Math.round(v).toLocaleString('en-US') : v.toFixed(1);
  }

  elK.addEventListener('input', render);
  render();
})();
