/* Demo — putting predictors in and taking them out (§3.2.1)
   Four checkboxes, one model at a time: the table is fitted live with
   standard errors and p-values, and the line shows what the current model
   says about sales as the TV budget moves (radio and newspaper held fixed). */
(function () {
  'use strict';
  var cv = document.getElementById('cv-coef');
  if (!cv || typeof Plot === 'undefined' || typeof Stats === 'undefined') return;

  var d = window.CH03_ADV;
  var n = d.tv.length;
  var REF = { tv: 150, radio: 25, news: 20 };

  var state = { tv: true, radio: true, news: true };

  var TERMS = [
    { key: 'tv', name: 'TV', arr: d.tv },
    { key: 'radio', name: 'radio', arr: d.radio },
    { key: 'news', name: 'newspaper', arr: d.newspaper }
  ];

  function chosen() {
    return TERMS.filter(function (t) { return state[t.key]; });
  }

  function fit() {
    var cols = chosen(), X = [], i, j;
    for (i = 0; i < n; i++) {
      var row = [1];
      for (j = 0; j < cols.length; j++) row.push(cols[j].arr[i]);
      X.push(row);
    }
    return Stats.ols(X, d.sales);
  }

  function predictAt(f, tv) {
    var cols = chosen();
    var row = [1];
    for (var j = 0; j < cols.length; j++) {
      row.push(cols[j].key === 'tv' ? tv : REF[cols[j].key]);
    }
    var yh = 0;
    for (var k = 0; k < row.length; k++) yh += row[k] * f.beta[k];
    return yh;
  }

  var table = document.getElementById('coef-body');
  var elR2 = document.getElementById('coef-r2');
  var elAdj = document.getElementById('coef-adjr2');
  var elRse = document.getElementById('coef-rse');
  var elF = document.getElementById('coef-f');
  var elPred = document.getElementById('coef-pred');
  var elNote = document.getElementById('coef-note');

  function fmtP(p) {
    if (p < 0.001) return '&lt; 0.001';
    return p.toFixed(3);
  }

  function writeTable(f) {
    var cols = chosen(), rows = [], i;
    rows.push('<tr><th>intercept</th><td>' + f.beta[0].toFixed(4) + '</td><td>' +
      f.se[0].toFixed(4) + '</td><td>' + f.t[0].toFixed(2) + '</td><td>' + fmtP(f.p[0]) + '</td></tr>');
    for (i = 0; i < cols.length; i++) {
      var k = i + 1;
      rows.push('<tr><th>' + cols[i].name + '</th><td>' + f.beta[k].toFixed(4) + '</td><td>' +
        f.se[k].toFixed(4) + '</td><td>' + f.t[k].toFixed(2) + '</td><td>' + fmtP(f.p[k]) + '</td></tr>');
    }
    table.innerHTML = rows.join('');
  }

  var plot = new Plot(cv, {
    range: { xmin: -5, xmax: 305, ymin: 0, ymax: 30 },
    height: 330,
    xlabel: 'TV budget ($1000s)  — radio and newspaper held at ' +
      REF.radio + ' and ' + REF.news,
    ylabel: 'predicted sales (1000s of units)',
    draw: function (p) {
      var col = p.colors, f = fit();
      p.axes();

      // the model's opinion of TV, one straight segment
      var line = [];
      for (var t = 0; t <= 60; t++) {
        var tv = 300 * t / 60;
        line.push([tv, predictAt(f, tv)]);
      }
      p.line(line, { color: state.tv ? col.accent : col.axis, width: 2.8,
        dash: state.tv ? [] : [7, 5] });

      // reference budget
      var yRef = predictAt(f, REF.tv);
      p.dot(REF.tv, yRef, { r: 6, color: col.accent2, ring: col.surface, ringWidth: 2 });
      p.vline(REF.tv, { color: col.axis, width: 1.2, dash: [3, 3] });
      p.badge([
        'TV = ' + REF.tv + ', radio = ' + REF.radio + ', news = ' + REF.news,
        'predicted sales: ' + yRef.toFixed(2)
      ], REF.tv, yRef);

      if (!state.tv) {
        p.text('TV is out of the model — the line is flat',
          150, predictAt(f, 150) + 4.5, { align: 'center', color: col.accent2,
            font: '11.5px system-ui' });
      }

      writeTable(f);
      elR2.innerHTML = 'R² = <b>' + f.r2.toFixed(3) + '</b>';
      elAdj.innerHTML = 'adjusted R² = <b>' + f.adjr2.toFixed(3) + '</b>';
      elRse.innerHTML = 'RSE = <b>' + f.rse.toFixed(2) + '</b>';
      elF.innerHTML = 'F = <b>' + f.F.toFixed(1) + '</b>, p ' +
        (f.fP < 0.001 ? '&lt; 0.001' : '= ' + f.fP.toFixed(3));
      elPred.innerHTML = 'prediction = <b>' + yRef.toFixed(2) + '</b>';

      var missing = TERMS.filter(function (t) { return !state[t.key]; });
      elNote.innerHTML = missing.length
        ? missing.map(function (t) { return t.name; }).join(' + ') +
          ' out → R² = ' + f.r2.toFixed(3) + (state.tv ? '' : ', line flat')
        : 'all three media: Table 3.6, R² = 0.897';
    }
  });

  [['c-tv', 'tv'], ['c-radio', 'radio'], ['c-news', 'news']].forEach(function (pair) {
    var el = document.getElementById(pair[0]);
    if (!el) return;
    el.setAttribute('aria-pressed', String(state[pair[1]]));
    el.addEventListener('click', function () {
      state[pair[1]] = !state[pair[1]];
      this.setAttribute('aria-pressed', String(state[pair[1]]));
      plot.render();
    });
  });
})();
