/* ToonyLoony's main journeys, run inside the real app (Anvil App Server) by tools/ui_test.py through tools/live/drive.mjs.
   A guest builds a character, teaches it a move, makes a Reel movie, records by holding an actor, changes the canvas
   shape (with the "squeeze everyone in" question), slides the camera, exports a video in another shape, records a
   voice in the Library, watches the Theater; then signs up, moves the guest toons into the account and shares a movie.
   Resolves to {ok, log}. Keep log lines ASCII (the Windows console). */
(async function () {
  const log = [], t0 = Date.now();
  const say = (m) => log.push(((Date.now() - t0) / 1000).toFixed(1) + 's ' + m);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  async function until(fn, what, ms) {
    const end = Date.now() + (ms || 20000);
    while (Date.now() < end) { try { const v = fn(); if (v) return v; } catch (e) {} await sleep(150); }
    throw new Error('timed out waiting for: ' + what);
  }
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const norm = (e) => e.textContent.trim().replace(/\s+/g, ' ');
  const shown = (e) => { if (!e) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const modal = () => $$('.anvil-modal-content').filter(shown).pop() || null;
  const inModal = (sel) => { const m = modal(); return m ? Array.from(m.querySelectorAll(sel)) : []; };
  async function press(sel, text, scope) {
    const el = await until(() => (scope ? scope() : $$(sel)).filter((e) => shown(e) && (!text || norm(e).indexOf(text) >= 0))[0], sel + (text ? ' "' + text + '"' : ''));
    el.scrollIntoView({ block: 'center' });
    el.click();
    return el;
  }
  const pressIn = (sel, text) => press(sel, text, () => inModal(sel));
  function type(input, value) {
    input.focus(); input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true }));
  }
  async function page(hash, ready, what) {
    if (location.hash !== hash) window.UI_READY = false;
    location.hash = hash;
    await until(() => window.UI_READY && location.hash === hash && ready(), what || hash, 40000);
    await sleep(300);
  }
  function pev(el, kind, x, y) { el.dispatchEvent(new PointerEvent(kind, { bubbles: true, cancelable: true, clientX: x, clientY: y, pointerId: 7, button: 0, isPrimary: true })); }
  const ok = (cond, msg) => { if (!cond) throw new Error('FAILED: ' + msg); say('ok   ' + msg); };
  const errors = [];
  window.addEventListener('error', (e) => errors.push(String(e.message)));

  try {
    // ---------------------------------------------------------------- landing (a visitor)
    await page('#landing', () => $('.lp-hero h1'), 'landing');
    ok($('.lp-grown a[href="#auth/signup"]') && /Wide, Reel or Square/.test(document.body.textContent), 'landing: pitch, sign-up link and the canvas shapes');
    ok(!$$('.ui-nav .nav-link').filter(shown).length, 'landing: the studio menu waits until you go in');

    // ---------------------------------------------------------------- a guest at home
    await page('#home', () => $('.hm-hero'), 'home');
    ok(/playing as a guest/.test(document.body.textContent) && $$('.ui-nav .nav-link').filter(shown).length === 4, 'guest home: the guest note and the studio menu');
    const drawErr = [], tcv = document.createElement('canvas'); tcv.width = 400; tcv.height = 300; const tcx = tcv.getContext('2d');
    TL.SCENES.forEach((sc) => { try { tcx.save(); sc.draw(tcx); tcx.restore(); } catch (e) { drawErr.push(sc.id + ': ' + e.message); } });
    Object.keys(TL.PROP_DEFS).forEach((k) => { const d = TL.PROP_DEFS[k]; try { tcx.save(); d.draw(tcx, Object.assign({}, TL.DEFAULT_LOOK, { accent: d.c1, shirt: d.c2 }), 1.3); tcx.restore(); } catch (e) { drawErr.push(k + ': ' + e.message); } });
    TL.PRESET_LIST.forEach((c) => { try { TL.charCanvas(c, 80, 80); } catch (e) { drawErr.push(c.id + ': ' + e.message); } });
    ['head', 'eyes', 'mouth', 'hat', 'torso', 'arms', 'legs', 'hands', 'feet', 'extra'].forEach((slot) => TL.PARTS[slot].forEach((pt) => { try { TL.partIcon(TL.PRESETS.p_blox, slot, pt[0], 40); } catch (e) { drawErr.push(slot + '/' + pt[0] + ': ' + e.message); } }));
    ok(!drawErr.length && TL.SCENES.length === 30 && TL.PROP_LIST.length >= 35, 'all backgrounds, premade characters, props and parts draw cleanly ' + drawErr.slice(0, 2).join('; '));

    // ---------------------------------------------------------------- new character -> builder
    await press('.anvil-role-hm-ghost button', 'New character');
    await until(() => inModal('.tl-pick').length === 12, 'body types');
    ok(true, 'New character: twelve body types to pick from');
    await pressIn('.tl-pick[data-key="hero"]');
    await until(() => location.hash.indexOf('#build/') === 0 && window.UI_READY && $('[data-part]'), 'builder', 30000);
    const charId = location.hash.split('/')[1];
    ok(/^c_/.test(charId), 'picking a body type opens the builder');
    $('[data-tab="hat"]').click(); await sleep(150);
    (await until(() => $('[data-part="crown"]'), 'crown')).click(); await sleep(1600);
    ok((await TL.store.getChar(charId)).look.hat === 'crown', 'a crown goes on and is saved (guest: in the browser)');

    // ---------------------------------------------------------------- animator: drag a joint = a keyframe
    await page('#animate/' + charId + '/wave', () => $('[data-cv]'), 'animator');
    const cvA = $('[data-cv]'), before = (await TL.store.getChar(charId)).anims.find((a) => a.id === 'wave').keys.length;
    $('[data-f="3"]').click(); await sleep(100);
    const chA = await TL.store.getChar(charId), rA = cvA.getBoundingClientRect();
    const bb = TL.bounds(chA, {}), sc = Math.min(2.1, 330 / Math.max(bb.h, bb.w * .8)), pl = { s: sc, x: 320 - (bb.x + bb.w / 2) * sc, y: 405 - TL.footY(chA) * sc };
    const anim = chA.anims.find((a) => a.id === 'wave'), sv = TL.solve(chA, TL.keyPose(chA, anim, 3)).find((x) => x.b.id === 'aR2');
    const hx = rA.left + (pl.x + sv.ex * pl.s) / 640 * rA.width, hy = rA.top + (pl.y + sv.ey * pl.s) / 480 * rA.height;
    pev(cvA, 'pointerdown', hx, hy); pev(cvA, 'pointermove', hx + 10, hy - 30); pev(cvA, 'pointermove', hx + 20, hy - 60); pev(cvA, 'pointerup', hx + 20, hy - 60);
    await sleep(1600);
    const keysNow = (await TL.store.getChar(charId)).anims.find((a) => a.id === 'wave').keys;
    ok(keysNow.length === before + 1 && keysNow.some((k) => k.f === 3), 'dragging a joint on an in-between frame adds a keyframe');

    // ---------------------------------------------------------------- a new REEL movie
    await page('#home', () => $('.hm-hero'), 'home again');
    await press('.anvil-role-btn-yellow button', 'New movie');
    await until(() => inModal('.st-shapebtn').length === 4 && inModal('.tl-pick').length > 30, 'new movie dialog');
    ok(inModal('.st-shapebtn.on[data-key="wide"]').length === 1, 'New movie: four canvas shapes, Wide picked first');
    await pressIn('.st-shapebtn[data-key="reel"]');
    await until(() => inModal('.st-shapebtn.on[data-key="reel"]').length === 1, 'reel picked');
    ok(/Reels, TikTok/.test(norm(inModal('.st-shapebtn[data-key="reel"]')[0])), 'the Reel choice says what it is for');
    type(inModal('input[type=text]')[0], 'Flow Test Movie');
    await pressIn('.anvil-role-btn-yellow button', 'Start filming');
    await until(() => location.hash.indexOf('#studio/') === 0 && window.UI_READY && window.TL_STUDIO && $('[data-stage]'), 'studio', 40000);
    await sleep(500);
    const S = window.TL_STUDIO;
    let st = S.state(), f = st.frame;
    ok(st.movie.format === 'reel' && f.w === 405 && /9:16/.test($('[data-shapebtn]').textContent), 'the movie opens in the studio as a 9:16 Reel');
    const stg = $('[data-stage]'); let rs = stg.getBoundingClientRect();
    ok(Math.abs(rs.height / rs.width - 1280 / 720) < .03, 'the stage is tall (' + Math.round(rs.width) + 'x' + Math.round(rs.height) + ')');
    ok(st.movie.actors.length >= 1 && st.movie.actors.every((a) => a.x > f.x && a.x < f.x + f.w), 'its actors stand inside the Reel frame');
    // ---- hold to record, mapped through the frame
    const sx = (x) => rs.left + (x - S.state().frame.x) / S.state().frame.w * rs.width, sy = (y) => rs.top + y / 720 * rs.height;
    let act = st.movie.actors[0], hit = st.hits.find((h) => h.id === act.id), gx = hit.x + hit.w / 2, gy = hit.y + hit.h / 2;
    pev(stg, 'pointerdown', sx(gx), sy(gy)); await sleep(450);
    ok(S.state().rec, 'holding a character starts recording');
    for (let k = 1; k <= 12; k++) { pev(stg, 'pointermove', sx(gx + k * 12), sy(gy)); await sleep(80); }
    pev(stg, 'pointerup', sx(gx + 144), sy(gy)); await sleep(300);
    st = S.state(); act = st.movie.actors[0];
    const tk = act.takes[0];
    ok(!st.rec && act.takes.length === 1 && tk.pts.length > 10 && tk.pts[tk.pts.length - 1][1] - tk.pts[0][1] > 100, 'letting go keeps one take that moved right (' + tk.pts.length + ' points)');
    S.seek(tk.t0); await sleep(60);
    ok(Math.abs(TL.actorAt(act, tk.t0).x - tk.pts[0][1]) < 2, 'rewinding puts the actor back where it started');
    ok($$('[data-item="take"]').length === 1, 'the take shows on the timeline');

    // ---------------------------------------------------------------- change the shape
    await press('[data-shapebtn]');
    await until(() => $$('[data-format]').length === 4, 'shape chips in the Scene tab');
    ok($('[data-format="reel"].on') && $('[data-camera]'), 'the shape button opens the Scene tab: four shapes and a camera slider');
    $('[data-format="wide"]').click(); await sleep(400);
    rs = stg.getBoundingClientRect();
    ok(!S.state().movie.format && S.state().frame.w === 1280 && Math.abs(rs.width / rs.height - 16 / 9) < .03, 'Wide: the stage turns 16:9');
    $('[data-tab="cast"]').click(); await sleep(100);
    $('[data-add="p_o_car"]').click(); await sleep(300);
    const car = S.state().movie.actors[S.state().movie.actors.length - 1];
    ok(car.char === 'p_o_car', 'a prop joins the wide stage');
    car.x = 150;  // park it on the far left, outside the Square frame to come
    $('[data-tab="scene"]').click(); await sleep(100);
    $('[data-format="square"]').click();
    await until(() => modal() && /Squeeze everyone/.test(modal().textContent), 'squeeze question');
    ok(true, 'Square: asks to squeeze in the actors who would be outside');
    await pressIn('button', 'Squeeze them in');
    await until(() => !modal(), 'question closed');
    await sleep(400);
    st = S.state(); f = st.frame;
    ok(st.movie.format === 'square' && f.w === 720 && !TL.actorsOutside(st.movie, f), 'everyone (and every path) fits in the 1:1 frame');
    $('[data-undo]').click(); await sleep(300);
    ok(TL.actorsOutside(S.state().movie, S.state().frame), 'undo puts the old places back');
    $('[data-redo]').click(); await sleep(300);
    $('[data-tab="scene"]').click(); await sleep(150);
    const cam = await until(() => $('[data-camera]'), 'camera slider');
    type(cam, '420'); await sleep(200);
    ok(S.state().movie.fx === 420 && S.state().frame.x === 60, 'the camera slider moves the frame over the place');
    // ---- sounds, bubbles, background, play, autosave
    $('[data-tab="sounds"]').click(); await sleep(80);
    (await until(() => $('[data-addclip="b:s_boing"]'), 'boing')).click();
    await until(() => S.state().movie.clips.length === 1, 'clip');
    $('[data-tab="bubbles"]').click(); await sleep(80);
    $('[data-addbub="say"]').click(); await sleep(150);
    const ta = await until(() => $('[data-btext]'), 'bubble text'); ta.value = 'Hello flow test'; ta.dispatchEvent(new Event('input', { bubbles: true }));
    ok(S.state().movie.clips.length === 1 && S.state().movie.bubbles[0].text === 'Hello flow test', 'a sound and a speech bubble go on the timeline');
    $('[data-tab="scene"]').click(); await sleep(150);
    (await until(() => $('[data-bg="b:space"]'), 'space bg')).click(); await sleep(150);
    ok(S.state().movie.bg === 'b:space', 'the background can change');
    $('[data-play]').click(); await sleep(500);
    ok(S.state().t > 0, 'play runs the clock');
    $('[data-play]').click();
    await sleep(2000);
    const movieId = S.state().movie.id, stored = (await TL.store.getMovie(movieId)).movie;
    ok(stored.format === 'square' && stored.fx === 420 && stored.thumb, 'the movie autosaves with its shape, camera and thumbnail');

    // ---------------------------------------------------------------- export in another shape
    S.state().movie.dur = 2;
    $('[data-export]').click();
    await until(() => inModal('.st-shapebtn').length === 4 && inModal('canvas').length, 'export dialog', 20000);
    ok(inModal('.st-shapebtn.on[data-key="square"]').length === 1, 'Make a video: starts on the own shape of the movie');
    await pressIn('.st-shapebtn[data-key="reel"]');
    await until(() => /Crops your movie/.test(modal().textContent), 'crop note');
    const pv = inModal('canvas')[0];
    ok(pv.height > pv.width, 'a Reel preview is tall (' + pv.width + 'x' + pv.height + ')');
    await pressIn('.anvil-role-btn-primary button', 'Record the video');
    const dl = await until(() => inModal('.anvil-role-btn-go button').filter(shown)[0], 'download button', 40000);
    ok(/-reel\.(mp4|webm)/.test(dl.textContent), 'the video comes out as a Reel file: ' + norm(dl));
    await pressIn('button', 'Close');
    await until(() => !modal(), 'export closed');

    // ---------------------------------------------------------------- guests can't share
    $('[data-share]').click();
    await until(() => modal() && /needs an account/.test(modal().textContent), 'share asks for an account');
    ok(true, 'guests are asked for an account before sharing');
    await pressIn('button', 'Not now');
    await until(() => !modal(), 'closed');

    // ---------------------------------------------------------------- library, voice, theater, watch
    await page('#library/sound', () => $$('.lb-card').length >= 20, 'sounds');
    ok(true, 'the Library lists the premade sounds');
    await page('#library/music', () => $$('.lb-card').length === 8, 'music');
    ok(true, 'and 8 music loops');
    await page('#library/voice', () => $('.anvil-role-btn-rec'), 'voices');
    await press('.anvil-role-btn-rec button', 'Record a voice');
    const rec = await until(() => inModal('.tl-recbig')[0], 'recorder');
    rec.click();
    await until(() => /Recording/.test(modal().textContent), 'recording', 10000);
    await sleep(1300);
    rec.click();
    await until(() => /Got it/.test(modal().textContent), 'recorded', 10000);
    await pressIn('.anvil-role-btn-primary button', 'Use this voice');
    await until(() => !modal() && $$('.lb-card').length === 1, 'voice saved', 20000);
    ok(true, 'record a voice with the fake microphone: it lands in Yours');
    await page('#theater', () => $$('.th-card').length >= 5, 'theater');
    ok($$('.th-card img').every((i) => /^(data:|http)/.test(i.src)), 'the Theater shows the featured cartoons with pictures');
    await page('#watch/demo-race', () => $('.tl-player canvas'), 'watch');
    ok(/The Great Park Race/.test(document.body.textContent), 'a cartoon opens on its watch page');
    $('[data-pp]').click(); await sleep(400);
    ok($('.tl-player.playing'), 'the player plays');
    await page('#watch/nothing-here', () => shown($('.ui-empty')), 'wrong link');
    ok(/isn.t here/.test(document.body.textContent), 'a wrong link says so');

    // ---------------------------------------------------------------- sign up, move the guest toons in, share
    await page('#auth/signup', () => $$('.au-card input').length >= 3, 'sign-up');
    const inputs = $$('.au-card input[type=text], .au-card input[type=email], .au-card input[type=password]').filter(shown);
    type(inputs[0], 'Flow Tester'); type(inputs[1], 'flow' + Date.now() + '@example.com'); type(inputs[2], 'Hb-' + Math.random().toString(36).slice(2) + '-Kq7');
    const tick = $('.au-card input[type=checkbox]'); if (tick && !tick.checked) tick.click();
    await press('.anvil-role-btn-block button', 'Create account');
    await until(() => location.hash === '#home' && window.UI_READY && shown($('.anvil-role-avatar button')), 'signed up', 40000);
    await until(() => $$('.tl-banner').filter(shown).some((b) => /as a guest on this device/.test(b.textContent)), 'import offer', 20000);
    ok(true, 'a new member is offered to move the guest toons of this device in');
    await press('.tl-banner .anvil-role-btn-primary button', 'Move them in');
    await until(() => /Flow Test Movie/.test(document.body.textContent) && !$$('.tl-banner').filter(shown).some((b) => /as a guest/.test(b.textContent)), 'imported', 60000);
    ok($$('.anvil-role-tile-fmt').some((b) => /Square/.test(b.textContent) && shown(b)), 'the guest movie is in the account, with its Square badge');
    const home = await TL.store.home(), mv = home.movies.find((m) => m.name === 'Flow Test Movie');
    ok(mv && mv.format === 'square' && home.chars.some((c) => c.id === charId), 'the server keeps the shape and the character (same ids)');
    await page('#studio/' + mv.id, () => window.TL_STUDIO && $('[data-share]'), 'member studio');
    $('[data-share]').click();
    await pressIn('.anvil-role-btn-yellow button', 'Make a link');
    const linkBox = await until(() => inModal('input').find((i) => /#watch\//.test(i.value)), 'share link', 20000);
    ok(true, 'a member gets a share link');
    const shareKey = linkBox.value.split('#watch/')[1];
    await pressIn('a', 'Watch it');
    await until(() => location.hash === '#watch/' + shareKey && window.UI_READY && $('.tl-player canvas'), 'shared watch page', 30000);
    const pc = $('.tl-player canvas');
    ok(pc.width === 1080 && pc.height === 1080 && /Square/.test(document.body.textContent), 'the shared movie plays in its own 1:1 shape');

    // ---------------------------------------------------------------- sign out
    await press('.anvil-role-avatar button');
    await press('.ui-menu button', 'Sign out');
    await until(() => location.hash === '#landing' && window.UI_READY && !shown($('.anvil-role-avatar button')), 'signed out');
    ok(true, 'sign out: back to the landing page');
    ok(!errors.length, 'no JavaScript errors ' + errors.slice(0, 2).join(' | '));
    say('PASSED');
    return { ok: true, log: log };
  } catch (e) {
    say(String(e && e.message || e));
    if (errors.length) say('JS errors: ' + errors.slice(0, 3).join(' | '));
    return { ok: false, log: log };
  }
})();
