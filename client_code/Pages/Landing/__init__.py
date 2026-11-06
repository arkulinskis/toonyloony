from anvil import *

from ._anvil_designer import LandingTemplate
from ... import state, tl


class Landing(LandingTemplate):
    """#landing: the pitch for visitors (and "About" for members). The hero is a before/after stage: drag the handle
    between the storyboard you make and the cartoon you get (TL.show.hero plays a real movie on a canvas)."""

    def __init__(self, args=(), **properties):
        super().__init__(**properties)
        me = state.me()
        self.guest_cta.visible = not me
        self.member_cta.visible = bool(me)
        self.grown_note.visible = not me

    @handle("", "show")
    def form_show(self, **event_args):
        d = self.dom_nodes
        tl.TL.show.hero(d["before"], d["after"], d["slider"], d["ba"])
        tl.TL.show.steps(d["step0"], d["step1"], d["step2"])
