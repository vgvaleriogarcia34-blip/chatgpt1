#!/usr/bin/env python3
"""Locución de cada bloque del guion con Piper (voz neuronal en español que funciona sin conexión).

Uso: python3 voz.py <promo.json> <carpeta-trabajo> <modelo.onnx>
Lee el campo "voz" de cada bloque (escrito como se dice: números en palabras) y guarda voz-<n>.wav y voz.json con la
duración de cada uno. El montaje corta los planos según estas duraciones, así los cortes caen al final de las frases.
"""
import json, os, subprocess, sys, wave

def main():
    if len(sys.argv) < 4:
        sys.exit(__doc__)
    promo, work, modelo = sys.argv[1:4]
    from piper import PiperVoice
    try:
        from piper import SynthesisConfig
    except ImportError:
        SynthesisConfig = None
    os.makedirs(work, exist_ok=True)
    P = json.load(open(promo, encoding='utf-8'))
    voz = PiperVoice.load(modelo)
    vel = float(P.get('velocidad_voz', 1.0))
    cfg = SynthesisConfig(length_scale=1.0 / vel) if SynthesisConfig and vel != 1.0 else None
    out = []
    for i, b in enumerate(P['bloques']):
        t = (b.get('voz') or '').strip()
        if not t:
            out.append({'bloque': i, 'archivo': None, 'dur': 0})
            continue
        f = os.path.join(work, f'voz-{i}.wav')
        with wave.open(f, 'wb') as w:
            voz.synthesize_wav(t, w, syn_config=cfg) if cfg else voz.synthesize_wav(t, w)
        dur = float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).decode())
        out.append({'bloque': i, 'archivo': f, 'dur': round(dur, 3)})
        print(f'bloque {i}: {dur:.1f} s')
    json.dump(out, open(os.path.join(work, 'voz.json'), 'w'), indent=1)
    print('total voz', round(sum(x['dur'] for x in out), 1), 's')

if __name__ == '__main__':
    main()
