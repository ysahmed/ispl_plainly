The reader is not very good at reading math notations. The goal is to describe the topics in ISLP to the reader in a easy to understand language. The math should be described to make the reader understand the concepts. 

- This project is going to be a site with a sidebar for navigation. Divided into chapters and sections. 
- Interactive plots are preferable for explaining the mathematical concepts.
- make user understand the concepts clearly

the book is in ISLP/pdf

Borrow style and code from /home/waesh/Learning/10days_islp/site/

---

## Status

**Chapter 1 is built and verified (5 Oct 2026).**
**Chapter 2 is built and verified (6 Oct 2026).**
**Chapter 4 is built and verified (6 Oct 2026).**
**Chapter 3 is built and verified (6 Oct 2026).**
**Chapter 5 is built and verified (7 Oct 2026).** Chapters 6–13 are not started
and are only built when asked for, one chapter per request.

| Chapter | Pages | Status |
|---|---|---|
| 1 Introduction | `1-introduction.html` (single page — no numbered sections, no lab, no exercises) | **done** |
| 2 Statistical Learning | `2-1-what-is-statistical-learning.html`, `2-2-assessing-model-accuracy.html`, `2-3-lab-introduction-to-python.html`, `2-4-exercises.html` | **done** |
| 3 Linear Regression | `3-1-simple-linear-regression.html` … `3-5-linear-regression-vs-knn.html` (sections only; lab 3.6 and exercises 3.7 deferred) | **done** |
| 4 Classification | `4-1-an-overview-of-classification.html` … `4-6-generalized-linear-models.html` (4.7 lab, 4.8 exercises deferred) | **done** |
| 5 Resampling | `5-1-cross-validation.html`, `5-2-the-bootstrap.html` (sections only; lab 5.3 and exercises 5.4 deferred) | **done** |
| 6 Model Selection & Regularization | 6.1 … 6.6 (6.5 lab, 6.6 exercises) | not started |
| 7–13 | — | out of scope until asked |

## How the site is put together

- **One page per section** (the `x.y` level). Subsections `x.y.z` become `h3`
  anchors on the page. A chapter's Lab and Exercises are their own pages.
- **All navigation comes from one manifest**, `assets/js/nav.js`: it injects the
  sidebar, the "on this page" TOC and the prev/next footer. Adding a page = one
  line in `CHAPTERS` (chapter with `href` = single page; chapter with `sections`
  = group of pages; neither = inert `soon` badge). Nothing is hand-written twice.
  `nav.js` must be loaded **before** `common.js`.
- **Section page template**: `page-head` (eyebrow / h1 / lede) → `Reading` block
  with keybox and chips → numbered `h2` sections, each plain words → formula
  *read as a sentence* → `<figure class="demo">` → callouts (`ok` = the one thing
  to remember, `warn` = safe to skip) → exercises folded in `<details>` →
  footer. Inherited from `10days_islp/site/day-1.html`.
- **Lab pages** are narrated Python walkthroughs: reader already knows basic
  Python, so no numpy/pandas tutorial material.
- Flat HTML, no build step. Run `python3 serve.py` (or open the files directly —
  everything works over `file://` too).

## Files

