from anvil import *

from ._anvil_designer import PickStarterTemplate
from ... import state, tl


class PickStarter(PickStarterTemplate):
    """The 12 body types (TL.STARTERS), drawn by the engine. Closes with the chosen starter id, or None."""

    def __init__(self, **properties):
        super().__init__(**properties)
        state.heading(self.title_label, 2)
        self.starters_panel.items = [{"key": s[0], "label": s[1], "img": str(tl.TL.starterPic(s[0]))}
                                     for s in tl.py_value(tl.TL.STARTERS)]
        self.starters_panel.add_event_handler("x-pick", self._pick)

    def _pick(self, key, **event_args):
        self.raise_event("x-close-alert", value=key)
