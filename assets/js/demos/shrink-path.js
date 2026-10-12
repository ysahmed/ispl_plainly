/* ==========================================================================
   shrink-path.js — Chapter 6, §6.2.1: the ridge and lasso coefficient paths
   on the Credit data (ISLP Figures 6.4 and 6.6).

   Both paths are precomputed by tools/ch06_data.py because coordinate
   descent on Credit's near-collinear Limit/Rating pair is slow to converge
   in the browser.  The coefficients are on the standardised scale (each
   predictor centred and divided by its standard deviation, ISLP eq. 6.6),
   so all eleven are comparable on one picture.  The x-axis can be read
   either as λ (log scale, the book's own RSS + λΣβ² / RSS + λΣ|β| scale)
   or as the relative amount of shrinkage left in the fit.
   ========================================================================== */
(function () {
  'use strict';
  var cPath = document.getElementById('sp-path');
  if (!cPath || typeof Plot === 'undefined') return;
  if (!window.CH06_LASSO || !window.CH06_RIDGE) return;

  var LASSO = window.CH06_LASSO, RIDGE = window.CH06_RIDGE;
  var CV = window.CH06_LASSOCV;
  var NAMES = ['Income', 'Limit', 'Rating', 'Cards', 'Age', 'Education',
               'Student', 'Gender', 'Married', 'Ethnicity[Asian]',
               'Ethnicity[Caucasian]'];
  var P = NAMES.length;
  // which predictors the book singles out as the big ones (Limit, Rating,
  // Income) get a stronger colour so the reader can follow them through
  var EMPH = { 0: 1, 1: 1, 2: 1 };

  function data() { return state.ridge ? RIDGE : LASSO; }
  var state = { ridge: false, xi: 11, show: 'lam' };   // opens on λ ≈ 23,600,
                                                       // where the lasso holds
                                                       // exactly the four
                                                       // Credit variables the
                                                       // book calls important

  // the x value for grid point k under the current axis choice
  function ratioAt(k) { return state.ridge ? RIDGE.l2ratio[k] : LASSO.l1ratio[k]; }
  function xOf(k) {
    return state.show === 'lam' ? Math.log10(data().lambda[k]) : ratioAt(k);
  }
  function xRange() {
    var d = data();
    if (state.show === 'lam') {
      return { xmin: Math.log10(d.lambda[d.lambda.length - 1]),
               xmax: Math.log10(d.lambda[0]) };
    }
    return { xmin: 0, xmax: 1 };
  }

  var plot = new Plot(cPath, {
    range: { xmin: 0, xmax: 1, ymin: -320, ymax: 480 },
    height: 330,
    xlabel: 'log₁₀ λ  (the book’s own scale)',
    ylabel: 'standardised coefficient',
    draw: function (p) {
      var d = data();
      var r = xRange();
      p.setRange({ xmin: r.xmin, xmax: r.xmax, ymin: -320, ymax: 480 });
      p.axes();

      // vertical line at the CV-chosen λ (lasso only — there is no
      // precomputed CV here for ridge).  Caption it below the very top: the
      // "Limit" path label already occupies the corner, and at y = 455 the
      // two words printed over each other.
      if (!state.ridge && state.show === 'lam' && typeof CV !== 'undefined') {
        p.vline(Math.log10(CV.lambda[CV.best]), { color: p.colors.accent, dash: [5, 4], width: 1.5 });
        p.text('CV minimum', Math.log10(CV.lambda[CV.best]), 415,
          { color: p.colors.accent, align: 'left', base: 'top', font: '11px system-ui, sans-serif' });
      }

      // every coefficient path
      for (var j = 0; j < P; j++) {
        var pts = [];
        for (var k = 0; k < d.lambda.length; k++) pts.push([xOf(k), d.beta[k][j]]);
        p.line(pts, { color: EMPH[j] ? p.colors.accent : p.colors.axis,
                      width: EMPH[j] ? 2 : 1.2,
                      alpha: EMPH[j] ? 1 : 0.7 });
      }
      // Label the three emphasised ones at the least-shrunk end of the path.
      // That end is the right edge of the ratio axis but the LEFT edge of a
      // log λ axis, so label on whichever side faces into the plot — otherwise
      // the words hang out over the y-axis margin.  The label also goes on the
      // side the path is not heading, so the text never lands on its own line.
      var last = d.lambda.length - 1, near = last - 1;
      var r0 = xRange(), nudge = (r0.xmax - r0.xmin) * 0.015;
      // on a log λ axis the anchor is the left edge, so the plot lies to its
      // right; on the ratio axis the anchor is the right edge, so it lies left
      var interiorRight = state.show === 'lam';
      var xl = interiorRight ? r0.xmin + nudge : r0.xmax - nudge;
      [0, 1, 2].forEach(function (j) {
        var rising = d.beta[near][j] > d.beta[last][j];
        p.text(NAMES[j], xl, d.beta[last][j],
          { color: p.colors.accent, align: interiorRight ? 'left' : 'right',
            base: rising ? 'top' : 'bottom',
            font: '11px system-ui, sans-serif' });
      });

      // the reader's slider position
      p.vline(xOf(state.xi), { color: p.colors.fg, dash: [2, 3] });
    }
  });

  /* ---------------------------------------------------------- interaction */
  var slider = document.getElementById('sp-lam');
  var elRead = document.getElementById('sp-read');
  var elLambda = document.getElementById('sp-lambda');
  var elShrink = document.getElementById('sp-shrink');
  var elNz = document.getElementById('sp-nz');
  var btnRidge = document.getElementById('sp-ridge');
  var btnLasso = document.getElementById('sp-lasso');
  var btnAxis = document.getElementById('sp-axis');

  function fmt(v) { return (v >= 0 ? '' : '−') + Math.abs(v).toFixed(1); }

  function update() {
    plot.render();
    var d = data(), b = d.beta[state.xi];
    if (elLambda) {
      elLambda.innerHTML = 'λ = <b>' + Math.round(d.lambda[state.xi]).toLocaleString('en-US') + '</b>';
    }
    if (elShrink) {
      var ratio = state.ridge ? RIDGE.l2ratio[state.xi] : LASSO.l1ratio[state.xi];
      var kind = state.ridge ? '‖β̂λ‖₂ / ‖β̂‖₂' : '‖β̂λ‖₁ / ‖β̂‖₁';
      elShrink.innerHTML = kind + ' = <b>' + ratio.toFixed(3) + '</b>';
    }
    if (elNz) {
      if (state.ridge) {
        elNz.innerHTML = 'non-zero coefficients: <b>all 11</b> (ridge never zeroes any)';
      } else {
        elNz.innerHTML = 'non-zero coefficients: <b>' + LASSO.nz[state.xi] + '</b> of 11';
      }
    }
    if (elRead) {
      // show the three emphasised coefficients at this λ
      var txt = '';
      [1, 2, 0].forEach(function (j) {
        txt += (txt ? ' · ' : '') + NAMES[j] + ' ' + fmt(b[j]);
      });
      elRead.innerHTML = 'at this λ: ' + txt;
    }
  }

  // The path arrays run from λmax downward, but the marker must always travel
  // the same way as the thumb.  On a log λ axis larger λ lies further right,
  // so the index runs backwards there; on the shrinkage-ratio axis larger
  // ratios lie further right, so it runs forwards.  The map is an involution
  // in both modes, so it converts in either direction.
  function sliderFor(xi) {
    var max = data().lambda.length - 1;
    return state.show === 'lam' ? max - xi : xi;
  }

  function setXi(v) {
    var max = data().lambda.length - 1;
    state.xi = Math.max(0, Math.min(max, v));
    if (slider) {
      slider.max = String(max);
      slider.value = String(sliderFor(state.xi));
    }
    update();
  }

  if (slider) {
    slider.addEventListener('input', function () { setXi(sliderFor(+slider.value)); });
  }

  function setMethod(ridge) {
    state.ridge = ridge;
    if (btnRidge) btnRidge.setAttribute('aria-pressed', String(ridge));
    if (btnLasso) btnLasso.setAttribute('aria-pressed', String(!ridge));
    setXi(state.xi);
  }
  if (btnRidge) btnRidge.addEventListener('click', function () { setMethod(true); });
  if (btnLasso) btnLasso.addEventListener('click', function () { setMethod(false); });
  if (btnAxis) btnAxis.addEventListener('click', function () {
    state.show = state.show === 'lam' ? 'ratio' : 'lam';
    btnAxis.textContent = state.show === 'lam' ? 'x = λ' : 'x = ‖β̂λ‖/‖β̂‖';
    if (plot.o.xlabel !== undefined) {
      plot.o.xlabel = state.show === 'lam'
        ? 'log₁₀ λ  (the book’s own scale)'
        : (state.ridge ? '‖β̂λ‖₂ / ‖β̂‖₂' : '‖β̂λ‖₁ / ‖β̂‖₁');
    }
    setXi(state.xi);            // resync the thumb: the axis just flipped
  });

  setMethod(false);
})();
