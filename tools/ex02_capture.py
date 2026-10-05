#!/usr/bin/env python
"""Solutions for ISLP Chapter 2 applied exercises (8, 9, 10).

Prints every numeric answer the website quotes, and saves the figures it
shows next to them.

    .venv/bin/python tools/ex02_capture.py > _text/ch02-ex-out.txt
"""
import contextlib
import io
import os
import sys
import warnings

warnings.filterwarnings("ignore")

import matplotlib
matplotlib.use("Agg")
from matplotlib.pyplot import subplots
import numpy as np
import pandas as pd

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FIGDIR = os.path.join(ROOT, "assets", "img", "ch02")
DATA = os.path.join(ROOT, "_data-src")
os.makedirs(FIGDIR, exist_ok=True)

ns = {"np": np, "pd": pd, "subplots": subplots, "__name__": "__main__"}


def blk(label, code):
    print("=== %s ===" % label)
    tree = compile(code, "<ex>", "exec")
    out = io.StringIO()
    try:
        with contextlib.redirect_stdout(out):
            exec(tree, ns)
        text = out.getvalue()
        if text:
            sys.stdout.write(text if text.endswith("\n") else text + "\n")
    except Exception as exc:
        print("!! %s: %s" % (type(exc).__name__, exc))
    print()


def savefig(name):
    plt = sys.modules["matplotlib.pyplot"]
    plt.gcf().savefig(os.path.join(FIGDIR, name), dpi=110,
                      bbox_inches="tight", facecolor="white")
    plt.close("all")
    print("--- figure: assets/img/ch02/%s\n" % name)


# --------------------------------------------------------------- exercise 8
blk("q8-load", """
college = pd.read_csv('%s/College.csv')
print('shape:', college.shape)
print(college.columns.tolist()[:4], '...')
""" % DATA)

blk("q8-index", """
college2 = pd.read_csv('%s/College.csv', index_col=0)
college3 = college.rename({'Unnamed: 0': 'College'}, axis=1)
college3 = college3.set_index('College')
college = college3
print(college2.head(3).iloc[:, :5])
print()
print('same rows, same names, now as the index:',
      list(college.index[:2]))
""" % DATA)

blk("q8-describe", """
print(college.describe().round(2).T.to_string())
""")

blk("q8-scatter-matrix", """
fig, ax = subplots(figsize=(7, 7))
pd.plotting.scatter_matrix(college[['Top10perc', 'Apps', 'Enroll']],
                           ax=ax, figsize=(7, 7));
""")
savefig("college-matrix.png")

blk("q8-box-private", """
fig, ax = subplots(figsize=(6, 4))
college.boxplot('Outstate', by='Private', ax=ax);
""")
blk("q8-elite-counts", """
college['Elite'] = pd.cut(college['Top10perc'], [0, 50, 100],
                          labels=['No', 'Yes'])
print(college['Elite'].value_counts())
print()
print("with the bins printed in the book, [0, 0.5, 1]:")
broken = pd.cut(college['Top10perc'], [0, 0.5, 1], labels=['No', 'Yes'])
print(broken.value_counts(dropna=False).head(3))
""")

blk("q8-box-elite", """
fig, axes = subplots(1, 2, figsize=(11, 4))
college.boxplot('Outstate', by='Private', ax=axes[0])
college.boxplot('Outstate', by='Elite', ax=axes[1])
axes[0].set_title('Outstate vs Private')
axes[1].set_title('Outstate vs Elite')
for a in axes: a.set_xlabel('')
""")
savefig("college-box.png")

blk("q8-hist", """
fig, axes = subplots(2, 2, figsize=(9, 7))
college['Apps'].hist(ax=axes[0, 0], bins=15);      axes[0, 0].set_title('Apps')
college['Outstate'].hist(ax=axes[0, 1], bins=15);  axes[0, 1].set_title('Outstate')
college['Grad.Rate'].hist(ax=axes[1, 0], bins=15); axes[1, 0].set_title('Grad.Rate')
college['S.F.Ratio'].hist(ax=axes[1, 1], bins=15); axes[1, 1].set_title('S.F.Ratio')
fig.tight_layout()
""")
savefig("college-hist.png")

blk("q8-extra-facts", """
print('private colleges:', (college['Private'] == 'Yes').sum(),
      'of', len(college))
print('mean Outstate, private: %d' %
      college.loc[college['Private'] == 'Yes', 'Outstate'].mean())
print('mean Outstate, public:  %d' %
      college.loc[college['Private'] == 'No', 'Outstate'].mean())
print('correlation Grad.Rate vs Expend: %.2f'
      % college['Grad.Rate'].corr(college['Expend']))
print('grad rate over 100:',
      college.loc[college['Grad.Rate'] > 100, ['Grad.Rate']].to_dict('records'))
print('median S.F.Ratio: %.2f' % college['S.F.Ratio'].median())
""")

