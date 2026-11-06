from anvil import *

from ._anvil_designer import CastPreviewTemplate
from ... import router, state, tl


class CastPreview(CastPreviewTemplate):
    """A premade character (or prop) playing its moves, with "Make it mine" (a copy in your cast, then the builder)."""

    def __init__(self, preset_id="p_blox", **properties):
        super().__init__(**properties)
        self.preset_id = preset_id
        ch = tl.TL.PRESETS[preset_id]
        prop = bool(tl.TL.isProp(ch))
        name = str(ch.name)
        moves = ", ".join("%s %s" % (tl.TL.animEmoji(a), a.name) for a in ch.anims)
        self.title_label.text = name
        state.heading(self.title_label, 2)
        self.about_label.text = "%s, with %d moves: %s." % ("A prop for your stage" if prop else "Part of the premade cast",
                                                          len(ch.anims), moves)
        self.hint_label.text = ("Add it from the ➕ Cast tab in the studio. Make your own copy to change its colours, size or moves."
                                if prop else "You can put %s in any movie as is. To change the looks or the moves, make your own copy." % name)

    @handle("", "show")
    def form_show(self, **event_args):
        tl.TL.show.preview(self.dom_nodes["stage"], self.preset_id)

    @handle("mine_button", "click")
    def mine_button_click(self, **event_args):
        self.mine_button.enabled = False
        new_id = tl.TL.copyPreset(self.preset_id)
        state.toast("%s joined your cast!" % tl.TL.PRESETS[self.preset_id].name, "ok")
        self.raise_event("x-close-alert", value=None)
        router.go("build", str(new_id))
