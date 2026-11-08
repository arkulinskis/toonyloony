"""Server tests against the strict mock of Anvil (tools/testing/mock).

    python tools/testing/test_server.py          -> prints ALL OK, or the first failure

call(name, ...) runs a server function the way the browser does: by name, with require_user enforced,
and the reply must be JSON (a datetime or a row in a reply fails here, like it would break the page).
Add tests for every new server function: the happy path, bad input, and someone who isn't allowed.
"""
import datetime as dt
import importlib
import json
import os
import pathlib
import shutil
import sys
import tempfile

HERE = pathlib.Path(__file__).resolve().parent
PROJECT = HERE.parents[1]
_tmp = pathlib.Path(tempfile.mkdtemp())
shutil.copytree(PROJECT / "server_code", _tmp / "app")
(_tmp / "app" / "__init__.py").write_text("")
os.environ["ANVIL_APP_YAML"] = str(PROJECT / "anvil.yaml")  # the mock's tables follow the app's own schema
sys.path[:0] = [str(HERE / "mock"), str(_tmp)]
import anvil.server  # noqa: E402
import anvil.users  # noqa: E402
from anvil.tables import app_tables as T  # noqa: E402

M = {p.stem: importlib.import_module("app." + p.stem) for p in sorted((PROJECT / "server_code").glob("*.py"))}
now = dt.datetime.now(dt.timezone.utc)


def call(name, *args):
    r = anvil.server.call(name, *args)
    json.dumps(r)  # strict: must be JSON-able
    return r


def as_user(row):
    anvil.users.CURRENT[0] = row
    anvil.server.session.use(row.get_id() if row is not None else None)


def denied(name, *args):
    try:
        call(name, *args)
    except anvil.server.PermissionDenied:
        return True
    return False


def ok(r, msg=""):
    assert isinstance(r, dict) and r.get("ok"), (msg, r)
    return r


def bad(r, msg=""):
    assert isinstance(r, dict) and r.get("ok") is False and r.get("error"), (msg, r)
    return r


def person(email, name=None, **kw):
    return T.users.add_row(email=email, enabled=True, signed_up=now, display_name=name, **kw)


# ---------------------------------------------------------------------------------- accounts
admin = person("arkulinskis@gmail.com", "The Admin")
ana = person("ana@example.com", "Ana")
bob = person("bob@example.com")

as_user(None)
assert call("get_me") is None
assert denied("update_profile", "X")
as_user(admin)
assert call("get_me")["is_admin"] is True, "ADMIN_EMAILS become admins on first sign-in"
as_user(ana)
me = call("get_me")
assert me["name"] == "Ana" and me["is_admin"] is False
assert ana["last_seen"] is not None
as_user(bob)
assert call("get_me")["name"] == "Bob", "a name comes from the email when none is set"
bad(call("update_profile", " x "))
assert ok(call("update_profile", "  Bob   Stone "))["me"]["name"] == "Bob Stone"

# ---------------------------------------------------------------------------------- feedback
as_user(None)
bad(call("submit_feedback", "bug", "hi"))
ok(call("submit_feedback", "bug", "The button is broken", "guest@example.com", {"page": "#home", "evil": "x" * 9999}))
fb = T.feedback.search()[0]
assert fb["name"] == "Guest" and fb["email"] == "guest@example.com" and "evil" not in fb["context"] and fb["status"] == "new"
for i in range(4):
    ok(call("submit_feedback", "idea", "Idea number %d" % i))
bad(call("submit_feedback", "idea", "One too many this hour"), "rate limit")
as_user(ana)
ok(call("submit_feedback", "nonsense-kind", "Signed-in feedback"))
assert T.feedback.get(message="Signed-in feedback")["kind"] == "other"
assert denied("list_feedback")
as_user(admin)
lst = call("list_feedback")
assert lst["counts"]["new"] == 6 and len(lst["items"]) == 6
fid = lst["items"][0]["id"]
ok(call("set_feedback_status", fid, "done", "Fixed it"))
assert call("list_feedback", "done")["items"][0]["note"] == "Fixed it"
bad(call("set_feedback_status", fid, "weird"))
bad(call("set_feedback_status", "nope", "done"))
ok(call("delete_feedback", fid))
assert len(call("list_feedback")["items"]) == 5

# ---------------------------------------------------------------------------------- admin
as_user(ana)
for fn, args in [("admin_overview", ()), ("list_users", ()), ("set_admin", (bob.get_id(), True)), ("demo_load", ()), ("demo_remove", ())]:
    assert denied(fn, *args), fn
