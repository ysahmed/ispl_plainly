/* ==========================================================================
   shrink-geometry.js — Chapter 6, §6.2.2: the geometry of shrinkage
   (ISLP Figure 6.7).

   Two predictors only, so everything can be drawn.  The red ellipses are
   contours of the RSS: the innermost is the least-squares optimum, and the
   RSS grows as you move away from it.  The blue region is the constraint
   set the penalty imposes — a diamond for the lasso (|β₁|+|β₂| ≤ s), a
   circle for the ridge (β₁²+β₂² ≤ s).  The shrinkage estimate is the point
   where the innermost expanding RSS ellipse first touches the constraint
   region.  Drag the slider to change the budget s and watch the touch
   point slide along the constraint — and note how the lasso's diamond
   corners let it zero a coefficient, which the circle can never do.
   ========================================================================== */
(function () {
  'use strict';
  var c = document.getElementById('sg-canvas');
  if (!c || typeof Plot === 'undefined' || typeof Stats === 'undefined') return;

  var C = window.CH03_CREDIT;
  if (!C) return;
  // two predictors: Limit and Rating (correlated 0.997 on Credit), which is
  // the pair the book's shrinkage story leans on
  var X1 = C.limit, X2 = C.rating, y = C.balance, n = y.length;
  var pre = Stats.prepare([X1, X2], y);
  var Z = pre.Z, yc = pre.y;

  // least-squares optimum in the standardised two-predictor space
  var Xd = [];
  for (var i = 0; i < n; i++) Xd.push([1, Z[i][0], Z[i][1]]);
  var ols = Stats.ols(Xd, yc);
  var b1 = ols.beta[1], b2 = ols.beta[2];
  var rssMin = ols.rss;

  var state = { s: 0.6, mode: 'lasso' };

  // RSS at (u,v):  RSS(β) = RSS_ols + (β − β_ols)ᵀ ZᵀZ (β − β_ols)
  var cp = Stats.crossprod(Z, yc);
  function rssAt(u, v) {
    var d1 = u - b1, d2 = v - b2, G = cp.G;
    return rssMin + G[0][0] * d1 * d1 + 2 * G[0][1] * d1 * d2 + G[1][1] * d2 * d2;
  }

  var plot = new Plot(c, {
    range: { xmin: -3, xmax: 3.4, ymin: -3, ymax: 3.4 },
    height: 360, xlabel: 'β₁  (Limit, standardised)', ylabel: 'β₂  (Rating, standardised)',
    draw: function (p) {
      p.axes();
      var s = state.s, m = state.mode;

      // RSS contours (red ellipses) — a handful of levels above the minimum
      var levels = [rssMin * 1.02, rssMin * 1.15, rssMin * 1.5, rssMin * 3, rssMin * 8];
      levels.forEach(function (lev) {
        var pts = [];
        for (var t = 0; t <= 120; t++) {
          var th = t / 120 * 2 * Math.PI;
          // find the radius along th where RSS(β_ols + r·dir) = lev
          var dx = Math.cos(th), dy = Math.sin(th);
          var a = cp.G[0][0] * dx * dx + 2 * cp.G[0][1] * dx * dy + cp.G[1][1] * dy * dy;
          var r = Math.sqrt(Math.max(0, (lev - rssMin) / a));
          pts.push([b1 + r * dx, b2 + r * dy]);
        }
        p.line(pts.concat([pts[0]]), { color: p.colors.accent2, width: 1, alpha: 0.55 });
      });

      // constraint region (blue fill): diamond or circle of radius s
      var cpts = [];
      for (var t2 = 0; t2 < 160; t2++) {          // strict <: k must stay <= 3
        var th2 = t2 / 160 * 2 * Math.PI;
        if (m === 'lasso') {
          // |β₁|+|β₂| = s  →  parametric diamond
          var seg = th2 * 2 / Math.PI;         // 0..4
          var k = Math.floor(seg), f = seg - k;
          var corners = [[s, 0], [0, s], [-s, 0], [0, -s], [s, 0]];
          var A = corners[k], B = corners[k + 1];
          cpts.push([A[0] + (B[0] - A[0]) * f, A[1] + (B[1] - A[1]) * f]);
        } else {
          cpts.push([s * Math.cos(th2), s * Math.sin(th2)]);
        }
      }
      p.points(cpts, { color: p.colors.accent, alpha: 0.12, r: 3 });
      p.line(cpts.concat([cpts[0]]), { color: p.colors.accent, width: 2 });

      // the shrinkage estimate: first touching point of an RSS ellipse and
      // the constraint set.  Along the ray from the origin through the
      // unconstrained-scaled direction; solved by scanning.
      var hit = touchingPoint(m, s, b1, b2, cp.G, rssMin);
      p.dot(b1, b2, { color: p.colors.fg, r: 5 });
      p.text('least squares', b1, b2, { color: p.colors.fg, align: 'left', base: 'bottom', font: '11px system-ui, sans-serif' });
      if (hit) {
        p.dot(hit[0], hit[1], { color: p.colors.accent2, r: 6, ring: p.colors.surface, ringWidth: 2 });
        p.line([[b1, b2], [hit[0], hit[1]]], { color: p.colors.accent2, dash: [4, 3], width: 1.5 });
      }
    }
  });

  // find the feasible point with the smallest RSS by scanning the boundary
  // (the optimum always lies on the boundary for s small enough)
  function touchingPoint(mode, s, b1, b2, G, rssMin) {
    var best = null, bestR = Infinity;
    for (var t = 0; t < 400; t++) {                // strict <: k must stay <= 3
      var th = t / 400 * 2 * Math.PI, u, v;
      if (mode === 'lasso') {
        // diamond boundary param by angle
        var seg = th * 2 / Math.PI, k = Math.floor(seg), f = seg - k;
        var corners = [[s, 0], [0, s], [-s, 0], [0, -s], [s, 0]];
        u = corners[k][0] + (corners[k + 1][0] - corners[k][0]) * f;
        v = corners[k][1] + (corners[k + 1][1] - corners[k][1]) * f;
      } else {
        u = s * Math.cos(th); v = s * Math.sin(th);
      }
      var r = rssAt(u, v);
      if (r < bestR) { bestR = r; best = [u, v]; }
    }
    return best;
  }

  /* ---------------------------------------------------------- interaction */
  var slider = document.getElementById('sg-s');
  var elS = document.getElementById('sg-sread');
  var elRss = document.getElementById('sg-rss');
  var elZero = document.getElementById('sg-zero');
  var btnL = document.getElementById('sg-lasso');
  var btnR = document.getElementById('sg-ridge');

  function update() {
    plot.render();
    var hit = touchingPoint(state.mode, state.s, b1, b2, cp.G, rssMin);
    if (elS) elS.innerHTML = 'budget s = <b>' + state.s.toFixed(2) + '</b>';
    if (elRss && hit) {
      elRss.innerHTML = 'RSS here <b>' + Math.round(rssAt(hit[0], hit[1])).toLocaleString('en-US') +
        '</b> vs least squares ' + Math.round(rssMin).toLocaleString('en-US');
    }
    if (elZero && hit) {
      var zeroed = [];
      if (Math.abs(hit[0]) < 1e-9) zeroed.push('β₁');
      if (Math.abs(hit[1]) < 1e-9) zeroed.push('β₂');
      elZero.innerHTML = zeroed.length
        ? 'zeroed: <b>' + zeroed.join(' and ') + '</b> — the diamond corner lets it'
        : 'no coefficient is exactly zero here';
    }
  }
  function setS(v) { state.s = v; if (slider) slider.value = String(v); update(); }
  if (slider) slider.addEventListener('input', function () { setS(+slider.value); });
  function setMode(m) {
    state.mode = m;
    if (btnL) btnL.setAttribute('aria-pressed', String(m === 'lasso'));
    if (btnR) btnR.setAttribute('aria-pressed', String(m === 'ridge'));
    update();
  }
  if (btnL) btnL.addEventListener('click', function () { setMode('lasso'); });
  if (btnR) btnR.addEventListener('click', function () { setMode('ridge'); });

  setS(0.6);
})();
