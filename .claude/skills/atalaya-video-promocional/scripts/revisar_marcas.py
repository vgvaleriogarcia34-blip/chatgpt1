#!/usr/bin/env python3
"""Hoja de revisión: cada captura reducida con sus marcas dibujadas y nombradas (para comprobar los encuadres).
Uso: python3 revisar_marcas.py <carpeta-capturas> <salida.jpg>"""
import json, os, subprocess, sys
cap, out = sys.argv[1:3]
M = json.load(open(os.path.join(cap, 'capturas.manifest.json')))['capturas']
F = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
tiles = []
for i, (cid, c) in enumerate(M.items()):
    vf = ['scale=960:540', f"drawtext=fontfile={F}:text='{cid}':x=8:y=8:fontsize=22:fontcolor=yellow:box=1:boxcolor=black@0.7"]
    for n, r in (c.get('marcas') or {}).items():
        if not r: continue
        x, y, w, h = [round(v / 2) for v in r]   # de 1920×1080 a 960×540
        vf.append(f'drawbox=x={x}:y={y}:w={w}:h={h}:color=yellow@0.9:t=3')
        vf.append(f"drawtext=fontfile={F}:text='{n}':x={x + 4}:y={max(0, y - 22)}:fontsize=18:fontcolor=black:box=1:boxcolor=yellow@0.9")
    t = f'/tmp/marca-{i}.png'; subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', os.path.join(cap, c['archivo']), '-vf', ','.join(vf), t], check=True); tiles.append(t)
cols = 2; pad = (cols - len(tiles) % cols) % cols; ins = []; flt = ''
for t in tiles: ins += ['-i', t]
for k in range(pad): flt += f'color=black:s=960x540[p{k}];'
lab = ''.join(f'[{i}:v]' for i in range(len(tiles))) + ''.join(f'[p{k}]' for k in range(pad))
lay = '|'.join(f'{(i % cols) * 960}_{(i // cols) * 540}' for i in range(len(tiles) + pad))
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error'] + ins + ['-filter_complex', flt + f'{lab}xstack=inputs={len(tiles) + pad}:layout={lay}', '-frames:v', '1', out], check=True)
print('Hoja de marcas:', out)
