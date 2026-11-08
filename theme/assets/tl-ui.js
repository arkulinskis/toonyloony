/* _tl_ui: shared pieces of interface: character and movie tiles, and the dialogs several pages use
     (pick a body type, start a new movie, rename, upload a picture or sound, record a voice, share, export a video). */
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
  /* Dialogs are Python Forms now (client_code/Dialogs, reached through TL.host in client_code/tl.py).
     These keep the old names, so the engines (studio, builder, animator) call them as before. */
  function host(name) {
    var args = Array.prototype.slice.call(arguments, 1);
    if (!TL.host[name]) return Promise.resolve(null);
    try { return Promise.resolve(TL.host[name].apply(null, args)); } catch (e) { return Promise.reject(e); }
  }
  TL.askName = function (title, value, ok) { return host('ask_name', title, value || '', ok || 'Save'); };
  TL.pickStarter = function () { return host('pick_starter'); };
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
    monster: ['Grumble', 'Fuzz', 'Chomp'], pup: ['Woofles', 'Biscuit', 'Muddy'], kitty: ['Whiskers', 'Purrkins', 'Mittens'], worm: ['Wiggles', 'Noodle', 'Squirm'],
    ghost: ['Boo', 'Spooks', 'Wisp'], dino: ['Stomp', 'Rexy', 'Chomper'], frog: ['Ribbit', 'Hopper', 'Lily'], bunny: ['Fluff', 'Hops', 'Carrot'] };
  TL.funName = function (st) { return TL.pick(FIRST) + ' ' + TL.pick(LAST[st] || LAST.hero); };

  /* New movie: shape, name, place, up to 4 actors (Dialogs/NewMovie). Resolves with the saved movie and opens the studio. */
  TL.newMovieDialog = function () { return host('new_movie'); };
  /* What Dialogs/NewMovie saves: a movie in the chosen shape with the picked actors spread across its frame.
     ids = character ids (yours or premade p_*). Resolves with the new movie's id. */
  TL.makeMovie = function (name, bg, ids, format, myChars) {
    var mv = TL.newMovie(name || 'My cartoon', format); mv.bg = bg || 'b:park';
    var map = TL.charMap((myChars || []).concat(TL.PRESET_LIST)), f = TL.frameOf(mv), n = ids.length;
    ids.forEach(function (id, i) {
      var ch = map[id] || TL.PRESETS[id]; if (!ch) return;
      var x = n === 1 ? f.x + f.w / 2 : f.x + f.w * (.2 + .6 * i / Math.max(1, n - 1));
      var a = TL.newActor(ch, x, TL.GROUND + (i % 2) * 24); a.flip = x > f.x + f.w / 2;
      if (f.w < 700) a.s = 1.15;  // a little smaller in narrow shapes, so a few actors fit side by side
      mv.actors.push(a);
    });
    mv.thumb = TL.movieThumb(mv, map, 0);
    return TL.store.saveMovie(mv).then(function () { TL.store_flag('movie', true); return mv.id; });
  };
  /* "Make it mine": copy a premade character into your cast. Resolves with the copy's id. */
  TL.copyPreset = function (id) {
    var c = TL.copyChar(TL.PRESETS[id], TL.PRESETS[id].name); c.thumb = TL.charThumb(c);
    return TL.store.saveChar(c).then(function () { return c.id; });
  };
  /* Pictures for pickers, as data URLs: a body type, a background. */
  TL.starterPic = function (st) { var cv = TL.charCanvas(TL.newCharacter(st), 140, 140, { pad: 10, dpr: 2 }); try { return cv.toDataURL('image/png'); } catch (e) { return ''; } };
  TL.bgPic = function (ref, w, h) { var cv = TL.bgThumb(ref, w || 192, h || 108); try { return cv.toDataURL('image/jpeg', .72); } catch (e) { return ''; } };

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

  /* ------------------------------------------------------------------ the voice recorder (Dialogs/Voice holds it)
     TL.voiceDialog(opts): opts = {actors: [{id, name}], actor, onStart (the movie plays while you talk), onStop}.
     Resolves {asset, actor, rate, fx} or null.
     TL.mountVoice(el, opts): the recorder itself (big REC button, level meter, voice effects, Listen) drawn into el.
     Returns {result() -> {blob, dur} or null, fx() -> the chosen TL.VOICE_FX row, cancel()}; opts.onReady(bool) says
     when there is a take to use. */
  TL.voiceDialog = function (opts) { return host('voice', opts || {}); };
  TL.mountVoice = function (el, opts) {
    opts = opts || {};
    var rec = null, result = null, fxSel = 'normal', timer = 0, tmpUrl = null, tmpId = 'voice-preview';
    el.innerHTML = '<button type="button" class="tl-recbig" data-rec>REC</button><div class="tl-meter"><i data-lvl></i></div>' +
      '<p class="small muted tl-voice-msg" data-msg role="status">Ready when you are!</p>' +
      '<div data-after hidden><div class="tl-step">Voice effect</div><div class="tl-chips" data-fx>' + TL.VOICE_FX.map(function (f) {
        return '<button type="button" class="tl-chip' + (f[0] === 'normal' ? ' on' : '') + '" data-f="' + f[0] + '" aria-pressed="' + (f[0] === 'normal') + '"><span class="em" aria-hidden="true">' + f[2] + '</span>' + f[1] + '</button>'; }).join('') + '</div>' +
      '<div class="ui-row" style="margin-top:14px"><button type="button" class="ui-btn" data-play>' + UI.icon('play') + 'Listen</button></div></div>';
    var btn = el.querySelector('[data-rec]'), msg = el.querySelector('[data-msg]'), lvl = el.querySelector('[data-lvl]');
    function ready(v) { if (opts.onReady) try { opts.onReady(!!v); } catch (e) {} }
    btn.addEventListener('click', function () {
      if (!rec) {
        TL.stopPreview();
        TL.micRecorder().then(function (r) {
          rec = r; btn.classList.add('on'); btn.textContent = 'STOP'; msg.textContent = 'Recording... 0.0 s';
          if (opts.onStart) opts.onStart();
          timer = setInterval(function () { lvl.style.transform = 'scaleX(' + Math.min(1, r.level() * 1.4) + ')'; msg.textContent = 'Recording... ' + r.elapsed().toFixed(1) + ' s'; if (r.elapsed() > 60) btn.click(); }, 60);
        });
        return;
      }
      clearInterval(timer); lvl.style.transform = 'scaleX(0)';
      var r = rec; rec = null; btn.classList.remove('on'); btn.textContent = 'AGAIN';
      if (opts.onStop) opts.onStop();
      r.stop().then(function (res) {
        if (!res || res.dur < .3) { msg.textContent = 'That was very short. Try again!'; return; }
        result = res; msg.textContent = 'Got it! ' + res.dur.toFixed(1) + ' seconds.';
        el.querySelector('[data-after]').hidden = false; ready(true);
        if (tmpUrl) URL.revokeObjectURL(tmpUrl);
        tmpUrl = URL.createObjectURL(res.blob); TL.assetIndex[tmpId] = { id: tmpId, url: tmpUrl, kind: 'voice', name: 'preview' };
      });
    });
    el.addEventListener('click', function (e) {
      var f = e.target.closest('[data-f]');
      if (f) { fxSel = f.getAttribute('data-f'); el.querySelectorAll('[data-fx] .tl-chip').forEach(function (x) { x.classList.toggle('on', x === f); x.setAttribute('aria-pressed', String(x === f)); }); }
      if (e.target.closest('[data-play]') && result) {
        var fx = TL.VOICE_FX.filter(function (x) { return x[0] === fxSel; })[0];
        TL.decodeBlob(result.blob).then(function (buf) {
          var ac = TL.audioCtx(), s = ac.createBufferSource(); s.buffer = buf; s.playbackRate.value = fx[3];
          if (fx[4] === 'robot' || fx[4] === 'echo') { TL.preview(tmpId, { rate: fx[3], fx: fx[4] }); return; }
          s.connect(ac.destination); s.start();
        });
      }
    });
    return {
      result: function () { return result; },
      fx: function () { return TL.VOICE_FX.filter(function (x) { return x[0] === fxSel; })[0]; },
      cancel: function () { if (rec) { rec.cancel(); rec = null; if (opts.onStop) opts.onStop(); } clearInterval(timer); TL.stopPreview(); }
    };
  };

  /* ------------------------------------------------------------------ share + export (Dialogs/Share, Dialogs/Export) */
  TL.watchUrl = function (key) { return location.origin + location.pathname + location.search.replace(/[?&]as=[^&]*/, '') + '#watch/' + key; };
  TL.shareDialog = function (movieId, state) { return host('share', movieId, state ? JSON.stringify(state) : ''); };
  TL.exportDialog = function (movie, chars) {
    if (!TL.canExport()) { UI.toast('This browser can\'t make video files. Try Chrome, Edge or Firefox on a computer.', 'error'); return Promise.resolve(null); }
    return host('export_video', movie, chars);
  };
  /* The export itself, for Dialogs/Export: plays the movie in the chosen shape while recording it, drawing a preview into
     nodes.canvas and the progress into nodes.bar (scaleX) and nodes.msg. job.run() resolves {blob, ext, name, mb} (or null
     when cancelled); job.cancel() stops it. */
  TL.exportJob = function (movie, chars, nodes, fmt) {
    var stop = false, f = TL.frameOf(movie, fmt), out = TL.formatOf(movie, fmt).out;
    var pv = nodes.canvas, pctx = pv ? pv.getContext('2d') : null;
    if (pv) { pv.width = Math.round(out[0] / 2); pv.height = Math.round(out[1] / 2); }
    return {
      cancel: function () { stop = true; },
      run: function () {
        return TL.exportVideo(movie, chars, function (p) {
          if (nodes.bar) nodes.bar.style.transform = 'scaleX(' + p + ')';
          if (nodes.msg) nodes.msg.textContent = 'Recording... ' + Math.round(p * 100) + '%';
          if (pctx) { TL.frameTransform(pctx, f, pv.width, pv.height); TL.renderFrame(pctx, movie, chars, p * movie.dur, { frame: f }); }
        }, function () { return stop; }, fmt).then(function (res) {
          if (stop) return null;
          var name = TL.safeName(movie.name) + (fmt && fmt !== 'wide' ? '-' + fmt : '') + '.' + res.ext;
          return { blob: res.blob, ext: res.ext, name: name, mb: Math.round(res.blob.size / 1e5) / 10 };
        });
      }
    };
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
