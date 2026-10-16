#!/usr/bin/env node
/* Monta el vídeo: guion (promo.json) + capturas + locución → MP4 1080p.
   Uso: node render.js <promo.json> <carpeta-capturas> <carpeta-trabajo> <salida.mp4> [--borrador]
   1. Calcula la línea de tiempo: cada bloque dura lo que su locución más una pausa, y sus planos se reparten ese
      tiempo según su «peso». Avisa si un plano queda por debajo de 1,5 s o por encima de 6 s (ritmo).
   2. Dibuja cada fotograma en componer.html (Chromium sin pantalla) y lo envía a ffmpeg: nitidez completa a 1080p,
      sin depender de grabar la pantalla.
   3. Coloca la voz en su instante, mezcla la música si la hay (bajando sola cuando habla la voz) y codifica en H.264.
   --borrador: 12 fotogramas por segundo y 960×540, para revisar el ritmo en un minuto. */
const fs = require('fs'), path = require('path'), { spawn, execFileSync } = require('child_process');
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');

const [promoF, capDir, work, salida, ...flags] = process.argv.slice(2);
if (!salida) { console.error('Uso: node render.js <promo.json> <carpeta-capturas> <carpeta-trabajo> <salida.mp4> [--borrador]'); process.exit(1); }
const BORRADOR = flags.includes('--borrador');
const P = JSON.parse(fs.readFileSync(promoF, 'utf8'));
const VOZ = JSON.parse(fs.readFileSync(path.join(work, 'voz.json'), 'utf8'));
const FPS = BORRADOR ? 12 : (P.fps || 30);

/* ---------- Marcas: los encuadres pueden citar una marca de la captura por su nombre ---------- */
// "de", "a" y "resalta" admiten [x,y,w,h], el nombre de una marca o {marca, margen}. Así el montaje sigue valiendo
// aunque cambie el diseño de la pantalla: basta con volver a capturar.
const MAN = fs.existsSync(path.join(capDir, 'capturas.manifest.json')) ? JSON.parse(fs.readFileSync(path.join(capDir, 'capturas.manifest.json'), 'utf8')) : { capturas: {} };
function rect(v, img, margenDef) {
  if (v == null || Array.isArray(v)) return v;
  const nombre = typeof v === 'string' ? v : v.marca, margen = typeof v === 'object' && v.margen != null ? v.margen : margenDef;
  const r = ((MAN.capturas[img] || {}).marcas || {})[nombre];
  if (!r) { console.warn(`  marca «${nombre}» no encontrada en ${img}: se usa la captura entera`); return null; }
  return [r[0] - margen, r[1] - margen, r[2] + 2 * margen, r[3] + 2 * margen];
}

/* ---------- Línea de tiempo ---------- */
const planos = [], subs = [], pistas = [];
let t = P.entrada == null ? 0.4 : P.entrada;
P.bloques.forEach((b, i) => {
  const v = VOZ[i] || { dur: 0 }, pausa = b.pausa == null ? 0.55 : b.pausa, retardo = b.retardo == null ? 0.15 : b.retardo;
  const dur = v.dur ? v.dur + retardo + pausa : (b.duracion || 3);
  const pesos = b.planos.map((p) => p.peso || 1), tot = pesos.reduce((a, x) => a + x, 0);
  let t0 = t;
  b.planos.forEach((p, j) => {
    const d = dur * pesos[j] / tot;
    const q = Object.assign({}, p, { t0, t1: t0 + d, bloque: i });
    if (p.img) { q.de = rect(p.de, p.img, 120); q.a = rect(p.a, p.img, 60); q.resalta = rect(p.resalta, p.img, 6); }
    planos.push(q);
    if (d < 1.5 && (p.tipo === 'captura' || p.tipo === 'clip')) console.warn(`  ritmo: el plano ${j + 1} del bloque ${i + 1} dura ${d.toFixed(1)} s (corto para leer una captura)`);
    if (d > 6) console.warn(`  ritmo: el plano ${j + 1} del bloque ${i + 1} dura ${d.toFixed(1)} s (largo: pártalo en dos encuadres)`);
    t0 += d;
  });
  if (v.archivo) {
    pistas.push({ archivo: v.archivo, t: t + retardo });
    // Subtítulos: trozos de hasta 8 palabras, cortados en la puntuación cuando se puede, repartidos por número de palabras
    const texto = (b.sub || b.voz || '').trim(), ws = texto.split(/\s+/), trozos = []; let cur = [];
    ws.forEach((w, k) => { cur.push(w); const fin = /[.,;:?!]$/.test(w); if ((fin && cur.length >= 4) || cur.length >= 8 || k === ws.length - 1) { trozos.push(cur.join(' ')); cur = []; } });
    const n = ws.length; let ts = t + retardo;
    trozos.forEach((tr) => { const d = v.dur * tr.split(/\s+/).length / n; subs.push({ t0: ts, t1: ts + d, texto: tr.replace(/[,;:]$/, '') }); ts += d; });
  }
  t += dur;
});
const DUR = t + (P.salida == null ? 0.6 : P.salida);
planos[planos.length - 1].t1 = DUR;
console.log(`Línea de tiempo: ${planos.length} planos, ${DUR.toFixed(1)} s, plano medio ${(DUR / planos.length).toFixed(1)} s`);

