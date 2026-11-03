// CRM: HubSpot (API v3 con token de app privada). La base local (db) es siempre la referencia operativa;
// HubSpot recibe la ficha comercial, las llamadas, los WhatsApp, las notas, las tareas y los negocios.
// Sin HUBSPOT_TOKEN todo funciona solo con la base local y las respuestas lo indican.
import { C } from '../config.js';
import * as db from '../almacen/db.js';
import { registrar } from '../cerebro/herramientas.js';
import { avisar } from '../avisos.js';

const cfg = { base: 'https://api.hubapi.com', token: C.hubspot.token, propietarioId: C.hubspot.propietarioId, pipeline: C.hubspot.pipeline, etapa: C.hubspot.etapaInicial, portalId: C.hubspot.portalId, esperaMaxMs: 30000, cacheBajasMs: 5 * 60e3, timeoutBajasMs: 4000 };
/** Para tests o reconfiguración: { base, token, propietarioId, pipeline, etapa, esperaMaxMs } */
export function configurarHubspot(o = {}) { Object.assign(cfg, o); propsCache = null; bajasCache.clear(); portal = cfg.portalId ? { portalId: cfg.portalId, uiDomain: 'app.hubspot.com' } : null; }
export const hubspotActivo = () => !!cfg.token;
const SIN_CRM = 'HubSpot no está configurado: queda guardado solo en la base local.';

// Tipos de asociación definidos por HubSpot (objeto → contacto / empresa)
const ASOC = { calls: 194, notes: 202, tasks: 204, meetings: 200, deals: 3, communications: 81, companies: 279 };
const asociar = (contactoId, tipo) => (contactoId ? [{ to: { id: String(contactoId) }, types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: ASOC[tipo] }] }] : []);

const espera = (ms) => new Promise((ok) => setTimeout(ok, ms));

/**
 * Petición a HubSpot con reintentos ante 429 (respeta Retry-After) y, salvo en altas, ante 5xx. Devuelve el JSON o null (204).
 * op: { timeoutMs (20 s), reintentos (4) } — las comprobaciones que no pueden esperar usan menos.
 */