as_user(admin)
ov = call("admin_overview")
assert ov["users"] == 3 and ov["admins"] == 1 and ov["feedback_new"] == 5 and ov["movies"] == 0
assert len(call("list_users")["users"]) == 3 and len(call("list_users", "bob")["users"]) == 1
ok(call("set_admin", bob.get_id(), True))
assert bob["is_admin"] is True
bad(call("set_admin", admin.get_id(), False), "can't remove your own admin")
ok(call("set_enabled", bob.get_id(), False))
assert bob["enabled"] is False
bad(call("set_enabled", admin.get_id(), False))
ok(call("set_enabled", bob.get_id(), True))
ok(call("set_admin", bob.get_id(), False))
assert bob["is_admin"] is False

# ---------------------------------------------------------------------------------- demo data: featured cartoons
as_user(None)
th = call("theater_list")
assert M["DemoData"].state() == "loaded", "demo loads on first visit"
assert len(th["featured"]) == len(M["DemoData"].DEMO_MOVIES) and th["mine"] == []
assert all(c["data"] and c["data"]["actors"] for c in th["featured"]), "demo toons have no picture: the page draws a poster from the data"
assert all(a["char"].startswith("p_") for c in th["featured"] for a in c["data"]["actors"]), "demo toons use the premade cast"
for c in th["featured"]:
    for a in c["data"]["actors"]:
        for k in a["takes"]:
            assert k["t0"] < k["t1"] and len(k["pts"]) >= 2 and all(len(q) == 4 for q in k["pts"]), "takes are well formed"
w = ok(call("watch_get", "demo-race"))
assert w["movie"]["name"] == "The Great Park Race" and w["chars"] == {} and w["assets"] == {} and w["card"]["author"] == "Maya Chen"
views = w["card"]["views"]
assert call("watch_get", "demo-race")["card"]["views"] == views, "a second look in the same session doesn't count twice"
bad(call("watch_get", "nope-nope"))
bad(call("watch_get", "<script>"))
bad(call("watch_get", None))

# ---------------------------------------------------------------------------------- characters
def char(uid, name="Blox", **extra):
    d = {"id": uid, "name": name, "v": 1, "rig": "biped", "starter": "hero", "look": {"head": "blocky"},
         "bones": [{"id": "root", "p": None, "len": 0, "ang": 0}], "anims": [{"id": "walk", "name": "Walk", "len": 12, "keys": []}],
         "thumb": "data:image/png;base64,iVBORw0KGgo="}
    d.update(extra)
    return d


as_user(None)
for fn, args in [("toons_home", ()), ("chars_full", ()), ("char_get", ("c_abcdefgh",)), ("char_save", (char("c_abcdefgh"),)), ("char_delete", ("c_abcdefgh",)),
                 ("movie_get", ("m_abcdefgh",)), ("movie_save", ({"id": "m_abcdefgh"},)), ("movie_delete", ("m_abcdefgh",)), ("movie_share", ("m_abcdefgh", True)),
                 ("asset_list", ()), ("asset_rename", ("a_abcdefgh", "x")), ("asset_delete", ("a_abcdefgh",))]:
    assert denied(fn, *args), "guests can't call " + fn
as_user(ana)
home = call("toons_home")
assert home == {"chars": [], "movies": []}
ok(call("char_save", char("c_ana00001", "Blox", custom=True)))
ok(call("char_save", char("c_ana00002", "  Pixel   the   Pal  ")))
home = call("toons_home")
assert sorted(c["name"] for c in home["chars"]) == ["Blox", "Pixel the Pal"], "names cleaned"
hb = [c for c in home["chars"] if c["id"] == "c_ana00001"][0]
assert hb["custom"] is True and hb["anims"] == 1 and hb["thumb"].startswith("data:image/png")
got = ok(call("char_get", "c_ana00001"))["char"]
assert got["id"] == "c_ana00001" and got["rig"] == "biped" and got["anims"][0]["id"] == "walk"
ok(call("char_save", char("c_ana00001", "Blox 2", thumb="javascript:alert(1)")))
assert T.characters.get(uid="c_ana00001")["thumb"] is None, "only image data URLs are kept as thumbnails"
assert len(call("chars_full")["chars"]) == 2
bad(call("char_save", "not a dict"))
bad(call("char_save", char("BAD ID")))
bad(call("char_save", char("c_ana00003", bones="x" * 500000)), "too big")
bad(call("char_get", "c_nothere1"))
as_user(bob)
bad(call("char_get", "c_ana00001"), "can't open someone else's character")
assert call("chars_full")["chars"] == []
ok(call("char_delete", "c_ana00001"))
assert T.characters.get(uid="c_ana00001") is not None, "deleting someone else's character does nothing"
as_user(ana)
ok(call("char_delete", "c_ana00002"))
assert len(call("chars_full")["chars"]) == 1

