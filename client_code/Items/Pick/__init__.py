from anvil import *

from ._anvil_designer import PickTemplate
from ... import state


class Pick(PickTemplate):
    """A picture choice (body types, places, actors). item = {key, label, img, on, wide}. Asks the page: x-pick."""

    def __init__(self, **properties):
        super().__init__(**properties)
        p = self.item
        self.dom_nodes["pic"].src = p.get("img") or ""
        self.caption.text = p.get("label") or ""
        self.btn.classes["on"] = bool(p.get("on"))
        self.btn.classes["wide"] = bool(p.get("wide"))
        state.set_attr(self.btn, "aria-pressed", "true" if p.get("on") else "false")
        state.set_attr(self.btn, "data-key", p["key"])

    def btn_click(self, event):
        self.parent.raise_event("x-pick", key=self.item["key"])
