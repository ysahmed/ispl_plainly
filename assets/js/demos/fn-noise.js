/* Demo A — Y = f(X) + ε: the noise floor you cannot beat */
(function () {
  'use strict';
  var cv = document.getElementById('cv-fn-noise');
  if (!cv || typeof Plot === 'undefined') return;

  var F = function (x) { return 0.55 * x + 1.5 * Math.sin(1.3 * x); };

  // fixed x positions and fixed standardized noise, so σ is the only knob
  var rnd = mulberry32(7), xs = [], zs = [];
  for (var i = 0; i < 34; i++) {
    xs.push(-3.1 + 6.2 * (i + 0.5) / 34 + (rnd() - 0.5) * 0.1);
    zs.push(gauss(rnd));
  }

  var state = { sigma: 0.6 };

  function fitLine(X, Y) {                    // least squares y = a + b·x
    var n = X.length, sx = 0, sy = 0, sxx = 0, sxy = 0;
    for (var i = 0; i < n; i++) {
      sx += X[i]; sy += Y[i]; sxx += X[i] * X[i]; sxy += X[i] * Y[i];
    }
    var b = (n * sxy - sx * sy) / (n * sxx - sx * sx);
    return { a: (sy - b * sx) / n, b: b };
  }

  var slider = document.getElementById('fn-sigma');
  var elFloor = document.getElementById('fn-noise-floor');
  var elMiss = document.getElementById('fn-noise-miss');
  var elTotal = document.getElementById('fn-noise-total');

  var plot = new Plot(cv, {
    range: { xmin: -3.5, xmax: 3.5, ymin: -4.2, ymax: 4.2 },
    height: 330,
    xlabel: 'x — the inputs we measure',
    ylabel: 'Y — what we actually see',
    draw: function (p) {
      var col = p.colors;
      var Y = xs.map(function (x, i) { return F(x) + state.sigma * zs[i]; });
      var fit = fitLine(xs, Y);

      // reducible gap = RMS distance between the straight line and the truth
      var miss = 0, m = 60;
      for (var i = 0; i <= m; i++) {
        var x = p.range.xmin + (p.range.xmax - p.range.xmin) * i / m;
        var d = (fit.a + fit.b * x) - F(x);
        miss += d * d;
      }
      miss = Math.sqrt(miss / (m + 1));

      p.axes();

      // jitter: each point's distance to the truth, drawn as thin legs
      p.clip(function () {
        var c = p.ctx;
        c.strokeStyle = col.axis;
        c.lineWidth = 1;
        c.beginPath();
        for (var i = 0; i < xs.length; i++) {
          c.moveTo(p.xToPx(xs[i]), p.yToPx(Y[i]));
          c.lineTo(p.xToPx(xs[i]), p.yToPx(F(xs[i])));
        }
        c.stroke();
      });

      p.fnLine(F, { color: col.fg, width: 2.2 });
      p.points(xs.map(function (x, i) { return [x, Y[i]]; }), { color: col.accent, r: 4.2 });
      p.line([[p.range.xmin, fit.a + fit.b * p.range.xmin],
              [p.range.xmax, fit.a + fit.b * p.range.xmax]],
             { color: col.accent2, width: 2.2, dash: [7, 5] });

      p.text('true f(x) — the world', p.range.xmin + 0.15, 3.75, { font: '12px system-ui', color: col.fg });
      p.text('your straight-line fit', p.range.xmin + 0.15, 3.3, { font: '12px system-ui', color: col.accent2 });
      p.text('legs = pure noise ε', p.range.xmin + 0.15, -3.75, { font: '12px system-ui', color: col.axis });

      elFloor.innerHTML = 'irreducible floor (σ): <b>' + state.sigma.toFixed(2) + '</b>';
      elMiss.innerHTML = 'reducible gap (line vs truth): <b>' + miss.toFixed(2) + '</b>';
      elTotal.innerHTML = 'total error ≈ <b>' +
        Math.sqrt(state.sigma * state.sigma + miss * miss).toFixed(2) + '</b>';
    }
  });

  slider.addEventListener('input', function () {
    state.sigma = Number(slider.value) / 100;
    plot.render();
  });
})();
