// Panel de control en /panel: resumen, conversaciones, campañas, bajas y lista Robinson, recarga del conocimiento
// y prueba del asistente por texto. API JSON bajo /panel/api/*. Sin PANEL_CLAVE, el panel está desactivado.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ruta, leerCuerpo, enviar } from '../servidor.js';
import { C } from '../config.js';
import * as db from '../almacen/db.js';
import { panelActivo, comprobarCredenciales, crearCookie, cabeceraCookie, sesion, bloqueado, anotarFallo, limpiarFallos } from './sesion.js';
import * as campanas from '../prospeccion/campanas.js';
import { importarRobinsonCSV, horaLocal, BASES } from '../prospeccion/cumplimiento.js';

const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'publico');

/** Escapa texto para meterlo en HTML. Todo lo que viene de la base de datos pasa por aquí (o por textContent en el navegador). */
export function escapar(s) {
  return String(s ?? '').replace(/[&<>"'`]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;' })[c]);
}

const CABECERAS_HTML = {
  'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY', 'Referrer-Policy': 'no-referrer',
  'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
};
function html(res, codigo, cuerpo, extra = {}) { res.writeHead(codigo, { ...CABECERAS_HTML, ...extra }); res.end(cuerpo); }

const pagina = (titulo, cuerpo, conScript = false) => `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapar(titulo)}</title><link rel="stylesheet" href="/panel/panel.css">${conScript ? '<script src="/panel/panel.js" defer></script>' : ''}</head>
<body>${cuerpo}</body></html>`;

const DESACTIVADO = pagina('Panel desactivado', '<main class="estrecho"><h1>Panel desactivado</h1><p>Para activarlo, configure la variable PANEL_CLAVE (y, si quiere, PANEL_USUARIO) y reinicie el servidor.</p></main>');

const login = (error = '') => pagina('Acceso al panel', `<main class="estrecho">
<h1>${escapar(C.empresa.nombre)}</h1><p>Panel del asistente. Introduzca sus datos de acceso.</p>
${error ? `<p class="error" role="alert">${escapar(error)}</p>` : ''}
<form method="post" action="/panel/entrar" class="tarjeta">
<label>Usuario <input name="usuario" autocomplete="username" required></label>
<label>Contraseña <input name="clave" type="password" autocomplete="current-password" required></label>
<button type="submit">Entrar</button></form></main>`);

const app = () => pagina(`Panel · ${C.empresa.nombre}`, `<header class="cabecera"><strong>${escapar(C.empresa.nombre)}</strong> · asistente ${escapar(C.empresa.asistente)}
<form method="post" action="/panel/salir"><button class="enlace" type="submit">Salir</button></form></header>
<nav id="pestanas"></nav><main id="contenido"><p>Cargando…</p></main>`, true);

// ---------- Páginas y acceso ----------
ruta('GET', /^\/panel\/?$/, async (req, res) => {
  if (!panelActivo()) return html(res, 503, DESACTIVADO);
  html(res, 200, sesion(req) ? app() : login());
});
ruta('GET', /^\/panel\/(panel\.css|panel\.js)$/, async (req, res, { params }) => {
  if (!panelActivo()) return html(res, 503, DESACTIVADO);
  if (params[0] === 'panel.js' && !sesion(req)) return enviar(res, 401, { error: 'Inicie sesión' });
  const tipo = params[0].endsWith('.css') ? 'text/css; charset=utf-8' : 'text/javascript; charset=utf-8';
  enviar(res, 200, fs.readFileSync(path.join(DIR, params[0])), tipo);
});
ruta('POST', '/panel/entrar', async (req, res) => {
  if (!panelActivo()) return html(res, 503, DESACTIVADO);
  if (bloqueado(req)) return html(res, 429, login('Demasiados intentos. Espere quince minutos.'));
  const f = new URLSearchParams((await leerCuerpo(req)).toString());
  if (!comprobarCredenciales(f.get('usuario'), f.get('clave'))) { anotarFallo(req); return html(res, 401, login('Usuario o contraseña incorrectos.')); }
  limpiarFallos(req);
  res.writeHead(303, { Location: '/panel', 'Set-Cookie': cabeceraCookie(req, crearCookie(f.get('usuario'))), 'Cache-Control': 'no-store' });
  res.end();
});
ruta('POST', '/panel/salir', async (req, res) => {
  res.writeHead(303, { Location: '/panel', 'Set-Cookie': cabeceraCookie(req, ''), 'Cache-Control': 'no-store' });
  res.end();
});

// Transcripción imprimible (HTML generado en el servidor, todo escapado)
ruta('GET', /^\/panel\/conversacion\/(\d+)$/, async (req, res, { params }) => {
  if (!panelActivo()) return html(res, 503, DESACTIVADO);
  if (!sesion(req)) return html(res, 401, login());
  const c = detalleConversacion(Number(params[0]));
  if (!c) return html(res, 404, pagina('No encontrada', '<main class="estrecho"><p>Conversación no encontrada.</p></main>'));
  const filas = c.mensajes.map((m) => `<div class="msg ${escapar(m.rol)}"><span class="rol">${escapar(m.rol)} · ${escapar(m.ts)}</span><p>${escapar(m.texto)}</p></div>`).join('\n');
  html(res, 200, pagina(`Conversación ${c.id}`, `<main class="estrecho"><p><a href="/panel">← Volver al panel</a></p>
<h1>Conversación ${c.id}</h1><p>${escapar(c.canal)} ${escapar(c.direccion)} · ${escapar(c.inicio)} · ${escapar(c.nombre || c.telefono || 'desconocido')}${c.empresa ? ' (' + escapar(c.empresa) + ')' : ''}</p>
<p><strong>Resultado:</strong> ${escapar(c.resultado || '—')}</p><p><strong>Resumen:</strong> ${escapar(c.resumen || '—')}</p>
<section class="transcripcion">${filas || '<p>Sin mensajes.</p>'}</section></main>`));
});

// ---------- API ----------
async function cuerpoJSON(req) {
  const b = (await leerCuerpo(req)).toString();
  if (!b) return {};
  try { return JSON.parse(b); } catch { throw Object.assign(new Error('JSON no válido'), { codigo: 400 }); }
}

function inicioHoyUTC(ahora = new Date()) {
  const h = horaLocal(ahora);
  const d = new Date(+ahora - (h.minutos * 60 + ahora.getUTCSeconds()) * 1000 - ahora.getUTCMilliseconds());
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

// Latencia de voz: los eventos «latencia» guardan un número o un objeto con los milisegundos
function msLatencia(datos) {
  let d; try { d = JSON.parse(datos); } catch { return null; }
  if (typeof d === 'number') return d;
  for (const k of ['ms', 'total_ms', 'totalMs', 'latencia_ms', 'latenciaMs', 'primera_voz_ms', 'primeraVozMs', 'valor']) if (typeof d?.[k] === 'number') return d[k];
  return null;
}

export function resumen(ahora = new Date()) {
  const d = db.abrir(), hoy = inicioHoyUTC(ahora);
  const n = (s, ...a) => d.prepare(s).get(...a).n;
  const lat = d.prepare(`SELECT datos FROM eventos WHERE tipo = 'latencia' AND ts >= ? ORDER BY id DESC LIMIT 1000`).all(hoy).map((x) => msLatencia(x.datos)).filter((x) => Number.isFinite(x));
  return {
    llamadasHoy: n(`SELECT COUNT(*) n FROM conversaciones WHERE canal = 'voz' AND inicio >= ?`, hoy),
    entrantesHoy: n(`SELECT COUNT(*) n FROM conversaciones WHERE canal = 'voz' AND direccion = 'entrante' AND inicio >= ?`, hoy),
    salientesHoy: n(`SELECT COUNT(*) n FROM conversaciones WHERE canal = 'voz' AND direccion = 'saliente' AND inicio >= ?`, hoy),
    whatsappAbiertos: n(`SELECT COUNT(*) n FROM conversaciones WHERE canal = 'whatsapp' AND estado = 'abierta' AND inicio > datetime('now', '-1 day')`),
    reunionesHoy: n(`SELECT COUNT(*) n FROM conversaciones WHERE resultado = 'reunion_agendada' AND inicio >= ?`, hoy),
    reuniones7dias: n(`SELECT COUNT(*) n FROM conversaciones WHERE resultado = 'reunion_agendada' AND inicio > datetime('now', '-7 days')`),
    latenciaMediaMs: lat.length ? Math.round(lat.reduce((a, b) => a + b, 0) / lat.length) : null,
    latenciaMuestras: lat.length,
    prospeccionActiva: C.prospeccion.activa,
    campanasActivas: n(`SELECT COUNT(*) n FROM campanas WHERE estado = 'activa'`),
    bajas: n('SELECT COUNT(*) n FROM bajas'),
    robinson: n('SELECT COUNT(*) n FROM robinson'),
  };
}

function listaConversaciones({ canal, limite = 50, desde = 0 }) {
  return db.abrir().prepare(`SELECT v.id, v.canal, v.direccion, v.estado, v.inicio, v.duracion_s, v.resultado, v.resumen, c.nombre, c.empresa, c.telefono
    FROM conversaciones v LEFT JOIN contactos c ON c.id = v.contacto_id ${canal ? 'WHERE v.canal = ?' : ''} ORDER BY v.id DESC LIMIT ? OFFSET ?`)
    .all(...[canal, Math.min(Number(limite) || 50, 200), Number(desde) || 0].filter((x) => x !== undefined && x !== null && x !== ''));
}
function detalleConversacion(id) {
  const c = db.abrir().prepare(`SELECT v.*, c.nombre, c.empresa, c.telefono, c.email FROM conversaciones v LEFT JOIN contactos c ON c.id = v.contacto_id WHERE v.id = ?`).get(id);
  return c ? { ...c, mensajes: db.mensajes(id).map(({ rol, texto, ts }) => ({ rol, texto, ts })) } : null;
}

// Chat de prueba: una Conversacion de WhatsApp por sesión del panel, contra un contacto de prueba
const PRUEBAS = new Map();
const TEL_PRUEBA = '+34000000000';
async function probar(sid, { texto, reiniciar }) {
  if (reiniciar) { PRUEBAS.delete(sid); if (!texto) return { reiniciada: true }; }
  if (!texto || !String(texto).trim()) throw Object.assign(new Error('Escriba un mensaje'), { codigo: 400 });
  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) throw Object.assign(new Error('Falta ANTHROPIC_API_KEY: el asistente no puede responder'), { codigo: 503 });
  for (const [k, v] of PRUEBAS) if (Date.now() - v.ultimo > 3600e3) PRUEBAS.delete(k);
  let p = PRUEBAS.get(sid);
  if (!p) {
    const { Conversacion } = await import('../cerebro/agente.js');
    const contacto = db.guardarContacto({ telefono: TEL_PRUEBA, nombre: 'Contacto de prueba (panel)', origen: 'panel' });
    const conversacionId = db.abrirConversacion({ canal: 'prueba', direccion: 'entrante', contactoId: contacto.id });
    p = { conversacionId, conv: new Conversacion({ canal: 'whatsapp', direccion: 'entrante', contacto, conversacionId, extra: { prueba: true } }), ultimo: Date.now() };
    PRUEBAS.set(sid, p);
  }
  p.ultimo = Date.now();
  const herramientas = [];
  db.anotar(p.conversacionId, 'usuario', String(texto));
  const r = await p.conv.responder(String(texto).slice(0, 4000), { alHerramienta: (n) => herramientas.push(n) });
  db.anotar(p.conversacionId, 'asistente', r.texto);
  if (r.terminada) { db.cerrarConversacion(p.conversacionId, r.terminada); PRUEBAS.delete(sid); }
  return { texto: r.texto, herramientas, terminada: r.terminada, conversacionId: p.conversacionId };
}

async function recargarConocimiento() {
  const prompt = await import('../cerebro/prompt.js');
  try { const paq = await import('../conocimiento/paquete.js'); for (const f of ['recargar', 'recargarConocimiento', 'olvidar']) if (typeof paq[f] === 'function') { await paq[f](); break; } } catch {}
  prompt.olvidarSistema();
  db.evento('conocimiento_recargado', { desde: 'panel' });
  return { ok: true, mensaje: 'Conocimiento recargado: las próximas conversaciones ya lo usan.' };
}

async function api(req, res, partes, s) {
  const [a, b, c] = partes, M = req.method;
  const id = Number(b);
  if (M === 'GET' && a === 'resumen') return resumen();
  if (M === 'GET' && a === 'conversaciones' && !b) { const u = new URL(req.url, 'http://x'); return listaConversaciones({ canal: u.searchParams.get('canal'), limite: u.searchParams.get('limite'), desde: u.searchParams.get('desde') }); }
  if (M === 'GET' && a === 'conversaciones' && id) return detalleConversacion(id) || Promise.reject(Object.assign(new Error('No encontrada'), { codigo: 404 }));
  if (a === 'campanas') {
    if (M === 'GET' && !b) return { campanas: campanas.listarCampanas(), bases: BASES };
    if (M === 'POST' && !b) return campanas.crearCampana(await cuerpoJSON(req));
    if (!id) return null;
    if (M === 'GET' && !c) { const u = new URL(req.url, 'http://x'); return campanas.resultadosCampana(id, { estado: u.searchParams.get('estado') || null }); }
    if (M === 'POST' && c === 'importar') { const j = await cuerpoJSON(req); return campanas.importarCSV(id, j.csv || ''); }
    if (M === 'POST' && c === 'hubspot') { const j = await cuerpoJSON(req); return await campanas.importarDesdeHubSpot(id, j.listaId); }
    if (M === 'POST' && c === 'pausar') return campanas.pausarCampana(id);
    if (M === 'POST' && c === 'reanudar') return campanas.reanudarCampana(id);
  }
  if (a === 'bajas') {
    if (M === 'GET') return { bajas: db.abrir().prepare('SELECT * FROM bajas ORDER BY ts DESC LIMIT 500').all(), robinson: db.abrir().prepare('SELECT COUNT(*) n, MAX(fecha_lista) fecha FROM robinson').get() };
    if (M === 'POST') {
      const j = await cuerpoJSON(req);
      if (!db.normTel(j.telefono)) throw Object.assign(new Error('Teléfono no válido'), { codigo: 400 });
      db.darDeBaja(j.telefono, { email: j.email || null, motivo: j.motivo || 'alta manual desde el panel', canal: 'panel' });
      return { ok: true };
    }
  }
  if (M === 'POST' && a === 'robinson') { const j = await cuerpoJSON(req); return importarRobinsonCSV(j.csv || '', j.fecha || undefined); }
  if (M === 'POST' && a === 'conocimiento' && b === 'recargar') return recargarConocimiento();
  if (M === 'POST' && a === 'probar') return probar(s.sid, await cuerpoJSON(req));
  return null;
}

const manejarApi = async (req, res, { params }) => {
  if (!panelActivo()) return enviar(res, 503, { error: 'Panel desactivado: configure PANEL_CLAVE' });
  const s = sesion(req);
  if (!s) return enviar(res, 401, { error: 'Inicie sesión' });
  // Contra peticiones de otros sitios: la cookie es SameSite=Strict y además se exige una cabecera propia
  if (req.method !== 'GET' && req.headers['x-panel'] !== '1') return enviar(res, 403, { error: 'Petición no permitida' });
  try {
    const r = await api(req, res, params[0].split('/').filter(Boolean), s);
    if (r === null || r === undefined) return enviar(res, 404, { error: 'No encontrado' });
    enviar(res, 200, r);
  } catch (err) {
    if (!err.codigo) console.error('[panel]', err);
    enviar(res, err.codigo || 500, { error: err.codigo ? err.message : 'Error interno' });
  }
};
ruta('GET', /^\/panel\/api\/(.+)$/, manejarApi);
ruta('POST', /^\/panel\/api\/(.+)$/, manejarApi);
