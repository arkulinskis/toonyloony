"""Demo content, so the app never looks empty: three fictional creators and five featured cartoons in the Theater.
Loaded automatically the first time anyone opens the app (ensure_loaded), removed or reloaded from Admin -> Demo data.
Removing it is remembered: it doesn't come back by itself.

The cartoons use the premade cast (character ids starting "p_", built into the page: web/pages/_tl_rig.html),
the premade backgrounds ("b:park") and the synthesized sounds and music ("b:s_boing", "b:m_chase"), so no files
are needed. Their takes are generated here from simple paths. Every demo row is flagged is_demo=True.
Demo users have @example.com emails and can't sign in (no password).
"""
import datetime as dt
import math
import random

from anvil.tables import app_tables

from . import common as C

DEMO_USERS = [
    ("Maya Chen", "maya.demo@example.com"),
    ("Theo Martin", "theo.demo@example.com"),
    ("Ines Ozola", "ines.demo@example.com"),
]
# Tables that hold demo rows (each has an is_demo column). Children before parents.
DEMO_TABLES = ["movies", "characters", "assets"]
GROUND = 560


def _id(prefix):
    return prefix + "_" + "".join(random.choice("abcdefghijklmnopqrstuvwxyz0123456789") for _ in range(10))


# ------------------------------------------------------------------------------------------- building cartoons
def take(anim, t0, t1, path, speed=1.0, face=None, hz=10):
    """path(u) -> (x, y) for u in 0..1. face: 1 / -1 to force a direction, else it follows the movement."""
    n = max(2, int((t1 - t0) * hz) + 1)
    pts, f = [], face or 1
    raw = [path(i / (n - 1)) for i in range(n)]
    for i, (x, y) in enumerate(raw):
        if face is None and i > 0 and abs(x - raw[i - 1][0]) > 0.5:
            f = 1 if x > raw[i - 1][0] else -1
        pts.append([round(t0 + (t1 - t0) * i / (n - 1), 2), round(x), round(y), f])
    if face is None and len(pts) > 1:
        pts[0][3] = pts[1][3]
    return {"id": _id("k"), "t0": round(t0, 2), "t1": round(t1, 2), "anim": anim, "speed": speed, "pts": pts}


def line(x0, y0, x1, y1, ease=True):
    def f(u):
        k = u * u * (3 - 2 * u) if ease else u
        return (x0 + (x1 - x0) * k, y0 + (y1 - y0) * k)
    return f


def hops(x0, x1, y, height, count):
    return lambda u: (x0 + (x1 - x0) * u, y - abs(math.sin(u * math.pi * count)) * height)


def still(x, y, sway=0.0):
    return lambda u: (x + math.sin(u * math.pi * 4) * sway, y)


def actor(char, name, x, y, takes, idle="idle", s=1.3, flip=False, rec="walk"):
    return {"id": _id("x"), "char": char, "name": name, "x": x, "y": y, "s": s, "z": 0, "flip": flip, "idle": idle,
            "rec": {"anim": rec, "speed": 1}, "face": "auto", "takes": takes}


def clip(asset, kind, t, vol=None, length=None, actor_id=None):
    c = {"id": _id("q"), "asset": asset, "kind": kind, "t": t, "vol": vol if vol is not None else (0.5 if kind == "music" else 1), "rate": 1}
    if length:
        c["len"] = length
    if actor_id:
        c["actor"] = actor_id
    return c


def bubble(actor_id, t0, t1, text, style="say"):
    return {"id": _id("b"), "actor": actor_id, "t0": t0, "t1": t1, "text": text, "style": style}


def movie(name, bg, dur, actors, clips, bubbles):
    return {"name": name, "v": 1, "dur": dur, "bg": bg, "depth": True, "actors": actors, "clips": clips, "bubbles": bubbles}


