/* ==========================================================================
   nav.js — the site's single navigation manifest.

   Everything that repeats across pages lives here: the sidebar, the
   "on this page" table of contents and the prev/next footer. Adding a
   page means adding one line to CHAPTERS — nothing is copied by hand.

   Chapters with `href` and no `sections` are single pages; chapters with
   `sections` render as a group; chapters with neither are shown as inert
   "soon" rows until they are written.

   Load order matters: this file must come BEFORE common.js, because
   common.js boots as soon as it executes and walks the sidebar markup.
   ========================================================================== */
(function (global) {
  'use strict';

  var CHAPTERS = [
    { n: 1, title: 'Introduction', read: 'pp. 1–14', href: '1-introduction.html', sections: [] },
    { n: 2, title: 'Statistical learning', read: 'pp. 15–68', sections: [
      { href: '2-1-what-is-statistical-learning.html', num: '2.1', label: 'What is statistical learning?' },
      { href: '2-2-assessing-model-accuracy.html', num: '2.2', label: 'Assessing model accuracy' },
      { href: '2-3-lab-introduction-to-python.html', num: '2.3', label: 'Lab: introduction to Python' },
      { href: '2-4-exercises.html', num: '2.4', label: 'Exercises' }
    ] },
    { n: 3, title: 'Linear regression', read: 'pp. 69–134', sections: [
      { href: '3-1-simple-linear-regression.html', num: '3.1', label: 'Simple linear regression' },
      { href: '3-2-multiple-linear-regression.html', num: '3.2', label: 'Multiple linear regression' },
      { href: '3-3-other-considerations.html', num: '3.3', label: 'Other considerations in the regression model' },
      { href: '3-4-the-marketing-plan.html', num: '3.4', label: 'The marketing plan' },
      { href: '3-5-linear-regression-vs-knn.html', num: '3.5', label: 'Linear regression vs KNN' }
    ] },
    { n: 4, title: 'Classification', read: 'pp. 135–200', sections: [
      { href: '4-1-an-overview-of-classification.html', num: '4.1', label: 'An overview of classification' },
      { href: '4-2-why-not-linear-regression.html', num: '4.2', label: 'Why not linear regression?' },
      { href: '4-3-logistic-regression.html', num: '4.3', label: 'Logistic regression' },
      { href: '4-4-generative-models-for-classification.html', num: '4.4', label: 'Generative models for classification' },
      { href: '4-5-a-comparison-of-classification-methods.html', num: '4.5', label: 'A comparison of classification methods' },
      { href: '4-6-generalized-linear-models.html', num: '4.6', label: 'Generalized linear models' }
    ] },
    { n: 5, title: 'Resampling methods', read: 'pp. 201–228', sections: [] },
    { n: 6, title: 'Model selection and regularization', read: 'pp. 229–288', sections: [] },
    { n: 7, title: 'Moving beyond linearity', read: 'pp. 289–330', sections: [] },
    { n: 8, title: 'Tree-based methods', read: 'pp. 331–366', sections: [] },
    { n: 9, title: 'Support vector machines', read: 'pp. 367–398', sections: [] },
    { n: 10, title: 'Deep learning', read: 'pp. 399–468', sections: [] },
    { n: 11, title: 'Survival analysis', read: 'pp. 469–502', sections: [] },
    { n: 12, title: 'Unsupervised learning', read: 'pp. 503–556', sections: [] },
    { n: 13, title: 'Multiple testing', read: 'pp. 557–596', sections: [] }
  ];

  function here() {
    return location.pathname.split('/').pop() || 'index.html';
  }

  function isBuilt(ch) {
    return !!ch.href || (ch.sections && ch.sections.length > 0);
  }

  function node(tag, cls, text) {
    var el = document.createElement(tag);
    if (cls) el.className = cls;
    if (text !== undefined) el.textContent = text;
    return el;
  }

  function link(href, label, extraCls) {
    var a = node('a', extraCls);
    a.setAttribute('href', href);
    a.appendChild(node('span', null, label));
    return a;
  }

  function soonLink(label) {
    var a = node('a', 'soon');
    a.setAttribute('aria-disabled', 'true');
    a.setAttribute('tabindex', '-1');
    a.appendChild(node('span', null, label));
    var b = node('span', 'badge', 'soon');
    a.appendChild(b);
    return a;
  }

  /* --------------------------------------------------------------- sidebar */
  function buildSidebar() {
    var nav = document.querySelector('#sidebar .side-nav');
    if (!nav) return;
    nav.textContent = '';

    var browse = node('p', 'side-label', 'Browse');
    nav.appendChild(browse);
    var ul0 = node('ul');
    ul0.appendChild(node('li', null)).appendChild(link('index.html', 'Home'));
    nav.appendChild(ul0);

    var head = node('p', 'side-label', 'Chapters');
    nav.appendChild(head);
    var ul = node('ul');

    CHAPTERS.forEach(function (ch) {
      var li = node('li');
      var label = ch.n + ' · ' + ch.title;

      if (!isBuilt(ch)) {
        li.appendChild(soonLink(label));
      } else if (ch.sections.length) {
        var group = node('li', 'nav-group');
        var span = node('span', 'side-chapter');
        span.appendChild(node('span', null, label));
        span.appendChild(node('span', 'badge done', ch.sections.length + ' pp'));
        group.appendChild(span);
        var sub = node('ul');
        ch.sections.forEach(function (s) {
          var sli = node('li');
          sli.appendChild(link(s.href, s.num + ' ' + s.label));
          sub.appendChild(sli);
        });
        group.appendChild(sub);
        li = group;
      } else {
        li.appendChild(link(ch.href, label));
      }
      ul.appendChild(li);
    });

    nav.appendChild(ul);
  }

  /* ------------------------------------------------ reading-order page list */
  function pageList() {
    var out = [];
    CHAPTERS.forEach(function (ch) {
      if (ch.sections && ch.sections.length) {
        ch.sections.forEach(function (s) {
          out.push({ href: s.href, title: s.num + ' ' + s.label, chapter: ch.n + ' · ' + ch.title });
        });
      } else if (ch.href) {
        out.push({ href: ch.href, title: ch.title, chapter: 'Chapter ' + ch.n });
      }
    });
    return out;
  }

  /* ------------------------------------------------------------ prev / next */
  function buildPageNav() {
    var main = document.getElementById('main');
    if (!main) return;
    var pages = pageList();
    var pos = -1;
    pages.forEach(function (p, i) { if (p.href === here()) pos = i; });
    if (pos < 0) return;                       // home page, nothing to link

    var nav = node('nav', 'pager');
    nav.setAttribute('aria-label', 'Previous and next section');

    function slot(page, dir) {
      var text = dir === 'prev' ? 'Previous' : 'Next';
      if (!page) {
        var off = node('span', 'pager-off');
        off.appendChild(node('span', 'p-dir', text));
        off.appendChild(node('span', 'p-title', '—'));
        return off;
      }
      var a = node('a', dir === 'next' ? 'next' : null);
      a.setAttribute('href', page.href);
      a.appendChild(node('span', 'p-dir', text));
      var title = dir === 'prev' ? '← ' + page.title : page.title + ' →';
      a.appendChild(node('span', 'p-title', title));
      return a;
    }

    nav.appendChild(slot(pages[pos - 1], 'prev'));
    nav.appendChild(slot(pages[pos + 1], 'next'));

    var footer = main.querySelector('footer');
    if (footer) main.insertBefore(nav, footer);
    else main.appendChild(nav);
  }

  /* ------------------------------------------------------------------- TOC */
  function buildToc() {
    var toc = document.getElementById('page-toc');
    if (!toc) return;
    var ol = toc.querySelector('nav ol');
    if (!ol) return;
    ol.textContent = '';

    var heads = document.querySelectorAll('main section[id] > h2, main section[id] > h3[id]');
    var used = {};
    Array.prototype.forEach.call(heads, function (h) {
      var section = h.closest('section');
      if (!section || used[section.id]) return;
      used[section.id] = 1;
      var li = node('li');
      li.appendChild(link('#' + section.id, h.textContent.trim()));
      ol.appendChild(li);
    });
    if (!ol.children.length && toc.parentNode) toc.parentNode.removeChild(toc);
  }

  /* -------------------------------------------------------------------- go */
  function boot() {
    buildSidebar();
    buildToc();
    buildPageNav();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  global.ISLP_CHAPTERS = CHAPTERS;
})(window);
