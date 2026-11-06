from anvil import *
from anvil.js import window

from ._anvil_designer import VoiceTemplate
from ... import state, tl


def _get(obj, name, default=None):
    """A field of a JS object that may be missing (reading a missing one raises in Python)."""
    try:
        v = getattr(obj, name)
    except AttributeError:
        return default
    return default if v is None else v


class Voice(VoiceTemplate):
    """Record a voice line (TL.mountVoice draws the recorder: REC, level meter, effects, Listen). opts = the studio's
    {actors, actor, onStart, onStop} (the movie plays while you talk) or None in the Library.
    Closes with {asset, actor, rate, fx} or None."""

    def __init__(self, opts=None, **properties):
        super().__init__(**properties)
        self.opts = opts if opts is not None else tl.js_value({})
        self.ctl = tl.NULL
        state.heading(self.title_label, 2)
        plays = _get(self.opts, "onStart") is not None
        self.lead_label.text = "Press the red button, say your line, press it again." + (
            " The movie plays (without sound) while you talk, so you can match the action." if plays else "")
        actors = tl.py_value(_get(self.opts, "actors", tl.js_value([]))) or []
        self.actor_field.visible = bool(actors)
        self.actor_drop.items = [("Nobody (a narrator)", "")] + [(a["name"], a["id"]) for a in actors]
        self.actor_drop.selected_value = str(_get(self.opts, "actor", "") or "") if actors else ""
        state.set_control_attr(self.name_box, "maxlength", 60)
        self.name_field.visible = False
        self.use_button.enabled = False

    @handle("", "show")
    def form_show(self, **event_args):
        o = tl.js_value({})
        o.onReady = self._ready
        start, stop = _get(self.opts, "onStart"), _get(self.opts, "onStop")
        if start is not None:
            o.onStart = start
        if stop is not None:
            o.onStop = stop
        self.ctl = tl.TL.mountVoice(self.dom_nodes["recorder"], o)

    def _ready(self, ok):
        self.use_button.enabled = bool(ok)
        self.name_field.visible = bool(ok)

    @handle("use_button", "click")
    def use_button_click(self, **event_args):
        res, fx = self.ctl.result(), self.ctl.fx()
        if res is None:
            return
        who = self.actor_drop.selected_value or ""
        name = (self.name_box.text or "").strip()
        if not name:
            label = [n for n, v in self.actor_drop.items if v == who and v]
            stamp = window.Date().toLocaleTimeString([], tl.js_value({"hour": "2-digit", "minute": "2-digit"}))
            name = "%s %s" % ((label[0] + " says") if label else "Voice", stamp)
        self.use_button.enabled = False
        meta = tl.js_value({"kind": "voice", "name": name[:60], "dur": round(float(res.dur) * 100) / 100})
        asset = tl.TL.store.addAsset(res.blob, meta)
        tl.store_flag("voice", True)
        self.ctl = tl.NULL
        self.raise_event("x-close-alert", value={"asset": asset, "actor": who or None, "rate": fx[3], "fx": fx[4] or ""})

    @handle("cancel_button", "click")
    def cancel_button_click(self, **event_args):
        if self.ctl is not None:
            self.ctl.cancel()
        self.raise_event("x-close-alert", value=None)
