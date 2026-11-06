from anvil import *

from ._anvil_designer import ReportTemplate
from ... import state


class Report(ReportTemplate):
    """Report a shared cartoon (report_toon). Closes with True when sent."""

    def __init__(self, key="", **properties):
        super().__init__(**properties)
        self.key = key
        state.heading(self.title_label, 2)
        state.set_control_attr(self.reason_box, "maxlength", 1000)

    @handle("send_button", "click")
    def send_button_click(self, **event_args):
        reason = (self.reason_box.text or "").strip()
        if len(reason) < 3:
            state.toast("Tell us a little about what's wrong.", "error")
            return
        if state.call("report_toon", self.key, reason) is not None:
            state.toast("Thanks! We'll take a look.", "ok")
            self.raise_event("x-close-alert", value=True)

    @handle("cancel_button", "click")
    def cancel_button_click(self, **event_args):
        self.raise_event("x-close-alert", value=None)
