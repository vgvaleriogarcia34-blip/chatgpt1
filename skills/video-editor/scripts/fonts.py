"""Font resolution for the video-editor skill.

The reference reel ("mentor de VIDA & Negocios") uses a heavy grotesque for
headlines and a clean semibold grotesque for the running subtitles. Those exact
fonts (Anton / Montserrat / Poppins) are not always installed, so this module
resolves the *best available* family for each role and degrades gracefully to
fonts that ship with almost every Linux box (DejaVu / Liberation).

To get maximum fidelity to the model video, drop the real .ttf files into
``skills/video-editor/assets/fonts/`` (see assets/fonts/README.md). libass picks
them up automatically via the ``fonts_dir`` passed to the subtitles filter.
"""

from __future__ import annotations

import os
import shutil
import subprocess
from functools import lru_cache

# Role -> ordered list of preferred family names (most faithful first).
PREFERRED = {
    # Big punchy headlines / keyword pops (the "ENARMORARSE" look).
    "display": ["Anton", "Bebas Neue", "Montserrat Black", "Poppins Black",
                "Archivo Black", "DejaVu Sans", "Liberation Sans"],
    # Sub-headline / lead-in lines ("hoy que", "del proceso").
    "heavy":   ["Montserrat", "Poppins", "Archivo", "Inter",
                "DejaVu Sans", "Liberation Sans"],
    # Running subtitles at the bottom.
    "body":    ["Montserrat", "Poppins", "Inter", "Roboto",
                "DejaVu Sans", "Liberation Sans"],
    # Soft italic accent phrases ("viene a ti").
    "script":  ["Dancing Script", "Pacifico", "DejaVu Sans"],
}

ASSETS_DIR = os.path.join(os.path.dirname(__file__), "..", "assets", "fonts")


@lru_cache(maxsize=1)
def _installed_families() -> set[str]:
    """Return the set of font family names known to fontconfig (lowercased)."""
    fams: set[str] = set()
    if shutil.which("fc-list"):
        try:
            out = subprocess.check_output(
                ["fc-list", ":", "family"], text=True, stderr=subprocess.DEVNULL)
            for line in out.splitlines():
                for fam in line.split(","):
                    fam = fam.strip()
                    if fam:
                        fams.add(fam.lower())
        except Exception:
            pass
    # Also honour bundled fonts in assets/fonts (family == file stem heuristic).
    if os.path.isdir(ASSETS_DIR):
        for fn in os.listdir(ASSETS_DIR):
            if fn.lower().endswith((".ttf", ".otf")):
                fams.add(os.path.splitext(fn)[0].replace("-", " ").lower())
    return fams


def resolve(role: str) -> str:
    """Return the best available family name for a role."""
    installed = _installed_families()
    for fam in PREFERRED.get(role, []):
        if fam.lower() in installed:
            return fam
    # Absolute last resort — something that always exists.
    return "DejaVu Sans"


def fonts_dir() -> str:
    """Absolute path to the bundled fonts dir (passed to libass)."""
    return os.path.abspath(ASSETS_DIR)


def report() -> str:
    lines = ["Resolved fonts:"]
    for role in ("display", "heavy", "body", "script"):
        lines.append(f"  {role:8s} -> {resolve(role)}")
    return "\n".join(lines)


if __name__ == "__main__":
    print(report())
    print("fonts_dir:", fonts_dir())
