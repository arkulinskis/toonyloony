/* _tl_core: ToonyLoony's shared basics (window.TL): ids, small helpers, and TL.store, which saves characters,
     movies and uploads either in this browser (guests: IndexedDB) or in the member's account (server calls).
     Also the shared component styles (tiles, chips, thumbs, banners) used by every page. */
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
      format: d.format || 'wide', shared: false, share_key: null, featured: false, views: 0, updated: d.updated || null };
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
