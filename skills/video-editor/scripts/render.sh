#!/usr/bin/env bash
# render.sh — burn styled captions/headlines/cards into a video, reel-style.
#
# Usage:
#   render.sh -i input.mp4 -a captions.ass -o output.mp4 [options]
#
# Options:
#   -i  input video (required)
#   -a  .ass subtitle file from build_captions.py (required)
#   -o  output video (default: output.mp4)
#   -r  target resolution WxH (default: keep source; e.g. 1080x1920 for reels)
#   -z  punch-in zoom amount, 1.0 = none, 1.08 = subtle push (default: 1.0)
#   -f  fonts dir for libass (default: skills/video-editor/assets/fonts)
#   -q  CRF quality, lower = better (default: 18)
#
# The caption look is entirely in the .ass file; this script handles the
# reframe (vertical/16:9), an optional slow punch-in, and the burn-in.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
IN=""; ASS=""; OUT="output.mp4"; RES=""; ZOOM="1.0"; CRF="18"
FONTS="$HERE/../assets/fonts"

while getopts "i:a:o:r:z:f:q:h" opt; do
  case "$opt" in
    i) IN="$OPTARG" ;;
    a) ASS="$OPTARG" ;;
    o) OUT="$OPTARG" ;;
    r) RES="$OPTARG" ;;
    z) ZOOM="$OPTARG" ;;
    f) FONTS="$OPTARG" ;;
    q) CRF="$OPTARG" ;;
    h) grep '^#' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "unknown option"; exit 1 ;;
  esac
done

[ -z "$IN" ]  && { echo "ERROR: -i input required"; exit 1; }
[ -z "$ASS" ] && { echo "ERROR: -a captions.ass required"; exit 1; }
command -v ffmpeg >/dev/null || { echo "ERROR: ffmpeg not found"; exit 1; }

FONTS_ABS="$(cd "$FONTS" 2>/dev/null && pwd || echo "$FONTS")"

# Resolve the working resolution (needed for a correct, centered punch-in).
if [ -n "$RES" ]; then
  W="${RES%x*}"; H="${RES#*x}"
else
  read -r W H < <(ffprobe -v error -select_streams v:0 \
    -show_entries stream=width,height -of csv=p=0 "$IN" | tr ',' ' ')
fi

# Build the filter chain.
CHAIN=""

# 1) optional reframe to target resolution (cover-crop, no distortion)
if [ -n "$RES" ]; then
  CHAIN+="scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},"
fi

# 2) optional slow punch-in over the whole clip (Ken-Burns style push).
#    zoompan needs an explicit output size and centered x/y, otherwise it
#    drifts to the top-left corner.
if [ "$ZOOM" != "1.0" ]; then
  CHAIN+="zoompan=z='min(zoom+0.0006,${ZOOM})'"
  CHAIN+=":x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'"
  CHAIN+=":d=1:s=${W}x${H}:fps=30,"
fi

# 3) burn subtitles (libass) — force our fonts dir so headlines pick the display font
# escape path for the subtitles filter
ASS_ESC="$(printf '%s' "$ASS" | sed "s/'/\\\\'/g")"
CHAIN+="subtitles='${ASS_ESC}':fontsdir='${FONTS_ABS}'"

echo "==> input:   $IN"
echo "==> ass:     $ASS"
echo "==> fonts:   $FONTS_ABS"
echo "==> filters: $CHAIN"
echo "==> output:  $OUT"

ffmpeg -y -i "$IN" \
  -vf "$CHAIN" \
  -c:v libx264 -preset medium -crf "$CRF" -pix_fmt yuv420p \
  -c:a aac -b:a 160k -movflags +faststart \
  "$OUT"

echo "==> done: $OUT"
