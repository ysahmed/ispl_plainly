/* ==========================================================================
   lr-sim.js — Chapter 7, §7.6: ISLP Figure 7.9, made movable.

   The book's figure freezes two choices at two targets (a boundary point
   near 0.05, an interior point near 0.4).  This demo lets you move the
   target anywhere on the axis, widen or narrow the span, and switch the
   local polynomial between the constant, linear and quadratic fits that
   §7.6 lists as the three choices Algorithm 7.1 leaves open.

   What is drawn, and where it came from:

   · the blue curve is the book's own f(x), digitised from Figure 7.9 by
     tools/ch07_fig79.py (two panels, which draw the same curve, averaged);
   · the yellow bell is the tricube weight K(d) = (1-d^3)^3_+ at the
     current bandwidth — the same shape the printed bell has: the tool
     fits that profile to the printed bell and gets h = 0.1985 and
     0.2010, peak 0.996 and 0.970, in the two panels;
   · the grey points are NOT the book's points: it never publishes its
     simulated data.  We draw our own 100 — x ~ U(0,1), y = f(x) +
     N(0, 0.35^2), mulberry32 seed 7 — where 0.35 matches the spread of
     the circles we digitised about f (residual sd 0.3816, range −0.508
     to +0.701, n = 67 traced).  The readouts therefore reproduce the
     book's *method*, not its numbers.

   Readouts: the target, the neighbourhood size k = ceil(s*n), the
   bandwidth h, the fit at the target, the true f there, and the error
   of the estimate — the quantity the figure is there to illustrate.
   ========================================================================== */
