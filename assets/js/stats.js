/* ==========================================================================
   stats.js — the small amount of statistics Chapter 3's demos need to do
   live in the browser: least squares with standard errors, and the t and F
   p-values that turn a coefficient into a sentence.

   Everything here is plain numerics — no library, no fetch, works over
   file://.  Loaded after plots.js and before the demo scripts.
   ========================================================================== */
(function (global) {
  'use strict';

  /* --------------------------------------------------------- linear algebra */
  // solve A x = b for a symmetric-ish square system (Gaussian elimination,
  // partial pivoting).  A is n x n (array of rows), b has length n.
  function solve(A, b) {
    var n = A.length, i, j, k;
    var M = A.map(function (row, r) { return row.slice().concat([b[r]]); });
    for (i = 0; i < n; i++) {
      var best = i;
      for (k = i + 1; k < n; k++) if (Math.abs(M[k][i]) > Math.abs(M[best][i])) best = k;
      var tmp = M[i]; M[i] = M[best]; M[best] = tmp;
      var piv = M[i][i];
      if (Math.abs(piv) < 1e-12) piv = 1e-12;
      for (j = i; j <= n; j++) M[i][j] /= piv;
      for (k = 0; k < n; k++) {
        if (k === i) continue;
        var f = M[k][i];
        if (f === 0) continue;
        for (j = i; j <= n; j++) M[k][j] -= f * M[i][j];
      }
    }
    return M.map(function (row) { return row[n]; });
  }

  // inverse of a square matrix, by Gauss-Jordan (used for the covariance
  // matrix of the coefficients: Var(β̂) = σ² (XᵀX)⁻¹)
  function inverse(A) {
    var n = A.length, i, j, k;
    var M = A.map(function (row, r) {
      return row.slice().concat(row.map(function (_, c) { return r === c ? 1 : 0; }));
    });
    for (i = 0; i < n; i++) {
      var best = i;
      for (k = i + 1; k < n; k++) if (Math.abs(M[k][i]) > Math.abs(M[best][i])) best = k;
      var tmp = M[i]; M[i] = M[best]; M[best] = tmp;
      var piv = M[i][i];
      if (Math.abs(piv) < 1e-12) piv = 1e-12;
      for (j = 0; j < 2 * n; j++) M[i][j] /= piv;
      for (k = 0; k < n; k++) {
        if (k === i) continue;
        var f = M[k][i];
        if (f === 0) continue;
        for (j = 0; j < 2 * n; j++) M[k][j] -= f * M[i][j];
      }
    }
    return M.map(function (row) { return row.slice(n); });
  }

  /* ------------------------------------------------- distributions (t, F) */
  function gammln(x) {
    var cof = [76.18009172947146, -86.50532032941677, 24.01409824083091,
      -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
    var y = x, tmp = x + 5.5;
    tmp -= (x + 0.5) * Math.log(tmp);
    var ser = 1.000000000190015;
    for (var j = 0; j < 6; j++) { y += 1; ser += cof[j] / y; }
    return -tmp + Math.log(2.5066282746310005 * ser / x);
  }

  function betacf(a, b, x) {
    var MAXIT = 300, EPS = 3e-14, FPMIN = 1e-300;
    var qab = a + b, qap = a + 1, qam = a - 1;
    var c = 1, d = 1 - qab * x / qap;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    d = 1 / d;
    var h = d;
    for (var m = 1; m <= MAXIT; m++) {
      var m2 = 2 * m, aa;
      aa = m * (b - m) * x / ((qam + m2) * (a + m2));
      d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
      c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
      d = 1 / d; h *= d * c;
      aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
      d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
      c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
      d = 1 / d;
      var del = d * c;
      h *= del;
      if (Math.abs(del - 1) < EPS) break;
    }
    return h;
  }

  // regularised incomplete beta I_x(a, b)
  function betai(a, b, x) {
    if (!(x > 0)) return 0;
    if (x >= 1) return 1;
    var bt = Math.exp(gammln(a + b) - gammln(a) - gammln(b) +
      a * Math.log(x) + b * Math.log(1 - x));
    return x < (a + 1) / (a + b + 2)
      ? bt * betacf(a, b, x) / a
      : 1 - bt * betacf(b, a, 1 - x) / b;
  }

  // two-sided p-value for H0: β = 0  with a t statistic t on df degrees
  function tPvalue(t, df) {
    if (!isFinite(t)) return 0;
    if (df <= 0) return 1;
    return betai(df / 2, 0.5, df / (df + t * t));
  }

  // p-value for H0: model is useless, with F on df1, df2 degrees of freedom
  function fPvalue(F, df1, df2) {
    if (!(F > 0)) return 1;
    if (df1 <= 0 || df2 <= 0) return 1;
    return betai(df2 / 2, df1 / 2, df2 / (df2 + df1 * F));
  }

  // the two-sided critical value t* for a given confidence level (0.95 …)
  function tCrit(df, conf) {
    var alpha = 1 - conf, lo = 0, hi = 50, mid;
    for (var i = 0; i < 200; i++) {
      mid = (lo + hi) / 2;
      if (tPvalue(mid, df) > alpha) lo = mid; else hi = mid;
    }
    return (lo + hi) / 2;
  }

  /* ------------------------------------------------------------- least squares */
  // X: array of rows (each row = one observation's design vector, e.g.
  //    [1, TV] for simple regression with an intercept)
  // y: array of responses
  function ols(X, y) {
    var n = X.length, k = X[0].length, i, j, m;
    var XtX = [], Xty = [];
    for (i = 0; i < k; i++) {
      XtX.push(new Array(k).fill(0));
      Xty.push(0);
    }
    for (m = 0; m < n; m++) {
      for (i = 0; i < k; i++) {
        Xty[i] += X[m][i] * y[m];
        for (j = 0; j < k; j++) XtX[i][j] += X[m][i] * X[m][j];
      }
    }
    var beta = solve(XtX, Xty);
    var inv = inverse(XtX);

    var fitted = new Array(n), resid = new Array(n), rss = 0, sse;
    for (m = 0; m < n; m++) {
      var yh = 0;
      for (i = 0; i < k; i++) yh += X[m][i] * beta[i];
      fitted[m] = yh;
      resid[m] = y[m] - yh;
      rss += resid[m] * resid[m];
    }
    var ybar = 0;
    for (m = 0; m < n; m++) ybar += y[m];
    ybar /= n;
    var tss = 0;
    for (m = 0; m < n; m++) tss += (y[m] - ybar) * (y[m] - ybar);

    var df = n - k;
    var sigma2 = rss / df;
    var r2 = tss > 0 ? 1 - rss / tss : 0;
    var se = [], t = [], p = [];
    for (i = 0; i < k; i++) {
      se[i] = Math.sqrt(sigma2 * inv[i][i]);
      t[i] = beta[i] / se[i];
      p[i] = tPvalue(t[i], df);
    }
    var rse = Math.sqrt(sigma2);
    var F = k > 1 ? ((tss - rss) / (k - 1)) / sigma2 : t[0] * t[0];
    return {
      n: n, k: k, df: df, beta: beta, se: se, t: t, p: p,
      fitted: fitted, resid: resid,
      rss: rss, tss: tss, r2: r2,
      adjr2: 1 - (1 - r2) * (n - 1) / df,
      rse: rse, sigma2: sigma2,
      F: F, fP: fPvalue(F, k - 1, df)
    };
  }

  global.Stats = {
    solve: solve,
    inverse: inverse,
    ols: ols,
    tPvalue: tPvalue,
    fPvalue: fPvalue,
    tCrit: tCrit,
    mean: function (a) { return a.reduce(function (s, v) { return s + v; }, 0) / a.length; }
  };
})(window);
