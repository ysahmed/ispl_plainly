/* Demo B — flexibility slider: train vs test error (overfitting + bias-variance) */
(function () {
  'use strict';
  var cvFit = document.getElementById('cv-flex-fit');
  var cvMse = document.getElementById('cv-flex-mse');
  if (!cvFit || !cvMse || typeof Plot === 'undefined') return;

  var F = function (x) { return 0.9 * x - 0.55 * x * x * x; };
  var XSC = 1.7;                       // fit in u = x/XSC ∈ [-1, 1]
  var DEG_MAX = 15;
  var NOISE = 0.45;

  var rnd = mulberry32(21), train = [], test = [];
  for (var i = 0; i < 36; i++) {
    var x = -XSC + 2 * XSC * rnd();
    train.push([x, F(x) + NOISE * gauss(rnd)]);
  }
  for (var j = 0; j <= 160; j++) {
    var xt = -XSC + 2 * XSC * j / 160;
    test.push([xt, F(xt) + NOISE * gauss(rnd)]);
  }

  function fitPoly(pts, d) {            // least squares in scaled coords
    var n = d + 1, A = [], b = [], i, j, k;
    for (i = 0; i < n; i++) { A.push([]); b.push(0); for (j = 0; j < n; j++) A[i].push(0); }
    for (k = 0; k < pts.length; k++) {
      var u = pts[k][0] / XSC, pw = [1];
      for (i = 1; i < n; i++) pw.push(pw[i - 1] * u);
      for (i = 0; i < n; i++) {
        b[i] += pw[i] * pts[k][1];
        for (j = 0; j < n; j++) A[i][j] += pw[i] * pw[j];
      }
    }
    for (i = 0; i < n; i++) {           // Gaussian elimination + partial pivot
      var piv = i;
      for (k = i + 1; k < n; k++) if (Math.abs(A[k][i]) > Math.abs(A[piv][i])) piv = k;
      if (piv !== i) {
        var t = A[i]; A[i] = A[piv]; A[piv] = t;
        t = b[i]; b[i] = b[piv]; b[piv] = t;
      }
      for (k = i + 1; k < n; k++) {
        var f = A[k][i] / A[i][i];
        if (!isFinite(f)) continue;
        for (j = i; j < n; j++) A[k][j] -= f * A[i][j];
        b[k] -= f * b[i];
      }
    }
    var c = new Array(n).fill(0);
    for (i = n - 1; i >= 0; i--) {
      var s = b[i];
      for (j = i + 1; j < n; j++) s -= A[i][j] * c[j];
      c[i] = Math.abs(A[i][i]) < 1e-12 ? 0 : s / A[i][i];
    }
    return function (x) {
      var u = x / XSC, y = 0, p2 = 1;
      for (var i2 = 0; i2 < n; i2++) { y += c[i2] * p2; p2 *= u; }
      return y;
    };
  }

  function mse(pred, pts) {
    var s = 0;
    for (var i = 0; i < pts.length; i++) { var e = pred(pts[i][0]) - pts[i][1]; s += e * e; }
    return s / pts.length;
  }

  var table = [];
  for (var d = 1; d <= DEG_MAX; d++) {
    var pr = fitPoly(train, d);
    table.push({ d: d, train: mse(pr, train), test: mse(pr, test), pred: pr });
  }
  var best = table.reduce(function (a, b) { return b.test < a.test ? b : a; });
  var testMax = Math.max.apply(null, table.map(function (r) { return r.test; }));
  var yMax = Math.min(testMax * 1.06,
    Math.max(4 * best.test, 1.15 * table[0].test, 1.15 * table[0].train, 0.5));

  var state = { degree: 1 };
  var slider = document.getElementById('fn-degree');
  var elTrain = document.getElementById('fn-flex-train');
  var elTest = document.getElementById('fn-flex-test');
  var elBest = document.getElementById('fn-flex-best');
  var elZone = document.getElementById('fn-flex-zone');

  var plotFit = new Plot(cvFit, {
    range: { xmin: -XSC - 0.15, xmax: XSC + 0.15, ymin: -3.6, ymax: 3.6 },
    height: 300,
    xlabel: 'x',
    ylabel: 'y',
    draw: function (p) {
      var col = p.colors, row = table[state.degree - 1];
      p.axes();
      p.fnLine(F, { color: col.axis, width: 1.8, dash: [5, 5] });
      for (var t = 0; t < test.length; t += 5) {
        p.dot(test[t][0], test[t][1], { r: 2.4, color: col.axis, ring: false });
      }
      p.points(train, { color: col.accent, r: 4 });
      p.fnLine(row.pred, { color: col.accent2, width: 2.2 });

      p.text('true f(x) — never see it', p.range.xmin + 0.1, 3.3, { font: '11.5px system-ui', color: col.axis });
      p.text('training points', p.range.xmin + 0.1, -3.3, { font: '11.5px system-ui', color: col.accent });
      p.text('degree ' + state.degree + ' fit', p.range.xmax - 0.1, -3.3,
        { font: '11.5px system-ui', color: col.accent2, align: 'right' });
    }
  });

  var plotMse = new Plot(cvMse, {
    range: { xmin: 0.6, xmax: DEG_MAX + 0.4, ymin: 0, ymax: yMax },
    height: 300,
    xlabel: 'model flexibility → (polynomial degree)',
    ylabel: 'error (MSE)',
    draw: function (p) {
      var col = p.colors, row = table[state.degree - 1];

      p.axes();

      // shade the three verdict zones
      p.clip(function () {
        var c = p.ctx;
        c.globalAlpha = 1;
        c.fillStyle = col.good;
        c.globalAlpha = 0.05;
        c.fillRect(p.xToPx(0.6), p.yToPx(yMax),
                   p.xToPx(best.d + 0.5) - p.xToPx(0.6), p.yToPx(0) - p.yToPx(yMax));
        c.fillStyle = col.accent2;
        c.fillRect(p.xToPx(best.d + 0.5), p.yToPx(yMax),
                   p.xToPx(DEG_MAX + 0.4) - p.xToPx(best.d + 0.5), p.yToPx(0) - p.yToPx(yMax));
        c.globalAlpha = 1;
      });

      p.line(table.map(function (r) { return [r.d, r.train]; }), { color: col.accent, width: 2.2 });
      p.line(table.map(function (r) { return [r.d, r.test]; }), { color: col.accent2, width: 2.2 });
      p.points(table.map(function (r) { return [r.d, r.train]; }), { color: col.accent, r: 3 });
      p.points(table.map(function (r) { return [r.d, r.test]; }), { color: col.accent2, r: 3 });

      p.vline(state.degree, { color: col.fg, width: 1.4, dash: [4, 4] });
      p.dot(state.degree, row.train, { r: 5, color: col.accent, ring: col.surface });
      p.dot(state.degree, row.test, { r: 5, color: col.accent2, ring: col.surface });

      p.text('high bias — too stiff', 1.4, yMax * 0.9, { font: '11.5px system-ui', color: col.muted || col.axis });
      p.text('high variance — too twitchy', DEG_MAX - 0.4, yMax * 0.9,
        { font: '11.5px system-ui', color: col.muted || col.axis, align: 'right' });
      p.text('sweet spot', best.d, Math.min(best.test + yMax * 0.13, yMax * 0.55),
        { font: '11.5px system-ui', color: col.good, align: 'center' });
      p.text('train', table[DEG_MAX - 1].d, Math.max(table[DEG_MAX - 1].train, yMax * 0.06),
        { font: '11.5px system-ui', color: col.accent, align: 'right' });
      p.text('test', table[DEG_MAX - 1].d - 0.2, yMax * 0.42,
        { font: '11.5px system-ui', color: col.accent2, align: 'right' });

      elTrain.innerHTML = 'train MSE: <b>' + row.train.toFixed(3) + '</b>';
      elTest.innerHTML = 'test MSE: <b>' + row.test.toFixed(3) + '</b>';
      elBest.innerHTML = 'sweet spot: degree <b>' + best.d + '</b> (test ' + best.test.toFixed(3) + ')';
      var verdict = state.degree < best.d
        ? 'underfit — too stubborn for the pattern'
        : (row.test > best.test * 1.25
          ? 'overfit — chasing the noise'
          : 'near the sweet spot');
      elZone.innerHTML = 'verdict: <b>' + verdict + '</b>';
    }
  });

  slider.addEventListener('input', function () {
    state.degree = Number(slider.value);
    plotFit.render();
    plotMse.render();
  });
})();
