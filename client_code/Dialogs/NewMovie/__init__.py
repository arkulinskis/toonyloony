import random

from anvil import *

from ._anvil_designer import NewMovieTemplate
from ... import state, tl

NAMES = ["The Big Adventure", "Super Silly Day", "The Mystery of the Missing Sock", "Space Pals", "Best Friends Forever",
         "The Great Escape"]


class NewMovie(NewMovieTemplate):
    """New movie: a name, the canvas shape (Wide, Reel, Square, Portrait), a place and up to 4 actors. Saves it
    (TL.makeMovie: guests in this browser, members on the server) and closes with its id, or None."""

    def __init__(self, **properties):
        super().__init__(**properties)
        state.heading(self.title_label, 2)
        self.name_box.text = random.choice(NAMES)
        state.set_control_attr(self.name_box, "maxlength", 60)
        self.my_chars = tl.TL.store.chars()
        mine = [{"id": str(c.id), "name": str(c.name), "thumb": tl.char_thumb(c)} for c in self.my_chars]
        presets = [{"id": str(c.id), "name": str(c.name), "thumb": tl.char_thumb(c)} for c in tl.TL.PRESET_LIST]
        self.cast = mine + presets
        self.picked = [mine[0]["id"]] if mine else ["p_blox", "p_biscuit"]
        self.shape = state.store_get("lastShape", "wide")
        self.bg = random.choice(tl.py_value(tl.TL.SCENES))["id"]
        self.scenes = [{"id": s["id"], "name": s["emoji"] + " " + s["name"], "img": str(tl.TL.bgPic(s["id"]))}
                       for s in tl.py_value(tl.TL.SCENES)]
        for panel, handler in ((self.shapes_panel, self._shape), (self.places_panel, self._place), (self.cast_panel, self._actor)):
            panel.add_event_handler("x-pick", handler)
        self._draw()

    def _draw(self, focus=None):
        self.shapes_panel.items = [dict(f, on=f["id"] == self.shape) for f in tl.formats()]
        self.places_panel.items = [{"key": s["id"], "label": s["name"], "img": s["img"], "wide": True, "on": s["id"] == self.bg}
                                   for s in self.scenes]
        self.cast_panel.items = [{"key": c["id"], "label": c["name"], "img": c["thumb"], "on": c["id"] in self.picked}
                                 for c in self.cast]
        if focus:
            state.refocus(self, focus)

    def _shape(self, key, **event_args):
        self.shape = key
        self._draw(key)

    def _place(self, key, **event_args):
        self.bg = key
        self._draw(key)

    def _actor(self, key, **event_args):
        if key in self.picked:
            self.picked.remove(key)
        elif len(self.picked) < 4:
            self.picked.append(key)
        else:
            state.toast("Four is plenty to start. Add more in the studio!")
        self._draw(key)

    @handle("start_button", "click")
    def start_button_click(self, **event_args):
        self.start_button.enabled = False
        state.store_set("lastShape", self.shape)
        movie_id = tl.TL.makeMovie((self.name_box.text or "").strip() or "My cartoon", self.bg, tl.js_value(self.picked),
                                   self.shape, self.my_chars)
        self.raise_event("x-close-alert", value=str(movie_id))

    @handle("cancel_button", "click")
    def cancel_button_click(self, **event_args):
        self.raise_event("x-close-alert", value=None)
