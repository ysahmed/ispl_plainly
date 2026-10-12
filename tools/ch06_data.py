"""Regenerate assets/data/ch06-data.js — the pieces of the Chapter 6 demos
that are too slow to do live in the browser.

    .venv/bin/python tools/ch06_data.py

What is computed here
  CH06_LASSO   standardized lasso coefficient path on the Credit data
               (40 values of λ on the scale of ISLP eq. 6.7)
  CH06_RIDGE   the same for ridge (eq. 6.5)
  CH06_LASSOCV ten-fold cross-validation MSE for the lasso on Credit, using
               the same fold shuffle as Stats.kfolds(seed=7) in the browser
  CH06_HD      the §6.4 "curse of dimensionality" experiment: the lasso on
               n=100 training rows with p = 20, 50 or 2000 features (20 of
               them real signal), λ picked by ten-fold CV, test MSE on an
               independent set, one (df, mse, null mse) triple per replicate
  CH06_POPAD   100 simulated cities: population, advertising spend, and the
               sales noise the browser reuses while a slider moves weight
               between the two predictors — the data behind Figures 6.14,
               6.15 and 6.21.  This is OUR simulation with OUR seed; the
               book's own pop/ad numbers are quoted in the prose only.

Every number in the file's header comment is executed by this script, never
transcribed from the book.  Sources: ISLP load_data('Credit') for the data;
scikit-learn for the lasso paths, cross-checked against the book's own
coordinate-descent update rule (see the header checks).
"""
from pathlib import Path
import time
import warnings

import numpy as np
from sklearn.linear_model import Lasso
from sklearn.exceptions import ConvergenceWarning
from sklearn.linear_model import lasso_path

from ISLP import load_data

warnings.filterwarnings("ignore", category=ConvergenceWarning)

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "data" / "ch06-data.js"

# --------------------------------------------------------------------------
# 1. the Credit design: the book's ten predictors (ISLP Figure 6.1), with
#    Ethnicity's two treatment dummies (reference: African American), so the
#    design has the 11 columns the book's figures range over.
credit = load_data("Credit")
y = credit["Balance"].to_numpy(float)
n = len(y)

num = {
    "income": credit["Income"].to_numpy(float),
    "limit": credit["Limit"].to_numpy(float),
    "rating": credit["Rating"].to_numpy(float),
    "cards": credit["Cards"].to_numpy(float),
    "age": credit["Age"].to_numpy(float),
    "education": credit["Education"].to_numpy(float),
    "student": (credit["Student"] == "Yes").to_numpy(float),
    "gender": (credit["Gender"] == "Female").to_numpy(float),
    "married": (credit["Married"] == "Yes").to_numpy(float),
}
eth = np.column_stack([
    (credit["Ethnicity"] == "Asian").to_numpy(float),
    (credit["Ethnicity"] == "Caucasian").to_numpy(float),
])
ORDER = list(num) + ["ethAsian", "ethCaucasian"]
Xraw = np.column_stack([num[k] for k in num] + [eth])

mu, sd = Xraw.mean(0), Xraw.std(0)          # ddof=0, ISLP eq. (6.6)
Z = (Xraw - mu) / sd
yc = y - y.mean()

beta_ols = np.linalg.lstsq(Z, yc, rcond=None)[0]
rss_ols = float(np.sum((yc - Z @ beta_ols) ** 2))
l1_ols = float(np.abs(beta_ols).sum())
l2_ols = float(np.sqrt((beta_ols**2).sum()))


# --------------------------------------------------------------------------
# 2. a coordinate descent that follows ISLP (6.7) exactly — λ on the book's
#    RSS + λ·Σ|β| scale — used to cross-check scikit-learn's λ scale.
def lasso_cd(lam, maxit=200_000, tol=1e-12, warm=None):
    p = Z.shape[1]
    b = np.zeros(p) if warm is None else warm.copy()
    r = yc - Z @ b
    z2 = (Z * Z).sum(0)
    for _ in range(maxit):
        moved = 0.0
        for j in range(p):
            rho = Z[:, j] @ (r + Z[:, j] * b[j])
            nb = np.sign(rho) * max(abs(rho) - lam / 2, 0.0) / z2[j]
            d = nb - b[j]
            if d:
                r -= Z[:, j] * d
                b[j] = nb
                moved = max(moved, abs(d))
        if moved < tol:
            break
    return b


