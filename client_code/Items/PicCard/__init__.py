from anvil import *

from ._anvil_designer import PicCardTemplate
from ... import state


class PicCard(PicCardTemplate):
    """A picture in the Library: yours (rename, delete) or a premade place. item = {id, name, src, own}."""

    def __init__(self, **properties):
        super().__init__(**properties)
        p = self.item
        self.dom_nodes["pic"].src = p.get("src") or ""
        self.name_label.text = p.get("name") or ""
        self.rename_button.visible = self.delete_button.visible = bool(p.get("own"))
        state.set_control_attr(self.rename_button, "aria-label", "Rename " + (p.get("name") or "picture"))
        state.set_control_attr(self.delete_button, "aria-label", "Delete " + (p.get("name") or "picture"))

    @handle("rename_button", "click")
    def rename_button_click(self, **event_args):
        self.parent.raise_event("x-rename", item=self.item)

    @handle("delete_button", "click")
    def delete_button_click(self, **event_args):
        self.parent.raise_event("x-delete", item=self.item)
