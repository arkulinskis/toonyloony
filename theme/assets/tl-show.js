/* tl-show.js: the little animated pictures the Forms put on pages, drawn with the engine (tl-rig, tl-movie):
   TL.show.hero(beforeCanvas, afterCanvas, slider, box)  landing: storyboard vs. finished cartoon (drag to compare)
   TL.show.steps(c0, c1, c2)                             landing: the three step pictures
   TL.show.duo(canvas)                                   home: Blox dancing with Biscuit
   TL.show.preview(canvas, presetId)                     cast: a premade character playing its moves
   TL.show.poster(canvas, movieData, t)                  theater/home: a still from a movie (when it has no thumbnail)
   Each animation stops by itself once its canvas leaves the page. */
(function () {
  'use strict';
  var TL = window.TL = window.TL || {};
  var show = TL.show = {};

  /* Watch section: swap the video's cover for YouTube's player (privacy-enhanced) only when it's pressed. */
  document.addEventListener('click', function (e) {
    var b = e.target && e.target.closest ? e.target.closest('[data-yt-film]') : null;
    if (!b) return;
    var f = document.createElement('iframe');
    f.src = 'https://www.youtube-nocookie.com/embed/' + b.getAttribute('data-yt-film') + '?autoplay=1&rel=0&playsinline=1';
    f.title = b.getAttribute('data-yt-title') || 'Video';
    f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    f.allowFullscreen = true;
    f.referrerPolicy = 'strict-origin-when-cross-origin';
    b.parentNode.replaceChild(f, b);
  });

  function loop(cv, draw) {
    var t0 = performance.now();
    (function frame(now) {
      if (!cv.isConnected) return;
      draw((now - t0) / 1000);
      requestAnimationFrame(frame);
    })(t0);
  }

  // the storyboard side: squared paper, Blox in three onion-skinned walk poses, the dashed path, keyframe diamonds
  function drawBefore(cv) {
    var x = cv.getContext('2d'), W = 1280, H = 720, i;
    x.fillStyle = '#f7f3e8'; x.fillRect(0, 0, W, H);
    x.strokeStyle = 'rgba(71, 87, 255, .12)'; x.lineWidth = 2;
    for (i = 0; i <= W; i += 48) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, H); x.stroke(); }
    for (i = 0; i <= H; i += 48) { x.beginPath(); x.moveTo(0, i); x.lineTo(W, i); x.stroke(); }
    x.strokeStyle = '#ff8a2b'; x.lineWidth = 7; x.setLineDash([18, 14]); x.beginPath(); x.moveTo(140, 640); x.bezierCurveTo(420, 560, 760, 680, 1140, 600); x.stroke(); x.setLineDash([]);
    var ch = TL.PRESETS.p_blox, a = TL.findAnim(ch, 'walk');
    [[260, .25, .3], [620, .5, .55], [980, .75, 1]].forEach(function (k) {
      TL.drawChar(x, ch, TL.animPose(ch, a, k[1], 1), { x: k[0], y: 470, s: 1.5, alpha: k[2] });
    });
    x.fillStyle = '#ff8a2b'; x.font = '900 54px Nunito, sans-serif'; x.textAlign = 'center';
    [260, 620, 980].forEach(function (px) { x.fillText('◆', px, 700); });
    x.fillStyle = '#1a1d3a'; x.font = '800 30px Nunito, sans-serif'; x.textAlign = 'left'; x.fillText('Blox · walk · 3 keyframes', 40, 110);
  }
  function heroMovie() {
    var m = TL.newMovie('Hero'); m.bg = 'b:park'; m.dur = 8;
    var blox = TL.newActor(TL.PRESETS.p_blox, 200, 560), dog = TL.newActor(TL.PRESETS.p_biscuit, 120, 600);
    function path(a, anim, x0, x1, y, t0, t1) {
      var pts = []; for (var i = 0; i <= 40; i++) { var u = i / 40, x = x0 + (x1 - x0) * u; pts.push([t0 + (t1 - t0) * u, x, y, x1 > x0 ? 1 : -1]); }
      a.takes.push({ id: TL.uid('k'), t0: t0, t1: t1, anim: anim, speed: 1, pts: pts });
    }
    path(blox, 'walk', 220, 1060, 560, 0, 6); path(dog, 'run', 60, 860, 600, .8, 6.6);
    m.actors = [dog, blox];
    m.bubbles = [{ id: 'b1', actor: blox.id, t0: 1.2, t1: 3.6, text: 'Look, I\'m in a cartoon!', style: 'say' }, { id: 'b2', actor: dog.id, t0: 4.2, t1: 6.6, text: 'Woof!', style: 'shout' }];
    return m;
  }
  show.hero = function (before, after, slider, box) {
    if (before) drawBefore(before);
    if (slider && box) slider.addEventListener('input', function () { box.style.setProperty('--x', slider.value + '%'); });
    if (!after) return;
    var ctx = after.getContext('2d'), m = heroMovie(), blox = m.actors[1];
    loop(after, function (tt) {
      var t = tt % 8;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      var hits = TL.renderFrame(ctx, m, {}, Math.min(t, 7.6), {});
      var h = hits.filter(function (x) { return x.id === blox.id; })[0];
      if (h && t < 6) { ctx.font = '96px "Segoe UI Emoji", "Apple Color Emoji", sans-serif'; ctx.textAlign = 'center'; ctx.fillText('👆', h.cx + 30, h.y + h.h * .5 + 70); }
    });
  };

  show.steps = function (c0, c1, c2) {
    if (c0) { var x = c0.getContext('2d'); ['hero', 'bot', 'pup', 'birdy'].forEach(function (st, i) { var ch = TL.newCharacter(st); if (st === 'hero') ch.look.hat = 'wizard'; var f = TL.fitChar(ch, {}, 100, 200, 12); TL.drawChar(x, ch, {}, { x: f.x + i * 100, y: f.y + 6, s: f.s }); }); }
    if (c1) {
      var y = c1.getContext('2d'), ch2 = TL.PRESETS.p_pixel, a = TL.findAnim(ch2, 'dance');
      [[0, .22], [4, .45], [8, 1]].forEach(function (k, i) { TL.drawChar(y, ch2, TL.keyPose(ch2, a, k[0]), { x: 110 + i * 100, y: 120, s: .62, alpha: k[1] }); });
      y.fillStyle = '#ff8a2b'; y.font = '900 22px Nunito, sans-serif'; y.textAlign = 'center'; ['◆', '◆', '◆'].forEach(function (d, i) { y.fillText(d, 110 + i * 100, 214); });
    }
    if (c2) {
      var z = c2.getContext('2d'); z.save(); z.scale(400 / 1280, 220 / 720); TL.drawBackground(z, 'b:space', 1280, 720); z.restore();
      var zr = TL.PRESETS.p_zorp; TL.drawChar(z, zr, TL.animPose(zr, TL.findAnim(zr, 'walk'), .3, 1), { x: 230, y: 150, s: .5 });
      z.strokeStyle = '#ffc532'; z.lineWidth = 4; z.setLineDash([8, 7]); z.beginPath(); z.moveTo(60, 196); z.quadraticCurveTo(140, 150, 226, 192); z.stroke(); z.setLineDash([]);
      z.font = '44px "Segoe UI Emoji", sans-serif'; z.fillText('👆', 236, 196);
      z.fillStyle = '#ff3048'; TL.rr(z, 318, 12, 70, 28, 8); z.fill(); z.fillStyle = '#fff'; z.font = '900 15px Nunito, sans-serif'; z.textAlign = 'left'; z.fillText('● REC', 328, 31);
    }
  };

  show.duo = function (cv) {
    var ctx = cv.getContext('2d'), a = TL.PRESETS.p_blox, b = TL.PRESETS.p_biscuit;
    var dance = TL.findAnim(a, 'dance'), wag = TL.findAnim(b, 'wag');
    loop(cv, function (t) {
      ctx.clearRect(0, 0, 360, 270);
      TL.drawChar(ctx, b, TL.animPose(b, wag, t, 1), { x: 250, y: 205, s: .9, t: t, flip: true, shadow: TL.footY(b) });
      TL.drawChar(ctx, a, TL.animPose(a, dance, t, 1), { x: 130, y: 160, s: .95, t: t, shadow: TL.footY(a), blink: (t % 3.2) < .12 ? 1 : 0 });
    });
  };

  show.preview = function (cv, id) {
    var ch = TL.PRESETS[id] || TL.PRESETS.p_blox, cx = cv.getContext('2d');
    loop(cv, function (t) {
      var anim = ch.anims[Math.floor(t / 2.4) % ch.anims.length], pose = TL.animPose(ch, anim, t, 1);
      cx.setTransform(2, 0, 0, 2, 0, 0); cx.clearRect(0, 0, 200, 200);
      var fit = TL.isProp(ch) ? TL.fitChar(ch, {}, 200, 180, 30) : null;
      TL.drawChar(cx, ch, pose, fit ? { x: fit.x, y: fit.y, s: fit.s, t: t, shadow: TL.isAir(ch) ? null : TL.footY(ch) } : { x: 100, y: 112, s: .62, t: t, shadow: TL.footY(ch) });
      cx.fillStyle = 'rgba(26,29,58,.7)'; cx.font = '800 12px Nunito, sans-serif'; cx.textAlign = 'center'; cx.fillText(TL.animEmoji(anim) + ' ' + anim.name, 100, 192);
    });
  };

  show.poster = function (cv, data, t) {
    if (!cv || !data) return;
    cv.getContext('2d').drawImage(TL.movieCanvas(data, {}, t == null ? 3 : t, cv.width, cv.height), 0, 0);
  };
})();