export async function hs(metodo, ruta, cuerpo, { timeoutMs = 20000, reintentos = 4 } = {}) {
  if (!cfg.token) throw new Error('HubSpot no configurado');
  for (let intento = 0; ; intento++) {
    const r = await fetch(cfg.base + ruta, {
      method: metodo,
      headers: { Authorization: `Bearer ${cfg.token}`, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
      signal: AbortSignal.timeout(timeoutMs),
    });
    if ((r.status === 429 || (r.status >= 500 && metodo !== 'POST')) && intento < reintentos) {
      const ra = Number(r.headers.get('retry-after'));
      const ms = Math.min(cfg.esperaMaxMs, Number.isFinite(ra) && ra > 0 ? ra * 1000 : 500 * 2 ** intento);
      await r.arrayBuffer().catch(() => {});
      await espera(ms);
      continue;
    }
    const texto = await r.text();
    if (!r.ok) {
      let msg = texto.slice(0, 300);
      try { msg = JSON.parse(texto).message || msg; } catch {}
      throw Object.assign(new Error(`HubSpot ${r.status}: ${msg}`), { status: r.status });
    }
    return texto ? JSON.parse(texto) : null;
  }
}

// ---------- Propiedades personalizadas (fe_*) ----------
let propsCache = null;
/** Nombres de las propiedades de contacto existentes que empiezan por fe_ (se crean con preparar-hubspot.js). */
async function propsFe() {
  if (!propsCache) {
    propsCache = hs('GET', '/crm/v3/properties/contacts').then((r) => new Set((r?.results || []).map((p) => p.name).filter((n) => n.startsWith('fe_'))))
      .catch(() => { propsCache = null; return new Set(); });
  }
  return propsCache;
}

// ---------- Teléfonos ----------
/** Variantes con las que puede estar guardado un teléfono en HubSpot (E.164, sin +, 0034, nacional, con espacios). */
export function variantesTelefono(tel) {
  const e164 = db.normTel(tel);
  if (!e164) return [];
  const d = e164.replace(/^\+/, '');
  const v = new Set([e164, d, '00' + d]);
  if (d.startsWith('34') && d.length === 11) {
    const nac = d.slice(2);
    v.add(nac);
    v.add(`+34 ${nac.slice(0, 3)} ${nac.slice(3, 6)} ${nac.slice(6)}`);
    v.add(`${nac.slice(0, 3)} ${nac.slice(3, 6)} ${nac.slice(6)}`);
    v.add(`+34 ${nac.slice(0, 3)} ${nac.slice(3, 5)} ${nac.slice(5, 7)} ${nac.slice(7)}`);
    v.add(`${nac.slice(0, 3)} ${nac.slice(3, 5)} ${nac.slice(5, 7)} ${nac.slice(7)}`);
  }
  return [...v];
}

const PROPS_CONTACTO = ['firstname', 'lastname', 'email', 'phone', 'mobilephone', 'company', 'jobtitle', 'hs_lead_status', 'lifecyclestage', 'hubspot_owner_id', 'fe_base_legal', 'fe_dolor', 'fe_origen', 'fe_campana', 'fe_asistente_resultado', 'fe_baja', 'hs_email_optout'];

/** Busca un contacto por teléfono (phone y mobilephone, con variantes) o por email. Devuelve el objeto de HubSpot o null. */
export async function buscarContacto({ telefono, email } = {}, op = {}) {
  const grupos = [];
  const vars = variantesTelefono(telefono);
  if (vars.length) {
    grupos.push({ filters: [{ propertyName: 'phone', operator: 'IN', values: vars }] });
    grupos.push({ filters: [{ propertyName: 'mobilephone', operator: 'IN', values: vars }] });
  }
  if (email) grupos.push({ filters: [{ propertyName: 'email', operator: 'EQ', value: String(email).toLowerCase() }] });
  if (!grupos.length) return null;
  const r = await hs('POST', '/crm/v3/objects/contacts/search', { filterGroups: grupos, properties: PROPS_CONTACTO, limit: 5 }, op);
  return r?.results?.[0] || null;
}

// ---------- Bajas registradas en HubSpot (antes de cada llamada o WhatsApp de campaña) ----------
const bajasCache = new Map(); // clave del contacto → { ts, r }
const verdad = (v) => /^(true|1|s[ií]|yes)$/i.test(String(v ?? '').trim());
/**
 * ¿Consta en HubSpot que el contacto no quiere comunicaciones comerciales (fe_baja o hs_email_optout)? Se consulta justo
 * antes de llamar o escribir, con caché corta (5 min) y un tiempo límite de 4 s sin reintentos. Si consta, se registra
 * también la baja local (que ya no caduca). Si HubSpot no responde devuelve { error }: quien llama no debe contactar.
 * Sin HubSpot configurado: { baja: false }.
 * @returns {Promise<{ baja: boolean, motivo?: string } | { error: string }>}
 */
export async function bajaEnHubspot(contacto, { cacheMs = cfg.cacheBajasMs, timeoutMs = cfg.timeoutBajasMs } = {}) {
  if (!hubspotActivo() || !contacto) return { baja: false };
  const tel = db.normTel(contacto.telefono), email = contacto.email ? String(contacto.email).toLowerCase() : null;
  const clave = contacto.hubspot_id ? 'id:' + contacto.hubspot_id : `tel:${tel || ''}|${email || ''}`;
  const c = bajasCache.get(clave);
  if (c && Date.now() - c.ts < cacheMs) return c.r;
  let props = null;
  try {
    if (contacto.hubspot_id) {
      try { props = (await hs('GET', `/crm/v3/objects/contacts/${encodeURIComponent(contacto.hubspot_id)}?properties=fe_baja,hs_email_optout`, null, { timeoutMs, reintentos: 0 }))?.properties || {}; }
      catch (err) { if (err.status !== 404) throw err; }
    }
    if (!props && (tel || email)) props = (await buscarContacto({ telefono: tel, email }, { timeoutMs, reintentos: 0 }))?.properties || null;
  } catch (err) {
    return { error: String(err.name === 'TimeoutError' ? 'no responde en ' + Math.round(timeoutMs / 1000) + ' s' : err.message) }; // los fallos no se guardan en la caché
  }
  const r = !props ? { baja: false }
    : verdad(props.fe_baja) ? { baja: true, motivo: 'Baja registrada en HubSpot (fe_baja).' }
      : verdad(props.hs_email_optout) ? { baja: true, motivo: 'En HubSpot consta que no quiere recibir comunicaciones (hs_email_optout).' }
        : { baja: false };
  if (r.baja && tel && !db.estaDeBaja(tel, email)) {
    db.darDeBaja(tel, { email, motivo: r.motivo, canal: 'hubspot' });
    db.evento('baja', { telefono: tel, email, canal: 'hubspot', motivo: r.motivo, contacto: contacto.id ?? null });
  }
  bajasCache.set(clave, { ts: Date.now(), r });
  return r;
}

const partirNombre = (n) => {
  const p = String(n).trim().split(/\s+/);
  return { firstname: p[0], lastname: p.slice(1).join(' ') || undefined };
};
const limpio = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== ''));

