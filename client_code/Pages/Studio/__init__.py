from anvil import *

from ._anvil_designer import StudioTemplate


class Studio(StudioTemplate):
    """#studio/...: the studio (hold-to-record, timeline, canvas shapes), a JavaScript engine in Components/Screen (theme/assets/tl-screens.js)."""

    waits = True  # router: the screen sets UI_READY itself once it has loaded

    def __init__(self, args=(), **properties):
        super().__init__(**properties)
        self.screen.mount(list(args))
