#!/usr/bin/env python3
"""Build the dataset bundle used by Chapter 1's interactive demo.

Reads the raw ISLP package data files in _data-src/ (Wage, Smarket, NCI60)
and writes assets/data/ch01-data.js — a plain <script> file defining
window.ISLP_CH01, so the demo works even when the site is opened from
the filesystem (no fetch(), no server needed).

Usage:
    python3 tools/build_demo_data.py

Everything here is computed once, ahead of time (smoothed trends, the PCA
projection of NCI60), so the browser only has to draw.
"""

import ast
import csv
import json
import math
import os
import struct

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "_data-src")
OUT = os.path.join(ROOT, "assets", "data", "ch01-data.js")


def rnd(x, places):
    return round(float(x), places)


# --------------------------------------------------------------------------
# Wage: 3,000 men, 11 variables. Figure 1.1 plots wage against age, year and
# education level.
# --------------------------------------------------------------------------
def build_wage():
    ages, wages, years, edus = [], [], [], []
    edu_labels = {}

    with open(os.path.join(SRC, "Wage.csv"), newline="") as f:
        for row in csv.DictReader(f):
            ages.append(int(float(row["age"])))
            wages.append(rnd(row["wage"], 1))
            years.append(int(float(row["year"])))
            # education is written "3. Some College"
            raw = row["education"]
            num, _, label = raw.partition(".")
            num = int(num)
            edus.append(num)
            edu_labels.setdefault(num, label.strip())

    # smoothed trend through wage vs age: mean wage within each integer age,
    # then a weighted running mean over +/-3 years so the curve reads smooth
    by_age = {}
    for a, w in zip(ages, wages):
        by_age.setdefault(a, []).append(w)
    means = {a: sum(v) / len(v) for a, v in by_age.items()}
    trend_age = []
    for a in range(min(means), max(means) + 1):
        num = den = 0.0
        for k in range(a - 3, a + 4):
            if k in means:
                w = 4 - abs(k - a)          # triangular weights
                num += w * means[k]
                den += w
        if den:
            trend_age.append([a, rnd(num / den, 1)])

    # mean wage within each calendar year (2003-2009)
    by_year = {}
    for y, w in zip(years, wages):
        by_year.setdefault(y, []).append(w)
    trend_year = [[y, rnd(sum(by_year[y]) / len(by_year[y]), 1)] for y in sorted(by_year)]

    return {
        "n": len(ages),
        "age": ages,
        "wage": wages,
        "year": years,
        "edu": edus,
        "eduLabels": [edu_labels[k] for k in sorted(edu_labels)],
        "trendAge": trend_age,
        "trendYear": trend_year,
        "wageMax": max(wages),
    }


# --------------------------------------------------------------------------
# Smarket: 1,250 days of S&P 500 returns. Figure 1.2 is boxplots of the
# previous day's return, split by whether the market went Up or Down.
# --------------------------------------------------------------------------
def build_smarket():
    lag1, lag2, lag3, direction = [], [], [], []
    with open(os.path.join(SRC, "Smarket.csv"), newline="") as f:
        for row in csv.DictReader(f):
            lag1.append(rnd(row["Lag1"], 3))
            lag2.append(rnd(row["Lag2"], 3))
            lag3.append(rnd(row["Lag3"], 3))
            direction.append(1 if row["Direction"] == "Up" else 0)
    return {
        "n": len(direction),
        "lag": [lag1, lag2, lag3],
        "dir": direction,
        "up": sum(direction),
        "down": len(direction) - sum(direction),
    }


# --------------------------------------------------------------------------
# NCI60: 64 cancer cell lines x 6,830 genes. Figure 1.4 squeezes each cell
# line down to its first two principal components, Z1 and Z2.
# --------------------------------------------------------------------------
def read_npy_f64(path):
    with open(path, "rb") as f:
        magic = f.read(6)
        assert magic == b"\x93NUMPY", "not a .npy file"
        ver = struct.unpack("<2B", f.read(2))
        hlen = struct.unpack("<H", f.read(2))[0] if ver == (1, 0) else struct.unpack("<I", f.read(4))[0]
        header = ast.literal_eval(f.read(hlen).decode("latin1"))
        assert header["descr"] == "<f8" and not header["fortran_order"]
        raw = f.read()
    rows, cols = header["shape"]
    vals = struct.unpack("<%dd" % (rows * cols), raw)
    return [list(vals[i * cols:(i + 1) * cols]) for i in range(rows)]


