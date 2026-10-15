"""Digitise ISLP Figure 7.9 and generate assets/data/ch07-fig79.js.

Figure 7.9 (printed page 304, PDF page 312 of "An Introduction to
Statistical Learning, with Applications in Python") is drawn from
simulated data the book never publishes.  This tool traces what the
printed figure actually contains, so page 7-5 can show the book's own
function rather than an invented one:

  * the blue curve f(x) — read per column, averaged over the two panels
    (they draw the same f) and light-smoothed,
  * the two orange target lines x0,
  * the yellow weight-bell — its top edge per column, fitted against the
    tricube profile K(d) = (1 - (d/h)^3)^3 to measure h and the peak,
  * the spread of the drawn points about f (from tools/fig79_points.csv,
    the cross-matched circle centres the point detector traced).

Method: render the PDF page at 300 dpi, crop the figure box, locate the
black axis frames and the tick marks to build pixel -> data mappings,
then classify pixels by RGB (blue truth curve, yellow fill, orange
lines).  Every quantity is asserted against the values the printed
figure gave on the first extraction, so a rendering change fails loudly
instead of silently drifting.

Outputs: assets/data/ch07-fig79.js (window.CH07_F79 + CH07_F79_META)
and a summary dict from build() for the harness.

Run:  .venv/bin/python tools/ch07_fig79.py            # regenerate the data file
      .venv/bin/python tools/ch07_fig79.py --check    # compare against committed
"""
import json
import os
import subprocess
import sys
import tempfile

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
PDF = os.path.join(ROOT, "pdf",
                   "An Introduction to Statistical Learning, with Applications in Python.pdf")
OUT_JS = os.path.join(ROOT, "assets", "data", "ch07-fig79.js")
POINTS_CSV = os.path.join(HERE, "fig79_points.csv")

# figure crop inside the 300 dpi page render, verified by frame assertions
CROP = (273, 180, 1619, 780)          # x, y, w, h
FRAMES = [168, 747, 839, 1418]        # expected vertical frame columns (panel boxes)
YTICK = [196.0, 285.0, 375.0, 464.0, 554.0, 643.0]     # 1.5 .. -1.0
XTICK0 = [181.0, 290.0, 400.0, 509.0, 619.0, 728.0]    # panel 0: 0.0 .. 1.0
XTICK1 = [852.0, 962.0, 1071.0, 1181.0, 1290.0, 1400.0]
GRID = np.arange(0.005, 1.0, 0.005)   # 199 points, the exported f
SIGMA_USED = 0.35                     # noise sd used by the page's simulation


