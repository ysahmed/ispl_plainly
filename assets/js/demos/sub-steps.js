/* ==========================================================================
   sub-steps.js — Chapter 6, §6.1.2: forward stepwise selection next to best
   subset selection (ISLP Table 6.1 and the counting argument).

   Left panel: the same 2047-model cloud as Figure 6.1, with the best subset
   frontier in red and the forward stepwise path in blue — press the button
   and watch it walk one variable at a time.  Right panel: what the two
   searches actually cost, on a log scale, live for our 11 columns and
   alongside the book's p = 20 count.
   ========================================================================== */
(function () {
  'use strict';
  var cPath = document.getElementById('sub-steps-path');
  var cCost = document.getElementById('sub-steps-cost');
  if (!cPath || !cCost || typeof Plot === 'undefined' || typeof Stats === 'undefined') return;

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
  var P = COLS.length;

  var pre = Stats.prepare(COLS, y);
  var cp = Stats.crossprod(pre.Z, pre.y);
  var yty = 0;
  for (i = 0; i < n; i++) yty += pre.y[i] * pre.y[i];

  function fitExact(idx) {
    var X = [], a, t;
    for (a = 0; a < n; a++) X.push([1]);
    for (t = 0; t < idx.length; t++) {
      var col = COLS[idx[t]];
      for (a = 0; a < n; a++) X[a].push(col[a]);
    }
    return Stats.ols(X, y);
  }
  function namesOf(idxs) {
    return idxs.map(function (jj) { return NAMES[jj]; }).join(', ');
  }

  /* ------------------------------------------------ the forward stepwise path
     At each step try every variable not yet in, keep the one that most
     reduces RSS (Algorithm 6.2).  Counts the candidate fits the way the book
     does: 11 + 10 + … + 1 = 66 evaluations, or 1 + p(p+1)/2 = 67 with the
     model you started from. */
  var chosen = [], left = [], path = [], fits = 0;
  for (j = 0; j < P; j++) left.push(j);
  while (left.length) {
    var bestJ = -1, bestR = Infinity;
    for (var t = 0; t < left.length; t++) {
      var r = Stats.rssFrom(cp.G, cp.g, yty, chosen.concat([left[t]]));
      fits++;
      if (r < bestR) { bestR = r; bestJ = left[t]; }
    }
    chosen.push(bestJ);
    left = left.filter(function (jj) { return jj !== bestJ; });
    path.push({ idx: chosen.slice(), entered: bestJ, d: chosen.length,
                rss: fitExact(chosen).rss, fits: fits });
  }
  var totalFits = fits;                              // 66

  /* best-subset frontier: one pass over the 2047 models, then an exact
     refit of the two closest candidates at each size (same guard against the
     Gram shortcut's rounding as sub-all.js). */
  var models = [];
  for (var mask = 1; mask < (1 << P); mask++) {
    var mIdx = [];
    for (j = 0; j < P; j++) if (mask & (1 << j)) mIdx.push(j);
    models.push({ mask: mask, idx: mIdx, rss: Stats.rssFrom(cp.G, cp.g, yty, mIdx) });
  }
  var frontier = [];
  for (var dSize = 1; dSize <= P; dSize++) {
    var top = null;
    models.forEach(function (mo) {
      if (mo.idx.length !== dSize) return;
      if (!top || mo.rss < top[0].rss) top = [mo, top ? top[0] : null];
      else if (!top[1] || mo.rss < top[1].rss) top[1] = mo;
    });
    var win = null;
    top.filter(Boolean).forEach(function (mo) {
      var r = fitExact(mo.idx).rss;
      if (!win || r < win.rss) win = { rss: r, idx: mo.idx, mask: mo.mask, d: dSize };
    });
    frontier.push(win);
  }

  /* -------------------------------------------------------------- drawing */
  var state = { step: 0 };
  var tss = yty;
  function jitOf(m) { return (((Math.imul(m, 2654435761) >>> 0) % 1000) / 1000 - 0.5) * 0.62; }

  var cloud = models.map(function (mo) {
    return [mo.idx.length + jitOf(mo.mask), 1 - mo.rss / tss];
  });

  var pathPlot = new Plot(cPath, {
    range: { xmin: 0.4, xmax: P + 0.6, ymin: 0.6, ymax: 1 },
    height: 300, xlabel: 'number of variables in the model (d)', ylabel: 'R²',
    draw: function (p) {
      p.axes();
      p.points(cloud, { color: p.colors.grid, alpha: 0.5, r: 1.9 });
      p.line(frontier.map(function (f) { return [f.d, 1 - f.rss / tss]; }),
        { color: p.colors.accent2, width: 2 });
      p.text('best subset', 5.2, 1 - frontier[4].rss / tss, {
        color: p.colors.accent2, align: 'left', base: 'bottom'
      });
      var shown = path.slice(0, state.step);
      if (shown.length) {
        p.line(shown.map(function (s) { return [s.d, 1 - s.rss / tss]; }),
          { color: p.colors.accent, width: 2 });
        p.points(shown.map(function (s) { return [s.d, 1 - s.rss / tss]; }),
          { color: p.colors.accent, r: 4.5 });
        shown.forEach(function (s) {
          p.text(String(s.d), s.d, 1 - s.rss / tss, {
            color: p.colors.accent, align: 'center', base: 'bottom',
            font: 'bold 11px system-ui, sans-serif'
          });
        });
      }
      p.text('forward stepwise', path[2].d, 1 - path[2].rss / tss + 0.012, {
        color: p.colors.accent, align: 'left', base: 'bottom'
      });
    }
  });

  /* right panel: search cost, log scale */
  var costPlot = new Plot(cCost, {
    range: { xmin: 0, xmax: Math.log10(2100000), ymin: -0.4, ymax: 3.4 },
    height: 300, xlabel: 'models fitted (log scale)', ylabel: '',
    draw: function (p) {
      p.axes();
      var bars = [
        { label: 'best subset · our 11 columns', v: (1 << P) - 1, color: p.colors.accent2, row: 3 },
        { label: 'forward stepwise · our 11 columns', v: path[state.step - 1] ? path[state.step - 1].fits : 0,
          color: p.colors.accent, row: 2 },
        { label: 'best subset · the book’s p = 20', v: 1048576, color: p.colors.accent2, row: 1 },
        { label: 'forward stepwise · p = 20', v: 211, color: p.colors.accent, row: 0 }
      ];
      bars.forEach(function (b) {
        p.text(b.label, 0, b.row + 0.42, { base: 'bottom', font: '11.5px system-ui, sans-serif' });
        if (b.v <= 0) {
          p.text('not started', 0, b.row - 0.05, { base: 'middle', color: p.colors.axis,
            font: '11.5px system-ui, sans-serif' });
          return;
        }
        p.cell(0, Math.log10(b.v), b.row - 0.3, b.row + 0.1, b.color, 0.75);
        p.text(b.v.toLocaleString('en-US'), Math.log10(b.v) + 0.04, b.row - 0.1, {
          base: 'middle', font: '11.5px system-ui, sans-serif'
        });
      });
      [1, 10, 100, 1000, 10000, 100000, 1000000].forEach(function (v) {
        p.text(v >= 1000 ? (v / 1000) + 'k' : String(v), Math.log10(v), -0.34, {
          align: 'center', base: 'middle', color: p.colors.axis, font: '10.5px system-ui, sans-serif'
        });
      });
    }
  });

  /* ------------------------------------------------------------ controls */
  var elN = document.getElementById('sub-steps-n');
  var elEnter = document.getElementById('sub-steps-enter');
  var elModel = document.getElementById('sub-steps-model');
  var elRss = document.getElementById('sub-steps-rss');
  var elVs = document.getElementById('sub-steps-vs');
  var elFits = document.getElementById('sub-steps-fits');
  var btnNext = document.getElementById('sub-steps-next');
  var btnReset = document.getElementById('sub-steps-reset');

  function sameSet(a, b) {
    if (a.length !== b.length) return false;
    var sa = a.slice().sort().join(','), sb = b.slice().sort().join(',');
    return sa === sb;
  }

  function update() {
    pathPlot.render();
    costPlot.render();
    var s = state.step ? path[state.step - 1] : null;
    if (elN) elN.innerHTML = 'step <b>' + state.step + '</b> of ' + P;
    if (elEnter) elEnter.innerHTML = s ? 'added <b>' + NAMES[s.entered] + '</b>' : 'nothing chosen yet';
    if (elModel) elModel.innerHTML = s ? 'model: <b>' + namesOf(s.idx) + '</b>' : 'model: —';
    if (elRss) elRss.innerHTML = s ? 'RSS <b>' + Math.round(s.rss).toLocaleString('en-US') + '</b>' : 'RSS —';
    if (elFits) elFits.innerHTML = 'fits spent <b>' + (s ? s.fits : 0) + '</b> / ' + totalFits;
    if (elVs) {
      if (!s) {
        elVs.innerHTML = 'vs best subset: —';
      } else {
        var f = frontier[s.d - 1];
        if (sameSet(s.idx, f.idx)) {
          elVs.innerHTML = 'vs best subset: <b>identical at this size</b>';
        } else {
          elVs.innerHTML = 'vs best subset: behind by <b>' +
            Math.round(s.rss - f.rss).toLocaleString('en-US') + '</b> RSS';
        }
      }
    }
    if (btnNext) btnNext.disabled = state.step >= P;
  }

  if (btnNext) btnNext.addEventListener('click', function () {
    if (state.step < P) { state.step++; update(); }
  });
  if (btnReset) btnReset.addEventListener('click', function () { state.step = 0; update(); });

  /* the live Table 6.1 below the figure */
  var tbody = document.querySelector('#t61 tbody');
  if (tbody) {
    var rows = '';
    ['One', 'Two', 'Three', 'Four'].forEach(function (word, k) {
      var d = k + 1;
      var fwd = path[k], best = frontier[k];
      var same = sameSet(fwd.idx, best.idx);
      rows += '<tr><td>' + word + '</td><td>' + namesOf(best.idx) + '</td>' +
        '<td>' + namesOf(fwd.idx) + '</td>' +
        '<td>' + (same ? 'same' : 'differ') + '</td></tr>';
    });
    tbody.innerHTML = rows;
  }

  update();
})();
