from anvil import *

from ._anvil_designer import CharTileTemplate
from ... import router, state


class CharTile(CharTileTemplate):
    """A character tile. item = {id, name, thumb, sub, preset}. Your own characters open the builder; premade ones
    (preset True) ask the page (x-preset) to show their preview."""

    def __init__(self, **properties):
        super().__init__(**properties)
        c = self.item
        state.set_attr(self.link, "href", router.href("cast") if c.get("preset") else router.href("build", c["id"]))
        self.dom_nodes["pic"].src = c.get("thumb") or ""
        self.name_label.text = c.get("name") or ""
        self.sub_label.text = c.get("sub") or ""

    def link_click(self, event):
        if self.item.get("preset"):
            event.preventDefault()
            self.parent.raise_event("x-preset", item=self.item)
