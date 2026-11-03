// Integración con Atalaya 360° (contrato común con el equipo de Atalaya):
//   POST {ATALAYA_URL}/api/integracion/reunion  — la sesión agendada aparece en la mesa de trabajo de la empresa
//   POST {ATALAYA_URL}/api/integracion/invitar  — invitación de alta con nombre y empresa ya rellenos
// Cabecera Authorization: Bearer <INTEGRACION_TOKEN>. Sin ATALAYA_URL o sin INTEGRACION_TOKEN no se hace nada.
import { C } from '../config.js';
import * as db from '../almacen/db.js';

// intentos y esperasMs: si Atalaya no responde (o responde 5xx/429), se reintenta el envío de la sesión con espera creciente
const cfg = { url: C.atalaya.url, token: C.atalaya.token, fetch: (...a) => fetch(...a), timeoutMs: 10000, intentos: 3, esperasMs: [5000, 30000] };
/** Para tests o reconfiguración: { url, token, fetch, timeoutMs, intentos, esperasMs } */
export function configurarAtalaya(o = {}) { Object.assign(cfg, o); if (cfg.url) cfg.url = cfg.url.replace(/\/$/, ''); }
export const atalayaActiva = () => !!(cfg.url && cfg.token);
export const urlAtalaya = () => cfg.url;

async function post(ruta, cuerpo) {
  if (!atalayaActiva()) return { ok: false, motivo: 'Atalaya no está configurada (ATALAYA_URL e INTEGRACION_TOKEN)' };
  let r;
  try {
    r = await cfg.fetch(cfg.url + ruta, {
      method: 'POST', headers: { Authorization: `Bearer ${cfg.token}`, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(cuerpo), signal: AbortSignal.timeout(cfg.timeoutMs),
    });
  } catch (err) { return { ok: false, motivo: `Atalaya no responde (${err.message})` }; }
  let j = null;
  try { j = await r.json(); } catch {}
  if (!r.ok) return { ok: false, motivo: j?.motivo || j?.error || `Atalaya respondió ${r.status}`, status: r.status };
  return j && typeof j === 'object' ? j : { ok: true };
}

const limpio = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== ''));

const espera = (ms) => new Promise((ok) => setTimeout(ok, ms).unref?.());
const reintentable = (x) => !x.status || x.status === 429 || x.status >= 500; // sin respuesta o fallo pasajero

/** Cuerpo que se envía a Atalaya para una sesión. */
export function cuerpoReunion(r) {
  return limpio({
    id: String(r.id), inicio: new Date(r.inicio).toISOString(), fin: new Date(r.fin).toISOString(), titulo: r.titulo, enlace: r.enlace,
    nombre: r.nombre, email: r.email, telefono: r.telefono, empresa: r.empresa,
    hubspotContactId: r.hubspotContactId ? String(r.hubspotContactId) : null, hubspotCompanyId: r.hubspotCompanyId ? String(r.hubspotCompanyId) : null,
    origen: 'asistente',
  });
}

/** Envía el cuerpo con hasta cfg.intentos intentos (espera entre ellos) mientras el fallo sea pasajero. */
async function enviarReunion(cuerpo) {
  let x;
  for (let i = 0; i < Math.max(1, cfg.intentos); i++) {
    if (i) await espera(cfg.esperasMs[Math.min(i - 1, cfg.esperasMs.length - 1)] ?? 5000);
    x = await post('/api/integracion/reunion', cuerpo);
    if (x.ok || !reintentable(x)) return { ...x, intentos: i + 1 };
  }
  return { ...x, intentos: Math.max(1, cfg.intentos) };
}

/**
 * Avisa a Atalaya de una sesión agendada. Nunca lanza; deja el resultado en eventos (atalaya_reunion). Si no se ha podido
 * enviar tras los reintentos, deja además un aviso atalaya_reunion_fallo en la bandeja «Requiere acción», que se puede
 * reintentar desde el panel.
 * @param {{ id, inicio, fin, titulo, enlace, nombre, email, telefono, empresa, hubspotContactId, hubspotCompanyId, contacto?, conversacionId? }} r
 */
