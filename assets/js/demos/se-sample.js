/* Demo — the estimate you would have got is one draw from a sampling
   distribution (§3.1.2).  Draw one dataset, or a hundred, from a fixed
   truth and watch β̂ scatter around the true slope; the band is the 95%
   confidence interval for the latest sample. */
(function () {
  'use strict';
  var cv = document.getElementById('cv-se');
  var cvH = document.getElementById('cv-se-hist');
  if (!cv || !cvH || typeof Plot === 'undefined' || typeof Stats === 'undefined') return;

  var TRUE_B0 = 4, TRUE_B1 = 0.05, SIGMA = 3;
  var rnd = mulberry32(7);

  var state = { n: 50, draws: [], lines: [], pts: [], cover: 0 };

  function sampleOne() {
    var pts = [], i, x;
    for (i = 0; i < state.n; i++) {
      x = rnd() * 300;
      pts.push({ x: x, y: TRUE_B0 + TRUE_B1 * x + gauss(rnd) * SIGMA });
    }
    var sxx = 0, sxy = 0, sx = 0, sy = 0;
    pts.forEach(function (p) { sx += p.x; sy += p.y; sxx += p.x * p.x; sxy += p.x * p.y; });
    var m = pts.length * sxx - sx * sx;
    var b1 = m === 0 ? 0 : (pts.length * sxy - sx * sy) / m;
    var b0 = sy / pts.length - b1 * sx / pts.length;
    var rss = 0;
    pts.forEach(function (p) { var e = p.y - (b0 + b1 * p.x); rss += e * e; });
    var s2 = rss / (pts.length - 2);
    var se = Math.sqrt(s2 / (m / pts.length));                    // sqrt(s² / Sxx)
    var tc = Stats.tCrit(pts.length - 2, 0.95);
    var draw = { pts: pts, b0: b0, b1: b1, se: se, lo: b1 - tc * se, hi: b1 + tc * se };
    state.pts = pts;
    state.draws.push(draw);
    if (draw.lo <= TRUE_B1 && draw.hi >= TRUE_B1) state.cover++;
    return draw;
  }

  var elBeta = document.getElementById('se-beta');
  var elSe = document.getElementById('se-se');
  var elCi = document.getElementById('se-ci');
  var elCount = document.getElementById('se-count');
  var elCover = document.getElementById('se-cover');

  function readouts() {
    var last = state.draws[state.draws.length - 1];
    if (!last) return;
    elBeta.innerHTML = 'β̂₁ = <b>' + last.b1.toFixed(4) + '</b>';
    elSe.innerHTML = 'SE(β̂₁) = <b>' + last.se.toFixed(4) + '</b>';
    elCi.innerHTML = '95% CI: <b>(' + last.lo.toFixed(4) + ', ' + last.hi.toFixed(4) + ')</b>';
    elCount.innerHTML = 'samples drawn: <b>' + state.draws.length + '</b>' +
      (state.draws.length >= 4 ? '+' : '');
    elCover.innerHTML = 'CIs covering the true 0.05: <b>' + state.cover + '</b>';
  }

  var plot = new Plot(cv, {
    range: { xmin: -5, xmax: 305, ymin: -4, ymax: 26 },
    height: 320,
    xlabel: 'x (TV-style budget)',
    ylabel: 'y (sales)',
    draw: function (p) {
      var col = p.colors;
      p.axes();

      // the truth, never moves
      p.line([[0, TRUE_B0], [305, TRUE_B0 + TRUE_B1 * 305]],
        { color: col.accent2, width: 2.2, dash: [7, 5] });

      // this sample's points
      p.points(state.pts.map(function (q) { return [q.x, q.y]; }),
        { color: '#3b82f6', r: 4, alpha: 0.75 });

      // every recent sample's fitted line, the older the fainter
      state.draws.slice(-4).forEach(function (dr, idx, arr) {
        var fresh = idx === arr.length - 1;
        p.line([[0, dr.b0], [305, dr.b0 + dr.b1 * 305]],
          { color: fresh ? col.fg : col.axis, width: fresh ? 2.4 : 1.6,
            dash: fresh ? [] : [4, 4] });
      });

      p.text('the truth (β₁ = 0.05)', 200, TRUE_B0 + TRUE_B1 * 200 - 3.4,
        { color: col.accent2, font: '11.5px system-ui' });
      p.text('your sample', 60, state.draws.length
        ? state.draws[state.draws.length - 1].b0 + state.draws[state.draws.length - 1].b1 * 60 + 4.4
        : 10, { color: col.fg, font: '11.5px system-ui' });
    }
  });

  var hist = new Plot(cvH, {
    range: { xmin: 0.015, xmax: 0.085, ymin: 0, ymax: 10 },
    height: 240,
    xlabel: 'slope estimate β̂₁',
    ylabel: 'how often',
    draw: function (p) {
      var col = p.colors;
      p.axes();
      var lo = 0.015, hi = 0.085, bins = 28, counts = [];
      for (var b = 0; b < bins; b++) counts.push(0);
      state.draws.forEach(function (dr) {
        var t = Math.floor((dr.b1 - lo) / (hi - lo) * bins);
        if (t < 0) t = 0;
        if (t >= bins) t = bins - 1;
        counts[t]++;
      });
      var max = 1;
      counts.forEach(function (c) { max = Math.max(max, c); });
      p.range.ymax = Math.max(6, max * 1.25);

      var w = (hi - lo) / bins;
      counts.forEach(function (c, b) {
        if (!c) return;
        var x0 = lo + b * w;
        p.cell(x0, x0 + w, 0, c, col.accent, 0.75);
      });

      p.vline(TRUE_B1, { color: col.accent2, width: 2.2 });
      p.text('the true slope', TRUE_B1, p.range.ymax * 0.93,
        { color: col.accent2, align: 'center', font: '11.5px system-ui' });
      if (state.draws.length) {
        var mean = 0;
        state.draws.forEach(function (d2) { mean += d2.b1; });
        mean /= state.draws.length;
        p.vline(mean, { color: col.fg, width: 1.6, dash: [5, 4] });
        p.text('average of your draws', mean, p.range.ymax * 0.82,
          { color: col.fg, align: 'center', font: '11.5px system-ui' });
      }
      p.text('each bar = one slope estimate from one dataset',
        lo + (hi - lo) * 0.02, p.range.ymax * 0.7,
        { color: col.axis, font: '11px system-ui' });
    }
  });

  function drawOne() { sampleOne(); readouts(); plot.render(); hist.render(); }

  document.getElementById('se-draw').addEventListener('click', drawOne);
  document.getElementById('se-many').addEventListener('click', function () {
    for (var i = 0; i < 100; i++) sampleOne();
    readouts(); plot.render(); hist.render();
  });
  document.getElementById('se-reset').addEventListener('click', function () {
    state.draws = []; state.pts = []; state.cover = 0;
    readouts(); plot.render(); hist.render();
  });
  document.getElementById('se-n').addEventListener('input', function () {
    state.n = parseInt(this.value, 10);
    document.getElementById('se-nread').innerHTML = 'sample size n = <b>' + state.n + '</b>';
    state.draws = []; state.pts = []; state.cover = 0;
    readouts(); plot.render(); hist.render();
  });

  document.getElementById('se-nread').innerHTML = 'sample size n = <b>50</b>';
  drawOne();
  drawOne();
  drawOne();                         // a handful already, so the histogram isn't blank
})();
