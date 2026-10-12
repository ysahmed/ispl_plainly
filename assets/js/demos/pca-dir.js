/* ==========================================================================
   pca-dir.js — Chapter 6, §6.3.1: the first principal component direction
   (ISLP Figures 6.14 and 6.15).

   The book draws a line through a cloud of cities and says it is the line
   that minimises the sum of the squared perpendicular distances — and that
   the projected points spread out further along it than along any other
   line.  Both statements are the same statement, and both are checkable, so
   this demo hands you the line: drag the angle and watch the two numbers.

   The cities are ours (CH06_POPAD, seed 9061), not the book's — its 100
   regions are not published.  The direction is the phi of eq. (6.19): the
   unit-length combination of the raw centred columns with the largest
   projection variance.

   Both panels keep one data unit equal to one pixel in both directions, so
   the dashed drop lines really are perpendicular to the line.
   ========================================================================== */
(function () {
  'use strict';
  var cS = document.getElementById('pd-scatter');
  var cR = document.getElementById('pd-rot');
  if (!cS || !cR || typeof Plot === 'undefined') return;
  var D = window.CH06_POPAD;
  if (!D || !D.pop || !D.ad) return;

  var pop = D.pop, ad = D.ad, n = pop.length, i;

  /* ------------------------------------------------ moments and PC1 */
  var mp = 0, ma = 0;
  for (i = 0; i < n; i++) { mp += pop[i]; ma += ad[i]; }
  mp /= n; ma /= n;

  var vp = 0, va = 0, cv = 0, rmax = 0;
  for (i = 0; i < n; i++) {
    var dp = pop[i] - mp, da = ad[i] - ma;
    vp += dp * dp; va += da * da; cv += dp * da;
    rmax = Math.max(rmax, Math.sqrt(dp * dp + da * da));
  }
  vp /= n; va /= n; cv /= n;                  // divide by n, ISLP eq. (6.6)
  var tr = vp + va;                            // trace = total variance

  // eigenvalues of a 2x2 symmetric matrix, closed form — no library needed
  var disc = Math.sqrt((vp - va) * (vp - va) / 4 + cv * cv);
  var l1 = tr / 2 + disc, l2 = tr / 2 - disc;  // l1 >= l2 >= 0

  // the eigenvector for l1, normalised to length 1 (the constraint in 6.19)
  var phi = Math.abs(cv) > 1e-12 ? [cv, l1 - vp] : (vp >= va ? [1, 0] : [0, 1]);
  var pl = Math.sqrt(phi[0] * phi[0] + phi[1] * phi[1]);
  phi = [phi[0] / pl, phi[1] / pl];
  if (phi[0] < 0) { phi[0] = -phi[0]; phi[1] = -phi[1]; }

  var TH1 = Math.atan2(phi[1], phi[0]);        // the PC1 angle, radians
  var SS1 = n * l2;                            // smallest sum of squared drops
  var SD1 = Math.sqrt(l1);                     // widest spread along a line
  var R = Math.ceil(rmax) + 1;

  // variance of the projections onto a unit direction (cos t, sin t)
  function alongVar(t) {
    var cs = Math.cos(t), sn = Math.sin(t);
    return vp * cs * cs + 2 * cv * cs * sn + va * sn * sn;
  }
  function ssOff(t) { return n * (tr - alongVar(t)); }   // sum of squared drops

  var state = { t: TH1 };

  /* -------------------------------- equal data units per pixel on both axes */
  function equalRange(p, x0, x1, y0, y1) {
    var pad = p.o.pad;
    var iw = p.w - pad.l - pad.r, ih = p.h - pad.t - pad.b;
    if (!(iw > 4) || !(ih > 4)) return { xmin: x0, xmax: x1, ymin: y0, ymax: y1 };
    var cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    var hw = (x1 - x0) / 2, hh = (y1 - y0) / 2;
    hw = Math.max(hw, hh * iw / ih);
    hh = Math.max(hh, hw * ih / iw);
    var r = { xmin: cx - hw, xmax: cx + hw, ymin: cy - hh, ymax: cy + hh };
    if (r.ymin < y0) { r.ymax += y0 - r.ymin; r.ymin = y0; }   // span unchanged
    return r;
  }

  function centred() {
    var out = [];
    for (var k = 0; k < n; k++) out.push([pop[k] - mp, ad[k] - ma]);
    return out;
  }
  var cent = centred();
  var plo = Math.min.apply(null, pop), phiX = Math.max.apply(null, pop);
  var alo = Math.min.apply(null, ad), ahi = Math.max.apply(null, ad);

  /* ----------------------------------------------------------- left panel */
  var scatter = new Plot(cS, {
    height: 330,
    xlabel: 'Population', ylabel: 'Ad spending',
    draw: function (p) {
      p.setRange(equalRange(p, plo - 3, phiX + 3, 0, ahi + 6));
      p.axes();

      var cs = Math.cos(state.t), sn = Math.sin(state.t);
      var showPC1 = Math.abs(state.t - TH1) > 0.009;   // > ~0.5 degrees

      // every city's perpendicular drop to the line (book's Figure 6.15)
      var drops = [];
      for (var k = 0; k < n; k++) {
        var t = cent[k][0] * cs + cent[k][1] * sn;
        drops.push([[mp + t * cs, ma + t * sn], [pop[k], ad[k]]]);
      }
      drops.forEach(function (seg) {
        p.line(seg, { color: p.colors.axis, width: 1, dash: [3, 3] });
      });

      // the PC1 line, as a reference while you are somewhere else
      if (showPC1) {
        var c1 = Math.cos(TH1), s1 = Math.sin(TH1);
        p.line([[mp - 60 * c1, ma - 60 * s1], [mp + 60 * c1, ma + 60 * s1]],
          { color: p.colors.accent2, width: 1.5, dash: [7, 5] });
      }

      // the line you are holding
      p.line([[mp - 60 * cs, ma - 60 * sn], [mp + 60 * cs, ma + 60 * sn]],
        { color: p.colors.accent, width: 2.2 });

      p.points(pop.map(function (v, k) { return [v, ad[k]]; }),
        { color: p.colors.fg, alpha: 0.75, r: 3.4 });
      p.dot(mp, ma, { color: p.colors.good, r: 4 });
      p.text('mean', mp, ma, { color: p.colors.good, align: 'left', base: 'top', font: '11px system-ui, sans-serif' });
      if (showPC1) {
        p.text('PC1', mp + 46 * Math.cos(TH1), ma + 46 * Math.sin(TH1),
          { color: p.colors.accent2, align: 'right', base: 'bottom', font: '11px system-ui, sans-serif' });
      }
    }
  });

  /* ---------------------------------------------------------- right panel */
  var rot = new Plot(cR, {
    height: 330,
    xlabel: 'distance along the line', ylabel: 'distance off the line',
    draw: function (p) {
      p.setRange(equalRange(p, -R, R, -R, R));
      p.axes();

      var cs = Math.cos(state.t), sn = Math.sin(state.t);
      var pts = [], acc = 0;
      for (var k = 0; k < n; k++) {
        var along = cent[k][0] * cs + cent[k][1] * sn;
        var off = -cent[k][0] * sn + cent[k][1] * cs;
        pts.push([along, off]);
        acc += along * along;
      }
      var sd = Math.sqrt(acc / n);

      p.cell(-sd, sd, p.range.ymin, p.range.ymax, p.colors.accent, 0.10);
      p.vline(sd, { color: p.colors.accent, width: 1, dash: [4, 3] });
      p.vline(-sd, { color: p.colors.accent, width: 1, dash: [4, 3] });
      p.hline(0, { color: p.colors.axis, width: 1.2 });
      p.points(pts, { color: p.colors.accent, alpha: 0.75, r: 3.4 });
      p.text('±1 sd', sd, 0, { color: p.colors.accent, align: 'left', base: 'bottom', font: '11px system-ui, sans-serif' });
    }
  });

  /* ---------------------------------------------------------- interaction */
  var slider = document.getElementById('pd-ang');
  var btnSnap = document.getElementById('pd-snap');
  var elAng = document.getElementById('pd-angle');
  var elAlong = document.getElementById('pd-along');
  var elPerp = document.getElementById('pd-perp');
  var elShare = document.getElementById('pd-share');
  var elLoad = document.getElementById('pd-load');

  function update() {
    scatter.render();
    rot.render();
    var deg = state.t * 180 / Math.PI;
    var sd = Math.sqrt(alongVar(state.t));
    var pct = ssOff(state.t) / SS1 * 100;
    if (elAng) elAng.innerHTML = 'angle <b>' + deg.toFixed(1) + '°</b> from the pop axis';
    if (elAlong) {
      elAlong.innerHTML = 'spread along the line: <b>' + sd.toFixed(2) + '</b> · widest possible ' + SD1.toFixed(2);
    }
    if (elPerp) {
      elPerp.innerHTML = 'off the line: <b>' + pct.toFixed(0) + '%</b> of the smallest possible';
    }
    if (elShare) {
      elShare.innerHTML = 'PC1 keeps <b>' + (l1 / tr * 100).toFixed(1) + '%</b> of the variance · PC2 ' +
        (l2 / tr * 100).toFixed(1) + '%';
    }
    if (elLoad) {
      elLoad.innerHTML = 'PC1 loadings in pop/ad units: <b>' + phi[0].toFixed(3) + ', ' + phi[1].toFixed(3) + '</b>';
    }
  }

  if (slider) {
    slider.value = String(Math.round(TH1 * 180 / Math.PI * 10) / 10);
    state.t = (+slider.value) * Math.PI / 180;
    slider.addEventListener('input', function () {
      state.t = (+slider.value) * Math.PI / 180;
      update();
    });
  }
  if (btnSnap) {
    btnSnap.addEventListener('click', function () {
      var d = Math.round(TH1 * 180 / Math.PI * 10) / 10;
      state.t = d * Math.PI / 180;
      if (slider) slider.value = String(d);
      update();
    });
  }

  update();
})();