export async function reunionAAtalaya(r) {
  if (!atalayaActiva()) return { ok: false, motivo: 'no_configurada' };
  const cuerpo = cuerpoReunion(r);
  const x = await enviarReunion(cuerpo);
  const contacto = r.contacto ?? null, email = r.email ? String(r.email).toLowerCase() : null;
  db.evento('atalaya_reunion', { id: cuerpo.id, ok: !!x.ok, motivo: x.ok ? null : x.motivo || null, empresa: x.empresa ?? null, cuenta: x.cuenta ?? null, contacto, email, intentos: x.intentos });
  if (!x.ok) {
    console.warn('[atalaya] reunión:', x.motivo);
    db.evento('atalaya_reunion_fallo', { cuerpo, motivo: x.motivo || null, intentos: x.intentos, contacto, conversacionId: r.conversacionId ?? null, email });
  }
  return x;
}

/** Reintenta desde el panel el envío de una sesión que falló (evento atalaya_reunion_fallo). Si sale bien, se resuelve el aviso. */
export async function reintentarReunionAtalaya(eventoId, quien = 'panel') {
  const e = db.abrir().prepare(`SELECT * FROM eventos WHERE id = ? AND tipo = 'atalaya_reunion_fallo'`).get(eventoId);
  if (!e) throw Object.assign(new Error('Aviso no encontrado'), { codigo: 404 });
  if (e.resuelto) return { ok: true, yaResuelto: true };
  let d = {}; try { d = JSON.parse(e.datos) || {}; } catch {}
  if (!d.cuerpo?.id) throw Object.assign(new Error('El aviso no guarda los datos de la sesión'), { codigo: 409 });
  if (!atalayaActiva()) return { ok: false, motivo: 'Atalaya no está configurada (ATALAYA_URL e INTEGRACION_TOKEN)' };
  const x = await enviarReunion(d.cuerpo);
  db.evento('atalaya_reunion', { id: d.cuerpo.id, ok: !!x.ok, motivo: x.ok ? null : x.motivo || null, empresa: x.empresa ?? null, cuenta: x.cuenta ?? null, contacto: d.contacto ?? null, email: d.email ?? null, intentos: x.intentos, reintento: true });
  if (x.ok) db.resolverEvento(eventoId, quien);
  else db.abrir().prepare('UPDATE eventos SET datos = ? WHERE id = ?').run(JSON.stringify({ ...d, motivo: x.motivo || null, intentos: (d.intentos || 0) + x.intentos }), eventoId);
  return x;
}

/**
 * Invitación de alta en Atalaya para un contacto (desde la ficha del panel).
 * @returns {Promise<{ ok:boolean, enlace?:string, motivo?:string }>}
 */
export async function invitarAAtalaya({ email, nombre, empresa, telefono, hubspotCompanyId, hubspotContactId, plan }) {
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) return { ok: false, motivo: 'El contacto no tiene un correo válido' };
  const x = await post('/api/integracion/invitar', limpio({ email: String(email).trim().toLowerCase(), nombre, empresa, telefono,
    hubspotCompanyId: hubspotCompanyId ? String(hubspotCompanyId) : null, hubspotContactId: hubspotContactId ? String(hubspotContactId) : null, plan }));
  db.evento('atalaya_invitacion', { email: String(email).toLowerCase(), ok: !!x.ok, motivo: x.ok ? null : x.motivo || null });
  return x;
}

/** ¿Responde Atalaya? (cualquier respuesta HTTP por debajo de 500 en la raíz). */
export async function comprobarAtalaya() {
  const r = await cfg.fetch(cfg.url + '/', { method: 'GET', signal: AbortSignal.timeout(5000) });
  await r.arrayBuffer().catch(() => {});
  if (r.status >= 500) throw new Error(`Atalaya respondió ${r.status}`);
  return true;
}
