# ToonyLoony

A cartoon-making studio for young creators (designed for about 12-year-olds, in a chunky Roblox-style look). You build
characters from a catalogue of parts, teach them moves with joints, sticks and keyframes, then place them on a stage,
**hold a character and drag it around to record its movement** while everyone else replays theirs, and add voices,
sounds, music and speech bubbles. Works without an account (everything stays in the browser); a free account (16+)
saves toons in the cloud and lets you share a watch link. Built on [Anvil](https://anvil.works).

- **App repo:** github.com/arkulinskis/toonyloony (branch `master`). Anvil pulls `master`.
- **Live:** https://toonyloony.com (custom domain; Anvil address https://toonyloony.anvil.app)

## What it does

**For everyone (guests too, saved in the browser's IndexedDB):**
- **Landing** (`#landing`): the pitch, a live mini stage that films itself, how it works, features, FAQ for kids and parents.
- **My toons** (`#home`): new movie / new character, your movies and cast, the sticker book (8 achievements), picks from the Theater.
  Guests see a note that their toons live on this device; members who made toons as a guest on that device can move them in.
- **Cast** (`#cast`): your characters, the premade cast (26: Blox, Pixel, Sir Clank, Noodle, Biscuit, Captain Beaky, Zorp,
  Wiggles, Ninja Kai, Astro Ava, Cowboy Tex, Boo, Rex, Prince Hoppy, Pumpkin Jack, Bjorn, Bamboo, Rusty, Squeak, Chef Pepper,
  DJ Beats, Mr Bones, Coco, Rosie, Flash, Pip, Bun Bun) and the **props** (37 stage objects: ball, beach ball, box, present,
  treasure chest, trees, bush, rock, flower pot, car, rocket, sailboat, skateboard, cake, pizza, apple, campfire, table, chair,
  street lamp, arrow sign, house, snowman, jack-o'-lantern, trophy, toy bricks, drum, magic portal, UFO, cloud, sun, moon,
  star, heart, balloons, rainbow). Premade characters and props can be used directly in movies or copied ("Make it mine";
  a copied prop can be recoloured and resized).
- **Character builder** (`#build/<id>`): 12 body types (hero, stickman, robot, birdy, monster, pup, kitty, caterpillar,
  ghost, dino, froggy, bunny) on 3 rigs (biped, four legs, caterpillar). Tabs: head (18), face (15 eyes, 13 mouths), hair &
  hats (25), body (14), arms & legs (6/6 styles, incl. no legs), hands & feet, extras (tail, wings, cape, sword, wand, balloon,
  shield, backpack, jetpack, guitar, umbrella, hammer, flag, torch, ice cream, microphone, scarf, bug net: each is an
  extra stick on the rig), 6 colour slots × 24 colours + any colour, sizes (height, chunky, head, arms, legs), "Surprise me".
  Props open in the same builder with just colours (main + second) and size.
  Live animated preview; tap a body part to open its tab. Autosaves.
- **Moves / animator** (`#animate/<id>/<animId>`): each character's library of moves (15 starter moves for bipeds:
  idle, walk, run, sneak, jump, wave, talk, dance, cheer, sit, dizzy, kick, flap, fly, spin; 7 for four-legged, 5 for the
  caterpillar). Keyframe editor: drag joint dots to bend (FK), drag the square to move the body, tilt slider, frame strip with
  ◆ keys, onion skin, copy/paste/mirror/reset pose, frames count, speed (fps), loop, play. New / rename / copy / delete moves,
  bring back starter moves. Keyboard: space, arrows, K.
- **Studio** (`#studio/<id>`): the stage (16:9, 1280×720 units) and the **hold-to-record** mechanic: tap an actor to pick it
  and choose the move + speed for its next take; press and hold it (or start dragging) and the clock runs, others replay, sounds
  play; let go to stop. Recording over part of an old take replaces just that part. Facing follows the movement (or fixed),
  idle move when standing still, size, layering, 🐢 slow-mo recording, ✋ move mode (moves an actor's whole path).
  Timeline: rows per actor (takes), bubbles, voices, sounds, music; click to select, drag clips/bubbles to move them, click
  the ruler to scrub. Panel tabs: Actor, Cast (add actors and props: props are held and recorded like actors, with their own
  moves: still, bounce, spin, roll, wobble, float, shake; flying ones start in the sky), Scene (30 drawn backgrounds, colours, your pictures; movie
  length up to 2 min; depth by height), Sounds (22 sound effects, 8 music loops, voices, your uploads), Bubbles (say, think,
  shout, caption). **Voices**: record while the movie plays (muted), pick who's talking (their mouth follows the loudness),
  effects normal / giant / chipmunk / tiny / robot / echo. Bubbles also flap the mouth. Undo/redo, autosave with thumbnail,
  **download a video** (MP4 or WebM, recorded in the browser), **share** (members).
- **Library** (`#library/<tab>`): premade sounds, music and places; your uploads (sounds, music, voices, pictures):
  listen, upload, record a voice, rename, delete.
- **Theater** (`#theater`): featured cartoons (admin-picked) and your shared ones. **Watch** (`#watch/<key>`): the player
  (play, scrub, full screen), copy link, report, "make your own".

**For members (16+):** everything above saved in their account, share links, moving guest toons in.

**For admins** (`#admin`; arkulinskis@gmail.com becomes an admin on first sign-in):
- **Overview:** people, movies, characters, shared movies, uploads, feedback.
- **Toons:** every shared movie: watch, feature in the Theater / un-feature, stop sharing.
- **Feedback inbox:** New / Read / Done, private notes. Toon reports arrive here ("Report about the cartoon ...").
- **Users:** search, make admin, disable an account.
- **Demo data:** 3 fictional creators and 5 featured cartoons (made of the premade cast, scenes and sounds); remove or reload.

## Setting it up in Anvil (once)

1. In the Anvil editor: **Create app → Clone from GitHub**, and paste `https://github.com/arkulinskis/toonyloony`.
2. **Users** service: email + password, sign-up allowed (already set in `anvil.yaml`; check it).
3. Open the app in the editor. If it shows a **Schema Mismatch** alert, choose **"The schema of the source code is correct"** so Anvil creates the tables.
4. **Run** it and sign up with **arkulinskis@gmail.com** straight away (that account becomes the admin).
5. **Publish** (Publish → public URL, or your own domain).

<!-- libraries:start -->
## Libraries and outside services

What this project uses besides its own code. Generated by `APP_MAKER/tools/libraries.py`; to change it, edit `APP_MAKER/libraries/catalog.py` and re-run the script.

| Name | How it gets in | Used here for |
|---|---|---|
| [Google Fonts](https://fonts.google.com) | Loaded from a CDN | Lilita One, Nunito |

**Built into the browser:** Canvas 2D, Web Audio API, Camera, microphone and screen, MediaRecorder, Vibration, localStorage, Clipboard, File downloads (Blob), IndexedDB, Fullscreen, Web Animations.

**Anvil platform:** Anvil, Anvil Data Tables, Anvil JS bridge (anvil.js), Anvil Users.

**Build and test tools (not shipped):** Node.js, PyYAML, Headless Chrome (DevTools Protocol).

<!-- libraries:end -->

## Working on it

See `.claude/skills/toonyloony/SKILL.md`. In short:

```
python -I tools/check.py --ui                    # syntax, server tests, headless UI tests → ALL CHECKS PASSED
python -I tools/preview/devserver.py 8765        # the app on in-memory data: http://localhost:8765/  (?as=ana#home, ?as=admin#admin)
python tools/deploy.py                           # dry run (needs PyYAML, so no -I)
python tools/deploy.py --push "Message"          # deploy: commit + push to GitHub, Anvil pulls it
```

## Project layout

```
web/            core.js/core.css (shared engine + design tokens), app.js (header, footer, tab bar), pages/*.html
web/pages/_tl_*.html   the ToonyLoony engine (window.TL): core (store), rig (characters), rig_props (props), scenes, audio, movie, ui (dialogs)
client_code/    Main.py (the only Anvil form: bridge to the server, uploads, sign-in), legal.py
server_code/    common.py, Accounts.py, Feedback.py, Admin.py, DemoData.py, legal_server.py, Toons.py, Assets.py, Theater.py
assets/         icon.svg + generated PNG icons (served at _/theme/<name>)
tools/          sync_to_anvil.py (settings + table schema), deploy.py, check.py, preview/ (dev server, UI tests, screenshots), testing/
```
