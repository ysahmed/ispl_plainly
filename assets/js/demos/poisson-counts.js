/* Demo — Day 3 · counts: why linear regression is the wrong tool and
   Poisson regression keeps predictions non-negative  (ISLP section 4.6).
   Data: bikes rented per hour while a service winds down for the night. */
(function () {
  'use strict';
  var cv = document.getElementById('cv-poisson');
  if (!cv || typeof Plot === 'undefined') return;

  var rnd = mulberry32(23);
  var pts = [];
  for (var h = 0; h < 24; h++) {
    var lam = 100 * Math.exp(-h / 6);
    var y = Math.max(0, Math.round(lam + gauss(rnd) * Math.sqrt(Math.max(lam, 1))));
    pts.push({ x: h, y: y });
  }

  // ---- ordinary least squares
  function fitLine(p) {
    var n = p.length, sx = 0, sy = 0, sxx = 0, sxy = 0;
    p.forEach(function (q) { sx += q.x; sy += q.y; sxx += q.x * q.x; sxy += q.x * q.y; });
    var den = n * sxx - sx * sx;
    var m = (n * sxy - sx * sy) / den;
    var b = (sy - m * sx) / n;
    return function (x) { return m * x + b; };
  }

  // ---- Poisson regression with a log link, fitted by Newton's method
  //   λ(x) = exp(b0 + b1·z),  z = (x − mean)/scale
  function fitPoisson(p) {
    var n = p.length, mx = 0, my = 0, i;
    p.forEach(function (q) { mx += q.x; my += q.y; });
    mx /= n; my /= n;
    var sxx = 0;
    p.forEach(function (q) { sxx += (q.x - mx) * (q.x - mx); });
    var scale = Math.sqrt(sxx / n) || 1;

    var b0 = Math.log(Math.max(my, 0.5)), b1 = 0;
    for (var it = 0; it < 15; it++) {
      var g0 = 0, g1 = 0, h00 = 0, h01 = 0, h11 = 0;
      p.forEach(function (q) {
        var z = (q.x - mx) / scale;
        var eta = Math.max(-30, Math.min(30, b0 + b1 * z));
        var mu = Math.exp(eta);
        var r = q.y - mu;
        g0 += r; g1 += r * z;
        h00 += mu; h01 += mu * z; h11 += mu * z * z;
      });
      var det = h00 * h11 - h01 * h01;
      if (!isFinite(det) || Math.abs(det) < 1e-12) break;
      var d0 = (h11 * g0 - h01 * g1) / det;
      var d1 = (-h01 * g0 + h00 * g1) / det;
      b0 += d0; b1 += d1;
      if (Math.abs(d0) + Math.abs(d1) < 1e-9) break;
    }
    return function (x) {
      var z = (x - mx) / scale;
      return Math.exp(Math.max(-30, Math.min(30, b0 + b1 * z)));
    };
  }

  var lineFn = fitLine(pts);
  var poisFn = fitPoisson(pts);

  var showLine = true, showPois = true;

  var elLin = document.getElementById('pois-lin');
  var elPois = document.getElementById('pois-poiss');

  var linMin = Infinity, linNeg = 0;
  for (var k = 0; k <= 23; k++) {
    var v = lineFn(k);
    if (v < linMin) linMin = v;
    if (v < 0) linNeg++;
  }
  var poisMin = Infinity;
  for (k = 0; k <= 23; k++) poisMin = Math.min(poisMin, poisFn(k));

  function refresh() {
    elLin.innerHTML = 'linear: lowest prediction <b>' + linMin.toFixed(1) +
      '</b> · <b>' + linNeg + '</b> hour' + (linNeg === 1 ? '' : 's') + ' below zero';
    elPois.innerHTML = 'Poisson: lowest prediction <b>+' + poisMin.toFixed(1) + '</b> · never below zero';
  }

  var plot = new Plot(cv, {
    range: { xmin: -0.7, xmax: 23.7, ymin: -20, ymax: 125 },
    height: 350,
    xlabel: 'hour of the night',
    ylabel: 'bikes rented',
    draw: function (p) {
      var col = p.colors;
      p.axes();

      // zero line — the wall a count model must never cross
      p.hline(0, { color: col.accent2, width: 1.6 });
      p.text('0', p.range.xmin + 0.3, 0, { color: col.accent2, base: 'bottom' });

      if (showLine) {
        p.fnLine(lineFn, { color: col.accent2, width: 2.6, dash: [7, 5] });
        p.text('least squares', 19.5, lineFn(19.5) + 7, { color: col.accent2 });
      }
      if (showPois) {
        p.fnLine(poisFn, { color: col.accent, width: 2.8 });
        p.text('Poisson', 14, poisFn(14) + 9, { color: col.accent });
      }

      p.points(pts.map(function (q) { return [q.x, q.y]; }), { color: '#f59e0b', r: 4.8 });

      refresh();
    }
  });

  var bL = document.getElementById('pois-line');
  var bP = document.getElementById('pois-pois');
  bL.addEventListener('click', function () {
    showLine = !showLine;
    bL.setAttribute('aria-pressed', String(showLine));
    plot.render();
  });
  bP.addEventListener('click', function () {
    showPois = !showPois;
    bP.setAttribute('aria-pressed', String(showPois));
    plot.render();
  });
  bL.setAttribute('aria-pressed', 'true');
  bP.setAttribute('aria-pressed', 'true');
})();
