/* tl-screens.js: the three editors, kept as JavaScript engines (canvas + pointer work every frame).
   Each registers with UI.page(name, opts, mount) (tl-kit.js keeps them in UI.pages); the Python page Forms Build, Animate
   and Studio mount them through Components/Screen. Dialogs they open (rename, confirm, voice, export, share, new character)
   are Python dialog Forms reached through TL.host (client_code/tl.py). */
/* ===== build ===== */
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
      ['extras', '🦸 Extras', null], ['colors', '🎨 Colours', null], ['size', '📏 Size', null]],
    prop: [['colors', '🎨 Colours', null], ['size', '📏 Size', null]]
  };
  var COLOR_NAMES = { quad: { skin: 'Fur', shirt: 'Body', pants: 'Legs' }, worm: { skin: 'Head', shirt: 'Body', accent: 'Stripes' }, prop: { accent: 'Main colour', shirt: 'Second colour' } };

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
        body.innerHTML = '<div class="bd-colors">' + (ch.rig === 'prop' ? [['accent'], ['shirt']] : TL.COLOR_SLOTS).filter(function (s) { return ch.rig === 'prop' || ch.rig !== 'worm' || ['skin', 'shirt', 'hair', 'accent'].indexOf(s[0]) >= 0; }).map(function (s) {
          return '<div class="row"><b>' + esc(names[s[0]] || s[1]) + '</b><div class="tl-swatches">' + TL.COLORS.map(function (c) {
            return '<button type="button" class="tl-swatch' + (L[s[0]] === c ? ' on' : '') + '" style="background:' + c + '" data-color="' + s[0] + '" data-c="' + c + '" aria-label="' + c + '"></button>';
          }).join('') + '<input type="color" data-custom="' + s[0] + '" value="' + esc(L[s[0]]) + '" aria-label="Pick any colour"></div></div>';
        }).join('') + '</div>';
      } else if (tab === 'size') {
        body.innerHTML = '<div class="bd-sizes">' + TL.SIZES.filter(function (s) { if (ch.rig === 'prop') return s[0] === 'size'; return ch.rig === 'biped' || (s[0] !== 'arm' && (ch.rig !== 'worm' || s[0] !== 'leg')); }).map(function (s) {
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
          var to = ch.rig === 'prop' ? 'colors' : best.kind === 'head' ? 'head' : best.kind === 'torso' || best.kind === 'seg' ? (ch.rig === 'worm' ? 'colors' : 'body') : best.kind === 'extra' ? 'extras' : best.cap ? 'ends' : 'limbs';
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
      ch = c; ch.look = Object.assign({}, TL.DEFAULT_LOOK, ch.look || {}); if (!tabs().some(function (x) { return x[0] === tab; })) tab = tabs()[0][0];
      draw(); raf = requestAnimationFrame(tick);
    });
    return { ready: ready, destroy: function () { cancelAnimationFrame(raf); clearTimeout(saveT); if (dirty && ch) save().catch(function () {}); } };
  });
})();
/* ===== animate ===== */
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
/* ===== studio ===== */
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
    function after() { dirty = true; needs = true; scheduleSave(); sizeStage(); drawTimeline(); drawPanel(); drawTop(); }
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
        '<button class="ui-btn sm st-shape" data-a="shape" title="Canvas shape" aria-label="Canvas shape" data-shapebtn></button>' +
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
    function frame() { return TL.frameOf(movie); }
    /* The stage canvas has the movie's shape (TL.FORMATS); a tall shape is capped by the window height and centred. */
    function sizeStage() {
      if (!stage) return;
      var f = frame(), ar = f.w / f.h, fmt = TL.formatOf(movie);
      wrap.style.setProperty('--ar', String(ar));
      wrap.classList.toggle('narrow', fmt.id !== 'wide');
      stage.style.aspectRatio = f.w + ' / ' + f.h;
      var w = wrap.clientWidth || 800, dpr = Math.min(window.devicePixelRatio || 1, 2);
      var cw = Math.round(w * dpr), ch = Math.round(w / ar * dpr);
      if (stage.width !== cw || stage.height !== ch) { stage.width = cw; stage.height = ch; }
      sctx = stage.getContext('2d'); needs = true;
      var sb = view.querySelector('[data-shapebtn]'); if (sb) sb.textContent = fmt.emoji + ' ' + fmt.ratio;
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
      var fr = frame();
      TL.frameTransform(sctx, fr, stage.width, stage.height);
      var lv = live;
      if (moveOff && sel) { var a = actorById(sel), st = TL.actorAt(a, t); lv = {}; lv[sel] = Object.assign({}, st, { x: st.x + moveOff[0], y: st.y + moveOff[1] }); }
      hits = TL.renderFrame(sctx, movie, chars, t, { frame: fr, sel: sel, paths: showPaths && !playing, live: lv, recording: !!rec });
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
    function stagePt(e) { var r = stage.getBoundingClientRect(), f = frame(); return { x: f.x + (e.clientX - r.left) / r.width * f.w, y: (e.clientY - r.top) / r.height * H, cx: e.clientX - r.left, cy: e.clientY - r.top }; }
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
        '<div class="tl-step">Premade cast</div><div class="st-picks">' + TL.PRESET_LIST.map(function (c) { return TL.charPick(c, false, 'data-add="' + c.id + '"'); }).join('') + '</div>' +
        '<div class="tl-step">🎁 Props</div><p class="small muted" style="margin:-4px 0 8px;font-weight:700">Things for your stage. Hold one to move it, just like an actor: a car can drive, a ball can roll, a UFO can fly.</p>' +
        '<div class="st-picks">' + TL.PROP_LIST.map(function (c) { return TL.charPick(c, false, 'data-add="' + c.id + '"'); }).join('') + '</div>';
    }
    function panelScene() {
      var mine = assets.filter(function (x) { return x.kind === 'bg'; });
      var fmt = TL.formatOf(movie), fr = frame();
      return '<div class="tl-step" style="margin-top:0" id="st-shape">Canvas shape</div><div class="st-shapes" role="group" aria-label="Canvas shape">' +
        TL.FORMATS.map(function (f) {
          return '<button type="button" class="st-shapebtn' + (f.id === fmt.id ? ' on' : '') + '" data-format="' + f.id + '" aria-pressed="' + (f.id === fmt.id) + '">' +
            '<span class="st-shapepic" style="aspect-ratio:' + f.out[0] + ' / ' + f.out[1] + '" aria-hidden="true"></span><b>' + f.emoji + ' ' + f.name + ' ' + f.ratio + '</b><span>' + esc(f.use) + '</span></button>';
        }).join('') + '</div>' +
        (fmt.id !== 'wide' ? '<label class="tl-range" style="margin-top:12px"><span>Camera</span><input type="range" min="' + Math.round(fr.w / 2) + '" max="' + Math.round(W - fr.w / 2) + '" step="5" value="' + Math.round(fr.x + fr.w / 2) + '" data-camera aria-label="Slide the camera left or right"><output>' + (fr.x + fr.w / 2 < 600 ? '⬅️' : fr.x + fr.w / 2 > 680 ? '➡️' : '⏺️') + '</output></label>' +
          '<p class="small muted st-shape-note">Slide the camera to film another part of the place. Videos come out ' + fmt.out[0] + ' × ' + fmt.out[1] + '.</p>' : '') +
        '<div class="tl-step">Background</div><div class="st-picks wide">' +
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

    /* ---------------------------------------------------------------- canvas shape */
    function setFormat(id) {
      if (TL.formatOf(movie).id === id) return;
      var from = frame(), to = TL.frameOf(Object.assign({}, movie, { format: id }));
      change(function () { if (id === 'wide') delete movie.format; else movie.format = id; movie.fx = Math.round(from.x + from.w / 2); });
      sizeStage(); drawTimeline();
      var fmt = TL.formatOf(movie);
      to = frame();
      if (TL.actorsOutside(movie, to) && to.w < from.w) {
        UI.confirm({ title: 'Squeeze everyone into the ' + fmt.name + '?', text: 'Some actors stand or walk outside the new frame. Squeeze their places and paths so everyone fits (Undo puts it back), or keep them and slide the camera instead.', ok: 'Squeeze them in', cancel: 'Keep as is' })
          .then(function (yes) { if (yes) { change(function () { TL.remapActors(movie, from, to); }); UI.toast('Everyone fits in the ' + fmt.name + ' now.', 'ok'); } });
      } else UI.toast(fmt.emoji + ' ' + fmt.name + ' ' + fmt.ratio + ': made for ' + fmt.use + '.', 'ok');
    }

    /* ---------------------------------------------------------------- adding things */
    function addActor(id) {
      var ch = chars[id] || TL.PRESETS[id]; if (!ch) return;
      var n = movie.actors.length, f = frame(), x = Math.round(f.x + f.w * (.2 + ((n * .18) % .61))), y = TL.GROUND + (n % 2) * 26, prop = TL.isProp(ch);
      if (prop) y = TL.isAir(ch) ? 170 + (n % 3) * 50 : Math.round(TL.GROUND + (n % 2) * 26 + (TL.footY(TL.PRESETS.p_blox) - TL.footY(ch)) * 1.3);
      var a = TL.newActor(ch, x, y);
      a.flip = x > f.x + f.w / 2;
      if (movie.actors.some(function (o) { return o.name === a.name; })) a.name = a.name + ' ' + (n + 1);
      change(function () { movie.actors.push(a); });
      sel = a.id; item = null; tab = 'actor'; drawPanel(); drawTimeline(); tip();
      UI.toast(a.name + ' is on stage! Hold ' + (prop ? 'it' : 'them') + ' to record.', 'ok');
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
      if (b.hasAttribute('data-format')) { setFormat(g('data-format')); return; }
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
      if (act === 'shape') { item = null; tab = 'scene'; drawPanel(); drawTimeline(); var sh = view.querySelector('#st-shape'); if (sh && sh.scrollIntoView) sh.scrollIntoView({ block: 'nearest' }); var on = view.querySelector('[data-format].on'); if (on) on.focus(); }
      else if (act === 'closeitem') { item = null; tab = sel ? 'actor' : 'bubbles'; drawPanel(); drawTimeline(); }
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
      else if (el.matches('[data-camera]')) { set(function () { movie.fx = +el.value; }); el.nextElementSibling.textContent = movie.fx < 600 ? '⬅️' : movie.fx > 680 ? '➡️' : '⏺️'; }
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
      else if (el.matches('[data-btext],[data-size],[data-dur],[data-vol],[data-len],[data-blen],[data-camera]')) { hist.push(JSON.stringify(movie)); drawTimeline(); drawTop(); }
    });
    function onKey(e) {
      if (!movie || e.target.matches('input, textarea, select') || document.querySelector('.ui-modal-wrap')) return;
      if (e.key === ' ') { e.preventDefault(); playing ? pause() : play(); }
      else if ((e.ctrlKey || e.metaKey) && (e.key || '').toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
      else if ((e.ctrlKey || e.metaKey) && (e.key || '').toLowerCase() === 'y') { e.preventDefault(); redo(); }
      else if (e.key === 'Home') seek(0);
      else if ((e.key === 'Delete' || e.key === 'Backspace') && item) { var d = view.querySelector('[data-a="delitem"]'); if (d) d.click(); }
      else if (e.key === 'ArrowRight') seek(t + (e.shiftKey ? 1 : .1));
      else if (e.key === 'ArrowLeft') seek(t - (e.shiftKey ? 1 : .1));
    }
    document.addEventListener('keydown', onKey);
    window.TL_STUDIO = {  // for tests: hold-to-record without a mouse
      state: function () { return { t: t, movie: movie, sel: sel, rec: !!rec, hits: hits, frame: movie ? frame() : null }; },
      setFormat: function (id) { setFormat(id); },
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
