/* _tl_rig: characters. The parts catalogue, the joints-and-sticks rigs (biped, four legs, caterpillar), drawing a
     character on a canvas in the chunky outlined ToonyLoony style, keyframe poses, the starter animations every new
     character gets, and the premade cast. No page here: shared by build, animate, studio, watch (window.TL). */
(function () {
  'use strict';
  var TL = window.TL = window.TL || {};
  var INK = '#1a1d3a', D2R = Math.PI / 180;

  /* ------------------------------------------------------------------ the catalogue (id, label) */
  TL.PARTS = {
    head: [['blocky', 'Blocky'], ['round', 'Round'], ['egg', 'Egg'], ['cat', 'Kitty'], ['bear', 'Bear'], ['bunny', 'Bunny'], ['dog', 'Doggo'],
           ['bird', 'Birdy'], ['robot', 'Robot'], ['alien', 'Alien'], ['frog', 'Froggy'], ['fox', 'Foxy'], ['panda', 'Panda'], ['mouse', 'Mouse'],
           ['monkey', 'Monkey'], ['dino', 'Dino'], ['pumpkin', 'Pumpkin'], ['skull', 'Skull']],
    eyes: [['dots', 'Dots'], ['big', 'Big'], ['happy', 'Happy'], ['sleepy', 'Sleepy'], ['angry', 'Grumpy'], ['googly', 'Googly'],
           ['shades', 'Shades'], ['hearts', 'Hearts'], ['visor', 'Visor'], ['one', 'Cyclops'], ['star', 'Stars'], ['wink', 'Wink'],
           ['xx', 'Dizzy X'], ['specs', 'Glasses'], ['lashes', 'Lashes']],
    mouth: [['smile', 'Smile'], ['grin', 'Grin'], ['open', 'Wow'], ['teeth', 'Toothy'], ['tongue', 'Silly'], ['frown', 'Frown'],
            ['beak', 'Beak'], ['stache', 'Mustache'], ['fangs', 'Fangs'], ['smirk', 'Smirk'], ['buck', 'Bucky'], ['wobbly', 'Wobbly'], ['beard', 'Beard']],
    hat: [['none', 'Nothing'], ['spiky', 'Spiky hair'], ['bob', 'Bob hair'], ['curly', 'Curly hair'], ['ponytail', 'Ponytail'], ['afro', 'Afro'],
          ['mohawk', 'Mohawk'], ['cap', 'Cap'], ['tophat', 'Top hat'],
          ['crown', 'Crown'], ['wizard', 'Wizard hat'], ['beanie', 'Beanie'], ['pirate', 'Pirate hat'], ['horns', 'Horns'], ['halo', 'Halo'],
          ['phones', 'Headphones'], ['antenna', 'Antenna'], ['bow', 'Bow'], ['chef', 'Chef hat'], ['cowboy', 'Cowboy hat'], ['party', 'Party hat'],
          ['viking', 'Viking helmet'], ['astro', 'Space helmet'], ['ninja', 'Ninja band'], ['flower', 'Flower']],
    torso: [['block', 'Block'], ['tee', 'T-shirt'], ['hoodie', 'Hoodie'], ['suit', 'Suit'], ['armor', 'Armor'], ['belly', 'Belly'],
            ['dress', 'Dress'], ['robot', 'Robot'], ['stick', 'Stick'], ['overalls', 'Overalls'], ['jersey', 'Jersey'], ['space', 'Space suit'],
            ['ninja', 'Ninja'], ['ghost', 'Ghost sheet']],
    arms: [['block', 'Block'], ['noodle', 'Noodle'], ['stick', 'Stick'], ['robot', 'Robot'], ['striped', 'Stripy'], ['wing', 'Wings']],
    legs: [['block', 'Block'], ['noodle', 'Noodle'], ['stick', 'Stick'], ['robot', 'Robot'], ['striped', 'Stripy'], ['none', 'No legs']],
    hands: [['mitt', 'Mitts'], ['glove', 'Gloves'], ['claw', 'Claws'], ['clamp', 'Clamps'], ['none', 'None']],
    feet: [['sneaker', 'Sneakers'], ['boot', 'Boots'], ['paw', 'Paws'], ['flipper', 'Flippers'], ['bird', 'Bird feet'], ['none', 'None']],
    extra: [['tail', 'Tail'], ['wings', 'Wings'], ['cape', 'Cape'], ['sword', 'Sword'], ['wand', 'Magic wand'], ['balloon', 'Balloon'],
            ['shield', 'Shield'], ['backpack', 'Backpack'], ['jetpack', 'Jetpack'], ['guitar', 'Guitar'], ['umbrella', 'Umbrella'], ['hammer', 'Hammer'],
            ['flag', 'Flag'], ['torch', 'Torch'], ['icecream', 'Ice cream'], ['mic', 'Microphone'], ['scarf', 'Scarf'], ['net', 'Bug net']]
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
    },
    prop: function () {  // a stage object: one stick, drawn by TL.drawProp (_tl_rig_props). Moves turn and lift the root.
      return [B('root', null, 0, 0, { kind: 'root', z: 0 }), B('obj', 'root', 0, 0, { kind: 'prop', w: 1, z: 10 })];
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
    guitar: { p: ['torso'], at: .25, oy: 14, ang: 40, len: 66, w: 32, z: 29, col: 'accent' },
    umbrella: { p: ['aR2', 'head', 'torso'], ang: -96, len: 72, w: 64, z: 32, col: 'accent' },
    hammer: { p: ['aR2', 'head', 'torso'], ang: -96, len: 54, w: 12, z: 32, col: 'accent' },
    flag: { p: ['aR2', 'head', 'torso'], ang: -96, len: 92, w: 40, z: 32, col: 'accent' },
    torch: { p: ['aR2', 'head', 'torso'], ang: -96, len: 42, w: 12, z: 32, col: 'accent' },
    icecream: { p: ['aR2', 'head', 'torso'], ang: -96, len: 26, w: 24, z: 32, col: 'accent' },
    mic: { p: ['aR2', 'head', 'torso'], ang: -96, len: 22, w: 12, z: 32, col: 'accent' },
    scarf: { p: ['torso'], at: .96, oy: -4, ang: 168, len: 44, w: 15, z: 19, col: 'accent', wig: 9, sp: 5 },
    net: { p: ['aR2', 'head', 'torso'], ang: -96, len: 70, w: 34, z: 32, col: 'accent' }
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
      if (s.b.kind === 'prop') {  // the prop's box, turned with it
        var bx = TL.propBox(ch), k = (ch.look || {}).size || 1, hw = bx[0] / 2 * k, hh = bx[1] / 2 * k, c = Math.cos(s.a), sn = Math.sin(s.a);
        [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]].forEach(function (p) {
          var px = s.x + p[0] * c - p[1] * sn, py = s.y + p[0] * sn + p[1] * c;
          x0 = Math.min(x0, px); y0 = Math.min(y0, py); x1 = Math.max(x1, px); y1 = Math.max(y1, py);
        });
        return;
      }
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
    if (ch.rig === 'prop') low = TL.propBox(ch)[1] / 2 * ((ch.look || {}).size || 1);
    else
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
    if (style === 'none') return;
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
    if (L.legs === 'none') return;
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
    if (style === 'ghost') {  // a sheet from the neck down past the hips, with a wavy hem
      ctx.beginPath(); ctx.moveTo(len + 4, -W * .5); ctx.quadraticCurveTo(len + 20, 0, len + 4, W * .5); ctx.lineTo(-40, W * .74);
      for (var gi = 0; gi <= 6; gi++) ctx.lineTo((gi % 2 ? -60 : -46) + Math.sin(t * 4 + gi) * 3, W * .74 - gi * W * 1.48 / 6);
      ctx.closePath(); fs(ctx, shirt);
      ell(ctx, len * .25, W * .3, 9, W * .1); fill(ctx, shade(shirt, .9));
      return;
    }
    function body0() { rr(ctx, -8, -W / 2, len + 12, W, W * .2); }
    if (style === 'overalls' || style === 'jersey' || style === 'ninja') {
      body0(); fs(ctx, shirt);
      ctx.save(); body0(); ctx.clip(); ctx.fillStyle = L.pants;
      if (style === 'overalls') { ctx.fillRect(-9, -W, len * .48 + 9, W * 2); rr(ctx, len * .3, -W * .12, len * .42, W * .66, 6); ctx.fill(); ctx.stroke(); }
      else if (style === 'jersey') { ctx.fillRect(-9, -W, 15, W * 2); ctx.fillStyle = L.accent; ctx.fillRect(len * .34, -W, 9, W * 2); ctx.fillRect(len * .56, -W, 9, W * 2); }
      else { ctx.fillRect(-9, -W, 15, W * 2); ctx.strokeStyle = shade(shirt, 1.4); ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(len + 4, -W * .34); ctx.lineTo(len * .3, W * .6); ctx.stroke(); ctx.fillStyle = L.accent; ctx.fillRect(len * .12, -W, 11, W * 2); }
      ctx.restore(); body0(); ctx.stroke();
      if (style === 'overalls') {
        [[-.08, .54], [.4, .54]].forEach(function (k) { ctx.save(); ctx.lineCap = 'round'; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(len * k[1] + len * .2, W * k[0]); ctx.lineTo(len + 3, W * (k[0] - .12)); ctx.stroke(); ctx.lineWidth = 5; ctx.strokeStyle = L.pants; ctx.stroke(); ctx.restore(); });
        [-.06, .42].forEach(function (k) { ell(ctx, len * .66, W * k, 3.6, 3.6); fs(ctx, L.accent); });
      } else if (style === 'jersey') {
        ctx.beginPath(); ctx.moveTo(len + 4, -W * .2); ctx.lineTo(len - 9, W * .06); ctx.lineTo(len + 4, W * .32); ctx.closePath(); fs(ctx, L.accent);
      } else { ell(ctx, len * .17, W * .5, 6, 5); fs(ctx, L.accent); }
      return;
    }
    if (style === 'space') {
      rr(ctx, -10, -W * .56, len + 15, W * 1.12, W * .3); fs(ctx, shirt);
      rr(ctx, -3, -W * .56, 10, W * 1.12, 3); fs(ctx, '#7d8597');
      rr(ctx, len * .36, -W * .06, len * .4, W * .52, 6); fs(ctx, '#3a3f55');
      [L.accent, '#22d3c5', '#ffd23f'].forEach(function (c, i) { var on = Math.sin(t * 3 + i * 2.1) > -.4; ell(ctx, len * .56, W * (.06 + i * .14), 3.6, 3.6); fill(ctx, on ? c : shade(c, .45)); });
      ell(ctx, len * .9, -W * .3, 5, 5); fs(ctx, L.accent);
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
    else if (L.hat === 'afro') { blobs(ctx, [[0, -.36, .6], [-.46, -.1, .38], [.44, -.16, .36], [-.3, -.6, .36], [.28, -.62, .36], [-.56, .2, .26]], S, c); }
    else if (L.hat === 'ponytail') { ell(ctx, -S * .7, S * .02, S * .2, S * .38, .55); fs(ctx, c); ell(ctx, -S * .53, -S * .24, S * .08, S * .08); fs(ctx, L.accent); }
    else if (L.hat === 'curly') { [[-.48, -.2], [-.5, .15], [.4, -.3]].forEach(function (p) { ell(ctx, p[0] * S, p[1] * S, S * .2, S * .2); fs(ctx, c); }); }
    else if (L.hat === 'phones') { ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(0, -S * .05, S * .6, Math.PI * 1.05, Math.PI * 1.95); ctx.strokeStyle = INK; ctx.stroke(); ctx.lineWidth = 3.2; }
  }
  /* Overlapping circles with one outline around the outside (afro, chef hat, clouds). */
  function blobs(ctx, list, S, c) {
    ctx.beginPath(); list.forEach(function (p) { ctx.moveTo(p[0] * S + p[2] * S, p[1] * S); ctx.arc(p[0] * S, p[1] * S, p[2] * S, 0, Math.PI * 2); });
    var lw = ctx.lineWidth; ctx.lineWidth = lw * 2; ctx.stroke(); ctx.fillStyle = c; ctx.fill(); ctx.lineWidth = lw;
  }
  TL.blobs = blobs;
  function headShape(ctx, S, L) {
    var c = L.skin, h = L.head;
    if (h === 'frog') {
      [[-.2, -.36], [.32, -.36]].forEach(function (p) { ell(ctx, p[0] * S, p[1] * S, S * .21, S * .2); fs(ctx, c); });
      ell(ctx, S * .05, S * .06, S * .6, S * .42); fs(ctx, c);
      ell(ctx, S * .4, S * .16, S * .07, S * .045); fill(ctx, 'rgba(255,90,120,.35)');
      return;
    }
    if (h === 'pumpkin') {
      rr(ctx, -S * .06, -S * .7, S * .13, S * .24, 4); fs(ctx, '#3fae4f');
      ell(ctx, -S * .26, S * .02, S * .32, S * .5); fs(ctx, shade(c, .86)); ell(ctx, S * .26, S * .02, S * .32, S * .5); fs(ctx, shade(c, .86));
      ell(ctx, 0, S * .02, S * .3, S * .53); fs(ctx, c);
      return;
    }
    if (h === 'skull') {
      rr(ctx, -S * .28, S * .1, S * .6, S * .36, S * .12); fs(ctx, c);
      ell(ctx, 0, -S * .08, S * .52, S * .48); fs(ctx, c);
      [[-.1, 0], [.26, 0]].forEach(function (p) { ell(ctx, p[0] * S, -S * .07, S * .14, S * .15); fill(ctx, '#3a3f55'); });
      ctx.beginPath(); ctx.moveTo(S * .1, S * .1); ctx.lineTo(S * .16, S * .2); ctx.lineTo(S * .04, S * .2); ctx.closePath(); fill(ctx, INK);
      return;
    }
    if (h === 'fox') {
      [[-.38, -.08], [.26, .1]].forEach(function (p) { ctx.beginPath(); ctx.moveTo(p[0] * S - S * .16, -S * .26); ctx.lineTo(p[0] * S + p[1] * S, -S * .98); ctx.lineTo(p[0] * S + S * .2, -S * .36); ctx.closePath(); fs(ctx, c);
        ctx.beginPath(); ctx.moveTo(p[0] * S - S * .06, -S * .4); ctx.lineTo(p[0] * S + p[1] * S, -S * .8); ctx.lineTo(p[0] * S + S * .1, -S * .42); ctx.closePath(); fill(ctx, shade(c, .7)); });
    }
    if (h === 'mouse') { [[-.4, -.44], [.3, -.52]].forEach(function (p) { ell(ctx, p[0] * S, p[1] * S, S * .27, S * .27); fs(ctx, c); ell(ctx, p[0] * S, p[1] * S, S * .15, S * .15); fill(ctx, '#ffb3d9'); }); }
    if (h === 'panda') { [[-.38, -.42], [.36, -.44]].forEach(function (p) { ell(ctx, p[0] * S, p[1] * S, S * .18, S * .18); fs(ctx, '#3a3f55'); }); }
    if (h === 'monkey') { ell(ctx, -S * .52, S * .02, S * .17, S * .19); fs(ctx, c); ell(ctx, -S * .52, S * .02, S * .08, S * .1); fill(ctx, shade(c, 1.5)); }
    if (h === 'dino') {
      [[-.42, -.3], [-.2, -.48], [.06, -.54]].forEach(function (p) { ctx.beginPath(); ctx.moveTo(p[0] * S - S * .12, p[1] * S + S * .1); ctx.lineTo(p[0] * S - S * .02, p[1] * S - S * .16); ctx.lineTo(p[0] * S + S * .12, p[1] * S + S * .08); ctx.closePath(); fs(ctx, L.accent); });
      ell(ctx, S * .34, S * .14, S * .42, S * .3); fs(ctx, c);
      ell(ctx, 0, 0, S * .5, S * .5); fs(ctx, c);
      ell(ctx, S * .34, S * .14, S * .4, S * .28); fill(ctx, c);
      [[.6, .02], [.68, .06]].forEach(function (p) { ell(ctx, p[0] * S, p[1] * S, S * .025, S * .025); fill(ctx, INK); });
      return;
    }
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
    if (h === 'panda') { [[-.1, -.4], [.26, .4]].forEach(function (p) { ell(ctx, p[0] * S, -S * .06, S * .13, S * .17, p[1]); fill(ctx, '#3a3f55'); }); }
    if (h === 'monkey') { ell(ctx, S * .14, S * .08, S * .38, S * .34); fs(ctx, shade(c, 1.55)); }
    if (h === 'fox') {
      ctx.beginPath(); ctx.moveTo(S * .08, -S * .02); ctx.quadraticCurveTo(S * .5, -S * .02, S * .8, S * .12); ctx.quadraticCurveTo(S * .5, S * .44, S * .04, S * .36); ctx.closePath(); fs(ctx, shade(c, 1.7));
      ell(ctx, S * .78, S * .11, S * .075, S * .06); fill(ctx, INK);
    }
  }
  function drawEyes(ctx, S, L, st) {
    var fx = S * .08, ey = -S * .07, dx = S * .18, e = S * .09, blink = st.blink || 0, kind = L.eyes;
    if (L.head === 'bird' || L.head === 'dog' || L.head === 'fox') fx = S * .14;
    if (L.head === 'frog') { ey = -S * .38; dx = S * .26; fx = S * .06; }
    var xs = [fx - dx, fx + dx];
    if (kind === 'star') { xs.forEach(function (x) { star(ctx, x, ey, S * .13 * (1 - blink * .8)); fs(ctx, '#ffd23f'); }); return; }
    if (kind === 'xx') { ctx.lineWidth = 4; var q = S * .07; xs.forEach(function (x) { ctx.beginPath(); ctx.moveTo(x - q, ey - q); ctx.lineTo(x + q, ey + q); ctx.moveTo(x + q, ey - q); ctx.lineTo(x - q, ey + q); ctx.stroke(); }); ctx.lineWidth = 3.2; return; }
    if (kind === 'wink') {
      ell(ctx, xs[0], ey, e * .62, e * .85 * Math.max(.12, 1 - blink)); fill(ctx, INK);
      ctx.lineWidth = 3.6; ctx.beginPath(); ctx.arc(xs[1], ey + e * .4, e * .85, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); ctx.lineWidth = 3.2;
      return;
    }
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
    if (kind === 'specs') {
      xs.forEach(function (x) { ell(ctx, x, ey, S * .14, S * .13); ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.fill(); ctx.stroke(); });
      ctx.beginPath(); ctx.moveTo(xs[0] + S * .14, ey); ctx.lineTo(xs[1] - S * .14, ey); ctx.moveTo(xs[0] - S * .14, ey); ctx.lineTo(xs[0] - S * .4, ey - S * .04); ctx.stroke();
    }
    if (kind === 'lashes' && blink < .4) {
      ctx.lineWidth = 2.8; xs.forEach(function (x) { [[.3, -.75, .85, -1.3], [.55, -.4, 1.15, -.7]].forEach(function (k) { ctx.beginPath(); ctx.moveTo(x + k[0] * e, ey + k[1] * e); ctx.lineTo(x + k[2] * e, ey + k[3] * e); ctx.stroke(); }); }); ctx.lineWidth = 3.2;
    }
  }
  function drawMouth(ctx, S, L, st) {
    var m = Math.max(0, Math.min(1, st.mouth || 0)), fx = S * .1, my = S * .22, kind = L.mouth;
    if (L.head === 'dog' || L.head === 'fox') { fx = S * .34; my = S * .3; }
    if (L.head === 'dino') { fx = S * .36; my = S * .25; }
    if (L.head === 'alien' || L.head === 'egg') my = S * .26;
    if (L.head === 'skull') my = S * .3;
    if (kind === 'beard') {
      ctx.beginPath(); ctx.moveTo(-S * .5, -S * .04); ctx.quadraticCurveTo(-S * .46, S * .55, fx, S * .7); ctx.quadraticCurveTo(S * .52, S * .6, S * .56, -S * .04);
      ctx.quadraticCurveTo(S * .36, S * .2, fx, S * .14); ctx.quadraticCurveTo(-S * .22, S * .2, -S * .5, -S * .04); ctx.closePath(); fs(ctx, L.hair);
    }
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
      if (kind === 'teeth' || kind === 'grin' || kind === 'fangs' || kind === 'buck') { ctx.fillStyle = '#ffffff'; ctx.fillRect(fx - w, my + h * .3 - h, w * 2, h * .45); }
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
    } else if (kind === 'smirk') {
      ctx.lineWidth = 3.6; ctx.beginPath(); ctx.moveTo(fx - S * .14, my + S * .03); ctx.quadraticCurveTo(fx + S * .04, my + S * .1, fx + S * .19, my - S * .06); ctx.stroke(); ctx.lineWidth = 3.2;
    } else if (kind === 'wobbly') {
      ctx.lineWidth = 3.4; ctx.beginPath(); ctx.moveTo(fx - S * .17, my + S * .04);
      for (var wi = 1; wi <= 6; wi++) ctx.lineTo(fx - S * .17 + wi * S * .057, my + (wi % 2 ? 0 : S * .045));
      ctx.stroke(); ctx.lineWidth = 3.2;
    } else {
      if (kind === 'buck') { rr(ctx, fx - S * .065, my + S * .05, S * .06, S * .09, 2); fs(ctx, '#ffffff'); rr(ctx, fx + S * .005, my + S * .05, S * .06, S * .09, 2); fs(ctx, '#ffffff'); }
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
    } else if (h === 'mohawk') {
      ctx.beginPath(); ctx.moveTo(-S * .36, -S * .4);
      [[-.32, -.84], [-.17, -.5], [-.06, -.98], [.06, -.52], [.18, -.9], [.27, -.48]].forEach(function (p) { ctx.lineTo(p[0] * S, p[1] * S); });
      ctx.lineTo(S * .32, -S * .38); ctx.quadraticCurveTo(0, -S * .56, -S * .36, -S * .4); ctx.closePath(); fs(ctx, c);
    } else if (h === 'afro') {
      ctx.beginPath(); ctx.moveTo(-S * .5, -S * .2); ctx.quadraticCurveTo(-S * .2, -S * .48, S * .1, -S * .4); ctx.quadraticCurveTo(S * .4, -S * .46, S * .54, -S * .22);
      ctx.quadraticCurveTo(S * .3, -S * .7, -S * .1, -S * .66); ctx.quadraticCurveTo(-S * .46, -S * .62, -S * .5, -S * .2); ctx.closePath(); fill(ctx, c);
    } else if (h === 'chef') {
      blobs(ctx, [[-.26, -.9, .25], [0, -1.02, .29], [.26, -.9, .25]], S, '#ffffff');
      rr(ctx, -S * .4, -S * .76, S * .8, S * .32, S * .08); fs(ctx, '#ffffff');
      ctx.beginPath(); ctx.moveTo(-S * .14, -S * .74); ctx.lineTo(-S * .14, -S * .52); ctx.moveTo(S * .14, -S * .74); ctx.lineTo(S * .14, -S * .52); ctx.stroke();
    } else if (h === 'cowboy') {
      ctx.beginPath(); ctx.moveTo(-S * .4, -S * .46); ctx.lineTo(-S * .34, -S * .94); ctx.quadraticCurveTo(0, -S * .78, S * .34, -S * .94); ctx.lineTo(S * .4, -S * .46); ctx.closePath(); fs(ctx, c);
      ctx.fillStyle = L.accent; ctx.fillRect(-S * .38, -S * .62, S * .76, S * .1);
      ctx.beginPath(); ctx.moveTo(-S * .92, -S * .5); ctx.quadraticCurveTo(-S * .6, -S * .3, 0, -S * .36); ctx.quadraticCurveTo(S * .6, -S * .3, S * .92, -S * .5); ctx.quadraticCurveTo(S * .5, -S * .5, 0, -S * .5); ctx.quadraticCurveTo(-S * .5, -S * .5, -S * .92, -S * .5); ctx.closePath(); fs(ctx, shade(c, .9));
    } else if (h === 'party') {
      ctx.beginPath(); ctx.moveTo(-S * .3, -S * .4); ctx.lineTo(S * .08, -S * 1.16); ctx.lineTo(S * .36, -S * .42); ctx.closePath(); fs(ctx, L.accent);
      [[-.08, -.55], [.15, -.68], [.05, -.88], [.2, -.5]].forEach(function (p) { ell(ctx, p[0] * S, p[1] * S, S * .04, S * .04); fill(ctx, '#ffffff'); });
      ell(ctx, S * .08, -S * 1.18, S * .1, S * .1); fs(ctx, '#ffd23f');
    } else if (h === 'viking') {
      [-1, 1].forEach(function (k) { ctx.beginPath(); ctx.moveTo(k * S * .46, -S * .38); ctx.quadraticCurveTo(k * S * .95, -S * .45, k * S * .82, -S * 1.0); ctx.quadraticCurveTo(k * S * .72, -S * .64, k * S * .38, -S * .62); ctx.closePath(); fs(ctx, '#fff3d6'); });
      ctx.beginPath(); ctx.moveTo(-S * .57, -S * .24); ctx.quadraticCurveTo(-S * .57, -S * .82, 0, -S * .82); ctx.quadraticCurveTo(S * .57, -S * .82, S * .57, -S * .24); ctx.closePath(); fs(ctx, '#c9ced8');
      rr(ctx, -S * .6, -S * .34, S * 1.2, S * .15, 4); fs(ctx, '#a9b0c0');
      [-.4, -.13, .13, .4].forEach(function (k) { ell(ctx, k * S, -S * .265, 2.4, 2.4); fill(ctx, INK); });
    } else if (h === 'astro') {
      rr(ctx, -S * .52, S * .6, S * 1.04, S * .18, S * .08); fs(ctx, '#c9ced8');
      ctx.save(); ell(ctx, 0, -S * .04, S * .8, S * .78); ctx.fillStyle = 'rgba(190,235,255,.3)'; ctx.fill(); ctx.lineWidth = 4.4; ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0, -S * .04, S * .64, Math.PI * 1.12, Math.PI * 1.42); ctx.stroke(); ctx.restore();
    } else if (h === 'ninja') {
      [[-.27, -.42], [-.2, -.08]].forEach(function (p) { ctx.beginPath(); ctx.moveTo(-S * .52, p[0] * S); ctx.quadraticCurveTo(-S * .8, p[0] * S - S * .14, -S * .98, p[1] * S); ctx.lineTo(-S * .9, p[1] * S + S * .1); ctx.quadraticCurveTo(-S * .76, p[0] * S, -S * .52, p[0] * S + S * .12); ctx.closePath(); fs(ctx, L.accent); });
      rr(ctx, -S * .57, -S * .36, S * 1.14, S * .16, S * .05); fs(ctx, L.accent);
    } else if (h === 'flower') {
      for (var fp = 0; fp < 5; fp++) { var fa = fp / 5 * Math.PI * 2; ell(ctx, S * .26 + Math.cos(fa) * S * .13, -S * .5 + Math.sin(fa) * S * .13, S * .1, S * .1); fs(ctx, L.accent); }
      ell(ctx, S * .26, -S * .5, S * .08, S * .08); fs(ctx, '#ffd23f');
    } else if (h === 'bob' || h === 'ponytail') {
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
    } else if (b.part === 'umbrella') {
      capsule(ctx, len, 4, '#7d8597');
      ctx.beginPath(); ctx.arc(-6, 0, 6, 0, Math.PI); ctx.stroke();
      var ry = W * .62, rx = W * .46;
      ctx.beginPath(); ctx.ellipse(len, 0, rx, ry, 0, -Math.PI / 2, Math.PI / 2);
      for (var ui = 0; ui < 3; ui++) { var y0 = ry - ui * ry * 2 / 3, y1 = ry - (ui + 1) * ry * 2 / 3; ctx.quadraticCurveTo(len + W * .14, (y0 + y1) / 2, len, y1); }
      ctx.closePath(); fs(ctx, c);
      ctx.save(); ctx.strokeStyle = shade(c, .78); ctx.lineWidth = 3; [ry / 3, -ry / 3].forEach(function (y) { ctx.beginPath(); ctx.moveTo(len + rx, 0); ctx.quadraticCurveTo(len + rx * .5, y * 1.1, len + 2, y); ctx.stroke(); }); ctx.restore();
      ell(ctx, len + rx + 5, 0, 4, 4); fs(ctx, '#7d8597');
    } else if (b.part === 'hammer') {
      rr(ctx, -4, -W * .32, len + 4, W * .64, 3); fs(ctx, '#c8814a');
      rr(ctx, len - 8, -W * 1.6, W * 2.1, W * 3.2, 5); fs(ctx, c); ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(len - 5, -W * 1.4, 4, W * 2.8);
    } else if (b.part === 'flag') {
      rr(ctx, -2, -3, len + 4, 6, 3); fs(ctx, '#e3e7ef'); ell(ctx, len + 5, 0, 5, 5); fs(ctx, '#ffd23f');
      var fx0 = len - 4, wv = function (u) { return Math.sin(t * 6 + u * 4) * 5; };
      ctx.beginPath(); ctx.moveTo(fx0, 2); ctx.quadraticCurveTo(fx0 + wv(.3), W * .65, fx0 + wv(1), W * 1.3); ctx.lineTo(fx0 - W * .9 + wv(1.2), W * 1.3);
      ctx.quadraticCurveTo(fx0 - W * .9 + wv(.5), W * .65, fx0 - W * .9, 2); ctx.closePath(); fs(ctx, c);
      star(ctx, fx0 - W * .45 + wv(.7) * .6, W * .66, W * .26); fs(ctx, '#ffffff');
    } else if (b.part === 'torch' || b.part === 'icecream' || b.part === 'mic') {
      if (b.part === 'torch') {
        ctx.beginPath(); ctx.moveTo(0, -W * .3); ctx.lineTo(len, -W * .5); ctx.lineTo(len, W * .5); ctx.lineTo(0, W * .3); ctx.closePath(); fs(ctx, '#8d5a3b');
        rr(ctx, len - 4, -W * .75, 10, W * 1.5, 3); fs(ctx, '#7d8597');
        var fl = 1 + Math.sin(t * 14) * .12 + Math.sin(t * 23) * .08, f0 = len + 6;
        ctx.beginPath(); ctx.moveTo(f0, -W * .8); ctx.quadraticCurveTo(f0 + W * 1.5, -W * 1.3, f0 + W * 3 * fl, Math.sin(t * 9) * 3); ctx.quadraticCurveTo(f0 + W * 1.5, W * 1.3, f0, W * .8); ctx.closePath(); fs(ctx, '#ffa63d');
        ctx.beginPath(); ctx.moveTo(f0, -W * .4); ctx.quadraticCurveTo(f0 + W * .9, -W * .7, f0 + W * 1.8 * fl, 0); ctx.quadraticCurveTo(f0 + W * .9, W * .7, f0, W * .4); ctx.closePath(); fill(ctx, '#ffd23f');
      } else if (b.part === 'icecream') {
        ctx.beginPath(); ctx.moveTo(-2, 0); ctx.lineTo(len, -W * .5); ctx.lineTo(len, W * .5); ctx.closePath(); fs(ctx, '#e8b26a');
        ctx.save(); ctx.clip(); ctx.strokeStyle = 'rgba(140,80,30,.5)'; ctx.lineWidth = 2; for (var ci = -2; ci < 4; ci++) { ctx.beginPath(); ctx.moveTo(ci * 9, -W); ctx.lineTo(ci * 9 + W, W); ctx.moveTo(ci * 9, W); ctx.lineTo(ci * 9 + W, -W); ctx.stroke(); } ctx.restore();
        ell(ctx, len + W * .4, 0, W * .44, W * .56); fs(ctx, c); ell(ctx, len + W * .98, 0, W * .36, W * .46); fs(ctx, '#ffb3d9');
        ell(ctx, len + W * 1.4, 0, 5, 5); fs(ctx, '#ff3048');
      } else {
        rr(ctx, 0, -W * .36, len, W * .72, 3); fs(ctx, '#3a3f55'); rr(ctx, len - 4, -W * .52, 7, W * 1.04, 2); fs(ctx, c);
        ell(ctx, len + W * .6, 0, W * .66, W * .66); fs(ctx, '#c9ced8');
        ctx.save(); ell(ctx, len + W * .6, 0, W * .66, W * .66); ctx.clip(); ctx.lineWidth = 1.6; for (var mi = -2; mi <= 2; mi++) { ctx.beginPath(); ctx.moveTo(len + W * .6 + mi * 4, -W); ctx.lineTo(len + W * .6 + mi * 4, W); ctx.moveTo(len, mi * 4); ctx.lineTo(len + W * 1.3, mi * 4); ctx.stroke(); } ctx.restore();
      }
    } else if (b.part === 'scarf') {
      rr(ctx, 0, -W * .45, len, W * .9, W * .3); fs(ctx, c);
      ctx.fillStyle = shade(c, .78); ctx.fillRect(len * .4, -W * .43, 5, W * .86); ctx.fillRect(len * .7, -W * .43, 5, W * .86);
      ctx.beginPath(); for (var si = -1; si <= 1; si++) { ctx.moveTo(len, si * W * .3); ctx.lineTo(len + 7, si * W * .34); } ctx.stroke();
      ell(ctx, 0, 0, W * .62, W * 1.75); fs(ctx, c); ctx.fillStyle = shade(c, .78); ctx.fillRect(-2, -W * 1.5, 4, W * 3);
    } else if (b.part === 'net') {
      rr(ctx, 0, -3, len, 6, 3); fs(ctx, '#c8814a');
      var nx = len + W * .5;
      ctx.beginPath(); ctx.moveTo(len, -W * .45); ctx.quadraticCurveTo(nx + W * .2, W * 1.3, len + W, W * .3); ctx.lineTo(len + W, -W * .1); ctx.closePath(); ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fill(); ctx.stroke();
      ctx.save(); ctx.lineWidth = 6; ell(ctx, nx, 0, W * .5, W * .45); ctx.stroke(); ctx.lineWidth = 3; ctx.strokeStyle = c; ctx.stroke(); ctx.restore();
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
      else if (b.kind === 'prop') { var ps = L.size || 1; ctx.scale(ps, ps); if (TL.drawProp) TL.drawProp(ctx, L.prop, L, st.t); }
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
    kick: '⚽', flap: '🐔', spin: '🌀', bounce: '🏀', slither: '🐛', hop: '🐸', wag: '🐶', fly: '🦸', roll: '🎳', wobble: '🍮', float: '🎈', shake: '💥' };
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
    },
    prop: function () {  // stage objects: turn (root) and lift (r)
      function op(rot, r) { return { b: { root: rot || 0 }, r: r || [0, 0] }; }
      return [
        A('idle', 'Still', 12, [K(0, op())], { emoji: '⏸️' }),
        A('bounce', 'Bounce', 12, [K(0, op(0, [0, 0])), K(6, op(0, [0, -64]))]),
        A('spin', 'Spin', 12, [K(0, op(0)), K(4, op(120)), K(8, op(240))], { ease: 'linear' }),
        A('roll', 'Roll', 8, [K(0, op(0)), K(3, op(135)), K(5, op(225))], { ease: 'linear' }),
        A('wobble', 'Wobble', 12, [K(0, op(-12)), K(6, op(12))]),
        A('float', 'Float', 24, [K(0, op(0, [0, 0])), K(12, op(3, [0, -18]))]),
        A('shake', 'Shake', 4, [K(0, op(0, [-6, 0])), K(2, op(0, [6, 0]))])
      ];
    }
  };
  TL._rig = { B: B, RIGS: RIGS, fs: fs, fill: fill, capsule: capsule, INK: INK };
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
    ['worm', 'Caterpillar', 'worm', { head: 'round', eyes: 'googly', mouth: 'grin', hat: 'antenna', skin: '#9be15d', shirt: '#9be15d', accent: '#c26bff' }],
    ['ghost', 'Ghost', 'biped', { head: 'round', eyes: 'big', mouth: 'open', torso: 'ghost', arms: 'noodle', legs: 'none', hands: 'mitt', feet: 'none',
      skin: '#ffffff', shirt: '#ffffff', accent: '#c26bff' }],
    ['dino', 'Dino', 'quad', { head: 'dino', eyes: 'big', mouth: 'grin', torso: 'belly', legs: 'block', feet: 'paw', skin: '#1fbf63', shirt: '#1fbf63', pants: '#1fbf63',
      hair: '#1fbf63', accent: '#ffd23f', size: 1.1 }],
    ['frog', 'Froggy', 'biped', { head: 'frog', eyes: 'big', mouth: 'smile', torso: 'belly', arms: 'noodle', legs: 'noodle', hands: 'mitt', feet: 'flipper',
      skin: '#7ed957', shirt: '#7ed957', pants: '#5cc24e', accent: '#ffd23f' }],
    ['bunny', 'Bunny', 'biped', { head: 'bunny', eyes: 'lashes', mouth: 'buck', torso: 'belly', arms: 'noodle', legs: 'noodle', hands: 'mitt', feet: 'paw',
      skin: '#ffffff', shirt: '#ffb3d9', pants: '#ffffff', accent: '#ff4fa3' }]
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
    ['p_wiggles', 'Wiggles', 'worm', { hat: 'tophat', hair: '#3a3f55', accent: '#ffd23f' }],
    ['p_kai', 'Ninja Kai', 'hero', { hat: 'ninja', torso: 'ninja', shirt: '#3a3f55', pants: '#3a3f55', shoes: '#1a1d3a', accent: '#ff3048', eyes: 'angry', mouth: 'smirk', skin: '#f1b07a' }, [['sword', '#c9ced8']]],
    ['p_ava', 'Astro Ava', 'hero', { hat: 'astro', torso: 'space', shirt: '#ffffff', pants: '#e3e7ef', shoes: '#7d8597', accent: '#ff8a2b', skin: '#c98a5a', eyes: 'big', mouth: 'grin' }, [['flag', '#ff4fa3']]],
    ['p_tex', 'Cowboy Tex', 'hero', { hat: 'cowboy', hair: '#8d5a3b', mouth: 'stache', shirt: '#ff6b6b', pants: '#2fa8ff', feet: 'boot', shoes: '#8d5a3b', skin: '#ffcf9e', accent: '#ffd23f' }],
    ['p_boo', 'Boo', 'ghost', {}],
    ['p_rex', 'Rex', 'dino', {}],
    ['p_hoppy', 'Prince Hoppy', 'frog', { hat: 'crown' }],
    ['p_jack', 'Pumpkin Jack', 'hero', { head: 'pumpkin', skin: '#ff8a2b', eyes: 'happy', mouth: 'grin', torso: 'suit', shirt: '#3a3f55', pants: '#3a3f55', accent: '#1fbf63', hands: 'glove' }, [['torch']]],
    ['p_bjorn', 'Bjorn', 'hero', { hat: 'viking', mouth: 'beard', hair: '#ff8a2b', torso: 'armor', shirt: '#8d5a3b', pants: '#5a3a26', feet: 'boot', shoes: '#5a3a26', skin: '#ffcf9e', width: 1.2, accent: '#2fa8ff' }, [['hammer', '#c9ced8'], ['shield']]],
    ['p_bamboo', 'Bamboo', 'hero', { head: 'panda', skin: '#ffffff', eyes: 'big', torso: 'belly', shirt: '#3a3f55', arms: 'noodle', pants: '#3a3f55', feet: 'paw', width: 1.2, accent: '#1fbf63' }],
    ['p_rusty', 'Rusty', 'kitty', { head: 'fox', skin: '#ff8a2b', shirt: '#ff8a2b', pants: '#ff8a2b', hair: '#ff8a2b', eyes: 'dots', mouth: 'smirk', accent: '#ffffff' }],
    ['p_squeak', 'Squeak', 'hero', { head: 'mouse', skin: '#c9ced8', eyes: 'big', mouth: 'buck', torso: 'overalls', shirt: '#ffd23f', pants: '#2fa8ff', arms: 'noodle', legs: 'noodle', size: .85, accent: '#ff4fa3' }, [['icecream']]],
    ['p_pepper', 'Chef Pepper', 'hero', { hat: 'chef', mouth: 'stache', hair: '#3a3f55', torso: 'tee', shirt: '#ffffff', pants: '#3a3f55', skin: '#c98a5a', accent: '#ff3048', width: 1.15 }],
    ['p_beats', 'DJ Beats', 'hero', { hat: 'afro', hair: '#1a1d3a', eyes: 'shades', torso: 'hoodie', shirt: '#c26bff', pants: '#3a3f55', skin: '#8d5a3b', accent: '#22d3c5', mouth: 'grin' }, [['mic']]],
    ['p_bones', 'Mr Bones', 'stick', { head: 'skull', skin: '#ffffff', eyes: 'big', mouth: 'teeth', hat: 'tophat', hair: '#3a3f55', accent: '#ff4fa3', headSize: 1 }],
    ['p_coco', 'Coco', 'hero', { head: 'monkey', skin: '#b5651d', eyes: 'big', mouth: 'grin', torso: 'tee', shirt: '#ffd23f', pants: '#ff8a2b', arms: 'noodle', legs: 'noodle', feet: 'paw', accent: '#ff4fa3' }, [['tail', '#b5651d']]],
    ['p_rosie', 'Rosie', 'hero', { hat: 'ponytail', hair: '#ff6b6b', torso: 'overalls', shirt: '#ffffff', pants: '#4757ff', skin: '#ffcf9e', eyes: 'lashes', accent: '#ffd23f' }, [['umbrella', '#ff4fa3']]],
    ['p_flash', 'Flash', 'hero', { hat: 'mohawk', hair: '#22d3c5', torso: 'jersey', shirt: '#ff3048', pants: '#3a3f55', accent: '#ffffff', mouth: 'grin', skin: '#f1b07a' }],
    ['p_pip', 'Pip', 'hero', { hat: 'beanie', hair: '#1fbf63', eyes: 'specs', torso: 'hoodie', shirt: '#1fbf63', pants: '#8d5a3b', skin: '#ffd23f', accent: '#ffd23f', size: .9 }, [['net', '#ffffff']]],
    ['p_bunbun', 'Bun Bun', 'bunny', { hat: 'flower' }]
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
    if (ch.rig === 'prop') { L.accent = pick(TL.COLORS); L.shirt = pick(TL.COLORS); return ch; }
    ['eyes', 'mouth', 'hat'].forEach(function (k) { L[k] = pick(TL.PARTS[k])[0]; });
    if (ch.rig === 'biped') { ['head', 'torso', 'hands', 'feet'].forEach(function (k) { L[k] = pick(TL.PARTS[k])[0]; }); L.arms = pick(TL.PARTS.arms.slice(0, 5))[0]; L.legs = pick(TL.PARTS.legs.slice(0, 5))[0]; if (L.torso === 'stick' || L.torso === 'ghost') L.torso = 'block'; }
    else L.head = pick(['round', 'cat', 'bear', 'dog', 'bunny', 'alien']);
    ['skin', 'shirt', 'pants', 'shoes', 'hair', 'accent'].forEach(function (k) { L[k] = pick(TL.COLORS); });
    if (L.skin === '#1a1d3a') L.skin = '#ffd23f';
    return ch;
  };
  TL.lum = lum;
})();