# ---------------------------------------------------------------------------------- movies, sharing
mv = {"id": "m_ana00001", "name": "Ana's Toon", "v": 1, "dur": 12, "bg": "a_ana00001",
      "actors": [{"id": "x_1", "char": "c_ana00001", "takes": [{"id": "k1", "t0": 0, "t1": 2, "anim": "walk", "speed": 1, "pts": [[0, 1, 2, 1], [2, 3, 4, 1]]}]},
                 {"id": "x_2", "char": "p_blox", "takes": []}],
      "clips": [{"id": "q1", "asset": "a_ana00002", "kind": "voice", "t": 1}, {"id": "q2", "asset": "b:s_boing", "kind": "sound", "t": 2}], "bubbles": []}
ok(call("movie_save", mv))
r = ok(call("movie_get", "m_ana00001"))
assert r["movie"]["name"] == "Ana's Toon" and r["shared"] is False and r["share_key"] is None
h = call("toons_home")["movies"][0]
assert h["actors"] == 2 and h["clips"] == 2 and h["takes"] == 1 and h["dur"] == 12
assert h["format"] == "wide", "movies without a shape are Wide"
# canvas shapes (Reel 9:16, Square 1:1, Portrait 4:5) travel in the movie data; summaries say which
ok(call("movie_save", dict(mv, id="m_ana00009", name="Ana's Reel", format="reel", fx=500)))
reel = [m for m in call("toons_home")["movies"] if m["id"] == "m_ana00009"][0]
assert reel["format"] == "reel" and ok(call("movie_get", "m_ana00009"))["movie"]["fx"] == 500
ok(call("movie_save", dict(mv, id="m_ana00009", format="<script>")))
assert [m for m in call("toons_home")["movies"] if m["id"] == "m_ana00009"][0]["format"] == "wide", "an unknown shape reads as Wide"
ok(call("movie_delete", "m_ana00009"))
bad(call("movie_save", dict(mv, id="nope")))
bad(call("movie_save", dict(mv, id="m_ana00002", actors=[{"x": "y" * 1600000}])), "too big")
ok(call("movie_save", dict(mv, dur=9999)))
assert T.movies.get(uid="m_ana00001")["dur"] == 180, "length is capped"
as_user(bob)
bad(call("movie_get", "m_ana00001"))
bad(call("movie_share", "m_ana00001", True), "can't share someone else's movie")
as_user(ana)
s1 = ok(call("movie_share", "m_ana00001", True))
assert s1["shared"] and s1["share_key"]
key = s1["share_key"]
assert ok(call("movie_share", "m_ana00001", True))["share_key"] == key, "sharing again keeps the same link"
assert call("theater_list")["mine"][0]["key"] == key and all(c["key"] != key for c in call("theater_list")["featured"]), "shared isn't featured"

# ---------------------------------------------------------------------------------- uploads + the media endpoint
import anvil  # noqa: E402
png = anvil.BlobMedia("image/png", b"\x89PNG fake picture", name="bg.png")
wav = anvil.BlobMedia("audio/webm;codecs=opus", b"RIFF fake voice", name="voice.webm")
a1 = ok(call("asset_upload", png, {"id": "a_ana00001", "kind": "bg", "name": "My room", "dur": 0}))["asset"]
a2 = ok(call("asset_upload", wav, {"id": "a_ana00002", "kind": "voice", "name": "Hello", "dur": 2.5}))["asset"]
assert a1["kind"] == "bg" and a2["mime"] == "audio/webm" and a2["dur"] == 2.5 and len(a1["key"]) >= 18
bad(call("asset_upload", png, {"id": "a_ana00001", "kind": "bg"}), "same id twice")
bad(call("asset_upload", wav, {"id": "a_ana00003", "kind": "bg"}), "a sound isn't a picture")
bad(call("asset_upload", png, {"id": "a_ana00004", "kind": "music"}), "a picture isn't music")
bad(call("asset_upload", png, {"id": "a_ana00005", "kind": "nonsense"}))
bad(call("asset_upload", anvil.BlobMedia("image/png", b"x" * 8000001), {"id": "a_ana00006", "kind": "bg"}), "too big")
bad(call("asset_upload", anvil.BlobMedia("image/png", b""), {"id": "a_ana00007", "kind": "bg"}), "empty")
lst = call("asset_list")
assert len(lst["assets"]) == 2 and lst["used"] > 0
ok(call("asset_rename", "a_ana00001", "  Bedroom "))
assert call("asset_list")["assets"][1]["name"] == "Bedroom" or call("asset_list")["assets"][0]["name"] == "Bedroom"
bad(call("asset_rename", "a_ana00001", " "))
ep = anvil.server.ENDPOINTS["/media"]
resp = ep(k=a1["key"])
assert resp.status == 200 and resp.body.get_bytes().startswith(b"\x89PNG") and "max-age" in resp.headers["Cache-Control"]
assert ep(k="nope").status == 404 and ep(k=None).status == 404
as_user(bob)
bad(call("asset_rename", "a_ana00001", "mine now"))
ok(call("asset_delete", "a_ana00001"))
assert T.assets.get(uid="a_ana00001") is not None, "deleting someone else's file does nothing"
assert denied("asset_upload", png, {"id": "a_bob00001", "kind": "bg"}) is False
as_user(None)
assert denied("asset_upload", png, {"id": "a_gst00001", "kind": "bg"}), "guests keep files in their browser"

