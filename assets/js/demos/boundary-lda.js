/* Demo — Day 3 · the same two classes, four classifiers:
   Bayes (the best possible rule), LDA, QDA and KNN  (ISLP section 4.4–4.5).
   Switch the data between "equal spread" and "unequal spread" and watch
   which method's boundary still matches the Bayes boundary. */
(function () {
  'use strict';
  var cv = document.getElementById('cv-lda');
  if (!cv || typeof Plot === 'undefined') return;

  var D = 2;   // two features

  var SCEN = {
    equal:   { mu0: [-1.5, -1.5], mu1: [1.5, 1.5],  s0: 1.0,  s1: 1.0  },
    unequal: { mu0: [-1.3, -1.3], mu1: [1.3, 1.3],  s0: 0.7,  s1: 1.8  }
  };

  function gen(scen, n, seed) {
    var rnd = mulberry32(seed), pts = [], i, d;
    for (i = 0; i < n; i++) {
      var p = { y: i % 2, x: [] };
      var mu = p.y === 0 ? scen.mu0 : scen.mu1;
      var s = p.y === 0 ? scen.s0 : scen.s1;
      for (d = 0; d < D; d++) p.x.push(mu[d] + gauss(rnd) * s);
      pts.push(p);
    }
    return pts;
  }

  var state = { scen: 'equal', method: 'bayes' };
  var train = gen(SCEN.equal, 130, 11);
  var test = gen(SCEN.equal, 400, 29);

  // ---- fitted pieces -------------------------------------------------
  function fit(trainPts) {
    var mu = [[0, 0], [0, 0]], n = [0, 0], i, d;
    trainPts.forEach(function (p) {
      n[p.y]++;
      for (d = 0; d < D; d++) mu[p.y][d] += p.x[d];
    });
    for (i = 0; i < 2; i++) for (d = 0; d < D; d++) mu[i][d] /= n[i];

    var ss = [0, 0];
    trainPts.forEach(function (p) {
      for (d = 0; d < D; d++) { var e = p.x[d] - mu[p.y][d]; ss[p.y] += e * e; }
    });
    var varK = [ss[0] / (n[0] * D), ss[1] / (n[1] * D)];
    var pooled = (ss[0] + ss[1]) / ((n[0] + n[1]) * D);
    return { mu: mu, n: n, varK: varK, pooled: pooled };
  }

  // score > 0 → predict class 1
  function scorer(method, scen) {
    var f = fit(train);
    if (method === 'bayes') {
      // the true rule: compare the two real Gaussians
      var s0 = scen.s0 * scen.s0, s1 = scen.s1 * scen.s1;
      return function (x) {
        var d0 = 0, d1 = 0;
        for (var d = 0; d < D; d++) {
          d0 += (x[d] - scen.mu0[d]) * (x[d] - scen.mu0[d]) / s0;
          d1 += (x[d] - scen.mu1[d]) * (x[d] - scen.mu1[d]) / s1;
        }
        return -d1 / 2 - D * Math.log(scen.s1) - (-d0 / 2 - D * Math.log(scen.s0));
      };
    }
    if (method === 'lda') {
      var v = f.pooled;
      return function (x) {
        var a = 0, b = 0, d;
        for (d = 0; d < D; d++) {
          a += (x[d] - f.mu[1][d]) * (x[d] - f.mu[1][d]);
          b += (x[d] - f.mu[0][d]) * (x[d] - f.mu[0][d]);
        }
        return -a / (2 * v) + b / (2 * v);   // shared spread → a straight line
      };
    }
    if (method === 'qda') {
      var v0 = f.varK[0], v1 = f.varK[1];
      return function (x) {
        var a = 0, b = 0, d;
        for (d = 0; d < D; d++) {
          a += (x[d] - f.mu[1][d]) * (x[d] - f.mu[1][d]) / v1;
          b += (x[d] - f.mu[0][d]) * (x[d] - f.mu[0][d]) / v0;
        }
        return -a / 2 + b / 2 - D * Math.log(v1) / 2 + D * Math.log(v0) / 2;
      };
    }
    // knn
    var K = 15, pts = train;
    return function (x) {
      var d0 = [], d1 = [];
      pts.forEach(function (p) {
        var dd = (p.x[0] - x[0]) * (p.x[0] - x[0]) + (p.x[1] - x[1]) * (p.x[1] - x[1]);
        (p.y === 0 ? d0 : d1).push(dd);
      });
      d0.sort(function (a, b) { return a - b; });
      d1.sort(function (a, b) { return a - b; });
      // votes of the K nearest points overall: count how many of each class
      // are inside the K-th smallest distance
      var all = d0.map(function (v) { return [v, 0]; }).concat(d1.map(function (v) { return [v, 1]; }));
      all.sort(function (a, b) { return a[0] - b[0]; });
      var v0 = 0, v1 = 0;
      for (var i = 0; i < K && i < all.length; i++) (all[i][1] === 0 ? v0++ : v1++);
      return (v1 - v0) / K;
    };
  }

  function accuracy(score, pts) {
    var ok = 0;
    pts.forEach(function (p) { if ((score(p.x) >= 0 ? 1 : 0) === p.y) ok++; });
    return ok / pts.length;
  }

  var elAcc = document.getElementById('bnd-acc');
  var elWhat = document.getElementById('bnd-what');

  var WHAT = {
    bayes: 'the best possible rule — it uses the truth, so it can never be beaten',
    lda:   'one straight boundary: it assumes both classes share the same spread',
    qda:   'a curved boundary: each class gets its own spread',
    knn:   'no formula at all — 15 nearest neighbours vote (K = 15)'
  };

  var plot = new Plot(cv, {
    range: { xmin: -5.5, xmax: 5.5, ymin: -5.5, ymax: 5.5 },
    height: 420,
    xlabel: 'feature 1',
    ylabel: 'feature 2',
    draw: function (p) {
      var col = p.colors;
      var scen = SCEN[state.scen];
      var score = scorer(state.method, scen);

      // background tint by predicted class
      var G = 54, i, j;
      var sx = (p.range.xmax - p.range.xmin) / G;
      var sy = (p.range.ymax - p.range.ymin) / G;
      for (i = 0; i < G; i++) {
        for (j = 0; j < G; j++) {
          var x0 = p.range.xmin + i * sx, y0 = p.range.ymin + j * sy;
          var sc = score([x0 + sx / 2, y0 + sy / 2]);
          var rgb = sc >= 0 ? [245, 158, 11] : [59, 130, 246];
          var a = 0.10 + 0.34 * Math.min(1, Math.abs(sc) / 4);
          p.cell(x0, x0 + sx, y0, y0 + sy, 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',' + a + ')');
        }
      }

      p.axes();

      // the boundary itself: every grid cell where the sign flips
      var H = 110;
      var hx = (p.range.xmax - p.range.xmin) / H;
      var hy = (p.range.ymax - p.range.ymin) / H;
      var grid = [];
      for (i = 0; i <= H; i++) {
        grid[i] = [];
        for (j = 0; j <= H; j++) {
          grid[i][j] = score([p.range.xmin + i * hx, p.range.ymin + j * hy]);
        }
      }
      var marks = [];
      for (i = 0; i <= H; i++) {
        for (j = 0; j <= H; j++) {
          var s = grid[i][j];
          if ((i < H && s * grid[i + 1][j] < 0) || (j < H && s * grid[i][j + 1] < 0)) {
            marks.push([p.range.xmin + i * hx, p.range.ymin + j * hy]);
          }
        }
      }
      p.points(marks, { color: col.fg, r: 1.6 });

      // the data
      train.forEach(function (q) {
        p.dot(q.x[0], q.x[1], {
          r: 4.4,
          color: q.y === 0 ? '#3b82f6' : '#f59e0b',
          ring: col.surface,
          ringWidth: 1.4
        });
      });

      elAcc.innerHTML = 'train <b>' + Math.round(accuracy(score, train) * 100) +
        '%</b> · test <b>' + Math.round(accuracy(score, test) * 100) + '%</b>';
      elWhat.textContent = WHAT[state.method];
    }
  });

  document.getElementById('bnd-data').addEventListener('change', function (e) {
    state.scen = e.target.value;
    train = gen(SCEN[state.scen], 130, 11);
    test = gen(SCEN[state.scen], 400, 29);
    plot.render();
  });
  document.getElementById('bnd-method').addEventListener('change', function (e) {
    state.method = e.target.value;
    plot.render();
  });
})();
