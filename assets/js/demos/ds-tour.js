/* ==========================================================================
   ds-tour.js — Chapter 1's "three datasets, three shapes of problem" demo.
   One canvas, three views, mirroring Figures 1.1, 1.2 and 1.4 of ISLP:
     Wage         — wage against age / year / education (with the trend)
     Smarket      — boxplots of past returns split by Up vs Down days
     NCI60        — 64 cell lines on their first two principal components,
                    coloured by 4 found groups or by the 14 true cancer types
   Data comes from assets/data/ch01-data.js (window.ISLP_CH01).
   ========================================================================== */
(function () {
  'use strict';

  var D = window.ISLP_CH01;
  var cv = document.getElementById('cv-datasets');
  if (!D || !cv) return;

  var PALETTE = [
    '#2563eb', '#dc2626', '#16a34a', '#d97706', '#7c3aed', '#0891b2',
    '#db2777', '#65a30d', '#ea580c', '#0d9488', '#4f46e5', '#9333ea',
    '#b45309', '#64748b'
  ];

  var state = { set: 'wage', xaxis: 'age', nci: 'cluster', hover: null };

  /* ------------------------------------------------------------- helpers */
  function quantile(sorted, q) {
    var pos = (sorted.length - 1) * q;
    var base = Math.floor(pos), rest = pos - base;
    if (sorted[base + 1] !== undefined) {
      return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
    }
    return sorted[base];
  }

  function boxStats(values) {
    var v = values.slice().sort(function (a, b) { return a - b; });
    var q1 = quantile(v, 0.25), q2 = quantile(v, 0.5), q3 = quantile(v, 0.75);
    var iqr = q3 - q1;
    var lo = q1 - 1.5 * iqr, hi = q3 + 1.5 * iqr;
    var wlo = v.find(function (x) { return x >= lo; });
    var whi = v.slice().reverse().find(function (x) { return x <= hi; });
    return { min: wlo, q1: q1, med: q2, q3: q3, max: whi, n: v.length };
  }

  function drawBox(p, x, w, s, color, fillAlpha) {
    p.line([[x, s.min], [x, s.max]], { color: color, width: 1.4 });
    p.line([[x - w / 2, s.max], [x + w / 2, s.max]], { color: color, width: 1.4 });
    p.line([[x - w / 2, s.min], [x + w / 2, s.min]], { color: color, width: 1.4 });
    p.cell(x - w / 2, x + w / 2, s.q1, s.q3, color, fillAlpha === undefined ? 0.18 : fillAlpha);
    p.line([[x - w / 2, s.q3], [x + w / 2, s.q3]], { color: color, width: 1.6 });
    p.line([[x - w / 2, s.q1], [x + w / 2, s.q1]], { color: color, width: 1.6 });
    p.line([[x - w / 2, s.med], [x + w / 2, s.med]], { color: color, width: 2.6 });
  }

  /* ---------------------------------------------------------------- wage */
  function wageX(i) {
    if (state.xaxis === 'year') return D.wage.year[i];
    if (state.xaxis === 'edu') return D.wage.edu[i] + (i % 7 - 3) * 0.045;
    return D.wage.age[i];
  }

  function drawWage(p) {
    var W = D.wage;
    var pts = [];
    for (var i = 0; i < W.n; i++) pts.push([wageX(i), W.wage[i]]);
    p.points(pts, { color: p.colors.accent, r: 2.4, alpha: 0.28 });

    if (state.xaxis === 'age') {
      p.line(W.trendAge, { color: p.colors.accent2, width: 2.6 });
    } else if (state.xaxis === 'year') {
      p.line(W.trendYear, { color: p.colors.accent2, width: 2.6 });
    } else {
      for (var lvl = 1; lvl <= 5; lvl++) {
        var vals = [];
        for (var k = 0; k < W.n; k++) if (W.edu[k] === lvl) vals.push(W.wage[k]);
        drawBox(p, lvl, 0.5, boxStats(vals), p.colors.accent, 0.16);
      }
    }
  }

  /* ------------------------------------------------------------- smarket */
  function drawSmarket(p) {
    var S = D.smarket;
    var colors = [p.colors.good, p.colors.accent2];
    for (var g = 0; g < 3; g++) {
      for (var d = 0; d < 2; d++) {
        var vals = [];
        for (var i = 0; i < S.n; i++) {
          if (S.dir[i] === (d === 0 ? 1 : 0)) vals.push(S.lag[g][i]);
        }
        var x = g + 1 + (d === 0 ? -0.19 : 0.19);
        drawBox(p, x, 0.3, boxStats(vals), colors[d], 0.2);
      }
    }
  }

  /* --------------------------------------------------------------- nci60 */
  var typeIndex = {};
  D.nci60.types.forEach(function (t, i) { typeIndex[t] = i; });

  function nciColor(i) {
    if (state.nci === 'cluster') return PALETTE[D.nci60.cluster4[i] % PALETTE.length];
    return PALETTE[typeIndex[D.nci60.labels[i]] % PALETTE.length];
  }

  function drawNci(p) {
    var N = D.nci60;
    for (var i = 0; i < N.n; i++) {
      p.dot(N.z1[i], N.z2[i], {
        r: state.hover === i ? 7 : 5,
        color: nciColor(i),
        ring: state.hover === i ? p.colors.fg : p.colors.surface,
        ringWidth: state.hover === i ? 2 : 1.4
      });
    }
  }

  /* ------------------------------------------------------------ the plot */
  function rangeFor() {
    if (state.set === 'wage') {
      var y = D.wage.wageMax * 1.04;
      if (state.xaxis === 'age') return { xmin: 17, xmax: 82, ymin: 0, ymax: y };
      if (state.xaxis === 'year') return { xmin: 2002.4, xmax: 2009.6, ymin: 0, ymax: y };
      return { xmin: 0.4, xmax: 5.6, ymin: 0, ymax: y };
    }
    if (state.set === 'smarket') {
      var lo = Infinity, hi = -Infinity;
      D.smarket.lag.forEach(function (a) {
        a.forEach(function (v) { if (v < lo) lo = v; if (v > hi) hi = v; });
      });
      var pad = (hi - lo) * 0.05;
      return { xmin: 0.5, xmax: 3.5, ymin: lo - pad, ymax: hi + pad };
    }
    var N = D.nci60, m = 0;
    for (var i = 0; i < N.n; i++) {
      m = Math.max(m, Math.abs(N.z1[i]), Math.abs(N.z2[i]));
    }
    m *= 1.1;
    return { xmin: -m, xmax: m, ymin: -m, ymax: m };
  }

  function labelsFor() {
    if (state.set === 'wage') {
      return {
        x: state.xaxis === 'age' ? 'age' : (state.xaxis === 'year' ? 'year' : 'education level (1 = none, 5 = advanced degree)'),
        y: 'wage ($ thousands)'
      };
    }
    if (state.set === 'smarket') {
      return { x: 'days before today (1 = yesterday)', y: 'percentage return that day' };
    }
    return { x: 'Z1 — first principal component', y: 'Z2 — second principal component' };
  }

  function nearest(p, ptr) {
    if (!ptr || !ptr.inside) return null;
    var best = null, bd = 12 * 12;                     // pixels
    var pool = null;
    if (state.set === 'nci60') {
      pool = D.nci60;
      for (var i = 0; i < pool.n; i++) {
        var dx = p.xToPx(pool.z1[i]) - p.xToPx(ptr.x);
        var dy = p.yToPx(pool.z2[i]) - p.yToPx(ptr.y);
        var d = dx * dx + dy * dy;
        if (d < bd) { bd = d; best = i; }
      }
      return best === null ? null : { kind: 'nci', i: best };
    }
    if (state.set !== 'wage' || state.xaxis === 'edu') return null;
    var W = D.wage, bi = null;
    for (var k = 0; k < W.n; k++) {
      var ax = p.xToPx(wageX(k)) - p.xToPx(ptr.x);
      var ay = p.yToPx(W.wage[k]) - p.yToPx(ptr.y);
      var dd = ax * ax + ay * ay;
      if (dd < bd) { bd = dd; bi = k; }
    }
    return bi === null ? null : { kind: 'wage', i: bi };
  }

  var metaEl = document.getElementById('ds-meta');
  var legendEl = document.getElementById('ds-legend');
  var noteEl = document.getElementById('ds-note');

  function setMeta(html) { if (metaEl) metaEl.innerHTML = html; }

  function setLegend(items) {
    if (!legendEl) return;
    legendEl.innerHTML = '';
    if (!items) { legendEl.style.display = 'none'; return; }
    legendEl.style.display = '';
    items.forEach(function (it) {
      var s = document.createElement('span');
      var sw = document.createElement('i');
      sw.className = 'sw' + (it.square ? ' sq' : '');
      sw.style.background = it.color;
      s.appendChild(sw);
      s.appendChild(document.createTextNode(it.label));
      legendEl.appendChild(s);
    });
  }

  function syncChrome() {
    var showX = state.set === 'wage';
    var showMode = state.set === 'nci60';
    var xctl = document.getElementById('ds-xctl');
    var mctl = document.getElementById('ds-mode');
    if (xctl) xctl.style.display = showX ? '' : 'none';
    if (mctl) mctl.style.display = showMode ? '' : 'none';

    if (state.set === 'wage') {
      setMeta('<b>n = 3,000</b> people · <b>p = 11</b> variables');
      setLegend(state.xaxis === 'edu'
        ? [{ color: PALETTE[0], label: 'one dot = one person', square: false },
           { color: PALETTE[1], label: 'red = boxplot per education level', square: false }]
        : [{ color: PALETTE[0], label: 'one dot = one person', square: false },
           { color: PALETTE[1], label: 'red = smoothed average', square: false }]);
      if (noteEl) noteEl.textContent = 'Prediction: given a person, guess their wage. This is a regression problem.';
    } else if (state.set === 'smarket') {
      setMeta('<b>n = 1,250</b> days · <b>648 up / 602 down</b>');
      setLegend([{ color: '#16a34a', label: 'market went up', square: false },
                 { color: '#dc2626', label: 'market went down', square: false }]);
      if (noteEl) noteEl.textContent = 'Prediction: guess whether tomorrow goes up or down. This is a classification problem.';
    } else {
      setMeta('<b>64</b> cell lines · <b>6,830</b> genes');
      if (state.nci === 'cluster') {
        setLegend([0, 1, 2, 3].map(function (c) {
          return { color: PALETTE[c], label: 'group ' + (c + 1) };
        }));
        if (noteEl) noteEl.textContent = 'No answer to predict — only the inputs. We are looking for groups. This is unsupervised learning.';
      } else {
        setLegend(D.nci60.types.map(function (t) {
          return { color: PALETTE[typeIndex[t]], label: t };
        }));
        if (noteEl) noteEl.textContent = 'The 14 real cancer types, added afterwards for checking.';
      }
    }
    var lab = labelsFor();
    var rg = rangeFor();
    plot.o.xlabel = lab.x;
    plot.o.ylabel = lab.y;
    plot.setRange(rg);
  }

  var plot = new Plot(cv, {
    height: function (w) { return w < 520 ? 300 : 360; },
    pad: { l: 52, r: 16, t: 16, b: 44 },
    xlabel: 'age',
    ylabel: 'wage ($ thousands)',
    draw: function (p) {
      p.axes();
      if (state.set === 'wage') drawWage(p);
      else if (state.set === 'smarket') drawSmarket(p);
      else drawNci(p);

      var hit = state.hover;
      if (hit && hit.kind === 'wage') {
        var W = D.wage;
        p.badge([
          state.xaxis === 'age' ? 'age ' + W.age[hit.i] : 'year ' + W.year[hit.i],
          'wage $' + W.wage[hit.i].toFixed(1) + 'k'
        ], wageX(hit.i), W.wage[hit.i]);
      } else if (hit && hit.kind === 'nci') {
        var N = D.nci60;
        p.badge([
          N.labels[hit.i],
          'Z1 ' + N.z1[hit.i] + ' · Z2 ' + N.z2[hit.i]
        ], N.z1[hit.i], N.z2[hit.i]);
      }
    },
    onPointer: function (ptr) {
      var next = nearest(plot, ptr);
      var same = state.hover && next && state.hover.kind === next.kind && state.hover.i === next.i;
      if (!same) {
        state.hover = next;
        plot.render();
      }
    }
  });

  /* ------------------------------------------------------------ controls */
  Array.prototype.forEach.call(document.querySelectorAll('#ds-set .btn'), function (b) {
    b.addEventListener('click', function () {
      state.set = b.dataset.set;
      state.hover = null;
      Array.prototype.forEach.call(document.querySelectorAll('#ds-set .btn'), function (o) {
        o.setAttribute('aria-pressed', String(o === b));
      });
      syncChrome();
    });
  });

  var xsel = document.getElementById('ds-xsel');
  if (xsel) xsel.addEventListener('change', function () {
    state.xaxis = xsel.value;
    state.hover = null;
    syncChrome();
  });

  Array.prototype.forEach.call(document.querySelectorAll('#ds-mode .btn'), function (b) {
    b.addEventListener('click', function () {
      state.nci = b.dataset.mode;
      Array.prototype.forEach.call(document.querySelectorAll('#ds-mode .btn'), function (o) {
        o.setAttribute('aria-pressed', String(o === b));
      });
      syncChrome();
    });
  });

  syncChrome();
})();
