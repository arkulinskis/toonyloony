from anvil import *
from anvil.js import window

from ._anvil_designer import ShareTemplate
from ... import router, state, tl


class Share(ShareTemplate):
    """Make or stop a watch link for one of your movies (members only; tl.share asks guests to make an account)."""

    def __init__(self, movie_id="", share_state=None, **properties):
        super().__init__(**properties)
        self.movie_id = movie_id
        state.heading(self.title_label, 2)
        state.set_control_attr(self.link_box, "readonly", "readonly")
        state.set_control_attr(self.link_box, "aria-label", "Watch link")
        if share_state is None:
            r = tl.TL.store.getMovie(movie_id)
            share_state = {"shared": bool(r and r.shared), "share_key": str(r.share_key) if r and r.share_key else None}
        self._draw(share_state)

    def _draw(self, st):
        self.share_state = st
        self.on_part.visible = bool(st.get("shared"))
        self.off_part.visible = not st.get("shared")
        if st.get("shared"):
            self.link_box.text = str(tl.TL.watchUrl(st["share_key"]))
            state.set_attr(self.watch_link, "href", router.href("watch", st["share_key"]))

    @handle("on_button", "click")
    def on_button_click(self, **event_args):
        r = tl.attempt(lambda: tl.py_value(tl.TL.store.shareMovie(self.movie_id, True)))
        if r:
            tl.store_flag("share", True)
            self._draw(r)

    @handle("off_button", "click")
    def off_button_click(self, **event_args):
        r = tl.attempt(lambda: tl.py_value(tl.TL.store.shareMovie(self.movie_id, False)))
        if r:
            self._draw(r)
            state.toast("Your link is off.")

    @handle("copy_button", "click")
    def copy_button_click(self, **event_args):
        state.control(self.link_box).select()
        try:
            window.navigator.clipboard.writeText(self.link_box.text)
        except Exception:
            window.document.execCommand("copy")
        state.toast("Link copied!", "ok")

    @handle("later_button", "click")
    def later_button_click(self, **event_args):
        self.raise_event("x-close-alert", value=None)

    def watch_click(self, event):
        self.raise_event("x-close-alert", value=None)
