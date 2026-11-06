import math

from anvil import *

from ._anvil_designer import ExportTemplate
from ... import state, tl


class Export(ExportTemplate):
    """Make a video file in the browser: pick the shape (the movie's own, or crop it to another), then the movie plays
    from start to finish while it's recorded (TL.exportJob). Download when done."""

    def __init__(self, movie, chars, **properties):
        super().__init__(**properties)
        self.movie, self.chars = movie, chars
        self.own = str(tl.TL.formatOf(movie).id)
        self.shape = self.own
        self.job = tl.NULL
        self.result = tl.NULL
        state.heading(self.title_label, 2)
        self.lead_label.text = ("Your movie plays from start to finish while we record it (%d seconds). Keep this tab open!"
                                % math.ceil(float(movie.dur or 1)))
        self.shapes_panel.add_event_handler("x-pick", self._shape)
        self.progress_box.visible = False
        self.download_button.visible = False
        self._draw()

    def _draw(self, focus=None):
        self.shapes_panel.items = [dict(f, on=f["id"] == self.shape) for f in tl.formats()]
        f = tl.TL.formatOf(self.movie, self.shape)
        if self.shape == self.own:
            self.shape_note.text = "The movie's own shape: %d × %d pixels." % (f.out[0], f.out[1])
        else:
            self.shape_note.text = ("Crops your movie to a %s %s (%d × %d). Actors near the edges may be cut off: "
                                    "change the shape in the studio to check." % (f.name, f.ratio, f.out[0], f.out[1]))
        cv = self.dom_nodes["prev"]
        ctx = cv.getContext("2d")
        pic = tl.TL.movieCanvas(self.movie, self.chars, min(1.5, float(self.movie.dur or 2) / 2),
                                int(f.out[0] / 2), int(f.out[1] / 2), self.shape)
        cv.width, cv.height = pic.width, pic.height
        if ctx:
            ctx.drawImage(pic, 0, 0)
        self.prev_box.classes["tall"] = f.out[1] >= f.out[0]
        if focus:
            state.refocus(self, focus)

    def _shape(self, key, **event_args):
        self.shape = key
        self._draw(key)

    @handle("start_button", "click")
    def start_button_click(self, **event_args):
        self.start_button.visible = False
        self.shape_part.visible = False
        self.progress_box.visible = True
        self.dom_nodes["msg"].textContent = "Starting..."
        nodes = tl.js_value({})
        nodes.canvas, nodes.bar, nodes.msg = self.dom_nodes["prev"], self.dom_nodes["bar"], self.dom_nodes["msg"]
        self.job = tl.TL.exportJob(self.movie, self.chars, nodes, self.shape)
        try:
            res = self.job.run()
        except Exception as e:
            self.dom_nodes["msg"].textContent = "Sorry, that didn't work: %s" % e
            return
        if res is None:
            return
        self.result = res
        self.dom_nodes["msg"].textContent = "Done! %s MB (%s)." % (res.mb, str(res.ext).upper())
        self.download_button.text = "Download " + str(res.name)
        self.download_button.visible = True
        self.cancel_button.text = "Close"

    @handle("download_button", "click")
    def download_button_click(self, **event_args):
        if self.result is not None:
            tl.TL.download(self.result.blob, self.result.name)
            tl.TL.confetti()

    @handle("cancel_button", "click")
    def cancel_button_click(self, **event_args):
        if self.job is not None:
            self.job.cancel()
        self.raise_event("x-close-alert", value=None)
