#!/usr/bin/env python
"""Run ISLP Lab 2.3 (Introduction to Python) and capture its outputs.

Prints one labelled block per code snippet the website shows (redirect the
stdout into _text/ch02-lab-out.txt) and saves the lab's figures into
assets/img/ch02/.

    .venv/bin/python tools/lab02_capture.py > _text/ch02-lab-out.txt
"""
import ast
import contextlib
import io
import os
import sys
import warnings

warnings.filterwarnings("ignore")

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FIGDIR = os.path.join(ROOT, "assets", "img", "ch02")
DATA = os.path.join(ROOT, "_data-src")
os.makedirs(FIGDIR, exist_ok=True)

ns = {"np": np, "pd": pd, "plt": plt, "matplotlib": matplotlib,
      "__name__": "__main__"}


def blk(label, code):
    """Run one notebook-style cell: statements run, a trailing expression is
    displayed the way Jupyter would display it (unless it ends in a
    semicolon, which is how the book silences that display)."""
    print("=== %s ===" % label)
    tree = ast.parse(code)
    body = tree.body
    quiet = code.rstrip().endswith(";")
    out = io.StringIO()
    last = None
    try:
        with contextlib.redirect_stdout(out):
            if body and isinstance(body[-1], ast.Expr):
                head = ast.Module(body=body[:-1], type_ignores=[])
                exec(compile(head, "<lab>", "exec"), ns)
                last = eval(compile(ast.Expression(body[-1].value), "<lab>", "eval"), ns)
                if quiet:
                    last = None
            else:
                exec(compile(tree, "<lab>", "exec"), ns)
        text = out.getvalue()
        if text:
            sys.stdout.write(text if text.endswith("\n") else text + "\n")
        if last is not None:
            print(repr(last))
    except Exception as exc:                       # the NameError demo, etc.
        print("!! %s: %s" % (type(exc).__name__, exc))
    print()


def savefig(name, fig=None):
    f = fig if fig is not None else plt.gcf()
    path = os.path.join(FIGDIR, name)
    f.savefig(path, dpi=110, bbox_inches="tight", facecolor="white")
    plt.close(f)
    print("--- figure: assets/img/ch02/%s\n" % name)


# --------------------------------------------------------------------------
# 2.3.1 Getting started
# --------------------------------------------------------------------------
blk("versions", """
import sys
print('Python', sys.version.split()[0])
print('numpy', np.__version__, '| pandas', pd.__version__,
      '| matplotlib', matplotlib.__version__)
import ISLP
print('ISLP', getattr(ISLP, '__version__', '(bundled)'))
""")

# --------------------------------------------------------------------------
# 2.3.2 Basic commands
# --------------------------------------------------------------------------
blk("basic-print", "print('fit a model with ', 11, 'variables ')")
blk("basic-plus", "3 + 5")
blk("basic-str", '"hello" + " " + "world"')
blk("basic-list", """
x = [3, 4, 5]
x
""")
blk("basic-concat", """
y = [4, 9, 7]
x + y
""")

# --------------------------------------------------------------------------
# 2.3.3 Numerical python
# --------------------------------------------------------------------------
blk("np-import-array", """
import numpy as np
x = np.array([3, 4, 5])
y = np.array([4, 9, 7])
x + y
""")
blk("np-2d", """
x = np.array([[1, 2], [3, 4]])
x
""")
blk("np-attrs", """
x.ndim
""")
blk("np-dtype", """
x.dtype
""")
blk("np-dtype-float", """
np.array([[1, 2], [3.0, 4]]).dtype
""")
blk("np-shape", """
x.shape
""")
blk("np-sum", """
x = np.array([1, 2, 3, 4])
x.sum()
""")
blk("np-reshape", """
x = np.array([1, 2, 3, 4, 5, 6])
print('beginning x:\\n', x)
x_reshape = x.reshape((2, 3))
print('reshaped x:\\n', x_reshape)
""")
blk("np-index", """
x_reshape[0, 0], x_reshape[1, 2]
""")
blk("np-view", """
print('x before we modify x_reshape:\\n', x)
print('x_reshape before we modify x_reshape:\\n', x_reshape)
x_reshape[0, 0] = 5
print('x_reshape after we modify its top left element:\\n', x_reshape)
print('x after we modify top left element of x_reshape:\\n', x)
""")
blk("np-attrs2", """
x_reshape.shape, x_reshape.ndim, x_reshape.T
""")
blk("np-sqrt-square", """
np.sqrt(x)
""")
blk("np-square", "x ** 2")
blk("np-sqrt-alt", "x ** 0.5")
blk("np-random", """
x = np.random.normal(size=50)
x
""")
blk("np-corr", """
y = x + np.random.normal(loc=50, scale=1, size=50)
np.corrcoef(x, y)
""")
blk("np-reproducible", """
rng = np.random.default_rng(1303)
print(rng.normal(scale=5, size=2))
rng2 = np.random.default_rng(1303)
print(rng2.normal(scale=5, size=2))
""")
blk("np-mean-var", """
rng = np.random.default_rng(3)
y = rng.standard_normal(10)
np.mean(y), y.mean()
""")
blk("np-var", "np.var(y), y.var(), np.mean((y - y.mean()) ** 2)")
blk("np-std", "np.sqrt(np.var(y)), np.std(y)")
blk("np-matrix", """
X = rng.standard_normal((10, 3))
X
""")
blk("np-axis", """
X.mean(axis=0)
""")

