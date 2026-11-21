import json

from anvil import *
from anvil.js import window

from ._anvil_designer import HomeTemplate
from ... import router, state, tl


class Home(HomeTemplate):
    """#home: "My toons", for guests and members. Big start buttons, your movies and cast, the sticker book, fresh
    cartoons from the Theater. The "Keep your toons safe" card saves and opens .toony backup files (tl.backup /
    tl.open_backup); for guests it says how many movies live only in this browser and turns yellow when the last
    backup is over a week old. Members who made toons as a guest on this device are offered to move them into their
    account (TL.importGuest)."""

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
        self.counts = {"movies": len(movies), "chars": len(tl.py_value(home.chars) or [])}
        self._draw_safe()
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

    def _draw_safe(self):
        """The "Keep your toons safe" card: where the toons live, the last full backup, yellow when one is due."""
        me = state.me()
        n, nc = self.counts["movies"], self.counts["chars"]
        last = state.store_get("lastBackup", None)
        days = (window.Date.now() - window.Date.parse(last)) / 86400000 if last else None
        stale = not me and n > 0 and (days is None or days > 7)
        when = state.ago(last) if last else "never"
        if me:
            line = "Your toons are saved in your account · last backup: %s" % when
            note = "A backup file is an extra copy you can keep anywhere, or open in another account."
        else:
            if n:
                line = "%s %s only in this browser · last backup: %s" % (state.plural(n, "movie"), "lives" if n == 1 else "live", when)
            elif nc:
                line = "%s %s only in this browser · last backup: %s" % (state.plural(nc, "character"), "lives" if nc == 1 else "live", when)
            else:
                line = "Your toons will live only in this browser · last backup: %s" % when
            note = ("Browsers can wipe what they keep (Safari after a week away, school computers at log-out). "
                    "Save a backup file now and then, and open it on any computer to get everything back.")
        self.dom_nodes["safe_title"].textContent = "Time for a backup!" if stale else "Keep your toons safe"
        self.safe_label.text = line
        self.safe_note.text = note
        self.safe_card.classes["warn"] = stale
        self.safe_signup.visible = not me

    @handle("backup_button", "click")
    def backup_button_click(self, **event_args):
        self.backup_button.enabled = False
        self.backup_button.text = "Saving..."
        try:
            tl.backup()
        finally:
            self.backup_button.enabled = True
            self.backup_button.text = "Save a backup"
        self._draw_safe()

    @handle("open_button", "click")
    def open_button_click(self, **event_args):
        if tl.open_backup():
            self.load()

    @handle("idea_button", "click")
    def idea_button_click(self, **event_args):
        tl.idea_machine()

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
        elif what == "file":
            tl.backup(movie_id)
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
