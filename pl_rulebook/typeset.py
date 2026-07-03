"""Helper library: overlay Polish text onto the original rulebook page images.

Strategy: keep all artwork/diagrams/icons from the original page. Only cover the
rectangular English text regions with the local background colour, then re-flow
the Polish translation into the same region (auto-fitting the font size).
Coordinates are given in the ORIGINAL 1735px image space; everything scales to
the hi-res render automatically.
"""
import os
import csv
import io
import subprocess
from PIL import Image, ImageDraw, ImageFont

SRC_HI = "/root/.claude/uploads/760b14e1-1e2f-517a-8c89-c5f20f1f4524/hi"
BASE = 1735.0  # coordinate reference space (native image size)

F = {
    "serif":    "/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf",
    "serif_b":  "/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf",
    "serif_i":  "/usr/share/fonts/truetype/liberation/LiberationSerif-Italic.ttf",
    "serif_bi": "/usr/share/fonts/truetype/liberation/LiberationSerif-BoldItalic.ttf",
    "sans":     "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    "sans_b":   "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    "sans_i":   "/usr/share/fonts/truetype/liberation/LiberationSans-Italic.ttf",
}
_fc = {}
def font(style, size):
    size = max(6, int(round(size)))
    key = (style, size)
    if key not in _fc:
        _fc[key] = ImageFont.truetype(F[style], size)
    return _fc[key]


