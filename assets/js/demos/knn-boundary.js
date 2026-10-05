/* ==========================================================================
   knn-boundary.js — Chapter 2, section 2.2.3 (classification).

   Left panel:  where the KNN classifier draws its boundary, with the
                Bayes boundary (the best any classifier can do) dashed
                on top of it.
   Right panel: training and test error rates against flexibility
                (1/K, log scale), with the Bayes error rate as the
                floor — the book's Figure 2.17.
   ========================================================================== */
(function () {
  'use strict';

  var cvB = document.getElementById('cv-kb-boundary');
  var cvE = document.getElementById('cv-kb-error');
  if (!cvB || !cvE || typeof Plot === 'undefined') return;

  var MU = [{ x: -0.5, y: 1.8 }, { x: 0.5, y: -1.8 }];
  var KS = [1, 3, 5, 10, 25, 50, 100, 150];

  /* ------------------------------------------------------------- the data */
  var rnd = mulberry32(41), train = [];
  [0, 1].forEach(function (c) {
    for (var i = 0; i < 100; i++) {
      train.push({ x: MU[c].x + gauss(rnd), y: MU[c].y + gauss(rnd), c: c });
    }
  });
  var trnd = mulberry32(42), test = [];
  [0, 1].forEach(function (c) {
    for (var i = 0; i < 750; i++) {
      test.push({ x: MU[c].x + gauss(trnd), y: MU[c].y + gauss(trnd), c: c });
    }
  });

  // Bayes rule for two equal-covariance Gaussian clouds: the perpendicular
  // bisector between their centres
  var nx = MU[1].x - MU[0].x, ny = MU[1].y - MU[0].y;
  var mx = (MU[0].x + MU[1].x) / 2, my = (MU[0].y + MU[1].y) / 2;
  function bayesSign(x, y) { return nx * (x - mx) + ny * (y - my) > 0 ? 1 : 0; }

  // how often the Bayes rule is still wrong — the floor (Monte Carlo)
  var bayesFloor = (function () {
    var r = mulberry32(99), wrong = 0, N = 6000;
    for (var i = 0; i < N; i++) {
      var c = r() < 0.5 ? 0 : 1;
      var x = MU[c].x + gauss(r), y = MU[c].y + gauss(r);
      if (bayesSign(x, y) !== c) wrong++;
    }
    return wrong / N;
  })();

  /* ------------------------------------- error rates, computed once each */
  function sortedDist(px, py) {
    var d = [];
    for (var i = 0; i < train.length; i++) {
      var dx = train[i].x - px, dy = train[i].y - py;
      d.push([dx * dx + dy * dy, train[i].c]);
    }
    d.sort(function (a, b) { return a[0] - b[0]; });
    return d;
  }

  var STATS = KS.map(function () { return { train: 0, test: 0 }; });

  function tally(pts, bucket) {
    pts.forEach(function (q) {
      var d = sortedDist(q.x, q.y);
      var votes = [0, 0];
      for (var k = 0; k < KS.length; k++) {
        var K = KS[k];
        votes[0] = 0; votes[1] = 0;
        for (var i = 0; i < K; i++) votes[d[i][1]]++;
        if (votes[0] !== votes[1]) {
          var pred = votes[0] > votes[1] ? 0 : 1;
          if (pred !== q.c) STATS[k][bucket]++;
        } else if (q.c === 1) {
          STATS[k][bucket]++;          // tie broken towards class 0
        }
      }
    });
  }
  tally(train, 'train');              // each point votes with itself included
  tally(test, 'test');
  STATS.forEach(function (s) {
    s.train /= train.length;
    s.test /= test.length;
  });

  /* ------------------------------------------------- boundary, on demand */
  var G = 42, gridCache = {};
  function gridFor(kIdx) {
    if (gridCache[kIdx]) return gridCache[kIdx];
    var K = KS[kIdx], cells = [];
    for (var i = 0; i < G; i++) {
      for (var j = 0; j < G; j++) cells.push(null);
    }
    var range = { xmin: -4.5, xmax: 4.5, ymin: -4.5, ymax: 4.5 };
    var sx = (range.xmax - range.xmin) / G, sy = (range.ymax - range.ymin) / G;
    for (var i2 = 0; i2 < G; i2++) {
      for (var j2 = 0; j2 < G; j2++) {
        var cx = range.xmin + (i2 + 0.5) * sx, cy = range.ymin + (j2 + 0.5) * sy;
        var d = sortedDist(cx, cy), v = [0, 0];
        for (var q = 0; q < K; q++) v[d[q][1]]++;
        cells[i2 * G + j2] = (v[1] > v[0]) ? 1 : 0;
      }
    }
    gridCache[kIdx] = cells;
    return cells;
  }

  /* ------------------------------------------------------------ controls */
  var state = { kIdx: 2 };                              // start at K = 5
  var slider = document.getElementById('kb-k');
  var elK = document.getElementById('kb-kread');
  var elTrain = document.getElementById('kb-train');
  var elTest = document.getElementById('kb-test');
  var elFloor = document.getElementById('kb-floor');

  function lx(K) { return Math.log(1 / K) / Math.LN10; }

  var LXMIN = lx(150) - 0.18, LXMAX = lx(1) + 0.12;

  /* ------------------------------------------------------- the boundary */
  var plotB = new Plot(cvB, {
    range: { xmin: -4.5, xmax: 4.5, ymin: -4.5, ymax: 4.5 },
    height: 360,
    xlabel: 'feature 1',
    ylabel: 'feature 2',
    draw: function (p) {
      var col = p.colors;
      var cells = gridFor(state.kIdx);
      var range = p.range;
      var sx = (range.xmax - range.xmin) / G, sy = (range.ymax - range.ymin) / G;
      for (var i = 0; i < G; i++) {
        for (var j = 0; j < G; j++) {
          p.cell(range.xmin + i * sx, range.xmin + (i + 1) * sx,
                 range.ymin + j * sy, range.ymin + (j + 1) * sy,
                 cells[i * G + j] === 1 ? col.accent2 : col.accent, 0.10);
        }
      }

      p.axes();

      // the Bayes boundary: the best possible cut, dashed
      var len = Math.sqrt(nx * nx + ny * ny);
      var ux = -ny / len, uy = nx / len;          // along the boundary
      p.line([[mx - ux * 9, my - uy * 9], [mx + ux * 9, my + uy * 9]],
        { color: col.fg, width: 2, dash: [7, 5] });

      train.forEach(function (q) {
        p.dot(q.x, q.y, {
          r: 4.2,
          color: q.c === 0 ? col.accent : col.accent2,
          ring: col.surface, ringWidth: 1.3
        });
      });

      p.text('Bayes boundary (dashed) — nobody does better',
        4.3, 4.0, { font: '11.5px system-ui', color: col.fg, align: 'right' });
    }
  });

  /* ------------------------------------- error rates against flexibility */
  function niceTicks(lo, hi, count) {
    if (!(hi > lo)) return [lo];
    var step = Math.pow(10, Math.floor(Math.log10((hi - lo) / count)));
    var err = ((hi - lo) / count) / step;
    if (err >= 7.5) step *= 10; else if (err >= 3.5) step *= 5; else if (err >= 1.5) step *= 2;
    var out = [];
    for (var t = Math.ceil(lo / step) * step; t <= hi + step * 1e-6; t += step) {
      out.push(Math.round(t / step) * step);
    }
    return out;
  }

  var XTICKS = [0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1].map(function (v) {
    return { v: Math.log(v) / Math.LN10, label: v.toFixed(2) };
  });

  function logAxes(p) {
    var c = p.ctx, col = p.colors, r = p.range, pad = p.o.pad;
    var yt = niceTicks(r.ymin, r.ymax, 5);
    c.save();
    c.font = '11px system-ui, sans-serif';

    // gridlines + y labels
    c.strokeStyle = col.grid; c.lineWidth = 1;
    c.fillStyle = col.axis; c.textAlign = 'right'; c.textBaseline = 'middle';
    c.beginPath();
    for (var i = 0; i < yt.length; i++) {
      var gy = Math.round(p.yToPx(yt[i])) + .5;
      c.moveTo(pad.l, gy); c.lineTo(p.w - pad.r, gy);
      c.fillText((yt[i] * 100).toFixed(0) + '%', pad.l - 7, gy);
    }
    c.stroke();

    // x ticks at the book's 1/K values
    c.textAlign = 'center'; c.textBaseline = 'top';
    for (var j = 0; j < XTICKS.length; j++) {
      var tx = p.xToPx(XTICKS[j].v);
      if (tx < pad.l - 2 || tx > p.w - pad.r + 2) continue;
      c.strokeStyle = col.grid;
      c.beginPath();
      c.moveTo(Math.round(tx) + .5, pad.t); c.lineTo(Math.round(tx) + .5, p.h - pad.b);
      c.stroke();
      c.fillStyle = col.axis;
      c.fillText(XTICKS[j].label, tx, p.h - pad.b + 6);
    }

    // axis lines
    c.strokeStyle = col.axis; c.lineWidth = 1;
    c.beginPath();
    c.moveTo(pad.l + .5, pad.t); c.lineTo(pad.l + .5, p.h - pad.b + .5);
    c.lineTo(p.w - pad.r, p.h - pad.b + .5);
    c.stroke();

    // titles
    c.fillStyle = col.fg;
    c.font = '12px system-ui, sans-serif';
    c.textAlign = 'center'; c.textBaseline = 'bottom';
    c.fillText('flexibility →  (1/K, log scale)', pad.l + (p.w - pad.l - pad.r) / 2, p.h - 2);
    c.save();
    c.translate(11, pad.t + (p.h - pad.t - pad.b) / 2);
    c.rotate(-Math.PI / 2);
    c.textAlign = 'center'; c.textBaseline = 'top';
    c.fillText('error rate', 0, 0);
    c.restore();
    c.restore();
  }

  var peak = 0;
  STATS.forEach(function (s) { peak = Math.max(peak, s.train, s.test); });
  var yMax = Math.max(peak * 1.35, bayesFloor * 2.2, 0.1);

  var plotE = new Plot(cvE, {
    range: { xmin: LXMIN, xmax: LXMAX, ymin: 0, ymax: yMax },
    height: 360,
    draw: function (p) {
      var col = p.colors;
      logAxes(p);

      var trainPts = KS.map(function (K, i) { return [lx(K), STATS[i].train]; });
      var testPts = KS.map(function (K, i) { return [lx(K), STATS[i].test]; });

      p.hline(bayesFloor, { color: col.fg, width: 1.8, dash: [6, 5] });
      p.line(trainPts, { color: col.accent, width: 2.2 });
      p.line(testPts, { color: col.accent2, width: 2.4 });
      p.points(trainPts, { color: col.accent, r: 3.4 });
      p.points(testPts, { color: col.accent2, r: 3.4 });

      var K = KS[state.kIdx];
      p.vline(lx(K), { color: col.fg, width: 1.3, dash: [4, 4] });
      p.dot(lx(K), STATS[state.kIdx].train, { r: 5.5, color: col.accent, ring: col.surface });
      p.dot(lx(K), STATS[state.kIdx].test, { r: 5.5, color: col.accent2, ring: col.surface });

      p.text('training error', LXMIN + 0.06, STATS[0].train + 0.03,
        { font: '11.5px system-ui', color: col.accent });
      p.text('test error', lx(10), STATS[KS.length - 1].test + 0.055,
        { font: '11.5px system-ui', color: col.accent2, align: 'center' });
      p.text('Bayes error rate — the floor', LXMAX - 0.05, bayesFloor + 0.03,
        { font: '11.5px system-ui', color: col.fg, align: 'right' });

      if (elK) elK.innerHTML = 'K = <b>' + K + '</b>';
      if (elTrain) elTrain.innerHTML = 'training error: <b>' +
        (100 * STATS[state.kIdx].train).toFixed(1) + '%</b>';
      if (elTest) elTest.innerHTML = 'test error: <b>' +
        (100 * STATS[state.kIdx].test).toFixed(1) + '%</b>';
      if (elFloor) elFloor.innerHTML = 'Bayes floor: <b>' +
        (100 * bayesFloor).toFixed(1) + '%</b>';
    }
  });

  slider.addEventListener('input', function () {
    state.kIdx = Number(slider.value);
    plotB.render();
    plotE.render();
  });
})();
