/* Demo — the residual zoo: four patterns and what each one means (§3.3.3)
   Left: data with a straight line fitted regardless.  Right: the residuals
   against the fitted values — the picture you actually diagnose from. */
(function () {
  'use strict';
  var cvD = document.getElementById('cv-resid-data');
  var cvR = document.getElementById('cv-resid-res');
  if (!cvD || !cvR || typeof Plot === 'undefined') return;

  function fit(pts) {
    var n = pts.length, sx = 0, sy = 0, sxx = 0, sxy = 0;
    pts.forEach(function (p) { sx += p.x; sy += p.y; sxx += p.x * p.x; sxy += p.x * p.y; });
    var den = n * sxx - sx * sx;
    var m = (n * sxy - sx * sy) / den;
    var b = (sy - m * sx) / n;
    return { m: m, b: b };
  }

  function make(kind) {
    var rnd = mulberry32(61), pts = [], i, x, s;
    for (i = 0; i < 60; i++) {
      x = i * 10 / 59;                       // sorted left → right
      if (kind === 'clean') s = 1.4;
      else if (kind === 'curve') s = 1.2;
      else if (kind === 'fan') s = 0.4 + 0.28 * x;
      else s = 1.1;
      var y;
      if (kind === 'clean') y = 1.3 * x + 5;
      else if (kind === 'curve') y = 2 + 0.2 * x + 0.32 * x * x;
      else if (kind === 'fan') y = 1.5 * x + 4;
      else y = 1.4 * x + 6;
      var e;
      if (kind === 'runs') {
        e = i === 0 ? gauss(rnd) * 1.1 : 0.9 * (pts[i - 1].e || 0) + gauss(rnd) * 1.1;
      } else e = gauss(rnd) * s;
      pts.push({ x: x, y: y + e, e: e });
    }
    if (kind === 'runs') {                   // rebuild the AR(1) errors cleanly
      rnd = mulberry32(61);
      var prev = 0;
      pts.forEach(function (p) {
        prev = 0.9 * prev + gauss(rnd) * 1.1;
        p.y = 1.4 * p.x + 6 + prev;
        p.e = prev;
      });
    }
    var f = fit(pts);
    pts.forEach(function (p) { p.r = p.y - (f.m * p.x + f.b); p.yh = f.m * p.x + f.b; });
    return { pts: pts, f: f };
  }

  var VERDICT = {
    clean: 'structureless cloud — nothing to fix',
    curve: 'curved pattern → non-linearity: add polynomial terms',
    fan: 'fan opening up → non-constant variance: transform y (log) or weight the fit',
    runs: 'runs of same-sign residuals → correlated errors: a variable is missing (time, season)'
  };

  var state = { kind: 'clean', data: make('clean') };
  var elV = document.getElementById('resid-verdict');

  var dataPlot = new Plot(cvD, {
    range: { xmin: -0.6, xmax: 10.6, ymin: -2, ymax: 42 },
    height: 300,
    xlabel: 'feature x',
    ylabel: 'target y',
    draw: function (p) {
      var col = p.colors, d = state.data;
      p.axes();
      p.points(d.pts.map(function (q) { return [q.x, q.y]; }), { color: col.accent, r: 4 });
      p.line([[0, d.f.b], [10, d.f.m * 10 + d.f.b]], { color: col.accent2, width: 2.4 });
      p.text('the fitted line', 7.4, d.f.m * 7.4 + d.f.b - 3.2,
        { color: col.accent2, font: '11.5px system-ui' });
    }
  });

  var resPlot = new Plot(cvR, {
    range: { xmin: -1, xmax: 12, ymin: -1, ymax: 1 },
    height: 300,
    xlabel: 'fitted value ŷ',
    ylabel: 'residual y − ŷ',
    draw: function (p) {
      var col = p.colors, d = state.data;
      var maxR = 0;
      d.pts.forEach(function (q) { maxR = Math.max(maxR, Math.abs(q.r)); });
      maxR *= 1.2;
      p.range.ymin = -maxR;
      p.range.ymax = maxR;
      var lo = Infinity, hi = -Infinity;
      d.pts.forEach(function (q) { lo = Math.min(lo, q.yh); hi = Math.max(hi, q.yh); });
      p.range.xmin = lo - 1;
      p.range.xmax = hi + 1;

      p.axes();
      p.hline(0, { color: col.axis, width: 1.6 });
      var line = d.pts.map(function (q) { return [q.yh, q.r]; });
      p.line(line, { color: col.axis, width: 1 });
      p.points(line, { color: col.accent2, r: 4 });
      p.text('zero = perfect', p.range.xmin + 0.4, maxR * 0.86,
        { color: col.axis, font: '11.5px system-ui' });
      p.text(state.kind === 'clean' ? 'no pattern' : 'look at the shape',
        p.range.xmax - 0.4, maxR * 0.86,
        { align: 'right', color: state.kind === 'clean' ? col.good : col.accent2,
          font: 'bold 11.5px system-ui' });
    }
  });

  function refresh() {
    elV.innerHTML = 'verdict: <b>' + VERDICT[state.kind] + '</b>';
    dataPlot.render();
    resPlot.render();
  }

  document.getElementById('resid-kind').addEventListener('change', function () {
    state.kind = this.value;
    state.data = make(this.value);
    refresh();
  });

  elV.innerHTML = 'verdict: <b>' + VERDICT.clean + '</b>';
})();
