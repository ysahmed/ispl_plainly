/* Demo — section 4.6.2 · the Poisson distribution: a model for counts
   where the mean and the variance are locked together (both equal λ).
   Drag λ: watch the bars slide right, spread out, and keep the readout
   "variance = mean" true at every setting. */
(function () {
  'use strict';
  var cv = document.getElementById('cv-poisdist');
  if (!cv || typeof Plot === 'undefined') return;

  var lam = 5;

  var elMean = document.getElementById('pd-mean');
  var elVar = document.getElementById('pd-var');
  var elHead = document.getElementById('pd-head');

  function logfact(k) {
    var s = 0, i;
    for (i = 2; i <= k; i++) s += Math.log(i);
    return s;
  }
  function pmf(k) {
    return Math.exp(-lam + k * Math.log(lam) - logfact(k));
  }

  function refresh() {
    elMean.innerHTML = 'mean E(Y) = λ = <b>' + lam.toFixed(1) + '</b>';
    elVar.innerHTML = 'Var(Y) = <b>' + lam.toFixed(1) + '</b> — always equal to the mean';
    elHead.innerHTML = 'Pr(0) = <b>' + pmf(0).toFixed(4) + '</b> · ' +
      'Pr(1) = <b>' + pmf(1).toFixed(4) + '</b> · ' +
      'Pr(2) = <b>' + pmf(2).toFixed(4) + '</b>';
  }

  var plot = new Plot(cv, {
    range: { xmin: -0.6, xmax: 30, ymin: 0, ymax: 0.45 },
    height: 330,
    xlabel: 'number of events, k',
    ylabel: 'Pr(Y = k)',
    draw: function (p) {
      var col = p.colors;

      var kmax = Math.min(30, Math.ceil(lam + 4 * Math.sqrt(lam) + 3));
      var top = 0;
      var k;
      for (k = 0; k <= kmax; k++) top = Math.max(top, pmf(k));
      // let the y axis follow the tallest bar (mutating range in place is
      // fine here — setRange would schedule another paint and never settle)
      p.range.ymax = Math.max(0.05, top * 1.4);

      p.axes();
      var barH = Math.max(0.004, top * 0.06);

      for (k = 0; k <= kmax; k++) {
        var pr = pmf(k);
        if (pr < 1e-6) continue;
        p.cell(k - 0.32, k + 0.32, 0, pr, col.accent, 0.85);
        if (pr > top * 0.25) {
          p.text(pr.toFixed(3), k, pr + barH, { align: 'center', base: 'bottom', color: col.fg });
        }
      }

      // the mean sits where the balance point of the bars would be
      p.vline(lam, { color: col.accent2, width: 2, dash: [6, 4] });
      p.text('mean λ = ' + lam.toFixed(1), lam, top * 1.02,
        { color: col.accent2, align: lam > 22 ? 'right' : 'left', base: 'bottom' });

      if (p.pointer && p.pointer.inside) {
        var kk = Math.round(p.pointer.x);
        if (kk >= 0 && kk <= kmax) {
          p.badge(['k = ' + kk, 'Pr(Y = ' + kk + ') = ' + pmf(kk).toFixed(4)], kk, pmf(kk));
        }
      }
    }
  });

  document.getElementById('pd-lambda').addEventListener('input', function (e) {
    lam = parseFloat(e.target.value);
    refresh();
    plot.render();
  });

  refresh();
})();
