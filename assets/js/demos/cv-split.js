/* ==========================================================================
   cv-split.js — Chapter 5, §5.1.1–5.1.3: what "split the data" looks like.

   One schematic, three modes, in the style of the book's Figures 5.1, 5.3
   and 5.5: rows of observations, blue = used to fit, amber = held out.
   Switch between the validation set approach (one 50/50 split), LOOCV
   (one row per left-out observation) and k-fold CV (one row per fold).
   ========================================================================== */
(function () {
  'use strict';
  var cv = document.getElementById('cv-csplit');
  if (!cv || typeof Plot === 'undefined') return;

  var N = 20;                       // observations in the schematic
  var state = { mode: 'val', k: 5, active: 0, splitSeed: 3 };
  var BLUE = '#3b82f6', AMBER = '#f59e0b';

  /* which columns are held out in row r, per mode ------------------------ */
  function validCols(r) {
    var out = [], i;
    if (state.mode === 'loo') {
      out.push(r);
    } else if (state.mode === 'kf') {
      var lo = Math.floor(r * N / state.k), hi = Math.floor((r + 1) * N / state.k);
      for (i = lo; i < hi; i++) out.push(i);
    } else {
      var rnd = mulberry32(state.splitSeed), pick = [];
      for (i = 0; i < N; i++) pick.push(i);
      for (i = N - 1; i > 0; i--) {
        var j = Math.floor(rnd() * (i + 1)), t = pick[i]; pick[i] = pick[j]; pick[j] = t;
      }
      out = pick.slice(0, N / 2).sort(function (a, b) { return a - b; });
    }
    return out;
  }

  function rows() { return state.mode === 'val' ? 1 : state.mode === 'loo' ? N : state.k; }

  /* -------------------------------------------------------------- drawing */
  var plot = new Plot(cv, {
    range: { xmin: 0, xmax: 1, ymin: 0, ymax: 1 },
    height: function () {
      var n = rows();                    // one row per split / fold
      return Math.max(96, Math.min(462, 16 + n * 20 + 46));
    },
    pad: { l: 10, r: 10, t: 10, b: 10 },
    draw: function (p) {
      var col = p.colors, c = p.ctx;
      var left = 96, right = 118, top = 16, bottom = 14;
      var nrows = rows();
      var rowH = Math.min(20, (p.h - top - bottom) / nrows);
      var cellGap = 2;
      var cellW = (p.w - left - right) / N;

      c.save();
      c.font = '11px system-ui, sans-serif';

      for (var r = 0; r < nrows; r++) {
        var held = validCols(r);
        var y = top + r * rowH;
        var isActive = r === state.active;
        var mid = y + rowH / 2;

        // row label
        c.fillStyle = isActive ? col.fg : col.axis;
        c.textAlign = 'right';
        c.textBaseline = 'middle';
        c.fillText(state.mode === 'val' ? 'the split'
          : state.mode === 'loo' ? 'leave out ' + (r + 1)
            : 'fold ' + (r + 1), left - 10, mid);

        // cells
        for (var i = 0; i < N; i++) {
          var isHeld = held.indexOf(i) !== -1;
          c.globalAlpha = isActive ? 1 : 0.42;
          c.fillStyle = isHeld ? AMBER : BLUE;
          c.fillRect(left + i * cellW + cellGap / 2, y + 2,
            Math.max(2, cellW - cellGap), Math.max(4, rowH - 5));
          c.globalAlpha = 1;
        }

        // right-hand caption for the active row
        if (isActive) {
          var nTrain = N - held.length;
          c.fillStyle = col.fg;
          c.textAlign = 'left';
          c.fillText('fit on ' + nTrain + ', score on ' + held.length,
            left + N * cellW + 10, mid);
        }

        // highlight the active row
        if (isActive) {
          c.strokeStyle = col.accent;
          c.lineWidth = 1.6;
          c.strokeRect(left - 3, y + 0.5, N * cellW + 6, Math.max(6, rowH - 2));
        }
      }

      // legend
      var ly = top + nrows * rowH + 12;
      c.fillStyle = BLUE;
      c.fillRect(left, ly - 5, 12, 10);
      c.fillStyle = col.fg;
      c.textAlign = 'left';
      c.textBaseline = 'middle';
      c.fillText('used to fit', left + 18, ly);
      c.fillStyle = AMBER;
      c.fillRect(left + 96, ly - 5, 12, 10);
      c.fillStyle = col.fg;
      c.fillText('held out, used only to score', left + 114, ly);
      c.restore();

      /* ------------------------------------------------------- readouts */
      var nTrain, fits, how;
      if (state.mode === 'val') {
        nTrain = N / 2; fits = 1;
        how = 'estimate = <b>1</b> validation MSE';
      } else if (state.mode === 'loo') {
        nTrain = N - 1; fits = N;
        how = 'estimate = average of <b>20</b> single-point MSEs';
      } else {
        nTrain = N - Math.round(N / state.k); fits = state.k;
        how = 'estimate = average of <b>' + state.k + '</b> fold MSEs';
      }
      set('cs-train', 'training: <b>' + nTrain + '</b> of ' + N + ' points');
      set('cs-fits', 'model fits needed: <b>' + fits + '</b>');
      set('cs-est', how);
      set('cs-active', state.mode === 'val'
        ? 'now: one random 50/50 split'
        : state.mode === 'loo'
          ? 'now: observation <b>' + (state.active + 1) + '</b> is the validation set'
          : 'now: fold <b>' + (state.active + 1) + '</b> of ' + state.k + ' is held out');
    }
  });

  function set(id, html) {
    var el = document.getElementById(id);
    if (el) el.innerHTML = html;
  }

  /* ------------------------------------------------------------- controls */
  var modeBtns = {
    val: document.getElementById('cs-mode-val'),
    loo: document.getElementById('cs-mode-loo'),
    kf: document.getElementById('cs-mode-kf')
  };
  Object.keys(modeBtns).forEach(function (m) {
    if (!modeBtns[m]) return;
    modeBtns[m].addEventListener('click', function () {
      state.mode = m;
      state.active = 0;
      Object.keys(modeBtns).forEach(function (mm) {
        if (modeBtns[mm]) modeBtns[mm].setAttribute('aria-pressed', String(mm === m));
      });
      plot.resize();                      // row count (and height) changed
      plot.render();
    });
  });

  var step = document.getElementById('cs-step');
  if (step) step.addEventListener('click', function () {
    if (state.mode === 'val') state.splitSeed++;
    else state.active = (state.active + 1) % rows();
    plot.render();
  });

  var kSlider = document.getElementById('cs-k');
  if (kSlider) kSlider.addEventListener('input', function () {
    state.k = parseInt(this.value, 10);
    state.active = state.active % state.k;
    plot.resize();                      // row count changed with k
    plot.render();
  });

  Object.keys(modeBtns).forEach(function (m) {
    if (modeBtns[m]) modeBtns[m].setAttribute('aria-pressed', String(m === 'val'));
  });
  plot.render();
})();
