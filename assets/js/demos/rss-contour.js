/* Demo — RSS is a surface, least squares is the bottom of it (§3.2)
   Colours are RSS for every (β₀, β₁) pair — darker is worse, and the
   stepped bands are contour lines of equal RSS.  Press "descend" to watch
   coordinate descent walk downhill from wherever you are standing. */
(function () {
  'use strict';
  var cv = document.getElementById('cv-contour');
  if (!cv || typeof Plot === 'undefined' || typeof Stats === 'undefined') return;

  var d = window.CH03_ADV;
  var n = d.tv.length, sx = 0, sy = 0, sxx = 0, sxy = 0, syy = 0;
  for (var i = 0; i < n; i++) {
    sx += d.tv[i]; sy += d.sales[i];
    sxx += d.tv[i] * d.tv[i]; sxy += d.tv[i] * d.sales[i];
    syy += d.sales[i] * d.sales[i];
  }

  function rss(b0, b1) {
    return syy - 2 * b0 * sy - 2 * b1 * sxy + n * b0 * b0 +
      2 * b0 * b1 * sx + b1 * b1 * sxx;
  }

  var X = [];
  for (i = 0; i < n; i++) X.push([1, d.tv[i]]);
  var best = Stats.ols(X, d.sales);
  var B0 = best.beta[0], B1 = best.beta[1], RMIN = best.rss;

  var B0MIN = -2, B0MAX = 14, B1MIN = -0.02, B1MAX = 0.12;
  var state = { b0: 13, b1: -0.01, steps: 0, anim: false };

  var elRss = document.getElementById('rc-rss');
  var elBest = document.getElementById('rc-best');
  var elSteps = document.getElementById('rc-steps');
  var sB0 = document.getElementById('rc-b0');
  var sB1 = document.getElementById('rc-b1');

  function readouts() {
    var r = rss(state.b0, state.b1);
    elRss.innerHTML = 'RSS here = <b>' + Math.round(r).toLocaleString() + '</b>' +
      ' (' + (r / RMIN).toFixed(1) + '× the minimum)';
    elBest.innerHTML = 'bottom: β̂₀ = <b>' + B0.toFixed(2) + '</b>, β̂₁ = <b>' +
      B1.toFixed(4) + '</b>, RSS = <b>' + Math.round(RMIN).toLocaleString() + '</b>';
    elSteps.innerHTML = 'sweeps taken: <b>' + state.steps + '</b>';
  }

  // exact level set of a quadratic:  (β − β̂)' Q (β − β̂) = c,  Q = XᵀX
  function ellipse(c) {
    var pts = [], k;
    for (k = 0; k <= 240; k++) {
      var th = k / 240 * 2 * Math.PI;
      var ux = Math.cos(th), uy = Math.sin(th);
      var q = n * ux * ux + 2 * ux * uy * sx + sxx * uy * uy;
      var r = Math.sqrt(c / q);
      pts.push([B0 + r * ux, B1 + r * uy]);
    }
    return pts;
  }

  var LEVELS = [400, 1500, 5000, 15000, 45000, 120000];

  var plot = new Plot(cv, {
    range: { xmin: B0MIN, xmax: B0MAX, ymin: B1MIN, ymax: B1MAX },
    height: 380,
    xlabel: 'intercept β₀',
    ylabel: 'slope β₁',
    draw: function (p) {
      var col = p.colors;
      p.axes();

      // heat: RSS, log-scaled and quantised into 9 bands so the colour
      // steps read as contour lines
      var GX = 72, GY = 54;
      var lo = rss(B0, B1), hi = rss(B0MIN, B1MIN);
      hi = Math.max(hi, rss(B0MIN, B1MAX), rss(B0MAX, B1MIN), rss(B0MAX, B1MAX));
      var lmin = Math.log(Math.max(1, lo)), lmax = Math.log(hi);
      var dx = (B0MAX - B0MIN) / GX, dy = (B1MAX - B1MIN) / GY;
      for (var gx = 0; gx < GX; gx++) {
        for (var gy = 0; gy < GY; gy++) {
          var b0c = B0MIN + (gx + 0.5) * dx;
          var b1c = B1MIN + (gy + 0.5) * dy;
          var t = (Math.log(Math.max(1, rss(b0c, b1c))) - lmin) / (lmax - lmin);
          t = Math.max(0, Math.min(1, t));
          var band = Math.round(t * 9) / 9;                   // quantised → contours
          p.cell(B0MIN + gx * dx, B0MIN + (gx + 1) * dx,
                 B1MIN + gy * dy, B1MIN + (gy + 1) * dy,
                 col.accent2, 0.06 + band * 0.62);            // floor stays pale
        }
      }

      // exact ellipses of equal RSS
      LEVELS.forEach(function (c, idx) {
        p.line(ellipse(c), { color: idx < 2 ? col.fg : col.axis,
          width: idx < 2 ? 1.6 : 1.2 });
      });

      // the minimum
      p.dot(B0, B1, { r: 6.5, color: col.accent2, ring: col.surface, ringWidth: 2 });
      p.text('least squares', B0 - 0.4, B1 - 0.016,
        { color: col.accent2, align: 'right', font: '11.5px system-ui' });

      // where you are
      p.dot(state.b0, state.b1, { r: 6, color: col.fg, ring: col.surface, ringWidth: 2.2 });
      p.line([[state.b0, B1], [B0, B1]], { color: col.axis, width: 1, dash: [3, 3] });
      p.line([[B0, state.b1], [B0, B1]], { color: col.axis, width: 1, dash: [3, 3] });

      readouts();
    }
  });

  function syncSliders() {
    sB0.value = state.b0;
    sB1.value = state.b1;
  }

  sB0.addEventListener('input', function () {
    state.b0 = parseFloat(this.value);
    state.steps = 0;
    plot.render();
  });
  sB1.addEventListener('input', function () {
    state.b1 = parseFloat(this.value);
    state.steps = 0;
    plot.render();
  });

  // one coordinate-descent sweep: take the best β₀ for the current β₁,
  // then the best β₁ for the new β₀
  function sweep() {
    var b0 = state.b0, b1 = state.b1;
    var nb0 = b0 + (sy - n * b0 - b1 * sx) / n;
    var nb1 = b1 + (sxy - nb0 * sx - b1 * sxx) / sxx;
    state.b0 = nb0;
    state.b1 = nb1;
    state.steps++;
    return Math.abs(nb0 - b0) > 1e-6 || Math.abs(nb1 - b1) > 1e-9;
  }

  document.getElementById('rc-descend').addEventListener('click', function () {
    if (state.anim) return;
    state.anim = true;
    state.steps = 0;
    var self = this;
    self.setAttribute('aria-pressed', 'true');
    (function frame() {
      var moving = sweep();
      syncSliders();
      plot.render();
      if (moving && state.steps < 160) {
        requestAnimationFrame(frame);
      } else {
        state.anim = false;
        self.setAttribute('aria-pressed', 'false');
        plot.render();
      }
    })();
  });

  syncSliders();
  readouts();
})();