# ---------------------------------------------------------------------------------- watching a member's shared movie
as_user(bob)
w = ok(call("watch_get", key))
assert set(w["chars"]) == {"c_ana00001"} and w["chars"]["c_ana00001"]["rig"] == "biped", "the movie's own characters come along (presets don't)"
assert set(w["assets"]) == {"a_ana00001", "a_ana00002"} and w["assets"]["a_ana00002"]["key"] == a2["key"], "its uploads come along by key"
assert w["card"]["mine"] is False and w["card"]["views"] == 1
assert "email" not in str(w["card"]).lower() and "ana@example.com" not in str(w), "viewers never see the owner's email"
bad(call("report_toon", key, "x"))
ok(call("report_toon", key, "This is mean"))
assert any("Report about the cartoon" in f["message"] for f in T.feedback.search())
bad(call("report_toon", "zzzz-none", "Something"))
as_user(ana)
assert call("watch_get", key)["card"]["views"] == 1, "owners don't count as views"

# ---------------------------------------------------------------------------------- admin: toons
as_user(ana)
assert denied("admin_toons") and denied("admin_feature", key, True) and denied("admin_unshare", key)
as_user(admin)
toons = call("admin_toons")["toons"]
assert any(t["key"] == key and t["email"] == "ana@example.com" for t in toons)
ok(call("admin_feature", key, True))
assert any(c["key"] == key for c in call("theater_list")["featured"])
ov = call("admin_overview")
assert ov["movies"] == 1 and ov["characters"] == 1 and ov["shared"] == 1 and ov["uploads"] >= 1
ok(call("admin_unshare", key))
bad(call("watch_get", key), "an unshared link stops working")
assert all(c["key"] != key for c in call("theater_list")["featured"])
bad(call("admin_feature", key, True), "can't feature an unshared movie")
as_user(ana)
assert ok(call("movie_share", "m_ana00001", True))["share_key"] == key, "the owner can share it again (same link)"
ok(call("movie_share", "m_ana00001", False))
bad(call("watch_get", key))
ok(call("movie_delete", "m_ana00001"))
bad(call("movie_get", "m_ana00001"))

# ---------------------------------------------------------------------------------- demo data removal keeps real data
as_user(admin)
ok(call("demo_remove"))
assert M["DemoData"].state() == "removed" and call("theater_list")["featured"] == []
assert not T.users.search(is_demo=True)
assert len(T.characters.search()) == 1, "removing demo data keeps real data"
as_user(None)
call("theater_list")
assert M["DemoData"].state() == "removed", "removed demo data doesn't come back by itself"
as_user(admin)
ok(call("demo_load"))
ok(call("demo_load"))
assert len(call("theater_list")["featured"]) == len(M["DemoData"].DEMO_MOVIES), "reloading replaces the demo instead of doubling it"

# ---------------------------------------------------------------------------------- Privacy & Terms
if "legal_server" in M:
    as_user(ana)
    st = call("legal_state")
    assert st["signedIn"] and st["accepted_version"] is None
    ok(call("legal_accept", st["version"], "signup"))
    assert ana["legal_source"] == "signup" and call("legal_state")["accepted_version"] == st["version"]

# ---------------------------------------------------------------------------------- every callable is covered by a permission check
# A callable that changes data without require_user / a C.require_* check is a security hole. List the public ones here.
PUBLIC = {"get_me", "submit_feedback", "theater_list", "watch_get", "report_toon", "legal_state", "legal_accept"}
for name, (f, need) in sorted(anvil.server.CALLABLES.items()):
    if name in PUBLIC:
        continue
    assert need, "%s is callable by anyone: add require_user=True (or list it in PUBLIC in test_server.py)" % name

print("ALL OK (%d server functions)" % len(anvil.server.CALLABLES))
