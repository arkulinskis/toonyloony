from anvil import *

from ._anvil_designer import LibraryTemplate
from ... import state, tl

TABS = ["sound", "music", "voice", "bg"]
UPLOAD = {"sound": "Upload a sound", "music": "Upload music", "voice": "Upload a voice file", "bg": "Upload a picture"}


class Library(LibraryTemplate):
    """#library/<tab>: sounds, music, voices and pictures: the premade ones (made in the browser) and your own uploads
    and recordings. Listen, upload, record a voice, rename, delete. Guests' files stay on their device."""

    def __init__(self, args=(), **properties):
        super().__init__(**properties)
        self.tab = args[0] if args and args[0] in TABS else "sound"
        self.playing = None
        self.mine = list(tl.TL.store.assets())
        self.lead_label.text = "Everything you can drop into a movie. " + (
            "Your uploads are saved in your account." if state.me() else "Your uploads stay on this device.")
        tabs = {"sound": self.tab_sound, "music": self.tab_music, "voice": self.tab_voice, "bg": self.tab_bg}
        for k, el in tabs.items():
            el.classes["on"] = k == self.tab
            if k == self.tab:
                state.set_attr(el, "aria-current", "page")
        for panel in (self.mine_sounds, self.pre_sounds):
            panel.add_event_handler("x-play", self._play)
            panel.add_event_handler("x-rename", self._rename)
            panel.add_event_handler("x-delete", self._delete)
        self.mine_pics.add_event_handler("x-rename", self._rename)
        self.mine_pics.add_event_handler("x-delete", self._delete)
        if self.tab == "bg":
            self.pre_pics.items = [{"id": s["id"], "name": s["emoji"] + " " + s["name"], "src": str(tl.TL.bgPic(s["id"], 384, 216))}
                                   for s in tl.py_value(tl.TL.SCENES)]
        self.draw()

    def _own(self):
        return [a for a in self.mine if str(a.kind) == self.tab]

    def draw(self, focus=None):
        own, pics = self._own(), self.tab == "bg"
        self.record_button.visible = self.tab == "voice"
        self.upload_button.text = UPLOAD[self.tab]
        self.upload_button.role = ["btn", "ic-upload"] if self.tab == "voice" else ["btn", "btn-primary", "ic-upload"]
        self.mine_part.visible = bool(own)
        self.no_voices.visible = self.tab == "voice" and not own
        self.mine_sounds_box.visible = self.pre_sounds_box.visible = not pics
        self.mine_pics_box.visible = self.pre_pics_box.visible = pics
        if pics:
            self.mine_pics.items = [{"id": str(a.id), "name": str(a.name), "src": str(a.url), "own": True} for a in own]
            self.pre_title.text = "Premade places"
            self.pre_part.visible = True
        else:
            self.mine_sounds.items = [{"id": str(a.id), "name": str(a.name), "kind": str(a.kind), "dur": float(a.dur or 0),
                                       "own": True, "playing": self.playing == str(a.id)} for a in own]
            pre = []
            if self.tab == "sound":
                pre = tl.py_value(tl.TL.SOUNDS) or []
            elif self.tab == "music":
                pre = tl.py_value(tl.TL.MUSIC) or []
            self.pre_sounds.items = [{"id": x["id"], "name": x["name"], "emoji": x.get("emoji"), "dur": x.get("dur"),
                                      "kind": self.tab, "own": False, "playing": self.playing == x["id"]} for x in pre]
            self.pre_title.text = "Premade music" if self.tab == "music" else "Premade sounds"
            self.pre_part.visible = bool(pre)
        if focus:
            state.refocus(self, focus)

    def _play(self, item, **event_args):
        key = "play-" + item["id"]
        if self.playing == item["id"]:
            tl.TL.stopPreview()
            self.playing = None
        else:
            self.playing = item["id"]
            opts = tl.js_value({})
            opts.onend = self._ended
            tl.TL.preview(item["id"], opts)
        self.draw(key)

    def _ended(self, *args):
        if self.playing:
            self.playing = None
            self.draw()

    def _rename(self, item, **event_args):
        name = tl.ask_name("Rename", item.get("name") or "")
        if name:
            tl.attempt(lambda: tl.TL.store.renameAsset(item["id"], name))
            for a in self.mine:
                if str(a.id) == item["id"]:
                    a.name = name
            self.draw()

    def _delete(self, item, **event_args):
        if confirm("Movies that use it will go quiet (or plain) there.", title='Delete "%s"?' % item.get("name"),
                   buttons=[("Cancel", False), ("Delete", True)], role="app-dialog"):
            tl.attempt(lambda: tl.TL.store.delAsset(item["id"]))
            self.mine = [a for a in self.mine if str(a.id) != item["id"]]
            self.draw()

    @handle("upload_button", "click")
    def upload_button_click(self, **event_args):
        a = tl.attempt(lambda: tl.TL.upload(self.tab))
        if a is not None:
            self.mine.insert(0, a)
            self.draw()

    @handle("record_button", "click")
    def record_button_click(self, **event_args):
        r = tl.voice(None)
        if r:
            self.mine.insert(0, r["asset"])
            self.draw()

    @handle("", "hide")
    def form_hide(self, **event_args):
        tl.TL.stopPreview()
