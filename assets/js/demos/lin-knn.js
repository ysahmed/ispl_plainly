/* Demo — linear regression vs KNN regression (§3.5)
   One line, one step function, one slider.  Left: the two fits on the same
   training data (faint dots) scored on held-out test points.  Right: test
   error as K moves — the bias-variance tradeoff drawn as a curve. */
(function () {
  'use strict';
  var cv = document.getElementById('cv-lknn');
  var cvK = document.getElementById('cv-lknn-k');   // §3.5 only; §2.1 has one panel
  if (!cv || typeof Plot === 'undefined') return;

  var trueF = function (x) { return 0.32 * (x - 5) * (x - 5) + 3.5; };
  var rnd = mulberry32(17);

  var train = [], test = [];
  for (var i = 0; i < 45; i++) {
    var x = rnd() * 10;
    train.push({ x: x, y: trueF(x) + gauss(rnd) * 3.0 });
  }
  for (var j = 0; j < 300; j++) {
    var t = rnd() * 10;
    test.push({ x: t, y: trueF(t) + gauss(rnd) * 3.0 });
  }

  function fitLine(pts) {
    var n = pts.length, sx = 0, sy = 0, sxx = 0, sxy = 0;
    pts.forEach(function (p) { sx += p.x; sy += p.y; sxx += p.x * p.x; sxy += p.x * p.y; });
    var den = n * sxx - sx * sx;
    var m = den === 0 ? 0 : (n * sxy - sx * sy) / den;
    var b = (sy - m * sx) / n;
    return function (x) { return m * x + b; };
  }

  // KNN regression: average the y of the K nearest training points
  function knnFit(pts, k) {
    var sorted = pts.slice().sort(function (a, b) { return a.x - b.x; });
    return function (x) {
      var lo = 0, hi = sorted.length;
      while (lo < hi) {
        var mid = (lo + hi) >> 1;
        if (sorted[mid].x < x) lo = mid + 1; else hi = mid;
      }
      var a = Math.max(0, Math.min(sorted.length - k, lo - (k >> 1)));
      var sum = 0;
      for (var q = a; q < a + k; q++) sum += sorted[q].y;
      return sum / k;
    };
  }

  function mse(pts, f) {
    var s = 0;
    pts.forEach(function (p) { var e = p.y - f(p.x); s += e * e; });
    return s / pts.length;
  }

  var lineFn = fitLine(train);
  var MSE_LINE = mse(test, lineFn);
  var K = 7;
  var elK = document.getElementById('lk-kread');
  var elLin = document.getElementById('lk-mse-lin');
  var elKnn = document.getElementById('lk-mse-knn');
  var elNote = document.getElementById('lk-note');

  // test error for every K we allow — the curve on the right (§3.5 panel only)
  var curve = null, bestK = null;
  if (cvK) {
    curve = [];
    for (var k2 = 1; k2 <= 45; k2++) curve.push({ k: k2, m: mse(test, knnFit(train, k2)) });
    bestK = curve.reduce(function (a, b) { return b.m < a.m ? b : a; });
  }

  var plot = new Plot(cv, {
    range: { xmin: -0.5, xmax: 10.5, ymin: -6, ymax: 26 },
    height: 350,
    xlabel: 'feature x',
    ylabel: 'target y',
    draw: function (p) {
      var col = p.colors;
      var knn = knnFit(train, K);

      p.axes();

      // the straight line, always visible — the rival model
      p.fnLine(lineFn, { color: col.axis, width: 2, dash: [7, 5] });
      // KNN fit, the active model
      p.fnLine(knn, { color: col.accent, width: 2.8 });

      // held-out test points (faint) — what the MSEs are measured on
      p.points(test.map(function (q) { return [q.x, q.y]; }),
        { color: col.axis, r: 2.6, alpha: 0.35 });
      // training points on top
      p.points(train.map(function (q) { return [q.x, q.y]; }),
        { color: '#f59e0b', r: 4.6 });

      p.text('KNN (K = ' + K + ')', 1.6, knn(1.6) + 3.2, { color: col.accent });
      p.text('straight line', 8.6, lineFn(8.6) - 3.4,
        { color: col.axis, align: 'right' });

      var mLin = MSE_LINE, mKnn = mse(test, knn);
      elK.innerHTML = 'K = <b>' + K + '</b>';
      elLin.innerHTML = 'test MSE line: <b>' + mLin.toFixed(1) + '</b>';
      elKnn.innerHTML = 'test MSE KNN: <b>' + mKnn.toFixed(1) + '</b>';
      elNote.innerHTML = K === 1
        ? 'K = 1 interpolates every training point — the fit is pure noise between them'
        : K >= 35
          ? 'K is so large that every prediction is nearly the same average — oversmoothed'
          : mKnn < mLin
            ? (bestK
              ? 'KNN wins on this test set (best K here: ' + bestK.k + ')'
              : 'KNN wins on this test set — it follows the bend that the straight line has to cut across')
            : 'the line wins on this test set — the noise KNN buys in outweighs the curve it catches';
    }
  });

  var kplot = cvK ? new Plot(cvK, {
    range: { xmin: 0.5, xmax: 45.5, ymin: 0, ymax: 30 },
    height: 260,
    xlabel: 'K (number of neighbours averaged)',
    ylabel: 'test MSE',
    draw: function (p) {
      var col = p.colors;
      p.range.ymax = Math.max.apply(null, curve.map(function (c) { return c.m; })) * 1.1;
      p.axes();

      p.hline(MSE_LINE, { color: col.axis, width: 2, dash: [7, 5] });
      p.line(curve.map(function (c) { return [c.k, c.m]; }),
        { color: col.accent, width: 2.6 });
      p.points(curve.map(function (c) { return [c.k, c.m]; }),
        { color: col.accent, r: 2.6, alpha: 0.8 });

      p.dot(K, mse(test, knnFit(train, K)), { r: 6, color: col.fg, ring: col.surface, ringWidth: 2 });
      p.dot(bestK.k, bestK.m, { r: 5.5, color: col.accent2, ring: col.surface, ringWidth: 2 });

      p.text('straight line: ' + MSE_LINE.toFixed(1), 45, MSE_LINE - 2.2,
        { align: 'right', color: col.axis, font: '11.5px system-ui' });
      p.text('best K = ' + bestK.k, bestK.k, bestK.m + 3.4,
        { align: 'center', color: col.accent2, font: '11.5px system-ui' });
      p.text('too wiggly', 3, p.range.ymax * 0.9, { color: col.fg, font: '11px system-ui' });
      p.text('too smooth', 42, p.range.ymax * 0.9,
        { align: 'right', color: col.fg, font: '11px system-ui' });
    }
  }) : null;

  document.getElementById('lk-k').addEventListener('input', function (e) {
    K = parseInt(e.target.value, 10);
    plot.render();
    if (kplot) kplot.render();
  });
})();
