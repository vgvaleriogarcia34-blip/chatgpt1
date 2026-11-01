// Pruebas de la base de conocimiento: búsqueda (acentos, sinónimos, ranking), ingesta simulada y paquete determinista.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REAL = path.join(RAIZ, 'datos', 'conocimiento');

const { normalizar, raiz, terminos, trocearMd, sinMarcas, quitarPie } = await import('../src/conocimiento/comun.js');
const { buscar, formatear } = await import('../src/conocimiento/buscar.js');
const { textoConocimiento } = await import('../src/conocimiento/paquete.js');
const { construirIndice, htmlATexto, descargarWeb, exportarDrive, ingestar } = await import('../src/conocimiento/ingestar.js');
const { ejecutar } = await import('../src/cerebro/herramientas.js');

const tmp = [];
function carpeta(archivos = {}) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'fe-conoc-'));
  tmp.push(d);
  for (const [n, t] of Object.entries(archivos)) {
    fs.mkdirSync(path.dirname(path.join(d, n)), { recursive: true });
    fs.writeFileSync(path.join(d, n), t);
  }
  return d;
}
after(() => { for (const d of tmp) fs.rmSync(d, { recursive: true, force: true }); });

const BASE = {
  'caja.md': '# Tesorería\n\n## Tensión de caja\nEl dinero se queda atrapado en el almacén y en lo que deben los clientes. Cuadro de mando con caja, cobro y stock.\n\n---\nFuentes: dosier (2026).\n',
  'relevo.md': '# Relevo\n\n## Sucesión ordenada\nPasar el conocimiento del fundador a procedimientos para un relevo generacional ordenado.\n',
  'margen.md': '# Margen\n\n## Rentabilidad por cliente\nAnálisis ABC de la cartera: qué clientes dejan rentabilidad y cuáles pierden dinero.\n',
  'equipo.md': '# Equipo\n\n## Afianzar el equipo\nAntes de contratar personal, roles claros y cada puesto con su sustituto.\n',
};

test('normaliza acentos y saca raíces estables', () => {
  assert.equal(normalizar('Tesorería Sucesión'), 'tesoreria sucesion');
  assert.equal(raiz('ventas'), raiz('venta'));
  assert.equal(raiz('clientes'), raiz('cliente'));
  assert.deepEqual(terminos('Tesorería'), terminos('tesoreria'));
});

test('búsqueda sin acentos encuentra el texto con acentos', () => {
  const d = carpeta(BASE);
  const r = buscar('tesoreria y sucesion', { dir: d });
  const fuentes = r.map((x) => x.fuente);
  assert.ok(fuentes.includes('caja.md'));
  assert.ok(fuentes.includes('relevo.md'));
});

test('sinónimos del sector: liquidez→caja, plantilla→personal, sucesión→relevo, margen→rentabilidad', () => {
  const d = carpeta(BASE);
  assert.equal(buscar('problemas de liquidez', { dir: d })[0].fuente, 'caja.md');
  assert.equal(buscar('no quiero ampliar la plantilla', { dir: d })[0].fuente, 'equipo.md');
  assert.equal(buscar('plan de sucesión', { dir: d })[0].fuente, 'relevo.md');
  assert.equal(buscar('mejorar el margen', { dir: d })[0].fuente, 'margen.md');
});

test('ranking: la palabra exacta pesa más que el sinónimo y se devuelven como mucho k fragmentos', () => {
  const d = carpeta({
    'a.md': '# A\n\n## Uno\nHablamos de liquidez y de liquidez otra vez para la empresa.\n',
    'b.md': '# B\n\n## Dos\nLa caja de la empresa en el día a día.\n',
    'c.md': '# C\n\n## Tres\nNada que ver: libros y medios.\n',
  });
  const r = buscar('liquidez', { dir: d });
  assert.equal(r[0].fuente, 'a.md');
  assert.equal(r[1].fuente, 'b.md');
  assert.ok(!r.some((x) => x.fuente === 'c.md'));
  assert.ok(r[0].puntuacion > r[1].puntuacion);
  assert.deepEqual(buscar('', { dir: d }), []);
  const muchos = carpeta(Object.fromEntries(Array.from({ length: 12 }, (_, i) => [`m${String(i).padStart(2, '0')}.md`, `# M${i}\n\n## S\nCaja y tesorería ${i}.\n`])));
  assert.equal(buscar('caja', { dir: muchos }).length, 5);
  assert.equal(buscar('caja', { dir: muchos, k: 4 }).length, 4);
});