# --------------------------------------------------------------- exercise 9
blk("q9-dtypes", """
Auto = pd.read_csv('%s/Auto.csv')
print(Auto.dtypes)
print('rows:', len(Auto))
""" % DATA)

blk("q9-summary", """
quant = ['mpg', 'displacement', 'horsepower', 'weight', 'acceleration']
summary = pd.DataFrame({
    'min': Auto[quant].min(),
    'max': Auto[quant].max(),
    'mean': Auto[quant].mean().round(2),
    'sd': Auto[quant].std().round(2)})
print(summary)
""")

blk("q9-subset", """
subset = Auto.drop(index=Auto.index[9:85])
print('rows removed:', len(Auto) - len(subset), '| rows left:', len(subset))
summary2 = pd.DataFrame({
    'min': subset[quant].min(),
    'max': subset[quant].max(),
    'mean': subset[quant].mean().round(2),
    'sd': subset[quant].std().round(2)})
print(summary2)
""")

blk("q9-mpg-corrs", """
print(Auto[quant + ['cylinders']].corr()['mpg'].round(2).sort_values())
""")

blk("q9-mpg-plots", """
fig, axes = subplots(1, 5, figsize=(15, 3.4))
for ax, name in zip(axes, ['displacement', 'horsepower', 'weight',
                           'acceleration', 'cylinders']):
    ax.scatter(Auto[name], Auto['mpg'], s=12, alpha=0.6)
    ax.set_xlabel(name)
    ax.set_ylabel('mpg' if name == 'displacement' else '')
fig.tight_layout()
""")
savefig("auto-mpg.png")

# --------------------------------------------------------------- exercise 10
blk("q10-load", """
from ISLP import load_data
Boston = load_data('Boston')
print('shape:', Boston.shape)
print(Boston.columns.tolist())
print(Boston.dtypes.to_string())
""")

blk("q10-crim-corrs", """
num = Boston.select_dtypes('number')
print(num.corr()['crim'].round(2).sort_values(ascending=False).to_string())
""")

blk("q10-extremes", """
print('crime rate: min %.2f, median %.2f, max %.2f'
      % (Boston.crim.min(), Boston.crim.median(), Boston.crim.max()))
top = Boston.crim.idxmax()
print('highest crime suburb ->', Boston.loc[top].to_dict())
print()
print('tax: values above 500:', [int(v) for v in
                                sorted(Boston.loc[Boston.tax > 500, 'tax'].unique())])
print('suburbs taxed at 666:', (Boston.tax == 666).sum(), 'of', len(Boston))
print('pupil-teacher ratio: min %.2f, median %.2f, max %.2f'
      % (Boston.ptratio.min(), Boston.ptratio.median(), Boston.ptratio.max()))
""")

blk("q10-chas", """
print('suburbs bounding the Charles river (chas = 1):', int(Boston.chas.sum()))
print('median pupil-teacher ratio:', Boston.ptratio.median())
""")

blk("q10-lowest-medv", """
i = Boston.medv.idxmin()
row = Boston.loc[i]
print('lowest median home value:', row.to_dict())
print()
for name in ['crim', 'zn', 'indus', 'rm', 'lstat']:
    lo, hi = Boston[name].min(), Boston[name].max()
    print('%-6s %7.2f  (range %.2f to %.2f)' % (name, row[name], lo, hi))
""")

blk("q10-rooms", """
print('suburbs with more than 7 rooms per dwelling:', int((Boston.rm > 7).sum()))
print('suburbs with more than 8 rooms per dwelling:', int((Boston.rm > 8).sum()))
big = Boston[Boston.rm > 8]
print()
print('the >8-room suburbs: medv median %.1f (whole set %.1f), '
      'crim median %.3f (whole set %.3f), lstat median %.1f (whole set %.1f)'
      % (big.medv.median(), Boston.medv.median(),
         big.crim.median(), Boston.crim.median(),
         big.lstat.median(), Boston.lstat.median()))
""")

blk("q10-pairs", """
fig, axes = subplots(1, 4, figsize=(14, 3.4))
for ax, name in zip(axes, ['rm', 'lstat', 'indus', 'age']):
    ax.scatter(Boston[name], Boston['crim'], s=14, alpha=0.6)
    ax.set_xlabel(name)
    ax.set_ylabel('crim' if name == 'rm' else '')
fig.tight_layout()
""")
savefig("boston-crim.png")
