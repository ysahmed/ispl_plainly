/* Demo — the sigmoid curve: raw score → probability, and the threshold that
   turns a probability into a decision.  (Extended from ML Notes' sigmoid demo.)
   Controls: hover the curve · "Show the slope" · threshold slider 0.1–0.9  */
(function () {
  'use strict';
  var cv = document.getElementById('cv-sigmoid');
  if (!cv || typeof Plot === 'undefined') return;

  var sig = function (z) { return 1 / (1 + Math.exp(-z)); };
  var inv = function (p) { return Math.log(p / (1 - p)); };
  var showSlope = false;
  var thr = 0.5;

  var read = document.getElementById('sig-read');
  var btn = document.getElementById('sig-deriv');
  var sl = document.getElementById('sig-thr');
  var thrRead = document.getElementById('sig-thr-read');

  var plot = new Plot(cv, {
    range: { xmin: -7, xmax: 7, ymin: -0.12, ymax: 1.18 },
    height: 330,
    xlabel: 'z = β₀ + β₁x  (the model’s raw score)',
    ylabel: 'σ(z) = probability',
    draw: function (p) {
      var col = p.colors;
      p.axes();

      p.hline(0.5, { color: col.axis, width: 1, dash: [6, 5] });
      p.hline(1, { color: col.axis, width: 1, dash: [2, 4] });
      p.hline(0, { color: col.axis, width: 1, dash: [2, 4] });
      p.text('0.5', p.range.xmin + 0.2, 0.5, { color: col.axis, base: 'bottom' });

      if (showSlope) {
        var slopeAt = function (z) { var s = sig(z); return s * (1 - s); };
        p.fnLine(slopeAt, { color: col.accent2, width: 2, dash: [6, 4] });
        p.text('slope = σ × (1 − σ)', 3.4, slopeAt(3.4),
          { color: col.accent2, base: 'bottom' });
      }

      p.fnLine(sig, { color: col.accent, width: 2.8 });

      // ---- threshold: horizontal cut at p = thr, vertical cut at z = logit(thr)
      var zt = inv(thr);
      p.hline(thr, { color: col.accent2, width: 1.6, dash: [5, 4] });
      p.vline(zt, { color: col.accent2, width: 1.6, dash: [5, 4] });
      p.dot(zt, thr, { r: 5, color: col.accent2, ring: col.surface });
      p.text('threshold ' + thr.toFixed(2), 6.6, thr,
        { color: col.accent2, align: 'right', base: 'bottom' });
      p.text('z ≥ ' + zt.toFixed(2) + ' → "yes"', 6.6, thr,
        { color: col.accent2, align: 'right', base: 'top' });

      var z = p.pointer && p.pointer.inside ? p.pointer.x : null;
      if (z !== null) {
        var s = sig(z);
        if (showSlope) {
          var slope = s * (1 - s);
          p.line([[z - 2.2, s - slope * 2.2], [z + 2.2, s + slope * 2.2]],
            { color: col.accent2, width: 1.8, dash: [5, 4] });
        }
        p.vline(z, { color: col.axis, width: 1, dash: [3, 4] });
        p.dot(z, s, { r: 5.5, color: col.accent, ring: col.surface });
        p.badge(['z = ' + z.toFixed(2),
                 'σ(z) = ' + s.toFixed(4),
                 (s >= thr ? 'above' : 'below') + ' threshold → ' + (s >= thr ? '"yes"' : '"no"')],
                z, s);
      }
    }
  });

  function updateRead() {
    var p = plot.pointer;
    if (!p || !p.inside) {
      read.innerHTML = 'hover the curve →';
      return;
    }
    var s = sig(p.x);
    read.innerHTML = 'z = <b>' + p.x.toFixed(2) + '</b> → σ = <b>' + s.toFixed(3) + '</b>' +
      ' · decides <b>' + (s >= thr ? 'yes' : 'no') + '</b>' +
      (showSlope ? ' · slope <b>' + (s * (1 - s)).toFixed(3) + '</b>' : '');
  }

  function updateThr() {
    thr = parseFloat(sl.value);
    var zt = inv(thr);
    thrRead.innerHTML = 'threshold <b>' + thr.toFixed(2) + '</b> → cut at z = <b>' +
      zt.toFixed(2) + '</b>';
    updateRead();
    plot.render();
  }

  cv.addEventListener('pointermove', updateRead);
  cv.addEventListener('pointerleave', function () {
    read.innerHTML = 'hover the curve →';
  });

  btn.addEventListener('click', function () {
    showSlope = !showSlope;
    btn.setAttribute('aria-pressed', String(showSlope));
    btn.textContent = showSlope ? 'Hide the slope' : 'Show the slope';
    updateRead();
    plot.render();
  });

  sl.addEventListener('input', updateThr);
  updateThr();
})();