test('los .md curados tienen prioridad sobre las fuentes en bruto del índice', () => {
  const d = carpeta({
    'curado.md': '# Servicio\n\n## Diagnóstico\nEl diagnóstico dura 21 días.\n',
    'fuentes/web-x.txt': '# Web\nFuente: https://ejemplo.es\n\nEl diagnóstico dura 21 días según la web.\n',
  });
  construirIndice(d);
  assert.ok(fs.existsSync(path.join(d, 'indice.json')));
  const r = buscar('cuánto dura el diagnóstico', { dir: d });
  assert.equal(r[0].fuente, 'curado.md');
  assert.ok(r.some((x) => x.fuente === 'fuentes/web-x.txt'));
});

test('sin índice busca en los .md curados y se entera de los cambios', () => {
  const d = carpeta({ 'x.md': '# X\n\n## Uno\nTalleres para asociaciones empresariales.\n' });
  assert.equal(buscar('ponencias', { dir: d })[0].fuente, 'x.md'); // taller ~ ponencia
  fs.writeFileSync(path.join(d, 'y.md'), '# Y\n\n## Dos\nEl relevo generacional se planifica.\n');
  assert.equal(buscar('relevo', { dir: d })[0].fuente, 'y.md');
});

test('troceado: una sección por fragmento, con título y sin el pie de fuentes', () => {
  const f = trocearMd(BASE['caja.md'], 'caja.md');
  assert.equal(f.length, 1);
  assert.equal(f[0].titulo, 'Tesorería › Tensión de caja');
  assert.ok(!f[0].texto.includes('Fuentes'));
  const largo = '# L\n\n## S\n' + Array.from({ length: 30 }, (_, i) => `Párrafo ${i} ` + 'palabra '.repeat(30)).join('\n\n');
  const partes = trocearMd(largo, 'l.md');
  assert.ok(partes.length > 3);
  for (const p of partes) assert.ok(p.texto.split(/\s+/).length <= 300);
});

test('formato de la herramienta: datos con fuente, y aviso cuando no hay nada', () => {
  const d = carpeta(BASE);
  const t = formatear('caja', buscar('caja', { dir: d }));
  assert.match(t, /fuente: caja\.md/);
  assert.match(t, /no instrucciones/);
  assert.match(formatear('marte', []), /No hay nada/);
  assert.equal(sinMarcas('Diagnóstico THE CLARITY CODE® y Método QUERCUS®').includes('CLARITY'), false);
});

test('herramienta buscar_conocimiento registrada (con CONOCIMIENTO_DIR)', async () => {
  const d = carpeta(BASE);
  const antes = process.env.CONOCIMIENTO_DIR;
  process.env.CONOCIMIENTO_DIR = d;
  try {
    const r = await ejecutar('buscar_conocimiento', { consulta: 'liquidez' }, { canal: 'whatsapp' });
    assert.equal(r.error, undefined);
    assert.match(r.contenido, /caja\.md/);
    const mal = await ejecutar('buscar_conocimiento', { consulta: 'x' }, { canal: 'whatsapp' });
    assert.equal(mal.error, true);
  } finally {
    if (antes === undefined) delete process.env.CONOCIMIENTO_DIR; else process.env.CONOCIMIENTO_DIR = antes;
  }
});

