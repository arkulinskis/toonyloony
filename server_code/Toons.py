"""Characters and movies for signed-in members (guests keep theirs in the browser, see web/pages/_tl_core.html).

Documents are made in the browser: it picks the id (uid, e.g. "c_k3j9x0abq2") so a guest's toons keep their ids
when they move into an account. The server checks ownership, sizes and limits, and stores the JSON as it is
(the pages draw it on a canvas and escape every name, so stored text never becomes HTML).
"""
import json
import re

import anvil.server
from anvil.tables import app_tables
import anvil.tables as tables

from . import common as C
from . import DemoData

UID = re.compile(r"^[a-z]_[a-z0-9]{6,32}$")
THUMB = re.compile(r"^data:image/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$")
MAX_CHARS, MAX_MOVIES = 80, 80
MAX_CHAR_BYTES, MAX_MOVIE_BYTES = 400000, 1500000
MAX_DUR = 180


def uid_ok(v):
    return v if isinstance(v, str) and UID.match(v) else None


def thumb_ok(v):
    if isinstance(v, str) and len(v) < 160000 and THUMB.match(v):
        return v
    return None


def size_of(doc):
    try:
        return len(json.dumps(doc))
    except (TypeError, ValueError):
        return None


def char_summary(r):
    d = r["data"] or {}
    return {"id": r["uid"], "name": r["name"], "thumb": r["thumb"], "anims": len(d.get("anims") or []),
            "starter": d.get("starter") or "", "custom": bool(d.get("custom")), "updated": C.iso(r["updated"])}


def movie_summary(r):
    d = r["data"] or {}
    return {"id": r["uid"], "name": r["name"], "thumb": r["thumb"], "dur": r["dur"] or 0,
            "actors": len(d.get("actors") or []), "clips": len(d.get("clips") or []),
            "takes": sum(len(a.get("takes") or []) for a in (d.get("actors") or []) if isinstance(a, dict)),
            "shared": bool(r["shared"]), "share_key": r["share_key"] if r["shared"] else None,
            "featured": bool(r["featured"]), "views": r["views"] or 0, "updated": C.iso(r["updated"])}


def _mine(table, me, uid):
    uid = uid_ok(uid)
    return table.get(owner=me, uid=uid) if uid else None


@anvil.server.callable(require_user=True)
def toons_home():
    """The member's cast and movies, newest first (one call for the home page)."""
    DemoData.ensure_loaded()
    me = C.require_user()
    chars = app_tables.characters.search(tables.order_by("updated", ascending=False), owner=me)
    movies = app_tables.movies.search(tables.order_by("updated", ascending=False), owner=me)
    return {"chars": [char_summary(r) for r in chars], "movies": [movie_summary(r) for r in movies]}


@anvil.server.callable(require_user=True)
def chars_full():
    """Every character of the member, whole (the studio needs their rigs and animations)."""
    me = C.require_user()
    rows = app_tables.characters.search(tables.order_by("updated", ascending=False), owner=me)
    return {"chars": [dict(r["data"] or {}, id=r["uid"], name=r["name"], thumb=r["thumb"]) for r in rows]}


@anvil.server.callable(require_user=True)
def char_get(uid):
    me = C.require_user()
    r = _mine(app_tables.characters, me, uid)
    if r is None:
        return C.fail("That character isn't in your cast.")
    return C.ok(char=dict(r["data"] or {}, id=r["uid"], name=r["name"], thumb=r["thumb"]))


def _save(table, me, doc, max_bytes, max_count, what):
    if not isinstance(doc, dict):
        return None, C.fail("That %s looks broken. Try again." % what)
    uid = uid_ok(doc.get("id"))
    if not uid:
        return None, C.fail("That %s has no proper id." % what)
    name = C.text(doc.get("name"), 60) or ("My " + what)
    thumb = thumb_ok(doc.get("thumb"))
    data = {k: v for k, v in doc.items() if k not in ("id", "name", "thumb")}
    size = size_of(data)
    if size is None:
        return None, C.fail("That %s couldn't be saved." % what)
    if size > max_bytes:
        return None, C.fail("This %s is too big to save (%d KB). Make it a little shorter." % (what, size // 1000))
    row = table.get(owner=me, uid=uid)
    if row is None:
        if len(table.search(owner=me)) >= max_count:
            return None, C.fail("You have %d %ss already, the most you can keep. Delete one first." % (max_count, what))
        if C.rate_limited("save_new_" + what, 60, 3600):
            return None, C.fail("That's a lot of new %ss this hour. Take a break and try again later." % what)
        row = table.add_row(owner=me, uid=uid, created=C.now(), is_demo=False)
    row.update(name=name, data=data, updated=C.now(), **({"thumb": thumb} if thumb or "thumb" in doc else {}))
    return row, None


@anvil.server.callable(require_user=True)
def char_save(doc):
    me = C.require_user()
    row, err = _save(app_tables.characters, me, doc, MAX_CHAR_BYTES, MAX_CHARS, "character")
    if err:
        return err
    return C.ok(id=row["uid"], updated=C.iso(row["updated"]))


@anvil.server.callable(require_user=True)
def char_delete(uid):
    me = C.require_user()
    r = _mine(app_tables.characters, me, uid)
    if r is not None:
        r.delete()
    return C.ok()


@anvil.server.callable(require_user=True)
def movie_get(uid):
    me = C.require_user()
    r = _mine(app_tables.movies, me, uid)
    if r is None:
        return C.fail("That movie isn't one of yours.")
    return C.ok(movie=dict(r["data"] or {}, id=r["uid"], name=r["name"], thumb=r["thumb"]),
                shared=bool(r["shared"]), share_key=r["share_key"] if r["shared"] else None)


@anvil.server.callable(require_user=True)
def movie_save(doc):
    me = C.require_user()
    row, err = _save(app_tables.movies, me, doc, MAX_MOVIE_BYTES, MAX_MOVIES, "movie")
    if err:
        return err
    try:
        dur = max(0.0, min(float((row["data"] or {}).get("dur") or 0), MAX_DUR))
    except (TypeError, ValueError):
        dur = 0.0
    row["dur"] = round(dur, 1)
    return C.ok(id=row["uid"], updated=C.iso(row["updated"]))


@anvil.server.callable(require_user=True)
def movie_delete(uid):
    me = C.require_user()
    r = _mine(app_tables.movies, me, uid)
    if r is not None:
        r.delete()
    return C.ok()


@anvil.server.callable(require_user=True)
def movie_share(uid, flag):
    """Turn a movie's watch link on or off. The link works for anyone who has it; it isn't listed anywhere
    unless an admin features it in the Theater."""
    me = C.require_user()
    r = _mine(app_tables.movies, me, uid)
    if r is None:
        return C.fail("Save the movie first, then share it.")
    if flag:
        if not r["share_key"]:
            r["share_key"] = C.token(10)
        r["shared"] = True
    else:
        r.update(shared=False, featured=False)
    return C.ok(shared=bool(r["shared"]), share_key=r["share_key"] if r["shared"] else None)
