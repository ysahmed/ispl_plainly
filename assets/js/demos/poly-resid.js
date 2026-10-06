/* Demo — the residuals tell you when a straight line is not enough (§3.3.2)
   Auto: mpg against horsepower.  Raise the polynomial degree and watch the
   curve chase the bend, and the pattern in the residuals disappear. */
(function () {
  'use strict';
  var cvD = document.getElementById('cv-poly');
  var cvR = document.getElementById('cv-polyres');
  if (!cvD || !cvR || typeof Plot === 'undefined' || typeof Stats === 'undefined') return;

  var A = window.CH03_AUTO;
  var xs = A.horsepower, ys = A.mpg, n = xs.length;

  var mean = 0, sd = 0, i;
  for (i = 0; i < n; i++) mean += xs[i];
  mean /= n;
  for (i = 0; i < n; i++) sd += (xs[i] - mean) * (xs[i] - mean);
  sd = Math.sqrt(sd / n);
  function z(x) { return (x - mean) / sd; }

  var state = { deg: 1 };

  function design(deg) {
    var X = [];
    for (var j = 0; j < n; j++) {
      var row = [1], p = 1, zz = z(xs[j]);
      for (var k = 1; k <= deg; k++) { p *= zz; row.push(p); }
      X.push(row);
    }
    return X;
  }

  var elDeg = document.getElementById('poly-degread');
  var elRse = document.getElementById('poly-rse');
  var elR2 = document.getElementById('poly-r2');
  var elNote = document.getElementById('poly-note');

  function predictor(f, deg) {
    return function (x) {
      var row = [1], p = 1, zz = z(x), yh = f.beta[0];
      for (var k = 1; k <= deg; k++) { p *= zz; yh += f.beta[k] * p; }
      return yh;
    };
  }

  var dataPlot = new Plot(cvD, {
    range: { xmin: 40, xmax: 245, ymin: 0, ymax: 52 },
    height: 330,
    xlabel: 'horsepower',
    ylabel: 'miles per gallon',
    draw: function (p) {
      var col = p.colors;
      p.axes();
      p.points(xs.map(function (x, idx) { return [x, ys[idx]]; }),
        { color: '#3b82f6', r: 3.4, alpha: 0.6 });

      var f = Stats.ols(design(state.deg), ys);
      var fn = predictor(f, state.deg);
      p.fnLine(fn, { color: col.accent2, width: 2.8 });
      if (state.deg === 1) {
        p.text('degree 1: a straight line — the data bends away from it',
          140, fn(140) + 7, { align: 'center', color: col.fg, font: '11.5px system-ui' });
      }

      elDeg.innerHTML = 'degree = <b>' + state.deg + '</b>';
      elRse.innerHTML = 'RSE = <b>' + f.rse.toFixed(2) + '</b>';
      elR2.innerHTML = 'R² = <b>' + f.r2.toFixed(3) + '</b>, adjusted R² = <b>' +
        f.adjr2.toFixed(3) + '</b>';
      elNote.innerHTML = state.deg === 1
        ? 'verdict: <b>the residuals still have a curve in them — the model is missing something</b>'
        : state.deg >= 4
          ? 'verdict: <b>the fit barely improves — the extra powers are fitting noise, not curve</b>'
          : 'verdict: <b>the curve is captured; the residuals look like plain noise</b>';
    }
  });

  var resPlot = new Plot(cvR, {
    range: { xmin: 5, xmax: 47, ymin: -8, ymax: 8 },
    height: 260,
    xlabel: 'fitted mpg',
    ylabel: 'residual',
    draw: function (p) {
      var col = p.colors;
      p.axes();
      p.hline(0, { color: col.axis, width: 1.6 });

      var f = Stats.ols(design(state.deg), ys);
      var pts = [], maxR = 0;
      for (var j = 0; j < n; j++) pts.push([f.fitted[j], f.resid[j]]);
      pts.forEach(function (q) { maxR = Math.max(maxR, Math.abs(q[1])); });
      p.range.ymin = -maxR * 1.12;
      p.range.ymax = maxR * 1.12;
      p.axes();
      p.hline(0, { color: col.axis, width: 1.6 });
      p.points(pts, { color: col.accent2, r: 3.4, alpha: 0.75 });

      // a smoothed run of the residuals, so any pattern is easy to see
      var bins = 12, sums = [], cnts = [], lo = 1e9, hi = -1e9, k;
      for (k = 0; k < n; k++) { lo = Math.min(lo, pts[k][0]); hi = Math.max(hi, pts[k][0]); }
      for (k = 0; k < bins; k++) { sums.push(0); cnts.push(0); }
      pts.forEach(function (q) {
        var b = Math.min(bins - 1, Math.floor((q[0] - lo) / (hi - lo + 1e-9) * bins));
        sums[b] += q[1]; cnts[b]++;
      });
      var trend = [];
      for (k = 0; k < bins; k++) {
        if (cnts[k]) trend.push([lo + (hi - lo) * (k + 0.5) / bins, sums[k] / cnts[k]]);
      }
      p.line(trend, { color: col.fg, width: 2.4 });

      p.text('dark line = average residual in each band', lo, p.range.ymax * 0.88,
        { color: col.axis, font: '11px system-ui' });
      p.text(state.deg === 1 ? 'still a hill shape' : 'flat — no pattern left',
        hi, p.range.ymax * 0.75,
        { align: 'right', color: state.deg === 1 ? col.accent2 : col.good,
          font: 'bold 11.5px system-ui' });
    }
  });

  document.getElementById('poly-deg').addEventListener('input', function () {
    state.deg = parseInt(this.value, 10);
    dataPlot.render();
    resPlot.render();
  });
})();