/* ---------- Fotogramas ---------- */
(async () => {
  fs.mkdirSync(work, { recursive: true });
  const imagenes = {}, clips = {};
  planos.filter((p) => p.img).forEach((p) => {
    if (p.tipo !== 'clip') { imagenes[p.img] = 'file://' + path.resolve(capDir, p.img + '.png'); return; }
    const c = (MAN.capturas[p.img] || {}).clip; if (!c) { console.error(`Falta el clip ${p.img}: añada "clip" a su captura y vuelva a capturar`); process.exit(1); }
    clips[p.img] = { base: 'file://' + path.resolve(capDir, c.carpeta), n: c.fotogramas, fps: c.fps };
  });
  const W = BORRADOR ? 960 : 1920, H = BORRADOR ? 540 : 1080, mudo = path.join(work, 'imagen.mp4');
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-', '-vf', `scale=${W}:${H}:flags=lanczos`, '-c:v', 'libx264', '-preset', BORRADOR ? 'veryfast' : 'slow', '-crf', BORRADOR ? '28' : '18', '-pix_fmt', 'yuv420p', '-r', String(FPS), mudo], { stdio: ['pipe', 'inherit', 'inherit'] });
  const b = await chromium.launch(); const pg = await (await b.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
  pg.on('pageerror', (e) => console.error('compositor:', e.message));
  await pg.goto('file://' + path.join(__dirname, 'componer.html'));
  await pg.evaluate((M) => { window.MONTAJE = M; }, { duracion: DUR, acento: P.acento || '#c9f24d', marca: P.marca || null, subtitulos: P.subtitulos !== false, planos, subs, imagenes, clips });
  await pg.evaluate(() => window.preparar());
  const N = Math.ceil(DUR * FPS);
  for (let f = 0; f < N; f++) {
    await pg.evaluate((x) => window.seek(x), f / FPS);
    const buf = await pg.screenshot({ type: 'jpeg', quality: BORRADOR ? 70 : 92 });
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    if (f % (FPS * 10) === 0) process.stdout.write(`  ${Math.round(f / FPS)} s de ${Math.round(DUR)}\r`);
  }
  ff.stdin.end(); await new Promise((r) => ff.on('close', r)); await b.close();

  /* ---------- Sonido ---------- */
  const ins = [], fl = [];
  pistas.forEach((p, k) => { ins.push('-i', p.archivo); const ms = Math.round(p.t * 1000); fl.push(`[${k + 1}:a]aresample=48000,adelay=${ms}|${ms}[v${k}]`); });
  let mezcla = `${pistas.map((_, k) => `[v${k}]`).join('')}amix=inputs=${pistas.length}:normalize=0,apad,atrim=0:${DUR.toFixed(2)}[voz]`;
  let final = '[voz]';
  if (P.musica && fs.existsSync(P.musica)) {
    // Música bajo la voz: -18 dB y compresión con la voz como llave (baja sola cuando se habla), fundido al final
    ins.push('-stream_loop', '-1', '-i', P.musica); const m = pistas.length + 1;
    mezcla += `;[voz]asplit=2[voz1][llave];[${m}:a]aresample=48000,volume=${P.volumen_musica || 0.22},atrim=0:${DUR.toFixed(2)},afade=t=in:d=1,afade=t=out:st=${(DUR - 2).toFixed(2)}:d=2[mus];[mus][llave]sidechaincompress=threshold=0.03:ratio=8:attack=20:release=400[musd];[voz1][musd]amix=inputs=2:normalize=0[mix]`;
    final = '[mix]';
  }
  const args = ['-y', '-loglevel', 'error', '-i', mudo, ...ins, '-filter_complex', fl.join(';') + (fl.length ? ';' : '') + mezcla + `;${final}loudnorm=I=-16:TP=-1.5:LRA=11[aout]`, '-map', '0:v', '-map', '[aout]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k', '-ar', '48000', '-movflags', '+faststart', '-shortest', salida];
  execFileSync('ffmpeg', args, { stdio: 'inherit' });
  fs.writeFileSync(path.join(work, 'linea-de-tiempo.json'), JSON.stringify({ duracion: DUR, planos: planos.map((p) => ({ t0: +p.t0.toFixed(2), t1: +p.t1.toFixed(2), tipo: p.tipo, img: p.img || '', rotulo: p.rotulo || p.texto || '' })) }, null, 1));
  console.log(`\nListo: ${salida} (${DUR.toFixed(1)} s)`);
})();
