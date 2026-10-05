/* Demo C — classification error rate vs the Bayes floor */
(function () {
  'use strict';
  var cv = document.getElementById('cv-fn-bayes');
  if (!cv || typeof Plot === 'undefined') return;

  var MU = [{ x: -0.5, y: 1.8 }, { x: 0.5, y: -1.8 }];

  var rnd = mulberry32(33), pts = [];
  [0, 1].forEach(function (c) {
    for (var i = 0; i < 70; i++) {
      pts.push({ x: MU[c].x + gauss(rnd), y: MU[c].y + gauss(rnd), c: c });
    }
  });

  // true Bayes boundary (equal-covariance Gaussians): perpendicular bisector
  var nx = MU[1].x - MU[0].x, ny = MU[1].y - MU[0].y;
  var mx = (MU[0].x + MU[1].x) / 2, my = (MU[0].y + MU[1].y) / 2;
  function bayesLogOdds(x, y) { return nx * (x - mx) + ny * (y - my); }
  function predBayes(x, y) { return bayesLogOdds(x, y) > 0 ? 1 : 0; }
  function predVsplit(x, y) { return x > 0 ? 1 : 0; }
  function predKnn(x, y, ignore) {
    var bestD = Infinity, bestC = 0;
    for (var i = 0; i < pts.length; i++) {
      if (i === ignore) continue;
      var dx = pts[i].x - x, dy = pts[i].y - y, d = dx * dx + dy * dy;
      if (d < bestD) { bestD = d; bestC = pts[i].c; }
    }
    return bestC;
  }

  var RULES = {
    bayes: { pred: predBayes, name: 'Bayes rule — sees the true probabilities' },
    vsplit: { pred: predVsplit, name: 'one threshold on feature 1 only' },
    knn: { pred: null, name: '1-nearest-neighbor — no formula at all' }
  };

  function predOf(rule, x, y, ignore) {
    return rule === 'knn' ? predKnn(x, y, ignore) : RULES[rule].pred(x, y);
  }
  function sampleError(rule) {
    var wrong = 0;
    pts.forEach(function (p, i) { if (predOf(rule, p.x, p.y, i) !== p.c) wrong++; });
    return { wrong: wrong, pct: 100 * wrong / pts.length };
  }

  // Bayes error rate: how often the *perfect* rule is still wrong (Monte Carlo)
  function bayesFloor() {
    var r = mulberry32(99), wrong = 0, N = 4000;
    for (var i = 0; i < N; i++) {
      var c = r() < 0.5 ? 0 : 1;
      var x = MU[c].x + gauss(r), y = MU[c].y + gauss(r);
      if (predBayes(x, y) !== c) wrong++;
    }
    return 100 * wrong / N;
  }
  var floor = bayesFloor();

  var state = { rule: 'bayes' };
  var btns = Array.prototype.slice.call(document.querySelectorAll('#demo-fn-bayes .btn[data-rule]'));
  var elErr = document.getElementById('fn-bayes-err');
  var elFloor = document.getElementById('fn-bayes-floor');
  var elName = document.getElementById('fn-bayes-rule');

  var plot = new Plot(cv, {
    range: { xmin: -4.5, xmax: 4.5, ymin: -4.5, ymax: 4.5 },
    height: 380,
    xlabel: 'feature 1',
    ylabel: 'feature 2',
    draw: function (p) {
      var col = p.colors;

      var G = 44, sx = (p.range.xmax - p.range.xmin) / G, sy = (p.range.ymax - p.range.ymin) / G;
      for (var i = 0; i < G; i++) {
        for (var j = 0; j < G; j++) {
          var cx = p.range.xmin + (i + 0.5) * sx, cy = p.range.ymin + (j + 0.5) * sy;
          var pc = predOf(state.rule, cx, cy, -1);
          p.cell(p.range.xmin + i * sx, p.range.xmin + (i + 1) * sx,
                 p.range.ymin + j * sy, p.range.ymin + (j + 1) * sy,
                 pc === 1 ? col.accent2 : col.accent, 0.09);
        }
      }

      p.axes();

      var res = sampleError(state.rule);
      pts.forEach(function (pt) {
        var wrong = predOf(state.rule, pt.x, pt.y, pts.indexOf(pt)) !== pt.c;
        p.dot(pt.x, pt.y, {
          r: 4.4, color: pt.c === 0 ? col.accent : col.accent2,
          ring: wrong ? col.fg : col.surface, ringWidth: wrong ? 2.4 : 1.4
        });
        if (wrong) {
          var c = p.ctx, X = p.xToPx(pt.x), Y = p.yToPx(pt.y);
          c.save();
          c.strokeStyle = col.surface;
          c.lineWidth = 1.6;
          c.beginPath();
          c.moveTo(X - 2.6, Y - 2.6); c.lineTo(X + 2.6, Y + 2.6);
          c.moveTo(X + 2.6, Y - 2.6); c.lineTo(X - 2.6, Y + 2.6);
          c.stroke();
          c.restore();
        }
      });

      p.text('class 0', MU[0].x, MU[0].y, { align: 'center', font: 'bold 12px system-ui', color: col.accent });
      p.text('class 1', MU[1].x, MU[1].y, { align: 'center', font: 'bold 12px system-ui', color: col.accent2 });

      if (p.pointer && p.pointer.inside) {
        var lo = bayesLogOdds(p.pointer.x, p.pointer.y);       // true log-odds (σ² = 1)
        var pr1 = 1 / (1 + Math.exp(-lo));
        p.badge(['true P(class 1 | x) = ' + (pr1 * 100).toFixed(1) + '%',
                 'what Bayes rule would see'], p.pointer.x, p.pointer.y);
      }

      elErr.innerHTML = 'sample error: <b>' + res.pct.toFixed(1) + '%</b> (' +
        res.wrong + ' of ' + pts.length + ')';
      elFloor.innerHTML = 'Bayes floor: <b>' + floor.toFixed(1) + '%</b>';
      elName.innerHTML = RULES[state.rule].name;
    }
  });

  btns.forEach(function (b) {
    b.addEventListener('click', function () {
      state.rule = b.dataset.rule;
      btns.forEach(function (o) {
        o.setAttribute('aria-pressed', String(o.dataset.rule === state.rule));
      });
      plot.render();
    });
  });
})();
