---
name: toonyloony
description: Context, workflow and recipes for ToonyLoony (folder toonyloony-forms), the user's Anvil app built as native Anvil Forms with JavaScript engines. A cartoon-making studio for kids: build characters from parts, animate them with joints and keyframes, hold-and-drag them on a stage to record movies (Wide 16:9, Reel 9:16, Square 1:1, Portrait 4:5) with voices, sounds and music. Load this before any feature request, bug fix, restyle, content change or deploy for this app.
---

# ToonyLoony: working on the app

**What it is:** a cartoon studio for young creators (about 12 years old). Areas: Cast + character builder (parts catalogue
on joints-and-sticks rigs), the animator (keyframes, a library of moves per character), the Studio (place actors on a
background, **hold an actor and drag it to record its path** while the clock runs and everyone else replays, voices with
lip-sync, sounds, music, speech bubbles, timeline, canvas shapes, video export), Library (sounds, music, voices, pictures),
Theater (featured shared cartoons) + Watch pages. **Guests use everything without an account** (saved in IndexedDB);
members (16+) save to the server and can share a watch link.

**Where it lives:**
- Folder `C:\Users\arkvi\Documents\CLAUDE\toonyloony-forms\` = the git clone of **github.com/arkulinskis/toonyloony**.
  "git" layout: the folder *is* the Anvil app; Anvil pulls master; pushing is the deploy. Live: **https://toonyloony.com**
  (Anvil address https://toonyloony.anvil.app).
- Converted on 2026-11-06 from the JavaScript-template version (folder `toonyloony`, source layout + tools/deploy.py) on
  branch `forms`. Until the user approves and it's merged, master and the live app still run the old version from the old
  folder: don't deploy the old folder over master after the merge.
- Made the template-forms way (`APP_MAKER\template-forms`); Anvil's own agent skills describe the same model
  (`APP_MAKER\vendor\anvil-agent-references`).
- **README.md** lists every feature. Keep it up to date.

**What the user wants:** "Roblox style vibe" for 12-year-olds, 2D joints-and-sticks animation, keyframing, and above all the
**hold-to-record mechanic**. Look: chunky blocks, thick ink outlines, solid "block" shadows under buttons/cards (pinned
look: the design check's hard-offset-shadow notes are deliberate), faint stud pattern on the page. Palette: bg #eef1ff
(dark #11132b), surface #fff, ink #1a1d3a, brand indigo #4757ff (deep #2b36c9), accent yellow #ffc532, plus pink #ff4fa3,
green #1fbf63, rec red #ff3048 (#cf1b31 behind white text). Fonts: Lilita One (display, one weight: font-weight 400) +
Nunito. Emoji in headings and buttons are part of the kid look. Claude assumes details and builds; Claude deploys.
Mobile-first: every page must fit 390 px. Light and dark.

## Workflow for any change

1. `git pull --ff-only` (Anvil commits "Edited ..." when the user changes something in the IDE; read those commits).
2. Edit: a page's template and Python side by side, or an engine in `theme/assets/tl-*.js`.
3. `python tools/check.py` (no -I) -> **ALL CHECKS PASSED** (anvil validate, JS syntax, asset hashes, server tests, design check).
   After editing any theme asset: `python tools/assets.py` (check.py fails on stale hashes).
4. `python -I tools/ui_test.py` (Docker Desktop running) -> **ALL UI TESTS PASSED**: flow.js (the whole journey: builder,
   animator, Reel movie, hold-to-record, shape switch + squeeze, camera, export, voice, theater, sign-up + import, share),
   phone.js (every page at 390 px, incl. the three editors), admin.js, a11y.js (axe, light + dark), design.js (desktop +
   phone). `--only flow.js` runs one; server edits need `--restart`. `--shots DIR` = screenshots (guest + member pages,
   studio in Reel and Wide, builder, animator): Read them.
5. Commit only your files as arkulinskis with the Co-Authored-By line; `git push origin master`.

## Architecture

```
anvil.yaml          startup module `startup`; db_schema; services; head_html (fonts, Prepsto, SEO, theme assets with ?v=)
client_code/
  startup.py        legal kit, tl.setup() (engine bridge), get_me, router.start()
  router.py         PAGES / NAV / _form; same #addresses as the old version; NAV shows for guests too (not on landing/auth)
  state.py          me() (set_me also sets window.UI.me for the engines), call(), toast(), store, a11y helpers
  tl.py             THE bridge to the engines: TL (window.TL), py_value/js_value, _bridge (UI.api -> anvil.server.call),
                    TL.host (toast, confirm, ask_name, pick_starter, new_movie, voice, share, export_video, go),
                    shape_badge, poster, char_thumb, attempt (shows a rejected engine call as a toast)
  Layouts/Shell     header (studio menu, account menu, "Start making" on landing), footer, phone tab bar ("Sign in" for guests);
                    refresh(page) sets page-<name> / in-app classes on .ui-shell
  Pages/            Landing, Home, Cast, Library, Theater, Watch, Auth, Profile, Admin (+ Toons tab);
                    Build, Animate, Studio = Components/Screen hosting an engine (waits = True: the engine sets UI_READY)
  Components/       Screen (UI.mountScreen on show, destroy on hide), Player (TL.player)
  Items/            MovieTile, CharTile, TheaterCard, Sticker, SoundCard, PicCard, Pick, ShapePick, ToonRow, NavLink, FeedbackRow, UserRow
  Dialogs/          AskName, MovieMenu, PickStarter, NewMovie (shape + name + place + actors), CastPreview, Share,
                    Export (shape choice, preview, progress, download), Voice (hosts TL.mountVoice), Report