class Page:
    def __init__(self, n):
        self.n = n
        self.img = Image.open(os.path.join(SRC_HI, f"p-{n:02d}.png")).convert("RGB")
        self.W, self.H = self.img.size
        self.s = self.W / BASE           # scale from ref space to pixels
        self.d = ImageDraw.Draw(self.img)

    def px(self, v):
        return int(round(v * self.s))

    # ---- OCR (for precise text erasing) ---------------------------------
    def ocr_lines(self):
        """Return detected text LINES as dicts with box in ref coords."""
        if getattr(self, "_lines", None) is not None:
            return self._lines
        tmp = f"/tmp/ocr_{self.n}.png"
        self.img.save(tmp)
        out = subprocess.check_output(
            ["tesseract", tmp, "-", "--psm", "3", "tsv"],
            text=True, stderr=subprocess.DEVNULL)
        rows = list(csv.DictReader(io.StringIO(out), delimiter="\t"))
        groups = {}
        for w in rows:
            if w.get("level") != "5":
                continue
            txt = (w["text"] or "").strip()
            try:
                conf = float(w["conf"])
            except (TypeError, ValueError):
                conf = -1
            if not txt or conf < 35:
                continue
            key = (w["block_num"], w["par_num"], w["line_num"])
            x0 = int(w["left"]) / self.s
            y0 = int(w["top"]) / self.s
            x1 = x0 + int(w["width"]) / self.s
            y1 = y0 + int(w["height"]) / self.s
            g = groups.setdefault(key, [1e9, 1e9, -1e9, -1e9, []])
            g[0] = min(g[0], x0); g[1] = min(g[1], y0)
            g[2] = max(g[2], x1); g[3] = max(g[3], y1)
            g[4].append(txt)
        lines = [{"box": (g[0], g[1], g[2], g[3]), "text": " ".join(g[4])}
                 for g in groups.values()]
        self._lines = lines
        return lines

    def erase(self, zone, fill, padx=5, pady=5, minx=None, maxx=None):
        """Fill (with `fill`) the bbox of every OCR text line whose centre lies
        inside `zone` (ref coords). Precisely removes text while leaving borders,
        icons and diagrams untouched. Returns list of erased line boxes."""
        zx0, zy0, zx1, zy1 = zone
        hit = []
        for ln in self.ocr_lines():
            x0, y0, x1, y1 = ln["box"]
            cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
            if zx0 <= cx <= zx1 and zy0 <= cy <= zy1:
                ex0 = max(zx0, x0 - padx) if minx is None else max(minx, x0 - padx)
                ex1 = min(zx1, x1 + padx) if maxx is None else min(maxx, x1 + padx)
                self.d.rectangle([self.px(ex0), self.px(y0 - pady),
                                  self.px(ex1), self.px(y1 + pady)], fill=fill)
                hit.append(ln["box"])
        return hit

    # ---- colour sampling -------------------------------------------------
    def sample(self, x, y, r=6):
        x, y = self.px(x), self.px(y)
        r = self.px(r)
        box = self.img.crop((max(0, x - r), max(0, y - r), x + r, y + r))
        px = list(box.getdata())
        px.sort(key=lambda c: c[0] + c[1] + c[2])
        return px[len(px) // 2]

    def sample_ring(self, box, off=8):
        """median colour of a ring just OUTSIDE the given box (ref coords)."""
        x0, y0, x1, y1 = box
        pts = []
        for t in [i / 10 for i in range(11)]:
            pts.append((x0 + (x1 - x0) * t, y0 - off))
            pts.append((x0 + (x1 - x0) * t, y1 + off))
            pts.append((x0 - off, y0 + (y1 - y0) * t))
            pts.append((x1 + off, y0 + (y1 - y0) * t))
        cols = [self.sample(px, py, 4) for px, py in pts]
        cols.sort(key=lambda c: c[0] + c[1] + c[2])
        return cols[len(cols) // 2]

    # ---- covering --------------------------------------------------------
    def cover(self, box, color=None, ring=8):
        x0, y0, x1, y1 = box
        if color is None:
            color = self.sample_ring(box, ring)
        self.d.rectangle([self.px(x0), self.px(y0), self.px(x1), self.px(y1)],
                         fill=color)
        return color

    # ---- cloning (cover text on textured/gradient backgrounds) ----------
    def clone_h(self, box, src_x0, src_x1):
        """Cover `box` by tiling a clean vertical strip taken from the same
        y-range at x in [src_x0, src_x1]. Good for horizontally-uniform
        gradients (ribbons, sky headers)."""
        x0, y0, x1, y1 = [self.px(v) for v in box]
        sx0, sx1 = self.px(src_x0), self.px(src_x1)
        strip = self.img.crop((sx0, y0, sx1, y1))
        sw = strip.width
        if sw <= 0:
            return
        x = x0
        while x < x1:
            w = min(sw, x1 - x)
            self.img.paste(strip.crop((0, 0, w, strip.height)), (x, y0))
            x += w

    def clone_rect(self, dst_xy, src_box):
        """Paste src_box (ref) over dst starting at dst_xy top-left (ref)."""
        sx0, sy0, sx1, sy1 = [self.px(v) for v in src_box]
        patch = self.img.crop((sx0, sy0, sx1, sy1))
        self.img.paste(patch, (self.px(dst_xy[0]), self.px(dst_xy[1])))

    # ---- text measuring / drawing ---------------------------------------
    _NO_SPACE_BEFORE = set(",.;:!?)]}%”’»")
    _NO_SPACE_AFTER = set("(„«‘[{")

    def _tokenize(self, runs):
        """Flatten runs into [(word, font, glue_left)] where glue_left=True
        means no space precedes this word (punctuation attachment)."""
        toks = []
        prev_glue_next = False
        for text, tf in runs:
            fnt = tf
            words = text.split(" ")
            for wi, word in enumerate(text.split(" ")):
                if word == "":
                    prev_glue_next = False
                    continue
                glue = prev_glue_next or (word[0] in self._NO_SPACE_BEFORE)
                if not toks:
                    glue = True
                toks.append([word, fnt, glue])
                prev_glue_next = word[-1] in self._NO_SPACE_AFTER
        return toks

    def _wrap(self, toks, maxw):
        """toks: [(word, font, glue_left)]. Return lines (list of same)."""
        lines, cur, curw = [], [], 0
        for word, tf, glue in toks:
            ww = tf.getlength(word)
            sp = 0 if (glue or not cur) else tf.getlength(" ")
            if cur and curw + sp + ww > maxw:
                lines.append(cur)
                cur, curw = [], 0
                sp = 0
            cur.append((word, tf, glue))
            curw += sp + ww
        if cur:
            lines.append(cur)
        return lines

    def paragraphs(self, box, blocks, size=26, leading=1.28, color=(30, 26, 22),
                   justify=True, align="left", para_gap=0.55, valign="top",
                   autoshrink=True, min_size=10, first_indent=0):
        """Flow rich paragraphs into box (ref coords). Auto-shrinks to fit.
        blocks: list of paragraphs; each paragraph is a list of runs
                (text, style) where style in F keys, OR a plain string (serif).
        Returns the size actually used."""
        x0, y0, x1, y1 = box
        maxw = (x1 - x0) * self.s
        maxh = (y1 - y0) * self.s
        norm = []
        for p in blocks:
            if isinstance(p, str):
                p = [(p, "serif")]
            runs = [(t, s) for (t, s) in p]
            norm.append(runs)

        sz = size
        while True:
            fpx = sz * self.s
            fonts = {}
            def gf(style):
                if style not in fonts:
                    fonts[style] = font(style, fpx)
                return fonts[style]
            lh = fpx * leading
            pgap = fpx * para_gap
            total = 0
            laid = []
            for pi, runs in enumerate(norm):
                toks = self._tokenize([(t, gf(s)) for (t, s) in runs])
                lines = self._wrap(toks, maxw)
                laid.append(lines)
                total += lh * len(lines)
                if pi < len(norm) - 1:
                    total += pgap
            if not autoshrink or total <= maxh or sz <= min_size:
                break
            sz -= 1

        def line_natural(words):
            w = 0
            for i, (t, tf, glue) in enumerate(words):
                if i and not glue:
                    w += tf.getlength(" ")
                w += tf.getlength(t)
            return w

        y = y0 * self.s
        if valign == "center":
            y += max(0, (maxh - total) / 2)
        for pi, lines in enumerate(laid):
            for li, line in enumerate(lines):
                words = line
                natural = line_natural(words)
                gaps = sum(1 for i, w in enumerate(words) if i and not w[2])
                x = x0 * self.s
                extra = 0
                last = (li == len(lines) - 1)
                if justify and not last and gaps > 0:
                    extra = (maxw - natural) / gaps
                elif align == "center":
                    x += (maxw - natural) / 2
                elif align == "right":
                    x += (maxw - natural)
                for i, (t, wf, glue) in enumerate(words):
                    if i and not glue:
                        x += wf.getlength(" ") + (extra if (justify and not last) else 0)
                    self.d.text((x, y), t, font=wf, fill=color)
                    x += wf.getlength(t)
                y += lh
            if pi < len(laid) - 1:
                y += pgap
        return sz

    def text(self, pos, text, style="sans_b", size=30, color=(255, 255, 255),
             anchor="la", spacing=0):
        x, y = pos
        fnt = font(style, size * self.s)
        if spacing and len(text) > 1:
            # letter-spacing for headings
            cx = x * self.s
            for ch in text:
                self.d.text((cx, y * self.s), ch, font=fnt, fill=color, anchor="la")
                cx += fnt.getlength(ch) + spacing * self.s
        else:
            self.d.text((x * self.s, y * self.s), text, font=fnt, fill=color,
                        anchor=anchor)

    def line_width(self, text, style, size):
        return font(style, size * self.s).getlength(text) / self.s

    def section_heading(self, cx, cy, text, color, size, style="sans_b",
                        dash=True, spacing=1.5, dash_gap=22, dash_len=40):
        """Centered letter-spaced heading with optional side dashes.
        cx,cy = center point in ref coords (cy = vertical center of glyphs)."""
        fnt = font(style, size * self.s)
        sp = spacing * self.s
        widths = [fnt.getlength(ch) for ch in text]
        total = sum(widths) + sp * (len(text) - 1)
        x = cx * self.s - total / 2
        asc, desc = fnt.getmetrics()
        y = cy * self.s - (asc + desc) / 2
        for ch, w in zip(text, widths):
            self.d.text((x, y), ch, font=fnt, fill=color)
            x += w + sp
        if dash:
            g = dash_gap * self.s
            dl = dash_len * self.s
            yy = cy * self.s
            lw = max(2, int(2 * self.s))
            x0 = cx * self.s - total / 2 - g
            self.d.line([(x0 - dl, yy), (x0, yy)], fill=color, width=lw)
            x1 = cx * self.s + total / 2 + g
            self.d.line([(x1, yy), (x1 + dl, yy)], fill=color, width=lw)
        return total / self.s

    def save(self, path):
        self.img.save(path, quality=92)
