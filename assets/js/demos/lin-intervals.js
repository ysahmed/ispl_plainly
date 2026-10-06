/* Demo — two bands around the same line (§3.1.2)
   Where the line is (confidence interval) versus where a single new point
   will land (prediction interval).  Real Advertising data, real formulas. */
(function () {
  'use strict';
  var cv = document.getElementById('cv-int');
  if (!cv || typeof Plot === 'undefined' || typeof Stats === 'undefined') return;

  var d = window.CH03_ADV;
  var pts = [], X = [], i;
  for (i = 0; i < d.tv.length; i++) {
    pts.push({ x: d.tv[i], y: d.sales[i] });
    X.push([1, d.tv[i]]);
  }
  var f = Stats.ols(X, d.sales);
  var n = f.n, xbar = 0;
  pts.forEach(function (p) { xbar += p.x; });
  xbar /= n;
  var Sxx = 0;
  pts.forEach(function (p) { Sxx += (p.x - xbar) * (p.x - xbar); });
  var tc = Stats.tCrit(f.df, 0.95);

  var state = { ci: true, pi: true, x0: 150 };

  function yhat(x0) { return f.beta[0] + f.beta[1] * x0; }
  function seMean(x0) { return Math.sqrt(f.sigma2 * (1 / n + (x0 - xbar) * (x0 - xbar) / Sxx)); }
  function ciW(x0) { return tc * seMean(x0); }
  function piW(x0) { return tc * Math.sqrt(f.sigma2 + seMean(x0) * seMean(x0)); }

  var elX = document.getElementById('int-xval');
  var elPred = document.getElementById('int-pred');
  var elCI = document.getElementById('int-ciw');
  var elPI = document.getElementById('int-piw');

  function readouts() {
    var x0 = state.x0;
    elX.innerHTML = 'TV = <b>$' + x0.toFixed(0) + 'k</b>';
    elPred.innerHTML = 'predicted sales = <b>' + yhat(x0).toFixed(2) + '</b>';
    elCI.innerHTML = 'average sales 95% CI: <b>± ' + ciW(x0).toFixed(2) + '</b>';
    elPI.innerHTML = 'a new store 95% PI: <b>± ' + piW(x0).toFixed(2) + '</b>';
  }

  var plot = new Plot(cv, {
    range: { xmin: -5, xmax: 305, ymin: -2, ymax: 30 },
    height: 340,
    xlabel: 'TV advertising budget ($1000s)',
    ylabel: 'sales (1000s of units)',
    onPointer: function (ptr) {
      if (ptr && ptr.inside) state.x0 = Math.max(0, Math.min(300, ptr.x));
      readouts();
      plot.render();
    },
    draw: function (p) {
      var col = p.colors, STEPS = 110;
      p.axes();

      var xs = [], i2;
      for (i2 = 0; i2 <= STEPS; i2++) xs.push(300 * i2 / STEPS);
      var dx = 300 / STEPS;

      if (state.pi) {
        var upP = [], loP = [];
        xs.forEach(function (x) { upP.push([x, yhat(x) + piW(x)]); loP.push([x, yhat(x) - piW(x)]); });
        for (i2 = 0; i2 <= STEPS; i2++) p.cell(xs[i2] - dx / 2, xs[i2] + dx / 2, loP[i2][1], upP[i2][1], col.accent2, 0.07);
        p.line(upP, { color: col.accent2, width: 1.6, dash: [6, 4] });
        p.line(loP, { color: col.accent2, width: 1.6, dash: [6, 4] });
      }
      if (state.ci) {
        var upC = [], loC = [];
        xs.forEach(function (x) { upC.push([x, yhat(x) + ciW(x)]); loC.push([x, yhat(x) - ciW(x)]); });
        for (i2 = 0; i2 <= STEPS; i2++) p.cell(xs[i2] - dx / 2, xs[i2] + dx / 2, loC[i2][1], upC[i2][1], col.accent, 0.13);
        p.line(upC, { color: col.accent, width: 1.6 });
        p.line(loC, { color: col.accent, width: 1.6 });
      }

      p.points(pts.map(function (q) { return [q.x, q.y]; }), { color: col.fg, r: 4, alpha: 0.85 });
      p.line([[0, yhat(0)], [305, yhat(305)]], { color: col.accent, width: 2.6 });

      var x0 = state.x0;
      p.vline(x0, { color: col.axis, width: 1.4, dash: [3, 3] });
      p.dot(x0, yhat(x0), { r: 5, color: col.fg });
      p.badge(['CI ± ' + ciW(x0).toFixed(2), 'PI ± ' + piW(x0).toFixed(2)],
        x0, yhat(x0) + piW(x0));
      p.text('the line is a guess about an average', 46, yhat(46) + ciW(46) - 2.6,
        { color: col.accent, font: '11.5px system-ui' });
      p.text('a single store lands anywhere in the wide band', 46,
        yhat(46) + piW(46) + 3.4, { color: col.accent2, font: '11.5px system-ui' });
    }
  });

  document.getElementById('int-ci').addEventListener('click', function () {
    state.ci = !state.ci;
    this.setAttribute('aria-pressed', String(state.ci));
    plot.render();
  });
  document.getElementById('int-pi').addEventListener('click', function () {
    state.pi = !state.pi;
    this.setAttribute('aria-pressed', String(state.pi));
    plot.render();
  });
  document.getElementById('int-x0').addEventListener('input', function () {
    state.x0 = parseFloat(this.value);
    readouts();
    plot.render();
  });

  readouts();
})();
