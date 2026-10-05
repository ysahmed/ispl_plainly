The reader is not very good at reading math notations. The goal is to describe the topics in ISLP to the reader in a easy to understand language. The math should be described to make the reader understand the concepts. 

- This project is going to be a site with a sidebar for navigation. Divided into chapters and sections. 
- Interactive plots are preferable for explaining the mathematical concepts.
- make user understand the concepts clearly

the book is in ISLP/pdf

Borrow style and code from /home/waesh/Learning/10days_islp/site/

---

## Status

**Chapter 1 is built and verified (5 Oct 2026).** Chapters 2–13 are not started
and are only built when asked for, one chapter per request.

| Chapter | Pages | Status |
|---|---|---|
| 1 Introduction | `1-introduction.html` (single page — no numbered sections, no lab, no exercises) | **done** |
| 2 Statistical Learning | 2.1, 2.2, 2.3 lab, 2.4 exercises | not started |
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
serve.py, assets/         copied from 10days_islp/site/, then extended
assets/js/nav.js          manifest + sidebar / TOC / prev-next injection
assets/js/demos/          ds-tour.js, notation.js   (Chapter 1)
assets/data/ch01-data.js  generated — do not edit by hand
tools/build_demo_data.py  rebuilds ch01-data.js from _data-src/
_data-src/                raw book CSVs (Wage, Smarket, NCI60) + npy
_text/ch01.txt            pdftotext extract, private reference only
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

## Verification (done for Chapter 1)

Headless Chromium via the DevTools protocol:

- sidebar, TOC and prev/next injected on both pages; `soon` badges inert, no dead links
- every demo control exercised, hover badge reads out the point
- canvases repaint on theme switch (dark mode checked by pixel sampling)
- mobile 390px: drawer opens, scrim closes it, navigation closes it, TOC collapsed,
  controls wrap, horizontal overflow = 0
- `file://` load works, zero console errors

## Next

Ask for a chapter by name (Chapter 2 is the natural next one — it sets the
section-page template with 2.1 / 2.2 / lab / exercises). For that chapter:
extract `_text/ch02.txt`, add its `sections` to `assets/js/nav.js`, copy the
reusable demos it needs from `10days_islp/site/assets/js/demos/`, write its new
demos, and build its pages.
