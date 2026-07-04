#!/usr/bin/env python3
"""build_captions.py — turn an edit spec (JSON) into a styled .ass subtitle file
that reproduces the "mentor de VIDA & Negocios" reel look:

  * running subtitles   -> bottom, word-by-word reveal, clean semibold grotesque
  * keyword headlines    -> big left/right-third titles with a size hierarchy,
                            an UPPERCASE keyword optionally in an accent colour,
                            an optional red accent rule, and a pop-in animation
  * title cards          -> full-frame brand / name cards (navy + teal + magenta,
                            neon glow) like the "SERGIO" and brand identity beats

The output .ass is burned into the video by render.sh (or any `subtitles=` filter).

Usage:
    python3 build_captions.py spec.json -o out.ass
    python3 build_captions.py --demo    -o out.ass   # writes a self-contained demo

See references/STYLE.md for the full design language and examples/ for a spec.
"""

from __future__ import annotations

import argparse
import json
import os
import sys

import fonts  # local module

# ---------------------------------------------------------------------------
# Colour system extracted from the reference reel.  Hex is #RRGGBB; ASS wants
# &HAABBGGRR, so convert programmatically to avoid channel-order mistakes.
# ---------------------------------------------------------------------------
PALETTE = {
    "white":   "FFFFFF",
    "green":   "22DD44",   # money / DINERO / GANAR
    "red":     "E01414",   # emotional emphasis + accent rule (AMOR, CÁNCER…)
    "teal":    "1FC7A6",   # brand accent (VIDA)
    "magenta": "E23A8C",   # brand accent (Negocios) / neon name glow
    "navy":    "0B1B3A",   # brand card background
    "black":   "000000",
}


def ass_color(name_or_hex: str, alpha: str = "00") -> str:
    """'green' or '22DD44' -> '&H0044DD22'  (ASS is AABBGGRR)."""
    hexrgb = PALETTE.get(name_or_hex, name_or_hex).lstrip("#")
    r, g, b = hexrgb[0:2], hexrgb[2:4], hexrgb[4:6]
    return f"&H{alpha}{b}{g}{r}".upper()


def ts(seconds: float) -> str:
    """Seconds -> ASS timestamp H:MM:SS.cs"""
    if seconds < 0:
        seconds = 0
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = seconds % 60
    return f"{h}:{m:02d}:{s:05.2f}"


