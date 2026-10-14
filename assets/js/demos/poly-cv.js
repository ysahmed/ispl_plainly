/* ==========================================================================
   poly-cv.js — Chapter 7, §7.1: how far up the degree should we go?

   Left panel: ten-fold cross-validated mean squared error against the
   degree, with the minimum marked.  Right panel: the same curve set against
   the *training* mean squared error, which can only fall as the degree
   rises and therefore can never say stop.  Reshuffling the folds moves the CV minimum
   around inside a curve that is otherwise flat — press the button and watch
   it, because that instability is the honest reason the book stops at four.
   ========================================================================== */
(function () {
  'use strict';
  var cCv = document.getElementById('pc-cv');
  var cGap = document.getElementById('pc-gap');
  if (!cCv || !cGap || typeof Plot === 'undefined' || typeof Stats === 'undefined' ||
      typeof CH07_WAGE === 'undefined') return;

  var W = window.CH07_WAGE;
  var age = W.age.map(Number), y = W.wage.map(Number), n = y.length;
  var MAXD = 10;
  var degs = [], i;
  for (i = 1; i <= MAXD; i++) degs.push(i);

  var elDeg = document.getElementById('pc-deg');
  var elBtn = document.getElementById('pc-new');
  var elDegread = document.getElementById('pc-degread');
  var elCv = document.getElementById('pc-cvread');
  var elTrain = document.getElementById('pc-train');
  var elBest = document.getElementById('pc-best');
  var elShuffle = document.getElementById('pc-shuffle');
  if (!elDeg || !elBtn) return;

  var seed = 7, draws = 1;
  var cvMse = [], cvSe = [], trainMse = [];

  /* One full pass over the degrees: a fold assignment, one fit per fold per
     degree, the mean squared error of the held-out predictions, and its
     standard error across the ten folds. */
  function run(s) {
    var folds = Stats.kfolds(n, 10, s);
    cvMse = []; cvSe = []; trainMse = [];
    var f = null, d, j;
    for (d = 1; d <= MAXD; d++) {
      var res = Stats.cvBasis(age, y, folds, function (xt, yt) {
        return Stats.polyBasis(xt, d);
      }, 10);
      var per = [], tot = 0, totN = 0;
      for (j = 0; j < res.foldRss.length; j++) {
        per.push(res.foldRss[j] / res.foldN[j]);
        tot += res.foldRss[j]; totN += res.foldN[j];
      }
      var m = Stats.mean(per);
      var v = 0;
      for (j = 0; j < per.length; j++) v += (per[j] - m) * (per[j] - m);
      cvMse.push(m);
      cvSe.push(Math.sqrt(v / (per.length - 1)) / Math.sqrt(per.length));
      f = Stats.ols(Stats.design(Stats.polyBasis(age, d).cols), y);
      trainMse.push(f.rss / n);
    }
  }
  run(seed);

  function bestIndex(arr) {
    var b = 0;
    for (var j = 1; j < arr.length; j++) if (arr[j] < arr[b]) b = j;
    return b;
  }

  var cvPlot = new Plot(cCv, {
    range: { xmin: 0.6, xmax: MAXD + 0.4, ymin: 1580, ymax: 1690 },
    height: 300, xlabel: 'degree of the polynomial', ylabel: 'ten-fold CV mean squared error',
    draw: function (p) {
      p.axes();
      p.line(degs.map(function (d, j) { return [d, cvMse[j]]; }),
        { color: p.colors.accent2, width: 2.4 });
      p.points(degs.map(function (d, j) { return [d, cvMse[j]]; }),
        { color: p.colors.accent2, r: 3.6 });
      var b = bestIndex(cvMse);
      p.dot(degs[b], cvMse[b], { color: p.colors.accent, r: 6 });
      p.text('minimum at degree ' + degs[b], degs[b], cvMse[b], {
        align: degs[b] > 6 ? 'right' : 'left', base: 'bottom',
        color: p.colors.accent, font: 'bold 12px system-ui, sans-serif'
      });
      var k = +elDeg.value - 1;
      p.vline(degs[k], { color: p.colors.accent, width: 1.3, dash: [4, 4] });
    }
  });

  /* Training against cross-validation on one scale.  Training error is the
     grey dashed line: it can only fall, because degree d sits inside degree
     d+1 and the extra coefficient may always be set to zero.  The blue line
     is the same quantity estimated on held-out rows, and it stops. */
  var gapPlot = new Plot(cGap, {
    range: { xmin: 0.6, xmax: MAXD + 0.4, ymin: 1580, ymax: 1690 },
    height: 300, xlabel: 'degree of the polynomial', ylabel: 'mean squared error',
    draw: function (p) {
      p.axes();
      p.line(degs.map(function (d, j) { return [d, trainMse[j]]; }),
        { color: p.colors.axis, width: 2.2, dash: [6, 4] });
      p.line(degs.map(function (d, j) { return [d, cvMse[j]]; }),
        { color: p.colors.accent2, width: 2.4 });
      p.text('ten-fold CV', MAXD - 0.4, cvMse[MAXD - 1] + 5, {
        align: 'right', base: 'bottom', color: p.colors.accent2,
        font: 'bold 12px system-ui, sans-serif'
      });
      p.text('training', MAXD - 0.4, trainMse[MAXD - 1] - 4, {
        align: 'right', base: 'top', color: p.colors.axis,
        font: 'bold 12px system-ui, sans-serif'
      });
      p.text('training error can only fall; the gap is its optimism',
             1.4, 1600, { color: p.colors.fg, font: '11.5px system-ui, sans-serif' });
    }
  });

  function render() {
    var d = +elDeg.value, j = d - 1, b = bestIndex(cvMse);
    elDegread.textContent = 'degree ' + d;
    elCv.textContent = 'CV MSE ' + cvMse[j].toFixed(1) + ' ± ' + cvSe[j].toFixed(1);
    elTrain.textContent = 'training MSE ' + trainMse[j].toFixed(1);
    elBest.textContent = 'best: degree ' + degs[b] + ' at ' + cvMse[b].toFixed(1);
    elShuffle.textContent = 'shuffle #' + draws + ' (seed ' + seed + ')';
    cvPlot.render();
    gapPlot.render();
  }

  elDeg.addEventListener('input', render);
  elBtn.addEventListener('click', function () {
    seed = (seed * 1103515245 + 12345) % 2147483647;
    if (seed < 1) seed += 2147483646;
    draws++;
    run(seed);
    render();
  });
  render();
})();
