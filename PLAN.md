The reader is not very good at reading math notations. The goal is to describe the topics in ISLP to the reader in a easy to understand language. The math should be described to make the reader understand the concepts. 

- This project is going to be a site with a sidebar for navigation. Divided into chapters and sections. 
- Interactive plots are preferable for explaining the mathematical concepts.
- make user understand the concepts clearly

the book is in ISLP/pdf

Borrow style and code from /home/waesh/Learning/10days_islp/site/

---

## Status

**Chapter 1 is built and verified (5 Oct 2026).**
**Chapter 2 is built and verified (6 Oct 2026).** Chapters 3–13 are not started
and are only built when asked for, one chapter per request.

| Chapter | Pages | Status |
|---|---|---|
| 1 Introduction | `1-introduction.html` (single page — no numbered sections, no lab, no exercises) | **done** |
| 2 Statistical Learning | `2-1-what-is-statistical-learning.html`, `2-2-assessing-model-accuracy.html`, `2-3-lab-introduction-to-python.html`, `2-4-exercises.html` | **done** |
| 3 Linear Regression | 3.1 … 3.7 (3.6 lab, 3.7 exercises) | not started |
| 4 Classification | 4.1 … 4.8 (4.7 lab, 4.8 exercises) | not started |
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
serve.py, assets/         copied from 10days_islp/site/, then extended
assets/js/nav.js          manifest + sidebar / TOC / prev-next injection
assets/js/demos/          ds-tour.js, notation.js          (Chapter 1)
                          fn-noise.js, lin-knn.js, fn-flex.js, fn-bayes.js  (copied, Ch 2)
                          method-map.js, sup-unsup.js, bias-var.js, knn-boundary.js (new, Ch 2)
assets/img/ch02/          13 stills: lab-*, auto-* (lab) and college-*, boston-* (exercises)
assets/data/ch01-data.js  generated — do not edit by hand
tools/build_demo_data.py  rebuilds ch01-data.js from _data-src/
tools/lab02_capture.py    runs the lab blocks -> _text/ch02-lab-out.txt + assets/img/ch02/*
tools/ex02_capture.py     runs exercises 8-10 -> _text/ch02-ex-out.txt + exercise figures
_data-src/                raw book CSVs (Wage, Smarket, NCI60) + npy;
                          Auto.csv/.data, College.csv, Boston.csv (Chapter 2)
_text/ch01.txt            pdftotext extract, private reference only
_text/ch02.txt            ditto, Chapter 2
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

## Verification (done for Chapters 1 and 2)

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

## Next

Ask for a chapter by name (Chapter 3 is the natural next one — linear
regression, first real method, and the lab needs the ISLP `Auto`/`College`
workflows again). For a new chapter: extract its `_text/chNN.txt`, add its
`sections` to `assets/js/nav.js`, copy reusable demos from
`10days_islp/site/assets/js/demos/`, write its new demos, capture lab and
exercise outputs with a `tools/labNN_capture.py` / `exNN_capture.py`, and build
its pages.
