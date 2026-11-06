from anvil import *

from ._anvil_designer import MovieTileTemplate
from ... import router, state, tl


class MovieTile(MovieTileTemplate):
    """One of your movies on Home. item = a movie summary {id, name, thumb, dur, actors, updated, shared, share_key,
    format}. The tile opens the studio; "More" asks the page (x-more) for the menu."""

    def __init__(self, **properties):
        super().__init__(**properties)
        m = self.item
        state.set_attr(self.link, "href", router.href("studio", m["id"]))
        pic, noimg = self.dom_nodes["pic"], self.dom_nodes["noimg"]
        if m.get("thumb"):
            pic.src = m["thumb"]
            noimg.style.display = "none"
        else:
            pic.style.display = "none"
        self.name_label.text = m.get("name") or "My cartoon"
        sub = "%s · %s" % (tl.fmt_time(m.get("dur")), state.plural(m.get("actors") or 0, "actor"))
        self.sub_label.text = sub + (" · " + state.ago(m["updated"]) if m.get("updated") else "")
        self.shared_badge.visible = bool(m.get("shared"))
        badge = tl.shape_badge(m.get("format"))
        self.format_badge.visible = bool(badge)
        self.format_badge.text = badge
        state.set_control_attr(self.more_button, "aria-label", "More for " + (m.get("name") or "this movie"))

    @handle("more_button", "click")
    def more_button_click(self, **event_args):
        self.parent.raise_event("x-more", item=self.item)
