import anvil.server
from anvil import *
from anvil.js import window

from ._anvil_designer import WatchTemplate
from ... import router, state, tl


class Watch(WatchTemplate):
    """#watch/<key>: the player for a shared cartoon. A shared link works for anyone who has it. Anyone can report it.
    "Remix it" (not on your own) copies it into your studio (TL.remixMovie: guests in this browser, members in their
    account) without the maker's uploaded voices, sounds or pictures; a remix shows "Remix of <name> by <maker>"."""

    def __init__(self, args=(), **properties):
        super().__init__(**properties)
        self.key = args[0] if args else ""
        self.data = {}
        d = anvil.server.call("watch_get", self.key)
        ok = isinstance(d, dict) and d.get("ok") is not False and bool(d.get("movie"))
        self.found_part.visible = ok
        self.missing_part.visible = not ok
        if not ok:
            self.missing_label.text = (d.get("error") if isinstance(d, dict) else "") or "It may have been unshared or deleted."
            return
        self.data = d
        c, movie = d["card"], d["movie"]
        origin = str(tl.UI.apiOrigin)
        for k, a in (d.get("assets") or {}).items():
            tl.TL.assetIndex[k] = tl.js_value(dict(a, url=origin + "/media?k=" + a["key"]))
        self.title_label.text = movie.get("name") or "Cartoon"
        state.heading(self.title_label, 1)
        badge = tl.shape_badge(movie.get("format"))
        remixes = c.get("remixes") or 0
        self.meta_label.text = "by %s · %s%s%s%s" % (c.get("author") or "someone", state.plural(c.get("views") or 0, "view"),
                                                     (" · 🔁 " + state.plural(remixes, "remix", "remixes")) if remixes else "",
                                                     " · ⭐ featured" if c.get("featured") else "", (" · " + badge) if badge else "")
        src = c.get("remix_of")
        self.remix_part.visible = bool(src)
        if src:
            a = self.dom_nodes["remix_a"]
            a.textContent = src.get("name") or "a cartoon"
            if src.get("live") and src.get("key"):
                a.setAttribute("href", router.href("watch", src["key"]))
            else:
                a.removeAttribute("href")
            self.dom_nodes["remix_by"].textContent = (" by " + src["author"]) if src.get("author") else ""
        self.remix_button.visible = not c.get("mine")
        self.edit_link.visible = bool(c.get("mine"))
        state.set_attr(self.edit_link, "href", router.href("studio", movie.get("id")))
        self.report_button.visible = not c.get("mine")
        window.document.title = (movie.get("name") or "Cartoon") + " · ToonyLoony"

    @handle("", "show")
    def form_show(self, **event_args):
        if self.data:
            self.player.load(tl.js_value(self.data["movie"]), tl.js_value(self.data.get("chars") or {}))

    @handle("copy_button", "click")
    def copy_button_click(self, **event_args):
        url = str(tl.TL.watchUrl(self.key))
        try:
            window.navigator.clipboard.writeText(url)
            state.toast("Link copied!", "ok")
        except Exception:
            state.toast(url)

    @handle("report_button", "click")
    def report_button_click(self, **event_args):
        from ...Dialogs.Report import Report
        alert(Report(key=self.key), buttons=[], role="app-dialog", dismissible=True)

    @handle("remix_button", "click")
    def remix_button_click(self, **event_args):
        self.remix_button.enabled = False
        self.remix_button.text = "Copying..."
        r = tl.attempt(lambda: tl.TL.remixMovie(tl.js_value(self.data), self.key))
        if r is None:
            self.remix_button.enabled = True
            self.remix_button.text = "🔁 Remix it"
            return
        res = tl.py_value(r) or {}
        try:
            state.call_quiet("remix_noted", self.key)
        except Exception:
            pass  # the count is a nice extra; the copy is already made
        d = res.get("dropped") or {}
        parts = [state.plural(int(d.get(k) or 0), word) for k, word in (("voices", "voice"), ("sounds", "uploaded sound"),
                                                                         ("pictures", "picture")) if d.get(k)]
        msg = "Your copy is ready! " + (("%s stayed with their maker." % " and ".join(parts)) if parts else "Make it your own ✨")
        state.toast(msg, "ok")
        router.go("studio", res.get("id"))
