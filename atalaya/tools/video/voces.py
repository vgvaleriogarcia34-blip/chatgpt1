# Genera la voz de cada escena con Piper: python3 voces.py <tmp> <media/video> <modelo.onnx>
import json, subprocess, sys, os, wave
from piper import PiperVoice
SP = sys.argv[1]; OUT = sys.argv[2]; os.makedirs(OUT, exist_ok=True)
voice = PiperVoice.load(sys.argv[3])
esc = json.load(open(SP + '/escenas.json')); man = {'voz': 'es_ES-davefx-medium (Piper)', 'escenas': {}}
for e in esc:
    wav = f"{SP}/vtmp-{e['id']}.wav"
    with wave.open(wav, 'wb') as w:
        voice.synthesize_wav(e['voz'], w)
    mp3 = f"escena-{e['id']}.mp3"
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav, '-ac', '1', '-b:a', '64k', OUT + '/' + mp3], check=True)
    dur = float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', OUT + '/' + mp3]).decode().strip())
    man['escenas'][e['id']] = {'archivo': mp3, 'dur': round(dur, 3), 'h': e['h']}
    print(e['id'], round(dur, 1))
json.dump(man, open(OUT + '/manifest.json', 'w'), ensure_ascii=False, indent=1)
print('total', round(sum(x['dur'] for x in man['escenas'].values()), 1))