lam_max = float(2.0 * np.abs(Z.T @ yc).max())   # beyond this every β is 0
LAMS = np.exp(np.linspace(np.log(lam_max), np.log(lam_max / 1e4), 40))

lasso_beta = []
b = np.zeros(Z.shape[1])
for lam in LAMS:                                 # warm start down the path
    b = lasso_cd(float(lam), warm=b)
    lasso_beta.append(b.copy())
lasso_beta = np.array(lasso_beta)

# scikit-learn uses (1/2n)·RSS + alpha·|β|, so alpha = λ/(2n); check the two
# agree at three λ values (independent implementations of the same problem)
sk_check = []
for k in (5, 20, 39):
    sk = Lasso(alpha=LAMS[k] / (2 * n), fit_intercept=False,
               tol=1e-12, max_iter=1_000_000).fit(Z, yc).coef_
    sk_check.append(float(np.abs(sk - lasso_beta[k]).max()))
sk_gap = max(sk_check)

ridge_beta = np.array([
    np.linalg.solve(Z.T @ Z + lam * np.eye(Z.shape[1]), Z.T @ yc)
    for lam in LAMS
])


# --------------------------------------------------------------------------
# 3. mulberry32, mirrored from assets/js/stats.js so the browser's
#    Stats.kfolds(400, 10, 7) produces exactly these folds.
M32 = 0xFFFFFFFF


def mulberry32(seed):
    a = seed & M32

    def rnd():
        nonlocal a
        a = (a + 0x6D2B79F5) & M32
        x = ((a ^ (a >> 15)) * (1 | a)) & M32
        x = ((x + (((x ^ (x >> 7)) * (61 | x)) & M32)) ^ x) & M32
        return ((x ^ (x >> 14)) & M32) / 4294967296

    return rnd


def kfolds(nn, k, seed):
    rnd = mulberry32(seed)
    ids = [i % k for i in range(nn)]
    for t in range(nn - 1, 0, -1):
        w = int(rnd() * (t + 1))
        ids[t], ids[w] = ids[w], ids[t]
    return np.array(ids)


FOLDS = kfolds(n, 10, 7)

cv_mse, cv_mse_lo, cv_mse_hi = [], [], []
for lam in LAMS:
    alpha = lam / (2 * n)
    sq = np.empty(n)
    for f in range(10):
        test = FOLDS == f
        train = ~test
        fit = Lasso(alpha=alpha, fit_intercept=False, tol=1e-10,
                    max_iter=200_000).fit(Z[train], yc[train])
        sq[test] = (yc[test] - fit.predict(Z[test])) ** 2
    per_obs = sq                       # same folds each λ -> paired comparisons
    cv_mse.append(float(sq.mean()))
    # the usual +/- one standard error band, computed fold-wise
    fold_mse = np.array([sq[FOLDS == f].mean() for f in range(10)])
    cv_mse_lo.append(float(fold_mse.mean() - fold_mse.std(ddof=1) / np.sqrt(10)))
    cv_mse_hi.append(float(fold_mse.mean() + fold_mse.std(ddof=1) / np.sqrt(10)))

cv_mse = np.array(cv_mse)
best = int(cv_mse.argmin())
# lambda.1se: the largest λ (most shrinkage) whose CV error is within one SE
# of the minimum, using the fold-wise SE at the minimum
fold_mse_at = None
for f in range(10):
    test = FOLDS == f
    fit = Lasso(alpha=LAMS[best] / (2 * n), fit_intercept=False, tol=1e-10,
                max_iter=200_000).fit(Z[~test], yc[~test])
    m = float(((yc[test] - fit.predict(Z[test])) ** 2).mean())
    fold_mse_at = m if fold_mse_at is None else np.append(fold_mse_at, m)
se_at_min = float(np.std(fold_mse_at, ddof=1) / np.sqrt(10))
within = np.where(cv_mse <= cv_mse[best] + se_at_min)[0]
one_se = int(within.min())            # largest λ still within one SE


