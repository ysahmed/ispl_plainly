/* Demo — outliers, high leverage, and which line they move (§3.3.4)
   The same extra point, placed two different ways: far above the cloud
   (an outlier) or far to the right in an empty part of the x-range
   (high leverage).  Least squares squares the miss, so it chases the
   first; leverage matters because it can swing the slope. */
(function () {
  'use strict';
  var cv = document.getElementById('cv-outlier');
  if (!cv || typeof Plot === 'undefined') return;

  function baseData() {
    var rnd = mulberry32(31), pts = [];
    for (var i = 0; i < 20; i++) {
      var x = 0.5 + rnd() * 9;
      pts.push({ x: x, y: 1.25 * x + 2.5 + gauss(rnd) * 1.6 });
    }
    return pts;
  }

  var state = { pts: baseData(), outlier: false, leverage: false };

  function withExtra() {
    var pts = state.pts.slice();
    if (state.outlier) pts.push({ x: 9.2, y: 35, kind: 'outlier' });
    if (state.leverage) pts.push({ x: 10.4, y: 1.5, kind: 'leverage' });
    return pts;
  }

  function fitMSE(pts) {
    var n = pts.length, sx = 0, sy = 0, sxx = 0, sxy = 0;
    pts.forEach(function (p) { sx += p.x; sy += p.y; sxx += p.x * p.x; sxy += p.x * p.y; });
    var den = n * sxx - sx * sx;
    var m = den === 0 ? 0 : (n * sxy - sx * sy) / den;
    return { m: m, b: (sy - m * sx) / n };
  }

  function median(a) {
    a = a.slice().sort(function (x, y) { return x - y; });
    var mid = Math.floor(a.length / 2);
    return a.length % 2 ? a[mid] : (a[mid - 1] + a[mid]) / 2;
  }

  // For a fixed slope, the best intercept under absolute error is the median
  // of (y − m·x). We scan slopes and keep whichever pair misses the least.
  function fitMAE(pts) {
    var best = { m: 1, b: 0, err: Infinity };
    for (var m = -1; m <= 3.001; m += 0.005) {
      var b = median(pts.map(function (p) { return p.y - m * p.x; }));
      var err = 0;
      pts.forEach(function (p) { err += Math.abs(p.y - (m * p.x + b)); });
      if (err < best.err) best = { m: m, b: b, err: err };
    }
    return best;
  }

  var elMSE = document.getElementById('out-mse');
  var elMAE = document.getElementById('out-mae');
  var elSlope = document.getElementById('out-slope');
  var elNote = document.getElementById('out-note');

  function eqTxt(f) {
    return 'ŷ = ' + f.m.toFixed(2) + 'x ' + (f.b < 0 ? '− ' : '+ ') + Math.abs(f.b).toFixed(2);
  }

  var clean = fitMSE(state.pts);

  var plot = new Plot(cv, {
    range: { xmin: -0.5, xmax: 11.4, ymin: -6, ymax: 44 },
    height: 340,
    xlabel: 'feature x (the last unit of x is far from the crowd)',
    ylabel: 'target y',
    draw: function (p) {
      var col = p.colors;
      var pts = withExtra();
      var mse = fitMSE(pts);
      var mae = fitMAE(pts);
      p.axes();

      p.line([[p.range.xmin, mse.m * p.range.xmin + mse.b],
              [p.range.xmax, mse.m * p.range.xmax + mse.b]],
             { color: col.accent, width: 2.6 });
      p.line([[p.range.xmin, mae.m * p.range.xmin + mae.b],
              [p.range.xmax, mae.m * p.range.xmax + mae.b]],
             { color: col.accent2, width: 2.4, dash: [7, 5] });

      p.points(pts.filter(function (q) { return !q.kind; }).map(function (q) { return [q.x, q.y]; }),
        { color: '#3b82f6', r: 4.6 });
      pts.filter(function (q) { return q.kind === 'outlier'; }).forEach(function (q) {
        p.dot(q.x, q.y, { r: 7, color: '#f59e0b', ring: col.accent2, ringWidth: 2.5 });
        p.text('outlier (big miss, ordinary x)', q.x - 0.3, q.y, { align: 'right', color: col.accent2 });
      });
      pts.filter(function (q) { return q.kind === 'leverage'; }).forEach(function (q) {
        p.dot(q.x, q.y, { r: 7, color: '#f59e0b', ring: col.accent, ringWidth: 2.5 });
        p.text('high leverage (far in x)', q.x, q.y - 1.8, { align: 'right', color: col.accent });
      });

      p.text('least squares (MSE)', 4.6, mse.m * 4.6 + mse.b + 2.4, { color: col.accent });
      p.text('least absolute (MAE)', 4.6, mae.m * 4.6 + mae.b - 2.4, { color: col.accent2 });

      elMSE.innerHTML = 'MSE line: <b>' + eqTxt(mse) + '</b>';
      elMAE.innerHTML = 'MAE line: <b>' + eqTxt(mae) + '</b>';
      if (elSlope) {
        elSlope.innerHTML = 'slope: <b>' + mse.m.toFixed(2) + '</b>' +
          ' (it was ' + clean.m.toFixed(2) + ' without extra points)';
      }
      if (elNote) {
        var shift = Math.abs(mse.m - clean.m);
        elNote.innerHTML = state.leverage
          ? 'reading: the leverage point sits alone at high x, so it can <b>rotate</b> the line — slope moved ' +
            shift.toFixed(2)
          : state.outlier
            ? 'reading: the outlier is far from the line but not far in x — the slope moved only ' +
              shift.toFixed(2) + ', though the line wobbles and the residuals blow up'
            : 'reading: no extra points yet — the two buttons add one in two very different places';
      }
    }
  });

  var btn = document.getElementById('out-toggle');
  btn.addEventListener('click', function () {
    state.outlier = !state.outlier;
    btn.setAttribute('aria-pressed', String(state.outlier));
    btn.textContent = state.outlier ? 'Remove the outlier' : 'Add an outlier';
    plot.render();
  });

  var lev = document.getElementById('out-leverage');
  if (lev) lev.addEventListener('click', function () {
    state.leverage = !state.leverage;
    lev.setAttribute('aria-pressed', String(state.leverage));
    lev.textContent = state.leverage ? 'Remove the leverage point' : 'Add a high-leverage point';
    plot.render();
  });
})();
