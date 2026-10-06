/* Demo — Figure 3.7: parallel lines, or not (§3.3.2 interactions)
   Credit data, balance against income, split by student status.  Without
   the interaction term the two groups are forced to share one slope; add
   it and each group gets its own. */
(function () {
  'use strict';
  var cv = document.getElementById('cv-interact');
  if (!cv || typeof Plot === 'undefined' || typeof Stats === 'undefined') return;

  var C = window.CH03_CREDIT;
  var state = { inter: false };
  var COLORS = ['#3b82f6', '#f59e0b'];       // non-student, student

  var elSlope0 = document.getElementById('intx-slope0');
  var elSlope1 = document.getElementById('intx-slope1');
  var elR2 = document.getElementById('intx-r2');
  var elNote = document.getElementById('intx-note');

  function fit() {
    var X = [], i;
    for (i = 0; i < C.balance.length; i++) {
      var row = [1, C.income[i], C.student[i]];
      if (state.inter) row.push(C.income[i] * C.student[i]);
      X.push(row);
    }
    return Stats.ols(X, C.balance);
  }

  var plot = new Plot(cv, {
    range: { xmin: -2, xmax: 165, ymin: -100, ymax: 2150 },
    height: 360,
    xlabel: 'income ($1000s)',
    ylabel: 'average credit card balance ($)',
    draw: function (p) {
      var col = p.colors, f = fit(), i;
      p.axes();

      for (var g = 0; g <= 1; g++) {
        var pts = [];
        for (i = 0; i < C.balance.length; i++) {
          if (C.student[i] === g) pts.push([C.income[i], C.balance[i]]);
        }
        p.points(pts, { color: COLORS[g], r: 3.4, alpha: 0.55 });
      }

      // the two fitted lines
      for (g = 0; g <= 1; g++) {
        var b0 = f.beta[0] + (g ? f.beta[2] : 0);
        var slope = f.beta[1] + (state.inter && g ? f.beta[3] : 0);
        p.line([[-2, b0 + slope * -2], [165, b0 + slope * 165]],
          { color: COLORS[g], width: 2.8 });
        p.text((g ? 'students' : 'non-students') + ' · slope ' + slope.toFixed(3),
          160, b0 + slope * 160 - 8, { align: 'right', color: COLORS[g],
            font: 'bold 11.5px system-ui' });
      }

      if (!state.inter) {
        p.text('one slope for both groups — the dummy only lifted the line',
          82, 2050, { align: 'center', color: col.accent2, font: '11.5px system-ui' });
      }

      elSlope0.innerHTML = 'non-students: slope <b>' + f.beta[1].toFixed(3) + '</b>';
      elSlope1.innerHTML = state.inter
        ? 'students: slope <b>' + (f.beta[1] + f.beta[3]).toFixed(3) + '</b> (β̂₃ = ' +
          f.beta[3].toFixed(3) + ', p = ' + f.p[3].toFixed(4) + ')'
        : 'students: slope <b>' + f.beta[1].toFixed(3) + '</b> — forced equal';
      elR2.innerHTML = 'R² = <b>' + f.r2.toFixed(3) + '</b>, RSE = <b>' + f.rse.toFixed(0) + '</b>';
      elNote.innerHTML = state.inter
        ? 'reading: each extra <span class="usd">$</span>1,000 of income raises a <b>student\'s</b> balance by <span class="usd">$</span>' +
          (f.beta[1] + f.beta[3]).toFixed(0) + ' and a <b>non-student\'s</b> by <span class="usd">$</span>' +
          f.beta[1].toFixed(0) + ' — the effect of income depends on who you are'
        : 'reading: income adds <span class="usd">$</span>' + f.beta[1].toFixed(0) +
          ' of balance for everyone; student status only shifts the line up by <span class="usd">$</span>' +
          f.beta[2].toFixed(0);
    }
  });

  var btn = document.getElementById('intx-term');
  btn.addEventListener('click', function () {
    state.inter = !state.inter;
    btn.setAttribute('aria-pressed', String(state.inter));
    btn.textContent = state.inter ? 'Drop the interaction term' : 'Add income × student';
    plot.render();
  });
})();