server_code/        common, Accounts, Admin, DemoData, Feedback, Toons (shape_of), Assets, Theater, SchemaCheck, seo_routes, legal_server
theme/assets/
  app.css           old ToonyLoony core + page CSS (identity), design-kit block, template role layer, Forms additions (last)
  app-kit.js        UI.esc/store/icon/ICONS (icons.css is built from it: tools/build_icons.py), light/dark, a11y observer
  tl-kit.js         UI.api/apiQuiet/upload via window.TL_BRIDGE, UI.toast/confirm via TL.host, UI.modal, UI.page + UI.mountScreen,
                    UI.go, UI.busy, UI.ago, [data-go] clicks: what the engines were written against
  tl-core.js        TL basics + TL.store (guest IndexedDB 'toonyloony' docs/blobs; member: server calls), importGuest
  tl-rig.js         TL.PARTS, rigs, TL.solve (FK), TL.drawChar, keyframes, STARTERS (12), PRESETS (p_*)
  tl-props.js       PROPS (37), TL.PROP_DEFS/PROP_LIST (p_o_*)
  tl-scenes.js      30 backgrounds ('b:park'...), colours ('c:#hex'), uploads; TL.drawBackground(ctx, ref, w, h, frame)
  tl-audio.js       synthesized sounds/music, mixer, voice FX, mic recorder
  tl-movie.js       movie format, TL.FORMATS / formatOf / frameOf / frameTransform / actorsOutside / remapActors,
                    TL.actorAt, TL.renderFrame(ctx, movie, chars, t, {frame, ...}), TL.movieCanvas (letterboxed), player, export
  tl-ui.js          thumbs, upload, dialogs as TL.host forwarders, TL.makeMovie, TL.copyPreset, TL.mountVoice, TL.exportJob, stickers
  tl-show.js        landing hero / steps, home duo, cast preview, posters, the YouTube click-to-play
  tl-screens.js     the three editors as UI.page mounts: build, animate, studio