/** Crea o actualiza el contacto en HubSpot (y su empresa asociada). Devuelve el id de HubSpot. */
export async function guardarContactoHubspot(c, extra = {}) {
  const fe = await propsFe();
  const props = limpio({
    ...(c.nombre ? partirNombre(c.nombre) : {}),
    email: c.email, phone: db.normTel(c.telefono) || undefined, company: c.empresa, jobtitle: c.cargo,
  });
  const pers = { fe_base_legal: c.base_legal, fe_origen: c.origen, ...extra };
  for (const [k, v] of Object.entries(pers)) if (fe.has(k) && v !== undefined && v !== null && v !== '') props[k] = String(v);

  let id = c.hubspot_id;
  if (!id) id = (await buscarContacto({ telefono: c.telefono, email: c.email }))?.id;
  if (id) {
    try { await hs('PATCH', `/crm/v3/objects/contacts/${id}`, { properties: props }); }
    catch (err) { if (err.status !== 404) throw err; id = null; }
  }
  if (!id) id = (await hs('POST', '/crm/v3/objects/contacts', { properties: { ...props, ...(cfg.propietarioId ? { hubspot_owner_id: cfg.propietarioId } : {}) } })).id;
  if (c.empresa) {
    // El id de la empresa en HubSpot se guarda en local: Atalaya busca la ficha de la empresa por él
    const empresaId = await asegurarEmpresa(id, c.empresa, extra).catch((err) => { console.warn('[hubspot] empresa:', err.message); return null; });
    if (empresaId && c.id && String(empresaId) !== c.hubspot_company_id) { db.guardarContacto({ id: c.id, telefono: c.telefono, hubspot_company_id: String(empresaId) }); c.hubspot_company_id = String(empresaId); }
  }
  return String(id);
}

async function asegurarEmpresa(contactoId, nombre, extra = {}) {
  const r = await hs('POST', '/crm/v3/objects/companies/search', { filterGroups: [{ filters: [{ propertyName: 'name', operator: 'EQ', value: nombre }] }], properties: ['name'], limit: 1 });
  const props = limpio({ name: nombre, numberofemployees: extra.empleados });
  let id = r?.results?.[0]?.id;
  if (id) { if (props.numberofemployees) await hs('PATCH', `/crm/v3/objects/companies/${id}`, { properties: props }); }
  else id = (await hs('POST', '/crm/v3/objects/companies', { properties: props })).id;
  await hs('PUT', `/crm/v4/objects/contact/${contactoId}/associations/default/company/${id}`);
  return id;
}

/** Garantiza que el contacto local tiene su ficha en HubSpot; guarda el id en la base local. Nunca lanza. */
export async function sincronizarContacto(contacto, extra = {}) {
  if (!contacto || !hubspotActivo()) return null;
  try {
    const id = await guardarContactoHubspot(contacto, extra);
    if (id !== contacto.hubspot_id) {
      db.guardarContacto({ id: contacto.id, telefono: contacto.telefono, hubspot_id: id });
      contacto.hubspot_id = id;
    }
    return id;
  } catch (err) {
    console.warn('[hubspot] contacto:', err.message);
    return null;
  }
}

// ---------- Cuenta (para los enlaces del panel) ----------
let portal = cfg.portalId ? { portalId: cfg.portalId, uiDomain: 'app.hubspot.com' } : null;
/** { portalId, uiDomain } de la cuenta (HUBSPOT_PORTAL_ID o /account-info/v3/details), o null. */
export async function cuentaHubspot({ forzar = false } = {}) {
  if (portal && !forzar) return portal;
  if (!hubspotActivo()) return null;
  const r = await hs('GET', '/account-info/v3/details');
  portal = { portalId: String(r?.portalId ?? cfg.portalId ?? ''), uiDomain: r?.uiDomain || 'app.hubspot.com' };
  return portal;
}
/** Enlace a la ficha del contacto en HubSpot (o null si no se conoce la cuenta). */
export const enlaceContactoHubspot = (id, p = portal) => (id && p?.portalId ? `https://${p.uiDomain || 'app.hubspot.com'}/contacts/${p.portalId}/record/0-1/${id}` : null);