# --------------------------------------------------------------------------
# 4. §6.4: the curse of dimensionality, after ISLP Figure 6.24.
#    n=100 training rows, p features of which the first 20 are signal,
#    λ picked by ten-fold CV inside the training set, test MSE on an
#    independent 1000 rows.  Our own simulation (the book does not give
#    the generating details); documented in the page's figcaption.
def one_rep(pp, seed):
    """One replicate of the §6.4 experiment: train on 100 rows, pick lambda
    by ten-fold CV inside the training set, report test MSE on 1000 fresh
    rows.  The whole fold path comes from one warm-started lasso_path call.

    Signal strengths: the first min(20, p) features carry +-0.25 against
    noise of sd 1, so the null model's test MSE sits near 20*0.0625 + 1
    = 2.25 — the same scale as the book's Figure 6.24 boxplots (whose
    df=1 boxes all sit just above 2)."""
    rng = np.random.default_rng(seed)
    beta = np.zeros(pp)
    k = min(20, pp)
    beta[:k] = np.where(np.arange(k) % 2 == 0, 0.25, -0.25)
    Xtr = rng.standard_normal((100, pp))
    Xte = rng.standard_normal((1000, pp))
    ytr = Xtr @ beta + rng.standard_normal(100)
    yte = Xte @ beta + rng.standard_normal(1000)

    lmax = float(np.abs(Xtr.T @ (ytr - ytr.mean())).max() / 100)
    alphas = np.exp(np.linspace(np.log(lmax), np.log(lmax * 1e-3), 40))
    folds = rng.permutation(np.tile(np.arange(10), 10))[:100]

    sqsum = np.zeros((40, 100))
    for f in range(10):
        te = folds == f
        Xf, yf = Xtr[~te], ytr[~te]
        # lasso_path returns coefs with shape (n_features, n_alphas)
        _, coefs, _ = lasso_path(Xf, yf, alphas=alphas, max_iter=20_000, tol=1e-4)
        yhat = coefs.T @ Xtr[te].T + (yf.mean() - Xf.mean(0) @ coefs).reshape(-1, 1)
        sqsum[:, te] = (ytr[te][None, :] - yhat) ** 2
    cv = sqsum.mean(1)
    amin = int(cv.argmin())

    _, coefs, _ = lasso_path(Xtr, ytr, alphas=alphas, max_iter=50_000, tol=1e-6)
    w = coefs[:, amin]
    yhat_te = Xte @ w + (ytr.mean() - Xtr.mean(0) @ w)
    df = int(np.sum(np.abs(w) > 1e-8))
    mse = float(np.mean((yte - yhat_te) ** 2))
    # the null model (intercept only) on the same test rows: the bar the
    # lasso has to clear
    null = float(np.mean((yte - ytr.mean()) ** 2))
    return df, mse, null


HD_P = [20, 50, 2000]
HD_REPS = 100
hd = {pp: [] for pp in HD_P}
for pp in HD_P:
    t0 = time.time()
    hd[pp] = [one_rep(pp, 1000 + pp + r) for r in range(HD_REPS)]
    print(f"  hd p={pp}: {HD_REPS} replicates in {time.time() - t0:.0f}s")


# --------------------------------------------------------------------------
# 5. the 100-city data behind Figures 6.14, 6.15 and 6.21.  Ours, not the
#    book's: the book's cities are not published, so we simulate ours and say
#    so.  pop and ad are drawn once and fixed; sales is NOT stored, because
#    the demo needs to move weight between the two predictors.  What is stored
#    instead is the sales noise, so the browser can rebuild
#        sales = 0.9*z(pop) + w*z(ad) + 0.6*noise
#    for any w and get the same numbers we check here.
POPAD_SEED = 9061
_rng = np.random.default_rng(POPAD_SEED)
pop = np.clip(_rng.normal(40.0, 11.0, 100), 10.0, 70.0)
ad = 0.35 * (pop - 40.0) + 25.0 + _rng.normal(0.0, 7.0, 100)
sales_noise = _rng.normal(0.0, 1.0, 100)

W_DEFAULT = 0.20          # the weight on ad the PLS demo opens at


def popad_sales(w):
    zp = (pop - pop.mean()) / pop.std()
    za = (ad - ad.mean()) / ad.std()
    return 0.9 * zp + w * za + 0.6 * sales_noise


def raw_pc1(a, b):
    """Unit-length direction in (a, b) units maximising Var(phi·(x - xbar)).

    This is the phi of ISLP (6.19): an eigenvector of the *covariance* matrix,
    which is also the line through the cloud that minimises the sum of squared
    perpendicular distances.
    """
    C = np.cov(np.column_stack([a, b]), rowvar=False)
    w_, v_ = np.linalg.eigh(C)
    phi = v_[:, np.argmax(w_)]
    if phi[0] < 0:                      # sign convention: first loading > 0
        phi = -phi
    return phi / np.linalg.norm(phi), float(w_[np.argmax(w_)] / w_.sum())