```
index.html                home: how to read this site + chapter table
1-introduction.html       Chapter 1 (all 7 blocks of the chapter, in book order)
2-1-what-is-statistical-learning.html   Chapter 2, section 2.1 (4 demos)
2-2-assessing-model-accuracy.html       Chapter 2, section 2.2 (4 demos)
2-3-lab-introduction-to-python.html     Chapter 2, lab 2.3 (captured output, still figures)
2-4-exercises.html        Chapter 2, exercises (7 conceptual + 3 applied, answers folded)
3-1-simple-linear-regression.html   Chapter 3, §3.1 (3 demos)
3-2-multiple-linear-regression.html Chapter 3, §3.2 (3 demos)
3-3-other-considerations.html       Chapter 3, §3.3 (5 demos)
3-4-the-marketing-plan.html         Chapter 3, §3.4 (1 demo, 7 questions)
3-5-linear-regression-vs-knn.html   Chapter 3, §3.5 (1 demo)
4-1 … 4-6-*.html          Chapter 4, six section pages (9 demos)
5-1-cross-validation.html  Chapter 5, §5.1 (6 demos)
5-2-the-bootstrap.html     Chapter 5, §5.2 (3 demos)
serve.py, assets/         copied from 10days_islp/site/, then extended
assets/js/nav.js          manifest + sidebar / TOC / prev-next injection
assets/js/stats.js        shared OLS helper — Stats.solve/inverse/ols/tPvalue/
                          fPvalue/tCrit/mean, checked against scipy + statsmodels
assets/js/demos/          ds-tour.js, notation.js          (Chapter 1)
                          fn-noise.js, lin-knn.js, fn-flex.js, fn-bayes.js  (copied, Ch 2)
                          method-map.js, sup-unsup.js, bias-var.js, knn-boundary.js (new, Ch 2)
                          slr-fit, se-sample, rse-r2, rss-contour, coef-toggle,
                          lin-intervals, dummy-split, interact-lines, poly-resid,
                          resid-zoo, leverage, market-qa, lin-knn(§3.5)   (new, Ch 3)
                          sigmoid, logit-fit, lr-failure, boundary-lda, method-race,
                          roc-threshold, default-explore, pois-dist,
                          poisson-counts                                (new, Ch 4)
                          cv-split, cv-valid, cv-loocv, cv-kfold, cv-biasvar,
                          cv-class, boot-alpha, boot-n3, boot-reg        (new, Ch 5)
assets/img/ch02/          13 stills: lab-*, auto-* (lab) and college-*, boston-* (exercises)
assets/data/ch01-data.js  generated — do not edit by hand
assets/data/ch03-data.js  generated — CH03_ADV / CH03_CREDIT / CH03_AUTO / CH03_CARSEATS
assets/data/ch04-data.js  generated — Default / Poisson counts
assets/data/ch05-data.js  generated — CH05_PORTFOLIO (Auto reuses CH03_AUTO)
tools/build_demo_data.py  rebuilds ch01-data.js from _data-src/
tools/ch03_data.py        rebuilds ch03-data.js from _data-src/Advertising.csv + ISLP
tools/ch04_data.py        rebuilds ch04-data.js
tools/ch05_data.py        rebuilds ch05-data.js (Portfolio; header records the checks)
tools/lab02_capture.py    runs the lab blocks -> _text/ch02-lab-out.txt + assets/img/ch02/*
tools/ex02_capture.py     runs exercises 8-10 -> _text/ch02-ex-out.txt + exercise figures
_data-src/                raw book CSVs (Wage, Smarket, NCI60) + npy;
                          Auto.csv/.data, College.csv, Boston.csv (Chapter 2);
                          Advertising.csv (Chapter 3, from statlearning.com)
_text/ch01.txt            pdftotext extract, private reference only
_text/ch02.txt            ditto, Chapter 2
_text/ch03.txt            ditto, Chapter 3
_text/ch04.txt            ditto, Chapter 4
_text/ch05.txt            ditto, Chapter 5
```

**Data pipeline:** `python3 tools/build_demo_data.py` → `assets/data/ch01-data.js`,
a plain JS global (`window.ISLP_CH01`) so the demos need no fetch and run from
the filesystem. It computes the wage trend, the Smarket boxplot inputs, the NCI60
two-principal-component projection and its 4-cluster grouping ahead of time, so
the browser only has to draw. No pandas, no numpy, no ISLP install required.

## Chapter 1 notes

- The chapter has **three** datasets, not four: *Wage*, *Stock market (Smarket)*
  and *Gene expression (NCI60)*. Advertising/Marketing first appears in Chapter 2.
- Demos: `ds-tour.js` (one canvas, three views; Wage also switches x-axis
  age/year/education, NCI60 switches 4 found groups vs 14 true cancer types) and
  `notation.js` (DOM + KaTeX: n, p, x_ij, x_i, x_j, y_i highlighted on a real
  5-row table of Wage data).

