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
**Chapter 3 is built and verified (6 Oct 2026).** Chapters 5–13 are not started
and are only built when asked for, one chapter per request.

| Chapter | Pages | Status |
|---|---|---|
| 1 Introduction | `1-introduction.html` (single page — no numbered sections, no lab, no exercises) | **done** |
| 2 Statistical Learning | `2-1-what-is-statistical-learning.html`, `2-2-assessing-model-accuracy.html`, `2-3-lab-introduction-to-python.html`, `2-4-exercises.html` | **done** |
| 3 Linear Regression | `3-1-simple-linear-regression.html` … `3-5-linear-regression-vs-knn.html` (sections only; lab 3.6 and exercises 3.7 deferred) | **done** |
| 4 Classification | `4-1-an-overview-of-classification.html` … `4-6-generalized-linear-models.html` (4.7 lab, 4.8 exercises deferred) | **done** |
| 5 Resampling | 5.1, 5.2, 5.3 lab, 5.4 exercises | not started |
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
assets/img/ch02/          13 stills: lab-*, auto-* (lab) and college-*, boston-* (exercises)
assets/data/ch01-data.js  generated — do not edit by hand
assets/data/ch03-data.js  generated — CH03_ADV / CH03_CREDIT / CH03_AUTO / CH03_CARSEATS
assets/data/ch04-data.js  generated — Default / Poisson counts
tools/build_demo_data.py  rebuilds ch01-data.js from _data-src/
tools/ch03_data.py        rebuilds ch03-data.js from _data-src/Advertising.csv + ISLP
tools/ch04_data.py        rebuilds ch04-data.js
tools/lab02_capture.py    runs the lab blocks -> _text/ch02-lab-out.txt + assets/img/ch02/*
tools/ex02_capture.py     runs exercises 8-10 -> _text/ch02-ex-out.txt + exercise figures
_data-src/                raw book CSVs (Wage, Smarket, NCI60) + npy;
                          Auto.csv/.data, College.csv, Boston.csv (Chapter 2);
                          Advertising.csv (Chapter 3, from statlearning.com)
_text/ch01.txt            pdftotext extract, private reference only
_text/ch02.txt            ditto, Chapter 2
_text/ch03.txt            ditto, Chapter 3
_text/ch04.txt            ditto, Chapter 4
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

## Verification (done for Chapters 1–4)

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

## Next

Ask for a chapter by name. Chapters 1–4 are built; **Chapter 5 (Resampling)
is the natural next one** — cross-validation and the bootstrap need no new
data pipeline, and `stats.js` already has everything it takes for the
estimate-at-each-split demos. For a new chapter: extract its `_text/chNN.txt`,
add its `sections` to `assets/js/nav.js`, copy reusable demos from
`10days_islp/site/assets/js/demos/`, write its new demos, capture lab and
exercise outputs with a `tools/labNN_capture.py` / `exNN_capture.py`, and
build its pages.