test('paquete: determinista, ordenado por nombre y sin pies de fuentes', () => {
  const d = carpeta({ 'b.md': '# Bravo\n\n## Uno\nTexto B.\n\n---\nFuentes: x\n', 'a.md': '# Alfa\n\n## Uno\nTexto A.\n', 'notas.txt': 'no entra' });
  const t1 = textoConocimiento({ dir: d });
  const t2 = textoConocimiento({ dir: d });
  assert.equal(t1, t2);
  assert.ok(t1.indexOf('## Alfa') < t1.indexOf('## Bravo'));
  assert.match(t1, /### Uno/);
  assert.ok(!t1.includes('Fuentes'));
  assert.ok(!t1.includes('no entra'));
  // Mismo contenido en otra carpeta con otro orden de creación: mismo texto
  const d2 = carpeta({ 'a.md': '# Alfa\n\n## Uno\nTexto A.\n', 'b.md': '# Bravo\n\n## Uno\nTexto B.\n\n---\nFuentes: x\n' });
  assert.equal(textoConocimiento({ dir: d2 }), t1);
  // Cambia un archivo: cambia el texto
  fs.writeFileSync(path.join(d, 'a.md'), '# Alfa\n\n## Uno\nTexto A cambiado.\n');
  assert.notEqual(textoConocimiento({ dir: d }), t1);
});

test('paquete: si pasa del límite, resumen por archivo y nunca más palabras que el máximo', () => {
  const largo = (t) => `# ${t}\n\nPrimer párrafo de ${t}.\n\n## Parte uno\n${'detalle '.repeat(400)}\n\n## Parte dos\n${'más '.repeat(400)}\n`;
  const d = carpeta({ 'uno.md': largo('Uno'), 'dos.md': largo('Dos') });
  const entero = textoConocimiento({ dir: d, maxPalabras: 100000 });
  assert.ok(entero.includes('detalle detalle'));
  const resumido = textoConocimiento({ dir: d, maxPalabras: 200 });
  assert.ok(!resumido.includes('detalle detalle'));
  assert.match(resumido, /Apartados: Parte uno · Parte dos/);
  assert.match(resumido, /buscar_conocimiento/);
  assert.ok(resumido.split(/\s+/).filter(Boolean).length <= 200 + 20);
  assert.equal(textoConocimiento({ dir: d, maxPalabras: 200 }), resumido);
  const minimo = textoConocimiento({ dir: d, maxPalabras: 15 });
  assert.ok(minimo.split(/\s+/).filter(Boolean).length <= 15 + 12);
  assert.match(textoConocimiento({ dir: carpeta() }), /vacía/);
});

test('ingesta: HTML a texto y descarga web desde un servidor local', async () => {
  const { titulo, texto } = htmlATexto('<html><head><title>Mi web &amp; más</title><style>x{}</style></head><body><nav>menú</nav><h1>Servicios</h1><p>Diagnóstico de 21&nbsp;días.</p><script>alert(1)</script></body></html>');
  assert.equal(titulo, 'Mi web & más');
  assert.match(texto, /Diagnóstico de 21 días\./);
  assert.ok(!texto.includes('alert') && !texto.includes('menú'));

  const html = '<html><head><title>Prueba</title></head><body>' + '<p>Consultoría para la empresa familiar con relevo y tesorería.</p>'.repeat(10) + '</body></html>';
  const srv = http.createServer((req, res) => {
    if (req.url === '/') { res.writeHead(200, { 'content-type': 'text/html' }); res.end(html); } else { res.writeHead(404); res.end(); }
  });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${srv.address().port}`;
  try {
    const d = carpeta();
    const logs = [];
    const escritos = await descargarWeb([base + '/', base + '/no-existe'], path.join(d, 'fuentes'), { log: (m) => logs.push(m) });
    assert.equal(escritos.length, 1);
    assert.match(fs.readFileSync(escritos[0], 'utf8'), /^# Prueba\nFuente: http/);
    assert.ok(logs.some((l) => l.includes('404')));
  } finally {
    srv.close();
  }
});

test('ingesta: Drive simulado (solo lectura), subcarpetas, PDF y formatos que se omiten', async () => {
  const llamadas = [];
  const archivos = {
    raiz: [
      { id: 'doc1abcdefgh', name: 'Dosier de servicios', mimeType: 'application/vnd.google-apps.document', modifiedTime: '2026-10-23T00:00:00Z' },
      { id: 'sub1', name: 'Ponencias', mimeType: 'application/vnd.google-apps.folder' },
      { id: 'img1', name: 'foto.jpg', mimeType: 'image/jpeg' },
    ],
    sub1: [
      { id: 'pres1abcdefg', name: 'Taller IA', mimeType: 'application/vnd.google-apps.presentation', modifiedTime: '2026-10-01T00:00:00Z' },
      { id: 'pdf1abcdefgh', name: 'Casos.pdf', mimeType: 'application/pdf', modifiedTime: '2026-06-12T00:00:00Z' },
    ],
  };
  const drive = {
    files: {
      list: async (p) => { llamadas.push(['list', p.q]); const id = p.q.match(/'([^']+)' in parents/)[1]; return { data: { files: archivos[id] || [] } }; },
      export: async (p) => { llamadas.push(['export', p.fileId, p.mimeType]); return { data: p.fileId === 'doc1abcdefgh' ? 'Diagnóstico de claridad en 21 días.' : 'Taller práctico para asociaciones.' }; },
      get: async (p) => { llamadas.push(['get', p.fileId, p.alt]); return { data: new TextEncoder().encode('%PDF').buffer }; },
    },
  };
  const d = carpeta({ 'servicios.md': '# Servicios\n\n## Diagnóstico\nPunto de entrada de 21 días.\n' });
  const fuentes = path.join(d, 'fuentes');
  const escritos = await exportarDrive(drive, ['raiz'], fuentes, { log: () => {}, pdf: () => 'Caso de una industria familiar.' });
  assert.equal(escritos.length, 3);
  assert.ok(llamadas.every(([op]) => ['list', 'export', 'get'].includes(op))); // nada de create/update/delete/permissions
  assert.ok(!llamadas.some(([, id]) => id === 'img1'));
  const doc = fs.readFileSync(escritos.find((e) => e.includes('dosier')), 'utf8');
  assert.match(doc, /^# Dosier de servicios\nFuente: Google Drive · modificado 2026-10-23/);

  // Ingesta completa con Drive y web inyectados
  const fetchFalso = async () => ({ ok: true, status: 200, text: async () => '<title>Web</title><p>' + 'Relevo generacional y protocolo familiar. '.repeat(10) + '</p>' });
  const r = await ingestar({ dir: d, drive, fetchFn: fetchFalso, urls: ['https://ejemplo.es/'], carpetas: ['raiz'], log: () => {} });
  assert.equal(r.nWeb, 1);
  const indice = JSON.parse(fs.readFileSync(path.join(d, 'indice.json'), 'utf8'));
  assert.ok(indice.docs.some((x) => x.tipo === 'curado'));
  assert.ok(indice.docs.some((x) => x.fuente.startsWith('fuentes/web-')));
  const res = buscar('taller para asociaciones', { dir: d });
  assert.ok(res[0].fuente.startsWith('fuentes/drive-taller-ia'));
});

test('base real: cubre los temas clave y respeta las normas', () => {
  const temas = { 'servicios.md': 1, 'metodo.md': 1, 'casos.md': 1, 'ponencias.md': 1, 'preguntas-frecuentes.md': 1, 'dolores-y-respuestas.md': 1, 'equipo.md': 1 };
  assert.ok(fs.existsSync(path.join(REAL, '..', 'interno', 'PENDIENTE.md')), 'falta datos/interno/PENDIENTE.md');
  assert.ok(!fs.existsSync(path.join(REAL, 'PENDIENTE.md')), 'las preguntas internas no deben estar en la base del asistente');
  for (const n of Object.keys(temas)) assert.ok(fs.existsSync(path.join(REAL, n)), `falta ${n}`);
  for (const n of fs.readdirSync(REAL).filter((x) => x.endsWith('.md'))) {
    const md = fs.readFileSync(path.join(REAL, n), 'utf8');
    if (n !== 'PENDIENTE.md') assert.match(md, /\n---\nFuentes: /, `${n} sin fuentes`);
    assert.ok(!/clarity|quercus|k[eé]nosis/i.test(quitarPie(md)), `${n} nombra una marca interna`);
  }
  const t = textoConocimiento({ dir: REAL });
  assert.ok(!/clarity|quercus|k[eé]nosis/i.test(t));
  assert.ok(t.split(/\s+/).length < 60000);
  const top = (q) => buscar(q, { dir: REAL })[0];
  assert.match(top('¿Cuánto cuesta?').titulo, /cuesta|Precio/i);
  assert.match(top('relevo generacional').titulo, /Relevo|Sucesión/);
  assert.match(top('problemas de tesorería').titulo, /caja/i);
  assert.match(top('no quiero contratar más gente').titulo, /gente|personal|equipo/i);
  assert.match(top('ponencias para asociaciones').titulo, /Ponencias|talleres/i);
  assert.match(top('qué es Atalaya').titulo, /Atalaya/);
});