// ---------- Actividades ----------
const ahoraIso = () => new Date().toISOString();
const dueno = () => (cfg.propietarioId ? { hubspot_owner_id: cfg.propietarioId } : {});
const html = (t) => String(t ?? '').replace(/[&<>]/g, (x) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[x])).replace(/\n/g, '<br>');
const recortar = (t, n) => (t && t.length > n ? t.slice(0, n) + '…' : t || '');

async function crearObjeto(tipo, properties, contactoId) {
  const r = await hs('POST', `/crm/v3/objects/${tipo}`, { properties: limpio(properties), associations: asociar(contactoId, tipo) });
  return r?.id;
}

/** Llamada: resumen y transcripción recortada, dirección, duración (s), estado. */
export function registrarLlamada({ contactoId, titulo, resumen, transcripcion, direccion = 'entrante', duracionS = 0, estado = 'COMPLETED', resultado, ts }) {
  const cuerpo = `<p><b>Resumen:</b> ${html(resumen || '(sin resumen)')}</p>${resultado ? `<p><b>Resultado:</b> ${html(resultado)}</p>` : ''}`
    + (transcripcion ? `<p><b>Transcripción:</b><br>${html(recortar(transcripcion, 60000))}</p>` : '');
  return crearObjeto('calls', {
    hs_call_title: titulo || `Llamada ${direccion} del asistente`, hs_call_body: cuerpo,
    hs_call_direction: direccion === 'saliente' ? 'OUTBOUND' : 'INBOUND',
    hs_call_duration: String(Math.round((duracionS || 0) * 1000)), hs_call_status: estado,
    hs_timestamp: ts || ahoraIso(), ...dueno(),
  }, contactoId);
}

/** Mensajes de WhatsApp como comunicación (canal WHATS_APP); si la cuenta no lo admite, como nota. */
export async function registrarWhatsApp({ contactoId, texto, ts }) {
  try {
    return await crearObjeto('communications', { hs_communication_channel_type: 'WHATS_APP', hs_communication_logged_from: 'CRM', hs_communication_body: html(texto), hs_timestamp: ts || ahoraIso() }, contactoId);
  } catch (err) {
    if (err.status === 429) throw err;
    return crearNota({ contactoId, texto: 'WhatsApp\n' + texto });
  }
}

export const crearNota = ({ contactoId, texto, ts }) => crearObjeto('notes', { hs_note_body: html(texto), hs_timestamp: ts || ahoraIso(), ...dueno() }, contactoId);

export function crearTarea({ contactoId, asunto, cuerpo, vence, prioridad = 'MEDIUM' }) {
  const v = vence ? new Date(vence) : new Date(Date.now() + 24 * 3600e3);
  return crearObjeto('tasks', {
    hs_task_subject: recortar(asunto, 200), hs_task_body: html(cuerpo || asunto), hs_task_status: 'NOT_STARTED', hs_task_priority: prioridad,
    hs_task_type: 'TODO', hs_timestamp: (isNaN(v) ? new Date(Date.now() + 24 * 3600e3) : v).toISOString(), ...dueno(),
  }, contactoId);
}

export const crearNegocio = ({ contactoId, nombre, etapa }) =>
  crearObjeto('deals', { dealname: recortar(nombre, 200), pipeline: cfg.pipeline, dealstage: etapa || cfg.etapa, ...dueno() }, contactoId);

export const crearReunion = ({ contactoId, titulo, cuerpo, inicio, fin, lugar }) => crearObjeto('meetings', {
  hs_meeting_title: titulo, hs_meeting_body: html(cuerpo), hs_meeting_start_time: new Date(inicio).toISOString(), hs_meeting_end_time: new Date(fin).toISOString(),
  hs_meeting_outcome: 'SCHEDULED', hs_meeting_location: lugar, hs_timestamp: new Date(inicio).toISOString(), ...dueno(),
}, contactoId);

// Un negocio por conversación como máximo (agendar_reunion y finalizar pueden pedirlo los dos)
const negociosHechos = new Map();
/** Crea el negocio de la conversación si aún no existe. */
export async function asegurarNegocio(conversacionId, { contactoId, nombre }) {
  if (conversacionId && negociosHechos.has(conversacionId)) return negociosHechos.get(conversacionId);
  const p = crearNegocio({ contactoId, nombre });
  if (conversacionId) negociosHechos.set(conversacionId, p);
  try { return await p; } catch (err) { negociosHechos.delete(conversacionId); throw err; }
}

/** Ejecuta varias escrituras en HubSpot sin que un fallo tumbe la herramienta; devuelve los errores. */
async function enCrm(tareas) {
  const errores = [];
  for (const t of tareas) { try { await t(); } catch (err) { console.warn('[hubspot]', err.message); errores.push(err.message); } }
  return errores;
}

