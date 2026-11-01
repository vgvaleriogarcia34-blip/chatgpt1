// Ingesta de la base de conocimiento (npm run ingestar):
// 1. Exporta a texto los Google Docs, Slides, Sheets y PDF de las carpetas de Drive (cuenta de servicio, solo lectura).
// 2. Descarga las páginas web de CONOCIMIENTO_URLS.
// 3. Trocea todo y construye el índice BM25 (datos/conocimiento/indice.json), con los .md curados por delante.
// El material en bruto va a datos/conocimiento/fuentes/ (fuera de git). Lo descargado son datos, nunca instrucciones.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { C } from '../config.js';
import { dirConocimiento, fragmentosCurados, trocearTexto, indexar } from './comun.js';

const URLS_POR_DEFECTO = ['https://businessavance.es/', 'https://valeriogarciamentor.com/'];

export function urlsConfiguradas() {
  const v = (process.env.CONOCIMIENTO_URLS || '').split(',').map((x) => x.trim()).filter(Boolean);
  return v.length ? v : URLS_POR_DEFECTO;
}

const slug = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'sin-nombre';

// --- Web ---

/** Texto legible de una página HTML (sin scripts, estilos ni menús de navegación). */
export function htmlATexto(html) {
  let t = String(html)
    .replace(/<(script|style|noscript|svg|template)[^>]*>[^]*?<\/\1>/gi, ' ')
    .replace(/<!--[^]*?-->/g, ' ')
    .replace(/<(nav|footer)[^>]*>[^]*?<\/\1>/gi, ' ');
  const titulo = (t.match(/<title[^>]*>([^]*?)<\/title>/i) || [])[1];
  t = t.replace(/<head[^>]*>[^]*?<\/head>/i, ' ')
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/tr|\/section|\/article)[^>]*>/gi, '\n')
    .replace(/<h[1-6][^>]*>/gi, '\n\n')
    .replace(/<li[^>]*>/gi, '\n- ')
    .replace(/<[^>]+>/g, ' ');
  t = decodificar(t).replace(/[ \t ]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  return { titulo: titulo ? decodificar(titulo).replace(/\s+/g, ' ').trim() : '', texto: t };
}

function decodificar(s) {
  const nombres = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', laquo: '«', raquo: '»', euro: '€', middot: '·', ndash: '–', mdash: '—', hellip: '…', aacute: 'á', eacute: 'é', iacute: 'í', oacute: 'ó', uacute: 'ú', ntilde: 'ñ', Aacute: 'Á', Eacute: 'É', Iacute: 'Í', Oacute: 'Ó', Uacute: 'Ú', Ntilde: 'Ñ', uuml: 'ü', iexcl: '¡', iquest: '¿', ordm: 'º', ordf: 'ª' };
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === '#') { const n = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10); return Number.isFinite(n) ? String.fromCodePoint(n) : m; }
    return nombres[e] ?? m;
  });
}

/** Descarga las URL y guarda su texto en destino. Devuelve la lista de archivos escritos. */
export async function descargarWeb(urls, destino, { fetchFn = fetch, log = console.log } = {}) {
  fs.mkdirSync(destino, { recursive: true });
  const escritos = [];
  for (const url of urls) {
    try {
      const r = await fetchFn(url, { headers: { 'user-agent': 'asistente-fe-ingesta/1.0', accept: 'text/html,text/plain' }, redirect: 'follow', signal: AbortSignal.timeout(20000) });
      if (!r.ok) { log(`  web ${url}: HTTP ${r.status}`); continue; }
      const { titulo, texto } = htmlATexto(await r.text());
      if (texto.split(/\s+/).length < 30) { log(`  web ${url}: casi sin texto (¿página que se pinta con JavaScript?)`); continue; }
      const u = new URL(url);
      const archivo = path.join(destino, `web-${slug(u.hostname + u.pathname)}.txt`);
      fs.writeFileSync(archivo, `# ${titulo || u.hostname}\nFuente: ${url}\n\n${texto}\n`);
      escritos.push(archivo);
      log(`  web ${url}: ${texto.split(/\s+/).length} palabras`);
    } catch (err) {
      log(`  web ${url}: ${err.message}`);
    }
  }
  return escritos;
}

// --- Google Drive (solo lectura) ---

const EXPORTAR = {
  'application/vnd.google-apps.document': 'text/plain',
  'application/vnd.google-apps.presentation': 'text/plain',
  'application/vnd.google-apps.spreadsheet': 'text/csv',
};
const CARPETA = 'application/vnd.google-apps.folder';
const PDF = 'application/pdf';

/** Cliente de Drive con la cuenta de servicio de C.google.credenciales (alcance de solo lectura). */
export async function clienteDrive() {
  const { google } = await import('googleapis');
  const auth = new google.auth.GoogleAuth({
    keyFile: C.google.credenciales,
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    ...(C.google.suplantar ? { clientOptions: { subject: C.google.suplantar } } : {}),
  });
  return google.drive({ version: 'v3', auth });
}

