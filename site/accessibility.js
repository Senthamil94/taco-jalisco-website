/**
 * Tacos Jalisco — Accessibility Tools
 * Same features as Ramen Hiroshi; existing site UI / fonts unchanged
 */
(function () {
  'use strict';

  /* Pretty URLs on http(s) only. file:// needs .html or Chrome shows source. */
  try {
    if (location.protocol !== 'file:') {
      var prettyPath = location.pathname;
      var prettyTail = location.search + location.hash;
      if (/\/index\.html$/i.test(prettyPath)) {
        history.replaceState(null, '', prettyPath.replace(/index\.html$/i, '') + prettyTail);
      } else if (/\.html$/i.test(prettyPath)) {
        history.replaceState(null, '', prettyPath.replace(/\.html$/i, '') + prettyTail);
      }
    }
  } catch (err) {}

  var DEFAULTS = {
    textScale: 100,
    highContrast: false,
    grayscale: false,
    darkMode: false,
    underlineLinks: false,
    readableFont: false,
    highlightLinks: false,
    highlightHeadings: false,
    stopAnimations: false,
    readingGuide: false,
    enhancedFocus: true,
    saturation: 100,
    brightness: 100
  };

  var LIMITS = {
    textScale: { min: 80, max: 200, step: 10 },
    saturation: { min: 50, max: 200, step: 10 },
    brightness: { min: 50, max: 150, step: 10 }
  };

  var STORAGE_KEY = 'tj-a11y';
  var state = {};
  var root = document.documentElement;
  var panel = null;
  var trigger = null;
  var overlay = null;
  var widgetRoot = null;
  var readingGuide = null;
  var statusEl = null;
  var lastFocused = null;

  function initDefaults() {
    state = Object.assign({}, DEFAULTS);
    try {
      var saved = localStorage.getItem(STORAGE_KEY);
      if (saved) state = Object.assign(state, JSON.parse(saved));
    } catch (e) {}
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      state.stopAnimations = true;
    }
  }

  function persist() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
  }

  function clamp(val, min, max) {
    return Math.min(max, Math.max(min, val));
  }

  function buildFilter() {
    var parts = [];
    if (state.grayscale) parts.push('grayscale(100%)');
    if (state.saturation !== 100) parts.push('saturate(' + state.saturation + '%)');
    if (state.brightness !== 100) parts.push('brightness(' + state.brightness + '%)');
    return parts.join(' ');
  }

  function toggleClass(cls, on) {
    root.classList.toggle(cls, !!on);
  }

  function pageSurfaces() {
    var list = [];
    if (!document.body) return list;
    var kids = document.body.children;
    for (var i = 0; i < kids.length; i++) {
      var el = kids[i];
      var tag = el.tagName;
      if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'LINK' || tag === 'NOSCRIPT') continue;
      list.push(el);
    }
    return list;
  }

  function clearPageEffects() {
    document.body.style.filter = '';
    document.body.style.zoom = '';
    pageSurfaces().forEach(function (el) {
      el.style.filter = '';
      el.style.zoom = '';
    });
  }

  /* Apply zoom/filter to page sections, never to body.
     Filter/zoom on body makes position:fixed header leave a gap at the top. */
  function applyPageEffects() {
    document.body.style.filter = '';
    document.body.style.zoom = '';
    var filter = buildFilter();
    var scale = state.textScale !== 100 ? String(state.textScale / 100) : '';
    pageSurfaces().forEach(function (el) {
      el.style.filter = filter;
      el.style.zoom = scale;
    });
  }

  function applyTextScale() {
    var scale = state.textScale / 100;
    var scaled = state.textScale !== 100;
    root.style.setProperty('--a11y-zoom', String(scale));
    toggleClass('a11y-text-scaled', scaled);
    root.dataset.a11yTextScale = state.textScale;
  }

  function applySettings() {
    applyTextScale();
    applyPageEffects();

    toggleClass('a11y-high-contrast', state.highContrast);
    toggleClass('a11y-dark-mode', state.darkMode);
    toggleClass('a11y-underline-links', state.underlineLinks);
    toggleClass('a11y-readable-font', state.readableFont);
    toggleClass('a11y-highlight-links', state.highlightLinks);
    toggleClass('a11y-highlight-headings', state.highlightHeadings);
    toggleClass('a11y-stop-animations', state.stopAnimations);
    toggleClass('a11y-enhanced-focus', state.enhancedFocus);

    if (readingGuide) {
      readingGuide.classList.toggle('is-active', state.readingGuide);
      readingGuide.setAttribute('aria-hidden', state.readingGuide ? 'false' : 'true');
    }

    updateButtons();
    updateStatus();
    persist();
  }

  function resetAll() {
    state = Object.assign({}, DEFAULTS);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      state.stopAnimations = true;
    }
    root.style.removeProperty('--a11y-zoom');
    clearPageEffects();
    applySettings();
    announce('All accessibility settings have been reset.');
  }

  function onReadingGuideMove(e) {
    if (!state.readingGuide || !readingGuide) return;
    readingGuide.style.top = e.clientY + 'px';
  }

  var ACTIONS = [
    { id: 'increaseText', label: 'Increase Text', type: 'step', key: 'textScale', dir: 1 },
    { id: 'decreaseText', label: 'Decrease Text', type: 'step', key: 'textScale', dir: -1 },
    { id: 'highContrast', label: 'High Contrast', type: 'toggle', key: 'highContrast' },
    { id: 'grayscale', label: 'Grayscale', type: 'toggle', key: 'grayscale' },
    { id: 'darkMode', label: 'Dark Mode / Light Mode', type: 'toggle', key: 'darkMode' },
    { id: 'underlineLinks', label: 'Underline Links', type: 'toggle', key: 'underlineLinks' },
    { id: 'readableFont', label: 'Readable Font', type: 'toggle', key: 'readableFont' },
    { id: 'highlightLinks', label: 'Highlight Links', type: 'toggle', key: 'highlightLinks' },
    { id: 'highlightHeadings', label: 'Highlight Headings', type: 'toggle', key: 'highlightHeadings' },
    { id: 'stopAnimations', label: 'Stop Animations', type: 'toggle', key: 'stopAnimations' },
    { id: 'readingGuide', label: 'Reading Guide', type: 'toggle', key: 'readingGuide' },
    { id: 'increaseSaturation', label: 'Increase Saturation', type: 'step', key: 'saturation', dir: 1 },
    { id: 'decreaseSaturation', label: 'Decrease Saturation', type: 'step', key: 'saturation', dir: -1 },
    { id: 'increaseBrightness', label: 'Increase Brightness', type: 'step', key: 'brightness', dir: 1 },
    { id: 'decreaseBrightness', label: 'Decrease Brightness', type: 'step', key: 'brightness', dir: -1 },
    { id: 'reset', label: 'Reset all', type: 'reset' }
  ];

  function createWidget() {
    var container = document.createElement('div');
    container.className = 'acc';
    container.id = 'acc';
    container.innerHTML =
      '<div class="acc__overlay" id="a11yOverlay" aria-hidden="true"></div>' +
      '<div class="acc-reading-guide" id="a11yReadingGuide" aria-hidden="true" role="presentation"></div>' +
      '<div class="acc__panel" id="accPanel" role="dialog" aria-modal="true" aria-labelledby="a11yPanelTitle" hidden>' +
        '<div class="acc__head-row">' +
          '<div class="acc__head" id="a11yPanelTitle">Accessibility</div>' +
          '<button type="button" class="acc__close" id="a11yClose" aria-label="Close accessibility tools">×</button>' +
        '</div>' +
        '<div class="acc__scroll">' +
          '<ul class="acc__list" id="a11yActionList" role="list"></ul>' +
          '<p class="acc__status" id="a11yStatus" aria-live="polite" aria-atomic="true"></p>' +
          '<a class="acc__stmt" href="https://www.boons.io/accessibility-statement" target="_blank" rel="noopener">Accessibility statement</a>' +
        '</div>' +
      '</div>' +
      '<button type="button" class="acc__btn" id="accBtn" aria-label="Accessibility options" aria-expanded="false" aria-controls="accPanel">' +
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.2a2.2 2.2 0 110 4.4 2.2 2.2 0 010-4.4zm9.4 5.1c-2.6.8-5.2 1.2-7.4 1.35v2.1c0 .6.05 1.2.16 1.8l1.44 7a1.15 1.15 0 01-2.25.47L12 14.6l-1.35 5.42a1.15 1.15 0 01-2.25-.47l1.44-7c.11-.6.16-1.2.16-1.8v-2.1C7.8 8.5 5.2 8.1 2.6 7.3l.6-2.2c2.9.9 5.85 1.35 8.8 1.35s5.9-.45 8.8-1.35l.6 2.2z"/></svg>' +
      '</button>';

    document.documentElement.appendChild(container);
    widgetRoot = container;
    panel = document.getElementById('accPanel');
    trigger = document.getElementById('accBtn');
    overlay = document.getElementById('a11yOverlay');
    readingGuide = document.getElementById('a11yReadingGuide');
    statusEl = document.getElementById('a11yStatus');

    var list = document.getElementById('a11yActionList');
    ACTIONS.forEach(function (action) {
      var li = document.createElement('li');
      li.className = 'acc__item';
      li.setAttribute('role', 'listitem');

      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'acc__opt' + (action.type === 'reset' ? ' acc__reset' : '');
      btn.id = 'a11y-' + action.id;
      btn.dataset.action = action.id;
      btn.innerHTML = action.label + (action.type === 'reset' ? '' : ' <span class="st">Off</span>');

      if (action.type === 'toggle') btn.setAttribute('aria-pressed', 'false');

      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        handleAction(action);
      });

      li.appendChild(btn);
      list.appendChild(li);
    });

    trigger.addEventListener('click', function (e) {
      e.stopPropagation();
      togglePanel();
    });
    document.getElementById('a11yClose').addEventListener('click', function (e) {
      e.stopPropagation();
      closePanel();
    });
    document.addEventListener('click', onDocumentClick);
    panel.addEventListener('click', function (e) { e.stopPropagation(); });
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousemove', onReadingGuideMove);
    panel.addEventListener('keydown', trapFocus);

    /* Menu page: order bar is always visible on small screens */
    var bar = document.querySelector('.orderbar');
    if (bar && !bar.id) widgetRoot.classList.add('lift');
  }

  function handleAction(action) {
    if (action.type === 'reset') {
      resetAll();
      return;
    }
    if (action.type === 'toggle') {
      state[action.key] = !state[action.key];
      applySettings();
      announce(action.label + (state[action.key] ? ' enabled' : ' disabled') + '.');
      return;
    }
    if (action.type === 'step') {
      var limits = LIMITS[action.key];
      var next = state[action.key] + action.dir * limits.step;
      var clamped = clamp(next, limits.min, limits.max);
      if (clamped === state[action.key]) {
        announce(action.label + ' limit reached.');
        return;
      }
      state[action.key] = clamped;
      applySettings();
      announce(action.label + '. Current value: ' + state[action.key] + '%.');
    }
  }

  function updateButtons() {
    ACTIONS.forEach(function (action) {
      var btn = document.getElementById('a11y-' + action.id);
      if (!btn) return;
      var st = btn.querySelector('.st');
      if (action.type === 'toggle') {
        btn.setAttribute('aria-pressed', state[action.key] ? 'true' : 'false');
        if (st) st.textContent = state[action.key] ? 'On' : 'Off';
      } else if (action.type === 'step') {
        var val = state[action.key];
        var def = DEFAULTS[action.key];
        var active = action.dir > 0 ? val > def : val < def;
        btn.setAttribute('aria-pressed', active ? 'true' : 'false');
        btn.classList.toggle('is-on', active);
        if (st) st.textContent = val === def ? 'Off' : val + '%';
      }
    });
  }

  function updateStatus() {
    if (!statusEl) return;
    statusEl.textContent = 'Text: ' + state.textScale + '% · Saturation: ' + state.saturation + '% · Brightness: ' + state.brightness + '%';
  }

  function announce(msg) {
    if (statusEl) statusEl.textContent = msg;
  }

  function isOpen() {
    return panel && panel.classList.contains('is-open');
  }

  function togglePanel() {
    if (isOpen()) closePanel();
    else openPanel();
  }

  function openPanel() {
    lastFocused = document.activeElement;
    panel.classList.add('is-open');
    panel.removeAttribute('hidden');
    panel.setAttribute('aria-hidden', 'false');
    overlay.classList.add('is-visible');
    overlay.setAttribute('aria-hidden', 'false');
    trigger.setAttribute('aria-expanded', 'true');
    var scroll = panel.querySelector('.acc__scroll');
    if (scroll) scroll.scrollTop = 0;
    var firstAction = panel.querySelector('.acc__opt');
    if (firstAction) {
      try { firstAction.focus({ preventScroll: true }); }
      catch (err) { firstAction.focus(); }
    }
  }

  function closePanel() {
    if (!isOpen()) return;
    panel.classList.remove('is-open');
    panel.setAttribute('hidden', '');
    panel.setAttribute('aria-hidden', 'true');
    overlay.classList.remove('is-visible');
    overlay.setAttribute('aria-hidden', 'true');
    trigger.setAttribute('aria-expanded', 'false');
    if (lastFocused && lastFocused.focus) lastFocused.focus();
    else trigger.focus();
  }

  function onDocumentClick(e) {
    if (!isOpen()) return;
    if (widgetRoot && widgetRoot.contains(e.target)) return;
    closePanel();
  }

  function onKeyDown(e) {
    if (e.key === 'Escape' && isOpen()) {
      e.preventDefault();
      closePanel();
    }
  }

  function trapFocus(e) {
    if (e.key !== 'Tab' || !isOpen()) return;
    var focusable = panel.querySelectorAll(
      'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (!focusable.length) return;
    var first = focusable[0];
    var last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  function init() {
    initDefaults();
    createWidget();
    applySettings();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.TacosJaliscoA11y = {
    getSettings: function () { return Object.assign({}, state); },
    reset: resetAll,
    closePanel: closePanel
  };
})();
