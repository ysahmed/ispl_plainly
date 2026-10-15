/* ==========================================================================
   lr-wage.js — Chapter 7, §7.6: ISLP Figure 7.10 on the Wage data.

   Local regression of wage on age for all 3,000 men, with two controls
   the printed figure fixes: the span (it shows 0.2 and 0.7, drawn as the
   two grey reference curves) and the degree of the local polynomial
   (Algorithm 7.1's step 3 leaves constant/linear/quadratic open; eq.
   (7.14) is the linear one, so that is the default here).

   The right-hand panel counts effective degrees of freedom against span
   under the two conventions page 7.5 introduced — tr(S), the diagonal
   of the smoother, and tr(S'S), the sum of squared smoother-row
   lengths.  The book's legend prints a third count, "16.4" and "5.3"
   degrees of freedom for spans 0.2 and 0.7, and those two dots are drawn
   on the panel whenever degree 2 is selected: they are R loess's enp at
   its default local QUADRATIC degree (re-running R gives 16.41607 and
   5.29968), not any count of a local-linear fit — which is why the page
   prints both numbers side by side instead of pretending they agree.

   Readouts: k = ceil(s*n), how many men fall within h at age 47 (age
   is an integer, so ties make that larger than k — the book's "k = s*n
   closest" rule keeps all of them), and the two counts plus RSS.
   ========================================================================== */