def top_eigen(matrix, k):
    """Top k eigenpairs of a small symmetric matrix: power iteration + deflation."""
    n = len(matrix)
    work = [row[:] for row in matrix]
    trace = sum(work[i][i] for i in range(n))
    found = []
    # start from a pseudo-random vector: the all-equal vector is an exact null
    # vector of a centred Gram matrix, so power iteration would never move.
    seed = 12345
    def _start():
        nonlocal seed
        out = []
        for _ in range(n):
            seed = (1103515245 * seed + 12345) % 2147483648
            out.append(seed / 2147483648.0 - 0.5)
        return out
    for _ in range(k):
        v = _start()
        norm = sum(t * t for t in v) ** 0.5
        v = [t / norm for t in v]
        lam = 0.0
        for _ in range(800):
            w = [sum(work[i][j] * v[j] for j in range(n)) for i in range(n)]
            norm = sum(x * x for x in w) ** 0.5
            if norm < 1e-12:
                break
            w = [x / norm for x in w]
            if sum((w[i] - v[i]) ** 2 for i in range(n)) ** 0.5 < 1e-11:
                v = w
                break
            v = w
        lam = sum(v[i] * sum(work[i][j] * v[j] for j in range(n)) for i in range(n))
        # deterministic sign: largest component is positive
        pivot = max(range(n), key=lambda i: abs(v[i]))
        if v[pivot] < 0:
            v = [-x for x in v]
        found.append((v, lam))
        for i in range(n):                       # deflate
            for j in range(n):
                work[i][j] -= lam * v[i] * v[j]
    return found, trace


def kmeans(points, k, seed=7):
    """Small deterministic k-means: fixed-seed init, empty clusters re-seeded."""
    rnd = seed

    def nxt():
        nonlocal rnd
        rnd = (1103515245 * rnd + 12345) % 2147483648
        return rnd / 2147483648.0

    centers = [list(points[i]) for i in range(k)]
    assign = [0] * len(points)
    for _ in range(40):
        changed = False
        for i, p in enumerate(points):
            best, bd = 0, float("inf")
            for c, ctr in enumerate(centers):
                d = (p[0] - ctr[0]) ** 2 + (p[1] - ctr[1]) ** 2
                if d < bd:
                    bd, best = d, c
            if assign[i] != best:
                assign[i] = best
                changed = True
        for c in range(k):
            members = [points[i] for i in range(len(points)) if assign[i] == c]
            if members:
                centers[c] = [sum(m[0] for m in members) / len(members),
                              sum(m[1] for m in members) / len(members)]
            else:                                   # re-seed an empty cluster
                centers[c] = list(points[int(nxt() * len(points)) % len(points)])
        if not changed:
            break
    return assign


def build_nci60():
    x = read_npy_f64(os.path.join(SRC, "NCI60data.npy"))
    samples, genes = len(x), len(x[0])

    # centre every gene (column) before measuring distances
    means = [sum(x[i][j] for i in range(samples)) / samples for j in range(genes)]
    for i in range(samples):
        row = x[i]
        for j in range(genes):
            row[j] -= means[j]

    # 64x64 gram matrix — the samples are what we want to place on a plot
    gram = [[sum(x[i][k] * x[j][k] for k in range(genes)) for j in range(samples)]
            for i in range(samples)]

    comps, trace = top_eigen(gram, 2)
    # PC scores are the eigenvector scaled by sqrt(eigenvalue) — that is what
    # R's prcomp and sklearn's PCA return, and what the book's axes show
    s1 = math.sqrt(max(comps[0][1], 0.0))
    s2 = math.sqrt(max(comps[1][1], 0.0))
    z1 = [rnd(s1 * comps[0][0][i], 1) for i in range(samples)]
    z2 = [rnd(s2 * comps[1][0][i], 1) for i in range(samples)]

    labels = []
    with open(os.path.join(SRC, "NCI60labs.csv"), newline="") as f:
        for row in csv.DictReader(f):
            labels.append(row["label"].strip('"'))

    pts = list(zip(z1, z2))
    return {
        "n": samples,
        "genes": genes,
        "z1": z1,
        "z2": z2,
        "cluster4": kmeans(pts, 4),
        "labels": labels,
        "types": sorted(set(labels)),
        "pc1": rnd(comps[0][1] / trace * 100, 1),
        "pc2": rnd(comps[1][1] / trace * 100, 1),
    }


def main():
    data = {
        "wage": build_wage(),
        "smarket": build_smarket(),
        "nci60": build_nci60(),
    }
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    payload = json.dumps(data, separators=(",", ":"))
    with open(OUT, "w") as f:
        f.write("/* Generated by tools/build_demo_data.py — do not edit by hand. */\n")
        f.write("window.ISLP_CH01 = " + payload + ";\n")
    kb = os.path.getsize(OUT) / 1024
    print("wrote %s (%.0f KB)" % (os.path.relpath(OUT, ROOT), kb))
    print("  wage    %d rows" % data["wage"]["n"])
    print("  smarket %d rows (%d up / %d down)" % (
        data["smarket"]["n"], data["smarket"]["up"], data["smarket"]["down"]))
    print("  nci60   %d samples, %d genes, PC1 %.1f%% / PC2 %.1f%%" % (
        data["nci60"]["n"], data["nci60"]["genes"], data["nci60"]["pc1"], data["nci60"]["pc2"]))


if __name__ == "__main__":
    main()
