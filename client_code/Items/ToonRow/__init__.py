from anvil import *

from ._anvil_designer import ToonRowTemplate
from ... import router, state, tl


class ToonRow(ToonRowTemplate):
    """A shared movie in Admin -> Toons. item = {key, name, thumb, author, email, views, updated, featured, demo, format}.
    Feature / un-feature and stop sharing; tells the page (x-changed) to reload."""

    def __init__(self, **properties):
        super().__init__(**properties)
        x = self.item
        pic = self.dom_nodes["pic"]
        if x.get("thumb"):
            pic.src = x["thumb"]
        else:
            pic.style.display = "none"
        self.name_label.text = x.get("name") or ""
        self.demo_badge.visible = bool(x.get("demo"))
        self.featured_badge.visible = bool(x.get("featured"))
        badge = tl.shape_badge(x.get("format"))
        self.format_badge.visible = bool(badge)
        self.format_badge.text = badge
        who = (x.get("author") or "") + (" (%s)" % x["email"] if x.get("email") else "")
        self.meta_label.text = "by %s · %s · %s" % (who, state.plural(x.get("views") or 0, "view"), state.ago(x.get("updated")))
        state.set_attr(self.watch_link, "href", router.href("watch", x["key"]))
        self.feature_button.text = "Un-feature" if x.get("featured") else "⭐ Feature"
        self.feature_button.role = ["btn", "btn-sm"] if x.get("featured") else ["btn", "btn-sm", "btn-primary"]

    @handle("feature_button", "click")
    def feature_button_click(self, **event_args):
        if state.call("admin_feature", self.item["key"], not self.item.get("featured")) is not None:
            state.toast("Saved", "ok")
            self.parent.raise_event("x-changed")

    @handle("unshare_button", "click")
    def unshare_button_click(self, **event_args):
        if confirm("Its link stops working for everyone. The owner keeps the movie and can share it again.",
                   title="Stop sharing this movie?", buttons=[("Cancel", False), ("Stop sharing", True)], role="app-dialog"):
            if state.call("admin_unshare", self.item["key"]) is not None:
                state.toast("Done", "ok")
                self.parent.raise_event("x-changed")