// ---------- Utilidades para las herramientas ----------
const telDe = (ctx) => db.normTel(ctx?.telefono || ctx?.sesion?.telefono || ctx?.contacto?.telefono);
/** Contacto local del contexto (lo crea si solo hay teléfono). */
export function contactoDe(ctx) {
  if (ctx?.contacto?.id) return db.contactoPorId(ctx.contacto.id) || ctx.contacto;
  const tel = telDe(ctx);
  if (!tel) return null;
  const c = db.contactoPorTelefono(tel) || db.guardarContacto({ telefono: tel, origen: ctx.canal || 'asistente' });
  if (ctx) ctx.contacto = c;
  return c;
}
async function idHubspot(ctx) {
  const c = contactoDe(ctx);
  if (!c || !hubspotActivo()) return null;
  return c.hubspot_id || (await sincronizarContacto(c));
}

function textoTranscripcion(conversacionId) {
  if (!conversacionId) return '';
  const nombres = { usuario: 'Interlocutor', asistente: C.empresa.asistente };
  return db.mensajes(conversacionId).filter((m) => nombres[m.rol] && m.texto).map((m) => `${nombres[m.rol]}: ${m.texto}`).join('\n');
}

// Valores admitidos por fe_asistente_resultado (los de finalizar y «colgada», que pone la voz)
export const RESULTADOS = ['reunion_agendada', 'interesado', 'enviar_informacion', 'volver_a_llamar', 'no_interesado', 'baja', 'atendido', 'transferido', 'buzon', 'equivocado', 'colgada'];
const RESULTADOS_NEGOCIO = new Set(['reunion_agendada', 'interesado']);
const RESULTADOS_TAREA = { volver_a_llamar: 'Volver a llamar', enviar_informacion: 'Enviar información', interesado: 'Dar seguimiento', transferido: 'Atender lo transferido' };
export const NOMBRE_NEGOCIO = (quien) => `${quien} · sesión estratégica`;
/** 'AAAA-MM-DD HH:MM:SS' (UTC, de SQLite) o ISO → ISO, o undefined */
const isoDe = (v) => { if (!v) return undefined; const f = new Date(/^\d{4}-\d\d-\d\d \d\d:\d\d(:\d\d)?$/.test(v) ? v.replace(' ', 'T') + 'Z' : v); return isNaN(f) ? undefined : f.toISOString(); };

// ---------- Herramientas ----------
registrar('ficha_contacto', async (_e, ctx) => {
  const c = contactoDe(ctx);
  if (!c) return { aviso: 'No hay datos del interlocutor (número oculto o desconocido). Pregúntele el nombre.' };
  const ficha = {
    local: limpio({ nombre: c.nombre, empresa: c.empresa, cargo: c.cargo, email: c.email, telefono: c.telefono, origen: c.origen, notas: c.notas }),
    consentimiento: c.base_legal ? `${c.base_legal}${c.base_legal_detalle ? ' (' + c.base_legal_detalle + ')' : ''}` : 'no consta',
    de_baja: db.estaDeBaja(c.telefono, c.email),
    conversaciones_anteriores: db.historialContacto(c.id),
  };
  if (!hubspotActivo()) return { ...ficha, crm: SIN_CRM.replace('queda guardado', 'datos') };
  try {
    const id = await idHubspot(ctx);
    if (!id) return { ...ficha, crm: 'No se ha encontrado en HubSpot.' };
    const h = await hs('GET', `/crm/v3/objects/contacts/${id}?properties=${PROPS_CONTACTO.join(',')}&associations=deals`);
    const negocios = [];
    for (const d of (h?.associations?.deals?.results || []).slice(0, 5)) {
      const n = await hs('GET', `/crm/v3/objects/deals/${d.id}?properties=dealname,dealstage,amount,closedate`).catch(() => null);
      if (n) negocios.push(limpio({ nombre: n.properties.dealname, etapa: n.properties.dealstage, importe: n.properties.amount }));
    }
    return { ...ficha, hubspot: limpio(h?.properties || {}), negocios_abiertos: negocios };
  } catch (err) {
    return { ...ficha, crm: `No se ha podido leer HubSpot (${err.message}); se muestran los datos locales.` };
  }
});