# --------------------------------------------------------------------------
# 2.3.4 Graphics
# --------------------------------------------------------------------------
blk("plot-line", """
from matplotlib.pyplot import subplots
fig, ax = subplots(figsize=(8, 8))
x = rng.standard_normal(100)
y = rng.standard_normal(100)
ax.plot(x, y);
""")
blk("plot-scatter-labels", """
fig, ax = subplots(figsize=(8, 8))
ax.scatter(x, y, marker='o')
ax.set_xlabel("this is the x-axis")
ax.set_ylabel("this is the y-axis")
ax.set_title("Plot of X vs Y");
""")
savefig("lab-scatter.png")

blk("plot-grid", """
fig, axes = subplots(nrows=2, ncols=3, figsize=(15, 5))
axes[0, 1].plot(x, y, 'o')
axes[1, 2].scatter(x, y, marker='+')
fig
""")
savefig("lab-grid.png")

blk("plot-contour", """
fig, ax = subplots(figsize=(7, 5))
x = np.linspace(-np.pi, np.pi, 50)
y = x
f = np.multiply.outer(np.cos(y), 1 / (1 + x ** 2))
ax.contour(x, y, f, levels=45);
""")
savefig("lab-contour.png")

blk("plot-imshow", """
fig, ax = subplots(figsize=(7, 5))
ax.imshow(f);
""")
savefig("lab-heatmap.png")

# --------------------------------------------------------------------------
# 2.3.5 Sequences and slice notation
# --------------------------------------------------------------------------
blk("seq-linspace", """
seq1 = np.linspace(0, 10, 11)
seq1
""")
blk("seq-arange", """
seq2 = np.arange(0, 10)
seq2
""")
blk("seq-slice", '''
"hello world"[3:6]
''')
blk("seq-slice-explicit", '''
"hello world"[slice(3, 6)]
''')

# --------------------------------------------------------------------------
# 2.3.6 Indexing data
# --------------------------------------------------------------------------
blk("idx-build", """
A = np.array(np.arange(16)).reshape((4, 4))
A
""")
blk("idx-cell", "A[1, 2]")
blk("idx-rows", """
A[[1, 3]]
""")
blk("idx-cols", """
A[:, [0, 2]]
""")
blk("idx-pairs", """
A[[1, 3], [0, 2]]
""")
blk("idx-submatrix", """
A[[1, 3]][:, [0, 2]]
""")
blk("idx-ix", """
idx = np.ix_([1, 3], [0, 2, 3])
A[idx]
""")
blk("idx-slices", """
A[1:4:2, 0:3:2]
""")
blk("idx-bool", """
keep_rows = np.zeros(A.shape[0], bool)
keep_rows[[1, 3]] = True
keep_rows
""")
blk("idx-bool-select", """
A[keep_rows]
""")

