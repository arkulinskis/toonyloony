"""Demo content, so the app never looks empty: four fictional creators and fifteen featured cartoons in the Theater.
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
    ("Sami Okafor", "sami.demo@example.com"),
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


# ------------------------------------------------------------------------------------------- more cartoons (2026-11-02)
FOOT = 84  # how far below the hip the premade cast's feet are (TL.footY of p_blox): ground props stand on that line


def ground(h, s=1.3):
    """y for a ground prop with box height h, so its bottom sits where the actors' feet are (same rule as the studio)."""
    return round(GROUND + (FOOT - h / 2) * s)


def arc(x0, y0, x1, y1, height):
    return lambda u: (x0 + (x1 - x0) * u, y0 + (y1 - y0) * u - math.sin(u * math.pi) * height)


def dino():
    squeak = actor("p_squeak", "Squeak", 260, GROUND + 14, [
        take("idle", 0.0, 3.0, still(260, GROUND + 14), face=1),
        take("wave", 3.0, 4.6, still(260, GROUND + 14), face=1),
        take("run", 6.4, 10.0, line(260, GROUND + 14, -160, GROUND + 14, ease=False), speed=1.4)], s=1.2)
    rex = actor("p_rex", "Rex", 1400, GROUND + 14, [
        take("walk", 0.8, 4.0, line(1400, GROUND + 14, 760, GROUND + 14), speed=0.8),
        take("jump", 5.6, 6.6, hops(760, 700, GROUND + 14, 70, 1)),
        take("run", 6.8, 9.6, line(700, GROUND + 14, -220, GROUND + 14, ease=False), speed=1.2),
        take("wag", 11.0, 14.0, line(-220, GROUND + 14, 420, GROUND + 14), face=1)], s=1.5, rec="run")
    return movie("Dino Wants Ice Cream", "b:dinoland", 14, [squeak, rex],
                 [clip("b:m_chase", "music", 0, 0.4, 14), clip("b:s_steps", "sound", 0.9), clip("b:s_boom", "sound", 6.4, 0.7),
                  clip("b:s_squeak", "sound", 6.5), clip("b:s_zip", "sound", 6.8), clip("b:s_pop", "sound", 12.0)],
                 [bubble(squeak["id"], 0.4, 2.8, "Mmm, strawberry ice cream...", "think"),
                  bubble(rex["id"], 4.2, 5.8, "Is that... ICE CREAM?", "shout"),
                  bubble(squeak["id"], 6.6, 8.4, "EEK! Get your own!", "shout"),
                  bubble(rex["id"], 11.4, 13.8, "I just wanted one lick.")])


def kitchen():
    cake = actor("p_o_cake", "Birthday cake", 640, ground(122), [
        take("wobble", 6.0, 7.2, still(640, ground(122)), face=1),
        take("bounce", 7.2, 8.6, still(640, ground(122)), face=1)], rec="bounce")
    coco = actor("p_coco", "Coco", -120, GROUND, [
        take("sneak", 0.8, 5.6, line(-120, GROUND, 520, GROUND, ease=False), speed=0.8),
        take("jump", 5.6, 6.8, hops(520, 520, GROUND, 60, 1), face=1),
        take("run", 8.6, 11.4, line(520, GROUND, -180, GROUND, ease=False), speed=1.4)])
    chef = actor("p_pepper", "Chef Pepper", 1050, GROUND, [
        take("idle", 0.0, 7.0, still(1050, GROUND), face=-1),
        take("talk", 7.0, 8.6, still(1050, GROUND), face=-1),
        take("run", 8.8, 12.0, line(1050, GROUND, -200, GROUND, ease=False), speed=1.2)], flip=True)
    return movie("Kitchen Chaos", "b:kitchen", 13, [cake, coco, chef],
                 [clip("b:m_sneaky", "music", 0, 0.5, 8.6), clip("b:s_boing", "sound", 5.7), clip("b:s_bonk", "sound", 7.2),
                  clip("b:s_honk", "sound", 8.6), clip("b:m_chase", "music", 8.6, 0.45, 4.4)],
                 [bubble(coco["id"], 1.2, 3.8, "That cake has my name on it. Probably.", "think"),
                  bubble(chef["id"], 7.1, 8.6, "NOT MY MASTERPIECE!", "shout"),
                  bubble(None, 10.4, 12.8, "Nobody touched the cake. The cake is fine.")])


