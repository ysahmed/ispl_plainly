/* ==========================================================================
   method-map.js — Chapter 2, section 2.1.3.
   The book's Figure 2.7: every method in ISLP placed on a map of
   flexibility (x) against interpretability (y). Hover a dot to read
   what the method is and which chapter covers it.
   ========================================================================== */
(function () {
  'use strict';

  var cv = document.getElementById('cv-methodmap');
  if (!cv || typeof Plot === 'undefined') return;

  var METHODS = [
    { name: 'Least squares', x: 0.9, y: 0.95, ch: 3,
      note: 'one straight line — you can read off every coefficient' },
    { name: 'Subset selection', x: 1.8, y: 0.90, ch: 6,
      note: 'keeps only the predictors that earn their place' },
    { name: 'Lasso', x: 2.6, y: 0.84, ch: 6,
      note: 'shrinks weak coefficients to exactly zero' },
    { name: 'GAMs', x: 5.3, y: 0.52, ch: 7,
      note: 'a separate smooth curve for each predictor' },
    { name: 'Trees', x: 6.1, y: 0.63, ch: 8,
      note: 'a flowchart of yes/no splits you can follow by hand' },
    { name: 'Bagging, boosting', x: 7.3, y: 0.34, ch: 8,
      note: 'hundreds of trees averaged into one answer' },
    { name: 'Support vector machines', x: 8.3, y: 0.26, ch: 9,
      note: 'draws the widest street it can between the classes' },
    { name: 'Deep learning', x: 9.4, y: 0.10, ch: 10,
      note: 'layered networks — powerful, and hard to look inside' }
  ];

  var elMeta = document.getElementById('mm-meta');

  function nearest(p) {
    if (!p.pointer || !p.pointer.inside) return null;
    var best = null, bestD = 0.55;                 // data-space radius
    for (var i = 0; i < METHODS.length; i++) {
      var dx = METHODS[i].x - p.pointer.x, dy = (METHODS[i].y - p.pointer.y) * 3.4;
      var d = Math.sqrt(dx * dx + dy * dy);
      if (d < bestD) { bestD = d; best = METHODS[i]; }
    }
    return best;
  }

  var plot = new Plot(cv, {
    range: { xmin: 0.1, xmax: 10.3, ymin: -0.06, ymax: 1.14 },
    height: 380,
    grid: true,
    xlabel: 'flexibility →  (how many shapes the method can produce)',
    ylabel: 'interpretability →',
    draw: function (p) {
      var col = p.colors;
      var hovered = nearest(p);
      p.axes();

      // the trade-off itself: a soft diagonal band
      p.clip(function () {
        var c = p.ctx;
        c.save();
        c.globalAlpha = 0.06;
        c.fillStyle = col.accent;
        c.beginPath();
        c.moveTo(p.xToPx(0.1), p.yToPx(1.02));
        c.lineTo(p.xToPx(7.6), p.yToPx(1.14));
        c.lineTo(p.xToPx(10.3), p.yToPx(0.52));
        c.lineTo(p.xToPx(10.3), p.yToPx(-0.06));
        c.lineTo(p.xToPx(4.4), p.yToPx(-0.06));
        c.closePath();
        c.fill();
        c.restore();
      });

      p.text('you can explain this', 0.35, 1.04, { font: '12px system-ui', color: col.good });
      p.text('you get an answer, not a reason', 10.1, -0.005,
        { font: '12px system-ui', color: col.axis, align: 'right' });

      for (var i = 0; i < METHODS.length; i++) {
        var m = METHODS[i];
        var on = hovered && hovered.name === m.name;
        p.dot(m.x, m.y, {
          r: on ? 8 : 6,
          color: on ? col.accent2 : col.accent,
          ring: col.surface,
          ringWidth: 2
        });
        p.text(m.name, m.x, m.y - (on ? 0.085 : 0.075), {
          font: (on ? 'bold ' : '') + '11.5px system-ui',
          color: on ? col.accent2 : col.fg,
          align: 'center', base: 'bottom'
        });
      }

      if (p.pointer && p.pointer.inside && hovered) {
        p.badge([hovered.name, 'Chapter ' + hovered.ch], p.pointer.x, p.pointer.y);
      }

      if (elMeta) {
        elMeta.innerHTML = hovered
          ? '<b>' + hovered.name + '</b> — ' + hovered.note +
            ' <span class="demo-note">(Chapter ' + hovered.ch + ')</span>'
          : 'hover a dot to read the method';
      }
    }
  });
})();
