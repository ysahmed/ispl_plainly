/* Demo — a qualitative predictor is a set of dummy columns (§3.3.1)
   Pick a categorical variable: the model refuses to read its name and
   reads 0/1 columns instead.  The fitted lines for every level come out
   parallel, because a dummy can only lift a line up or down. */
(function () {
  'use strict';
  var cv = document.getElementById('cv-dummy');
  if (!cv || typeof Plot === 'undefined' || typeof Stats === 'undefined') return;

  var C = window.CH03_CREDIT, S = window.CH03_CARSEATS;

  var SETS = {
    student: {
      src: 'Credit', y: C.balance, x: C.income, grp: C.student,
      levels: C.levels.student, yName: 'balance', xName: 'income ($1000s)',
      range: { xmin: -2, xmax: 165, ymin: -100, ymax: 2150 }
    },
    gender: {
      src: 'Credit', y: C.balance, x: C.income, grp: C.gender,
      levels: C.levels.gender, yName: 'balance', xName: 'income ($1000s)',
      range: { xmin: -2, xmax: 165, ymin: -100, ymax: 2150 }
    },
    shelveloc: {
      src: 'Carseats', y: S.sales, x: S.price, grp: S.shelveloc,
      levels: S.levels.shelveloc, yName: 'Sales', xName: 'Price',
      range: { xmin: 25, xmax: 205, ymin: -2, ymax: 45 }
    }
  };
  var COLORS = ['#3b82f6', '#f59e0b', '#16a34a'];

  var state = { key: 'student' };

  var elEq = document.getElementById('dummy-eq');
  var elShift = document.getElementById('dummy-shifts');
  var elRows = document.getElementById('dummy-rows');
  var elR2 = document.getElementById('dummy-r2');

  function model(s) {
    var L = s.levels.length, i, j;
    var X = [], y = s.y;
    for (i = 0; i < s.y.length; i++) {
      var row = [1, s.x[i]];
      for (j = 1; j < L; j++) row.push(s.grp[i] === j ? 1 : 0);
      X.push(row);
    }
    return Stats.ols(X, y);
  }

  function levelIntercept(f, s, lev) {
    var L = s.levels.length, v = f.beta[0];
    for (var j = 1; j < L; j++) if (lev === j) v += f.beta[1 + j];
    return v;
  }

  var plot = new Plot(cv, {
    range: { xmin: -2, xmax: 165, ymin: -100, ymax: 2150 },
    height: 350,
    xlabel: 'income ($1000s)',
    ylabel: 'balance ($)',
    draw: function (p) {
      var s = SETS[state.key], col = p.colors, L = s.levels.length;
      p.range = Object.assign(p.range, s.range);
      p.o.xlabel = s.xName;
      p.o.ylabel = s.yName;
      p.axes();

      var f = model(s);

      // points, one colour per level
      for (var lev = 0; lev < L; lev++) {
        var pts = [];
        for (var i = 0; i < s.y.length; i++) {
          if (s.grp[i] === lev) pts.push([s.x[i], s.y[i]]);
        }
        p.points(pts, { color: COLORS[lev], r: 3.6, alpha: 0.65 });
      }

      // one parallel line per level
      var xmin = s.range.xmin, xmax = s.range.xmax;
      for (lev = 0; lev < L; lev++) {
        var b = levelIntercept(f, s, lev);
        p.line([[xmin, b + f.beta[1] * xmin], [xmax, b + f.beta[1] * xmax]],
               { color: COLORS[lev], width: 2.6 });
        p.text(s.levels[lev], xmax - 6, b + f.beta[1] * xmax - 6,
          { color: COLORS[lev], align: 'right', font: 'bold 11.5px system-ui' });
      }

      // the equation, written the way the model actually stores it
      var terms = ['<b>' + f.beta[0].toFixed(2) + '</b>',
        '+ <b>' + f.beta[1].toFixed(3) + '</b>·' + s.xName.split(' ')[0]];
      for (var j = 1; j < L; j++) {
        terms.push((f.beta[1 + j] < 0 ? '− ' : '+ ') + '<b>' +
          Math.abs(f.beta[1 + j]).toFixed(2) + '</b>·I(' + s.levels[j] + ')');
      }
      elEq.innerHTML = 'ŷ = ' + terms.join(' ') + '  &nbsp; <span class="muted">(baseline: ' +
        s.levels[0] + ')</span>';

      var shifts = [];
      for (lev = 0; lev < L; lev++) {
        shifts.push(s.levels[lev] + ' → line starts at <b><span class="usd">$</span>' +
          Math.round(levelIntercept(f, s, lev)).toLocaleString() + '</b>');
      }
      elShift.innerHTML = 'separate lines: ' + shifts.join(' &nbsp;·&nbsp; ');

      var rows = [];
      for (lev = 0; lev < L; lev++) {
        var row = ['1', 'x'];
        for (var q = 1; q < L; q++) row.push(lev === q ? '1' : '0');
        rows.push(s.levels[lev] + ' → [' + row.join(', ') + ']');
      }
      elRows.innerHTML = 'design rows: ' + rows.join(' &nbsp;·&nbsp; ');

      elR2.innerHTML = 'R² = <b>' + f.r2.toFixed(3) + '</b> &nbsp;·&nbsp; one shared slope <b>' +
        f.beta[1].toFixed(3) + '</b>, ' + (L - 1) + ' dummy' + (L > 2 ? 's' : '');
    }
  });

  document.getElementById('dummy-var').addEventListener('change', function () {
    state.key = this.value;
    plot.render();
  });
})();
