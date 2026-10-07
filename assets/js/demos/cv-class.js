/* ==========================================================================
   cv-class.js — Chapter 5, §5.1.5: cross-validation on a classification task.

   Two-class simulated data in the spirit of the book's Figure 2.13 (the
   centres are placed so the Bayes error rate lands near the book's 0.133).

   Left panel:  the decision boundary the selected method draws at the
                selected flexibility, with the Bayes boundary dashed on top.
   Right panel: training error (blue), true test error (red) and the
                10-fold CV error (black) against flexibility — the book's
                Figure 5.8.  Everything is fitted and scored in the browser.
   ========================================================================== */
(function () {
  'use strict';
  var cvB = document.getElementById('cv-cl-boundary');
  var cvE = document.getElementById('cv-cl-error');
  if (!cvB || !cvE || typeof Plot === 'undefined') return;

  var MU = [{ x: -0.45, y: 1.0 }, { x: 0.45, y: -1.0 }];
  var N_TRAIN = 200, N_TEST = 2000, DEGS = 10;
  var KS = [1, 3, 5, 7, 10, 15, 20, 30, 50, 75, 100];
  var RANGE = { xmin: -3.4, xmax: 3.4, ymin: -3.4, ymax: 3.4 };

  /* ------------------------------------------------------------- the data */
  function makeData(seed, per) {
    var rnd = mulberry32(seed), out = [];
    for (var c = 0; c < 2; c++) {
      for (var i = 0; i < per; i++) {
        out.push({ x: MU[c].x + gauss(rnd), y: MU[c].y + gauss(rnd), c: c });
      }
    }
    return out;
  }
  var train = makeData(43, N_TRAIN / 2)   // 43, not 41: seed 41's sample is a
                               // fluke (Bayes error 0.095 on it — an
                               // easy draw), which drags CV below the floor;
  var test = makeData(42, N_TEST / 2);

  // standardise with the training mean/sd so polynomial powers stay tame
  var mx = 0, my = 0, sx = 0, sy = 0, i;
  train.forEach(function (q) { mx += q.x; my += q.y; });
  mx /= train.length; my /= train.length;
  train.forEach(function (q) { sx += (q.x - mx) * (q.x - mx); sy += (q.y - my) * (q.y - my); });
  sx = Math.sqrt(sx / train.length); sy = Math.sqrt(sy / train.length);

  function feats(q, deg) {
    var zx = (q.x - mx) / sx, zy = (q.y - my) / sy;
    var row = [1], px = 1, py = 1;
    for (var d = 1; d <= deg; d++) { px *= zx; row.push(px); }
    for (d = 1; d <= deg; d++) { py *= zy; row.push(py); }
    return row;
  }

  // the best any classifier can do — perpendicular bisector of the centres
  var bx = MU[1].x - MU[0].x, by = MU[1].y - MU[0].y;
  var mcx = (MU[0].x + MU[1].x) / 2, mcy = (MU[0].y + MU[1].y) / 2;
  function bayesSign(x, y) { return bx * (x - mcx) + by * (y - mcy) > 0 ? 1 : 0; }
  var bayesFloor = (function () {
    var r = mulberry32(99), wrong = 0, N = 6000;
    for (var j = 0; j < N; j++) {
      var c = r() < 0.5 ? 0 : 1;
      if (bayesSign(MU[c].x + gauss(r), MU[c].y + gauss(r)) !== c) wrong++;
    }
    return wrong / N;
  })();

  /* ------------------------------------------------------- logistic fits */
  function logitFit(rows, labels, deg) {
    var k = 2 * deg + 1, beta = new Array(k).fill(0);
    var n = rows.length, iter, a, b, m;
    for (iter = 0; iter < 20; iter++) {
      var H = [], g = [];
      for (a = 0; a < k; a++) { H.push(new Array(k).fill(0)); g.push(0); }
      for (m = 0; m < n; m++) {
        var eta = 0;
        for (a = 0; a < k; a++) eta += beta[a] * rows[m][a];
        var pr = 1 / (1 + Math.exp(-Math.max(-30, Math.min(30, eta))));
        var w = Math.max(pr * (1 - pr), 1e-7);
        var r = labels[m] - pr;
        for (a = 0; a < k; a++) {
          g[a] += r * rows[m][a];
          for (b = 0; b < k; b++) H[a][b] += w * rows[m][a] * rows[m][b];
        }
      }
      for (a = 0; a < k; a++) H[a][a] += 1e-8;
      var delta = Stats.solve(H, g);
      var moved = 0;
      for (a = 0; a < k; a++) { beta[a] += delta[a]; moved = Math.max(moved, Math.abs(delta[a])); }
      if (moved < 1e-9) break;
    }
    return beta;
  }

  function logitPred(beta, q, deg) {
    var row = feats(q, deg), s = 0;
    for (var a = 0; a < row.length; a++) s += beta[a] * row[a];
    return s > 0 ? 1 : 0;
  }

  function errOf(predFn, data) {
    var wrong = 0;
    for (var m = 0; m < data.length; m++) if (predFn(data[m]) !== data[m].c) wrong++;
    return wrong / data.length;
  }

  function folds(seed) {
    var rnd = mulberry32(seed), order = [], out = [];
    for (var m = 0; m < train.length; m++) order.push(m);
    for (var t = order.length - 1; t > 0; t--) {
      var w = Math.floor(rnd() * (t + 1)), tmp = order[t]; order[t] = order[w]; order[w] = tmp;
    }
    var size = train.length / 10;
    for (var f = 0; f < 10; f++) out.push(order.slice(f * size, (f + 1) * size));
    return out;
  }

  function logisticCurves(foldSeed) {
    var foldIdx = folds(foldSeed);
    var trRows = train.map(function (q) { return q; });
    var out = { train: [], test: [], cv: [] };
    for (var deg = 1; deg <= DEGS; deg++) {
      var rowsAll = trRows.map(function (q) { return feats(q, deg); });
      var labAll = trRows.map(function (q) { return q.c; });
      var beta = logitFit(rowsAll, labAll, deg);
      out.train.push(errOf(function (q) { return logitPred(beta, q, deg); }, train));
      out.test.push(errOf(function (q) { return logitPred(beta, q, deg); }, test));

      // 10-fold CV: hold out each fold, fit the other nine
      var wrong = 0;
      foldIdx.forEach(function (fold) {
        var inFold = {}, tr = [], tl = [];
        fold.forEach(function (ix) { inFold[ix] = 1; });
        for (var m = 0; m < train.length; m++) {
          if (!inFold[m]) { tr.push(feats(train[m], deg)); tl.push(train[m].c); }
        }
        var b2 = logitFit(tr, tl, deg);
        fold.forEach(function (ix) {
          if (logitPred(b2, train[ix], deg) !== train[ix].c) wrong++;
        });
      });
      out.cv.push(wrong / train.length);
    }
    return out;
  }

  /* ----------------------------------------------------------- KNN curves */
  function sortedDist(px, py, from) {
    var d = [];
    for (var m = 0; m < from.length; m++) {
      var dx = px - from[m].x, dy = py - from[m].y;
      d.push([(dx * dx + dy * dy), from[m].c]);
    }
    d.sort(function (a, b2) { return a[0] - b2[0]; });
    return d;
  }

  function voteAt(sorted, K) {
    var v = [0, 0];
    for (var m = 0; m < K; m++) v[sorted[m][1]]++;
    if (v[0] !== v[1]) return v[0] > v[1] ? 0 : 1;
    return sorted[0][1] === 1 ? 1 : 0;      // ties break towards the nearer class
  }

  function knnCurves(foldSeed) {
    var foldIdx = folds(foldSeed);
    var out = { train: [], test: [], cv: [] };
    var trainSorted = train.map(function (q) { return sortedDist(q.x, q.y, train); });
    var testSorted = test.map(function (q) { return sortedDist(q.x, q.y, train); });
    KS.forEach(function (K, ki) {
      var wrongTr = 0, wrongTe = 0;
      train.forEach(function (q, m) { if (voteAt(trainSorted[m], K) !== q.c) wrongTr++; });
      test.forEach(function (q, m) { if (voteAt(testSorted[m], K) !== q.c) wrongTe++; });
      out.train.push(wrongTr / train.length);
      out.test.push(wrongTe / test.length);

      var wrongCv = 0;
      foldIdx.forEach(function (fold) {
        var inFold = {}, rest = [];
        fold.forEach(function (ix) { inFold[ix] = 1; });
        for (var m2 = 0; m2 < train.length; m2++) if (!inFold[m2]) rest.push(train[m2]);
        fold.forEach(function (ix) {
          var s = sortedDist(train[ix].x, train[ix].y, rest);
          if (voteAt(s, K) !== train[ix].c) wrongCv++;
        });
      });
      out.cv.push(wrongCv / train.length);
      void ki;
    });
    return out;
  }

  /* -------------------------------------------------------------- state */
  var state = {
    mode: 'logit',          // 'logit' | 'knn'
    deg: 3,
    kIdx: KS.indexOf(5),
    foldSeed: 7,
    logit: null,
    knn: null
  };

  function curves() {
    if (state.mode === 'logit') {
      if (!state.logit) state.logit = logisticCurves(state.foldSeed);
      return state.logit;
    }
    if (!state.knn) state.knn = knnCurves(state.foldSeed);
    return state.knn;
  }

  function set(id, html) {
    var el = document.getElementById(id);
    if (el) el.innerHTML = html;
  }

  /* --------------------------------------------------------- boundary map */
  var G = 44, cellCache = {};
  function boundaryGrid() {
    var key = state.mode + ':' + (state.mode === 'logit' ? state.deg : state.kIdx) + ':' + state.foldSeed;
    if (cellCache[key]) return cellCache[key];
    var cells = new Array(G * G);
    var sxw = (RANGE.xmax - RANGE.xmin) / G, syh = (RANGE.ymax - RANGE.ymin) / G;
    for (var a = 0; a < G; a++) {
      for (var b2 = 0; b2 < G; b2++) {
        var x = RANGE.xmin + (a + 0.5) * sxw, y = RANGE.ymin + (b2 + 0.5) * syh;
        var sign;
        if (state.mode === 'logit') {
          var beta = ensureLogitAt(state.deg);
          sign = logitPred(beta, { x: x, y: y }, state.deg);
        } else {
          sign = voteAt(sortedDist(x, y, train), KS[state.kIdx]);
        }
        cells[a * G + b2] = sign;
      }
    }
    cellCache[key] = cells;
    return cells;
  }

  function ensureLogitAt(deg) {
    // fitted on the full training set at this degree (cached)
    var key = 'full:' + deg;
    if (!ensureLogitAt.cache[key]) {
      var rows = train.map(function (q) { return feats(q, deg); });
      var lab = train.map(function (q) { return q.c; });
      ensureLogitAt.cache[key] = logitFit(rows, lab, deg);
    }
    return ensureLogitAt.cache[key];
  }
  ensureLogitAt.cache = {};

  /* --------------------------------------------------------- left panel */
  var plotB = new Plot(cvB, {
    range: RANGE,
    height: 360,
    xlabel: 'feature 1',
    ylabel: 'feature 2',
    draw: function (p) {
      var col = p.colors;
      var cells = boundaryGrid();
      var sxw = (RANGE.xmax - RANGE.xmin) / G, syh = (RANGE.ymax - RANGE.ymin) / G;
      for (var a = 0; a < G; a++) {
        for (var b2 = 0; b2 < G; b2++) {
          p.cell(RANGE.xmin + a * sxw, RANGE.xmin + (a + 1) * sxw,
            RANGE.ymin + b2 * syh, RANGE.ymin + (b2 + 1) * syh,
            cells[a * G + b2] === 1 ? col.accent2 : col.accent, 0.10);
        }
      }
      p.axes();

      var len = Math.sqrt(bx * bx + by * by);
      var ux = -by / len, uy = bx / len;
      p.line([[mcx - ux * 6, mcy - uy * 6], [mcx + ux * 6, mcy + uy * 6]],
        { color: col.fg, width: 2, dash: [7, 5] });

      train.forEach(function (q) {
        p.dot(q.x, q.y, {
          r: 4,
          color: q.c === 0 ? col.accent : col.accent2,
          ring: col.surface, ringWidth: 1.2
        });
      });

      p.text(state.mode === 'logit'
        ? 'logistic, degree ' + state.deg
        : 'KNN, K = ' + KS[state.kIdx], RANGE.xmin + 0.2, RANGE.ymax - 0.35,
        { color: col.fg, font: '11.5px system-ui' });
      p.text('dashed: the Bayes boundary', RANGE.xmax - 0.2, RANGE.ymax - 0.35,
        { color: col.fg, align: 'right', font: '11.5px system-ui' });
    }
  });

  /* --------------------------------------------------------- right panel */
  function lx(K) { return Math.log(1 / K) / Math.LN10; }
  var XT = [1, 3, 5, 10, 20, 50, 100].map(function (v) {
    return { v: lx(v), label: String(v) };
  });

  function xOf(idx) { return state.mode === 'logit' ? idx + 1 : lx(KS[idx]); }

  var plotE = new Plot(cvE, {
    range: { xmin: 0.5, xmax: 10.5, ymin: 0.08, ymax: 0.3 },
    height: 360,
    draw: function (p) {
      var col = p.colors;
      var cv2 = curves();
      var len = state.mode === 'logit' ? DEGS : KS.length;
      p.o.noXTicks = state.mode === 'knn';   // custom K labels instead

      // dynamic y range over the three curves
      var lo = Infinity, hi = -Infinity;
      ['train', 'test', 'cv'].forEach(function (kk) {
        cv2[kk].forEach(function (v) { lo = Math.min(lo, v); hi = Math.max(hi, v); });
      });
      lo = Math.min(lo, bayesFloor);
      p.range.xmin = state.mode === 'logit' ? 0.5 : lx(KS[KS.length - 1]) - 0.25;
      p.range.xmax = state.mode === 'logit' ? DEGS + 0.5 : lx(1) + 0.25;
      p.range.ymin = Math.max(0, lo - (hi - lo) * 0.12);
      p.range.ymax = hi + (hi - lo) * 0.12;
      p.o.ylabel = 'error rate';

      if (state.mode === 'knn') {
        // custom x ticks at the K values
        var c = p.ctx, pad = p.o.pad;
        p.axes();
        c.save();
        c.font = '11px system-ui, sans-serif';
        c.textAlign = 'center'; c.textBaseline = 'top';
        XT.forEach(function (t) {
          var tx = p.xToPx(t.v);
          if (tx < pad.l - 2 || tx > p.w - pad.r + 2) return;
          c.fillStyle = col.axis;
          c.fillText(t.label, tx, p.h - pad.b + 6);
        });
        c.fillStyle = col.fg;
        c.font = '12px system-ui, sans-serif';
        c.fillText('K, the number of neighbours (log scale)',
          pad.l + (p.w - pad.l - pad.r) / 2, p.h - 2);
        c.restore();
      } else {
        p.axes();
        c_xlabel(p, 'degree of the polynomial');
      }

      var pts = function (kk) {
        return cv2[kk].map(function (v, j) { return [xOf(j), v]; });
      };
      p.line(pts('train'), { color: col.accent, width: 2.2 });
      p.line(pts('test'), { color: col.accent2, width: 2.4 });
      p.line(pts('cv'), { color: col.fg, width: 2.4 });
      p.points(pts('train'), { color: col.accent, r: 3 });
      p.points(pts('test'), { color: col.accent2, r: 3 });
      p.points(pts('cv'), { color: col.fg, r: 3 });

      p.hline(bayesFloor, { color: col.axis, width: 1.6, dash: [6, 5] });
      p.text('Bayes floor', state.mode === 'logit' ? 1 : lx(1), bayesFloor,
        { align: state.mode === 'logit' ? 'left' : 'right', base: 'bottom',
          color: col.axis, font: '11px system-ui' });

      // the selected flexibility
      var sel = state.mode === 'logit' ? state.deg - 1 : state.kIdx;
      p.vline(xOf(sel), { color: col.axis, width: 1.2, dash: [4, 4] });
      p.dot(xOf(sel), cv2.train[sel], { r: 5, color: col.accent, ring: col.surface });
      p.dot(xOf(sel), cv2.test[sel], { r: 5, color: col.accent2, ring: col.surface });
      p.dot(xOf(sel), cv2.cv[sel], { r: 5, color: col.fg, ring: col.surface });

      // labels on the first points of each curve
      p.text('training error', xOf(0), cv2.train[0],
        { base: 'bottom', color: col.accent, font: '11.5px system-ui' });
      p.text('test error', xOf(1), cv2.test[1],
        { base: 'top', color: col.accent2, font: '11.5px system-ui' });
      p.text('10-fold CV', xOf(len - 1), cv2.cv[len - 1],
        { align: 'right', base: 'bottom', color: col.fg, font: '11.5px system-ui' });

      /* ------------------------------------------------------- readouts */
      var best = 0;
      for (i = 1; i < len; i++) if (cv2.cv[i] < cv2.cv[best]) best = i;
      var name = state.mode === 'logit' ? 'degree ' + (best + 1) : 'K = ' + KS[best];
      set('cl-train', 'training error: <b>' + (100 * cv2.train[sel]).toFixed(1) + '%</b>');
      set('cl-test', 'test error: <b>' + (100 * cv2.test[sel]).toFixed(1) + '%</b>');
      set('cl-cv', '10-fold CV error: <b>' + (100 * cv2.cv[sel]).toFixed(1) + '%</b>');
      set('cl-bayes', 'Bayes floor: <b>' + (100 * bayesFloor).toFixed(1) + '%</b>');
      set('cl-best', 'CV\'s own minimum: <b>' + name + '</b> (test error there ' +
        (100 * cv2.test[best]).toFixed(1) + '%, true best ' +
        (100 * Math.min.apply(null, cv2.test)).toFixed(1) + '%)');
      set('cl-flexread', state.mode === 'logit'
        ? 'degree = <b>' + state.deg + '</b>'
        : 'K = <b>' + KS[state.kIdx] + '</b>');
    }
  });

  function c_xlabel(p, text) {
    var c = p.ctx, pad = p.o.pad;
    c.save();
    c.fillStyle = p.colors.fg;
    c.font = '12px system-ui, sans-serif';
    c.textAlign = 'center'; c.textBaseline = 'bottom';
    c.fillText(text, pad.l + (p.w - pad.l - pad.r) / 2, p.h - 2);
    c.restore();
  }

  /* ------------------------------------------------------------ controls */
  function syncSlider() {
    var s = document.getElementById('cl-flex');
    if (!s) return;
    if (state.mode === 'logit') {
      s.min = 1; s.max = DEGS; s.value = state.deg;
    } else {
      s.min = 0; s.max = KS.length - 1; s.value = state.kIdx;
    }
    var lab = document.getElementById('cl-flexlabel');
    if (lab) lab.textContent = state.mode === 'logit' ? 'degree' : 'K';
  }

  ['logit', 'knn'].forEach(function (m) {
    var el = document.getElementById('cl-mode-' + m);
    if (!el) return;
    el.addEventListener('click', function () {
      state.mode = m;
      ['logit', 'knn'].forEach(function (mm) {
        var b2 = document.getElementById('cl-mode-' + mm);
        if (b2) b2.setAttribute('aria-pressed', String(mm === m));
      });
      syncSlider();
      curves();
      plotB.render();
      plotE.render();
    });
  });

  var slider = document.getElementById('cl-flex');
  if (slider) slider.addEventListener('input', function () {
    var v = parseInt(this.value, 10);
    if (state.mode === 'logit') state.deg = v; else state.kIdx = v;
    plotB.render();
    plotE.render();
  });

  var refold = document.getElementById('cl-refold');
  if (refold) refold.addEventListener('click', function () {
    state.foldSeed += 13;
    state.logit = null;
    state.knn = null;
    curves();
    plotE.render();
  });

  syncSlider();
  curves();
  plotB.render();
  plotE.render();
})();
