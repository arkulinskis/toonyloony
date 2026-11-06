from anvil import *

from ._anvil_designer import TheaterCardTemplate
from ... import router, state, tl


class TheaterCard(TheaterCardTemplate):
    """A cartoon in the Theater (and Home's "In the Theater"). item = a theater card {key, name, thumb, dur, author,
    views, featured, format, data, mine_group}. No thumbnail: a still is drawn from the movie data."""

    def __init__(self, **properties):
        super().__init__(**properties)
        c = self.item
        state.set_attr(self.link, "href", router.href("watch", c["key"]))
        thumb = c.get("thumb") or tl.poster(c.get("data"), c.get("dur"))
        self.dom_nodes["pic"].src = thumb or ""
        self.dur_label.text = tl.fmt_time(c.get("dur"))
        badge = tl.shape_badge(c.get("format") or (c.get("data") or {}).get("format"))
        self.format_badge.visible = bool(badge)
        self.format_badge.text = badge
        self.name_label.text = c.get("name") or "Cartoon"
        meta = "by %s · %s" % (c.get("author") or "someone", state.plural(c.get("views") or 0, "view"))
        self.meta_label.text = meta + (" · ⭐ featured" if c.get("featured") and c.get("mine_group") else "")