## Chapter 2 notes

- Four pages: 2.1 (conceptual), 2.2 (model accuracy), 2.3 lab, 2.4 exercises.
- Demo set: four copied from `10days_islp/site` (`fn-noise` → 2.1 intro,
  `lin-knn` → parametric vs non-parametric, `fn-flex` → train/test U-shape,
  `fn-bayes` → Bayes classifier) and four written new (`method-map` → Fig 2.7,
  `sup-unsup` → supervised/unsupervised, `bias-var` → stacked
  σ²+bias²+variance with a truth selector reproducing Figs 2.9/2.10/2.11,
  `knn-boundary` → K slider + error-vs-flexibility, Fig 2.17).
- `bias-var.js` had an off-by-one ("degree 1" fitted a *constant*): fixed to
  fit degree `d` with `d + 1` coefficients, and its verdict now judges the
  setting against the best degree (bottom of the U) instead of raw component
  sizes — otherwise a straight truth at its own optimum was called
  "too twitchy". `fn-flex.js` was already correct.
- Lab/exercise outputs are **executed**, not transcribed: re-run
  `tools/lab02_capture.py` / `tools/ex02_capture.py` (`.venv`, ISLP 0.4.1) to
  regenerate `_text/ch02-*-out.txt` and the `assets/img/ch02/` figures.
- Book bug documented in exercise 8: the printed bins
  `pd.cut(..., [0, 0.5, 1])` are on the wrong scale (Top10perc is 0–100);
  correct bins `[0, 50, 100]` give No 699 / Yes 78, the printed ones give
  774 NaN / 3 Yes.
- Book writes `delim_whitespace=True`; lab page uses `sep=r'\s+'` (pandas 2.x
  deprecation), noted on the page.
- Mobile fixes added for all chapters: `.ro` readouts wrap, `.ctrl` button
  groups wrap, plain `table` becomes a horizontal scroll block — all inside
  the `max-width: 900px` media query in `assets/css/style.css`.

## Chapter 3 notes

- Five pages, sections only: 3.1 simple, 3.2 multiple, 3.3 other
  considerations (the long one — dummies, interactions, polynomials,
  residual diagnostics, outliers/leverage), 3.4 the marketing plan, 3.5 vs
  KNN. Lab 3.6 and exercises 3.7 are **deferred**, so Chapter 3 has no lab
  figures and no `.venv` dependency at runtime.
- Thirteen demos, one per page group: `slr-fit` (drag the slope, RSS
  bowl), `se-sample` (resample → many slopes, coverage count), `rse-r2`
  (one σ dial, RSE/R²/F disagree), `rss-contour` (Figure 3.2 heat map +
  coordinate descent), `coef-toggle` (switch predictors off, live table of
  SE/t/p), `lin-intervals` (CI vs PI bands), `dummy-split` (parallel lines
  + the 0/1 rows as the software sees them), `interact-lines` (Figure 3.7,
  one slope × student or two), `poly-resid` (degree dial, residual panel),
  `resid-zoo` (curve / fan / runs), `leverage` (outlier vs high-leverage
  point, MSE vs MAE), `market-qa` (the seven questions of §3.4, each with
  its own picture), `lin-knn` (fits + test-error-vs-K curve).
- **Data:** the Advertising CSV is not in the ISLP package — saved as
  `_data-src/Advertising.csv` from `statlearning.com`, and
  `tools/ch03_data.py` rebuilds `assets/data/ch03-data.js`
  (`CH03_ADV`, `CH03_CREDIT`, `CH03_AUTO`, `CH03_CARSEATS`, plus `.levels`).
  The generated data reproduces Tables 3.1/3.3/3.4/3.5/3.6 exactly.
- The ISLP `Credit` table has no `own`/`region`/`status`, so the dummy demo
  uses `Student`/`Gender` (2 levels) and `Carseats.ShelveLoc` (3 levels,
  baseline `Bad`); the interaction demo reproduces Figure 3.7 with
  `balance ~ income * student`.
