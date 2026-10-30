/* core.js: the shared front-end engine (window.UI). Same in every app made from APP_MAKER/template;
   app-specific things live in web/app.js (brand, nav, footer) and web/pages/*.html (the pages).

   Pages:   UI.page(name, {title, nav, icon, auth, order, chrome}, mount)
              auth: null (anyone) | 'guest' (signed-out only) | 'user' | 'admin'
              nav: label for the header / phone tab bar (omit to keep it out of the menus)
              mount(view, ctx) draws into `view`; ctx = {args, me, go, api}. Return a Promise (the page
              is "ready" when it resolves) or {ready, destroy}. URLs are #name/arg1/arg2.
   Server:  UI.api(fn, ...args) -> Promise of the server function's return value. A reply of
              {ok: false, error} rejects with that message (shown as a toast unless you .catch it).
            UI.apiQuiet(fn, ...args) is the same without Anvil's loading spinner.
   Auth:    UI.auth('login'|'signup'|'reset'|'logout', {...}) -> Promise of {ok, me, message}
   Helpers: UI.esc, UI.icon, UI.toast, UI.modal, UI.confirm, UI.busy, UI.formData, UI.fmtDate, UI.ago,
            UI.store, UI.setTheme, UI.feedback, UI.go, UI.refresh
   Tests:   window.UI_READY is true when the current page has finished loading. */
(function () {
  'use strict';
  if (window.UI && window.UI.__v) return;
  var UI = window.UI = { __v: 1, pages: {}, me: null, config: { name: 'App', key: 'app', home: 'home', landing: 'landing' } };
  window.UI_READY = false;

  UI.configure = function (cfg) { Object.keys(cfg).forEach(function (k) { UI.config[k] = cfg[k]; }); };

  /* ------------------------------------------------------------------ small helpers */
  UI.esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  UI.plural = function (n, one, many) { return n + ' ' + (n === 1 ? one : (many || one + 's')); };
  UI.initials = function (name) {
    var p = String(name || '?').trim().split(/\s+/);
    return ((p[0] || '?')[0] + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
  };
  UI.fmtDate = function (iso, opts) {
    if (!iso) return '';
    var d = iso.length <= 10 ? new Date(iso + 'T12:00:00') : new Date(iso);
    return d.toLocaleDateString(undefined, opts || { day: 'numeric', month: 'short', year: 'numeric' });
  };
  UI.fmtDateTime = function (iso) {
    return iso ? new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
  };
  UI.ago = function (iso) {
    if (!iso) return '';
    var s = (Date.now() - new Date(iso).getTime()) / 1000;
    if (s < 60) return 'just now';
    var steps = [[60, 'minute'], [24, 'hour'], [7, 'day'], [4.35, 'week'], [12, 'month'], [Infinity, 'year']], n = s / 60;
    for (var i = 0; i < steps.length; i++) {
      if (n < steps[i][0]) { n = Math.floor(n); return UI.plural(n, steps[i][1]) + ' ago'; }
      n = n / steps[i][0];
    }
    return '';
  };
  UI.store = {
    get: function (k, dflt) { try { var v = localStorage.getItem(UI.config.key + '.' + k); return v == null ? dflt : JSON.parse(v); } catch (e) { return dflt; } },
    set: function (k, v) { try { localStorage.setItem(UI.config.key + '.' + k, JSON.stringify(v)); } catch (e) {} }
  };
  UI.formData = function (form) {
    var out = {};
    Array.prototype.forEach.call(form.elements, function (el) {
      if (!el.name || el.disabled) return;
      if (el.type === 'checkbox') out[el.name] = el.checked;
      else if (el.type === 'radio') { if (el.checked) out[el.name] = el.value; }
      else out[el.name] = el.value;
    });
    return out;
  };
  /* Disable a button while a Promise runs; returns the Promise. */
  UI.busy = function (btn, promise) {
    if (!btn) return promise;
    btn.disabled = true; btn.classList.add('is-busy');
    var done = function () { btn.disabled = false; btn.classList.remove('is-busy'); };
    promise.then(done, done);
    return promise;
  };

  var ICONS = {
    home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.5 3-5.5 6.5-5.5s6.5 2 6.5 5.5"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7"/><path d="M18 14.7c2.2.6 3.5 2.4 3.5 5.3"/>',
    sliders: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
    shield: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    trash: '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M6 6l1 14h10l1-14"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.9A8 8 0 1 1 21 12z"/>',
    bell: '<path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10 20a2 2 0 0 0 4 0"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    back: '<path d="M19 12H5M11 18l-6-6 6-6"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    bug: '<rect x="7" y="8" width="10" height="12" rx="5"/><path d="M12 8V5M9 5.5 7.5 4M15 5.5 16.5 4M7 13H3M21 13h-4M7.5 18l-3 2M16.5 18l3 2M7.5 9.5l-3-2M16.5 9.5l3-2"/>',
    bulb: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>',
    star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
    heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    chevron: '<path d="m6 9 6 6 6-6"/>',
    external: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    inbox: '<path d="M3 13h5l1.5 3h5L16 13h5"/><path d="M5 5h14l2 8v6H3v-6z"/>',
    grid: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
    sparkle: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>',
    database: '<ellipse cx="12" cy="5.5" rx="7.5" ry="2.5"/><path d="M4.5 5.5v13c0 1.4 3.4 2.5 7.5 2.5s7.5-1.1 7.5-2.5v-13"/><path d="M4.5 12c0 1.4 3.4 2.5 7.5 2.5s7.5-1.1 7.5-2.5"/>',
    refresh: '<path d="M20 11a8 8 0 0 0-14.3-4.9L4 8"/><path d="M4 4v4h4"/><path d="M4 13a8 8 0 0 0 14.3 4.9L20 16"/><path d="M20 20v-4h-4"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    map: '<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/>',
    pin: '<path d="M12 21s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/>',
    camera: '<path d="M4 8h3l2-3h6l2 3h3v12H4z"/><circle cx="12" cy="13.5" r="3.5"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
    filter: '<path d="M4 5h16l-6 7.5V19l-4 1.5v-8z"/>',
    more: '<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>'
  };
  UI.ICONS = ICONS;
  UI.icon = function (name, cls) {
    return '<svg class="ui-ic ' + (cls || '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[name] || ICONS.sparkle) + '</svg>';
  };

  /* ------------------------------------------------------------------ toasts, modals */
  UI.toast = function (msg, kind) {
    var box = document.querySelector('.ui-toasts');
    if (!box) { box = document.createElement('div'); box.className = 'ui ui-toasts'; box.setAttribute('aria-live', 'polite'); document.body.appendChild(box); }
    var t = document.createElement('div');
    t.className = 'ui-toast' + (kind ? ' ' + kind : '');
    t.innerHTML = (kind === 'error' ? UI.icon('info') : kind === 'ok' ? UI.icon('check') : '') + '<span>' + UI.esc(msg) + '</span>';
    box.appendChild(t);
    setTimeout(function () { t.classList.add('out'); setTimeout(function () { t.remove(); }, 300); }, kind === 'error' ? 6500 : 3200);
  };
  UI.modal = function (html, opts) {
    opts = opts || {};
    var prev = document.activeElement;
    var wrap = document.createElement('div');
    wrap.className = 'ui ui-modal-wrap';
    wrap.innerHTML = '<div class="ui-modal' + (opts.wide ? ' wide' : '') + '" role="dialog" aria-modal="true">' +
      '<button class="ui-btn ghost icon ui-modal-x" data-close aria-label="Close">' + UI.icon('x') + '</button>' + html + '</div>';
    document.body.appendChild(wrap);
    document.documentElement.classList.add('ui-modal-open');
    function key(e) { if (e.key === 'Escape') close(); }
    function close() {
      if (!wrap.parentNode) return;
      wrap.remove(); document.removeEventListener('keydown', key);
      if (!document.querySelector('.ui-modal-wrap')) document.documentElement.classList.remove('ui-modal-open');
      if (opts.onclose) opts.onclose();
      if (prev && prev.focus) prev.focus();
    }
    document.addEventListener('keydown', key);
    wrap.addEventListener('mousedown', function (e) { if (e.target === wrap) close(); });
    wrap.addEventListener('click', function (e) { if (e.target.closest('[data-close]')) close(); });
    var first = wrap.querySelector('input, textarea, select');
    setTimeout(function () { (first || wrap.querySelector('.ui-modal')).focus && (first || wrap.querySelector('.ui-modal')).focus(); }, 30);
    return { el: wrap.querySelector('.ui-modal'), close: close };
  };
  UI.confirm = function (o) {
    o = typeof o === 'string' ? { title: o } : (o || {});
    return new Promise(function (resolve) {
      var answered = false;
      var m = UI.modal('<h2>' + UI.esc(o.title || 'Are you sure?') + '</h2>' + (o.text ? '<p class="muted">' + UI.esc(o.text) + '</p>' : '') +
        '<div class="ui-row end" style="margin-top:20px"><button class="ui-btn ghost" data-close>' + UI.esc(o.cancel || 'Cancel') + '</button>' +
        '<button class="ui-btn ' + (o.danger ? 'danger solid' : 'primary') + '" data-ok>' + UI.esc(o.ok || 'OK') + '</button></div>',
      { onclose: function () { if (!answered) resolve(false); } });
      m.el.querySelector('[data-ok]').onclick = function () { answered = true; m.close(); resolve(true); };
    });
  };

  /* ------------------------------------------------------------------ theme */
  UI.theme = function () { return UI.store.get('theme', 'auto'); };
  UI.applyTheme = function (t) {
    if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t);
    else document.documentElement.removeAttribute('data-theme');
    var dark = t === 'dark' || (t !== 'light' && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('ui-dark', !!dark);
  };
  UI.setTheme = function (t) { UI.store.set('theme', t); UI.applyTheme(t); };
  UI.applyTheme(UI.theme());
  if (window.matchMedia) {
    try { matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () { UI.applyTheme(UI.theme()); }); } catch (e) {}
  }

  /* ------------------------------------------------------------------ server bridge */
  var bridge = null;
  function send(kind, payload) {
    if (!bridge) return Promise.reject(new Error('The app is still starting.'));
    var out;
    try { out = bridge(kind, JSON.stringify(payload || {})); } catch (e) { return Promise.reject(e); }
    return Promise.resolve(out).then(function (r) {
      r = typeof r === 'string' ? JSON.parse(r) : (r || {});
      if (r.error) {
        var err = new Error(r.error); err.uiApi = true; err.denied = !!r.denied;
        if (r.detail) console.error(kind, payload && payload.fn, r.detail);
        if (r.reload) setTimeout(function () { location.reload(); }, 2500);
        throw err;
      }
      return r.result;
    });
  }
  function apiCall(quiet, fn, args) {
    return send('call', { fn: fn, args: args, quiet: quiet }).then(function (res) {
      if (res && typeof res === 'object' && res.ok === false) {
        var err = new Error(res.error || 'That didn\'t work.'); err.uiApi = true; err.expected = true; err.result = res;
        throw err;
      }
      return res;
    });
  }
  UI.api = function (fn) { return apiCall(false, fn, Array.prototype.slice.call(arguments, 1)); };
  UI.apiQuiet = function (fn) { return apiCall(true, fn, Array.prototype.slice.call(arguments, 1)); };
  /* UI.upload(fn, blob, ...args): the server function gets the File/Blob as Anvil Media first, then args.
     (Main.py turns it into Media with anvil.js.to_media; locally the harness posts it as base64.) */
  UI.upload = function (fn, file) {
    UI._file = file;
    return send('upload', { fn: fn, args: Array.prototype.slice.call(arguments, 2) }).then(function (res) {
      UI._file = null;
      if (res && typeof res === 'object' && res.ok === false) { var err = new Error(res.error || 'That didn\'t work.'); err.uiApi = true; err.expected = true; err.result = res; throw err; }
      return res;
    }, function (e) { UI._file = null; throw e; });
  };
  /* Errors nobody caught become a toast, so a failed action is never silent. */
  window.addEventListener('unhandledrejection', function (e) {
    if (e.reason && e.reason.uiApi) { e.preventDefault(); UI.toast(e.reason.message, 'error'); }
  });

  /* Sign in / up / out. On success it navigates: to where the visitor was heading (UI.after) or home
     after signing in, to the landing page after signing out. */
  UI.auth = function (kind, payload) {
    return send(kind, payload || {}).then(function (r) {
      if (r && r.ok === false) { var err = new Error(r.error); err.uiApi = true; err.expected = true; throw err; }
      if (r && 'me' in r && (r.me || kind === 'logout')) {
        UI.me = r.me || null;
        var target = r.me ? (UI.after || '#' + UI.config.home) : '#' + UI.config.landing;
        UI.after = null;
        if (location.hash === target) route(); else location.hash = target;
      }
      return r;
    });
  };
  /* Update the signed-in user's details (e.g. a new name) and redraw the header, without reloading the page. */
  UI.setMe = function (me) {
    UI.me = me || null;
    if (shellRoot) renderChrome(current.name);
  };

  /* ------------------------------------------------------------------ pages and routing */
  UI.page = function (name, opts, mount) {
    if (typeof opts === 'function') { mount = opts; opts = {}; }
    opts.name = name; opts.mount = mount;
    UI.pages[name] = opts;
  };
  UI.allowed = function (p) {
    if (!p) return false;
    if (p.auth === 'user') return !!UI.me;
    if (p.auth === 'admin') return !!(UI.me && UI.me.is_admin);
    if (p.auth === 'guest') return !UI.me;
    return true;
  };
  UI.navPages = function () {
    return Object.keys(UI.pages).map(function (k) { return UI.pages[k]; })
      .filter(function (p) { return p.nav && UI.allowed(p) && (!p.when || p.when()); })
      .sort(function (a, b) { return (a.order || 50) - (b.order || 50); });
  };
  UI.parseHash = function () {
    var h = (location.hash || '').replace(/^#!?\/?/, '');
    var parts = h.split('?')[0].split('/').filter(function (x) { return x !== ''; }).map(decodeURIComponent);
    return { name: parts[0] || '', args: parts.slice(1) };
  };
  UI.hashFor = function (name) {
    var args = Array.prototype.slice.call(arguments, 1).filter(function (a) { return a != null && a !== ''; });
    return '#' + [name].concat(args.map(encodeURIComponent)).join('/');
  };
  UI.go = function (name) {
    var h = UI.hashFor.apply(null, arguments);
    if (location.hash === h) route(); else location.hash = h;
  };
  UI.refresh = function () { route(); };
  UI.after = null;  // where to go after signing in

  var shellRoot = null, view = null, current = { name: null, destroy: null }, routeSeq = 0;

  function defaultPage() { return UI.me ? UI.config.home : UI.config.landing; }

  function route() {
    var r = UI.parseHash(), name = r.name || defaultPage(), p = UI.pages[name];
    if (!p) { name = defaultPage(); p = UI.pages[name]; r.args = []; }
    if (p.auth === 'guest' && UI.me) { p = UI.pages[UI.config.home]; name = UI.config.home; r.args = []; }
    if ((p.auth === 'user' || p.auth === 'admin') && !UI.me) {
      UI.after = location.hash && location.hash !== '#' ? location.hash : null;
      p = UI.pages.auth; name = 'auth'; r.args = [];
    }
    if (p.auth === 'admin' && !(UI.me && UI.me.is_admin)) {
      UI.toast('That page is for admins only.', 'error');
      p = UI.pages[UI.config.home]; name = UI.config.home; r.args = [];
    }
    var seq = ++routeSeq;
    window.UI_READY = false;
    if (current.destroy) { try { current.destroy(); } catch (e) { console.error(e); } }
    current = { name: name, args: r.args, destroy: null };
    if (shellRoot) {
      shellRoot.className = 'ui ui-shell page-' + name + (UI.me ? ' signed-in' : ' signed-out') + (p.chrome === false ? ' no-chrome' : '');
      renderChrome(name);
    }
    // A fresh element for every page, so listeners a page adds to `view` never pile up.
    var fresh = view.cloneNode(false);
    view.parentNode.replaceChild(fresh, view);
    view = fresh;
    window.scrollTo(0, 0);
    document.title = (p.title ? (typeof p.title === 'function' ? p.title(r.args) : p.title) + ' · ' : '') + UI.config.name;
    var ctx = { name: name, args: r.args, me: UI.me, go: UI.go, api: UI.api, page: p };
    var out;
    try { out = p.mount(view, ctx); } catch (e) { console.error(e); out = Promise.reject(e); }
    var ready = out && typeof out.then === 'function' ? out : (out && out.ready) || Promise.resolve();
    if (out && out.destroy) current.destroy = out.destroy;
    Promise.resolve(ready).then(function () { if (seq === routeSeq) window.UI_READY = true; },
      function (e) {
        if (seq !== routeSeq) return;
        console.error(e);
        if (!view.innerHTML) view.innerHTML = '<div class="ui-wrap"><div class="ui-empty">' + UI.icon('info') +
          '<h3>This page didn\'t load</h3><p class="muted">' + UI.esc(e && e.message || 'Something went wrong.') + '</p>' +
          '<button class="ui-btn" onclick="UI.refresh()">Try again</button></div></div>';
        window.UI_READY = true;
      });
  }
  UI.current = function () { return current; };

  /* The shell's parts come from web/app.js: UI.shell = {header(me, active), footer(me), tabbar(me, active)} */
  function renderChrome(active) {
    var S = UI.shell || {};
    var hd = shellRoot.querySelector('[data-ui-header]'), ft = shellRoot.querySelector('[data-ui-footer]'), tb = shellRoot.querySelector('[data-ui-tabbar]');
    if (hd) hd.innerHTML = S.header ? S.header(UI.me, active) : '';
    if (ft) ft.innerHTML = S.footer ? S.footer(UI.me, active) : '';
    if (tb) tb.innerHTML = S.tabbar ? S.tabbar(UI.me, active) : '';
  }
  UI.renderChrome = function () { if (shellRoot) renderChrome(current.name); };

  /* Called by client_code/Main.py (and by the local harness) once the page is up. */
  UI.start = function (node, bridgeFn, bootJson) {
    bridge = bridgeFn;
    var boot = typeof bootJson === 'string' ? JSON.parse(bootJson || '{}') : (bootJson || {});
    UI.me = boot.me || null;
    if (boot.api) UI.apiOrigin = boot.api;  // where @anvil.server.http_endpoint lives (<app>/_/api)
    var host = node && node.matches && node.matches('[data-ui-app]') ? node : (node && node.querySelector('[data-ui-app]')) || node || document.body;
    host.innerHTML = '<div class="ui ui-shell">' +
      '<header class="ui-header" data-ui-header></header>' +
      '<main class="ui-main" data-ui-view></main>' +
      '<footer class="ui-footer" data-ui-footer></footer>' +
      '<nav class="ui-tabbar" data-ui-tabbar aria-label="Main"></nav></div>';
    shellRoot = host.firstChild;
    view = host.querySelector('[data-ui-view]');
    if (UI.shell && UI.shell.wire) UI.shell.wire(shellRoot);
    window.addEventListener('hashchange', route);
    route();
  };

  /* ------------------------------------------------------------------ feedback form (footer + menu) */
  UI.feedback = function (kind) {
    var kinds = [['bug', 'Something\'s broken', 'bug'], ['idea', 'An idea', 'bulb'], ['question', 'A question', 'info'], ['other', 'Something else', 'chat']];
    var m = UI.modal('<h2>Send feedback</h2><p class="muted">Found a bug or have an idea? It goes straight to the people who make ' + UI.esc(UI.config.name) + '.</p>' +
      '<form class="ui-stack" data-fb>' +
      '<div class="ui-choices">' + kinds.map(function (k) {
        return '<label class="ui-choice"><input type="radio" name="kind" value="' + k[0] + '"' + ((kind || 'bug') === k[0] ? ' checked' : '') + '>' +
          '<span>' + UI.icon(k[2]) + UI.esc(k[1]) + '</span></label>';
      }).join('') + '</div>' +
      '<label class="ui-field"><span>What happened, or what would you like?</span><textarea name="message" rows="5" required minlength="5" placeholder="The more detail, the better."></textarea></label>' +
      (UI.me ? '' : '<label class="ui-field"><span>Your email <em>(optional, if you\'d like a reply)</em></span><input type="email" name="email" autocomplete="email"></label>') +
      '<p class="ui-hint">We also send the page you were on, your screen size and browser, to help us fix bugs.</p>' +
      '<div class="ui-row end"><button type="button" class="ui-btn ghost" data-close>Cancel</button><button class="ui-btn primary" type="submit">' + UI.icon('arrow') + 'Send</button></div></form>');
    var form = m.el.querySelector('[data-fb]');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = UI.formData(form);
      var ctx = { page: location.hash || '#', screen: innerWidth + 'x' + innerHeight, browser: navigator.userAgent.slice(0, 280), theme: UI.theme() };
      UI.busy(form.querySelector('[type=submit]'), UI.api('submit_feedback', v.kind, v.message, v.email || null, ctx)).then(function () {
        m.close(); UI.toast('Thank you! Your message was sent.', 'ok');
      });
    });
    return m;
  };

  /* Shared clicks: [data-go="page/arg"], [data-feedback], [data-theme-set] anywhere in the app. */
  document.addEventListener('click', function (e) {
    var el = e.target.closest && e.target.closest('[data-go],[data-feedback],[data-theme-set]');
    if (!el) return;
    if (el.hasAttribute('data-go')) { e.preventDefault(); UI.go.apply(null, el.getAttribute('data-go').split('/')); }
    else if (el.hasAttribute('data-feedback')) { e.preventDefault(); UI.feedback(el.getAttribute('data-feedback') || null); }
    else if (el.hasAttribute('data-theme-set')) { e.preventDefault(); UI.setTheme(el.getAttribute('data-theme-set')); if (UI.shell && UI.shell.onTheme) UI.shell.onTheme(); }
  });
})();


/* app.js: this app's identity and frame: name, header, footer, phone tab bar.
   Pages live in web/pages/*.html (the ToonyLoony engine is in the _tl_*.html files). The engine (window.UI) is web/core.js.
   ToonyLoony works without an account (guests' toons stay in their browser), so the nav shows for guests too,
   except on the landing and sign-in pages. */
(function () {
  'use strict';
  UI.configure({
    name: 'ToonyLoony',
    key: 'toonyloony',          // prefix for this app's browser storage
    tagline: 'Build it. Bend it. Hold it. Film it. 🎬',   // footer line
    home: 'home',                // first page after signing in
    landing: 'landing'           // first page for visitors who aren't signed in
  });

  var esc = UI.esc;
  function inApp(active) { return !!UI.me || (active !== 'landing' && active !== 'auth'); }

  function brand() {
    return '<a class="ui-brand" href="#" data-go="' + (UI.me ? UI.config.home : UI.config.landing) + '" aria-label="' + esc(UI.config.name) + ' home">' +
      '<img src="_/theme/icon.svg" alt="" width="36" height="36"><span>Toony<b>Loony</b></span></a>';
  }

  function themeSwitch() {
    var t = UI.theme();
    return '<div class="ui-seg" role="group" aria-label="Appearance">' + [['auto', 'Auto'], ['light', 'Light'], ['dark', 'Dark']].map(function (o) {
      return '<button type="button" data-theme-set="' + o[0] + '" class="' + (t === o[0] ? 'on' : '') + '">' + o[1] + '</button>';
    }).join('') + '</div>';
  }

  function userMenu(me) {
    return '<div class="ui-menu" data-menu hidden>' +
      '<div class="ui-menu-head"><strong>' + esc(me.name) + '</strong><span class="muted small">' + esc(me.email) + '</span></div>' +
      '<a href="#profile" data-go="profile">' + UI.icon('user') + 'Your profile</a>' +
      (me.is_admin ? '<a href="#admin" data-go="admin">' + UI.icon('shield') + 'Admin</a>' : '') +
      '<div class="ui-menu-block"><span class="small muted">Appearance</span>' + themeSwitch() + '</div>' +
      '<button type="button" data-feedback>' + UI.icon('chat') + 'Send feedback</button>' +
      '<button type="button" data-lk-open="overview">' + UI.icon('lock') + 'Privacy &amp; Terms</button>' +
      '<button type="button" data-signout>' + UI.icon('logout') + 'Sign out</button></div>';
  }

  UI.shell = {
    header: function (me, active) {
      var nav = UI.navPages();
      return '<div class="ui-header-in">' + brand() +
        (inApp(active) ? '<nav class="ui-nav" aria-label="Main">' + nav.map(function (p) {
          return '<a href="#' + p.name + '" class="' + (p.name === active ? 'on' : '') + '">' + UI.icon(p.icon) + '<span>' + esc(p.nav) + '</span></a>';
        }).join('') + '</nav>' : '') +
        '<div class="ui-header-right">' +
        (me ? '<button type="button" class="ui-avatar-btn" data-menu-toggle aria-label="Your account" aria-haspopup="true">' + esc(UI.initials(me.name)) + '</button>' + userMenu(me)
          : (active === 'auth' ? '' : '<a class="ui-btn ghost" href="#auth" data-go="auth">Sign in</a>' +
             (inApp(active) ? '' : '<a class="ui-btn yellow" href="#home" data-go="home">Start making</a>'))) +
        '</div></div>';
    },
    footer: function (me) {
      return '<div class="ui-footer-in"><div class="ui-footer-brand">' + brand() + '<p class="muted small">' + esc(UI.config.tagline) + '</p></div>' +
        '<div class="ui-footer-links">' +
        '<a href="#landing" data-go="landing">About</a>' +
        '<a href="#theater" data-go="theater">Theater</a>' +
        '<button type="button" data-feedback>Send feedback</button>' +
        '<button type="button" data-lk-open="overview">Privacy &amp; Terms</button>' +
        '</div><p class="ui-footer-legal small muted">© ' + new Date().getFullYear() + ' ' + esc(UI.config.name) + ' · Made by Arkvital</p></div>';
    },
    tabbar: function (me, active) {
      var nav = UI.navPages();
      if (!inApp(active) || nav.length < 2) return '';
      return nav.slice(0, 4).map(function (p) {
        return '<a href="#' + p.name + '" class="' + (p.name === active ? 'on' : '') + '">' + UI.icon(p.icon) + '<span>' + esc(p.nav) + '</span></a>';
      }).join('') + (me ? '<a href="#profile" class="' + (active === 'profile' ? 'on' : '') + '">' + UI.icon('user') + '<span>You</span></a>'
        : '<a href="#auth" class="' + (active === 'auth' ? 'on' : '') + '">' + UI.icon('user') + '<span>Sign in</span></a>');
    },
    wire: function (root) {
      root.addEventListener('click', function (e) {
        var t = e.target.closest('[data-menu-toggle]');
        var menu = root.querySelector('[data-menu]');
        if (t && menu) { menu.hidden = !menu.hidden; t.setAttribute('aria-expanded', String(!menu.hidden)); return; }
        if (e.target.closest('[data-signout]')) { UI.auth('logout').then(function () { UI.toast('Signed out. See you soon!'); }); }
        if (menu && !menu.hidden && !e.target.closest('[data-menu] .ui-seg')) menu.hidden = true;
      });
      document.addEventListener('keydown', function (e) {
        var menu = root.querySelector('[data-menu]');
        if (e.key === 'Escape' && menu) menu.hidden = true;
      });
    },
    onTheme: function () {  // redraw the menu's Auto/Light/Dark buttons and keep the menu open
      var menu = document.querySelector('[data-menu]'), open = menu && !menu.hidden;
      UI.renderChrome();
      if (open) document.querySelector('[data-menu]').hidden = false;
    }
  };
})();


/* ===== _tl_audio.html ===== */
(function () {
  'use strict';
  var TL = window.TL = window.TL || {};
  var SR = 22050;

  /* ------------------------------------------------------------------ the shared AudioContext (made on first use) */
  var actx = null;
  TL.audioCtx = function () {
    if (!actx) {
      var C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      actx = new C();
      try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
    }
    if (actx.state === 'suspended') { try { actx.resume(); } catch (e) {} }
    return actx;
  };

  /* ------------------------------------------------------------------ tiny synth (works in any (Offline)AudioContext) */
  function note(n) {
    if (typeof n === 'number') return n;
    var m = /^([A-G])(#|b)?(-?\d)$/.exec(n); if (!m) return 440;
    var semi = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
    return 440 * Math.pow(2, ((+m[3] + 1) * 12 + semi - 69) / 12);
  }
  TL.noteFreq = note;
  var noiseCache = new WeakMap();
  function noiseBuf(ctx) {
    if (noiseCache.has(ctx)) return noiseCache.get(ctx);
    var b = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), d = b.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    noiseCache.set(ctx, b); return b;
  }
  function env(ctx, g, t, a, dur, vol, curve) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + Math.max(.002, a));
    if (curve === 'lin') g.gain.linearRampToValueAtTime(0.0001, t + dur);
    else g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(a + .01, dur));
  }
  function filt(ctx, type, f, q) { var x = ctx.createBiquadFilter(); x.type = type; x.frequency.value = f; x.Q.value = q || 1; return x; }
  /* tone: {type, f, f1 (slide to), t, dur, vol, a, curve, vib: [rate, depth], lp, detune} */
  function tone(ctx, dest, o) {
    var t = o.t || 0, osc = ctx.createOscillator(), g = ctx.createGain(), last = g;
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(note(o.f), t);
    if (o.f1) (o.slide === 'lin' ? osc.frequency.linearRampToValueAtTime(note(o.f1), t + (o.sd || o.dur)) : osc.frequency.exponentialRampToValueAtTime(note(o.f1), t + (o.sd || o.dur)));
    if (o.detune) osc.detune.value = o.detune;
    if (o.vib) { var l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = o.vib[0]; lg.gain.value = o.vib[1]; l.connect(lg); lg.connect(osc.frequency); l.start(t); l.stop(t + o.dur + .05); }
    osc.connect(g);
    if (o.lp) { var f = filt(ctx, 'lowpass', o.lp, o.q || .8); g.connect(f); last = f; if (o.lp1) { f.frequency.setValueAtTime(o.lp, t); f.frequency.exponentialRampToValueAtTime(o.lp1, t + o.dur); } }
    last.connect(dest);
    env(ctx, g, t, o.a || .005, o.dur, o.vol == null ? .5 : o.vol, o.curve);
    osc.start(t); osc.stop(t + o.dur + .05);
  }
  /* noise: {t, dur, vol, a, type (filter), f, f1, q, curve} */
  function noise(ctx, dest, o) {
    var t = o.t || 0, s = ctx.createBufferSource(), g = ctx.createGain(), f = filt(ctx, o.type || 'lowpass', o.f || 2000, o.q || .7);
    s.buffer = noiseBuf(ctx); s.loop = true;
    if (o.f1) { f.frequency.setValueAtTime(o.f, t); f.frequency.exponentialRampToValueAtTime(o.f1, t + (o.sd || o.dur)); }
    s.connect(f); f.connect(g); g.connect(dest);
    env(ctx, g, t, o.a || .003, o.dur, o.vol == null ? .5 : o.vol, o.curve);
    s.start(t, Math.random()); s.stop(t + o.dur + .05);
  }
  var DRUM = {
    kick: function (ctx, d, t, v) { tone(ctx, d, { f: 150, f1: 45, t: t, dur: .28, vol: .9 * v, sd: .12 }); },
    snare: function (ctx, d, t, v) { noise(ctx, d, { t: t, dur: .16, vol: .45 * v, type: 'highpass', f: 1200 }); tone(ctx, d, { f: 210, f1: 150, t: t, dur: .1, vol: .3 * v, type: 'triangle' }); },
    hat: function (ctx, d, t, v) { noise(ctx, d, { t: t, dur: .05, vol: .22 * v, type: 'highpass', f: 7000 }); },
    clap: function (ctx, d, t, v) { [0, .012, .024].forEach(function (k) { noise(ctx, d, { t: t + k, dur: .1, vol: .35 * v, type: 'bandpass', f: 1500, q: 1.2 }); }); },
    crash: function (ctx, d, t, v) { noise(ctx, d, { t: t, dur: 1.4, vol: .3 * v, type: 'highpass', f: 5000 }); }
  };
  var INST = {
    pluck: function (ctx, d, t, f, dur, v) { tone(ctx, d, { type: 'triangle', f: f, t: t, dur: .32, vol: .32 * v }); tone(ctx, d, { type: 'square', f: f, t: t, dur: .12, vol: .06 * v, lp: 2600 }); },
    pizz: function (ctx, d, t, f, dur, v) { tone(ctx, d, { type: 'triangle', f: f, t: t, dur: .16, vol: .42 * v, lp: 1800 }); },
    bass: function (ctx, d, t, f, dur, v) { tone(ctx, d, { type: 'square', f: f, t: t, dur: Math.max(.18, dur * .9), vol: .22 * v, lp: 520, curve: 'lin' }); },
    sub: function (ctx, d, t, f, dur, v) { tone(ctx, d, { type: 'sine', f: f, t: t, dur: Math.max(.15, dur * .95), vol: .55 * v, curve: 'lin' }); },
    lead: function (ctx, d, t, f, dur, v) { tone(ctx, d, { type: 'square', f: f, t: t, a: .01, dur: Math.max(.12, dur * .92), vol: .12 * v, lp: 2400, vib: [6, 4], curve: 'lin' }); },
    brass: function (ctx, d, t, f, dur, v) { tone(ctx, d, { type: 'sawtooth', f: f, t: t, a: .03, dur: Math.max(.15, dur * .95), vol: .16 * v, lp: 700, lp1: 2200, vib: [5, 3], curve: 'lin' }); },
    pad: function (ctx, d, t, f, dur, v) { [-8, 8].forEach(function (dt) { tone(ctx, d, { type: 'sawtooth', f: f, t: t, a: .35, dur: dur + .3, vol: .06 * v, lp: 1100, detune: dt, curve: 'lin' }); }); },
    bell: function (ctx, d, t, f, dur, v) { tone(ctx, d, { f: f, t: t, dur: 1.2, vol: .22 * v }); tone(ctx, d, { f: note(f) * 2.01, t: t, dur: .6, vol: .07 * v }); },
    organ: function (ctx, d, t, f, dur, v) { [1, 2, 3].forEach(function (h, i) { tone(ctx, d, { f: note(f) * h, t: t, a: .04, dur: dur, vol: [.14, .06, .04][i] * v, curve: 'lin', vib: [5.5, 2] }); }); },
    piano: function (ctx, d, t, f, dur, v) { tone(ctx, d, { type: 'triangle', f: f, t: t, dur: 1.4, vol: .26 * v }); tone(ctx, d, { f: note(f) * 2, t: t, dur: .5, vol: .06 * v }); }
  };
  /* A pattern string: one token per step. '.' rest, '-' hold the previous note, 'x' drum hit, or a note like C4. */
  function seq(ctx, dest, bpm, tracks) {
    var step = 60 / bpm / 4;
    tracks.forEach(function (tr) {
      var toks = tr[1].trim().split(/\s+/), vol = tr[2] == null ? 1 : tr[2];
      toks.forEach(function (tk, i) {
        if (tk === '.' || tk === '-') return;
        var len = 1; while (toks[i + len] === '-') len++;
        var t = i * step;
        if (DRUM[tr[0]]) { if (tk !== '.') DRUM[tr[0]](ctx, dest, t, tk === 'X' ? 1.3 * vol : vol); }
        else tk.split('+').forEach(function (n) { INST[tr[0]](ctx, dest, t, n, len * step, vol); });
      });
    });
  }
  function rep(s, n) { var o = []; for (var i = 0; i < n; i++) o.push(s); return o.join(' '); }
  /* Spread chords over bars: chords like 'C4+E4+G4', one per bar, as an arpeggio pattern of chord tone indexes. */
  function arp(chords, pat) {
    return chords.map(function (c) { var ns = c.split('+'); return pat.split(' ').map(function (k) { return k === '.' || k === '-' ? k : ns[+k % ns.length]; }).join(' '); }).join(' ');
  }
  function bars(notes) { return notes.join(' '); }

  /* ------------------------------------------------------------------ premade sounds */
  var SOUNDS = [
    ['boing', 'Boing', '🦘', .8, function (c, d) { tone(c, d, { f: 160, f1: 340, t: 0, dur: .7, sd: .5, vol: .7, vib: [16, 60] }); }],
    ['pop', 'Pop', '🫧', .25, function (c, d) { tone(c, d, { f: 900, f1: 180, t: 0, dur: .09, sd: .06, vol: .8 }); noise(c, d, { t: 0, dur: .02, vol: .3, f: 4000 }); }],
    ['whoosh', 'Whoosh', '💨', .9, function (c, d) { noise(c, d, { t: 0, dur: .8, vol: .6, a: .3, type: 'bandpass', f: 300, f1: 2800, q: 1.4, curve: 'lin' }); }],
    ['zip', 'Zip', '⚡', .3, function (c, d) { tone(c, d, { f: 380, f1: 2600, t: 0, dur: .2, sd: .16, vol: .4, type: 'triangle' }); }],
    ['slideup', 'Slide up', '⬆️', 1, function (c, d) { tone(c, d, { f: 300, f1: 1500, t: 0, dur: .95, sd: .9, vol: .45, vib: [7, 12], a: .05 }); }],
    ['slidedown', 'Slide down', '⬇️', 1.1, function (c, d) { tone(c, d, { f: 1500, f1: 240, t: 0, dur: 1.05, sd: 1, vol: .45, vib: [7, 12], a: .05 }); }],
    ['bonk', 'Bonk', '🔨', .45, function (c, d) { tone(c, d, { f: 190, f1: 55, t: 0, dur: .35, sd: .2, vol: .9 }); tone(c, d, { f: 620, t: 0, dur: .07, vol: .25, type: 'square', lp: 1500 }); noise(c, d, { t: 0, dur: .05, vol: .3, f: 1800 }); }],
    ['ding', 'Ding', '🔔', 1.6, function (c, d) { tone(c, d, { f: 1320, t: 0, dur: 1.6, vol: .4 }); tone(c, d, { f: 2640, t: 0, dur: .8, vol: .12 }); tone(c, d, { f: 3960, t: 0, dur: .4, vol: .06 }); }],
    ['zap', 'Zap', '🔫', .4, function (c, d) { tone(c, d, { f: 1900, f1: 110, t: 0, dur: .35, sd: .3, vol: .25, type: 'square', lp: 3000 }); }],
    ['splash', 'Splash', '💦', 1.2, function (c, d) { noise(c, d, { t: 0, dur: 1, vol: .7, f: 3500, f1: 400, a: .01 }); [0.2, .35, .5, .6, .8].forEach(function (t, i) { tone(c, d, { f: 600 + i * 150, f1: 1200 + i * 200, t: t, dur: .08, vol: .15 }); }); }],
    ['drumroll', 'Drum roll', '🥁', 2.2, function (c, d) { for (var t = 0; t < 1.5; t += .045) DRUM.snare(c, d, t, .25 + t * .45); DRUM.crash(c, d, 1.55, 1.2); DRUM.kick(c, d, 1.55, 1); }],
    ['rimshot', 'Ba-dum-tss', '😂', 1.6, function (c, d) { DRUM.snare(c, d, 0, 1); DRUM.kick(c, d, .22, 1); DRUM.snare(c, d, .22, .5); DRUM.crash(c, d, .44, 1); }],
    ['tada', 'Ta-da!', '🎉', 1.5, function (c, d) { ['C5', 'E5', 'G5'].forEach(function (n) { INST.brass(c, d, 0, n, .14, 1.4); }); ['C5', 'E5', 'G5', 'C6'].forEach(function (n) { INST.brass(c, d, .2, n, 1.1, 1.4); }); DRUM.crash(c, d, .2, .8); }],
    ['sad', 'Wah wah waaah', '😢', 2.6, function (c, d) { [['D4', 0, .42], ['C#4', .48, .42], ['C4', .96, .42], ['B3', 1.44, 1.1]].forEach(function (n, i) { tone(c, d, { type: 'sawtooth', f: n[0], t: n[1], a: .04, dur: n[2], vol: .25, lp: 900, lp1: i === 3 ? 400 : 1300, vib: i === 3 ? [6, 6] : null, curve: 'lin' }); }); }],
    ['steps', 'Footsteps', '👣', 1.3, function (c, d) { for (var i = 0; i < 4; i++) { var t = i * .3; noise(c, d, { t: t, dur: .09, vol: .5, f: 900 }); tone(c, d, { f: 90, f1: 50, t: t, dur: .1, vol: .5 }); } }],
    ['honk', 'Honk honk', '📯', .9, function (c, d) { [0, .42].forEach(function (t) { tone(c, d, { f: 420, f1: 470, t: t, dur: .3, vol: .18, type: 'square', lp: 1800, curve: 'lin' }); tone(c, d, { f: 530, f1: 590, t: t, dur: .3, vol: .12, type: 'square', lp: 1800, curve: 'lin' }); }); }],
    ['applause', 'Applause', '👏', 2.6, function (c, d) { var r = 0; for (var t = 0; t < 2.3; t += .018) { r = (r * 9301 + 49297) % 233280; var k = r / 233280; noise(c, d, { t: t + k * .02, dur: .05, vol: .13 * (t > 1.8 ? (2.3 - t) * 2 : 1), type: 'bandpass', f: 1000 + k * 1600, q: 1.5 }); } }],
    ['magic', 'Magic', '✨', 1.6, function (c, d) { ['C6', 'E6', 'G6', 'C7', 'E7', 'G7'].forEach(function (n, i) { INST.bell(c, d, i * .07, n, .2, .8); }); noise(c, d, { t: 0, dur: 1, vol: .06, type: 'highpass', f: 8000, a: .3 }); }],
    ['boom', 'Boom', '💥', 1.8, function (c, d) { noise(c, d, { t: 0, dur: 1.6, vol: .9, f: 600, f1: 50 }); tone(c, d, { f: 80, f1: 30, t: 0, dur: 1, vol: .9 }); }],
    ['bark', 'Woof!', '🐶', .7, function (c, d) { [0, .3].forEach(function (t) { tone(c, d, { type: 'sawtooth', f: 520, f1: 280, t: t, dur: .14, sd: .12, vol: .35, lp: 1100, q: 3 }); noise(c, d, { t: t, dur: .08, vol: .2, type: 'bandpass', f: 900 }); }); }],
    ['squeak', 'Squeak', '🐭', .3, function (c, d) { tone(c, d, { f: 1900, f1: 2700, t: 0, dur: .1, sd: .08, vol: .3 }); tone(c, d, { f: 2700, f1: 1800, t: .1, dur: .1, sd: .1, vol: .3 }); }],
    ['crickets', 'Crickets', '🦗', 2.2, function (c, d) { for (var i = 0; i < 4; i++) for (var j = 0; j < 3; j++) tone(c, d, { f: 4600, t: i * .55 + j * .06, dur: .04, vol: .12 }); }]
  ];
  TL.SOUNDS = SOUNDS.map(function (s) { return { id: 'b:s_' + s[0], name: s[1], emoji: s[2], dur: s[3], kind: 'sound', render: s[4] }; });

  /* ------------------------------------------------------------------ premade music loops (4 bars each) */
  var MUSIC = [
    ['sunny', 'Sunny Day', '☀️', 112, function (c, d) {
      var ch = ['C4+E4+G4', 'G3+B3+D4', 'A3+C4+E4', 'F3+A3+C4'];
      seq(c, d, 112, [['pluck', arp(ch, '0 1 2 1 0 1 2 1 0 1 2 1 0 1 2 1'), .8],
        ['bass', bars(['C3 . . . C3 . G2 . C3 . . . G2 . . .', 'G2 . . . G2 . D3 . G2 . . . D3 . . .', 'A2 . . . A2 . E3 . A2 . . . E3 . . .', 'F2 . . . F2 . C3 . F2 . . . C3 . . .']), 1],
        ['lead', 'E5 - . G5 . E5 D5 - C5 - . . . . . . D5 - . G5 . D5 B4 - G4 - . . . . . . C5 - . E5 . C5 A4 - E5 - . D5 C5 - . . A4 - . C5 . A4 G4 - F4 - . . . . . .', .9],
        ['kick', rep('x . . . . . . . x . . . . . . .', 4)], ['snare', rep('. . . . x . . . . . . . x . . .', 4), .7], ['hat', rep('. . x . . . x . . . x . . . x .', 4), .8]]);
    }],
    ['chase', 'Big Chase', '🏃', 160, function (c, d) {
      seq(c, d, 160, [['bass', bars(['A2 A2 A3 A2 A2 A2 A3 A2 A2 A2 A3 A2 A2 A2 A3 A2', 'F2 F2 F3 F2 F2 F2 F3 F2 F2 F2 F3 F2 F2 F2 F3 F2', 'G2 G2 G3 G2 G2 G2 G3 G2 G2 G2 G3 G2 G2 G2 G3 G2', 'E2 E2 E3 E2 E2 E2 E3 E2 E2 E2 E3 E2 G#2 G#2 G#3 G#2']), 1],
        ['lead', 'A4 . C5 . E5 . A5 - G5 . E5 . C5 . D5 - F4 . A4 . C5 . F5 - E5 . C5 . A4 . C5 - G4 . B4 . D5 . G5 - F5 . D5 . B4 . D5 - E5 - . . E5 . . . G#5 - . . B5 - . .', .9],
        ['kick', rep('x . . . x . . . x . . . x . . .', 4)], ['snare', rep('. . . . x . . . . . . . x . x x', 4), .7], ['hat', rep('x x x x x x x x x x x x x x x x', 4), .5]]);
    }],
    ['sneaky', 'Sneaky Steps', '🤫', 96, function (c, d) {
      seq(c, d, 96, [['pizz', bars(['D3 . . . F3 . . . A3 . . . G#3 . . .', 'G3 . . . A#3 . . . A3 . . . F3 . . .', 'D3 . . . F3 . . . A3 . . . C4 . . .', 'A#3 . . . A3 . . . G#3 . . . A3 . . .']), 1.2],
        ['pizz', '. . D5 . . . F5 . . . E5 . D5 . . . . . G5 . . . F5 . E5 . . . D5 . . . . . D5 . . . F5 . . . A5 . G#5 . A5 . . . A#5 . A5 . G5 . F5 . E5 . . .', .8],
        ['hat', rep('. . x . . . x . . . x . . . x .', 4), .4], ['kick', rep('x . . . . . . . x . . . . . . .', 4), .6]]);
    }],
    ['spooky', 'Spooky Manor', '👻', 84, function (c, d) {
      seq(c, d, 84, [['organ', bars(['E3+G3+B3 - - - - - - - - - - - - - - -', 'C3+E3+G3 - - - - - - - - - - - - - - -', 'A2+C3+E3 - - - - - - - - - - - - - - -', 'B2+D#3+F#3 - - - - - - - - - - - - - - -']), 1],
        ['bell', 'E5 . . . G5 . . . F#5 . . . D#5 . . . E5 . . . C5 . . . B4 . . . G4 . . . A4 . . . C5 . . . E5 . . . D#5 . . . F#5 . . . D#5 . . . B4 . . . . . . .', .9]]);
    }],
    ['space', 'Space Float', '🪐', 90, function (c, d) {
      var ch = ['D4+F#4+A4+C#5', 'B3+D4+F#4+A4', 'G3+B3+D4+F#4', 'A3+C#4+E4+G4'];
      seq(c, d, 90, [['pad', ch.map(function (x) { return x + ' - - - - - - - - - - - - - - -'; }).join(' '), 1],
        ['bell', arp(ch, '0 . 1 . 2 . 3 . 2 . 1 . 3 . 2 .').replace(/([A-G]#?)(\d)/g, function (m, a, o) { return a + (+o + 1); }), .5],
        ['sub', bars(['D2 - - - - - - - - - - - - - - -', 'B1 - - - - - - - - - - - - - - -', 'G1 - - - - - - - - - - - - - - -', 'A1 - - - - - - - - - - - - - - -']), .7]]);
    }],
    ['hero', 'Hero Time', '🦸', 120, function (c, d) {
      seq(c, d, 120, [['brass', 'C4 - . G3 C4 - E4 - G4 - - - E4 - C4 - F4 - . C4 F4 - A4 - C5 - - - A4 - F4 - G4 - . D4 G4 - B4 - D5 - - - B4 - G4 - C5 - - - G4 - E4 - C5 - - - - - - -', 1],
        ['bass', bars(['C3 . . . G2 . . . C3 . . . G2 . . .', 'F2 . . . C3 . . . F2 . . . C3 . . .', 'G2 . . . D3 . . . G2 . . . D3 . . .', 'C3 . . . G2 . . . C3 . . . . . . .']), 1],
        ['snare', rep('x . x x x . x . x . x x x . x .', 4), .5], ['kick', rep('x . . . x . . . x . . . x . . .', 4), .8]]);
    }],
    ['party', 'Dance Party', '🪩', 124, function (c, d) {
      seq(c, d, 124, [['kick', rep('X . . . X . . . X . . . X . . .', 4)], ['clap', rep('. . . . x . . . . . . . x . . .', 4), .9], ['hat', rep('. . x . . . x . . . x . . . x .', 4), .9],
        ['sub', bars(['A1 . A2 . . A1 . A2 A1 . A2 . . A1 A2 .', 'F1 . F2 . . F1 . F2 F1 . F2 . . F1 F2 .', 'C2 . C3 . . C2 . C3 C2 . C3 . . C2 C3 .', 'G1 . G2 . . G1 . G2 G1 . G2 . . G1 G2 .']), .9],
        ['lead', 'A4 . A4 . C5 . A4 . E5 - D5 . C5 . . . A4 . A4 . C5 . A4 . F5 - E5 . C5 . . . C5 . C5 . E5 . C5 . G5 - F5 . E5 . . . D5 . D5 . B4 . G4 . B4 - D5 . G5 . . .', .8]]);
    }],
    ['rain', 'Sad Rain', '🌧️', 70, function (c, d) {
      var ch = ['A3+C4+E4', 'F3+A3+C4', 'C3+E3+G3', 'G3+B3+D4'];
      seq(c, d, 70, [['piano', arp(ch, '0 . 1 . 2 . 1 . 0 . 1 . 2 . 1 .'), 1], ['piano', bars(['A2 - - - - - - - - - - - - - - -', 'F2 - - - - - - - - - - - - - - -', 'C2 - - - - - - - - - - - - - - -', 'G2 - - - - - - - - - - - - - - -']), .8]]);
    }]
  ];
  TL.MUSIC = MUSIC.map(function (m) { return { id: 'b:m_' + m[0], name: m[1], emoji: m[2], bpm: m[3], dur: 64 * 60 / m[3] / 4, kind: 'music', render: m[4] }; });
  TL.builtinAudio = function (id) { return TL.SOUNDS.concat(TL.MUSIC).filter(function (s) { return s.id === id; })[0] || null; };

  /* ------------------------------------------------------------------ getting AudioBuffers */
  var bufs = {};
  TL.getBuffer = function (ref) {
    if (!ref) return Promise.resolve(null);
    if (bufs[ref]) return bufs[ref];
    var b = TL.builtinAudio(ref), p;
    if (b) {
      var OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
      if (!OAC) return Promise.resolve(null);
      var dur = b.kind === 'music' ? b.dur : b.dur + .15, ctx = new OAC(1, Math.ceil(SR * dur), SR), out = ctx.createGain();
      out.gain.value = b.kind === 'music' ? .9 : 1; out.connect(ctx.destination);
      try { b.render(ctx, out); } catch (e) { console.error(e); }
      p = ctx.startRendering();
    } else {
      var a = TL.assetIndex[ref];
      if (!a) return Promise.resolve(null);
      p = fetch(a.url).then(function (r) { return r.arrayBuffer(); }).then(function (ab) {
        var ac = TL.audioCtx();
        return new Promise(function (res, rej) { ac.decodeAudioData(ab, res, rej); });
      });
    }
    bufs[ref] = p.catch(function (e) { console.warn('audio', ref, e); delete bufs[ref]; return null; });
    return bufs[ref];
  };
  TL.decodeBlob = function (blob) {
    return blob.arrayBuffer().then(function (ab) { var ac = TL.audioCtx(); return new Promise(function (res, rej) { ac.decodeAudioData(ab, res, rej); }); });
  };
  /* Loudness at 30 steps a second, 0..1 (for mouths that move with a voice, and waveforms). */
  var envs = new WeakMap();
  TL.envelope = function (buf) {
    if (!buf) return null;
    if (envs.has(buf)) return envs.get(buf);
    var d = buf.getChannelData(0), hop = Math.floor(buf.sampleRate / 30), n = Math.ceil(d.length / hop), out = new Float32Array(n), max = 1e-4;
    for (var i = 0; i < n; i++) { var s = 0, c = 0; for (var j = i * hop; j < Math.min(d.length, (i + 1) * hop); j += 4) { s += d[j] * d[j]; c++; } out[i] = Math.sqrt(s / Math.max(1, c)); if (out[i] > max) max = out[i]; }
    for (var k = 0; k < n; k++) out[k] = Math.min(1, out[k] / max * 1.15);
    envs.set(buf, out); return out;
  };
  TL.drawWave = function (cv, buf, color) {
    var ctx = cv.getContext('2d'), w = cv.width, h = cv.height, e = TL.envelope(buf);
    ctx.clearRect(0, 0, w, h); if (!e) return;
    ctx.fillStyle = color || '#4757ff';
    for (var x = 0; x < w; x += 3) { var v = e[Math.floor(x / w * e.length)] || 0, bh = Math.max(2, v * h * .9); ctx.fillRect(x, (h - bh) / 2, 2, bh); }
  };
  TL.clipLen = function (clip, buf) {
    if (clip.kind === 'music') return clip.len || (buf ? buf.duration : 8);
    var d = buf ? buf.duration : ((TL.builtinAudio(clip.asset) || TL.assetIndex[clip.asset] || {}).dur || 1);
    return d / (clip.rate || 1);
  };

  /* ------------------------------------------------------------------ previews (library, pickers) */
  var preview = null;
  TL.stopPreview = function () { if (preview) { try { preview.stop(); } catch (e) {} preview = null; } };
  TL.preview = function (ref, opts) {
    TL.stopPreview(); opts = opts || {};
    var ac = TL.audioCtx(); if (!ac) return Promise.resolve();
    return TL.getBuffer(ref).then(function (buf) {
      if (!buf) return;
      var s = ac.createBufferSource(); s.buffer = buf; s.playbackRate.value = opts.rate || 1;
      var g = ac.createGain(); g.gain.value = opts.vol == null ? .9 : opts.vol;
      s.connect(fx(ac, g, opts.fx)); g.connect(ac.destination);
      s.start(); if (TL.builtinAudio(ref) && TL.builtinAudio(ref).kind === 'music') s.stop(ac.currentTime + Math.min(buf.duration, 8));
      preview = s; s.onended = function () { if (preview === s) preview = null; if (opts.onend) opts.onend(); };
    });
  };
  /* Voice effects: robot (ring modulation), echo. Returns the node to connect the source into. */
  function fx(ac, dest, kind) {
    if (kind === 'robot') {
      var g = ac.createGain(), o = ac.createOscillator(), og = ac.createGain();
      g.gain.value = 0; o.frequency.value = 55; o.type = 'square'; og.gain.value = 1; o.connect(og); og.connect(g.gain); o.start();
      g.connect(dest); return g;
    }
    if (kind === 'echo') {
      var inp = ac.createGain(), dl = ac.createDelay(1), fb = ac.createGain();
      dl.delayTime.value = .22; fb.gain.value = .38; inp.connect(dest); inp.connect(dl); dl.connect(fb); fb.connect(dl); dl.connect(dest);
      return inp;
    }
    return dest;
  }
  TL.VOICE_FX = [['normal', 'Normal', '🙂', 1, ''], ['giant', 'Giant', '🦣', .72, ''], ['chipmunk', 'Chipmunk', '🐿️', 1.45, ''], ['mouse', 'Tiny', '🐭', 1.8, ''], ['robot', 'Robot', '🤖', 1, 'robot'], ['echo', 'Echo', '🏔️', 1, 'echo']];

  /* ------------------------------------------------------------------ the movie mixer
     m = TL.mixer(movie); m.start(fromSec[, {extraDest, mute}]); m.stop(). Buffers must be loaded first (TL.preloadAudio). */
  TL.preloadAudio = function (movie) {
    var refs = {}; (movie.clips || []).forEach(function (c) { refs[c.asset] = 1; });
    return Promise.all(Object.keys(refs).map(TL.getBuffer));
  };
  TL.mixer = function (movie) {
    var nodes = [], ac = null, master = null;
    return {
      start: function (from, opts) {
        this.stop(); opts = opts || {};
        ac = TL.audioCtx(); if (!ac) return;
        master = ac.createGain(); master.gain.value = opts.mute ? 0 : .95; master.connect(ac.destination);
        if (opts.extraDest) master.connect(opts.extraDest);
        var now = ac.currentTime + .03;
        (movie.clips || []).forEach(function (c) {
          if (c.muted) return;
          var p = bufs[c.asset]; if (!p) return;
          p.then(function (buf) {
            if (!buf || !master) return;
            var len = TL.clipLen(c, buf), end = c.t + len, rate = c.rate || 1;
            var tNow = from + Math.max(0, ac.currentTime - now);  // the movie time right now (a buffer may arrive late)
            if (end <= tNow) return;
            var s = ac.createBufferSource(); s.buffer = buf; s.playbackRate.value = rate;
            var g = ac.createGain(); g.gain.value = c.vol == null ? (c.kind === 'music' ? .55 : 1) : c.vol;
            s.connect(fx(ac, g, c.fx)); g.connect(master);
            var when, off;
            if (c.t >= tNow) { when = now + (c.t - from); off = 0; } else { when = Math.max(now, ac.currentTime); off = tNow - c.t; }
            if (c.kind === 'music') { s.loop = true; s.start(when, (off * rate) % buf.duration); s.stop(when + (end - Math.max(tNow, c.t))); }
            else { s.start(when, off * rate); }
            nodes.push(s);
          });
        });
      },
      stop: function () {
        nodes.forEach(function (n) { try { n.stop(); } catch (e) {} });
        nodes = [];
        if (master) { try { master.disconnect(); } catch (e) {} master = null; }
      }
    };
  };
  /* How open each actor's mouth is at time t: voices linked to the actor (their loudness), or a speech bubble. */
  TL.mouthAt = function (movie, actorId, t) {
    var m = 0;
    (movie.clips || []).forEach(function (c) {
      if (c.actor !== actorId || c.kind !== 'voice' || c.muted) return;
      var p = bufs[c.asset], buf = p && p._buf;
      if (!buf) { if (p && !p._hooked) { p._hooked = true; p.then(function (b) { p._buf = b; }); } return; }
      var local = (t - c.t) * (c.rate || 1);
      if (local < 0 || local > buf.duration) return;
      var e = TL.envelope(buf), v = e[Math.floor(local * 30)] || 0;
      m = Math.max(m, v > .12 ? Math.min(1, v * 1.3) : 0);
    });
    (movie.bubbles || []).forEach(function (b) {
      if (b.actor !== actorId || t < b.t0 || t > b.t1 || b.style === 'think') return;
      m = Math.max(m, .55 + .45 * Math.sin(t * 22));
    });
    return m;
  };

  /* ------------------------------------------------------------------ microphone recorder (only while you hold "record") */
  TL.micRecorder = function () {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.MediaRecorder) {
      return Promise.reject(Object.assign(new Error('This browser can\'t record sound. Try Chrome, Edge, Firefox or Safari.'), { uiApi: true }));
    }
    return navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }).then(function (stream) {
      var types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'], type = types.filter(function (t) { return MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t); })[0];
      var rec = new MediaRecorder(stream, type ? { mimeType: type } : {}), chunks = [], t0 = performance.now();
      var ac = TL.audioCtx(), an = ac.createAnalyser(); an.fftSize = 512; var src = ac.createMediaStreamSource(stream); src.connect(an);
      var data = new Uint8Array(an.fftSize);
      rec.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
      rec.start(100);
      function off() { stream.getTracks().forEach(function (t) { t.stop(); }); try { src.disconnect(); } catch (e) {} }
      return {
        level: function () { an.getByteTimeDomainData(data); var m = 0; for (var i = 0; i < data.length; i++) m = Math.max(m, Math.abs(data[i] - 128)); return m / 128; },
        elapsed: function () { return (performance.now() - t0) / 1000; },
        stop: function () {
          return new Promise(function (res) {
            rec.onstop = function () { off(); var blob = new Blob(chunks, { type: (rec.mimeType || type || 'audio/webm').split(';')[0] }); res({ blob: blob, dur: (performance.now() - t0) / 1000 }); };
            try { rec.stop(); } catch (e) { off(); res(null); }
          });
        },
        cancel: function () { try { rec.onstop = null; rec.stop(); } catch (e) {} off(); }
      };
    }, function (e) {
      var msg = e && e.name === 'NotAllowedError' ? 'ToonyLoony needs your microphone to record a voice. Allow it in your browser and try again.' : 'No microphone found.';
      throw Object.assign(new Error(msg), { uiApi: true });
    });
  };
  /* For uploads: how long is this sound file? */
  TL.audioDuration = function (blob) { return TL.decodeBlob(blob).then(function (b) { return b.duration; }, function () { return 0; }); };
})();

/* ===== _tl_core.html ===== */
(function () {
  'use strict';
  var TL = window.TL = window.TL || {};
  TL.W = 1280; TL.H = 720;
  TL.MAX_DUR = 120;

  /* ------------------------------------------------------------------ helpers */
  TL.uid = function (prefix) {
    var a = 'abcdefghijklmnopqrstuvwxyz0123456789', s = '', r;
    try { r = crypto.getRandomValues(new Uint8Array(12)); } catch (e) { r = []; for (var j = 0; j < 12; j++) r.push(Math.floor(Math.random() * 256)); }
    for (var i = 0; i < 12; i++) s += a[r[i] % 36];
    return prefix + '_' + s;
  };
  TL.clone = function (o) { return o == null ? o : JSON.parse(JSON.stringify(o)); };
  TL.clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  TL.lerp = function (a, b, u) { return a + (b - a) * u; };
  TL.fmtTime = function (s, tenths) {
    s = Math.max(0, s || 0);
    var m = Math.floor(s / 60), r = s - m * 60;
    return m + ':' + (r < 10 ? '0' : '') + (tenths ? r.toFixed(1) : Math.floor(r));
  };
  TL.guest = function () { return !UI.me; };
  TL.apiOrigin = function () { return UI.apiOrigin || (location.origin + '/_/api'); };
  TL.mediaUrl = function (key) { return TL.apiOrigin() + '/media?k=' + encodeURIComponent(key); };
  TL.sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  TL.hash = function (s) { var h = 0; s = String(s); for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); };
  TL.pick = function (a) { return a[Math.floor(Math.random() * a.length)]; };
  TL.confetti = function (x, y) {
    var colors = ['#ff4fa3', '#ffc532', '#4757ff', '#1fbf63', '#2fa8ff', '#ff8a2b'];
    for (var i = 0; i < 26; i++) {
      var d = document.createElement('i');
      d.style.cssText = 'position:fixed;z-index:2000;pointer-events:none;width:9px;height:13px;border-radius:2px;left:' + (x || innerWidth / 2) + 'px;top:' + (y || innerHeight / 3) + 'px;background:' + colors[i % 6];
      document.body.appendChild(d);
      var a = Math.random() * Math.PI * 2, v = 120 + Math.random() * 220;
      d.animate([{ transform: 'translate(0,0) rotate(0)' }, { transform: 'translate(' + Math.cos(a) * v + 'px,' + (Math.sin(a) * v + 240) + 'px) rotate(' + (Math.random() * 720) + 'deg)', opacity: 0 }],
        { duration: 1100 + Math.random() * 500, easing: 'cubic-bezier(.2,.7,.4,1)' }).onfinish = (function (el) { return function () { el.remove(); }; })(d);
    }
  };
  /* A canvas sized for crisp drawing at the device's pixel ratio; draw in CSS pixels. */
  TL.sizeCanvas = function (cv, w, h) {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    var ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return ctx;
  };

  /* ------------------------------------------------------------------ guest storage: IndexedDB (in-memory if the browser refuses) */
  var mem = { docs: {}, blobs: {} }, dbp = null, useMem = false;
  function db() {
    if (useMem) return Promise.reject(new Error('mem'));
    if (!dbp) dbp = new Promise(function (res, rej) {
      try {
        var r = indexedDB.open('toonyloony', 1);
        r.onupgradeneeded = function () { var d = r.result; d.createObjectStore('docs', { keyPath: 'key' }); d.createObjectStore('blobs', { keyPath: 'id' }); };
        r.onsuccess = function () { res(r.result); };
        r.onerror = function () { rej(r.error); };
        r.onblocked = function () { rej(new Error('blocked')); };
      } catch (e) { rej(e); }
    }).catch(function (e) {
      useMem = true;
      UI.toast('This browser won\'t let ToonyLoony save here (private window?). Your toons last until you close the tab.', 'error');
      throw e;
    });
    return dbp;
  }
  function idb(store, mode, fn) {
    return db().then(function (d) {
      return new Promise(function (res, rej) {
        var t = d.transaction(store, mode), req = fn(t.objectStore(store));
        t.oncomplete = function () { res(req && 'result' in req ? req.result : undefined); };
        t.onerror = function () { rej(t.error); };
        t.onabort = function () { rej(t.error || new Error('Saving failed (is the device full?)')); };
      });
    }, function () {
      // in-memory fallback with the same operations
      var m = mem[store];
      return fn({
        getAll: function () { return { result: Object.keys(m).map(function (k) { return m[k]; }) }; },
        get: function (k) { return { result: m[k] }; },
        put: function (v) { m[v.key || v.id] = v; return { result: v.key || v.id }; },
        delete: function (k) { delete m[k]; return {}; },
        clear: function () { mem[store] = {}; return {}; }
      }).result;
    });
  }
  var local = {
    all: function (kind) { return idb('docs', 'readonly', function (s) { return s.getAll(); }).then(function (rows) { return (rows || []).filter(function (r) { return r.kind === kind; }).map(function (r) { return r.doc; }); }); },
    get: function (kind, id) { return idb('docs', 'readonly', function (s) { return s.get(kind + ':' + id); }).then(function (r) { return r ? r.doc : null; }); },
    put: function (kind, doc) { return idb('docs', 'readwrite', function (s) { return s.put({ key: kind + ':' + doc.id, kind: kind, id: doc.id, doc: doc }); }); },
    del: function (kind, id) { return idb('docs', 'readwrite', function (s) { return s.delete(kind + ':' + id); }); },
    blobs: function () { return idb('blobs', 'readonly', function (s) { return s.getAll(); }).then(function (r) { return r || []; }); },
    putBlob: function (rec) { return idb('blobs', 'readwrite', function (s) { return s.put(rec); }); },
    delBlob: function (id) { return idb('blobs', 'readwrite', function (s) { return s.delete(id); }); }
  };
  TL.local = local;

  function charSummary(d) { return { id: d.id, name: d.name, thumb: d.thumb || null, anims: (d.anims || []).length, starter: d.starter || '', custom: !!d.custom, updated: d.updated || null }; }
  function movieSummary(d) {
    return { id: d.id, name: d.name, thumb: d.thumb || null, dur: d.dur || 0, actors: (d.actors || []).length, clips: (d.clips || []).length, takes: (d.actors || []).reduce(function (n, a) { return n + (a.takes || []).length; }, 0),
      shared: false, share_key: null, featured: false, views: 0, updated: d.updated || null };
  }
  function newest(a, b) { return String(b.updated || '').localeCompare(String(a.updated || '')); }
  var blobUrls = {};
  function localAsset(r) {
    if (!blobUrls[r.id]) blobUrls[r.id] = URL.createObjectURL(r.blob);
    return { id: r.id, kind: r.kind, name: r.name, dur: r.dur || 0, size: r.size || (r.blob && r.blob.size) || 0, mime: r.mime || (r.blob && r.blob.type) || '', url: blobUrls[r.id], local: true, created: r.created };
  }
  function serverAsset(a) { return Object.assign({}, a, { url: TL.mediaUrl(a.key) }); }

  /* ------------------------------------------------------------------ TL.store: the same calls for guests and members */
  TL.assetIndex = {};
  function indexAssets(list) { list.forEach(function (a) { TL.assetIndex[a.id] = a; }); return list; }
  TL.store = {
    home: function () {
      if (TL.guest()) return Promise.all([local.all('char'), local.all('movie')]).then(function (r) {
        return { chars: r[0].map(charSummary).sort(newest), movies: r[1].map(movieSummary).sort(newest), local: true };
      });
      return UI.api('toons_home');
    },
    chars: function () {
      if (TL.guest()) return local.all('char').then(function (l) { return l.sort(newest); });
      return UI.api('chars_full').then(function (r) { return r.chars; });
    },
    getChar: function (id) {
      if (TL.isPreset(id)) return Promise.resolve(TL.clone(TL.PRESETS[id]));
      if (TL.guest()) return local.get('char', id);
      return UI.api('char_get', id).then(function (r) { return r.char; }, function (e) { if (e.expected) return null; throw e; });
    },
    saveChar: function (doc, quiet) {
      doc.updated = new Date().toISOString();
      if (TL.guest()) return local.put('char', TL.clone(doc)).then(function () { return doc; });
      return (quiet ? UI.apiQuiet('char_save', doc) : UI.api('char_save', doc)).then(function () { return doc; });
    },
    delChar: function (id) { return TL.guest() ? local.del('char', id) : UI.api('char_delete', id); },
    getMovie: function (id) {
      if (TL.guest()) return local.get('movie', id).then(function (m) { return m ? { movie: m, shared: false } : null; });
      return UI.api('movie_get', id).then(function (r) { return r; }, function (e) { if (e.expected) return null; throw e; });
    },
    saveMovie: function (doc, quiet) {
      doc.updated = new Date().toISOString();
      if (TL.guest()) return local.put('movie', TL.clone(doc)).then(function () { return doc; });
      return (quiet ? UI.apiQuiet('movie_save', doc) : UI.api('movie_save', doc)).then(function () { return doc; });
    },
    delMovie: function (id) { return TL.guest() ? local.del('movie', id) : UI.api('movie_delete', id); },
    shareMovie: function (id, flag) { return UI.api('movie_share', id, !!flag); },
    assets: function () {
      if (TL.guest()) return local.blobs().then(function (rows) { return indexAssets(rows.map(localAsset).sort(function (a, b) { return String(b.created).localeCompare(String(a.created)); })); });
      return UI.api('asset_list').then(function (r) { return indexAssets(r.assets.map(serverAsset)); });
    },
    addAsset: function (blob, meta) {
      var rec = { id: TL.uid('a'), kind: meta.kind, name: meta.name || 'My file', dur: meta.dur || 0, size: blob.size, mime: blob.type, created: new Date().toISOString() };
      if (TL.guest()) {
        if (blob.size > 8e6) return Promise.reject(Object.assign(new Error('That file is too big (the limit is 8 MB).'), { uiApi: true }));
        rec.blob = blob;
        return local.putBlob(rec).then(function () { var a = localAsset(rec); TL.assetIndex[a.id] = a; return a; });
      }
      return UI.upload('asset_upload', blob, { id: rec.id, kind: rec.kind, name: rec.name, dur: rec.dur }).then(function (r) {
        var a = serverAsset(r.asset); TL.assetIndex[a.id] = a; return a;
      });
    },
    renameAsset: function (id, name) {
      if (TL.guest()) return local.blobs().then(function (rows) { var r = rows.filter(function (x) { return x.id === id; })[0]; if (!r) return; r.name = name; return local.putBlob(r); });
      return UI.api('asset_rename', id, name);
    },
    delAsset: function (id) { delete TL.assetIndex[id]; return TL.guest() ? local.delBlob(id) : UI.api('asset_delete', id); }
  };

  /* ------------------------------------------------------------------ moving a guest's toons into their new account */
  TL.guestStuff = function () {
    return Promise.all([local.all('char'), local.all('movie'), local.blobs()]).then(function (r) { return { chars: r[0], movies: r[1], blobs: r[2] }; },
      function () { return { chars: [], movies: [], blobs: [] }; });
  };
  TL.importGuest = function (progress) {
    return TL.guestStuff().then(function (g) {
      var steps = [], done = 0, total = g.blobs.length + g.chars.length + g.movies.length;
      g.blobs.forEach(function (b) { steps.push(function () { return UI.upload('asset_upload', b.blob, { id: b.id, kind: b.kind, name: b.name, dur: b.dur }).catch(function () {}); }); });
      g.chars.forEach(function (c) { steps.push(function () { return UI.apiQuiet('char_save', c); }); });
      g.movies.forEach(function (m) { steps.push(function () { return UI.apiQuiet('movie_save', m); }); });
      return steps.reduce(function (p, step) {
        return p.then(step).then(function () { done++; if (progress) progress(done, total); });
      }, Promise.resolve()).then(function () {
        return Promise.all(g.chars.map(function (c) { return local.del('char', c.id); }).concat(g.movies.map(function (m) { return local.del('movie', m.id); }), g.blobs.map(function (b) { return local.delBlob(b.id); })));
      }).then(function () { return total; });
    });
  };
})();

/* ===== _tl_movie.html ===== */
(function () {
  'use strict';
  var TL = window.TL = window.TL || {};
  var W = 1280, H = 720;

  TL.newMovie = function (name) {
    return { id: TL.uid('m'), name: name || 'My cartoon', v: 1, dur: 20, bg: 'b:park', depth: true, actors: [], clips: [], bubbles: [] };
  };
  TL.newActor = function (ch, x, y) {
    var walk = TL.findAnim(ch, 'walk') ? 'walk' : (TL.findAnim(ch, 'slither') ? 'slither' : ((ch.anims || [])[0] || {}).id);
    return { id: TL.uid('x'), char: ch.id, name: ch.name, x: Math.round(x), y: Math.round(y), s: 1.3, z: 0, flip: false, idle: 'idle',
      rec: { anim: walk || 'idle', speed: 1 }, face: 'auto', takes: [] };
  };
  TL.charFor = function (chars, ref) { return (chars && chars[ref]) || TL.PRESETS[ref] || TL.PRESETS.p_blox; };
  TL.GROUND = 560;

  /* ------------------------------------------------------------------ where is an actor at time t */
  function sortTakes(a) { (a.takes || []).sort(function (x, y) { return x.t0 - y.t0; }); }
  function interp(pts, t) {
    var lo = 0, hi = pts.length - 1;
    if (t <= pts[0][0]) return pts[0];
    if (t >= pts[hi][0]) return pts[hi];
    while (hi - lo > 1) { var mid = (lo + hi) >> 1; if (pts[mid][0] <= t) lo = mid; else hi = mid; }
    var a = pts[lo], b = pts[hi], u = (t - a[0]) / Math.max(1e-6, b[0] - a[0]);
    return [t, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u, u < .5 ? a[3] : b[3]];
  }
  TL.actorAt = function (a, t) {
    var takes = a.takes || [], cur = null, before = null;
    for (var i = 0; i < takes.length; i++) {
      var k = takes[i];
      if (t >= k.t0 && t <= k.t1) { cur = k; break; }
      if (k.t1 < t && (!before || k.t1 > before.t1)) before = k;
    }
    if (cur && cur.pts && cur.pts.length) {
      var p = interp(cur.pts, t);
      return { x: p[1], y: p[2], f: p[3] || 1, take: cur, anim: cur.anim, speed: cur.speed || 1, local: t - cur.t0 };
    }
    var hold = before ? before.pts[before.pts.length - 1] : (takes.length && takes[0].pts.length ? takes[0].pts[0] : null);
    if (hold) return { x: hold[1], y: hold[2], f: hold[3] || 1, take: null, anim: a.idle || 'idle', speed: 1, local: t };
    return { x: a.x, y: a.y, f: a.flip ? -1 : 1, take: null, anim: a.idle || 'idle', speed: 1, local: t };
  };
  /* Put a new take in, cutting away whatever the actor did in the same time. */
  TL.insertTake = function (a, take) {
    var out = [];
    (a.takes || []).forEach(function (k) {
      if (k.t1 <= take.t0 || k.t0 >= take.t1) { out.push(k); return; }
      if (k.t0 < take.t0) { var left = TL.clone(k); left.id = TL.uid('k'); left.pts = k.pts.filter(function (p) { return p[0] < take.t0; }); if (left.pts.length > 1) { left.t1 = left.pts[left.pts.length - 1][0]; out.push(left); } }
      if (k.t1 > take.t1) { var right = TL.clone(k); right.id = TL.uid('k'); right.pts = k.pts.filter(function (p) { return p[0] > take.t1; }); if (right.pts.length > 1) { right.t0 = right.pts[0][0]; out.push(right); } }
    });
    out.push(take);
    a.takes = out; sortTakes(a);
  };
  /* Facing from movement: right (1) or left (-1), keeping the last direction while standing still. */
  TL.faceFromMotion = function (pts, start) {
    var f = start || 1;
    for (var i = 0; i < pts.length; i++) {
      var j = i; while (j > 0 && pts[i][0] - pts[j][0] < .15) j--;
      var dx = pts[i][1] - pts[j][1];
      if (Math.abs(dx) > 6) f = dx > 0 ? 1 : -1;
      pts[i][3] = f;
    }
    return pts;
  };
  TL.movieEnd = function (movie) {
    var end = 0;
    (movie.actors || []).forEach(function (a) { (a.takes || []).forEach(function (k) { end = Math.max(end, k.t1); }); });
    (movie.bubbles || []).forEach(function (b) { end = Math.max(end, b.t1); });
    return end;
  };

  /* ------------------------------------------------------------------ drawing a frame */
  function blinkAt(id, t) { var ph = (TL.hash(id) % 1000) / 1000 * 3.6, k = (t + ph) % 3.7; return k < .07 ? k / .07 : k < .14 ? 1 - (k - .07) / .07 : 0; }
  function wrap(ctx, text, max) {
    var words = String(text || '').split(/\s+/), lines = [], cur = '';
    words.forEach(function (w) { var test = cur ? cur + ' ' + w : w; if (ctx.measureText(test).width > max && cur) { lines.push(cur); cur = w; } else cur = test; });
    if (cur) lines.push(cur);
    return lines.slice(0, 5);
  }
  function drawBubble(ctx, b, ax, ay, now) {
    var shout = b.style === 'shout', think = b.style === 'think', caption = ax == null;
    ctx.save();
    ctx.font = (shout ? '400 34px "Lilita One", ' : '800 27px Nunito, ') + 'sans-serif';
    var lines = wrap(ctx, shout ? String(b.text).toUpperCase() : b.text, caption ? 900 : 320), lh = shout ? 38 : 33;
    var tw = Math.max.apply(null, lines.map(function (l) { return ctx.measureText(l).width; }).concat([40])), pad = 20;
    var bw = tw + pad * 2, bh = lines.length * lh + pad * 1.4;
    var pop = Math.min(1, (now - b.t0) / .18), sc = .6 + .4 * pop + (pop < 1 ? 0 : 0);
    var x, y;
    if (caption) { x = W / 2 - bw / 2; y = H - bh - 26; }
    else { x = TL.clamp(ax - bw / 2 + 30, 12, W - bw - 12); y = TL.clamp(ay - bh - 46, 12, H - bh - 12); }
    ctx.translate(x + bw / 2, y + bh / 2); ctx.scale(sc, sc); ctx.translate(-(x + bw / 2), -(y + bh / 2));
    ctx.lineWidth = 4; ctx.strokeStyle = '#1a1d3a'; ctx.lineJoin = 'round';
    if (caption) {
      TL.rr(ctx, x, y, bw, bh, 14); ctx.fillStyle = 'rgba(26,29,58,.82)'; ctx.fill();
      ctx.fillStyle = '#ffffff';
    } else if (shout) {
      ctx.beginPath(); var cx = x + bw / 2, cy = y + bh / 2, n = 18;
      for (var i = 0; i < n * 2; i++) { var a = i / (n * 2) * Math.PI * 2, r = i % 2 ? 1 : 1.18; ctx.lineTo(cx + Math.cos(a) * bw * .62 * r, cy + Math.sin(a) * bh * .78 * r); }
      ctx.closePath(); ctx.fillStyle = '#fff36b'; ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx - 14, y + bh + 6); ctx.lineTo(ax + 10, ay - 18); ctx.lineTo(cx + 18, y + bh + 4); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#d6243f';
    } else if (think) {
      ctx.fillStyle = '#ffffff';
      TL.rr(ctx, x, y, bw, bh, bh / 2.2); ctx.fill(); ctx.stroke();
      [[.0, 12], [.45, 8], [.8, 5]].forEach(function (c) { var px = TL.lerp(x + bw / 2, ax + 10, c[0] + .2), py = TL.lerp(y + bh + 10, ay - 16, c[0] + .2); ctx.beginPath(); ctx.arc(px, py, c[1], 0, Math.PI * 2); ctx.fill(); ctx.stroke(); });
      ctx.fillStyle = '#1a1d3a';
    } else {
      ctx.fillStyle = '#ffffff';
      var tx = TL.clamp(ax + 10, x + 24, x + bw - 24);
      ctx.beginPath(); ctx.moveTo(x + 18, y); ctx.lineTo(x + bw - 18, y); ctx.quadraticCurveTo(x + bw, y, x + bw, y + 18); ctx.lineTo(x + bw, y + bh - 18); ctx.quadraticCurveTo(x + bw, y + bh, x + bw - 18, y + bh);
      ctx.lineTo(tx + 14, y + bh); ctx.lineTo(TL.clamp(ax + 4, tx - 30, tx + 30), Math.min(ay - 14, y + bh + 40)); ctx.lineTo(tx - 10, y + bh);
      ctx.lineTo(x + 18, y + bh); ctx.quadraticCurveTo(x, y + bh, x, y + bh - 18); ctx.lineTo(x, y + 18); ctx.quadraticCurveTo(x, y, x + 18, y); ctx.closePath();
      ctx.fill(); ctx.stroke(); ctx.fillStyle = '#1a1d3a';
    }
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    lines.forEach(function (l, i) { ctx.fillText(l, x + bw / 2, y + pad * .7 + i * lh + (shout ? 2 : 0)); });
    ctx.restore();
  }
  /* Draw the movie at time t into a context already scaled to 1280x720. Returns hit boxes per actor.
     o: {sel (actor id), live: {actorId: {x, y, f, anim, speed, local}} (recording), paths (bool), noBubbles} */
  TL.renderFrame = function (ctx, movie, chars, t, o) {
    o = o || {};
    TL.drawBackground(ctx, movie.bg, W, H);
    var list = (movie.actors || []).map(function (a) {
      var st = (o.live && o.live[a.id]) || TL.actorAt(a, t);
      return { a: a, st: st };
    });
    list.sort(function (p, q) { return movie.depth !== false ? (p.st.y + (p.a.z || 0) * 1000) - (q.st.y + (q.a.z || 0) * 1000) : (p.a.z || 0) - (q.a.z || 0); });
    if (o.paths && o.sel) {
      var sa = (movie.actors || []).filter(function (a) { return a.id === o.sel; })[0];
      if (sa) {
        ctx.save(); ctx.setLineDash([10, 9]); ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(71,87,255,.75)'; ctx.lineCap = 'round';
        (sa.takes || []).forEach(function (k) { ctx.beginPath(); k.pts.forEach(function (p, i) { if (i) ctx.lineTo(p[1], p[2] + 40); else ctx.moveTo(p[1], p[2] + 40); }); ctx.stroke(); });
        ctx.setLineDash([]);
        (sa.takes || []).forEach(function (k) { var p = k.pts[0]; ctx.beginPath(); ctx.arc(p[1], p[2] + 40, 7, 0, Math.PI * 2); ctx.fillStyle = '#4757ff'; ctx.fill(); });
        ctx.restore();
      }
    }
    var hits = [];
    list.forEach(function (it) {
      var a = it.a, st = it.st, ch = TL.charFor(chars, a.char), anim = TL.findAnim(ch, st.anim);
      var pose = TL.animPose(ch, anim, st.local, st.speed), s = (a.s || 1), flip = st.f < 0;
      var mouth = TL.mouthAt ? TL.mouthAt(movie, a.id, t) : 0;
      TL.drawChar(ctx, ch, pose, { x: st.x, y: st.y, s: s, flip: flip, t: t, mouth: mouth, blink: blinkAt(a.id, t), shadow: TL.footY(ch) });
      var bb = TL.bounds(ch, pose), bx = flip ? st.x - (bb.x + bb.w) * s : st.x + bb.x * s;
      var hit = { id: a.id, x: bx, y: st.y + bb.y * s, w: bb.w * s, h: bb.h * s, cx: st.x, cy: st.y };
      hits.push(hit);
      if (o.sel === a.id) {
        ctx.save(); ctx.setLineDash([8, 6]); ctx.lineWidth = 3; ctx.strokeStyle = o.recording ? '#ff3048' : '#4757ff';
        TL.rr(ctx, hit.x - 8, hit.y - 8, hit.w + 16, hit.h + 16, 16); ctx.stroke(); ctx.restore();
      }
    });
    if (!o.noBubbles) (movie.bubbles || []).forEach(function (b) {
      if (t < b.t0 || t > b.t1 || !b.text) return;
      var h = b.actor ? hits.filter(function (x) { return x.id === b.actor; })[0] : null;
      if (b.actor && !h) return;
      drawBubble(ctx, b, h ? h.cx : null, h ? h.y : null, t);
    });
    return hits;
  };

  /* ------------------------------------------------------------------ pictures */
  TL.movieCanvas = function (movie, chars, t, w, h) {
    var cv = document.createElement('canvas'); cv.width = w || 320; cv.height = h || 180;
    var ctx = cv.getContext('2d'); ctx.scale(cv.width / W, cv.height / H);
    TL.renderFrame(ctx, movie, chars, t == null ? Math.min(1.5, (movie.dur || 2) / 2) : t, {});
    return cv;
  };
  TL.movieThumb = function (movie, chars, t) {
    try { return TL.movieCanvas(movie, chars, t, 320, 180).toDataURL('image/jpeg', .72); } catch (e) { return null; }
  };
  /* Characters a movie needs, from a list of the user's own (presets are built in). */
  TL.charMap = function (list) { var m = {}; (list || []).forEach(function (c) { m[c.id] = c; }); return m; };

  /* ------------------------------------------------------------------ the player (Watch page, Theater, previews) */
  TL.player = function (host, movie, chars, opts) {
    opts = opts || {};
    host.innerHTML = '<div class="tl-player"><canvas width="1280" height="720" aria-label="' + UI.esc(movie.name || 'Cartoon') + '"></canvas>' +
      '<div class="big"><span>▶</span></div>' +
      '<div class="bar"><button type="button" data-pp aria-label="Play">▶</button><button type="button" class="ghosty" data-restart aria-label="Start again">⏮</button>' +
      '<input type="range" min="0" max="1000" value="0" data-scrub aria-label="Time"><span class="time" data-time></span>' +
      '<button type="button" class="ghosty" data-full aria-label="Full screen">⛶</button></div></div>';
    var root = host.firstChild, cv = root.querySelector('canvas'), ctx = cv.getContext('2d'), scrub = root.querySelector('[data-scrub]');
    var t = opts.start || 0, playing = false, raf = 0, last = 0, mixer = TL.mixer(movie), dur = Math.max(1, movie.dur || TL.movieEnd(movie) || 5), dead = false;
    function draw() {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      TL.renderFrame(ctx, movie, chars, t, {});
      scrub.value = Math.round(t / dur * 1000);
      root.querySelector('[data-time]').textContent = TL.fmtTime(t) + ' / ' + TL.fmtTime(dur);
    }
    function tick(now) {
      if (!playing || dead) return;
      t += (now - last) / 1000; last = now;
      if (t >= dur) { t = dur; pause(); draw(); if (opts.onEnd) opts.onEnd(); return; }
      draw(); raf = requestAnimationFrame(tick);
    }
    function play() {
      if (playing) return;
      if (t >= dur - .05) t = 0;
      playing = true; root.classList.add('playing'); root.querySelector('[data-pp]').textContent = '⏸';
      TL.audioCtx(); mixer.start(t);
      last = performance.now(); raf = requestAnimationFrame(tick);
    }
    function pause() { playing = false; root.classList.remove('playing'); root.querySelector('[data-pp]').textContent = '▶'; cancelAnimationFrame(raf); mixer.stop(); }
    function seek(v) { var was = playing; if (was) pause(); t = TL.clamp(v, 0, dur); draw(); if (was) play(); }
    root.addEventListener('click', function (e) {
      if (e.target.closest('[data-pp]') || e.target === cv) { playing ? pause() : play(); }
      else if (e.target.closest('[data-restart]')) seek(0);
      else if (e.target.closest('[data-full]')) { if (document.fullscreenElement) document.exitFullscreen(); else if (root.requestFullscreen) root.requestFullscreen(); }
    });
    scrub.addEventListener('input', function () { seek(scrub.value / 1000 * dur); });
    var ready = TL.preloadAudio(movie).then(function () {
      var imgs = [movie.bg].filter(function (r) { return r && TL.assetIndex[r]; }).map(TL.loadImage);
      return Promise.all(imgs);
    }).then(draw);
    draw();
    return { play: play, pause: pause, seek: seek, ready: ready, destroy: function () { dead = true; pause(); }, time: function () { return t; } };
  };

  /* ------------------------------------------------------------------ export a video file (real time, in the browser) */
  TL.canExport = function () { return !!(window.MediaRecorder && HTMLCanvasElement.prototype.captureStream); };
  TL.exportVideo = function (movie, chars, onProgress, cancelled) {
    var cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    var ctx = cv.getContext('2d'), dur = Math.max(1, movie.dur || TL.movieEnd(movie) || 5);
    return TL.preloadAudio(movie).then(function () {
      var stream = cv.captureStream(30), ac = TL.audioCtx(), dest = ac && ac.createMediaStreamDestination ? ac.createMediaStreamDestination() : null;
      var tracks = stream.getVideoTracks().concat(dest ? dest.stream.getAudioTracks() : []);
      var types = ['video/mp4;codecs=avc1,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
      var type = types.filter(function (x) { return MediaRecorder.isTypeSupported(x); })[0] || '';
      var rec = new MediaRecorder(new MediaStream(tracks), type ? { mimeType: type, videoBitsPerSecond: 5e6 } : {}), chunks = [];
      rec.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
      var mixer = TL.mixer(movie);
      return new Promise(function (resolve, reject) {
        rec.onstop = function () {
          mixer.stop();
          var mime = (rec.mimeType || type || 'video/webm').split(';')[0];
          resolve({ blob: new Blob(chunks, { type: mime }), ext: mime.indexOf('mp4') >= 0 ? 'mp4' : 'webm' });
        };
        rec.onerror = function (e) { mixer.stop(); reject(e.error || new Error('Recording the video failed.')); };
        TL.renderFrame(ctx, movie, chars, 0, {});
        rec.start(250);
        if (dest) mixer.start(0, { extraDest: dest });
        var t0 = performance.now();
        (function frame() {
          var t = (performance.now() - t0) / 1000;
          if (cancelled && cancelled()) { rec.stop(); return; }
          TL.renderFrame(ctx, movie, chars, Math.min(t, dur), {});
          if (onProgress) onProgress(Math.min(1, t / dur));
          if (t >= dur + .25) { rec.stop(); return; }
          requestAnimationFrame(frame);
        })();
      });
    });
  };
  TL.download = function (blob, name) {
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
  };
  TL.safeName = function (s) { return String(s || 'cartoon').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-').slice(0, 40) || 'cartoon'; };
})();

/* ===== _tl_rig.html ===== */
(function () {
  'use strict';
  var TL = window.TL = window.TL || {};
  var INK = '#1a1d3a', D2R = Math.PI / 180;

  /* ------------------------------------------------------------------ the catalogue (id, label) */
  TL.PARTS = {
    head: [['blocky', 'Blocky'], ['round', 'Round'], ['egg', 'Egg'], ['cat', 'Kitty'], ['bear', 'Bear'], ['bunny', 'Bunny'], ['dog', 'Doggo'],
           ['bird', 'Birdy'], ['robot', 'Robot'], ['alien', 'Alien']],
    eyes: [['dots', 'Dots'], ['big', 'Big'], ['happy', 'Happy'], ['sleepy', 'Sleepy'], ['angry', 'Grumpy'], ['googly', 'Googly'],
           ['shades', 'Shades'], ['hearts', 'Hearts'], ['visor', 'Visor'], ['one', 'Cyclops']],
    mouth: [['smile', 'Smile'], ['grin', 'Grin'], ['open', 'Wow'], ['teeth', 'Toothy'], ['tongue', 'Silly'], ['frown', 'Frown'],
            ['beak', 'Beak'], ['stache', 'Mustache'], ['fangs', 'Fangs']],
    hat: [['none', 'Nothing'], ['spiky', 'Spiky hair'], ['bob', 'Bob hair'], ['curly', 'Curly hair'], ['cap', 'Cap'], ['tophat', 'Top hat'],
          ['crown', 'Crown'], ['wizard', 'Wizard hat'], ['beanie', 'Beanie'], ['pirate', 'Pirate hat'], ['horns', 'Horns'], ['halo', 'Halo'],
          ['phones', 'Headphones'], ['antenna', 'Antenna'], ['bow', 'Bow']],
    torso: [['block', 'Block'], ['tee', 'T-shirt'], ['hoodie', 'Hoodie'], ['suit', 'Suit'], ['armor', 'Armor'], ['belly', 'Belly'],
            ['dress', 'Dress'], ['robot', 'Robot'], ['stick', 'Stick']],
    arms: [['block', 'Block'], ['noodle', 'Noodle'], ['stick', 'Stick'], ['robot', 'Robot'], ['striped', 'Stripy'], ['wing', 'Wings']],
    legs: [['block', 'Block'], ['noodle', 'Noodle'], ['stick', 'Stick'], ['robot', 'Robot'], ['striped', 'Stripy']],
    hands: [['mitt', 'Mitts'], ['glove', 'Gloves'], ['claw', 'Claws'], ['clamp', 'Clamps'], ['none', 'None']],
    feet: [['sneaker', 'Sneakers'], ['boot', 'Boots'], ['paw', 'Paws'], ['flipper', 'Flippers'], ['bird', 'Bird feet'], ['none', 'None']],
    extra: [['tail', 'Tail'], ['wings', 'Wings'], ['cape', 'Cape'], ['sword', 'Sword'], ['wand', 'Magic wand'], ['balloon', 'Balloon'],
            ['shield', 'Shield'], ['backpack', 'Backpack'], ['jetpack', 'Jetpack'], ['guitar', 'Guitar']]
  };
  TL.COLORS = ['#ffd23f', '#ffcf9e', '#f1b07a', '#c98a5a', '#8d5a3b', '#5a3a26', '#ff6b6b', '#ff4fa3', '#ffb3d9', '#c26bff', '#7a6bff', '#4757ff',
               '#2fa8ff', '#22d3c5', '#1fbf63', '#9be15d', '#ffa63d', '#ff8a2b', '#ffffff', '#c9ced8', '#7d8597', '#3a3f55', '#1a1d3a', '#b5651d'];
  TL.COLOR_SLOTS = [['skin', 'Skin'], ['shirt', 'Shirt'], ['pants', 'Pants'], ['shoes', 'Shoes'], ['hair', 'Hair & hat'], ['accent', 'Extra']];
  TL.SIZES = [['size', 'Height', .75, 1.3], ['width', 'Chunky', .7, 1.45], ['headSize', 'Head', .7, 1.5], ['arm', 'Arms', .7, 1.4], ['leg', 'Legs', .65, 1.45]];

  TL.DEFAULT_LOOK = { head: 'blocky', eyes: 'dots', mouth: 'smile', hat: 'none', torso: 'block', arms: 'block', legs: 'block', hands: 'mitt', feet: 'sneaker',
    skin: '#ffd23f', shirt: '#4757ff', pants: '#1fbf63', shoes: '#3a3f55', hair: '#5a3a26', accent: '#ff4fa3',
    size: 1, width: 1, headSize: 1, arm: 1, leg: 1 };

  /* ------------------------------------------------------------------ colour helpers */
  function hex(c) { c = String(c || '#888').replace('#', ''); if (c.length === 3) c = c.replace(/./g, '$&$&'); var n = parseInt(c, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  function shade(c, f) {  // f < 1 darker, > 1 lighter
    var h = hex(c), o = h.map(function (v) { return Math.round(f < 1 ? v * f : v + (255 - v) * (f - 1)); });
    return 'rgb(' + o.join(',') + ')';
  }
  TL.shade = shade;
  function lum(c) { var h = hex(c); return (h[0] * .3 + h[1] * .59 + h[2] * .11) / 255; }

  /* ------------------------------------------------------------------ canvas helpers */
  function rr(ctx, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2));
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function ell(ctx, x, y, rx, ry, rot) { ctx.beginPath(); ctx.ellipse(x, y, Math.abs(rx), Math.abs(ry), rot || 0, 0, Math.PI * 2); }
  function fs(ctx, fill) { ctx.fillStyle = fill; ctx.fill(); ctx.stroke(); }
  function fill(ctx, c) { ctx.fillStyle = c; ctx.fill(); }
  TL.rr = rr; TL.ell = ell;
  function capsule(ctx, L, W, color) {   // an outlined sausage along +x
    ctx.lineCap = 'round';
    ctx.strokeStyle = INK; ctx.lineWidth = W + 6; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(L, 0); ctx.stroke();
    ctx.strokeStyle = color; ctx.lineWidth = W; ctx.stroke();
    ctx.lineWidth = 3.2; ctx.strokeStyle = INK;
  }
  function star(ctx, x, y, r, n) {
    ctx.beginPath();
    for (var i = 0; i < (n || 5) * 2; i++) { var a = -Math.PI / 2 + i * Math.PI / (n || 5), q = i % 2 ? r * .45 : r; ctx.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); }
    ctx.closePath();
  }
  TL.star = star;

  /* ------------------------------------------------------------------ rigs: bones are listed parents first.
     A bone: {id, p: parent, len, ang (rest angle, degrees, relative to the parent unless abs), at (0..1 along the parent),
              ox/oy (offset in the parent's frame), kind, w (thickness), z (draw order), g (size group), side, cap, part, col, wig} */
  function B(id, p, len, ang, o) {
    var b = { id: id, p: p, len: len, ang: ang, at: 1, ox: 0, oy: 0, kind: 'limb', w: 16, z: 5, g: '' };
    for (var k in o) b[k] = o[k];
    return b;
  }
  var RIGS = {
    biped: function () {
      return [B('root', null, 0, 0, { kind: 'root', z: 0 }),
        B('torso', 'root', 62, -90, { kind: 'torso', w: 52, z: 10, g: 'body' }),
        B('head', 'torso', 54, 0, { kind: 'head', w: 54, z: 20, g: 'head' }),
        B('aL1', 'torso', 36, 190, { at: .9, ox: -4, oy: -8, w: 17, z: 2, g: 'arm', side: 'back', part: 'upper' }),
        B('aL2', 'aL1', 34, -12, { w: 15, z: 3, g: 'arm', side: 'back', cap: 'hand' }),
        B('lL1', 'root', 40, 94, { ox: -6, w: 19, z: 4, g: 'leg', side: 'back', part: 'upper' }),
        B('lL2', 'lL1', 38, 3, { w: 17, z: 4.5, g: 'leg', side: 'back', cap: 'foot' }),
        B('lR1', 'root', 40, 86, { ox: 6, w: 19, z: 6, g: 'leg', side: 'front', part: 'upper' }),
        B('lR2', 'lR1', 38, 3, { w: 17, z: 6.5, g: 'leg', side: 'front', cap: 'foot' }),
        B('aR1', 'torso', 36, 170, { at: .9, ox: -4, oy: 8, w: 17, z: 30, g: 'arm', side: 'front', part: 'upper' }),
        B('aR2', 'aR1', 34, -12, { w: 15, z: 31, g: 'arm', side: 'front', cap: 'hand' })];
    },
    quad: function () {
      return [B('root', null, 0, 0, { kind: 'root', z: 0 }),
        B('torso', 'root', 74, 0, { kind: 'torso', w: 46, z: 10, g: 'body' }),
        B('head', 'torso', 50, -90, { ox: 4, oy: -14, kind: 'head', w: 50, z: 20, g: 'head' }),
        B('fl1', 'torso', 24, 90, { at: .88, oy: 12, w: 16, z: 3, g: 'leg', side: 'back', part: 'upper' }),
        B('fl2', 'fl1', 22, 2, { w: 15, z: 3.5, g: 'leg', side: 'back', cap: 'foot' }),
        B('bl1', 'torso', 24, 90, { at: .1, oy: 12, w: 17, z: 3, g: 'leg', side: 'back', part: 'upper' }),
        B('bl2', 'bl1', 22, -2, { w: 15, z: 3.5, g: 'leg', side: 'back', cap: 'foot' }),
        B('fr1', 'torso', 24, 90, { at: .88, oy: 16, ox: 4, w: 16, z: 12, g: 'leg', side: 'front', part: 'upper' }),
        B('fr2', 'fr1', 22, 2, { w: 15, z: 12.5, g: 'leg', side: 'front', cap: 'foot' }),
        B('br1', 'torso', 24, 90, { at: .1, oy: 16, ox: 4, w: 17, z: 12, g: 'leg', side: 'front', part: 'upper' }),
        B('br2', 'br1', 22, -2, { w: 15, z: 12.5, g: 'leg', side: 'front', cap: 'foot' }),
        B('tail', 'torso', 40, 205, { at: 0, ox: 2, oy: -6, kind: 'extra', part: 'tail', col: 'hair', w: 14, z: 1, wig: 14 })];
    },
    worm: function () {
      return [B('root', null, 0, 0, { kind: 'root', z: 0 }),
        B('s1', 'root', 26, 0, { kind: 'seg', w: 30, z: 1, g: 'body' }),
        B('s2', 's1', 26, 0, { kind: 'seg', w: 33, z: 2, g: 'body' }),
        B('s3', 's2', 26, 0, { kind: 'seg', w: 35, z: 3, g: 'body' }),
        B('s4', 's3', 24, -20, { kind: 'seg', w: 36, z: 4, g: 'body' }),
        B('head', 's4', 52, -70, { kind: 'head', w: 52, z: 20, g: 'head', ox: 2 })];
    }
  };
  TL.RIG_OF = {};

  /* Where each extra goes: parents to try (first that exists), offsets, size, behaviour. */
  var EXTRA = {
    tail: { p: ['root', 'torso'], ang: 160, len: 46, w: 14, z: 0, col: 'hair', wig: 12 },
    wings: { p: ['torso'], at: .85, oy: -12, ang: -40, len: 50, w: 34, z: 0, col: 'accent', wig: 9, sp: 9 },
    cape: { p: ['torso'], at: 1, ox: -2, oy: -12, ang: 178, len: 74, w: 48, z: .5, col: 'accent', wig: 4, sp: 3 },
    sword: { p: ['aR2', 'head', 'torso'], ang: -96, len: 66, w: 12, z: 32, col: 'accent' },
    wand: { p: ['aR2', 'head', 'torso'], ang: -96, len: 42, w: 8, z: 32, col: 'accent' },
    balloon: { p: ['aL2', 'aR2', 'torso'], ang: -100, len: 92, w: 40, z: 1, col: 'accent', abs: true, wig: 7, sp: 2 },
    shield: { p: ['aL2', 'torso'], at: .7, ang: 0, len: 6, w: 44, z: 12, col: 'accent' },
    backpack: { p: ['torso'], at: .2, oy: -28, ang: 0, len: 38, w: 30, z: .2, col: 'accent' },
    jetpack: { p: ['torso'], at: .15, oy: -30, ang: 0, len: 44, w: 30, z: .2, col: 'accent' },
    guitar: { p: ['torso'], at: .25, oy: 14, ang: 40, len: 66, w: 32, z: 29, col: 'accent' }
  };
  TL.addExtra = function (ch, part) {
    var e = EXTRA[part]; if (!e) return null;
    var ids = ch.bones.map(function (b) { return b.id; });
    var parent = e.p.filter(function (p) { return ids.indexOf(p) >= 0; })[0] || 'root';
    var n = 1; while (ids.indexOf('x' + part + n) >= 0) n++;
    var b = B('x' + part + n, parent, e.len, e.ang, { kind: 'extra', part: part, at: e.at == null ? 1 : e.at, ox: e.ox || 0, oy: e.oy || 0, w: e.w, z: e.z,
      col: e.col, wig: e.wig || 0, sp: e.sp || 4, abs: !!e.abs });
    ch.bones.push(b);
    return b;
  };
  TL.extras = function (ch) { return ch.bones.filter(function (b) { return b.kind === 'extra' && b.id.charAt(0) === 'x'; }); };

  /* ------------------------------------------------------------------ solving the skeleton */
  function mult(ch, b) {
    var L = ch.look || TL.DEFAULT_LOOK, s = L.size || 1;
    if (b.g === 'arm') return s * (L.arm || 1);
    if (b.g === 'leg') return s * (L.leg || 1);
    if (b.g === 'head') return s * (L.headSize || 1);
    return s;
  }
  /* -> [{b, x, y, a (radians), len, w, ex, ey}] in the character's own space (hip at 0,0). */
  TL.solve = function (ch, pose) {
    pose = pose || {};
    var pb = pose.b || {}, t = pose.t || 0, L = ch.look || TL.DEFAULT_LOOK, by = {}, out = [];
    ch.bones.forEach(function (b, i) {
      var m = mult(ch, b), len = b.len * m, w = b.w * (b.kind === 'head' ? m : (L.width || 1) * (L.size || 1)), x, y, a;
      var ang = (pb[b.id] != null ? pb[b.id] : b.ang) + (b.wig ? Math.sin(t * (b.sp || 4) + i * 1.7) * b.wig : 0);
      if (!b.p || !by[b.p]) {
        x = (pose.r ? pose.r[0] : 0); y = (pose.r ? pose.r[1] : 0); a = (pb.root || 0) * D2R;
      } else {
        var P = by[b.p], along = (b.at == null ? 1 : b.at) * P.len + (b.ox || 0) * mult(ch, b), side = (b.oy || 0) * (L.width || 1) * (L.size || 1);
        x = P.x + Math.cos(P.a) * along - Math.sin(P.a) * side;
        y = P.y + Math.sin(P.a) * along + Math.cos(P.a) * side;
        a = b.abs ? ang * D2R : P.a + ang * D2R;
      }
      if (!b.p) a = (pb.root || 0) * D2R;
      var s = { b: b, x: x, y: y, a: a, len: len, w: w };
      s.ex = x + Math.cos(a) * len; s.ey = y + Math.sin(a) * len;
      by[b.id] = s; out.push(s);
    });
    return out;
  };
  TL.bounds = function (ch, pose) {
    var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    TL.solve(ch, pose).forEach(function (s) {
      var r = s.b.kind === 'head' ? s.w * .62 : s.w * .6 + 4;
      var pts = s.b.kind === 'head' ? [[s.x + Math.cos(s.a) * s.len * .5, s.y + Math.sin(s.a) * s.len * .5]] : [[s.x, s.y], [s.ex, s.ey]];
      if (s.b.kind === 'head') r = s.w * .9;
      if (s.b.part === 'balloon') { pts = [[s.ex, s.ey]]; r = s.w * .7; }
      pts.forEach(function (p) { x0 = Math.min(x0, p[0] - r); y0 = Math.min(y0, p[1] - r); x1 = Math.max(x1, p[0] + r); y1 = Math.max(y1, p[1] + r); });
    });
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  };
  /* How far below the hip the feet are when standing (for shadows and ground lines). */
  TL.footY = function (ch) {
    if (ch._footY != null && ch._footFor === JSON.stringify(ch.look)) return ch._footY;
    var low = 0;
    TL.solve(ch, {}).forEach(function (s) { if (s.b.kind === 'limb' || s.b.kind === 'seg') low = Math.max(low, s.ey + (s.b.kind === 'seg' ? s.w / 2 : 6), s.y); });
    Object.defineProperty(ch, '_footY', { value: low, writable: true, configurable: true, enumerable: false });
    Object.defineProperty(ch, '_footFor', { value: JSON.stringify(ch.look), writable: true, configurable: true, enumerable: false });
    return low;
  };

  /* ------------------------------------------------------------------ drawing the parts (bone frame: bone runs along +x) */
  function limbColor(L, b) {
    var style = b.g === 'arm' ? L.arms : L.legs;
    if (style === 'stick') return INK;
    if (style === 'robot') return '#b9c0cf';
    if (b.g === 'arm') return b.part === 'upper' ? L.shirt : (style === 'wing' ? L.shirt : L.skin);
    return L.pants;
  }
  function drawLimb(ctx, s, L, back) {
    var b = s.b, style = b.g === 'arm' ? L.arms : (b.g === 'leg' ? L.legs : 'block'), len = s.len, W = s.w, c = limbColor(L, b);
    if (back && style !== 'stick') c = shade(c, .8);
    if (style === 'stick') { ctx.lineCap = 'round'; ctx.strokeStyle = INK; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(len, 0); ctx.stroke(); ctx.lineWidth = 3.2; return; }
    if (style === 'noodle') { capsule(ctx, len, W * .72, c); return; }
    if (style === 'striped') {
      capsule(ctx, len, W * .8, c);
      ctx.save(); ctx.lineCap = 'butt'; ctx.strokeStyle = back ? shade(L.accent, .8) : L.accent; ctx.lineWidth = W * .8 * .9;
      [.3, .7].forEach(function (f) { ctx.beginPath(); ctx.moveTo(len * f - 3, 0); ctx.lineTo(len * f + 3, 0); ctx.stroke(); });
      ctx.restore(); return;
    }
    if (style === 'wing' && b.g === 'arm') {
      if (b.part === 'upper') { capsule(ctx, len, W * .7, c); return; }
      var fc = back ? shade(L.accent, .8) : L.accent;
      [[.35, .55, -10], [.7, .62, 0], [1.02, .66, 12]].forEach(function (f, i) {
        ctx.save(); ctx.translate(len * f[0], 0); ctx.rotate(f[2] * D2R);
        ell(ctx, 0, -W * .15, len * f[1] * .55, W * .62); fs(ctx, i === 1 ? c : fc); ctx.restore();
      });
      return;
    }
    if (style === 'robot') {
      rr(ctx, -W * .38, -W * .42, len + W * .76, W * .84, W * .18); fs(ctx, back ? shade(c, .82) : c);
      ctx.beginPath(); ctx.moveTo(len * .3, -W * .42); ctx.lineTo(len * .3, W * .42); ctx.moveTo(len * .7, -W * .42); ctx.lineTo(len * .7, W * .42); ctx.stroke();
      ell(ctx, 0, 0, W * .22, W * .22); fs(ctx, '#7d8597');
      return;
    }
    rr(ctx, -W * .42, -W / 2, len + W * .84, W, W * .3); fs(ctx, c);
  }
  function drawHand(ctx, s, L, back) {
    var style = L.hands, W = s.w, len = s.len, c = L.arms === 'stick' ? '#ffffff' : (back ? shade(L.skin, .8) : L.skin);
    if (style === 'none' || L.arms === 'wing') return;
    ctx.save(); ctx.translate(len + W * .2, 0);
    if (style === 'glove') {
      var g = back ? '#dfe3ee' : '#ffffff';
      rr(ctx, -W * .55, -W * .55, W * .5, W * 1.1, 4); fs(ctx, g);
      ell(ctx, W * .25, 0, W * .62, W * .58); fs(ctx, g);
      ell(ctx, W * .15, -W * .62, W * .22, W * .3, -.5); fs(ctx, g);
    } else if (style === 'claw') {
      ell(ctx, 0, 0, W * .55, W * .5); fs(ctx, c);
      [-.4, 0, .4].forEach(function (k) { ctx.beginPath(); ctx.moveTo(W * .35, k * W - W * .14); ctx.lineTo(W * 1.05, k * W * 1.2); ctx.lineTo(W * .35, k * W + W * .14); ctx.closePath(); fs(ctx, '#ffffff'); });
    } else if (style === 'clamp') {
      rr(ctx, -W * .2, -W * .45, W * .5, W * .9, 3); fs(ctx, '#7d8597');
      ctx.beginPath(); ctx.moveTo(W * .25, -W * .45); ctx.lineTo(W * .95, -W * .6); ctx.lineTo(W * .95, -W * .25); ctx.lineTo(W * .3, -W * .1); ctx.closePath(); fs(ctx, '#b9c0cf');
      ctx.beginPath(); ctx.moveTo(W * .25, W * .45); ctx.lineTo(W * .95, W * .6); ctx.lineTo(W * .95, W * .25); ctx.lineTo(W * .3, W * .1); ctx.closePath(); fs(ctx, '#b9c0cf');
    } else {
      ell(ctx, 0, 0, W * .62, W * .62); fs(ctx, c);
    }
    ctx.restore();
  }
  function drawFoot(ctx, s, L, back) {
    var style = L.feet, W = s.w, len = s.len, c = back ? shade(L.shoes, .8) : L.shoes;
    if (style === 'none') { if (L.legs !== 'stick') { ell(ctx, len, 0, W * .5, W * .5); fs(ctx, c); } return; }
    ctx.save(); ctx.translate(len + 2, 0);
    if (style === 'paw') { ell(ctx, 0, -W * .25, W * .55, W * .72); fs(ctx, back ? shade(L.skin, .8) : L.skin); }
    else if (style === 'flipper') { ctx.beginPath(); ctx.moveTo(-W * .4, W * .3); ctx.lineTo(W * .2, -W * 1.6); ctx.lineTo(W * .55, -W * 1.1); ctx.lineTo(W * .45, W * .3); ctx.closePath(); fs(ctx, back ? shade('#ffa63d', .8) : '#ffa63d'); }
    else if (style === 'bird') {
      ctx.lineCap = 'round'; ctx.strokeStyle = back ? shade('#ffa63d', .75) : '#e8892a'; ctx.lineWidth = 5;
      [-1.2, -.4, .4].forEach(function (k) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(W * .1, k * W); ctx.stroke(); });
      ctx.lineWidth = 3.2; ctx.strokeStyle = INK;
    } else if (style === 'boot') {
      rr(ctx, -W * .55, -W * 1.25, W * 1.2, W * 1.55, W * .3); fs(ctx, c);
      ctx.beginPath(); ctx.moveTo(-W * .5, -W * .2); ctx.lineTo(W * .62, -W * .2); ctx.stroke();
    } else {
      rr(ctx, -W * .45, -W * 1.2, W * .95, W * 1.6, W * .45); fs(ctx, c);
      rr(ctx, W * .25, -W * 1.25, W * .3, W * 1.68, W * .15); fs(ctx, '#ffffff');
    }
    ctx.restore();
  }
  function drawSeg(ctx, s, L, i) {
    ell(ctx, s.len * .5, 0, s.w * .56, s.w * .5); fs(ctx, i % 2 ? L.accent : L.shirt);
    ctx.save(); ctx.lineCap = 'round'; ctx.strokeStyle = INK; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(s.len * .5, s.w * .45); ctx.lineTo(s.len * .5 + 3, s.w * .7); ctx.stroke(); ctx.restore();
  }
  function drawTorso(ctx, s, L, t) {
    var len = s.len, W = s.w, style = L.torso, shirt = L.shirt, quad = Math.abs(Math.cos(s.b.ang * D2R)) > .7;
    if (style === 'stick') { ctx.lineCap = 'round'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(len, 0); ctx.stroke(); ctx.lineWidth = 3.2; return; }
    if (style === 'belly' || quad) {
      ell(ctx, len * .5, 0, len * .5 + 8, W * .58); fs(ctx, shirt);
      ctx.save(); ell(ctx, len * .5, 0, len * .5 + 8, W * .58); ctx.clip();
      ell(ctx, len * (quad ? .55 : .42), W * (quad ? .42 : .3), len * (quad ? .42 : .32), W * .34); fill(ctx, shade(shirt, 1.45));
      ctx.restore(); ell(ctx, len * .5, 0, len * .5 + 8, W * .58); ctx.stroke();
      return;
    }
    if (style === 'dress') {
      ctx.beginPath(); ctx.moveTo(-10, -W * .85); ctx.lineTo(len + 2, -W * .4); ctx.quadraticCurveTo(len + 8, 0, len + 2, W * .4); ctx.lineTo(-10, W * .85); ctx.quadraticCurveTo(-16, 0, -10, -W * .85); ctx.closePath();
      fs(ctx, shirt);
      rr(ctx, len * .52, -W * .44, 7, W * .88, 3); fs(ctx, L.accent);
      [-.4, 0, .4].forEach(function (k) { ell(ctx, 4, k * W, 3, 3); fill(ctx, shade(shirt, 1.4)); });
      return;
    }
    var metal = style === 'armor' || style === 'robot';
    var body = style === 'robot' ? '#b9c0cf' : style === 'armor' ? '#c9ced8' : shirt;
    if (style === 'hoodie') { ell(ctx, len - 2, -W * .2, W * .32, W * .36); fs(ctx, shade(shirt, .8)); }
    rr(ctx, -8, -W / 2, len + 12, W, W * .2); fs(ctx, body);
    if (!metal && style !== 'suit') { ctx.save(); rr(ctx, -8, -W / 2, len + 12, W, W * .2); ctx.clip(); ctx.fillStyle = L.pants; ctx.fillRect(-9, -W, 15, W * 2); ctx.restore(); rr(ctx, -8, -W / 2, len + 12, W, W * .2); ctx.stroke(); }
    if (style === 'tee') {
      ctx.beginPath(); ctx.moveTo(len + 4, -W * .2); ctx.lineTo(len - 8, W * .05); ctx.lineTo(len + 4, W * .28); ctx.closePath(); fs(ctx, L.skin);
      star(ctx, len * .55, W * .12, W * .2); fs(ctx, L.accent);
    } else if (style === 'hoodie') {
      rr(ctx, len * .18, -W * .05, len * .3, W * .46, 5); fs(ctx, shade(shirt, .85));
      ctx.beginPath(); ctx.moveTo(len, W * .02); ctx.lineTo(len - 16, W * .08); ctx.moveTo(len, W * .2); ctx.lineTo(len - 14, W * .26); ctx.stroke();
    } else if (style === 'suit') {
      ctx.beginPath(); ctx.moveTo(len + 4, -W * .12); ctx.lineTo(len * .3, W * .14); ctx.lineTo(len + 4, W * .4); ctx.closePath(); fs(ctx, '#ffffff');
      ctx.beginPath(); ctx.moveTo(len + 1, W * .12); ctx.lineTo(len * .45, W * .1); ctx.lineTo(len * .38, W * .2); ctx.lineTo(len * .45, W * .28); ctx.closePath(); fs(ctx, L.accent);
      ctx.beginPath(); ctx.moveTo(-8, -W / 2); ctx.lineTo(-8, W / 2); ctx.moveTo(4, -W / 2); ctx.lineTo(4, W / 2); ctx.stroke();
    } else if (style === 'armor') {
      rr(ctx, len * .25, -W * .32, len * .55, W * .64, 8); fs(ctx, '#e3e7ef');
      star(ctx, len * .52, 0, W * .2); fs(ctx, L.accent);
      [[.12, -.38], [.12, .38], [.9, -.38], [.9, .38]].forEach(function (p) { ell(ctx, len * p[0], W * p[1], 2.5, 2.5); fill(ctx, INK); });
    } else if (style === 'robot') {
      rr(ctx, len * .2, -W * .3, len * .6, W * .6, 6); fs(ctx, '#3a3f55');
      ['#ff6b6b', '#ffd23f', '#1fbf63'].forEach(function (c, i) {
        var on = Math.sin(t * 4 + i * 2) > -.3;
        ell(ctx, len * .5, (i - 1) * W * .18, 4, 4); fill(ctx, on ? c : shade(c, .45));
      });
    } else {
      rr(ctx, len * .52, W * .18, 5, 5, 2); fill(ctx, shade(shirt, .75));
    }
  }

  /* ---- heads and faces: drawn upright (x right, y down), centred, size S, looking a little to the front (+x) */
  function hatBack(ctx, S, L) {
    var c = L.hair;
    if (L.hat === 'bob') { rr(ctx, -S * .62, -S * .62, S * 1.12, S * 1.1, S * .4); fs(ctx, c); }
    else if (L.hat === 'curly') { [[-.48, -.2], [-.5, .15], [.4, -.3]].forEach(function (p) { ell(ctx, p[0] * S, p[1] * S, S * .2, S * .2); fs(ctx, c); }); }
    else if (L.hat === 'phones') { ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(0, -S * .05, S * .6, Math.PI * 1.05, Math.PI * 1.95); ctx.strokeStyle = INK; ctx.stroke(); ctx.lineWidth = 3.2; }
  }
  function headShape(ctx, S, L) {
    var c = L.skin, h = L.head;
    if (h === 'cat') {
      [[-.42, -1], [.28, 1]].forEach(function (p) { ctx.beginPath(); ctx.moveTo(p[0] * S - S * .14, -S * .3); ctx.lineTo(p[0] * S + p[1] * S * .02, -S * .82); ctx.lineTo(p[0] * S + S * .2, -S * .4); ctx.closePath(); fs(ctx, c); });
    }
    if (h === 'bear') { [[-.38, -.42], [.34, -.44]].forEach(function (p) { ell(ctx, p[0] * S, p[1] * S, S * .17, S * .17); fs(ctx, c); ell(ctx, p[0] * S, p[1] * S, S * .08, S * .08); fill(ctx, shade(c, .8)); }); }
    if (h === 'bunny') { [[-.2, -.1], [.16, .12]].forEach(function (p) { ell(ctx, p[0] * S, -S * .85, S * .12, S * .36, p[1]); fs(ctx, c); ell(ctx, p[0] * S, -S * .82, S * .05, S * .24, p[1]); fill(ctx, '#ffb3d9'); }); }
    if (h === 'dog') { ell(ctx, -S * .5, -S * .02, S * .16, S * .36, .35); fs(ctx, L.hair); }
    if (h === 'robot') {
      ctx.beginPath(); ctx.moveTo(0, -S * .5); ctx.lineTo(0, -S * .72); ctx.stroke(); ell(ctx, 0, -S * .76, S * .07, S * .07); fs(ctx, '#ff6b6b');
      rr(ctx, -S * .55, -S * .5, S * 1.1, S, S * .14); fs(ctx, c);
      [-.55, .55].forEach(function (k) { rr(ctx, k * S - S * .08, -S * .14, S * .16, S * .28, 3); fs(ctx, '#7d8597'); });
      return;
    }
    if (h === 'blocky') { rr(ctx, -S * .52, -S * .48, S * 1.04, S * .96, S * .2); fs(ctx, c); return; }
    if (h === 'egg') { ell(ctx, 0, -S * .04, S * .48, S * .58); fs(ctx, c); return; }
    if (h === 'alien') {
      ctx.beginPath(); ctx.moveTo(-S * .62, -S * .14); ctx.bezierCurveTo(-S * .66, -S * .78, S * .66, -S * .78, S * .62, -S * .14);
      ctx.bezierCurveTo(S * .55, S * .3, S * .2, S * .55, S * .02, S * .56); ctx.bezierCurveTo(-S * .2, S * .55, -S * .55, S * .3, -S * .62, -S * .14); ctx.closePath(); fs(ctx, c); return;
    }
    ell(ctx, 0, 0, S * .54, S * .52); fs(ctx, c);
    if (h === 'dog') {
      ell(ctx, S * .34, S * .16, S * .3, S * .22); fs(ctx, shade(c, 1.35));
      ell(ctx, S * .55, S * .06, S * .1, S * .08); fill(ctx, INK);
    }
    if (h === 'bird') { [[-.1, -.15], [.08, .15], [.25, .45]].forEach(function (p) { ell(ctx, p[0] * S, -S * .6, S * .07, S * .2, p[1]); fs(ctx, L.accent); }); ell(ctx, 0, 0, S * .54, S * .52); fs(ctx, c); }
    if (h === 'cat') { [[.5, .1], [.5, .2]].forEach(function (p, i) { ctx.beginPath(); ctx.moveTo(S * .3, S * (.12 + i * .08)); ctx.lineTo(S * .66, S * (.06 + i * .16)); ctx.stroke(); }); }
  }
  function drawEyes(ctx, S, L, st) {
    var fx = S * .08, ey = -S * .07, dx = S * .18, e = S * .09, blink = st.blink || 0, kind = L.eyes;
    if (L.head === 'bird' || L.head === 'dog') fx = S * .14;
    var xs = [fx - dx, fx + dx];
    function lid(x, y, r) { ctx.beginPath(); ctx.moveTo(x - r, y); ctx.lineTo(x + r, y); ctx.stroke(); }
    if (kind === 'visor') { rr(ctx, fx - S * .38, ey - S * .13, S * .76, S * .24, S * .1); fs(ctx, '#1a1d3a'); rr(ctx, fx - S * .3, ey - S * .06, S * (.6 * (1 - blink * .9)), S * .1, 4); fill(ctx, L.accent === '#ffffff' ? '#22d3c5' : L.accent); return; }
    if (kind === 'shades') {
      ctx.beginPath(); ctx.moveTo(fx - S * .42, ey - S * .06); ctx.lineTo(fx + S * .42, ey - S * .06); ctx.stroke();
      xs.forEach(function (x) { rr(ctx, x - S * .14, ey - S * .08, S * .28, S * .17, S * .06); fs(ctx, INK); ell(ctx, x - S * .05, ey - S * .02, S * .035, S * .025); fill(ctx, '#ffffff'); });
      return;
    }
    if (kind === 'one') {
      var r = S * .2; ell(ctx, fx, ey - S * .04, r, r * Math.max(.08, 1 - blink)); fs(ctx, '#ffffff');
      if (blink < .6) { ell(ctx, fx + r * .25, ey - S * .02, r * .45, r * .45 * (1 - blink)); fill(ctx, INK); ell(ctx, fx + r * .1, ey - S * .1, r * .14, r * .14); fill(ctx, '#ffffff'); }
      return;
    }
    if (kind === 'hearts') {
      xs.forEach(function (x) { var k = S * .1 * (1 - blink * .7); ctx.beginPath(); ctx.moveTo(x, ey + k * .9); ctx.bezierCurveTo(x - k * 1.6, ey - k * .2, x - k * .7, ey - k * 1.4, x, ey - k * .5); ctx.bezierCurveTo(x + k * .7, ey - k * 1.4, x + k * 1.6, ey - k * .2, x, ey + k * .9); fs(ctx, '#ff4f6d'); });
      return;
    }
    if (kind === 'happy' || blink > .7) {
      ctx.lineWidth = 3.6; xs.forEach(function (x) { ctx.beginPath(); ctx.arc(x, ey + e * .4, e * .85, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); }); ctx.lineWidth = 3.2;
      return;
    }
    if (kind === 'sleepy') {
      xs.forEach(function (x) { ell(ctx, x, ey, e * .9, e * .7); fs(ctx, '#ffffff'); ell(ctx, x + e * .2, ey + e * .2, e * .35, e * .35); fill(ctx, INK); ctx.beginPath(); ctx.ellipse(x, ey, e * .9, e * .7, 0, Math.PI, Math.PI * 2); fill(ctx, shade(L.skin, .85)); lid(x, ey, e * .9); });
      return;
    }
    if (kind === 'big' || kind === 'googly') {
      var big = kind === 'googly' ? e * 1.45 : e * 1.25, t = st.t || 0;
      xs.forEach(function (x, i) {
        ell(ctx, x, ey, big, big * Math.max(.1, 1 - blink)); fs(ctx, '#ffffff');
        if (blink < .5) {
          var jx = kind === 'googly' ? Math.sin(t * 7 + i * 2) * big * .3 : big * .25, jy = kind === 'googly' ? Math.cos(t * 5 + i) * big * .25 : big * .05;
          ell(ctx, x + jx, ey + jy, big * .5, big * .5 * (1 - blink)); fill(ctx, INK);
          if (kind === 'big') { ell(ctx, x + jx - big * .15, ey - big * .2, big * .18, big * .18); fill(ctx, '#ffffff'); }
        }
      });
      return;
    }
    xs.forEach(function (x) { ell(ctx, x, ey, e * .62, e * .85 * Math.max(.12, 1 - blink)); fill(ctx, INK); if (blink < .4) { ell(ctx, x + e * .15, ey - e * .35, e * .2, e * .2); fill(ctx, '#ffffff'); } });
    if (kind === 'angry') { ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(xs[0] - e, ey - e * 1.9); ctx.lineTo(xs[0] + e, ey - e * 1.1); ctx.moveTo(xs[1] + e, ey - e * 1.9); ctx.lineTo(xs[1] - e, ey - e * 1.1); ctx.stroke(); ctx.lineWidth = 3.2; }
  }
  function drawMouth(ctx, S, L, st) {
    var m = Math.max(0, Math.min(1, st.mouth || 0)), fx = S * .1, my = S * .22, kind = L.mouth;
    if (L.head === 'dog') { fx = S * .34; my = S * .3; }
    if (L.head === 'alien' || L.head === 'egg') my = S * .26;
    if (kind === 'beak') {
      var o = S * .02 + m * S * .16;
      ctx.beginPath(); ctx.moveTo(fx - S * .1, my - S * .1); ctx.lineTo(fx + S * .42, my - S * .02 - o * .3); ctx.lineTo(fx - S * .1, my + S * .02); ctx.closePath(); fs(ctx, '#ffa63d');
      ctx.beginPath(); ctx.moveTo(fx - S * .08, my + S * .02); ctx.lineTo(fx + S * .3, my + S * .04 + o * .4); ctx.lineTo(fx - S * .08, my + S * .1 + o * .3); ctx.closePath(); fs(ctx, '#e8892a');
      return;
    }
    if (m > .08) {
      var w = S * .17, h = S * (.05 + m * .18);
      ell(ctx, fx, my + h * .3, w, h); fs(ctx, '#7a1f3a');
      ctx.save(); ell(ctx, fx, my + h * .3, w, h); ctx.clip(); ell(ctx, fx, my + h * 1.1, w * .7, h * .6); fill(ctx, '#ff6d7a');
      if (kind === 'teeth' || kind === 'grin' || kind === 'fangs') { ctx.fillStyle = '#ffffff'; ctx.fillRect(fx - w, my + h * .3 - h, w * 2, h * .45); }
      ctx.restore(); ell(ctx, fx, my + h * .3, w, h); ctx.stroke();
    } else if (kind === 'open') {
      ell(ctx, fx, my + S * .03, S * .08, S * .1); fs(ctx, '#7a1f3a');
    } else if (kind === 'frown') {
      ctx.beginPath(); ctx.arc(fx, my + S * .14, S * .13, Math.PI * 1.2, Math.PI * 1.8); ctx.stroke();
    } else if (kind === 'grin' || kind === 'teeth' || kind === 'fangs' || kind === 'tongue') {
      ctx.beginPath(); ctx.moveTo(fx - S * .2, my - S * .03); ctx.quadraticCurveTo(fx, my + S * .24, fx + S * .2, my - S * .03); ctx.closePath(); fs(ctx, '#7a1f3a');
      if (kind === 'grin') { ctx.save(); ctx.clip(); ctx.fillStyle = '#ffffff'; ctx.fillRect(fx - S * .2, my - S * .05, S * .4, S * .06); ctx.restore(); }
      if (kind === 'teeth') { rr(ctx, fx - S * .07, my - S * .03, S * .06, S * .08, 2); fs(ctx, '#ffffff'); rr(ctx, fx + S * .01, my - S * .03, S * .06, S * .08, 2); fs(ctx, '#ffffff'); }
      if (kind === 'fangs') { [-.12, .1].forEach(function (k) { ctx.beginPath(); ctx.moveTo(fx + k * S - S * .03, my - S * .02); ctx.lineTo(fx + k * S, my + S * .07); ctx.lineTo(fx + k * S + S * .03, my - S * .02); ctx.closePath(); fs(ctx, '#ffffff'); }); }
      if (kind === 'tongue') { ell(ctx, fx + S * .04, my + S * .12, S * .07, S * .09); fs(ctx, '#ff6d7a'); }
    } else {
      ctx.lineWidth = 3.6; ctx.beginPath(); ctx.arc(fx, my - S * .06, S * .15, Math.PI * .2, Math.PI * .8); ctx.stroke(); ctx.lineWidth = 3.2;
    }
    if (kind === 'stache') {
      [-1, 1].forEach(function (k) { ell(ctx, fx + k * S * .1, my - S * .06, S * .12, S * .06, k * .3); fs(ctx, L.hair); });
    }
  }
  function hatFront(ctx, S, L) {
    var c = L.hair, h = L.hat;
    if (h === 'none' || h === 'bob' && false) return;
    if (h === 'spiky') {
      ctx.beginPath(); ctx.moveTo(-S * .56, -S * .2);
      [[-.5, -.75], [-.32, -.42], [-.18, -.85], [0, -.48], [.16, -.86], [.3, -.46], [.5, -.72], [.56, -.22]].forEach(function (p) { ctx.lineTo(p[0] * S, p[1] * S); });
      ctx.quadraticCurveTo(0, -S * .3, -S * .56, -S * .2); ctx.closePath(); fs(ctx, c);
    } else if (h === 'bob') {
      ctx.beginPath(); ctx.moveTo(-S * .56, -S * .05); ctx.quadraticCurveTo(-S * .6, -S * .62, 0, -S * .6); ctx.quadraticCurveTo(S * .58, -S * .6, S * .56, -S * .18);
      ctx.quadraticCurveTo(S * .1, -S * .2, -S * .1, -S * .4); ctx.quadraticCurveTo(-S * .3, -S * .1, -S * .56, -S * .05); ctx.closePath(); fs(ctx, c);
    } else if (h === 'curly') {
      [[-.36, -.42], [-.1, -.55], [.18, -.52], [.42, -.36]].forEach(function (p) { ell(ctx, p[0] * S, p[1] * S, S * .2, S * .17); fs(ctx, c); });
    } else if (h === 'cap') {
      ctx.beginPath(); ctx.moveTo(-S * .54, -S * .22); ctx.quadraticCurveTo(-S * .5, -S * .72, 0, -S * .7); ctx.quadraticCurveTo(S * .52, -S * .7, S * .54, -S * .22); ctx.closePath(); fs(ctx, c);
      rr(ctx, S * .1, -S * .3, S * .62, S * .12, S * .06); fs(ctx, shade(c, .8));
      ell(ctx, 0, -S * .69, S * .05, S * .04); fs(ctx, L.accent);
    } else if (h === 'tophat') {
      rr(ctx, -S * .5, -S * .5, S * 1, S * .12, 4); fs(ctx, INK === c ? '#3a3f55' : c);
      rr(ctx, -S * .32, -S * 1.12, S * .64, S * .64, 5); fs(ctx, c);
      ctx.fillStyle = L.accent; ctx.fillRect(-S * .32 + 2, -S * .64, S * .64 - 4, S * .1);
    } else if (h === 'crown') {
      ctx.beginPath(); ctx.moveTo(-S * .4, -S * .42);
      [[-.44, -.86], [-.2, -.62], [0, -.92], [.2, -.62], [.44, -.86], [.4, -.42]].forEach(function (p) { ctx.lineTo(p[0] * S, p[1] * S); });
      ctx.closePath(); fs(ctx, '#ffd23f');
      [-.22, 0, .22].forEach(function (k, i) { ell(ctx, k * S, -S * .52, S * .05, S * .05); fill(ctx, ['#ff4fa3', '#2fa8ff', '#1fbf63'][i]); });
    } else if (h === 'wizard') {
      ctx.beginPath(); ctx.moveTo(-S * .55, -S * .36); ctx.quadraticCurveTo(0, -S * .5, S * .55, -S * .36); ctx.lineTo(S * .08, -S * 1.25); ctx.closePath(); fs(ctx, c);
      star(ctx, S * .02, -S * .7, S * .1); fs(ctx, '#ffd23f'); star(ctx, S * .2, -S * .48, S * .06); fs(ctx, '#ffd23f');
    } else if (h === 'beanie') {
      ctx.beginPath(); ctx.moveTo(-S * .54, -S * .26); ctx.quadraticCurveTo(-S * .5, -S * .78, 0, -S * .76); ctx.quadraticCurveTo(S * .5, -S * .78, S * .54, -S * .26); ctx.closePath(); fs(ctx, c);
      rr(ctx, -S * .56, -S * .34, S * 1.12, S * .14, 5); fs(ctx, shade(c, .8)); ell(ctx, 0, -S * .8, S * .11, S * .11); fs(ctx, L.accent);
    } else if (h === 'pirate') {
      ctx.beginPath(); ctx.moveTo(-S * .7, -S * .34); ctx.quadraticCurveTo(-S * .4, -S * .95, 0, -S * .8); ctx.quadraticCurveTo(S * .4, -S * .95, S * .7, -S * .34); ctx.quadraticCurveTo(0, -S * .5, -S * .7, -S * .34); ctx.closePath(); fs(ctx, '#2c2f45');
      ell(ctx, 0, -S * .6, S * .1, S * .08); fs(ctx, '#ffffff'); ctx.fillStyle = '#ffd23f'; ctx.fillRect(-S * .55, -S * .43, S * 1.1, 3);
    } else if (h === 'horns') {
      [-1, 1].forEach(function (k) { ctx.beginPath(); ctx.moveTo(k * S * .22, -S * .4); ctx.quadraticCurveTo(k * S * .5, -S * .7, k * S * .44, -S * .95); ctx.quadraticCurveTo(k * S * .3, -S * .62, k * S * .38, -S * .36); ctx.closePath(); fs(ctx, '#fff3d6'); });
    } else if (h === 'halo') {
      ctx.save(); ctx.lineWidth = 6; ctx.strokeStyle = '#ffd23f'; ell(ctx, 0, -S * .78, S * .32, S * .09); ctx.stroke(); ctx.restore();
    } else if (h === 'phones') {
      [-1, 1].forEach(function (k) { rr(ctx, k * S * .56 - S * .1, -S * .2, S * .2, S * .34, S * .08); fs(ctx, L.accent); });
    } else if (h === 'antenna') {
      [-1, 1].forEach(function (k) { ctx.beginPath(); ctx.moveTo(k * S * .14, -S * .45); ctx.quadraticCurveTo(k * S * .2, -S * .8, k * S * .36, -S * .92); ctx.stroke(); ell(ctx, k * S * .36, -S * .94, S * .08, S * .08); fs(ctx, L.accent); });
    } else if (h === 'bow') {
      [-1, 1].forEach(function (k) { ctx.beginPath(); ctx.moveTo(S * .18, -S * .52); ctx.lineTo(S * .18 + k * S * .26, -S * .7); ctx.lineTo(S * .18 + k * S * .26, -S * .34); ctx.closePath(); fs(ctx, L.accent); });
      ell(ctx, S * .18, -S * .52, S * .07, S * .07); fs(ctx, shade(L.accent, .8));
    }
  }
  TL.drawFace = function (ctx, S, L, st) {
    st = st || {};
    hatBack(ctx, S, L); headShape(ctx, S, L); drawEyes(ctx, S, L, st); drawMouth(ctx, S, L, st); hatFront(ctx, S, L);
    if (L.head === 'blocky' || L.head === 'round' || L.head === 'bear') { ell(ctx, S * .4, S * .12, S * .06, S * .035); fill(ctx, 'rgba(255,90,120,.35)'); }
  };
  function drawExtra(ctx, s, L, t) {
    var b = s.b, len = s.len, W = s.w, c = L[b.col] || b.col || L.accent;
    if (b.part === 'tail') {
      ctx.beginPath(); ctx.moveTo(0, -W * .5); ctx.quadraticCurveTo(len * .6, -W * .9, len, 0); ctx.quadraticCurveTo(len * .6, W * .5, 0, W * .5); ctx.closePath(); fs(ctx, c);
      ell(ctx, len * .92, 0, W * .45, W * .4); fs(ctx, shade(c, 1.35));
    } else if (b.part === 'wings') {
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(len * .4, -W * .9, len, -W * .4); ctx.quadraticCurveTo(len * .8, -W * .05, len * .9, W * .25);
      ctx.quadraticCurveTo(len * .6, W * .2, len * .62, W * .5); ctx.quadraticCurveTo(len * .3, W * .4, 0, 0); ctx.closePath(); fs(ctx, shade(c, 1.15));
    } else if (b.part === 'cape') {
      ctx.beginPath(); ctx.moveTo(0, -W * .32); ctx.lineTo(len, -W * .55); ctx.quadraticCurveTo(len + 6, 0, len, W * .5); ctx.lineTo(0, W * .32); ctx.closePath(); fs(ctx, c);
    } else if (b.part === 'sword') {
      ctx.beginPath(); ctx.moveTo(len * .22, -W * .4); ctx.lineTo(len, 0); ctx.lineTo(len * .22, W * .4); ctx.closePath(); fs(ctx, '#e3e7ef');
      rr(ctx, len * .16, -W * 1.1, W * .5, W * 2.2, 3); fs(ctx, c); rr(ctx, -W * .2, -W * .3, len * .22, W * .6, 3); fs(ctx, '#8d5a3b');
    } else if (b.part === 'wand') {
      ctx.lineCap = 'round'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(len, 0); ctx.stroke(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; ctx.stroke(); ctx.lineWidth = 3.2; ctx.strokeStyle = INK;
      ctx.save(); ctx.translate(len + 8, 0); ctx.rotate(t * 2); star(ctx, 0, 0, 13); fs(ctx, '#ffd23f'); ctx.restore();
    } else if (b.part === 'balloon') {
      ctx.save(); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(len * .5, 8, len, 0); ctx.stroke(); ctx.restore();
      ctx.save(); ctx.translate(len + W * .55, 0); ctx.rotate(Math.PI / 2);
      ell(ctx, 0, 0, W * .5, W * .6); fs(ctx, c); ell(ctx, -W * .18, -W * .2, W * .1, W * .16); fill(ctx, 'rgba(255,255,255,.6)'); ctx.restore();
    } else if (b.part === 'shield') {
      ctx.save(); ctx.rotate(Math.PI / 2); ctx.beginPath(); ctx.moveTo(-W * .45, -W * .5); ctx.lineTo(W * .45, -W * .5); ctx.quadraticCurveTo(W * .5, W * .3, 0, W * .62); ctx.quadraticCurveTo(-W * .5, W * .3, -W * .45, -W * .5); ctx.closePath(); fs(ctx, c);
      star(ctx, 0, 0, W * .2); fs(ctx, '#ffd23f'); ctx.restore();
    } else if (b.part === 'backpack' || b.part === 'jetpack') {
      if (b.part === 'jetpack') {
        var fl = 14 + Math.sin(t * 30) * 5;
        ctx.beginPath(); ctx.moveTo(-4, -W * .3); ctx.lineTo(-4 - fl, 0); ctx.lineTo(-4, W * .3); ctx.closePath(); fs(ctx, '#ffa63d');
        ctx.beginPath(); ctx.moveTo(-4, -W * .15); ctx.lineTo(-4 - fl * .55, 0); ctx.lineTo(-4, W * .15); ctx.closePath(); fill(ctx, '#ffd23f');
      }
      rr(ctx, 0, -W / 2, len, W, 8); fs(ctx, b.part === 'jetpack' ? '#b9c0cf' : c);
      rr(ctx, len * .2, -W * .3, len * .4, W * .6, 4); fs(ctx, b.part === 'jetpack' ? c : shade(c, .8));
    } else if (b.part === 'guitar') {
      ell(ctx, len * .22, 0, len * .24, W * .55); fs(ctx, c); ell(ctx, len * .45, 0, len * .17, W * .42); fs(ctx, c);
      ell(ctx, len * .3, 0, W * .14, W * .14); fill(ctx, INK);
      rr(ctx, len * .5, -W * .1, len * .5, W * .2, 2); fs(ctx, '#8d5a3b'); rr(ctx, len * .94, -W * .18, len * .12, W * .36, 3); fs(ctx, '#5a3a26');
    }
  }

  /* ------------------------------------------------------------------ draw a whole character
     o: {x, y, s (scale), flip (true = facing left), mouth 0..1, blink 0..1, t (seconds), alpha, shadow (y of the ground), tint} */
  TL.drawChar = function (ctx, ch, pose, o) {
    o = o || {};
    var L = Object.assign({}, TL.DEFAULT_LOOK, ch.look || {}), st = { mouth: o.mouth || 0, blink: o.blink || 0, t: o.t || 0 };
    pose = Object.assign({}, pose || {}, { t: o.t || 0 });
    var solved = TL.solve(ch, pose).slice().sort(function (a, b) { return (a.b.z || 0) - (b.b.z || 0); });
    ctx.save();
    ctx.translate(o.x || 0, o.y || 0);
    if (o.alpha != null) ctx.globalAlpha = o.alpha;
    var s = o.s || 1;
    if (o.shadow != null) {
      var lift = Math.max(0, -(pose.r ? pose.r[1] : 0)), k = Math.max(.35, 1 - lift / 160);
      ctx.save(); ctx.globalAlpha *= .22 * k + .05; ell(ctx, 0, o.shadow * s, 46 * s * k * (L.width || 1), 9 * s * k); fill(ctx, '#000'); ctx.restore();
    }
    ctx.scale(o.flip ? -s : s, s);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.lineWidth = 3.2; ctx.strokeStyle = INK;
    var segI = 0;
    solved.forEach(function (sv) {
      var b = sv.b, back = b.side === 'back';
      if (b.kind === 'root') return;
      ctx.save(); ctx.translate(sv.x, sv.y); ctx.rotate(sv.a);
      if (b.kind === 'torso') drawTorso(ctx, sv, L, st.t);
      else if (b.kind === 'head') {
        ctx.translate(sv.len * .5, 0); ctx.rotate(Math.PI / 2);
        if (o.flip) { /* faces still look forward when flipped: the mirror handles it */ }
        TL.drawFace(ctx, sv.len * 1.08, L, st);
      }
      else if (b.kind === 'seg') drawSeg(ctx, sv, L, segI++);
      else if (b.kind === 'extra') drawExtra(ctx, sv, L, st.t);
      else {
        drawLimb(ctx, sv, L, back);
        if (b.cap === 'hand') drawHand(ctx, sv, L, back);
        if (b.cap === 'foot') drawFoot(ctx, sv, L, back);
      }
      ctx.restore();
    });
    ctx.restore();
    return solved;
  };

  /* ------------------------------------------------------------------ poses and keyframes
     anim: {id, name, emoji, len (frames), fps, loop, keys: [{f, b: {boneId: angle}, r: [dx, dy]}]} */
  function angLerp(a, b, u) { var d = ((b - a + 540) % 360) - 180; return a + d * u; }
  TL.ease = function (u) { return u * u * (3 - 2 * u); };
  TL.restAngles = function (ch) { var o = {}; ch.bones.forEach(function (b) { o[b.id] = b.ang; }); o.root = 0; return o; };
  TL.keyPose = function (ch, anim, frame) {
    var keys = (anim && anim.keys || []).slice().sort(function (a, b) { return a.f - b.f; });
    if (!keys.length) return { b: {}, r: [0, 0] };
    var len = Math.max(1, anim.len || 12), f = frame;
    if (anim.loop !== false) f = ((f % len) + len) % len; else f = Math.max(0, Math.min(len - 1, f));
    var k0 = keys[keys.length - 1], k1 = keys[0], span, u;
    for (var i = 0; i < keys.length; i++) { if (keys[i].f <= f) k0 = keys[i]; }
    var i0 = keys.indexOf(k0);
    if (f < keys[0].f) {  // before the first key: from the last key (looping) or hold the first
      if (anim.loop === false) return copyKey(keys[0]);
      k0 = keys[keys.length - 1]; k1 = keys[0]; span = (k1.f + len) - k0.f; u = (f + len - k0.f) / span;
    } else if (i0 === keys.length - 1) {
      if (anim.loop === false || keys.length === 1) return copyKey(k0);
      k1 = keys[0]; span = (k1.f + len) - k0.f; u = (f - k0.f) / span;
    } else { k1 = keys[i0 + 1]; span = k1.f - k0.f; u = (f - k0.f) / span; }
    var rest = TL.restAngles(ch), e = anim.ease === 'linear' ? u : TL.ease(Math.max(0, Math.min(1, u))), b = {};
    var ids = {}; Object.keys(k0.b || {}).concat(Object.keys(k1.b || {})).forEach(function (id) { ids[id] = 1; });
    Object.keys(ids).forEach(function (id) {
      var a0 = (k0.b || {})[id], a1 = (k1.b || {})[id], r = rest[id] || 0;
      b[id] = angLerp(a0 == null ? r : a0, a1 == null ? r : a1, e);
    });
    var r0 = k0.r || [0, 0], r1 = k1.r || [0, 0];
    return { b: b, r: [r0[0] + (r1[0] - r0[0]) * e, r0[1] + (r1[1] - r0[1]) * e] };
  };
  function copyKey(k) { return { b: Object.assign({}, k.b || {}), r: (k.r || [0, 0]).slice() }; }
  TL.animPose = function (ch, anim, tSec, speed) {
    if (!anim) return { b: {}, r: [0, 0] };
    return TL.keyPose(ch, anim, tSec * (anim.fps || 12) * (speed == null ? 1 : speed));
  };
  TL.findAnim = function (ch, id) {
    var a = (ch.anims || []).filter(function (x) { return x.id === id; })[0];
    return a || (ch.anims || [])[0] || null;
  };
  TL.ANIM_EMOJI = { idle: '🧍', walk: '🚶', run: '🏃', sneak: '🤫', jump: '🦘', wave: '👋', talk: '💬', dance: '🕺', cheer: '🙌', sit: '🪑', dizzy: '😵',
    kick: '⚽', flap: '🐔', spin: '🌀', bounce: '🏀', slither: '🐛', hop: '🐸', wag: '🐶', fly: '🦸' };
  TL.animEmoji = function (a) { return (a && (a.emoji || TL.ANIM_EMOJI[a.id])) || '✨'; };

  /* ---- starter animations, made from simple "where does each limb point" specs */
  function bp(o) {  // biped: angles are where the limb points on screen (0 = forward, 90 = down), bend = elbow/knee
    var tw = -90 + (o.lean || 0), b = { torso: tw, head: o.head || 0 }, r = o.r || [0, 0];
    var aL = o.aL || [100, -12], aR = o.aR || [80, -12], lL = o.lL || [94, 3], lR = o.lR || [86, 3];
    b.aL1 = aL[0] - tw; b.aL2 = aL[1]; b.aR1 = aR[0] - tw; b.aR2 = aR[1];
    b.lL1 = lL[0]; b.lL2 = lL[1]; b.lR1 = lR[0]; b.lR2 = lR[1];
    if (o.tilt) b.root = o.tilt;
    return { b: b, r: r };
  }
  function qp(o) {  // four legs: torso tilt, legs point where they point (90 = down)
    var tw = o.tilt || 0, b = { torso: tw, head: -90 + (o.head || 0) - tw * .5 };
    [['fl', o.fl], ['fr', o.fr], ['bl', o.bl], ['br', o.br]].forEach(function (x) { var v = x[1] || [90, 0]; b[x[0] + '1'] = v[0] - tw; b[x[0] + '2'] = v[1]; });
    if (o.tail != null) b.tail = o.tail;
    return { b: b, r: o.r || [0, 0] };
  }
  function A(id, name, len, keys, extra) {
    var a = { id: id, name: name, emoji: TL.ANIM_EMOJI[id] || '✨', len: len, fps: 12, loop: true, keys: keys };
    for (var k in extra) a[k] = extra[k];
    return a;
  }
  function K(f, p) { return { f: f, b: p.b, r: p.r }; }
  var GEN = {
    biped: function () {
      return [
        A('idle', 'Idle', 24, [K(0, bp({})), K(12, bp({ r: [0, 2], aL: [103, -18], aR: [77, -18], head: 3 }))]),
        A('walk', 'Walk', 12, [K(0, bp({ lean: 3, lL: [118, 6], lR: [62, 8], aL: [66, -25], aR: [116, -10] })),
          K(3, bp({ lean: 3, lL: [88, 62], lR: [96, 4], r: [0, -5] })),
          K(6, bp({ lean: 3, lL: [62, 8], lR: [118, 6], aL: [116, -10], aR: [66, -25] })),
          K(9, bp({ lean: 3, lL: [96, 4], lR: [88, 62], r: [0, -5] }))]),
        A('run', 'Run', 8, [K(0, bp({ lean: 14, lL: [140, 30], lR: [45, 15], aL: [40, -95], aR: [140, -70], r: [0, 2] })),
          K(2, bp({ lean: 14, lL: [100, 100], lR: [95, 10], aL: [90, -80], aR: [90, -80], r: [0, -12] })),
          K(4, bp({ lean: 14, lL: [45, 15], lR: [140, 30], aL: [140, -70], aR: [40, -95], r: [0, 2] })),
          K(6, bp({ lean: 14, lL: [95, 10], lR: [100, 100], aL: [90, -80], aR: [90, -80], r: [0, -12] }))]),
        A('sneak', 'Sneak', 16, [K(0, bp({ lean: 18, lL: [125, 20], lR: [68, 45], aL: [8, -125], aR: [-4, -120], r: [0, 8] })),
          K(4, bp({ lean: 20, lL: [96, 100], lR: [100, 30], aL: [14, -130], aR: [2, -125], r: [0, 2] })),
          K(8, bp({ lean: 18, lL: [68, 45], lR: [125, 20], aL: [8, -125], aR: [-4, -120], r: [0, 8] })),
          K(12, bp({ lean: 20, lL: [100, 30], lR: [96, 100], aL: [14, -130], aR: [2, -125], r: [0, 2] }))]),
        A('jump', 'Jump', 16, [K(0, bp({})), K(3, bp({ lean: 16, r: [0, 22], lL: [40, 115], lR: [50, 110], aL: [150, -10], aR: [140, -10] })),
          K(6, bp({ lean: -4, r: [0, -70], lL: [98, 6], lR: [90, 6], aL: [-100, -10], aR: [-80, -10] })),
          K(9, bp({ r: [0, -84], lL: [40, 120], lR: [50, 118], aL: [-30, -30], aR: [-20, -30] })),
          K(12, bp({ lean: 12, r: [0, 16], lL: [50, 100], lR: [56, 96], aL: [60, -20], aR: [50, -20] })), K(15, bp({}))]),
        A('wave', 'Wave', 12, [K(0, bp({ aR: [-40, -55], head: 6 })), K(6, bp({ aR: [-40, -5], head: 2, r: [0, 1] }))]),
        A('talk', 'Talk', 16, [K(0, bp({ aR: [40, -55] })), K(4, bp({ aR: [20, -85], head: 6 })), K(8, bp({ aR: [50, -40], head: -2 })), K(12, bp({ aR: [30, -70], aL: [96, -24], head: 4 }))]),
        A('dance', 'Dance', 16, [K(0, bp({ tilt: -6, r: [-6, 0], aR: [-60, -10], aL: [125, -40], lL: [100, 5], lR: [70, 42] })),
          K(4, bp({ r: [0, 5], aL: [30, -95], aR: [20, -95], lL: [94, 20], lR: [86, 20] })),
          K(8, bp({ tilt: 6, r: [6, 0], aL: [-120, 10], aR: [60, -40], lL: [110, 42], lR: [80, 5] })),
          K(12, bp({ r: [0, 5], aL: [30, -95], aR: [20, -95], lL: [94, 20], lR: [86, 20] }))]),
        A('cheer', 'Cheer', 12, [K(0, bp({ aL: [-110, 10], aR: [-70, -10] })), K(3, bp({ r: [0, -16], aL: [-125, 30], aR: [-55, -30], lL: [100, 30], lR: [80, 30] })),
          K(6, bp({ aL: [-110, 10], aR: [-70, -10] })), K(9, bp({ r: [0, -10], aL: [-130, 30], aR: [-50, -30] }))]),
        A('sit', 'Sit', 2, [K(0, bp({ lean: -4, r: [0, 40], lL: [-4, 92], lR: [6, 86], aL: [40, -10], aR: [52, -24] }))], { loop: false }),
        A('dizzy', 'Dizzy', 24, [K(0, bp({ tilt: -8, head: -15, r: [-8, 0], aL: [180, -20], aR: [0, 20] })), K(6, bp({ tilt: 2, head: 6, r: [0, 3], aL: [160, 10], aR: [20, -10] })),
          K(12, bp({ tilt: 8, head: 15, r: [8, 0], aL: [190, -20], aR: [-10, 20] })), K(18, bp({ tilt: -2, head: -6, r: [0, 3], aL: [170, 10], aR: [10, -10] }))]),
        A('kick', 'Kick', 12, [K(0, bp({})), K(3, bp({ lean: 4, lR: [128, 70], aL: [64, -20], aR: [120, -10] })),
          K(5, bp({ lean: -12, r: [0, -6], lR: [-12, 2], aL: [150, -10], aR: [40, -20] })), K(8, bp({ lean: -4, lR: [60, 30] })), K(11, bp({}))]),
        A('flap', 'Flap', 8, [K(0, bp({ aL: [150, -150], aR: [30, 150], lL: [96, 10], lR: [84, 30] })), K(4, bp({ r: [0, -6], aL: [120, -120], aR: [60, 120], lL: [96, 30], lR: [84, 10] }))]),
        A('fly', 'Fly', 12, [K(0, bp({ lean: 70, aR: [-10, 0], aL: [150, -10], lL: [170, 10], lR: [160, 20], r: [0, -40] })),
          K(6, bp({ lean: 66, aR: [-14, 0], aL: [150, -20], lL: [165, 20], lR: [158, 10], r: [0, -46] }))]),
        A('spin', 'Spin', 12, [K(0, bp({ aL: [180, 0], aR: [0, 0] })), K(4, Object.assign(bp({ aL: [180, 0], aR: [0, 0], tilt: 120 }))), K(8, bp({ aL: [180, 0], aR: [0, 0], tilt: 240 }))])
      ];
    },
    quad: function () {
      return [
        A('idle', 'Idle', 24, [K(0, qp({})), K(12, qp({ r: [0, 2], head: -6 }))]),
        A('walk', 'Walk', 12, [K(0, qp({ fl: [70, 10], br: [70, -10], fr: [110, 10], bl: [110, -10] })), K(3, qp({ fl: [90, 50], br: [90, -40], r: [0, -3] })),
          K(6, qp({ fl: [110, 10], br: [110, -10], fr: [70, 10], bl: [70, -10] })), K(9, qp({ fr: [90, 50], bl: [90, -40], r: [0, -3] }))]),
        A('run', 'Run', 8, [K(0, qp({ tilt: -6, fl: [40, 20], fr: [50, 10], bl: [135, -20], br: [128, -10], r: [0, -6] })),
          K(2, qp({ fl: [110, 70], fr: [100, 60], bl: [70, -70], br: [76, -60], r: [0, -14] })),
          K(4, qp({ tilt: 6, fl: [125, 10], fr: [118, 10], bl: [55, -10], br: [62, -10], r: [0, 0] })),
          K(6, qp({ fl: [90, 40], fr: [86, 40], bl: [90, -40], br: [94, -40], r: [0, -10] }))]),
        A('jump', 'Jump', 16, [K(0, qp({})), K(3, qp({ r: [0, 10], fl: [100, 60], fr: [100, 60], bl: [80, -70], br: [80, -70] })),
          K(7, qp({ tilt: -12, r: [0, -70], fl: [40, 0], fr: [50, 0], bl: [140, 0], br: [135, 0] })), K(11, qp({ r: [0, -40], tilt: 8 })), K(14, qp({ r: [0, 6], fl: [96, 40], fr: [96, 40] }))]),
        A('sit', 'Sit', 2, [K(0, qp({ tilt: -32, r: [0, 10], fl: [92, 0], fr: [88, 0], bl: [0, 120], br: [5, 115], head: 14 }))], { loop: false }),
        A('wag', 'Happy', 8, [K(0, qp({ tilt: -4, head: -8, tail: 230, r: [0, 0] })), K(4, qp({ tilt: 4, head: 8, tail: 190, r: [0, -6] }))]),
        A('spin', 'Spin', 12, [K(0, qp({})), K(4, (function () { var p = qp({}); p.b.root = 120; return p; })()), K(8, (function () { var p = qp({}); p.b.root = 240; return p; })())])
      ];
    },
    worm: function () {
      function wp(ph, amp, lift) {
        var b = {};
        ['s1', 's2', 's3', 's4'].forEach(function (id, i) { b[id] = Math.sin(ph + i * 1.3) * amp + (i === 3 ? -20 : 0); });
        b.head = -70 - Math.sin(ph + 4 * 1.3) * amp * .6;
        return { b: b, r: [0, lift || 0] };
      }
      return [
        A('idle', 'Idle', 24, [K(0, wp(0, 4)), K(12, wp(Math.PI, 4, 2))]),
        A('slither', 'Slither', 12, [0, 3, 6, 9].map(function (f) { return K(f, wp(f / 12 * Math.PI * 2, 22)); })),
        A('hop', 'Hop', 12, [K(0, wp(0, 6)), K(3, wp(1, 12, 8)), K(6, wp(2, 18, -60)), K(9, wp(3, 8, -20))]),
        A('dance', 'Dance', 16, [0, 4, 8, 12].map(function (f) { var p = wp(f / 16 * Math.PI * 2, 30); p.b.root = Math.sin(f / 16 * Math.PI * 2) * 10; return K(f, p); })),
        A('spin', 'Spin', 12, [K(0, wp(0, 6)), K(4, (function () { var p = wp(0, 6); p.b.root = 120; return p; })()), K(8, (function () { var p = wp(0, 6); p.b.root = 240; return p; })())])
      ];
    }
  };
  TL.starterAnims = function (rig) { return (GEN[rig] || GEN.biped)(); };

  /* ------------------------------------------------------------------ starters (body types) and the premade cast */
  TL.STARTERS = [
    ['hero', 'Hero', 'biped', {}],
    ['stick', 'Stickman', 'biped', { head: 'round', torso: 'stick', arms: 'stick', legs: 'stick', hands: 'none', feet: 'none', skin: '#ffffff', headSize: .85 }],
    ['bot', 'Robot', 'biped', { head: 'robot', eyes: 'visor', mouth: 'teeth', torso: 'robot', arms: 'robot', legs: 'robot', hands: 'clamp', feet: 'boot', hat: 'antenna',
      skin: '#c9ced8', shirt: '#7d8597', pants: '#5b6275', shoes: '#3a3f55', accent: '#22d3c5' }],
    ['birdy', 'Birdy', 'biped', { head: 'bird', eyes: 'big', mouth: 'beak', torso: 'belly', arms: 'wing', legs: 'stick', hands: 'none', feet: 'bird',
      skin: '#2fa8ff', shirt: '#2fa8ff', pants: '#e8892a', accent: '#ffd23f', leg: .8 }],
    ['monster', 'Monster', 'biped', { head: 'alien', eyes: 'one', mouth: 'fangs', hat: 'horns', torso: 'belly', hands: 'claw', feet: 'paw', arms: 'noodle', legs: 'block',
      skin: '#9be15d', shirt: '#9be15d', pants: '#4fa63a', accent: '#c26bff', width: 1.15 }],
    ['pup', 'Pup', 'quad', { head: 'dog', eyes: 'big', mouth: 'tongue', torso: 'belly', legs: 'noodle', feet: 'paw', skin: '#f1b07a', shirt: '#f1b07a', pants: '#f1b07a',
      hair: '#8d5a3b', accent: '#ff6b6b', size: 1.05 }],
    ['kitty', 'Kitty', 'quad', { head: 'cat', eyes: 'happy', mouth: 'smile', torso: 'belly', legs: 'noodle', feet: 'paw', skin: '#ffa63d', shirt: '#ffa63d', pants: '#ffa63d',
      hair: '#ffa63d', accent: '#4757ff' }],
    ['worm', 'Caterpillar', 'worm', { head: 'round', eyes: 'googly', mouth: 'grin', hat: 'antenna', skin: '#9be15d', shirt: '#9be15d', accent: '#c26bff' }]
  ];
  TL.newCharacter = function (starter, name, extraLook, extras) {
    var s = TL.STARTERS.filter(function (x) { return x[0] === starter; })[0] || TL.STARTERS[0];
    var ch = { id: TL.uid('c'), name: name || s[1], v: 1, rig: s[2], starter: s[0],
      look: Object.assign({}, TL.DEFAULT_LOOK, s[3], extraLook || {}), bones: RIGS[s[2]](), anims: TL.starterAnims(s[2]) };
    (extras || []).forEach(function (e) { var b = TL.addExtra(ch, e[0] || e); if (b && e[1]) b.col = e[1]; });
    return ch;
  };
  /* A fresh set of starter animations, keeping the ones the user made (or changed). */
  TL.resetAnims = function (ch) { ch.anims = TL.starterAnims(ch.rig || 'biped'); return ch; };

  var PRESETS = [
    ['p_blox', 'Blox', 'hero', { hat: 'cap', hair: '#ff4f6d', mouth: 'grin', shirt: '#4757ff', pants: '#1fbf63' }],
    ['p_pixel', 'Pixel', 'hero', { hat: 'bob', hair: '#c26bff', torso: 'dress', shirt: '#ff4fa3', pants: '#ffcf9e', skin: '#ffcf9e', eyes: 'big', shoes: '#7a6bff', arms: 'noodle', legs: 'noodle', accent: '#ffd23f' }, [['wand']]],
    ['p_clank', 'Sir Clank', 'bot', { accent: '#ff8a2b', torso: 'armor' }, [['jetpack', 'accent']]],
    ['p_noodle', 'Noodle', 'stick', { hat: 'phones', accent: '#ff4fa3', eyes: 'big', mouth: 'grin' }],
    ['p_biscuit', 'Biscuit', 'pup', {}],
    ['p_beaky', 'Captain Beaky', 'birdy', { hat: 'pirate', accent: '#ffd23f', skin: '#ff6b6b', shirt: '#ff6b6b' }, [['sword', '#ffd23f']]],
    ['p_zorp', 'Zorp', 'monster', { hat: 'antenna', accent: '#ff4fa3' }, [['cape', '#c26bff']]],
    ['p_wiggles', 'Wiggles', 'worm', { hat: 'tophat', hair: '#3a3f55', accent: '#ffd23f' }]
  ];
  TL.PRESETS = {};
  TL.PRESET_LIST = PRESETS.map(function (p) {
    var ch = TL.newCharacter(p[2], p[1], p[3], p[4]);
    ch.id = p[0]; ch.preset = true;
    TL.PRESETS[p[0]] = ch;
    return ch;
  });
  TL.isPreset = function (id) { return typeof id === 'string' && id.indexOf('p_') === 0; };
  /* "Make it mine": a premade character copied into your own cast. */
  TL.copyChar = function (ch, name) {
    var c = TL.clone(ch); c.id = TL.uid('c'); c.name = name || ch.name; delete c.preset; delete c.thumb; return c;
  };

  /* ------------------------------------------------------------------ pictures of characters */
  TL.fitChar = function (ch, pose, w, h, pad) {
    var bb = TL.bounds(ch, pose || {}), s = Math.min((w - pad * 2) / bb.w, (h - pad * 2) / bb.h);
    return { s: s, x: w / 2 - (bb.x + bb.w / 2) * s, y: h / 2 - (bb.y + bb.h / 2) * s };
  };
  TL.charCanvas = function (ch, w, h, opts) {
    opts = opts || {};
    var cv = document.createElement('canvas'), dpr = opts.dpr || 1;
    cv.width = w * dpr; cv.height = h * dpr;
    var ctx = cv.getContext('2d'); ctx.scale(dpr, dpr);
    var pose = opts.pose || TL.animPose(ch, TL.findAnim(ch, 'idle'), 0, 1);
    var f = TL.fitChar(ch, pose, w, h, opts.pad == null ? 10 : opts.pad);
    TL.drawChar(ctx, ch, pose, { x: f.x, y: f.y, s: f.s });
    return cv;
  };
  TL.charThumb = function (ch) { return TL.charCanvas(ch, 200, 200, { pad: 12 }).toDataURL('image/png'); };
  /* A small picture of one part in the builder: the character's head wearing that item, etc. */
  TL.partIcon = function (ch, slot, id, size) {
    var c = TL.clone(ch); c.look = Object.assign({}, TL.DEFAULT_LOOK, c.look || {});
    var cv = document.createElement('canvas'), dpr = 2; size = size || 76;
    cv.width = cv.height = size * dpr;
    var ctx = cv.getContext('2d'); ctx.scale(dpr, dpr); ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.lineWidth = 3.2; ctx.strokeStyle = INK;
    if (slot === 'head' || slot === 'eyes' || slot === 'mouth' || slot === 'hat') {
      c.look[slot] = id;
      ctx.save(); ctx.translate(size / 2, size * (slot === 'hat' ? .6 : .52)); var S = size * (slot === 'hat' ? .5 : .62) ;
      ctx.scale(1, 1); TL.drawFace(ctx, S, c.look, { t: 0 }); ctx.restore();
      return cv;
    }
    if (slot === 'extra') {
      var tmp = TL.clone(ch); tmp.bones = tmp.bones.filter(function (b) { return !(b.kind === 'extra' && b.id.charAt(0) === 'x'); });
      TL.addExtra(tmp, id);
      var pose = {}, f = TL.fitChar(tmp, pose, size, size, 4);
      TL.drawChar(ctx, tmp, pose, { x: f.x, y: f.y, s: f.s });
      return cv;
    }
    c.look[slot] = id;
    var p2 = {}, f2 = TL.fitChar(c, p2, size, size, 4);
    TL.drawChar(ctx, c, p2, { x: f2.x, y: f2.y, s: f2.s });
    return cv;
  };
  /* Pick a random look (the dice button). */
  TL.randomLook = function (ch) {
    var pick = function (a) { return a[Math.floor(Math.random() * a.length)]; }, L = ch.look;
    ['eyes', 'mouth', 'hat'].forEach(function (k) { L[k] = pick(TL.PARTS[k])[0]; });
    if (ch.rig === 'biped') { ['head', 'torso', 'hands', 'feet'].forEach(function (k) { L[k] = pick(TL.PARTS[k])[0]; }); L.arms = pick(TL.PARTS.arms.slice(0, 5))[0]; L.legs = pick(TL.PARTS.legs.slice(0, 5))[0]; if (L.torso === 'stick') L.torso = 'block'; }
    else L.head = pick(['round', 'cat', 'bear', 'dog', 'bunny', 'alien']);
    ['skin', 'shirt', 'pants', 'shoes', 'hair', 'accent'].forEach(function (k) { L[k] = pick(TL.COLORS); });
    if (L.skin === '#1a1d3a') L.skin = '#ffd23f';
    return ch;
  };
  TL.lum = lum;
})();

/* ===== _tl_scenes.html ===== */
(function () {
  'use strict';
  var TL = window.TL = window.TL || {};
  var W = 1280, H = 720, LINE = 'rgba(26,29,58,.55)';

  function rng(seed) { var s = seed >>> 0 || 1; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  function grad(ctx, y0, y1, stops) { var g = ctx.createLinearGradient(0, y0, 0, y1); stops.forEach(function (s, i) { g.addColorStop(i / (stops.length - 1), s); }); return g; }
  function sky(ctx, a, b) { ctx.fillStyle = grad(ctx, 0, H, [a, b]); ctx.fillRect(0, 0, W, H); }
  function line(ctx, w) { ctx.lineWidth = w || 4; ctx.strokeStyle = LINE; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; }
  function fs(ctx, c) { ctx.fillStyle = c; ctx.fill(); ctx.stroke(); }
  function f(ctx, c) { ctx.fillStyle = c; ctx.fill(); }
  function circ(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); }
  function rr(ctx, x, y, w, h, r) { TL.rr(ctx, x, y, w, h, r); }
  function cloud(ctx, x, y, s, c) {
    ctx.beginPath(); [[0, 0, 34], [36, -14, 42], [80, 0, 34], [40, 10, 34]].forEach(function (p) { ctx.moveTo(x + p[0] * s + p[2] * s, y + p[1] * s); ctx.arc(x + p[0] * s, y + p[1] * s, p[2] * s, 0, Math.PI * 2); });
    f(ctx, c || 'rgba(255,255,255,.95)');
  }
  function sun(ctx, x, y, r, c, rays) {
    if (rays) { ctx.save(); ctx.translate(x, y); ctx.strokeStyle = c; ctx.lineWidth = 8; ctx.lineCap = 'round'; for (var i = 0; i < 12; i++) { ctx.rotate(Math.PI / 6); ctx.beginPath(); ctx.moveTo(r + 14, 0); ctx.lineTo(r + 36, 0); ctx.stroke(); } ctx.restore(); }
    line(ctx); circ(ctx, x, y, r); fs(ctx, c);
  }
  function ground(ctx, y, c, edge) { line(ctx); ctx.beginPath(); ctx.moveTo(-10, y); ctx.lineTo(W + 10, y); ctx.lineTo(W + 10, H + 10); ctx.lineTo(-10, H + 10); ctx.closePath(); fs(ctx, c); if (edge) { ctx.fillStyle = edge; ctx.fillRect(0, y + 2, W, 14); } }
  function hill(ctx, cx, y, rx, ry, c) { line(ctx, 3); ctx.beginPath(); ctx.ellipse(cx, y, rx, ry, 0, Math.PI, Math.PI * 2); ctx.closePath(); fs(ctx, c); }
  function roundTree(ctx, x, y, s, leaf, trunk) {
    line(ctx); rr(ctx, x - 9 * s, y - 70 * s, 18 * s, 72 * s, 5); fs(ctx, trunk || '#9b6a3c');
    ctx.beginPath(); [[0, -110, 46], [-34, -86, 34], [34, -86, 34]].forEach(function (p) { ctx.moveTo(x + p[0] * s + p[2] * s, y + p[1] * s); ctx.arc(x + p[0] * s, y + p[1] * s, p[2] * s, 0, Math.PI * 2); });
    fs(ctx, leaf || '#3fbf55');
    circ(ctx, x - 14 * s, y - 120 * s, 10 * s); f(ctx, 'rgba(255,255,255,.25)');
  }
  function pine(ctx, x, y, s, c, snow) {
    line(ctx); rr(ctx, x - 8 * s, y - 30 * s, 16 * s, 32 * s, 3); fs(ctx, '#7a4e2a');
    for (var i = 0; i < 3; i++) {
      var yy = y - 30 * s - i * 42 * s, w = (70 - i * 16) * s;
      ctx.beginPath(); ctx.moveTo(x - w, yy); ctx.lineTo(x, yy - 70 * s); ctx.lineTo(x + w, yy); ctx.closePath(); fs(ctx, c);
      if (snow) { ctx.beginPath(); ctx.moveTo(x - w * .35, yy - 46 * s); ctx.lineTo(x, yy - 70 * s); ctx.lineTo(x + w * .35, yy - 46 * s); ctx.closePath(); f(ctx, '#ffffff'); }
    }
  }
  function stars(ctx, n, seed, maxY) {
    var r = rng(seed);
    for (var i = 0; i < n; i++) { var x = r() * W, y = r() * (maxY || H), s = r() * 2.4 + .6; ctx.globalAlpha = .5 + r() * .5; circ(ctx, x, y, s); f(ctx, '#ffffff'); }
    ctx.globalAlpha = 1;
    for (var j = 0; j < 6; j++) { var sx = r() * W, sy = r() * (maxY || H) * .8; TL.star(ctx, sx, sy, 9 + r() * 6); f(ctx, '#fff6c2'); }
  }
  function flowers(ctx, y0, y1, n, seed) {
    var r = rng(seed), cols = ['#ff4fa3', '#ffd23f', '#ffffff', '#c26bff', '#ff6b6b'];
    for (var i = 0; i < n; i++) { var x = r() * W, y = y0 + r() * (y1 - y0); circ(ctx, x, y, 5); f(ctx, cols[i % cols.length]); circ(ctx, x, y, 2); f(ctx, '#ffd23f'); }
  }
  function studs(ctx, x, y, w, h, c) { for (var i = x + 14; i < x + w - 6; i += 28) { ctx.beginPath(); ctx.ellipse(i, y + 2, 9, 4, 0, 0, Math.PI * 2); f(ctx, c); } }
  function block(ctx, x, y, w, h, top, side) {
    line(ctx, 3); rr(ctx, x, y, w, h, 6); fs(ctx, side || top);
    ctx.fillStyle = top; ctx.fillRect(x + 2, y + 2, w - 4, Math.min(h - 4, 22)); studs(ctx, x, y + 6, w, h, 'rgba(255,255,255,.35)');
  }

  var SCENES = [
    ['park', 'Sunny Park', '🌳', function (ctx) {
      sky(ctx, '#7ccfff', '#d8f3ff'); sun(ctx, 1110, 110, 52, '#ffd23f', true);
      cloud(ctx, 180, 120, 1.1); cloud(ctx, 620, 80, .8); cloud(ctx, 900, 180, .7);
      hill(ctx, 260, 470, 420, 190, '#68cf5a'); hill(ctx, 1000, 480, 480, 220, '#56c24b');
      roundTree(ctx, 120, 470, 1.1); roundTree(ctx, 1180, 470, 1.3, '#2fae4f'); roundTree(ctx, 860, 440, .8, '#4cc861');
      ground(ctx, 460, '#7ed957', '#6ccb4b');
      line(ctx); ctx.beginPath(); ctx.moveTo(560, 462); ctx.quadraticCurveTo(640, 560, 420, 720); ctx.lineTo(980, 720); ctx.quadraticCurveTo(760, 560, 720, 462); ctx.closePath(); fs(ctx, '#f6dca0');
      flowers(ctx, 480, 700, 46, 3);
      line(ctx); rr(ctx, 930, 520, 150, 22, 6); fs(ctx, '#c8814a'); rr(ctx, 930, 486, 150, 18, 6); fs(ctx, '#c8814a');
      [945, 1060].forEach(function (x) { rr(ctx, x, 540, 12, 40, 3); fs(ctx, '#7a4e2a'); });
    }],
    ['city', 'City Street', '🏙️', function (ctx) {
      sky(ctx, '#ff9f7a', '#ffe0b0'); sun(ctx, 640, 380, 90, '#ffd76a');
      var r = rng(7), x = -20;
      while (x < W) { var w = 90 + r() * 80, h = 180 + r() * 200; line(ctx, 3); rr(ctx, x, 470 - h, w, h + 20, 6); fs(ctx, '#8f7bd6');
        for (var wy = 470 - h + 20; wy < 450; wy += 34) for (var wx = x + 14; wx < x + w - 20; wx += 28) { ctx.fillStyle = r() > .4 ? '#ffe7a3' : '#6c5bb8'; ctx.fillRect(wx, wy, 14, 18); }
        x += w + 6; }
      var cols = ['#ff6b6b', '#2fa8ff', '#ffd23f', '#1fbf63', '#ff4fa3', '#ffa63d'];
      x = -30; var i = 0;
      while (x < W) { var w2 = 150 + r() * 90, h2 = 150 + r() * 110; line(ctx); rr(ctx, x, 560 - h2, w2, h2, 8); fs(ctx, cols[i % 6]);
        rr(ctx, x + w2 / 2 - 22, 560 - 66, 44, 66, 6); fs(ctx, '#5a3a26');
        for (var k = 0; k < 2; k++) { rr(ctx, x + 18 + k * (w2 - 66), 560 - h2 + 26, 30, 34, 5); fs(ctx, '#e8f6ff'); }
        x += w2 + 10; i++; }
      ground(ctx, 560, '#c9ced8'); ctx.fillStyle = '#b3b9c6'; for (var sx = 0; sx < W; sx += 80) ctx.fillRect(sx, 562, 3, 46);
      line(ctx); ctx.fillStyle = '#3a3f55'; ctx.fillRect(0, 610, W, 110); ctx.fillStyle = '#ffd23f'; for (var dx = 20; dx < W; dx += 120) ctx.fillRect(dx, 662, 64, 9);
      [[220, 0], [1060, 0]].forEach(function (p) { line(ctx); rr(ctx, p[0], 380, 12, 200, 4); fs(ctx, '#3a3f55'); circ(ctx, p[0] + 6, 372, 20); fs(ctx, '#fff2a8'); });
    }],
    ['space', 'Outer Space', '🚀', function (ctx) {
      sky(ctx, '#0d0a2e', '#3b2380'); stars(ctx, 220, 11, 560);
      line(ctx); circ(ctx, 1040, 170, 86); fs(ctx, '#ff8a5c');
      ctx.save(); ctx.translate(1040, 170); ctx.rotate(-.35); ctx.lineWidth = 12; ctx.strokeStyle = '#ffd88a'; ctx.beginPath(); ctx.ellipse(0, 0, 150, 34, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
      line(ctx); circ(ctx, 220, 150, 40); fs(ctx, '#5be0d0'); circ(ctx, 420, 90, 18); fs(ctx, '#ff4fa3');
      line(ctx); ctx.beginPath(); ctx.moveTo(-10, 560); ctx.quadraticCurveTo(320, 500, 640, 548); ctx.quadraticCurveTo(960, 590, 1290, 520); ctx.lineTo(1290, 730); ctx.lineTo(-10, 730); ctx.closePath(); fs(ctx, '#b9c0cf');
      [[180, 620, 46], [520, 660, 30], [860, 610, 60], [1150, 670, 34]].forEach(function (c) { ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(c[0], c[1], c[2], c[2] * .35, 0, 0, Math.PI * 2); fs(ctx, '#949cb0'); });
      line(ctx); ctx.save(); ctx.translate(640, 250); ctx.rotate(.5); rr(ctx, -16, -60, 32, 100, 16); fs(ctx, '#ffffff'); circ(ctx, 0, -20, 9); fs(ctx, '#2fa8ff');
      ctx.beginPath(); ctx.moveTo(-16, 20); ctx.lineTo(-34, 50); ctx.lineTo(-16, 40); fs(ctx, '#ff6b6b'); ctx.beginPath(); ctx.moveTo(16, 20); ctx.lineTo(34, 50); ctx.lineTo(16, 40); fs(ctx, '#ff6b6b');
      ctx.beginPath(); ctx.moveTo(-10, 42); ctx.lineTo(0, 76); ctx.lineTo(10, 42); f(ctx, '#ffd23f'); ctx.restore();
    }],
    ['beach', 'Beach Day', '🏖️', function (ctx) {
      sky(ctx, '#5ccaff', '#c7f0ff'); sun(ctx, 160, 110, 56, '#ffd23f', true); cloud(ctx, 760, 110, .9); cloud(ctx, 1040, 70, .6);
      ctx.fillStyle = grad(ctx, 380, 540, ['#2fa8ff', '#1f7fd6']); ctx.fillRect(0, 380, W, 160);
      ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 4; var r = rng(4);
      for (var i = 0; i < 26; i++) { var x = r() * W, y = 400 + r() * 110; ctx.beginPath(); ctx.arc(x, y, 14, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); }
      line(ctx); ctx.beginPath(); ctx.moveTo(-10, 520); ctx.quadraticCurveTo(400, 480, 760, 520); ctx.quadraticCurveTo(1040, 550, 1290, 500); ctx.lineTo(1290, 730); ctx.lineTo(-10, 730); ctx.closePath(); fs(ctx, '#ffe2a0');
      line(ctx); ctx.beginPath(); ctx.moveTo(1080, 640); ctx.quadraticCurveTo(1060, 450, 1130, 320); ctx.lineWidth = 22; ctx.strokeStyle = '#a8733f'; ctx.stroke(); line(ctx);
      [[-2.6, '#2fae4f'], [-1.9, '#3fbf55'], [-1.2, '#2fae4f'], [-.5, '#3fbf55'], [-3.2, '#3fbf55']].forEach(function (l) { ctx.save(); ctx.translate(1130, 320); ctx.rotate(l[0]); ctx.beginPath(); ctx.ellipse(70, 0, 76, 22, 0, 0, Math.PI * 2); fs(ctx, l[1]); ctx.restore(); });
      line(ctx); ctx.beginPath(); ctx.moveTo(300, 470); ctx.lineTo(310, 640); ctx.lineWidth = 8; ctx.strokeStyle = '#ffffff'; ctx.stroke(); line(ctx);
      ctx.beginPath(); ctx.moveTo(190, 500); ctx.quadraticCurveTo(300, 380, 420, 480); ctx.closePath(); fs(ctx, '#ff4f6d');
      [[560, 660, '#ff9ec2'], [700, 690, '#ffffff'], [880, 650, '#ffd23f']].forEach(function (s) { circ(ctx, s[0], s[1], 10); fs(ctx, s[2]); });
    }],
    ['spooky', 'Spooky Woods', '🎃', function (ctx) {
      sky(ctx, '#140f35', '#4a2f80'); stars(ctx, 90, 23, 380);
      line(ctx); circ(ctx, 980, 150, 84); fs(ctx, '#fff3c4'); circ(ctx, 950, 130, 14); f(ctx, '#efe0a6'); circ(ctx, 1010, 180, 10); f(ctx, '#efe0a6');
      ctx.fillStyle = '#1b1438';
      [[120, 1], [420, .8], [1180, 1.1], [760, .7]].forEach(function (t) {
        var x = t[0], s = t[1]; ctx.save(); ctx.translate(x, 560); ctx.scale(s, s); ctx.beginPath(); ctx.moveTo(-18, 0); ctx.lineTo(-10, -260); ctx.lineTo(-60, -330); ctx.lineTo(-50, -336); ctx.lineTo(-4, -290); ctx.lineTo(0, -380); ctx.lineTo(10, -380); ctx.lineTo(12, -300); ctx.lineTo(70, -350); ctx.lineTo(76, -340); ctx.lineTo(16, -250); ctx.lineTo(20, 0); ctx.closePath(); ctx.fill(); ctx.restore();
      });
      ground(ctx, 560, '#2f2560');
      [[300, 520], [560, 540], [900, 528]].forEach(function (g) { line(ctx); rr(ctx, g[0] - 30, g[1] - 70, 60, 92, 26); fs(ctx, '#8b8fae'); ctx.fillStyle = '#5b5f80'; ctx.font = '700 18px Nunito, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('RIP', g[0], g[1] - 22); });
      [[640, 620], [1080, 600]].forEach(function (p) { line(ctx); ctx.beginPath(); ctx.ellipse(p[0], p[1], 40, 32, 0, 0, Math.PI * 2); fs(ctx, '#ff8a2b'); ctx.fillStyle = '#3d1f00'; ctx.beginPath(); ctx.moveTo(p[0] - 20, p[1] - 8); ctx.lineTo(p[0] - 8, p[1] - 8); ctx.lineTo(p[0] - 14, p[1] - 20); ctx.fill(); ctx.beginPath(); ctx.moveTo(p[0] + 8, p[1] - 8); ctx.lineTo(p[0] + 20, p[1] - 8); ctx.lineTo(p[0] + 14, p[1] - 20); ctx.fill(); ctx.fillRect(p[0] - 18, p[1] + 6, 36, 8); });
      [[300, 210], [520, 150], [700, 250]].forEach(function (b) { ctx.fillStyle = '#0d0a22'; ctx.beginPath(); ctx.moveTo(b[0], b[1]); ctx.quadraticCurveTo(b[0] - 20, b[1] - 18, b[0] - 40, b[1] - 4); ctx.quadraticCurveTo(b[0] - 24, b[1] - 6, b[0], b[1] + 8); ctx.quadraticCurveTo(b[0] + 24, b[1] - 6, b[0] + 40, b[1] - 4); ctx.quadraticCurveTo(b[0] + 20, b[1] - 18, b[0], b[1]); ctx.fill(); });
      ctx.fillStyle = 'rgba(200,190,255,.12)'; for (var i = 0; i < 4; i++) { ctx.beginPath(); ctx.ellipse(200 + i * 330, 640, 260, 30, 0, 0, Math.PI * 2); ctx.fill(); }
    }],
    ['castle', 'Castle', '🏰', function (ctx) {
      sky(ctx, '#86d0ff', '#e6f7ff'); cloud(ctx, 120, 90, .9); cloud(ctx, 1050, 130, 1);
      hill(ctx, 640, 520, 760, 160, '#5cc24e');
      line(ctx); var stone = '#c9ced8', dark = '#a9b0c0';
      rr(ctx, 380, 200, 520, 300, 6); fs(ctx, stone);
      [[330, 130, 130, 380], [820, 130, 130, 380]].forEach(function (t) { rr(ctx, t[0], t[1], t[2], t[3], 6); fs(ctx, dark);
        for (var c = 0; c < 4; c++) { rr(ctx, t[0] + c * 34, t[1] - 26, 26, 30, 3); fs(ctx, dark); }
        ctx.beginPath(); ctx.moveTo(t[0] + 65, t[1] - 26); ctx.lineTo(t[0] + 65, t[1] - 110); ctx.stroke(); ctx.beginPath(); ctx.moveTo(t[0] + 65, t[1] - 110); ctx.lineTo(t[0] + 125, t[1] - 92); ctx.lineTo(t[0] + 65, t[1] - 74); ctx.closePath(); fs(ctx, '#ff4fa3'); });
      for (var c2 = 0; c2 < 7; c2++) { rr(ctx, 470 + c2 * 50, 176, 32, 30, 3); fs(ctx, stone); }
      ctx.beginPath(); ctx.moveTo(560, 500); ctx.lineTo(560, 380); ctx.arc(640, 380, 80, Math.PI, 0); ctx.lineTo(720, 500); ctx.closePath(); fs(ctx, '#6b4426');
      [[440, 280], [800, 280]].forEach(function (w) { rr(ctx, w[0] - 20, w[1], 40, 60, 20); fs(ctx, '#3a3f55'); });
      ground(ctx, 500, '#7ed957', '#6ccb4b');
      line(ctx); ctx.beginPath(); ctx.moveTo(560, 502); ctx.lineTo(720, 502); ctx.lineTo(860, 720); ctx.lineTo(420, 720); ctx.closePath(); fs(ctx, '#d9c9a6');
      flowers(ctx, 520, 700, 30, 8);
    }],
    ['sea', 'Under the Sea', '🐠', function (ctx) {
      sky(ctx, '#27c4e8', '#0a4d8c');
      ctx.fillStyle = 'rgba(255,255,255,.08)'; for (var i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(100 + i * 260, 0); ctx.lineTo(180 + i * 260, 0); ctx.lineTo(80 + i * 260 + 120, 720); ctx.lineTo(i * 260, 720); ctx.closePath(); ctx.fill(); }
      var r = rng(5); ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 3;
      for (var b = 0; b < 30; b++) { circ(ctx, r() * W, r() * 520, 4 + r() * 10); ctx.stroke(); }
      line(ctx); ctx.beginPath(); ctx.moveTo(-10, 590); ctx.quadraticCurveTo(320, 560, 640, 590); ctx.quadraticCurveTo(960, 620, 1290, 580); ctx.lineTo(1290, 730); ctx.lineTo(-10, 730); ctx.closePath(); fs(ctx, '#f3d9a4');
      [[80, '#1fbf63'], [260, '#2fae4f'], [1000, '#1fbf63'], [1210, '#3fbf55']].forEach(function (s) { line(ctx, 3); ctx.beginPath(); ctx.moveTo(s[0], 600); ctx.bezierCurveTo(s[0] - 40, 520, s[0] + 40, 460, s[0], 380); ctx.bezierCurveTo(s[0] + 30, 460, s[0] - 10, 520, s[0] + 24, 600); ctx.closePath(); fs(ctx, s[1]); });
      [[420, 600, '#ff6b9e'], [820, 610, '#ffa63d']].forEach(function (c) { line(ctx, 3); ctx.beginPath(); ctx.moveTo(c[0] - 40, c[1]); ctx.lineTo(c[0] - 30, c[1] - 70); ctx.lineTo(c[0] - 10, c[1] - 40); ctx.lineTo(c[0], c[1] - 100); ctx.lineTo(c[0] + 14, c[1] - 50); ctx.lineTo(c[0] + 36, c[1] - 80); ctx.lineTo(c[0] + 40, c[1]); ctx.closePath(); fs(ctx, c[2]); });
      line(ctx); rr(ctx, 600, 600, 120, 70, 10); fs(ctx, '#a8733f'); ctx.beginPath(); ctx.moveTo(600, 610); ctx.quadraticCurveTo(660, 550, 720, 610); ctx.closePath(); fs(ctx, '#c8814a'); rr(ctx, 650, 600, 20, 26, 4); fs(ctx, '#ffd23f');
      [[300, 200, '#ffd23f', 1], [960, 300, '#ff6b6b', -1], [600, 140, '#ff4fa3', 1]].forEach(function (fi) { ctx.save(); ctx.translate(fi[0], fi[1]); ctx.scale(fi[3], 1); line(ctx, 3); ctx.beginPath(); ctx.ellipse(0, 0, 34, 20, 0, 0, Math.PI * 2); fs(ctx, fi[2]); ctx.beginPath(); ctx.moveTo(-30, 0); ctx.lineTo(-56, -18); ctx.lineTo(-56, 18); ctx.closePath(); fs(ctx, fi[2]); circ(ctx, 16, -4, 5); f(ctx, '#1a1d3a'); ctx.restore(); });
    }],
    ['school', 'Classroom', '🏫', function (ctx) {
      ctx.fillStyle = '#ffe9c7'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = '#ffdcae'; for (var x = 0; x < W; x += 64) ctx.fillRect(x, 0, 30, 540);
      line(ctx); rr(ctx, 300, 90, 560, 300, 12); fs(ctx, '#8b5a2b'); rr(ctx, 320, 108, 520, 264, 6); fs(ctx, '#2e6b4f');
      ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.font = '400 54px "Lilita One", sans-serif'; ctx.textAlign = 'center'; ctx.fillText('2 + 2 = 🐟?', 580, 200);
      ctx.font = '700 28px Nunito, sans-serif'; ctx.fillText('Draw a cartoon! ✏️', 580, 270); ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(760, 320, 26, 0, Math.PI * 2); ctx.stroke();
      line(ctx); rr(ctx, 960, 100, 220, 190, 10); fs(ctx, '#ffffff'); rr(ctx, 976, 116, 188, 158, 4); fs(ctx, '#8fd8ff'); ctx.beginPath(); ctx.moveTo(1070, 116); ctx.lineTo(1070, 274); ctx.moveTo(976, 195); ctx.lineTo(1164, 195); ctx.stroke(); cloud(ctx, 1010, 160, .4);
      circ(ctx, 160, 140, 54); fs(ctx, '#ffffff'); ctx.beginPath(); ctx.moveTo(160, 140); ctx.lineTo(160, 104); ctx.moveTo(160, 140); ctx.lineTo(186, 152); ctx.stroke();
      ground(ctx, 540, '#d9a066'); ctx.strokeStyle = 'rgba(122,78,42,.35)'; ctx.lineWidth = 3; for (var y = 570; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
      line(ctx); rr(ctx, 80, 460, 220, 26, 6); fs(ctx, '#ffa63d'); [96, 268].forEach(function (lx) { rr(ctx, lx, 484, 16, 90, 4); fs(ctx, '#3a3f55'); });
      rr(ctx, 130, 430, 60, 34, 4); fs(ctx, '#ff6b6b'); rr(ctx, 200, 440, 70, 22, 4); fs(ctx, '#2fa8ff');
      circ(ctx, 1110, 520, 26); fs(ctx, '#ff4f6d'); ctx.beginPath(); ctx.moveTo(1110, 494); ctx.lineTo(1116, 480); ctx.stroke();
    }],
    ['volcano', 'Volcano Island', '🌋', function (ctx) {
      sky(ctx, '#ff8c5a', '#ffd9a0');
      ctx.fillStyle = 'rgba(90,70,90,.55)'; [[640, 100, 70], [700, 60, 90], [600, 40, 60]].forEach(function (c) { circ(ctx, c[0], c[1], c[2]); ctx.fill(); });
      line(ctx); ctx.beginPath(); ctx.moveTo(220, 520); ctx.lineTo(560, 170); ctx.lineTo(720, 170); ctx.lineTo(1080, 520); ctx.closePath(); fs(ctx, '#7a5a5a');
      ctx.beginPath(); ctx.moveTo(560, 172); ctx.lineTo(720, 172); ctx.lineTo(700, 210); ctx.lineTo(680, 330); ctx.lineTo(660, 240); ctx.lineTo(630, 300); ctx.lineTo(610, 220); ctx.lineTo(580, 260); ctx.closePath(); fs(ctx, '#ff6b2b');
      ctx.fillStyle = '#ffd23f'; circ(ctx, 640, 168, 30); ctx.fill();
      ctx.fillStyle = '#2f9fd6'; ctx.fillRect(0, 470, W, 70);
      ground(ctx, 520, '#4a3b46'); ctx.strokeStyle = '#ff8a2b'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(100, 600); ctx.lineTo(220, 640); ctx.lineTo(300, 610); ctx.moveTo(800, 660); ctx.lineTo(920, 620); ctx.lineTo(1040, 680); ctx.stroke();
      line(ctx); ctx.beginPath(); ctx.moveTo(1180, 640); ctx.quadraticCurveTo(1170, 500, 1200, 430); ctx.lineWidth = 16; ctx.strokeStyle = '#8b5a2b'; ctx.stroke(); line(ctx);
      [-2.5, -1.7, -.9, -.2].forEach(function (a) { ctx.save(); ctx.translate(1200, 430); ctx.rotate(a); ctx.beginPath(); ctx.ellipse(52, 0, 56, 16, 0, 0, Math.PI * 2); fs(ctx, '#2fae4f'); ctx.restore(); });
    }],
    ['snow', 'Snowy Peaks', '⛄', function (ctx) {
      sky(ctx, '#a9dcff', '#f0f9ff');
      [[250, 520, 300, 360, '#8fa6d6'], [700, 520, 380, 430, '#7d95c8'], [1120, 520, 300, 330, '#8fa6d6']].forEach(function (m) {
        line(ctx); ctx.beginPath(); ctx.moveTo(m[0] - m[2], m[1]); ctx.lineTo(m[0], m[1] - m[3]); ctx.lineTo(m[0] + m[2], m[1]); ctx.closePath(); fs(ctx, m[4]);
        ctx.beginPath(); ctx.moveTo(m[0] - m[2] * .3, m[1] - m[3] * .7); ctx.lineTo(m[0], m[1] - m[3]); ctx.lineTo(m[0] + m[2] * .3, m[1] - m[3] * .7); ctx.lineTo(m[0] + m[2] * .1, m[1] - m[3] * .62); ctx.lineTo(m[0] - m[2] * .05, m[1] - m[3] * .72); ctx.closePath(); fs(ctx, '#ffffff');
      });
      pine(ctx, 90, 540, 1.1, '#2f8f5b', true); pine(ctx, 1200, 540, 1.2, '#2f8f5b', true); pine(ctx, 980, 520, .7, '#3aa06a', true);
      ground(ctx, 520, '#ffffff', '#e6f3ff');
      line(ctx); circ(ctx, 300, 600, 52); fs(ctx, '#ffffff'); circ(ctx, 300, 520, 36); fs(ctx, '#ffffff'); circ(ctx, 288, 512, 4); f(ctx, '#1a1d3a'); circ(ctx, 310, 512, 4); f(ctx, '#1a1d3a');
      ctx.beginPath(); ctx.moveTo(300, 522); ctx.lineTo(332, 528); ctx.lineTo(300, 532); ctx.closePath(); fs(ctx, '#ff8a2b'); rr(ctx, 270, 474, 60, 14, 4); fs(ctx, '#3a3f55'); rr(ctx, 282, 444, 36, 34, 4); fs(ctx, '#3a3f55');
      var r = rng(9); for (var i = 0; i < 70; i++) { circ(ctx, r() * W, r() * 520, 2 + r() * 3); f(ctx, 'rgba(255,255,255,.9)'); }
    }],
    ['candy', 'Candy Land', '🍭', function (ctx) {
      sky(ctx, '#ffbfe3', '#fff3fa'); cloud(ctx, 160, 110, 1, '#ffffff'); cloud(ctx, 980, 80, .8, '#ffe8f5');
      hill(ctx, 260, 500, 420, 170, '#9ef0d8'); hill(ctx, 1000, 510, 460, 200, '#ffd6a8');
      [[180, 420, '#ff4fa3'], [1100, 400, '#2fa8ff'], [760, 440, '#ffd23f']].forEach(function (l) {
        line(ctx); rr(ctx, l[0] - 6, l[1], 12, 140, 4); fs(ctx, '#ffffff');
        circ(ctx, l[0], l[1] - 10, 50); fs(ctx, l[2]); ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 7; ctx.beginPath();
        for (var a = 0; a < 18; a += .3) { var rr2 = a * 2.6; ctx.lineTo(l[0] + Math.cos(a) * rr2, l[1] - 10 + Math.sin(a) * rr2); } ctx.stroke();
      });
      ground(ctx, 540, '#ff9ccc', '#ff86c0');
      line(ctx); ctx.beginPath(); ctx.moveTo(-10, 640); ctx.quadraticCurveTo(400, 600, 700, 650); ctx.quadraticCurveTo(1000, 700, 1290, 640); ctx.lineTo(1290, 690); ctx.quadraticCurveTo(1000, 740, 700, 700); ctx.quadraticCurveTo(400, 650, -10, 690); ctx.closePath(); fs(ctx, '#8b4a2b');
      [[480, 500], [960, 520]].forEach(function (c) { line(ctx); ctx.beginPath(); ctx.moveTo(c[0], c[1] + 40); ctx.lineTo(c[0], c[1] - 60); ctx.arc(c[0] + 22, c[1] - 60, 22, Math.PI, 0); ctx.lineWidth = 14; ctx.strokeStyle = '#ffffff'; ctx.stroke(); ctx.strokeStyle = '#ff4f6d'; ctx.setLineDash([10, 12]); ctx.stroke(); ctx.setLineDash([]); });
      var r = rng(12), cols = ['#ff4fa3', '#2fa8ff', '#ffd23f', '#1fbf63', '#c26bff']; for (var i = 0; i < 40; i++) { ctx.save(); ctx.translate(r() * W, 560 + r() * 70); ctx.rotate(r() * 3); ctx.fillStyle = cols[i % 5]; ctx.fillRect(-8, -3, 16, 6); ctx.restore(); }
    }],
    ['blocky', 'Blocky World', '🧱', function (ctx) {
      sky(ctx, '#6cc8ff', '#c9ecff'); cloud(ctx, 200, 100, .9); cloud(ctx, 860, 70, 1.1);
      block(ctx, 380, 300, 140, 56, '#ff4f6d', '#d93a56'); block(ctx, 600, 230, 120, 56, '#ffd23f', '#e0b11f'); block(ctx, 800, 300, 140, 56, '#2fa8ff', '#1f86d6');
      line(ctx); rr(ctx, 1000, 150, 8, 160, 3); fs(ctx, '#e3e7ef'); ctx.beginPath(); ctx.moveTo(1008, 156); ctx.lineTo(1078, 176); ctx.lineTo(1008, 198); ctx.closePath(); fs(ctx, '#1fbf63');
      block(ctx, 960, 300, 110, 56, '#c9ced8', '#a9b0c0');
      for (var x = -20; x < W; x += 112) { block(ctx, x, 540, 112, 190, '#3fbf55', '#9b6a3c'); }
      [[160, 540], [1150, 540]].forEach(function (t) { line(ctx, 3); rr(ctx, t[0] - 16, t[1] - 90, 32, 92, 3); fs(ctx, '#8b5a2b'); block(ctx, t[0] - 70, t[1] - 200, 140, 120, '#2fae4f', '#25924a'); block(ctx, t[0] - 40, t[1] - 250, 80, 56, '#3fbf55', '#2fae4f'); });
      line(ctx); rr(ctx, 560, 480, 70, 62, 6); fs(ctx, '#c8814a'); rr(ctx, 566, 486, 58, 18, 4); f(ctx, '#ffd23f'); ctx.fillStyle = '#5a3a26'; ctx.fillRect(588, 500, 14, 14);
    }],
    ['stage', 'Show Stage', '🎭', function (ctx) {
      ctx.fillStyle = '#2b1b3d'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(255,236,170,.18)'; [[320, 0], [960, 0]].forEach(function (s) { ctx.beginPath(); ctx.moveTo(s[0] - 40, 0); ctx.lineTo(s[0] + 40, 0); ctx.lineTo(s[0] + 260, 560); ctx.lineTo(s[0] - 260, 560); ctx.closePath(); ctx.fill(); });
      ground(ctx, 540, '#c8814a'); ctx.strokeStyle = 'rgba(90,50,20,.35)'; ctx.lineWidth = 3; for (var x = 0; x < W; x += 90) { ctx.beginPath(); ctx.moveTo(x, 545); ctx.lineTo(x - 60, 720); ctx.stroke(); }
      ctx.fillStyle = 'rgba(255,240,190,.25)'; ctx.beginPath(); ctx.ellipse(640, 600, 360, 50, 0, 0, Math.PI * 2); ctx.fill();
      function curtain(x0, dir) { line(ctx); ctx.beginPath(); ctx.moveTo(x0, 0); ctx.lineTo(x0 + dir * 260, 0); ctx.quadraticCurveTo(x0 + dir * 150, 300, x0 + dir * 200, 560); ctx.quadraticCurveTo(x0 + dir * 90, 600, x0, 640); ctx.closePath(); fs(ctx, '#d6284f');
        ctx.strokeStyle = 'rgba(0,0,0,.18)'; ctx.lineWidth = 6; for (var i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(x0 + dir * i * 55, 0); ctx.quadraticCurveTo(x0 + dir * i * 40, 300, x0 + dir * i * 38, 600); ctx.stroke(); } }
      curtain(0, 1); curtain(W, -1);
      line(ctx); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(W, 0); ctx.lineTo(W, 70); for (var sx = W; sx > 0; sx -= 80) ctx.quadraticCurveTo(sx - 40, 120, sx - 80, 70); ctx.closePath(); fs(ctx, '#b81d40');
      ctx.fillStyle = '#ffd23f'; for (var b = 40; b < W; b += 80) { circ(ctx, b, 96, 6); ctx.fill(); }
    }],
    ['home', 'Living Room', '🛋️', function (ctx) {
      ctx.fillStyle = '#cfe8ff'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = '#bcdcfb'; for (var y = 0; y < 540; y += 60) ctx.fillRect(0, y, W, 26);
      line(ctx); [[180, 120, 160, 120, '#ffd23f'], [420, 90, 120, 160, '#ff9ec2'], [920, 120, 200, 130, '#9ef0d8']].forEach(function (p) { rr(ctx, p[0], p[1], p[2], p[3], 6); fs(ctx, '#8b5a2b'); rr(ctx, p[0] + 12, p[1] + 12, p[2] - 24, p[3] - 24, 4); fs(ctx, p[4]); });
      ctx.fillStyle = '#ff6b6b'; TL.star(ctx, 260, 180, 26); ctx.fill(); circ(ctx, 480, 170, 26); f(ctx, '#ffffff');
      ground(ctx, 540, '#e3b07a'); line(ctx); ctx.beginPath(); ctx.ellipse(640, 640, 380, 56, 0, 0, Math.PI * 2); fs(ctx, '#c26bff');
      line(ctx); rr(ctx, 700, 380, 420, 120, 26); fs(ctx, '#4757ff'); rr(ctx, 680, 440, 460, 100, 26); fs(ctx, '#5b6bff'); rr(ctx, 666, 420, 50, 120, 20); fs(ctx, '#3a46e0'); rr(ctx, 1104, 420, 50, 120, 20); fs(ctx, '#3a46e0');
      rr(ctx, 160, 300, 14, 240, 4); fs(ctx, '#3a3f55'); ctx.beginPath(); ctx.moveTo(120, 300); ctx.lineTo(214, 300); ctx.lineTo(190, 230); ctx.lineTo(144, 230); ctx.closePath(); fs(ctx, '#ffd23f');
      rr(ctx, 380, 470, 100, 70, 8); fs(ctx, '#2fae4f'); ctx.beginPath(); [[400, 470], [430, 400], [460, 470]].forEach(function (p, i) { if (!i) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]); }); fs(ctx, '#3fbf55');
    }]
  ];
  TL.SCENES = SCENES.map(function (s) { return { id: 'b:' + s[0], name: s[1], emoji: s[2], draw: s[3] }; });
  TL.COLOR_BGS = [['c:#ffffff', 'White'], ['c:#bfe6ff', 'Sky'], ['c:#ffd6ea', 'Bubblegum'], ['c:#fff1b8', 'Lemon'], ['c:#00d26a', 'Green screen'], ['c:#1a1d3a', 'Night']];

  var cache = {};
  TL.sceneCanvas = function (id, w, h) {
    w = w || W; h = h || H;
    var key = id + '@' + w;
    if (cache[key]) return cache[key];
    var sc = TL.SCENES.filter(function (s) { return s.id === id; })[0];
    if (!sc) return null;
    var cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    var ctx = cv.getContext('2d'); ctx.scale(w / W, h / H);
    try { sc.draw(ctx); } catch (e) { console.error(e); }
    cache[key] = cv;
    return cv;
  };
  var imgs = {};
  TL.loadImage = function (id) {
    var a = TL.assetIndex[id];
    if (!a) return Promise.resolve(null);
    if (imgs[id]) return imgs[id].p;
    var img = new Image(), rec = { img: img, ok: false };
    rec.p = new Promise(function (res) { img.onload = function () { rec.ok = true; res(img); }; img.onerror = function () { res(null); }; });
    img.src = a.url; imgs[id] = rec;
    return rec.p;
  };
  TL.bgName = function (ref) {
    if (!ref) return 'Nothing';
    if (ref.indexOf('b:') === 0) { var s = TL.SCENES.filter(function (x) { return x.id === ref; })[0]; return s ? s.name : 'Scene'; }
    if (ref.indexOf('c:') === 0) { var c = TL.COLOR_BGS.filter(function (x) { return x[0] === ref; })[0]; return c ? c[1] : 'Colour'; }
    return (TL.assetIndex[ref] || {}).name || 'My picture';
  };
  /* Draw a background into a W x H stage (cover). Returns false while an uploaded picture is still loading. */
  TL.drawBackground = function (ctx, ref, w, h) {
    w = w || W; h = h || H;
    if (ref && ref.indexOf('c:') === 0) { ctx.fillStyle = ref.slice(2); ctx.fillRect(0, 0, w, h); return true; }
    if (!ref || ref.indexOf('b:') === 0) { var cv = TL.sceneCanvas(ref || 'b:park', w <= 400 ? 400 : W, w <= 400 ? 225 : H); if (cv) { ctx.drawImage(cv, 0, 0, w, h); return true; } }
    var rec = imgs[ref];
    if (!rec) { TL.loadImage(ref); rec = imgs[ref]; }
    if (rec && rec.ok) {
      var img = rec.img, s = Math.max(w / img.naturalWidth, h / img.naturalHeight), iw = img.naturalWidth * s, ih = img.naturalHeight * s;
      ctx.drawImage(img, (w - iw) / 2, (h - ih) / 2, iw, ih); return true;
    }
    ctx.fillStyle = '#c9d2f0'; ctx.fillRect(0, 0, w, h);
    return false;
  };
  TL.bgThumb = function (ref, w, h) {
    var cv = document.createElement('canvas'); cv.width = w || 320; cv.height = h || 180;
    TL.drawBackground(cv.getContext('2d'), ref, cv.width, cv.height);
    return cv;
  };
})();

/* ===== _tl_ui.html ===== */
(function () {
  'use strict';
  var TL = window.TL = window.TL || {}, esc = UI.esc;

  /* ------------------------------------------------------------------ icons this app adds to UI.icon */
  Object.assign(UI.ICONS, {
    film: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 5v14M17 5v14M3 9h4M3 15h4M17 9h4M17 15h4"/>',
    smile: '<circle cx="12" cy="12" r="9"/><path d="M8.5 14.5c1 1.4 2.2 2 3.5 2s2.5-.6 3.5-2M9 9.5h.01M15 9.5h.01"/>',
    music: '<path d="M9 18V5l11-2v13"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>',
    ticket: '<path d="M4 7h16v3a2 2 0 0 0 0 4v3H4v-3a2 2 0 0 0 0-4z"/><path d="M14 7v10"/>',
    play: '<path d="M7 5l12 7-12 7z"/>',
    mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
    undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>',
    redo: '<path d="m15 14 5-5-5-5"/><path d="M20 9H9a5 5 0 0 0 0 10h3"/>',
    download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
    share: '<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.8 7.6-4.4M8.2 13.2l7.6 4.4"/>',
    upload: '<path d="M12 20V9M7 14l5-5 5 5M5 4h14"/>',
    dice: '<rect x="4" y="4" width="16" height="16" rx="4"/><path d="M9 9h.01M15 15h.01M15 9h.01M9 15h.01M12 12h.01"/>',
    move: '<circle cx="6" cy="18" r="2"/><circle cx="12" cy="8" r="2"/><circle cx="18" cy="16" r="2"/><path d="M7.2 16.3 10.8 9.8M13.5 9.5l3.3 4.8"/>',
    rec: '<circle cx="12" cy="12" r="7" fill="currentColor"/>'
  });

  /* ------------------------------------------------------------------ pictures of characters (cached) */
  var thumbs = {};
  TL.thumbOf = function (ch) {
    if (ch.thumb) return ch.thumb;
    var k = ch.id + '|' + (ch.updated || '');
    if (!thumbs[k]) { try { thumbs[k] = TL.charThumb(ch); } catch (e) { thumbs[k] = ''; } }
    return thumbs[k];
  };
  TL.charTile = function (ch, attrs, sub) {
    return '<button type="button" class="tl-tile" ' + (attrs || '') + '><div class="pic"><img alt="" src="' + esc(TL.thumbOf(ch)) + '"></div>' +
      '<b>' + esc(ch.name) + '</b>' + (sub ? '<span class="sub">' + sub + '</span>' : '') + '</button>';
  };
  TL.charPick = function (ch, on, attrs) {
    return '<button type="button" class="tl-pick' + (on ? ' on' : '') + '" ' + (attrs || '') + '><img alt="" src="' + esc(TL.thumbOf(ch)) + '">' + esc(ch.name) + '</button>';
  };
  TL.bgPick = function (ref, on) {
    var cv = TL.bgThumb(ref, 192, 108), src = ''; try { src = cv.toDataURL('image/jpeg', .7); } catch (e) {}
    return '<button type="button" class="tl-pick wide' + (on ? ' on' : '') + '" data-bg="' + esc(ref) + '"><img alt="" src="' + src + '">' + esc(TL.bgName(ref)) + '</button>';
  };

  /* ------------------------------------------------------------------ dialogs */
  TL.askName = function (title, value, ok) {
    return new Promise(function (resolve) {
      var done = false;
      var m = UI.modal('<h2>' + esc(title) + '</h2><form class="ui-stack" data-f><input type="text" name="name" maxlength="60" required value="' + esc(value || '') + '">' +
        '<div class="ui-row end"><button type="button" class="ui-btn ghost" data-close>Cancel</button><button class="ui-btn primary" type="submit">' + esc(ok || 'Save') + '</button></div></form>',
        { onclose: function () { if (!done) resolve(null); } });
      var f = m.el.querySelector('[data-f]'); setTimeout(function () { f.name.select(); }, 40);
      f.addEventListener('submit', function (e) { e.preventDefault(); done = true; var v = f.name.value.trim(); m.close(); resolve(v || null); });
    });
  };
  TL.pickStarter = function () {
    return new Promise(function (resolve) {
      var done = false;
      var m = UI.modal('<div class="tl-modal-h"><span class="big">🧍</span><h2 style="margin:0">Pick a body type</h2></div>' +
        '<p class="muted">You can change everything about it next: head, face, clothes, colours and size.</p>' +
        '<div class="tl-pickgrid" data-grid>' + TL.STARTERS.map(function (s) {
          return '<button type="button" class="tl-pick" data-st="' + s[0] + '"><canvas data-cv="' + s[0] + '"></canvas>' + esc(s[1]) + '</button>';
        }).join('') + '</div>', { wide: true, onclose: function () { if (!done) resolve(null); } });
      m.el.querySelectorAll('[data-cv]').forEach(function (cv) {
        var ch = TL.newCharacter(cv.getAttribute('data-cv')), pic = TL.charCanvas(ch, 140, 140, { pad: 10, dpr: 2 });
        cv.replaceWith(pic);
      });
      m.el.addEventListener('click', function (e) { var b = e.target.closest('[data-st]'); if (!b) return; done = true; m.close(); resolve(b.getAttribute('data-st')); });
    });
  };
  /* Make a new character from a body type, save it, go to the builder. */
  TL.createCharacter = function () {
    return TL.pickStarter().then(function (st) {
      if (!st) return null;
      var ch = TL.newCharacter(st, TL.funName(st));
      ch.thumb = TL.charThumb(ch);
      return TL.store.saveChar(ch).then(function () { UI.go('build', ch.id); return ch; });
    });
  };
  var FIRST = ['Captain', 'Professor', 'Lil', 'Super', 'Sir', 'Major', 'Lady', 'Doctor', 'Mega', 'Tiny'];
  var LAST = { hero: ['Blocks', 'Zoom', 'Bounce'], stick: ['Sticks', 'Doodle', 'Scribble'], bot: ['Beep', 'Clank', 'Bolt'], birdy: ['Feathers', 'Tweet', 'Flaps'],
    monster: ['Grumble', 'Fuzz', 'Chomp'], pup: ['Woofles', 'Biscuit', 'Muddy'], kitty: ['Whiskers', 'Purrkins', 'Mittens'], worm: ['Wiggles', 'Noodle', 'Squirm'] };
  TL.funName = function (st) { return TL.pick(FIRST) + ' ' + TL.pick(LAST[st] || LAST.hero); };

  /* New movie: name, background, up to 4 actors. Resolves with the saved movie (and opens the studio). */
  TL.newMovieDialog = function (myChars) {
    return new Promise(function (resolve) {
      var done = false, bg = TL.pick(TL.SCENES).id, picked = [], cast = (myChars || []).concat(TL.PRESET_LIST);
      if (myChars && myChars.length) picked.push(myChars[0].id); else picked.push('p_blox', 'p_biscuit');
      var m = UI.modal('<div class="tl-modal-h"><span class="big">🎬</span><h2 style="margin:0">New movie</h2></div>' +
        '<form data-f><label class="ui-field"><span>What\'s it called?</span><input type="text" name="name" maxlength="60" value="' + esc(TL.pick(['The Big Adventure', 'Super Silly Day', 'The Mystery of the Missing Sock', 'Space Pals', 'Best Friends Forever', 'The Great Escape'])) + '"></label>' +
        '<div class="tl-step">1. Pick a place</div><div class="tl-pickgrid" data-bgs>' + TL.SCENES.map(function (s) { return TL.bgPick(s.id, s.id === bg); }).join('') + '</div>' +
        '<div class="tl-step">2. Pick your actors <span class="faint">(up to 4, add more later)</span></div><div class="tl-pickgrid" data-cast>' +
        cast.map(function (c) { return TL.charPick(c, picked.indexOf(c.id) >= 0, 'data-c="' + esc(c.id) + '"'); }).join('') + '</div>' +
        '<div class="ui-row end" style="margin-top:16px"><button type="button" class="ui-btn ghost" data-close>Cancel</button><button class="ui-btn yellow lg" type="submit">🎬 Start filming</button></div></form>',
        { wide: true, onclose: function () { if (!done) resolve(null); } });
      m.el.addEventListener('click', function (e) {
        var b = e.target.closest('[data-bg]');
        if (b) { bg = b.getAttribute('data-bg'); m.el.querySelectorAll('[data-bgs] .tl-pick').forEach(function (x) { x.classList.toggle('on', x === b); }); return; }
        var c = e.target.closest('[data-c]');
        if (c) {
          var id = c.getAttribute('data-c'), i = picked.indexOf(id);
          if (i >= 0) picked.splice(i, 1); else if (picked.length < 4) picked.push(id); else UI.toast('Four is plenty to start. Add more in the studio!');
          m.el.querySelectorAll('[data-cast] .tl-pick').forEach(function (x) { x.classList.toggle('on', picked.indexOf(x.getAttribute('data-c')) >= 0); });
        }
      });
      m.el.querySelector('[data-f]').addEventListener('submit', function (e) {
        e.preventDefault();
        var mv = TL.newMovie(e.target.name.value.trim() || 'My cartoon'); mv.bg = bg;
        var map = TL.charMap(cast);
        picked.forEach(function (id, i) {
          var ch = map[id], n = picked.length, x = n === 1 ? 640 : 260 + i * (760 / Math.max(1, n - 1));
          var a = TL.newActor(ch, x, TL.GROUND + (i % 2) * 24); a.flip = x > 640; mv.actors.push(a);
        });
        mv.thumb = TL.movieThumb(mv, map, 0);
        done = true;
        UI.busy(e.target.querySelector('[type=submit]'), TL.store.saveMovie(mv)).then(function () { m.close(); resolve(mv); UI.go('studio', mv.id); });
      });
    });
  };

  /* ------------------------------------------------------------------ uploads: pictures (shrunk first) and sounds */
  function shrinkImage(file, max) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        var s = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight)), cv = document.createElement('canvas');
        cv.width = Math.round(img.naturalWidth * s); cv.height = Math.round(img.naturalHeight * s);
        cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height); URL.revokeObjectURL(url);
        cv.toBlob(function (b) { b ? resolve(b) : reject(new Error('That picture couldn\'t be read.')); }, 'image/jpeg', .86);
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(Object.assign(new Error('That picture couldn\'t be read. Try a JPG or PNG.'), { uiApi: true })); };
      img.src = url;
    });
  }
  TL.chooseFile = function (accept) {
    return new Promise(function (resolve) {
      var inp = document.createElement('input'); inp.type = 'file'; inp.accept = accept; inp.style.display = 'none';
      inp.onchange = function () { resolve(inp.files && inp.files[0] || null); inp.remove(); };
      document.body.appendChild(inp); inp.click();
    });
  };
  /* kind: 'bg' | 'sound' | 'music' | 'voice'. Resolves with the new asset (or null). */
  TL.upload = function (kind, file) {
    var pick = file ? Promise.resolve(file) : TL.chooseFile(kind === 'bg' ? 'image/*' : 'audio/*');
    return pick.then(function (f) {
      if (!f) return null;
      var name = (f.name || '').replace(/\.[a-z0-9]+$/i, '').replace(/[_-]+/g, ' ').slice(0, 60) || 'My ' + kind;
      if (kind === 'bg') {
        if (!/^image\//.test(f.type)) throw Object.assign(new Error('That isn\'t a picture.'), { uiApi: true });
        UI.toast('Adding your picture...');
        return shrinkImage(f, 1600).then(function (b) { return TL.store.addAsset(b, { kind: 'bg', name: name }); });
      }
      if (!/^audio\//.test(f.type) && !/\.(mp3|wav|ogg|m4a|aac|webm)$/i.test(f.name || '')) throw Object.assign(new Error('That isn\'t a sound file (try MP3, WAV, OGG or M4A).'), { uiApi: true });
      if (f.size > 8e6) throw Object.assign(new Error('That file is too big (the limit is 8 MB). Try a shorter sound.'), { uiApi: true });
      UI.toast('Adding your sound...');
      return TL.audioDuration(f).then(function (d) {
        if (!d) throw Object.assign(new Error('That sound couldn\'t be played. Try an MP3 or WAV.'), { uiApi: true });
        return TL.store.addAsset(f, { kind: kind, name: name, dur: Math.round(d * 100) / 100 });
      });
    }).then(function (a) { if (a) UI.toast('Added "' + a.name + '"', 'ok'); return a; });
  };

  /* ------------------------------------------------------------------ the voice recorder
     opts: {actors: [{id, name}], actor, onStart (called when recording starts: play the movie), onStop}.
     Resolves {asset, actor, rate, fx} or null. */
  TL.voiceDialog = function (opts) {
    opts = opts || {};
    return new Promise(function (resolve) {
      var done = false, rec = null, result = null, fxSel = 'normal', actor = opts.actor || '', timer = 0;
      var actors = opts.actors || [];
      var m = UI.modal('<div class="tl-modal-h"><span class="big">🎙️</span><h2 style="margin:0">Record a voice</h2></div>' +
        '<p class="muted small">Press the red button, say your line, press it again. ' + (opts.onStart ? 'The movie plays (without sound) while you talk, so you can match the action.' : '') + '</p>' +
        (actors.length ? '<label class="ui-field"><span>Who\'s talking? <em>(their mouth moves with your voice)</em></span><select name="actor"><option value="">Nobody (a narrator)</option>' +
          actors.map(function (a) { return '<option value="' + esc(a.id) + '"' + (a.id === actor ? ' selected' : '') + '>' + esc(a.name) + '</option>'; }).join('') + '</select></label>' : '') +
        '<button type="button" class="tl-recbig" data-rec>REC</button><div class="tl-meter"><i data-lvl></i></div><p class="small muted" data-msg style="text-align:center;margin-top:8px">Ready when you are!</p>' +
        '<div data-after hidden><div class="tl-step">Voice effect</div><div class="tl-chips" data-fx>' + TL.VOICE_FX.map(function (f) {
          return '<button type="button" class="tl-chip' + (f[0] === 'normal' ? ' on' : '') + '" data-f="' + f[0] + '"><span class="em">' + f[2] + '</span>' + f[1] + '</button>'; }).join('') + '</div>' +
        '<div class="ui-row" style="margin-top:14px"><button type="button" class="ui-btn" data-play>' + UI.icon('play') + 'Listen</button><label class="ui-field" style="flex:1"><input type="text" name="vname" maxlength="60" placeholder="Name it (e.g. Blox says hi)"></label></div></div>' +
        '<div class="ui-row end" style="margin-top:12px"><button type="button" class="ui-btn ghost" data-close>Cancel</button><button type="button" class="ui-btn primary" data-use disabled>Use this voice</button></div>',
        { onclose: function () { if (rec) rec.cancel(); clearInterval(timer); TL.stopPreview(); if (opts.onStop) opts.onStop(); if (!done) resolve(null); } });
      var el = m.el, btn = el.querySelector('[data-rec]'), msg = el.querySelector('[data-msg]'), lvl = el.querySelector('[data-lvl]');
      var tmpUrl = null, tmpId = 'voice-preview';
      btn.addEventListener('click', function () {
        if (!rec) {
          TL.stopPreview();
          TL.micRecorder().then(function (r) {
            rec = r; btn.classList.add('on'); btn.textContent = 'STOP'; msg.textContent = 'Recording... 0.0 s';
            if (opts.onStart) opts.onStart();
            timer = setInterval(function () { lvl.style.width = Math.round(r.level() * 140) + '%'; msg.textContent = 'Recording... ' + r.elapsed().toFixed(1) + ' s'; if (r.elapsed() > 60) btn.click(); }, 60);
          });
          return;
        }
        clearInterval(timer); lvl.style.width = '0';
        var r = rec; rec = null; btn.classList.remove('on'); btn.textContent = 'AGAIN';
        if (opts.onStop) opts.onStop();
        r.stop().then(function (res) {
          if (!res || res.dur < .3) { msg.textContent = 'That was very short. Try again!'; return; }
          result = res; msg.textContent = 'Got it! ' + res.dur.toFixed(1) + ' seconds.';
          el.querySelector('[data-after]').hidden = false; el.querySelector('[data-use]').disabled = false;
          if (tmpUrl) URL.revokeObjectURL(tmpUrl);
          tmpUrl = URL.createObjectURL(res.blob); TL.assetIndex[tmpId] = { id: tmpId, url: tmpUrl, kind: 'voice', name: 'preview' };
        });
      });
      el.addEventListener('click', function (e) {
        var f = e.target.closest('[data-f]');
        if (f) { fxSel = f.getAttribute('data-f'); el.querySelectorAll('[data-fx] .tl-chip').forEach(function (x) { x.classList.toggle('on', x === f); }); }
        if (e.target.closest('[data-play]') && result) {
          var fx = TL.VOICE_FX.filter(function (x) { return x[0] === fxSel; })[0];
          TL.decodeBlob(result.blob).then(function (buf) {
            var ac = TL.audioCtx(), s = ac.createBufferSource(); s.buffer = buf; s.playbackRate.value = fx[3];
            if (fx[4] === 'robot' || fx[4] === 'echo') { TL.preview(tmpId, { rate: fx[3], fx: fx[4] }); return; }
            s.connect(ac.destination); s.start();
          });
        }
        if (e.target.closest('[data-use]') && result) {
          var fx2 = TL.VOICE_FX.filter(function (x) { return x[0] === fxSel; })[0], sel = el.querySelector('[name=actor]'), who = sel ? sel.value : '';
          var nm = el.querySelector('[name=vname]').value.trim() || ((sel && sel.selectedIndex > 0 ? sel.options[sel.selectedIndex].text + ' says' : 'Voice') + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
          UI.busy(e.target.closest('[data-use]'), TL.store.addAsset(result.blob, { kind: 'voice', name: nm, dur: Math.round(result.dur * 100) / 100 })).then(function (a) {
            done = true; m.close(); resolve({ asset: a, actor: who || null, rate: fx2[3], fx: fx2[4] || '' });
          });
        }
      });
    });
  };

  /* ------------------------------------------------------------------ share + export */
  TL.watchUrl = function (key) { return location.origin + location.pathname + location.search.replace(/[?&]as=[^&]*/, '') + '#watch/' + key; };
  TL.shareDialog = function (movieId, state) {
    if (TL.guest()) {
      return UI.confirm({ title: 'Sharing needs an account', text: 'Your movie lives on this device. A grown-up (16 or older) can make a free account to keep your toons safe and get a link to share them.', ok: 'Make an account' })
        .then(function (yes) { if (yes) UI.go('auth', 'signup'); });
    }
    var m = UI.modal('<div class="tl-modal-h"><span class="big">🍿</span><h2 style="margin:0">Share your movie</h2></div><div data-body><div class="ui-skel" style="min-height:80px"></div></div>');
    function draw(st) {
      state = st;
      m.el.querySelector('[data-body]').innerHTML = st.shared
        ? '<p class="muted">Anyone with this link can watch your movie (not change it). It isn\'t listed anywhere unless we feature it in the Theater.</p>' +
          '<div class="tl-link"><input type="text" readonly value="' + esc(TL.watchUrl(st.share_key)) + '"><button class="ui-btn primary" data-copy>' + UI.icon('copy') + 'Copy</button></div>' +
          '<div class="ui-row between" style="margin-top:16px"><a class="ui-btn" href="#watch/' + esc(st.share_key) + '">' + UI.icon('play') + 'Watch it</a><button class="ui-btn danger" data-off>Stop sharing</button></div>'
        : '<p class="muted">Get a link that lets people watch your movie. Only share it with people you know. You can stop sharing any time.</p>' +
          '<div class="ui-row end"><button class="ui-btn ghost" data-close>Not now</button><button class="ui-btn yellow" data-on>' + UI.icon('share') + 'Make a link</button></div>';
    }
    m.el.addEventListener('click', function (e) {
      if (e.target.closest('[data-on]')) UI.busy(e.target.closest('[data-on]'), TL.store.shareMovie(movieId, true)).then(draw);
      if (e.target.closest('[data-off]')) TL.store.shareMovie(movieId, false).then(function (st) { draw(st); UI.toast('Your link is off.'); });
      if (e.target.closest('[data-copy]')) { var inp = m.el.querySelector('input'); inp.select(); try { navigator.clipboard.writeText(inp.value); } catch (x) { document.execCommand('copy'); } UI.toast('Link copied!', 'ok'); }
    });
    if (state) draw(state); else TL.store.getMovie(movieId).then(function (r) { draw(r ? { shared: r.shared, share_key: r.share_key } : { shared: false }); });
    return Promise.resolve();
  };
  TL.exportDialog = function (movie, chars) {
    if (!TL.canExport()) { UI.toast('This browser can\'t make video files. Try Chrome, Edge or Firefox on a computer.', 'error'); return; }
    var stop = false, m = UI.modal('<div class="tl-modal-h"><span class="big">📼</span><h2 style="margin:0">Make a video</h2></div>' +
      '<p class="muted">Your movie plays from start to finish while we record it (' + Math.ceil(movie.dur) + ' seconds). Keep this tab open!</p>' +
      '<div data-prev style="border-radius:14px;overflow:hidden;border:3px solid var(--c-ink);margin-bottom:12px"></div><div class="tl-progress"><i data-p></i></div>' +
      '<p class="small muted" data-msg style="margin-top:8px">Starting...</p><div class="ui-row end" data-btns><button class="ui-btn ghost" data-close>Cancel</button></div>',
      { onclose: function () { stop = true; } });
    var pv = document.createElement('canvas'); pv.width = 640; pv.height = 360; pv.style.cssText = 'display:block;width:100%';
    m.el.querySelector('[data-prev]').appendChild(pv);
    var pctx = pv.getContext('2d'); pctx.scale(.5, .5);
    TL.exportVideo(movie, chars, function (p) {
      m.el.querySelector('[data-p]').style.width = Math.round(p * 100) + '%';
      m.el.querySelector('[data-msg]').textContent = 'Recording... ' + Math.round(p * 100) + '%';
      TL.renderFrame(pctx, movie, chars, p * movie.dur, {});
    }, function () { return stop; }).then(function (res) {
      if (stop) return;
      var name = TL.safeName(movie.name) + '.' + res.ext;
      m.el.querySelector('[data-msg]').textContent = 'Done! ' + (res.blob.size / 1e6).toFixed(1) + ' MB (' + res.ext.toUpperCase() + ').';
      m.el.querySelector('[data-btns]').innerHTML = '<button class="ui-btn ghost" data-close>Close</button><button class="ui-btn go" data-dl>' + UI.icon('download') + 'Download ' + esc(name) + '</button>';
      m.el.querySelector('[data-dl]').onclick = function () { TL.download(res.blob, name); TL.confetti(); };
    }, function (e) { m.el.querySelector('[data-msg]').textContent = 'Sorry, that didn\'t work: ' + (e && e.message || e); });
  };

  /* ------------------------------------------------------------------ "you" stickers (little achievements) */
  TL.STICKERS = [['char', '🧍', 'Made a character'], ['anim', '🕺', 'Made a move'], ['movie', '🎬', 'Started a movie'], ['take', '🔴', 'Recorded a take'],
    ['sound', '🔊', 'Added a sound'], ['voice', '🎙️', 'Recorded a voice'], ['three', '🏆', 'Three movies'], ['share', '🍿', 'Shared a movie']];
  TL.earned = function (home) {
    var e = {}, ms = home.movies || [], cs = home.chars || [];
    if (cs.length) e.char = 1;
    if (cs.some(function (c) { return c.custom; }) || TL.store_flag('anim')) e.anim = 1;
    if (ms.length) e.movie = 1;
    if (ms.some(function (m) { return m.takes; }) || TL.store_flag('take')) e.take = 1;
    if (ms.some(function (m) { return m.clips; })) e.sound = 1;
    if (TL.store_flag('voice')) e.voice = 1;
    if (ms.length >= 3) e.three = 1;
    if (ms.some(function (m) { return m.shared; })) e.share = 1;
    return e;
  };
  TL.store_flag = function (k, set) { var f = UI.store.get('flags', {}); if (set) { f[k] = 1; UI.store.set('flags', f); } return !!f[k]; };
})();

/* ===== admin.html ===== */
(function () {
  var esc = UI.esc;
  var TABS = [['overview', 'Overview', 'grid'], ['toons', 'Toons', 'film'], ['feedback', 'Feedback', 'inbox'], ['users', 'Users', 'users'], ['demo', 'Demo data', 'database']];

  UI.page('admin', { title: 'Admin', auth: 'admin' }, function (view, ctx) {
    var tab = TABS.some(function (t) { return t[0] === ctx.args[0]; }) ? ctx.args[0] : 'overview';
    var fbFilter = 'new';
    view.innerHTML = '<div class="ui-wrap"><div class="ui-page-head"><div><h1>Admin</h1><p class="muted">Only admins see this page.</p></div></div>' +
      '<nav class="ui-tabs">' + TABS.map(function (t) {
        return '<a href="#admin/' + t[0] + '" class="' + (t[0] === tab ? 'on' : '') + '">' + UI.icon(t[2]) + t[1] + '</a>';
      }).join('') + '</nav><div data-body><div class="ui-skel"></div></div></div>';
    var body = view.querySelector('[data-body]');

    function overview() {
      return UI.api('admin_overview').then(function (d) {
        var stat = function (n, label, go) { return '<a class="ui-card ui-stat" href="#admin/' + go + '" style="text-decoration:none;color:inherit"><b>' + n + '</b><span>' + label + '</span></a>'; };
        body.innerHTML = '<div class="ad-stats">' + stat(d.users, 'people signed up', 'users') + stat(d.admins, UI.plural(d.admins, 'admin').replace(/^\d+ /, ''), 'users') +
          stat(d.feedback_new, 'new feedback', 'feedback') + stat(d.movies, 'movies', 'overview') + stat(d.characters, 'characters', 'overview') +
          stat(d.shared, 'shared movies', 'toons') + stat(d.uploads, 'uploaded files', 'overview') + '</div>' +
          '<p class="muted small" style="margin-top:18px">Demo data is <b>' + esc(d.demo.state) + '</b> (' + d.demo.counts.users + ' demo people). Manage it in the Demo data tab.</p>';
      });
    }

    function feedback() {
      return UI.api('list_feedback', null).then(function (d) {
        var items = d.items.filter(function (i) { return fbFilter === 'all' || i.status === fbFilter; });
        body.innerHTML = '<div class="ui-row" style="margin-bottom:16px"><div class="ui-seg">' + [['new', 'New'], ['read', 'Read'], ['done', 'Done'], ['all', 'All']].map(function (f) {
          var n = f[0] === 'all' ? d.items.length : d.counts[f[0]];
          return '<button data-filter="' + f[0] + '" class="' + (fbFilter === f[0] ? 'on' : '') + '">' + f[1] + ' (' + n + ')</button>';
        }).join('') + '</div></div>' +
          (items.length ? '<div class="ad-fb">' + items.map(function (i) {
            var c = i.context || {};
            return '<div class="ui-item" data-id="' + esc(i.id) + '"><div class="meta"><span class="ui-badge ' + (i.kind === 'bug' ? 'bad' : i.kind === 'idea' ? 'brand' : '') + '">' + esc(i.kind_label) + '</span>' +
              '<b>' + esc(i.name) + '</b>' + (i.email ? '<a href="mailto:' + esc(i.email) + '">' + esc(i.email) + '</a>' : '') + '<span>' + esc(UI.fmtDateTime(i.created)) + '</span></div>' +
              '<p class="msg">' + esc(i.message) + '</p>' +
              '<div class="ctx">' + esc([c.page, c.screen, c.theme, c.browser].filter(Boolean).join(' · ')) + '</div>' +
              '<textarea data-note placeholder="Private note (only admins see it)">' + esc(i.note) + '</textarea>' +
              '<div class="ui-row" style="margin-top:10px">' + ['new', 'read', 'done'].map(function (s) {
                return '<button class="ui-btn sm' + (i.status === s ? ' primary' : '') + '" data-status="' + s + '">' + s[0].toUpperCase() + s.slice(1) + '</button>';
              }).join('') + '<span class="ui-spacer"></span><button class="ui-btn sm danger" data-del-fb>' + UI.icon('trash') + 'Delete</button></div></div>';
          }).join('') + '</div>'
            : '<div class="ui-empty">' + UI.icon('inbox') + '<h3>No ' + (fbFilter === 'all' ? '' : fbFilter + ' ') + 'messages</h3><p>Messages from the "Send feedback" form show up here.</p></div>');
      });
    }

    function users(query) {
      return UI.api('list_users', query || null).then(function (d) {
        body.innerHTML = '<form class="ui-row" data-search style="margin-bottom:14px"><input type="search" name="q" placeholder="Search by name or email" value="' + esc(query || '') + '" style="max-width:360px">' +
          '<button class="ui-btn" type="submit">' + UI.icon('search') + 'Search</button><span class="muted small">' + UI.plural(d.total, 'person', 'people') + '</span></form>' +
          '<table class="ad-users"><thead><tr><th>Name</th><th>Email</th><th>Joined</th><th>Admin</th><th>Active</th></tr></thead><tbody>' +
          d.users.map(function (u) {
            return '<tr data-id="' + esc(u.id) + '"><td><b>' + esc(u.name) + '</b></td><td class="email">' + esc(u.email) + '</td><td class="joined muted">' + esc(UI.fmtDate(u.joined)) + '</td>' +
              '<td><label class="ui-check"><input type="checkbox" data-admin' + (u.is_admin ? ' checked' : '') + '> Admin</label></td>' +
              '<td><label class="ui-check"><input type="checkbox" data-enabled' + (u.enabled ? ' checked' : '') + '> Active</label></td></tr>';
          }).join('') + '</tbody></table>';
      });
    }

    function demo() {
      return UI.api('admin_overview').then(function (d) {
        var c = d.demo.counts;
        body.innerHTML = '<div class="ui-card ui-narrow" style="margin:0"><h3>Demo data</h3>' +
          '<p class="muted">Example people and content, so the app never looks empty for the first visitors. Demo rows are flagged, so removing them never touches real data. Once removed, it stays removed until you load it again.</p>' +
          '<p>Status: <b>' + esc(d.demo.state) + '</b> · ' + Object.keys(c).map(function (k) { return c[k] + ' ' + esc(k); }).join(', ') + '</p>' +
          '<div class="ui-row"><button class="ui-btn primary" data-demo="load">' + UI.icon('refresh') + (d.demo.state === 'loaded' ? 'Reload demo data' : 'Load demo data') + '</button>' +
          '<button class="ui-btn danger" data-demo="remove">' + UI.icon('trash') + 'Remove demo data</button></div></div>';
      });
    }

    function toons() {
      return UI.api('admin_toons').then(function (d) {
        body.innerHTML = '<p class="muted">Every shared movie. Featured ones are listed in the Theater for everyone; the others only play for people who have the link. Reports land in Feedback.</p>' +
          (d.toons.length ? '<div class="ad-fb">' + d.toons.map(function (x) {
            return '<div class="ui-item" data-key="' + esc(x.key) + '" style="display:flex;gap:14px;align-items:center;flex-wrap:wrap">' +
              (x.thumb ? '<img alt="" src="' + esc(x.thumb) + '" style="width:120px;border-radius:10px">' : '<span style="font-size:2rem">🎬</span>') +
              '<div class="grow" style="min-width:180px"><h3>' + esc(x.name) + (x.demo ? ' <span class="ui-badge">Demo</span>' : '') + (x.featured ? ' <span class="ui-badge good">Featured</span>' : '') + '</h3>' +
              '<p class="small muted">by ' + esc(x.author) + (x.email ? ' (' + esc(x.email) + ')' : '') + ' · ' + UI.plural(x.views, 'view') + ' · ' + esc(UI.ago(x.updated)) + '</p></div>' +
              '<div class="ui-row"><a class="ui-btn sm" href="#watch/' + esc(x.key) + '">' + UI.icon('play') + 'Watch</a>' +
              '<button class="ui-btn sm' + (x.featured ? '' : ' primary') + '" data-feature="' + (x.featured ? '0' : '1') + '">' + (x.featured ? 'Un-feature' : '⭐ Feature') + '</button>' +
              '<button class="ui-btn sm danger" data-unshare>Stop sharing</button></div></div>';
          }).join('') + '</div>' : '<div class="ui-empty">' + UI.icon('film') + '<h3>No shared movies yet</h3><p>When members share a movie, it shows up here.</p></div>');
      });
    }

    var DRAW = { overview: overview, toons: toons, feedback: feedback, users: users, demo: demo };

    view.addEventListener('click', function (e) {
      var f = e.target.closest('[data-filter]');
      if (f) { fbFilter = f.getAttribute('data-filter'); feedback(); return; }
      var st = e.target.closest('[data-status]');
      if (st) {
        var card = st.closest('[data-id]');
        UI.api('set_feedback_status', card.getAttribute('data-id'), st.getAttribute('data-status'), card.querySelector('[data-note]').value).then(function () { UI.toast('Saved', 'ok'); feedback(); });
        return;
      }
      var del = e.target.closest('[data-del-fb]');
      if (del) {
        UI.confirm({ title: 'Delete this message?', ok: 'Delete', danger: true }).then(function (yes) {
          if (yes) UI.api('delete_feedback', del.closest('[data-id]').getAttribute('data-id')).then(feedback);
        });
        return;
      }
      var ft = e.target.closest('[data-feature]');
      if (ft) { UI.api('admin_feature', ft.closest('[data-key]').getAttribute('data-key'), ft.getAttribute('data-feature') === '1').then(function () { UI.toast('Saved', 'ok'); toons(); }); return; }
      var us = e.target.closest('[data-unshare]');
      if (us) {
        UI.confirm({ title: 'Stop sharing this movie?', text: 'Its link stops working for everyone. The owner keeps the movie and can share it again.', ok: 'Stop sharing', danger: true }).then(function (yes) {
          if (yes) UI.api('admin_unshare', us.closest('[data-key]').getAttribute('data-key')).then(function () { UI.toast('Done', 'ok'); toons(); });
        });
        return;
      }
      var dm = e.target.closest('[data-demo]');
      if (dm) {
        var load = dm.getAttribute('data-demo') === 'load';
        UI.confirm({ title: load ? 'Load the demo data?' : 'Remove the demo data?', text: load ? 'Demo people and content are added (any old demo rows are replaced).' : 'Every demo row is deleted. Real data stays.', ok: load ? 'Load' : 'Remove', danger: !load })
          .then(function (yes) { if (yes) UI.busy(dm, UI.api(load ? 'demo_load' : 'demo_remove')).then(function () { UI.toast('Done', 'ok'); demo(); }); });
      }
    });
    view.addEventListener('change', function (e) {
      var row = e.target.closest('tr[data-id]');
      if (!row) return;
      var id = row.getAttribute('data-id'), box = e.target;
      var fn = box.hasAttribute('data-admin') ? 'set_admin' : box.hasAttribute('data-enabled') ? 'set_enabled' : null;
      if (fn) UI.api(fn, id, box.checked).then(function () { UI.toast('Saved', 'ok'); }, function (err) { box.checked = !box.checked; UI.toast(err.message, 'error'); });
    });
    view.addEventListener('submit', function (e) {
      if (e.target.matches('[data-search]')) { e.preventDefault(); users(UI.formData(e.target).q); }
    });
    return DRAW[tab]();
  });
})();

/* ===== animate.html ===== */
(function () {
  var esc = UI.esc, CW = 640, CH = 480;
  var MIRROR = { aL1: 'aR1', aL2: 'aR2', lL1: 'lR1', lL2: 'lR2', fl1: 'fr1', fl2: 'fr2', bl1: 'br1', bl2: 'br2' };
  var EMOJIS = ['✨', '🕺', '💃', '🤸', '🥋', '🏊', '🧘', '🙌', '👋', '🤖', '🦖', '🐒', '🎸', '⚽', '🦸', '😴', '🤣', '😱'];
  var clipboard = null;

  UI.page('animate', { title: 'Moves' }, function (view, ctx) {
    var ch = null, anim = null, f = 0, playing = false, onion = true, raf = 0, drag = null, sel = null, saveT = 0, dirty = false, cv = null, t0 = 0, lastPose = null;
    view.innerHTML = '<div class="ui-wrap"><div class="ui-skel" style="height:420px"></div></div>';

    function place() {
      var bb = TL.bounds(ch, {}), s = Math.min(2.1, 330 / Math.max(bb.h, bb.w * .8));
      return { s: s, x: CW / 2 - (bb.x + bb.w / 2) * s, y: 405 - TL.footY(ch) * s };
    }
    function keyAt(fr) { return anim.keys.filter(function (k) { return k.f === fr; })[0] || null; }
    function poseNow() { return TL.keyPose(ch, anim, f); }
    function ensureKey() {
      var k = keyAt(f); if (k) return k;
      var p = poseNow(), full = TL.restAngles(ch); Object.keys(p.b).forEach(function (id) { full[id] = p.b[id]; });
      delete full.root; if (p.b.root != null) full.root = p.b.root;
      k = { f: f, b: full, r: p.r.slice() }; anim.keys.push(k); anim.keys.sort(function (a, b) { return a.f - b.f; });
      return k;
    }

    function drawPage() {
      view.innerHTML = '<div class="ui-wrap"><div class="an-top"><a class="ui-btn ghost" href="#build/' + esc(ch.id) + '">' + UI.icon('back') + 'Looks</a>' +
        '<h1>' + esc(ch.name) + '\'s moves</h1><span class="saved" data-saved></span></div>' +
        '<div class="an-grid"><div class="ui-card an-list" data-list></div>' +
        '<div class="ui-card an-main"><p class="an-hint" data-hint></p><canvas class="an-cv" width="1280" height="960" data-cv aria-label="Pose editor"></canvas>' +
        '<div class="an-strip" data-strip></div>' +
        '<div class="an-bar"><div class="grp"><button class="ui-btn" data-prev aria-label="Previous frame">◀</button><button class="ui-btn primary" data-play style="min-width:64px">▶</button><button class="ui-btn" data-next aria-label="Next frame">▶|</button></div>' +
        '<span class="ui-spacer"></span><div class="grp"><button class="ui-btn" data-key>◆ Key</button><button class="ui-btn" data-delkey>' + UI.icon('trash') + '</button>' +
        '<button class="ui-btn" data-copy>Copy</button><button class="ui-btn" data-paste>Paste</button><button class="ui-btn" data-mirror title="Swap left and right">🪞 Mirror</button><button class="ui-btn" data-reset>↺ Reset</button></div></div>' +
        '<div class="an-set"><div class="an-count">Frames <button data-len="-1">−</button><span data-lenv></span><button data-len="1">+</button></div>' +
        '<label class="tl-range"><span>Speed</span><input type="range" min="3" max="30" step="1" data-fps><output data-fpsv></output></label>' +
        '<label class="tl-range"><span>Tilt</span><input type="range" min="-180" max="180" step="1" data-tilt><output data-tiltv></output></label>' +
        '<div class="grp" style="display:flex;gap:14px;flex-wrap:wrap"><label class="ui-check"><input type="checkbox" data-loop> Loop</label><label class="ui-check"><input type="checkbox" data-onion> Onion skin 👻</label></div></div></div></div></div>';
      cv = view.querySelector('[data-cv]');
      drawList(); drawControls();
    }
    function drawList() {
      view.querySelector('[data-list]').innerHTML = '<div class="small muted lbl" style="font-weight:900;letter-spacing:.08em;text-transform:uppercase">Moves</div>' +
        ch.anims.map(function (a) { return '<button class="tl-chip' + (a === anim ? ' on' : '') + '" data-pick="' + esc(a.id) + '"><span class="em">' + TL.animEmoji(a) + '</span>' + esc(a.name) + '<small>' + a.len + 'f</small></button>'; }).join('') +
        '<button class="ui-btn sm" data-newanim style="margin-top:6px">' + UI.icon('plus') + 'New move</button>' +
        '<div class="ui-row" style="gap:4px"><button class="ui-btn sm ghost" data-rename>' + UI.icon('edit') + 'Rename</button><button class="ui-btn sm ghost" data-dupe>' + UI.icon('copy') + 'Copy</button>' +
        '<button class="ui-btn sm ghost danger" data-delanim>' + UI.icon('trash') + '</button></div>' +
        '<button class="ui-btn sm ghost" data-restore title="Bring back any starter moves you deleted">↺ Starter moves</button>';
    }
    function drawControls() {
      var strip = view.querySelector('[data-strip]'), keys = {};
      anim.keys.forEach(function (k) { keys[k.f] = 1; });
      var html = ''; for (var i = 0; i < anim.len; i++) html += '<button class="' + (keys[i] ? 'key' : '') + (i === f && !playing ? ' on' : '') + '" data-f="' + i + '">' + (i + 1) + '</button>';
      strip.innerHTML = html;
      view.querySelector('[data-lenv]').textContent = anim.len;
      var fps = view.querySelector('[data-fps]'); fps.value = anim.fps || 12; view.querySelector('[data-fpsv]').textContent = (anim.fps || 12) + '/s';
      var tilt = view.querySelector('[data-tilt]'), tv = Math.round(((poseNow().b.root || 0) + 540) % 360 - 180); tilt.value = tv; view.querySelector('[data-tiltv]').textContent = tv + '°';
      view.querySelector('[data-loop]').checked = anim.loop !== false; view.querySelector('[data-onion]').checked = onion;
      view.querySelector('[data-play]').textContent = playing ? '⏸' : '▶';
      view.querySelector('[data-hint]').textContent = playing ? 'Playing ' + anim.name + '... press ⏸ to stop and edit.' :
        (keyAt(f) ? 'Frame ' + (f + 1) + ' is a key ◆. Drag the dots to bend joints, the square to move the body.' : 'Frame ' + (f + 1) + ' is in between keys. Drag a dot to make a new key here.');
    }

    function render(now) {
      raf = requestAnimationFrame(render);
      if (!cv || !cv.isConnected) return;
      var c = cv.getContext('2d'), p = place(), t = now / 1000;
      c.setTransform(2, 0, 0, 2, 0, 0); c.clearRect(0, 0, CW, CH);
      c.strokeStyle = 'rgba(120,130,180,.35)'; c.lineWidth = 3; c.setLineDash([10, 8]); c.beginPath(); c.moveTo(20, p.y + TL.footY(ch) * p.s); c.lineTo(CW - 20, p.y + TL.footY(ch) * p.s); c.stroke(); c.setLineDash([]);
      var pose;
      if (playing) { var el = (now - t0) / 1000, fr = el * (anim.fps || 12); if (anim.loop === false) fr = Math.min(fr, anim.len - 1); pose = TL.keyPose(ch, anim, fr); f = Math.floor(fr) % anim.len; }
      else pose = poseNow();
      lastPose = pose;
      if (onion && !playing) {
        var prev = null, next = null;
        anim.keys.forEach(function (k) { if (k.f < f) prev = k; if (k.f > f && !next) next = k; });
        if (!prev && anim.loop !== false && anim.keys.length > 1) prev = anim.keys[anim.keys.length - 1] !== keyAt(f) ? anim.keys[anim.keys.length - 1] : null;
        if (!next && anim.loop !== false && anim.keys.length > 1) next = anim.keys[0] !== keyAt(f) ? anim.keys[0] : null;
        [[prev, .22], [next, .14]].forEach(function (g) { if (g[0]) TL.drawChar(c, ch, { b: g[0].b, r: g[0].r }, { x: p.x, y: p.y, s: p.s, t: t, alpha: g[1] }); });
      }
      var solved = TL.drawChar(c, ch, pose, { x: p.x, y: p.y, s: p.s, t: t, shadow: TL.footY(ch) });
      if (playing) return;
      solved.forEach(function (sv) {
        if (sv.b.kind === 'root') return;
        var hx = p.x + sv.ex * p.s, hy = p.y + sv.ey * p.s, on = sel === sv.b.id;
        c.beginPath(); c.arc(hx, hy, on ? 10 : 8, 0, Math.PI * 2); c.fillStyle = on ? '#ff4fa3' : (sv.b.side === 'back' ? '#8fa0ff' : '#4757ff'); c.fill();
        c.lineWidth = 3; c.strokeStyle = '#ffffff'; c.stroke();
      });
      var rx = p.x + (pose.r[0] || 0) * p.s, ry = p.y + (pose.r[1] || 0) * p.s;
      c.fillStyle = sel === 'root' ? '#ff4fa3' : '#ffc532'; c.strokeStyle = '#1a1d3a'; c.lineWidth = 3; TL.rr(c, rx - 10, ry - 10, 20, 20, 5); c.fill(); c.stroke();
    }

    function local(e) {
      var r = cv.getBoundingClientRect(), p = place();
      var px = (e.clientX - r.left) / r.width * CW, py = (e.clientY - r.top) / r.height * CH;
      return { px: px, py: py, lx: (px - p.x) / p.s, ly: (py - p.y) / p.s };
    }
    function pick(pt) {
      var p = place(), pose = poseNow(), best = null, bd = 26;
      var rx = p.x + pose.r[0] * p.s, ry = p.y + pose.r[1] * p.s;
      if (Math.hypot(pt.px - rx, pt.py - ry) < 18) return 'root';
      TL.solve(ch, pose).forEach(function (sv) {
        if (sv.b.kind === 'root') return;
        var d = Math.hypot(pt.px - (p.x + sv.ex * p.s), pt.py - (p.y + sv.ey * p.s));
        if (d < bd) { bd = d; best = sv.b.id; }
      });
      return best;
    }
    function bend(id, pt) {
      var k = ensureKey(), pose = { b: k.b, r: k.r }, solved = TL.solve(ch, pose), sv = solved.filter(function (s) { return s.b.id === id; })[0];
      if (!sv) return;
      var world = Math.atan2(pt.ly - sv.y, pt.lx - sv.x) * 180 / Math.PI, parent = solved.filter(function (s) { return s.b.id === sv.b.p; })[0];
      var loc = sv.b.abs || !parent ? world : world - parent.a * 180 / Math.PI;
      k.b[id] = Math.round(((loc + 540) % 360 - 180) * 10) / 10;
    }
    function edited() {
      ch.custom = true; dirty = true;
      view.querySelector('[data-saved]').textContent = 'Saving...';
      clearTimeout(saveT); saveT = setTimeout(save, 800);
      drawControls();
    }
    function save() {
      if (!dirty) return Promise.resolve();
      dirty = false; ch.thumb = TL.charThumb(ch); TL.store_flag('anim', true);
      return TL.store.saveChar(ch, true).then(function () { var s = view.querySelector('[data-saved]'); if (s) s.textContent = 'Saved ✓'; },
        function (e) { dirty = true; var s = view.querySelector('[data-saved]'); if (s) s.textContent = 'Not saved!'; throw e; });
    }
    function setPlaying(v) { playing = v; t0 = performance.now() - f / (anim.fps || 12) * 1000; drawControls(); }
    function choose(a) { anim = a; f = 0; sel = null; setPlaying(false); drawList(); drawControls(); history.replaceState(null, '', '#animate/' + ch.id + '/' + a.id); }

    function wire() {
      cv.addEventListener('pointerdown', function (e) {
        if (playing) setPlaying(false);
        var pt = local(e), id = pick(pt);
        sel = id; if (!id) return;
        drag = { id: id, start: pt, r0: (keyAt(f) || poseNow()).r.slice() };
        try { cv.setPointerCapture(e.pointerId); } catch (x) {} e.preventDefault();
      });
      cv.addEventListener('pointermove', function (e) {
        if (!drag) return;
        var pt = local(e);
        if (drag.id === 'root') { var k = ensureKey(); k.r = [Math.round(drag.r0[0] + pt.lx - drag.start.lx), Math.round(drag.r0[1] + pt.ly - drag.start.ly)]; }
        else bend(drag.id, pt);
        drag.moved = true;
      });
      function up() { if (drag && drag.moved) edited(); drag = null; }
      cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    }
    view.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (b.hasAttribute('data-f')) { f = +b.getAttribute('data-f'); setPlaying(false); return; }
      if (b.hasAttribute('data-pick')) { var a = ch.anims.filter(function (x) { return x.id === b.getAttribute('data-pick'); })[0]; if (a) choose(a); return; }
      if (b.hasAttribute('data-play')) { setPlaying(!playing); return; }
      if (b.hasAttribute('data-prev')) { f = (f - 1 + anim.len) % anim.len; setPlaying(false); return; }
      if (b.hasAttribute('data-next')) { f = (f + 1) % anim.len; setPlaying(false); return; }
      if (b.hasAttribute('data-key')) { ensureKey(); edited(); return; }
      if (b.hasAttribute('data-delkey')) { var k = keyAt(f); if (!k) return UI.toast('This frame has no key.'); if (anim.keys.length < 2) return UI.toast('A move needs at least one key.'); anim.keys.splice(anim.keys.indexOf(k), 1); edited(); return; }
      if (b.hasAttribute('data-copy')) { var p = poseNow(); clipboard = { b: Object.assign({}, p.b), r: p.r.slice() }; UI.toast('Pose copied'); return; }
      if (b.hasAttribute('data-paste')) { if (!clipboard) return UI.toast('Copy a pose first.'); var k2 = ensureKey(); k2.b = Object.assign({}, clipboard.b); k2.r = clipboard.r.slice(); edited(); return; }
      if (b.hasAttribute('data-mirror')) {
        var k3 = ensureKey(), rest = TL.restAngles(ch), nb = Object.assign({}, k3.b);
        Object.keys(MIRROR).forEach(function (l) { var r = MIRROR[l]; if (rest[l] == null || rest[r] == null) return; var lv = k3.b[l] != null ? k3.b[l] : rest[l], rv = k3.b[r] != null ? k3.b[r] : rest[r]; nb[l] = rv; nb[r] = lv; });
        k3.b = nb; edited(); return;
      }
      if (b.hasAttribute('data-reset')) { var k4 = ensureKey(); k4.b = {}; k4.r = [0, 0]; edited(); return; }
      if (b.hasAttribute('data-len')) {
        var n = TL.clamp(anim.len + (+b.getAttribute('data-len')) * (anim.len >= 24 ? 2 : 1), 1, 48); if (n === anim.len) return;
        anim.len = n; anim.keys = anim.keys.filter(function (k5) { return k5.f < n; }); if (!anim.keys.length) anim.keys.push({ f: 0, b: {}, r: [0, 0] }); f = Math.min(f, n - 1); edited(); return;
      }
      if (b.hasAttribute('data-newanim')) { newAnim(); return; }
      if (b.hasAttribute('data-rename')) { TL.askName('Rename this move', anim.name).then(function (nm) { if (nm) { anim.name = nm.slice(0, 30); drawList(); edited(); } }); return; }
      if (b.hasAttribute('data-dupe')) { var c = TL.clone(anim); c.id = TL.uid('a'); c.name = (anim.name + ' 2').slice(0, 30); ch.anims.push(c); choose(c); edited(); return; }
      if (b.hasAttribute('data-delanim')) {
        if (ch.anims.length < 2) return UI.toast('A character needs at least one move.');
        UI.confirm({ title: 'Delete "' + anim.name + '"?', text: 'Movies that use it will use another move instead.', ok: 'Delete', danger: true }).then(function (yes) {
          if (!yes) return; ch.anims.splice(ch.anims.indexOf(anim), 1); choose(ch.anims[0]); edited();
        });
        return;
      }
      if (b.hasAttribute('data-restore')) {
        var have = ch.anims.map(function (x) { return x.id; }), added = TL.starterAnims(ch.rig).filter(function (x) { return have.indexOf(x.id) < 0; });
        ch.anims = ch.anims.concat(added); drawList(); edited(); UI.toast(added.length ? 'Brought back ' + UI.plural(added.length, 'move') : 'All the starter moves are already here.'); return;
      }
    });
    view.addEventListener('input', function (e) {
      if (e.target.matches('[data-fps]')) { anim.fps = +e.target.value; view.querySelector('[data-fpsv]').textContent = anim.fps + '/s'; edited(); }
      if (e.target.matches('[data-tilt]')) { var k = ensureKey(); k.b.root = +e.target.value; view.querySelector('[data-tiltv]').textContent = e.target.value + '°'; dirty = true; ch.custom = true; clearTimeout(saveT); saveT = setTimeout(save, 800); }
    });
    view.addEventListener('change', function (e) {
      if (e.target.matches('[data-loop]')) { anim.loop = e.target.checked; edited(); }
      if (e.target.matches('[data-onion]')) { onion = e.target.checked; }
      if (e.target.matches('[data-tilt]')) drawControls();
    });
    function onKey(e) {
      if (e.target.matches('input, textarea, select') || document.querySelector('.ui-modal-wrap')) return;
      if (e.key === ' ') { e.preventDefault(); setPlaying(!playing); }
      else if (e.key === 'ArrowRight') { f = (f + 1) % anim.len; setPlaying(false); }
      else if (e.key === 'ArrowLeft') { f = (f - 1 + anim.len) % anim.len; setPlaying(false); }
      else if (e.key === 'k' || e.key === 'K') { ensureKey(); edited(); }
    }
    document.addEventListener('keydown', onKey);
    function newAnim() {
      var emoji = '✨';
      var m = UI.modal('<div class="tl-modal-h"><span class="big">🕺</span><h2 style="margin:0">New move</h2></div><form class="ui-stack" data-f>' +
        '<label class="ui-field"><span>Name</span><input type="text" name="name" maxlength="30" required placeholder="Robot dance, Karate chop, Big sneeze..."></label>' +
        '<div><div class="tl-step" style="margin-top:0">Pick an emoji</div><div class="tl-chips" data-em>' + EMOJIS.map(function (x, i) { return '<button type="button" class="tl-chip' + (i ? '' : ' on') + '" data-e="' + x + '"><span class="em">' + x + '</span></button>'; }).join('') + '</div></div>' +
        '<label class="ui-field"><span>Start from</span><select name="from"><option value="rest">Standing still</option><option value="copy">A copy of "' + esc(anim.name) + '"</option></select></label>' +
        '<div class="ui-row end"><button type="button" class="ui-btn ghost" data-close>Cancel</button><button class="ui-btn primary" type="submit">Make it</button></div></form>');
      m.el.addEventListener('click', function (e) { var x = e.target.closest('[data-e]'); if (x) { emoji = x.getAttribute('data-e'); m.el.querySelectorAll('[data-e]').forEach(function (y) { y.classList.toggle('on', y === x); }); } });
      m.el.querySelector('[data-f]').addEventListener('submit', function (e) {
        e.preventDefault();
        var a = e.target.from.value === 'copy' ? TL.clone(anim) : { len: 12, fps: 12, loop: true, keys: [{ f: 0, b: {}, r: [0, 0] }] };
        a.id = TL.uid('a'); a.name = e.target.name.value.trim().slice(0, 30); a.emoji = emoji;
        ch.anims.push(a); m.close(); choose(a); edited(); UI.toast('Now bend the joints to make your move!');
      });
    }

    var ready = TL.store.getChar(ctx.args[0]).then(function (c) {
      if (!c) { view.innerHTML = '<div class="ui-wrap"><div class="ui-empty">' + UI.icon('smile') + '<h3>Character not found</h3><a class="ui-btn" href="#cast" data-go="cast">Back to your cast</a></div></div>'; return; }
      if (c.preset) { UI.go('build', c.id); return; }
      ch = c; ch.look = Object.assign({}, TL.DEFAULT_LOOK, ch.look || {});
      if (!ch.anims || !ch.anims.length) ch.anims = TL.starterAnims(ch.rig);
      anim = ch.anims.filter(function (a) { return a.id === ctx.args[1]; })[0] || ch.anims.filter(function (a) { return a.id === 'walk'; })[0] || ch.anims[0];
      drawPage(); wire(); raf = requestAnimationFrame(render);
      view.querySelector('[data-saved]').textContent = 'Saved ✓';
    });
    return { ready: ready, destroy: function () { cancelAnimationFrame(raf); document.removeEventListener('keydown', onKey); clearTimeout(saveT); if (dirty && ch) save().catch(function () {}); } };
  });
})();

/* ===== auth.html ===== */
(function () {
  var esc = UI.esc;
  function pw(name, auto) {
    return '<div class="au-pw"><input type="password" name="' + name + '" autocomplete="' + auto + '" required minlength="8">' +
      '<button type="button" data-show>Show</button></div>';
  }
  UI.page('auth', { title: 'Sign in', auth: 'guest' }, function (view, ctx) {
    var mode = ['signup', 'reset'].indexOf(ctx.args[0]) >= 0 ? ctx.args[0] : 'login';
    function draw(msg, isErr) {
      var heading = { login: 'Welcome back', signup: 'Create your account', reset: 'Reset your password' }[mode];
      var sub = { login: 'Sign in to continue to ' + esc(UI.config.name) + '.', signup: 'It\'s free and takes a few seconds.',
        reset: 'We\'ll email you a link to choose a new password.' }[mode];
      view.innerHTML = '<div class="au-wrap"><div class="ui-card au-card">' +
        '<h1>' + heading + '</h1><p class="muted">' + sub + '</p>' +
        (mode !== 'reset' ? '<div class="ui-seg" role="tablist"><button type="button" data-mode="login" class="' + (mode === 'login' ? 'on' : '') + '">Sign in</button>' +
          '<button type="button" data-mode="signup" class="' + (mode === 'signup' ? 'on' : '') + '">Create account</button></div>' : '<div style="height:14px"></div>') +
        '<form class="ui-stack" data-form="' + mode + '" novalidate>' +
        (mode === 'signup' ? '<label class="ui-field"><span>Your name</span><input type="text" name="name" autocomplete="name" required maxlength="60"></label>' : '') +
        '<label class="ui-field"><span>Email</span><input type="email" name="email" autocomplete="email" required></label>' +
        (mode === 'login' ? '<label class="ui-field"><span>Password</span>' + pw('password', 'current-password') + '</label>' : '') +
        (mode === 'signup' ? '<label class="ui-field"><span>Password <em>(at least 8 characters)</em></span>' + pw('password', 'new-password') + '</label>' +
          (window.LegalKit ? '<div>' + LegalKit.consentField() + '</div>' : '') : '') +
        '<div data-msg role="alert"' + (msg ? ' class="' + (isErr ? 'ui-error' : 'ui-note') + '">' + esc(msg) : ' hidden>') + '</div>' +
        '<button class="ui-btn primary block" type="submit">' + { login: 'Sign in', signup: 'Create account', reset: 'Send the link' }[mode] + '</button></form>' +
        '<div class="au-links">' + (mode === 'login' ? '<a data-mode="reset">Forgot your password?</a>' : '<a data-mode="login">' + UI.icon('back') + ' Back to sign in</a>') +
        '<a href="#landing" data-go="landing">About ' + esc(UI.config.name) + '</a></div></div></div>';
      var first = view.querySelector('input');
      if (first && !msg) first.focus();
    }
    view.addEventListener('click', function (e) {
      var m = e.target.closest('[data-mode]');
      if (m) { e.preventDefault(); mode = m.getAttribute('data-mode'); history.replaceState(null, '', '#auth' + (mode === 'login' ? '' : '/' + mode)); draw(); return; }
      var s = e.target.closest('[data-show]');
      if (s) { var i = s.parentNode.querySelector('input'); i.type = i.type === 'password' ? 'text' : 'password'; s.textContent = i.type === 'password' ? 'Show' : 'Hide'; }
    });
    view.addEventListener('submit', function (e) {
      e.preventDefault();
      var form = e.target, v = UI.formData(form);
      var problem = !/^\S+@\S+\.\S+$/.test(v.email || '') ? 'Please enter a valid email address.'
        : mode !== 'reset' && (v.password || '').length < (mode === 'signup' ? 8 : 1) ? (mode === 'signup' ? 'Please choose a password of at least 8 characters.' : 'Please enter your password.')
        : mode === 'signup' && (v.name || '').trim().length < 2 ? 'Please tell us your name.' : null;
      if (problem) { say(problem, true); return; }
      if (mode === 'signup' && window.LegalKit && !LegalKit.consentChecked(form)) return;  // the kit shows its own message
      UI.busy(form.querySelector('[type=submit]'), UI.auth(mode, v)).then(function (r) {
        if (mode === 'reset' || (r && !r.me)) { mode = 'login'; draw(r && r.message, false); restore({ email: v.email }); }
        else UI.toast(mode === 'signup' ? 'Welcome to ' + UI.config.name + '!' : 'Welcome back!', 'ok');
      }, function (err) { say(err.message, true); });
    });
    function say(msg, isErr) {
      var box = view.querySelector('[data-msg]');
      box.className = isErr ? 'ui-error' : 'ui-note'; box.textContent = msg; box.hidden = false;
    }
    function restore(v) {
      ['name', 'email'].forEach(function (k) { var i = view.querySelector('[name=' + k + ']'); if (i && v[k]) i.value = v[k]; });
    }
    draw();
  });
})();

/* ===== build.html ===== */
(function () {
  var esc = UI.esc;
  var TABS = {
    biped: [['head', '🙂 Head', [['head', 'Head shape']]], ['face', '👀 Face', [['eyes', 'Eyes'], ['mouth', 'Mouth']]], ['hat', '🎩 Hair & hats', [['hat', 'On top']]],
      ['body', '👕 Body', [['torso', 'Body']]], ['limbs', '💪 Arms & legs', [['arms', 'Arms'], ['legs', 'Legs']]], ['ends', '🧤 Hands & feet', [['hands', 'Hands'], ['feet', 'Feet']]],
      ['extras', '🦸 Extras', null], ['colors', '🎨 Colours', null], ['size', '📏 Size', null]],
    quad: [['head', '🐶 Head', [['head', 'Head shape']]], ['face', '👀 Face', [['eyes', 'Eyes'], ['mouth', 'Mouth']]], ['hat', '🎩 Hats', [['hat', 'On top']]],
      ['body', '🐾 Body', [['torso', 'Body']]], ['limbs', '🦵 Legs', [['legs', 'Legs']]], ['ends', '🐾 Feet', [['feet', 'Feet']]],
      ['extras', '🦸 Extras', null], ['colors', '🎨 Colours', null], ['size', '📏 Size', null]],
    worm: [['head', '🙂 Head', [['head', 'Head shape']]], ['face', '👀 Face', [['eyes', 'Eyes'], ['mouth', 'Mouth']]], ['hat', '🎩 Hats', [['hat', 'On top']]],
      ['extras', '🦸 Extras', null], ['colors', '🎨 Colours', null], ['size', '📏 Size', null]]
  };
  var COLOR_NAMES = { quad: { skin: 'Fur', shirt: 'Body', pants: 'Legs' }, worm: { skin: 'Head', shirt: 'Body', accent: 'Stripes' } };

  UI.page('build', { title: 'Build a character' }, function (view, ctx) {
    var id = ctx.args[0], ch = null, tab = 'head', anim = 'idle', raf = 0, saveT = 0, dirty = false, cv = null;
    view.innerHTML = '<div class="ui-wrap"><div class="ui-skel" style="height:420px"></div></div>';

    function tabs() { return TABS[ch.rig] || TABS.biped; }
    function draw() {
      view.innerHTML = '<div class="ui-wrap"><div class="bd-top"><a class="ui-btn ghost" href="#cast" data-go="cast">' + UI.icon('back') + 'Cast</a>' +
        '<input type="text" data-name maxlength="40" value="' + esc(ch.name) + '" aria-label="Character name"><span class="saved" data-saved>Saved ✓</span><span class="ui-spacer"></span>' +
        '<button class="ui-btn" data-dice>' + UI.icon('dice') + 'Surprise me</button><button class="ui-btn primary" data-animate>' + UI.icon('move') + 'Moves</button></div>' +
        '<div class="bd-grid"><div class="ui-card bd-stage"><canvas width="840" height="840" data-cv aria-label="' + esc(ch.name) + '"></canvas>' +
        '<div class="tl-chips" data-anims>' + ch.anims.slice(0, 8).map(function (a) { return '<button class="tl-chip' + (a.id === anim ? ' on' : '') + '" data-anim="' + esc(a.id) + '"><span class="em">' + TL.animEmoji(a) + '</span>' + esc(a.name) + '</button>'; }).join('') + '</div></div>' +
        '<div class="ui-card bd-panel"><div class="bd-tabs" role="tablist">' + tabs().map(function (t) { return '<button class="tl-chip' + (t[0] === tab ? ' on' : '') + '" data-tab="' + t[0] + '">' + t[1] + '</button>'; }).join('') + '</div>' +
        '<div data-body></div></div></div></div>';
      cv = view.querySelector('[data-cv]');
      drawTab();
    }
    function drawTab() {
      var body = view.querySelector('[data-body]'), t = tabs().filter(function (x) { return x[0] === tab; })[0] || tabs()[0], L = ch.look;
      if (t[2]) {
        body.innerHTML = t[2].map(function (s) {
          return '<div class="bd-sub">' + esc(s[1]) + '</div><div class="bd-items">' + TL.PARTS[s[0]].map(function (p) {
            return '<button type="button" class="tl-pick' + (L[s[0]] === p[0] ? ' on' : '') + '" data-slot="' + s[0] + '" data-part="' + p[0] + '"><canvas data-icon></canvas>' + esc(p[1]) + '</button>';
          }).join('') + '</div>';
        }).join('');
        body.querySelectorAll('[data-slot]').forEach(function (b) { b.querySelector('canvas').replaceWith(TL.partIcon(ch, b.getAttribute('data-slot'), b.getAttribute('data-part'), 76)); });
      } else if (tab === 'extras') {
        var have = TL.extras(ch).map(function (b) { return b.part; });
        body.innerHTML = '<p class="muted small">Tap to add or remove. Extras are sticks too: they move with the joint they hang from.</p><div class="bd-items">' + TL.PARTS.extra.map(function (p) {
          return '<button type="button" class="tl-pick' + (have.indexOf(p[0]) >= 0 ? ' on' : '') + '" data-extra="' + p[0] + '"><canvas></canvas>' + esc(p[1]) + '</button>';
        }).join('') + '</div>';
        body.querySelectorAll('[data-extra]').forEach(function (b) { b.querySelector('canvas').replaceWith(TL.partIcon(ch, 'extra', b.getAttribute('data-extra'), 76)); });
      } else if (tab === 'colors') {
        var names = COLOR_NAMES[ch.rig] || {};
        body.innerHTML = '<div class="bd-colors">' + TL.COLOR_SLOTS.filter(function (s) { return ch.rig !== 'worm' || ['skin', 'shirt', 'hair', 'accent'].indexOf(s[0]) >= 0; }).map(function (s) {
          return '<div class="row"><b>' + esc(names[s[0]] || s[1]) + '</b><div class="tl-swatches">' + TL.COLORS.map(function (c) {
            return '<button type="button" class="tl-swatch' + (L[s[0]] === c ? ' on' : '') + '" style="background:' + c + '" data-color="' + s[0] + '" data-c="' + c + '" aria-label="' + c + '"></button>';
          }).join('') + '<input type="color" data-custom="' + s[0] + '" value="' + esc(L[s[0]]) + '" aria-label="Pick any colour"></div></div>';
        }).join('') + '</div>';
      } else if (tab === 'size') {
        body.innerHTML = '<div class="bd-sizes">' + TL.SIZES.filter(function (s) { return ch.rig === 'biped' || (s[0] !== 'arm' && (ch.rig !== 'worm' || s[0] !== 'leg')); }).map(function (s) {
          return '<label class="tl-range"><span>' + esc(s[1]) + '</span><input type="range" min="' + s[2] + '" max="' + s[3] + '" step="0.01" value="' + (L[s[0]] || 1) + '" data-size="' + s[0] + '"><output>' + Math.round((L[s[0]] || 1) * 100) + '%</output></label>';
        }).join('') + '<button type="button" class="ui-btn sm" data-sizereset style="justify-self:start">Back to normal</button></div>';
      }
    }
    function changed(redrawTab) {
      dirty = true; ch.updated = new Date().toISOString();
      var s = view.querySelector('[data-saved]'); if (s) s.textContent = 'Saving...';
      clearTimeout(saveT); saveT = setTimeout(save, 700);
      if (redrawTab) drawTab();
    }
    function save() {
      if (!dirty) return Promise.resolve();
      dirty = false; ch.thumb = TL.charThumb(ch);
      return TL.store.saveChar(ch, true).then(function () { var s = view.querySelector('[data-saved]'); if (s) s.textContent = 'Saved ✓'; },
        function (e) { dirty = true; var s = view.querySelector('[data-saved]'); if (s) s.textContent = 'Not saved!'; throw e; });
    }
    function place() {  // centre the standing character, not too big
      var bb = TL.bounds(ch, TL.animPose(ch, TL.findAnim(ch, 'idle'), 0, 1)), s = Math.min(1.7, 300 / Math.max(bb.w, bb.h));
      return { s: s, x: 210 - (bb.x + bb.w / 2) * s, y: 214 - (bb.y + bb.h / 2) * s };
    }
    function tick(now) {
      if (!cv || !cv.isConnected) { raf = requestAnimationFrame(tick); return; }
      var t = now / 1000, a = TL.findAnim(ch, anim), pose = TL.animPose(ch, a, t, 1), c = cv.getContext('2d'), p = place();
      c.setTransform(2, 0, 0, 2, 0, 0); c.clearRect(0, 0, 420, 420);
      TL.drawChar(c, ch, pose, { x: p.x, y: p.y, s: p.s, t: t, shadow: TL.footY(ch), blink: (t % 3.4) < .12 ? 1 : 0 });
      raf = requestAnimationFrame(tick);
    }
    view.addEventListener('click', function (e) {
      var tb = e.target.closest('[data-tab]');
      if (tb) { tab = tb.getAttribute('data-tab'); view.querySelectorAll('[data-tab]').forEach(function (x) { x.classList.toggle('on', x === tb); }); drawTab(); return; }
      var p = e.target.closest('[data-part]');
      if (p) { ch.look[p.getAttribute('data-slot')] = p.getAttribute('data-part'); changed(true); return; }
      var x = e.target.closest('[data-extra]');
      if (x) {
        var part = x.getAttribute('data-extra'), ex = TL.extras(ch).filter(function (b) { return b.part === part; })[0];
        if (ex) ch.bones = ch.bones.filter(function (b) { return b !== ex; }); else TL.addExtra(ch, part);
        changed(true); return;
      }
      var sw = e.target.closest('[data-color]');
      if (sw) { ch.look[sw.getAttribute('data-color')] = sw.getAttribute('data-c'); changed(true); return; }
      var an = e.target.closest('[data-anim]');
      if (an) { anim = an.getAttribute('data-anim'); view.querySelectorAll('[data-anim]').forEach(function (y) { y.classList.toggle('on', y === an); }); return; }
      if (e.target.closest('[data-sizereset]')) { TL.SIZES.forEach(function (s) { ch.look[s[0]] = 1; }); changed(true); return; }
      if (e.target.closest('[data-dice]')) { TL.randomLook(ch); changed(true); TL.confetti(e.clientX, e.clientY); return; }
      if (e.target.closest('[data-animate]')) { save().then(function () { UI.go('animate', ch.id); }); return; }
      if (e.target === cv) {
        var r = cv.getBoundingClientRect(), px = (e.clientX - r.left) / r.width * 420, py = (e.clientY - r.top) / r.height * 420;
        var pl = place(), lx = (px - pl.x) / pl.s, ly = (py - pl.y) / pl.s, best = null, bd = 1e9;
        TL.solve(ch, TL.animPose(ch, TL.findAnim(ch, anim), performance.now() / 1000, 1)).forEach(function (sv) {
          if (sv.b.kind === 'root') return;
          var mx = (sv.x + sv.ex) / 2, my = (sv.y + sv.ey) / 2, d = Math.hypot(mx - lx, my - ly) - (sv.b.kind === 'head' ? 20 : 0);
          if (d < bd) { bd = d; best = sv.b; }
        });
        if (best && bd < 60) {
          var to = best.kind === 'head' ? 'head' : best.kind === 'torso' || best.kind === 'seg' ? (ch.rig === 'worm' ? 'colors' : 'body') : best.kind === 'extra' ? 'extras' : best.cap ? 'ends' : 'limbs';
          tab = to; view.querySelectorAll('[data-tab]').forEach(function (y) { y.classList.toggle('on', y.getAttribute('data-tab') === tab); }); drawTab();
        }
      }
    });
    view.addEventListener('input', function (e) {
      if (e.target.matches('[data-size]')) { var k = e.target.getAttribute('data-size'); ch.look[k] = +e.target.value; e.target.nextElementSibling.textContent = Math.round(e.target.value * 100) + '%'; changed(false); }
      if (e.target.matches('[data-custom]')) { ch.look[e.target.getAttribute('data-custom')] = e.target.value; changed(false); }
      if (e.target.matches('[data-name]')) { ch.name = e.target.value.trim() || ch.name; changed(false); }
    });
    view.addEventListener('change', function (e) { if (e.target.matches('[data-custom],[data-size]')) drawTab(); });

    var ready = (TL.isPreset(id) ? Promise.resolve(TL.copyChar(TL.PRESETS[id])).then(function (c) { return TL.store.saveChar(c).then(function () { UI.toast('This is your own copy of ' + c.name + '.'); history.replaceState(null, '', '#build/' + c.id); return c; }); })
      : TL.store.getChar(id)).then(function (c) {
      if (!c) { view.innerHTML = '<div class="ui-wrap"><div class="ui-empty">' + UI.icon('smile') + '<h3>Character not found</h3><p>It may have been deleted.</p><a class="ui-btn" href="#cast" data-go="cast">Back to your cast</a></div></div>'; return; }
      ch = c; ch.look = Object.assign({}, TL.DEFAULT_LOOK, ch.look || {});
      draw(); raf = requestAnimationFrame(tick);
    });
    return { ready: ready, destroy: function () { cancelAnimationFrame(raf); clearTimeout(saveT); if (dirty && ch) save().catch(function () {}); } };
  });
})();

/* ===== cast.html ===== */
(function () {
  var esc = UI.esc;
  UI.page('cast', { title: 'Cast', nav: 'Cast', icon: 'smile', order: 20 }, function (view, ctx) {
    view.innerHTML = '<div class="ui-wrap"><div class="ui-skel" style="height:240px"></div></div>';
    var mine = [], raf = 0;
    function draw() {
      view.innerHTML = '<div class="ui-wrap"><div class="ui-page-head"><div><h1>🧍 Your cast</h1><p class="muted">Every character has its own library of moves. Tap one to dress it up or teach it new moves.</p></div>' +
        '<button class="ui-btn yellow" data-new>' + UI.icon('plus') + 'New character</button></div>' +
        '<div class="tl-tiles">' + mine.map(function (c) { return TL.charTile(c, 'data-char="' + esc(c.id) + '"', UI.plural((c.anims || []).length, 'move')); }).join('') +
        '<button type="button" class="tl-tile new" data-new>' + UI.icon('plus') + '<b>New character</b><span class="sub">8 body types to start from</span></button></div>' +
        '<div class="tl-sec"><h2>🌟 Premade cast</h2><span class="muted small" style="font-weight:800">Use them in any movie, or make one yours</span></div>' +
        '<div class="tl-tiles">' + TL.PRESET_LIST.map(function (c) { return TL.charTile(c, 'data-preset="' + c.id + '"', UI.plural(c.anims.length, 'move')); }).join('') + '</div></div>';
    }
    view.addEventListener('click', function (e) {
      if (e.target.closest('[data-new]')) { TL.createCharacter(); return; }
      var c = e.target.closest('[data-char]'); if (c) { UI.go('build', c.getAttribute('data-char')); return; }
      var p = e.target.closest('[data-preset]'); if (p) presetDialog(TL.PRESETS[p.getAttribute('data-preset')]);
    });
    function presetDialog(ch) {
      var m = UI.modal('<div class="cs-preview"><canvas width="400" height="400"></canvas><div><h2>' + esc(ch.name) + '</h2>' +
        '<p class="muted">Part of the premade cast, with ' + ch.anims.length + ' moves: ' + esc(ch.anims.map(function (a) { return TL.animEmoji(a) + ' ' + a.name; }).join(', ')) + '.</p>' +
        '<p class="small muted">You can put ' + esc(ch.name) + ' in any movie as is. To change the looks or the moves, make your own copy.</p>' +
        '<div class="ui-row"><button class="ui-btn primary" data-mine>' + UI.icon('copy') + 'Make it mine</button></div></div></div>', { wide: true, onclose: function () { cancelAnimationFrame(raf); } });
      var cv = m.el.querySelector('canvas'), cx = cv.getContext('2d'), i = 0, t0 = performance.now();
      (function frame(now) {
        if (!cv.isConnected) return;
        var t = (now - t0) / 1000, anim = ch.anims[Math.floor(t / 2.4) % ch.anims.length], pose = TL.animPose(ch, anim, t, 1);
        cx.setTransform(2, 0, 0, 2, 0, 0); cx.clearRect(0, 0, 200, 200);
        TL.drawChar(cx, ch, pose, { x: 100, y: 112, s: .62, t: t, shadow: TL.footY(ch) });
        cx.fillStyle = 'rgba(26,29,58,.6)'; cx.font = '800 12px Nunito, sans-serif'; cx.textAlign = 'center'; cx.fillText(TL.animEmoji(anim) + ' ' + anim.name, 100, 192);
        raf = requestAnimationFrame(frame);
      })(t0);
      m.el.querySelector('[data-mine]').onclick = function (e) {
        var c = TL.copyChar(ch, ch.name); c.thumb = TL.charThumb(c);
        UI.busy(e.target, TL.store.saveChar(c)).then(function () { m.close(); UI.toast(ch.name + ' joined your cast!', 'ok'); UI.go('build', c.id); });
      };
    }
    return { ready: TL.store.chars().then(function (l) { mine = l; draw(); }), destroy: function () { cancelAnimationFrame(raf); } };
  });
})();

/* ===== home.html ===== */
(function () {
  var esc = UI.esc;

  function movieTile(m) {
    return '<div class="tl-tile hm-movie" data-movie="' + esc(m.id) + '" role="button" tabindex="0"><button type="button" class="hm-more" data-more aria-label="More for ' + esc(m.name) + '">' + UI.icon('more') + '</button>' +
      '<div class="pic wide">' + (m.thumb ? '<img alt="" src="' + esc(m.thumb) + '">' : '<span class="tl-emoji" style="font-size:2.4rem">🎬</span>') +
      (m.shared ? '<span class="ui-badge brand badge">' + UI.icon('share') + 'Shared</span>' : '') + '</div>' +
      '<b>' + esc(m.name) + '</b><span class="sub">' + TL.fmtTime(m.dur) + ' · ' + UI.plural(m.actors, 'actor') + (m.updated ? ' · ' + esc(UI.ago(m.updated)) : '') + '</span></div>';
  }

  UI.page('home', { title: 'My toons', nav: 'Toons', icon: 'film', order: 10 }, function (view, ctx) {
    view.innerHTML = '<div class="ui-wrap"><div class="ui-skel" style="height:240px"></div></div>';
    var data = null, myChars = [];

    function draw(d, theater, guestLeft) {
      data = d;
      var me = ctx.me, earned = TL.earned(d), nEarned = Object.keys(earned).length;
      var first = me ? me.name.split(' ')[0] : null;
      view.innerHTML = '<div class="ui-wrap">' +
        '<section class="hm-hero"><div><h1>' + (first ? 'Hey ' + esc(first) + '! 🎬' : 'Your cartoon studio 🎬') + '</h1>' +
          '<p>' + (d.movies.length ? 'Lights, camera... hold that character and make it move!' : 'Build a character, teach it moves, then hold it and drag it around to film your cartoon.') + '</p>' +
          '<div class="ui-row"><button class="ui-btn yellow lg" data-newmovie>🎬 New movie</button><button class="ui-btn lg" data-newchar>🧍 New character</button></div></div>' +
          '<canvas width="360" height="270" data-herocv aria-hidden="true"></canvas></section>' +
        (guestLeft ? '<div class="tl-banner"><span class="big">📦</span><p>You made ' + UI.plural(guestLeft, 'toon') + ' as a guest on this device. Move them into your account?</p><button class="ui-btn primary" data-import>Move them in</button></div>' : '') +
        (!me ? '<div class="tl-banner"><span class="big">🧸</span><p>You\'re playing as a guest: your toons are saved on this device only. A grown-up (16+) can make a free account to keep them safe and share them.</p><a class="ui-btn" href="#auth/signup" data-go="auth/signup">Make an account</a></div>' : '') +
        '<div class="tl-sec"><h2>🎬 My movies</h2>' + (d.movies.length ? '<button class="ui-btn sm" data-newmovie>' + UI.icon('plus') + 'New movie</button>' : '') + '</div>' +
        '<div class="tl-tiles" style="grid-template-columns:repeat(auto-fill,minmax(230px,1fr))">' + d.movies.map(movieTile).join('') +
          '<button type="button" class="tl-tile new" data-newmovie>' + UI.icon('plus') + '<b>New movie</b><span class="sub">Pick a place and some actors</span></button></div>' +
        '<div class="tl-sec"><h2>🧍 My cast</h2><a class="ui-btn sm" href="#cast" data-go="cast">See all ' + UI.icon('arrow') + '</a></div>' +
        '<div class="tl-tiles">' + myChars.slice(0, 5).map(function (c) { return TL.charTile(c, 'data-char="' + esc(c.id) + '"', UI.plural((c.anims || []).length || c.anims || 0, 'move')); }).join('') +
          '<button type="button" class="tl-tile new" data-newchar>' + UI.icon('plus') + '<b>New character</b><span class="sub">Heads, hats, capes...</span></button></div>' +
        '<div class="tl-sec"><h2>⭐ Sticker book</h2><span class="muted small" style="font-weight:800">' + nEarned + ' of ' + TL.STICKERS.length + '</span></div>' +
        '<div class="ui-card"><div class="hm-quest" style="margin-bottom:14px"><div class="bar"><i style="width:' + Math.round(nEarned / TL.STICKERS.length * 100) + '%"></i></div></div>' +
        '<div class="tl-stickers">' + TL.STICKERS.map(function (s) { return '<div class="s"><span class="tl-sticker' + (earned[s[0]] ? '' : ' off') + '">' + s[1] + '</span>' + esc(s[2]) + '</div>'; }).join('') + '</div></div>' +
        (theater && theater.length ? '<div class="tl-sec"><h2>🍿 In the Theater</h2><a class="ui-btn sm" href="#theater" data-go="theater">More ' + UI.icon('arrow') + '</a></div>' +
          '<div class="tl-tiles" style="grid-template-columns:repeat(auto-fill,minmax(230px,1fr))" data-theater>' + theater.slice(0, 3).map(function (c, i) {
            return '<a class="tl-tile" href="#watch/' + esc(c.key) + '"><div class="pic wide">' + (c.thumb ? '<img alt="" src="' + esc(c.thumb) + '">' : '<canvas data-poster="' + i + '" width="320" height="180"></canvas>') + '</div>' +
              '<b>' + esc(c.name) + '</b><span class="sub">by ' + esc(c.author) + ' · ' + UI.plural(c.views, 'view') + '</span></a>';
          }).join('') + '</div>' : '') + '</div>';
      var hero = view.querySelector('[data-herocv]');
      if (hero) heroAnim(hero);
      (theater || []).slice(0, 3).forEach(function (c, i) {
        var cv = view.querySelector('[data-poster="' + i + '"]');
        if (cv && c.data) { var p = TL.movieCanvas(c.data, {}, 3, 320, 180); cv.getContext('2d').drawImage(p, 0, 0); }
      });
    }
    var heroRaf = 0;
    function heroAnim(cv) {
      var ctx = cv.getContext('2d'), a = TL.PRESETS.p_blox, b = TL.PRESETS.p_biscuit, t0 = performance.now();
      var dance = TL.findAnim(a, 'dance'), wag = TL.findAnim(b, 'wag');
      (function frame(now) {
        if (!cv.isConnected) return;
        var t = (now - t0) / 1000;
        ctx.clearRect(0, 0, 360, 270);
        TL.drawChar(ctx, b, TL.animPose(b, wag, t, 1), { x: 250, y: 205, s: .9, t: t, flip: true, shadow: TL.footY(b) });
        TL.drawChar(ctx, a, TL.animPose(a, dance, t, 1), { x: 130, y: 160, s: .95, t: t, shadow: TL.footY(a), blink: (t % 3.2) < .12 ? 1 : 0 });
        heroRaf = requestAnimationFrame(frame);
      })(t0);
    }

    view.addEventListener('click', function (e) {
      if (e.target.closest('[data-newmovie]')) { TL.newMovieDialog(myChars); return; }
      if (e.target.closest('[data-newchar]')) { TL.createCharacter(); return; }
      if (e.target.closest('[data-import]')) {
        var btn = e.target.closest('[data-import]');
        UI.busy(btn, TL.importGuest(function (n, total) { btn.textContent = n + ' / ' + total; })).then(function (n) { UI.toast('Moved ' + UI.plural(n, 'thing') + ' into your account!', 'ok'); TL.confetti(); load(); });
        return;
      }
      var more = e.target.closest('[data-more]');
      if (more) { e.stopPropagation(); movieMenu(more.closest('[data-movie]').getAttribute('data-movie')); return; }
      var mv = e.target.closest('[data-movie]');
      if (mv) { UI.go('studio', mv.getAttribute('data-movie')); return; }
      var ch = e.target.closest('[data-char]');
      if (ch) UI.go('build', ch.getAttribute('data-char'));
    });
    view.addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target.matches('[data-movie]')) UI.go('studio', e.target.getAttribute('data-movie')); });

    function movieMenu(id) {
      var m = data.movies.filter(function (x) { return x.id === id; })[0]; if (!m) return;
      var dlg = UI.modal('<h2>' + esc(m.name) + '</h2><div class="ui-stack">' +
        '<button class="ui-btn block" data-a="open">' + UI.icon('film') + 'Open in the studio</button>' +
        '<button class="ui-btn block" data-a="rename">' + UI.icon('edit') + 'Rename</button>' +
        '<button class="ui-btn block" data-a="copy">' + UI.icon('copy') + 'Make a copy</button>' +
        '<button class="ui-btn block" data-a="share">' + UI.icon('share') + 'Share</button>' +
        '<button class="ui-btn block danger" data-a="del">' + UI.icon('trash') + 'Delete</button></div>');
      dlg.el.addEventListener('click', function (e) {
        var a = e.target.closest('[data-a]'); if (!a) return;
        var act = a.getAttribute('data-a'); dlg.close();
        if (act === 'open') UI.go('studio', id);
        if (act === 'share') TL.shareDialog(id, m.shared ? { shared: true, share_key: m.share_key } : null);
        if (act === 'rename') TL.askName('Rename movie', m.name).then(function (n) { if (!n) return; TL.store.getMovie(id).then(function (r) { r.movie.name = n; return TL.store.saveMovie(r.movie); }).then(load); });
        if (act === 'copy') TL.store.getMovie(id).then(function (r) { var c = TL.clone(r.movie); c.id = TL.uid('m'); c.name = (c.name + ' (copy)').slice(0, 60); return TL.store.saveMovie(c); }).then(function () { UI.toast('Copied!', 'ok'); load(); });
        if (act === 'del') UI.confirm({ title: 'Delete "' + m.name + '"?', text: 'The movie goes away for good. Your characters and sounds stay.', ok: 'Delete', danger: true }).then(function (yes) {
          if (yes) TL.store.delMovie(id).then(function () { UI.toast('Deleted'); load(); });
        });
      });
    }

    function load() {
      return Promise.all([TL.store.home(), TL.store.chars(), UI.apiQuiet('theater_list').catch(function () { return { featured: [] }; }),
        ctx.me ? TL.guestStuff() : Promise.resolve(null)]).then(function (r) {
        myChars = r[1];
        var left = r[3] ? r[3].chars.length + r[3].movies.length : 0;
        draw(r[0], r[2].featured, left);
      });
    }
    return { ready: load(), destroy: function () { cancelAnimationFrame(heroRaf); } };
  });
})();

/* ===== landing.html ===== */
(function () {
  var COPY = {
    eyebrow: 'Your own cartoon studio',
    title: 'Build a toon. <em>Hold it.</em> Make it move!',
    lead: 'Snap together a character from heads, hats, capes and jetpacks. Teach it moves with joints and sticks. Then press and hold it on the stage and drag it around: ToonyLoony records every step. Add voices, sounds and music, and you made a cartoon!',
    cta: 'Start making',
    proof: ['Free', 'No account needed to play', 'Works on tablets too'],
    stepsTitle: 'Three steps to your first cartoon',
    stepsLead: 'Most people make their first scene in about five minutes.',
    steps: [['🧍 Build a character', 'Pick a body type (hero, robot, pup, birdy, caterpillar...), then mix heads, faces, hair, hats, clothes, colours and extras. Stuck? Roll the dice!'],
            ['🕺 Teach it moves', 'Every character comes with ready-made moves like walk, run, sneak and dance. Make your own by bending the joints: each pose is a keyframe ◆.'],
            ['🔴 Hold to record', 'Put characters on a stage, pick a move and a speed, then press and hold one and move it around. Rewind, and record the next one alongside.']],
    featuresTitle: 'Everything a cartoon needs',
    features: [['smile', 'Characters from parts', '10 heads, 10 kinds of eyes, 15 hats and hairdos, wings, capes, swords, jetpacks and 24 colours. Millions of mixes.'],
               ['move', 'Joints and sticks', 'Drag the dots to bend elbows, knees, necks and tails. Onion skin shows your last pose, mirror flips it for walk cycles.'],
               ['film', 'Hold-to-record studio', 'While you hold a character, the clock runs and everyone else replays their part, so scenes line up by themselves. Slow-mo makes fast scenes easy.'],
               ['mic', 'Voices with lip-sync', 'Record a line while your movie plays, turn it into a chipmunk, a giant or a robot, and watch the character\'s mouth move with it.'],
               ['music', 'Sounds and music', '22 cartoon sound effects (boing! ba-dum-tss!) and 8 music loops, made just for ToonyLoony. Or upload your own.'],
               ['download', 'Download and share', 'Save your cartoon as a video file, or (with an account) share a link so friends and family can watch it.']],
    faq: [['Is it free?', 'Yes, all of it.'],
          ['Do I need an account?', 'No. You can play as a guest and your toons are saved on your device. A free account keeps them safe and lets you share movies. Accounts are for people 16 or older, so younger makers can ask a parent or an older brother or sister.'],
          ['Who can see my cartoons?', 'Only you, unless you share one. A shared movie plays for people who have its link. Sometimes we pick great ones to show in the Theater.'],
          ['Does ToonyLoony listen to my microphone?', 'Only while you are recording a voice, after you press the red button. As a guest, your recordings never leave your device.'],
          ['Does it work on a tablet or phone?', 'Yes: hold the character with your finger and move it. A bigger screen is comfier for the studio.'],
          ['Can I use my own pictures and music?', 'Yes, if you made them or are allowed to use them. Please don\'t upload pictures of real people without asking them.']],
    bandTitle: 'Your first cartoon is five minutes away',
    bandLead: 'Pick a character. Hold it. Move it. Action!'
  };

  /* The hero: a little stage that films itself. Blox walks along a path while a hand holds them; Biscuit replays behind. */
  function heroArt() {
    return '<div class="lp-art" aria-hidden="true"><div class="lp-stage"><canvas width="1280" height="720" data-herocv></canvas><span class="lp-recb"><i></i>REC</span></div>' +
      '<span class="lp-tag t1">👆 Hold to record!</span><span class="lp-tag t2">◆ Keyframes</span><span class="lp-tag t3">🎙️ Voices</span></div>';
  }
  function heroMovie() {
    var m = TL.newMovie('Hero'); m.bg = 'b:park'; m.dur = 8;
    var blox = TL.newActor(TL.PRESETS.p_blox, 200, 560), dog = TL.newActor(TL.PRESETS.p_biscuit, 120, 600);
    function path(a, anim, x0, x1, y, t0, t1, hop) {
      var pts = []; for (var i = 0; i <= 40; i++) { var u = i / 40, x = x0 + (x1 - x0) * u; pts.push([t0 + (t1 - t0) * u, x, y - (hop ? Math.abs(Math.sin(u * Math.PI * 2)) * hop : 0), x1 > x0 ? 1 : -1]); }
      a.takes.push({ id: TL.uid('k'), t0: t0, t1: t1, anim: anim, speed: 1, pts: pts });
    }
    path(blox, 'walk', 220, 1060, 560, 0, 6, 0); path(dog, 'run', 60, 860, 600, .8, 6.6, 0);
    m.actors = [dog, blox];
    m.bubbles = [{ id: 'b1', actor: blox.id, t0: 1.2, t1: 3.6, text: 'Look, I\'m in a cartoon!', style: 'say' }, { id: 'b2', actor: dog.id, t0: 4.2, t1: 6.6, text: 'Woof!', style: 'shout' }];
    return m;
  }
  function runHero(cv) {
    var ctx = cv.getContext('2d'), m = heroMovie(), t0 = performance.now(), blox = m.actors[1];
    (function frame(now) {
      if (!cv.isConnected) return;
      var t = ((now - t0) / 1000) % 8;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      var hits = TL.renderFrame(ctx, m, {}, Math.min(t, 7.6), {});
      var h = hits.filter(function (x) { return x.id === blox.id; })[0];
      if (h && t < 6) { ctx.font = '96px "Segoe UI Emoji", "Apple Color Emoji", sans-serif'; ctx.textAlign = 'center'; ctx.fillText('👆', h.cx + 30, h.y + h.h * .5 + 70); }
      requestAnimationFrame(frame);
    })(t0);
  }

  function stepPics(view) {
    var c0 = view.querySelector('[data-step="0"]'), c1 = view.querySelector('[data-step="1"]'), c2 = view.querySelector('[data-step="2"]');
    if (c0) { var x = c0.getContext('2d'); ['hero', 'bot', 'pup', 'birdy'].forEach(function (st, i) { var ch = TL.newCharacter(st); if (st === 'hero') ch.look.hat = 'wizard'; var f = TL.fitChar(ch, {}, 100, 200, 12); TL.drawChar(x, ch, {}, { x: f.x + i * 100, y: f.y + 6, s: f.s }); }); }
    if (c1) {
      var y = c1.getContext('2d'), ch2 = TL.PRESETS.p_pixel, a = TL.findAnim(ch2, 'dance');
      [[0, .22], [4, .45], [8, 1]].forEach(function (k, i) { TL.drawChar(y, ch2, TL.keyPose(ch2, a, k[0]), { x: 110 + i * 100, y: 120, s: .62, alpha: k[1] }); });
      y.fillStyle = '#ff8a2b'; y.font = '900 22px Nunito, sans-serif'; y.textAlign = 'center'; ['◆', '◆', '◆'].forEach(function (d, i) { y.fillText(d, 110 + i * 100, 214); });
    }
    if (c2) {
      var z = c2.getContext('2d'); z.save(); z.scale(400 / 1280, 220 / 720 * 1.0); TL.drawBackground(z, 'b:space', 1280, 720); z.restore();
      var zr = TL.PRESETS.p_zorp; TL.drawChar(z, zr, TL.animPose(zr, TL.findAnim(zr, 'walk'), .3, 1), { x: 230, y: 150, s: .5 });
      z.strokeStyle = '#ffc532'; z.lineWidth = 4; z.setLineDash([8, 7]); z.beginPath(); z.moveTo(60, 196); z.quadraticCurveTo(140, 150, 226, 192); z.stroke(); z.setLineDash([]);
      z.font = '44px "Segoe UI Emoji", sans-serif'; z.fillText('👆', 236, 196);
      z.fillStyle = '#ff3048'; TL.rr(z, 318, 12, 70, 28, 8); z.fill(); z.fillStyle = '#fff'; z.font = '900 15px Nunito, sans-serif'; z.textAlign = 'left'; z.fillText('● REC', 328, 31);
    }
  }

  UI.page('landing', { title: 'Welcome' }, function (view, ctx) {
    var me = ctx.me, C = COPY, esc = UI.esc;
    var primary = me ? '<a class="ui-btn yellow lg" href="#home" data-go="home">🎬 Open my studio</a><a class="ui-btn lg" href="#theater" data-go="theater">🍿 Watch cartoons</a>'
      : '<a class="ui-btn yellow lg" href="#home" data-go="home">🎬 ' + esc(C.cta) + '</a>' +
        '<a class="ui-btn lg" href="#theater" data-go="theater">🍿 Watch cartoons</a>';
    view.innerHTML =
      '<section class="lp-hero"><div class="ui-wrap"><div>' +
        '<div class="eyebrow">' + esc(C.eyebrow) + '</div><h1>' + C.title + '</h1><p class="lp-lead">' + esc(C.lead) + '</p>' +
        '<div class="lp-cta">' + primary + '</div>' +
        '<div class="lp-proof">' + C.proof.map(function (p) { return '<span>' + UI.icon('check') + esc(p) + '</span>'; }).join('') + '</div>' +
        (me ? '' : '<p class="small muted lp-grown">Grown-ups (16+): <a href="#auth/signup" data-go="auth/signup">make a free account</a> to save toons in the cloud and share them.</p>') +
      '</div>' + heroArt() + '</div></section>' +
      '<section class="lp-section" id="how"><div class="ui-wrap"><div class="lp-head"><h2>' + esc(C.stepsTitle) + '</h2><p>' + esc(C.stepsLead) + '</p></div>' +
        '<div class="lp-steps">' + C.steps.map(function (s, i) { return '<div class="ui-card lp-step"><canvas class="lp-stepcv" data-step="' + i + '" width="400" height="220"></canvas><h3>' + esc(s[0]) + '</h3><p class="muted">' + esc(s[1]) + '</p></div>'; }).join('') + '</div></div></section>' +
      '<section class="lp-section"><div class="ui-wrap"><div class="lp-head"><h2>' + esc(C.featuresTitle) + '</h2></div>' +
        '<div class="ui-grid">' + C.features.map(function (f) { return '<div class="ui-card lp-feature">' + UI.icon(f[0]) + '<h3>' + esc(f[1]) + '</h3><p>' + esc(f[2]) + '</p></div>'; }).join('') + '</div></div></section>' +
      '<section class="lp-section"><div class="ui-wrap"><div class="lp-head"><h2>Questions</h2></div><div class="lp-faq">' +
        C.faq.map(function (q) { return '<details><summary>' + esc(q[0]) + '</summary><p>' + esc(q[1]) + '</p></details>'; }).join('') + '</div></div></section>' +
      '<section class="lp-section"><div class="ui-wrap"><div class="lp-band"><div><h2>' + esc(C.bandTitle) + '</h2><p>' + esc(C.bandLead) + '</p></div>' +
        '<a class="ui-btn yellow lg" href="#home" data-go="home">🎬 ' + esc(C.cta) + '</a>' +
      '</div></div></section>';
    var cv = view.querySelector('[data-herocv]');
    if (cv) runHero(cv);
    stepPics(view);
  });
})();

/* ===== library.html ===== */
(function () {
  var esc = UI.esc;
  var TABS = [['sound', '🔊 Sounds'], ['music', '🎵 Music'], ['voice', '🎙️ Voices'], ['bg', '🖼️ Pictures']];
  UI.page('library', { title: 'Library', nav: 'Library', icon: 'music', order: 30 }, function (view, ctx) {
    var tab = TABS.some(function (x) { return x[0] === ctx.args[0]; }) ? ctx.args[0] : 'sound', mine = [], playingId = null;
    view.innerHTML = '<div class="ui-wrap"><div class="ui-skel" style="height:300px"></div></div>';
    function card(s, own) {
      return '<div class="lb-card"><span class="em">' + (s.emoji || (s.kind === 'voice' ? '🎙️' : s.kind === 'music' ? '🎵' : '🔊')) + '</span>' +
        '<div class="nm"><b>' + esc(s.name) + '</b><span>' + (s.dur ? s.dur.toFixed(1) + ' s' : '') + (own ? (s.dur ? ' · ' : '') + 'yours' : (s.kind === 'music' ? ' · loops' : '')) + '</span></div>' +
        (own ? '<button class="ui-btn ghost icon sm" data-ren="' + esc(s.id) + '" aria-label="Rename">' + UI.icon('edit') + '</button><button class="ui-btn ghost icon sm" data-del="' + esc(s.id) + '" aria-label="Delete">' + UI.icon('trash') + '</button>' : '') +
        '<button class="play' + (playingId === s.id ? ' on' : '') + '" data-play="' + esc(s.id) + '" aria-label="Listen to ' + esc(s.name) + '">' + (playingId === s.id ? '■' : '▶') + '</button></div>';
    }
    function draw() {
      var own = mine.filter(function (a) { return a.kind === tab; }), body = '';
      if (tab === 'bg') {
        body = '<div class="lb-actions"><button class="ui-btn primary" data-up="bg">' + UI.icon('upload') + 'Upload a picture</button></div>' +
          (own.length ? '<h3>Yours</h3><div class="lb-pics" style="margin-bottom:22px">' + own.map(function (a) {
            return '<div class="lb-pic"><img alt="" src="' + esc(a.url) + '"><div><span>' + esc(a.name) + '</span><button class="ui-btn ghost icon sm" data-ren="' + esc(a.id) + '" aria-label="Rename">' + UI.icon('edit') + '</button><button class="ui-btn ghost icon sm" data-del="' + esc(a.id) + '" aria-label="Delete">' + UI.icon('trash') + '</button></div></div>';
          }).join('') + '</div>' : '') +
          '<h3>Premade places</h3><div class="lb-pics">' + TL.SCENES.map(function (s) { return '<div class="lb-pic"><canvas data-bgcv="' + s.id + '"></canvas><div><span>' + s.emoji + ' ' + esc(s.name) + '</span></div></div>'; }).join('') + '</div>';
      } else {
        var pre = tab === 'sound' ? TL.SOUNDS : tab === 'music' ? TL.MUSIC : [];
        body = '<div class="lb-actions">' + (tab === 'voice' ? '<button class="ui-btn rec" data-record>' + UI.icon('mic') + 'Record a voice</button>' : '') +
          '<button class="ui-btn' + (tab === 'voice' ? '' : ' primary') + '" data-up="' + tab + '">' + UI.icon('upload') + 'Upload ' + (tab === 'music' ? 'music' : tab === 'voice' ? 'a voice file' : 'a sound') + '</button></div>' +
          (own.length ? '<h3>Yours</h3><div class="lb-grid" style="margin-bottom:22px">' + own.map(function (a) { return card(a, true); }).join('') + '</div>'
            : tab === 'voice' ? '<div class="ui-empty" style="margin-bottom:22px"><span style="font-size:2.4rem">🎙️</span><h3>No voices yet</h3><p>Record one here, or right in the studio while your movie plays.</p></div>' : '') +
          (pre.length ? '<h3>Premade ' + (tab === 'music' ? 'music' : 'sounds') + '</h3><div class="lb-grid">' + pre.map(function (s) { return card(s, false); }).join('') + '</div>' : '');
      }
      view.innerHTML = '<div class="ui-wrap"><div class="ui-page-head"><div><h1>🎵 Library</h1><p class="muted">Everything you can drop into a movie. ' + (TL.guest() ? 'Your uploads stay on this device.' : 'Your uploads are saved in your account.') + '</p></div></div>' +
        '<nav class="ui-tabs">' + TABS.map(function (x) { return '<a href="#library/' + x[0] + '" class="' + (x[0] === tab ? 'on' : '') + '">' + x[1] + '</a>'; }).join('') + '</nav>' + body +
        '<p class="small muted" style="margin-top:24px">Only upload sounds and pictures you made yourself or are allowed to use. Never upload pictures of real people without asking them.</p></div>';
      view.querySelectorAll('[data-bgcv]').forEach(function (c) { c.replaceWith(TL.bgThumb(c.getAttribute('data-bgcv'), 384, 216)); });
    }
    view.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (b.hasAttribute('data-play')) {
        var id = b.getAttribute('data-play');
        if (playingId === id) { TL.stopPreview(); playingId = null; draw(); return; }
        playingId = id; draw();
        TL.preview(id, { onend: function () { if (playingId === id) { playingId = null; draw(); } } });
        return;
      }
      if (b.hasAttribute('data-up')) { TL.upload(b.getAttribute('data-up')).then(function (a) { if (a) { mine.unshift(a); draw(); } }); return; }
      if (b.hasAttribute('data-record')) {
        TL.voiceDialog({}).then(function (r) { if (r) { mine.unshift(r.asset); TL.store_flag('voice', true); draw(); } });
        return;
      }
      if (b.hasAttribute('data-ren')) {
        var a = mine.filter(function (x) { return x.id === b.getAttribute('data-ren'); })[0];
        TL.askName('Rename', a.name).then(function (n) { if (!n) return; TL.store.renameAsset(a.id, n).then(function () { a.name = n; draw(); }); });
        return;
      }
      if (b.hasAttribute('data-del')) {
        var d = mine.filter(function (x) { return x.id === b.getAttribute('data-del'); })[0];
        UI.confirm({ title: 'Delete "' + d.name + '"?', text: 'Movies that use it will go quiet (or plain) there.', ok: 'Delete', danger: true }).then(function (y) {
          if (y) TL.store.delAsset(d.id).then(function () { mine = mine.filter(function (x) { return x !== d; }); draw(); });
        });
      }
    });
    return { ready: TL.store.assets().then(function (l) { mine = l; draw(); }), destroy: function () { TL.stopPreview(); } };
  });
})();

/* ===== profile.html ===== */
(function () {
  var esc = UI.esc;
  UI.page('profile', { title: 'Your profile', auth: 'user' }, function (view, ctx) {
    var me = ctx.me;
    view.innerHTML = '<div class="ui-wrap ui-narrow"><div class="pf-head"><span class="ui-avatar">' + esc(UI.initials(me.name)) + '</span>' +
      '<div><h1>' + esc(me.name) + '</h1><div class="muted">' + esc(me.email) + (me.joined ? ' · member since ' + esc(UI.fmtDate(me.joined, { month: 'long', year: 'numeric' })) : '') + '</div></div></div>' +
      '<div class="pf-grid"><form class="ui-card ui-stack" data-name><h3>Your name</h3><label class="ui-field"><span>Shown to other people</span>' +
      '<input type="text" name="name" value="' + esc(me.name) + '" maxlength="60" required></label><button class="ui-btn primary" type="submit">Save</button></form>' +
      '<div class="ui-card ui-stack"><h3>Appearance</h3><p class="muted small">Follow your device, or pick one.</p><div data-theme-box></div>' +
      '<h3 style="margin-top:22px">Password</h3><p class="muted small">We\'ll email you a link to choose a new one.</p>' +
      '<button class="ui-btn" data-reset>' + UI.icon('mail') + 'Email me a reset link</button></div></div>' +
      '<div class="ui-card" style="margin-top:16px"><div class="pf-links">' +
      (me.is_admin ? '<a href="#admin" data-go="admin">' + UI.icon('shield') + 'Admin</a>' : '') +
      '<button data-feedback>' + UI.icon('chat') + 'Send feedback</button>' +
      '<button data-lk-open="overview">' + UI.icon('lock') + 'Privacy &amp; Terms, and your data</button>' +
      '<button data-signout-here>' + UI.icon('logout') + 'Sign out</button></div></div></div>';
    function themeBox() {
      var t = UI.theme();
      view.querySelector('[data-theme-box]').innerHTML = '<div class="ui-seg">' + [['auto', 'Auto'], ['light', 'Light'], ['dark', 'Dark']].map(function (o) {
        return '<button type="button" data-theme-pick="' + o[0] + '" class="' + (t === o[0] ? 'on' : '') + '">' + o[1] + '</button>';
      }).join('') + '</div>';
    }
    themeBox();
    view.addEventListener('click', function (e) {
      var t = e.target.closest('[data-theme-pick]');
      if (t) { UI.setTheme(t.getAttribute('data-theme-pick')); themeBox(); UI.renderChrome(); return; }
      if (e.target.closest('[data-reset]')) {
        UI.busy(e.target.closest('[data-reset]'), UI.auth('reset', { email: me.email })).then(function (r) { UI.toast(r.message, 'ok'); });
      }
      if (e.target.closest('[data-signout-here]')) UI.auth('logout');
    });
    view.querySelector('[data-name]').addEventListener('submit', function (e) {
      e.preventDefault();
      var v = UI.formData(e.target);
      UI.busy(e.target.querySelector('[type=submit]'), UI.api('update_profile', v.name)).then(function (r) {
        UI.setMe(r.me); ctx.me = r.me; UI.toast('Saved', 'ok');
        view.querySelector('.pf-head h1').textContent = r.me.name;
      });
    });
  });
})();

/* ===== studio.html ===== */
(function () {
  var esc = UI.esc, W = 1280, H = 720, LAB = 104;
  var COLORS = ['#ffd23f', '#8fd3ff', '#ffb3d9', '#9be15d', '#ffb37a', '#c9b6ff', '#7ce8d8', '#ffe08a'];
  var SPEEDS = [[.5, '½×'], [1, '1×'], [1.5, '1½×'], [2, '2×'], [3, '3×']];

  UI.page('studio', { title: 'Studio' }, function (view, ctx) {
    var movie = null, chars = {}, myChars = [], assets = [], share = { shared: false };
    var t = 0, playing = false, rec = null, press = null, sel = null, item = null, tab = 'actor', soundTab = 'sound';
    var tool = 'rec', recRate = UI.store.get('recRate', 1), showPaths = true, hits = [], live = null, moveOff = null;
    var hist = [], future = [], saveT = 0, dirty = false, raf = 0, needs = true, mixer = null, playFrom = 0, playWall = 0, pps = 40;
    var stage, sctx, wrap, holdT = 0, pointer = null, ro = null, dead = false;
    view.innerHTML = '<div class="st"><div class="ui-skel" style="height:520px"></div></div>';

    /* ---------------------------------------------------------------- helpers */
    function actorById(id) { return (movie.actors || []).filter(function (a) { return a.id === id; })[0] || null; }
    function charOf(a) { return TL.charFor(chars, a.char); }
    function color(a) { return COLORS[Math.max(0, movie.actors.indexOf(a)) % COLORS.length]; }
    function animsOf(a) { return charOf(a).anims || []; }
    function animName(a, id) { var x = TL.findAnim(charOf(a), id); return x ? TL.animEmoji(x) + ' ' + x.name : id; }
    function assetInfo(ref) { return TL.builtinAudio(ref) || TL.assetIndex[ref] || { name: 'Missing sound', emoji: '❓', dur: 1 }; }
    function clipEmoji(c) { var b = TL.builtinAudio(c.asset); return b ? b.emoji : c.kind === 'voice' ? '🎙️' : c.kind === 'music' ? '🎵' : '🔊'; }
    function bufLen(c) { var info = assetInfo(c.asset); return c.kind === 'music' ? (c.len || info.dur || 8) : (info.dur || 1) / (c.rate || 1); }

    /* ---------------------------------------------------------------- changes, undo, saving */
    function change(fn) {
      hist.push(JSON.stringify(movie)); if (hist.length > 80) hist.shift(); future = [];
      fn(); after();
    }
    function set(fn) { fn(); dirty = true; scheduleSave(); needs = true; }
    function after() { dirty = true; needs = true; scheduleSave(); drawTimeline(); drawPanel(); drawTop(); }
    function undo() { if (!hist.length || rec) return; future.push(JSON.stringify(movie)); movie = JSON.parse(hist.pop()); fixSel(); after(); UI.toast('Undone'); }
    function redo() { if (!future.length || rec) return; hist.push(JSON.stringify(movie)); movie = JSON.parse(future.pop()); fixSel(); after(); }
    function fixSel() { if (sel && !actorById(sel)) sel = null; if (item && !findItem()) item = null; }
    function scheduleSave() { var s = view.querySelector('[data-saved]'); if (s) s.textContent = 'Saving...'; clearTimeout(saveT); saveT = setTimeout(save, 1300); }
    function save() {
      if (!dirty || !movie) return Promise.resolve();
      dirty = false;
      movie.thumb = TL.movieThumb(movie, chars, Math.min(movie.dur, Math.max(1, TL.movieEnd(movie) * .4)));
      return TL.store.saveMovie(movie, true).then(function () { var s = view.querySelector('[data-saved]'); if (s) s.textContent = 'Saved ✓'; },
        function (e) { dirty = true; var s = view.querySelector('[data-saved]'); if (s) s.textContent = 'Not saved!'; throw e; });
    }

    /* ---------------------------------------------------------------- page skeleton */
    function drawPage() {
      view.innerHTML = '<div class="st"><div class="st-top"><a class="ui-btn ghost sm" href="#home" data-go="home">' + UI.icon('back') + '<span class="lbl">Toons</span></a>' +
        '<input class="st-title" type="text" data-title maxlength="60" value="' + esc(movie.name) + '" aria-label="Movie name"><span class="st-saved" data-saved>Saved ✓</span><span class="ui-spacer"></span>' +
        '<button class="ui-btn icon" data-undo title="Undo (Ctrl+Z)" aria-label="Undo">' + UI.icon('undo') + '</button><button class="ui-btn icon" data-redo title="Redo" aria-label="Redo">' + UI.icon('redo') + '</button>' +
        '<button class="ui-btn" data-export>' + UI.icon('download') + '<span class="lbl">Video</span></button><button class="ui-btn yellow" data-share>' + UI.icon('share') + '<span class="lbl">Share</span></button></div>' +
        '<div class="st-main"><div class="st-left"><div class="st-stagewrap" data-wrap><canvas class="st-stage" data-stage></canvas>' +
        '<div class="st-rec" data-recbadge hidden><i></i>REC <span data-rect></span></div><div class="st-tip" data-tip hidden></div><div class="st-ring" data-ring hidden></div></div>' +
        '<div class="st-transport"><button class="ui-btn icon" data-home title="Back to the start (Home)" aria-label="Back to the start">⏮</button>' +
        '<button class="ui-btn primary" data-play style="min-width:62px" aria-label="Play">▶</button><span class="st-time" data-time></span><span class="ui-spacer"></span>' +
        '<div class="ui-seg" role="group" aria-label="Tool"><button data-tool="rec">🔴 Record</button><button data-tool="move">✋ Move</button></div>' +
        '<div class="ui-seg" role="group" aria-label="Recording speed"><button data-rate="1">1×</button><button data-rate="0.5" title="Slow-mo: the clock runs at half speed while you record">🐢 ½×</button></div></div>' +
        '<div class="st-tl"><div class="st-tl-scroll" data-tlscroll><div class="st-tl-inner" data-tlinner></div></div></div></div>' +
        '<aside class="ui-card st-panel" data-panel></aside></div></div>';
      stage = view.querySelector('[data-stage]'); wrap = view.querySelector('[data-wrap]');
      sizeStage();
      ro = window.ResizeObserver ? new ResizeObserver(function () { sizeStage(); drawTimeline(); }) : null;
      if (ro) ro.observe(wrap);
      wireStage(); drawTop(); drawTimeline(); drawPanel(); tip();
    }
    function sizeStage() {
      if (!stage) return;
      var w = wrap.clientWidth || 800, dpr = Math.min(window.devicePixelRatio || 1, 2);
      stage.width = Math.round(w * dpr); stage.height = Math.round(w * 9 / 16 * dpr);
      sctx = stage.getContext('2d'); needs = true;
    }
    function drawTop() {
      if (!view.querySelector('[data-time]')) return;
      view.querySelector('[data-time]').textContent = TL.fmtTime(t, true) + ' / ' + TL.fmtTime(movie.dur);
      view.querySelector('[data-play]').textContent = playing ? '⏸' : '▶';
      view.querySelectorAll('[data-tool]').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-tool') === tool); });
      view.querySelectorAll('[data-rate]').forEach(function (b) { b.classList.toggle('on', +b.getAttribute('data-rate') === recRate); });
      view.querySelector('[data-undo]').disabled = !hist.length; view.querySelector('[data-redo]').disabled = !future.length;
      wrap.classList.toggle('move', tool === 'move');
    }
    function tip() {
      var el = view.querySelector('[data-tip]'); if (!el) return;
      var anyTake = movie.actors.some(function (a) { return a.takes && a.takes.length; });
      if (!movie.actors.length) { el.hidden = false; el.textContent = '➕ Add an actor from the Cast tab to start!'; }
      else if (!anyTake && !rec) { el.hidden = false; el.textContent = tool === 'move' ? '✋ Drag a character to put it in place.' : '👆 Press and HOLD a character, then move it around. Let go to stop recording!'; }
      else el.hidden = true;
    }

    /* ---------------------------------------------------------------- the render loop */
    function loop(now) {
      raf = requestAnimationFrame(loop);
      if (dead || !sctx) return;
      if (rec) recFrame(now);
      else if (playing) {
        t = playFrom + (now - playWall) / 1000;
        if (t >= movie.dur) { t = movie.dur; pause(); }
        needs = true; movePlayhead();
      }
      if (!needs) return;
      needs = false;
      var k = stage.width / W;
      sctx.setTransform(k, 0, 0, k, 0, 0);
      var lv = live;
      if (moveOff && sel) { var a = actorById(sel), st = TL.actorAt(a, t); lv = {}; lv[sel] = Object.assign({}, st, { x: st.x + moveOff[0], y: st.y + moveOff[1] }); }
      hits = TL.renderFrame(sctx, movie, chars, t, { sel: sel, paths: showPaths && !playing, live: lv, recording: !!rec });
    }
    function movePlayhead() {
      var ph = view.querySelector('[data-ph]'); if (ph) { ph.style.left = (LAB + t * pps) + 'px'; ph.classList.toggle('rec', !!rec); }
      var tm = view.querySelector('[data-time]'); if (tm) tm.textContent = TL.fmtTime(t, true) + ' / ' + TL.fmtTime(movie.dur);
      var sc = view.querySelector('[data-tlscroll]');
      if (sc && (playing || rec)) { var x = LAB + t * pps; if (x > sc.scrollLeft + sc.clientWidth - 40 || x < sc.scrollLeft + LAB) sc.scrollLeft = x - LAB - 60; }
    }
    function seek(v) { var was = playing; if (was) pause(); t = TL.clamp(v, 0, movie.dur); needs = true; movePlayhead(); if (was) play(); }
    function play() {
      if (playing || rec) return;
      if (t >= movie.dur - .05) t = 0;
      playing = true; playFrom = t; playWall = performance.now();
      TL.audioCtx(); mixer = TL.mixer(movie); mixer.start(t);
      drawTop();
    }
    function pause() { if (!playing) return; playing = false; if (mixer) mixer.stop(); drawTop(); needs = true; }

    /* ---------------------------------------------------------------- hold to record */
    function stagePt(e) { var r = stage.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H, cx: e.clientX - r.left, cy: e.clientY - r.top }; }
    function hitAt(p) {
      for (var i = hits.length - 1; i >= 0; i--) { var h = hits[i]; if (p.x >= h.x - 14 && p.x <= h.x + h.w + 14 && p.y >= h.y - 14 && p.y <= h.y + h.h + 14) return h; }
      return null;
    }
    function startRec() {
      var a = actorById(press.id); if (!a) return;
      clearTimeout(holdT); ringOff(); pause();
      var st = TL.actorAt(a, t);
      rec = { a: a, t0: t, wall: performance.now(), rate: recRate, anim: (a.rec && a.rec.anim) || 'walk', speed: (a.rec && a.rec.speed) || 1,
        grab: [press.pt.x - st.x, press.pt.y - st.y], pts: [[Math.round(t * 100) / 100, Math.round(st.x), Math.round(st.y), st.f]], f: st.f, last: t };
      if (recRate === 1) { TL.audioCtx(); mixer = TL.mixer(movie); mixer.start(t); }
      wrap.classList.add('recording'); view.querySelector('[data-recbadge]').hidden = false; tip();
      if (navigator.vibrate) try { navigator.vibrate(30); } catch (e) {}
    }
    function recFrame(now) {
      var tt = rec.t0 + (now - rec.wall) / 1000 * rec.rate;
      if (tt >= TL.MAX_DUR) { tt = TL.MAX_DUR; stopRec(); return; }
      var x = TL.clamp(pointer.x - rec.grab[0], -320, W + 320), y = TL.clamp(pointer.y - rec.grab[1], 40, H + 160);
      var pts = rec.pts, j = pts.length - 1;
      while (j > 0 && tt - pts[j][0] < .15) j--;
      if (rec.a.face === 'right') rec.f = 1; else if (rec.a.face === 'left') rec.f = -1;
      else if (Math.abs(x - pts[j][1]) > 6) rec.f = x > pts[j][1] ? 1 : -1;
      if (tt - rec.last >= 1 / 40) { pts.push([Math.round(tt * 100) / 100, Math.round(x), Math.round(y), rec.f]); rec.last = tt; }
      t = tt;
      if (t > movie.dur) movie.dur = Math.min(TL.MAX_DUR, Math.ceil(t + 1));
      live = {}; live[rec.a.id] = { x: x, y: y, f: rec.f, anim: rec.anim, speed: rec.speed, local: tt - rec.t0, take: null };
      view.querySelector('[data-rect]').textContent = TL.fmtTime(t, true);
      needs = true; movePlayhead();
    }
    function stopRec() {
      var r = rec; rec = null; live = null;
      if (mixer) mixer.stop();
      wrap.classList.remove('recording'); view.querySelector('[data-recbadge]').hidden = true;
      var pts = r.pts, t1 = pts[pts.length - 1][0];
      if (t1 - r.t0 < .15) { t = r.t0; needs = true; drawTimeline(); tip(); return; }
      if (r.a.face !== 'right' && r.a.face !== 'left') TL.faceFromMotion(pts, pts[0][3]);
      var take = { id: TL.uid('k'), t0: pts[0][0], t1: t1, anim: r.anim, speed: r.speed, pts: pts };
      hist.push(JSON.stringify(movie)); future = [];
      TL.insertTake(r.a, take);
      if (t1 + .5 > movie.dur) movie.dur = Math.min(TL.MAX_DUR, Math.ceil(t1 + 1));
      after(); tip();
      var first = !TL.store_flag('take');
      TL.store_flag('take', true);
      UI.toast(first ? '🎬 Take saved! Press ⏮ then ▶ to watch it. Then record someone else!' : '🎬 Take saved: ' + animName(r.a, r.anim) + ' (' + (t1 - r.t0).toFixed(1) + ' s)', 'ok');
      if (first) TL.confetti();
    }
    function ringAt(p) { var g = view.querySelector('[data-ring]'); g.hidden = false; g.style.left = p.cx + 'px'; g.style.top = p.cy + 'px'; g.style.setProperty('--p', 0);
      var s = performance.now(); (function grow() { if (g.hidden) return; var k = Math.min(100, (performance.now() - s) / 2.6); g.style.setProperty('--p', k); if (k < 100) requestAnimationFrame(grow); })(); }
    function ringOff() { var g = view.querySelector('[data-ring]'); if (g) g.hidden = true; }
    function wireStage() {
      stage.addEventListener('contextmenu', function (e) { e.preventDefault(); });
      stage.addEventListener('pointerdown', function (e) {
        if (e.button && e.button !== 0) return;
        var p = stagePt(e); pointer = p;
        var h = hitAt(p);
        if (!h) { sel = null; item = null; if (tab === 'actor') drawPanel(); drawTimeline(); needs = true; return; }
        e.preventDefault();
        if (sel !== h.id) { sel = h.id; item = null; tab = 'actor'; drawPanel(); drawTimeline(); }
        needs = true;
        press = { id: h.id, pt: p, at: performance.now(), mode: tool };
        try { stage.setPointerCapture(e.pointerId); } catch (x) {}
        if (tool === 'rec') { ringAt(p); holdT = setTimeout(function () { if (press && !rec) startRec(); }, 260); }
      });
      stage.addEventListener('pointermove', function (e) {
        var p = stagePt(e); pointer = p;
        if (!press || rec) return;
        var d = Math.hypot(p.x - press.pt.x, p.y - press.pt.y);
        if (press.mode === 'rec' && d > 14) startRec();
        else if (press.mode === 'move' && d > 3) { moveOff = [p.x - press.pt.x, p.y - press.pt.y]; needs = true; }
      });
      function up() {
        clearTimeout(holdT); ringOff();
        if (rec) stopRec();
        else if (press && press.mode === 'move' && moveOff) {
          var off = moveOff, a = actorById(press.id); moveOff = null;
          change(function () {
            a.x = Math.round(a.x + off[0]); a.y = Math.round(a.y + off[1]);
            (a.takes || []).forEach(function (k) { k.pts.forEach(function (q) { q[1] = Math.round(q[1] + off[0]); q[2] = Math.round(q[2] + off[1]); }); });
          });
        }
        press = null; moveOff = null; needs = true;
      }
      stage.addEventListener('pointerup', up); stage.addEventListener('pointercancel', up);
      stage.addEventListener('lostpointercapture', function () { if (rec) up(); });
    }

    /* ---------------------------------------------------------------- the timeline */
    function rows() {
      var r = movie.actors.map(function (a) { return { key: 'actor:' + a.id, a: a, label: a.name || charOf(a).name, img: TL.thumbOf(charOf(a)) }; });
      r.push({ key: 'bubbles', label: '💬 Bubbles' }, { key: 'voice', label: '🎙️ Voices' }, { key: 'sound', label: '🔊 Sounds' }, { key: 'music', label: '🎵 Music' });
      return r;
    }
    function drawTimeline() {
      var inner = view.querySelector('[data-tlinner]'), sc = view.querySelector('[data-tlscroll]'); if (!inner) return;
      pps = Math.max(34, (sc.clientWidth - LAB - 16) / Math.max(5, movie.dur));
      var width = LAB + movie.dur * pps + 16, step = pps > 70 ? 1 : pps > 30 ? 2 : 5, ruler = '';
      for (var s = 0; s <= movie.dur + .001; s += 1) ruler += s % step === 0 ? '<span style="left:' + s * pps + 'px">' + TL.fmtTime(s) + '</span>' : '<span class="minor" style="left:' + s * pps + 'px"></span>';
      var html = '<div class="st-ruler" data-ruler style="width:' + (movie.dur * pps + 16) + 'px">' + ruler + '</div>';
      rows().forEach(function (r) {
        var blocks = '';
        if (r.a) (r.a.takes || []).forEach(function (k) {
          var anim = TL.findAnim(charOf(r.a), k.anim);
          blocks += '<div class="st-blk' + (item && item.id === k.id ? ' on' : '') + '" data-item="take" data-id="' + k.id + '" data-actor="' + r.a.id + '" style="left:' + k.t0 * pps + 'px;width:' + Math.max(8, (k.t1 - k.t0) * pps) + 'px;background:' + color(r.a) + '" title="' + esc((anim ? anim.name : k.anim) + ' ' + k.speed + '×') + '">' +
            '<b>' + (anim ? TL.animEmoji(anim) + ' ' + esc(anim.name) : esc(k.anim)) + (k.speed !== 1 ? ' ' + k.speed + '×' : '') + '</b></div>';
        });
        else if (r.key === 'bubbles') (movie.bubbles || []).forEach(function (b) {
          blocks += '<div class="st-blk' + (item && item.id === b.id ? ' on' : '') + '" data-item="bubble" data-id="' + b.id + '" style="left:' + b.t0 * pps + 'px;width:' + Math.max(8, (b.t1 - b.t0) * pps) + 'px;background:#ffffff"><b>' + (b.style === 'think' ? '💭 ' : b.style === 'shout' ? '📢 ' : b.actor ? '💬 ' : '🔤 ') + esc(b.text) + '</b></div>';
        });
        else (movie.clips || []).filter(function (c) { return c.kind === r.key; }).forEach(function (c) {
          var bg = c.kind === 'music' ? '#c9b6ff' : c.kind === 'voice' ? '#ffb3d9' : '#9be15d';
          blocks += '<div class="st-blk' + (item && item.id === c.id ? ' on' : '') + (c.muted ? ' muted' : '') + '" data-item="clip" data-id="' + c.id + '" style="left:' + c.t * pps + 'px;width:' + Math.max(10, bufLen(c) * pps) + 'px;background:' + bg + '">' +
            (c.kind !== 'music' ? '<canvas data-wave="' + esc(c.asset) + '" width="160" height="30"></canvas>' : '') + '<b>' + clipEmoji(c) + ' ' + esc(assetInfo(c.asset).name) + '</b></div>';
        });
        html += '<div class="st-row' + (r.a && r.a.id === sel ? ' sel' : '') + '"><div class="st-lab" ' + (r.a ? 'data-pickactor="' + r.a.id + '"' : '') + '>' + (r.img ? '<img alt="" src="' + esc(r.img) + '">' : '') + '<span>' + esc(r.label) + '</span></div>' +
          '<div class="st-lane" data-lane="' + r.key + '" style="width:' + (movie.dur * pps + 16) + 'px">' + blocks + '</div></div>';
      });
      inner.style.width = width + 'px';
      inner.innerHTML = html + '<div class="st-ph' + (rec ? ' rec' : '') + '" data-ph></div>';
      movePlayhead();
      inner.querySelectorAll('[data-wave]').forEach(function (cv) {
        TL.getBuffer(cv.getAttribute('data-wave')).then(function (b) { if (b) TL.drawWave(cv, b, '#1a1d3a'); });
      });
    }
    function tlTime(e) { var inner = view.querySelector('[data-tlinner]'), r = inner.getBoundingClientRect(); return (e.clientX - r.left - LAB) / pps; }
    function wireTimeline() {
      var drag = null;
      view.addEventListener('pointerdown', function (e) {
        var inner = view.querySelector('[data-tlinner]'); if (!inner || !inner.contains(e.target) || rec) return;
        var blk = e.target.closest('[data-item]');
        if (blk) {
          var kind = blk.getAttribute('data-item'), it = findItem({ type: kind, id: blk.getAttribute('data-id') });
          drag = { blk: blk, kind: kind, it: it, x0: e.clientX, t0: kind === 'clip' ? it.t : kind === 'bubble' ? it.t0 : null, moved: false };
          try { blk.setPointerCapture(e.pointerId); } catch (x) {}
          return;
        }
        if (e.target.closest('[data-pickactor]')) return;
        if (e.target.closest('[data-ruler],[data-lane]')) { seek(tlTime(e)); drag = { scrub: true }; }
      });
      view.addEventListener('pointermove', function (e) {
        if (!drag) return;
        if (drag.scrub) { seek(tlTime(e)); return; }
        if (drag.t0 == null) return;
        var dt = (e.clientX - drag.x0) / pps;
        if (Math.abs(e.clientX - drag.x0) > 4) drag.moved = true;
        if (drag.moved) drag.blk.style.left = Math.max(0, drag.t0 + dt) * pps + 'px';
      });
      view.addEventListener('pointerup', function (e) {
        if (!drag) return;
        var d = drag; drag = null;
        if (d.scrub) return;
        if (d.moved && d.t0 != null) {
          var nt = Math.round(Math.max(0, d.t0 + (e.clientX - d.x0) / pps) * 20) / 20;
          change(function () { if (d.kind === 'clip') d.it.t = nt; else { var len = d.it.t1 - d.it.t0; d.it.t0 = nt; d.it.t1 = nt + len; } });
          return;
        }
        item = { type: d.kind, id: d.it.id };
        if (d.kind === 'take') { sel = d.blk.getAttribute('data-actor'); seek(d.it.t0); }
        else if (d.kind === 'bubble') { seek(d.it.t0 + .2); }
        else seek(d.it.t);
        tab = 'item'; drawPanel(); drawTimeline(); needs = true;
      });
    }
    function findItem(it) {
      it = it || item; if (!it) return null;
      if (it.type === 'take') { var f = null; movie.actors.forEach(function (a) { (a.takes || []).forEach(function (k) { if (k.id === it.id) f = k; }); }); return f; }
      if (it.type === 'clip') return (movie.clips || []).filter(function (c) { return c.id === it.id; })[0] || null;
      if (it.type === 'bubble') return (movie.bubbles || []).filter(function (b) { return b.id === it.id; })[0] || null;
      return null;
    }

    /* ---------------------------------------------------------------- the side panel */
    function chipsFor(list, cur, attr) {
      return '<div class="tl-chips">' + list.map(function (x) { return '<button type="button" class="tl-chip' + (x[0] === cur ? ' on' : '') + '" ' + attr + '="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>';
    }
    function drawPanel() {
      var p = view.querySelector('[data-panel]'); if (!p) return;
      if (tab === 'item' && !findItem()) tab = 'actor';
      var tabs = [['actor', '🎭 Actor'], ['cast', '➕ Cast'], ['scene', '🏞️ Scene'], ['sounds', '🔊 Sounds'], ['bubbles', '💬 Bubbles']];
      var html = '<div class="st-tabs">' + tabs.map(function (x) { return '<button class="tl-chip' + (x[0] === tab ? ' on' : '') + '" data-tab="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>';
      html += ({ actor: panelActor, cast: panelCast, scene: panelScene, sounds: panelSounds, bubbles: panelBubbles, item: panelItem }[tab] || panelActor)();
      p.innerHTML = html;
      p.querySelectorAll('[data-bgcv]').forEach(function (b) { b.replaceWith(TL.bgThumb(b.getAttribute('data-bgcv'), 192, 108)); });
    }
    function panelActor() {
      var a = sel && actorById(sel);
      if (!a) {
        return '<p class="muted" style="font-weight:700">Tap a character on the stage to pick it.</p>' + (movie.actors.length ? '<div class="st-list">' + movie.actors.map(function (x) {
          return '<button type="button" class="st-li" data-pickactor="' + x.id + '"><img alt="" src="' + esc(TL.thumbOf(charOf(x))) + '" width="32" height="32"><span class="nm">' + esc(x.name || charOf(x).name) + '</span><span class="small muted">' + UI.plural((x.takes || []).length, 'take') + '</span></button>';
        }).join('') + '</div>' : '<button class="ui-btn primary block" data-tab="cast">' + UI.icon('plus') + 'Add your first actor</button>');
      }
      var ch = charOf(a), anims = animsOf(a), cur = TL.findAnim(ch, a.rec.anim);
      return '<div class="st-actor-head"><img alt="" src="' + esc(TL.thumbOf(ch)) + '"><div style="flex:1;min-width:0"><b>' + esc(a.name || ch.name) + '</b><div class="small muted">' + UI.plural((a.takes || []).length, 'take') + '</div></div>' +
        '<button class="ui-btn ghost icon" data-a="renameactor" aria-label="Rename">' + UI.icon('edit') + '</button></div>' +
        '<div class="tl-step">Next take: what do they do?</div><div class="tl-chips">' + anims.map(function (x) {
          return '<button type="button" class="tl-chip' + (cur && x.id === cur.id ? ' on' : '') + '" data-recanim="' + esc(x.id) + '"><span class="em">' + TL.animEmoji(x) + '</span>' + esc(x.name) + '</button>'; }).join('') + '</div>' +
        '<div class="tl-step">How fast?</div>' + chipsFor(SPEEDS.map(function (s) { return [String(s[0]), s[1]]; }), String(a.rec.speed || 1), 'data-recspeed') +
        '<div class="st-hold">👆 Now press and <b>hold</b> ' + esc(a.name || ch.name) + ' on the stage and move it around. Let go to stop.' + (recRate !== 1 ? ' 🐢 Slow-mo is on.' : '') + '</div>' +
        '<div class="tl-step">Facing</div>' + chipsFor([['auto', '🔄 Follow the moves'], ['right', '👉 Right'], ['left', '👈 Left']], a.face || 'auto', 'data-face') +
        '<div class="tl-step">When standing still</div><select data-idle>' + anims.map(function (x) { return '<option value="' + esc(x.id) + '"' + (x.id === a.idle ? ' selected' : '') + '>' + TL.animEmoji(x) + ' ' + esc(x.name) + '</option>'; }).join('') + '</select>' +
        '<label class="tl-range" style="margin-top:14px"><span>Size</span><input type="range" min="0.35" max="2.4" step="0.05" value="' + (a.s || 1) + '" data-size><output>' + Math.round((a.s || 1) * 100) + '%</output></label>' +
        (movie.depth === false ? '<div class="ui-row" style="margin-top:8px"><button class="ui-btn sm" data-a="front">Bring to front</button><button class="ui-btn sm" data-a="back">Send to back</button></div>' : '') +
        '<div class="ui-row" style="margin-top:16px">' + (TL.isPreset(a.char) ? '<button class="ui-btn sm" data-a="mine">' + UI.icon('copy') + 'Make it mine</button>' : '<button class="ui-btn sm" data-a="moves">' + UI.icon('move') + 'Edit moves</button>') +
        '<button class="ui-btn sm" data-a="voice">' + UI.icon('mic') + 'Voice</button><button class="ui-btn sm" data-a="say">💬 Say</button></div>' +
        '<div class="ui-row" style="margin-top:4px"><button class="ui-btn sm ghost" data-a="cleartakes">Clear takes</button><button class="ui-btn sm ghost danger" data-a="removeactor">' + UI.icon('trash') + 'Remove</button></div>';
    }
    function panelCast() {
      return '<p class="muted small" style="font-weight:700">Tap to add an actor to the stage.</p><div class="tl-step" style="margin-top:4px">Your cast</div>' +
        (myChars.length ? '<div class="st-picks">' + myChars.map(function (c) { return TL.charPick(c, false, 'data-add="' + esc(c.id) + '"'); }).join('') + '</div>' : '<p class="small muted">You haven\'t made a character yet.</p>') +
        '<button class="ui-btn sm" data-a="newchar" style="margin-top:8px">' + UI.icon('plus') + 'New character</button>' +
        '<div class="tl-step">Premade cast</div><div class="st-picks">' + TL.PRESET_LIST.map(function (c) { return TL.charPick(c, false, 'data-add="' + c.id + '"'); }).join('') + '</div>';
    }
    function panelScene() {
      var mine = assets.filter(function (x) { return x.kind === 'bg'; });
      return '<div class="tl-step" style="margin-top:0">Background</div><div class="st-picks wide">' +
        TL.SCENES.map(function (s) { return '<button type="button" class="tl-pick wide' + (movie.bg === s.id ? ' on' : '') + '" data-bg="' + s.id + '"><canvas data-bgcv="' + s.id + '"></canvas>' + s.emoji + ' ' + esc(s.name) + '</button>'; }).join('') +
        mine.map(function (x) { return '<button type="button" class="tl-pick wide' + (movie.bg === x.id ? ' on' : '') + '" data-bg="' + esc(x.id) + '"><img alt="" src="' + esc(x.url) + '">' + esc(x.name) + '</button>'; }).join('') +
        TL.COLOR_BGS.map(function (c) { return '<button type="button" class="tl-pick wide' + (movie.bg === c[0] ? ' on' : '') + '" data-bg="' + c[0] + '"><canvas data-bgcv="' + c[0] + '"></canvas>' + esc(c[1]) + '</button>'; }).join('') + '</div>' +
        '<button class="ui-btn sm" data-a="uploadbg" style="margin-top:10px">' + UI.icon('upload') + 'Use my own picture</button>' +
        '<div class="tl-step">Movie</div><label class="tl-range"><span>Length</span><input type="range" min="5" max="' + TL.MAX_DUR + '" step="1" value="' + movie.dur + '" data-dur><output>' + TL.fmtTime(movie.dur) + '</output></label>' +
        '<label class="ui-check" style="margin-top:10px"><input type="checkbox" data-depth' + (movie.depth !== false ? ' checked' : '') + '> Characters lower on the screen stand in front</label>' +
        '<label class="ui-check" style="margin-top:8px"><input type="checkbox" data-paths' + (showPaths ? ' checked' : '') + '> Show the picked actor\'s path</label>';
    }
    function soundRow(s, kind) {
      return '<div class="st-li"><button class="ui-btn ghost icon sm" data-prev="' + esc(s.id) + '" aria-label="Listen">' + UI.icon('play') + '</button><span class="em">' + (s.emoji || (kind === 'voice' ? '🎙️' : '🔊')) + '</span>' +
        '<span class="nm">' + esc(s.name) + '</span><span class="small muted">' + (s.dur ? s.dur.toFixed(1) + 's' : '') + '</span><button class="ui-btn sm" data-addclip="' + esc(s.id) + '" data-kind="' + kind + '">' + UI.icon('plus') + '</button></div>';
    }
    function panelSounds() {
      var sub = [['sound', '🔊 Sounds'], ['music', '🎵 Music'], ['voice', '🎙️ Voices'], ['mine', '📁 Mine']], body = '';
      if (soundTab === 'sound') body = TL.SOUNDS.map(function (s) { return soundRow(s, 'sound'); }).join('');
      else if (soundTab === 'music') body = TL.MUSIC.map(function (s) { return soundRow(s, 'music'); }).join('');
      else if (soundTab === 'voice') body = '<button class="ui-btn rec block" data-a="voice">' + UI.icon('mic') + 'Record a voice</button>' +
        '<p class="small muted">Pick who\'s talking and their mouth moves with your voice. Try the Chipmunk and Robot effects!</p>' +
        assets.filter(function (x) { return x.kind === 'voice'; }).map(function (x) { return soundRow(x, 'voice'); }).join('');
      else body = '<div class="ui-row"><button class="ui-btn sm" data-a="upsound">' + UI.icon('upload') + 'Upload a sound</button><button class="ui-btn sm" data-a="upmusic">' + UI.icon('upload') + 'Upload music</button></div>' +
        '<p class="small muted">MP3, WAV, OGG or M4A, up to 8 MB. Only use sounds you made or are allowed to use.</p>' +
        assets.filter(function (x) { return x.kind === 'sound' || x.kind === 'music'; }).map(function (x) { return soundRow(x, x.kind); }).join('');
      return chipsFor(sub, soundTab, 'data-soundtab') + '<p class="small muted" style="margin:10px 0 6px;font-weight:700">Press ➕ to add it at ' + TL.fmtTime(t, true) + ' (where the playhead is).</p><div class="st-list">' + body + '</div>';
    }
    function panelBubbles() {
      var a = sel && actorById(sel);
      return '<p class="muted small" style="font-weight:700">Adds a bubble at ' + TL.fmtTime(t, true) + (a ? ' for ' + esc(a.name) : '') + '. Talking bubbles move the mouth too!</p>' +
        '<div class="ui-row"><button class="ui-btn sm" data-addbub="say">💬 Say</button><button class="ui-btn sm" data-addbub="think">💭 Think</button><button class="ui-btn sm" data-addbub="shout">📢 Shout</button><button class="ui-btn sm" data-addbub="caption">🔤 Caption</button></div>' +
        '<div class="st-list" style="margin-top:10px">' + (movie.bubbles || []).slice().sort(function (x, y) { return x.t0 - y.t0; }).map(function (b) {
          var who = b.actor && actorById(b.actor);
          return '<button type="button" class="st-li" data-pickitem="bubble:' + b.id + '"><span class="small muted">' + TL.fmtTime(b.t0, true) + '</span><span class="nm">' + esc((who ? who.name + ': ' : '') + b.text) + '</span></button>';
        }).join('') + '</div>';
    }
    function panelItem() {
      var it = findItem(), html = '';
      if (item.type === 'take') {
        var a = movie.actors.filter(function (x) { return (x.takes || []).indexOf(it) >= 0; })[0];
        html = '<div class="st-item-h"><h3>🎬 ' + esc(a.name) + '\'s take</h3></div><p class="small muted" style="font-weight:700">' + TL.fmtTime(it.t0, true) + ' to ' + TL.fmtTime(it.t1, true) + ' · the path stays, you can change the move.</p>' +
          '<div class="tl-step">Move</div><div class="tl-chips">' + animsOf(a).map(function (x) { return '<button type="button" class="tl-chip' + (x.id === it.anim ? ' on' : '') + '" data-takeanim="' + esc(x.id) + '"><span class="em">' + TL.animEmoji(x) + '</span>' + esc(x.name) + '</button>'; }).join('') + '</div>' +
          '<div class="tl-step">Speed</div>' + chipsFor(SPEEDS.map(function (s) { return [String(s[0]), s[1]]; }), String(it.speed || 1), 'data-takespeed') +
          '<div class="ui-row" style="margin-top:16px"><button class="ui-btn danger" data-a="delitem">' + UI.icon('trash') + 'Delete take</button></div>';
      } else if (item.type === 'clip') {
        var info = assetInfo(it.asset);
        html = '<div class="st-item-h"><h3>' + clipEmoji(it) + ' ' + esc(info.name) + '</h3></div><p class="small muted" style="font-weight:700">Starts at ' + TL.fmtTime(it.t, true) + '. Drag it on the timeline to move it.</p>' +
          '<label class="tl-range"><span>Volume</span><input type="range" min="0" max="1.5" step="0.05" value="' + (it.vol == null ? 1 : it.vol) + '" data-vol><output>' + Math.round((it.vol == null ? 1 : it.vol) * 100) + '%</output></label>' +
          (it.kind === 'music' ? '<label class="tl-range" style="margin-top:10px"><span>Plays for</span><input type="range" min="1" max="' + movie.dur + '" step="0.5" value="' + (it.len || 8) + '" data-len><output>' + (it.len || 8) + 's</output></label>' : '') +
          (it.kind === 'voice' ? '<div class="tl-step">Who\'s talking?</div><select data-clipactor><option value="">Nobody (narrator)</option>' + movie.actors.map(function (x) { return '<option value="' + x.id + '"' + (x.id === it.actor ? ' selected' : '') + '>' + esc(x.name) + '</option>'; }).join('') + '</select>' +
            '<div class="tl-step">Voice effect</div><div class="tl-chips">' + TL.VOICE_FX.map(function (f) { var on = (f[4] ? it.fx === f[4] : !it.fx && Math.abs((it.rate || 1) - f[3]) < .01); return '<button type="button" class="tl-chip' + (on ? ' on' : '') + '" data-fx="' + f[0] + '"><span class="em">' + f[2] + '</span>' + f[1] + '</button>'; }).join('') + '</div>' : '') +
          '<div class="ui-row" style="margin-top:16px"><button class="ui-btn" data-prev="' + esc(it.asset) + '">' + UI.icon('play') + 'Listen</button><button class="ui-btn" data-a="mute">' + (it.muted ? '🔈 Unmute' : '🔇 Mute') + '</button><button class="ui-btn danger" data-a="delitem">' + UI.icon('trash') + '</button></div>';
      } else {
        html = '<div class="st-item-h"><h3>💬 Bubble</h3></div><textarea data-btext maxlength="140" rows="3">' + esc(it.text) + '</textarea>' +
          '<div class="tl-step">Style</div>' + chipsFor([['say', '💬 Say'], ['think', '💭 Think'], ['shout', '📢 Shout']], it.style || 'say', 'data-bstyle') +
          '<div class="tl-step">Who says it?</div><select data-bactor><option value="">Nobody: a caption at the bottom</option>' + movie.actors.map(function (x) { return '<option value="' + x.id + '"' + (x.id === it.actor ? ' selected' : '') + '>' + esc(x.name) + '</option>'; }).join('') + '</select>' +
          '<label class="tl-range" style="margin-top:12px"><span>Shows for</span><input type="range" min="0.5" max="12" step="0.25" value="' + (it.t1 - it.t0) + '" data-blen><output>' + (it.t1 - it.t0).toFixed(1) + 's</output></label>' +
          '<div class="ui-row" style="margin-top:16px"><button class="ui-btn danger" data-a="delitem">' + UI.icon('trash') + 'Delete bubble</button></div>';
      }
      return '<button class="ui-btn ghost sm" data-a="closeitem" style="margin-bottom:6px">' + UI.icon('back') + 'Done</button>' + html;
    }

    /* ---------------------------------------------------------------- adding things */
    function addActor(id) {
      var ch = chars[id] || TL.PRESETS[id]; if (!ch) return;
      var n = movie.actors.length, x = 260 + ((n * 230) % 780), a = TL.newActor(ch, x, TL.GROUND + (n % 2) * 26);
      a.flip = x > 640;
      if (movie.actors.some(function (o) { return o.name === a.name; })) a.name = a.name + ' ' + (n + 1);
      change(function () { movie.actors.push(a); });
      sel = a.id; item = null; tab = 'actor'; drawPanel(); drawTimeline(); tip();
      UI.toast(a.name + ' is on stage! Hold them to record.', 'ok');
    }
    function addClip(ref, kind, extra) {
      var info = assetInfo(ref);
      var c = Object.assign({ id: TL.uid('q'), asset: ref, kind: kind, t: Math.round(t * 20) / 20, vol: kind === 'music' ? .5 : 1, rate: 1 }, extra || {});
      if (kind === 'music') c.len = Math.max(4, Math.round((movie.dur - c.t) * 2) / 2);
      if (kind === 'voice' && !c.actor && sel) c.actor = sel;
      return TL.getBuffer(ref).then(function () {
        change(function () { movie.clips.push(c); if (kind !== 'music' && c.t + (info.dur || 1) > movie.dur) movie.dur = Math.min(TL.MAX_DUR, Math.ceil(c.t + (info.dur || 1) + .5)); });
        UI.toast('Added "' + info.name + '" at ' + TL.fmtTime(c.t, true), 'ok');
      });
    }
    function addBubble(style) {
      var a = sel ? actorById(sel) : movie.actors[0];
      var b = { id: TL.uid('b'), actor: style === 'caption' ? null : (a ? a.id : null), t0: Math.round(t * 20) / 20, t1: Math.round(t * 20) / 20 + 2.5,
        text: style === 'caption' ? 'Meanwhile...' : style === 'shout' ? 'Whoa!' : style === 'think' ? 'Hmm...' : 'Hello!', style: style === 'caption' ? 'say' : style };
      change(function () { movie.bubbles.push(b); if (b.t1 > movie.dur) movie.dur = Math.min(TL.MAX_DUR, Math.ceil(b.t1)); });
      item = { type: 'bubble', id: b.id }; tab = 'item'; drawPanel(); drawTimeline();
      var ta = view.querySelector('[data-btext]'); if (ta) { ta.focus(); ta.select(); }
    }
    function recordVoice(actorId) {
      var from = t;
      TL.voiceDialog({ actors: movie.actors.map(function (a) { return { id: a.id, name: a.name }; }), actor: actorId || sel,
        onStart: function () { from = t; playing = true; playFrom = t; playWall = performance.now(); drawTop(); },
        onStop: function () { playing = false; t = from; needs = true; movePlayhead(); drawTop(); } }).then(function (r) {
        if (!r) return;
        assets.unshift(r.asset); TL.store_flag('voice', true);
        addClip(r.asset.id, 'voice', { t: Math.round(from * 20) / 20, actor: r.actor, rate: r.rate, fx: r.fx || '' });
      });
    }

    /* ---------------------------------------------------------------- clicks and inputs */
    view.addEventListener('click', function (e) {
      var b = e.target.closest('button, [data-pickactor]'); if (!b || !movie) return;
      var g = function (n) { return b.getAttribute(n); };
      if (b.hasAttribute('data-play')) { playing ? pause() : play(); return; }
      if (b.hasAttribute('data-home')) { seek(0); return; }
      if (b.hasAttribute('data-undo')) { undo(); return; }
      if (b.hasAttribute('data-redo')) { redo(); return; }
      if (b.hasAttribute('data-tool')) { tool = g('data-tool'); drawTop(); tip(); return; }
      if (b.hasAttribute('data-rate')) { recRate = +g('data-rate'); UI.store.set('recRate', recRate); drawTop(); if (tab === 'actor') drawPanel(); UI.toast(recRate === 1 ? 'Normal speed recording' : '🐢 Slow-mo: the clock runs at half speed while you record, so fast scenes are easier.'); return; }
      if (b.hasAttribute('data-export')) { pause(); save().then(function () { TL.exportDialog(movie, chars); }); return; }
      if (b.hasAttribute('data-share')) { pause(); save().then(function () { TL.shareDialog(movie.id, TL.guest() ? null : share.shared ? share : null); }); return; }
      if (b.hasAttribute('data-tab')) { tab = g('data-tab'); if (tab !== 'item') item = null; drawPanel(); drawTimeline(); return; }
      if (b.hasAttribute('data-pickactor')) { sel = g('data-pickactor'); item = null; tab = 'actor'; drawPanel(); drawTimeline(); needs = true; return; }
      if (b.hasAttribute('data-pickitem')) { var pi = g('data-pickitem').split(':'); item = { type: pi[0], id: pi[1] }; var f0 = findItem(); if (f0) seek((f0.t0 != null ? f0.t0 : f0.t) + .1); tab = 'item'; drawPanel(); drawTimeline(); return; }
      if (b.hasAttribute('data-add')) { addActor(g('data-add')); return; }
      if (b.hasAttribute('data-bg')) { var ref = g('data-bg'); change(function () { movie.bg = ref; }); if (TL.assetIndex[ref]) TL.loadImage(ref).then(function () { needs = true; }); return; }
      if (b.hasAttribute('data-soundtab')) { soundTab = g('data-soundtab'); drawPanel(); return; }
      if (b.hasAttribute('data-prev')) { var k2 = findItem(); TL.preview(g('data-prev'), item && item.type === 'clip' && k2 ? { rate: k2.rate, fx: k2.fx, vol: k2.vol } : {}); return; }
      if (b.hasAttribute('data-addclip')) { addClip(g('data-addclip'), g('data-kind')); return; }
      if (b.hasAttribute('data-addbub')) { addBubble(g('data-addbub')); return; }
      var a = sel && actorById(sel), it = findItem();
      if (b.hasAttribute('data-recanim') && a) { set(function () { a.rec.anim = g('data-recanim'); }); drawPanel(); return; }
      if (b.hasAttribute('data-recspeed') && a) { set(function () { a.rec.speed = +g('data-recspeed'); }); drawPanel(); return; }
      if (b.hasAttribute('data-face') && a) { set(function () { a.face = g('data-face'); if (a.face === 'left') a.flip = true; if (a.face === 'right') a.flip = false; }); drawPanel(); return; }
      if (b.hasAttribute('data-takeanim') && it) { change(function () { it.anim = g('data-takeanim'); }); return; }
      if (b.hasAttribute('data-takespeed') && it) { change(function () { it.speed = +g('data-takespeed'); }); return; }
      if (b.hasAttribute('data-bstyle') && it) { change(function () { it.style = g('data-bstyle'); }); return; }
      if (b.hasAttribute('data-fx') && it) { var fx = TL.VOICE_FX.filter(function (x) { return x[0] === g('data-fx'); })[0]; change(function () { it.rate = fx[3]; it.fx = fx[4] || ''; }); TL.preview(it.asset, { rate: fx[3], fx: fx[4] }); return; }
      var act = g('data-a'); if (!act) return;
      if (act === 'closeitem') { item = null; tab = sel ? 'actor' : 'bubbles'; drawPanel(); drawTimeline(); }
      else if (act === 'delitem' && it) {
        change(function () {
          if (item.type === 'take') movie.actors.forEach(function (x) { x.takes = (x.takes || []).filter(function (k) { return k !== it; }); });
          if (item.type === 'clip') movie.clips = movie.clips.filter(function (c) { return c !== it; });
          if (item.type === 'bubble') movie.bubbles = movie.bubbles.filter(function (c) { return c !== it; });
        });
        item = null; tab = 'actor'; drawPanel(); drawTimeline();
      }
      else if (act === 'mute' && it) change(function () { it.muted = !it.muted; });
      else if (act === 'renameactor' && a) TL.askName('Rename actor', a.name).then(function (n) { if (n) change(function () { a.name = n.slice(0, 40); }); });
      else if (act === 'removeactor' && a) UI.confirm({ title: 'Remove ' + a.name + ' from this movie?', text: 'Their takes go too. (Undo brings them back.)', ok: 'Remove', danger: true }).then(function (y) {
        if (!y) return; change(function () { movie.actors = movie.actors.filter(function (x) { return x !== a; }); movie.bubbles = movie.bubbles.filter(function (x) { return x.actor !== a.id; }); movie.clips.forEach(function (c) { if (c.actor === a.id) c.actor = null; }); }); sel = null; drawPanel(); tip();
      });
      else if (act === 'cleartakes' && a) UI.confirm({ title: 'Clear all of ' + a.name + '\'s takes?', text: 'They go back to standing where they started.', ok: 'Clear', danger: true }).then(function (y) { if (y) change(function () { var s0 = (a.takes[0] || {}).pts; if (s0) { a.x = s0[0][1]; a.y = s0[0][2]; } a.takes = []; }); });
      else if (act === 'front' && a) change(function () { a.z = Math.max.apply(null, movie.actors.map(function (x) { return x.z || 0; })) + 1; });
      else if (act === 'back' && a) change(function () { a.z = Math.min.apply(null, movie.actors.map(function (x) { return x.z || 0; })) - 1; });
      else if (act === 'moves' && a) save().then(function () { UI.go('animate', a.char); });
      else if (act === 'mine' && a) {
        var c = TL.copyChar(TL.PRESETS[a.char]); c.thumb = TL.charThumb(c);
        TL.store.saveChar(c).then(function () { chars[c.id] = c; myChars.unshift(c); change(function () { a.char = c.id; }); UI.toast(c.name + ' is in your cast now. Change their looks or moves any time!', 'ok'); });
      }
      else if (act === 'voice') recordVoice(a && a.id);
      else if (act === 'say') { tab = 'bubbles'; addBubble('say'); }
      else if (act === 'newchar') save().then(function () { TL.createCharacter(); });
      else if (act === 'uploadbg') TL.upload('bg').then(function (x) { if (!x) return; assets.unshift(x); TL.loadImage(x.id).then(function () { change(function () { movie.bg = x.id; }); }); });
      else if (act === 'upsound' || act === 'upmusic') TL.upload(act === 'upsound' ? 'sound' : 'music').then(function (x) { if (x) { assets.unshift(x); drawPanel(); } });
    });
    view.addEventListener('input', function (e) {
      var el = e.target, a = sel && actorById(sel), it = findItem();
      if (el.matches('[data-title]')) { set(function () { movie.name = el.value.trim() || 'My cartoon'; }); }
      else if (el.matches('[data-size]') && a) { set(function () { a.s = +el.value; }); el.nextElementSibling.textContent = Math.round(el.value * 100) + '%'; }
      else if (el.matches('[data-dur]')) { set(function () { movie.dur = +el.value; }); el.nextElementSibling.textContent = TL.fmtTime(movie.dur); t = Math.min(t, movie.dur); drawTimeline(); drawTop(); }
      else if (el.matches('[data-vol]') && it) { set(function () { it.vol = +el.value; }); el.nextElementSibling.textContent = Math.round(el.value * 100) + '%'; }
      else if (el.matches('[data-len]') && it) { set(function () { it.len = +el.value; }); el.nextElementSibling.textContent = el.value + 's'; drawTimeline(); }
      else if (el.matches('[data-btext]') && it) { set(function () { it.text = el.value.slice(0, 140); }); }
      else if (el.matches('[data-blen]') && it) { set(function () { it.t1 = it.t0 + +el.value; }); el.nextElementSibling.textContent = (+el.value).toFixed(1) + 's'; drawTimeline(); }
    });
    view.addEventListener('change', function (e) {
      var el = e.target, a = sel && actorById(sel), it = findItem();
      if (el.matches('[data-idle]') && a) change(function () { a.idle = el.value; });
      else if (el.matches('[data-depth]')) change(function () { movie.depth = el.checked; });
      else if (el.matches('[data-paths]')) { showPaths = el.checked; needs = true; }
      else if (el.matches('[data-clipactor]') && it) change(function () { it.actor = el.value || null; });
      else if (el.matches('[data-bactor]') && it) change(function () { it.actor = el.value || null; });
      else if (el.matches('[data-btext],[data-size],[data-dur],[data-vol],[data-len],[data-blen]')) { hist.push(JSON.stringify(movie)); drawTimeline(); drawTop(); }
    });
    function onKey(e) {
      if (!movie || e.target.matches('input, textarea, select') || document.querySelector('.ui-modal-wrap')) return;
      if (e.key === ' ') { e.preventDefault(); playing ? pause() : play(); }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); }
      else if (e.key === 'Home') seek(0);
      else if ((e.key === 'Delete' || e.key === 'Backspace') && item) { var d = view.querySelector('[data-a="delitem"]'); if (d) d.click(); }
      else if (e.key === 'ArrowRight') seek(t + (e.shiftKey ? 1 : .1));
      else if (e.key === 'ArrowLeft') seek(t - (e.shiftKey ? 1 : .1));
    }
    document.addEventListener('keydown', onKey);
    window.TL_STUDIO = {  // for tests: hold-to-record without a mouse
      state: function () { return { t: t, movie: movie, sel: sel, rec: !!rec, hits: hits }; },
      seek: seek
    };

    /* ---------------------------------------------------------------- load */
    var ready = Promise.all([TL.store.getMovie(ctx.args[0]), TL.store.chars(), TL.store.assets().catch(function () { return []; })]).then(function (r) {
      if (!r[0]) { view.innerHTML = '<div class="ui-wrap"><div class="ui-empty">' + UI.icon('film') + '<h3>Movie not found</h3><p>It may have been deleted, or it\'s saved on another device.</p><a class="ui-btn" href="#home" data-go="home">Back to my toons</a></div></div>'; return; }
      movie = r[0].movie; share = { shared: !!r[0].shared, share_key: r[0].share_key };
      movie.actors = movie.actors || []; movie.clips = movie.clips || []; movie.bubbles = movie.bubbles || []; movie.dur = movie.dur || 20;
      myChars = r[1]; chars = TL.charMap(myChars); assets = r[2];
      if (movie.actors[0]) sel = movie.actors[0].id;
      drawPage(); wireTimeline();
      raf = requestAnimationFrame(loop);
      var bg = movie.bg && TL.assetIndex[movie.bg] ? TL.loadImage(movie.bg) : Promise.resolve();
      return Promise.all([bg, TL.preloadAudio(movie)]).then(function () { needs = true; drawTimeline(); });
    });
    return { ready: ready, destroy: function () {
      dead = true; cancelAnimationFrame(raf); clearTimeout(holdT); clearTimeout(saveT); document.removeEventListener('keydown', onKey);
      if (mixer) mixer.stop(); TL.stopPreview(); if (ro) ro.disconnect(); delete window.TL_STUDIO;
      if (dirty && movie) save().catch(function () {});
    } };
  });
})();

/* ===== theater.html ===== */
(function () {
  var esc = UI.esc;
  function card(c, i, group) {
    return '<a class="th-card" href="#watch/' + esc(c.key) + '"><div class="pic">' + (c.thumb ? '<img alt="" src="' + esc(c.thumb) + '">' : '<canvas data-poster="' + group + i + '" width="320" height="180"></canvas>') +
      '<span class="go">▶️</span><span class="dur">' + TL.fmtTime(c.dur) + '</span></div><b>' + esc(c.name) + '</b>' +
      '<span class="meta">by ' + esc(c.author) + ' · ' + UI.plural(c.views, 'view') + (c.featured && group === 'm' ? ' · ⭐ featured' : '') + '</span></a>';
  }
  UI.page('theater', { title: 'Theater', nav: 'Theater', icon: 'ticket', order: 40 }, function (view, ctx) {
    view.innerHTML = '<div class="ui-wrap"><div class="ui-skel" style="height:300px"></div></div>';
    return UI.api('theater_list').then(function (d) {
      view.innerHTML = '<div class="ui-wrap"><div class="th-hero"><h1>🍿 The Theater</h1><p class="muted" style="font-weight:700">Cartoons made with ToonyLoony. Grab some popcorn!</p></div>' +
        (d.featured.length ? '<div class="th-cards">' + d.featured.map(function (c, i) { return card(c, i, 'f'); }).join('') + '</div>'
          : '<div class="ui-empty"><span style="font-size:2.4rem">🎞️</span><h3>Nothing showing yet</h3><p>The first cartoons will be here soon.</p></div>') +
        (d.mine.length ? '<div class="tl-sec"><h2>Your shared movies</h2><span class="muted small" style="font-weight:800">Only people with the link can see these</span></div><div class="th-cards">' + d.mine.map(function (c, i) { return card(c, i, 'm'); }).join('') + '</div>' : '') +
        '<div class="wt-cta" style="margin-top:34px"><div><h3>Make your own cartoon!</h3><p>Build a character, hold it, move it. It\'s that easy.</p></div><a class="ui-btn yellow lg" href="#home" data-go="home">🎬 Start making</a></div></div>';
      [['f', d.featured], ['m', d.mine]].forEach(function (g) {
        g[1].forEach(function (c, i) { var cv = view.querySelector('[data-poster="' + g[0] + i + '"]'); if (cv && c.data) cv.getContext('2d').drawImage(TL.movieCanvas(c.data, {}, Math.min(3, c.dur / 3), 320, 180), 0, 0); });
      });
    });
  });

  UI.page('watch', { title: 'Watch' }, function (view, ctx) {
    var player = null;
    view.innerHTML = '<div class="ui-wrap"><div class="ui-skel" style="height:420px"></div></div>';
    var ready = UI.api('watch_get', ctx.args[0] || '').then(function (d) {
      Object.keys(d.assets).forEach(function (k) { var a = d.assets[k]; TL.assetIndex[k] = Object.assign({}, a, { url: TL.mediaUrl(a.key) }); });
      var c = d.card, movie = d.movie;
      document.title = movie.name + ' · ToonyLoony';
      view.innerHTML = '<div class="ui-wrap wt-wrap"><a class="ui-btn ghost sm" href="#theater" data-go="theater">' + UI.icon('back') + 'Theater</a>' +
        '<div class="wt-head"><div><h1>' + esc(movie.name) + '</h1><div class="muted" style="font-weight:700">by ' + esc(c.author) + ' · ' + UI.plural(c.views, 'view') + (c.featured ? ' · ⭐ featured' : '') + '</div></div>' +
        '<div class="ui-row">' + (c.mine ? '<a class="ui-btn" href="#studio/' + esc(movie.id) + '">' + UI.icon('edit') + 'Edit</a>' : '') + '<button class="ui-btn" data-copylink>' + UI.icon('copy') + 'Copy link</button>' +
        (c.mine ? '' : '<button class="ui-btn ghost" data-report>' + UI.icon('info') + 'Report</button>') + '</div></div>' +
        '<div data-player></div>' +
        '<div class="wt-cta"><div><h3>Want to make one like this?</h3><p>Build a character, teach it moves, then hold it and drag it around to film. Free!</p></div><a class="ui-btn yellow lg" href="#home" data-go="home">🎬 Start making</a></div></div>';
      player = TL.player(view.querySelector('[data-player]'), movie, d.chars, {});
      return player.ready;
    }, function (e) {
      view.innerHTML = '<div class="ui-wrap"><div class="ui-empty"><span style="font-size:2.6rem">🎞️</span><h3>This cartoon isn\'t here</h3><p>' + esc(e.message) + '</p><a class="ui-btn" href="#theater" data-go="theater">Go to the Theater</a></div></div>';
    });
    view.addEventListener('click', function (e) {
      if (e.target.closest('[data-copylink]')) { var u = TL.watchUrl(ctx.args[0]); try { navigator.clipboard.writeText(u); UI.toast('Link copied!', 'ok'); } catch (x) { UI.toast(u); } }
      if (e.target.closest('[data-report]')) {
        var m = UI.modal('<h2>Report this cartoon</h2><p class="muted">Is something in it mean, scary or not OK? Tell us and we\'ll look at it.</p><form class="ui-stack" data-f>' +
          '<textarea name="reason" required minlength="3" maxlength="1000" placeholder="What\'s wrong?"></textarea><div class="ui-row end"><button type="button" class="ui-btn ghost" data-close>Cancel</button><button class="ui-btn danger solid" type="submit">Send report</button></div></form>');
        m.el.querySelector('[data-f]').addEventListener('submit', function (ev) {
          ev.preventDefault();
          UI.busy(ev.target.querySelector('[type=submit]'), UI.api('report_toon', ctx.args[0], ev.target.reason.value)).then(function () { m.close(); UI.toast('Thanks! We\'ll take a look.', 'ok'); });
        });
      }
    });
    return { ready: ready, destroy: function () { if (player) player.destroy(); } };
  });
})();
