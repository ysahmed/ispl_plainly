/* ==========================================================================
   shrink-soft.js — Chapter 6, §6.2.1: proportional shrinkage vs
   soft-thresholding (ISLP Figure 6.10, eqs. 6.14 and 6.15).

   The book's toy setting: n = p and X a diagonal matrix of 1's, so the
   least-squares estimate of coordinate j is just yj and the two penalties
   can be solved in closed form.  Eq. (6.14) gives the ridge estimate

       beta_j^R = y_j / (1 + lambda)          — a fixed FRACTION of OLS

   and eq. (6.15) gives the lasso estimate

       beta_j^L = y_j -+ lambda/2, or 0 if |y_j| <= lambda/2   — a fixed
                                                                 AMOUNT off

   Left panel:  both maps drawn against the 45-degree line.  Ridge is a
   straight line through the origin (every coefficient keeps the same
   proportion of itself); the lasso is the same line but flat at zero
   inside the dead-zone |y| <= lambda/2, so coefficients small enough to
   fall inside are wiped out exactly.  That flat shoulder is the whole
   reason the lasso does feature selection and ridge never does.

   Right panel: the eleven real Credit least-squares coefficients under
   the two maps at once, so the abstract picture has concrete victims.
   ========================================================================== */
(function () {
  'use strict';
  var cMap = document.getElementById('ss-map');
  var cCredit = document.getElementById('ss-credit');
  if (!cMap || !cCredit || typeof Plot === 'undefined' || typeof Stats === 'undefined') return;
  if (!window.CH03_CREDIT) return;

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

  // least-squares coefficients on the standardised scale
  var pre = Stats.prepare(COLS, y);
  var Xd = [];
  for (i = 0; i < n; i++) {
    var row = [1];
    for (j = 0; j < pre.p; j++) row.push(pre.Z[i][j]);
    Xd.push(row);
  }
  var ols = Stats.ols(Xd, pre.y);
  var B = ols.beta.slice(1);              // 11 least-squares coefficients
  var span = 0;
  for (j = 0; j < B.length; j++) span = Math.max(span, Math.abs(B[j]));
  // 1.12, not 1.05: the biggest coefficient (Limit) carries a label drawn a
  // little above it, and at 1.05 that label plus its own text height pushed
  // the ink out over the top of the plot box — the right panel then sat
  // visibly higher than the left one even though the axes matched exactly.
  span = Math.ceil(span * 1.12);
  var LABEL_FONT = 10;                   // px, must match the font below

  var state = { lam: 0.0 };

  /* --------------------------------------------------- the two shrinkage maps */
  var mapPlot = new Plot(cMap, {
    range: { xmin: -span, xmax: span, ymin: -span, ymax: span },
    height: 330,
    xlabel: 'least-squares estimate  β̂',
    ylabel: 'shrunken estimate  β̂λ',
    draw: function (p) {
      p.axes();
      var lam = state.lam, half = lam / 2;
      // the 45-degree line = "no shrinkage at all"
      p.line([[-span, -span], [span, span]],
        { color: p.colors.axis, dash: [4, 4], width: 1 });
      p.text('no shrinkage', span * 0.55, span * 0.62,
        { color: p.colors.axis, align: 'left', base: 'bottom', font: '11px system-ui, sans-serif' });

      // (6.14) ridge: one straight line through the origin, slope 1/(1+λ)
      var k = 1 / (1 + lam);
      p.line([[-span, -span * k], [span, span * k]],
        { color: p.colors.accent, width: 2.5 });
      p.text('ridge  β̂/(1+λ)', span * 0.6, span * 0.6 * k,
        { color: p.colors.accent, align: 'left', base: 'bottom', font: '11px system-ui, sans-serif' });

      // (6.15) lasso: soft-threshold at λ/2
      p.line([[-span, -span + half], [-half, 0], [half, 0], [span, span - half]],
        { color: p.colors.accent2, width: 2.5 });
      p.text('lasso  S(β̂, λ/2)', span * 0.6, span * 0.6 - half,
        { color: p.colors.accent2, align: 'left', base: 'bottom', font: '11px system-ui, sans-serif' });

      // the dead zone: everything inside |β̂| <= λ/2 is sent to exactly zero
      if (half > 0) {
        p.cell(-half, half, -span, span, p.colors.accent2, 0.10);
        p.vline(-half, { color: p.colors.accent2, dash: [3, 3], width: 1 });
        p.vline(half, { color: p.colors.accent2, dash: [3, 3], width: 1 });
        p.text('dead zone  |β̂| ≤ λ/2', 0, -span * 0.88,
          { color: p.colors.accent2, align: 'center', base: 'bottom', font: '11px system-ui, sans-serif' });
      }
    }
  });

  /* --------------------------------------- the eleven real Credit coefficients */
  var creditPlot = new Plot(cCredit, {
    range: { xmin: -0.5, xmax: 10.5, ymin: -span, ymax: span },
    height: 330,
    xlabel: 'predictor',
    ylabel: 'coefficient',
    draw: function (p) {
      p.axes();
      var lam = state.lam, half = lam / 2, k = 1 / (1 + lam);
      // faint ties from zero to the least-squares value
      for (j = 0; j < B.length; j++) {
        p.line([[j, 0], [j, B[j]]], { color: p.colors.axis, width: 1, alpha: 0.5 });
      }
      // least squares (hollow), ridge (filled accent), lasso (filled accent2)
      for (j = 0; j < B.length; j++) {
        p.dot(j, B[j], { color: p.colors.axis, r: 3.5, ring: p.colors.surface, ringWidth: 1.5 });
        p.dot(j, B[j] * k, { color: p.colors.accent, r: 4.5 });
        var lv = Math.abs(B[j]) <= half ? 0 : B[j] - Math.sign(B[j]) * half;
        p.dot(j, lv, { color: p.colors.accent2, r: 4.5 });
      }
      // label the three biggest so the eye has an anchor.  Anchor them so the
      // text stays inside the plot box — clamp against the label's own height
      // converted into data units, so no dataset can overflow the frame.
      var perPx = (span * 2) / Math.max(1, p.h - p.o.pad.t - p.o.pad.b);
      var topLim = span - LABEL_FONT * perPx, botLim = -span + LABEL_FONT * perPx;
      [1, 2, 0].forEach(function (jj) {
        var up = B[jj] > 0, off = span * 0.04;
        var yl = up ? Math.min(B[jj] + off, topLim) : Math.max(B[jj] - off, botLim);
        p.text(NAMES[jj], jj, yl,
          { color: p.colors.fg, align: 'center', base: up ? 'bottom' : 'top',
            font: LABEL_FONT + 'px system-ui, sans-serif' });
      });
      if (half > 0) p.line([[-0.5, 0], [10.5, 0]], { color: p.colors.accent2, dash: [3, 3], width: 1 });
    }
  });

  /* ---------------------------------------------------------- interaction */
  var slider = document.getElementById('ss-lam');
  var elLam = document.getElementById('ss-lamread');
  var elFrac = document.getElementById('ss-frac');
  var elDead = document.getElementById('ss-dead');
  var elZero = document.getElementById('ss-zero');
  var elNote = document.getElementById('ss-note');

  function update() {
    mapPlot.render();
    creditPlot.render();
    var lam = state.lam, half = lam / 2, k = 1 / (1 + lam);
    var zeros = 0;
    for (j = 0; j < B.length; j++) if (Math.abs(B[j]) <= half) zeros++;

    if (elLam) elLam.innerHTML = 'λ = <b>' + lam.toFixed(2) + '</b>';
    if (elFrac) elFrac.innerHTML = 'ridge keeps <b>' + (100 * k).toFixed(1) + '%</b> of every OLS coefficient';
    if (elDead) elDead.innerHTML = 'dead zone |β̂| ≤ λ/2 = <b>' + half.toFixed(2) + '</b>';
    if (elZero) {
      elZero.innerHTML = 'lasso zeroes <b>' + zeros + ' of 11</b> Credit predictors here';
    }
    if (elNote) {
      if (half === 0) elNote.innerHTML = 'λ = 0: both maps are the 45° line — plain least squares.';
      else if (k > 0.999) elNote.innerHTML = 'tiny λ: ridge barely moves anything, lasso already zeroes the small ones.';
      else if (zeros === 11) elNote.innerHTML = 'λ/2 now exceeds every |β̂| — the lasso has sent the whole model to zero.';
      else elNote.innerHTML = 'ridge shrinks every coefficient by the same <em>fraction</em>; the lasso by the same <em>amount</em>.';
    }
  }
  function setLam(v) { state.lam = Math.max(0, v); if (slider) slider.value = String(state.lam); update(); }
  if (slider) slider.addEventListener('input', function () { setLam(+slider.value); });

  setLam(0);
})();