# --------------------------------------------------------------------------
# 2.3.7 Loading data
# --------------------------------------------------------------------------
blk("load-csv", """
import pandas as pd
Auto = pd.read_csv('%s/Auto.csv')
Auto.shape
""" % DATA)
blk("load-head", """
Auto.head(3)
""")
blk("load-data-space", """
Auto = pd.read_csv('%s/Auto.data', delim_whitespace=True)
Auto.shape
""" % DATA)
blk("load-unique", """
np.unique(Auto['horsepower'])[-6:]
""")
blk("load-na", """
Auto = pd.read_csv('%s/Auto.data',
                   na_values=['?'],
                   delim_whitespace=True)
Auto['horsepower'].sum()
""" % DATA)
blk("load-shape", "Auto.shape")
blk("load-dropna", """
Auto_new = Auto.dropna()
Auto_new.shape
""")
blk("load-columns", """
Auto = Auto_new  # overwrite the previous value
Auto.columns
""")
blk("load-first3", """
Auto[:3]
""")
blk("load-bool-rows", """
idx_80 = Auto['year'] > 80
Auto[idx_80].head(3)
""")
blk("load-two-cols", """
Auto[['mpg', 'horsepower']].head(3)
""")
blk("load-index", """
Auto_re = Auto.set_index('name')
Auto_re.columns
""")
blk("load-loc", """
rows = ['amc rebel sst', 'ford torino']
Auto_re.loc[rows]
""")
blk("load-iloc", """
Auto_re.iloc[[3, 4], [0, 2, 3]]
""")
blk("load-lambda", """
Auto_re.loc[lambda df: (df['year'] > 80) & (df['mpg'] > 30),
            ['weight', 'origin']].head(4)
""")
blk("load-str-contains", """
Auto_re.loc[lambda df: (df['displacement'] < 300)
                 & (df.index.str.contains('ford ')
                    | df.index.str.contains('datsun ')),
            ['weight', 'origin']].head(4)
""")

# --------------------------------------------------------------------------
# 2.3.8 For loops
# --------------------------------------------------------------------------
blk("loop-basic", """
total = 0
for value in [3, 2, 19]:
    total += value
print('Total is: {0}'.format(total))
""")
blk("loop-nested", """
total = 0
for value in [2, 3, 19]:
    for weight in [3, 2, 1]:
        total += value * weight
print('Total is: {0}'.format(total))
""")
blk("loop-zip", """
total = 0
for value, weight in zip([2, 3, 19], [0.2, 0.3, 0.5]):
    total += weight * value
print('Weighted average is: {0}'.format(total))
""")
blk("loop-missing-build", """
rng = np.random.default_rng(1)
A = rng.standard_normal((127, 5))
M = rng.choice([0, np.nan], p=[0.8, 0.2], size=A.shape)
A += M
D = pd.DataFrame(A, columns=['food', 'bar', 'pickle', 'snack', 'popcorn'])
D.head(3)
""")
blk("loop-missing-report", """
for col in D.columns:
    template = 'Column "{0}" has {1:.2%} missing values '
    print(template.format(col, np.isnan(D[col]).mean()))
""")

# --------------------------------------------------------------------------
# 2.3.9 Additional graphical and numerical summaries
# --------------------------------------------------------------------------
blk("auto-nameerror", """
fig, ax = subplots(figsize=(8, 8))
ax.plot(horsepower, mpg, 'o')
""")

blk("auto-scatter", """
fig, ax = subplots(figsize=(8, 6))
ax.plot(Auto['horsepower'], Auto['mpg'], 'o');
""")
savefig("auto-scatter.png")

blk("auto-dtype", """
Auto.cylinders.dtype
""")
blk("auto-category", """
Auto.cylinders = pd.Series(Auto.cylinders, dtype='category')
Auto.cylinders.dtype
""")
blk("auto-boxplot", """
fig, ax = subplots(figsize=(8, 6))
Auto.boxplot('mpg', by='cylinders', ax=ax);
""")
savefig("auto-boxplot.png")

blk("auto-hist", """
fig, ax = subplots(figsize=(8, 6))
Auto.hist('mpg', color='red', bins=12, ax=ax);
""")
savefig("auto-hist.png")

blk("auto-matrix", """
fig, ax = subplots(figsize=(8, 8))
pd.plotting.scatter_matrix(Auto[['mpg', 'displacement', 'weight']],
                           ax=ax, figsize=(8, 8));
""")
savefig("auto-matrix.png")

blk("auto-describe", """
Auto[['mpg', 'weight']].describe()
""")
blk("auto-describe-one", """
Auto['cylinders'].describe()
""")
