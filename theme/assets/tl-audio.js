/* _tl_audio: sound. The premade sound effects and music loops are synthesized in the browser (Web Audio,
     OfflineAudioContext), so they cost nothing to host and belong to nobody else. Also: loading uploaded sounds,
     loudness envelopes (lip-sync + waveforms), the movie mixer, voice effects and the microphone recorder. */
(function () {
  'use strict';
  var TL = window.TL = window.TL || {};
  var SR = 22050;

  /* ------------------------------------------------------------------ the shared AudioContext (made on first use) */
  var actx = null;
  TL.audioCtx = function () {
    if (!actx) {
      var C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      actx = new C();
      try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
    }
    if (actx.state === 'suspended') { try { actx.resume(); } catch (e) {} }
    return actx;
  };

  /* ------------------------------------------------------------------ tiny synth (works in any (Offline)AudioContext) */
  function note(n) {
    if (typeof n === 'number') return n;
    var m = /^([A-G])(#|b)?(-?\d)$/.exec(n); if (!m) return 440;
    var semi = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
    return 440 * Math.pow(2, ((+m[3] + 1) * 12 + semi - 69) / 12);
  }
  TL.noteFreq = note;
  var noiseCache = new WeakMap();
  function noiseBuf(ctx) {
    if (noiseCache.has(ctx)) return noiseCache.get(ctx);
    var b = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), d = b.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    noiseCache.set(ctx, b); return b;
  }
  function env(ctx, g, t, a, dur, vol, curve) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + Math.max(.002, a));
    if (curve === 'lin') g.gain.linearRampToValueAtTime(0.0001, t + dur);
    else g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(a + .01, dur));
  }
  function filt(ctx, type, f, q) { var x = ctx.createBiquadFilter(); x.type = type; x.frequency.value = f; x.Q.value = q || 1; return x; }
  /* tone: {type, f, f1 (slide to), t, dur, vol, a, curve, vib: [rate, depth], lp, detune} */
  function tone(ctx, dest, o) {
    var t = o.t || 0, osc = ctx.createOscillator(), g = ctx.createGain(), last = g;
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(note(o.f), t);
    if (o.f1) (o.slide === 'lin' ? osc.frequency.linearRampToValueAtTime(note(o.f1), t + (o.sd || o.dur)) : osc.frequency.exponentialRampToValueAtTime(note(o.f1), t + (o.sd || o.dur)));
    if (o.detune) osc.detune.value = o.detune;
    if (o.vib) { var l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = o.vib[0]; lg.gain.value = o.vib[1]; l.connect(lg); lg.connect(osc.frequency); l.start(t); l.stop(t + o.dur + .05); }
    osc.connect(g);
    if (o.lp) { var f = filt(ctx, 'lowpass', o.lp, o.q || .8); g.connect(f); last = f; if (o.lp1) { f.frequency.setValueAtTime(o.lp, t); f.frequency.exponentialRampToValueAtTime(o.lp1, t + o.dur); } }
    last.connect(dest);
    env(ctx, g, t, o.a || .005, o.dur, o.vol == null ? .5 : o.vol, o.curve);
    osc.start(t); osc.stop(t + o.dur + .05);
  }
  /* noise: {t, dur, vol, a, type (filter), f, f1, q, curve} */
  function noise(ctx, dest, o) {
    var t = o.t || 0, s = ctx.createBufferSource(), g = ctx.createGain(), f = filt(ctx, o.type || 'lowpass', o.f || 2000, o.q || .7);
    s.buffer = noiseBuf(ctx); s.loop = true;
    if (o.f1) { f.frequency.setValueAtTime(o.f, t); f.frequency.exponentialRampToValueAtTime(o.f1, t + (o.sd || o.dur)); }
    s.connect(f); f.connect(g); g.connect(dest);
    env(ctx, g, t, o.a || .003, o.dur, o.vol == null ? .5 : o.vol, o.curve);
    s.start(t, Math.random()); s.stop(t + o.dur + .05);
  }
  var DRUM = {
    kick: function (ctx, d, t, v) { tone(ctx, d, { f: 150, f1: 45, t: t, dur: .28, vol: .9 * v, sd: .12 }); },
    snare: function (ctx, d, t, v) { noise(ctx, d, { t: t, dur: .16, vol: .45 * v, type: 'highpass', f: 1200 }); tone(ctx, d, { f: 210, f1: 150, t: t, dur: .1, vol: .3 * v, type: 'triangle' }); },
    hat: function (ctx, d, t, v) { noise(ctx, d, { t: t, dur: .05, vol: .22 * v, type: 'highpass', f: 7000 }); },
    clap: function (ctx, d, t, v) { [0, .012, .024].forEach(function (k) { noise(ctx, d, { t: t + k, dur: .1, vol: .35 * v, type: 'bandpass', f: 1500, q: 1.2 }); }); },
    crash: function (ctx, d, t, v) { noise(ctx, d, { t: t, dur: 1.4, vol: .3 * v, type: 'highpass', f: 5000 }); }
  };
  var INST = {
    pluck: function (ctx, d, t, f, dur, v) { tone(ctx, d, { type: 'triangle', f: f, t: t, dur: .32, vol: .32 * v }); tone(ctx, d, { type: 'square', f: f, t: t, dur: .12, vol: .06 * v, lp: 2600 }); },
    pizz: function (ctx, d, t, f, dur, v) { tone(ctx, d, { type: 'triangle', f: f, t: t, dur: .16, vol: .42 * v, lp: 1800 }); },
    bass: function (ctx, d, t, f, dur, v) { tone(ctx, d, { type: 'square', f: f, t: t, dur: Math.max(.18, dur * .9), vol: .22 * v, lp: 520, curve: 'lin' }); },
    sub: function (ctx, d, t, f, dur, v) { tone(ctx, d, { type: 'sine', f: f, t: t, dur: Math.max(.15, dur * .95), vol: .55 * v, curve: 'lin' }); },
    lead: function (ctx, d, t, f, dur, v) { tone(ctx, d, { type: 'square', f: f, t: t, a: .01, dur: Math.max(.12, dur * .92), vol: .12 * v, lp: 2400, vib: [6, 4], curve: 'lin' }); },
    brass: function (ctx, d, t, f, dur, v) { tone(ctx, d, { type: 'sawtooth', f: f, t: t, a: .03, dur: Math.max(.15, dur * .95), vol: .16 * v, lp: 700, lp1: 2200, vib: [5, 3], curve: 'lin' }); },
    pad: function (ctx, d, t, f, dur, v) { [-8, 8].forEach(function (dt) { tone(ctx, d, { type: 'sawtooth', f: f, t: t, a: .35, dur: dur + .3, vol: .06 * v, lp: 1100, detune: dt, curve: 'lin' }); }); },
    bell: function (ctx, d, t, f, dur, v) { tone(ctx, d, { f: f, t: t, dur: 1.2, vol: .22 * v }); tone(ctx, d, { f: note(f) * 2.01, t: t, dur: .6, vol: .07 * v }); },
    organ: function (ctx, d, t, f, dur, v) { [1, 2, 3].forEach(function (h, i) { tone(ctx, d, { f: note(f) * h, t: t, a: .04, dur: dur, vol: [.14, .06, .04][i] * v, curve: 'lin', vib: [5.5, 2] }); }); },
    piano: function (ctx, d, t, f, dur, v) { tone(ctx, d, { type: 'triangle', f: f, t: t, dur: 1.4, vol: .26 * v }); tone(ctx, d, { f: note(f) * 2, t: t, dur: .5, vol: .06 * v }); }
  };
  /* A pattern string: one token per step. '.' rest, '-' hold the previous note, 'x' drum hit, or a note like C4. */
  function seq(ctx, dest, bpm, tracks) {
    var step = 60 / bpm / 4;
    tracks.forEach(function (tr) {
      var toks = tr[1].trim().split(/\s+/), vol = tr[2] == null ? 1 : tr[2];
      toks.forEach(function (tk, i) {
        if (tk === '.' || tk === '-') return;
        var len = 1; while (toks[i + len] === '-') len++;
        var t = i * step;
        if (DRUM[tr[0]]) { if (tk !== '.') DRUM[tr[0]](ctx, dest, t, tk === 'X' ? 1.3 * vol : vol); }
        else tk.split('+').forEach(function (n) { INST[tr[0]](ctx, dest, t, n, len * step, vol); });
      });
    });
  }
  function rep(s, n) { var o = []; for (var i = 0; i < n; i++) o.push(s); return o.join(' '); }
  /* Spread chords over bars: chords like 'C4+E4+G4', one per bar, as an arpeggio pattern of chord tone indexes. */
  function arp(chords, pat) {
    return chords.map(function (c) { var ns = c.split('+'); return pat.split(' ').map(function (k) { return k === '.' || k === '-' ? k : ns[+k % ns.length]; }).join(' '); }).join(' ');
  }
  function bars(notes) { return notes.join(' '); }

  /* ------------------------------------------------------------------ premade sounds */
  var SOUNDS = [
    ['boing', 'Boing', '🦘', .8, function (c, d) { tone(c, d, { f: 160, f1: 340, t: 0, dur: .7, sd: .5, vol: .7, vib: [16, 60] }); }],
    ['pop', 'Pop', '🫧', .25, function (c, d) { tone(c, d, { f: 900, f1: 180, t: 0, dur: .09, sd: .06, vol: .8 }); noise(c, d, { t: 0, dur: .02, vol: .3, f: 4000 }); }],
    ['whoosh', 'Whoosh', '💨', .9, function (c, d) { noise(c, d, { t: 0, dur: .8, vol: .6, a: .3, type: 'bandpass', f: 300, f1: 2800, q: 1.4, curve: 'lin' }); }],
    ['zip', 'Zip', '⚡', .3, function (c, d) { tone(c, d, { f: 380, f1: 2600, t: 0, dur: .2, sd: .16, vol: .4, type: 'triangle' }); }],
    ['slideup', 'Slide up', '⬆️', 1, function (c, d) { tone(c, d, { f: 300, f1: 1500, t: 0, dur: .95, sd: .9, vol: .45, vib: [7, 12], a: .05 }); }],
    ['slidedown', 'Slide down', '⬇️', 1.1, function (c, d) { tone(c, d, { f: 1500, f1: 240, t: 0, dur: 1.05, sd: 1, vol: .45, vib: [7, 12], a: .05 }); }],
    ['bonk', 'Bonk', '🔨', .45, function (c, d) { tone(c, d, { f: 190, f1: 55, t: 0, dur: .35, sd: .2, vol: .9 }); tone(c, d, { f: 620, t: 0, dur: .07, vol: .25, type: 'square', lp: 1500 }); noise(c, d, { t: 0, dur: .05, vol: .3, f: 1800 }); }],
    ['ding', 'Ding', '🔔', 1.6, function (c, d) { tone(c, d, { f: 1320, t: 0, dur: 1.6, vol: .4 }); tone(c, d, { f: 2640, t: 0, dur: .8, vol: .12 }); tone(c, d, { f: 3960, t: 0, dur: .4, vol: .06 }); }],
    ['zap', 'Zap', '🔫', .4, function (c, d) { tone(c, d, { f: 1900, f1: 110, t: 0, dur: .35, sd: .3, vol: .25, type: 'square', lp: 3000 }); }],
    ['splash', 'Splash', '💦', 1.2, function (c, d) { noise(c, d, { t: 0, dur: 1, vol: .7, f: 3500, f1: 400, a: .01 }); [0.2, .35, .5, .6, .8].forEach(function (t, i) { tone(c, d, { f: 600 + i * 150, f1: 1200 + i * 200, t: t, dur: .08, vol: .15 }); }); }],
    ['drumroll', 'Drum roll', '🥁', 2.2, function (c, d) { for (var t = 0; t < 1.5; t += .045) DRUM.snare(c, d, t, .25 + t * .45); DRUM.crash(c, d, 1.55, 1.2); DRUM.kick(c, d, 1.55, 1); }],
    ['rimshot', 'Ba-dum-tss', '😂', 1.6, function (c, d) { DRUM.snare(c, d, 0, 1); DRUM.kick(c, d, .22, 1); DRUM.snare(c, d, .22, .5); DRUM.crash(c, d, .44, 1); }],
    ['tada', 'Ta-da!', '🎉', 1.5, function (c, d) { ['C5', 'E5', 'G5'].forEach(function (n) { INST.brass(c, d, 0, n, .14, 1.4); }); ['C5', 'E5', 'G5', 'C6'].forEach(function (n) { INST.brass(c, d, .2, n, 1.1, 1.4); }); DRUM.crash(c, d, .2, .8); }],
    ['sad', 'Wah wah waaah', '😢', 2.6, function (c, d) { [['D4', 0, .42], ['C#4', .48, .42], ['C4', .96, .42], ['B3', 1.44, 1.1]].forEach(function (n, i) { tone(c, d, { type: 'sawtooth', f: n[0], t: n[1], a: .04, dur: n[2], vol: .25, lp: 900, lp1: i === 3 ? 400 : 1300, vib: i === 3 ? [6, 6] : null, curve: 'lin' }); }); }],
    ['steps', 'Footsteps', '👣', 1.3, function (c, d) { for (var i = 0; i < 4; i++) { var t = i * .3; noise(c, d, { t: t, dur: .09, vol: .5, f: 900 }); tone(c, d, { f: 90, f1: 50, t: t, dur: .1, vol: .5 }); } }],
    ['honk', 'Honk honk', '📯', .9, function (c, d) { [0, .42].forEach(function (t) { tone(c, d, { f: 420, f1: 470, t: t, dur: .3, vol: .18, type: 'square', lp: 1800, curve: 'lin' }); tone(c, d, { f: 530, f1: 590, t: t, dur: .3, vol: .12, type: 'square', lp: 1800, curve: 'lin' }); }); }],
    ['applause', 'Applause', '👏', 2.6, function (c, d) { var r = 0; for (var t = 0; t < 2.3; t += .018) { r = (r * 9301 + 49297) % 233280; var k = r / 233280; noise(c, d, { t: t + k * .02, dur: .05, vol: .13 * (t > 1.8 ? (2.3 - t) * 2 : 1), type: 'bandpass', f: 1000 + k * 1600, q: 1.5 }); } }],
    ['magic', 'Magic', '✨', 1.6, function (c, d) { ['C6', 'E6', 'G6', 'C7', 'E7', 'G7'].forEach(function (n, i) { INST.bell(c, d, i * .07, n, .2, .8); }); noise(c, d, { t: 0, dur: 1, vol: .06, type: 'highpass', f: 8000, a: .3 }); }],
    ['boom', 'Boom', '💥', 1.8, function (c, d) { noise(c, d, { t: 0, dur: 1.6, vol: .9, f: 600, f1: 50 }); tone(c, d, { f: 80, f1: 30, t: 0, dur: 1, vol: .9 }); }],
    ['bark', 'Woof!', '🐶', .7, function (c, d) { [0, .3].forEach(function (t) { tone(c, d, { type: 'sawtooth', f: 520, f1: 280, t: t, dur: .14, sd: .12, vol: .35, lp: 1100, q: 3 }); noise(c, d, { t: t, dur: .08, vol: .2, type: 'bandpass', f: 900 }); }); }],
    ['squeak', 'Squeak', '🐭', .3, function (c, d) { tone(c, d, { f: 1900, f1: 2700, t: 0, dur: .1, sd: .08, vol: .3 }); tone(c, d, { f: 2700, f1: 1800, t: .1, dur: .1, sd: .1, vol: .3 }); }],
    ['crickets', 'Crickets', '🦗', 2.2, function (c, d) { for (var i = 0; i < 4; i++) for (var j = 0; j < 3; j++) tone(c, d, { f: 4600, t: i * .55 + j * .06, dur: .04, vol: .12 }); }]
  ];
  TL.SOUNDS = SOUNDS.map(function (s) { return { id: 'b:s_' + s[0], name: s[1], emoji: s[2], dur: s[3], kind: 'sound', render: s[4] }; });

  /* ------------------------------------------------------------------ premade music loops (4 bars each) */
  var MUSIC = [
    ['sunny', 'Sunny Day', '☀️', 112, function (c, d) {
      var ch = ['C4+E4+G4', 'G3+B3+D4', 'A3+C4+E4', 'F3+A3+C4'];
      seq(c, d, 112, [['pluck', arp(ch, '0 1 2 1 0 1 2 1 0 1 2 1 0 1 2 1'), .8],
        ['bass', bars(['C3 . . . C3 . G2 . C3 . . . G2 . . .', 'G2 . . . G2 . D3 . G2 . . . D3 . . .', 'A2 . . . A2 . E3 . A2 . . . E3 . . .', 'F2 . . . F2 . C3 . F2 . . . C3 . . .']), 1],
        ['lead', 'E5 - . G5 . E5 D5 - C5 - . . . . . . D5 - . G5 . D5 B4 - G4 - . . . . . . C5 - . E5 . C5 A4 - E5 - . D5 C5 - . . A4 - . C5 . A4 G4 - F4 - . . . . . .', .9],
        ['kick', rep('x . . . . . . . x . . . . . . .', 4)], ['snare', rep('. . . . x . . . . . . . x . . .', 4), .7], ['hat', rep('. . x . . . x . . . x . . . x .', 4), .8]]);
    }],
    ['chase', 'Big Chase', '🏃', 160, function (c, d) {
      seq(c, d, 160, [['bass', bars(['A2 A2 A3 A2 A2 A2 A3 A2 A2 A2 A3 A2 A2 A2 A3 A2', 'F2 F2 F3 F2 F2 F2 F3 F2 F2 F2 F3 F2 F2 F2 F3 F2', 'G2 G2 G3 G2 G2 G2 G3 G2 G2 G2 G3 G2 G2 G2 G3 G2', 'E2 E2 E3 E2 E2 E2 E3 E2 E2 E2 E3 E2 G#2 G#2 G#3 G#2']), 1],
        ['lead', 'A4 . C5 . E5 . A5 - G5 . E5 . C5 . D5 - F4 . A4 . C5 . F5 - E5 . C5 . A4 . C5 - G4 . B4 . D5 . G5 - F5 . D5 . B4 . D5 - E5 - . . E5 . . . G#5 - . . B5 - . .', .9],
        ['kick', rep('x . . . x . . . x . . . x . . .', 4)], ['snare', rep('. . . . x . . . . . . . x . x x', 4), .7], ['hat', rep('x x x x x x x x x x x x x x x x', 4), .5]]);
    }],
    ['sneaky', 'Sneaky Steps', '🤫', 96, function (c, d) {
      seq(c, d, 96, [['pizz', bars(['D3 . . . F3 . . . A3 . . . G#3 . . .', 'G3 . . . A#3 . . . A3 . . . F3 . . .', 'D3 . . . F3 . . . A3 . . . C4 . . .', 'A#3 . . . A3 . . . G#3 . . . A3 . . .']), 1.2],
        ['pizz', '. . D5 . . . F5 . . . E5 . D5 . . . . . G5 . . . F5 . E5 . . . D5 . . . . . D5 . . . F5 . . . A5 . G#5 . A5 . . . A#5 . A5 . G5 . F5 . E5 . . .', .8],
        ['hat', rep('. . x . . . x . . . x . . . x .', 4), .4], ['kick', rep('x . . . . . . . x . . . . . . .', 4), .6]]);
    }],
    ['spooky', 'Spooky Manor', '👻', 84, function (c, d) {
      seq(c, d, 84, [['organ', bars(['E3+G3+B3 - - - - - - - - - - - - - - -', 'C3+E3+G3 - - - - - - - - - - - - - - -', 'A2+C3+E3 - - - - - - - - - - - - - - -', 'B2+D#3+F#3 - - - - - - - - - - - - - - -']), 1],
        ['bell', 'E5 . . . G5 . . . F#5 . . . D#5 . . . E5 . . . C5 . . . B4 . . . G4 . . . A4 . . . C5 . . . E5 . . . D#5 . . . F#5 . . . D#5 . . . B4 . . . . . . .', .9]]);
    }],
    ['space', 'Space Float', '🪐', 90, function (c, d) {
      var ch = ['D4+F#4+A4+C#5', 'B3+D4+F#4+A4', 'G3+B3+D4+F#4', 'A3+C#4+E4+G4'];
      seq(c, d, 90, [['pad', ch.map(function (x) { return x + ' - - - - - - - - - - - - - - -'; }).join(' '), 1],
        ['bell', arp(ch, '0 . 1 . 2 . 3 . 2 . 1 . 3 . 2 .').replace(/([A-G]#?)(\d)/g, function (m, a, o) { return a + (+o + 1); }), .5],
        ['sub', bars(['D2 - - - - - - - - - - - - - - -', 'B1 - - - - - - - - - - - - - - -', 'G1 - - - - - - - - - - - - - - -', 'A1 - - - - - - - - - - - - - - -']), .7]]);
    }],
    ['hero', 'Hero Time', '🦸', 120, function (c, d) {
      seq(c, d, 120, [['brass', 'C4 - . G3 C4 - E4 - G4 - - - E4 - C4 - F4 - . C4 F4 - A4 - C5 - - - A4 - F4 - G4 - . D4 G4 - B4 - D5 - - - B4 - G4 - C5 - - - G4 - E4 - C5 - - - - - - -', 1],
        ['bass', bars(['C3 . . . G2 . . . C3 . . . G2 . . .', 'F2 . . . C3 . . . F2 . . . C3 . . .', 'G2 . . . D3 . . . G2 . . . D3 . . .', 'C3 . . . G2 . . . C3 . . . . . . .']), 1],
        ['snare', rep('x . x x x . x . x . x x x . x .', 4), .5], ['kick', rep('x . . . x . . . x . . . x . . .', 4), .8]]);
    }],
    ['party', 'Dance Party', '🪩', 124, function (c, d) {
      seq(c, d, 124, [['kick', rep('X . . . X . . . X . . . X . . .', 4)], ['clap', rep('. . . . x . . . . . . . x . . .', 4), .9], ['hat', rep('. . x . . . x . . . x . . . x .', 4), .9],
        ['sub', bars(['A1 . A2 . . A1 . A2 A1 . A2 . . A1 A2 .', 'F1 . F2 . . F1 . F2 F1 . F2 . . F1 F2 .', 'C2 . C3 . . C2 . C3 C2 . C3 . . C2 C3 .', 'G1 . G2 . . G1 . G2 G1 . G2 . . G1 G2 .']), .9],
        ['lead', 'A4 . A4 . C5 . A4 . E5 - D5 . C5 . . . A4 . A4 . C5 . A4 . F5 - E5 . C5 . . . C5 . C5 . E5 . C5 . G5 - F5 . E5 . . . D5 . D5 . B4 . G4 . B4 - D5 . G5 . . .', .8]]);
    }],
    ['rain', 'Sad Rain', '🌧️', 70, function (c, d) {
      var ch = ['A3+C4+E4', 'F3+A3+C4', 'C3+E3+G3', 'G3+B3+D4'];
      seq(c, d, 70, [['piano', arp(ch, '0 . 1 . 2 . 1 . 0 . 1 . 2 . 1 .'), 1], ['piano', bars(['A2 - - - - - - - - - - - - - - -', 'F2 - - - - - - - - - - - - - - -', 'C2 - - - - - - - - - - - - - - -', 'G2 - - - - - - - - - - - - - - -']), .8]]);
    }]
  ];
  TL.MUSIC = MUSIC.map(function (m) { return { id: 'b:m_' + m[0], name: m[1], emoji: m[2], bpm: m[3], dur: 64 * 60 / m[3] / 4, kind: 'music', render: m[4] }; });
  TL.builtinAudio = function (id) { return TL.SOUNDS.concat(TL.MUSIC).filter(function (s) { return s.id === id; })[0] || null; };

  /* ------------------------------------------------------------------ getting AudioBuffers */
  var bufs = {};
  TL.getBuffer = function (ref) {
    if (!ref) return Promise.resolve(null);
    if (bufs[ref]) return bufs[ref];
    var b = TL.builtinAudio(ref), p;
    if (b) {
      var OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
      if (!OAC) return Promise.resolve(null);
      var dur = b.kind === 'music' ? b.dur : b.dur + .15, ctx = new OAC(1, Math.ceil(SR * dur), SR), out = ctx.createGain();
      out.gain.value = b.kind === 'music' ? .9 : 1; out.connect(ctx.destination);
      try { b.render(ctx, out); } catch (e) { console.error(e); }
      p = ctx.startRendering();
    } else {
      var a = TL.assetIndex[ref];
      if (!a) return Promise.resolve(null);
      p = fetch(a.url).then(function (r) { return r.arrayBuffer(); }).then(function (ab) {
        var ac = TL.audioCtx();
        return new Promise(function (res, rej) { ac.decodeAudioData(ab, res, rej); });
      });
    }
    bufs[ref] = p.catch(function (e) { console.warn('audio', ref, e); delete bufs[ref]; return null; });
    return bufs[ref];
  };
  TL.decodeBlob = function (blob) {
    return blob.arrayBuffer().then(function (ab) { var ac = TL.audioCtx(); return new Promise(function (res, rej) { ac.decodeAudioData(ab, res, rej); }); });
  };
  /* Loudness at 30 steps a second, 0..1 (for mouths that move with a voice, and waveforms). */
  var envs = new WeakMap();
  TL.envelope = function (buf) {
    if (!buf) return null;
    if (envs.has(buf)) return envs.get(buf);
    var d = buf.getChannelData(0), hop = Math.floor(buf.sampleRate / 30), n = Math.ceil(d.length / hop), out = new Float32Array(n), max = 1e-4;
    for (var i = 0; i < n; i++) { var s = 0, c = 0; for (var j = i * hop; j < Math.min(d.length, (i + 1) * hop); j += 4) { s += d[j] * d[j]; c++; } out[i] = Math.sqrt(s / Math.max(1, c)); if (out[i] > max) max = out[i]; }
    for (var k = 0; k < n; k++) out[k] = Math.min(1, out[k] / max * 1.15);
    envs.set(buf, out); return out;
  };
  TL.drawWave = function (cv, buf, color) {
    var ctx = cv.getContext('2d'), w = cv.width, h = cv.height, e = TL.envelope(buf);
    ctx.clearRect(0, 0, w, h); if (!e) return;
    ctx.fillStyle = color || '#4757ff';
    for (var x = 0; x < w; x += 3) { var v = e[Math.floor(x / w * e.length)] || 0, bh = Math.max(2, v * h * .9); ctx.fillRect(x, (h - bh) / 2, 2, bh); }
  };
  TL.clipLen = function (clip, buf) {
    if (clip.kind === 'music') return clip.len || (buf ? buf.duration : 8);
    var d = buf ? buf.duration : ((TL.builtinAudio(clip.asset) || TL.assetIndex[clip.asset] || {}).dur || 1);
    return d / (clip.rate || 1);
  };

  /* ------------------------------------------------------------------ previews (library, pickers) */
  var preview = null;
  TL.stopPreview = function () { if (preview) { try { preview.stop(); } catch (e) {} preview = null; } };
  TL.preview = function (ref, opts) {
    TL.stopPreview(); opts = opts || {};
    var ac = TL.audioCtx(); if (!ac) return Promise.resolve();
    return TL.getBuffer(ref).then(function (buf) {
      if (!buf) return;
      var s = ac.createBufferSource(); s.buffer = buf; s.playbackRate.value = opts.rate || 1;
      var g = ac.createGain(); g.gain.value = opts.vol == null ? .9 : opts.vol;
      s.connect(fx(ac, g, opts.fx)); g.connect(ac.destination);
      s.start(); if (TL.builtinAudio(ref) && TL.builtinAudio(ref).kind === 'music') s.stop(ac.currentTime + Math.min(buf.duration, 8));
      preview = s; s.onended = function () { if (preview === s) preview = null; if (opts.onend) opts.onend(); };
    });
  };
  /* Voice effects: robot (ring modulation), echo. Returns the node to connect the source into. */
  function fx(ac, dest, kind) {
    if (kind === 'robot') {
      var g = ac.createGain(), o = ac.createOscillator(), og = ac.createGain();
      g.gain.value = 0; o.frequency.value = 55; o.type = 'square'; og.gain.value = 1; o.connect(og); og.connect(g.gain); o.start();
      g.connect(dest); return g;
    }
    if (kind === 'echo') {
      var inp = ac.createGain(), dl = ac.createDelay(1), fb = ac.createGain();
      dl.delayTime.value = .22; fb.gain.value = .38; inp.connect(dest); inp.connect(dl); dl.connect(fb); fb.connect(dl); dl.connect(dest);
      return inp;
    }
    return dest;
  }
  TL.VOICE_FX = [['normal', 'Normal', '🙂', 1, ''], ['giant', 'Giant', '🦣', .72, ''], ['chipmunk', 'Chipmunk', '🐿️', 1.45, ''], ['mouse', 'Tiny', '🐭', 1.8, ''], ['robot', 'Robot', '🤖', 1, 'robot'], ['echo', 'Echo', '🏔️', 1, 'echo']];

  /* ------------------------------------------------------------------ the movie mixer
     m = TL.mixer(movie); m.start(fromSec[, {extraDest, mute}]); m.stop(). Buffers must be loaded first (TL.preloadAudio). */
  TL.preloadAudio = function (movie) {
    var refs = {}; (movie.clips || []).forEach(function (c) { refs[c.asset] = 1; });
    return Promise.all(Object.keys(refs).map(TL.getBuffer));
  };
  TL.mixer = function (movie) {
    var nodes = [], ac = null, master = null;
    return {
      start: function (from, opts) {
        this.stop(); opts = opts || {};
        ac = TL.audioCtx(); if (!ac) return;
        master = ac.createGain(); master.gain.value = opts.mute ? 0 : .95; master.connect(ac.destination);
        if (opts.extraDest) master.connect(opts.extraDest);
        var now = ac.currentTime + .03;
        (movie.clips || []).forEach(function (c) {
          if (c.muted) return;
          var p = bufs[c.asset]; if (!p) return;
          p.then(function (buf) {
            if (!buf || !master) return;
            var len = TL.clipLen(c, buf), end = c.t + len, rate = c.rate || 1;
            var tNow = from + Math.max(0, ac.currentTime - now);  // the movie time right now (a buffer may arrive late)
            if (end <= tNow) return;
            var s = ac.createBufferSource(); s.buffer = buf; s.playbackRate.value = rate;
            var g = ac.createGain(); g.gain.value = c.vol == null ? (c.kind === 'music' ? .55 : 1) : c.vol;
            s.connect(fx(ac, g, c.fx)); g.connect(master);
            var when, off;
            if (c.t >= tNow) { when = now + (c.t - from); off = 0; } else { when = Math.max(now, ac.currentTime); off = tNow - c.t; }
            if (c.kind === 'music') { s.loop = true; s.start(when, (off * rate) % buf.duration); s.stop(when + (end - Math.max(tNow, c.t))); }
            else { s.start(when, off * rate); }
            nodes.push(s);
          });
        });
      },
      stop: function () {
        nodes.forEach(function (n) { try { n.stop(); } catch (e) {} });
        nodes = [];
        if (master) { try { master.disconnect(); } catch (e) {} master = null; }
      }
    };
  };
  /* How open each actor's mouth is at time t: voices linked to the actor (their loudness), or a speech bubble. */
  TL.mouthAt = function (movie, actorId, t) {
    var m = 0;
    (movie.clips || []).forEach(function (c) {
      if (c.actor !== actorId || c.kind !== 'voice' || c.muted) return;
      var p = bufs[c.asset], buf = p && p._buf;
      if (!buf) { if (p && !p._hooked) { p._hooked = true; p.then(function (b) { p._buf = b; }); } return; }
      var local = (t - c.t) * (c.rate || 1);
      if (local < 0 || local > buf.duration) return;
      var e = TL.envelope(buf), v = e[Math.floor(local * 30)] || 0;
      m = Math.max(m, v > .12 ? Math.min(1, v * 1.3) : 0);
    });
    (movie.bubbles || []).forEach(function (b) {
      if (b.actor !== actorId || t < b.t0 || t > b.t1 || b.style === 'think') return;
      m = Math.max(m, .55 + .45 * Math.sin(t * 22));
    });
    return m;
  };

  /* ------------------------------------------------------------------ microphone recorder (only while you hold "record") */
  TL.micRecorder = function () {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.MediaRecorder) {
      return Promise.reject(Object.assign(new Error('This browser can\'t record sound. Try Chrome, Edge, Firefox or Safari.'), { uiApi: true }));
    }
    return navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }).then(function (stream) {
      var types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'], type = types.filter(function (t) { return MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t); })[0];
      var rec = new MediaRecorder(stream, type ? { mimeType: type } : {}), chunks = [], t0 = performance.now();
      var ac = TL.audioCtx(), an = ac.createAnalyser(); an.fftSize = 512; var src = ac.createMediaStreamSource(stream); src.connect(an);
      var data = new Uint8Array(an.fftSize);
      rec.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
      rec.start(100);
      function off() { stream.getTracks().forEach(function (t) { t.stop(); }); try { src.disconnect(); } catch (e) {} }
      return {
        level: function () { an.getByteTimeDomainData(data); var m = 0; for (var i = 0; i < data.length; i++) m = Math.max(m, Math.abs(data[i] - 128)); return m / 128; },
        elapsed: function () { return (performance.now() - t0) / 1000; },
        stop: function () {
          return new Promise(function (res) {
            rec.onstop = function () { off(); var blob = new Blob(chunks, { type: (rec.mimeType || type || 'audio/webm').split(';')[0] }); res({ blob: blob, dur: (performance.now() - t0) / 1000 }); };
            try { rec.stop(); } catch (e) { off(); res(null); }
          });
        },
        cancel: function () { try { rec.onstop = null; rec.stop(); } catch (e) {} off(); }
      };
    }, function (e) {
      var msg = e && e.name === 'NotAllowedError' ? 'ToonyLoony needs your microphone to record a voice. Allow it in your browser and try again.' : 'No microphone found.';
      throw Object.assign(new Error(msg), { uiApi: true });
    });
  };
  /* For uploads: how long is this sound file? */
  TL.audioDuration = function (blob) { return TL.decodeBlob(blob).then(function (b) { return b.duration; }, function () { return 0; }); };
})();
