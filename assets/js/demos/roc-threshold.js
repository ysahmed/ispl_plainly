/* Demo — Day 3 · one slider drives three views: the score distributions,
   the confusion matrix, and the ROC curve (ISLP section 4.3, 4.5.
   Threshold → TP/FP/FN/TN → point on the ROC curve → AUC. */
(function () {
  'use strict';
  var cvT = document.getElementById('cv-thresh');
  var cvR = document.getElementById('cv-roc');
  if (!cvT || !cvR || typeof Plot === 'undefined') return;

  // ---- one fixed score sample: 200 "no" (class 0), 120 "yes" (class 1)
  var rnd = mulberry32(97);
  var neg = [], pos = [], i;
  for (i = 0; i < 200; i++) neg.push(Math.min(0.99, Math.max(0.01, 0.37 + gauss(rnd) * 0.13)));
  for (i = 0; i < 120; i++) pos.push(Math.min(0.99, Math.max(0.01, 0.63 + gauss(rnd) * 0.16)));

  var thr = 0.5;

  function counts(t) {
    var tp = 0, fn = 0, fp = 0, tn = 0;
    pos.forEach(function (s) { (s >= t ? tp++ : fn++); });
    neg.forEach(function (s) { (s >= t ? fp++ : tn++); });
    return { tp: tp, fn: fn, fp: fp, tn: tn };
  }

  function rocPoints() {
    // t = 1 → nobody passes (0,0); t = 0 → everybody passes (1,1)
    var pts = [], c;
    for (var t = 1; t >= -0.001; t -= 0.01) {
      c = counts(t);
      pts.push([c.fp / (c.fp + c.tn), c.tp / (c.tp + c.fn)]);
    }
    return pts;
  }

  var roc = rocPoints();
  var auc = 0;
  for (i = 1; i < roc.length; i++) {
    auc += (roc[i][0] - roc[i - 1][0]) * (roc[i][1] + roc[i - 1][1]) / 2;
  }

  // ---- histogram bins for the two score clouds
  var BINS = 20;
  function hist(arr) {
    var h = new Array(BINS).fill(0);
    arr.forEach(function (s) {
      var b = Math.min(BINS - 1, Math.floor(s * BINS));
      h[b]++;
    });
    return h;
  }
  var hNeg = hist(neg), hPos = hist(pos);
  var hMax = Math.max(Math.max.apply(null, hNeg), Math.max.apply(null, hPos)) * 1.15;

  // ---- readouts
  var elThr = document.getElementById('thr-val');
  var elTP = document.getElementById('thr-tp');
  var elFP = document.getElementById('thr-fp');
  var elFN = document.getElementById('thr-fn');
  var elTN = document.getElementById('thr-tn');
  var elTPR = document.getElementById('thr-tpr');
  var elPrec = document.getElementById('thr-prec');
  var elAcc = document.getElementById('thr-acc');
  var elAuc = document.getElementById('thr-auc');

  function refresh() {
    var c = counts(thr);
    var tpr = c.tp / (c.tp + c.fn);
    var prec = (c.tp + c.fp) ? c.tp / (c.tp + c.fp) : 1;
    var acc = (c.tp + c.tn) / (c.tp + c.tn + c.fp + c.fn);
    elThr.innerHTML = 'threshold = <b>' + thr.toFixed(2) + '</b>';
    elTP.innerHTML = 'TP <b>' + c.tp + '</b>';
    elFP.innerHTML = 'FP <b>' + c.fp + '</b>';
    elFN.innerHTML = 'FN <b>' + c.fn + '</b>';
    elTN.innerHTML = 'TN <b>' + c.tn + '</b>';
    elTPR.innerHTML = 'recall (TPR) <b>' + (tpr * 100).toFixed(1) + '%</b>';
    elPrec.innerHTML = 'precision <b>' + (prec * 100).toFixed(1) + '%</b>';
    elAcc.innerHTML = 'accuracy <b>' + (acc * 100).toFixed(1) + '%</b>';
    elAuc.innerHTML = 'AUC <b>' + auc.toFixed(3) + '</b>';
  }

  // ---- left panel: the two score clouds with the cut line
  var plotT = new Plot(cvT, {
    range: { xmin: 0, xmax: 1, ymin: 0, ymax: hMax },
    height: 300,
    xlabel: 'predicted probability of "yes"',
    ylabel: 'how many got that score',
    draw: function (p) {
      var col = p.colors;
      p.axes();

      function bar(h, color, alpha, base) {
        for (var b = 0; b < BINS; b++) {
          if (!h[b]) continue;
          var x0 = b / BINS, x1 = (b + 1) / BINS;
          // side by side: negatives sit slightly left, positives slightly right
          var w = (x1 - x0) * 0.44;
          var cx = (x0 + x1) / 2 + base;
          p.cell(cx - w, cx + w, 0, h[b], color, alpha);
        }
      }
      bar(hNeg, '#3b82f6', 0.55, -0.011);
      bar(hPos, '#f59e0b', 0.55, 0.011);

      // shade the two mistake regions
      p.cell(thr, 1, 0, hMax, '#ef4444', 0.10);   // FP: negatives to the right of the cut
      p.cell(0, thr, 0, hMax, '#ef4444', 0.07);   // FN: positives to the left of the cut

      p.vline(thr, { color: col.accent2, width: 2.4 });
      p.text('threshold ' + thr.toFixed(2), thr, hMax * 0.95,
        { color: col.accent2, align: thr > 0.6 ? 'right' : 'left' });

      p.text('class 0 ("no")', 0.12, hMax * 0.72, { color: '#3b82f6' });
      p.text('class 1 ("yes")', 0.60, hMax * 0.72, { color: '#f59e0b' });
      p.text('FP', Math.max(thr + 0.03, 0.04), hMax * 0.36, { color: col.accent2 });
      p.text('FN', Math.min(thr - 0.03, 0.96), hMax * 0.36,
        { color: col.accent2, align: 'right' });
    }
  });

  // ---- right panel: the ROC curve
  var plotR = new Plot(cvR, {
    range: { xmin: 0, xmax: 1, ymin: 0, ymax: 1 },
    height: 300,
    xlabel: 'false positive rate (1 − specificity)',
    ylabel: 'true positive rate (recall)',
    draw: function (p) {
      var col = p.colors;
      p.axes();

      p.line([[0, 0], [1, 1]], { color: col.axis, width: 1.4, dash: [6, 5] });
      p.text('chance', 0.72, 0.66, { color: col.axis });

      p.line(roc, { color: col.accent, width: 2.8 });

      var c = counts(thr);
      var fpr = c.fp / (c.fp + c.tn), tpr = c.tp / (c.tp + c.fn);
      p.vline(fpr, { color: col.accent2, width: 1, dash: [4, 4] });
      p.hline(tpr, { color: col.accent2, width: 1, dash: [4, 4] });
      p.dot(fpr, tpr, { r: 6.5, color: col.accent2, ring: col.surface });
      p.badge(['threshold ' + thr.toFixed(2),
               'FPR ' + (fpr * 100).toFixed(1) + '% · TPR ' + (tpr * 100).toFixed(1) + '%'],
              fpr, tpr);
      p.text('AUC = ' + auc.toFixed(3), 0.97, 0.06,
        { color: col.accent, align: 'right' });
    }
  });

  document.getElementById('thr-slider').addEventListener('input', function (e) {
    thr = parseFloat(e.target.value);
    refresh();
    plotT.render();
    plotR.render();
  });

  refresh();
})();
