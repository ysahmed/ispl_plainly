/* Demo — Day 2 · linear regression vs KNN regression (ISLP section 3.5)
   One slider: K.  Two fits on the same data: a straight line and KNN.
   Readouts: test MSE of each, against a held-out test set. */
(function () {
  'use strict';
  var cv = document.getElementById('cv-lknn');
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
  var K = 7;
  var elK = document.getElementById('lk-kread');
  var elLin = document.getElementById('lk-mse-lin');
  var elKnn = document.getElementById('lk-mse-knn');
  var elNote = document.getElementById('lk-note');

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

      var mLin = mse(test, lineFn), mKnn = mse(test, knn);
      elK.innerHTML = 'K = <b>' + K + '</b>';
      elLin.innerHTML = 'test MSE line: <b>' + mLin.toFixed(1) + '</b>';
      elKnn.innerHTML = 'test MSE KNN: <b>' + mKnn.toFixed(1) + '</b>';
      elNote.innerHTML = mKnn < mLin
        ? 'KNN wins on this test set'
        : 'the line wins on this test set';
    }
  });

  document.getElementById('lk-k').addEventListener('input', function (e) {
    K = parseInt(e.target.value, 10);
    plot.render();
  });
})();
