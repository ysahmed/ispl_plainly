/* ==========================================================================
   hd-lasso.js — Chapter 6, §6.4.3: how badly the lasso does once the number
   of features swamps the number of rows (the setting of ISLP Figure 6.24).

   Figure 6.24 sweeps three tuning parameters and draws a boxplot per one.
   We do something a practitioner would actually do instead: for each of 100
   replicates, ten-fold cross-validation inside the training set picks λ,
   and we then record the degrees of freedom it landed on (the count of
   non-zero coefficients), the test MSE on 1,000 fresh rows, and the test
   MSE of the intercept-only model as a reference.  All of it comes from
   CH06_HD; nothing here is transcribed.
   ========================================================================== */
(function () {
  'use strict';
  var H = window.CH06_HD;
  var elP = document.getElementById('hd2-p');
  var elPread = document.getElementById('hd2-pread');
  var elWhich = document.getElementById('hd2-which');
  var elDf = document.getElementById('hd2-df');
  var elMse = document.getElementById('hd2-mse');
  var elBeat = document.getElementById('hd2-beat');
  var canvases = [document.getElementById('hd2-c20'),
                  document.getElementById('hd2-c50'),
                  document.getElementById('hd2-c2000')];
  if (!H || !elP || !canvases[0] || !canvases[1] || !canvases[2] ||
      typeof Plot === 'undefined') return;

  /* linear-interpolation quantile, the same definition numpy's percentile
     uses, so the browser's medians and the checked run agree exactly */
  function quant(a, q) {
    var s = a.slice().sort(function (x, y) { return x - y; });
    var h = (s.length - 1) * q, lo = Math.floor(h), hi = Math.ceil(h);
    return s[lo] + (h - lo) * (s[hi] - s[lo]);
  }
  function fmt(v) {
    return v.toFixed(2).replace(/\.?0+$/, '');
  }

  var PS = [20, 50, 2000];
  var state = { i: 1 };

  var series = PS.map(function (p) {
    var g = H.groups[String(p)] || [];
    var df = [], mse = [], nm = [], lo2 = Infinity, hi2 = -Infinity, k;
    for (k = 0; k < g.length; k++) {
      df.push(g[k][0]); mse.push(g[k][1]); nm.push(g[k][2]);
      if (g[k][1] < lo2) lo2 = g[k][1];
      if (g[k][1] > hi2) hi2 = g[k][1];
      if (g[k][2] < lo2) lo2 = g[k][2];
      if (g[k][2] > hi2) hi2 = g[k][2];
    }
    var beat = 0;
    for (k = 0; k < g.length; k++) if (mse[k] <= nm[k]) beat++;
    /* median test MSE at each distinct degrees-of-freedom value */
    var byDf = {};
    for (k = 0; k < g.length; k++) {
      (byDf[g[k][0]] = byDf[g[k][0]] || []).push(mse[k]);
    }
    var curve = Object.keys(byDf).map(Number).sort(function (a, b) { return a - b; })
      .map(function (d) { return [d, quant(byDf[d], 0.5)]; });
    var dmin = Math.min.apply(null, df), dmax = Math.max.apply(null, df);
    return {
      p: p, rows: g, n: g.length, signal: Math.min(20, p),
      medDf: quant(df, 0.5), q1: quant(df, 0.25), q3: quant(df, 0.75),
      medMse: quant(mse, 0.5), medNull: quant(nm, 0.5), beat: beat,
      curve: curve, dmin: dmin, dmax: dmax, lo: lo2, hi: hi2
    };
  });

  /* one shared vertical scale, so the three panels can be compared by eye */
  var ylo = Infinity, yhi = -Infinity;
  series.forEach(function (s) { ylo = Math.min(ylo, s.lo); yhi = Math.max(yhi, s.hi); });
  ylo = Math.floor(ylo * 10) / 10 - 0.1;
  yhi = Math.ceil(yhi * 10) / 10 + 0.1;

  var plots = series.map(function (s, ix) {
    var span = (s.dmax - s.dmin) || 1;
    return new Plot(canvases[ix], {
      range: { xmin: s.dmin - span * 0.06, xmax: s.dmax + span * 0.06,
               ymin: ylo, ymax: yhi },
      height: 230,
      xlabel: 'degrees of freedom (non-zero coefficients)',
      ylabel: 'test MSE',
      draw: function (pp) {
        var live = ix === state.i;
        var col = live ? '#dc2626' : '#9aa4b2';
        var jit = Math.min(0.018 * span, 0.4);   // less than the gap between df values
        var pts = [], k;
        for (k = 0; k < s.rows.length; k++) {
          pts.push([s.rows[k][0] + ((k % 5) - 2) * jit, s.rows[k][1]]);
        }
        pp.points(pts, { color: col, r: live ? 3.1 : 2.4,
                         alpha: live ? 0.85 : 0.4 });
        pp.hline(s.medNull, { color: live ? '#16a34a' : '#9aa4b2',
                              width: 1.6, dash: [5, 4] });
        pp.line(s.curve, { color: col, width: live ? 2 : 1.4,
                           dash: live ? [] : [2, 3] });
        pp.text('p = ' + s.p + ' features', pp.range.xmin + span * 0.02,
                pp.range.ymax - (yhi - ylo) * 0.07,
                { color: col, base: 'top', font: live ? 'bold 12px system-ui, sans-serif'
                                                      : '12px system-ui, sans-serif' });
      }
    });
  });

  function update() {
    plots.forEach(function (pp) { pp.render(); });
    var s = series[state.i];
    if (elPread) elPread.innerHTML = 'p = <b>' + s.p + '</b>';
    if (elWhich) {
      elWhich.innerHTML = 'p = <b>' + s.p + '</b> features, <b>' + s.signal +
        '</b> of them really in the model · <b>' + s.n + '</b> replicates';
    }
    if (elDf) {
      elDf.innerHTML = 'ten-fold CV&rsquo;s pick: median df <b>' + fmt(s.medDf) +
        '</b> (middle half ' + fmt(s.q1) + '&thinsp;–&thinsp;' + fmt(s.q3) +
        ') out of ' + s.p;
    }
    if (elMse) {
      elMse.innerHTML = 'test MSE <b>' + s.medMse.toFixed(3) +
        '</b> · intercept-only model <b>' + s.medNull.toFixed(3) + '</b>';
    }
    if (elBeat) {
      elBeat.innerHTML = 'the lasso beats the intercept-only model in <b>' + s.beat +
        '</b> of ' + s.n + ' replicates';
    }
  }
  function setI(v) {
    state.i = Math.max(0, Math.min(PS.length - 1, Math.round(v)));
    elP.value = String(state.i);
    update();
  }
  elP.addEventListener('input', function () { setI(+elP.value); });
  setI(1);

  window.__HDL = { series: series, PS: PS, ylo: ylo, yhi: yhi };
})();
