/* ==========================================================================
   step-wage.js — Chapter 7, §7.2: ISLP Figure 7.2's left panel.

   Cut the range of age into bins with the indicator columns of equation
   (7.4) and fit equation (7.5), which is ordinary least squares on those
   columns — so each bin's fitted value is that bin's own mean wage, and the
   confidence band is a different constant height in every bin.

   Left panel: the scatter, the stepped fit and its pointwise 2x standard
   error band, with the cutpoints drawn in.  Right panel: how many men fall
   in each bin, which is the whole reason the quantile cutpoints of the
   book's lab beat cutting the age range into equal widths.
   ========================================================================== */
(function () {
  'use strict';
  var cPlot = document.getElementById('sw-plot');
  var cBins = document.getElementById('sw-bins');
  if (!cPlot || !cBins || typeof Plot === 'undefined' || typeof Stats === 'undefined' ||
      typeof CH07_WAGE === 'undefined') return;

  var W = window.CH07_WAGE;
  var age = W.age.map(Number), y = W.wage.map(Number), n = y.length;
  var XMIN = 18, XMAX = 80, i;
  var scatter = age.map(function (a, r) { return [a, y[r]]; });

  var elK = document.getElementById('sw-k');
  var elMode = document.getElementById('sw-mode');
  var elKread = document.getElementById('sw-kread');
  var elCut = document.getElementById('sw-cut');
  var elRse = document.getElementById('sw-rse');
  var elR2 = document.getElementById('sw-r2');
  var elDf = document.getElementById('sw-df');
  var elLevel = document.getElementById('sw-level');
  if (!elK || !elMode) return;

  /* 'q' is what the book's lab does — pd.qcut(age, 4), cutpoints at the
     quartiles.  'w' cuts the same number of bins out of the age range at
     equal widths, which is what "5-year age groups" would do. */
  var mode = 'q';

  function cutsFor(k) {
    return mode === 'q' ? Stats.quantileCuts(age, k) : Stats.widthCuts(age, k);
  }

  /* Which bin does x fall in?  Equation (7.4) closes every interval on the
     left — c1 <= X < c2 — so the bin number is how many cutpoints x is at
     or above. */
  function binOf(v, cs) {
    var j = 0;
    while (j < cs.length && v >= cs[j]) j++;
    return j;
  }

  var cache = {};
  function fit() {
    var k = +elK.value, key = mode + ':' + k;
    if (cache[key]) return cache[key];
    var cs = cutsFor(k);
    var b = Stats.stepBasis(age, cs);
    var f = Stats.ols(Stats.design(b.cols, n), y);

    var level = [], half = [], count = [], sum = [], j;
    for (j = 0; j <= cs.length; j++) { count.push(0); sum.push(0); }
    for (i = 0; i < n; i++) { var bi = binOf(age[i], cs); count[bi]++; sum[bi] += y[i]; }

    for (j = 0; j <= cs.length; j++) {
      // the fitted level in bin j: beta_0 + beta_j, and the design row that
      // produced it is [1, 0, ..., 1, ..., 0] with the 1 in slot j
      level.push(f.beta[0] + (j ? f.beta[j] : 0));
      var varv = f.inv[0][0];
      if (j) varv += f.inv[j][j] + 2 * f.inv[0][j];
      half.push(2 * Math.sqrt(Math.max(0, varv) * f.sigma2));
    }

    var edges = [XMIN].concat(cs, [XMAX]);
    var out = {
      k: k, cuts: cs, edges: edges, level: level, half: half, count: count,
      mean: sum.map(function (s, j2) { return count[j2] ? s / count[j2] : 0; }),
      rse: f.rse, r2: f.r2, rss: f.rss, df: f.k
    };
    cache[key] = out;
    return out;
  }

  /* Points along a step function: two points per bin, so the joins between
     bins come out vertical rather than sloped. */
  function stepPts(cur, off) {
    var pts = [], j;
    for (j = 0; j < cur.level.length; j++) {
      pts.push([cur.edges[j], cur.level[j] + off]);
      pts.push([cur.edges[j + 1], cur.level[j] + off]);
    }
    return pts;
  }

  var plot = new Plot(cPlot, {
    range: { xmin: XMIN - 1, xmax: XMAX + 1, ymin: 0, ymax: 330 },
    height: 300, xlabel: 'Age', ylabel: 'Wage (thousands of dollars)',
    draw: function (p) {
      var cur = fit();
      p.axes();
      p.points(scatter, { color: p.colors.grid, alpha: 0.45, r: 2.1 });
      cur.cuts.forEach(function (c) {
        p.vline(c, { color: p.colors.axis, width: 1, dash: [3, 4] });
      });
      p.clip(function () {
        var up = stepPts(cur, 1), dn = stepPts(cur, -1).reverse(), c = p.ctx, r;
        c.fillStyle = p.colors.accent;
        c.globalAlpha = 0.13;
        c.beginPath();
        c.moveTo(p.xToPx(up[0][0]), p.yToPx(up[0][1]));
        for (r = 1; r < up.length; r++) c.lineTo(p.xToPx(up[r][0]), p.yToPx(up[r][1]));
        for (r = 0; r < dn.length; r++) c.lineTo(p.xToPx(dn[r][0]), p.yToPx(dn[r][1]));
        c.closePath();
        c.fill();
        c.globalAlpha = 1;
      });
      p.line(stepPts(cur, 1), { color: p.colors.accent2, width: 1.4, dash: [5, 4] });
      p.line(stepPts(cur, -1), { color: p.colors.accent2, width: 1.4, dash: [5, 4] });
      p.line(stepPts(cur, 0), { color: p.colors.accent, width: 2.4 });
      p.text('piecewise constant · ' + cur.k + (cur.k === 1 ? ' cutpoint' : ' cutpoints'),
        XMIN + 1, 318, { color: p.colors.accent, font: 'bold 12.5px system-ui, sans-serif' });
    }
  });

  var binPlot = new Plot(cBins, {
    range: { xmin: XMIN - 1, xmax: XMAX + 1, ymin: 0, ymax: 900 },
    height: 300, xlabel: 'Age', ylabel: 'men in the bin',
    draw: function (p) {
      var cur = fit(), j, widest = 0;
      p.axes();
      for (j = 0; j < cur.count.length; j++) {
        p.cell(cur.edges[j], cur.edges[j + 1], 0, cur.count[j], p.colors.accent, 0.55);
        var w = p.xToPx(cur.edges[j + 1]) - p.xToPx(cur.edges[j]);
        if (w > widest) widest = w;
      }
      cur.cuts.forEach(function (c) {
        p.vline(c, { color: p.colors.axis, width: 1, dash: [3, 4] });
      });
      if (widest > 40) {
        for (j = 0; j < cur.count.length; j++) {
          var mid = (cur.edges[j] + cur.edges[j + 1]) / 2;
          p.text('n = ' + cur.count[j], mid, cur.count[j] * 0.5,
            { align: 'center', base: 'middle', color: p.colors.fg,
              font: 'bold 11.5px system-ui, sans-serif' });
        }
      }
      p.text(mode === 'q'
        ? 'quantile cutpoints: the bins hold roughly equal numbers of men'
        : 'equal widths: the bins hold very different numbers of men',
        XMIN + 1, Math.max.apply(null, cur.count) * 0.92, {
          color: p.colors.accent, font: 'bold 12px system-ui, sans-serif'
        });
    }
  });

  function render() {
    var cur = fit();
    elKread.textContent = cur.k + (cur.k === 1 ? ' cutpoint' : ' cutpoints') +
      (mode === 'q' ? ' · quantiles' : ' · equal width');
    elCut.textContent = cur.cuts.length
      ? 'cuts ' + cur.cuts.map(function (c) { return c.toFixed(2); }).join(', ')
      : 'cuts none — one constant for everyone';
    elRse.textContent = 'RSE ' + cur.rse.toFixed(4);
    elR2.textContent = 'R² ' + cur.r2.toFixed(4);
    elDf.textContent = cur.df + (cur.df === 1 ? ' parameter' : ' parameters');
    elLevel.textContent = 'bin means ' + cur.mean.map(function (m) {
      return m.toFixed(4);
    }).join(', ');
    binPlot.setRange({ ymax: Math.max.apply(null, cur.count) * 1.25 });
    plot.render();
    binPlot.render();
  }

  elK.addEventListener('input', render);
  elMode.addEventListener('click', function () {
    mode = mode === 'q' ? 'w' : 'q';
    elMode.textContent = mode === 'q' ? 'cutpoints: quantiles' : 'cutpoints: equal width';
    render();
  });
  render();
})();