registrar('actualizar_contacto', async (e, ctx) => {
  const c = contactoDe(ctx);
  if (!c) return 'No se puede guardar: no hay teléfono ni ficha del interlocutor.';
  const extra = [e.sector && `Sector: ${e.sector}`, e.empleados && `Empleados: ${e.empleados}`, e.facturacion && `Facturación: ${e.facturacion}`, e.dolor && `Preocupación: ${e.dolor}`, e.notas].filter(Boolean);
  const notas = extra.length ? [c.notas, extra.join(' · ')].filter(Boolean).join('\n') : undefined;
  const nuevo = db.guardarContacto({ id: c.id, telefono: c.telefono, nombre: e.nombre, empresa: e.empresa, cargo: e.cargo, email: e.email, notas });
  ctx.contacto && Object.assign(ctx.contacto, nuevo);
  if (!hubspotActivo()) return 'Guardado. ' + SIN_CRM;
  const id = await sincronizarContacto(nuevo, { fe_dolor: e.dolor, empleados: e.empleados });
  if (!id) return 'Guardado en la base local; HubSpot no ha respondido y se reintentará más tarde.';
  if (extra.length) await enCrm([() => crearNota({ contactoId: id, texto: 'Datos facilitados al asistente\n' + extra.join('\n') })]);
  return 'Guardado en la ficha del CRM.';
});

registrar('registrar_nota', async (e, ctx) => {
  const tipo = e.urgente ? 'tarea' : (e.tipo || 'nota');
  if (ctx.conversacionId) db.anotar(ctx.conversacionId, 'nota', e.texto, { tipo, fecha: e.fecha || null, urgente: !!e.urgente });
  else db.evento('nota', { tipo, texto: e.texto, contacto: ctx.contacto?.id ?? null });
  if (e.urgente) {
    db.evento('urgencia', { conversacionId: ctx.conversacionId ?? null, contacto: contactoDe(ctx)?.id ?? null, texto: e.texto.slice(0, 500), canal: ctx.canal });
    avisar({ tipo: 'urgencia', contacto: contactoDe(ctx), conversacionId: ctx.conversacionId, detalle: `Por ${ctx.canal === 'voz' ? 'teléfono' : ctx.canal === 'whatsapp' ? 'WhatsApp' : ctx.canal}: ${e.texto}` });
  }
  if (!hubspotActivo()) return `Anotado (${tipo}${e.urgente ? ', y el equipo está avisado' : ''}). ${SIN_CRM}`;
  const id = await idHubspot(ctx);
  const c = contactoDe(ctx);
  const quien = c?.nombre || c?.telefono || 'contacto';
  const errores = await enCrm([
    tipo === 'tarea' ? () => crearTarea({ contactoId: id, asunto: `${e.urgente ? 'URGENTE · ' : ''}${quien}: ${e.texto}`, cuerpo: e.texto, vence: e.fecha || (e.urgente ? new Date(Date.now() + 2 * 3600e3).toISOString() : undefined), prioridad: e.urgente ? 'HIGH' : 'MEDIUM' })
      : tipo === 'oportunidad' ? () => asegurarNegocio(ctx.conversacionId, { contactoId: id, nombre: `${c?.empresa || quien} · ${e.texto}` }).then(() => crearNota({ contactoId: id, texto: 'Oportunidad: ' + e.texto }))
        : () => crearNota({ contactoId: id, texto: e.texto }),
  ]);
  return (errores.length ? `Anotado en la base local; HubSpot ha fallado (${errores[0]}).` : `Anotado en el CRM (${tipo}).`) + (e.urgente ? ' El equipo está avisado.' : '');
});

/** Baja comercial: base local (manda siempre) y HubSpot (fe_baja si existe, y una nota). */
export async function bajaComercial({ telefono, email, motivo, canal, contacto }) {
  db.darDeBaja(telefono, { email, motivo, canal });
  contacto ||= (telefono && db.contactoPorTelefono(telefono)) || (email && db.contactoPorEmail(email)) || null;
  db.evento('baja', { telefono: db.normTel(telefono), email: email || contacto?.email || null, canal, motivo: motivo || null, contacto: contacto?.id ?? null });
  // Pedida a la asistente (teléfono o WhatsApp): el equipo la extiende a lo que la asistente no controla (correo, LinkedIn)
  if (canal && canal !== 'panel' && canal !== 'hubspot') avisar({ tipo: 'baja', contacto, detalle: `Pedida por ${canal === 'voz' ? 'teléfono' : canal}${motivo ? ': «' + String(motivo).slice(0, 200) + '»' : ''}. Ya no se le llama ni se le escribe por WhatsApp; no le escriban tampoco por correo ni por LinkedIn.` });
  if (!hubspotActivo()) return false;
  const id = contacto?.hubspot_id || (contacto ? await sincronizarContacto(contacto) : (await buscarContacto({ telefono, email }).catch(() => null))?.id);
  if (!id) return false;
  const fe = await propsFe();
  const errores = await enCrm([
    ...(fe.has('fe_baja') ? [() => hs('PATCH', `/crm/v3/objects/contacts/${id}`, { properties: { fe_baja: 'true' } })] : []),
    () => crearNota({ contactoId: id, texto: `Baja de comunicaciones comerciales solicitada por ${canal || 'el interlocutor'}${motivo ? ': ' + motivo : ''}. No volver a contactar con fines comerciales.` }),
  ]);
  return !errores.length;
}