def race():
    blox = actor("p_blox", "Blox", 200, GROUND - 10, [
        take("run", 1.0, 5.0, line(200, GROUND - 10, 700, GROUND - 10, ease=False), speed=1.2),
        take("jump", 5.0, 6.2, hops(700, 860, GROUND - 10, 90, 1)),
        take("run", 6.2, 9.0, line(860, GROUND - 10, 1110, GROUND - 10, ease=False), speed=1.2),
        take("cheer", 9.0, 12.5, still(1110, GROUND - 10), face=-1)])
    dog = actor("p_biscuit", "Biscuit", 80, GROUND + 30, [
        take("run", 1.6, 10.0, line(80, GROUND + 30, 960, GROUND + 30, ease=False), speed=1.3),
        take("wag", 10.0, 13.0, still(960, GROUND + 30), face=1)], idle="idle", rec="run")
    return movie("The Great Park Race", "b:park", 13, [blox, dog],
                 [clip("b:m_chase", "music", 0, 0.45, 13), clip("b:s_bark", "sound", 1.3), clip("b:s_whoosh", "sound", 1.0),
                  clip("b:s_boing", "sound", 5.0), clip("b:s_tada", "sound", 9.1)],
                 [bubble(blox["id"], 1.2, 3.0, "Last one to the bench is a soggy noodle!"),
                  bubble(blox["id"], 9.4, 12.0, "I win!! 🏆", "shout"),
                  bubble(dog["id"], 10.3, 12.8, "Woof! Again?", "say")])


def space():
    zorp = actor("p_zorp", "Zorp", -120, GROUND, [
        take("walk", 0.4, 3.4, line(-120, GROUND, 470, GROUND)),
        take("dance", 3.4, 14.0, still(470, GROUND, 18), face=1)])
    clank = actor("p_clank", "Sir Clank", 1400, GROUND + 20, [
        take("walk", 0.8, 3.6, line(1400, GROUND + 20, 820, GROUND + 20)),
        take("dance", 3.6, 14.0, still(820, GROUND + 20, 12), face=-1)])
    return movie("Space Dance Party", "b:space", 14, [zorp, clank],
                 [clip("b:m_party", "music", 0, 0.5, 14), clip("b:s_zap", "sound", 3.4), clip("b:s_magic", "sound", 7.5)],
                 [bubble(clank["id"], 4.0, 6.4, "Beep boop. Let's groove!"),
                  bubble(zorp["id"], 7.0, 9.6, "Zorp LOVES this planet!", "shout"),
                  bubble(None, 11.0, 13.6, "Meanwhile, on the moon...", "say")])


def snack():
    pixel = actor("p_pixel", "Pixel", 120, GROUND, [
        take("sneak", 0.5, 7.5, line(120, GROUND, 760, GROUND, ease=False), speed=0.9),
        take("run", 8.4, 11.5, line(760, GROUND, -150, GROUND, ease=False), speed=1.3)])
    noodle = actor("p_noodle", "Noodle", 1050, GROUND, [
        take("idle", 0.0, 7.9, still(1050, GROUND), face=1),
        take("talk", 7.9, 10.5, still(1050, GROUND), face=-1),
        take("dizzy", 10.5, 13.0, still(1050, GROUND), face=-1)])
    return movie("The Sneaky Snack", "b:school", 13, [pixel, noodle],
                 [clip("b:m_sneaky", "music", 0, 0.55, 8), clip("b:s_slideup", "sound", 7.8), clip("b:s_zip", "sound", 8.4),
                  clip("b:s_rimshot", "sound", 11.6)],
                 [bubble(pixel["id"], 1.0, 3.6, "Shhh... the cookie jar is right there...", "think"),
                  bubble(noodle["id"], 8.0, 10.2, "HEY! My cookie!", "shout"),
                  bubble(noodle["id"], 10.8, 12.8, "...was it even my cookie?")])


