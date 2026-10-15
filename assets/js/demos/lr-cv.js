/* ==========================================================================
   lr-cv.js — Chapter 7, §7.6: choosing the span by cross-validation.

   The section ends where every flexibility section in this book ends:
   "We can again use cross-validation to choose s".  So here it is —
   ten folds, twenty spans from 0.05 to 1.00, one local-linear fit
   (Algorithm 7.1's eq. (7.14)) per test man per span, mean squared
   error and its standard error across the ten folds, on the Wage data
   with age as the predictor.

   The curve is remarkably flat: moving the span by a tenth changes the
   mean squared error by about as much as one standard error, so the
   argmin is not a sharp fact.  The reshuffle button regenerates the ten
   folds (seed marches through an LCG, page 7.1's construction) and the
   minimum slides around — that is the honest picture of what "CV
   chooses the span" means here.

   The fold split is Stats.kfolds(n, 10, seed): fold ids i mod 10 in
   order, then one mulberry32 shuffle.  Every fold's training data is
   sorted once; in one dimension the k nearest points to any target are
   a contiguous block of that sorted array, so a test prediction costs
   a binary search plus one weighted least squares over the block.
   ========================================================================== */
(function () {
  'use strict';
  var cPlot = document.getElementById('lr-cv-plot');
  if (!cPlot || typeof Plot === 'undefined' || typeof Stats === 'undefined' ||
      typeof CH07_WAGE === 'undefined') return;

  var W = window.CH07_WAGE;
  var age = W.age.map(Number), wage = W.wage.map(Number), n = W.n;

  var elSpan = document.getElementById('lr-cv-span'),
      elNew = document.getElementById('lr-cv-new');
  if (!elSpan || !elNew) return;
  var elRead = document.getElementById('lr-cv-read'),
      elBest = document.getElementById('lr-cv-best'),
      elShuffle = document.getElementById('lr-cv-shuffle');
  if (!elRead || !elBest || !elShuffle) return;

  var SPANS = [], i;
  for (i = 1; i <= 20; i++) SPANS.push(Math.round(i * 5) / 100);   // 0.05 .. 1

  var LOCAL = '#d55e00';
  var seed = 7, draws = 1;
  var cv = [], se = [];

  /* One sweep: for every span, hold out each fold in turn, predict its
     300 men by a local-linear fit on the other 2,700, and average the
     ten per-fold mean squared errors — page 7.1's construction. */
  function run() {
    var folds = Stats.kfolds(n, 10, seed), kk, j;
    var trX = [], trY = [], teX = [], teY = [];
    for (kk = 0; kk < 10; kk++) {
      trX.push([]); trY.push([]); teX.push([]); teY.push([]);
      for (j = 0; j < n; j++) {
        if (folds[j] === kk) { teX[kk].push(age[j]); teY[kk].push(wage[j]); }
        else { trX[kk].push(age[j]); trY[kk].push(wage[j]); }
      }
    }
    var preps = [];
    for (kk = 0; kk < 10; kk++) preps.push(Stats.localPrepare(trX[kk], trY[kk]));
    var vals = [], ses = [], q;
    for (q = 0; q < SPANS.length; q++) {
      var per = [], m = 0, v = 0, e;
      for (kk = 0; kk < 10; kk++) {
        var fit, rss = 0;
        for (j = 0; j < teX[kk].length; j++) {
          fit = Stats.localFitAt(teX[kk][j], preps[kk], SPANS[q], 1);
          e = teY[kk][j] - fit.yhat;
          rss += e * e;
        }
        e = rss / teX[kk].length;
        per.push(e); m += e;
      }
      m /= per.length;
      for (j = 0; j < per.length; j++) v += (per[j] - m) * (per[j] - m);
      vals.push(m);
      ses.push(Math.sqrt(v / (per.length - 1)) / Math.sqrt(per.length));
    }
    cv = vals; se = ses;
  }
  run();

  function bestIndex(arr) {
    var b = 0;
    for (var j = 1; j < arr.length; j++) if (arr[j] < arr[b]) b = j;
    return b;
  }

  var ylo = 0, yhi = 0;
  function scale() {
    var lo = Math.min.apply(null, cv), hi = Math.max.apply(null, cv);
    var pad = Math.max((hi - lo) * 0.35, 4);
    ylo = lo - pad; yhi = hi + pad;
  }
  scale();

  var plot = new Plot(cPlot, {
    range: { xmin: 0, xmax: 1.05, ymin: ylo, ymax: yhi },
    height: 320, xlabel: 'span s', ylabel: 'ten-fold CV mean squared error',
    draw: function (p) {
      p.axes();
      var b = bestIndex(cv), sel = Math.round(+elSpan.value * 100);
      p.line(SPANS.map(function (s, j) { return [s, cv[j]]; }),
        { color: LOCAL, width: 2.4 });
      p.points(SPANS.map(function (s, j) { return [s, cv[j]]; }),
        { color: LOCAL, r: 3.6 });
      var x = sel / 100;
      p.vline(x, { color: p.colors.accent2, width: 1.4, dash: [4, 4] });
      p.dot(SPANS[b], cv[b], { color: p.colors.accent2, r: 6 });
      p.text('minimum at span ' + SPANS[b].toFixed(2), SPANS[b], cv[b], {
        align: SPANS[b] > 0.7 ? 'right' : 'left', base: 'bottom',
        color: p.colors.accent2, font: 'bold 12px system-ui, sans-serif'
      });
    }
  });

  function render() {
    var sel = Math.round(+elSpan.value * 100), j = sel / 5 - 1;
    elRead.textContent = 'span ' + SPANS[j].toFixed(2) + ': ' +
      cv[j].toFixed(1) + ' ± ' + se[j].toFixed(1);
    var b = bestIndex(cv);
    elBest.textContent = 'best span ' + SPANS[b].toFixed(2) + ' at ' + cv[b].toFixed(1);
    elShuffle.textContent = 'shuffle #' + draws + ' (seed ' + seed + ')';
    scale();
    plot.setRange({ xmin: 0, xmax: 1.05, ymin: ylo, ymax: yhi });
    plot.render();
  }

  elSpan.addEventListener('input', render);
  elNew.addEventListener('click', function () {
    seed = (seed * 1103515245 + 12345) % 2147483647;
    if (seed < 1) seed += 2147483646;
    draws++;
    run();
    render();
  });
  render();
})();
