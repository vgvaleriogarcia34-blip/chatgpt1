// Servidor del asistente: webhooks de Twilio (voz) y Meta (WhatsApp), flujo de audio en WebSocket, panel y API interna.
// Cada módulo aporta sus rutas: { metodo, ruta (string exacta o RegExp), fn(req, res, ctx) } y, si lo necesita, ws(ruta, fn).
import http from 'node:http';
import { WebSocketServer } from 'ws';
import { C } from './config.js';
import * as db from './almacen/db.js';

const RUTAS = [];
const WS = [];
export function ruta(metodo, r, fn) { RUTAS.push({ metodo, r, fn }); }
export function rutaWs(r, fn) { WS.push({ r, fn }); }

const MAX_CUERPO = 2 * 1024 * 1024;
export function leerCuerpo(req) {
  return new Promise((ok, ko) => {
    const partes = []; let n = 0;
    req.on('data', (c) => { n += c.length; if (n > MAX_CUERPO) { ko(Object.assign(new Error('Cuerpo demasiado grande'), { codigo: 413 })); req.destroy(); } else partes.push(c); });
    req.on('end', () => ok(Buffer.concat(partes)));
    req.on('error', ko);
  });
}
export function enviar(res, codigo, cuerpo, tipo) {
  const esTexto = typeof cuerpo === 'string' || Buffer.isBuffer(cuerpo);
  res.writeHead(codigo, { 'Content-Type': tipo || (esTexto ? 'text/plain; charset=utf-8' : 'application/json; charset=utf-8'), 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(esTexto ? cuerpo : JSON.stringify(cuerpo));
}

const casa = (r, p) => (typeof r === 'string' ? (r === p ? [] : null) : p.match(r));

export function crearServidor() {
  const srv = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://x');
      if (url.pathname === '/salud') return enviar(res, 200, { ok: true, version: '0.1.0' });
      for (const x of RUTAS) {
        if (x.metodo !== req.method) continue;
        const m = casa(x.r, url.pathname);
        if (m) return await x.fn(req, res, { url, params: m.slice?.(1) || [] });
      }
      enviar(res, 404, { error: 'No encontrado' });
    } catch (err) {
      console.error('[http]', err);
      if (!res.headersSent) enviar(res, err.codigo || 500, { error: err.codigo ? err.message : 'Error interno' });
    }
  });
  const wss = new WebSocketServer({ noServer: true });
  srv.on('upgrade', (req, socket, head) => {
    const url = new URL(req.url, 'http://x');
    const x = WS.find((w) => casa(w.r, url.pathname));
    if (!x) return socket.destroy();
    wss.handleUpgrade(req, socket, head, (ws) => x.fn(ws, req, url));
  });
  return srv;
}

// Carga de módulos: cada uno registra sus rutas y sus herramientas al importarse
export async function cargarModulos() {
  const mods = ['./voz/rutas.js', './whatsapp/rutas.js', './crm/hubspot.js', './agenda/google-calendar.js', './conocimiento/buscar.js', './prospeccion/rutas.js', './panel/rutas.js', './conservacion.js'];
  for (const m of mods) {
    try { await import(m); } catch (err) { if (err.code === 'ERR_MODULE_NOT_FOUND' && err.message.includes(m.slice(2))) console.warn(`  módulo ${m} no presente`); else throw err; }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  // Sin await de nivel superior: los módulos importan este archivo, y un await aquí los dejaría esperando para siempre
  db.abrir();
  cargarModulos().then(() => {
    const srv = crearServidor();
    srv.listen(C.puerto, () => console.log(`Asistente de ${C.empresa.nombre} escuchando en :${C.puerto} · URL pública: ${C.urlPublica || '(sin configurar)'}`));
    const parar = () => { console.log('Cerrando…'); srv.close(); db.cerrar(); process.exit(0); };
    process.on('SIGTERM', parar); process.on('SIGINT', parar);
  }, (err) => { console.error('No se pudieron cargar los módulos:', err); process.exit(1); });
}
