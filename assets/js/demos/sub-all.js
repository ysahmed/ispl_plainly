/* ==========================================================================
   sub-all.js — Chapter 6, §6.1.1: best subset selection on the Credit data
   (ISLP Figure 6.1).

   Every one of the 2^11 − 1 = 2047 non-empty column subsets is fitted live.
   The design has eleven columns because one of the book's ten predictors,
   Ethnicity, is categorical and enters as two treatment dummies — the book
   says these are "selected separately in this case", which is why the
   x-axis runs 1 to 11.  The red frontier is the best model of each size;
   hover a point or drive the size slider to read any model off the cloud.
   ========================================================================== */
(function () {
  'use strict';
  var cRss = document.getElementById('sub-all-rss');
  var cR2 = document.getElementById('sub-all-r2');
  if (!cRss || !cR2 || typeof Plot === 'undefined' || typeof Stats === 'undefined') return;

  var C = window.CH03_CREDIT;
  var y = C.balance, n = y.length, i, j;

  function dummy(codes, k) { return codes.map(function (c) { return c === k ? 1 : 0; }); }

  var COLS = [
    C.income, C.limit, C.rating, C.cards, C.age, C.education,
    C.student, C.gender, C.married, dummy(C.ethnicity, 1), dummy(C.ethnicity, 2)
  ];
  var NAMES = ['Income', 'Limit', 'Rating', 'Cards', 'Age', 'Education',
               'Student', 'Gender', 'Married', 'Ethnicity[Asian]',
               'Ethnicity[Caucasian]'];
  var P = COLS.length;                            // 11 design columns

  /* ------------------------------------------- every subset, from the Gram */
  var t0 = performance.now();
  var pre = Stats.prepare(COLS, y);
  var cp = Stats.crossprod(pre.Z, pre.y);
  var yty = 0;
  for (i = 0; i < n; i++) yty += pre.y[i] * pre.y[i];

  var models = [], mask;
  for (mask = 1; mask < (1 << P); mask++) {
    var idx = [];
    for (j = 0; j < P; j++) if (mask & (1 << j)) idx.push(j);
    models.push({ mask: mask, d: idx.length, idx: idx, rss: Stats.rssFrom(cp.G, cp.g, yty, idx) });
  }
  var fitMs = performance.now() - t0;

  /* exact refit on the raw columns: the Gram shortcut above loses a few
     digits when Limit and Rating are both in (they correlate 0.997), so the
     frontier — whose winner is a real decision — is decided by refitting the
     two closest candidates at each size properly. */
  function fitExact(idx) {
    var X = [], a, t;
    for (a = 0; a < n; a++) X.push([1]);
    for (t = 0; t < idx.length; t++) {
      var col = COLS[idx[t]];
      for (a = 0; a < n; a++) X[a].push(col[a]);
    }
    return Stats.ols(X, y);
  }
  var frontier = [];
  for (var d = 1; d <= P; d++) {
    var cand = models.filter(function (m) { return m.d === d; })
      .sort(function (a, b) { return a.rss - b.rss; })
      .slice(0, d === P ? 1 : 2);
    var win = null;
    cand.forEach(function (m) {
      var r = fitExact(m.idx).rss;
      if (!win || r < win.rss) win = { rss: r, mask: m.mask, idx: m.idx, d: d };
    });
    frontier.push(win);
  }

  var tss = yty;
  function r2Of(rss) { return 1 - rss / tss; }
  function namesOf(mask) {
    var out = [];
    for (var jj = 0; jj < P; jj++) if (mask & (1 << jj)) out.push(NAMES[jj]);
    return out.join(', ');
  }
  // deterministic in-page jitter so 2047 stacked models stay visible
  function jitOf(m) { return (((Math.imul(m, 2654435761) >>> 0) % 1000) / 1000 - 0.5) * 0.62; }

  var rssMax = 0;
  models.forEach(function (m) { if (m.rss > rssMax) rssMax = m.rss; });

  /* ------------------------------------------------------------ the plots */
  var state = { hi: 4, hover: null };

  function cloudPoints(valFn) {
    return models.map(function (m) { return [m.d + jitOf(m.mask), valFn(m.rss)]; });
  }
  var cloudRss = cloudPoints(function (r) { return r; });
  var cloudR2 = cloudPoints(r2Of);

  function drawPanel(p, cloud, valFn, opts) {
    p.axes();
    var dim = state.hi > 0;
    p.points(cloud, { color: dim ? p.colors.grid : p.colors.axis, alpha: dim ? 0.55 : 0.45, r: 1.9 });
    if (dim) {
      p.vline(state.hi, { color: p.colors.accent, dash: [4, 3] });
      p.points(models.filter(function (m) { return m.d === state.hi; })
        .map(function (m) { return [m.d + jitOf(m.mask), valFn(m.rss)]; }),
        { color: p.colors.accent, alpha: 0.9, r: 2.6 });
    }
    p.line(frontier.map(function (f) { return [f.d, valFn(f.rss)]; }),
      { color: p.colors.accent2, width: 2 });
    p.points(frontier.map(function (f) { return [f.d, valFn(f.rss)]; }),
      { color: p.colors.accent2, r: 3.6 });
    p.text('best of each size', frontier[6].d, valFn(frontier[6].rss), {
      color: p.colors.accent2, align: 'right', base: 'bottom'
    });
    if (state.hover) {
      p.dot(state.hover.d + jitOf(state.hover.mask), valFn(state.hover.rss),
        { r: 5.5, color: p.colors.accent2, ring: p.colors.surface, ringWidth: 2 });
    }
    if (opts.label) p.text(opts.label, 0.02, 0.94, { base: 'top', color: p.colors.axis });
  }

  function render() {
    rssPlot.render();
    r2Plot.render();
  }

  var rssPlot = new Plot(cRss, {
    range: { xmin: 0.4, xmax: P + 0.6, ymin: 0, ymax: rssMax * 1.03 },
    height: 300, xlabel: 'number of variables in the model (d)',
    ylabel: 'RSS', draw: function (p) { drawPanel(p, cloudRss, function (r) { return r; }, {}); }
  });
  var r2Plot = new Plot(cR2, {
    range: { xmin: 0.4, xmax: P + 0.6, ymin: 0, ymax: 1 },
    height: 300, xlabel: 'number of variables in the model (d)',
    ylabel: 'R²', draw: function (p) { drawPanel(p, cloudR2, r2Of, {}); }
  });

  /* ---------------------------------------------------------- interaction */
  function nearest(p, valFn) {
    if (!p.pointer) return null;
    var px = p.xToPx(p.pointer.x), py = p.yToPx(p.pointer.y);
    var bestM = null, bestD = 15 * 15;
    for (var k = 0; k < models.length; k++) {
      var m = models[k];
      var dx = p.xToPx(m.d + jitOf(m.mask)) - px, dy = p.yToPx(valFn(m.rss)) - py;
      var dd = dx * dx + dy * dy;
      if (dd < bestD) { bestD = dd; bestM = m; }
    }
    return bestM;
  }

  var elHover = document.getElementById('sub-all-hover');
  var elSize = document.getElementById('sub-all-size');
  var elCount = document.getElementById('sub-all-count');
  var slider = document.getElementById('sub-all-d');

  function onHover(m) {
    state.hover = m;
    if (elHover) {
      elHover.innerHTML = m
        ? 'hovered: <b>d = ' + m.d + '</b> · R² ' + r2Of(m.rss).toFixed(4) +
          ' · ' + namesOf(m.mask)
        : 'hovered: — (point at any model)';
    }
    render();
  }
  rssPlot.o.onPointer = function (pt, e) { onHover(nearest(rssPlot, function (r) { return r; })); };
  r2Plot.o.onPointer = function () { onHover(nearest(r2Plot, r2Of)); };

  var perSize = [];
  for (d = 1; d <= P; d++) perSize.push(models.filter(function (m) { return m.d === d; }).length);

  function onSize() {
    state.hi = slider ? +slider.value : -1;
    if (elSize) {
      var f = frontier[state.hi - 1];
      elSize.innerHTML = 'size <b>' + state.hi + '</b>: ' + perSize[state.hi - 1] +
        ' models · best is <b>' + namesOf(f.mask) + '</b>';
    }
    render();
  }
  if (slider) slider.addEventListener('input', onSize);

  if (elCount) {
    elCount.innerHTML = '<b>' + models.length.toLocaleString('en-US') + '</b> subsets' +
      ' · fitted live in ' + fitMs.toFixed(0) + ' ms';
  }
  onSize();
})();
