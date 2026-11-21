/* tl-backup: backup files (.toony). Everything you made, or one movie with its own characters and uploads, packed
     into one file you keep anywhere (a USB stick, your email, the school drive), and opening such a file again in any
     browser or account. Guests need this most: their toons live only in this browser's IndexedDB, which Safari wipes
     after a week away and school Chromebooks often wipe at log-out.

     file = {app: 'toonyloony', v: 1, made (ISO), kind: 'all' | 'movie', chars: [character], movies: [movie],
             assets: [{id, kind, name, dur, mime, data (base64)}]}

     TL.backup.make({movie}) -> {blob, name, counts, skipped, mb}   (no movie = everything)
     TL.backup.save({movie}) -> the same, after downloading it (and remembering the last full backup)
     TL.backup.open(file)    -> {movies, chars, bg, voice, sound, music, failed, error}
     Opening never overwrites anything: uploads always get new ids (TL.store.addAsset), a character or movie whose id
     is already taken gets a new one (TL.uid), and every reference (actor.char, movie.bg, clip.asset) is rewritten.
     Everything is checked before the first thing is saved, so a broken file saves nothing.
     Members save through TL.store too, so the server's usual limits apply. Loads after tl-core.js. */
(function () {
  'use strict';
  var TL = window.TL = window.TL || {};
  var MAX_BYTES = 120e6;  // a member's whole library (80 MB) as base64 still fits
  var KINDS = { bg: 1, voice: 1, sound: 1, music: 1 };
  var UID = /^[a-z]_[a-z0-9]{6,32}$/;
  var NOT_OURS = 'That isn\'t a ToonyLoony backup file. Pick a file that ends in .toony.';

  function fail(msg) { return Object.assign(new Error(msg), { uiApi: true }); }
  function isUpload(ref) { return typeof ref === 'string' && /^a_/.test(ref); }
  function list(x) { return Array.isArray(x) ? x : []; }
  function today() {
    var d = new Date();
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  }
  function blobToB64(blob) {
    return new Promise(function (res, rej) {
      var r = new FileReader();
      r.onload = function () { var s = String(r.result); res(s.slice(s.indexOf(',') + 1)); };
      r.onerror = function () { rej(r.error || new Error('read')); };
      r.readAsDataURL(blob);
    });
  }
  function b64ToBlob(b64, mime) {
    var bin = atob(b64), n = bin.length, u = new Uint8Array(n);
    for (var i = 0; i < n; i++) u[i] = bin.charCodeAt(i);
    return new Blob([u], { type: mime || 'application/octet-stream' });
  }
  function readText(file) {
    if (file.text) return file.text();
    return new Promise(function (res, rej) {
      var r = new FileReader();
      r.onload = function () { res(String(r.result)); };
      r.onerror = function () { rej(r.error || new Error('read')); };
      r.readAsText(file);
    });
  }
  function blobOf(a) {
    if (a.blob) return Promise.resolve(a.blob);
    return fetch(a.url, { credentials: 'same-origin' }).then(function (r) {
      if (!r.ok) throw new Error('fetch ' + r.status);
      return r.blob();
    });
  }
  /* Uploads a movie uses: its picture background and its voice / sound / music clips. */
  function refsOf(movies) {
    var need = {};
    movies.forEach(function (m) {
      if (isUpload(m.bg)) need[m.bg] = 1;
      list(m.clips).forEach(function (c) { if (c && isUpload(c.asset)) need[c.asset] = 1; });
    });
    return need;
  }
  function ownChars(movie) {
    var ids = [];
    list(movie.actors).forEach(function (a) { if (a && a.char && !TL.isPreset(a.char) && ids.indexOf(a.char) < 0) ids.push(a.char); });
    return ids;
  }
  function inSeries(items, fn) {
    var out = [];
    return items.reduce(function (p, it) { return p.then(function () { return fn(it); }).then(function (v) { out.push(v); }); }, Promise.resolve())
      .then(function () { return out; });
  }

  /* What goes into the file. Guests: straight from IndexedDB (docs and blobs). Members: the usual store calls. */
  function gather(movieId) {
    if (movieId) {
      return TL.store.getMovie(movieId).then(function (r) {
        if (!r || !r.movie) throw fail('That movie wasn\'t found.');
        var mv = r.movie;
        return inSeries(ownChars(mv), function (id) { return TL.store.getChar(id).catch(function () { return null; }); }).then(function (cs) {
          var need = refsOf([mv]);
          var assets = TL.guest() ? TL.local.blobs() : TL.store.assets();
          return assets.then(function (all) {
            return { chars: cs.filter(Boolean), movies: [mv], assets: all.filter(function (a) { return need[a.id]; }) };
          });
        });
      });
    }
    if (TL.guest()) {
      return Promise.all([TL.local.all('char'), TL.local.all('movie'), TL.local.blobs()]).then(function (r) {
        return { chars: r[0], movies: r[1], assets: r[2] };
      });
    }
    return Promise.all([TL.store.chars(), TL.store.home(), TL.store.assets()]).then(function (r) {
      return inSeries(list(r[1].movies), function (m) {
        return TL.store.getMovie(m.id).then(function (x) { return x && x.movie; }, function () { return null; });
      }).then(function (movies) { return { chars: r[0], movies: movies.filter(Boolean), assets: r[2] }; });
    });
  }

  TL.backup = {
    MAX_BYTES: MAX_BYTES,
    make: function (opts) {
      opts = opts || {};
      return gather(opts.movie).then(function (g) {
        if (!g.chars.length && !g.movies.length && !g.assets.length) throw fail('Nothing to save yet. Make a character or a movie first!');
        var counts = { movies: g.movies.length, chars: g.chars.length, bg: 0, voice: 0, sound: 0, music: 0 }, skipped = 0;
        return inSeries(g.assets, function (a) {
          return blobOf(a).then(blobToB64).then(function (b64) {
            if (KINDS[a.kind]) counts[a.kind]++;
            return { id: a.id, kind: a.kind, name: a.name || 'My file', dur: a.dur || 0, mime: a.mime || (a.blob && a.blob.type) || '', data: b64 };
          }, function () { skipped++; return null; });
        }).then(function (assets) {
          var file = { app: 'toonyloony', v: 1, made: new Date().toISOString(), kind: opts.movie ? 'movie' : 'all',
            chars: g.chars.map(TL.clone), movies: g.movies.map(TL.clone), assets: assets.filter(Boolean) };
          var blob = new Blob([JSON.stringify(file)], { type: 'application/json' });
          var name = opts.movie ? TL.safeName(g.movies[0].name) + '.toony' : 'toonyloony-backup-' + today() + '.toony';
          return { blob: blob, name: name, counts: counts, skipped: skipped, kind: file.kind, mb: Math.round(blob.size / 1e5) / 10 };
        });
      });
    },
    /* Make the file and download it. The first full backup also asks the browser to keep this site's storage
       ("persistent storage"), so it isn't the first thing wiped when the device runs low on space. */
    save: function (opts) {
      opts = opts || {};
      if (!opts.movie && !UI.store.get('persistAsked', false) && navigator.storage && navigator.storage.persist) {
        UI.store.set('persistAsked', true);
        try { navigator.storage.persist().catch(function () {}); } catch (e) { /* not supported: fine */ }
      }
      return TL.backup.make(opts).then(function (res) {
        TL.download(res.blob, res.name);
        if (!opts.movie) UI.store.set('lastBackup', new Date().toISOString());
        return res;
      });
    },
    /* Read and check a backup file without saving anything: resolves the cleaned contents or rejects with a
       friendly message. */
    read: function (file) {
      if (!file) return Promise.resolve(null);
      if (file.size > MAX_BYTES) return Promise.reject(fail('That file is too big to open (the limit is ' + Math.round(MAX_BYTES / 1e6) + ' MB).'));
      return readText(file).then(function (txt) {
        var d;
        try { d = JSON.parse(txt); } catch (e) { throw fail(NOT_OURS); }
        if (!d || typeof d !== 'object' || d.app !== 'toonyloony' || typeof d.v !== 'number') throw fail(NOT_OURS);
        if (d.v > 1) throw fail('This backup comes from a newer ToonyLoony. Reload the page and try again.');
        var chars = list(d.chars).filter(function (c) { return c && typeof c === 'object' && typeof c.id === 'string' && Array.isArray(c.bones); });
        var movies = list(d.movies).filter(function (m) { return m && typeof m === 'object' && typeof m.id === 'string' && Array.isArray(m.actors); });
        var assets = [];
        list(d.assets).forEach(function (a) {
          if (!a || !KINDS[a.kind] || typeof a.id !== 'string' || typeof a.data !== 'string') return;
          var blob;
          try { blob = b64ToBlob(a.data, a.mime || (a.kind === 'bg' ? 'image/jpeg' : 'audio/webm')); } catch (e) { throw fail('That backup file is damaged, so nothing was opened. Try another copy.'); }
          assets.push({ id: a.id, kind: a.kind, name: String(a.name || 'My file').slice(0, 60), dur: +a.dur || 0, blob: blob });
        });
        if (!chars.length && !movies.length && !assets.length) throw fail('That backup file is empty.');
        return { kind: d.kind === 'movie' ? 'movie' : 'all', made: d.made || null, chars: chars, movies: movies, assets: assets };
      });
    },
    open: function (file) {
      return TL.backup.read(file).then(function (d) {
        if (!d) return null;
        var out = { movies: 0, chars: 0, bg: 0, voice: 0, sound: 0, music: 0, failed: 0, error: '' };
        function miss(e) { out.failed++; if (!out.error) out.error = (e && e.message) || 'Something couldn\'t be saved.'; }
        return TL.store.home().then(function (home) {
          var taken = {};
          list(home.chars).concat(list(home.movies)).forEach(function (x) { taken[x.id] = 1; });
          function freshId(id, prefix) {
            var v = (typeof id === 'string' && UID.test(id) && id.charAt(0) === prefix && !taken[id]) ? id : TL.uid(prefix);
            taken[v] = 1;
            return v;
          }
          var assetMap = {}, charMap = {};
          // 1. uploads (each gets a new id from the store)
          return inSeries(d.assets, function (a) {
            return TL.store.addAsset(a.blob, { kind: a.kind, name: a.name, dur: a.dur }).then(function (saved) {
              assetMap[a.id] = saved.id; out[a.kind]++;
            }, function (e) { assetMap[a.id] = null; miss(e); });
          }).then(function () {
            // 2. characters (a taken id gets a new one, so nothing is overwritten)
            return inSeries(d.chars, function (c0) {
              var c = TL.clone(c0), old = c.id;
              c.id = freshId(old, 'c'); c.name = String(c.name || 'My character').slice(0, 60); delete c.preset;
              return TL.store.saveChar(c, true).then(function () { charMap[old] = c.id; out.chars++; }, miss);
            });
          }).then(function () {
            // 3. movies, with every reference rewritten
            return inSeries(d.movies, function (m0) {
              var m = TL.clone(m0);
              m.id = freshId(m.id, 'm'); m.name = String(m.name || 'My cartoon').slice(0, 60);
              list(m.actors).forEach(function (a) { if (a && charMap[a.char]) a.char = charMap[a.char]; });
              if (isUpload(m.bg)) m.bg = assetMap[m.bg] || 'b:park';
              m.clips = list(m.clips).filter(function (c) {
                if (!c || !isUpload(c.asset)) return !!c;
                if (!assetMap[c.asset]) return false;
                c.asset = assetMap[c.asset]; return true;
              });
              return TL.store.saveMovie(m, true).then(function () { out.movies++; }, miss);
            });
          }).then(function () {
            if (out.movies) TL.store_flag('movie', true);
            return out;
          });
        });
      });
    }
  };
})();
