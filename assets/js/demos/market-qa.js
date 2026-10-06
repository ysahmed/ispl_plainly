/* Demo — the marketing plan: the chapter's seven questions, answered live
   (§3.4).  Each button asks one of the book's questions about the
   Advertising data; the answer and its number are recomputed by fitting
   the model again, and the panel redraws the evidence for that question. */
(function () {
  'use strict';
  var cv = document.getElementById('cv-market');
  if (!cv || typeof Plot === 'undefined' || typeof Stats === 'undefined') return;

  var d = window.CH03_ADV;
  var n = d.tv.length, i;
  var meanTV = 0, meanRad = 0, meanNews = 0, meanY = 0;
  for (i = 0; i < n; i++) {
    meanTV += d.tv[i]; meanRad += d.radio[i]; meanNews += d.newspaper[i]; meanY += d.sales[i];
  }
  meanTV /= n; meanRad /= n; meanNews /= n; meanY /= n;

  function design(inter) {
    var X = [];
    for (var j = 0; j < n; j++) {
      var row = [1, d.tv[j], d.radio[j], d.newspaper[j]];
      if (inter) row.push(d.tv[j] * d.radio[j]);
      X.push(row);
    }
    return X;
  }
  var full = Stats.ols(design(false), d.sales);
  var inter = Stats.ols(design(true), d.sales);

  var NAMES = ['intercept', 'TV', 'radio', 'newspaper', 'TV × radio'];

  var QUESTIONS = {
    1: {
      q: '1. Is there a relationship between advertising budget and sales?',
      mode: 'coef',
      a: 'Yes — clearly. Testing all three slopes against zero at once (H₀: β<sub>TV</sub> = β<sub>radio</sub> = β<sub>newspaper</sub> = 0) gives an F-statistic far out in the tail, so the budgets do carry information about sales. The book\'s wording: "clear evidence of a relationship".',
      stat: function () { return 'F = ' + full.F.toFixed(1) + ' on (3, ' + full.df + ') df, p &lt; 0.001'; }
    },
    2: {
      q: '2. How strong is the relationship?',
      mode: 'strength',
      a: 'Strong, and there are two ways to say it. About 90% of the variation in sales is accounted for by the three budgets; the typical miss of the fit is 1.69 thousand units, against an average sale of 14.02 thousand — roughly a 12% error.',
      stat: function () { return 'R² = ' + full.r2.toFixed(3) + ' · RSE = ' + full.rse.toFixed(2) +
        ' (' + (full.rse / meanY * 100).toFixed(0) + '% of the mean ' + meanY.toFixed(2) + ')'; }
    },
    3: {
      q: '3. Which media are associated with sales?',
      mode: 'coef',
      a: 'TV and radio, holding the others fixed. Newspaper is not: once you know what was spent on TV and radio, adding newspaper buys you essentially nothing (its p-value is huge). Ask the same question on its own and newspaper looks mildly useful — the difference is exactly what multiple regression means.',
      stat: function () {
        return 'p: TV &lt; 0.001 · radio &lt; 0.001 · newspaper = ' + full.p[3].toFixed(3);
      }
    },
    4: {
      q: '4. How large is the association between each medium and sales?',
      mode: 'coef',
      a: 'The coefficient is the size of the association, and the standard error is how well it is pinned down: each extra <span class="usd">$</span>1,000 on TV goes with about 46 more units sold, each <span class="usd">$</span>1,000 on radio with about 189 more. Newspaper\'s interval straddles zero, so its sign is not even settled.',
      stat: function () {
        function ci(k) {                                  // book's (3.4) intervals:
          var m = Stats.tCrit(full.df, 0.95) * full.se[k];  // t = 1.972, not 1.96
          return '(' + (full.beta[k] - m).toFixed(3) + ', ' + (full.beta[k] + m).toFixed(3) + ')';
        }
        return '95% CI: TV ' + ci(1) + ' · radio ' + ci(2) + ' · newspaper ' + ci(3);
      }
    },
    5: {
      q: '5. How accurately can we predict future sales?',
      mode: 'pred',
      a: 'Depends what you are predicting. The average sales at a given budget is known fairly tightly — a narrow confidence interval. One individual outcome is much less certain: a prediction interval, because it also has to absorb the irreducible noise, so it is always the wider of the two.',
      stat: function () { return 'confidence ± ' + state.predCI.toFixed(2) +
        ' vs prediction ± ' + state.predPI.toFixed(2) + ' (thousands of units)'; }
    },
    6: {
      q: '6. Is the relationship linear?',
      mode: 'resid',
      a: 'Mostly, but not perfectly: the residuals against the fitted values show a bend, and the book points at Figure 3.5, where the fit systematically over- and under-shoots when the TV and radio budgets are split evenly. The fix is a term the additive model lacks — which is the next question.',
      stat: function () { return 'residuals of the three-predictor model · RSE = ' + full.rse.toFixed(2); }
    },
    7: {
      q: '7. Is there synergy among the advertising media?',
      mode: 'inter',
      a: 'Yes. Spending on TV and radio together is worth more than the sum of the parts, and adding a TV × radio interaction term proves it: the term is far from zero and the fit jumps from about 90% of the variance explained to nearly 97%. That is the whole marketing lesson of the chapter.',
      stat: function () {
        return 'R² ' + full.r2.toFixed(3) + ' → <b>' + inter.r2.toFixed(3) +
          '</b> with TV × radio (t = ' + inter.t[4].toFixed(1) + ')';
      }
    }
  };

  var state = { q: 1, mode: 'coef', predCI: 0, predPI: 0 };

  var elQ = document.getElementById('mq-question');
  var elA = document.getElementById('mq-answer');
  var elS = document.getElementById('mq-stat');

  function show(id) {
    state.q = id;
    state.mode = QUESTIONS[id].mode;
    elQ.innerHTML = QUESTIONS[id].q;
    elA.innerHTML = QUESTIONS[id].a;
    elS.innerHTML = QUESTIONS[id].stat();
    Array.prototype.forEach.call(document.querySelectorAll('[data-mq]'), function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-mq') === String(id)));
    });
    plot.render();
  }

  /* --------------------------------------------------------------- panels */
  function drawCoef(p, f, names) {
    var col = p.colors, k;
    var maxT = 4;
    for (k = 1; k < f.beta.length; k++) maxT = Math.max(maxT, Math.abs(f.t[k]));
    p.range = { xmin: -maxT * 1.1, xmax: maxT * 1.1, ymin: -0.6, ymax: f.beta.length - 0.4 };
    p.o.xlabel = 'estimate ÷ its standard error (the t statistic)';
    p.o.ylabel = '';
    p.axes();

    // the "not significant at 5%" strip
    p.cell(-1.96, 1.96, p.range.ymin, p.range.ymax, col.accent2, 0.08);
    p.vline(-1.96, { color: col.accent2, width: 1.2, dash: [4, 4] });
    p.vline(1.96, { color: col.accent2, width: 1.2, dash: [4, 4] });
    p.text('|t| < 1.96: could easily be zero', 0, f.beta.length - 0.85,
      { align: 'center', color: col.accent2, font: '11px system-ui' });
    p.vline(0, { color: col.axis, width: 1.6 });

    for (k = 0; k < f.beta.length; k++) {
      var y = f.beta.length - 1 - k;
      var t = k === 0 ? 0 : f.t[k];
      var wide = Math.abs(t) >= 1.96;
      p.cell(0, t, y - 0.26, y + 0.26, wide ? col.accent : col.axis, wide ? 0.85 : 0.5);
      p.dot(t, y, { r: 5, color: wide ? col.accent : col.axis, ring: col.surface, ringWidth: 1.6 });
      var lbl = names[k] + '  ' + f.beta[k].toFixed(3) + ' ± ' + (1.96 * f.se[k]).toFixed(3);
      p.text(lbl, p.range.xmin * 0.96, y + 0.55,
        { color: col.fg, font: '11.5px system-ui' });
    }
  }

  function drawStrength(p) {
    var col = p.colors, x0 = 6, x1 = 94;
    p.range = { xmin: 0, xmax: 100, ymin: 0, ymax: 100 };
    p.o.xlabel = 'variation in sales';
    p.o.ylabel = '';
    p.axes();
    var explained = full.r2 * 100;
    p.cell(x0, x0 + (x1 - x0) * explained / 100, 56, 76, col.accent, 0.8);
    p.cell(x0 + (x1 - x0) * explained / 100, x1, 56, 76, col.accent2, 0.55);
    p.text('explained by the three budgets: ' + explained.toFixed(1) + '%',
      x0 + 1, 80, { color: col.accent, font: 'bold 12px system-ui' });
    p.text('left over: ' + (100 - explained).toFixed(1) + '%',
      x1 - 1, 80, { align: 'right', color: col.accent2, font: '11.5px system-ui' });

    // RSE shown against the size of a typical sale
    var w = full.rse / 20 * (x1 - x0);
    p.cell(x0, x0 + w, 24, 44, col.fg, 0.85);
    p.text('RSE = ' + full.rse.toFixed(2) + ' — the width of the typical miss',
      x0, 50, { color: col.fg, font: '11.5px system-ui' });
    p.text('average sale = ' + meanY.toFixed(2) + ' — so the miss is ' +
      (full.rse / meanY * 100).toFixed(0) + '% of a sale', x0, 16,
      { color: col.axis, font: '11.5px system-ui' });
  }

  function drawPred(p) {
    var col = p.colors;
    p.range = { xmin: -5, xmax: 305, ymin: -2, ymax: 30 };
    p.o.xlabel = 'TV budget ($1000s) — radio and newspaper at their averages';
    p.o.ylabel = 'sales (1000s of units)';
    p.axes();

    function yhat(tv) {
      return full.beta[0] + full.beta[1] * tv + full.beta[2] * meanRad +
        full.beta[3] * meanNews;
    }
    var Sxx = 0, xbar = 0, j;
    for (j = 0; j < n; j++) xbar += d.tv[j];
    xbar /= n;
    for (j = 0; j < n; j++) Sxx += (d.tv[j] - xbar) * (d.tv[j] - xbar);
    var tc = Stats.tCrit(full.df, 0.95);
    function ciW(tv) { return tc * Math.sqrt(full.sigma2 * (1 / n + (tv - xbar) * (tv - xbar) / Sxx)); }
    function piW(tv) { return tc * Math.sqrt(full.sigma2 + ciW(tv) * ciW(tv) / (tc * tc)); }

    var xs = [], upC = [], loC = [], upP = [], loP = [];
    for (j = 0; j <= 110; j++) {
      var tv = 300 * j / 110;
      xs.push(tv);
      upC.push([tv, yhat(tv) + ciW(tv)]); loC.push([tv, yhat(tv) - ciW(tv)]);
      upP.push([tv, yhat(tv) + piW(tv)]); loP.push([tv, yhat(tv) - piW(tv)]);
    }
    var dx = 300 / 110;
    for (j = 0; j <= 110; j++) {
      p.cell(xs[j] - dx / 2, xs[j] + dx / 2, loP[j][1], upP[j][1], col.accent2, 0.07);
      p.cell(xs[j] - dx / 2, xs[j] + dx / 2, loC[j][1], upC[j][1], col.accent, 0.14);
    }
    p.line(upP, { color: col.accent2, width: 1.5, dash: [6, 4] });
    p.line(loP, { color: col.accent2, width: 1.5, dash: [6, 4] });
    p.line(upC, { color: col.accent, width: 1.5 });
    p.line(loC, { color: col.accent, width: 1.5 });

    p.points(d.tv.map(function (t, idx) { return [t, d.sales[idx]]; }),
      { color: col.fg, r: 3.4, alpha: 0.5 });
    p.fnLine(yhat, { color: col.accent, width: 2.6 });

    var x0 = 150;
    p.vline(x0, { color: col.axis, width: 1.3, dash: [3, 3] });
    p.dot(x0, yhat(x0), { r: 5.5, color: col.fg, ring: col.surface, ringWidth: 2 });
    p.badge(['average sales here: ± ' + ciW(x0).toFixed(2),
             'one new outcome: ± ' + piW(x0).toFixed(2)], x0, yhat(x0) + piW(x0));
    p.text('narrow: where the average sits', 60, yhat(60) + ciW(60) - 3,
      { color: col.accent, font: '11.5px system-ui' });
    p.text('wide: where one real outcome lands', 60, yhat(60) + piW(60) + 4,
      { color: col.accent2, font: '11.5px system-ui' });
    state.predCI = ciW(x0);
    state.predPI = piW(x0);
  }

  function drawResid(p) {
    var col = p.colors, j;
    var lo = 1e9, hi = -1e9, maxR = 0;
    for (j = 0; j < n; j++) {
      lo = Math.min(lo, full.fitted[j]); hi = Math.max(hi, full.fitted[j]);
      maxR = Math.max(maxR, Math.abs(full.resid[j]));
    }
    p.range = { xmin: lo - 1, xmax: hi + 1, ymin: -maxR * 1.1, ymax: maxR * 1.1 };
    p.o.xlabel = 'fitted sales';
    p.o.ylabel = 'residual';
    p.axes();
    p.hline(0, { color: col.axis, width: 1.6 });
    p.points(d.tv.map(function (t, idx) { return [full.fitted[idx], full.resid[idx]]; }),
      { color: col.accent2, r: 3.6, alpha: 0.7 });

    var bins = 14, sums = [], cnts = [];
    for (j = 0; j < bins; j++) { sums.push(0); cnts.push(0); }
    for (j = 0; j < n; j++) {
      var b = Math.min(bins - 1,
        Math.floor((full.fitted[j] - p.range.xmin) / (p.range.xmax - p.range.xmin) * bins));
      sums[b] += full.resid[j]; cnts[b]++;
    }
    var trend = [];
    for (j = 0; j < bins; j++) {
      if (cnts[j]) {
        trend.push([p.range.xmin + (p.range.xmax - p.range.xmin) * (j + 0.5) / bins,
                    sums[j] / cnts[j]]);
      }
    }
    p.line(trend, { color: col.fg, width: 2.6 });
    p.text('a straight horizontal trend would mean "linear is fine"',
      p.range.xmin + 1, p.range.ymax * 0.9, { color: col.axis, font: '11px system-ui' });
    p.text('the dip and rise = the bend this model is missing',
      p.range.xmax - 1, p.range.ymax * 0.78,
      { align: 'right', color: col.accent2, font: 'bold 11.5px system-ui' });
  }

  var plot = new Plot(cv, {
    range: { xmin: -5, xmax: 305, ymin: -2, ymax: 30 },
    height: 340,
    xlabel: '',
    ylabel: '',
    draw: function (p) {
      if (state.mode === 'coef') drawCoef(p, full, NAMES);
      else if (state.mode === 'inter') drawCoef(p, inter, NAMES);
      else if (state.mode === 'strength') drawStrength(p);
      else if (state.mode === 'pred') drawPred(p);
      else drawResid(p);
      if (state.q) elS.innerHTML = QUESTIONS[state.q].stat();
    }
  });

  Array.prototype.forEach.call(document.querySelectorAll('[data-mq]'), function (b) {
    b.addEventListener('click', function () {
      show(parseInt(b.getAttribute('data-mq'), 10));
    });
  });

  show(1);
})();
