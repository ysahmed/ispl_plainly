/* ==========================================================================
   plots.js — tiny canvas plotting helper used by all demos.
   Usage:
     const p = new Plot(canvas, { range:{xmin,xmax,ymin,ymax}, height:300,
                                  xlabel:'x', ylabel:'y', draw: (p)=>{ ... } });
   Inside draw(): p.axes(); p.line(pts,{color}); p.points(pts,{color}); ...
   ========================================================================== */
(function (global) {
  'use strict';

  var plots = [];

  function cssVar(name, fallback) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(name);
    return v && v.trim() ? v.trim() : fallback;
  }

  function themeColors() {
    return {
      fg: cssVar('--plot-fg', '#1c2330'),
      grid: cssVar('--plot-grid', '#e5e9f0'),
      axis: cssVar('--plot-axis', '#9aa4b2'),
      accent: cssVar('--plot-accent', '#2563eb'),
      accent2: cssVar('--plot-accent2', '#dc2626'),
      good: cssVar('--plot-good', '#16a34a'),
      surface: cssVar('--plot-surface', '#ffffff'),
      heat0: cssVar('--plot-heat0', '#eef3fd'),
      heat1: cssVar('--plot-heat1', '#1d4ed8')
    };
  }

  function niceTicks(lo, hi, count) {
    if (!(hi > lo)) return [lo];
    var span = hi - lo;
    var step = Math.pow(10, Math.floor(Math.log10(span / count)));
    var err = (span / count) / step;
    if (err >= 7.5) step *= 10;
    else if (err >= 3.5) step *= 5;
    else if (err >= 1.5) step *= 2;
    var ticks = [];
    var start = Math.ceil(lo / step) * step;
    for (var t = start; t <= hi + step * 1e-6; t += step) {
      ticks.push(Math.round(t / step) * step);
    }
    return ticks;
  }

  function fmtTick(v) {
    if (Math.abs(v) < 1e-9) return '0';
    if (Math.abs(v) >= 1000 || (Math.abs(v) < 0.01 && v !== 0)) return v.toExponential(0);
    var s = Math.abs(v) >= 10 ? v.toFixed(0) : v.toFixed(2).replace(/\.?0+$/, '');
    return s;
  }

  function Plot(canvas, opts) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.o = Object.assign({
      height: 300,
      pad: { l: 46, r: 14, t: 14, b: 34 },
      xlabel: '',
      ylabel: '',
      xlabelY: 0.5,
      grid: true,
      draw: null
    }, opts || {});
    this.range = Object.assign({ xmin: -10, xmax: 10, ymin: -10, ymax: 10 }, this.o.range || {});
    this.pointer = null;           // data coords of pointer, or null
    this._raf = null;
    var self = this;
    plots.push(this);

    if (typeof ResizeObserver !== 'undefined') {
      this._ro = new ResizeObserver(function () { self.resize(); });
      // observe the canvas box itself: in a grid layout several canvases share
      // one parent, and the parent's width is not each panel's width
      this._ro.observe(canvas);
    }
    window.addEventListener('resize', function () { self.resize(); });
    window.addEventListener('themechange', function () { self.render(); });

    canvas.addEventListener('pointermove', function (e) {
      var r = canvas.getBoundingClientRect();
      self.pointer = self.pxToData(e.clientX - r.left, e.clientY - r.top);
      self.render();
      if (self.o.onPointer) self.o.onPointer(self.pointer, e);
    });
    canvas.addEventListener('pointerleave', function () {
      self.pointer = null;
      self.render();
      if (self.o.onPointer) self.o.onPointer(null, null);
    });

    this.resize();
  }

  Plot.prototype.resize = function () {
    var parent = this.canvas.parentElement || document.body;
    // measure this canvas's own layout box — parent.clientWidth is the whole
    // grid row when several panels share a parent, which draws every backing
    // store at the full row width and shrinks the text on each panel
    var w = Math.max(200, this.canvas.clientWidth || parent.clientWidth || 400);
    var h = typeof this.o.height === 'function' ? this.o.height(w) : this.o.height;
    var dpr = window.devicePixelRatio || 1;
    this.w = w;
    this.h = h;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.canvas.style.height = h + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.render();
  };

  Plot.prototype.setRange = function (r) {
    Object.assign(this.range, r);
    this.render();
  };

  Plot.prototype._paint = function () {
    this.colors = themeColors();
    this.ctx.clearRect(0, 0, this.w, this.h);
    if (this.o.draw) this.o.draw(this);
  };

  Plot.prototype.render = function () {
    if (this._raf) return;
    var self = this;
    this._raf = requestAnimationFrame(function () {
      self._raf = null;
      self._paint();
    });
  };

  // Paint immediately, bypassing requestAnimationFrame — used when the print
  // snapshot happens before the next frame (see common.js beforeprint).
  Plot.prototype.renderSync = function () {
    if (this._raf) {
      cancelAnimationFrame(this._raf);
      this._raf = null;
    }
    this._paint();
  };

  global.redrawAllSync = function () {
    plots.forEach(function (p) {
      try { p.renderSync(); } catch (e) { /* never break printing */ }
    });
  };

  Plot.prototype.xToPx = function (x) {
    var p = this.o.pad;
    return p.l + (x - this.range.xmin) / (this.range.xmax - this.range.xmin) * (this.w - p.l - p.r);
  };
  Plot.prototype.yToPx = function (y) {
    var p = this.o.pad;
    return this.h - p.b - (y - this.range.ymin) / (this.range.ymax - this.range.ymin) * (this.h - p.t - p.b);
  };
  Plot.prototype.pxToData = function (px, py) {
    var p = this.o.pad;
    var x = this.range.xmin + (px - p.l) / (this.w - p.l - p.r) * (this.range.xmax - this.range.xmin);
    var y = this.range.ymin + (this.h - p.b - py) / (this.h - p.t - p.b) * (this.range.ymax - this.range.ymin);
    var inside = x >= this.range.xmin && x <= this.range.xmax && y >= this.range.ymin && y <= this.range.ymax;
    return { x: x, y: y, inside: inside };
  };

  // ---- drawing primitives -------------------------------------------------

  Plot.prototype.axes = function () {
    var c = this.ctx, col = this.colors, r = this.range, p = this.o.pad;
    var xt = niceTicks(r.xmin, r.xmax, 7);
    var yt = niceTicks(r.ymin, r.ymax, 5);

    c.save();
    c.font = '11px system-ui, sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'top';

    if (this.o.grid) {
      c.strokeStyle = col.grid;
      c.lineWidth = 1;
      c.beginPath();
      for (var i = 0; i < xt.length; i++) {
        var gx = Math.round(this.xToPx(xt[i])) + .5;
        c.moveTo(gx, p.t); c.lineTo(gx, this.h - p.b);
      }
      for (var j = 0; j < yt.length; j++) {
        var gy = Math.round(this.yToPx(yt[j])) + .5;
        c.moveTo(p.l, gy); c.lineTo(this.w - p.r, gy);
      }
      c.stroke();
    }

    // axis lines
    c.strokeStyle = col.axis;
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(p.l + .5, p.t); c.lineTo(p.l + .5, this.h - p.b + .5); c.lineTo(this.w - p.r, this.h - p.b + .5);
    c.stroke();

    // x tick labels
    c.fillStyle = col.axis;
    for (var i2 = 0; i2 < xt.length; i2++) {
      var tx = this.xToPx(xt[i2]);
      if (tx < p.l - 2 || tx > this.w - p.r + 2) continue;
      c.fillText(fmtTick(xt[i2]), tx, this.h - p.b + 6);
    }
    // y tick labels (suppressible with noYTicks for categorical rows)
    if (!this.o.noYTicks) {
      c.textAlign = 'right';
      c.textBaseline = 'middle';
      for (var j2 = 0; j2 < yt.length; j2++) {
        var ty = this.yToPx(yt[j2]);
        if (ty < p.t - 2 || ty > this.h - p.b + 2) continue;
        c.fillText(fmtTick(yt[j2]), p.l - 7, ty);
      }
    }

    // axis titles
    c.fillStyle = col.fg;
    c.font = '12px system-ui, sans-serif';
    if (this.o.xlabel) {
      c.textAlign = 'center';
      c.textBaseline = 'bottom';
      c.fillText(this.o.xlabel, p.l + (this.w - p.l - p.r) / 2, this.h - 2);
    }
    if (this.o.ylabel) {
      c.save();
      c.translate(11, p.t + (this.h - p.t - p.b) / 2);
      c.rotate(-Math.PI / 2);
      c.textAlign = 'center';
      c.textBaseline = 'top';
      c.fillText(this.o.ylabel, 0, 0);
      c.restore();
    }
    c.restore();
  };

  Plot.prototype.clip = function (fn) {
    var c = this.ctx, p = this.o.pad;
    c.save();
    c.beginPath();
    c.rect(p.l, p.t, this.w - p.l - p.r, this.h - p.t - p.b);
    c.clip();
    fn();
    c.restore();
  };

  // pts: [[x,y], ...]
  Plot.prototype.line = function (pts, style) {
    style = style || {};
    var c = this.ctx, col = this.colors;
    if (!pts || pts.length < 2) return;
    var self = this;
    this.clip(function () {
      c.strokeStyle = style.color || col.accent;
      c.lineWidth = style.width || 2;
      c.setLineDash(style.dash || []);
      c.lineJoin = 'round';
      c.lineCap = 'round';
      c.beginPath();
      for (var i = 0; i < pts.length; i++) {
        var X = self.xToPx(pts[i][0]), Y = self.yToPx(pts[i][1]);
        if (i === 0) c.moveTo(X, Y); else c.lineTo(X, Y);
      }
      c.stroke();
      c.setLineDash([]);
    });
  };

  // f: function(x)->y  sampled over the visible x range (or [from,to])
  Plot.prototype.fnLine = function (f, style, from, to) {
    var r = this.range;
    var a = (from === undefined) ? r.xmin : from;
    var b = (to === undefined) ? r.xmax : to;
    var n = (style && style.samples) || 240;
    var pts = [];
    for (var i = 0; i <= n; i++) {
      var x = a + (b - a) * i / n;
      var y = f(x);
      if (isFinite(y)) pts.push([x, y]);
    }
    this.line(pts, style);
  };

  Plot.prototype.points = function (pts, style) {
    style = style || {};
    var c = this.ctx, col = this.colors, self = this;
    this.clip(function () {
      c.fillStyle = style.color || col.accent;
      c.globalAlpha = style.alpha === undefined ? 1 : style.alpha;
      var r = style.r || 4.2;
      for (var i = 0; i < pts.length; i++) {
        var X = self.xToPx(pts[i][0]), Y = self.yToPx(pts[i][1]);
        c.beginPath();
        if (style.square) {
          c.rect(X - r, Y - r, r * 2, r * 2);
        } else {
          c.arc(X, Y, r, 0, Math.PI * 2);
        }
        if (style.ring) {
          c.strokeStyle = style.color || col.accent;
          c.lineWidth = style.ringWidth || 1.6;
          c.stroke();
        } else {
          c.fill();
        }
      }
      c.globalAlpha = 1;
    });
  };

  Plot.prototype.dot = function (x, y, style) {
    style = style || {};
    var c = this.ctx, col = this.colors;
    var X = this.xToPx(x), Y = this.yToPx(y);
    c.save();
    c.beginPath();
    c.arc(X, Y, style.r || 5, 0, Math.PI * 2);
    c.fillStyle = style.color || col.accent;
    c.fill();
    if (style.ring !== false) {
      c.lineWidth = style.ringWidth || 2;
      c.strokeStyle = style.ring || col.surface;
      c.stroke();
    }
    c.restore();
  };

  Plot.prototype.text = function (str, x, y, style) {
    style = style || {};
    var c = this.ctx, col = this.colors;
    c.save();
    c.font = style.font || '12px system-ui, sans-serif';
    c.fillStyle = style.color || col.fg;
    c.textAlign = style.align || 'left';
    c.textBaseline = style.base || 'middle';
    if (style.bg) {
      var w = c.measureText(str).width;
      var px = this.xToPx(x), py = this.yToPx(y);
      var ox = style.align === 'center' ? -w / 2 : (style.align === 'right' ? -w : 0);
      c.fillStyle = style.bg;
      c.fillRect(px + ox - 4, py - 8, w + 8, 16);
      c.fillStyle = style.color || col.fg;
    }
    c.fillText(str, this.xToPx(x), this.yToPx(y));
    c.restore();
  };

  // filled data-space rectangle (used for probability heatmaps / regions)
  Plot.prototype.cell = function (x0, x1, y0, y1, color, alpha) {
    var c = this.ctx;
    var X0 = this.xToPx(x0), X1 = this.xToPx(x1);
    var Y0 = this.yToPx(y1), Y1 = this.yToPx(y0);
    c.save();
    if (alpha !== undefined) c.globalAlpha = alpha;
    c.fillStyle = color;
    c.fillRect(X0, Y0, X1 - X0, Y1 - Y0);
    c.restore();
  };

  // vertical line at x, horizontal at y, dashed helpers
  Plot.prototype.vline = function (x, style) {
    style = style || {};
    this.line([[x, this.range.ymin], [x, this.range.ymax]], style);
  };
  Plot.prototype.hline = function (y, style) {
    style = style || {};
    this.line([[this.range.xmin, y], [this.range.xmax, y]], style);
  };

  // small floating readout box near the pointer / given data coords
  Plot.prototype.badge = function (lines, x, y, style) {
    style = style || {};
    var c = this.ctx, col = this.colors;
    var px = this.xToPx(x), py = this.yToPx(y);
    c.save();
    c.font = style.font || '12px system-ui, sans-serif';
    var w = 0;
    for (var i = 0; i < lines.length; i++) w = Math.max(w, c.measureText(lines[i]).width);
    w += 14;
    var h = lines.length * 15 + 10;
    var bx = Math.min(Math.max(px + 10, 4), this.w - w - 4);
    var by = Math.min(Math.max(py - h - 8, 4), this.h - h - 4);
    c.fillStyle = style.bg || col.surface;
    c.strokeStyle = style.border || col.axis;
    c.lineWidth = 1;
    c.beginPath();
    c.roundRect ? c.roundRect(bx, by, w, h, 6) : c.rect(bx, by, w, h);
    c.fill();
    c.stroke();
    c.fillStyle = style.color || col.fg;
    c.textAlign = 'left';
    c.textBaseline = 'top';
    for (var j = 0; j < lines.length; j++) {
      c.fillText(lines[j], bx + 7, by + 6 + j * 15);
    }
    c.restore();
  };

  Plot.prototype.sample = function (f, a, b, n) {
    var pts = [];
    for (var i = 0; i <= (n || 200); i++) {
      var x = a + (b - a) * i / (n || 200);
      pts.push([x, f(x)]);
    }
    return pts;
  };

  // simple deterministic PRNG so every reload shows the same data
  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function gauss(rnd) {
    var u = 1 - rnd(), v = rnd();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  global.Plot = Plot;
  global.plotTheme = themeColors;
  global.mulberry32 = mulberry32;
  global.gauss = gauss;
  global.gaussRandom = gauss;
})(window);