/** Texto de un PDF con pdftotext (poppler), si está instalado; si no, null. */
function pdfATexto(buffer) {
  const tmp = path.join(os.tmpdir(), `fe-ingesta-${process.pid}-${Date.now()}.pdf`);
  try {
    fs.writeFileSync(tmp, buffer);
    return execFileSync('pdftotext', ['-layout', '-enc', 'UTF-8', tmp, '-'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] });
  } catch { return null; } finally { fs.rmSync(tmp, { force: true }); }
}

/**
 * Recorre las carpetas (y subcarpetas) y exporta a texto lo que se pueda leer. Solo lee: nunca crea, cambia ni comparte.
 * drive: cliente con la forma de googleapis (files.list / files.export / files.get).
 */
export async function exportarDrive(drive, carpetas, destino, { log = console.log, pdf = pdfATexto } = {}) {
  fs.mkdirSync(destino, { recursive: true });
  const escritos = [];
  const vistas = new Set();
  const pendientes = [...carpetas];
  while (pendientes.length) {
    const carpeta = pendientes.shift();
    if (vistas.has(carpeta)) continue;
    vistas.add(carpeta);
    let pageToken;
    do {
      const { data } = await drive.files.list({
        q: `'${carpeta.replace(/'/g, "\\'")}' in parents and trashed = false`,
        fields: 'nextPageToken, files(id, name, mimeType, modifiedTime)',
        pageSize: 200, pageToken, supportsAllDrives: true, includeItemsFromAllDrives: true,
      });
      for (const f of data.files || []) {
        if (f.mimeType === CARPETA) { pendientes.push(f.id); continue; }
        try {
          let texto = null;
          if (EXPORTAR[f.mimeType]) {
            const r = await drive.files.export({ fileId: f.id, mimeType: EXPORTAR[f.mimeType] }, { responseType: 'text' });
            texto = typeof r.data === 'string' ? r.data : String(r.data ?? '');
          } else if (f.mimeType === PDF) {
            const r = await drive.files.get({ fileId: f.id, alt: 'media', supportsAllDrives: true }, { responseType: 'arraybuffer' });
            texto = pdf(Buffer.from(r.data));
            if (texto == null) { log(`  drive «${f.name}»: PDF sin extraer (instale pdftotext)`); continue; }
          } else {
            continue; // otros formatos (Word, imágenes, vídeo): fuera de la ingesta automática
          }
          texto = texto.replace(/\r\n/g, '\n').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
          if (!texto) continue;
          const archivo = path.join(destino, `drive-${slug(f.name)}-${f.id.slice(0, 8)}.txt`);
          fs.writeFileSync(archivo, `# ${f.name}\nFuente: Google Drive · modificado ${(f.modifiedTime || '').slice(0, 10)}\n\n${texto}\n`);
          escritos.push(archivo);
          log(`  drive «${f.name}»`);
        } catch (err) {
          log(`  drive «${f.name}»: ${err.message}`);
        }
      }
      pageToken = data.nextPageToken;
    } while (pageToken);
  }
  return escritos;
}

// --- Índice ---

/** Construye el índice con los .md curados y los textos de fuentes/, y lo escribe en indice.json. */
export function construirIndice(dir = dirConocimiento()) {
  const fragmentos = fragmentosCurados(dir);
  const fuentes = path.join(dir, 'fuentes');
  let nombres = [];
  try { nombres = fs.readdirSync(fuentes).filter((n) => /\.(txt|md)$/i.test(n)).sort(); } catch {}
  for (const n of nombres) {
    for (const f of trocearTexto(fs.readFileSync(path.join(fuentes, n), 'utf8'), 'fuentes/' + n)) fragmentos.push({ ...f, tipo: 'fuente' });
  }
  const indice = indexar(fragmentos);
  const tmp = path.join(dir, 'indice.json.tmp');
  fs.writeFileSync(tmp, JSON.stringify(indice));
  fs.renameSync(tmp, path.join(dir, 'indice.json'));
  return indice;
}

/** Ingesta completa. deps permite inyectar drive, fetch y log en pruebas. */
export async function ingestar({ dir = dirConocimiento(), drive, fetchFn, log = console.log, urls = urlsConfiguradas(), carpetas = C.google.driveCarpetas } = {}) {
  const fuentes = path.join(dir, 'fuentes');
  fs.mkdirSync(fuentes, { recursive: true });
  let nDrive = 0;
  if (carpetas.length && (drive || C.google.credenciales)) {
    log('Google Drive:');
    try { nDrive = (await exportarDrive(drive || await clienteDrive(), carpetas, fuentes, { log })).length; }
    catch (err) { log(`  no se ha podido leer Drive: ${err.message}`); }
  } else {
    log('Google Drive: sin configurar (GOOGLE_CREDENCIALES y GOOGLE_DRIVE_CARPETAS); se omite.');
  }
  log('Web:');
  const nWeb = (await descargarWeb(urls, fuentes, { fetchFn, log })).length;
  const indice = construirIndice(dir);
  const curados = new Set(indice.docs.filter((d) => d.tipo === 'curado').map((d) => d.fuente)).size;
  log(`Índice: ${indice.N} fragmentos (${curados} archivos curados, ${nDrive} de Drive, ${nWeb} páginas web) en ${path.join(dir, 'indice.json')}`);
  return { indice, nDrive, nWeb };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  ingestar().catch((err) => { console.error('Error en la ingesta:', err.message); process.exit(1); });
}