- `assets/js/stats.js` is the shared OLS helper (solve, inverse, `ols`,
  `tPvalue`, `fPvalue`, `tCrit`, `mean`), checked once against
  scipy/statsmodels. Pages 3.1–3.4 load it; **3.5 loads neither the data nor
  stats.js** — the KNN demo is self-contained.
- **Money signs need `<span class="usd">$</span>`**: auto-render's `$…$`
  inline delimiter pairs two dollar amounts sitting in the same text node
  and renders the words between them as math. Every `$` in the page text is
  wrapped, and so are the `$` in JS-injected readouts that carry two or more
  (`dummy-split` intercepts, `interact-lines` note, `market-qa` Q4).
  (`innerText` also skips collapsed `<details>`, so the verification walks
  text nodes instead.)
- §3.4's confidence intervals are computed with `Stats.tCrit(df, 0.95)`
  (t₁₉₆ = 1.972), not 1.96 — with 1.96 the last digit disagrees with the
  book's (0.043, 0.049) / (0.172, 0.206) / (−0.013, 0.011).
- Table 3.10 in the book is the *coefficient* table for
  `mpg ~ horsepower + horsepower²`; the 0.688 vs 0.606 R² pair the demo
  quotes comes from the prose just above it. On this data degree 2 does all
  the work (R² 0.606 → 0.688); degrees 3–5 creep to 0.696 while adjusted R²
  moves 0.686 → 0.693, which is what the caption now says.
- `lin-knn.js` is shared with §2.1: the right-hand test-error panel only
  exists when `cv-lknn-k` is on the page, so 2.1 keeps its single-canvas
  version.

## Chapter 4 notes

- Six pages (4.1–4.6), nine demos (`sigmoid`, `logit-fit`, `lr-failure`,
  `boundary-lda`, `method-race`, `roc-threshold`, `default-explore`,
  `pois-dist`, `poisson-counts`), data via `tools/ch04_data.py`.
- Lab 4.7 and exercises 4.8 deferred, same as Chapter 3.

## Chapter 5 notes

- Two pages (5.1 cross-validation, 5.2 bootstrap), nine demos: `cv-split`,
  `cv-valid`, `cv-loocv`, `cv-kfold`, `cv-biasvar`, `cv-class` (§5.1) and
  `boot-alpha`, `boot-n3`, `boot-reg` (§5.2). Lab 5.3 and exercises 5.4 are
  **deferred**, same as Chapters 3 and 4, so Chapter 5 has no lab captures.
- **Data:** `tools/ch05_data.py` → `assets/data/ch05-data.js` holds only
  `CH05_PORTFOLIO`; the Auto data reuses `CH03_AUTO` from Chapter 3. The
  generated file's header records the executed checks: α̂ = 0.5758 and
  bootstrap SE = 0.0912 (numpy `default_rng(0)`, B = 1000).
- `plots.js` gained an additive `noXTicks` option; every new figure uses a
  `grid2` body, and readouts are written inside `draw()` so they cannot drift
  out of sync with the picture.
- **`boot-n3` (Figure 5.11, n = 3) computes its exact answer honestly:** the
  SE is obtained by enumerating all 27 ordered draws and renormalizing over
  the 24 defined ones, giving 0.2788 — browser and an independent Python
  calculation agree; 3 of 27 draws are undefined and are counted separately.
  The book's figure prints no α̂* values, so the negative α̂ on the Z data
  (−1.158, draws in [−1.44, −0.67]) is our own live computation and the
  figcaption says so.
- **§5.1.4 is where the book and the measurement disagree, and the page says
  so carefully.** The book's argument (LOOCV averages highly correlated
  outputs, therefore higher variance than k-fold) is stated *as the book's
  reasoning*. The simulation then measures what it can: the bias ordering
  confirms the book (half-split ≫ 5/10-fold > LOOCV ≈ 0), but the spread
  ordering does not — the half-split is the widest of the four while LOOCV
  and 10-fold come out within ~30% of each other and swap places between
  runs. The figcaption says the experiment settles the bias story, not that
  narrow spread ranking, and `bv-note`'s verdict is computed from the live
  bias/sd rather than asserted in advance.
