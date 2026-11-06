from anvil import *

from ._anvil_designer import MovieMenuTemplate
from ... import state


class MovieMenu(MovieMenuTemplate):
    """What you can do with one of your movies. Closes with "open", "rename", "copy", "share", "delete" or None."""

    def __init__(self, name="", **properties):
        super().__init__(**properties)
        self.title_label.text = name or "Movie"
        state.heading(self.title_label, 2)

    def _pick(self, what):
        self.raise_event("x-close-alert", value=what)

    @handle("open_button", "click")
    def open_button_click(self, **event_args):
        self._pick("open")

    @handle("rename_button", "click")
    def rename_button_click(self, **event_args):
        self._pick("rename")

    @handle("copy_button", "click")
    def copy_button_click(self, **event_args):
        self._pick("copy")

    @handle("share_button", "click")
    def share_button_click(self, **event_args):
        self._pick("share")

    @handle("delete_button", "click")
    def delete_button_click(self, **event_args):
        self._pick("delete")