def ninja():
    kai = actor("p_kai", "Ninja Kai", 180, GROUND, [
        take("sneak", 0.5, 4.0, line(180, GROUND, 500, GROUND), speed=0.9),
        take("jump", 4.0, 5.2, arc(500, GROUND, 640, GROUND, 120)),
        take("kick", 5.2, 6.4, still(640, GROUND), face=1),
        take("dizzy", 9.6, 12.0, still(640, GROUND), face=1),
        take("sit", 12.0, 14.0, still(640, GROUND), face=1)])
    jack = actor("p_jack", "Pumpkin Jack", 900, GROUND, [
        take("idle", 0.0, 5.6, still(900, GROUND), face=-1),
        take("spin", 5.6, 6.8, still(900, GROUND), face=-1),
        take("talk", 6.8, 9.4, still(900, GROUND), face=-1),
        take("cheer", 9.6, 14.0, still(900, GROUND), face=-1)], flip=True)
    return movie("Ninja vs. Pumpkin", "b:nightcity", 14, [kai, jack],
                 [clip("b:m_spooky", "music", 0, 0.45, 14), clip("b:s_whoosh", "sound", 4.0), clip("b:s_bonk", "sound", 5.6),
                  clip("b:s_magic", "sound", 5.7), clip("b:s_slidedown", "sound", 9.6), clip("b:s_rimshot", "sound", 12.2)],
                 [bubble(kai["id"], 1.0, 3.6, "Silent. Swift. Totally unseen.", "think"),
                  bubble(jack["id"], 7.0, 9.4, "Nice try! Pumpkins are VERY bouncy."),
                  bubble(kai["id"], 10.0, 12.2, "...I meant to do that.")])


def snowman():
    snow = actor("p_o_snowman", "Mr Frosty", 760, ground(202), [
        take("shake", 4.4, 5.6, still(760, ground(202)), face=1),
        take("bounce", 8.0, 12.6, line(760, ground(202), 1420, ground(202), ease=False), face=1)], rec="bounce")
    bjorn = actor("p_bjorn", "Bjorn", -120, GROUND, [
        take("walk", 0.4, 3.6, line(-120, GROUND, 420, GROUND)),
        take("talk", 3.6, 5.0, still(420, GROUND), face=1),
        take("jump", 5.6, 6.8, hops(420, 360, GROUND, 90, 1), face=1),
        take("dizzy", 6.8, 8.6, still(360, GROUND), face=1),
        take("wave", 10.0, 13.0, still(360, GROUND), face=1)])
    rosie = actor("p_rosie", "Rosie", 1400, GROUND + 20, [
        take("walk", 6.0, 8.0, line(1400, GROUND + 20, 1080, GROUND + 20)),
        take("cheer", 8.4, 13.0, still(1080, GROUND + 20), face=-1)])
    return movie("The Snowman Who Hopped Away", "b:snow", 13, [snow, bjorn, rosie],
                 [clip("b:m_sunny", "music", 0, 0.4, 13), clip("b:s_steps", "sound", 0.5), clip("b:s_squeak", "sound", 4.5),
                  clip("b:s_boing", "sound", 8.0), clip("b:s_boing", "sound", 9.2), clip("b:s_boing", "sound", 10.4)],
                 [bubble(bjorn["id"], 3.7, 5.0, "Best snowman ever. Look at him!"),
                  bubble(snow["id"], 5.6, 7.4, "Thanks! Bye!", "shout"),
                  bubble(rosie["id"], 8.6, 10.6, "Did your snowman just... hop?"),
                  bubble(bjorn["id"], 10.8, 12.8, "He'll be back for dinner.")])


