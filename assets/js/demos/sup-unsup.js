/* ==========================================================================
   sup-unsup.js — Chapter 2, section 2.1.4.
   The same 165 points twice: with an answer column (supervised) and
   without one (unsupervised). Supervised mode fits a rule from the
   labels and can report a score; unsupervised mode can only find
   groups, and nobody can tell you if they are the right groups.
   ========================================================================== */
(function () {
  'use strict';

  var cv = document.getElementById('cv-supunsup');
  if (!cv || typeof Plot === 'undefined') return;

  var CENTERS = [
    { x: -2.3, y: 1.7 },
    { x: 2.2, y: 1.6 },
    { x: 0.0, y: -2.1 }
  ];
  var SIGMA = 0.95, PER = 55;

  var rnd = mulberry32(451), pts = [];
  for (var c = 0; c < 3; c++) {
    for (var i = 0; i < PER; i++) {
      pts.push({
        x: CENTERS[c].x + gauss(rnd),
        y: CENTERS[c].y + gauss(rnd),
        cls: c
      });
    }
  }

  /* --------------------------------------------- the supervised answer key */
  function classMeans() {
    var s = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    pts.forEach(function (p) {
      s[p.cls][0] += p.x; s[p.cls][1] += p.y; s[p.cls][2]++;
    });
    return s.map(function (a) { return { x: a[0] / a[2], y: a[1] / a[2] }; });
  }
  var MEANS = classMeans();

  function predictByLabel(x, y) {
    var best = 0, bd = Infinity;
    for (var k = 0; k < 3; k++) {
      var dx = MEANS[k].x - x, dy = MEANS[k].y - y, d = dx * dx + dy * dy;
      if (d < bd) { bd = d; best = k; }
    }
    return best;
  }

  // leave-one-out score: "what accuracy could you report?"
  var labelScore = (function () {
    var wrong = 0;
    pts.forEach(function (p) {
      var s = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
      pts.forEach(function (q) {
        if (q === p) return;
        s[q.cls][0] += q.x; s[q.cls][1] += q.y; s[q.cls][2]++;
      });
      var best = 0, bd = Infinity;
      for (var k = 0; k < 3; k++) {
        var mx = s[k][0] / s[k][2], my = s[k][1] / s[k][2];
        var d = (mx - p.x) * (mx - p.x) + (my - p.y) * (my - p.y);
        if (d < bd) { bd = d; best = k; }
      }
      if (best !== p.cls) wrong++;
    });
    return 100 * (pts.length - wrong) / pts.length;
  })();

  /* -------------------------------------------------- k-means (no labels) */
  function kmeans(k, iters) {
    var centers = [pts[7], pts[62], pts[120]].slice(0, k).map(function (p) {
      return { x: p.x, y: p.y };
    });
    var assign = new Array(pts.length).fill(0);
    for (var it = 0; it < iters; it++) {
      for (var i = 0; i < pts.length; i++) {
        var best = 0, bd = Infinity;
        for (var j = 0; j < k; j++) {
          var dx = centers[j].x - pts[i].x, dy = centers[j].y - pts[i].y;
          var d = dx * dx + dy * dy;
          if (d < bd) { bd = d; best = j; }
        }
        assign[i] = best;
      }
      var sum = [], n = [];
      for (var j2 = 0; j2 < k; j2++) { sum.push([0, 0]); n.push(0); }
      for (var i2 = 0; i2 < pts.length; i2++) {
        sum[assign[i2]][0] += pts[i2].x;
        sum[assign[i2]][1] += pts[i2].y;
        n[assign[i2]]++;
      }
      for (var j3 = 0; j3 < k; j3++) {
        if (n[j3]) centers[j3] = { x: sum[j3][0] / n[j3], y: sum[j3][1] / n[j3] };
      }
    }
    return { centers: centers, assign: assign };
  }
  var KM = kmeans(3, 20);

  // best possible matching of the found groups to the real classes
  var agree = (function () {
    var votes = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    for (var i = 0; i < pts.length; i++) votes[KM.assign[i]][pts[i].cls]++;
    var usedCls = {}, matched = 0;
    var order = [0, 1, 2].sort(function (a, b) {
      return Math.max.apply(null, votes[b]) - Math.max.apply(null, votes[a]);
    });
    var map = [-1, -1, -1];
    order.forEach(function (g) {
      var bj = -1, bv = -1;
      for (var j = 0; j < 3; j++) {
        if (usedCls[j]) continue;
        if (votes[g][j] > bv) { bv = votes[g][j]; bj = j; }
      }
      map[g] = bj; usedCls[bj] = true;
    });
    for (var i2 = 0; i2 < pts.length; i2++) {
      if (map[KM.assign[i2]] === pts[i2].cls) matched++;
    }
    return { pct: 100 * matched / pts.length, map: map };
  })();

  /* --------------------------------------------------------------- render */
  var state = { mode: 'sup' };
  var COLORS = ['--plot-accent', '--plot-accent2', '--plot-good'];
  var btns = Array.prototype.slice.call(
    document.querySelectorAll('#demo-supunsup .btn[data-mode]'));
  var elMeta = document.getElementById('su-meta');
  var elLegend = document.getElementById('su-legend');

  function css(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  var plot = new Plot(cv, {
    range: { xmin: -4.9, xmax: 4.9, ymin: -4.4, ymax: 4.4 },
    height: 370,
    xlabel: 'X1 — something we measured',
    ylabel: 'X2 — something else we measured',
    draw: function (p) {
      var col = p.colors;
      var sup = state.mode === 'sup';
      var pal = COLORS.map(css);
      if (!pal[0]) pal = [col.accent, col.accent2, col.good];

      // background regions: where the current rule would send a new point
      var G = 40;
      var sx = (p.range.xmax - p.range.xmin) / G;
      var sy = (p.range.ymax - p.range.ymin) / G;
      for (var i = 0; i < G; i++) {
        for (var j = 0; j < G; j++) {
          var x0 = p.range.xmin + (i + 0.5) * sx;
          var y0 = p.range.ymin + (j + 0.5) * sy;
          var k = sup ? predictByLabel(x0, y0) : nearestGroup(x0, y0);
          p.cell(p.range.xmin + i * sx, p.range.xmin + (i + 1) * sx,
                 p.range.ymin + j * sy, p.range.ymin + (j + 1) * sy,
                 pal[k], 0.10);
        }
      }

      p.axes();

      for (var i2 = 0; i2 < pts.length; i2++) {
        var q = pts[i2];
        p.dot(q.x, q.y, {
          r: 4.6,
          color: sup ? pal[q.cls] : col.axis,
          ring: col.surface,
          ringWidth: 1.3
        });
      }

      // the group / class centres
      for (var m = 0; m < 3; m++) {
        var cc = sup ? MEANS[m] : KM.centers[m];
        p.dot(cc.x, cc.y, { r: 7, color: pal[m], ring: col.fg, ringWidth: 2.4 });
      }

      if (elMeta) {
        elMeta.innerHTML = sup
          ? 'answer column present → <b>score possible: ' +
            labelScore.toFixed(1) + '%</b> correct on a leave-one-out check'
          : 'no answer column → <b>no score exists</b>. k-means found 3 groups; ' +
            'matched to the real classes afterwards: <b>' + agree.pct.toFixed(0) + '%</b>';
      }
      if (elLegend) {
        var names = sup
          ? ['class A', 'class B', 'class C']
          : ['group 1', 'group 2', 'group 3'];
        elLegend.innerHTML = names.map(function (nm, k) {
          return '<span style="color:' + pal[k] + '">●</span> ' + nm;
        }).join('&nbsp;&nbsp;&nbsp;') +
          (sup ? ' <span class="demo-note">(the answer column)</span>'
               : ' <span class="demo-note">(found by k-means)</span>');
      }
    }
  });

  function nearestGroup(x, y) {
    var best = 0, bd = Infinity;
    for (var j = 0; j < 3; j++) {
      var dx = KM.centers[j].x - x, dy = KM.centers[j].y - y, d = dx * dx + dy * dy;
      if (d < bd) { bd = d; best = j; }
    }
    return best;
  }

  btns.forEach(function (b) {
    b.addEventListener('click', function () {
      state.mode = b.dataset.mode;
      btns.forEach(function (o) {
        o.setAttribute('aria-pressed', String(o.dataset.mode === state.mode));
      });
      plot.render();
    });
  });
})();
