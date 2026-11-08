from anvil import *

from ._anvil_designer import StickerTemplate


class Sticker(StickerTemplate):
    """A sticker in the sticker book. item = {emoji, label, on}."""

    def __init__(self, **properties):
        super().__init__(**properties)
        badge = self.dom_nodes["badge"]
        badge.textContent = self.item["emoji"]
        if not self.item.get("on"):
            badge.classList.add("off")
        self.caption.text = self.item["label"]
        self.status_label.text = "earned" if self.item.get("on") else "not earned yet"