tools/              check.py, assets.py, build_icons.py, make_icons.py, ui_test.py + ui/, live/drive.mjs (fake mic flags), testing/
```

**Engines vs Forms:** canvas, pointer and audio work stays in JavaScript (Skulpt is too slow per frame). Python never loops
per frame. JS promises returned to Python are already awaited (`tl.TL.store.chars()` is the list). A JS object passed into
Python is a proxy: reading a missing field raises AttributeError (Dialogs/Voice `_get`). Python functions handed to JS
(TL.host, callbacks) return Promises in JS when they block (alert, server calls).

**Canvas shapes:** the stage is always 1280×720 stage units (ground ≈ y 560). `movie.format` ('reel' | 'square' |
'portrait'; missing = wide) picks a frame width (405 / 720 / 576 / 1280) at full height, centred on `movie.fx` (default
640, clamped). Every drawer maps the frame onto its canvas with `TL.frameTransform`; pointer input maps back through the
frame (studio `stagePt`). Uploaded pictures cover the frame (drawBackground's box); built-in scenes are cropped.
Export sizes = TL.FORMATS[].out. Old movies need nothing (wide).

**Data formats** (JSON made in the browser; the server only checks owner/size/limits):
- character: `{id: 'c_…', name, rig: 'biped'|'quad'|'worm', starter, look: {...}, bones: [...], anims: [{id, name, emoji, len, fps, loop, keys}], custom}`.
- movie: `{id: 'm_…', name, dur, bg, depth, format, fx, actors: [{id, char, name, x, y, s, z, flip, idle, rec: {anim, speed}, face, takes: [{id, t0, t1, anim, speed, pts: [[t, x, y, facing]]}]}], clips: [...], bubbles: [...]}`.
  Actor (x, y) = hip in stage units. `char` is a user uid or a preset `p_*`; assets are `b:*` built-ins or `a_*` uploads.

**Tables** (all server-only, unchanged by the conversion): users, app_settings, feedback, characters, movies, assets.

## Recipes

- **New page:** `Pages/X/` (template with the Shell layout + Python taking `args=()`), register in router PAGES/_form
  (+ NAV), add to tools/ui/phone.js, a11y.js, design.js and a journey line in flow.js.
- **New dialog:** `Dialogs/X`, closes with `self.raise_event("x-close-alert", value=...)`; open with
  `alert(X(...), buttons=[], role="app-dialog")`. Engines reach it through a new `TL.host` entry in tl.py `setup()` and a
  forwarder in tl-ui.js.
- **New server function:** `@anvil.server.callable(require_user=True)`, `C.require_user()`, ownership check, plain dicts;
  tests in tools/testing/test_server.py (PUBLIC set for public ones).
- **New table or column:** db_schema in anvil.yaml + tests; deploy; Schema Mismatch step ("source code is correct").
- **New shape:** a row in `TL.FORMATS` (id, name, ratio, emoji, use, w in stage units, out pixels); `SHAPES` in
  server_code/Toons.py; `SHAPE_BADGES` in tl.py.
- **New part / extra / body type / starter move / premade / prop / background / sound / music:** same as before, all in
  the engines: `TL.PARTS` + draw functions in tl-rig.js; props `PROPS` in tl-props.js (ids `p_o_*` never change); scenes
  `SCENES` in tl-scenes.js (ids `b:*` never change); sounds/music in tl-audio.js. Run assets.py afterwards.
- **Studio behaviour:** tl-screens.js studio part: `startRec`/`recFrame`/`stopRec`, `change()` (undo + autosave),
  `setFormat`, `drawPanel` tabs, `drawTimeline`. `window.TL_STUDIO` = {state() incl. frame, seek, setFormat} for tests.
- **Demo cartoons:** DemoData.py (`DEMO_MOVIES`, bump `DEMO_SET`). A demo movie can set `format`.
- **Restyle:** tokens at the top of app.css come from the scratch builder used in the conversion; edit app.css directly now
  (light + dark blocks), the spinner in theme.css, `LEGAL_THEME` in startup.py.

## Gotchas

- Guests: everything goes through `TL.store`; never call the toon server functions from a page for data guests also have.
- Ids are made in the browser (`TL.uid`); premade ids (`p_*`, `p_o_*`, `b:*`) are referenced by saved movies: never rename.
- `anvil.server.get_api_origin()` already ends in `/_/api`: media URLs are `UI.apiOrigin + '/media?k=KEY'`.
- Anvil components inside the engine markup: none. Engine markup uses the old classes (`.ui-btn`, `.tl-chip`...), styled by app.css.
- Engine screens redraw their own DOM: Python keeps no references into it.
- App Server 1.18 (local tests) vs hosted Anvil: see template-forms gotchas; test the branch link before merging.
- Test messages printed by ui_test.py must be ASCII.
- Accounts are 16+ (legal kit) even though the design is for ~12-year-olds: kids play as guests.

## Privacy & Terms (legal kit)

From `APP_MAKER/legal-kit`: change `apps/toonyloony.json`, then `python -I build.py toonyloony && python -I install.py toonyloony`
(after the merge, when apps.json points at this folder; before that: `install.APPS['toonyloony'] = ('toonyloony-forms',
'git'); install.install('toonyloony', False)`), then `python tools/assets.py`. Sign-up keeps the tick box (Pages/Auth).
Feedback = Prepsto only ("Submit feedback", code ptkszwg).
