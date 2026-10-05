/* Demo — section 4.1 · the Default data: 10,000 people, two colours, and
   the simplest possible classifier ("flag anyone whose balance is above
   this line").  Move the line: every choice of line trades one kind of
   mistake for the other. */
(function () {
  'use strict';
  var cv = document.getElementById('cv-default');
  if (!cv || typeof Plot === 'undefined' || typeof CH04_DEFAULT === 'undefined') return;

  var D = CH04_DEFAULT;
  var n = D.balance.length;
  var MAXB = 2700, MAXI = 80;

  var thr = 1500;

  var elCaught = document.getElementById('de-caught');
  var elFalse = document.getElementById('de-false');
  var elErr = document.getElementById('de-err');
  var elThr = document.getElementById('de-thr-read');

  // pre-split: non-defaulters first (drawn under), defaulters on top.
  // Half of the 9,667 non-defaulters is plenty of ink — it keeps pointer
  // re-renders smooth; every defaulter is drawn.
  var idxNo = [], idxYes = [], i;
  for (i = 0; i < n; i++) {
    if (D.default[i]) idxYes.push(i);
    else if (i % 2 === 0) idxNo.push(i);
  }
  var nYes = D.default.filter(function (v) { return v; }).length;
  var noPts = idxNo.map(function (k) { return [D.balance[k], D.income[k]]; });
  var yesPts = idxYes.map(function (k) { return [D.balance[k], D.income[k]]; });

  function refresh() {
    var caught = 0, flagged = 0, j;
    for (j = 0; j < n; j++) {
      if (D.balance[j] > thr) (D.default[j] ? caught++ : flagged++);
    }
    var missed = nYes - caught;
    var err = (missed + flagged) / n * 100;
    elThr.innerHTML = 'flag above <b>$' + thr.toLocaleString() + '</b>';
    elCaught.innerHTML = 'caught <b>' + caught + '</b> of <b>' + nYes + '</b> defaulters';
    elFalse.innerHTML = 'flagged <b>' + flagged + '</b> non-defaulters';
    elErr.innerHTML = 'total error of this rule <b>' + err.toFixed(2) + '%</b>';
  }

  var plot = new Plot(cv, {
    range: { xmin: 0, xmax: MAXB, ymin: 0, ymax: MAXI },
    height: 360,
    xlabel: 'monthly credit card balance ($)',
    ylabel: 'annual income ($1,000s)',
    draw: function (p) {
      var col = p.colors;

      // the zone where the rule says "default"
      p.cell(thr, MAXB, 0, MAXI, '#ef4444', 0.06);
      p.axes();

      // class 0 first — quiet blue underneath
      p.points(noPts, { color: '#3b82f6', r: 2.4, alpha: 0.35 });
      // class 1 on top — orange, the class we care about
      p.points(yesPts, { color: '#f59e0b', r: 4.4 });

      p.vline(thr, { color: col.accent2, width: 2.2 });
      p.text('rule: balance > $' + thr.toLocaleString() + ' ⇒ "default"',
        thr, MAXI * 0.96,
        { color: col.accent2, align: thr > 1700 ? 'right' : 'left', bg: col.surface });

      // hover: nearest neighbour among all 10,000 points
      if (p.pointer && p.pointer.inside) {
        var bx = p.pointer.x, by = p.pointer.y;
        var ux = (MAXB - 0) / cv.clientWidth, uy = (MAXI - 0) / (cv.clientHeight || 360);
        var best = -1, bestD = 1e18;
        for (var k = 0; k < n; k++) {
          var dx = (D.balance[k] - bx) * ux, dy = (D.income[k] - by) * uy;
          var d = dx * dx + dy * dy;
          if (d < bestD) { bestD = d; best = k; }
        }
        if (best >= 0 && bestD < 400) {
          p.badge(['balance $' + D.balance[best].toFixed(0),
                   'income $' + D.income[best].toFixed(1) + 'k',
                   D.default[best] ? 'defaulted' : 'no default'],
            D.balance[best], D.income[best]);
        }
      }
    }
  });

  document.getElementById('de-thr').addEventListener('input', function (e) {
    thr = parseFloat(e.target.value);
    refresh();
    plot.render();
  });

  refresh();
})();
