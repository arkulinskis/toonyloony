/* _tl_movie: movies. The movie format, where each actor is at any moment (from the takes recorded by holding
     them), replacing part of a take when you record over it, drawing a frame (background, actors, bubbles, paths),
     the player used by Watch and the Theater, thumbnails, and exporting a video file in the browser.

     movie = {id, name, v, dur, bg, depth, format ('wide' when missing | 'reel' | 'square' | 'portrait'), fx (frame centre),
              actors: [actor], clips: [clip], bubbles: [bubble]}
     actor = {id, char, name, x, y, s, z, flip, idle, rec: {anim, speed}, face, takes: [{id, t0, t1, anim, speed, pts: [[t, x, y, f]]}]}
     clip  = {id, asset, kind: 'voice'|'sound'|'music', t, vol, rate, fx, actor, len, muted}
     bubble = {id, actor (or null for a caption), t0, t1, text, style: 'say'|'think'|'shout'} */
(function () {
  'use strict';
  var TL = window.TL = window.TL || {};
  var W = 1280, H = 720;

  /* ------------------------------------------------------------------ canvas shapes
     The stage is always 1280 x 720 stage units (backgrounds, ground at y 560, every saved movie). A shape is a camera
     frame over it: full height, a narrower slice for Reel / Square / Portrait, slid left or right with movie.fx (the
     frame's centre, default 640). out = the exported video's size in pixels. Old movies have no format: Wide. */
  TL.FORMATS = [
    { id: 'wide', name: 'Wide', ratio: '16:9', emoji: '🖥️', use: 'YouTube, TV and computers', w: 1280, out: [1280, 720] },
    { id: 'reel', name: 'Reel', ratio: '9:16', emoji: '📱', use: 'Reels, TikTok and Shorts', w: 405, out: [720, 1280] },
    { id: 'square', name: 'Square', ratio: '1:1', emoji: '🟨', use: 'Instagram and Facebook posts', w: 720, out: [1080, 1080] },
    { id: 'portrait', name: 'Portrait', ratio: '4:5', emoji: '🖼️', use: 'The Instagram feed', w: 576, out: [864, 1080] }
  ];
  TL.formatOf = function (movie, id) {
    id = id || (movie && movie.format) || 'wide';
    return TL.FORMATS.filter(function (f) { return f.id === id; })[0] || TL.FORMATS[0];
  };
  /* The frame in stage units: {x, y, w, h, id}. */
  TL.frameOf = function (movie, id) {
    var f = TL.formatOf(movie, id), half = f.w / 2;
    var cx = TL.clamp(movie && movie.fx != null ? +movie.fx : W / 2, half, W - half);
    return { x: Math.round(cx - half), y: 0, w: f.w, h: H, id: f.id };
  };
  /* Map the frame onto a cw x ch canvas (same shape). */
  TL.frameTransform = function (ctx, frame, cw, ch) {
    var k = cw / frame.w;
    ctx.setTransform(k, 0, 0, ch / frame.h, -frame.x * k, 0);
  };
  /* Is any actor (where they stand, or anywhere they walk) outside this frame? */
  TL.actorsOutside = function (movie, frame) {
    var pad = 30, out = false;
    function chk(x) { if (x < frame.x - pad || x > frame.x + frame.w + pad) out = true; }
    (movie.actors || []).forEach(function (a) {
      if (!(a.takes || []).length) chk(a.x);
      (a.takes || []).forEach(function (k) { k.pts.forEach(function (p) { chk(p[1]); }); });
    });
    return out;
  };
  /* Squeeze (or spread) every actor's x from one frame into another, keeping their place in the picture. */
  TL.remapActors = function (movie, from, to) {
    function mx(x) { return Math.round(to.x + (x - from.x) / from.w * to.w); }
    (movie.actors || []).forEach(function (a) {
      a.x = mx(a.x);
      (a.takes || []).forEach(function (k) { k.pts.forEach(function (p) { p[1] = mx(p[1]); }); });
    });
  };

  TL.newMovie = function (name, format) {
    var m = { id: TL.uid('m'), name: name || 'My cartoon', v: 1, dur: 20, bg: 'b:park', depth: true, actors: [], clips: [], bubbles: [] };
    if (format && format !== 'wide') m.format = format;
    return m;
  };
  TL.newActor = function (ch, x, y) {
    var walk = TL.findAnim(ch, 'walk') ? 'walk' : (TL.findAnim(ch, 'slither') ? 'slither' : ((ch.anims || [])[0] || {}).id);
    var a = { id: TL.uid('x'), char: ch.id, name: ch.name, x: Math.round(x), y: Math.round(y), s: 1.3, z: 0, flip: false, idle: 'idle',
      rec: { anim: walk || 'idle', speed: 1 }, face: 'auto', takes: [] };
    var pd = TL.propDef && TL.propDef(ch);
    if (pd) { a.idle = pd.idle; a.rec.anim = pd.rec; }
    return a;
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
  function drawBubble(ctx, b, ax, ay, now, fr) {
    var shout = b.style === 'shout', think = b.style === 'think', caption = ax == null, pad = 20;
    ctx.save();
    ctx.font = (shout ? '400 34px "Lilita One", ' : '800 27px Nunito, ') + 'sans-serif';
    var lines = wrap(ctx, shout ? String(b.text).toUpperCase() : b.text, Math.min(caption ? 900 : 320, fr.w - 64 - pad * 2)), lh = shout ? 38 : 33;
    var tw = Math.max.apply(null, lines.map(function (l) { return ctx.measureText(l).width; }).concat([40]));
    var bw = tw + pad * 2, bh = lines.length * lh + pad * 1.4;
    var pop = Math.min(1, (now - b.t0) / .18), sc = .6 + .4 * pop;
    var x, y;
    if (caption) { x = fr.x + fr.w / 2 - bw / 2; y = H - bh - 26; }
    else { x = TL.clamp(ax - bw / 2 + 30, fr.x + 12, fr.x + fr.w - bw - 12); y = TL.clamp(ay - bh - 46, 12, H - bh - 12); }
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
  /* Draw the movie at time t in stage units (the caller maps the frame onto its canvas: TL.frameTransform).
     Returns hit boxes per actor. o: {frame (default: the movie's own shape), sel (actor id),
     live: {actorId: {x, y, f, anim, speed, local}} (recording), paths (bool), noBubbles} */
  TL.renderFrame = function (ctx, movie, chars, t, o) {
    o = o || {};
    var fr = o.frame || TL.frameOf(movie);
    TL.drawBackground(ctx, movie.bg, W, H, fr);
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
      TL.drawChar(ctx, ch, pose, { x: st.x, y: st.y, s: s, flip: flip, t: t, mouth: mouth, blink: blinkAt(a.id, t), shadow: TL.isAir && TL.isAir(ch) ? null : TL.footY(ch) });
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
      drawBubble(ctx, b, h ? h.cx : null, h ? h.y : null, t, fr);
    });
    return hits;
  };

  /* ------------------------------------------------------------------ pictures */
  /* A w x h picture of the movie at time t. A shape that doesn't match the canvas (a Reel in a 16:9 tile) is shown
     whole in the middle, on the dark "cinema" colour. */
  TL.movieCanvas = function (movie, chars, t, w, h, fmt) {
    var cv = document.createElement('canvas'); cv.width = w || 320; cv.height = h || 180;
    var ctx = cv.getContext('2d'), fr = TL.frameOf(movie, fmt), k = Math.min(cv.width / fr.w, cv.height / fr.h);
    var dw = fr.w * k, dh = fr.h * k, ox = (cv.width - dw) / 2, oy = (cv.height - dh) / 2;
    if (dw < cv.width - 1 || dh < cv.height - 1) { ctx.fillStyle = '#0d0f24'; ctx.fillRect(0, 0, cv.width, cv.height); }
    ctx.save(); ctx.beginPath(); ctx.rect(ox, oy, dw, dh); ctx.clip();
    ctx.setTransform(k, 0, 0, k, ox - fr.x * k, oy);
    TL.renderFrame(ctx, movie, chars, t == null ? Math.min(1.5, (movie.dur || 2) / 2) : t, { frame: fr });
    ctx.restore();
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
    var fmt = TL.formatOf(movie), fr = TL.frameOf(movie), tall = fmt.out[1] >= fmt.out[0];
    host.innerHTML = '<div class="tl-player tl-fmt-' + fmt.id + (tall ? ' tall' : '') + '"><canvas width="' + fmt.out[0] + '" height="' + fmt.out[1] + '" style="aspect-ratio:' + fmt.out[0] + ' / ' + fmt.out[1] + '" role="img" aria-label="' + UI.esc(movie.name || 'Cartoon') + '"></canvas>' +
      '<div class="big"><span>▶</span></div>' +
      '<div class="bar"><button type="button" data-pp aria-label="Play">▶</button><button type="button" class="ghosty" data-restart aria-label="Start again">⏮</button>' +
      '<input type="range" min="0" max="1000" value="0" data-scrub aria-label="Time"><span class="time" data-time></span>' +
      '<button type="button" class="ghosty" data-full aria-label="Full screen">⛶</button></div></div>';
    var root = host.firstChild, cv = root.querySelector('canvas'), ctx = cv.getContext('2d'), scrub = root.querySelector('[data-scrub]');
    var t = opts.start || 0, playing = false, raf = 0, last = 0, mixer = TL.mixer(movie), dur = Math.max(1, movie.dur || TL.movieEnd(movie) || 5), dead = false;
    function draw() {
      TL.frameTransform(ctx, fr, cv.width, cv.height);
      TL.renderFrame(ctx, movie, chars, t, { frame: fr });
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
  /* fmt: the shape to record in (default: the movie's own). */
  TL.exportVideo = function (movie, chars, onProgress, cancelled, fmt) {
    var out = TL.formatOf(movie, fmt).out, fr = TL.frameOf(movie, fmt);
    var cv = document.createElement('canvas'); cv.width = out[0]; cv.height = out[1];
    var ctx = cv.getContext('2d'), dur = Math.max(1, movie.dur || TL.movieEnd(movie) || 5);
    function paint(t) { TL.frameTransform(ctx, fr, cv.width, cv.height); TL.renderFrame(ctx, movie, chars, t, { frame: fr }); }
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
        paint(0);
        rec.start(250);
        if (dest) mixer.start(0, { extraDest: dest });
        var t0 = performance.now();
        (function frame() {
          var t = (performance.now() - t0) / 1000;
          if (cancelled && cancelled()) { rec.stop(); return; }
          paint(Math.min(t, dur));
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
