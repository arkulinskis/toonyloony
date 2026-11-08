/* _tl_rig_props: props, the objects you put on the stage (ball, car, rocket, tree, cake, UFO...). Each prop is a
     premade "character" on the one-stick 'prop' rig (TL.RIGS.prop in _tl_rig), so the studio treats it like any actor:
     hold it to record its path, give it a move (bounce, spin, roll, wobble, float, shake), size, facing, timeline.
     Ids are 'p_o_<name>' and must never change (movies reference them). Loads after _tl_rig (file order). */
(function () {
  'use strict';
  var TL = window.TL = window.TL || {};
  var R = TL._rig, INK = R.INK, fs = R.fs, fill = R.fill, rr = TL.rr, ell = TL.ell, star = TL.star, shade = TL.shade, blobs = TL.blobs, PI = Math.PI;

  function thick(c, w, col, path) { c.save(); c.lineCap = 'round'; c.lineWidth = w + 5; c.strokeStyle = INK; path(); c.stroke(); c.lineWidth = w; c.strokeStyle = col; c.stroke(); c.restore(); }
  function face(c, x, y, k) {  // a small happy face (sun, cloud, star)
    k = k || 1; ell(c, x - 13 * k, y - 4 * k, 4 * k, 6 * k); fill(c, INK); ell(c, x + 13 * k, y - 4 * k, 4 * k, 6 * k); fill(c, INK);
    c.save(); c.lineWidth = 3.6; c.beginPath(); c.arc(x, y + 2 * k, 11 * k, PI * .18, PI * .82); c.stroke(); c.restore();
  }

  /* [id, name, emoji, [box w, box h], colour 1 (accent), colour 2 (shirt), {air, idle, rec}, draw(ctx, look, t)]
     Drawn centred on (0, 0) inside the box (bottom edge at +h/2), facing right; thick ink outlines like the cast. */
  var PROPS = [
    ['ball', 'Ball', '🔴', [64, 64], '#ff4f6d', '#ffffff', { rec: 'roll' }, function (c, L) {
      ell(c, 0, 0, 32, 32); fs(c, L.accent);
      c.save(); ell(c, 0, 0, 32, 32); c.clip(); c.beginPath(); c.moveTo(-40, -8); c.quadraticCurveTo(0, 4, 40, -8); c.lineTo(40, 6); c.quadraticCurveTo(0, 18, -40, 6); c.closePath(); fs(c, L.shirt); c.restore();
      ell(c, 0, 0, 32, 32); c.stroke(); ell(c, -11, -13, 8, 5, -.5); fill(c, 'rgba(255,255,255,.6)');
    }],
    ['beachball', 'Beach ball', '🏐', [74, 74], '#ff3048', '#2fa8ff', { rec: 'roll' }, function (c, L) {
      var cols = [L.accent, '#ffffff', L.shirt, '#ffffff', '#ffd23f', '#ffffff'];
      cols.forEach(function (col, i) { c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, 36, i * PI / 3, (i + 1) * PI / 3); c.closePath(); fill(c, col); });
      ell(c, 0, 0, 36, 36); c.stroke(); ell(c, 0, 0, 7, 7); fs(c, '#ffffff'); ell(c, -13, -15, 8, 5, -.6); fill(c, 'rgba(255,255,255,.55)');
    }],
    ['box', 'Box', '📦', [100, 86], '#d9a066', '#b5793f', {}, function (c, L) {
      c.beginPath(); c.moveTo(-48, -30); c.lineTo(-40, -42); c.lineTo(40, -42); c.lineTo(48, -30); c.closePath(); fs(c, shade(L.accent, 1.15));
      rr(c, -48, -30, 96, 72, 6); fs(c, L.accent); rr(c, -9, -30, 18, 72, 2); fs(c, L.shirt);
      c.save(); c.lineWidth = 3; c.strokeStyle = shade(L.accent, .7); c.beginPath(); c.moveTo(-36, 12); c.lineTo(-26, 2); c.lineTo(-16, 12); c.moveTo(-26, 2); c.lineTo(-26, 24); c.stroke(); c.restore();
    }],
    ['gift', 'Present', '🎁', [88, 92], '#ff4fa3', '#ffd23f', {}, function (c, L) {
      rr(c, -38, -18, 76, 63, 6); fs(c, L.accent); rr(c, -38, 6, 76, 10, 2); fs(c, L.shirt);
      rr(c, -42, -30, 84, 18, 5); fs(c, shade(L.accent, 1.15)); rr(c, -7, -30, 14, 75, 2); fs(c, L.shirt);
      ell(c, -14, -37, 14, 9, -.4); fs(c, L.shirt); ell(c, 14, -37, 14, 9, .4); fs(c, L.shirt); ell(c, 0, -34, 6, 6); fs(c, shade(L.shirt, .85));
    }],
    ['chest', 'Treasure chest', '💰', [118, 88], '#a8733f', '#ffd23f', {}, function (c, L) {
      [[-26, -26], [-6, -32], [16, -28]].forEach(function (p) { ell(c, p[0], p[1], 10, 5); fs(c, '#ffd23f'); });
      c.beginPath(); c.moveTo(-56, -6); c.lineTo(-56, -22); c.quadraticCurveTo(0, -62, 56, -22); c.lineTo(56, -6); c.closePath(); fs(c, shade(L.accent, 1.1));
      rr(c, -56, -8, 112, 51, 6); fs(c, L.accent);
      [-40, 40].forEach(function (x) { rr(c, x - 6, -8, 12, 51, 2); fs(c, L.shirt); });
      rr(c, -10, -14, 20, 24, 4); fs(c, L.shirt); ell(c, 0, -1, 3, 5); fill(c, INK);
    }],
    ['tree', 'Tree', '🌳', [200, 270], '#3fbf55', '#9b6a3c', {}, function (c, L) {
      rr(c, -15, 20, 30, 115, 6); fs(c, L.shirt);
      blobs(c, [[0, -70, 62], [-52, -20, 48], [52, -20, 48], [0, -10, 56], [-28, -90, 40], [30, -92, 40]], 1, L.accent);
      ell(c, -22, -102, 13, 9, -.4); fill(c, 'rgba(255,255,255,.25)');
      [[-40, -30], [30, -50], [10, 6], [50, -4]].forEach(function (p) { ell(c, p[0], p[1], 7, 7); fs(c, '#ff4f6d'); });
    }],
    ['pine', 'Pine tree', '🌲', [150, 280], '#2f8f5b', '#7a4e2a', {}, function (c, L) {
      rr(c, -11, 100, 22, 40, 4); fs(c, L.shirt);
      for (var i = 0; i < 3; i++) { var yy = 104 - i * 72, w = 72 - i * 16; c.beginPath(); c.moveTo(-w, yy); c.lineTo(0, yy - 104 + i * 6); c.lineTo(w, yy); c.closePath(); fs(c, i === 1 ? shade(L.accent, 1.1) : L.accent); }
    }],
    ['bush', 'Bush', '🌿', [156, 90], '#3fbf55', '#ff4f6d', {}, function (c, L) {
      blobs(c, [[-38, 10, 32], [0, -6, 40], [38, 10, 32], [-60, 24, 18], [60, 24, 18]], 1, L.accent);
      [[-30, -4], [12, -24], [30, 14], [-8, 16], [46, -2]].forEach(function (p) { ell(c, p[0], p[1], 5, 5); fs(c, L.shirt); });
    }],
    ['rock', 'Rock', '🪨', [120, 72], '#9aa3b5', '#7d8597', {}, function (c, L) {
      function shape() { c.beginPath(); c.moveTo(-58, 36); c.lineTo(-50, 0); c.lineTo(-24, -28); c.lineTo(14, -36); c.lineTo(44, -16); c.lineTo(58, 36); c.closePath(); }
      shape(); fill(c, L.accent);
      c.beginPath(); c.moveTo(14, -36); c.lineTo(44, -16); c.lineTo(58, 36); c.lineTo(18, 36); c.lineTo(8, -4); c.closePath(); fill(c, L.shirt);
      shape(); c.stroke(); c.beginPath(); c.moveTo(-30, -6); c.lineTo(-18, 6); c.lineTo(-24, 18); c.stroke();
    }],
    ['flowers', 'Flower pot', '🌷', [84, 126], '#ff4fa3', '#e07a4a', {}, function (c, L) {
      c.save(); c.strokeStyle = '#2fae4f'; c.lineWidth = 5; c.lineCap = 'round';
      [[-22, -30], [0, -44], [22, -26]].forEach(function (p) { c.beginPath(); c.moveTo(0, 8); c.quadraticCurveTo(p[0] * .3, -10, p[0], p[1]); c.stroke(); }); c.restore();
      ell(c, -12, -8, 10, 5, .6); fs(c, '#3fbf55'); ell(c, 12, -4, 10, 5, -.6); fs(c, '#3fbf55');
      [[-22, -30], [0, -44], [22, -26]].forEach(function (p, i) {
        for (var k = 0; k < 5; k++) { var a = k / 5 * PI * 2; ell(c, p[0] + Math.cos(a) * 9, p[1] + Math.sin(a) * 9, 7, 7); fs(c, i === 1 ? '#ffd23f' : L.accent); }
        ell(c, p[0], p[1], 5, 5); fs(c, i === 1 ? '#ff6b6b' : '#ffd23f');
      });
      c.beginPath(); c.moveTo(-30, 14); c.lineTo(30, 14); c.lineTo(22, 62); c.lineTo(-22, 62); c.closePath(); fs(c, L.shirt); rr(c, -34, 6, 68, 14, 4); fs(c, shade(L.shirt, 1.1));
    }],
    ['car', 'Car', '🚗', [210, 112], '#ff3048', '#8fd8ff', {}, function (c, L) {
      c.beginPath(); c.moveTo(-100, 30); c.lineTo(-100, 0); c.quadraticCurveTo(-98, -12, -80, -14); c.lineTo(-48, -16); c.lineTo(-26, -50); c.lineTo(36, -50); c.lineTo(62, -16);
      c.lineTo(88, -12); c.quadraticCurveTo(102, -8, 102, 8); c.lineTo(102, 30); c.closePath(); fs(c, L.accent);
      c.beginPath(); c.moveTo(-38, -18); c.lineTo(-20, -42); c.lineTo(2, -42); c.lineTo(2, -18); c.closePath(); fs(c, L.shirt);
      c.beginPath(); c.moveTo(10, -18); c.lineTo(10, -42); c.lineTo(32, -42); c.lineTo(50, -18); c.closePath(); fs(c, L.shirt);
      c.beginPath(); c.moveTo(6, -14); c.lineTo(6, 26); c.stroke(); rr(c, 14, 0, 14, 5, 2); fs(c, shade(L.accent, .7));
      ell(c, 95, 4, 6, 8); fs(c, '#ffd23f'); rr(c, -103, -2, 7, 12, 2); fs(c, '#ff9a3d');
      [-60, 60].forEach(function (x) { ell(c, x, 34, 22, 22); fs(c, '#3a3f55'); ell(c, x, 34, 10, 10); fs(c, '#c9ced8'); });
    }],
    ['rocket', 'Rocket', '🚀', [96, 210], '#ffffff', '#ff3048', {}, function (c, L, t) {
      var fl = 1 + Math.sin(t * 20) * .15 + Math.sin(t * 31) * .06;
      c.beginPath(); c.moveTo(-16, 58); c.quadraticCurveTo(0, 58 + 46 * fl, 16, 58); c.closePath(); fs(c, '#ffa63d');
      c.beginPath(); c.moveTo(-9, 58); c.quadraticCurveTo(0, 58 + 26 * fl, 9, 58); c.closePath(); fill(c, '#ffd23f');
      [-1, 1].forEach(function (k) { c.beginPath(); c.moveTo(k * 22, 8); c.lineTo(k * 46, 58); c.lineTo(k * 20, 50); c.closePath(); fs(c, L.shirt); });
      function body() { c.beginPath(); c.moveTo(-24, 56); c.lineTo(-26, -30); c.quadraticCurveTo(-24, -80, 0, -100); c.quadraticCurveTo(24, -80, 26, -30); c.lineTo(24, 56); c.closePath(); }
      body(); fill(c, L.accent); c.save(); body(); c.clip(); c.fillStyle = L.shirt; c.fillRect(-30, -110, 60, 42); c.restore(); body(); c.stroke();
      c.beginPath(); c.moveTo(-25, -68); c.quadraticCurveTo(0, -62, 25, -68); c.stroke();
      ell(c, 0, -22, 14, 14); fs(c, '#2fa8ff'); ell(c, -4, -26, 4, 4); fill(c, '#ffffff');
      rr(c, -16, 52, 32, 10, 3); fs(c, '#7d8597');
    }],
    ['boat', 'Sailboat', '⛵', [210, 136], '#ff6b6b', '#ffffff', {}, function (c, L) {
      c.translate(0, 28);
      rr(c, -4, -96, 8, 96, 3); fs(c, '#8d5a3b');
      c.beginPath(); c.moveTo(8, -90); c.quadraticCurveTo(52, -50, 76, -10); c.lineTo(8, -8); c.closePath(); fs(c, L.shirt);
      c.beginPath(); c.moveTo(-8, -78); c.quadraticCurveTo(-40, -44, -58, -10); c.lineTo(-8, -8); c.closePath(); fs(c, shade(L.shirt, .9));
      c.beginPath(); c.moveTo(4, -96); c.lineTo(30, -88); c.lineTo(4, -80); c.closePath(); fs(c, L.accent);
      function hull() { c.beginPath(); c.moveTo(-100, -4); c.lineTo(100, -4); c.lineTo(76, 40); c.lineTo(-76, 40); c.closePath(); }
      hull(); fill(c, L.accent); c.save(); hull(); c.clip(); c.fillStyle = '#ffffff'; c.fillRect(-100, 4, 200, 8); c.restore(); hull(); c.stroke();
      [-40, 0, 40].forEach(function (x) { ell(c, x, 24, 6, 6); fs(c, '#8fd8ff'); });
    }],
    ['skateboard', 'Skateboard', '🛹', [150, 44], '#c26bff', '#ffd23f', { rec: 'idle' }, function (c, L) {
      c.translate(0, -3);
      rr(c, -48, 0, 20, 7, 2); fs(c, '#7d8597'); rr(c, 28, 0, 20, 7, 2); fs(c, '#7d8597');
      [-38, 38].forEach(function (x) { ell(c, x, 12, 9, 9); fs(c, L.shirt); });
      c.beginPath(); c.moveTo(-74, -22); c.quadraticCurveTo(-70, -10, -56, -10); c.lineTo(56, -10); c.quadraticCurveTo(70, -10, 74, -22); c.lineTo(78, -18); c.quadraticCurveTo(74, 2, 56, 2); c.lineTo(-56, 2); c.quadraticCurveTo(-74, 2, -78, -18); c.closePath(); fs(c, L.accent);
      c.fillStyle = L.shirt; [[-30, 0], [-6, 1], [18, 0]].forEach(function (p) { c.beginPath(); c.moveTo(p[0], -8); c.lineTo(p[0] + 14, -8); c.lineTo(p[0] + 8, -1); c.closePath(); c.fill(); });
    }],
    ['cake', 'Birthday cake', '🎂', [112, 122], '#ffb3d9', '#2fa8ff', {}, function (c, L, t) {
      c.translate(0, 4);
      ell(c, 0, 50, 56, 7); fs(c, '#ffffff');
      rr(c, -46, 4, 92, 44, 8); fs(c, L.accent); rr(c, -30, -26, 60, 32, 8); fs(c, L.accent);
      [[-46, 4, 92], [-30, -26, 60]].forEach(function (r) { c.beginPath(); c.moveTo(r[0] + 4, r[1] + 2); c.lineTo(r[0] + r[2] - 4, r[1] + 2); c.lineTo(r[0] + r[2] - 2, r[1] + 10);
        for (var x = r[0] + r[2] - 2; x > r[0] + 2; x -= 14) c.quadraticCurveTo(x - 7, r[1] + 20, x - 14, r[1] + 10); c.closePath(); fs(c, '#ffffff'); });
      [['#ffd23f', -30, 30], ['#1fbf63', 20, 34], ['#c26bff', -6, 38], ['#ff4f6d', 34, 22], ['#2fa8ff', -36, 20]].forEach(function (s) { c.fillStyle = s[0]; c.fillRect(s[1], s[2], 6, 3); });
      [-14, 0, 14].forEach(function (x) {
        rr(c, x - 3, -46, 6, 20, 2); fs(c, L.shirt);
        var fl = 1 + Math.sin(t * 15 + x) * .15; c.beginPath(); c.moveTo(x - 4, -47); c.quadraticCurveTo(x - 1, -47 - 16 * fl, x + 4, -47); c.closePath(); fs(c, '#ffd23f');
      });
    }],
    ['pizza', 'Pizza slice', '🍕', [96, 110], '#ff4f6d', '#e8b26a', {}, function (c, L) {
      c.translate(0, 4);
      c.beginPath(); c.moveTo(-42, -38); c.quadraticCurveTo(0, -50, 42, -38); c.lineTo(0, 46); c.closePath(); fs(c, '#ffd23f');
      thick(c, 11, L.shirt, function () { c.beginPath(); c.moveTo(-42, -40); c.quadraticCurveTo(0, -54, 42, -40); });
      [[-14, -22], [13, -16], [0, 8], [-2, -34]].forEach(function (p) { ell(c, p[0], p[1], 8, 8); fs(c, L.accent); });
      ell(c, 9, 30, 4, 7); fill(c, '#ffd23f');
    }],
    ['apple', 'Apple', '🍎', [70, 72], '#ff3048', '#3fbf55', {}, function (c, L) {
      c.beginPath(); c.moveTo(0, -20); c.bezierCurveTo(-36, -38, -44, 10, -14, 32); c.quadraticCurveTo(0, 38, 14, 32); c.bezierCurveTo(44, 10, 36, -38, 0, -20); c.closePath(); fs(c, L.accent);
      c.save(); c.lineWidth = 4.5; c.beginPath(); c.moveTo(0, -20); c.quadraticCurveTo(2, -30, 6, -34); c.stroke(); c.restore();
      ell(c, 15, -29, 11, 5, -.4); fs(c, L.shirt); ell(c, -14, -8, 5, 9, .3); fill(c, 'rgba(255,255,255,.5)');
    }],
    ['campfire', 'Campfire', '🔥', [130, 124], '#ffa63d', '#8d5a3b', {}, function (c, L, t) {
      var f1 = 1 + Math.sin(t * 11) * .12, f2 = 1 + Math.sin(t * 17 + 1) * .15;
      c.beginPath(); c.moveTo(-32, 34); c.quadraticCurveTo(-44, 0, -18, -30 * f2); c.quadraticCurveTo(-12, -6, 0, -58 * f1); c.quadraticCurveTo(12, -10, 20, -36 * f2); c.quadraticCurveTo(44, 0, 32, 34); c.closePath(); fs(c, L.accent);
      c.beginPath(); c.moveTo(-18, 34); c.quadraticCurveTo(-22, 6, -6, -16 * f2); c.quadraticCurveTo(0, -32 * f1, 8, -12); c.quadraticCurveTo(22, 8, 18, 34); c.closePath(); fill(c, '#ffd23f');
      c.save(); c.translate(0, 40); [-.3, .3].forEach(function (a) { c.save(); c.rotate(a); rr(c, -46, -9, 92, 18, 9); fs(c, L.shirt); ell(c, 44, 0, 6, 8); fs(c, shade(L.shirt, 1.4)); c.restore(); }); c.restore();
      [-48, -24, 0, 24, 48].forEach(function (x) { ell(c, x, 54, 13, 8); fs(c, '#9aa3b5'); });
      for (var i = 0; i < 3; i++) { var k = (t * .8 + i / 3) % 1; ell(c, Math.sin(i * 5 + t * 2) * 18, -46 - k * 40, 3, 3); fill(c, 'rgba(255,210,63,' + (1 - k).toFixed(2) + ')'); }
    }],
    ['table', 'Table', '🪑', [170, 126], '#c8814a', '#ffffff', {}, function (c, L) {
      c.translate(0, 14);
      [-66, 54].forEach(function (x) { rr(c, x, -24, 12, 72, 3); fs(c, shade(L.accent, .8)); });
      rr(c, -82, -40, 164, 18, 6); fs(c, L.accent);
      rr(c, -10, -64, 20, 26, 7); fs(c, L.shirt); ell(c, 0, -70, 7, 7); fs(c, '#ff4fa3'); ell(c, 0, -70, 2.5, 2.5); fill(c, '#ffd23f');
    }],
    ['chair', 'Chair', '💺', [86, 136], '#ff8a2b', '#ffd23f', {}, function (c, L) {
      rr(c, -38, -68, 14, 110, 5); fs(c, L.accent); rr(c, -24, -60, 10, 46, 5); fs(c, L.shirt);
      rr(c, 28, 8, 10, 60, 3); fs(c, shade(L.accent, .85)); rr(c, -38, 8, 10, 60, 3); fs(c, shade(L.accent, .85));
      rr(c, -38, -4, 76, 14, 4); fs(c, L.accent); rr(c, -26, -14, 62, 12, 6); fs(c, L.shirt);
    }],
    ['lamp', 'Street lamp', '💡', [80, 310], '#3a3f55', '#fff2a8', {}, function (c, L, t) {
      c.save(); c.globalAlpha = .28 + Math.sin(t * 3) * .05; ell(c, 0, -108, 46, 34); fill(c, L.shirt); c.restore();
      rr(c, -22, 140, 44, 15, 5); fs(c, L.accent); rr(c, -6, -120, 12, 262, 4); fs(c, L.accent);
      ell(c, 0, -114, 14, 10); fs(c, L.shirt);
      c.beginPath(); c.moveTo(-26, -122); c.lineTo(26, -122); c.lineTo(16, -150); c.lineTo(-16, -150); c.closePath(); fs(c, L.accent); ell(c, 0, -152, 8, 5); fs(c, L.accent);
    }],
    ['sign', 'Arrow sign', '🪧', [120, 150], '#ffd23f', '#c8814a', {}, function (c, L) {
      rr(c, -7, -30, 14, 105, 3); fs(c, L.shirt);
      c.beginPath(); c.moveTo(-52, -70); c.lineTo(30, -70); c.lineTo(58, -46); c.lineTo(30, -22); c.lineTo(-52, -22); c.closePath(); fs(c, L.accent);
      c.save(); c.lineWidth = 5; c.strokeStyle = shade(L.accent, .6); c.beginPath(); c.moveTo(-40, -52); c.lineTo(16, -52); c.moveTo(-40, -38); c.lineTo(4, -38); c.stroke(); c.restore();
    }],
    ['house', 'House', '🏠', [250, 240], '#ff9ec2', '#4757ff', {}, function (c, L) {
      rr(c, 48, -110, 24, 60, 3); fs(c, '#c9ced8');
      rr(c, -100, -20, 200, 140, 6); fs(c, L.accent);
      c.beginPath(); c.moveTo(-122, -14); c.lineTo(0, -118); c.lineTo(122, -14); c.closePath(); fs(c, L.shirt);
      rr(c, -22, 50, 44, 70, 6); fs(c, '#8d5a3b'); ell(c, 12, 88, 3.5, 3.5); fill(c, '#ffd23f');
      [-74, 34].forEach(function (x) { rr(c, x, 4, 40, 36, 4); fs(c, '#8fd8ff'); c.beginPath(); c.moveTo(x + 20, 4); c.lineTo(x + 20, 40); c.moveTo(x, 22); c.lineTo(x + 40, 22); c.stroke(); });
      ell(c, 0, -52, 14, 14); fs(c, '#8fd8ff');
    }],
    ['snowman', 'Snowman', '⛄', [124, 202], '#ff3048', '#3a3f55', {}, function (c, L) {
      c.translate(0, 11);
      c.save(); c.strokeStyle = '#8d5a3b'; c.lineWidth = 5; c.lineCap = 'round'; c.beginPath(); c.moveTo(-28, -18); c.lineTo(-58, -44); c.moveTo(-48, -36); c.lineTo(-54, -54); c.moveTo(28, -18); c.lineTo(58, -40); c.stroke(); c.restore();
      ell(c, 0, 50, 44, 40); fs(c, '#ffffff'); ell(c, 0, -12, 34, 32); fs(c, '#ffffff'); ell(c, 0, -62, 24, 22); fs(c, '#ffffff');
      [-18, -4, 10].forEach(function (y) { ell(c, 0, y, 3.5, 3.5); fill(c, INK); });
      rr(c, -24, -46, 48, 10, 5); fs(c, L.accent); rr(c, 6, -42, 11, 30, 4); fs(c, L.accent);
      ell(c, -8, -66, 3, 3); fill(c, INK); ell(c, 9, -66, 3, 3); fill(c, INK);
      c.beginPath(); c.moveTo(1, -60); c.lineTo(24, -56); c.lineTo(1, -53); c.closePath(); fs(c, '#ff8a2b');
      rr(c, -24, -88, 48, 8, 3); fs(c, L.shirt); rr(c, -15, -112, 30, 26, 3); fs(c, L.shirt); c.fillStyle = L.accent; c.fillRect(-13, -92, 26, 5);
    }],
    ['pumpkin', 'Jack-o\'-lantern', '🎃', [100, 90], '#ff8a2b', '#ffd23f', {}, function (c, L, t) {
      rr(c, -6, -46, 12, 16, 3); fs(c, '#3fae4f');
      ell(c, -22, 4, 26, 36); fs(c, shade(L.accent, .88)); ell(c, 22, 4, 26, 36); fs(c, shade(L.accent, .88)); ell(c, 0, 4, 24, 38); fs(c, L.accent);
      c.save(); c.globalAlpha = .78 + Math.sin(t * 8) * .12 + Math.sin(t * 13) * .06; c.fillStyle = L.shirt;
      [[-18, -6], [6, -6]].forEach(function (p) { c.beginPath(); c.moveTo(p[0], p[1]); c.lineTo(p[0] + 12, p[1]); c.lineTo(p[0] + 6, p[1] - 12); c.closePath(); c.fill(); });
      c.beginPath(); c.moveTo(-22, 10); c.lineTo(-14, 16); c.lineTo(-8, 10); c.lineTo(0, 17); c.lineTo(8, 10); c.lineTo(14, 16); c.lineTo(22, 10); c.quadraticCurveTo(0, 36, -22, 10); c.closePath(); c.fill();
      c.restore();
    }],
    ['trophy', 'Trophy', '🏆', [100, 108], '#ffd23f', '#8d5a3b', {}, function (c, L) {
      c.translate(0, -4);
      thick(c, 4, L.accent, function () { c.beginPath(); c.arc(-34, -26, 14, PI * .5, PI * 1.5); c.moveTo(34, -40); c.arc(34, -26, 14, -PI * .5, PI * .5); });
      rr(c, -30, 40, 60, 18, 4); fs(c, L.shirt); rr(c, -8, 18, 16, 24, 3); fs(c, L.accent);
      c.beginPath(); c.moveTo(-34, -50); c.lineTo(34, -50); c.quadraticCurveTo(32, 20, 0, 22); c.quadraticCurveTo(-32, 20, -34, -50); c.closePath(); fs(c, L.accent);
      star(c, 0, -18, 13); fs(c, '#ffffff'); ell(c, -18, -30, 4, 10, .2); fill(c, 'rgba(255,255,255,.5)');
    }],
    ['blocks', 'Toy bricks', '🧱', [116, 94], '#ff3048', '#2fa8ff', {}, function (c, L) {
      c.translate(0, -10);
      function brick(x, y, w, h, col) { for (var sx = x + 14; sx < x + w - 6; sx += 28) { rr(c, sx - 8, y - 8, 16, 10, 3); fs(c, col); } rr(c, x, y, w, h, 5); fs(c, col); c.fillStyle = 'rgba(255,255,255,.25)'; c.fillRect(x + 4, y + 4, w - 8, 6); }
      brick(-56, 14, 56, 42, L.accent); brick(0, 14, 56, 42, L.shirt); brick(-28, -28, 56, 42, '#ffd23f');
    }],
    ['drum', 'Drum', '🥁', [100, 110], '#ff3048', '#ffffff', {}, function (c, L) {
      c.translate(0, 7);
      rr(c, -46, -20, 92, 64, 8); fs(c, L.accent);
      c.save(); rr(c, -46, -20, 92, 64, 8); c.clip(); c.beginPath(); for (var i = 0; i < 6; i++) { c.moveTo(-44 + i * 16, -14); c.lineTo(-36 + i * 16, 38); c.lineTo(-28 + i * 16, -14); } c.stroke(); c.restore();
      rr(c, -48, 38, 96, 9, 4); fs(c, '#ffd23f'); ell(c, 0, -20, 46, 12); fs(c, L.shirt);
      thick(c, 4, '#c8814a', function () { c.beginPath(); c.moveTo(-30, -58); c.lineTo(8, -28); c.moveTo(30, -60); c.lineTo(-6, -30); });
    }],
    ['portal', 'Magic portal', '🌀', [150, 210], '#c26bff', '#22d3c5', {}, function (c, L, t) {
      ell(c, 0, 0, 64, 96); fill(c, L.accent);
      c.save(); ell(c, 0, 0, 62, 94); c.clip(); c.rotate(t * 2);
      for (var k = 0; k < 4; k++) { c.rotate(PI / 2); c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(60, -20, 40, -110); c.lineTo(10, -110); c.quadraticCurveTo(30, -20, 0, 0); c.fillStyle = L.shirt; c.fill(); }
      c.restore();
      c.save(); c.globalAlpha = .85; ell(c, 0, 0, 14, 20); fill(c, '#ffffff'); c.restore();
      c.save(); c.lineWidth = 13; c.strokeStyle = INK; ell(c, 0, 0, 66, 98); c.stroke(); c.lineWidth = 7; c.strokeStyle = '#9aa3b5'; c.stroke(); c.restore();
      for (var s = 0; s < 4; s++) { var a = t * 1.5 + s * PI / 2; star(c, Math.cos(a) * 78, Math.sin(a) * 106 * .9, 7); fill(c, '#ffd23f'); }
    }],
    ['ufo', 'UFO', '🛸', [196, 82], '#8fd8ff', '#c9ced8', { air: true, idle: 'float' }, function (c, L, t) {
      c.translate(0, 15);
      c.beginPath(); c.ellipse(0, -12, 46, 42, 0, PI, 0); c.closePath(); fs(c, L.accent);
      ell(c, 0, -24, 14, 13); fs(c, '#9be15d'); ell(c, -5, -26, 3, 4); fill(c, INK); ell(c, 5, -26, 3, 4); fill(c, INK);
      c.save(); c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = 4; c.beginPath(); c.arc(0, -12, 36, PI * 1.15, PI * 1.4); c.stroke(); c.restore();
      ell(c, 0, 0, 96, 24); fs(c, L.shirt); ell(c, 0, 9, 58, 9); fill(c, shade(L.shirt, .8));
      for (var i = 0; i < 6; i++) { var on = (Math.floor(t * 6) + i) % 3 === 0; ell(c, -70 + i * 28, -1, 6, 6); fs(c, on ? '#ffd23f' : '#ff4fa3'); }
    }],
    ['cloud', 'Cloud', '☁️', [220, 110], '#ffffff', '#dfe8ff', { air: true, idle: 'float' }, function (c, L) {
      c.translate(0, 7);
      blobs(c, [[-50, 10, 38], [0, -12, 50], [52, 8, 40], [-86, 24, 22], [88, 24, 22]], 1, L.accent);
      c.save(); c.beginPath(); [[-50, 10, 38], [0, -12, 50], [52, 8, 40]].forEach(function (p) { c.moveTo(p[0] + p[2], p[1]); c.arc(p[0], p[1], p[2], 0, PI * 2); }); c.clip(); ell(c, 0, 52, 120, 24); fill(c, L.shirt); c.restore();
      face(c, 0, 4, 1);
    }],
    ['sun', 'Sun', '☀️', [150, 150], '#ffd23f', '#ff8a2b', { air: true }, function (c, L, t) {
      c.save(); c.rotate(t * .6); for (var i = 0; i < 12; i++) { c.rotate(PI / 6); c.beginPath(); c.moveTo(54, -9); c.lineTo(74, 0); c.lineTo(54, 9); c.closePath(); fs(c, L.shirt); } c.restore();
      ell(c, 0, 0, 50, 50); fs(c, L.accent); face(c, 0, 4, 1.4); ell(c, -30, 14, 7, 4); fill(c, 'rgba(255,90,120,.35)'); ell(c, 30, 14, 7, 4); fill(c, 'rgba(255,90,120,.35)');
    }],
    ['moon', 'Moon', '🌙', [120, 120], '#fff3c4', '#efe0a6', { air: true }, function (c, L) {
      ell(c, 0, 0, 56, 56); fs(c, L.accent);
      [[-22, -20, 12, 10], [24, 18, 9, 8], [12, -30, 6, 5], [-26, 26, 7, 6]].forEach(function (p) { ell(c, p[0], p[1], p[2], p[3]); fill(c, L.shirt); });
      c.save(); c.lineWidth = 3.6; c.beginPath(); c.arc(-14, 2, 8, PI * .1, PI * .9); c.moveTo(24, 3); c.arc(16, 2, 8, PI * .1, PI * .9); c.stroke(); c.beginPath(); c.arc(1, 16, 7, PI * .2, PI * .8); c.stroke(); c.restore();
    }],
    ['star', 'Star', '⭐', [100, 96], '#ffd23f', '#ffffff', { air: true, idle: 'float' }, function (c, L, t) {
      var p = 1 + Math.sin(t * 4) * .05; c.scale(p, p);
      star(c, 0, 4, 50); fs(c, L.accent); face(c, 0, 6, .8); ell(c, -20, -12, 6, 3, -.6); fill(c, L.shirt);
    }],
    ['heart', 'Heart', '❤️', [96, 84], '#ff4f6d', '#ffffff', { air: true, idle: 'float' }, function (c, L, t) {
      var p = 1 + Math.max(0, Math.sin(t * 6)) * .08; c.scale(p, p);
      c.beginPath(); c.moveTo(0, 40); c.bezierCurveTo(-60, 0, -46, -48, 0, -22); c.bezierCurveTo(46, -48, 60, 0, 0, 40); c.closePath(); fs(c, L.accent);
      ell(c, -22, -16, 9, 5, -.6); fill(c, L.shirt);
    }],
    ['balloons', 'Balloons', '🎈', [120, 210], '#ff4fa3', '#2fa8ff', { air: true, idle: 'float' }, function (c, L, t) {
      var bs = [[-32, -40, L.accent], [30, -50, L.shirt], [0, -70, '#ffd23f']].map(function (b, i) { return [b[0] + Math.sin(t * 2 + i) * 4, b[1], b[2]]; });
      c.save(); c.lineWidth = 2; bs.forEach(function (b) { c.beginPath(); c.moveTo(0, 100); c.quadraticCurveTo(b[0] * .4, 40, b[0], b[1] + 38); c.stroke(); }); c.restore();
      bs.forEach(function (b) { c.beginPath(); c.moveTo(b[0] - 5, b[1] + 42); c.lineTo(b[0], b[1] + 35); c.lineTo(b[0] + 5, b[1] + 42); c.closePath(); fs(c, b[2]);
        ell(c, b[0], b[1], 30, 37); fs(c, b[2]); ell(c, b[0] - 11, b[1] - 13, 6, 10, .4); fill(c, 'rgba(255,255,255,.55)'); });
    }],
    ['rainbow', 'Rainbow', '🌈', [290, 152], '#ff4f6d', '#ffffff', { air: true }, function (c, L) {
      c.translate(0, -4);
      [L.accent, '#ffa63d', '#ffd23f', '#1fbf63', '#2fa8ff', '#7a6bff'].forEach(function (col, i) { c.beginPath(); c.arc(0, 60, 120 - i * 14, PI, 0); c.save(); c.lineWidth = 14.5; c.strokeStyle = col; c.stroke(); c.restore(); });
      c.beginPath(); c.arc(0, 60, 127, PI, 0); c.stroke(); c.beginPath(); c.arc(0, 60, 43, PI, 0); c.stroke();
      [-1, 1].forEach(function (k) { blobs(c, [[k * 86, 62, 24], [k * 112, 68, 18], [k * 62, 70, 18]], 1, L.shirt); });
    }]
  ];

  TL.PROP_DEFS = {};
  PROPS.forEach(function (p) { TL.PROP_DEFS[p[0]] = { id: p[0], name: p[1], emoji: p[2], box: p[3], c1: p[4], c2: p[5], air: !!p[6].air, idle: p[6].idle || 'idle', rec: p[6].rec || 'idle', draw: p[7] }; });
  TL.propDef = function (ch) { return ch && ch.rig === 'prop' ? TL.PROP_DEFS[(ch.look || {}).prop] || null : null; };
  TL.propBox = function (ch) { var d = TL.propDef(ch); return d ? d.box : [80, 80]; };
  TL.isAir = function (ch) { var d = TL.propDef(ch); return !!(d && d.air); };
  TL.drawProp = function (ctx, id, L, t) {
    var d = TL.PROP_DEFS[id]; if (!d) return;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.lineWidth = 3.2; ctx.strokeStyle = INK;
    try { d.draw(ctx, L, t || 0); } catch (e) { if (window.console) console.error(e); }
  };

  /* The props as premade characters on the 'prop' rig: TL.PRESETS['p_o_ball'] etc. (not in TL.PRESET_LIST: the cast lists stay people). */
  TL.newProp = function (d) {
    return { id: 'p_o_' + d.id, name: d.name, v: 1, rig: 'prop', starter: 'prop', preset: true,
      look: Object.assign({}, TL.DEFAULT_LOOK, { prop: d.id, accent: d.c1, shirt: d.c2 }), bones: R.RIGS.prop(), anims: TL.starterAnims('prop') };
  };
  TL.PROP_LIST = PROPS.map(function (p) { var ch = TL.newProp(TL.PROP_DEFS[p[0]]); TL.PRESETS[ch.id] = ch; return ch; });
  TL.isProp = function (ch) { return !!ch && ch.rig === 'prop'; };
})();
