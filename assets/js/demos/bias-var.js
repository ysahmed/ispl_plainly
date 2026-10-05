/* ==========================================================================
   bias-var.js — Chapter 2, section 2.2.2 (the bias–variance trade-off).

   Left panel:  the truth, one draw of the data, and what the same method
                produces when it is re-run on freshly redrawn data.
   Right panel: the test error taken apart into its three pieces, stacked
                from the bottom up:
                    irreducible σ²  +  bias²  +  variance  =  test MSE
   Three truths (straight-ish, gently curved, wildly non-linear) reproduce
   the situations of the book's Figures 2.10, 2.9 and 2.11.
   ========================================================================== */
(function () {
  'use strict';

  var cvFit = document.getElementById('cv-bv-fit');
  var cvDec = document.getElementById('cv-bv-decomp');
  if (!cvFit || !cvDec || typeof Plot === 'undefined') return;

  var XSC = 1.7;              // fit in u = x/XSC ∈ [-1, 1]
  var NOISE = 0.45;           // sigma, the irreducible part
  var N_TRAIN = 40;
  var REPS = 40;              // redraws used to average out the noise
  var GRID = 33;              // x positions the error is averaged over
  var DEG_MAX = 15;

  var TRUTHS = {
    line: {
      label: 'the truth is almost a straight line',
      f: function (x) { return 1.15 * x + 0.1; },
      fig: 'Figure 2.10'
    },
    curve: {
      label: 'the truth has a real curve in it',
      f: function (x) { return 0.9 * x - 0.55 * x * x * x; },
      fig: 'Figure 2.9'
    },
    wild: {
      label: 'the truth is wildly non-linear',
      f: function (x) { return 1.7 * Math.sin(2.6 * x) + 0.7 * Math.sin(6.1 * x); },
      fig: 'Figure 2.11'
    }
  };

  /* ------------------------------------------------------------ the maths */
  function solve(A, b, n) {            // Gaussian elimination, partial pivot
    var M = [], i, j, k;
    for (i = 0; i < n; i++) {
      M.push([]);
      for (j = 0; j < n; j++) M[i].push(A[i][j]);
      M[i].push(b[i]);
    }
    for (k = 0; k < n; k++) {
      var piv = k;
      for (i = k + 1; i < n; i++) if (Math.abs(M[i][k]) > Math.abs(M[piv][k])) piv = i;
      var t = M[k]; M[k] = M[piv]; M[piv] = t;
      if (Math.abs(M[k][k]) < 1e-14) continue;
      for (i = k + 1; i < n; i++) {
        var f = M[i][k] / M[k][k];
        if (!f) continue;
        for (j = k; j <= n; j++) M[i][j] -= f * M[k][j];
      }
    }
    var c = new Array(n).fill(0);
    for (i = n - 1; i >= 0; i--) {
      var s = M[i][n];
      for (j = i + 1; j < n; j++) s -= M[i][j] * c[j];
      c[i] = Math.abs(M[i][i]) < 1e-14 ? 0 : s / M[i][i];
    }
    return c;
  }

  // fixed design: same x positions every redraw, fresh noise each time
  var XPOS = [];
  for (var i0 = 0; i0 < N_TRAIN; i0++) {
    XPOS.push(-XSC + 2 * XSC * (i0 + 0.5) / N_TRAIN);
  }
  var GRIDX = [];
  for (var g0 = 0; g0 < GRID; g0++) {
    GRIDX.push(-XSC + 2 * XSC * g0 / (GRID - 1));
  }

  var cache = {};

  function simulate(key) {
    if (cache[key]) return cache[key];
    var T = TRUTHS[key];
    var rnd = mulberry32(key === 'line' ? 5 : (key === 'curve' ? 21 : 77));

    var preds = [];                      // preds[degree-1][rep][grid]
    for (var d = 0; d < DEG_MAX; d++) preds.push([]);

    for (var rep = 0; rep < REPS; rep++) {
      var pts = [];
      for (var i = 0; i < N_TRAIN; i++) {
        pts.push([XPOS[i], T.f(XPOS[i]) + NOISE * gauss(rnd)]);
      }
      // one normal-equation system up to DEG_MAX; smaller degrees are its
      // leading blocks, so one assembly covers all 15 fits
      var nMax = DEG_MAX + 1;
      var A = [], b = [], k, j;
      for (k = 0; k < nMax; k++) { A.push([]); b.push(0); for (j = 0; j < nMax; j++) A[k].push(0); }
      for (var q = 0; q < pts.length; q++) {
        var u = pts[q][0] / XSC, pw = [1];
        for (k = 1; k < nMax; k++) pw.push(pw[k - 1] * u);
        for (k = 0; k < nMax; k++) {
          b[k] += pw[k] * pts[q][1];
          for (j = 0; j < nMax; j++) A[k][j] += pw[k] * pw[j];
        }
      }
      for (var d2 = 1; d2 <= DEG_MAX; d2++) {
        // d2+1 coefficients (1, u, ..., u^d2) = a polynomial of degree d2
        var coef = solve(A, b, d2 + 1);
        var row = [];
        for (var g = 0; g < GRID; g++) {
          var uu = GRIDX[g] / XSC, y = 0, p2 = 1;
          for (k = 0; k <= d2; k++) { y += coef[k] * p2; p2 *= uu; }
          row.push(y);
        }
        preds[d2 - 1].push(row);
      }
    }

    var rows = [];
    for (var d3 = 1; d3 <= DEG_MAX; d3++) {
      var pr = preds[d3 - 1];
      var bias2 = 0, variance = 0;
      for (var g2 = 0; g2 < GRID; g2++) {
        var sum = 0, sum2 = 0;
        for (var r = 0; r < REPS; r++) {
          var v = pr[r][g2];
          sum += v; sum2 += v * v;
        }
        var mean = sum / REPS;
        var truthV = T.f(GRIDX[g2]);
        var dv = mean - truthV;
        bias2 += dv * dv;
        variance += sum2 / REPS - mean * mean;
      }
      rows.push({
        d: d3,
        bias: bias2 / GRID,
        variance: Math.max(0, variance / GRID),
        floor: NOISE * NOISE
      });
      rows[rows.length - 1].total =
        rows[rows.length - 1].floor +
        rows[rows.length - 1].bias +
        rows[rows.length - 1].variance;
      rows[rows.length - 1].preds = pr;      // keep the redraws for the picture
    }

    // one visible draw of the data, with its own seed so it is not
    // secretly one of the redraws used in the average
    var drnd = mulberry32(1303), data = [];
    for (var i2 = 0; i2 < N_TRAIN; i2++) {
      data.push([XPOS[i2], T.f(XPOS[i2]) + NOISE * gauss(drnd)]);
    }

    cache[key] = { rows: rows, data: data, truth: T };
    return cache[key];
  }

  /* ------------------------------------------------------------- controls */
  var state = { truth: 'curve', degree: 1 };
  var slider = document.getElementById('bv-degree');
  var btns = Array.prototype.slice.call(
    document.querySelectorAll('#demo-biasvar .btn[data-truth]'));
  var elBias = document.getElementById('bv-bias');
  var elVar = document.getElementById('bv-var');
  var elTotal = document.getElementById('bv-total');
  var elVerdict = document.getElementById('bv-verdict');
  var elShape = document.getElementById('bv-shape');

  function meanCurve(sims, g) {
    var s = 0;
    for (var r = 0; r < sims.length; r++) s += sims[r][g];
    return s / sims.length;
  }

  var plotFit = new Plot(cvFit, {
    range: { xmin: -XSC - 0.15, xmax: XSC + 0.15, ymin: -3.7, ymax: 3.7 },
    height: 300,
    xlabel: 'x',
    ylabel: 'y',
    draw: function (p) {
      var col = p.colors;
      var sim = simulate(state.truth);
      var row = sim.rows[state.degree - 1];
      p.axes();

      p.fnLine(sim.truth.f, { color: col.axis, width: 1.8, dash: [5, 5] });

      // a handful of the redraws, faint: this is the "variance" made visible
      var c = p.ctx;
      c.save();
      c.globalAlpha = 0.4;
      for (var r = 0; r < row.preds.length; r += 7) {
        var pr = row.preds[r];
        p.line(GRIDX.map(function (x, g) { return [x, pr[g]]; }),
          { color: col.accent2, width: 1.6 });
      }
      c.restore();
      // the average of all the redraws
      p.line(GRIDX.map(function (x, g) { return [x, meanCurve(row.preds, g)]; }),
        { color: col.accent2, width: 2.6 });

      p.points(sim.data, { color: col.good, r: 4.2 });

      p.text('true f(x)', p.range.xmin + 0.1, 3.35,
        { font: '11.5px system-ui', color: col.axis });
      p.text('one draw of the data', p.range.xmin + 0.1, -3.35,
        { font: '11.5px system-ui', color: col.good });
      p.text(state.degree + ' draws of the fit, and their average',
        p.range.xmax - 0.1, -3.35,
        { font: '11.5px system-ui', color: col.accent2, align: 'right' });
    }
  });

  var plotDec = new Plot(cvDec, {
    range: { xmin: 0.6, xmax: DEG_MAX + 0.4, ymin: 0, ymax: 1 },
    height: 300,
    xlabel: 'flexibility → (polynomial degree)',
    ylabel: 'error (MSE)',
    draw: function (p) {
      var col = p.colors;
      var sim = simulate(state.truth);
      var rows = sim.rows;

      // scale the panel once per truth
      var maxTot = 0;
      rows.forEach(function (r) { maxTot = Math.max(maxTot, r.total); });
      p.range.ymin = 0;
      p.range.ymax = Math.max(maxTot * 1.18, 0.05);

      p.axes();

      function at(f) { return rows.map(function (r) { return [r.d, f(r)]; }); }
      function closed(base) {
        var pts = at(base);
        pts.push([DEG_MAX, 0], [1, 0]);
        return pts;
      }

      p.clip(function () {
        var c = p.ctx;
        c.save();
        c.globalAlpha = 1;
        // bottom band: irreducible noise
        c.globalAlpha = 0.16; c.fillStyle = col.axis;
        drawPoly(c, p, closed(function (r) { return r.floor; }));
        // middle band: bias²
        c.globalAlpha = 0.30; c.fillStyle = col.accent;
        drawPoly(c, p, stacked(rows, function (r) { return r.floor + r.bias; },
                                    function (r) { return r.floor; }));
        // top band: variance
        c.globalAlpha = 0.30; c.fillStyle = col.accent2;
        drawPoly(c, p, stacked(rows, function (r) { return r.total; },
                                    function (r) { return r.floor + r.bias; }));
        c.restore();
      });

      p.line(at(function (r) { return r.bias + r.floor; }),
        { color: col.accent, width: 1.6, dash: [6, 4] });
      p.line(at(function (r) { return r.total; }),
        { color: col.fg, width: 2.4 });
      p.hline(NOISE * NOISE, { color: col.axis, width: 1.4, dash: [3, 4] });

      p.vline(state.degree, { color: col.fg, width: 1.4, dash: [4, 4] });
      var cur = rows[state.degree - 1];
      p.dot(state.degree, cur.total, { r: 5.5, color: col.fg, ring: col.surface });

      p.text('variance', DEG_MAX - 0.3, rows[DEG_MAX - 1].total * 0.93,
        { font: '11.5px system-ui', color: col.accent2, align: 'right' });
      p.text('bias²', 1.3, rows[0].floor + (rows[DEG_MAX - 1].floor +
        rows[DEG_MAX - 1].bias) * 0.5, { font: '11.5px system-ui', color: col.accent });
      p.text('σ² — you cannot beat this', DEG_MAX - 0.3, NOISE * NOISE * 0.5,
        { font: '11.5px system-ui', color: col.axis, align: 'right' });

      if (elBias) elBias.innerHTML = 'bias²: <b>' + cur.bias.toFixed(3) + '</b>';
      if (elVar) elVar.innerHTML = 'variance: <b>' + cur.variance.toFixed(3) + '</b>';
      if (elTotal) {
        elTotal.innerHTML = 'test MSE = ' + cur.floor.toFixed(2) + ' + ' +
          cur.bias.toFixed(3) + ' + ' + cur.variance.toFixed(3) +
          ' = <b>' + cur.total.toFixed(3) + '</b>';
      }
      if (elVerdict) {
        // where is the bottom of the U? judge the setting by that, not by
        // raw component sizes (a straight truth at its optimum has bias ~0,
        // so "variance is bigger" there is not a reason to move)
        var bestRow = rows[0];
        for (var q2 = 1; q2 < rows.length; q2++) {
          if (rows[q2].total < bestRow.total) bestRow = rows[q2];
        }
        var v = state.degree < bestRow.d
          ? 'too stiff — bias is doing the damage'
          : (cur.total > bestRow.total * 1.15
            ? 'too twitchy — variance is doing the damage'
            : 'near the balance point');
        elVerdict.innerHTML = 'verdict: <b>' + v + '</b>';
      }
      if (elShape) elShape.innerHTML = sim.truth.label +
        ' <span class="demo-note">(' + sim.truth.fig + ')</span>';
    }
  });

  function drawPoly(c, p, pts) {
    c.beginPath();
    for (var i = 0; i < pts.length; i++) {
      var X = p.xToPx(pts[i][0]), Y = p.yToPx(pts[i][1]);
      if (i === 0) c.moveTo(X, Y); else c.lineTo(X, Y);
    }
    c.closePath();
    c.fill();
  }
  function stacked(rows, top, bottom) {
    var pts = rows.map(function (r) { return [r.d, top(r)]; });
    for (var i = rows.length - 1; i >= 0; i--) pts.push([rows[i].d, bottom(rows[i])]);
    return pts;
  }

  slider.addEventListener('input', function () {
    state.degree = Number(slider.value);
    plotFit.render();
    plotDec.render();
  });

  btns.forEach(function (b) {
    b.addEventListener('click', function () {
      state.truth = b.dataset.truth;
      btns.forEach(function (o) {
        o.setAttribute('aria-pressed', String(o.dataset.truth === state.truth));
      });
      plotFit.render();
      plotDec.render();
    });
  });
})();
