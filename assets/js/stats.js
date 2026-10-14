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
      // (X'X)^-1 — chapter 7 needs it to put a pointwise band around a fit
      inv: inv,
      F: F, fP: fPvalue(F, k - 1, df)
    };
  }

  /* =========================================================================
     Chapter 6 additions — model selection, shrinkage and dimension reduction.
     Conventions follow ISLP exactly where the book pins them down:
       · predictors are centered and scaled to sd 1 before ridge/lasso/PCR
         (eq. 6.6 — the sd divides by n, not n − 1), so the intercept is ȳ;
       · the penalty is the book's RSS + λ Σ β² (6.5) / RSS + λ Σ |β| (6.7)
         scale — the same λ that appears in eqs. (6.14) and (6.15), not the
         1/(2n)-scaled λ that glmnet happens to print.
     ========================================================================= */

  /* ------------------------------------------------ data prep (eq. 6.6) */
  // cols: array of p columns (each an array of n values), y: response.
  // Returns centered/scaled columns, centered y, and the pieces the demos
  // need to put coefficients back on the original scale.
  function prepare(cols, y) {
    var n = y.length, p = cols.length, i, j;
    var means = [], sds = [];
    for (j = 0; j < p; j++) {
      var m = 0;
      for (i = 0; i < n; i++) m += cols[j][i];
      m /= n;
      var s = 0, dv;
      for (i = 0; i < n; i++) { dv = cols[j][i] - m; s += dv * dv; }
      means[j] = m;
      sds[j] = Math.sqrt(s / n);          // eq. 6.6: the sd divides by n
    }
    var ym = 0;
    for (i = 0; i < n; i++) ym += y[i];
    ym /= n;
    var Z = [], yc = [];
    for (i = 0; i < n; i++) {
      var row = [];
      for (j = 0; j < p; j++) row.push(sds[j] > 0 ? (cols[j][i] - means[j]) / sds[j] : 0);
      Z.push(row);
      yc.push(y[i] - ym);
    }
    return { Z: Z, y: yc, ymean: ym, means: means, sds: sds, n: n, p: p };
  }

  // XᵀX (symmetric) and Xᵀy for a data matrix given as rows
  function crossprod(X, y) {
    var n = X.length, k = X[0].length, i, j, m;
    var G = [], g = [];
    for (i = 0; i < k; i++) { G.push(new Array(k).fill(0)); g.push(0); }
    for (m = 0; m < n; m++) {
      for (i = 0; i < k; i++) {
        g[i] += X[m][i] * y[m];
        for (j = i; j < k; j++) G[i][j] += X[m][i] * X[m][j];
      }
    }
    for (i = 0; i < k; i++) for (j = 0; j < i; j++) G[i][j] = G[j][i];
    return { G: G, g: g };
  }

  // RSS of the model on columns `idx`, recovered from the Gram matrix:
  // RSS = yᵀy − βᵀXᵀy (valid because everything is centered, so the
  // intercept contributes nothing).
  function rssFrom(G, g, yty, idx) {
    var k = idx.length, i;
    if (k === 0) return yty;
    var A = idx.map(function (r) { return idx.map(function (c) { return G[r][c]; }); });
    var b = idx.map(function (r) { return g[r]; });
    var beta = solve(A, b);
    var quad = 0;
    for (i = 0; i < k; i++) quad += beta[i] * b[i];
    return Math.max(yty - quad, 0);
  }

  function maskOf(idxs) {
    var mask = 0;
    for (var i = 0; i < idxs.length; i++) mask |= (1 << idxs[i]);
    return mask;
  }

  function namesOf(mask, names) {
    var out = [];
    for (var j = 0; j < names.length; j++) if (mask & (1 << j)) out.push(names[j]);
    return out;
  }

  /* --------------------------------------------- best subset selection */
  // Every one of the 2^p − 1 non-empty subsets of p columns, with its RSS.
  // Computed from the Gram matrix, so p = 11 (2047 models) takes
  // milliseconds instead of seconds.
  function subsetSearch(cols, y) {
    var pre = prepare(cols, y), n = pre.n, p = pre.p, j, mask;
    var cp = crossprod(pre.Z, pre.y);
    var yty = 0;
    for (var i = 0; i < n; i++) yty += pre.y[i] * pre.y[i];
    var models = [];
    for (mask = 1; mask < (1 << p); mask++) {
      var idx = [];
      for (j = 0; j < p; j++) if (mask & (1 << j)) idx.push(j);
      models.push({ mask: mask, d: idx.length, rss: rssFrom(cp.G, cp.g, yty, idx) });
    }
    // the best model at each size d — the "red frontier" of Figure 6.1
    var best = [];
    for (j = 0; j <= p; j++) best.push(null);
    models.forEach(function (mo) {
      if (!best[mo.d] || mo.rss < best[mo.d].rss) best[mo.d] = mo;
    });
    return { models: models, best: best, n: n, p: p, tss: yty, ymean: pre.ymean };
  }

  /* --------------------------------------------------- stepwise selection */
  // Forward stepwise (ISLP Algorithm 6.2): start empty, add the column that
  // most reduces RSS at each step.  Also usable backwards from the full
  // model (method === 'backward').
  function stepwise(cols, y, method, maxSteps) {
    var pre = prepare(cols, y), n = pre.n, p = pre.p, i, j, m;
    var cp = crossprod(pre.Z, pre.y);
    var yty = 0;
    for (i = 0; i < n; i++) yty += pre.y[i] * pre.y[i];
    var chosen = [], left = [], path = [];
    if (method === 'backward') {
      for (j = 0; j < p; j++) chosen.push(j);
      path.push({ mask: maskOf(chosen), d: chosen.length, rss: rssFrom(cp.G, cp.g, yty, chosen), entered: -1 });
    }
    for (j = 0; j < p; j++) if (method !== 'backward') left.push(j);
    var steps = maxSteps || p;
    for (var s = 0; s < steps; s++) {
      var cand = null;
      if (method === 'backward') {
        if (chosen.length === 0) break;
        for (m = 0; m < chosen.length; m++) {
          var keep = chosen.filter(function (_, ix) { return ix !== m; });
          var r = rssFrom(cp.G, cp.g, yty, keep);
          if (!cand || r < cand.rss - 1e-12) cand = { idx: m, rss: r };
        }
      } else {
        if (left.length === 0) break;
        for (m = 0; m < left.length; m++) {
          var r2v = rssFrom(cp.G, cp.g, yty, chosen.concat([left[m]]));
          if (!cand || r2v < cand.rss - 1e-12) cand = { idx: left[m], rss: r2v };
        }
      }
      if (method === 'backward') {
        var dropped = chosen[cand.idx];
        chosen = chosen.filter(function (_, ix) { return ix !== cand.idx; });
        path.push({ mask: maskOf(chosen), d: chosen.length, rss: cand.rss, entered: dropped });
      } else {
        chosen.push(cand.idx);
        left = left.filter(function (jx) { return jx !== cand.idx; });
        path.push({ mask: maskOf(chosen), d: chosen.length, rss: cand.rss, entered: cand.idx });
      }
    }
    return { path: path, n: n, p: p, tss: yty };
  }

  /* ---------------------------------------- Cp, AIC, BIC, adjusted R² */
  // ISLP (6.2)–(6.4).  sigma2 is the error variance estimated from the FULL
  // model, as the book prescribes; tss is the centered total sum of squares.
  // Note the parentheses in (6.2) and (6.3): the 1/n divides the RSS *and*
  // the penalty — Cp = (RSS + 2·d·σ̂²)/n, BIC = (RSS + log(n)·d·σ̂²)/n.
  // AIC carries the same formula as Cp for least squares (ISLP, p. 237).
  function criteria(rss, n, d, sigma2, tss) {
    return {
      cp: (rss + 2 * d * sigma2) / n,
      aic: (rss + 2 * d * sigma2) / n,
      bic: (rss + Math.log(n) * d * sigma2) / n,
      adjr2: tss > 0 ? 1 - (rss / (n - d - 1)) / (tss / (n - 1)) : 0
    };
  }

  /* ------------------------------------------------------------- ridge */
  // (ZᵀZ + λI) β = Zᵀy on centered, standardized columns (eq. 6.5).
  // λ = 0 returns least squares; λ → ∞ returns zero.
  function ridge(Z, y, lambda) {
    var n = Z.length, p = Z[0].length, i, j, m;
    var cp = crossprod(Z, y);
    var G = cp.G;
    for (i = 0; i < p; i++) G[i][i] += lambda;
    return solve(G, cp.g);
  }

  // fits along a grid of λ values (each fit independent — no warm start
  // needed because the system is solved directly)
  function ridgePath(Z, y, lambdas) {
    return lambdas.map(function (l) { return ridge(Z, y, l); });
  }

  /* ------------------------------------------------------------- lasso */
  // Cyclic coordinate descent for (6.7): the update for column j is the
  // soft-thresholded simple-regression coefficient — the same S(·, λ/2)
  // map that eq. (6.15) spells out in the diagonal case.  `warm` lets the
  // caller pass a previous solution as the starting point.
  function lasso(Z, y, lambda, warm) {
    var n = Z.length, p = Z[0].length, i, j;
    var beta = warm ? warm.slice() : new Array(p).fill(0);
    var resid = y.slice(), acc, dj;
    if (warm) {
      for (i = 0; i < n; i++) {
        acc = 0;
        for (j = 0; j < p; j++) acc += Z[i][j] * beta[j];
        resid[i] -= acc;
      }
    }
    var znorm2 = [];
    for (j = 0; j < p; j++) {
      var s = 0;
      for (i = 0; i < n; i++) s += Z[i][j] * Z[i][j];
      znorm2[j] = s;
    }
    var half = lambda / 2;
    // Credit's limit/rating pair is correlated 0.997, and coordinate
    // descent crawls along that near-flat valley — a few hundred sweeps
    // is nowhere near converged there (Python needs ~6000 sweeps for
    // 1e-12).  3000 sweeps at 1e-8 gets every coefficient within 0.001
    // of the fully converged answer on the 400-row Credit problem.
    for (var it = 0; it < 3000; it++) {
      var moved = 0;
      for (j = 0; j < p; j++) {
        var rho = 0;
        for (i = 0; i < n; i++) rho += Z[i][j] * (resid[i] + Z[i][j] * beta[j]);
        var nb = rho > half ? (rho - half) / znorm2[j]
               : (rho < -half ? (rho + half) / znorm2[j] : 0);
        dj = nb - beta[j];
        if (dj !== 0) {
          for (i = 0; i < n; i++) resid[i] -= Z[i][j] * dj;
          beta[j] = nb;
          if (Math.abs(dj) > moved) moved = Math.abs(dj);
        }
      }
      if (moved < 1e-8) break;
    }
    return beta;
  }

  // Fits along a grid of λ values.  The grid is sorted largest-first and
  // each fit warm-starts from the previous one, so the whole path is quick
  // and the largest λ is exactly the zero model.
  function lassoPath(Z, y, lambdas) {
    var order = lambdas.map(function (l, i) { return i; })
      .sort(function (a, b) { return lambdas[b] - lambdas[a]; });
    var p = Z[0].length, beta = new Array(p).fill(0), out = [];
    for (var k = 0; k < order.length; k++) {
      beta = lasso(Z, y, lambdas[order[k]], beta);
      out[order[k]] = beta.slice();
    }
    return out;
  }

  /* ------------------------------- symmetric eigen (for the PCs of XᵀX) */
  // Cyclic Jacobi.  Returns {values, vectors} sorted largest-first, with
  // vectors[k] the k-th unit eigenvector.
  function eigSym(A) {
    var n = A.length, i, p, q, k, sweep;
    var a = A.map(function (row) { return row.slice(); });
    var V = [];
    for (i = 0; i < n; i++) { V.push(new Array(n).fill(0)); V[i][i] = 1; }
    for (sweep = 0; sweep < 60; sweep++) {
      var off = 0;
      for (p = 0; p < n - 1; p++) for (q = p + 1; q < n; q++) off += a[p][q] * a[p][q];
      if (off < 1e-20) break;
      for (p = 0; p < n - 1; p++) {
        for (q = p + 1; q < n; q++) {
          if (Math.abs(a[p][q]) < 1e-15) continue;
          var theta = (a[q][q] - a[p][p]) / (2 * a[p][q]);
          var t = (theta >= 0 ? 1 : -1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
          var c = 1 / Math.sqrt(t * t + 1), s = t * c;
          for (k = 0; k < n; k++) {
            var akp = a[k][p], akq = a[k][q];
            a[k][p] = c * akp - s * akq;
            a[k][q] = s * akp + c * akq;
          }
          for (k = 0; k < n; k++) {
            var apk = a[p][k], aqk = a[q][k];
            a[p][k] = c * apk - s * aqk;
            a[q][k] = s * apk + c * aqk;
          }
          for (k = 0; k < n; k++) {
            var vkp = V[k][p], vkq = V[k][q];
            V[k][p] = c * vkp - s * vkq;
            V[k][q] = s * vkp + c * vkq;
          }
        }
      }
    }
    var vals = [], vecs = [];
    for (i = 0; i < n; i++) { vals.push(a[i][i]); vecs.push(V.map(function (r) { return r[i]; })); }
    var order = vals.map(function (v, ix) { return ix; })
      .sort(function (x, z) { return vals[z] - vals[x]; });
    return {
      values: order.map(function (ix) { return vals[ix]; }),
      vectors: order.map(function (ix) { return vecs[ix]; })
    };
  }

  /* ------------------------------------------ principal components */
  // Directions are the eigenvectors of XᵀX (X centered); score variances
  // are the eigenvalues; share[k] is the fraction of total variance in
  // component k.
  function pca(Z) {
    var n = Z.length, p = Z[0].length, i, j, m;
    var G = [];
    for (i = 0; i < p; i++) G.push(new Array(p).fill(0));
    for (m = 0; m < n; m++) for (i = 0; i < p; i++) for (j = 0; j < p; j++) G[i][j] += Z[m][i] * Z[m][j];
    var e = eigSym(G), total = 0;
    for (i = 0; i < p; i++) total += G[i][i];
    return {
      dirs: e.vectors,
      values: e.values,
      share: e.values.map(function (v) { return total > 0 ? v / total : 0; }),
      scores: e.vectors.map(function (d) {
        return Z.map(function (row) {
          var s = 0;
          for (var j2 = 0; j2 < p; j2++) s += row[j2] * d[j2];
          return s;
        });
      })
    };
  }

  /* --------------------------------------- principal components regression */
  // Regress y on the first M principal-component scores (with an
  // intercept — everything is centered, so it comes out ≈ 0), then map the
  // score coefficients back through the directions: β = Φ_M θ.
  function pcr(Z, y, M) {
    var pr = pca(Z), p = pr.dirs.length, n = Z.length;
    var m = Math.min(M, p), i, j, k;
    var Xs = [];
    for (i = 0; i < n; i++) {
      var row = [1];
      for (k = 0; k < m; k++) row.push(pr.scores[k][i]);
      Xs.push(row);
    }
    var f = ols(Xs, y);
    var beta = new Array(p).fill(0);
    for (k = 0; k < m; k++) for (j = 0; j < p; j++) beta[j] += f.beta[k + 1] * pr.dirs[k][j];
    return { beta: beta, theta: f.beta.slice(1), fit: f, pca: pr, m: m };
  }

  /* ------------------------------------------------ partial least squares */
  // ISLP §6.3.2: direction m weights each column by its simple-regression
  // coefficient on the response (with everything standardized that is the
  // column's correlation with y), then every column and y itself are
  // deflated by their linear fit on the new score — the NIPALS/PLS1 loop.
  function pls(Z, y, M) {
    var n = Z.length, p = Z[0].length, i, j, comp;
    var X = Z.map(function (r) { return r.slice(); });
    var yv = y.slice(), dirs = [], scores = [];
    for (comp = 0; comp < M; comp++) {
      var w = [], wn = 0;
      for (j = 0; j < p; j++) {
        var s = 0;
        for (i = 0; i < n; i++) s += X[i][j] * yv[i];
        w.push(s);
        wn += s * s;
      }
      wn = Math.sqrt(wn);
      if (wn < 1e-12) w = w.map(function () { return 0; });
      else w = w.map(function (v) { return v / wn; });
      var z = [];
      for (i = 0; i < n; i++) {
        var acc = 0;
        for (j = 0; j < p; j++) acc += X[i][j] * w[j];
        z.push(acc);
      }
      dirs.push(w);
      scores.push(z);
      var ztZ = new Array(p).fill(0), zty = 0, ztz = 0;
      for (i = 0; i < n; i++) {
        ztz += z[i] * z[i];
        zty += z[i] * yv[i];
        for (j = 0; j < p; j++) ztZ[j] += z[i] * X[i][j];
      }
      if (ztz < 1e-12) break;
      for (i = 0; i < n; i++) {
        yv[i] -= (zty / ztz) * z[i];
        for (j = 0; j < p; j++) X[i][j] -= (ztZ[j] / ztz) * z[i];
      }
    }
    var Xs = [];
    for (i = 0; i < n; i++) {
      var r2 = [1];
      for (comp = 0; comp < dirs.length; comp++) r2.push(scores[comp][i]);
      Xs.push(r2);
    }
    var f = ols(Xs, y);
    var beta = new Array(p).fill(0);
    for (comp = 0; comp < dirs.length; comp++) {
      for (j = 0; j < p; j++) beta[j] += f.beta[comp + 1] * dirs[comp][j];
    }
    return { beta: beta, dirs: dirs, scores: scores, fit: f };
  }

  /* ---------------------------------------------------------- k-fold ids */
  // A length-n array of fold ids 0..k−1.  The shuffle uses the same
  // mulberry32 step as plots.js, implemented locally so stats.js has no
  // dependency: same seed, same split, every reload.
  function kfolds(n, k, seed) {
    var a = (seed === undefined ? 1 : seed) >>> 0, i, t;
    function rnd() {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var x = Math.imul(a ^ (a >>> 15), 1 | a);
      x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
      return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    }
    var ids = [];
    for (i = 0; i < n; i++) ids.push(i % k);
    for (t = n - 1; t > 0; t--) {
      var w = Math.floor(rnd() * (t + 1)), tmp = ids[t]; ids[t] = ids[w]; ids[w] = tmp;
    }
    return ids;
  }

  /* ======================================================================
     Chapter 7 — moving beyond linearity.

     Everything in this chapter is the same idea wearing different clothes:
     pick a fixed, known family of functions b1..bK (a polynomial, a set of
     step indicators, a spline), then fit a standard linear model in those
     columns.  What follows builds those families, and the one genuinely new
     estimator — logistic regression by iteratively reweighted least
     squares, which chapters 3 to 6 never needed because chapter 4 quoted the
     book's published coefficients instead of fitting a model.
     ====================================================================== */

  /* Orthonormalise basis columns with modified Gram-Schmidt plus one
     reorthogonalisation pass (two passes is what makes a degree-15
     polynomial come out accurate rather than garbage).  Besides the
     unit-norm columns this returns `map`, the triangular change of basis,
     so exactly the same rotation can be applied to any other x — which is
     what lets a fitted basis be evaluated on a new grid. */
  function ortho(cols, r) {
    var m = cols.length, N = cols[0].length, i, j, k;
    var q = [], T = [];
    for (i = 0; i < m; i++) {
      q.push(new Array(N));
      T.push(new Array(m).fill(0));
      T[i][i] = 1;
    }
    for (i = 0; i < m; i++) {
      var v = cols[i].slice(), t = T[i].slice(), s, nrm;
      for (k = 0; k < 2; k++) {                    // 2 passes = reorthogonalise
        for (j = 0; j < i; j++) {
          s = 0;
          for (r = 0; r < N; r++) s += q[j][r] * v[r];
          if (s === 0) continue;
          for (r = 0; r < N; r++) { v[r] -= s * q[j][r]; t[r] -= s * T[j][r]; }
        }
      }
      nrm = 0;
      for (r = 0; r < N; r++) nrm += v[r] * v[r];
      nrm = Math.sqrt(nrm);
      if (!(nrm > 0)) nrm = 1;
      for (r = 0; r < N; r++) { q[i][r] = v[r] / nrm; T[i][r] = t[r] / nrm; }
    }
    return { cols: q, map: T };
  }

  function applyMap(map, raw) {
    var m = map.length, N = raw[0].length, out = [], i, j, r, row, w;
    for (i = 0; i < m; i++) {
      row = new Array(N).fill(0);
      for (j = 0; j < map[i].length; j++) {
        w = map[i][j];
        if (!w) continue;
        for (r = 0; r < N; r++) row[r] += w * raw[j][r];
      }
      out.push(row);
    }
    return out;
  }

  /* [1, x, x^2, ..., x^deg] — the raw polynomial columns, constant first. */
  function polyRaw(x, deg, mean) {
    var cols = [], i, k, c;
    for (k = 0; k <= deg; k++) {
      c = new Array(x.length);
      for (i = 0; i < x.length; i++) c[i] = Math.pow(x[i] - mean, k);
      cols.push(c);
    }
    return cols;
  }

  /* Orthogonal polynomial basis, ISLP eq. (7.1)'s predictors.
     Centres x, orthonormalises the raw powers, and drops the constant —
     which is exactly what R's poly() and ISLP's Poly() do, so the fitted
     curve and the pointwise band are the same functions the book plots. */
  function polyBasis(x, deg) {
    var mean = Stats.mean(x);
    var raw = polyRaw(x, deg, mean);
    var o = ortho(raw);
    var map = o.map.slice(1);                    // the intercept column is separate
    return {
      deg: deg, mean: mean, cols: o.cols.slice(1), map: map,
      apply: function (xNew) { return applyMap(map, polyRaw(xNew, deg, mean)); }
    };
  }

  function quantileCuts(x, k) {
    if (k <= 0) return [];
    var s = x.slice().sort(function (a, b) { return a - b; }), out = [], i;
    for (i = 1; i <= k; i++) {
      var pos = i / (k + 1) * (s.length - 1), lo = Math.floor(pos), hi = Math.ceil(pos);
      out.push(s[lo] + (pos - lo) * (s[hi] - s[lo]));
    }
    return out;
  }

  function widthCuts(x, k) {
    if (k <= 0) return [];
    var lo = Math.min.apply(null, x), hi = Math.max.apply(null, x), out = [], i;
    for (i = 1; i <= k; i++) out.push(lo + (hi - lo) * i / (k + 1));
    return out;
  }

  /* ISLP eq. (7.4): the K+1 indicator columns C0..CK.  The book drops C0
     from the model (7.5) because the intercept already carries it.  With no
     cutpoints at all there is a single bin and C0 is 1 everywhere. */
  function stepRaw(x, cuts) {
    var cols = [], K = cuts.length, i, j, c, v;
    for (j = 0; j <= K; j++) {
      c = new Array(x.length);
      for (i = 0; i < x.length; i++) {
        v = x[i];
        c[i] = j === 0 ? (K === 0 || v < cuts[0] ? 1 : 0)
          : (j === K ? (v >= cuts[K - 1] ? 1 : 0)
                     : (v >= cuts[j - 1] && v < cuts[j] ? 1 : 0));
      }
      cols.push(c);
    }
    return cols;
  }

  function stepBasis(x, cuts) {
    return {
      cuts: cuts.slice(), K: cuts.length,
      cols: stepRaw(x, cuts).slice(1),            // C1..CK, per (7.5)
      allCols: stepRaw(x, cuts),
      apply: function (xNew) { return stepRaw(xNew, cuts).slice(1); },
      applyAll: function (xNew) { return stepRaw(xNew, cuts); }
    };
  }

  /* The truncated power functions of eq. (7.10), before any
     orthogonalisation: x, x^2, x^3 and (x - xi_j)^3_+ per knot.  Exported
     because section 7.3's demo fits the same space twice — once in these
     columns and once in the orthonormal rotation — and needs both. */
  function truncRaw(x, knots) {
    var cols = [], i, j, c, v;
    for (j = 0; j < 3; j++) {
      c = new Array(x.length);
      for (i = 0; i < x.length; i++) c[i] = Math.pow(x[i], j + 1);
      cols.push(c);
    }
    for (j = 0; j < knots.length; j++) {
      c = new Array(x.length);
      for (i = 0; i < x.length; i++) { v = x[i] - knots[j]; c[i] = v > 0 ? v * v * v : 0; }
      cols.push(c);
    }
    return cols;
  }

  function truncBasis(x, knots) {
    var r0 = truncRaw(x, knots), o = ortho(r0);
    return {
      knots: knots.slice(), cols: o.cols, map: o.map,
      apply: function (xNew) { return applyMap(o.map, truncRaw(xNew, knots)); }
    };
  }

  /* A natural cubic spline basis, ISLP eq. (7.9) with the two extra
     boundary constraints of §7.4.2.  Excluding the intercept the space with
     K interior knots is spanned by

       N0(x) = x
       Nj(x) = (x - xi_j)^3_+ - ((b - xi_j)/(b - a)) * (x^3 - 3 a x^2)

     which is the truncated power basis with just enough of the global cubic
     subtracted that the second derivative vanishes at both boundary knots
     a and b.  Columns are then orthonormalised: same span, same fitted
     curve, but a design with condition number 1 instead of 10^8.  The raw
     columns are exported too, for section 7.3's demo, which fits one space
     in two different sets of coordinates. */
  function nsRaw(x, knots, a, b) {
    var cols = [x.slice()], i, j, c, v;
    for (j = 0; j < knots.length; j++) {
      c = (b - knots[j]) / (b - a);
      var col = new Array(x.length);
      for (i = 0; i < x.length; i++) {
        v = x[i] - knots[j];
        col[i] = (v > 0 ? v * v * v : 0) - c * (x[i] * x[i] * x[i] - 3 * a * x[i] * x[i]);
      }
      cols.push(col);
    }
    return cols;
  }

  /* df basis columns counting the linear term, so df = K + 1 and the book's
     "four degrees of freedom leads to three interior knots" holds exactly. */
  function natSpline(x, df, opts) {
    opts = opts || {};
    var a = opts.lo === undefined ? Math.min.apply(null, x) : opts.lo;
    var b = opts.hi === undefined ? Math.max.apply(null, x) : opts.hi;
    var knots = opts.knots || quantileCuts(x, df - 1);
    var o = ortho(nsRaw(x, knots, a, b));
    return {
      df: df, knots: knots, lo: a, hi: b, cols: o.cols, map: o.map,
      apply: function (xNew) { return applyMap(o.map, nsRaw(xNew, knots, a, b)); }
    };
  }

  /* A cubic (non-natural) spline: eq. (7.9) with the truncated power basis
     of (7.10), so df columns need df - 3 interior knots — a cubic already
     has three, and the knot count is what adds degrees of freedom. */
  function cubSpline(x, df, opts) {
    opts = opts || {};
    var K = Math.max(0, df - 3);
    var knots = opts.knots || quantileCuts(x, K);
    var o = truncBasis(x, knots);
    o.df = df;
    return o;
  }

  /* ======================================================================
     Section 7.5 — the smoothing spline, ISLP eq. (7.11) to (7.14).

         ĝ = argmin_g  SUM_i (y_i - g(x_i))^2  +  lambda INT g''(t)^2 dt

     The book's result is that the answer is a *natural* cubic spline with a
     knot at every distinct value of x, shrunk toward the straight line by
     lambda: a regression spline with as many knots as the data can supply,
     where lambda — not the knots — does the tuning.  So that is what this
     builds: the natural basis of nsRaw() with one knot per distinct x, the
     roughness penalty INT g''^2 as a matrix in those coordinates, and then

         beta = (Z'WZ + lambda Omega)^-1 Z'W ybar,      g-hat = Z beta

     which is chapter 6's ridge in the basis of section 7.4.

     Two things keep it fast enough to run live:

       1. Tied x values collapse.  The loss splits into a constant (the spread
          within each tied group) plus the same loss on the group means with
          weights = group sizes, so every quantity below is computed on the
          distinct rows only — 61 of them on the Wage data, not 3,000.  The
          constant is kept in `rss`, so RSS at lambda = 0 comes out as the
          spread no spline can remove rather than as zero.
       2. The basis is orthonormalised first (over all n rows), which makes
          Z'WZ the identity: A = I + lambda*Omega, every solve is one
          Gauss-Jordan step, and the condition number is lambda's doing alone.

     The penalty matrix is computed exactly, not approximately: each column's
     second derivative is piecewise linear between the knots, and Simpson's
     rule integrates a product of two linears exactly.

     df is eq. (7.13), trace(S_lambda); `cv` is the unnumbered leave-one-out
     formula printed after it.  lamForDf() inverts df into lambda so a slider
     can ask for "16 effective degrees of freedom" the way Figure 7.8 does.
     ====================================================================== */
  function buildSmoothSpline(x, y) {
    var n = x.length, i, j, k;

    /* ---- collapse tied x: the loss separates, so fit the group means ---- */
    var order = [];
    for (i = 0; i < n; i++) order.push(i);
    order.sort(function (p, q) { return x[p] - x[q]; });
    var u = [], w = [], ybar = [], tieK = [], grp = new Array(n), tieSS = 0, s = 0;
    for (k = 0; k <= n; k++) {
      if (k === n || x[order[k]] !== x[order[s]]) {
        var cnt = k - s, sum = 0, ss = 0, t, mean, d;
        for (t = s; t < k; t++) sum += y[order[t]];
        mean = sum / cnt;
        for (t = s; t < k; t++) { d = y[order[t]] - mean; ss += d * d; }
        for (t = s; t < k; t++) grp[order[t]] = u.length;
        u.push(x[order[s]]); w.push(cnt); ybar.push(mean); tieK.push(ss);
        tieSS += ss;
        s = k;
      }
    }
    var M = u.length, a = u[0], b = u[M - 1];
    var xi = u.slice(1, M - 1);              /* M - 2 interior knots */
    var LMIN = -6, LMAX = 16;                /* log10(lambda) search window */

    /* ---- raw columns [1, x, N1..N] and the roughness penalty ------------ */
    function rawCols(xs) {
      var ones = [], r;
      for (r = 0; r < xs.length; r++) ones.push(1);
      return [ones].concat(nsRaw(xs, xi, a, b));
    }

    /* N_j'' = 6 f_j with f_j(x) = (x - xi_j)+ - c_j (x - a): piecewise
       linear, kinked at xi_j.  Values at every breakpoint are enough to
       integrate products exactly over each interval. */
    var F = [];
    for (j = 0; j < xi.length; j++) {
      var cj = (b - xi[j]) / (b - a), row = [];
      for (k = 0; k < M; k++) {
        var dv = u[k] - xi[j];
        row.push((dv > 0 ? dv : 0) - cj * (u[k] - a));
      }
      F.push(row);
    }
    var Om = [];
    for (i = 0; i < M; i++) Om.push(new Array(M).fill(0));
    for (i = 0; i < xi.length; i++) {
      for (j = i; j < xi.length; j++) {
        var acc = 0;
        for (k = 0; k < M - 1; k++) {
          acc += (u[k + 1] - u[k]) / 6 *
            (F[i][k] * F[j][k] +
             (F[i][k] + F[i][k + 1]) * (F[j][k] + F[j][k + 1]) +
             F[i][k + 1] * F[j][k + 1]);
        }
        Om[i + 2][j + 2] = Om[j + 2][i + 2] = 36 * acc;
      }
    }

    /* ---- orthonormalise, and carry the penalty along with the rotation --
       q = map * raw, so g = theta'q has raw coefficients map'theta and
       INT g''^2 = theta' (map Omega map') theta. */
    var org = ortho(rawCols(x)), map = org.map;
    var Tm = [], OmO = [];
    for (i = 0; i < M; i++) { Tm.push(new Array(M).fill(0)); OmO.push(new Array(M).fill(0)); }
    for (i = 0; i < M; i++) {
      for (k = 0; k < M; k++) {
        if (!map[i][k]) continue;
        for (j = 0; j < M; j++) Tm[i][j] += map[i][k] * Om[k][j];
      }
    }
    for (i = 0; i < M; i++) {
      for (j = 0; j < M; j++) {
        var acc2 = 0;
        for (k = 0; k < M; k++) acc2 += Tm[i][k] * map[j][k];
        OmO[i][j] = acc2;
      }
    }

    /* ---- design on the distinct rows: Z'WZ is the identity ------------- */
    var Zu = applyMap(map, rawCols(u)), Z = [];
    for (k = 0; k < M; k++) {
      var zrow = new Array(M);
      for (i = 0; i < M; i++) zrow[i] = Zu[i][k];
      Z.push(zrow);
    }
    var G = [], ct = [];
    for (i = 0; i < M; i++) { G.push(new Array(M).fill(0)); ct.push(0); }
    for (k = 0; k < M; k++) {
      for (i = 0; i < M; i++) {
        ct[i] += w[k] * ybar[k] * Z[k][i];
        for (j = 0; j < M; j++) G[i][j] += w[k] * Z[k][i] * Z[k][j];
      }
    }

    /* ---- one fit ------------------------------------------------------- */
    function fitLam(lam) {
      var A = [], Ai, beta = [], fitv = [], Sii = [];
      var i2, j2, k2, f, d, q, cv = 0, df = 0, rough = 0, rss = tieSS, bad = 0;
      for (i2 = 0; i2 < M; i2++) {
        A.push(new Array(M));
        for (j2 = 0; j2 < M; j2++) A[i2][j2] = G[i2][j2] + lam * OmO[i2][j2];
      }
      Ai = inverse(A);
      for (i2 = 0; i2 < M; i2++) {
        var s2 = 0;
        for (j2 = 0; j2 < M; j2++) s2 += Ai[i2][j2] * ct[j2];
        beta.push(s2);
      }
      for (k2 = 0; k2 < M; k2++) {
        f = 0;
        for (i2 = 0; i2 < M; i2++) f += Z[k2][i2] * beta[i2];
        fitv.push(f);
        d = ybar[k2] - f;
        rss += w[k2] * d * d;
        q = 0;
        for (i2 = 0; i2 < M; i2++) {
          var s3 = 0;
          for (j2 = 0; j2 < M; j2++) s3 += Ai[i2][j2] * Z[k2][j2];
          q += Z[k2][i2] * s3;
        }
        Sii.push(q);
        if (1 - q > 0) cv += (tieK[k2] + w[k2] * d * d) / ((1 - q) * (1 - q));
        else bad = 1;                       /* lambda = 0 memorises its x */
      }
      for (i2 = 0; i2 < M; i2++) for (j2 = 0; j2 < M; j2++) {
        df += Ai[i2][j2] * G[j2][i2];                       /* eq. (7.13) */
        rough += beta[i2] * OmO[i2][j2] * beta[j2];         /* INT g''^2  */
      }
      return { lam: lam, beta: beta, fit: fitv, Sii: Sii, df: df, rss: rss,
               rough: rough, cv: bad ? Infinity : cv };
    }

    /* df alone — what lamForDf()'s bisection needs, about twice as cheap */
    function dfAt(lam) {
      var A = [], Ai, i2, j2, df = 0;
      for (i2 = 0; i2 < M; i2++) {
        A.push(new Array(M));
        for (j2 = 0; j2 < M; j2++) A[i2][j2] = G[i2][j2] + lam * OmO[i2][j2];
      }
      Ai = inverse(A);
      for (i2 = 0; i2 < M; i2++) for (j2 = 0; j2 < M; j2++) df += Ai[i2][j2] * G[j2][i2];
      return df;
    }

    /* the (log10 lambda, df, rss, rough, cv) path, built once: it is the
       leave-one-out curve of Figure 7.8's lower panel and the bracket that
       lamForDf() bisects inside */
    var TBL = null;
    function table() {
      if (TBL) return TBL;
      TBL = [];
      for (var p = 0; p <= 300; p++) {
        var L = LMIN + (LMAX - LMIN) * p / 300, f = fitLam(Math.pow(10, L));
        TBL.push({ L: L, df: f.df, rss: f.rss, rough: f.rough, cv: f.cv });
      }
      return TBL;
    }

    var dfLam = {};
    function lamForDf(target) {
      var key = target.toFixed(4);
      if (dfLam[key] !== undefined) return dfLam[key];
      var t = table(), i = 0, lo, hi, mid, it;
      if (target >= t[0].df || target <= t[t.length - 1].df) {
        dfLam[key] = target >= t[0].df ? t[0].L : t[t.length - 1].L;
        return dfLam[key];
      }
      while (i < t.length - 2 && !(t[i].df >= target && t[i + 1].df <= target)) i++;
      lo = t[i].L; hi = t[i + 1].L;
      for (it = 0; it < 18; it++) {
        mid = (lo + hi) / 2;
        if (dfAt(Math.pow(10, mid)) > target) lo = mid; else hi = mid;
      }
      dfLam[key] = (lo + hi) / 2;
      return dfLam[key];
    }

    /* the lambda that minimises the leave-one-out criterion: golden section
       on log10(lambda) inside the table's best interval */
    var LOO = null;
    function loocv() {
      if (LOO) return LOO;
      var t = table(), best = 0, i;
      for (i = 1; i < t.length; i++) if (t[i].cv < t[best].cv) best = i;
      var lo = t[Math.max(0, best - 1)].L, hi = t[Math.min(t.length - 1, best + 1)].L;
      var gr = (Math.sqrt(5) - 1) / 2;
      var c = hi - gr * (hi - lo), d = lo + gr * (hi - lo);
      var fc = fitLam(Math.pow(10, c)).cv, fd = fitLam(Math.pow(10, d)).cv;
      for (i = 0; i < 60 && hi - lo > 1e-9; i++) {
        if (fc < fd) {
          hi = d; d = c; fd = fc; c = hi - gr * (hi - lo); fc = fitLam(Math.pow(10, c)).cv;
        } else {
          lo = c; c = d; fc = fd; d = lo + gr * (hi - lo); fd = fitLam(Math.pow(10, d)).cv;
        }
      }
      var L = (lo + hi) / 2;
      LOO = { L: L, f: fitLam(Math.pow(10, L)) };
      return LOO;
    }

    /* a fitted smoothing spline, evaluated anywhere */
    function curve(f, xs) {
      var cols = applyMap(map, rawCols(xs)), out = [], r, i2, v;
      for (r = 0; r < xs.length; r++) {
        v = 0;
        for (i2 = 0; i2 < M; i2++) v += cols[i2][r] * f.beta[i2];
        out.push(v);
      }
      return out;
    }

    /* Delete one observation — not one group: the design loses the single
       rank-one piece that observation contributed, and the knots stay where
       they were, which is exactly the condition under which eq. (7.14) holds. */
    function fitWithout(g, yi, lam) {
      var A = [], rhs = [], i2, j2, f = 0;
      for (i2 = 0; i2 < M; i2++) {
        A.push(new Array(M));
        rhs.push(ct[i2] - Z[g][i2] * yi);
        for (j2 = 0; j2 < M; j2++) {
          A[i2][j2] = G[i2][j2] - Z[g][i2] * Z[g][j2] + lam * OmO[i2][j2];
        }
      }
      var beta = solve(A, rhs);
      for (i2 = 0; i2 < M; i2++) f += Z[g][i2] * beta[i2];
      return f;
    }

    return {
      x: x, y: y, n: n, M: M, lo: a, hi: b, ages: u, knots: xi,
      counts: w, means: ybar,
      group: grp, tieSS: tieSS, LMIN: LMIN, LMAX: LMAX,
      fitLam: fitLam,
      fitL: function (L) { return fitLam(Math.pow(10, L)); },
      table: table, lamForDf: lamForDf, loocv: loocv, curve: curve,
      fitWithout: fitWithout
    };
  }

  /* One smoothing spline per data set: the table and the leave-one-out
     search cost a few hundred matrix solves, and three demos on one page
     all want the same one. */
  var _ssMemo = null;
  function smoothSpline(x, y) {
    if (_ssMemo && _ssMemo.x === x && _ssMemo.y === y) return _ssMemo;
    _ssMemo = buildSmoothSpline(x, y);
    return _ssMemo;
  }

  /* The design matrix [1, b1, ..., bK] for a basis.  With no columns — a
     model that is only an intercept — the row count has to be passed in. */
  function design(cols, n) {
    var N = n === undefined ? (cols.length ? cols[0].length : 0) : n;
    var X = [], i, r, row;
    for (r = 0; r < N; r++) {
      row = [1];
      for (i = 0; i < cols.length; i++) row.push(cols[i][r]);
      X.push(row);
    }
    return X;
  }

  /* Ten-fold cross-validation of a basis family.  buildFn(xTrain, yTrain)
     returns an object with `cols` (the basis at the training x) and
     `apply(xNew)`.  Returns the mean squared error and the per-fold RSS. */
  function cvBasis(x, y, folds, buildFn, k) {
    var n = y.length, i, j, kk, K = k || 10;
    var err = new Array(n).fill(0), foldRss = [], foldN = [];
    for (kk = 0; kk < K; kk++) {
      var tr = [], te = [];
      for (i = 0; i < n; i++) (folds[i] === kk ? te : tr).push(i);
      if (!tr.length || !te.length) { foldRss.push(0); foldN.push(0); continue; }
      var xt = [], yt = [];
      for (i = 0; i < tr.length; i++) { xt.push(x[tr[i]]); yt.push(y[tr[i]]); }
      var spec = buildFn(xt, yt);
      var fit = ols(design(spec.cols), yt);
      var xte = [];
      for (i = 0; i < te.length; i++) xte.push(x[te[i]]);
      var cte = spec.apply(xte), rss = 0;
      for (i = 0; i < te.length; i++) {
        var yh = fit.beta[0];
        for (j = 0; j < cte.length; j++) yh += cte[j][i] * fit.beta[j + 1];
        err[te[i]] = y[te[i]] - yh;
        rss += err[te[i]] * err[te[i]];
      }
      foldRss.push(rss);
      foldN.push(te.length);
    }
    var s = 0;
    for (i = 0; i < n; i++) s += err[i] * err[i];
    return { mse: s / n, rss: s, err: err, foldRss: foldRss, foldN: foldN };
  }

  /* Logistic regression by iteratively reweighted least squares.  Each step
     builds the working response z = eta + (y - p)/w with w = p(1-p) and
     refits by weighted least squares, exactly the algorithm chapter 4
     described and never had to run.  Standard errors come from the observed
     information at convergence. */
  function logit(X, y, opts) {
    opts = opts || {};
    var n = X.length, k = X[0].length, i, j, m, it;
    var beta = new Array(k).fill(0);
    var ybar = Stats.mean(y);
    ybar = Math.min(1 - 1e-10, Math.max(1e-10, ybar));
    beta[0] = Math.log(ybar / (1 - ybar));
    var maxit = opts.maxit || 50, tol = opts.tol || 1e-10;
    var w = new Array(n), z = new Array(n), XtWX = null, used = 0;

    for (it = 0; it < maxit; it++) {
      for (m = 0; m < n; m++) {
        var eta = 0;
        for (j = 0; j < k; j++) eta += X[m][j] * beta[j];
        var p = 1 / (1 + Math.exp(-eta));
        p = Math.min(1 - 1e-12, Math.max(1e-12, p));
        w[m] = p * (1 - p);
        z[m] = eta + (y[m] - p) / w[m];
      }
      XtWX = [];
      var XtWz = [];
      for (j = 0; j < k; j++) { XtWX.push(new Array(k).fill(0)); XtWz.push(0); }
      for (m = 0; m < n; m++) {
        for (i = 0; i < k; i++) {
          XtWz[i] += X[m][i] * w[m] * z[m];
          for (j = 0; j < k; j++) XtWX[i][j] += X[m][i] * w[m] * X[m][j];
        }
      }
      var nb = solve(XtWX, XtWz), delta = 0;
      for (j = 0; j < k; j++) delta += Math.abs(nb[j] - beta[j]);
      beta = nb;
      used = it + 1;
      if (delta < tol) break;
    }

    var p = new Array(n), ll = 0, dev = 0;
    var nullDev = -2 * (n * (ybar * Math.log(ybar) + (1 - ybar) * Math.log(1 - ybar)));
    for (m = 0; m < n; m++) {
      var e2 = 0;
      for (j = 0; j < k; j++) e2 += X[m][j] * beta[j];
      p[m] = 1 / (1 + Math.exp(-e2));
      p[m] = Math.min(1 - 1e-12, Math.max(1e-12, p[m]));
      ll += y[m] * Math.log(p[m]) + (1 - y[m]) * Math.log(1 - p[m]);
      dev += -2 * (y[m] * Math.log(p[m]) + (1 - y[m]) * Math.log(1 - p[m]));
    }
    var inv = inverse(XtWX), se = [];
    for (j = 0; j < k; j++) se[j] = Math.sqrt(inv[j][j]);
    return {
      beta: beta, se: se, p: p, inv: inv, iters: used,
      ll: ll, dev: dev, nullDev: nullDev, mcFadden: 1 - ll / (-nullDev / 2)
    };
  }

  global.Stats = {
    solve: solve,
    inverse: inverse,
    ols: ols,
    tPvalue: tPvalue,
    fPvalue: fPvalue,
    tCrit: tCrit,
    mean: function (a) { return a.reduce(function (s, v) { return s + v; }, 0) / a.length; },
    /* Chapter 6 */
    prepare: prepare,
    crossprod: crossprod,
    rssFrom: rssFrom,
    maskOf: maskOf,
    namesOf: namesOf,
    subsetSearch: subsetSearch,
    stepwise: stepwise,
    criteria: criteria,
    ridge: ridge,
    ridgePath: ridgePath,
    lasso: lasso,
    lassoPath: lassoPath,
    eigSym: eigSym,
    pca: pca,
    pcr: pcr,
    pls: pls,
    kfolds: kfolds,
    /* Chapter 7 */
    ortho: ortho,
    applyMap: applyMap,
    polyBasis: polyBasis,
    quantileCuts: quantileCuts,
    widthCuts: widthCuts,
    stepBasis: stepBasis,
    stepRaw: stepRaw,
    truncRaw: truncRaw,
    truncBasis: truncBasis,
    nsRaw: nsRaw,
    natSpline: natSpline,
    cubSpline: cubSpline,
    smoothSpline: smoothSpline,
    design: design,
    cvBasis: cvBasis,
    logit: logit
  };
})(window);
