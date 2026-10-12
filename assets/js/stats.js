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
    kfolds: kfolds
  };
})(window);
