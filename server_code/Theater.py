"""The Theater: shared cartoons. A member's "Share" makes a watch link (#watch/KEY) that works for anyone who
has it; only movies an admin features are listed in the Theater. Anyone can report a movie (it lands in the
admin's feedback inbox); admins feature, un-feature or un-share movies in Admin -> Toons."""
import anvil.server
from anvil.tables import app_tables
import anvil.tables as tables

from . import common as C
from . import DemoData, Toons


def _card(r, me=None, with_data=False):
    d = r["data"] or {}
    out = {"key": r["share_key"], "name": r["name"], "author": C.name_of(r["owner"]), "thumb": r["thumb"],
           "dur": r["dur"] or 0, "views": r["views"] or 0, "featured": bool(r["featured"]),
           "mine": me is not None and r["owner"] == me, "demo": bool(r["is_demo"]),
           "bg": d.get("bg") if isinstance(d.get("bg"), str) else None}
    if with_data and not r["thumb"]:
        out["data"] = d  # no picture yet (demo toons): the page draws a poster from the movie itself
    return out


@anvil.server.callable
def theater_list():
    DemoData.ensure_loaded()
    me = C.me()
    rows = app_tables.movies.search(tables.order_by("updated", ascending=False), featured=True, shared=True)
    featured = [_card(r, me, with_data=True) for r in rows[:40]]
    mine = []
    if me is not None:
        mine = [_card(r, me, with_data=True) for r in app_tables.movies.search(tables.order_by("updated", ascending=False), owner=me, shared=True)]
    return {"featured": featured, "mine": mine}


def _key_ok(key):
    return isinstance(key, str) and 4 <= len(key) <= 40 and key.replace("-", "").isalnum()


@anvil.server.callable
def watch_get(key):
    """Everything a viewer needs to play a shared movie: the movie, the characters it uses, its uploaded files."""
    if not _key_ok(key):
        return C.fail("This cartoon link isn't right. Check it and try again.")
    r = app_tables.movies.get(share_key=key)
    if r is None or not r["shared"]:
        return C.fail("This cartoon isn't shared any more.")
    me, owner, data = C.me(), r["owner"], r["data"] or {}
    chars, assets = {}, {}
    for a in data.get("actors") or []:
        ref = a.get("char") if isinstance(a, dict) else None
        if Toons.uid_ok(ref) and ref not in chars:
            c = app_tables.characters.get(owner=owner, uid=ref)
            if c is not None:
                chars[ref] = dict(c["data"] or {}, id=c["uid"], name=c["name"])
    refs = [data.get("bg")] + [c.get("asset") for c in (data.get("clips") or []) if isinstance(c, dict)]
    for ref in refs:
        if Toons.uid_ok(ref) and ref not in assets:
            x = app_tables.assets.get(owner=owner, uid=ref)
            if x is not None:
                assets[ref] = {"id": ref, "kind": x["kind"], "name": x["name"], "key": x["key"], "dur": x["dur"] or 0}
    viewed = anvil.server.session.get("viewed") or []
    if key not in viewed and not (me is not None and owner == me):
        r["views"] = (r["views"] or 0) + 1
        anvil.server.session["viewed"] = (viewed + [key])[-200:]
    return C.ok(movie=dict(data, id=r["uid"], name=r["name"]), chars=chars, assets=assets,
                card=_card(r, me), is_admin=C.is_admin(me))


@anvil.server.callable
def report_toon(key, reason):
    if not _key_ok(key):
        return C.fail("That cartoon wasn't found.")
    reason = C.text(reason, 1000, multiline=True)
    if len(reason) < 3:
        return C.fail("Tell us a little about what's wrong.")
    if C.rate_limited("report", 5, 3600):
        return C.fail("Thanks! You've sent several reports this hour. Please try again later.")
    r = app_tables.movies.get(share_key=key)
    if r is None:
        return C.fail("That cartoon wasn't found.")
    me = C.me()
    app_tables.feedback.add_row(user=me, name=C.name_of(me) if me else "Guest", email=(me["email"] if me else None),
                                kind="other", message="Report about the cartoon \"%s\": %s" % (r["name"], reason),
                                context={"page": "#watch/" + key}, status="new", note="", created=C.now())
    return C.ok()


# ------------------------------------------------------------------------------------------------- admin
def _admin_row(r):
    return {"key": r["share_key"], "name": r["name"], "author": C.name_of(r["owner"]),
            "email": r["owner"]["email"] if r["owner"] is not None and not r["is_demo"] else "",
            "featured": bool(r["featured"]), "views": r["views"] or 0, "dur": r["dur"] or 0,
            "thumb": r["thumb"], "updated": C.iso(r["updated"]), "demo": bool(r["is_demo"])}


@anvil.server.callable(require_user=True)
def admin_toons():
    C.require_admin()
    rows = app_tables.movies.search(tables.order_by("updated", ascending=False), shared=True)
    return {"toons": [_admin_row(r) for r in rows[:300]]}


@anvil.server.callable(require_user=True)
def admin_feature(key, flag):
    C.require_admin()
    r = app_tables.movies.get(share_key=key) if _key_ok(key) else None
    if r is None or not r["shared"]:
        return C.fail("That cartoon isn't shared.")
    r["featured"] = bool(flag)
    return C.ok(toon=_admin_row(r))


@anvil.server.callable(require_user=True)
def admin_unshare(key):
    C.require_admin()
    r = app_tables.movies.get(share_key=key) if _key_ok(key) else None
    if r is None:
        return C.fail("That cartoon wasn't found.")
    r.update(shared=False, featured=False)
    return C.ok()
