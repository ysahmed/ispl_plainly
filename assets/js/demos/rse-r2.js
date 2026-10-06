/* Demo — two rulers for the same fit: RSE and R² (§3.1.3)
   Move the noise dial.  RSE is in units of y and tracks the σ you chose;
   R² is a share of the variance and falls as the noise eats the signal. */
(function () {
  'use strict';
  var cv = document.getElementById('cv-rse');
  if (!cv || typeof Plot === 'undefined' || typeof Stats === 'undefined') return;

  var xs = [], i;
  for (i = 0; i < 100; i++) xs.push(i * 10 / 99);

  var state = { sigma: 3 };

  var elRse = document.getElementById('rse-rse');
  var elR2 = document.getElementById('rse-r2');
  var elF = document.getElementById('rse-f');
  var elPct = document.getElementById('rse-pct');
  var elNote = document.getElementById('rse-note');

  function data() {
    var rnd = mulberry32(19), ys = [];
    for (var j = 0; j < xs.length; j++) {
      ys.push(1.5 * xs[j] + 5 + gauss(rnd) * state.sigma);
    }
    return ys;
  }

  var plot = new Plot(cv, {
    range: { xmin: -0.4, xmax: 10.4, ymin: -10, ymax: 32 },
    height: 330,
    xlabel: 'feature x',
    ylabel: 'response y',
    draw: function (p) {
      var col = p.colors, ys = data(), n = ys.length;
      var X = [], k;
      for (k = 0; k < n; k++) X.push([1, xs[k]]);
      var fit = Stats.ols(X, ys);

      // keep the axis big enough for whatever noise level is asked for
      p.range.ymax = Math.max(26, 5 + 10 + state.sigma * 3.4);
      p.range.ymin = Math.min(-2, 5 - state.sigma * 3.4);

      p.axes();
      p.points(xs.map(function (x, idx) { return [x, ys[idx]]; }),
        { color: '#3b82f6', r: 3.8, alpha: 0.8 });
      p.line([[0, fit.beta[0]], [10, fit.beta[0] + fit.beta[1] * 10]],
        { color: col.accent2, width: 2.6 });
      p.line([[0, 5], [10, 20]], { color: col.axis, width: 1.4, dash: [6, 5] });

      // the gaps we are summarising
      var shown = 0;
      for (k = 0; k < n && shown < 24; k += 4, shown++) {
        p.line([[xs[k], ys[k]], [xs[k], fit.fitted[k]]],
          { color: col.accent2, width: 1, dash: [3, 3] });
      }

      var meanY = Stats.mean(ys);
      var pct = fit.rse / Math.abs(meanY) * 100;
      var verdict;
      if (pct > 25) verdict = 'the typical miss is a quarter of an average y — a rough fit';
      else if (pct > 12) verdict = 'the typical miss is around an eighth of an average y — usable, not tight';
      else verdict = 'the typical miss is small next to the average y — a tight fit';

      elRse.innerHTML = 'RSE = <b>' + fit.rse.toFixed(2) + '</b> (you asked for σ = ' +
        state.sigma.toFixed(1) + ')';
      elR2.innerHTML = 'R² = <b>' + fit.r2.toFixed(3) + '</b> — ' +
        Math.round(fit.r2 * 100) + '% of the variation in y explained';
      elF.innerHTML = 'F = <b>' + fit.F.toFixed(1) + '</b> on (1, ' + fit.df +
        ') df, p ' + (fit.fP < 0.001 ? '&lt; 0.001' : '= ' + fit.fP.toFixed(3));
      elPct.innerHTML = 'mean y = ' + meanY.toFixed(2) +
        ' → RSE is <b>' + pct.toFixed(0) + '%</b> of it';
      elNote.innerHTML = 'verdict: <b>' + verdict + '</b>';
    }
  });

  document.getElementById('rse-sigma').addEventListener('input', function () {
    state.sigma = parseFloat(this.value);
    document.getElementById('rse-sigmaread').innerHTML =
      'noise σ = <b>' + state.sigma.toFixed(1) + '</b>';
    plot.render();
  });
  document.getElementById('rse-sigmaread').innerHTML = 'noise σ = <b>3.0</b>';
})();
