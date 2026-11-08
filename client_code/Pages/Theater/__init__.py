from anvil import *

from ._anvil_designer import TheaterTemplate
from ... import state


class Theater(TheaterTemplate):
    """#theater: featured cartoons (picked by admins) and the ones you shared."""

    def __init__(self, args=(), **properties):
        super().__init__(**properties)
        d = state.call("theater_list") or {"featured": [], "mine": []}
        self.featured_panel.items = d["featured"]
        self.featured_box.visible = bool(d["featured"])
        self.empty_box.visible = not d["featured"]
        self.mine_panel.items = [dict(c, mine_group=True) for c in d["mine"]]
        self.mine_part.visible = bool(d["mine"])
