import datetime

import anvil.js
from anvil import *

from ._anvil_designer import IdeaMachineTemplate
from ... import ideas, state, tl


class IdeaMachine(IdeaMachineTemplate):
    """A story slot machine: WHO (hero + sidekick), WHERE, WANTS and BUT... reels, each with a lock. Spin shuffles the
    unlocked reels; the first open each day shows the Idea of the day (the same for everyone). Closes with the idea
    dict plus its story (ideas.story: name, captions, props) for tl.idea_machine to film, or None.
    self.my_chars = your characters (JS objects), so the movie can use them without loading them again."""

    def __init__(self, **properties):
        super().__init__(**properties)
        state.heading(self.title_label, 2)
        state.live(self.story_label)
        self.my_chars = tl.TL.store.chars()
        self.chars = {}
        cast = []
        for c in list(self.my_chars):
            self.chars[str(c.id)] = c
            cast.append({"id": str(c.id), "name": str(c.name), "mine": True})
        for c in tl.TL.PRESET_LIST:
            self.chars[str(c.id)] = c
            cast.append({"id": str(c.id), "name": str(c.name), "mine": False})
        self.cast = cast
        self.scenes = [{"id": s["id"], "name": s["name"], "emoji": s["emoji"]} for s in tl.py_value(tl.TL.SCENES)]
        self.scene_by_id = {s["id"]: s for s in self.scenes}
        self.locked = set()
        self.today = datetime.date.today().isoformat()
        if state.store_get("ideaDay", "") != self.today:
            state.store_set("ideaDay", self.today)
            self.idea = ideas.idea_of_the_day(self.cast, self.scenes, self.today)
        else:
            self.idea = ideas.spin({}, [], self.cast, self.scenes)
        for reel in ideas.REELS:
            state.set_control_attr(self._lock(reel), "aria-label", "Lock " + {"who": "who", "where": "where", "want": "wants",
                                                                               "twist": "but"}[reel])
        self._draw(announce=False)

    def _lock(self, reel):
        return {"who": self.who_lock, "where": self.where_lock, "want": self.want_lock, "twist": self.twist_lock}[reel]

    def _reel(self, reel):
        return {"who": self.who_reel, "where": self.where_reel, "want": self.want_reel, "twist": self.twist_reel}[reel]

    def _thumb(self, char_id):
        c = self.chars.get(char_id)
        return tl.char_thumb(c) if c else ""

    def _draw(self, announce=True):
        i = self.idea
        hero, side = i["hero"], i["sidekick"]
        self.dom_nodes["hero_pic"].src = self._thumb(hero["id"])
        self.dom_nodes["side_pic"].src = self._thumb(side["id"])
        self.who_label.text = "%s and %s" % (hero["name"], side["name"])
        scene = self.scene_by_id.get(i["where"]) or self.scenes[0]
        self.dom_nodes["place_pic"].src = str(tl.TL.bgPic(scene["id"], 240, 135))
        self.where_label.text = "%s %s" % (scene["emoji"], scene["name"])
        want, twist = ideas.WANTS[i["want"]], ideas.TWISTS[i["twist"]]
        self.dom_nodes["want_emoji"].textContent = want[2]
        self.want_label.text = want[0][0].upper() + want[0][1:]
        self.dom_nodes["twist_emoji"].textContent = twist[1]
        self.twist_label.text = twist[0][0].upper() + twist[0][1:]
        s = ideas.story(i)
        self.story_label.text = "%s %s" % (s["captions"][0], s["captions"][1])
        self.daily_label.visible = bool(i.get("day"))
        self.today_button.visible = not i.get("day")
        for reel in ideas.REELS:
            on = reel in self.locked
            b = self._lock(reel)
            b.text = "🔒 Locked" if on else "🔓 Lock"
            state.set_control_attr(b, "aria-pressed", "true" if on else "false")
            self._reel(reel).classes["locked"] = on

    def _roll(self, reels):
        """Restart the little roll animation on the reels that changed (CSS .im-reel.spin; off for reduced motion)."""
        for reel in reels:
            node = anvil.js.get_dom_node(self._reel(reel))
            node.classList.remove("spin")
            _ = node.offsetWidth  # reflow, so the animation plays again
            node.classList.add("spin")

    def _toggle(self, reel):
        if reel in self.locked:
            self.locked.discard(reel)
        else:
            self.locked.add(reel)
        self._draw(announce=False)

    @handle("who_lock", "click")
    def who_lock_click(self, **event_args):
        self._toggle("who")

    @handle("where_lock", "click")
    def where_lock_click(self, **event_args):
        self._toggle("where")

    @handle("want_lock", "click")
    def want_lock_click(self, **event_args):
        self._toggle("want")

    @handle("twist_lock", "click")
    def twist_lock_click(self, **event_args):
        self._toggle("twist")

    @handle("spin_button", "click")
    def spin_button_click(self, **event_args):
        if len(self.locked) == len(ideas.REELS):
            state.toast("Everything is locked! Unlock a reel to spin it.")
            return
        self.idea = ideas.spin(self.idea, self.locked, self.cast, self.scenes)
        self._draw()
        self._roll([r for r in ideas.REELS if r not in self.locked])
        try:
            tl.TL.preview("b:s_pop", tl.js_value({"vol": 0.45}))
        except Exception:
            pass

    @handle("today_button", "click")
    def today_button_click(self, **event_args):
        self.locked = set()
        self.idea = ideas.idea_of_the_day(self.cast, self.scenes, self.today)
        self._draw()
        self._roll(list(ideas.REELS))

    @handle("make_button", "click")
    def make_button_click(self, **event_args):
        self.make_button.enabled = False
        i = dict(self.idea)
        s = ideas.story(i)
        out = {"name": s["name"], "bg": i["where"], "actors": [i["hero"]["id"], i["sidekick"]["id"]], "props": s["props"],
               "captions": s["captions"], "want": i["want"], "twist": i["twist"], "day": i.get("day")}
        self.raise_event("x-close-alert", value=out)