def slopes(w):
    """The two directions Figure 6.21 compares, both in pop/ad units."""
    s = popad_sales(w)
    phi_pc, share = raw_pc1(pop, ad)                    # eq. (6.19), raw
    zp = (pop - pop.mean()) / pop.std()
    za = (ad - ad.mean()) / ad.std()
    zs = (s - s.mean()) / s.std()
    # PLS weights each predictor by its simple-regression coefficient, which
    # on standardised columns is just the correlation (ISLP §6.3.2); the
    # direction is then carried back into pop/ad units by multiplying by the
    # column standard deviations.
    wpls = np.array([np.corrcoef(zs, zp)[0, 1], np.corrcoef(zs, za)[0, 1]])
    raw_pls = wpls * np.array([pop.std(), ad.std()])
    raw_pls /= np.linalg.norm(raw_pls)
    pc_slope = phi_pc[1] / phi_pc[0]
    pls_slope = raw_pls[1] / raw_pls[0]
    return pc_slope, pls_slope, share, wpls


phi_pc1, pc_share = raw_pc1(pop, ad)
_pc_slope, _pls_slope, _share, _wpls = slopes(W_DEFAULT)

# independent confirmation that raw_pc1 is what it claims: the direction from
# a plain SVD of the centred data, which is the standard way to get PC1.
_centered = np.column_stack([pop, ad]) - np.column_stack([pop, ad]).mean(0)
_svd = np.linalg.svd(_centered, full_matrices=False)[2][0]
if _svd[0] < 0:
    _svd = -_svd
_pc_svd_gap = float(np.abs(_svd - phi_pc1).max())

# and that projecting onto it really is the closest line: 200 random
# directions, all of them worse.
_prand = np.random.default_rng(7)
_sq_center = _centered
_best = float(np.sum((_sq_center @ phi_pc1) ** 2))
_worse = 0
for _ in range(200):
    _d = _prand.normal(size=2)
    _d /= np.linalg.norm(_d)
    if float(np.sum((_sq_center @ _d) ** 2)) < _best:
        _worse += 1


# --------------------------------------------------------------------------
# 6. the file
def arr(vals, nd=4):
    out = []
    for v in vals:
        f = float(v)
        s = f"{f:.{nd}f}".rstrip("0").rstrip(".")
        out.append(s if s not in ("", "-") else "0")
    return "[" + ",".join(out) + "]"


def pairs(pp):
    return "[" + ",".join(f"[{d},{m:.2f},{u:.2f}]" for d, m, u in hd[pp]) + "]"


checks = [
    f"n = {n}, design columns = {Xraw.shape[1]} (Ethnicity as 2 dummies)",
    f"lambda_max (every lasso coefficient is 0 beyond it) = {lam_max:.1f}",
    f"largest |beta| at lambda_max = {np.abs(lasso_beta[0]).max():.2e}",
    f"smallest lambda / OLS agreement = {np.abs(lasso_beta[-1] - beta_ols).max():.2e}",
    f"scikit-learn vs coordinate descent on the path (max |diff|) = {sk_gap:.2e}",
    f"CV minimum at index {best} (lambda = {LAMS[best]:.1f}), MSE = {cv_mse[best]:.1f};"
    f" lambda.1se at index {one_se}",
    f"fold sizes at seed 7 = {np.bincount(FOLDS).tolist()}",
    "hd-lasso median (df, test MSE, null MSE): "
    + "; ".join(
        f"p={pp}: ({np.median([d for d, _, _ in hd[pp]]):.0f},"
        f" {np.median([m for _, m, _ in hd[pp]]):.2f},"
        f" {np.median([u for _, _, u in hd[pp]]):.2f})"
        for pp in HD_P
    ),
    f"pop/ad seed {POPAD_SEED}: pop {pop.min():.1f}-{pop.max():.1f}"
    f" (sd {pop.std():.1f}), ad {ad.min():.1f}-{ad.max():.1f}"
    f" (sd {ad.std():.1f}), corr = {np.corrcoef(pop, ad)[0, 1]:.3f}",
    "PC1 loadings in pop/ad units (eq. 6.19 form) = "
    f"({phi_pc1[0]:.3f}, {phi_pc1[1]:.3f}), {pc_share * 100:.1f}% of the variance",
    f"raw_pc1 vs a plain SVD of the centred data (max |diff|) = {_pc_svd_gap:.2e}",
    f"of 200 random directions, {_worse} fell short of PC1 at maximising the"
    f" projected sum of squares",
    f"Fig 6.21 at w = {W_DEFAULT}: PCA slope {_pc_slope:.3f} vs PLS slope {_pls_slope:.3f}"
    f" (PLS flatter = {str(_pls_slope < _pc_slope).lower()}),"
    f" corr(sales, pop) = {np.corrcoef(popad_sales(W_DEFAULT), pop)[0, 1]:.3f},"
    f" corr(sales, ad) = {np.corrcoef(popad_sales(W_DEFAULT), ad)[0, 1]:.3f}",
]

