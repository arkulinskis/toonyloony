from anvil import *

from ._anvil_designer import AskNameTemplate
from ... import state


class AskName(AskNameTemplate):
    """Ask for a name (rename a movie, a move, an actor, a sound). Closes with the trimmed text, or None."""

    def __init__(self, title="Name", value="", ok="Save", **properties):
        super().__init__(**properties)
        self.title_label.text = title
        state.heading(self.title_label, 2)
        self.name_box.text = value or ""
        self.ok_button.text = ok or "Save"
        state.set_control_attr(self.name_box, "maxlength", 60)

    @handle("", "show")
    def form_show(self, **event_args):
        state.focus(self.name_box)
        state.control(self.name_box).select()

    def _done(self):
        text = (self.name_box.text or "").strip()
        if not text:
            state.toast("Type a name first.", "error")
            return
        self.raise_event("x-close-alert", value=text)

    @handle("name_box", "pressed_enter")
    def name_box_pressed_enter(self, **event_args):
        self._done()

    @handle("ok_button", "click")
    def ok_button_click(self, **event_args):
        self._done()

    @handle("cancel_button", "click")
    def cancel_button_click(self, **event_args):
        self.raise_event("x-close-alert", value=None)
