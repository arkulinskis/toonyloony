from anvil import *

from ._anvil_designer import AnimateTemplate


class Animate(AnimateTemplate):
    """#animate/...: the animator (moves and keyframes), a JavaScript engine in Components/Screen (theme/assets/tl-screens.js)."""

    waits = True  # router: the screen sets UI_READY itself once it has loaded

    def __init__(self, args=(), **properties):
        super().__init__(**properties)
        self.screen.mount(list(args))