lines = [
    "/* Generated by tools/ch06_data.py — do not edit by hand.",
    "   CH06_LASSO   standardized lasso path on Credit, 40 values of lambda",
    "   CH06_RIDGE   the same for ridge (closed form, so this is exact)",
    "   CH06_LASSOCV ten-fold CV for the lasso; folds = Stats.kfolds(400,10,7)",
    "   CH06_HD      (df, test MSE, null-model MSE) triples, 100 replicates per",
    "                p, for section 6.4",
    "   CH06_POPAD   100 simulated cities: population, advertising and the sales",
    "                noise the PLS demo reuses — ours, not the book's",
    "",
    "   Executed checks:"]
lines += ["   · " + c for c in checks]
lines += [
    "   lambda is on the book's own scale, ISLP eq. (6.5) RSS + lambda*sum(b^2)",
    "   and eq. (6.7) RSS + lambda*sum|b| — NOT glmnet's 1/(2n) scale. */",
    "",
    "window.CH06_LASSO = {",
    "  lambda: " + arr(LAMS, 1) + ",",
    "  beta: [",
]
for k, row in enumerate(lasso_beta):
    lines.append("    " + arr(row, 3) + ("," if k < len(row) * 0 + len(lasso_beta) - 1 else ""))
lines += [
    "  ],",
    "  l1ratio: " + arr(np.abs(lasso_beta).sum(1) / l1_ols, 4) + ",",
    "  nz: [" + ",".join(str(int(np.sum(np.abs(r) > 1e-6))) for r in lasso_beta) + "],",
    "};",
    "",
    "window.CH06_RIDGE = {",
    "  lambda: " + arr(LAMS, 1) + ",",
    "  beta: [",
]
for k, row in enumerate(ridge_beta):
    lines.append("    " + arr(row, 3) + ("," if k < len(ridge_beta) - 1 else ""))
lines += [
    "  ],",
    "  l2ratio: " + arr(np.sqrt((ridge_beta**2).sum(1)) / l2_ols, 4) + ",",
    "};",
    "",
    "window.CH06_LASSOCV = {",
    "  lambda: " + arr(LAMS, 1) + ",",
    "  mse: " + arr(cv_mse, 1) + ",",
    "  lo: " + arr(cv_mse_lo, 1) + ",",
    "  hi: " + arr(cv_mse_hi, 1) + ",",
    f"  best: {best}, oneSe: {one_se}, seAtMin: {se_at_min:.1f},",
    "};",
    "",
    "window.CH06_HD = {",
    "  reps: " + str(HD_REPS) + ",",
    "  groups: {",
]
for k, pp in enumerate(HD_P):
    lines.append(f"    {pp}: " + pairs(pp) + ("," if k < len(HD_P) - 1 else ""))
lines += [
    "  },",
    "};",
    "",
    "/* The 100-city data behind Figures 6.14, 6.15 and 6.21.  Simulated here",
    f"   with seed {POPAD_SEED} — the book does not publish its cities.  The demos",
    "   rebuild sales as 0.9*z(pop) + w*z(ad) + 0.6*noise so one slider can move",
    "   the weight without redrawing anything.  z() uses the population sd of",
    "   these 100 rows, computed in the browser from the arrays below. */",
    "window.CH06_POPAD = {",
    "  pop: " + arr(pop, 1) + ",",
    "  ad: " + arr(ad, 1) + ",",
    "  noise: " + arr(sales_noise, 4) + ",",
    "};",
]

OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text("\n".join(lines) + "\n")
print(f"wrote {OUT} ({OUT.stat().st_size / 1024:.0f} KB)")
for c in checks:
    print("  ·", c)
