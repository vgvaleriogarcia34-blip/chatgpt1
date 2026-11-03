// Integración con Atalaya 360° (contrato común con el equipo de Atalaya):
//   POST {ATALAYA_URL}/api/integracion/reunion  — la sesión agendada aparece en la mesa de trabajo de la empresa
//   POST {ATALAYA_URL}/api/integracion/invitar  — invitación de alta con nombre y empresa ya rellenos
// Cabecera Authorization: Bearer <INTEGRACION_TOKEN>. Sin ATALAYA_URL o sin INTEGRACION_TOKEN no se hace nada.
import { C } from '../config.js';
import * as db from '../almacen/db.js';

const cfg = { url: C.atalaya.url, token: C.atalaya.token, fetch: (...a) => fetch(...a), timeoutMs: 10000 };
/** Para tests o reconfiguración: { url, token, fetch, timeoutMs } */
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

/**
 * Avisa a Atalaya de una sesión agendada. Nunca lanza; deja el resultado en eventos (atalaya_reunion).
 * @param {{ id, inicio, fin, titulo, enlace, nombre, email, telefono, empresa, hubspotContactId, hubspotCompanyId }} r
 */
export async function reunionAAtalaya(r) {
  if (!atalayaActiva()) return { ok: false, motivo: 'no_configurada' };
  const cuerpo = limpio({
    id: String(r.id), inicio: new Date(r.inicio).toISOString(), fin: new Date(r.fin).toISOString(), titulo: r.titulo, enlace: r.enlace,
    nombre: r.nombre, email: r.email, telefono: r.telefono, empresa: r.empresa,
    hubspotContactId: r.hubspotContactId ? String(r.hubspotContactId) : null, hubspotCompanyId: r.hubspotCompanyId ? String(r.hubspotCompanyId) : null,
    origen: 'asistente',
  });
  const x = await post('/api/integracion/reunion', cuerpo);
  db.evento('atalaya_reunion', { id: cuerpo.id, ok: !!x.ok, motivo: x.ok ? null : x.motivo || null, empresa: x.empresa ?? null, cuenta: x.cuenta ?? null });
  if (!x.ok) console.warn('[atalaya] reunión:', x.motivo);
  return x;
}

/**
 * Invitación de alta en Atalaya para un contacto (desde la ficha del panel).
 * @returns {Promise<{ ok:boolean, enlace?:string, motivo?:string }>}
 */
export async function invitarAAtalaya({ email, nombre, empresa, telefono, hubspotCompanyId, plan }) {
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) return { ok: false, motivo: 'El contacto no tiene un correo válido' };
  const x = await post('/api/integracion/invitar', limpio({ email: String(email).trim().toLowerCase(), nombre, empresa, telefono, hubspotCompanyId: hubspotCompanyId ? String(hubspotCompanyId) : null, plan }));
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