- **`cv-valid`'s axis is fixed at 14–32** (the book draws 16–28) with any
  out-of-range point riding the top line on a dot and its value printed in
  the `val-off` readout. A high-degree fit on a bad split really does
  explode into the hundreds (≈ 760 on 1 of 10 splits), and letting one spike
  stretch the axis flattens the dip the figure exists to show; the
  figcaption documents this deviation.
- **`cv-class` uses training seed 43, not 41.** Seed 41's 200-point sample
  was a fluke — the Bayes error *on that sample* is 0.095, the 5th
  percentile of the n = 200 distribution — which dragged the whole CV curve
  below the Bayes floor and made CV miss the test error by 4 points. With
  seed 43 the demo behaves as the lesson claims: CV 15.0% tracks test 14.3%
  (Bayes floor 13.3%), CV's minimum at degree 2 sits next to the true
  minimum at degree 3, and training error alone dips under the floor.
- Numeric claims in the prose are the book's (test errors 0.201 / 0.197 /
  0.160 / 0.162, Bayes 0.133, CV minimum at degree 4 vs test minimum at
  degree 3, and "CV somewhat underestimates the test error"); everything the
  demos display is computed live, and the prose points at the readouts
  rather than repeating numbers that would go stale.

## Verification (done for Chapters 1–5)

Headless Chromium via the DevTools protocol:

- sidebar, TOC and prev/next injected on both pages; `soon` badges inert, no dead links
- every demo control exercised, hover badge reads out the point
- canvases repaint on theme switch (dark mode checked by pixel sampling)
- mobile 390px: drawer opens, scrim closes it, navigation closes it, TOC collapsed,
  controls wrap, horizontal overflow = 0
- `file://` load works, zero console errors

Chapter 2 additionally (harnesses `/tmp/cdp3.py`, `/tmp/cdp4.py`, `/tmp/audit.py`,
`/tmp/functest.py`):

- all demo control IDs in the pages match the IDs the demos query; 35 functional
  assertions on readouts (sliders, truth/rule buttons, hover) pass, console clean
- zero console errors on all four pages in light and dark, at desktop and 390px
- geometry audit at 390px: page-level horizontal scroll = 0 on every page
  (index, Ch 1, all four Ch 2 pages, folds opened), no content clipped inside
  figures, every table a scroll block
- lab page figures and exercise figures are the real captures; outputs match
  `_text/ch02-lab-out.txt` / `_text/ch02-ex-out.txt`

Chapter 3 (harness `/tmp/opencode/ch3_check.py`, stdlib WebSocket → CDP; runs
index, 2.1, 2.4, all five Chapter 3 pages and 4.1):

- **9/9 pages PASS**: required element IDs present, KaTeX count equals the
  `$$…$$` blocks in the source, every canvas painted (per-canvas pixel
  counts), no console errors or exceptions in load / control / hover / mobile
  phases.
- every control exercised — buttons clicked twice (toggles return to their
  start), ranges driven to min/mid/max, selects cycled — and at least one
  readout changes on each page (7 / 9 / 6 / 7 / 1 controls on 3.1–3.5).
- sidebar shows exactly five Chapter 3 links plus `aria-current`, TOC
  non-empty, and the pager chain runs 2.4 → 3.1 → 3.2 → 3.3 → 3.4 → 3.5 → 4.1.
- money `$` survival checked by walking text nodes (every `$1,000` etc. in
  the source is present as rendered text — `innerText` would miss the ones
  inside folded `<details>`).
- mobile 390px: horizontal overflow 0 on all nine pages, canvases still
  painted after the resize.
- dark mode: canvases repaint (screenshot mean brightness 211–248 → 31–61 on
  all five pages), controls still work, no errors.
