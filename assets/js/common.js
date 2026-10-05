/* ==========================================================================
   common.js — theme toggle, sidebar drawer, table of contents, KaTeX.
   Loaded on every page (after plots.js / demos are registered).
   ========================================================================== */
(function () {
  'use strict';

  /* ------------------------------------------------------------- theme */
  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    try { localStorage.setItem('islp-theme', t); } catch (e) {}
    window.dispatchEvent(new CustomEvent('themechange', { detail: { theme: t } }));
  }

  function initTheme() {
    var stored = null;
    try { stored = localStorage.getItem('islp-theme'); } catch (e) {}
    var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(stored || (prefersDark ? 'dark' : 'light'));

    document.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-theme-toggle]');
      if (!btn) return;
      var cur = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      applyTheme(cur);
      var label = btn.querySelector('.theme-label');
      if (label) label.textContent = cur === 'dark' ? 'Light mode' : 'Dark mode';
    });

    // keep button label in sync on load
    var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    document.querySelectorAll('.theme-label').forEach(function (el) {
      el.textContent = isDark ? 'Light mode' : 'Dark mode';
    });
  }

  /* ----------------------------------------------------------- sidebar */
  function initSidebar() {
    var sidebar = document.getElementById('sidebar');
    var open = function () { document.body.classList.add('sidebar-open'); };
    var close = function () { document.body.classList.remove('sidebar-open'); };

    document.addEventListener('click', function (e) {
      if (e.target.closest('[data-sidebar-toggle]')) {
        document.body.classList.contains('sidebar-open') ? close() : open();
        e.preventDefault();
      } else if (e.target.closest('#scrim')) {
        close();
      } else if (e.target.closest('.sidebar a')) {
        close();
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') close();
    });

    // close drawer when resizing to desktop
    var mq = window.matchMedia('(min-width: 901px)');
    (mq.addEventListener ? mq.addEventListener.bind(mq, 'change') : mq.addListener.bind(mq))(function () {
      if (mq.matches) close();
    });

    // mark current page in sidebar
    if (sidebar) {
      var here = location.pathname.split('/').pop() || 'index.html';
      sidebar.querySelectorAll('a[href]').forEach(function (a) {
        var href = a.getAttribute('href').split('/').pop();
        if (href === here) a.setAttribute('aria-current', 'page');
        else a.removeAttribute('aria-current');
      });
    }
  }

  /* --------------------------------------------------------------- TOC */
  function initToc() {
    var toc = document.getElementById('page-toc');
    if (!toc) return;

    var wide = window.matchMedia('(min-width: 1181px)');
    var syncMode = function () {
      if (wide.matches) {
        toc.setAttribute('open', '');
      } else if (!toc.dataset.userToggled) {
        toc.removeAttribute('open');
      }
    };
    syncMode();
    (wide.addEventListener ? wide.addEventListener.bind(wide, 'change') : wide.addListener.bind(wide))(syncMode);
    toc.addEventListener('toggle', function () { toc.dataset.userToggled = '1'; });

    // scrollspy: highlight the section currently being read
    var links = Array.prototype.slice.call(toc.querySelectorAll('a[href^="#"]'));
    if (!links.length || !('IntersectionObserver' in window)) return;
    var byId = {};
    links.forEach(function (a) { byId[a.getAttribute('href').slice(1)] = a; });

    var visible = new Set();
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) visible.add(en.target.id);
        else visible.delete(en.target.id);
      });
      var active = null;
      document.querySelectorAll('main section[id]').forEach(function (s) {
        if (visible.has(s.id) && (!active || s.offsetTop < active.offsetTop)) active = s;
      });
      links.forEach(function (a) { a.removeAttribute('aria-current'); });
      if (active && byId[active.id]) byId[active.id].setAttribute('aria-current', 'true');
    }, { rootMargin: '-10% 0px -60% 0px', threshold: 0 });

    document.querySelectorAll('main section[id]').forEach(function (s) { io.observe(s); });
  }

  /* ------------------------------------------------------------- KaTeX */
  function renderMath() {
    if (typeof renderMathInElement !== 'function') {
      // CDN unavailable: keep the source readable instead of throwing
      document.querySelectorAll('.katex-display, .math').forEach(function (el) {
        if (el.querySelector('.katex')) return;
        el.classList.add('math-fallback');
      });
      return;
    }
    renderMathInElement(document.body, {
      delimiters: [
        { left: '$$', right: '$$', display: true },
        { left: '$', right: '$', display: false },
        { left: '\\[', right: '\\]', display: true },
        { left: '\\(', right: '\\)', display: false }
      ],
      throwOnError: false,
      ignoredTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code', 'option']
    });
  }

  /* ------------------------------------------------------------- print */
  // Canvases print as bitmap images, so a dark-mode page would stamp dark
  // rectangles onto the paper. Flip to the light theme just while printing
  // (without touching localStorage) so charts render light in the PDF.
  function initPrintTheme() {
    var prev = null;
    window.addEventListener('beforeprint', function () {
      if (document.documentElement.getAttribute('data-theme') !== 'dark') return;
      prev = 'dark';
      document.documentElement.setAttribute('data-theme', 'light');
      window.dispatchEvent(new CustomEvent('themechange', { detail: { theme: 'light' } }));
      // themechange only schedules a rAF repaint — the print snapshot may
      // happen before the next frame, so paint synchronously right now.
      if (typeof window.redrawAllSync === 'function') window.redrawAllSync();
    });
    window.addEventListener('afterprint', function () {
      if (prev !== 'dark') return;
      document.documentElement.setAttribute('data-theme', 'dark');
      window.dispatchEvent(new CustomEvent('themechange', { detail: { theme: 'dark' } }));
      prev = null;
    });
  }

  /* ---------------------------------------------------------------- go */
  function boot() {
    initTheme();
    initSidebar();
    initToc();
    initPrintTheme();
    renderMath();
    document.querySelectorAll('[data-year]').forEach(function (el) {
      el.textContent = new Date().getFullYear();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
