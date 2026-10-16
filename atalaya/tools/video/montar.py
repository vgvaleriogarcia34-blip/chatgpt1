# Une la grabación con la voz de cada escena en su instante: python3 montar.py <tmp> <media/video>
import json, subprocess, sys
SP = sys.argv[1]; MEDIA = sys.argv[2]
M = json.load(open(SP + '/marcas.json')); man = json.load(open(MEDIA + '/manifest.json'))
marcas = M['marcas']; inicio = marcas[0]['t'] - 1.0   # un segundo de portada antes de la primera voz
ins, filt = [], []
for k, m in enumerate(marcas):
    ins += ['-i', MEDIA + '/' + man['escenas'][m['id']]['archivo']]
    d = int(round((m['t'] - inicio) * 1000))
    filt.append(f'[{k + 1}:a]adelay={d}|{d}[a{k}]')
mix = ''.join(f'[a{k}]' for k in range(len(marcas))) + f'amix=inputs={len(marcas)}:normalize=0,apad[aout]'
dur = M['fin'] - inicio + 1.5
cmd = ['ffmpeg', '-y', '-loglevel', 'error', '-ss', f'{inicio:.3f}', '-i', M['video']] + ins + ['-filter_complex', ';'.join(filt) + ';' + mix,
       '-map', '0:v', '-map', '[aout]', '-t', f'{dur:.2f}', '-c:v', 'libx264', '-preset', 'slow', '-crf', '23', '-pix_fmt', 'yuv420p', '-r', '25',
       '-c:a', 'aac', '-b:a', '96k', '-ar', '44100', '-movflags', '+faststart', MEDIA + '/valdenorte-cambiar-el-rumbo.mp4']
subprocess.run(cmd, check=True)
print('ok', round(dur, 1), 's')
