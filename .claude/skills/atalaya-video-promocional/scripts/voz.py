#!/usr/bin/env python3
"""Locución de cada bloque del guion, sin conexión, con Kokoro (por defecto) o Piper.

Uso: python3 voz.py <promo.json> <carpeta-trabajo> <modelo.onnx> [voces.bin]
  · Kokoro: <modelo.onnx> = kokoro-v1.0.onnx y [voces.bin] = voices-v1.0.bin. Voz en "voz_nombre" (em_alex por defecto).
  · Piper:  <modelo.onnx> = es_ES-davefx-medium.onnx (sin voces.bin), o "motor": "piper" en el montaje.
Lee el campo "voz" de cada bloque (escrito como se dice: números en palabras) y guarda voz-<n>.wav y voz.json con la
duración de cada uno. El montaje corta los planos según estas duraciones, así los cortes caen al final de las frases.

Para que suene menos mecánica:
  · Cada frase se dice por separado y se une con una pausa breve (0,28 s tras punto, 0,38 s tras pregunta): la voz
    respira entre ideas en lugar de encadenarlo todo con la misma entonación.
  · Tratamiento suave de locutor: corte de graves, algo de cuerpo, presencia y compresión ligera.
"""
import json, os, re, subprocess, sys, wave
import numpy as np

PAUSA = {'.': 0.28, '?': 0.38, '!': 0.32, ':': 0.18}
# Locutor: quita retumbe, da cuerpo y presencia y empareja niveles sin apretar la dinámica
FILTRO = 'highpass=f=70,equalizer=f=180:t=q:w=1:g=1.5,equalizer=f=3200:t=q:w=1.2:g=2,acompressor=threshold=0.12:ratio=2.5:attack=8:release=120:makeup=1.4'


def frases(t):
    # Corta tras . ? ! : seguidos de espacio, sin partir abreviaturas cortas ni números con punto
    partes = re.split(r'(?<=[.?!:])\s+(?=[¿¡A-ZÁÉÍÓÚÑ])', t.strip())
    return [p for p in partes if p.strip()]


def kokoro(modelo, voces, P):
    from kokoro_onnx import Kokoro
    k = Kokoro(modelo, voces)
    nombre, vel = P.get('voz_nombre', 'em_alex'), float(P.get('velocidad_voz', 1.0))
    def decir(f):
        a, sr = k.create(f, voice=nombre, speed=vel, lang='es')
        return np.asarray(a, dtype=np.float32), sr
    return decir


def piper(modelo, P):
    from piper import PiperVoice
    try:
        from piper import SynthesisConfig
    except ImportError:
        SynthesisConfig = None
    voz, vel = PiperVoice.load(modelo), float(P.get('velocidad_voz', 1.0))
    cfg = SynthesisConfig(length_scale=1.0 / vel) if SynthesisConfig and vel != 1.0 else None
    def decir(f):
        import io
        b = io.BytesIO()
        with wave.open(b, 'wb') as w:
            voz.synthesize_wav(f, w, syn_config=cfg) if cfg else voz.synthesize_wav(f, w)
        b.seek(0)
        with wave.open(b) as w:
            sr, a = w.getframerate(), np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
        return a, sr
    return decir


def recortar(a, umbral=0.01):
    # Quita el silencio de los extremos de cada frase para que la pausa sea la que decidimos
    i = np.where(np.abs(a) > umbral)[0]
    return a[max(0, i[0] - 2400):i[-1] + 2400] if len(i) else a  # 100 ms de margen: no comerse el arranque de la frase


def main():
    if len(sys.argv) < 4:
        sys.exit(__doc__)
    promo, work, modelo = sys.argv[1:4]
    voces = sys.argv[4] if len(sys.argv) > 4 else None
    os.makedirs(work, exist_ok=True)
    P = json.load(open(promo, encoding='utf-8'))
    usar_kokoro = voces and P.get('motor', 'kokoro') == 'kokoro'
    decir = kokoro(modelo, voces, P) if usar_kokoro else piper(modelo, P)
    out = []
    for i, b in enumerate(P['bloques']):
        t = (b.get('voz') or '').strip()
        if not t:
            out.append({'bloque': i, 'archivo': None, 'dur': 0})
            continue
        trozos, sr = [], 24000
        fs = frases(t)
        for j, f in enumerate(fs):
            a, sr = decir(f)
            trozos.append(recortar(a))
            if j < len(fs) - 1:
                trozos.append(np.zeros(int(sr * PAUSA.get(f.rstrip()[-1], 0.22)), dtype=np.float32))
        crudo = os.path.join(work, f'voz-{i}.crudo.wav')
        import soundfile as sf
        sf.write(crudo, np.concatenate(trozos), sr)
        f = os.path.join(work, f'voz-{i}.wav')
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', crudo, '-af', FILTRO, '-ar', '48000', f], check=True)
        os.remove(crudo)
        dur = float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).decode())
        out.append({'bloque': i, 'archivo': f, 'dur': round(dur, 3)})
        print(f'bloque {i}: {dur:.1f} s ({len(fs)} frases)')
    json.dump(out, open(os.path.join(work, 'voz.json'), 'w'), indent=1)
    print('total voz', round(sum(x['dur'] for x in out), 1), 's', '· Kokoro' if usar_kokoro else '· Piper')


if __name__ == '__main__':
    main()
