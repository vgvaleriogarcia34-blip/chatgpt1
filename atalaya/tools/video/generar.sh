#!/usr/bin/env bash
# Rehace la voz y el MP4 del vídeo de la empresa modelo.
# Requisitos: node, Playwright con Chromium, ffmpeg y Piper (pip install piper-tts) con la voz es_ES-davefx-medium.onnx.
# Uso: PIPER_MODEL=/ruta/es_ES-davefx-medium.onnx tools/video/generar.sh   (con la aplicación servida en http://localhost:8765)
set -euo pipefail
cd "$(dirname "$0")"; mkdir -p tmp
node escenas.js tmp/escenas.json
python3 voces.py tmp ../../media/video "${PIPER_MODEL:?Indica PIPER_MODEL}"
TMP_VIDEO="$PWD/tmp" node grabar.js
python3 montar.py tmp ../../media/video
echo "Listo: media/video/valdenorte-cambiar-el-rumbo.mp4"
