"""The Idea machine's reels (Dialogs/IdeaMachine): WHO (a hero and a sidekick), WHERE (one of the places), WANTS and
BUT... (a silly twist). Toontastic's story arc in one spin: setup, conflict, "you decide" the ending.

    spin(idea, locked, cast, scenes, rng=None)   a new idea; reels named in `locked` keep their value
    idea_of_the_day(cast, scenes, day)            the same idea for everyone on the same date (good for a class)
    story(idea)                                    {name, captions: [3 texts], props: [...]} for TL.makeIdeaMovie

cast = [{"id", "name", "mine"}] (your own characters + the premade cast), scenes = [{"id", "name"}].
Prop ids are premade props from tl-props.js (`p_o_*`, never renamed); TL.makeIdeaMovie skips any that are missing.
"""
import random

# (what comes after "<hero> wants", the movie title part, emoji, prop id or None)
WANTS = [
    ("the last pizza slice", "the Last Pizza Slice", "🍕", "p_o_pizza"),
    ("to find the lost treasure", "the Lost Treasure", "💰", "p_o_chest"),
    ("to win the golden trophy", "the Golden Trophy", "🏆", "p_o_trophy"),
    ("to open the mystery present", "the Mystery Present", "🎁", "p_o_gift"),
    ("to fly a rocket to the moon", "the Moon Rocket", "🚀", "p_o_rocket"),
    ("the biggest birthday cake ever", "the Biggest Cake Ever", "🎂", "p_o_cake"),
    ("to score the winning goal", "the Winning Goal", "⚽", "p_o_ball"),
    ("to catch all the balloons", "the Runaway Balloons", "🎈", "p_o_balloons"),
    ("to catch a falling star", "the Falling Star", "⭐", "p_o_star"),
    ("to build the tallest tower", "the Tallest Tower", "🧱", "p_o_blocks"),
    ("to drive the shiny red car", "the Shiny Red Car", "🚗", "p_o_car"),
    ("to sail across the sea", "the Big Sail", "⛵", "p_o_boat"),
    ("to toast marshmallows", "the Marshmallow Night", "🔥", "p_o_campfire"),
    ("to win the drum contest", "the Drum Contest", "🥁", "p_o_drum"),
    ("to find the end of the rainbow", "the End of the Rainbow", "🌈", "p_o_rainbow"),
    ("to jump through the magic portal", "the Magic Portal", "🌀", "p_o_portal"),
    ("to land the coolest skateboard trick", "the Coolest Trick", "🛹", "p_o_skateboard"),
    ("the shiniest apple in town", "the Shiny Apple", "🍎", "p_o_apple"),
    ("to make a friend from outer space", "the Space Friend", "🛸", "p_o_ufo"),
    ("to build the best snowman ever", "the Best Snowman", "⛄", "p_o_snowman"),
    ("to carve the spookiest pumpkin", "the Spooky Pumpkin", "🎃", "p_o_pumpkin"),
    ("to grow the prettiest flowers", "the Pretty Flowers", "🌷", "p_o_flowers"),
    ("a cozy little house of their own", "the Cozy House", "🏠", "p_o_house"),
    ("to see what's inside the box", "the Mystery Box", "📦", "p_o_box"),
    ("to win the beach ball game", "the Beach Ball Game", "🏐", "p_o_beachball"),
    ("to give the moon a hug", "the Moon Hug", "🌙", "p_o_moon"),
    ("to win the big dance-off", "the Dance-Off", "🕺", None),
    ("to cook the yummiest soup", "the Yummy Soup", "🍲", None),
    ("to tell the funniest joke ever", "the Funniest Joke", "😂", None),
    ("to be the fastest runner in town", "the Big Race", "🏁", None),
]