registrar('dar_de_baja', async (e, ctx) => {
  const c = contactoDe(ctx);
  const tel = c?.telefono || telDe(ctx);
  if (!tel) return 'No hay número del interlocutor; anótelo con registrar_nota para que el equipo lo tramite.';
  const ok = await bajaComercial({ telefono: tel, email: c?.email, motivo: e.motivo, canal: ctx.canal, contacto: c });
  return 'Baja registrada: no recibirá más llamadas ni mensajes comerciales. ' + (hubspotActivo() ? (ok ? 'Anotado también en HubSpot.' : 'HubSpot no ha respondido; la baja local ya es efectiva.') : SIN_CRM) + ' Confírmelo con una frase y despídase.';
});

/** Sube al CRM el cierre de una conversación: llamada o WhatsApp con resumen, negocio y tarea según el resultado. */
export async function subirCierre({ conversacionId, canal, direccion, contacto, resultado, resumen, transcripcion, duracionS, registrarComoLlamada = canal === 'voz', seguimiento = true, nota = true, prioridad = null, volverLlamar = null, campana = null }) {
  if (!hubspotActivo()) return [];
  const yaTenia = contacto?.hubspot_id;
  const valido = RESULTADOS.includes(resultado) ? resultado : undefined;
  // La campaña de origen queda en el contacto (fe_campana, si existe) y en la llamada
  const extra = { fe_asistente_resultado: valido, fe_campana: campana?.nombre };
  const id = contacto ? (yaTenia || (await sincronizarContacto(contacto, extra))) : null;
  if (yaTenia && (valido || campana?.nombre)) {
    const fe = await propsFe();
    const props = Object.fromEntries(Object.entries(extra).filter(([k, v]) => v && fe.has(k)));
    if (Object.keys(props).length) await enCrm([() => hs('PATCH', `/crm/v3/objects/contacts/${id}`, { properties: props })]);
  }
  const quien = contacto?.nombre || contacto?.telefono || 'contacto';
  const deCampana = campana?.nombre ? ` · campaña «${campana.nombre}»` : '';
  const tareas = [];
  if (registrarComoLlamada) {
    tareas.push(() => registrarLlamada({ contactoId: id, resumen: campana?.nombre ? `${resumen || '(sin resumen)'}\nCampaña de origen: ${campana.nombre}` : resumen, resultado, transcripcion: transcripcion ?? textoTranscripcion(conversacionId), direccion, duracionS,
      estado: resultado === 'buzon' ? 'NO_ANSWER' : 'COMPLETED', titulo: `Llamada ${direccion || ''} · ${quien}${deCampana}`.replace(/\s+/g, ' ') }));
  } else if (resumen && nota) {
    tareas.push(() => crearNota({ contactoId: id, texto: `Conversación por ${canal === 'whatsapp' ? 'WhatsApp' : canal} con la asistente\nResultado: ${resultado || '-'}${deCampana ? '\nCampaña de origen: ' + campana.nombre : ''}\n${resumen}` }));
  }
  if (seguimiento && id) {
    if (RESULTADOS_NEGOCIO.has(resultado)) tareas.push(() => asegurarNegocio(conversacionId, { contactoId: id, nombre: NOMBRE_NEGOCIO(contacto?.empresa || quien) }));
    if (RESULTADOS_TAREA[resultado]) {
      const vence = resultado === 'volver_a_llamar' ? isoDe(volverLlamar) : undefined;
      tareas.push(() => crearTarea({ contactoId: id, asunto: `${RESULTADOS_TAREA[resultado]}: ${quien}${vence ? ' (' + new Intl.DateTimeFormat('es-ES', { timeZone: C.empresa.zonaHoraria, dateStyle: 'short', timeStyle: 'short' }).format(new Date(vence)) + ', hora pedida)' : ''}`,
        cuerpo: resumen, vence, prioridad: prioridad || 'MEDIUM' }));
    }
  }
  return enCrm(tareas);
}