(function () {
  'use strict';
  var cPlot = document.getElementById('lr-wg-plot'),
      cDf = document.getElementById('lr-wg-dfplot');
  if (!cPlot || !cDf || typeof Plot === 'undefined' || typeof Stats === 'undefined' ||
      typeof CH07_WAGE === 'undefined') return;

  var W = window.CH07_WAGE;
  var age = W.age.map(Number), wage = W.wage.map(Number), n = W.n;
  var prep = Stats.localPrepare(age, wage);

  var elSpan = document.getElementById('lr-wg-span'),
      elDeg = document.getElementById('lr-wg-deg'),
      elB02 = document.getElementById('lr-wg-b02'),
      elB05 = document.getElementById('lr-wg-b05'),
      elB07 = document.getElementById('lr-wg-b07');
  if (!elSpan || !elDeg || !elB02 || !elB05 || !elB07) return;
  var elK = document.getElementById('lr-wg-k'),
      elNb = document.getElementById('lr-wg-nb'),
      elDf = document.getElementById('lr-wg-df'),
      elEnp = document.getElementById('lr-wg-enp'),
      elRss = document.getElementById('lr-wg-rss');
  if (!elK || !elNb || !elDf || !elEnp || !elRss) return;

  var LOCAL = '#d55e00', REF = '#aab4c4';
  var SPANS = [], i;
  for (i = 1; i <= 20; i++) SPANS.push(Math.round(i * 5) / 100);   // 0.05 .. 1
  var GRID = [];
  for (i = 0; i <= 248; i++) GRID.push(18 + i * 0.25);             // age grid

  /* the book's own two spans, drawn faintly like the printed figure */
  var refCurves = { 2: null, 5: null, 7: null };   // keyed by span*100 (0.2/0.7)
  var dfPanel = {};                                // per degree: {df:[], enp:[]}
  var state = { span: 0.2, deg: 1 };

  function ensureRefs(deg) {
    if (refCurves[2] && refCurves[2].deg === deg) return;
    refCurves[2] = { deg: deg, pts: Stats.localCurve(prep, GRID, 0.2, deg) };
    refCurves[7] = { deg: deg, pts: Stats.localCurve(prep, GRID, 0.7, deg) };
  }

  function ensureDfPanel(deg) {
    if (dfPanel[deg]) return dfPanel[deg];
    var d = { df: [], enp: [] };
    for (var j = 0; j < SPANS.length; j++) {
      var s = Stats.localSummary(prep, SPANS[j], deg);
      d.df.push(s.df); d.enp.push(s.enp);
    }
    dfPanel[deg] = d;
    return d;
  }

  function commas(v) {
    return v.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  /* ---- left panel: the scatter and the fits --------------------------- */
  var scatter = [];
  for (i = 0; i < n; i++) scatter.push([age[i], wage[i]]);

  var plot = new Plot(cPlot, {
    range: { xmin: 17, xmax: 81, ymin: 0, ymax: 325 },
    height: 330, xlabel: 'age', ylabel: 'wage (thousands of dollars)',
    draw: function (p) {
      p.axes();
      p.points(scatter, { color: '#96a0b3', r: 1.5, alpha: 0.45 });
      ensureRefs(state.deg);
      p.line(GRID.map(function (a, j) { return [a, refCurves[2].pts[j]]; }),
        { color: REF, width: 1.5 });
      p.line(GRID.map(function (a, j) { return [a, refCurves[7].pts[j]]; }),
        { color: REF, width: 1.5, dash: [5, 4] });
      var cur = Stats.localCurve(prep, GRID, state.span, state.deg);
      p.line(GRID.map(function (a, j) { return [a, cur[j]]; }),
        { color: LOCAL, width: 2.6 });
      p.text('grey: the book’s spans 0.2 and 0.7', 79.5, 312, {
        align: 'right', color: '#6b7484', font: '12px system-ui, sans-serif'
      });
      p.text('span ' + state.span.toFixed(2) + ', degree ' + state.deg, 19, 312, {
        color: LOCAL, font: 'bold 12.5px system-ui, sans-serif'
      });
    }
  });

  /* ---- right panel: the two counts against span ----------------------- */
  var dfPlot = new Plot(cDf, {
    range: { xmin: 0, xmax: 1.05, ymin: 0, ymax: 20 },
    height: 330, xlabel: 'span s', ylabel: 'effective degrees of freedom',
    draw: function (p) {
      p.axes();
      var d = ensureDfPanel(state.deg);
      p.line(SPANS.map(function (s, j2) { return [s, d.df[j2]]; }),
        { color: p.colors.accent, width: 2.2 });
      p.line(SPANS.map(function (s, j2) { return [s, d.enp[j2]]; }),
        { color: p.colors.accent2, width: 2.2 });
      p.points(SPANS.map(function (s, j2) { return [s, d.df[j2]]; }),
        { color: p.colors.accent, r: 2.8 });
      p.points(SPANS.map(function (s, j2) { return [s, d.enp[j2]]; }),
        { color: p.colors.accent2, r: 2.8 });
      if (state.deg === 2) {
        p.dot(0.2, 16.4, { color: p.colors.surface, ring: p.colors.fg, r: 4.5 });
        p.dot(0.7, 5.3, { color: p.colors.surface, ring: p.colors.fg, r: 4.5 });
        p.text('the book’s legend (R loess, degree 2)', 1.02, 16.4 + 0.9, {
          align: 'right', color: p.colors.fg, font: '11.5px system-ui, sans-serif'
        });
      }
      p.vline(state.span, { color: LOCAL, width: 1.5, dash: [4, 4] });
      p.text('tr(S)', 1.02, d.df[SPANS.length - 1] + 1.1, {
        align: 'right', color: p.colors.accent, font: 'bold 12px system-ui, sans-serif'
      });
      p.text('tr(S′S)', 1.02, d.enp[SPANS.length - 1] - 1.4, {
        align: 'right', color: p.colors.accent2, font: 'bold 12px system-ui, sans-serif'
      });
    }
  });

  function render() {
    var span = +elSpan.value, deg = +elDeg.value;
    state.span = span; state.deg = deg;
    var sum = Stats.localSummary(prep, span, deg);
    var win = Stats.localWindow(47, prep, span, deg);
    elK.textContent = 'k = ' + win.k + ' of ' + n;
    elNb.textContent = 'at age 47: ' + (win.r - win.l) + ' within h';
    elDf.textContent = 'df = tr(S) = ' + sum.df.toFixed(2);
    elEnp.textContent = 'enp = tr(S′S) = ' + sum.enp.toFixed(2);
    elRss.textContent = 'RSS = ' + commas(sum.rss);
    /* the df panel scales to whatever the counts do at this degree —
       setRange repaints, so it must not be called from inside draw */
    var d = ensureDfPanel(deg), top = 0, j;
    for (j = 0; j < SPANS.length; j++) top = Math.max(top, d.df[j], d.enp[j]);
    if (deg === 2) top = Math.max(top, 16.4);
    dfPlot.setRange({ xmin: 0, xmax: 1.05, ymin: 0, ymax: top * 1.18 });
    plot.render();
  }

  elSpan.addEventListener('input', render);
  elDeg.addEventListener('change', render);
  function setSpan(v) {
    elSpan.value = String(v);
    render();
  }
  elB02.addEventListener('click', function () { setSpan(0.2); });
  elB05.addEventListener('click', function () { setSpan(0.5); });
  elB07.addEventListener('click', function () { setSpan(0.7); });
  render();
})();
