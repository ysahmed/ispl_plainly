/* ==========================================================================
   notation.js — the "notation decoder" for Chapter 1's matrix section.
   A tiny spreadsheet of five real Wage records sits on the left; every
   symbol the book uses (n, p, x_ij, x_i, x_j, y_i) is a button. Pick a
   symbol and the table highlights exactly the cells it refers to, with
   the plain-English sentence underneath. Hovering refines i and j.
   ========================================================================== */
(function () {
  'use strict';

  var host = document.getElementById('ntable');
  var D = window.ISLP_CH01;
  if (!host || !D) return;

  var ROWS = 5;
  var W = D.wage;
  var eduLabels = W.eduLabels;

  var COLS = [
    { key: 'year', head: 'year', get: function (r) { return String(W.year[r]); }, plain: 'year' },
    { key: 'age', head: 'age', get: function (r) { return String(W.age[r]); }, plain: 'age' },
    { key: 'edu', head: 'education', get: function (r) { return eduLabels[W.edu[r] - 1]; }, plain: 'education' },
    { key: 'y', head: 'wage', get: function (r) { return '$' + W.wage[r].toFixed(1) + 'k'; }, plain: 'wage', response: true }
  ];

  var state = { mode: 'xij', i: 2, j: 1 };   // i and j are 0-based here

  var MODES = {
    n: {
      sym: 'n',
      say: function () {
        return '<strong>n</strong> — the number of rows: <b>' + ROWS + '</b> shown here, ' +
          '<b>3,000</b> in the real data. One row is one person. Nobody is missing a row.';
      }
    },
    p: {
      sym: 'p',
      say: function () {
        return '<strong>p</strong> — the number of columns: <b>' + COLS.length + '</b> shown here, ' +
          '<b>11</b> in the real data. One column is one variable we measured.';
      }
    },
    xij: {
      sym: 'x_{ij}',
      say: function () {
        var c = COLS[state.j];
        return '<strong>x<sub>' + (state.i + 1) + (state.j + 1) + '</sub></strong> — one cell. ' +
          'Row <b>' + (state.i + 1) + '</b>, column <b>' + (state.j + 1) + '</b>: ' +
          'the <em>' + c.plain + '</em> of person ' + (state.i + 1) + '. ' +
          'Read it as “the jth variable for the ith observation”.';
      }
    },
    xi: {
      sym: 'x_i',
      say: function () {
        return '<strong>x<sub>' + (state.i + 1) + '</sub></strong> — a whole row. ' +
          'Everything we measured on person ' + (state.i + 1) + ', squeezed into one list of ' +
          COLS.length + ' numbers (of ' + '11' + ' in the real data).';
      }
    },
    xj: {
      sym: 'x_j',
      say: function () {
        var c = COLS[state.j];
        return '<strong>x<sub>' + (state.j + 1) + '</sub></strong> — a whole column. ' +
          'Everyone’s <em>' + c.plain + '</em>, stacked top to bottom: ' +
          'a list of ' + ROWS + ' numbers (of 3,000 in the real data).';
      }
    },
    yi: {
      sym: 'y_i',
      say: function () {
        return '<strong>y<sub>' + (state.i + 1) + '</sub></strong> — the answer for person ' +
          (state.i + 1) + ' — their wage, <b>$' + W.wage[state.i].toFixed(1) + 'k</b>. ' +
          'y is always a single number per row, and it is the thing we want to predict.';
      }
    }
  };

  /* ---------------------------------------------------------- build table */
  function build() {
    var t = document.createElement('table');
    t.className = 'ntable';

    var thead = document.createElement('thead');
    var hr = document.createElement('tr');
    var corner = document.createElement('th');
    corner.className = 'corner';
    corner.textContent = 'i ↓  j →';
    hr.appendChild(corner);
    COLS.forEach(function (c, j) {
      var th = document.createElement('th');
      th.dataset.c = String(j);
      th.innerHTML = c.head + (c.response ? ' <span class="resp">(y)</span>' : '');
      hr.appendChild(th);
    });
    thead.appendChild(hr);
    t.appendChild(thead);

    var tb = document.createElement('tbody');
    for (var i = 0; i < ROWS; i++) {
      var tr = document.createElement('tr');
      var th2 = document.createElement('th');
      th2.className = 'rowhead';
      th2.dataset.i = String(i);
      th2.textContent = String(i + 1);
      tr.appendChild(th2);
      COLS.forEach(function (c, j) {
        var td = document.createElement('td');
        td.dataset.i = String(i);
        td.dataset.j = String(j);
        td.textContent = c.get(i);
        tr.appendChild(td);
      });
      tb.appendChild(tr);
    }
    t.appendChild(tb);
    host.appendChild(t);
  }

  /* -------------------------------------------------------------- painting */
  var symEl = document.getElementById('nsay-sym');
  var sayEl = document.getElementById('nsay-plain');

  function renderSym() {
    var latex = MODES[state.mode].sym;
    if (!symEl) return;
    if (window.katex && typeof window.katex.render === 'function') {
      try {
        window.katex.render(latex, symEl, { throwOnError: false, displayMode: false });
        return;
      } catch (e) { /* fall through to plain text */ }
    }
    symEl.textContent = latex;
  }

  function paint() {
    var mode = state.mode;
    var i = state.i, j = state.j;

    Array.prototype.forEach.call(host.querySelectorAll('td, th[data-i], th[data-c]'), function (el) {
      el.classList.remove('hi', 'cellhi', 'dim');
    });

    if (mode === 'n') {
      host.querySelectorAll('th.rowhead').forEach(function (el) { el.classList.add('hi'); });
    } else if (mode === 'p') {
      host.querySelectorAll('th[data-c]').forEach(function (el) { el.classList.add('hi'); });
    } else if (mode === 'xij') {
      host.querySelectorAll('tr').forEach(function (tr) {
        if (tr.children[0].dataset.i === String(i)) {
          Array.prototype.forEach.call(tr.children, function (c) { c.classList.add('hi'); });
        }
      });
      host.querySelectorAll('[data-c="' + j + '"], td[data-j="' + j + '"]').forEach(function (el) {
        el.classList.add('hi');
      });
      var cell = host.querySelector('td[data-i="' + i + '"][data-j="' + j + '"]');
      if (cell) cell.classList.add('cellhi');
    } else if (mode === 'xi') {
      host.querySelectorAll('td[data-i="' + i + '"], th.rowhead[data-i="' + i + '"]').forEach(
        function (el) { el.classList.add('hi'); });
    } else if (mode === 'xj') {
      host.querySelectorAll('td[data-j="' + j + '"], th[data-c="' + j + '"]').forEach(
        function (el) { el.classList.add('hi'); });
    } else if (mode === 'yi') {
      host.querySelectorAll('td[data-j="' + (COLS.length - 1) + '"], th[data-c="' + (COLS.length - 1) + '"]').forEach(
        function (el) { el.classList.add('hi'); });
      var ycell = host.querySelector('td[data-i="' + i + '"][data-j="' + (COLS.length - 1) + '"]');
      if (ycell) ycell.classList.add('cellhi');
    }

    if (sayEl) sayEl.innerHTML = MODES[mode].say();
    renderSym();
  }

  /* ------------------------------------------------------------- hovering */
  function onMove(e) {
    var td = e.target.closest ? e.target.closest('td[data-i], th.rowhead[data-i], th[data-c]') : null;
    if (!td) return;
    var i = td.dataset.i !== undefined ? +td.dataset.i : state.i;
    var j = td.dataset.j !== undefined ? +td.dataset.j
      : (td.dataset.c !== undefined ? +td.dataset.c : state.j);
    if (i !== state.i || j !== state.j) {
      state.i = i;
      state.j = j;
      paint();
    }
  }

  /* ------------------------------------------------------------- controls */
  Array.prototype.forEach.call(document.querySelectorAll('#ncontrols .btn'), function (b) {
    b.addEventListener('click', function () {
      state.mode = b.dataset.mode;
      Array.prototype.forEach.call(document.querySelectorAll('#ncontrols .btn'), function (o) {
        o.setAttribute('aria-pressed', String(o === b));
      });
      paint();
    });
  });

  build();
  host.addEventListener('pointerover', onMove);
  paint();
})();