def ufo():
    sky = 200
    saucer = actor("p_o_ufo", "UFO", 1500, sky, [
        take("float", 1.0, 4.0, line(1500, sky, 700, sky)),
        take("float", 4.0, 9.0, still(700, sky, 6), face=-1),
        take("float", 10.6, 13.0, line(700, sky, -300, sky - 80))], idle="float", rec="float")
    pup = actor("p_biscuit", "Biscuit", 700, GROUND + 18, [
        take("wag", 0.0, 4.4, still(700, GROUND + 18), face=1),
        take("spin", 4.4, 6.6, line(700, GROUND + 18, 700, sky + 60), face=1),
        take("spin", 6.6, 8.6, line(700, sky + 60, 700, GROUND + 18), face=1),
        take("wag", 8.6, 13.0, still(700, GROUND + 18), face=-1)], rec="run")
    tex = actor("p_tex", "Cowboy Tex", 260, GROUND, [
        take("idle", 0.0, 3.8, still(260, GROUND), face=1),
        take("dizzy", 4.6, 6.6, still(260, GROUND), face=1),
        take("wave", 10.6, 13.0, still(260, GROUND), face=1)])
    return movie("The UFO Borrowed My Dog", "b:farm", 13, [saucer, pup, tex],
                 [clip("b:m_space", "music", 0, 0.5, 13), clip("b:s_zap", "sound", 4.4), clip("b:s_slideup", "sound", 4.5),
                  clip("b:s_slidedown", "sound", 6.6), clip("b:s_bark", "sound", 8.7), clip("b:s_whoosh", "sound", 10.7)],
                 [bubble(tex["id"], 1.2, 3.6, "Well, howdy... flying pancake?"),
                  bubble(tex["id"], 4.8, 6.6, "HEY! That's my dog!", "shout"),
                  bubble(pup["id"], 8.8, 10.4, "Woof! They had snacks up there."),
                  bubble(None, 11.0, 12.8, "Biscuit now speaks fluent Martian.")])


def goal():
    by = ground(64, 1.1)
    ball = actor("p_o_ball", "Ball", 560, by, [
        take("roll", 3.4, 4.8, line(560, by, 1180, by - 30)),
        take("bounce", 4.8, 6.0, still(1180, by - 30), face=1)], s=1.1, rec="roll")
    flash = actor("p_flash", "Flash", 100, GROUND, [
        take("run", 0.6, 3.0, line(100, GROUND, 480, GROUND, ease=False), speed=1.3),
        take("kick", 3.0, 4.0, still(480, GROUND), face=1),
        take("cheer", 5.0, 13.0, still(480, GROUND), face=1)])
    pip = actor("p_pip", "Pip", 1000, GROUND + 24, [
        take("idle", 0.0, 3.4, still(1000, GROUND + 24), face=-1),
        take("jump", 3.6, 4.8, hops(1000, 1000, GROUND + 24, 120, 1), face=-1),
        take("dizzy", 5.4, 8.0, still(1000, GROUND + 24), face=-1),
        take("dance", 8.4, 13.0, still(1000, GROUND + 24, 10), face=-1)], flip=True)
    return movie("GOAL!!!", "b:stadium", 13, [ball, flash, pip],
                 [clip("b:m_hero", "music", 0, 0.45, 13), clip("b:s_drumroll", "sound", 0.6, 0.6), clip("b:s_bonk", "sound", 3.4),
                  clip("b:s_whoosh", "sound", 3.5), clip("b:s_applause", "sound", 5.0), clip("b:s_tada", "sound", 5.1)],
                 [bubble(flash["id"], 0.8, 2.8, "Watch my super-mega kick!", "shout"),
                  bubble(None, 5.0, 7.0, "GOOOOOAL!!!", "shout"),
                  bubble(pip["id"], 8.6, 11.0, "The net caught it. I was resting."),
                  bubble(flash["id"], 11.0, 12.8, "Best goalie ever, Pip.")])


def dancefloor():
    beats = actor("p_beats", "DJ Beats", 380, GROUND, [
        take("talk", 0.4, 3.0, still(380, GROUND), face=1),
        take("dance", 3.0, 14.0, still(380, GROUND, 14), face=1)])
    boo = actor("p_boo", "Boo", 1400, GROUND - 40, [
        take("walk", 2.4, 5.0, line(1400, GROUND - 40, 880, GROUND - 40)),
        take("spin", 5.0, 6.6, still(880, GROUND - 40), face=-1),
        take("dance", 6.6, 14.0, still(880, GROUND - 40, 20), face=-1)], rec="walk")
    star = actor("p_o_star", "Star", 640, 150, [
        take("spin", 6.6, 14.0, still(640, 150, 30), face=1)], idle="float", s=1.0, rec="float")
    return movie("Ghost Dance-Off", "b:arcade", 14, [beats, boo, star],
                 [clip("b:m_party", "music", 0, 0.55, 14), clip("b:s_magic", "sound", 5.0), clip("b:s_applause", "sound", 12.4, 0.8)],
                 [bubble(beats["id"], 0.6, 2.8, "Dance-off! Who dares?", "shout"),
                  bubble(boo["id"], 5.2, 7.4, "Boo-gie time!"),
                  bubble(beats["id"], 8.4, 10.6, "Your moves are... ghostly good.", "think"),
                  bubble(None, 12.0, 13.8, "It's a tie. Ghosts can't lose.")])


