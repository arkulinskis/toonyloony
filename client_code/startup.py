"""The app starts here (anvil.yaml: startup module). One server call to learn who is signed in (Anvil's loading
spinner shows meanwhile), the Privacy & Terms kit, the engines' bridge (tl.setup), then the page for the address."""
import anvil.server

from . import legal, router, state, tl

LEGAL_THEME = {"accent": "#4757ff"}  # colours for the Privacy & Terms page (match --c-brand in app.css)

legal.setup(LEGAL_THEME)
tl.setup()
state.set_me(anvil.server.call("get_me"))
if state.me():
    legal.refresh_soon()
router.start()