# (what comes after "But...", emoji, prop id or None)
TWISTS = [
    ("a UFO lands right in the way", "🛸", "p_o_ufo"),
    ("the floor turns to lava", "🌋", None),
    ("everyone shrinks to bug size", "🐜", None),
    ("a sneaky raccoon wants it too", "🦝", None),
    ("it starts raining spaghetti", "🍝", None),
    ("a giant sneeze blows everything away", "🤧", None),
    ("gravity switches off", "🪐", None),
    ("the hiccups won't stop", "😵", None),
    ("a grumpy storm cloud follows them", "🌧️", "p_o_cloud"),
    ("a snowman guards the way", "⛄", "p_o_snowman"),
    ("a magic portal swallows it up", "🌀", "p_o_portal"),
    ("everything turns to jelly", "🍮", None),
    ("their shoes get glued to the floor", "👟", None),
    ("a rocket zooms off with it", "🚀", "p_o_rocket"),
    ("a ghost keeps yelling BOO", "👻", None),
    ("they can only walk backwards", "🔄", None),
    ("the lights go out", "🔦", None),
    ("it's suddenly the middle of the night", "🌙", "p_o_moon"),
    ("a big red ball comes bouncing in", "🔴", "p_o_ball"),
    ("they keep turning invisible", "🫥", None),
    ("a robot copies everything they do", "🤖", None),
    ("they can only talk in rhymes", "🎤", None),
    ("a huge rock blocks the way", "🪨", "p_o_rock"),
    ("a bunch of balloons lifts them up", "🎈", "p_o_balloons"),
    ("it's somebody else's birthday", "🎂", "p_o_cake"),
    ("it suddenly starts snowing", "❄️", None),
    ("the sun won't stop dancing", "☀️", "p_o_sun"),
    ("everyone starts dancing and can't stop", "💃", None),
    ("they swap bodies by accident", "🔀", None),
    ("a giant wave splashes in", "🌊", None),
]

REELS = ("who", "where", "want", "twist")


class _DayRng:
    """A tiny seeded random generator, the same in every browser (Skulpt's random can't be seeded the same way)."""

    def __init__(self, text):
        h = 7
        for ch in str(text):
            h = (h * 31 + ord(ch)) % 2147483647
        self.s = h or 1

    def randrange(self, n):
        self.s = (self.s * 48271) % 2147483647
        return self.s % max(1, n)

    def choice(self, items):
        return items[self.randrange(len(items))]


def _pick_who(cast, rng, keep_hero=None):
    mine = [c for c in cast if c.get("mine")]
    premade = [c for c in cast if not c.get("mine")] or cast
    if keep_hero:
        hero = keep_hero
    elif mine and rng.randrange(2) == 0:
        hero = rng.choice(mine)  # your own characters star half the time
    else:
        hero = rng.choice(premade)
    others = [c for c in cast if c["id"] != hero["id"]] or cast
    side = rng.choice(others)
    return {"id": hero["id"], "name": hero["name"]}, {"id": side["id"], "name": side["name"]}


def spin(idea, locked, cast, scenes, rng=None):
    """A new idea. Reels named in `locked` ("who", "where", "want", "twist") keep their value from `idea`."""
    rng = rng or random
    idea = dict(idea or {})
    locked = set(locked or [])
    out = {"day": None}
    if "who" in locked and idea.get("hero"):
        out["hero"], out["sidekick"] = idea["hero"], idea["sidekick"]
    else:
        out["hero"], out["sidekick"] = _pick_who(cast, rng)
    if "where" in locked and idea.get("where"):
        out["where"] = idea["where"]
    else:
        out["where"] = _new(rng, [s["id"] for s in scenes], idea.get("where"))
    for reel, rows in (("want", WANTS), ("twist", TWISTS)):
        if reel in locked and idea.get(reel) is not None:
            out[reel] = idea[reel]
        else:
            out[reel] = _new(rng, list(range(len(rows))), idea.get(reel))
    # a twist with the same prop as the wish is no surprise: spin it again
    if "twist" not in locked and TWISTS[out["twist"]][2] and TWISTS[out["twist"]][2] == WANTS[out["want"]][3]:
        out["twist"] = (out["twist"] + 1) % len(TWISTS)
    if "who" in locked and "where" in locked and "want" in locked and "twist" in locked:
        out["day"] = idea.get("day")
    return out


def _new(rng, options, current):
    """A random option, not the one showing now (a spin should look like it changed)."""
    if len(options) > 1 and current in options:
        options = [o for o in options if o != current]
    return rng.choice(options)


def idea_of_the_day(cast, scenes, day):
    """The same idea for everyone on `day` ('2026-11-20'): only the premade cast, so it doesn't depend on whose
    computer it is."""
    rng = _DayRng("toonyloony-idea-" + day)
    premade = [c for c in cast if not c.get("mine")] or cast
    idea = spin({}, [], [dict(c, mine=False) for c in premade], scenes, rng)
    idea["day"] = day
    return idea


def story(idea):
    """The movie the idea makes: its name, the three story captions and the props to put on stage."""
    hero = idea["hero"]["name"]
    want, twist = WANTS[idea["want"]], TWISTS[idea["twist"]]
    name = "%s and %s" % (hero, want[1])
    if len(name) > 60:
        name = want[1][0].upper() + want[1][1:]
    return {
        "name": name[:60],
        "captions": ["%s wants %s!" % (hero, want[0]), "But... %s!" % twist[0], "How does it end? You decide! ✨"],
        "props": [p for p in (want[3], twist[2]) if p],
    }
