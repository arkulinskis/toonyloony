from anvil import *

from ._anvil_designer import SoundCardTemplate
from ... import state


class SoundCard(SoundCardTemplate):
    """A sound, music loop or voice in the Library. item = {id, name, emoji, kind, dur, own, playing}.
    Buttons ask the page: x-play, x-rename, x-delete."""

    def __init__(self, **properties):
        super().__init__(**properties)
        s = self.item
        self.dom_nodes["emoji"].textContent = s.get("emoji") or {"voice": "🎙️", "music": "🎵"}.get(s.get("kind"), "🔊")
        self.name_label.text = s.get("name") or ""
        bits = ["%.1f s" % s["dur"]] if s.get("dur") else []
        bits.append("yours" if s.get("own") else ("loops" if s.get("kind") == "music" else ""))
        self.meta_label.text = " · ".join(b for b in bits if b)
        self.rename_button.visible = self.delete_button.visible = bool(s.get("own"))
        playing = bool(s.get("playing"))
        self.play_button.text = "■" if playing else "▶"
        self.play_button.role = ["lb-play", "on"] if playing else ["lb-play"]
        name = s.get("name") or "this"
        state.set_control_attr(self.play_button, "aria-label", ("Stop " if playing else "Listen to ") + name)
        state.set_control_attr(self.rename_button, "aria-label", "Rename " + name)
        state.set_control_attr(self.delete_button, "aria-label", "Delete " + name)
        state.set_control_attr(self.play_button, "data-key", "play-" + s["id"])

    @handle("play_button", "click")
    def play_button_click(self, **event_args):
        self.parent.raise_event("x-play", item=self.item)

    @handle("rename_button", "click")
    def rename_button_click(self, **event_args):
        self.parent.raise_event("x-rename", item=self.item)

    @handle("delete_button", "click")
    def delete_button_click(self, **event_args):
        self.parent.raise_event("x-delete", item=self.item)
