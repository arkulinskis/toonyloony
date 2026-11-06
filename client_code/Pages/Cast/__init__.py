from anvil import *

from ._anvil_designer import CastTemplate
from ... import state, tl


class Cast(CastTemplate):
    """#cast: your characters, the premade cast and the props. New character = pick a body type, then the builder.
    Premade ones open a preview with "Make it mine"."""

    def __init__(self, args=(), **properties):
        super().__init__(**properties)
        mine = []
        for c in tl.TL.store.chars():
            mine.append({"id": str(c.id), "name": str(c.name), "thumb": tl.char_thumb(c),
                         "sub": state.plural(len(c.anims) if c.anims else 0, "move")})
        self.mine_panel.items = mine
        self.presets_panel.items = [{"id": str(c.id), "name": str(c.name), "thumb": tl.char_thumb(c), "preset": True,
                                     "sub": state.plural(len(c.anims), "move")} for c in tl.TL.PRESET_LIST]
        defs = tl.TL.PROP_DEFS
        self.props_panel.items = [{"id": str(c.id), "name": str(c.name), "thumb": tl.char_thumb(c), "preset": True,
                                   "sub": "%s prop" % defs[c.look.prop].emoji} for c in tl.TL.PROP_LIST]
        for panel in (self.presets_panel, self.props_panel):
            panel.add_event_handler("x-preset", self._preview)

    def _preview(self, item, **event_args):
        from ...Dialogs.CastPreview import CastPreview
        alert(CastPreview(preset_id=item["id"]), buttons=[], large=True, role="app-dialog", dismissible=True)

    @handle("new_button", "click")
    def new_button_click(self, **event_args):
        tl.create_character()

    def new_click(self, event):
        tl.create_character()
