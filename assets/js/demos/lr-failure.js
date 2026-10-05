/* Demo 1 — linear regression misused for classification */
(function () {
  'use strict';
  var cv = document.getElementById('cv-failure');
  if (!cv || typeof Plot === 'undefined') return;

  var C0 = '#3b82f6', C1 = '#f59e0b';

  function makeData(kind) {
    var rnd = mulberry32(kind === 'clean' ? 7 : 21);
    var pts = [];
    var i;
    if (kind === 'clean') {
      for (i = 0; i < 32; i++) pts.push({ x: 0.4 + rnd() * 4.2, y: 0 });
      for (i = 0; i < 32; i++) pts.push({ x: 5.4 + rnd() * 4.2, y: 1 });
    } else {
      for (i = 0; i < 34; i++) pts.push({ x: 0.3 + rnd() * 5.2, y: rnd() < 0.78 ? 0 : 1 });
      for (i = 0; i < 34; i++) pts.push({ x: 4.5 + rnd() * 5.2, y: rnd() < 0.78 ? 1 : 0 });
    }
    // vertical jitter is only for display; the fit uses the true 0/1 labels
    pts.forEach(function (p) { p.j = (rnd() - 0.5) * 0.14; });
    return pts;
  }

  var state = { kind: 'clean', outlier: false, pts: makeData('clean') };

  function withOutlier() {
    var pts = state.pts.slice();
    if (state.outlier) {
      pts.push({ x: 9.3, y: 0, j: 0, outlier: true });
    }
    return pts;
  }

  function ols(pts) {
    var n = pts.length, sx = 0, sy = 0, sxx = 0, sxy = 0;
    pts.forEach(function (p) { sx += p.x; sy += p.y; sxx += p.x * p.x; sxy += p.x * p.y; });
    var den = n * sxx - sx * sx;
    var m = den === 0 ? 0 : (n * sxy - sx * sy) / den;
    return { m: m, b: (sy - m * sx) / n };
  }

  var elEq = document.getElementById('fail-eq');
  var elPred = document.getElementById('fail-pred');

  var plot = new Plot(cv, {
    range: { xmin: -0.4, xmax: 10.4, ymin: -0.55, ymax: 1.55 },
    height: 320,
    xlabel: 'feature value',
    ylabel: 'label / prediction',
    onPointer: function () {},
    draw: function (p) {
      var col = p.colors;
      var pts = withOutlier();
      var fit = ols(pts);

      // zone where a probability is allowed to live
      p.cell(p.range.xmin, p.range.xmax, 0, 1, col.good, 0.06);
      p.axes();

      p.hline(1, { color: col.good, width: 1, dash: [2, 4] });
      p.hline(0, { color: col.good, width: 1, dash: [2, 4] });
      p.hline(0.5, { color: col.axis, width: 1.4, dash: [7, 5] });
      p.text('0.5 cutoff', p.range.xmax - 0.2, 0.5, { align: 'right', base: 'bottom', color: col.axis });

      // the fitted line
      var f = function (x) { return fit.m * x + fit.b; };
      p.line([[p.range.xmin, f(p.range.xmin)], [p.range.xmax, f(p.range.xmax)]],
        { color: col.fg, width: 2.4 });

      // where the line crosses 0.5 — the decision cutoff
      var xc = fit.m !== 0 ? (0.5 - fit.b) / fit.m : NaN;
      if (isFinite(xc) && xc > p.range.xmin && xc < p.range.xmax) {
        p.vline(xc, { color: col.accent2, width: 1.6, dash: [4, 4] });
        p.dot(xc, 0.5, { r: 5, color: col.accent2, ring: col.surface });
        p.text('cutoff', xc, 0.5, { align: 'center', base: 'bottom', color: col.accent2, bg: col.surface });
      }

      // data points
      p.points(pts.filter(function (q) { return q.y === 0; }).map(function (q) { return [q.x, q.j]; }),
        { color: C0, r: 4.6 });
      p.points(pts.filter(function (q) { return q.y === 1; }).map(function (q) { return [q.x, 1 + q.j]; }),
        { color: C1, r: 4.6 });
      pts.filter(function (q) { return q.outlier; }).forEach(function (q) {
        p.dot(q.x, q.j, { r: 6.5, color: C1, ring: col.accent2, ringWidth: 2.5 });
      });

      // hover readout
      if (p.pointer && p.pointer.inside) {
        var yhat = f(p.pointer.x);
        p.badge(['x = ' + p.pointer.x.toFixed(2),
                 'line says: ' + (yhat > 0 ? '+' : '') + yhat.toFixed(3)], p.pointer.x, yhat);
      }

      // DOM readouts
      elEq.textContent = 'line: y = ' + fit.m.toFixed(3) + 'x ' +
        (fit.b < 0 ? '− ' : '+ ') + Math.abs(fit.b).toFixed(3);
      var pred = f(10);
      var bad = pred < 0 || pred > 1;
      elPred.innerHTML = 'at x = 10 the line says <b style="color:' +
        (bad ? 'var(--danger)' : 'inherit') + '">' +
        (pred > 0 ? '+' : '') + pred.toFixed(2) + '</b>' +
        (bad ? ' (not a probability!)' : '');
    }
  });

  document.getElementById('fail-dataset').addEventListener('change', function (e) {
    state.kind = e.target.value;
    state.pts = makeData(state.kind);
    plot.render();
  });

  var ob = document.getElementById('fail-outlier');
  ob.addEventListener('click', function () {
    state.outlier = !state.outlier;
    ob.setAttribute('aria-pressed', String(state.outlier));
    ob.textContent = state.outlier ? 'Remove outlier' : 'Add an outlier';
    plot.render();
  });
})();
