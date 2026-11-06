/* _tl_scenes: the premade backgrounds (30), drawn in code at 1280x720 (so they're crisp, free and match the style),
     plain colours, and drawing any background (premade "b:park", colour "c:#88ccff", or an uploaded picture's id). */
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

  function cactus(ctx, x, y, s) {
    var g = '#3fae5a'; line(ctx, 4);
    rr(ctx, x - 64 * s, y - 120 * s, 24 * s, 64 * s, 12 * s); fs(ctx, g); rr(ctx, x - 64 * s, y - 72 * s, 60 * s, 22 * s, 11 * s); fs(ctx, g);
    rr(ctx, x + 40 * s, y - 150 * s, 24 * s, 60 * s, 12 * s); fs(ctx, g); rr(ctx, x + 4 * s, y - 106 * s, 60 * s, 22 * s, 11 * s); fs(ctx, g);
    rr(ctx, x - 20 * s, y - 170 * s, 40 * s, 172 * s, 20 * s); fs(ctx, g);
    ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - 6 * s, y - 150 * s); ctx.lineTo(x - 6 * s, y - 10 * s); ctx.moveTo(x + 8 * s, y - 150 * s); ctx.lineTo(x + 8 * s, y - 10 * s); ctx.stroke();
    line(ctx);
  }
  function leaf(ctx, x, y, ang, len, col) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang); line(ctx, 3);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(len * .5, -len * .28, len, 0); ctx.quadraticCurveTo(len * .5, len * .28, 0, 0); ctx.closePath(); fs(ctx, col);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(len * .95, 0); ctx.stroke(); ctx.restore();
  }
  function fern(ctx, x, y, s) { [-2.6, -2.2, -1.8, -1.35, -.95, -.55].forEach(function (a, i) { leaf(ctx, x, y, a, (120 + (i % 2) * 30) * s, i % 2 ? '#2fae4f' : '#3fbf55'); }); }
  function palm(ctx, x, y, s) {
    line(ctx); ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    for (var i = 0; i < 6; i++) { rr(ctx, -14 + i * 3, -60 - i * 50, 30, 56, 8); fs(ctx, i % 2 ? '#a8733f' : '#9b6a3c'); }
    [-2.6, -1.9, -1.2, -.5, -3.3].forEach(function (a, i) { ctx.save(); ctx.translate(14, -312); ctx.rotate(a); ctx.beginPath(); ctx.ellipse(80, 0, 86, 24, 0, 0, Math.PI * 2); fs(ctx, i % 2 ? '#2fae4f' : '#3fbf55'); ctx.restore(); });
    ctx.restore();
  }
  function cloudBank(ctx, list, c) {  // overlapping puffs with one outline
    line(ctx, 8); ctx.beginPath(); list.forEach(function (p) { ctx.moveTo(p[0] + p[2], p[1]); ctx.arc(p[0], p[1], p[2], 0, Math.PI * 2); }); ctx.stroke(); f(ctx, c); line(ctx);
  }
  function crystals(ctx, x, y, s, col) {
    ctx.save(); ctx.globalAlpha = .22; circ(ctx, x, y - 60 * s, 110 * s); f(ctx, col); ctx.restore();
    [[-60, 44, -.6], [58, 50, .55], [-34, 70, -.35], [32, 86, .3], [0, 120, 0]].forEach(function (k) {
      ctx.save(); ctx.translate(x + k[0] * s, y); ctx.rotate(k[2]); var w = 18 * s, h = k[1] * s;
      line(ctx, 3); ctx.beginPath(); ctx.moveTo(-w, 0); ctx.lineTo(-w, -h * .75); ctx.lineTo(0, -h); ctx.lineTo(w, -h * .75); ctx.lineTo(w, 0); ctx.closePath(); fs(ctx, col);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -h); ctx.lineTo(w, -h * .75); ctx.lineTo(w, 0); ctx.closePath(); f(ctx, 'rgba(255,255,255,.3)');
      ctx.restore();
    });
  }
  function cabinet(ctx, x, col, i) {  // an arcade machine
    line(ctx); ctx.beginPath(); ctx.moveTo(x, 600); ctx.lineTo(x, 300); ctx.lineTo(x + 20, 280); ctx.lineTo(x + 130, 280); ctx.lineTo(x + 150, 300); ctx.lineTo(x + 150, 600); ctx.closePath(); fs(ctx, col);
    rr(ctx, x + 10, 290, 130, 30, 6); fs(ctx, TL.shade(col, 1.35));
    rr(ctx, x + 18, 334, 114, 100, 8); fs(ctx, '#0b0f2a');
    var r = rng(i + 5); for (var k = 0; k < 12; k++) { ctx.fillStyle = ['#ffd23f', '#22d3c5', '#ff4fa3', '#9be15d'][k % 4]; ctx.fillRect(x + 28 + Math.floor(r() * 9) * 10, 344 + Math.floor(r() * 8) * 10, 10, 10); }
    ctx.save(); ctx.globalAlpha = .18; ctx.fillStyle = '#8fd8ff'; ctx.fillRect(x + 18, 334, 114, 100); ctx.restore();
    ctx.beginPath(); ctx.moveTo(x - 6, 450); ctx.lineTo(x + 156, 450); ctx.lineTo(x + 150, 490); ctx.lineTo(x, 490); ctx.closePath(); fs(ctx, TL.shade(col, .8));
    rr(ctx, x + 36, 432, 6, 26, 3); fs(ctx, '#3a3f55'); circ(ctx, x + 39, 430, 10); fs(ctx, '#ff3048');
    circ(ctx, x + 92, 466, 8); fs(ctx, '#ffd23f'); circ(ctx, x + 116, 466, 8); fs(ctx, '#22d3c5');
    rr(ctx, x + 64, 530, 22, 30, 4); fs(ctx, '#3a3f55');
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
    }],
    ['desert', 'Desert Dunes', '🏜️', function (ctx) {
      sky(ctx, '#ffb86b', '#ffe7b3'); sun(ctx, 1010, 150, 70, '#fff1a8');
      [[330, 290, 150], [520, 330, 100]].forEach(function (p) { line(ctx, 3); ctx.beginPath(); ctx.moveTo(p[0] - p[2], 480); ctx.lineTo(p[0], p[1]); ctx.lineTo(p[0] + p[2], 480); ctx.closePath(); fs(ctx, '#e8b26a');
        ctx.beginPath(); ctx.moveTo(p[0], p[1] + 3); ctx.lineTo(p[0] + p[2] - 3, 478); ctx.lineTo(p[0] + p[2] * .25, 478); ctx.closePath(); f(ctx, '#d39a52'); });
      hill(ctx, 200, 520, 460, 110, '#f6c77a'); hill(ctx, 990, 530, 520, 150, '#efbb6a');
      ground(ctx, 540, '#f6d08a', '#ecc073');
      cactus(ctx, 760, 528, .6); cactus(ctx, 150, 575, 1); cactus(ctx, 1130, 590, 1.2);
      [[420, 640, 30], [930, 690, 22], [560, 700, 14]].forEach(function (r) { line(ctx, 3); ctx.beginPath(); ctx.ellipse(r[0], r[1], r[2] * 1.5, r[2], 0, Math.PI, 0); ctx.closePath(); fs(ctx, '#c49a6c'); });
      var r = rng(41); ctx.strokeStyle = 'rgba(190,130,60,.35)'; ctx.lineWidth = 3; for (var i = 0; i < 14; i++) { var x = r() * W, y = 560 + r() * 150; ctx.beginPath(); ctx.arc(x, y, 30, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); }
    }],
    ['jungle', 'Jungle', '🌴', function (ctx) {
      sky(ctx, '#7fe0b0', '#d7f7c8');
      var r = rng(17); for (var i = 0; i < 16; i++) { circ(ctx, r() * W, 40 + r() * 160, 70 + r() * 60); f(ctx, i % 2 ? '#2f9e5a' : '#38ad62'); }
      [[150, 30], [420, 24], [880, 28], [1150, 34]].forEach(function (t) { line(ctx, 3); rr(ctx, t[0] - t[1] / 2, 150, t[1], 420, 8); fs(ctx, '#7a5434'); });
      line(ctx); ctx.beginPath(); ctx.moveTo(480, 560); ctx.lineTo(500, 120); ctx.lineTo(560, 90); ctx.lineTo(720, 90); ctx.lineTo(790, 130); ctx.lineTo(800, 560); ctx.closePath(); fs(ctx, '#8a8f9e');
      rr(ctx, 570, 96, 140, 460, 14); fs(ctx, '#7fd3ff');
      ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 6; for (var j = 0; j < 7; j++) { ctx.beginPath(); ctx.moveTo(590 + j * 18, 110 + (j % 3) * 30); ctx.lineTo(590 + j * 18, 530 - (j % 2) * 40); ctx.stroke(); }
      ground(ctx, 560, '#4cb04a', '#3f9e3e');
      line(ctx, 3); ctx.beginPath(); ctx.ellipse(640, 586, 230, 32, 0, 0, Math.PI * 2); fs(ctx, '#4cc3ff'); ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fillRect(560, 582, 70, 5); ctx.fillRect(680, 592, 50, 5);
      ctx.strokeStyle = '#2f8a3a'; ctx.lineWidth = 5; [[90, 220], [330, 170], [940, 260], [1210, 200]].forEach(function (v) { ctx.beginPath(); ctx.moveTo(v[0], 0); ctx.bezierCurveTo(v[0] + 30, v[1] * .4, v[0] - 30, v[1] * .7, v[0] + 10, v[1]); ctx.stroke();
        for (var k = 1; k < 4; k++) { ctx.save(); ctx.translate(v[0] + (k % 2 ? 8 : -6), v[1] * k / 4); ctx.rotate(k % 2 ? .6 : -.6); ctx.beginPath(); ctx.ellipse(10, 0, 12, 5, 0, 0, Math.PI * 2); f(ctx, '#3fbf55'); ctx.restore(); } });
      leaf(ctx, -20, 720, -1.0, 260, '#2fae4f'); leaf(ctx, 40, 730, -.55, 220, '#3fbf55'); leaf(ctx, 1300, 720, -2.2, 260, '#2fae4f'); leaf(ctx, 1240, 730, -2.6, 220, '#3fbf55');
      [[300, 610], [1000, 630], [180, 680]].forEach(function (p) { for (var k = 0; k < 5; k++) { var a = k / 5 * Math.PI * 2; circ(ctx, p[0] + Math.cos(a) * 11, p[1] + Math.sin(a) * 11, 9); f(ctx, '#ff4f6d'); } circ(ctx, p[0], p[1], 5); f(ctx, '#ffd23f'); });
    }],
    ['farm', 'Happy Farm', '🚜', function (ctx) {
      sky(ctx, '#8fd6ff', '#e8f8ff'); sun(ctx, 1150, 100, 46, '#ffd23f', true); cloud(ctx, 160, 100, .9); cloud(ctx, 560, 70, .7);
      hill(ctx, 300, 470, 520, 140, '#8fd86a'); hill(ctx, 1000, 470, 440, 110, '#9be15d');
      ctx.strokeStyle = 'rgba(80,140,40,.35)'; ctx.lineWidth = 4; for (var i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(-20, 400 + i * 12); ctx.quadraticCurveTo(300, 360 + i * 14, 620, 410 + i * 10); ctx.stroke(); }
      line(ctx); rr(ctx, 1080, 210, 90, 300, 10); fs(ctx, '#c9ced8'); ctx.beginPath(); ctx.ellipse(1125, 212, 45, 36, 0, Math.PI, 0); fs(ctx, '#e8473f');
      ctx.beginPath(); ctx.moveTo(740, 300); ctx.lineTo(890, 190); ctx.lineTo(1040, 300); ctx.closePath(); fs(ctx, '#8d2a24');
      rr(ctx, 760, 290, 260, 230, 4); fs(ctx, '#e8473f');
      rr(ctx, 840, 390, 100, 130, 4); fs(ctx, '#c9302a'); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(846, 396); ctx.lineTo(934, 514); ctx.moveTo(934, 396); ctx.lineTo(846, 514); ctx.stroke(); ctx.strokeRect(846, 396, 88, 118);
      line(ctx); rr(ctx, 860, 310, 60, 50, 4); fs(ctx, '#ffd23f');
      ground(ctx, 520, '#7ed957', '#6ccb4b');
      for (var fx = -10; fx < 620; fx += 70) { line(ctx, 3); rr(ctx, fx, 470, 14, 80, 3); fs(ctx, '#ffffff'); }
      line(ctx, 3); rr(ctx, -10, 486, 630, 12, 4); fs(ctx, '#ffffff'); rr(ctx, -10, 516, 630, 12, 4); fs(ctx, '#ffffff');
      [[330, 600], [440, 620]].forEach(function (h) { line(ctx); rr(ctx, h[0], h[1] - 56, 100, 60, 18); fs(ctx, '#f2c94c'); ctx.strokeStyle = 'rgba(160,110,20,.5)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(h[0] + 30, h[1] - 54); ctx.lineTo(h[0] + 30, h[1] + 2); ctx.moveTo(h[0] + 70, h[1] - 54); ctx.lineTo(h[0] + 70, h[1] + 2); ctx.stroke(); });
      flowers(ctx, 560, 710, 26, 44);
    }],
    ['playground', 'Playground', '🛝', function (ctx) {
      sky(ctx, '#7ccfff', '#d8f3ff'); cloud(ctx, 220, 110, 1); cloud(ctx, 860, 80, .8);
      roundTree(ctx, 600, 470, 1.1); roundTree(ctx, 1220, 480, .9, '#2fae4f');
      ground(ctx, 470, '#7ed957', '#6ccb4b');
      ctx.lineCap = 'round';
      [[150, 230], [430, 510]].forEach(function (p) { [[p[0], 560], [p[1], 560]].forEach(function (b) { ctx.strokeStyle = 'rgba(26,29,58,.55)'; ctx.lineWidth = 18; ctx.beginPath(); ctx.moveTo(b[0], b[1]); ctx.lineTo((p[0] + p[1]) / 2, 250); ctx.stroke(); ctx.strokeStyle = '#ff6b6b'; ctx.lineWidth = 11; ctx.stroke(); }); });
      line(ctx); rr(ctx, 180, 240, 300, 20, 8); fs(ctx, '#ff6b6b');
      [[250, 420], [400, 400]].forEach(function (s) { ctx.strokeStyle = '#7d8597'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(s[0] - 26, 258); ctx.lineTo(s[0] - 26, s[1]); ctx.moveTo(s[0] + 26, 258); ctx.lineTo(s[0] + 26, s[1]); ctx.stroke(); line(ctx, 3); rr(ctx, s[0] - 36, s[1], 72, 14, 5); fs(ctx, '#ffd23f'); });
      line(ctx); [800, 900].forEach(function (x) { rr(ctx, x, 330, 14, 230, 4); fs(ctx, '#2fa8ff'); });
      for (var y = 360; y < 560; y += 36) { line(ctx, 3); rr(ctx, 800, y, 114, 9, 3); fs(ctx, '#ffffff'); }
      rr(ctx, 790, 318, 140, 22, 6); fs(ctx, '#2fa8ff');
      ctx.lineCap = 'round'; ctx.strokeStyle = 'rgba(26,29,58,.55)'; ctx.lineWidth = 40; ctx.beginPath(); ctx.moveTo(920, 330); ctx.bezierCurveTo(1010, 340, 1040, 560, 1170, 556); ctx.stroke(); ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 32; ctx.stroke();
      line(ctx); rr(ctx, 480, 580, 240, 70, 10); fs(ctx, '#c8814a'); rr(ctx, 494, 590, 212, 50, 6); fs(ctx, '#f6dca0');
      ctx.beginPath(); ctx.moveTo(560, 600); ctx.lineTo(600, 600); ctx.lineTo(594, 630); ctx.lineTo(566, 630); ctx.closePath(); fs(ctx, '#ff4fa3'); ctx.beginPath(); ctx.ellipse(650, 618, 26, 12, 0, 0, Math.PI * 2); fs(ctx, '#f0c97f');
    }],
    ['kitchen', 'Kitchen', '🍳', function (ctx) {
      ctx.fillStyle = '#fff4d6'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#d6efff'; ctx.fillRect(0, 250, 940, 160); ctx.strokeStyle = 'rgba(80,140,200,.35)'; ctx.lineWidth = 2;
      for (var x = 0; x < 940; x += 40) { ctx.beginPath(); ctx.moveTo(x, 250); ctx.lineTo(x, 410); ctx.stroke(); } for (var y = 250; y < 410; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(940, y); ctx.stroke(); }
      line(ctx); [0, 150].forEach(function (cx) { rr(ctx, cx + 10, 50, 130, 160, 8); fs(ctx, '#ff9e6b'); circ(ctx, cx + 120, 180, 6); fs(ctx, '#ffd23f'); });
      rr(ctx, 320, 60, 290, 170, 10); fs(ctx, '#ffffff'); rr(ctx, 336, 76, 258, 138, 4); fs(ctx, '#8fd8ff'); cloud(ctx, 400, 140, .45); ctx.beginPath(); ctx.moveTo(465, 76); ctx.lineTo(465, 214); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(310, 50); ctx.quadraticCurveTo(360, 140, 330, 240); ctx.lineTo(300, 240); ctx.closePath(); fs(ctx, '#ff4f6d'); ctx.beginPath(); ctx.moveTo(620, 50); ctx.quadraticCurveTo(570, 140, 600, 240); ctx.lineTo(630, 240); ctx.closePath(); fs(ctx, '#ff4f6d');
      [700, 830].forEach(function (cx) { rr(ctx, cx, 50, 120, 160, 8); fs(ctx, '#ff9e6b'); circ(ctx, cx + 14, 180, 6); fs(ctx, '#ffd23f'); });
      rr(ctx, -10, 405, 960, 30, 6); fs(ctx, '#e3e7ef'); rr(ctx, -10, 435, 960, 130, 4); fs(ctx, '#ff8a5c');
      [20, 250, 720].forEach(function (cx) { rr(ctx, cx, 450, 200, 100, 8); fs(ctx, '#ff9e6b'); rr(ctx, cx + 90, 470, 20, 8, 4); fs(ctx, '#ffd23f'); });
      rr(ctx, 480, 435, 220, 130, 6); fs(ctx, '#3a3f55'); rr(ctx, 500, 455, 180, 70, 6); fs(ctx, '#1a1d3a');
      circ(ctx, 540, 400, 30); fs(ctx, '#3a3f55'); circ(ctx, 640, 400, 30); fs(ctx, '#3a3f55');
      ctx.beginPath(); ctx.ellipse(540, 392, 56, 14, 0, 0, Math.PI * 2); fs(ctx, '#5b6275'); rr(ctx, 594, 386, 70, 12, 5); fs(ctx, '#1a1d3a');
      ctx.beginPath(); ctx.ellipse(536, 388, 26, 8, 0, 0, Math.PI * 2); f(ctx, '#ffffff'); circ(ctx, 540, 386, 7); f(ctx, '#ffc532');
      ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 5; [520, 550].forEach(function (sx) { ctx.beginPath(); ctx.moveTo(sx, 360); ctx.quadraticCurveTo(sx - 14, 330, sx, 300); ctx.stroke(); });
      line(ctx); rr(ctx, 980, 120, 220, 445, 18); fs(ctx, '#e3e7ef'); ctx.beginPath(); ctx.moveTo(980, 270); ctx.lineTo(1200, 270); ctx.stroke(); rr(ctx, 1170, 180, 12, 60, 5); fs(ctx, '#7d8597'); rr(ctx, 1170, 300, 12, 90, 5); fs(ctx, '#7d8597');
      [[1020, 160, '#ff4fa3'], [1060, 330, '#2fa8ff'], [1110, 420, '#ffd23f']].forEach(function (m) { circ(ctx, m[0], m[1], 12); fs(ctx, m[2]); });
      ground(ctx, 565, '#ffffff'); for (var gx = 0; gx < W; gx += 80) for (var gy = 565; gy < H; gy += 40) if (((gx / 80) + Math.round((gy - 565) / 40)) % 2) { ctx.fillStyle = '#ffd6ea'; ctx.fillRect(gx, gy, 80, 40); }
    }],
    ['bedroom', 'Bedroom', '🛏️', function (ctx) {
      ctx.fillStyle = '#c9b8ff'; ctx.fillRect(0, 0, W, H);
      var r = rng(27); ctx.fillStyle = 'rgba(255,255,255,.35)'; for (var i = 0; i < 40; i++) { TL.star(ctx, r() * W, r() * 520, 8); ctx.fill(); }
      line(ctx); rr(ctx, 140, 90, 240, 210, 10); fs(ctx, '#ffffff'); rr(ctx, 156, 106, 208, 178, 4); fs(ctx, '#1b1f4a');
      circ(ctx, 300, 160, 24); fs(ctx, '#fff3c4'); ctx.fillStyle = '#ffffff'; [[190, 130], [230, 220], [330, 250], [210, 170]].forEach(function (s) { TL.star(ctx, s[0], s[1], 6); ctx.fill(); });
      ctx.beginPath(); ctx.moveTo(126, 80); ctx.quadraticCurveTo(180, 200, 140, 320); ctx.lineTo(110, 320); ctx.lineTo(110, 80); ctx.closePath(); fs(ctx, '#ff9ec2');
      ctx.beginPath(); ctx.moveTo(394, 80); ctx.quadraticCurveTo(340, 200, 380, 320); ctx.lineTo(410, 320); ctx.lineTo(410, 80); ctx.closePath(); fs(ctx, '#ff9ec2');
      rr(ctx, 500, 110, 120, 160, 6); fs(ctx, '#ffd23f'); TL.star(ctx, 560, 190, 36); fs(ctx, '#ff8a2b');
      rr(ctx, 660, 140, 110, 110, 6); fs(ctx, '#22d3c5'); ctx.beginPath(); ctx.moveTo(715, 222); ctx.bezierCurveTo(680, 196, 690, 160, 715, 178); ctx.bezierCurveTo(740, 160, 750, 196, 715, 222); fs(ctx, '#ff4f6d');
      ground(ctx, 560, '#d9a066'); ctx.strokeStyle = 'rgba(122,78,42,.35)'; ctx.lineWidth = 3; for (var y = 590; y < H; y += 36) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
      line(ctx); ctx.beginPath(); ctx.ellipse(480, 640, 280, 40, 0, 0, Math.PI * 2); fs(ctx, '#ff6b6b'); ctx.beginPath(); ctx.ellipse(480, 640, 200, 26, 0, 0, Math.PI * 2); fs(ctx, '#ffd23f');
      rr(ctx, 1150, 310, 44, 260, 10); fs(ctx, '#8d5a3b'); rr(ctx, 840, 420, 320, 70, 14); fs(ctx, '#ffffff'); ctx.beginPath(); ctx.ellipse(1090, 414, 56, 24, 0, 0, Math.PI * 2); fs(ctx, '#ffffff');
      rr(ctx, 830, 440, 270, 90, 14); fs(ctx, '#4757ff'); ctx.fillStyle = '#ffd23f'; [[880, 470], [960, 500], [1040, 465]].forEach(function (s) { TL.star(ctx, s[0], s[1], 12); ctx.fill(); });
      rr(ctx, 836, 526, 16, 40, 4); fs(ctx, '#8d5a3b');
      rr(ctx, 720, 470, 76, 92, 8); fs(ctx, '#c8814a'); rr(ctx, 752, 410, 10, 62, 3); fs(ctx, '#3a3f55'); ctx.beginPath(); ctx.moveTo(722, 420); ctx.lineTo(792, 420); ctx.lineTo(778, 376); ctx.lineTo(736, 376); ctx.closePath(); fs(ctx, '#ffd23f');
      circ(ctx, 620, 540, 26); fs(ctx, '#b5651d'); circ(ctx, 620, 498, 20); fs(ctx, '#b5651d'); circ(ctx, 604, 482, 8); fs(ctx, '#b5651d'); circ(ctx, 636, 482, 8); fs(ctx, '#b5651d'); circ(ctx, 614, 496, 3); f(ctx, '#1a1d3a'); circ(ctx, 628, 496, 3); f(ctx, '#1a1d3a');
    }],
    ['stadium', 'Soccer Stadium', '🏟️', function (ctx) {
      sky(ctx, '#3d63e0', '#9cc9ff');
      [[110, 40], [1170, 40]].forEach(function (p) { line(ctx, 3); rr(ctx, p[0] - 8, p[1] + 60, 16, 150, 3); fs(ctx, '#7d8597'); rr(ctx, p[0] - 50, p[1], 100, 64, 8); fs(ctx, '#3a3f55');
        for (var i = 0; i < 3; i++) for (var j = 0; j < 2; j++) { circ(ctx, p[0] - 30 + i * 30, p[1] + 18 + j * 28, 10); f(ctx, '#fff8c4'); } });
      line(ctx); rr(ctx, -10, 190, W + 20, 260, 6); fs(ctx, '#3a3f55');
      var r = rng(55), cols = ['#ff4f6d', '#ffd23f', '#2fa8ff', '#ffffff', '#1fbf63', '#ff8a2b', '#c26bff', '#ffcf9e', '#8d5a3b'];
      for (var y = 214; y < 430; y += 26) { ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(0, y + 12, W, 4); for (var x = 8 + (y % 52 ? 9 : 0); x < W; x += 19) { circ(ctx, x, y, 7); f(ctx, cols[Math.floor(r() * cols.length)]); } }
      line(ctx, 3); rr(ctx, -10, 440, W + 20, 36, 2); fs(ctx, '#ff4f6d'); ctx.fillStyle = '#ffffff'; for (var bx = 30; bx < W; bx += 160) ctx.fillRect(bx, 452, 90, 12);
      ground(ctx, 476, '#3fbf55'); for (var sx = 0; sx < W; sx += 160) { ctx.fillStyle = '#37ad4d'; ctx.fillRect(sx, 478, 80, H - 478); }
      ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(640, 478); ctx.lineTo(640, H); ctx.stroke(); ctx.beginPath(); ctx.ellipse(640, 610, 150, 46, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, 520); ctx.lineTo(200, 520); ctx.lineTo(240, 690); ctx.lineTo(0, 690); ctx.stroke();
      line(ctx, 3); ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 2; for (var nx = 20; nx < 120; nx += 14) { ctx.beginPath(); ctx.moveTo(nx, 420); ctx.lineTo(nx, 590); ctx.stroke(); } for (var ny = 420; ny < 590; ny += 14) { ctx.beginPath(); ctx.moveTo(10, ny); ctx.lineTo(120, ny); ctx.stroke(); }
      line(ctx, 3); rr(ctx, 110, 410, 14, 190, 4); fs(ctx, '#ffffff'); rr(ctx, 6, 404, 124, 14, 4); fs(ctx, '#ffffff');
    }],
    ['camping', 'Camping Night', '🏕️', function (ctx) {
      sky(ctx, '#0f1640', '#3b3a7a'); stars(ctx, 160, 31, 360);
      line(ctx); circ(ctx, 1080, 120, 48); fs(ctx, '#fff3c4');
      [[[-20, 440], [220, 230], [420, 440]], [[300, 440], [560, 200], [820, 440]], [[700, 440], [980, 250], [1300, 440]]].forEach(function (m, i) { line(ctx, 3); ctx.beginPath(); ctx.moveTo(m[0][0], m[0][1]); ctx.lineTo(m[1][0], m[1][1]); ctx.lineTo(m[2][0], m[2][1]); ctx.closePath(); fs(ctx, i === 1 ? '#2a2f66' : '#232857');
        ctx.beginPath(); ctx.moveTo(m[1][0] - 40, m[1][1] + 46); ctx.lineTo(m[1][0], m[1][1]); ctx.lineTo(m[1][0] + 40, m[1][1] + 46); ctx.closePath(); f(ctx, '#d7dcff'); });
      ctx.fillStyle = '#2b3f8f'; ctx.fillRect(0, 440, W, 80); ctx.fillStyle = 'rgba(255,243,196,.5)'; [[1050, 460, 70], [1070, 480, 50], [1060, 500, 30]].forEach(function (s) { ctx.fillRect(s[0] - s[2] / 2, s[1], s[2], 4); });
      [[60, 1], [200, .8], [1180, 1.1], [1260, .8]].forEach(function (p) { pine(ctx, p[0], 520, p[1], '#1f5a46'); });
      ground(ctx, 520, '#2f5a3a', '#28503a');
      line(ctx); ctx.beginPath(); ctx.moveTo(400, 580); ctx.lineTo(540, 380); ctx.lineTo(680, 580); ctx.closePath(); fs(ctx, '#ff8a2b');
      ctx.beginPath(); ctx.moveTo(540, 380); ctx.lineTo(500, 580); ctx.lineTo(580, 580); ctx.closePath(); fs(ctx, '#c95f1a'); ctx.beginPath(); ctx.moveTo(540, 380); ctx.lineTo(540, 360); ctx.stroke();
      var r = rng(61); for (var i = 0; i < 22; i++) { var x = r() * W, y = 300 + r() * 380; ctx.globalAlpha = .25; circ(ctx, x, y, 9); f(ctx, '#fff27a'); ctx.globalAlpha = 1; circ(ctx, x, y, 3); f(ctx, '#fff27a'); }
    }],
    ['pirate', 'Pirate Ship', '🏴‍☠️', function (ctx) {
      sky(ctx, '#7ccfff', '#d8f3ff'); cloud(ctx, 160, 90, 1); cloud(ctx, 520, 140, .7);
      ctx.fillStyle = grad(ctx, 320, 480, ['#2f8fd6', '#1f6fb8']); ctx.fillRect(0, 320, W, 160);
      line(ctx, 3); ctx.beginPath(); ctx.ellipse(300, 330, 110, 26, 0, Math.PI, 0); fs(ctx, '#f6dca0'); rr(ctx, 296, 250, 8, 80, 3); fs(ctx, '#a8733f'); ctx.beginPath(); ctx.ellipse(300, 250, 40, 12, -.3, 0, Math.PI * 2); fs(ctx, '#3fbf55');
      ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 4; var r = rng(9); for (var i = 0; i < 18; i++) { var x = r() * W, y = 350 + r() * 110; ctx.beginPath(); ctx.arc(x, y, 14, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); }
      line(ctx); rr(ctx, 880, -10, 40, 560, 6); fs(ctx, '#7a4e2a');
      ctx.beginPath(); ctx.moveTo(660, 50); ctx.quadraticCurveTo(760, 40, 1160, 50); ctx.quadraticCurveTo(1120, 220, 1170, 370); ctx.quadraticCurveTo(900, 350, 650, 370); ctx.quadraticCurveTo(700, 210, 660, 50); ctx.closePath(); fs(ctx, '#fffaf0');
      circ(ctx, 910, 190, 46); fs(ctx, '#1a1d3a'); circ(ctx, 894, 184, 10); f(ctx, '#ffffff'); circ(ctx, 926, 184, 10); f(ctx, '#ffffff'); ctx.fillStyle = '#ffffff'; ctx.fillRect(892, 214, 36, 8);
      ctx.strokeStyle = 'rgba(122,78,42,.8)'; ctx.lineWidth = 3; [[620, 470], [1220, 470], [700, 470]].forEach(function (p) { ctx.beginPath(); ctx.moveTo(900, 30); ctx.lineTo(p[0], p[1]); ctx.stroke(); });
      ground(ctx, 520, '#b5793f'); ctx.strokeStyle = 'rgba(90,50,20,.35)'; ctx.lineWidth = 3; for (var y = 552; y < H; y += 34) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
      line(ctx); rr(ctx, -10, 440, W + 20, 18, 5); fs(ctx, '#8d5a3b'); for (var px = 20; px < W; px += 90) { rr(ctx, px, 456, 14, 66, 3); fs(ctx, '#8d5a3b'); }
      [[180, 470], [260, 486]].forEach(function (b) { line(ctx); rr(ctx, b[0], b[1], 70, 90, 18); fs(ctx, '#a8733f'); ctx.fillStyle = '#5b6275'; ctx.fillRect(b[0] + 2, b[1] + 22, 66, 7); ctx.fillRect(b[0] + 2, b[1] + 62, 66, 7); });
      line(ctx); rr(ctx, 40, 560, 130, 42, 20); fs(ctx, '#3a3f55'); circ(ctx, 80, 610, 22); fs(ctx, '#8d5a3b'); circ(ctx, 80, 610, 7); fs(ctx, '#3a3f55');
    }],
    ['racetrack', 'Race Track', '🏁', function (ctx) {
      sky(ctx, '#8fd6ff', '#e8f8ff'); cloud(ctx, 980, 90, .9); cloud(ctx, 1180, 150, .6);
      hill(ctx, 1080, 420, 360, 110, '#8fd86a');
      line(ctx); rr(ctx, 100, 250, 700, 170, 6); fs(ctx, '#c9ced8'); rr(ctx, 80, 220, 740, 34, 8); fs(ctx, '#ff3048');
      var r = rng(33), cols = ['#ff4f6d', '#ffd23f', '#2fa8ff', '#ffffff', '#1fbf63', '#ff8a2b', '#c26bff'];
      for (var y = 280; y < 410; y += 24) for (var x = 120; x < 790; x += 18) { circ(ctx, x + (y % 48 ? 9 : 0), y, 7); f(ctx, cols[Math.floor(r() * cols.length)]); }
      ground(ctx, 420, '#7ed957', '#6ccb4b');
      line(ctx); ctx.fillStyle = '#4a4f63'; ctx.fillRect(0, 470, W, H - 470); ctx.beginPath(); ctx.moveTo(0, 470); ctx.lineTo(W, 470); ctx.stroke();
      for (var kx = 0; kx < W; kx += 40) { ctx.fillStyle = (kx / 40) % 2 ? '#ffffff' : '#ff3048'; ctx.fillRect(kx, 470, 40, 14); }
      ctx.fillStyle = 'rgba(255,255,255,.85)'; for (var dx = 20; dx < W; dx += 120) ctx.fillRect(dx, 600, 70, 8);
      for (var cy = 484; cy < H; cy += 24) for (var cx = 0; cx < 2; cx++) { ctx.fillStyle = ((cy - 484) / 24 + cx) % 2 ? '#1a1d3a' : '#ffffff'; ctx.fillRect(940 + cx * 24, cy, 24, 24); }
      [[880, 160], [1080, 240]].forEach(function (p) { line(ctx, 3); rr(ctx, p[0], p[1], 10, 260, 3); fs(ctx, '#7d8597'); });
      ctx.save(); line(ctx, 3); ctx.beginPath(); ctx.moveTo(890, 170); ctx.lineTo(1080, 250); ctx.lineTo(1080, 300); ctx.lineTo(890, 220); ctx.closePath(); fs(ctx, '#ffffff'); ctx.clip(); for (var fx = 890; fx < 1090; fx += 20) for (var fy = 160; fy < 310; fy += 20) if (((fx - 890) / 20 + (fy - 160) / 20) % 2) { ctx.fillStyle = '#1a1d3a'; ctx.fillRect(fx, fy + (fx - 890) * .42, 20, 20); } ctx.restore();
      [[180, 690], [420, 700], [700, 690]].forEach(function (c) { line(ctx, 3); ctx.beginPath(); ctx.moveTo(c[0] - 18, c[1]); ctx.lineTo(c[0], c[1] - 46); ctx.lineTo(c[0] + 18, c[1]); ctx.closePath(); fs(ctx, '#ff8a2b'); ctx.fillStyle = '#ffffff'; ctx.fillRect(c[0] - 9, c[1] - 26, 18, 6); });
    }],
    ['cave', 'Crystal Cave', '💎', function (ctx) {
      sky(ctx, '#2a1b4d', '#120a26');
      line(ctx, 3); ctx.beginPath(); ctx.moveTo(-10, 0); for (var x = 0; x <= W + 40; x += 80) { ctx.lineTo(x, 60 + (x / 80 % 2) * 40); ctx.lineTo(x + 40, 150 + (x / 40 % 3) * 30); ctx.lineTo(x + 80, 60); } ctx.lineTo(W + 10, 0); ctx.closePath(); fs(ctx, '#3b2a66');
      [[80, 200, 30], [280, 240, 40], [520, 180, 26], [760, 260, 44], [1000, 210, 30], [1200, 250, 36]].forEach(function (s) { ctx.beginPath(); ctx.moveTo(s[0] - s[2], 90); ctx.lineTo(s[0], s[1]); ctx.lineTo(s[0] + s[2], 90); ctx.closePath(); fs(ctx, '#4a3a7a'); });
      ctx.beginPath(); ctx.moveTo(-10, 360); ctx.quadraticCurveTo(200, 300, 360, 380); ctx.lineTo(360, 560); ctx.lineTo(-10, 560); ctx.closePath(); fs(ctx, '#33245c');
      ctx.beginPath(); ctx.moveTo(1290, 330); ctx.quadraticCurveTo(1080, 300, 940, 390); ctx.lineTo(940, 560); ctx.lineTo(1290, 560); ctx.closePath(); fs(ctx, '#33245c');
      ground(ctx, 560, '#3b2a66', '#2f2254');
      [[180, 560, 1, '#22d3c5'], [1100, 560, 1.2, '#ff4fa3'], [640, 600, .7, '#ffd23f'], [420, 610, .5, '#c26bff'], [880, 620, .6, '#22d3c5']].forEach(function (c) { crystals(ctx, c[0], c[1], c[2], c[3]); });
      [[300, 640], [980, 660]].forEach(function (m) { line(ctx, 3); rr(ctx, m[0] - 5, m[1] - 24, 10, 26, 3); fs(ctx, '#e3e7ef'); ctx.beginPath(); ctx.ellipse(m[0], m[1] - 24, 22, 13, 0, Math.PI, 0); ctx.closePath(); fs(ctx, '#22d3c5'); });
      line(ctx, 3); rr(ctx, 560, 300, 12, 70, 3); fs(ctx, '#8d5a3b'); ctx.save(); ctx.globalAlpha = .25; circ(ctx, 566, 280, 46); f(ctx, '#ffd23f'); ctx.restore(); ctx.beginPath(); ctx.moveTo(552, 300); ctx.quadraticCurveTo(560, 250, 566, 240); ctx.quadraticCurveTo(574, 260, 580, 300); ctx.closePath(); fs(ctx, '#ffa63d');
    }],
    ['clouds', 'Cloud Kingdom', '🏰', function (ctx) {
      sky(ctx, '#ffd6f0', '#c8e7ff');
      ['#ff6b6b', '#ffa63d', '#ffd23f', '#9be15d', '#2fa8ff', '#c26bff'].forEach(function (c, i) { ctx.globalAlpha = .55; ctx.beginPath(); ctx.arc(640, 640, 560 - i * 22, Math.PI, 0); ctx.lineWidth = 22; ctx.strokeStyle = c; ctx.stroke(); }); ctx.globalAlpha = 1;
      cloudBank(ctx, [[900, 400, 60], [980, 380, 70], [1070, 400, 60], [1130, 420, 40]], '#ffffff');
      line(ctx, 3); [[930, 250, 50, 150], [1060, 230, 50, 170]].forEach(function (t) { rr(ctx, t[0], t[1], t[2], t[3], 4); fs(ctx, '#ffffff'); ctx.beginPath(); ctx.moveTo(t[0] - 10, t[1]); ctx.lineTo(t[0] + t[2] / 2, t[1] - 70); ctx.lineTo(t[0] + t[2] + 10, t[1]); ctx.closePath(); fs(ctx, '#ff9ec2'); });
      rr(ctx, 970, 300, 100, 100, 4); fs(ctx, '#ffffff'); rr(ctx, 1000, 340, 40, 60, 20); fs(ctx, '#ffd23f');
      cloudBank(ctx, [[150, 230, 40], [210, 214, 50], [270, 232, 36]], '#ffffff');
      cloudBank(ctx, [[0, 590, 70], [110, 570, 80], [230, 590, 70], [350, 572, 80], [470, 590, 70], [590, 570, 82], [710, 590, 70], [830, 572, 80], [950, 590, 70], [1070, 572, 80], [1190, 590, 70], [1290, 572, 70]], '#ffffff');
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 610, W, H - 610); ctx.fillStyle = '#eef3ff'; for (var x = 40; x < W; x += 160) { ctx.beginPath(); ctx.ellipse(x, 670, 70, 16, 0, 0, Math.PI * 2); ctx.fill(); }
      var r = rng(71); ctx.fillStyle = '#ffd23f'; for (var i = 0; i < 14; i++) { TL.star(ctx, r() * W, 60 + r() * 300, 7 + r() * 5); ctx.fill(); }
    }],
    ['dinoland', 'Dino Valley', '🦕', function (ctx) {
      sky(ctx, '#ffcf8a', '#fff0c9'); sun(ctx, 160, 120, 50, '#fff1a8');
      ctx.fillStyle = 'rgba(120,100,100,.4)'; [[1000, 120, 40], [1040, 80, 50], [990, 50, 34]].forEach(function (c) { circ(ctx, c[0], c[1], c[2]); ctx.fill(); });
      line(ctx, 3); ctx.beginPath(); ctx.moveTo(820, 440); ctx.lineTo(960, 200); ctx.lineTo(1050, 200); ctx.lineTo(1200, 440); ctx.closePath(); fs(ctx, '#a08070'); ctx.beginPath(); ctx.moveTo(960, 202); ctx.lineTo(1050, 202); ctx.lineTo(1030, 250); ctx.lineTo(1010, 230); ctx.lineTo(990, 260); ctx.lineTo(975, 232); ctx.closePath(); fs(ctx, '#ff6b2b');
      hill(ctx, 300, 460, 520, 120, '#b5dd7a');
      ctx.fillStyle = '#6fae6f'; ctx.beginPath(); ctx.ellipse(420, 400, 110, 46, 0, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.moveTo(500, 390); ctx.quadraticCurveTo(580, 340, 560, 230); ctx.lineTo(590, 226); ctx.quadraticCurveTo(610, 350, 520, 410); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.ellipse(590, 224, 30, 16, .2, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.moveTo(320, 400); ctx.quadraticCurveTo(250, 410, 210, 380); ctx.quadraticCurveTo(260, 430, 330, 420); ctx.closePath(); ctx.fill();
      [350, 390, 450, 490].forEach(function (x) { ctx.fillRect(x, 420, 20, 50); });
      ground(ctx, 470, '#a7d86a', '#93c95a');
      palm(ctx, 1180, 580, 1); palm(ctx, 80, 560, .8);
      fern(ctx, 300, 600, 1); fern(ctx, 760, 620, .8); fern(ctx, 1000, 700, 1.1);
      line(ctx); ctx.beginPath(); ctx.ellipse(560, 640, 90, 26, 0, 0, Math.PI * 2); fs(ctx, '#c8814a'); ctx.strokeStyle = 'rgba(90,50,20,.45)'; ctx.lineWidth = 3; for (var i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(480 + i * 30, 626); ctx.lineTo(500 + i * 30, 656); ctx.stroke(); }
      [[525, 618], [565, 610], [600, 620]].forEach(function (e) { line(ctx, 3); ctx.beginPath(); ctx.ellipse(e[0], e[1], 20, 26, 0, 0, Math.PI * 2); fs(ctx, '#fff3d6'); circ(ctx, e[0] - 6, e[1] - 8, 4); f(ctx, '#9be15d'); circ(ctx, e[0] + 7, e[1] + 6, 3); f(ctx, '#9be15d'); });
    }],
    ['nightcity', 'City at Night', '🌃', function (ctx) {
      sky(ctx, '#0b1030', '#2b2160'); stars(ctx, 80, 13, 300); line(ctx, 3); circ(ctx, 200, 110, 40); fs(ctx, '#fff3c4');
      var r = rng(19), x = -20;
      while (x < W) { var w = 70 + r() * 70, h = 200 + r() * 220; ctx.fillStyle = '#1d2350'; ctx.fillRect(x, 520 - h, w, h); for (var wy = 520 - h + 14; wy < 500; wy += 26) for (var wx = x + 10; wx < x + w - 12; wx += 20) if (r() > .65) { ctx.fillStyle = '#ffe27a'; ctx.fillRect(wx, wy, 9, 12); } x += w + 4; }
      x = -30; var i = 0, neon = ['#ff4fa3', '#22d3c5', '#ffd23f', '#9be15d'];
      while (x < W) { var w2 = 140 + r() * 80, h2 = 140 + r() * 120; line(ctx, 3); rr(ctx, x, 560 - h2, w2, h2, 6); fs(ctx, '#2a2f6a');
        for (var k = 0; k < 3; k++) { rr(ctx, x + 14 + k * (w2 - 40) / 2, 560 - h2 + 20, 24, 30, 4); fs(ctx, r() > .3 ? '#ffe27a' : '#3a3f7a'); }
        ctx.save(); ctx.shadowColor = neon[i % 4]; ctx.shadowBlur = 16; ctx.strokeStyle = neon[i % 4]; ctx.lineWidth = 5; rr(ctx, x + w2 / 2 - 40, 560 - h2 + 66, 80, 28, 14); ctx.stroke(); ctx.restore();
        x += w2 + 10; i++; }
      ground(ctx, 560, '#4a4f73'); ctx.fillStyle = '#23263f'; ctx.fillRect(0, 612, W, H - 612); ctx.fillStyle = '#ffd23f'; for (var dx = 20; dx < W; dx += 120) ctx.fillRect(dx, 662, 64, 8);
      [[260, 0], [900, 0]].forEach(function (p) { ctx.save(); ctx.globalAlpha = .25; circ(ctx, p[0] + 6, 380, 46); f(ctx, '#fff2a8'); ctx.restore(); line(ctx); rr(ctx, p[0], 380, 12, 200, 4); fs(ctx, '#3a3f55'); circ(ctx, p[0] + 6, 372, 18); fs(ctx, '#fff2a8'); });
    }],
    ['arcade', 'Arcade', '🕹️', function (ctx) {
      sky(ctx, '#1a1238', '#2a1858');
      ctx.save(); ctx.shadowBlur = 18; [[110, '#22d3c5'], [134, '#ff4fa3']].forEach(function (s) { ctx.shadowColor = s[1]; ctx.strokeStyle = s[1]; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(0, s[0]); ctx.lineTo(W, s[0]); ctx.stroke(); });
      ctx.shadowColor = '#ffd23f'; ctx.fillStyle = '#ffd23f'; ctx.font = '400 84px "Lilita One", sans-serif'; ctx.textAlign = 'center'; ctx.fillText('ARCADE', 640, 260); ctx.restore();
      ground(ctx, 540, '#24164a'); ctx.strokeStyle = 'rgba(194,107,255,.55)'; ctx.lineWidth = 3;
      for (var gy = 0; gy < 8; gy++) { var y = 540 + gy * gy * 3.4 + gy * 4; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
      for (var gx = -10; gx <= 10; gx++) { ctx.beginPath(); ctx.moveTo(640 + gx * 40, 540); ctx.lineTo(640 + gx * 190, H); ctx.stroke(); }
      [[90, '#ff4fa3'], [300, '#2fa8ff'], [840, '#1fbf63'], [1050, '#ff8a2b']].forEach(function (c, i) { cabinet(ctx, c[0], c[1], i); });
    }],
    ['lab', 'Science Lab', '🧪', function (ctx) {
      ctx.fillStyle = '#dff3ff'; ctx.fillRect(0, 0, W, H); ctx.strokeStyle = 'rgba(100,150,200,.25)'; ctx.lineWidth = 2; for (var y = 0; y < 440; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
      line(ctx); rr(ctx, 400, 70, 500, 250, 10); fs(ctx, '#7d8597'); rr(ctx, 414, 84, 472, 222, 4); fs(ctx, '#ffffff');
      ctx.fillStyle = '#2b36c9'; ctx.font = '800 34px Nunito, sans-serif'; ctx.textAlign = 'left'; ctx.fillText('H2O + ★ = ?', 440, 140); ctx.fillStyle = '#d6243f'; ctx.fillText('1 + 1 = 🧪', 440, 200);
      ctx.save(); ctx.translate(780, 220); ctx.strokeStyle = '#1fbf63'; ctx.lineWidth = 4; [0, 1.05, 2.1].forEach(function (a) { ctx.beginPath(); ctx.ellipse(0, 0, 66, 22, a, 0, Math.PI * 2); ctx.stroke(); }); circ(ctx, 0, 0, 10); f(ctx, '#ff4f6d'); ctx.restore();
      line(ctx); rr(ctx, 40, 120, 280, 14, 4); fs(ctx, '#c8814a'); rr(ctx, 40, 260, 280, 14, 4); fs(ctx, '#c8814a');
      [[60, 70, '#ff4fa3'], [120, 60, '#ffd23f'], [180, 80, '#22d3c5'], [250, 66, '#9be15d'], [70, 206, '#c26bff'], [140, 220, '#ff8a2b'], [220, 200, '#2fa8ff']].forEach(function (j) { var hh = j[1] < 100 ? 120 - j[1] : 260 - j[1]; line(ctx, 3); rr(ctx, j[0], j[1], 44, hh, 8); fs(ctx, '#ffffff'); ctx.fillStyle = j[2]; ctx.fillRect(j[0] + 4, j[1] + hh * .4, 36, hh * .6 - 4); rr(ctx, j[0] + 6, j[1] - 10, 32, 12, 3); fs(ctx, '#7d8597'); });
      rr(ctx, -10, 430, W + 20, 26, 6); fs(ctx, '#3a3f55'); rr(ctx, -10, 456, W + 20, 110, 4); fs(ctx, '#7d8597');
      for (var dx = 40; dx < W; dx += 220) { rr(ctx, dx, 470, 180, 80, 8); fs(ctx, '#9aa3b5'); rr(ctx, dx + 80, 490, 20, 8, 4); fs(ctx, '#3a3f55'); }
      line(ctx); ctx.beginPath(); ctx.moveTo(990, 330); ctx.lineTo(990, 370); ctx.lineTo(950, 430); ctx.lineTo(1070, 430); ctx.lineTo(1030, 370); ctx.lineTo(1030, 330); ctx.closePath(); fs(ctx, 'rgba(255,255,255,.85)');
      ctx.beginPath(); ctx.moveTo(974, 394); ctx.lineTo(1046, 394); ctx.lineTo(1066, 426); ctx.lineTo(954, 426); ctx.closePath(); f(ctx, '#9be15d'); [[1000, 380, 6], [1016, 360, 4], [996, 344, 3]].forEach(function (b) { circ(ctx, b[0], b[1], b[2]); ctx.strokeStyle = '#4fa63a'; ctx.lineWidth = 2; ctx.stroke(); });
      line(ctx); rr(ctx, 1110, 360, 70, 70, 10); fs(ctx, '#ffffff'); ctx.save(); rr(ctx, 1110, 360, 70, 70, 10); ctx.clip(); ctx.fillStyle = '#ff4fa3'; ctx.fillRect(1110, 395, 70, 35); ctx.restore(); rr(ctx, 1110, 360, 70, 70, 10); ctx.stroke(); rr(ctx, 1130, 330, 30, 32, 4); fs(ctx, '#ffffff');
      [[180, 350], [210, 340], [240, 352]].forEach(function (tb, i) { line(ctx, 3); rr(ctx, tb[0], tb[1], 18, 80, 9); fs(ctx, '#ffffff'); ctx.fillStyle = ['#ff6b6b', '#ffd23f', '#22d3c5'][i]; ctx.fillRect(tb[0] + 3, tb[1] + 40, 12, 36); });
      line(ctx, 3); rr(ctx, 160, 400, 110, 30, 4); fs(ctx, '#c8814a');
      ground(ctx, 566, '#c9ced8'); ctx.strokeStyle = 'rgba(100,110,130,.35)'; ctx.lineWidth = 2; for (var gx = 0; gx < W; gx += 80) { ctx.beginPath(); ctx.moveTo(gx, 566); ctx.lineTo(gx - 40, H); ctx.stroke(); }
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
  /* Draw a background into a W x H stage (cover). box = the camera frame ({x, y, w, h}, see TL.frameOf): an uploaded
     picture covers the frame instead of the whole stage, so a phone photo fills a Reel. Returns false while an uploaded
     picture is still loading. */
  TL.drawBackground = function (ctx, ref, w, h, box) {
    w = w || W; h = h || H;
    if (ref && ref.indexOf('c:') === 0) { ctx.fillStyle = ref.slice(2); ctx.fillRect(0, 0, w, h); return true; }
    if (!ref || ref.indexOf('b:') === 0) { var cv = TL.sceneCanvas(ref || 'b:park', w <= 400 ? 400 : W, w <= 400 ? 225 : H); if (cv) { ctx.drawImage(cv, 0, 0, w, h); return true; } }
    var rec = imgs[ref];
    if (!rec) { TL.loadImage(ref); rec = imgs[ref]; }
    if (rec && rec.ok) {
      var bx = box || { x: 0, y: 0, w: w, h: h };
      var img = rec.img, s = Math.max(bx.w / img.naturalWidth, bx.h / img.naturalHeight), iw = img.naturalWidth * s, ih = img.naturalHeight * s;
      if (box) { ctx.fillStyle = '#c9d2f0'; ctx.fillRect(0, 0, w, h); }
      ctx.drawImage(img, bx.x + (bx.w - iw) / 2, bx.y + (bx.h - ih) / 2, iw, ih); return true;
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
