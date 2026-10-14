/* ==========================================================================
   step-logit.js — Chapter 7, §7.2: ISLP Figure 7.2's right panel.

   The same indicator columns of equation (7.4), now through equation (7.6):
   logistic regression of the binary event wage > 250 on the bins of age.
   Because the model has one parameter per bin, the fitted probability in a
   bin is that bin's own proportion of high earners — which is exactly what
   the right-hand panel shows, and exactly why the curve is a staircase.

   Left panel: the fitted posterior probability with its 95% band and the
   book's grey rug of high-earner ages along the top.  Right panel: the 79
   high earners counted per bin, with the proportion that the fit reports.
   ========================================================================== */
(function () {
  'use strict';
  var cPlot = document.getElementById('sl-plot');
  var cCount = document.getElementById('sl-count');
  if (!cPlot || !cCount || typeof Plot === 'undefined' || typeof Stats === 'undefined' ||
      typeof CH07_WAGE === 'undefined') return;

  var W = window.CH07_WAGE;
  var age = W.age.map(Number), wage = W.wage.map(Number), n = wage.length;
  var hi = wage.map(function (v) { return v > 250 ? 1 : 0; });
  var nhi = hi.reduce(function (s, v) { return s + v; }, 0);
  var XMIN = 18, XMAX = 80, i;

  var elK = document.getElementById('sl-k');
  var elMode = document.getElementById('sl-mode');
  var elKread = document.getElementById('sl-kread');
  var elDev = document.getElementById('sl-dev');
  var elP = document.getElementById('sl-p');
  var elPmax = document.getElementById('sl-pmax');
  if (!elK || !elMode) return;

  var mode = 'q';

  function cutsFor(k) {
    return mode === 'q' ? Stats.quantileCuts(age, k) : Stats.widthCuts(age, k);
  }

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
    var f = Stats.logit(Stats.design(b.cols, n), hi);

    var level = [], half = [], count = [], events = [], j;
    for (j = 0; j <= cs.length; j++) { count.push(0); events.push(0); }
    for (i = 0; i < n; i++) { var bi = binOf(age[i], cs); count[bi]++; events[bi] += hi[i]; }

    for (j = 0; j <= cs.length; j++) {
      var eta = f.beta[0] + (j ? f.beta[j] : 0);
      var p = 1 / (1 + Math.exp(-eta));
      var varv = f.inv[0][0];
      if (j) varv += f.inv[j][j] + 2 * f.inv[0][j];
      level.push(p);
      half.push(1.96 * p * (1 - p) * Math.sqrt(Math.max(0, varv)));
    }

    var edges = [XMIN].concat(cs, [XMAX]);
    var out = {
      k: k, cuts: cs, edges: edges, level: level, half: half,
      count: count, events: events,
      dev: f.dev, nullDev: f.nullDev, iters: f.iters
    };
    cache[key] = out;
    return out;
  }

  function stepPts(cur, off) {
    var pts = [], j;
    for (j = 0; j < cur.level.length; j++) {
      pts.push([cur.edges[j], cur.level[j] + off]);
      pts.push([cur.edges[j + 1], cur.level[j] + off]);
    }
    return pts;
  }

  var plot = new Plot(cPlot, {
    // the book's axis: 0.00 to 0.20, with the high-earner rug along the top
    range: { xmin: XMIN - 1, xmax: XMAX + 1, ymin: 0, ymax: 0.20 },
    height: 300, xlabel: 'Age', ylabel: 'Pr(Wage > 250 | Age)',
    draw: function (p) {
      var cur = fit();
      p.axes();
      p.clip(function () {
        var c = p.ctx;
        c.strokeStyle = p.colors.axis;
        c.lineWidth = 1;
        c.globalAlpha = 0.5;
        c.beginPath();
        for (var r = 0; r < n; r++) {
          if (!hi[r]) continue;
          var X = p.xToPx(age[r]);
          c.moveTo(X, p.o.pad.t + 2); c.lineTo(X, p.o.pad.t + 11);
        }
        c.stroke();
        c.globalAlpha = 1;
      });
      cur.cuts.forEach(function (cv) {
        p.vline(cv, { color: p.colors.axis, width: 1, dash: [3, 4] });
      });
      p.clip(function () {
        var up = stepPts(cur, 1).map(function (q) {
          return [q[0], Math.min(0.20, q[1])];
        });
        var dn = stepPts(cur, -1).map(function (q) {
          return [q[0], Math.max(0, q[1])];
        }).reverse(), c = p.ctx, r;
        c.fillStyle = p.colors.accent2;
        c.globalAlpha = 0.13;
        c.beginPath();
        c.moveTo(p.xToPx(up[0][0]), p.yToPx(up[0][1]));
        for (r = 1; r < up.length; r++) c.lineTo(p.xToPx(up[r][0]), p.yToPx(up[r][1]));
        for (r = 0; r < dn.length; r++) c.lineTo(p.xToPx(dn[r][0]), p.yToPx(dn[r][1]));
        c.closePath();
        c.fill();
        c.globalAlpha = 1;
      });
      p.line(stepPts(cur, 0), { color: p.colors.accent2, width: 2.4 });
      p.text('logistic step · ' + cur.k + (cur.k === 1 ? ' cutpoint' : ' cutpoints'),
        XMIN + 1, 0.185, { color: p.colors.accent2, font: 'bold 12.5px system-ui, sans-serif' });
    }
  });

  var countPlot = new Plot(cCount, {
    range: { xmin: XMIN - 1, xmax: XMAX + 1, ymin: 0, ymax: 40 },
    height: 300, xlabel: 'Age', ylabel: 'high earners in the bin',
    draw: function (p) {
      var cur = fit(), j, widest = 0, maxc = 0;
      p.axes();
      for (j = 0; j < cur.events.length; j++) {
        if (cur.events[j] > maxc) maxc = cur.events[j];
        p.cell(cur.edges[j], cur.edges[j + 1], 0, cur.events[j], p.colors.accent2, 0.6);
        var w = p.xToPx(cur.edges[j + 1]) - p.xToPx(cur.edges[j]);
        if (w > widest) widest = w;
      }
      cur.cuts.forEach(function (cv) {
        p.vline(cv, { color: p.colors.axis, width: 1, dash: [3, 4] });
      });
      if (widest > 54) {
        for (j = 0; j < cur.events.length; j++) {
          var mid = (cur.edges[j] + cur.edges[j + 1]) / 2;
          p.text(cur.events[j] + ' / ' + cur.count[j], mid, cur.events[j] * 0.55,
            { align: 'center', base: 'middle', color: p.colors.fg,
              font: 'bold 11.5px system-ui, sans-serif' });
        }
      }
      p.text(nhi + ' high earners, counted inside each bin', XMIN + 1, maxc * 0.9, {
        color: p.colors.accent2, font: 'bold 12px system-ui, sans-serif'
      });
    }
  });

  function render() {
    var cur = fit(), j, best = 0;
    for (j = 1; j < cur.level.length; j++) if (cur.level[j] > cur.level[best]) best = j;
    elKread.textContent = cur.k + (cur.k === 1 ? ' cutpoint' : ' cutpoints') +
      (mode === 'q' ? ' · quantiles' : ' · equal width');
    elDev.textContent = 'deviance ' + cur.dev.toFixed(1) + ' / null ' +
      cur.nullDev.toFixed(1);
    elP.textContent = 'Pr by bin ' + cur.level.map(function (q) {
      return (q * 100).toFixed(2) + '%';
    }).join(', ');
    elPmax.textContent = 'max Pr ' + (cur.level[best] * 100).toFixed(2) + '% in bin ' +
      (best + 1) + ' of ' + cur.level.length;
    countPlot.setRange({ ymax: Math.max.apply(null, cur.events) * 1.3 + 1 });
    plot.render();
    countPlot.render();
  }

  elK.addEventListener('input', render);
  elMode.addEventListener('click', function () {
    mode = mode === 'q' ? 'w' : 'q';
    elMode.textContent = mode === 'q' ? 'cutpoints: quantiles' : 'cutpoints: equal width';
    render();
  });
  render();
})();
