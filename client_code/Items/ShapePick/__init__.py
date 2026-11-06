from anvil import *

from ._anvil_designer import ShapePickTemplate
from ... import state


class ShapePick(ShapePickTemplate):
    """A canvas shape choice (TL.FORMATS: Wide 16:9, Reel 9:16, Square 1:1, Portrait 4:5) with a little picture of the
    shape. item = {id, name, ratio, emoji, use, out: [w, h], on}. Asks the page: x-pick."""

    def __init__(self, **properties):
        super().__init__(**properties)
        f = self.item
        self.dom_nodes["pic"].style.aspectRatio = "%s / %s" % (f["out"][0], f["out"][1])
        self.title_label.text = "%s %s %s" % (f["emoji"], f["name"], f["ratio"])
        self.use_label.text = f["use"]
        self.btn.classes["on"] = bool(f.get("on"))
        state.set_attr(self.btn, "aria-pressed", "true" if f.get("on") else "false")
        state.set_attr(self.btn, "data-key", f["id"])

    def btn_click(self, event):
        self.parent.raise_event("x-pick", key=self.item["id"])
