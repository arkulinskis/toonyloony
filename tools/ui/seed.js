/* For screenshots of member pages: sign up a fresh account and add one item. Resolves to window.SEED.
   Extend it so every member page has something to show (the app's own main objects). */
(async function () {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  async function until(fn, what, ms) {
    const end = Date.now() + (ms || 30000);
    while (Date.now() < end) { try { const v = fn(); if (v) return v; } catch (e) {} await sleep(150); }
    throw new Error('timed out waiting for: ' + what);
  }
  const $ = (s) => document.querySelector(s), $$ = (s) => Array.from(document.querySelectorAll(s));
  function type(input, value) {
    input.focus(); input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true }));
  }
  try {
    if (location.hash !== '#auth/signup') window.UI_READY = false;
    location.hash = '#auth/signup';
    await until(() => window.UI_READY && $$('.au-card input').length >= 3, 'sign-up');
    const inputs = $$('.au-card input[type=text], .au-card input[type=email], .au-card input[type=password]');
    type(inputs[0], 'Sam Rivera'); type(inputs[1], 'shots' + Date.now() + '@example.com'); type(inputs[2], 'Hb-' + Math.random().toString(36).slice(2) + '-Kq7');
    const tick = $('.au-card input[type=checkbox]'); if (tick && !tick.checked) tick.click();
    $$('.anvil-role-btn-block button').find((b) => /Create account/.test(b.textContent)).click();
    await until(() => location.hash === '#home' && window.UI_READY, 'home', 60000);
    // a character, a Reel and a Wide movie with a take each, so the editors and Home have something to show
    const ch = TL.newCharacter('hero', 'Captain Zoom'); ch.thumb = TL.charThumb(ch); await TL.store.saveChar(ch);
    async function movie(name, bg, fmt) {
      const id = await TL.makeMovie(name, bg, ['p_blox', 'p_biscuit', ch.id], fmt, [ch]);
      const r = await TL.store.getMovie(id), m = r.movie, f = TL.frameOf(m), a = m.actors[0], pts = [];
      for (let i = 0; i <= 30; i++) pts.push([i * .1, Math.round(f.x + f.w * (.15 + .5 * i / 30)), 560, 1]);
      a.takes = [{ id: TL.uid('k'), t0: 0, t1: 3, anim: 'walk', speed: 1, pts: pts }];
      m.bubbles = [{ id: TL.uid('b'), actor: a.id, t0: 0, t1: 6, text: 'Hello from the ' + TL.formatOf(m).name + '!', style: 'say' }];
      m.dur = 6; m.thumb = TL.movieThumb(m, TL.charMap([ch]), 1.5);
      await TL.store.saveMovie(m);
      return id;
    }
    const reel = await movie('Rocket Race (Reel)', 'b:space', 'reel');
    const wide = await movie('Park Day', 'b:park', 'wide');
    const square = await movie('Beach Square', 'b:beach', 'square');
    window.SEED = { home: '#home', reel: reel, wide: wide, square: square, char: ch.id };
    return window.SEED;
  } catch (e) {
    return { error: String(e && e.message || e) };
  }
})();
