/* ==========================================================================
   boot-n3.js — Chapter 5, §5.2: the bootstrap drawn by hand, on the book's
   three-observation sample Z of Figure 5.11.

   Draw three observations with replacement, watch which ones come up and
   what α̂* they give.  Only 27 ordered draws exist, so the histogram can be
   checked against the *exact* bootstrap distribution (grey outline) — and
   the draws where all three picks land on the same observation are counted
   separately, because with no variation left their α is 0/0 and undefined.
   ========================================================================== */
(function () {
  'use strict';
  var cvD = document.getElementById('cv-n3-draw');
  var cvH = document.getElementById('cv-n3-hist');
  if (!cvD || !cvH || typeof Plot === 'undefined') return;

  var Z = [
    { id: 1, x: 4.3, y: 2.4 },
    { id: 2, x: 2.1, y: 1.1 },
    { id: 3, x: 5.3, y: 2.8 }
  ];

  function alphaOf(rows) {
    var n = rows.length, mx = 0, my = 0, i;
    for (i = 0; i < n; i++) { mx += rows[i].x; my += rows[i].y; }
    mx /= n; my /= n;
    var sxx = 0, syy = 0, sxy = 0;
    for (i = 0; i < n; i++) {
      var dx = rows[i].x - mx, dy = rows[i].y - my;
      sxx += dx * dx; syy += dy * dy; sxy += dx * dy;
    }
    var den = sxx + syy - 2 * sxy;
    if (Math.abs(den) < 1e-12) return null;         // every pick identical
    return (syy - sxy) / den;
  }

  var ORIG = alphaOf(Z);               // α̂ on the three rows themselves (-1.16)

  /* the exact bootstrap distribution: 3^3 = 27 ordered draws ------------- */
  var EXACT = (function () {
    var byVal = {}, total = 0, defined = 0, i, j, k;
    for (i = 0; i < 3; i++) {
      for (j = 0; j < 3; j++) {
        for (k = 0; k < 3; k++) {
          total++;
          var a = alphaOf([Z[i], Z[j], Z[k]]);
          if (a === null) continue;
          defined++;
          var key = a.toFixed(6);
          byVal[key] = (byVal[key] || 0) + 1;
        }
      }
    }
    var vals = Object.keys(byVal).map(function (key) {
      return { a: parseFloat(key), p: byVal[key] / total };
    }).sort(function (x, y) { return x.a - y.a; });
    var pDef = defined / total;
    var mu = 0;
    vals.forEach(function (v) { mu += v.a * v.p; });
    mu /= pDef;                                  // renormalise over defined draws
    var varr = 0;
    vals.forEach(function (v) { varr += v.p * (v.a - mu) * (v.a - mu); });
    return {
      vals: vals, total: total, defined: defined,
      undefinedCount: total - defined,
      lo: vals[0].a, hi: vals[vals.length - 1].a,
      mean: mu,
      se: Math.sqrt(varr / pDef)
    };
  })();

  var state = { rnd: mulberry32(7), draws: [], last: null };

  function drawOne() {
    var ids = [
      Math.floor(state.rnd() * 3),
      Math.floor(state.rnd() * 3),
      Math.floor(state.rnd() * 3)
    ];
    var rows = ids.map(function (i2) { return Z[i2]; });
    var a = alphaOf(rows);
    var d = { ids: ids, alpha: a };
    state.draws.push(d);
    state.last = d;
  }

  function running() {
    var kept = state.draws.filter(function (d) { return d.alpha !== null; })
      .map(function (d) { return d.alpha; });
    var degen = state.draws.length - kept.length;
    var se = null;
    if (kept.length > 1) {
      var m = kept.reduce(function (s, v) { return s + v; }, 0) / kept.length;
      var v = kept.reduce(function (s, x) { return s + (x - m) * (x - m); }, 0) / (kept.length - 1);
      se = Math.sqrt(v);
    }
    return { kept: kept, degen: degen, se: se };
  }

  function set(id, html) {
    var el = document.getElementById(id);
    if (el) el.innerHTML = html;
  }

  /* ------------------------------------------------------------ the draw */
  var plotD = new Plot(cvD, {
    range: { xmin: 1.2, xmax: 6.3, ymin: 0.2, ymax: 3.8 },
    height: 300,
    xlabel: 'X',
    ylabel: 'Y',
    draw: function (p) {
      var col = p.colors;
      p.axes();

      // the original sample Z — always there
      Z.forEach(function (q) {
        p.dot(q.x, q.y, { r: 7, color: col.accent, ring: col.surface });
        p.text('obs ' + q.id, q.x, q.y - 0.42,
          { align: 'center', color: col.fg, font: '11px system-ui' });
      });

      // the current bootstrap sample: repeats stack as rings
      if (state.last) {
        var counts = [0, 0, 0];
        state.last.ids.forEach(function (i2) { counts[i2]++; });
        Z.forEach(function (q, i2) {
          for (var r = 1; r <= counts[i2]; r++) {
            p.dot(q.x, q.y, {
              r: 7 + r * 5, color: 'transparent', ring: col.accent2, ringWidth: 2
            });
          }
          if (counts[i2]) {
            p.text('× ' + counts[i2], q.x + 0.45, q.y + 0.3,
              { color: col.accent2, font: 'bold 12px system-ui' });
          }
        });
        p.text('amber rings = the bootstrap sample just drawn',
          1.3, 3.6, { color: col.accent2, font: '11.5px system-ui' });
        p.text('Z* = obs ' + (state.last.ids[0] + 1) + ', ' + (state.last.ids[1] + 1) +
          ', ' + (state.last.ids[2] + 1), 1.3, 0.45,
        { color: col.fg, font: '11.5px system-ui' });
        p.text('α̂ on Z itself = ' + ORIG.toFixed(3), 6.2, 0.45,
          { align: 'right', color: col.accent2, font: '11.5px system-ui' });
      }
    }
  });

  /* ---------------------------------------------------------- histogram */
  var plotH = new Plot(cvH, {
    range: { xmin: 0.3, xmax: 0.95, ymin: 0, ymax: 10 },
    height: 300,
    xlabel: 'α̂* from the bootstrap draw',
    ylabel: 'how often',
    draw: function (p) {
      var col = p.colors;
      var run = running();
      // the window covers every value the exact distribution can take
      var span = (EXACT.hi - EXACT.lo) || 1;
      var lo = EXACT.lo - span * 0.35, hi = EXACT.hi + span * 0.35;
      var bins = 26, counts = [];
      for (var b = 0; b < bins; b++) counts.push(0);
      run.kept.forEach(function (v) {
        var t = Math.floor((v - lo) / (hi - lo) * bins);
        if (t < 0 || t >= bins) return;
        counts[t]++;
      });
      var max = 1;
      counts.forEach(function (c) { max = Math.max(max, c); });

      // exact distribution, scaled to the same counts (p of all 27 draws)
      var scale = state.draws.length;
      var exactMax = 1;
      EXACT.vals.forEach(function (v) { exactMax = Math.max(exactMax, v.p * scale); });
      p.range.xmin = lo;
      p.range.xmax = hi;
      p.range.ymin = 0;
      p.range.ymax = Math.max(max, exactMax) * 1.3;
      p.axes();

      var w = (hi - lo) / bins;
      counts.forEach(function (c, b2) {
        if (!c) return;
        var x0 = lo + b2 * w;
        p.cell(x0, x0 + w, 0, c, col.accent, 0.75);
      });

      // grey outline = where the draws are *allowed* to land
      EXACT.vals.forEach(function (v) {
        var h = v.p * scale;
        p.line([[v.a, 0], [v.a, h]], { color: col.axis, width: 2 });
        p.line([[v.a - 0.012, h], [v.a + 0.012, h]], { color: col.axis, width: 2 });
      });

      if (run.kept.length) {
        var m = run.kept.reduce(function (s, v) { return s + v; }, 0) / run.kept.length;
        p.vline(m, { color: col.fg, width: 1.8, dash: [5, 4] });
        p.text('average = ' + m.toFixed(4), m, p.range.ymax * 0.95,
          { align: 'center', base: 'top', color: col.fg, font: '11.5px system-ui' });
        p.vline(EXACT.mean, { color: col.good, width: 1.6, dash: [3, 3] });
      }
      p.vline(ORIG, { color: col.accent2, width: 2.2 });
      p.text('α̂ on Z = ' + ORIG.toFixed(3), ORIG, p.range.ymax * 0.80,
        { align: 'right', base: 'bottom', color: col.accent2, font: '11.5px system-ui' });

      var last = state.last;
      set('n3-sample', last
        ? 'last draw: obs <b>' + (last.ids[0] + 1) + ' · ' + (last.ids[1] + 1) +
          ' · ' + (last.ids[2] + 1) + '</b>'
        : 'last draw: <b>—</b>');
      set('n3-alpha', last
        ? (last.alpha === null
          ? 'α̂* = <b>undefined</b> (all three picks identical)'
          : 'α̂* = <b>' + last.alpha.toFixed(4) + '</b>')
        : 'α̂* = <b>—</b>');
      set('n3-se', 'your SE: <b>' + (run.se === null ? '—' : run.se.toFixed(4)) +
        '</b> · exact over all 27 draws: <b>' + EXACT.se.toFixed(4) + '</b>');
      set('n3-count', 'draws kept: <b>' + run.kept.length + '</b> of ' +
        state.draws.length);
      set('n3-degen', 'undefined (all three the same): <b>' + run.degen +
        '</b> of ' + state.draws.length + ' — ' + EXACT.undefinedCount + ' of ' +
        EXACT.total + ' possible');
    }
  });

  function redraw() { plotD.render(); plotH.render(); }

  /* ------------------------------------------------------------ controls */
  var one = document.getElementById('n3-one');
  if (one) one.addEventListener('click', function () { drawOne(); redraw(); });

  var many = document.getElementById('n3-hundred');
  if (many) many.addEventListener('click', function () {
    for (var i = 0; i < 100; i++) drawOne();
    redraw();
  });

  var reset = document.getElementById('n3-reset');
  if (reset) reset.addEventListener('click', function () {
    state.rnd = mulberry32(7);
    state.draws = [];
    state.last = null;
    redraw();
  });

  for (var i = 0; i < 40; i++) drawOne();      // start with a small pile
  redraw();
})();
