from anvil import *

from ._anvil_designer import PlayerTemplate
from ... import tl


class Player(PlayerTemplate):
    """A movie player (TL.player in tl-movie.js)."""

    def __init__(self, **properties):
        self.ctl = tl.NULL
        super().__init__(**properties)

    def load(self, movie, chars):
        self.stop()
        self.ctl = tl.TL.player(self.dom_nodes["host"], movie, chars, tl.js_value({}))
        return self.ctl.ready

    def stop(self):
        if self.ctl is not None:
            self.ctl.destroy()
            self.ctl = tl.NULL

    @handle("", "hide")
    def form_hide(self, **event_args):
        self.stop()