def clouds():
    hoppy = actor("p_hoppy", "Prince Hoppy", 160, GROUND, [
        take("jump", 0.6, 2.0, hops(160, 380, GROUND, 110, 1)),
        take("jump", 2.0, 3.4, hops(380, 600, GROUND, 140, 1)),
        take("talk", 3.6, 6.4, still(600, GROUND), face=1),
        take("cheer", 8.0, 13.0, still(600, GROUND), face=1)])
    bun = actor("p_bunbun", "Bun Bun", 1400, GROUND + 18, [
        take("walk", 4.0, 6.6, line(1400, GROUND + 18, 900, GROUND + 18)),
        take("wave", 6.6, 8.0, still(900, GROUND + 18), face=-1),
        take("dance", 8.0, 13.0, still(900, GROUND + 18, 10), face=-1)])
    rainbow = actor("p_o_rainbow", "Rainbow", 760, 330, [
        take("float", 8.0, 13.0, line(760, 330, 760, 160), face=1)], idle="float", s=1.2, rec="float")
    balloons = actor("p_o_balloons", "Balloons", 1080, 360, [
        take("float", 0.0, 13.0, line(1080, 360, 1160, -80), face=1)], idle="float", s=1.0, rec="float")
    return movie("Hoppy's Cloud Kingdom", "b:clouds", 13, [hoppy, bun, rainbow, balloons],
                 [clip("b:m_sunny", "music", 0, 0.5, 13), clip("b:s_boing", "sound", 0.7), clip("b:s_boing", "sound", 2.1),
                  clip("b:s_magic", "sound", 8.0), clip("b:s_tada", "sound", 8.2)],
                 [bubble(hoppy["id"], 3.8, 6.4, "Welcome to my kingdom! The floor is fluffy."),
                  bubble(bun["id"], 6.8, 8.4, "Can I be a princess too?"),
                  bubble(hoppy["id"], 8.6, 11.0, "Everyone gets a crown today!", "shout")])


def rocket():
    ry = ground(210)
    ship = actor("p_o_rocket", "Rocket", 760, ry, [
        take("shake", 6.4, 8.0, still(760, ry), face=1),
        take("idle", 8.0, 10.4, line(760, ry, 820, -300), face=1)], rec="bounce")
    ava = actor("p_ava", "Astro Ava", -120, GROUND, [
        take("walk", 0.4, 3.2, line(-120, GROUND, 600, GROUND)),
        take("wave", 3.2, 4.4, still(600, GROUND), face=-1),
        take("walk", 4.4, 5.4, line(600, GROUND, 760, GROUND)),
        take("fly", 8.0, 10.4, line(760, GROUND, 820, -260), face=1)])
    clank = actor("p_clank", "Sir Clank", 1100, GROUND + 18, [
        take("talk", 5.2, 8.0, still(1100, GROUND + 18), face=-1),
        take("cheer", 8.0, 11.2, still(1100, GROUND + 18), face=-1),
        take("wave", 11.2, 13.0, still(1100, GROUND + 18), face=-1)], flip=True)
    return movie("3, 2, 1... Blast Off!", "b:lab", 13, [ship, ava, clank],
                 [clip("b:m_space", "music", 0, 0.45, 13), clip("b:s_drumroll", "sound", 5.4, 0.7), clip("b:s_boom", "sound", 8.0),
                  clip("b:s_whoosh", "sound", 8.1), clip("b:s_applause", "sound", 10.0, 0.8)],
                 [bubble(ava["id"], 1.0, 3.0, "Mission: find the moon's cheese."),
                  bubble(clank["id"], 5.4, 7.8, "Three... two... one...", "shout"),
                  bubble(clank["id"], 10.4, 12.8, "Bring me back a moon rock!")])