const cierresSubidos = new Set(); // conversaciones cuya llamada ya está en HubSpot (finalizar y fin de llamada no la duplican)
const seguimientoHecho = new Set(); // conversaciones cuyo negocio/tarea ya creó finalizar
let ganchoVoz = false;

registrar('finalizar', async (e, ctx) => {
  const volverLlamar = e.resultado === 'volver_a_llamar' ? db.fechaPedida(e.volver_a_llamar) : null;
  if (ctx.conversacionId) db.cerrarConversacion(ctx.conversacionId, { resumen: e.resumen, resultado: e.resultado, volverLlamar });
  const contacto = contactoDe(ctx);
  if (e.resultado === 'baja' && contacto?.telefono && !db.estaDeBaja(contacto.telefono)) await bajaComercial({ telefono: contacto.telefono, email: contacto.email, motivo: e.resumen, canal: ctx.canal, contacto });
  if (!hubspotActivo()) return `Conversación cerrada (${e.resultado}). ${SIN_CRM}`;
  // En voz, si la sesión avisa al terminar, la llamada se sube entonces (con duración y transcripción completa)
  const llamadaDespues = ctx.canal === 'voz' && ganchoVoz;
  const errores = await subirCierre({ conversacionId: ctx.conversacionId, canal: ctx.canal, direccion: ctx.direccion, contacto, resultado: e.resultado, resumen: e.resumen,
    registrarComoLlamada: ctx.canal === 'voz' && !llamadaDespues, nota: !llamadaDespues, volverLlamar, campana: ctx.campana });
  if (ctx.conversacionId) seguimientoHecho.add(ctx.conversacionId);
  if (ctx.canal === 'voz' && !llamadaDespues && ctx.conversacionId) cierresSubidos.add(ctx.conversacionId);
  return errores.length ? `Conversación cerrada en la base local; parte del CRM ha fallado (${errores[0]}).` : `Conversación cerrada (${e.resultado}) y registrada en el CRM.`;
});

/**
 * Fin de una llamada (gancho de la sesión de voz: fn(conversacionId, datos)), con
 * datos = { direccion, contacto, resultado, resumen, duracion, transcripcion: [{ rol, texto }] | string }.
 */
export async function alTerminarLlamada(conversacionId, d = {}) {
  if (!conversacionId || cierresSubidos.has(conversacionId)) return;
  cierresSubidos.add(conversacionId);
  if (!hubspotActivo()) return;
  const fila = db.abrir().prepare('SELECT * FROM conversaciones WHERE id = ?').get(conversacionId) || {};
  const contacto = d.contacto || (fila.contacto_id ? db.contactoPorId(fila.contacto_id) : null);
  const nombres = { usuario: 'Interlocutor', asistente: C.empresa.asistente };
  const transcripcion = Array.isArray(d.transcripcion)
    ? d.transcripcion.filter((x) => x?.texto).map((x) => `${nombres[x.rol] || x.rol}: ${x.texto}`).join('\n')
    : (typeof d.transcripcion === 'string' ? d.transcripcion : undefined);
  await subirCierre({ conversacionId, canal: 'voz', direccion: d.direccion || fila.direccion, contacto,
    resultado: d.resultado || fila.resultado || null, resumen: d.resumen || fila.resumen || null,
    transcripcion, duracionS: d.duracion ?? d.duracionS ?? fila.duracion_s ?? 0, prioridad: d.prioridad || null, volverLlamar: d.volverLlamar || fila.volver_llamar || null,
    campana: d.campana || (fila.campana_id ? db.abrir().prepare('SELECT nombre FROM campanas WHERE id = ?').get(fila.campana_id) : null),
    seguimiento: !seguimientoHecho.has(conversacionId) }); // si hubo finalizar, el negocio y la tarea ya se crearon entonces
}

/** Se suscribe al fin de llamada de la voz si ese módulo existe. */
export async function engancharVoz() {
  try {
    const m = await import('../voz/sesion.js');
    if (Array.isArray(m.ganchos?.alTerminar)) {
      m.ganchos.alTerminar.push((id, datos) => alTerminarLlamada(id, datos).catch((err) => console.warn('[hubspot] fin de llamada:', err.message)));
      ganchoVoz = true;
    }
  } catch (err) {
    if (err.code !== 'ERR_MODULE_NOT_FOUND') console.warn('[hubspot] gancho de voz:', err.message);
  }
  return ganchoVoz;
}
// Fuera de los tests y tras cargar este módulo (evita ciclos de importación con la voz)
if (!process.env.NODE_TEST_CONTEXT) setImmediate(engancharVoz);