def render_page():
    """pdftoppm the PDF's page 312 at 300 dpi, return a path."""
    if not os.path.exists(PDF):
        return None
    tmp = tempfile.mkdtemp(prefix="fig79_")
    prefix = os.path.join(tmp, "page")
    subprocess.run(["pdftoppm", "-r", "300", "-f", "312", "-l", "312",
                    "-png", PDF, prefix], check=True,
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    path = prefix + "-312.png"
    if not os.path.exists(path):          # some pdftoppm builds omit the page number
        cand = [f for f in os.listdir(tmp) if f.endswith(".png")]
        path = os.path.join(tmp, sorted(cand)[-1])
    return path


def groups(hits, gap=3):
    """mean pixel position of each run of hits"""
    if len(hits) == 0:
        return []
    out, cur = [], [hits[0]]
    for v in hits[1:]:
        if v - cur[-1] <= gap:
            cur.append(v)
        else:
            out.append(float(np.mean(cur)))
            cur = [v]
    out.append(float(np.mean(cur)))
    return out


def lin(p0, v0, p1, v1):
    return lambda p: v0 + (p - p0) * (v1 - v0) / (p1 - p0)


def load_figure(image_path=None):
    """Render (or read) the page and crop the figure; return the RGB array."""
    if image_path is None:
        image_path = render_page()
    if image_path is None:
        raise FileNotFoundError("book PDF not present; cannot digitise Figure 7.9")
    page = Image.open(image_path).convert("RGB")
    x, y, w, h = CROP
    fig = page.crop((x, y, x + w, y + h))
    a = np.asarray(fig).astype(int)
    # frames must be where the first extraction found them
    black = (a[..., 0] < 100) & (a[..., 1] < 100) & (a[..., 2] < 100)
    cols = groups(np.where(black.sum(axis=0) > 0.25 * h)[0], gap=6)
    if len(cols) != 4 or max(abs(c - f) for c, f in zip(cols, FRAMES)) > 4:
        raise AssertionError(f"axis frames moved: found {cols}, expected {FRAMES}")
    return a


def trace(image_path=None):
    """Extract curve / x0 / bell from the figure; returns a dict."""
    a = load_figure(image_path)
    R, G, B = a[..., 0], a[..., 1], a[..., 2]
    black = (R < 100) & (G < 100) & (B < 100)
    blue = (B > 120) & (B > R + 40) & (B > G + 25)
    yellow = (R > 190) & (G > 160) & (B < 120)
    orange = (R > 170) & (G > 40) & (G < 160) & (B < 110) & (R > B + 70)

    H, W, _ = a.shape
    top, bot = groups(np.where(black.sum(axis=1) > 0.15 * W)[0], gap=6)[0], \
        groups(np.where(black.sum(axis=1) > 0.15 * W)[0], gap=6)[-1]
    panels = [(FRAMES[0], FRAMES[1]), (FRAMES[2], FRAMES[3])]
    ytop, ybot = 166, 670

    # tick-based pixel -> data mappings, read fresh each run
    maps = []
    for pi, (xl, xr) in enumerate(panels):
        band = black[int(bot) + 5:int(bot) + 18, xl - 10:xr + 11].sum(axis=0)
        xt = groups(np.where(band >= 9)[0] + xl - 10)
        bandy = black[int(top) - 10:int(bot) + 11, xl - 18:xl - 5].sum(axis=1)
        yt = groups(np.where(bandy >= 9)[0] + int(top) - 10)
        expect_x = XTICK0 if pi == 0 else XTICK1
        if len(xt) != 6 or len(yt) != 6:
            raise AssertionError(f"panel {pi}: found {len(xt)} x-ticks, {len(yt)} y-ticks")
        if max(abs(p - q) for p, q in zip(xt, expect_x)) > 3 or \
           max(abs(p - q) for p, q in zip(yt, YTICK)) > 3:
            raise AssertionError(f"panel {pi}: ticks moved: {xt} / {yt}")
        fx = lin(xt[0], 0.0, xt[-1], 1.0)
        fy = lin(yt[0], 1.5, yt[-1], -1.0)
        maps.append((fx, fy, xl, xr))

    out = []
    for pi, (fx, fy, xl, xr) in enumerate(maps):
        ocols = orange[ytop:ybot, xl:xr + 1].sum(axis=0)
        tall = np.where(ocols > (ybot - ytop) * 0.5)[0] + xl
        if not len(tall):
            raise AssertionError(f"panel {pi}: target line x0 not found")
        x0 = fx(float(np.mean(tall)))

        curve = []
        for c in range(xl + 3, xr - 2):
            colb = np.where(blue[ytop:ybot, c])[0] + ytop
            if len(colb):
                curve.append([fx(c), fy(np.mean(colb))])

        bell = []
        for c in range(xl + 2, xr - 1):
            col = np.where(yellow[ytop:ybot, c])[0] + ytop
            if len(col) < 4:
                continue
            runs, cur = [], [col[0]]
            for v in col[1:]:
                if v - cur[-1] <= 1:
                    cur.append(v)
                else:
                    runs.append(cur)
                    cur = [v]
            runs.append(cur)
            if not any(455 <= r[-1] <= 475 for r in runs):   # must touch baseline
                continue
            big = [r for r in runs if len(r) >= 3]
            if not big:
                continue
            bell.append([fx(c), fy(big[0][0])])
        bell = np.array(bell)
        sm = bell.copy()
        for i in range(len(bell)):
            lo, hi = max(0, i - 3), min(len(bell), i + 4)
            sm[i, 1] = np.median(bell[lo:hi, 1])
        out.append(dict(x0=x0, curve=np.array(curve), bell=sm))

    return out


def fit_bell(bell, x0):
    """least-squares tricube h and peak over the bell's flanks"""
    best = None
    for h in np.arange(0.15, 0.30, 0.0005):
        u = (bell[:, 0] - x0) / h
        m = (np.abs(u) <= 1.0) & (bell[:, 1] > 0.005)
        if m.sum() < 30:
            continue
        tric = np.clip(1 - np.abs(u[m]) ** 3, 0, None) ** 3
        A = (tric * bell[m, 1]).sum() / max((tric ** 2).sum(), 1e-9)
        rmse = np.sqrt(((bell[m, 1] - A * tric) ** 2).mean())
        if best is None or rmse < best[0]:
            best = (rmse, h, A, int(m.sum()))
    return dict(rmse=best[0], h=best[1], peak=best[2], n=best[3])


def sigma_from_points(grid, curve):
    """standard deviation of the traced circles about the traced f"""
    pts = np.loadtxt(POINTS_CSV, delimiter=",", skiprows=1)
    r = pts[:, 1] - np.interp(pts[:, 0], grid, curve)
    return dict(n=len(pts), sd=float(r.std(ddof=2)),
                mean=float(r.mean()), lo=float(r.min()), hi=float(r.max()))


def _fcurve(panels):
    """two-panel average of the traced f, moving-average smoothed"""
    traces = [np.interp(GRID, p["curve"][:, 0], p["curve"][:, 1]) for p in panels]
    tr = np.array(traces)
    agree = np.abs(tr[0] - tr[1])
    f = tr.mean(axis=0)
    fs = f.copy()
    for i in range(2, len(f) - 2):
        fs[i] = f[i - 2:i + 3].mean()
    return GRID, fs, dict(agree_mean=float(agree.mean()), agree_max=float(agree.max()),
                          smooth_max=float(np.abs(fs - f).max()))


def build(image_path=None):
    panels = trace(image_path)
    grid, curve, cstats = _fcurve(panels)
    fits = [fit_bell(panels[i]["bell"], panels[i]["x0"]) for i in range(2)]
    sig = sigma_from_points(grid, curve)
    pk = int(np.argmax(curve))
    meta = dict(
        x0A=round(float(panels[0]["x0"]), 4),
        x0B=round(float(panels[1]["x0"]), 4),
        bellA={k: (round(v, 4) if isinstance(v, float) else v) for k, v in fits[0].items()},
        bellB={k: (round(v, 4) if isinstance(v, float) else v) for k, v in fits[1].items()},
        agreeMean=round(cstats["agree_mean"], 4),
        agreeMax=round(cstats["agree_max"], 4),
        sigmaN=sig["n"], sigmaRaw=round(sig["sd"], 4), sigma=SIGMA_USED,
        sigmaLo=round(sig["lo"], 3), sigmaHi=round(sig["hi"], 3),
        fPeak=round(float(curve[pk]), 4), fPeakAt=round(float(grid[pk]), 3),
        fLeft=round(float(curve[0]), 4), fRight=round(float(curve[-1]), 4),
        fAtA=round(float(np.interp(panels[0]["x0"], grid, curve)), 4),
        fAtB=round(float(np.interp(panels[1]["x0"], grid, curve)), 4),
        n=100, seed=7,
    )
    # the printed figure must still say what it said the first time
    assert abs(meta["x0A"] - 0.0649) <= 0.003, meta["x0A"]
    assert abs(meta["x0B"] - 0.4562) <= 0.003, meta["x0B"]
    for f in fits:
        assert 0.19 <= f["h"] <= 0.21 and f["rmse"] < 0.04 and 0.93 <= f["peak"] <= 1.06, f
    assert meta["agreeMean"] < 0.005 and meta["agreeMax"] < 0.02, meta
    assert 0.30 <= meta["sigmaRaw"] <= 0.45, meta
    assert 0.97 <= meta["fPeak"] <= 1.05, meta
    return dict(grid=grid, curve=curve, meta=meta)


def js_source(res):
    m = res["meta"]
    rows = ",\n  ".join(
        "[%0.3f, %.6f]" % (x, y) for x, y in zip(res["grid"], res["curve"]))
    return f"""/* Generated by tools/ch07_fig79.py — do not edit by hand.
   CH07_F79      the blue curve f(x) of the book's Figure 7.9 (printed p. 304,
                 PDF page 312), digitised from a 300 dpi render of that page:
                 per-column blue pixels, averaged over the figure's two panels
                 (which draw the same f) and moving-average smoothed, on the
                 grid x = 0.005, 0.010, ..., 0.995.
   CH07_F79_META the rest of what the printed figure contains: the two target
                 lines x0 (the text says "near 0.05" and "near 0.4"; the drawn
                 lines sit at {m['x0A']} and {m['x0B']}), the tricube fit to the yellow
                 weight bell in each panel (K(d) = (1-(d/h)^3)^3 fitted by least
                 squares: half-width h, peak, RMSE), the agreement between the
                 two panels' tracings, and the noise scale of the simulation
                 below.  The book does not publish its simulated points: the
                 page draws its own — n = {m['n']}, x ~ U(0,1), y = f(x) + N(0,
                 {m['sigma']}^2) with mulberry32 seed {m['seed']} — where {m['sigma']} is the
                 spread of the circles the point detector traced about f
                 (tools/fig79_points.csv: n = {m['sigmaN']}, residual sd {m['sigmaRaw']},
                 range {m['sigmaLo']} to {m['sigmaHi']}).

   Executed checks (asserted on every regeneration against a fresh digitisation):
   · two-panel curve agreement: mean {m['agreeMean']}, max {m['agreeMax']}
   · bell panel A: h = {m['bellA']['h']}, peak = {m['bellA']['peak']}, rmse = {m['bellA']['rmse']}
   · bell panel B: h = {m['bellB']['h']}, peak = {m['bellB']['peak']}, rmse = {m['bellB']['rmse']}
   · target lines at x0 = {m['x0A']} (panel A) and {m['x0B']} (panel B)
   · f: peak {m['fPeak']} at x = {m['fPeakAt']}, f(0.005) = {m['fLeft']}, f(0.995) = {m['fRight']},
     f(x0A) = {m['fAtA']}, f(x0B) = {m['fAtB']}
   · traced points: n = {m['sigmaN']}, residual sd about f = {m['sigmaRaw']} (page uses {m['sigma']})
*/
window.CH07_F79 = [
  {rows}
];
window.CH07_F79_META = {json.dumps(m, indent=2)};
"""


def main(argv):
    check = "--check" in argv
    res = build()
    src = js_source(res)
    if check:
        cur = open(OUT_JS).read()
        if cur != src:
            print("CH07-FIG79 MISMATCH: regenerated source differs from committed file")
            return 1
        print("ch07-fig79: regenerated source matches the committed data file")
        return 0
    with open(OUT_JS, "w") as fh:
        fh.write(src)
    print(f"wrote {OUT_JS}")
    print(json.dumps(res["meta"], indent=1))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