def campfire():
    fire = actor("p_o_campfire", "Campfire", 640, ground(124, 1.2), [], s=1.2, rec="idle")
    bones = actor("p_bones", "Mr Bones", 420, GROUND, [
        take("talk", 0.6, 7.0, still(420, GROUND), face=1),
        take("spin", 7.0, 8.0, still(420, GROUND), face=1),
        take("cheer", 8.0, 9.4, still(420, GROUND), face=1),
        take("talk", 11.0, 14.0, still(420, GROUND), face=1)])
    noodle = actor("p_noodle", "Noodle", 880, GROUND + 10, [
        take("sit", 0.0, 7.6, still(880, GROUND + 10), face=-1),
        take("jump", 7.6, 8.8, hops(880, 960, GROUND + 10, 140, 1), face=-1),
        take("dizzy", 8.8, 14.0, still(960, GROUND + 10), face=-1)], flip=True)
    rusty = actor("p_rusty", "Rusty", 1060, GROUND + 30, [
        take("sit", 0.0, 7.6, still(1060, GROUND + 30), face=-1),
        take("run", 7.6, 10.0, line(1060, GROUND + 30, 1450, GROUND + 30, ease=False), speed=1.4)], flip=True, rec="run")
    return movie("Campfire Spooky Story", "b:camping", 14, [fire, bones, noodle, rusty],
                 [clip("b:s_crickets", "sound", 0, 0.7), clip("b:m_spooky", "music", 0.4, 0.4, 7.4), clip("b:s_boom", "sound", 7.4, 0.8),
                  clip("b:s_rimshot", "sound", 11.2), clip("b:s_crickets", "sound", 12.0, 0.6)],
                 [bubble(bones["id"], 0.8, 3.6, "It was a dark and spooky night..."),
                  bubble(bones["id"], 3.8, 6.8, "...and then a SKELETON appeared!"),
                  bubble(noodle["id"], 8.0, 9.6, "AAAH!", "shout"),
                  bubble(bones["id"], 11.2, 13.8, "Guys. I AM the skeleton. Hi!")])


DEMO_MOVIES = [(0, "demo-race", race, 312), (1, "demo-space", space, 245), (2, "demo-snack", snack, 188), (0, "demo-spooky", spooky, 151),
               (2, "demo-ahoy", ahoy, 97),
               # added 2026-11-02 (a site that already had the demo gets these through top_up)
               (3, "demo-dino", dino, 86), (1, "demo-kitchen", kitchen, 133), (0, "demo-ninja", ninja, 204), (3, "demo-snowman", snowman, 72),
               (2, "demo-ufo", ufo, 167), (1, "demo-goal", goal, 119), (3, "demo-dance", dancefloor, 141), (0, "demo-clouds", clouds, 64),
               (2, "demo-rocket", rocket, 178), (1, "demo-campfire", campfire, 109)]
# Bump when DEMO_MOVIES grows: a site that already loaded the demo then gets the missing cartoons (nothing else changes).
DEMO_SET = 2


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
    st = state()
    if st == "never":
        load()
    elif st == "loaded" and C.get_setting("demo_set", 1) != DEMO_SET:
        top_up()


def _demo_users():
    users = []
    for name, email in DEMO_USERS:
        u = app_tables.users.get(email=email) or app_tables.users.add_row(email=email, enabled=False)
        u.update(display_name=name, is_demo=True, signed_up=C.now() - dt.timedelta(days=30))
        users.append(u)
    return users


def _add_movie(users, i, who, key, make, views):
    m = make()
    name = m.pop("name")
    days = len(DEMO_MOVIES) + 1 - i  # later cartoons look newer, so the Theater (newest first) leads with them
    app_tables.movies.add_row(owner=users[who], uid=_id("m"), name=name, data=m, thumb=None, dur=m["dur"], shared=True,
                              share_key=key, featured=True, views=views, is_demo=True,
                              created=C.now() - dt.timedelta(days=days), updated=C.now() - dt.timedelta(days=days, hours=i))


def load():
    remove(remember=False)
    users = _demo_users()
    for i, (who, key, make, views) in enumerate(DEMO_MOVIES):
        _add_movie(users, i, who, key, make, views)
    C.set_setting("demo", "loaded")
    C.set_setting("demo_set", DEMO_SET)
    return counts()


def top_up():
    """Adds the demo cartoons that are new since this site loaded the demo. The ones already there (even un-shared) stay as they are."""
    users = _demo_users()
    for i, (who, key, make, views) in enumerate(DEMO_MOVIES):
        if app_tables.movies.get(share_key=key) is None:
            _add_movie(users, i, who, key, make, views)
    C.set_setting("demo_set", DEMO_SET)


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