# ---------------------------------------------------------------------------
# Spec model
# ---------------------------------------------------------------------------
class Builder:
    def __init__(self, width: int, height: int, font_scale: float = 1.0):
        self.W = width
        self.H = height
        self.k = font_scale
        self.events: list[str] = []
        # Resolved font families (fall back gracefully to system fonts).
        self.f_display = fonts.resolve("display")
        self.f_heavy = fonts.resolve("heavy")
        self.f_body = fonts.resolve("body")
        self.f_script = fonts.resolve("script")

    # -- size helpers (relative to frame height so it scales to any resolution)
    def px(self, frac: float) -> int:
        return max(1, int(round(self.H * frac * self.k)))

    def fit(self, text: str, base_fs: int, max_frac_w: float = 0.88,
            char_w: float = 0.66) -> int:
        """Shrink base_fs so `text` fits within max_frac_w * frame width.

        char_w is the average glyph advance as a fraction of the font size
        (~0.66 for a bold grotesque — kept slightly generous so lines don't
        clip). Prevents headlines / card lines / long intro lines from running
        off the frame (e.g. '& NEGOCIOS' or 'cuando me preguntan si me afecta').
        The floor is low so long lines really can shrink."""
        n = max(1, len(text))
        avail = self.W * max_frac_w
        fs_fit = int(avail / (char_w * n))
        return max(self.px(0.020), min(base_fs, fs_fit))

    # ---- ASS document -----------------------------------------------------
    def header(self) -> str:
        # Subtitle base size ~3% of height; outline scaled with size.
        sub_fs = self.px(0.032)
        lead_fs = self.px(0.036)
        big_fs = self.px(0.075)
        styles = [
            # name, font, size, primary, outline, back, bold, border, outlinew, shadow, align, mL, mR, mV
            ("Sub",     self.f_body,    sub_fs,  "white", "black", "black", -1, 1, max(2, sub_fs // 14), 0, 2,
             int(self.W * 0.10), int(self.W * 0.10), int(self.H * 0.11)),
            ("SubBox",  self.f_body,    sub_fs,  "white", "black", "black", -1, 3, max(2, sub_fs // 14), 0, 2,
             int(self.W * 0.10), int(self.W * 0.10), int(self.H * 0.11)),
            ("HeadLead", self.f_heavy,  lead_fs, "white", "black", "black", -1, 1, max(2, lead_fs // 12), 0, 4, 0, 0, 0),
            ("HeadBig",  self.f_display, big_fs, "white", "black", "black", -1, 1, max(3, big_fs // 12), 0, 4, 0, 0, 0),
            ("Card",     self.f_display, self.px(0.11), "white", "navy", "navy", -1, 1, self.px(0.006), 0, 5, 0, 0, 0),
        ]
        out = []
        out.append("[Script Info]")
        out.append("; Generated by video-editor skill (build_captions.py)")
        out.append("ScriptType: v4.00+")
        out.append("WrapStyle: 2")
        out.append("ScaledBorderAndShadow: yes")
        out.append(f"PlayResX: {self.W}")
        out.append(f"PlayResY: {self.H}")
        out.append("YCbCr Matrix: TV.709")
        out.append("")
        out.append("[V4+ Styles]")
        out.append("Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, "
                   "OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, "
                   "ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, "
                   "Alignment, MarginL, MarginR, MarginV, Encoding")
        for (name, font, size, prim, outl, back, bold, border, ow, sh, align,
             mL, mR, mV) in styles:
            out.append(
                "Style: "
                f"{name},{font},{size},{ass_color(prim)},&H000000FF,"
                f"{ass_color(outl)},{ass_color(back,'64')},{bold},0,0,0,"
                f"100,100,0,0,{border},{ow},{sh},{align},{mL},{mR},{mV},1")
        out.append("")
        out.append("[Events]")
        out.append("Format: Layer, Start, End, Style, Name, MarginL, MarginR, "
                   "MarginV, Effect, Text")
        return "\n".join(out)

    def _ev(self, layer, start, end, style, text):
        self.events.append(
            f"Dialogue: {layer},{ts(start)},{ts(end)},{style},,0,0,0,,{text}")

    # ---- running subtitles ------------------------------------------------
    def add_subtitle(self, start, end, text, reveal="word", box=False,
                     highlight=None):
        """Bottom caption. reveal='word' pops words one at a time; 'phrase'
        fades the whole line. `highlight` is a colour name to tint the current
        word (default: none -> stays white like the reference)."""
        style = "SubBox" if box else "Sub"
        words = text.split()
        if reveal != "word" or len(words) <= 1:
            self._ev(1, start, end, style, r"{\fad(120,80)}" + text)
            return
        # distribute time by word length
        weights = [max(1, len(w)) for w in words]
        total = sum(weights)
        dur = max(0.001, end - start)
        t = start
        cuts = [start]
        for w in weights:
            t += dur * w / total
            cuts.append(t)
        n = len(words)
        for i in range(n):
            seg_start = cuts[i]
            # each partial line lives only until the next word appears; the
            # final accumulated line runs to `end`. (Otherwise every partial
            # stays on screen and they stack into a tower of lines.)
            seg_end = end if i == n - 1 else cuts[i + 1]
            shown = words[: i + 1]
            if highlight:
                shown = shown[:-1] + [
                    r"{\c" + ass_color(highlight) + r"}" + words[i] +
                    r"{\c" + ass_color("white") + r"}"]
            body = " ".join(shown)
            fade = r"{\fad(60,0)}" if i == 0 else ""
            self._ev(1, seg_start, seg_end, style, fade + body)

    # ---- keyword headlines ------------------------------------------------
    def add_headline(self, start, end, lines, align="left", accent=None,
                     rule=None, y=None, animate=True):
        """Big title block.

        lines  : list of {"text":..., "size":"lead|big", "color":name?} OR
                 plain strings (first=lead, rest big) for convenience.
        align  : 'left' | 'right' | 'center'
        accent : {"word": "...", "color": "red"} tints one word anywhere.
        rule   : colour name for a horizontal accent bar behind the text.
        """
        an = {"left": 4, "right": 6, "center": 5}[align]
        if y is None:
            y = int(self.H * 0.50)
        if align == "left":
            x = int(self.W * 0.06)
        elif align == "right":
            x = int(self.W * 0.94)
        else:
            x = int(self.W * 0.50)

        # accent rule drawn behind (own layer, wipes in)
        if rule:
            ry = y
            h = self.px(0.006)
            col = ass_color(rule)
            draw = (f"{{\\an7\\pos(0,{ry - h // 2})\\bord0\\shad0\\1c{col}"
                    f"\\alpha&H10&\\fad(120,120)\\clip(0,0,0,{self.H})"
                    f"\\t(0,260,\\clip(0,0,{self.W},{self.H}))\\p1}}"
                    f"m 0 0 l {self.W} 0 l {self.W} {h} l 0 {h}{{\\p0}}")
            self._ev(0, start, end, "HeadBig", draw)

        # normalise line specs
        norm = []
        for i, ln in enumerate(lines):
            if isinstance(ln, str):
                norm.append({"text": ln, "size": "lead" if i == 0 else "big"})
            else:
                norm.append({"size": ln.get("size", "big"), **ln})

        # size each big line so the longest one still fits the frame width
        big_texts = [l["text"] for l in norm if l["size"] == "big"]
        big_fs = self.fit(max(big_texts, key=len), self.px(0.075),
                          max_frac_w=0.88) if big_texts else self.px(0.075)
        # lead (small) lines get fitted too, otherwise a long intro line like
        # "cuando me preguntan si me afecta" runs off both edges.
        lead_texts = [l["text"] for l in norm if l["size"] != "big"]
        lead_fs = self.fit(max(lead_texts, key=len), self.px(0.036),
                           max_frac_w=0.90) if lead_texts else self.px(0.036)
        parts = []
        for ln in norm:
            fs = big_fs if ln["size"] == "big" else lead_fs
            seg = f"{{\\fs{fs}}}"
            txt = ln["text"]
            color = ln.get("color")
            if accent and accent.get("word") and accent["word"] in txt:
                w = accent["word"]
                c = ass_color(accent.get("color", "red"))
                txt = txt.replace(
                    w, r"{\c" + c + r"}" + w + r"{\c" + ass_color("white") + r"}")
            elif color:
                seg += r"{\c" + ass_color(color) + r"}"
            parts.append(seg + txt)
        block = r"\N".join(parts)

        pop = (r"\fscx70\fscy70\t(0,200,\fscx100\fscy100)" if animate else "")
        tag = f"{{\\an{an}\\pos({x},{y})\\fad(180,140){pop}}}"
        self._ev(2, start, end, "HeadBig", tag + block)

    # ---- title cards ------------------------------------------------------
    def add_card(self, start, end, kind="brand", lines=None, name=None):
        """Full-frame brand/name card.

        kind='brand' -> navy panel + stacked 'mentor / de VIDA / & Negocios'
                        with teal + magenta accents.
        kind='name'  -> big neon-glow name (like 'SERGIO').
        """
        # navy background panel
        bg = (f"{{\\an7\\pos(0,0)\\bord0\\shad0\\1c{ass_color('navy')}"
              f"\\fad(200,200)\\p1}}m 0 0 l {self.W} 0 l {self.W} {self.H} "
              f"l 0 {self.H}{{\\p0}}")
        self._ev(3, start, end, "Card", bg)

        if kind == "name":
            nm = (name or (lines[0] if lines else "SERGIO")).upper()
            fs = self.fit(nm, self.px(0.16), max_frac_w=0.82)
            glow = ass_color("magenta")
            # neon: coloured blurred border under a white face
            base = (f"{{\\an5\\pos({self.W//2},{self.H//2})\\fs{fs}\\b1"
                    f"\\bord{self.px(0.010)}\\3c{glow}\\blur14\\shad0"
                    f"\\fad(220,220)\\fscx60\\fscy60\\t(0,260,\\fscx100\\fscy100)}}"
                    f"{nm}")
            face = (f"{{\\an5\\pos({self.W//2},{self.H//2})\\fs{fs}\\b1"
                    f"\\bord0\\shad0\\1c{ass_color('white')}\\fad(220,220)"
                    f"\\fscx60\\fscy60\\t(0,260,\\fscx100\\fscy100)}}{nm}")
            self._ev(4, start, end, "Card", base)
            self._ev(5, start, end, "Card", face)
            return

        # brand card — stacked lines, mixed size, teal/magenta accents
        lines = lines or ["mentor", "de VIDA", "& Negocios"]
        accent_cycle = [None, "teal", "magenta"]
        # fit the widest big line (left-anchored at 7%, so ~0.86 usable width)
        big_lines = [ln for i, ln in enumerate(lines) if i > 0]
        big_fs = self.fit(max(big_lines, key=len), self.px(0.11),
                          max_frac_w=0.86) if big_lines else self.px(0.11)
        parts = []
        for i, ln in enumerate(lines):
            big = i > 0
            fs = big_fs if big else self.px(0.06)
            col = accent_cycle[i % len(accent_cycle)]
            seg = f"{{\\fs{fs}}}"
            # emphasise the UPPERCASE word in each line with the accent colour
            words = ln.split()
            rendered = []
            for w in words:
                if col and w.isupper() and len(w) > 1:
                    rendered.append(r"{\c" + ass_color(col) + r"}" + w +
                                    r"{\c" + ass_color("white") + r"}")
                else:
                    rendered.append(w)
            parts.append(seg + " ".join(rendered))
        block = r"\N".join(parts)
        tag = (f"{{\\an4\\pos({int(self.W*0.07)},{self.H//2})\\b1"
               f"\\fad(200,200)\\fscx80\\fscy80\\t(0,240,\\fscx100\\fscy100)}}")
        self._ev(4, start, end, "Card", tag + block)

    # ---- assemble ---------------------------------------------------------
    def render(self) -> str:
        return self.header() + "\n" + "\n".join(self.events) + "\n"


# ---------------------------------------------------------------------------
def build_from_spec(spec: dict) -> str:
    w, h = spec.get("resolution", [1080, 1920])
    b = Builder(w, h, spec.get("font_scale", 1.0))
    for s in spec.get("subtitles", []):
        b.add_subtitle(s["start"], s["end"], s["text"],
                       reveal=s.get("reveal", "word"),
                       box=s.get("box", False),
                       highlight=s.get("highlight"))
    for hl in spec.get("headlines", []):
        b.add_headline(hl["start"], hl["end"], hl["lines"],
                       align=hl.get("align", "left"),
                       accent=hl.get("accent"), rule=hl.get("rule"),
                       y=hl.get("y"), animate=hl.get("animate", True))
    for c in spec.get("cards", []):
        b.add_card(c["start"], c["end"], kind=c.get("type", "brand"),
                   lines=c.get("lines"), name=c.get("name"))
    return b.render()


def demo_spec() -> dict:
    return {
        "resolution": [1080, 1920],
        "subtitles": [
            {"start": 0.2, "end": 2.6, "text": "te lo voy a decir bien claro"},
            {"start": 2.6, "end": 5.0, "text": "ganar dinero es muy facil"},
            {"start": 8.2, "end": 11.0,
             "text": "si tu entregas amor el dinero viene a ti"},
        ],
        "headlines": [
            {"start": 2.6, "end": 5.0, "align": "left",
             "lines": [{"text": "GANAR", "size": "big"},
                       {"text": "DINERO", "size": "big", "color": "green"}]},
            {"start": 5.2, "end": 8.0, "align": "left", "rule": "red",
             "lines": ["hoy hay que", "ENAMORARSE", "del proceso"],
             "accent": {"word": "ENAMORARSE", "color": "red"}},
            {"start": 8.2, "end": 11.0, "align": "right",
             "lines": ["si tu entregas", "AMOR"],
             "accent": {"word": "AMOR", "color": "red"}},
        ],
        "cards": [
            {"start": 11.2, "end": 13.4, "type": "name", "name": "SERGIO"},
            {"start": 13.4, "end": 16.0, "type": "brand",
             "lines": ["mentor", "de VIDA", "& NEGOCIOS"]},
        ],
    }


def main():
    ap = argparse.ArgumentParser(description="Build styled .ass captions/headlines")
    ap.add_argument("spec", nargs="?", help="edit spec JSON")
    ap.add_argument("-o", "--out", required=True, help="output .ass path")
    ap.add_argument("--demo", action="store_true", help="write a demo spec")
    args = ap.parse_args()

    if args.demo:
        spec = demo_spec()
    else:
        if not args.spec:
            ap.error("provide a spec JSON or use --demo")
        with open(args.spec, encoding="utf-8") as fh:
            spec = json.load(fh)

    ass = build_from_spec(spec)
    with open(args.out, "w", encoding="utf-8") as fh:
        fh.write(ass)
    print(f"wrote {args.out}  ({len(ass.splitlines())} lines)")
    print(fonts.report())


if __name__ == "__main__":
    main()
