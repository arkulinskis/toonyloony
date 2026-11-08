import json

from anvil import *

from ._anvil_designer import HomeTemplate
from ... import router, state, tl


class Home(HomeTemplate):
    """#home: "My toons", for guests and members. Big start buttons, your movies and cast, the sticker book, fresh
    cartoons from the Theater. Guests see that their toons live on this device; members who made toons as a guest on
    this device are offered to move them into their account (TL.importGuest)."""

    def __init__(self, args=(), **properties):
        super().__init__(**properties)
        self.movies_panel.add_event_handler("x-more", self._more)
        state.heading(self.hello_label, 1)
        self.load()

    def load(self):
        me = state.me()
        home = tl.TL.store.home()
        chars = tl.TL.store.chars()
        try:
            theater = state.call_quiet("theater_list") or {"featured": []}
        except Exception:
            theater = {"featured": []}
        left = 0
        if me:
            g = tl.TL.guestStuff()
            left = len(g.chars) + len(g.movies)
        movies = tl.py_value(home.movies) or []
        self.movies = movies
        first = (me.get("name") or "").split(" ")[0] if me else ""
        self.hello_label.text = ("Hey %s! 🎬" % first) if first else "Your cartoon studio 🎬"
        self.lead_label.text = ("Lights, camera... hold that character and make it move!" if movies else
                                "Build a character, teach it moves, then hold it and drag it around to film your cartoon.")
        self.import_banner.visible = left > 0
        self.import_label.text = "You made %s as a guest on this device. Move them into your account?" % state.plural(left, "toon")
        self.guest_banner.visible = not me
        self.new_movie_small.visible = bool(movies)
        self.movies_panel.items = movies
        cast = []
        for c in list(chars)[:5]:
            n = len(c.anims) if c.anims else 0
            cast.append({"id": str(c.id), "name": str(c.name), "thumb": tl.char_thumb(c), "sub": state.plural(n, "move")})
        self.cast_panel.items = cast
        earned = tl.py_value(tl.TL.earned(home)) or {}
        stickers = tl.py_value(tl.TL.STICKERS) or []
        self.stickers_panel.items = [{"emoji": s[1], "label": s[2], "on": s[0] in earned} for s in stickers]
        self.sticker_count.text = "%d of %d" % (len(earned), len(stickers))
        pct = round(len(earned) / max(1, len(stickers)) * 100)
        self.dom_nodes["quest_fill"].style.transform = "scaleX(%s)" % (pct / 100)
        self.dom_nodes["quest"].setAttribute("aria-label", "%d of %d stickers" % (len(earned), len(stickers)))
        featured = (theater.get("featured") or [])[:3]
        self.theater_part.visible = bool(featured)
        self.theater_panel.items = featured

    @handle("", "show")
    def form_show(self, **event_args):
        tl.TL.show.duo(self.dom_nodes["duo"])

    # ---- start buttons
    def _new_movie(self):
        tl.new_movie()

    @handle("new_movie_button", "click")
    def new_movie_button_click(self, **event_args):
        self._new_movie()

    @handle("new_movie_small", "click")
    def new_movie_small_click(self, **event_args):
        self._new_movie()

    def new_movie_click(self, event):
        self._new_movie()

    @handle("new_char_button", "click")
    def new_char_button_click(self, **event_args):
        tl.create_character()

    def new_char_click(self, event):
        tl.create_character()

    # ---- moving a guest's toons into the account
    @handle("import_button", "click")
    def import_button_click(self, **event_args):
        self.import_button.enabled = False
        self.import_button.text = "Moving..."
        n = tl.attempt(lambda: tl.TL.importGuest())
        if n is not None:
            state.toast("Moved %s into your account!" % state.plural(int(n), "thing"), "ok")
            tl.TL.confetti()
        self.load()

    # ---- a movie's menu
    def _more(self, item, **event_args):
        from ...Dialogs.MovieMenu import MovieMenu
        what = alert(MovieMenu(name=item.get("name") or ""), buttons=[], role="app-dialog", dismissible=True)
        movie_id = item["id"]
        if what == "open":
            router.go("studio", movie_id)
        elif what == "share":
            tl.share(movie_id, json.dumps({"shared": True, "share_key": item.get("share_key")}) if item.get("shared") else "")
            self.load()
        elif what == "rename":
            name = tl.ask_name("Rename movie", item.get("name") or "")
            if name:
                r = tl.TL.store.getMovie(movie_id)
                r.movie.name = name
                tl.attempt(lambda: tl.TL.store.saveMovie(r.movie))
                self.load()
        elif what == "copy":
            r = tl.TL.store.getMovie(movie_id)
            c = tl.TL.clone(r.movie)
            c.id = tl.TL.uid("m")
            c.name = (str(c.name) + " (copy)")[:60]
            tl.attempt(lambda: tl.TL.store.saveMovie(c))
            state.toast("Copied!", "ok")
            self.load()
        elif what == "delete":
            if confirm("The movie goes away for good. Your characters and sounds stay.", title='Delete "%s"?' % item.get("name"),
                       buttons=[("Cancel", False), ("Delete", True)], role="app-dialog"):
                tl.attempt(lambda: tl.TL.store.delMovie(movie_id))
                state.toast("Deleted")
                self.load()
