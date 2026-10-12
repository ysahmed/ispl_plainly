/* ==========================================================================
   pls-dir.js — Chapter 6, §6.3.2: partial least squares against principal
   components on two predictors (ISLP Figure 6.21).

   Both directions are drawn as lines through the same 100-city cloud, so the
   whole comparison is one pair of slopes:

     PCR (dotted)  the first principal-component direction — it ignores the
                   response entirely, so it does not move when you change
                   anything about sales.  It is the same line demo 1 draws,
                   the phi of eq. (6.19) on the raw centred columns.

     PLS (solid)   each predictor weighted by its simple-regression
                   coefficient on the response, which after standardising
                   (§6.3.2) is just its correlation with sales — then carried
                   back into pop/ad units by multiplying each weight by the
                   column's own standard deviation, so both lines live in the
                   same picture.

   The slider moves advertising's weight in the sales formula.  At the
   default, population predicts sales better than ad spend does, and PLS
   answers by tilting *away* from ad — the book's sentence, "less change in
   the ad dimension per unit change in the pop dimension".  Push the weight
   past the crossing and PLS overtakes PCR, which is the other half of the
   story: the supervised direction follows the response, not the spread.
   ========================================================================== */
(function () {
  'use strict';
  var c = document.getElementById('pls-canvas');
  if (!c || typeof Plot === 'undefined') return;
  var D = window.CH06_POPAD;
  if (!D || !D.pop || !D.ad || !D.noise) return;

  var pop = D.pop, ad = D.ad, noise = D.noise, n = pop.length, i;
  var W_LO = 0, W_HI = 1.2, W_DEF = 0.2;

  /* ----------------------------------------------- moments of the columns */
  var mp = 0, ma = 0;
  for (i = 0; i < n; i++) { mp += pop[i]; ma += ad[i]; }
  mp /= n; ma /= n;
  var vp = 0, va = 0, cvv = 0;
  for (i = 0; i < n; i++) {
    var dp = pop[i] - mp, da = ad[i] - ma;
    vp += dp * dp; va += da * da; cvv += dp * da;
  }
  vp /= n; va /= n; cvv /= n;
  var sp = Math.sqrt(vp), sa = Math.sqrt(va);
  var zp = [], za = [];
  for (i = 0; i < n; i++) {
    zp.push((pop[i] - mp) / sp);
    za.push((ad[i] - ma) / sa);
  }
  var rho = cvv / (sp * sa);

  /* --------------------------------------------------------- the two lines */
  // PCR: the unit eigenvector of the covariance matrix with the larger
  // eigenvalue — the closest line to the cloud, eq. (6.19).
  var tr = vp + va;
  var disc = Math.sqrt((vp - va) * (vp - va) / 4 + cvv * cvv);
  var l1 = tr / 2 + disc, l2 = tr / 2 - disc;
  var pcr = Math.abs(cvv) > 1e-12 ? [cvv, l1 - vp] : (vp >= va ? [1, 0] : [0, 1]);
  var pln = Math.sqrt(pcr[0] * pcr[0] + pcr[1] * pcr[1]);
  pcr = [pcr[0] / pln, pcr[1] / pln];
  if (pcr[0] < 0) { pcr[0] = -pcr[0]; pcr[1] = -pcr[1]; }
  var PCR_SLOPE = pcr[1] / pcr[0];

  // sales at weight w on (standardised) ad — z() is built from these 100 rows,
  // and noise is the stored draw, exactly as the generator's header describes
  function sales(w) {
    var s = [];
    for (var q = 0; q < n; q++) s.push(0.9 * zp[q] + w * za[q] + 0.6 * noise[q]);
    return s;
  }

  function plsAt(w) {
    var s = sales(w), ms = 0, q;
    for (q = 0; q < n; q++) ms += s[q];
    ms /= n;
    var ss = 0, cp = 0, ca = 0;
    for (q = 0; q < n; q++) {
      var ds = s[q] - ms;
      ss += ds * ds; cp += ds * zp[q]; ca += ds * za[q];
    }
    ss = Math.sqrt(ss / n);
    // corr(sales, pop) and corr(sales, ad) — z-pop and z-ad already have sd 1
    var rp = cp / (n * ss), ra = ca / (n * ss);
    // simple-regression coefficients on the standardised columns, then back
    // into pop/ad units: a step of one sd in pop is sp population units
    var dir = [rp * sp, ra * sa];
    var dl = Math.sqrt(dir[0] * dir[0] + dir[1] * dir[1]);
    dir = [dir[0] / dl, dir[1] / dl];
    if (dir[0] < 0) { dir[0] = -dir[0]; dir[1] = -dir[1]; }
    return { rp: rp, ra: ra, dir: dir, slope: dir[1] / dir[0],
             corrsales: ss, ms: ms };
  }

  var state = { w: W_DEF };

  /* --------------------------------------------------------------- the plot */
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

  var pts = [];
  for (i = 0; i < n; i++) pts.push([pop[i], ad[i]]);

  var plot = new Plot(c, {
    range: { xmin: 14, xmax: 70, ymin: 0, ymax: 54 },
    height: 340, xlabel: 'Population', ylabel: 'Ad spending',
    draw: function (p) {
      var r = equalRange(p, 14, 70, 0, 50);
      p.setRange(r);
      p.axes();
      p.points(pts, { color: p.colors.fg, alpha: 0.7, r: 3.4 });

      var W = r.xmax - r.xmin, H = r.ymax - r.ymin;
      function through(slope) {
        var big = Math.max(W, H) * 2;
        return [[mp - big, ma - slope * big], [mp + big, ma + slope * big]];
      }

      // PCR first, dotted, so the solid PLS line always reads on top of it
      p.line(through(PCR_SLOPE), { color: p.colors.accent, width: 2, dash: [7, 5] });
      var now = plsAt(state.w);
      p.line(through(now.slope), { color: p.colors.good, width: 2.6 });

      p.dot(mp, ma, { color: p.colors.fg, r: 3.6 });

      // legend, parked in the empty bottom-right corner of this cloud
      var lx0 = r.xmax - 0.21 * W, lx1 = r.xmax - 0.12 * W;
      var ly1 = r.ymin + 0.055 * H, ly2 = r.ymin + 0.125 * H;
      p.line([[lx0, ly1], [lx1, ly1]], { color: p.colors.good, width: 2.6 });
      p.text('first PLS direction', r.xmax - 0.105 * W, ly1,
        { color: p.colors.good, align: 'left', base: 'middle', font: '11px system-ui, sans-serif' });
      p.line([[lx0, ly2], [lx1, ly2]], { color: p.colors.accent, width: 2, dash: [7, 5] });
      p.text('first PC direction', r.xmax - 0.105 * W, ly2,
        { color: p.colors.accent, align: 'left', base: 'middle', font: '11px system-ui, sans-serif' });
    }
  });

  /* ---------------------------------------------------------- interaction */
  var slider = document.getElementById('pls-w');
  var elW = document.getElementById('pls-wread');
  var elR = document.getElementById('pls-r');
  var elDir = document.getElementById('pls-dir');
  var elSlope = document.getElementById('pls-slope');

  function f3(v) { return (v < 0 ? '−' : '') + Math.abs(v).toFixed(3); }
  function f2(v) { return (v < 0 ? '−' : '') + Math.abs(v).toFixed(2); }

  function update() {
    plot.render();
    var now = plsAt(state.w);
    if (elW) elW.innerHTML = 'weight on ad in sales: <b>' + state.w.toFixed(2) + '</b>';
    if (elR) {
      elR.innerHTML = 'corr(sales, pop) = <b>' + f2(now.rp) +
        '</b> · corr(sales, ad) = <b>' + f2(now.ra) + '</b>';
    }
    if (elDir) {
      elDir.innerHTML = 'PLS direction <b>(' + f3(now.dir[0]) + ', ' + f3(now.dir[1]) +
        ')</b> · PC direction (' + f3(pcr[0]) + ', ' + f3(pcr[1]) + ')';
    }
    if (elSlope) {
      elSlope.innerHTML = 'PLS slope <b>' + f2(now.slope) + '</b> · PC slope <b>' +
        f2(PCR_SLOPE) + '</b> — PLS is ' + (now.slope < PCR_SLOPE ? 'flatter' : 'steeper');
    }
  }
  function setW(v) {
    state.w = Math.max(W_LO, Math.min(W_HI, v));
    if (slider) slider.value = state.w.toFixed(2);
    update();
  }
  if (slider) slider.addEventListener('input', function () { setW(+slider.value); });

  setW(W_DEF);

  window.__PLS = { pcr: pcr, pcrSlope: PCR_SLOPE, rho: rho, mp: mp, ma: ma,
                   sdPop: sp, sdAd: sa,
                   at: function (w) { return plsAt(w); },
                   get: function () { return state.w; },
                   set: setW, wLo: W_LO, wHi: W_HI };
})();
