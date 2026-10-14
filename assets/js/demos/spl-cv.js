/* ==========================================================================
   spl-cv.js — Chapter 7, §7.4.4: ISLP Figure 7.6.

   Ten-fold cross-validated mean squared error against degrees of freedom,
   for a natural cubic spline on the left and an ordinary cubic spline on
   the right, on the Wage data with age as the predictor.

   The book reports the minima of its own figure at three degrees of freedom
   (natural) and four (cubic).  Ours do not sit there, and the point of the
   demo is why that is not a disagreement: the whole curve above df = 3
   moves by a few units, while the standard error of any single point is
   about sixty.  Both numbers are printed, so the flatness can be checked
   rather than believed — and the button reshuffles the ten folds to show
   that the argmin wanders about within that noise.

   Both panels share one vertical scale.  The cubic panel starts at df 3
   rather than 1 because a cubic already has three coefficients before a
   knot is added.
   ========================================================================== */
(function () {
  'use strict';
  var cNs = document.getElementById('sv-ns');
  var cCs = document.getElementById('sv-cs');
  if (!cNs || !cCs || typeof Plot === 'undefined' || typeof Stats === 'undefined' ||
      typeof CH07_WAGE === 'undefined') return;

  var W = window.CH07_WAGE;
  var age = W.age.map(Number), y = W.wage.map(Number), n = y.length;
  var NS_DFS = [], CS_DFS = [], i;
  for (i = 1; i <= 10; i++) NS_DFS.push(i);
  for (i = 3; i <= 10; i++) CS_DFS.push(i);
  var YLO = 1580, YHI = 1700;

  var elDf = document.getElementById('sv-df');
  var elNew = document.getElementById('sv-new');
  var elDfread = document.getElementById('sv-dfread');
  var elCvn = document.getElementById('sv-cvn');
  var elCvc = document.getElementById('sv-cvc');
  var elBestn = document.getElementById('sv-bestn');
  var elBestc = document.getElementById('sv-bestc');
  var elShuffle = document.getElementById('sv-shuffle');
  if (!elDf || !elNew || !elDfread || !elCvn || !elCvc || !elBestn || !elBestc ||
      !elShuffle) return;

  var seed = 7, draws = 1;
  var cvN = [], seN = [], cvC = [], seC = [];

  /* One sweep over a list of degrees: the same fold split for every degree,
     so points on a curve differ only by the basis used.  A curve's value is
     the mean of the ten per-fold mean squared errors; the standard error is
     the standard deviation of those ten divided by sqrt(10) — the same
     construction page 7.1 used for polynomials. */
  function sweep(dfs, build) {
    var folds = Stats.kfolds(n, 10, seed), vals = [], ses = [], q, j;
    for (q = 0; q < dfs.length; q++) {
      var d = dfs[q];
      var res = Stats.cvBasis(age, y, folds, function (xt) {
        return build(xt, d);
      }, 10);
      var per = [], m = 0, v = 0, e;
      for (j = 0; j < res.foldRss.length; j++) {
        e = res.foldRss[j] / res.foldN[j];
        per.push(e); m += e;
      }
      m /= per.length;
      for (j = 0; j < per.length; j++) v += (per[j] - m) * (per[j] - m);
      vals.push(m);
      ses.push(Math.sqrt(v / (per.length - 1)) / Math.sqrt(per.length));
    }
    return { vals: vals, ses: ses };
  }

  function run() {
    var a = sweep(NS_DFS, function (xt, d) { return Stats.natSpline(xt, d); });
    cvN = a.vals; seN = a.ses;
    var b = sweep(CS_DFS, function (xt, d) { return Stats.cubSpline(xt, d); });
    cvC = b.vals; seC = b.ses;
  }
  run();

  function bestIndex(arr) {
    var b = 0;
    for (var j = 1; j < arr.length; j++) if (arr[j] < arr[b]) b = j;
    return b;
  }

  function makePanel(canvas, dfs, label) {
    return new Plot(canvas, {
      range: { xmin: 0.6, xmax: 10.4, ymin: YLO, ymax: YHI },
      height: 300, xlabel: 'degrees of freedom',
      ylabel: 'ten-fold CV mean squared error',
      draw: function (p) {
        var vals = label === 'natural cubic spline' ? cvN : cvC;
        var sel = +elDf.value;
        p.axes();
        p.line(dfs.map(function (d, j) { return [d, vals[j]]; }),
          { color: p.colors.accent, width: 2.4 });
        p.points(dfs.map(function (d, j) { return [d, vals[j]]; }),
          { color: p.colors.accent, r: 3.6 });
        var b = bestIndex(vals);
        p.dot(dfs[b], vals[b], { color: p.colors.accent2, r: 6 });
        p.text('minimum at df ' + dfs[b], dfs[b], vals[b], {
          align: dfs[b] > 6 ? 'right' : 'left', base: 'bottom',
          color: p.colors.accent2, font: 'bold 12px system-ui, sans-serif'
        });
        if (sel >= dfs[0] && sel <= dfs[dfs.length - 1]) {
          p.vline(sel, { color: p.colors.accent2, width: 1.3, dash: [4, 4] });
        }
        p.text(label, 1.2, YHI - 8, {
          color: p.colors.fg, font: 'bold 12.5px system-ui, sans-serif'
        });
      }
    });
  }

  var nsPlot = makePanel(cNs, NS_DFS, 'natural cubic spline');
  var csPlot = makePanel(cCs, CS_DFS, 'cubic spline');

  function render() {
    var d = +elDf.value;
    var jn = NS_DFS.indexOf(d), jc = CS_DFS.indexOf(d);
    var bn = bestIndex(cvN), bc = bestIndex(cvC);
    elDfread.textContent = 'df ' + d;
    elCvn.textContent = 'natural df ' + d + ': ' + cvN[jn].toFixed(1) + ' ± ' +
      seN[jn].toFixed(1);
    elCvc.textContent = jc < 0
      ? 'cubic: df 3 is the floor for that family'
      : 'cubic df ' + d + ': ' + cvC[jc].toFixed(1) + ' ± ' + seC[jc].toFixed(1);
    elBestn.textContent = 'best natural: df ' + NS_DFS[bn] + ' at ' + cvN[bn].toFixed(1);
    elBestc.textContent = 'best cubic: df ' + CS_DFS[bc] + ' at ' + cvC[bc].toFixed(1);
    elShuffle.textContent = 'shuffle #' + draws + ' (seed ' + seed + ')';
    nsPlot.render();
    csPlot.render();
  }

  elDf.addEventListener('input', render);
  elNew.addEventListener('click', function () {
    seed = (seed * 1103515245 + 12345) % 2147483647;
    if (seed < 1) seed += 2147483646;
    draws++;
    run();
    render();
  });
  render();
})();
