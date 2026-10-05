/* Demo — section 4.5 · six scenarios from the book, six classifiers,
   one honest race.  Pick a scenario, watch the chosen method's boundary
   over the training points, and compare everyone's test error on the
   right.  "New sample" redraws the training set (the book averages 100
   such draws into boxplots; here you step through them one at a time). */
(function () {
  'use strict';
  var cvB = document.getElementById('cv-race');
  var cvE = document.getElementById('cv-race-err');
  if (!cvB || !cvE || typeof Plot === 'undefined') return;

  var METHODS = [
    { key: 'knn1', label: 'KNN · K=1' },
    { key: 'knncv', label: 'KNN · K by CV' },
    { key: 'lda', label: 'LDA' },
    { key: 'logit', label: 'Logistic' },
    { key: 'nb', label: 'Naive Bayes' },
    { key: 'qda', label: 'QDA' }
  ];
  var WHAT = {
    knn1: 'KNN with K = 1: every wiggle of the training set becomes boundary',
    knncv: 'KNN with K picked by 5-fold cross-validation (Chapter 5)',
    lda: 'one straight boundary, shared spread for both classes',
    logit: 'one straight boundary fitted by maximising the likelihood',
    nb: 'per-feature curves added up — assumes the predictors are independent',
    qda: 'each class gets its own spread, so the boundary can bend'
  };

  var SCENS = {
    1: { n: 20, dist: 'norm', rho: [0, 0], sd: [[1, 1], [1, 1]],
         mu: [[-0.9, -0.9], [0.9, 0.9]],
         truth: 'straight', short: 'straight, independent',
         note: 'uncorrelated normal predictors, 20 per class — LDA’s own assumption' },
    2: { n: 20, dist: 'norm', rho: [-0.5, -0.5], sd: [[1, 1], [1, 1]],
         mu: [[-0.9, -0.9], [0.9, 0.9]],
         truth: 'straight', short: 'straight, correlated',
         note: 'as scenario 1, but the two predictors correlate −0.5 within each class' },
    3: { n: 50, dist: 't50', rho: [-0.5, -0.5], sd: [[1, 1], [1, 1]],
         mu: [[-0.9, -0.9], [0.9, 0.9]],
         truth: 'straight', short: 'heavy tails',
         note: 't-distributed predictors (stray far-out points), 50 per class' },
    4: { n: 20, dist: 'norm', rho: [0.5, -0.5], sd: [[1, 1], [1, 1]],
         mu: [[-0.9, -0.9], [0.9, 0.9]],
         truth: 'curved', short: 'two correlations',
         note: 'class 0 correlates +0.5, class 1 correlates −0.5 — a curved boundary' },
    5: { n: 120, dist: 'logit',
         truth: 'wiggly', short: 'wiggly truth',
         note: 'normal predictors, but labels follow a wiggly function of them' },
    6: { n: 6, dist: 'norm', rho: [0, 0], sd: [[0.77, 1.29], [1.29, 0.77]],
         mu: [[-1.1, -1.1], [1.1, 1.1]],
         truth: 'curved', short: 'tiny sample',
         note: 'only 6 per class, and the two classes spread differently' }
  };

  var expit = function (z) { return 1 / (1 + Math.exp(-Math.max(-30, Math.min(30, z)))); };
  var wiggly = function (x0, x1) {
    return 2 * Math.sin(1.5 * x0) + 2 * Math.cos(1.5 * x1) - 1;
  };

  /* ---------------------------------------------------------- generation */
  function drawPoint(rnd, def, k) {
    if (def.dist === 'logit') {
      var a = gauss(rnd) * 1.3, b = gauss(rnd) * 1.3;
      return { x: [a, b], y: rnd() < expit(wiggly(a, b)) ? 1 : 0 };
    }
    var rho = def.rho[k], s = def.sd[k];
    var g1 = gauss(rnd), g2 = gauss(rnd);
    var z0 = g1, z1 = rho * g1 + Math.sqrt(1 - rho * rho) * g2;
    var x0 = def.mu[k][0] + s[0] * z0, x1 = def.mu[k][1] + s[1] * z1;
    if (def.dist === 't50') {                      // multivariate t, 50 df
      var q = 0, t;
      for (t = 0; t < 50; t++) { var u = gauss(rnd); q += u * u; }
      var sc = Math.sqrt(50 / Math.max(q, 1e-6));
      x0 = def.mu[k][0] + s[0] * z0 * sc;
      x1 = def.mu[k][1] + s[1] * z1 * sc;
    }
    return { x: [x0, x1], y: k };
  }

  function genSample(def, seed) {
    var rnd = mulberry32(seed);
    var train = [], test = [], i;
    if (def.dist === 'logit') {
      for (i = 0; i < def.n; i++) train.push(drawPoint(rnd, def, 0));
      for (i = 0; i < 2400; i++) test.push(drawPoint(rnd, def, 0));
    } else {
      for (i = 0; i < def.n; i++) train.push(drawPoint(rnd, def, 0));
      for (i = 0; i < def.n; i++) train.push(drawPoint(rnd, def, 1));
      for (i = 0; i < 1200; i++) test.push(drawPoint(rnd, def, 0));
      for (i = 0; i < 1200; i++) test.push(drawPoint(rnd, def, 1));
    }
    return { train: train, test: test };
  }

  /* --------------------------------------------------------------- fits */
  function stats(pts) {
    var mu = [[0, 0], [0, 0]], n = [0, 0], i;
    pts.forEach(function (p) { n[p.y]++; mu[p.y][0] += p.x[0]; mu[p.y][1] += p.x[1]; });
    for (i = 0; i < 2; i++) { mu[i][0] /= n[i]; mu[i][1] /= n[i]; }
    var c = [{ xx: 0, xy: 0, yy: 0 }, { xx: 0, xy: 0, yy: 0 }];
    pts.forEach(function (p) {
      var e0 = p.x[0] - mu[p.y][0], e1 = p.x[1] - mu[p.y][1], cc = c[p.y];
      cc.xx += e0 * e0; cc.xy += e0 * e1; cc.yy += e1 * e1;
    });
    return { mu: mu, n: n, c: c };
  }

  function inv2(a, b, d) {                          // inverse of [[a,b],[b,d]]
    var det = a * d - b * b;
    if (Math.abs(det) < 1e-10) return null;
    return { xx: d / det, xy: -b / det, yy: a / det, logdet: Math.log(det) };
  }

  function quad(iv, e0, e1) {
    return iv.xx * e0 * e0 + 2 * iv.xy * e0 * e1 + iv.yy * e1 * e1;
  }

  function gaussScore(fits, form) {
    // form: computes score from per-class inverse/det — shared core below
    return function (x) {
      var d = [0, 0], k;
      for (k = 0; k < 2; k++) {
        var f = form(k);
        var e0 = x[0] - fits.mu[k][0], e1 = x[1] - fits.mu[k][1];
        d[k] = -0.5 * quad(f.iv, e0, e1) - 0.5 * f.ld + Math.log(f.pi[k]);
      }
      return d[1] - d[0];
    };
  }

  function fitLDA(train) {
    var s = stats(train), N = train.length;
    var px = (s.c[0].xx + s.c[1].xx) / (N - 2);
    var pxy = (s.c[0].xy + s.c[1].xy) / (N - 2);
    var pyy = (s.c[0].yy + s.c[1].yy) / (N - 2);
    var iv = inv2(px, pxy, pyy) || inv2(1, 0, 1);
    var pi = [s.n[0] / N, s.n[1] / N];
    return gaussScore(s, function (k) { return { iv: iv, ld: iv.logdet, pi: pi }; });
  }

  function fitQDA(train) {
    var s = stats(train), N = train.length;
    var pi = [s.n[0] / N, s.n[1] / N];
    var parts = [0, 1].map(function (k) {
      var m = Math.max(s.n[k] - 1, 1);
      var iv = inv2(s.c[k].xx / m, s.c[k].xy / m, s.c[k].yy / m) || inv2(1, 0, 1);
      return { iv: iv, ld: iv.logdet, pi: pi };
    });
    return gaussScore(s, function (k) { return parts[k]; });
  }

  function fitNB(train) {
    var s = stats(train), N = train.length;
    var pi = [s.n[0] / N, s.n[1] / N];
    var parts = [0, 1].map(function (k) {
      var m = Math.max(s.n[k] - 1, 1);
      var v0 = Math.max(s.c[k].xx / m, 1e-6), v1 = Math.max(s.c[k].yy / m, 1e-6);
      // diagonal covariance: LDA with the correlation terms torn out
      return { iv: { xx: 1 / v0, xy: 0, yy: 1 / v1 }, ld: Math.log(v0 * v1), pi: pi };
    });
    return gaussScore(s, function (k) { return parts[k]; });
  }

  function solve3(A, b) {                           // Gaussian elimination
    var M = [A[0].slice().concat([b[0]]),
             A[1].slice().concat([b[1]]),
             A[2].slice().concat([b[2]])];
    var i, j, k;
    for (i = 0; i < 3; i++) {
      var piv = i;
      for (j = i + 1; j < 3; j++) if (Math.abs(M[j][i]) > Math.abs(M[piv][i])) piv = j;
      if (Math.abs(M[piv][i]) < 1e-12) return null;
      var tmp = M[i]; M[i] = M[piv]; M[piv] = tmp;
      for (j = i + 1; j < 3; j++) {
        var f = M[j][i] / M[i][i];
        for (k = i; k < 4; k++) M[j][k] -= f * M[i][k];
      }
    }
    var out = [0, 0, 0];
    for (i = 2; i >= 0; i--) {
      var v = M[i][3];
      for (j = i + 1; j < 3; j++) v -= M[i][j] * out[j];
      out[i] = v / M[i][i];
    }
    return out;
  }

  function fitLogit(train) {
    var beta = [0, 0, 0], it, i, j;
    for (it = 0; it < 12; it++) {
      var g = [0, 0, 0], H = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
      train.forEach(function (p) {
        var pr = expit(beta[0] + beta[1] * p.x[0] + beta[2] * p.x[1]);
        var w = Math.max(pr * (1 - pr), 1e-6);
        var r = p.y - pr, v = [1, p.x[0], p.x[1]];
        for (i = 0; i < 3; i++) {
          g[i] += r * v[i];
          for (j = 0; j < 3; j++) H[i][j] += w * v[i] * v[j];
        }
      });
      // tiny ridge keeps Newton steady when the classes nearly separate
      H[0][0] += 1e-3; H[1][1] += 1e-3; H[2][2] += 1e-3;
      var step = solve3(H, g);
      if (!step) break;
      var norm = 0;
      for (i = 0; i < 3; i++) { beta[i] += step[i]; norm += Math.abs(step[i]); }
      if (norm < 1e-8) break;
    }
    return function (x) { return beta[0] + beta[1] * x[0] + beta[2] * x[1]; };
  }

  function knnScore(pts, K) {
    return function (x) {
      var arr = [], i;
      for (i = 0; i < pts.length; i++) {
        var dx = pts[i].x[0] - x[0], dy = pts[i].x[1] - x[1];
        arr.push([dx * dx + dy * dy, pts[i].y]);
      }
      arr.sort(function (a, b) { return a[0] - b[0]; });
      var v0 = 0, v1 = 0;
      for (i = 0; i < K && i < arr.length; i++) (arr[i][1] === 1 ? v1++ : v0++);
      return (v1 - v0) / Math.min(K, arr.length);
    };
  }

  function pickK(train) {                           // 5-fold cross-validation
    var cands = [1, 3, 5, 7, 10, 15, 25].filter(function (k) { return k < train.length; });
    var folds = train.length >= 50 ? 5 : 3;
    var best = { K: cands[0], err: Infinity };
    cands.forEach(function (K) {
      var wrong = 0, f, i;
      for (f = 0; f < folds; f++) {
        var tr = [], va = [];
        for (i = 0; i < train.length; i++) (i % folds === f ? va : tr).push(train[i]);
        if (!tr.length || !va.length) continue;
        var score = knnScore(tr, K);
        va.forEach(function (p) { if ((score(p.x) >= 0 ? 1 : 0) !== p.y) wrong++; });
      }
      var err = wrong / train.length;
      if (err < best.err) best = { K: K, err: err };
    });
    return best.K;
  }

  function errRate(score, pts) {
    var wrong = 0;
    pts.forEach(function (p) { if ((score(p.x) >= 0 ? 1 : 0) !== p.y) wrong++; });
    return wrong / pts.length;
  }
  function accRate(score, pts) { return 1 - errRate(score, pts); }

  function fitAll(train) {
    var K = pickK(train);
    var makers = {
      knn1: function () { return knnScore(train, 1); },
      knncv: function () { return knnScore(train, K); },
      lda: function () { return fitLDA(train); },
      logit: function () { return fitLogit(train); },
      nb: function () { return fitNB(train); },
      qda: function () { return fitQDA(train); }
    };
    var out = { K: K };
    METHODS.forEach(function (m) { out[m.key] = makers[m.key](); });
    return out;
  }

  /* ------------------------------------------------------------ state */
  var scenKey = '1', methodKey = 'lda', sampleNo = 1;
  var data = null, fits = null, bestKey = null;

  var elMeta = document.getElementById('race-meta');
  var elAcc = document.getElementById('race-acc');
  var elBest = document.getElementById('race-best');
  var elWhat = document.getElementById('race-what');

  function regenerate() {
    var def = SCENS[scenKey];
    data = genSample(def, parseInt(scenKey, 10) * 1000 + sampleNo * 7 + 13);
    fits = fitAll(data.train);
    var lo = Infinity;
    METHODS.forEach(function (m) {
      var e = errRate(fits[m.key], data.test);
      fits[m.key + ':err'] = e;
      if (e < lo) { lo = e; bestKey = m.key; }
    });
    elMeta.textContent = def.dist === 'logit'
      ? 'scenario ' + scenKey + ' · ' + def.n + ' points · boundary ' + def.truth
      : 'scenario ' + scenKey + ' · ' + def.n + ' per class · boundary ' + def.truth;
    elMeta.title = def.note;                       // full description on hover
    updateReadouts();
    plotB.render();
    plotE.render();
  }

  function labelOf(k) {
    for (var i = 0; i < METHODS.length; i++) if (METHODS[i].key === k) return METHODS[i].label;
    return k;
  }

  function updateReadouts() {
    if (!fits) return;
    elAcc.innerHTML = labelOf(methodKey) + ' on this sample — train <b>' +
      Math.round(accRate(fits[methodKey], data.train) * 100) + '%</b> · test <b>' +
      Math.round((1 - fits[methodKey + ':err']) * 100) + '%</b>';
    elBest.innerHTML = 'lowest test error here: <b>' + labelOf(bestKey) + '</b> (' +
      (fits[bestKey + ':err'] * 100).toFixed(1) + '%)';
    elWhat.textContent = WHAT[methodKey];
  }

  /* -------------------------------------------------- boundary panel */
  var plotB = new Plot(cvB, {
    range: { xmin: -6, xmax: 6, ymin: -6, ymax: 6 },
    height: 400,
    xlabel: 'feature 1',
    ylabel: 'feature 2',
    draw: function (p) {
      var col = p.colors;
      var score = fits ? fits[methodKey] : null;
      if (!score) { p.axes(); return; }

      // score grid first — one pass to shade, one to trace the boundary
      var G = 48, i, j;
      var sx = 12 / G, sy = 12 / G, grid = [], maxAbs = 1e-9;
      for (i = 0; i <= G; i++) {
        grid[i] = [];
        for (j = 0; j <= G; j++) {
          var s = score([-6 + i * sx, -6 + j * sy]);
          grid[i][j] = s;
          if (Math.abs(s) > maxAbs) maxAbs = Math.abs(s);
        }
      }
      for (i = 0; i < G; i++) {
        for (j = 0; j < G; j++) {
          var v = Math.abs(grid[i][j]) / maxAbs;
          var rgb = grid[i][j] >= 0 ? [245, 158, 11] : [59, 130, 246];
          var a = 0.08 + 0.30 * Math.min(1, v);
          p.cell(-6 + i * sx, -6 + (i + 1) * sx, -6 + j * sy, -6 + (j + 1) * sy,
            'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',' + a + ')');
        }
      }
      p.axes();

      var H = 110, hx = 12 / H, hy = 12 / H, hg = [];
      for (i = 0; i <= H; i++) {
        hg[i] = [];
        for (j = 0; j <= H; j++) hg[i][j] = score([-6 + i * hx, -6 + j * hy]);
      }
      var marks = [];
      for (i = 0; i <= H; i++) {
        for (j = 0; j <= H; j++) {
          var g = hg[i][j];
          if ((i < H && g * hg[i + 1][j] < 0) || (j < H && g * hg[i][j + 1] < 0)) {
            marks.push([-6 + i * hx, -6 + j * hy]);
          }
        }
      }
      p.points(marks, { color: col.fg, r: 1.6 });

      data.train.forEach(function (q) {
        p.dot(q.x[0], q.x[1], {
          r: 4.4,
          color: q.y === 0 ? '#3b82f6' : '#f59e0b',
          ring: col.surface,
          ringWidth: 1.4
        });
      });
    }
  });

  /* ------------------------------------------------- test-error panel */
  var plotE = new Plot(cvE, {
    range: { xmin: 0, xmax: 0.5, ymin: 0, ymax: 6 },
    height: 400,
    grid: true,
    noYTicks: true,
    xlabel: 'test error rate (2,400 fresh points)',
    draw: function (p) {
      var col = p.colors;
      if (!fits) { p.axes(); return; }

      var maxE = 0.05;
      METHODS.forEach(function (m) { maxE = Math.max(maxE, fits[m.key + ':err']); });
      // widen the x range in place (setRange would schedule another paint
      // from inside this draw, which never settles)
      p.range.xmax = Math.min(0.9, maxE * 1.25 + 0.10);

      p.axes();

      METHODS.forEach(function (m, i) {
        var y = METHODS.length - i - 0.5;            // KNN-1 on top
        var e = fits[m.key + ':err'];
        var sel = m.key === methodKey, best = m.key === bestKey;
        var color = sel ? col.accent : (best ? '#f59e0b' : col.axis);
        p.cell(0, e, y - 0.26, y + 0.26, color, sel || best ? 0.95 : 0.45);
        p.text((best ? '★ ' : '') + m.label + '  ' + (e * 100).toFixed(1) + '%',
          e + p.range.xmax * 0.015, y,
          { color: color, base: 'middle' });
      });
    }
  });

  /* --------------------------------------------------------- controls */
  document.getElementById('race-scen').addEventListener('change', function (e) {
    scenKey = e.target.value;
    sampleNo = 1;
    regenerate();
  });
  document.getElementById('race-method').addEventListener('change', function (e) {
    methodKey = e.target.value;
    updateReadouts();
    plotB.render();
    plotE.render();
  });
  document.getElementById('race-new').addEventListener('click', function () {
    sampleNo++;
    regenerate();
  });

  regenerate();

  // read-only accessor for the verification harness (no UI effect)
  window.RaceProbe = function () {
    return {
      scen: scenKey,
      sample: sampleNo,
      errs: METHODS.map(function (m) { return [m.key, fits[m.key + ':err']]; }),
      best: bestKey
    };
  };
})();