def spooky():
    noodle = actor("p_noodle", "Noodle", 60, GROUND, [
        take("walk", 0.5, 6.0, line(60, GROUND, 620, GROUND), speed=0.8),
        take("dizzy", 7.4, 9.0, still(620, GROUND), face=1),
        take("run", 9.0, 12.0, line(620, GROUND, -160, GROUND, ease=False), speed=1.4)])
    worm = actor("p_wiggles", "Wiggles", 1350, GROUND + 40, [
        take("slither", 4.5, 7.0, line(1350, GROUND + 40, 820, GROUND + 40)),
        take("hop", 7.0, 9.2, still(820, GROUND + 40), face=-1)], rec="slither")
    return movie("Spooky Night Walk", "b:spooky", 12, [noodle, worm],
                 [clip("b:m_spooky", "music", 0, 0.6, 12), clip("b:s_steps", "sound", 0.6), clip("b:s_boom", "sound", 7.2, 0.7),
                  clip("b:s_slidedown", "sound", 9.0)],
                 [bubble(noodle["id"], 1.0, 3.4, "I'm not scared. Nope. Not at all.", "think"),
                  bubble(worm["id"], 7.2, 9.0, "BOO!", "shout"),
                  bubble(worm["id"], 10.0, 11.8, "...I just wanted a friend.")])


def ahoy():
    beaky = actor("p_beaky", "Captain Beaky", -100, GROUND, [
        take("walk", 0.5, 4.0, line(-100, GROUND, 520, GROUND)),
        take("talk", 4.0, 9.0, still(520, GROUND), face=1),
        take("dance", 9.0, 12.0, still(520, GROUND, 10), face=1)], rec="walk")
    blox = actor("p_blox", "Blox", 900, GROUND, [
        take("wave", 4.2, 6.0, still(900, GROUND), face=-1),
        take("cheer", 8.6, 12.0, still(900, GROUND), face=-1)], flip=True)
    return movie("Ahoy, Captain Beaky!", "b:beach", 12, [beaky, blox],
                 [clip("b:m_hero", "music", 0, 0.5, 12), clip("b:s_tada", "sound", 8.6), clip("b:s_splash", "sound", 0.4)],
                 [bubble(beaky["id"], 4.2, 6.4, "Ahoy, matey!"),
                  bubble(blox["id"], 6.6, 8.2, "Ahoy! Is that a sword?"),
                  bubble(beaky["id"], 8.6, 11.6, "Who wants to find TREASURE?", "shout")])


DEMO_MOVIES = [(0, "demo-race", race, 312), (1, "demo-space", space, 245), (2, "demo-snack", snack, 188), (0, "demo-spooky", spooky, 151),
               (2, "demo-ahoy", ahoy, 97)]


def sample_movie():
    """A fresh copy of a demo cartoon (for the local dev server's demo member)."""
    m = race()
    m["id"] = _id("m")
    return m


# ------------------------------------------------------------------------------------------- load / remove
def state():
    return C.get_setting("demo", "never")  # "never" | "loaded" | "removed"


def ensure_loaded():
    """Call from the app's main data callables: loads the demo once, unless an admin removed it."""
    if state() == "never":
        load()


def load():
    remove(remember=False)
    users = []
    for name, email in DEMO_USERS:
        u = app_tables.users.get(email=email) or app_tables.users.add_row(email=email, enabled=False)
        u.update(display_name=name, is_demo=True, signed_up=C.now() - dt.timedelta(days=30))
        users.append(u)
    for i, (who, key, make, views) in enumerate(DEMO_MOVIES):
        m = make()
        name = m.pop("name")
        app_tables.movies.add_row(owner=users[who], uid=_id("m"), name=name, data=m, thumb=None, dur=m["dur"], shared=True,
                                  share_key=key, featured=True, views=views, is_demo=True,
                                  created=C.now() - dt.timedelta(days=9 - i), updated=C.now() - dt.timedelta(days=9 - i, hours=i))
    C.set_setting("demo", "loaded")
    return counts()


def remove(remember=True):
    for name in DEMO_TABLES:
        for r in getattr(app_tables, name).search(is_demo=True):
            r.delete()
    for u in app_tables.users.search(is_demo=True):
        u.delete()
    if remember:
        C.set_setting("demo", "removed")
    return counts()


def counts():
    out = {"users": len(app_tables.users.search(is_demo=True))}
    for name in DEMO_TABLES:
        out[name] = len(getattr(app_tables, name).search(is_demo=True))
    return out
