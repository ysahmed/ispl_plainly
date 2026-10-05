/* Demo — section 4.3 · the fitted logistic model on the real Default data.
   Table 4.1's coefficients (intercept −10.6513, balance 0.0055) draw the
   S-curve; pick a balance and read off the estimated probability of default,
   its odds, and the call the model would make. */
(function () {
  'use strict';
  var cv = document.getElementById('cv-logit');
  if (!cv || typeof Plot === 'undefined' || typeof CH04_DEFAULT === 'undefined') return;

  var D = CH04_DEFAULT;
  var B0 = -10.6513, B1 = 0.0055;          // Table 4.1 (Default ~ balance)
  var MAXB = 2700;
  var expit = function (z) { return 1 / (1 + Math.exp(-z)); };
  var p = function (b) { return expit(B0 + B1 * b); };
  var cross = -B0 / B1;                    // where the curve hits 0.5

  var bal = 2000;

  // points are fixed — precompute the two batches once (every other
  // non-defaulter is drawn; all 333 defaulters are drawn on top)
  var noPts = [], yesPts = [], ii;
  for (ii = 0; ii < D.balance.length; ii++) {
    if (D.default[ii]) yesPts.push([D.balance[ii], 1]);
    else if (ii % 2 === 0) noPts.push([D.balance[ii], 0]);
  }

  var elP = document.getElementById('lf-p');
  var elOdds = document.getElementById('lf-odds');
  var elCall = document.getElementById('lf-call');

  function refresh() {
    var pr = p(bal);
    elP.innerHTML = 'p̂(balance) = <b>' + pr.toFixed(4) + '</b>';
    elOdds.innerHTML = 'odds = <b>' + (pr / (1 - pr)).toFixed(2) + '</b>';
    elCall.innerHTML = pr >= 0.5
      ? 'above 0.5 → <b style="color:var(--danger)">predict default</b>'
      : 'below 0.5 → predict no default';
  }

  var plot = new Plot(cv, {
    range: { xmin: 0, xmax: MAXB, ymin: -0.1, ymax: 1.15 },
    height: 340,
    xlabel: 'monthly credit card balance ($)',
    ylabel: 'estimated P(default)',
    draw: function (q) {
      var col = q.colors;

      // the allowed zone for a probability
      q.cell(0, MAXB, 0, 1, col.good, 0.06);
      q.axes();

      q.hline(0.5, { color: col.axis, width: 1.2, dash: [7, 5] });
      q.text('0.5', 40, 0.5, { color: col.axis, base: 'bottom' });

      // the observed 0/1 outcomes: non-defaulters first, defaulters on top
      q.points(noPts, { color: '#3b82f6', r: 2.6, alpha: 0.35 });
      q.points(yesPts, { color: '#f59e0b', r: 3.4, alpha: 0.75 });

      // the fitted logistic curve
      q.fnLine(function (b) { return p(b); }, { color: col.accent, width: 2.8 });

      // where it crosses the 0.5 threshold
      q.vline(cross, { color: col.accent2, width: 1.4, dash: [4, 4] });
      q.text('p = 0.5 at $' + Math.round(cross).toLocaleString(), cross, 0.5, {
        color: col.accent2, align: cross > 1800 ? 'right' : 'left', base: 'top', bg: col.surface
      });

      // the balance you picked
      var pr = p(bal);
      q.vline(bal, { color: col.axis, width: 1, dash: [3, 4] });
      q.dot(bal, pr, { r: 6, color: col.accent, ring: col.surface });
      q.badge(['balance $' + bal.toLocaleString(),
               'p̂ = ' + pr.toFixed(4)], bal, pr);
    }
  });

  document.getElementById('lf-balance').addEventListener('input', function (e) {
    bal = parseFloat(e.target.value);
    refresh();
    plot.render();
  });

  refresh();
})();
