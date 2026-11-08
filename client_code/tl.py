"""ToonyLoony's JavaScript engines (theme/assets/tl-*.js, window.TL) seen from Python.

The engines draw characters, scenes and movies, keep guests' toons in the browser (TL.store: IndexedDB for guests,
server calls for members), play audio and run the three editors. Python reaches them only through this module:

    tl.setup()              once at start-up: the server bridge (UI.api in the engines) and TL.host (the dialogs)
    tl.TL                   window.TL itself (TL.store.home(), TL.PRESETS ...): a JS promise returned to Python is
                            already awaited, so `tl.TL.store.chars()` gives the list
    tl.py_value(x)          a JS object/array as plain Python dicts/lists (for RepeatingPanel items)
    tl.js_value(x)          a Python dict/list as a real JS object (to hand to the engines)
    tl.FORMATS              the canvas shapes (Wide 16:9, Reel 9:16, Square 1:1, Portrait 4:5) as dicts
"""
import json

import anvil
import anvil.js
from anvil import alert, confirm
import anvil.server
from anvil.js import window

from . import router, state

TL = window.TL
UI = window.UI
NULL = anvil.js.call(window.Function("return null"))  # "no JS object yet", typed for the validator


def py_value(x):
    """JS -> plain Python (dicts, lists, str, numbers). None stays None."""
    if x is None:
        return None
    return json.loads(window.JSON.stringify(x))


def js_value(x):
    """Python -> a real JS object (not a proxy of a Python dict)."""
    return window.JSON.parse(json.dumps(x))


def formats():
    return py_value(TL.FORMATS)


# ---------------------------------------------------------------- server calls for the engines (UI.api, UI.upload)
def _bridge(kind, payload_json):
    """Called from JS. Always returns a JSON string: {"result": ...} or {"error": ...}."""
    p = json.loads(payload_json) if payload_json else {}
    try:
        if kind == "call":
            call = anvil.server.call_s if p.get("quiet") else anvil.server.call
            return json.dumps({"result": call(p["fn"], *(p.get("args") or []))})
        if kind == "upload":
            # UI.upload(fn, blob, ...): the browser File/Blob becomes Anvil Media (no JSON copy of the bytes)
            media = anvil.js.to_media(UI._file)
            return json.dumps({"result": anvil.server.call(p["fn"], media, *(p.get("args") or []))})
        return json.dumps({"error": "Unknown request: %s" % kind})
    except Exception as e:
        kind_of = type(e).__name__  # (some of Anvil's exception classes aren't in the validator's stubs)
        if kind_of == "SessionExpiredError":
            return json.dumps({"error": "Your session expired. Reload the page and sign in again.", "reload": True})
        if kind_of == "AppOfflineError":
            return json.dumps({"error": "You seem to be offline. Check your connection and try again."})
        if kind_of == "PermissionDenied":
            return json.dumps({"error": str(e) or "You don't have access to that.", "denied": True})
        print("bridge %s %s failed: %r" % (kind, p.get("fn", ""), e))
        return json.dumps({"error": "Something went wrong. Please try again.", "detail": repr(e)[:300]})


# ---------------------------------------------------------------- TL.host: what the engines ask Python to show
def _toast(message, kind=""):
    state.toast(message, kind or None)


def _confirm(options_json):
    o = json.loads(options_json or "{}")
    return bool(confirm(o.get("text") or "", title=o.get("title") or "Are you sure?",
                        buttons=[(o.get("cancel") or "Cancel", False), (o.get("ok") or "OK", True)], role="app-dialog"))


def ask_name(title, value="", ok="Save"):
    from .Dialogs.AskName import AskName
    return alert(AskName(title=title, value=value, ok=ok), buttons=[], role="app-dialog", dismissible=True)


def pick_starter():
    from .Dialogs.PickStarter import PickStarter
    return alert(PickStarter(), buttons=[], large=True, role="app-dialog", dismissible=True)


def new_movie():
    """The New movie dialog. Opens the studio with the saved movie; returns its id (or None)."""
    from .Dialogs.NewMovie import NewMovie
    movie_id = alert(NewMovie(), buttons=[], large=True, role="app-dialog", dismissible=True)
    if movie_id:
        router.go("studio", movie_id)
    return movie_id


def create_character():
    """Pick a body type, save the new character, open the builder (TL.createCharacter does the work)."""
    TL.createCharacter()


def voice(opts=None):
    from .Dialogs.Voice import Voice
    return alert(Voice(opts=opts), buttons=[], role="app-dialog", dismissible=False)


def share(movie_id, state_json=""):
    if not state.me():
        if confirm("Your movie lives on this device. A grown-up (16 or older) can make a free account to keep your "
                   "toons safe and get a link to share them.", title="Sharing needs an account",
                   buttons=[("Not now", False), ("Make an account", True)], role="app-dialog"):
            router.go("auth", "signup")
        return None
    from .Dialogs.Share import Share
    alert(Share(movie_id=movie_id, share_state=json.loads(state_json) if state_json else None),
          buttons=[], role="app-dialog", dismissible=True)
    return None


def export_video(movie, chars):
    from .Dialogs.Export import Export
    alert(Export(movie=movie, chars=chars), buttons=[], large=True, role="app-dialog", dismissible=False)
    return None


def _go(target_hash):
    router.show()


def setup():
    window.TL_BRIDGE = _bridge
    try:
        UI.apiOrigin = anvil.server.get_api_origin()  # ends in /_/api; media URLs add /media?k=KEY
    except Exception:
        UI.apiOrigin = window.location.origin + "/_/api"
    TL.host = js_value({})
    for name, fn in (("toast", _toast), ("confirm", _confirm), ("ask_name", ask_name), ("pick_starter", pick_starter),
                     ("new_movie", new_movie), ("voice", voice), ("share", share), ("export_video", export_video),
                     ("go", _go)):
        TL.host[name] = fn


def store_flag(key, value=None):
    """The little achievement flags the sticker book reads (same storage as the engines: TL.store_flag)."""
    if value is None:
        return bool(TL.store_flag(key))
    return bool(TL.store_flag(key, True))


def fmt_time(seconds):
    return str(TL.fmtTime(seconds or 0))


SHAPE_BADGES = {"reel": "📱 Reel", "square": "🟨 Square", "portrait": "🖼️ Portrait"}


def shape_badge(fmt):
    """'📱 Reel' for a movie in a tall or square shape, '' for the usual wide one."""
    return SHAPE_BADGES.get(fmt or "", "")


def poster(data, dur=None):
    """A JPEG data URL still of a movie (for cards without a thumbnail), or ''."""
    if not data:
        return ""
    try:
        t = min(3, (dur or 9) / 3)
        return str(TL.movieCanvas(js_value(data), js_value({}), t, 320, 180).toDataURL("image/jpeg", 0.72))
    except Exception as e:
        print("poster failed: %r" % e)
        return ""


def char_thumb(ch):
    """The picture of a character (a JS character object or a preset id)."""
    if isinstance(ch, str):
        ch = TL.PRESETS[ch]
    return str(TL.thumbOf(ch) or "")


def attempt(fn, default=None):
    """Run an engine call that may reject (a server {"ok": False}, a full device): show the message, return default."""
    try:
        return fn()
    except Exception as e:
        msg = str(getattr(e, "message", "") or e) or "That didn't work."
        state.toast(msg.replace("Error: ", ""), "error")
        return default