(function () {
  'use strict';
  var cPlot = document.getElementById('lr-si-plot');
  if (!cPlot || typeof Plot === 'undefined' || typeof Stats === 'undefined' ||
      typeof CH07_F79 === 'undefined' || typeof mulberry32 === 'undefined') return;

  var F = window.CH07_F79, M = window.CH07_F79_META;
  var elX0 = document.getElementById('lr-si-x0'),
      elSpan = document.getElementById('lr-si-span'),
      elDeg = document.getElementById('lr-si-deg'),
      elA = document.getElementById('lr-si-a'),
      elB = document.getElementById('lr-si-b');
  if (!elX0 || !elSpan || !elDeg || !elA || !elB) return;
  var elX0read = document.getElementById('lr-si-x0read'),
      elK = document.getElementById('lr-si-k'),
      elH = document.getElementById('lr-si-h'),
      elFh = document.getElementById('lr-si-fh'),
      elF = document.getElementById('lr-si-f'),
      elErr = document.getElementById('lr-si-err');
  if (!elX0read || !elK || !elH || !elFh || !elF || !elErr) return;

  /* f(x) on the digitised polyline: linear interpolation, exactly what
     the harness recomputes from the same committed array. */
  function fAt(x) {
    if (x <= F[0][0]) return F[0][1];
    if (x >= F[F.length - 1][0]) return F[F.length - 1][1];
    var lo = 0, hi = F.length - 1, mid;
    while (hi - lo > 1) { mid = (lo + hi) >> 1; if (F[mid][0] <= x) lo = mid; else hi = mid; }
    var t = (x - F[lo][0]) / (F[hi][0] - F[lo][0]);
    return F[lo][1] + t * (F[hi][1] - F[lo][1]);
  }

  /* the book's f, sampled for the blue line */
  var curve = [], i;
  for (i = 0; i < F.length; i++) curve.push([F[i][0], F[i][1]]);

  /* our simulation: mulberry32(M.seed), one x then one gauss (two
     uniforms) per point — the same stream the Python harness walks. */
  var rnd = mulberry32(M.seed), xs = [], ys = [];
  for (i = 0; i < M.n; i++) {
    var x = rnd(), e = window.gauss(rnd);
    xs.push(x);
    ys.push(fAt(x) + M.sigma * e);
  }
  var prep = Stats.localPrepare(xs, ys);

  /* fixed plot window: data never change, so the range is computed once */
  var dmin = Math.min.apply(null, ys), dmax = Math.max.apply(null, ys);
  var ylo = Math.min(-0.1, dmin - 0.15), yhi = Math.max(1.12, dmax + 0.15);

  var TRUTH = '#0072b2', LOCAL = '#d55e00', BELL = '#f0e442';

  function signed(v, d) {
    var s = v.toFixed(d);
    return v >= 0 ? '+' + s : s;
  }

  var plot = new Plot(cPlot, {
    range: { xmin: -0.02, xmax: 1.02, ymin: ylo, ymax: yhi },
    height: 340, xlabel: 'x', ylabel: 'y',
    draw: function (p) {
      var x0 = +elX0.value, span = +elSpan.value, deg = +elDeg.value;
      var fit = Stats.localFitAt(x0, prep, span, deg);
      var h = fit.h, b = fit.beta;
      p.axes();

      /* yellow weight bell, filled from the zero baseline up — as drawn */
      var bl = Math.max(0, x0 - h), bh = Math.min(1, x0 + h), cols = 140;
      if (h > 0 && bh > bl) {
        for (i = 0; i < cols; i++) {
          var xa = bl + (bh - bl) * i / cols, xb = bl + (bh - bl) * (i + 1) / cols;
          var w0 = Stats.tricube(Math.abs(xa - x0) / h),
              w1 = Stats.tricube(Math.abs(xb - x0) / h);
          var top = Math.max(w0, w1);
          if (top > 0.004) p.cell(xa, xb, 0, top, BELL, 0.5);
        }
      }

      /* points: the neighbourhood in the book's orange, the rest grey */
      var inNb = new Uint8Array(xs.length);
      for (i = fit.l; i < fit.r; i++) inNb[prep.order[i]] = 1;
      var grey = [], orange = [];
      for (i = 0; i < xs.length; i++) (inNb[i] ? orange : grey).push([xs[i], ys[i]]);
      p.points(grey, { color: '#96a0b3', r: 3.4, alpha: 0.85 });
      p.points(orange, { color: LOCAL, r: 4.2, alpha: 0.95 });

      /* the truth and the local polynomial, drawn across its span only */
      p.line(curve, { color: TRUTH, width: 2.2 });
      var seg = [], SEG = 60;
      var sa = Math.max(0, x0 - h), sb = Math.min(1, x0 + h);
      for (i = 0; i <= SEG; i++) {
        var xx = sa + (sb - sa) * i / SEG, t = xx - x0;
        seg.push([xx, b[0] + b[1] * t + (deg >= 2 ? b[2] * t * t : 0)]);
      }
      p.line(seg, { color: LOCAL, width: 2.6 });
      p.vline(x0, { color: LOCAL, width: 1.4 });
      p.dot(x0, fit.yhat, { color: LOCAL, r: 5.5 });

      p.text('tricube weights K(d)', Math.min(0.97, x0 + h * 0.55),
        1.05, { align: 'center', color: '#8a7400', font: '12px system-ui, sans-serif' });
      p.text('f(x)', 0.985, fAt(1) - 0.12, {
        align: 'right', color: TRUTH, font: 'bold 12.5px system-ui, sans-serif'
      });
      p.text('f̂', x0 > 0.9 ? x0 - 0.02 : x0 + 0.02, fit.yhat + 0.1, {
        align: x0 > 0.9 ? 'right' : 'left', color: LOCAL,
        font: 'bold 12.5px system-ui, sans-serif'
      });
      return { x0: x0, fit: fit };
    }
  });

  function render() {
    var x0 = +elX0.value, span = +elSpan.value, deg = +elDeg.value;
    var fit = Stats.localFitAt(x0, prep, span, deg);
    var f0 = fAt(x0);
    elX0read.textContent = 'x₀ = ' + x0.toFixed(4);
    elK.textContent = 'k = ' + fit.k + ' of ' + M.n;
    elH.textContent = 'h = ' + fit.h.toFixed(4);
    elFh.textContent = 'f̂(x₀) = ' + fit.yhat.toFixed(4);
    elF.textContent = 'f(x₀) = ' + f0.toFixed(4);
    elErr.textContent = 'error = ' + signed(fit.yhat - f0, 4);
    plot.render();
  }

  elX0.addEventListener('input', render);
  elSpan.addEventListener('input', render);
  elDeg.addEventListener('change', render);
  elA.addEventListener('click', function () {
    elX0.value = String(M.x0A); render();
  });
  elB.addEventListener('click', function () {
    elX0.value = String(M.x0B); render();
  });
  render();
})();
