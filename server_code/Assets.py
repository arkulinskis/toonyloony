"""Members' uploads: backgrounds (pictures), voices, sounds and music.

The browser shrinks pictures before upload and records voices with the microphone (only when you press record).
Files are served by the /media endpoint (at <app>/_/api/media?k=KEY) under a random key: the page builds the
address from the key, and only the owner (or viewers of a movie the owner shared) ever learn it.
"""
import anvil.server
from anvil.tables import app_tables
import anvil.tables as tables

from . import common as C
from . import Toons

KINDS = {"bg": "image/", "voice": "audio/", "sound": "audio/", "music": "audio/"}
MAX_FILE = 8 * 1000 * 1000        # one file
MAX_TOTAL = 80 * 1000 * 1000      # everything a member uploads
MAX_COUNT = 150


def summary(r):
    return {"id": r["uid"], "kind": r["kind"], "name": r["name"], "key": r["key"], "mime": r["mime"],
            "size": r["size"] or 0, "dur": r["dur"] or 0, "created": C.iso(r["created"])}


@anvil.server.callable(require_user=True)
def asset_list():
    me = C.require_user()
    rows = app_tables.assets.search(tables.order_by("created", ascending=False), owner=me)
    out = [summary(r) for r in rows]
    return {"assets": out, "used": sum(a["size"] for a in out), "max": MAX_TOTAL}


@anvil.server.callable(require_user=True)
def asset_upload(media, meta):
    """media: the file (Anvil Media). meta: {id, kind, name, dur}."""
    me = C.require_user()
    meta = meta if isinstance(meta, dict) else {}
    uid, kind = Toons.uid_ok(meta.get("id")), meta.get("kind")
    if not uid or kind not in KINDS:
        return C.fail("That file couldn't be added.")
    mime = (getattr(media, "content_type", "") or "").split(";")[0].strip().lower()
    want = KINDS[kind]
    # A recorded voice is audio/webm or audio/mp4; Chrome sometimes labels audio-only WebM as video/webm.
    if not (mime.startswith(want) or (want == "audio/" and mime in ("video/webm", "video/mp4", "application/ogg"))):
        return C.fail("That isn't a picture." if kind == "bg" else "That isn't a sound file (try MP3, WAV, OGG or M4A).")
    size = getattr(media, "length", None) or len(media.get_bytes() or b"")
    if size <= 0:
        return C.fail("That file is empty.")
    if size > MAX_FILE:
        return C.fail("That file is too big (the limit is 8 MB). Try a shorter sound or a smaller picture.")
    rows = app_tables.assets.search(owner=me)
    if app_tables.assets.get(owner=me, uid=uid) is not None:
        return C.fail("That file is already uploaded.")
    if len(rows) >= MAX_COUNT:
        return C.fail("You have %d files already, the most you can keep. Delete some first." % MAX_COUNT)
    if sum(r["size"] or 0 for r in rows) + size > MAX_TOTAL:
        return C.fail("Your library is full (80 MB). Delete some files first.")
    if C.rate_limited("upload", 60, 3600):
        return C.fail("That's a lot of uploads this hour. Please try again later.")
    try:
        dur = max(0.0, min(float(meta.get("dur") or 0), 600.0))
    except (TypeError, ValueError):
        dur = 0.0
    name = C.text(meta.get("name"), 60) or {"bg": "My background", "voice": "My voice", "sound": "My sound", "music": "My music"}[kind]
    r = app_tables.assets.add_row(owner=me, uid=uid, kind=kind, name=name, file=media, key=C.token(18), mime=mime,
                                  size=size, dur=round(dur, 2), created=C.now(), is_demo=False)
    return C.ok(asset=summary(r))


@anvil.server.callable(require_user=True)
def asset_rename(uid, name):
    me = C.require_user()
    r = Toons._mine(app_tables.assets, me, uid)
    if r is None:
        return C.fail("That file isn't in your library.")
    name = C.text(name, 60)
    if len(name) < 1:
        return C.fail("Give it a name.")
    r["name"] = name
    return C.ok(asset=summary(r))


@anvil.server.callable(require_user=True)
def asset_delete(uid):
    me = C.require_user()
    r = Toons._mine(app_tables.assets, me, uid)
    if r is not None:
        r.delete()
    return C.ok()


@anvil.server.http_endpoint("/media")
def media(k=None, **kw):
    r = app_tables.assets.get(key=k) if isinstance(k, str) and 10 <= len(k) <= 40 else None
    if r is None or r["file"] is None:
        return anvil.server.HttpResponse(404, "Not found")
    return anvil.server.HttpResponse(200, r["file"], headers={"Cache-Control": "public, max-age=31536000, immutable",
                                                               "Content-Type": r["mime"] or "application/octet-stream"})
