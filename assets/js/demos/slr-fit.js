/* Demo — the fit you get is the fit with the smallest RSS (§3.1.1)
   Left panel: sales vs TV with the line you choose and the misses (squares
   are drawn as the vertical segments).  Right panel: RSS as a function of
   the slope — a parabola, whose bottom is exactly the least-squares fit. */
(function () {
  'use strict';
  var cv = document.getElementById('cv-slr');
  var cvR = document.getElementById('cv-rss');
  if (!cv || !cvR || typeof Plot === 'undefined' || typeof Stats === 'undefined') return;

  var d = window.CH03_ADV;
  var pts = [], i;
  for (i = 0; i < d.tv.length; i++) pts.push({ x: d.tv[i], y: d.sales[i] });

  var n = pts.length, sx = 0, sy = 0, sxx = 0, sxy = 0;
  pts.forEach(function (p) { sx += p.x; sy += p.y; sxx += p.x * p.x; sxy += p.x * p.y; });
  var xbar = sx / n, ybar = sy / n;
  var bestB1 = (n * sxy - sx * sy) / (n * sxx - sx * sx);   // 0.0475
  var bestB0 = ybar - bestB1 * xbar;                        // 7.03
  var b1Min = 0, b1Max = 0.10;

  // RSS when the intercept is always doing its best for the given slope
  function rssAt(b1) {
    var b0 = ybar - b1 * xbar, r = 0;
    for (var j = 0; j < n; j++) { var e = pts[j].y - (b0 + b1 * pts[j].x); r += e * e; }
    return r;
  }
  var rssBest = rssAt(bestB1);
  var rssNone = rssAt(0);                                   // intercept-only model

  var state = { b1: bestB1, hover: null };

  var elEq = document.getElementById('slr-eq');
  var elRss = document.getElementById('slr-rss');
  var elR2 = document.getElementById('slr-r2');
  var slider = document.getElementById('slr-b1');
  var btnBest = document.getElementById('slr-best');

  function b0() { return ybar - state.b1 * xbar; }
  function r2() { return 1 - rssAt(state.b1) / rssNone; }

  function readouts() {
    var b = b0();
    elEq.innerHTML = 'ŷ = <b>' + b.toFixed(2) + '</b> + <b>' +
      state.b1.toFixed(4) + '</b> · TV';
    elRss.innerHTML = 'RSS = <b>' + Math.round(rssAt(state.b1)).toLocaleString() + '</b>' +
      (Math.abs(state.b1 - bestB1) < 1e-4 ? ' (smallest possible)' : '');
    elR2.innerHTML = 'R² = <b>' + r2().toFixed(3) + '</b>';
  }

  var plot = new Plot(cv, {
    range: { xmin: -5, xmax: 305, ymin: -2, ymax: 30 },
    height: 320,
    xlabel: 'TV advertising budget ($1000s)',
    ylabel: 'sales (1000s of units)',
    onPointer: function (ptr) {
      var best = null, bd = 12;
      if (ptr) {
        pts.forEach(function (p) {
          var dx = plot.xToPx(p.x) - plot.xToPx(ptr.x);
          var dy = plot.yToPx(p.y) - plot.yToPx(ptr.y);
          var dist = Math.hypot(dx, dy);
          if (dist < bd) { bd = dist; best = p; }
        });
      }
      if (best !== state.hover) { state.hover = best; plot.render(); }
    },
    draw: function (p) {
      var col = p.colors, b0v = b0(), bh = b0v + state.b1 * 305;
      p.axes();

      // the misses
      pts.forEach(function (q) {
        var yh = b0v + state.b1 * q.x;
        p.line([[q.x, q.y], [q.x, yh]],
          { color: col.accent2, width: 1, dash: [3, 3] });
      });

      p.line([[0, b0v], [305, bh]], { color: col.fg, width: 2.6 });
      // the least-squares line, always there to aim at
      p.line([[0, bestB0], [305, bestB0 + bestB1 * 305]],
        { color: col.accent, width: 2, dash: [8, 5] });

      pts.forEach(function (q) {
        p.dot(q.x, q.y, {
          r: state.hover === q ? 6 : 4.4,
          color: '#3b82f6',
          ring: state.hover === q ? col.accent2 : col.surface,
          ringWidth: state.hover === q ? 2.4 : 1.4
        });
      });

      if (state.hover) {
        var yh = b0v + state.b1 * state.hover.x;
        p.badge([
          'TV: ' + state.hover.x.toFixed(1),
          'sales: ' + state.hover.y.toFixed(1),
          'line says: ' + yh.toFixed(1),
          'miss: ' + (state.hover.y >= yh ? '+' : '') + (state.hover.y - yh).toFixed(1)
        ], state.hover.x, state.hover.y);
      }

      p.text('least squares', 235, bestB0 + bestB1 * 235 - 3.5,
        { color: col.accent, font: '11.5px system-ui' });
      p.text('your line', 235, b0v + state.b1 * 235 + 4,
        { color: col.fg, font: '11.5px system-ui' });
    }
  });

  /* ------------------------------------------------- the RSS landscape */
  var rssPlot = new Plot(cvR, {
    range: { xmin: b1Min, xmax: b1Max, ymin: 0, ymax: rssNone * 1.02 },
    height: 320,
    xlabel: 'slope β₁ (sales per $1000 of TV)',
    ylabel: 'RSS',
    draw: function (p) {
      var col = p.colors;
      p.axes();

      // the parabola RSS(β₁) — the intercept is always optimised
      var curve = [];
      for (var t = 0; t <= 120; t++) {
        var b1 = b1Min + (b1Max - b1Min) * t / 120;
        curve.push([b1, rssAt(b1)]);
      }
      p.line(curve, { color: col.accent, width: 2.6 });

      // shaded: everything worse than the least-squares answer
      p.vline(bestB1, { color: col.accent2, width: 1.6, dash: [5, 4] });
      p.dot(bestB1, rssBest, { r: 6, color: col.accent2, ring: col.surface, ringWidth: 2 });
      p.text('β̂₁ = ' + bestB1.toFixed(4), bestB1 + 0.004, rssBest - rssNone * 0.07,
        { color: col.accent2, font: '11.5px system-ui' });

      var now = rssAt(state.b1);
      p.dot(state.b1, now, { r: 6.5, color: col.fg, ring: col.surface, ringWidth: 2 });
      p.text('your β₁', state.b1, now + rssNone * 0.07,
        { color: col.fg, font: '11.5px system-ui', align: state.b1 > 0.07 ? 'right' : 'left' });
      p.text('RSS at β₁ = 0 (flat line): ' + Math.round(rssNone).toLocaleString(),
        b1Min + 0.003, rssNone * 0.93, { color: col.axis, font: '11.5px system-ui' });
    }
  });

  slider.min = b1Min;
  slider.max = b1Max;
  slider.step = 0.0005;
  slider.value = state.b1;
  slider.addEventListener('input', function () {
    state.b1 = parseFloat(this.value);
    readouts();
    plot.render();
    rssPlot.render();
  });
  btnBest.addEventListener('click', function () {
    state.b1 = bestB1;
    slider.value = bestB1;
    readouts();
    plot.render();
    rssPlot.render();
  });

  readouts();
})();
