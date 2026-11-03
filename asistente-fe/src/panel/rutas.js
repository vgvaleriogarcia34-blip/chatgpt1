// Panel de control en /panel: resumen, bandeja «requiere acción», conversaciones (búsqueda, filtros, CSV), fichas de
// contacto con su cronología, campañas, bajas y lista Robinson, estado de las integraciones, recarga del conocimiento
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
import { escribirCSV } from '../prospeccion/csv.js';
import { bajaComercial, hubspotActivo, cuentaHubspot, enlaceContactoHubspot } from '../crm/hubspot.js';
import { atalayaActiva, invitarAAtalaya } from '../integraciones/atalaya.js';
import { estadoIntegraciones } from '../integraciones/estado.js';
import { TEXTOS, texto } from './textos.js';

const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'publico');

/** Escapa texto para meterlo en HTML. Todo lo que viene de la base de datos pasa por aquí (o por textContent en el navegador). */
export function escapar(s) {
  return String(s ?? '').replace(/[&<>"'`]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;' })[c]);
}

const CABECERAS_HTML = {
  'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY', 'Referrer-Policy': 'no-referrer',
  'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; media-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
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

const app = () => pagina(`Panel · ${C.empresa.nombre}`, `<header class="cabecera"><span><strong>${escapar(C.empresa.nombre)}</strong> · asistente ${escapar(C.empresa.asistente)}</span>
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
  const filas = c.mensajes.map((m) => `<div class="msg ${escapar(m.rol)}"><span class="rol">${escapar(texto('rol', m.rol))} · ${escapar(m.ts)}</span><p>${escapar(m.texto)}</p></div>`).join('\n');
  html(res, 200, pagina(`Conversación ${c.id}`, `<main class="estrecho"><p><a href="/panel">← Volver al panel</a></p>
<h1>Conversación ${c.id}</h1><p>${escapar(texto('canal', c.canal))} ${escapar(texto('direccion', c.direccion))} · ${escapar(c.inicio)} · ${escapar(c.nombre || c.telefono || 'desconocido')}${c.empresa ? ' (' + escapar(c.empresa) + ')' : ''}</p>
<p><strong>Resultado:</strong> ${escapar(texto('resultado', c.resultado) || '—')}</p><p><strong>Resumen:</strong> ${escapar(c.resumen || '—')}</p>
<section class="transcripcion">${filas || '<p>Sin mensajes.</p>'}</section></main>`));
});

// ---------- API ----------
async function cuerpoJSON(req) {
  const b = (await leerCuerpo(req)).toString();
  if (!b) return {};
  try { return JSON.parse(b); } catch { throw Object.assign(new Error('JSON no válido'), { codigo: 400 }); }
}
const error = (codigo, mensaje) => Object.assign(new Error(mensaje), { codigo });

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

// Una sesión pedida sin agenda conectada queda «por confirmar» hasta que alguien la confirma (resuelve el aviso): no cuenta como agendada
const PENDIENTE_DE = (alias) => `EXISTS (SELECT 1 FROM eventos e WHERE e.tipo = 'reunion_pendiente' AND e.resuelto IS NULL AND json_extract(e.datos, '$.conversacionId') = ${alias}.id)`;
const AGENDADA = `v.resultado = 'reunion_agendada' AND NOT ${PENDIENTE_DE('v')}`;

export function resumen(ahora = new Date()) {
  const d = db.abrir(), hoy = inicioHoyUTC(ahora);
  const n = (s, ...a) => d.prepare(s).get(...a).n;
  const lat = d.prepare(`SELECT datos FROM eventos WHERE tipo = 'latencia' AND ts >= ? ORDER BY id DESC LIMIT 1000`).all(hoy).map((x) => msLatencia(x.datos)).filter((x) => Number.isFinite(x));
  return {
    llamadasHoy: n(`SELECT COUNT(*) n FROM conversaciones WHERE canal = 'voz' AND inicio >= ?`, hoy),
    entrantesHoy: n(`SELECT COUNT(*) n FROM conversaciones WHERE canal = 'voz' AND direccion = 'entrante' AND inicio >= ?`, hoy),
    salientesHoy: n(`SELECT COUNT(*) n FROM conversaciones WHERE canal = 'voz' AND direccion = 'saliente' AND inicio >= ?`, hoy),
    whatsappAbiertos: n(`SELECT COUNT(*) n FROM conversaciones WHERE canal = 'whatsapp' AND estado = 'abierta' AND inicio > datetime('now', '-1 day')`),
    reunionesHoy: n(`SELECT COUNT(*) n FROM conversaciones v WHERE ${AGENDADA} AND v.inicio >= ?`, hoy),
    reuniones7dias: n(`SELECT COUNT(*) n FROM conversaciones v WHERE ${AGENDADA} AND v.inicio > datetime('now', '-7 days')`),
    reunionesPorConfirmar: n(`SELECT COUNT(*) n FROM eventos WHERE tipo = 'reunion_pendiente' AND resuelto IS NULL`),
    requiereAccion: n(`SELECT COUNT(*) n FROM eventos WHERE resuelto IS NULL AND tipo IN (${TIPOS_ACCION.map(() => '?').join(', ')})`, ...TIPOS_ACCION),
    latenciaMediaMs: lat.length ? Math.round(lat.reduce((a, b) => a + b, 0) / lat.length) : null,
    latenciaMuestras: lat.length,
    prospeccionActiva: C.prospeccion.activa,
    campanasActivas: n(`SELECT COUNT(*) n FROM campanas WHERE estado = 'activa'`),
    bajas: n('SELECT COUNT(*) n FROM bajas'),
    robinson: n('SELECT COUNT(*) n FROM robinson'),
  };
}

// ---------- Bandeja «requiere acción» ----------
const TIPOS_ACCION = Object.keys(TEXTOS.accion);
const jsonSeguro = (t) => { try { return JSON.parse(t); } catch { return null; } };
export function acciones({ limite = 200 } = {}) {
  const d = db.abrir();
  return d.prepare(`SELECT * FROM eventos WHERE resuelto IS NULL AND tipo IN (${TIPOS_ACCION.map(() => '?').join(', ')}) ORDER BY id DESC LIMIT ?`).all(...TIPOS_ACCION, limite).map((e) => {
    const x = jsonSeguro(e.datos) || {};
    const conv = x.conversacionId ? db.conversacionPorId(x.conversacionId) : null;
    const contacto = (x.contacto && db.contactoPorId(x.contacto)) || (conv?.contacto_id && db.contactoPorId(conv.contacto_id)) || (x.telefono && db.contactoPorTelefono(x.telefono)) || null;
    const detalle = e.tipo === 'reunion_pendiente' ? `Pide la sesión el ${x.cuando || x.inicio || '—'} (${x.modalidad || 'videollamada'})${x.email ? ' · invitación a ' + x.email : ''}`
      : e.tipo === 'transferencia_sin_respuesta' ? `Nadie contestó (${texto('resultado', x.estado) || '—'}): devuélvale la llamada.`
        : e.tipo === 'urgencia' ? (x.texto || '') : (x.error || (x.errores ? 'Códigos de Meta: ' + x.errores.join(', ') : ''));
    return { id: e.id, ts: e.ts, tipo: e.tipo, titulo: texto('accion', e.tipo), detalle, conversacionId: conv?.id ?? x.conversacionId ?? null,
      contacto: contacto ? { id: contacto.id, nombre: contacto.nombre, empresa: contacto.empresa, telefono: contacto.telefono } : (x.telefono ? { telefono: x.telefono } : null) };
  });
}

// ---------- Conversaciones ----------
function filtroConversaciones({ q, canal, resultado, desde, hasta }) {
  const w = [], a = [];
  if (canal) { w.push('v.canal = ?'); a.push(canal); }
  if (resultado === 'reunion_pendiente') w.push(PENDIENTE_DE('v'));
  else if (resultado === 'reunion_agendada') w.push(AGENDADA);
  else if (resultado === 'sin_resultado') w.push('v.resultado IS NULL');
  else if (resultado === 'transferencia_sin_respuesta') w.push(`v.transferencia = 'sin_respuesta'`);
  else if (resultado) { w.push('v.resultado = ?'); a.push(resultado); }
  if (desde && /^\d{4}-\d\d-\d\d$/.test(desde)) { w.push('v.inicio >= ?'); a.push(desde + ' 00:00:00'); }
  if (hasta && /^\d{4}-\d\d-\d\d$/.test(hasta)) { w.push('v.inicio <= ?'); a.push(hasta + ' 23:59:59'); }
  if (q && String(q).trim()) {
    const t = '%' + String(q).trim().toLowerCase().replace(/[%_\\]/g, (c) => '\\' + c) + '%';
    const tel = db.normTel(q);
    w.push(`(lower(COALESCE(c.nombre, '')) LIKE ? ESCAPE '\\' OR lower(COALESCE(c.empresa, '')) LIKE ? ESCAPE '\\' OR lower(COALESCE(c.email, '')) LIKE ? ESCAPE '\\' OR lower(COALESCE(v.resumen, '')) LIKE ? ESCAPE '\\' OR c.telefono LIKE ?)`);
    a.push(t, t, t, t, tel && /\d{6,}/.test(tel) ? '%' + tel.replace(/^\+34/, '') + '%' : t);
  }
  return { where: w.length ? 'WHERE ' + w.join(' AND ') : '', args: a };
}
export function listaConversaciones({ q, canal, resultado, desde, hasta, limite = 50, saltar = 0 } = {}) {
  const f = filtroConversaciones({ q, canal, resultado, desde, hasta });
  return db.abrir().prepare(`SELECT v.id, v.canal, v.direccion, v.estado, v.inicio, v.duracion_s, v.resultado, v.resumen, v.transferencia, v.volver_llamar, v.grabacion_url IS NOT NULL AS grabada,
      ${PENDIENTE_DE('v')} AS reunion_pendiente, c.id AS contacto_id, c.nombre, c.empresa, c.telefono, c.email
    FROM conversaciones v LEFT JOIN contactos c ON c.id = v.contacto_id ${f.where} ORDER BY v.id DESC LIMIT ? OFFSET ?`)
    .all(...f.args, Math.min(Number(limite) || 50, 5000), Number(saltar) || 0)
    .map((v) => ({ ...v, grabada: !!v.grabada, reunion_pendiente: !!v.reunion_pendiente }));
}
function detalleConversacion(id) {
  const c = db.abrir().prepare(`SELECT v.*, ${PENDIENTE_DE('v')} AS reunion_pendiente, c.nombre, c.empresa, c.telefono, c.email FROM conversaciones v LEFT JOIN contactos c ON c.id = v.contacto_id WHERE v.id = ?`).get(id);
  if (!c) return null;
  const { grabacion_url, grabacion_sid, ...resto } = c;
  return { ...resto, reunion_pendiente: !!c.reunion_pendiente, grabada: !!grabacion_url, mensajes: db.mensajes(id).map(({ rol, texto: t, ts }) => ({ rol, texto: t, ts })) };
}

/** Audio de la grabación (se pide a Twilio con las credenciales de la cuenta; solo a api.twilio.com). */
async function grabacion(id) {
  const c = db.conversacionPorId(id);
  if (!c?.grabacion_url) throw error(404, 'Esta conversación no tiene grabación');
  const u = new URL(c.grabacion_url.replace(/\.(mp3|wav)$/, '') + '.mp3');
  if (u.protocol !== 'https:' || u.hostname !== 'api.twilio.com') throw error(400, 'Dirección de grabación no reconocida');
  const r = await fetch(u, { headers: { Authorization: 'Basic ' + Buffer.from(`${C.twilio.accountSid}:${C.twilio.authToken}`).toString('base64') }, signal: AbortSignal.timeout(30000) });
  if (!r.ok) throw error(502, `Twilio respondió ${r.status} al pedir la grabación`);
  return { __archivo: { nombre: `grabacion-${id}.mp3`, tipo: 'audio/mpeg', cuerpo: Buffer.from(await r.arrayBuffer()), enLinea: true } };
}

// ---------- Contactos ----------
const ULTIMA = `(SELECT MAX(COALESCE(v.fin, v.inicio)) FROM conversaciones v WHERE v.contacto_id = c.id)`;
export function listaContactos({ q, base, limite = 200 } = {}) {
  const w = [], a = [];
  if (q && String(q).trim()) {
    const t = '%' + String(q).trim().toLowerCase().replace(/[%_\\]/g, (x) => '\\' + x) + '%';
    const tel = db.normTel(q);
    w.push(`(lower(COALESCE(c.nombre, '')) LIKE ? ESCAPE '\\' OR lower(COALESCE(c.empresa, '')) LIKE ? ESCAPE '\\' OR lower(COALESCE(c.email, '')) LIKE ? ESCAPE '\\' OR c.telefono LIKE ?)`);
    a.push(t, t, t, tel && /\d{6,}/.test(tel) ? '%' + tel.replace(/^\+34/, '') + '%' : t);
  }
  if (base === 'sin_base_legal') w.push(`(c.base_legal IS NULL OR c.base_legal = '')`);
  else if (base) { w.push('c.base_legal = ?'); a.push(base); }
  return db.abrir().prepare(`SELECT c.*, ${ULTIMA} AS ultima, (SELECT COUNT(*) FROM conversaciones v WHERE v.contacto_id = c.id) AS conversaciones,
      (EXISTS (SELECT 1 FROM bajas b WHERE b.telefono = c.telefono) OR EXISTS (SELECT 1 FROM bajas b WHERE c.email IS NOT NULL AND b.email = lower(c.email))) AS de_baja
    FROM contactos c ${w.length ? 'WHERE ' + w.join(' AND ') : ''} ORDER BY COALESCE(${ULTIMA}, c.actualizado) DESC, c.id DESC LIMIT ?`).all(...a, Math.min(Number(limite) || 200, 5000))
    .map((c) => ({ ...c, de_baja: !!c.de_baja }));
}

export async function fichaContacto(id) {
  const d = db.abrir();
  const c = db.contactoPorId(id);
  if (!c) return null;
  const cron = [];
  const convs = d.prepare('SELECT * FROM conversaciones WHERE contacto_id = ? ORDER BY id DESC LIMIT 200').all(id);
  for (const v of convs) {
    const n = d.prepare(`SELECT COUNT(*) n FROM mensajes WHERE conversacion_id = ? AND rol IN ('usuario', 'asistente')`).get(v.id).n;
    const pendiente = !!d.prepare(`SELECT ${PENDIENTE_DE('v')} AS p FROM conversaciones v WHERE v.id = ?`).get(v.id).p;
    cron.push({ ts: v.inicio, tipo: 'conversacion', conversacionId: v.id, titulo: `${texto('canal', v.canal)} ${texto('direccion', v.direccion)}${v.resultado || pendiente ? ' · ' + texto('resultado', pendiente ? 'reunion_pendiente' : v.resultado) : ''}`,
      detalle: [v.resumen, `${n} mensajes${v.duracion_s ? ` · ${v.duracion_s} s` : ''}`, v.transferencia && `Transferencia: ${texto('transferencia', v.transferencia)}`, v.volver_llamar && `Pidió que le llamen el ${v.volver_llamar} (UTC)`].filter(Boolean).join(' · '),
      grabada: !!v.grabacion_url });
    for (const m of d.prepare(`SELECT * FROM mensajes WHERE conversacion_id = ? AND rol IN ('nota', 'reunion', 'whatsapp_enviado') ORDER BY id`).all(v.id)) {
      const x = jsonSeguro(m.datos) || {};
      cron.push({ ts: m.ts, tipo: m.rol, conversacionId: v.id, titulo: m.rol === 'nota' ? (x.urgente ? 'Urgencia' : x.tipo === 'tarea' ? 'Tarea para el equipo' : x.tipo === 'oportunidad' ? 'Oportunidad' : 'Nota') : texto('rol', m.rol), detalle: m.texto });
    }
  }
  for (const k of d.prepare(`SELECT cc.*, k.nombre AS campana, k.creada FROM campana_contactos cc JOIN campanas k ON k.id = cc.campana_id WHERE cc.contacto_id = ?`).all(id)) {
    cron.push({ ts: k.ultimo_intento || k.creada, tipo: 'campana', titulo: `Campaña «${k.campana}»: ${texto('estadoContacto', k.estado)}`,
      detalle: [k.intentos ? `${k.intentos} intento${k.intentos === 1 ? '' : 's'}` : 'sin intentos', k.resultado && texto('resultado', k.resultado), k.motivo && !TEXTOS.resultado[k.motivo] ? k.motivo : null, k.pedido && `próxima llamada pedida: ${k.pedido} (UTC)`].filter(Boolean).join(' · ') });
  }
  const baja = db.bajaDe({ telefono: c.telefono, email: c.email });
  if (baja) cron.push({ ts: baja.ts, tipo: 'baja', titulo: 'Baja de comunicaciones comerciales', detalle: `Por ${texto('canal', baja.canal) || '—'}${baja.motivo ? ': ' + baja.motivo : ''}` });
  for (const e of d.prepare(`SELECT * FROM eventos WHERE tipo IN ('aviso_equipo', 'atalaya_invitacion', 'atalaya_reunion') AND (json_extract(datos, '$.contacto') = ? OR (? IS NOT NULL AND json_extract(datos, '$.email') = ?)) ORDER BY id DESC LIMIT 50`).all(id, c.email ? c.email.toLowerCase() : null, c.email ? c.email.toLowerCase() : null)) {
    const x = jsonSeguro(e.datos) || {};
    cron.push({ ts: e.ts, tipo: e.tipo, titulo: e.tipo === 'aviso_equipo' ? `Aviso al equipo: ${x.tipo ? (TEXTOS.accion[x.tipo] || x.tipo.replace(/_/g, ' ')) : ''}` : e.tipo === 'atalaya_invitacion' ? 'Invitación a Atalaya' : 'Sesión enviada a Atalaya',
      detalle: e.tipo === 'aviso_equipo' ? `Correo: ${x.correo === true ? 'enviado' : x.correo || '—'} · WhatsApp: ${x.whatsapp === true ? 'enviado' : x.whatsapp || '—'}` : (x.ok ? 'Hecho' : `No se pudo: ${x.motivo || '—'}`) });
  }
  cron.sort((a, b) => String(b.ts).localeCompare(String(a.ts)));
  let enlace = null;
  if (c.hubspot_id && hubspotActivo()) { try { enlace = enlaceContactoHubspot(c.hubspot_id, await cuentaHubspot()); } catch {} }
  return { contacto: c, deBaja: !!baja || db.estaDeBaja(c.telefono, c.email), hubspot: c.hubspot_id ? { id: c.hubspot_id, enlace } : null, atalaya: atalayaActiva(), cronologia: cron };
}

// ---------- Exportaciones (CSV para Excel) ----------
const archivo = (nombre, cabecera, filas) => ({ __archivo: { nombre: `${nombre}-${new Date().toISOString().slice(0, 10)}.csv`, tipo: 'text/csv; charset=utf-8', cuerpo: escribirCSV(cabecera, filas) } });
function exportar(que, u) {
  const p = Object.fromEntries(u.searchParams);
  if (que === 'conversaciones') {
    const l = listaConversaciones({ ...p, limite: 5000 });
    return archivo('conversaciones', ['Fecha (UTC)', 'Canal', 'Dirección', 'Contacto', 'Empresa', 'Teléfono', 'Correo', 'Resultado', 'Duración (s)', 'Transferencia', 'Volver a llamar (UTC)', 'Resumen'],
      l.map((v) => [v.inicio, texto('canal', v.canal), texto('direccion', v.direccion), v.nombre, v.empresa, v.telefono, v.email, texto('resultado', v.reunion_pendiente ? 'reunion_pendiente' : v.resultado) || texto('estadoConversacion', v.estado),
        v.duracion_s, texto('transferencia', v.transferencia), v.volver_llamar, v.resumen]));
  }
  if (que === 'contactos') {
    const l = listaContactos({ ...p, limite: 5000 });
    return archivo('contactos', ['Nombre', 'Empresa', 'Cargo', 'Teléfono', 'Correo', 'Base legal', 'Detalle de la base legal', 'Fecha de la base legal', 'Origen', 'Baja', 'Última actividad (UTC)', 'Id de HubSpot'],
      l.map((c) => [c.nombre, c.empresa, c.cargo, c.telefono, c.email, texto('base', c.base_legal || ''), c.base_legal_detalle, c.base_legal_fecha, c.origen, c.de_baja ? 'Sí' : 'No', c.ultima, c.hubspot_id]));
  }
  if (que === 'sin-base-legal') {
    // A quien no se puede llamar sin base legal se le escribe por correo o LinkedIn (nunca a quien pidió la baja)
    const campana = Number(p.campana) || null;
    const l = db.abrir().prepare(`SELECT c.*, group_concat(k.nombre, ' · ') AS campanas FROM campana_contactos cc JOIN contactos c ON c.id = cc.contacto_id JOIN campanas k ON k.id = cc.campana_id
      WHERE cc.estado = 'sin_base_legal' ${campana ? 'AND cc.campana_id = ?' : ''} GROUP BY c.id ORDER BY c.empresa, c.nombre`).all(...(campana ? [campana] : []))
      .filter((c) => !db.estaDeBaja(c.telefono, c.email));
    return archivo('sin-base-legal', ['Nombre', 'Empresa', 'Cargo', 'Correo', 'Teléfono', 'Origen', 'Campañas'], l.map((c) => [c.nombre, c.empresa, c.cargo, c.email, c.telefono, c.origen, c.campanas]));
  }
  return null;
}

// Chat de prueba: una Conversacion de WhatsApp por sesión del panel, contra un contacto de prueba
const PRUEBAS = new Map();
const TEL_PRUEBA = '+34000000000';
async function probar(sid, { texto: t, reiniciar }) {
  if (reiniciar) { PRUEBAS.delete(sid); if (!t) return { reiniciada: true }; }
  if (!t || !String(t).trim()) throw error(400, 'Escriba un mensaje');
  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) throw error(503, 'Falta ANTHROPIC_API_KEY: el asistente no puede responder');
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
  db.anotar(p.conversacionId, 'usuario', String(t));
  const r = await p.conv.responder(String(t).slice(0, 4000), { alHerramienta: (n) => herramientas.push(n) });
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

/** Baja desde el panel: con el teléfono, el correo o los dos; llega también a HubSpot. */
async function bajaPanel({ telefono, email, motivo, contacto = null }) {
  const tel = telefono ? db.normTel(telefono) : null;
  const correo = email ? String(email).trim().toLowerCase() : null;
  if (telefono && !tel) throw error(400, 'Teléfono no válido');
  if (correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) throw error(400, 'Correo no válido');
  if (!tel && !correo) throw error(400, 'Indique un teléfono o un correo');
  const c = contacto || (tel && db.contactoPorTelefono(tel)) || (correo && db.contactoPorEmail(correo)) || null;
  const enHubspot = await bajaComercial({ telefono: tel || c?.telefono || null, email: correo || c?.email || null, motivo: motivo || 'alta manual desde el panel', canal: 'panel', contacto: c });
  return { ok: true, hubspot: hubspotActivo() ? (enHubspot ? 'Anotada también en HubSpot.' : 'HubSpot no ha respondido; la baja local ya es efectiva.') : 'HubSpot no está configurado.' };
}

async function api(req, res, partes, s) {
  const [a, b, c] = partes, M = req.method;
  const id = Number(b);
  const u = new URL(req.url, 'http://x'), qp = (k) => u.searchParams.get(k);
  if (M === 'GET' && a === 'resumen') return resumen();
  if (M === 'GET' && a === 'textos') return TEXTOS;
  if (M === 'GET' && a === 'acciones') return acciones();
  if (M === 'POST' && a === 'acciones' && id && c === 'resolver') return { ok: db.resolverEvento(id, s.u || 'panel') };
  if (M === 'GET' && a === 'conversaciones' && !b) return listaConversaciones({ q: qp('q'), canal: qp('canal'), resultado: qp('resultado'), desde: qp('desde'), hasta: qp('hasta'), limite: qp('limite'), saltar: qp('saltar') });
  if (M === 'GET' && a === 'conversaciones' && id && c === 'grabacion') return grabacion(id);
  if (M === 'GET' && a === 'conversaciones' && id) return detalleConversacion(id) || Promise.reject(error(404, 'No encontrada'));
  if (a === 'contactos') {
    if (M === 'GET' && !b) return listaContactos({ q: qp('q'), base: qp('base'), limite: qp('limite') });
    if (!id) return null;
    if (M === 'GET' && !c) return (await fichaContacto(id)) || Promise.reject(error(404, 'Contacto no encontrado'));
    const ct = db.contactoPorId(id);
    if (!ct) throw error(404, 'Contacto no encontrado');
    if (M === 'POST' && c === 'invitar') {
      const j = await cuerpoJSON(req);
      return invitarAAtalaya({ email: ct.email, nombre: ct.nombre, empresa: ct.empresa, telefono: ct.telefono, hubspotCompanyId: ct.hubspot_company_id, plan: j.plan || undefined });
    }
    if (M === 'POST' && c === 'baja') { const j = await cuerpoJSON(req); return bajaPanel({ telefono: ct.telefono, email: ct.email, motivo: j.motivo, contacto: ct }); }
  }
  if (M === 'GET' && a === 'exportar' && b) return exportar(b, u);
  if (M === 'GET' && a === 'integraciones') return { integraciones: await estadoIntegraciones({ comprobar: qp('comprobar') !== '0' }) };
  if (a === 'campanas') {
    if (M === 'GET' && !b) return { campanas: campanas.listarCampanas(), bases: BASES, prospeccionActiva: C.prospeccion.activa };
    if (M === 'POST' && !b) return campanas.crearCampana(await cuerpoJSON(req));
    if (!id) return null;
    if (M === 'GET' && !c) return { ...campanas.resultadosCampana(id, { estado: qp('estado') || null }), prospeccionActiva: C.prospeccion.activa };
    if (M === 'POST' && c === 'importar') { const j = await cuerpoJSON(req); return campanas.importarCSV(id, j.csv || ''); }
    if (M === 'POST' && c === 'hubspot') { const j = await cuerpoJSON(req); return await campanas.importarDesdeHubSpot(id, j.listaId); }
    if (M === 'POST' && c === 'pausar') return campanas.pausarCampana(id);
    if (M === 'POST' && c === 'reanudar') {
      const k = campanas.reanudarCampana(id);
      return C.prospeccion.activa ? k : { ...k, aviso: 'La campaña está activa, pero la prospección está apagada (PROSPECCION_ACTIVA=no): no se hará ninguna llamada hasta encenderla y reiniciar el servidor.' };
    }
  }
  if (a === 'bajas') {
    if (M === 'GET') return { bajas: db.abrir().prepare('SELECT * FROM bajas ORDER BY ts DESC LIMIT 500').all(), robinson: db.abrir().prepare('SELECT COUNT(*) n, MAX(fecha_lista) fecha FROM robinson').get() };
    if (M === 'POST') { const j = await cuerpoJSON(req); return bajaPanel({ telefono: j.telefono, email: j.email, motivo: j.motivo }); }
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
    if (r.__archivo) {
      const f = r.__archivo;
      res.writeHead(200, { 'Content-Type': f.tipo, 'Content-Disposition': `${f.enLinea ? 'inline' : 'attachment'}; filename="${f.nombre.replace(/[^\w.-]/g, '_')}"`, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
      return res.end(f.cuerpo);
    }
    enviar(res, 200, r);
  } catch (err) {
    if (!err.codigo) console.error('[panel]', err);
    enviar(res, err.codigo || 500, { error: err.codigo ? err.message : 'Error interno' });
  }
};
ruta('GET', /^\/panel\/api\/(.+)$/, manejarApi);
ruta('POST', /^\/panel\/api\/(.+)$/, manejarApi);