- numbers spot-checked against the book: SLR (7.0325, 0.0475, RSS 2103,
  R² 0.612, t 15.36 / 17.67, CI [6.130, 7.935]); full model matches Table 3.4
  (2.9389 ± 0.3119, t 9.42 · 0.0458 ± 0.0014, t 32.81 · 0.1885 ± 0.0086,
  t 21.89 · −0.0010 ± 0.0059, t −0.18, p 0.860) with R² 0.897, adj 0.896,
  RSE 1.69, F 570.3 on (3, 196); §3.4's seven answers including its exact
  confidence intervals and R² 0.897 → 0.968 with t 20.7 for the interaction;
  polynomial R² 0.606 → 0.688 (book's pair); Credit fits (shared slope
  5.984 → 6.218 / 4.219 with the interaction, R² 0.277 → 0.280).
- figure screenshots reviewed, and a pixel colour histogram per figure
  confirms each one carries its expected elements (orange Yes/KNN, red fits
  and bands, blue bars, green verdict).

Chapter 5 (harnesses `/tmp/opencode/ch5_check.py` for structure and
`/tmp/opencode/ch5_numbers.py` for numbers; both run index, 4.6, 5.1 and 5.2):

- **4/4 pages PASS**: required element IDs present (9 demos × their canvases,
  buttons, sliders and readouts), KaTeX count equals the `$$…$$` blocks in
  the source, every canvas painted, zero console errors or exceptions in the
  load / control / hover / mobile / dark phases.
- every control exercised — buttons clicked twice, ranges driven to
  min/mid/max, truth/method toggles cycled — and at least one readout
  changes on each of the two new pages.
- sidebar shows exactly two Chapter 5 links plus `aria-current`, and the
  pager chain runs 4.6 → 5.1 → 5.2 → "—" (5.2 has no next, since the lab
  and exercises are deferred).
- mobile 390px: horizontal overflow 0 on both pages.
- dark mode: clicking the real theme toggle flips the body background
  `rgb(255, 255, 255)` → `rgb(15, 18, 25)`, every canvas's *composited*
  appearance goes light → dark (2/2 on 4.6, 11/11 on 5.1, 7/7 on 5.2; the
  index has no canvases), and the buffers themselves are re-rendered with
  the new palette (2/2, 11/11, 6/7) — so no white rectangle is left
  sitting on a dark page. Plots are transparent canvases, so this is
  measured against the background each canvas sits on rather than by
  assuming the drawing itself must get darker.
- **24/24 numeric assertions**, each against an independent Python
  calculation: validation MSE(2) ≪ MSE(1); the LOOCV formula equals 392
  real refits to < 1e-9 and sits above the training MSE; the split
  schematics count 19/20 and 16/5; validation spread > 10-fold spread;
  half-split spread widest with LOOCV and 10-fold within 30%; validation
  bias positive and > LOOCV bias; Bayes floor 11–16%; training < test; CV
  error within 3 points of test error and never below the Bayes floor; CV's
  minimum within 2 points of the true minimum; α̂ = 0.5758; population SE
  0.070–0.100 and bootstrap SE 0.070–0.105 (book: 0.083 / 0.0912); "3 of
  27" undefined draws; n = 3 exact SE in 0.20–0.40; analytic slope SE
  0.0055–0.0070 with the bootstrap SE within 15% of it; intercept SEs
  within 30%.
- figure screenshots reviewed for all nine demos (written by a small CDP
  helper, `/tmp/opencode/ch5_shots.py`, to `/tmp/opencode/fig_demo-*.png`),
  after fixing what they showed: a variable-name shadowing bug that blanked
  `cv-split`, an un-renormalized exact SE in `boot-n3`, `cv-split`'s canvas
  height in single-row mode, and the stale "amber" colour word in the
  k-fold caption.

## Next

Ask for a chapter by name. Chapters 1–5 are built; **Chapter 6 (Model
Selection & Regularization) is the natural next one**. For a new chapter:
extract its `_text/chNN.txt`, add its `sections` to `assets/js/nav.js`,
copy reusable demos from `10days_islp/site/assets/js/demos/`, write its new
demos, capture lab and exercise outputs with a `tools/labNN_capture.py` /
`exNN_capture.py`, and build its pages.
