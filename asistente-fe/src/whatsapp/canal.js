// Canal de WhatsApp: mensajes entrantes → Conversacion con Claude → respuesta por la API Cloud de Meta.
// Un turno a la vez por contacto; los mensajes seguidos (2 s) se agrupan en un solo turno.
import { C } from '../config.js';
import * as db from '../almacen/db.js';
import { registrar } from '../cerebro/herramientas.js';
import * as meta from './meta.js';
import { hubspotActivo, sincronizarContacto, registrarWhatsApp, bajaComercial, crearTarea, bajaEnHubspot } from '../crm/hubspot.js';
import { avisar } from '../avisos.js';

const cfg = {
  agruparMs: 2000,
  maxCaracteres: 1500, // por mensaje enviado (el límite de Meta es 4096)
  deepgramBase: 'https://api.deepgram.com',
  deepgramKey: C.deepgram.apiKey,
  Conversacion: null, // inyectable en tests; por defecto la de cerebro/agente.js
  plantillaSeguimiento: (process.env.WHATSAPP_PLANTILLA_SEGUIMIENTO || '').trim(),
  idiomaPlantilla: (process.env.WHATSAPP_PLANTILLA_IDIOMA || 'es').trim(),
};
/** Para tests o reconfiguración. */
export function configurarCanal(o = {}) { Object.assign(cfg, o); }

const VENTANA_MS = 24 * 3600e3;
const MARGEN_VENTANA_MS = 5 * 60e3;

async function claseConversacion() {
  return cfg.Conversacion || (cfg.Conversacion = (await import('../cerebro/agente.js')).Conversacion);
}

// ---------- Deduplicación (Meta reintenta si no recibe 200 a tiempo) ----------
const vistos = new Map();
function yaVisto(id) {
  const ahora = Date.now();
  if (vistos.size > 5000) for (const [k, t] of vistos) if (ahora - t > VENTANA_MS) vistos.delete(k);
  if (vistos.has(id)) return true;
  vistos.set(id, ahora);
  // Tras un reinicio, el registro local también sirve
  const enDb = db.abrir().prepare(`SELECT 1 FROM mensajes WHERE rol = 'usuario' AND ts > datetime('now', '-2 days') AND datos LIKE ? LIMIT 1`).get(`%"${id.replace(/[%_"\\]/g, '')}"%`);
  return !!enDb;
}

// ---------- Utilidades ----------
const BAJA = [
  /^\s*(baja|stop|darme de baja|dar de baja|dadme de baja|denme de baja|deme de baja)\s*[.!¡]*\s*$/iu,
  /no (me|nos) (escrib|mand|envi|llam|contact)\p{L}*\s+(m[aá]s|nunca)/iu,
  /no quiero (recibir m[aá]s|que me (escrib|llam|contact|mand|envi))/iu,
  /dej(e|en|ad|a|éis|eis|ar) de (escribirme|escribirnos|mandarme|enviarme|llamarme|contactarme|escribir|llamar)/iu,
  /(quiero|quisiera|deseo) darme de baja|(dadme|denme|deme) de baja/iu,
];
export const esBaja = (t) => !!t && BAJA.some((r) => r.test(t));

const CONFIRMACION_BAJA = 'Entendido. Le hemos dado de baja y no le enviaremos más mensajes comerciales. Si en algún momento necesita algo, puede escribirnos por aquí.';
const PIDE_ESCRITO = 'Disculpe, ahora mismo no puedo escuchar notas de voz. ¿Podría escribirme su mensaje?';
const DISCULPA = 'Disculpe, ahora mismo no puedo responderle. Una persona del equipo le escribirá en breve.';

/** Parte un texto largo en mensajes: por párrafos, luego por frases y, si hace falta, a la fuerza. */
export function partirTexto(texto, max = cfg.maxCaracteres) {
  const t = String(texto).trim();
  if (t.length <= max) return t ? [t] : [];
  const trozos = [];
  let actual = '';
  const meter = (p, sep) => {
    if (!actual) actual = p;
    else if ((actual + sep + p).length <= max) actual += sep + p;
    else { trozos.push(actual); actual = p; }
  };
  for (const parrafo of t.split(/\n{2,}/)) {
    if (parrafo.length <= max) { meter(parrafo.trim(), '\n\n'); continue; }
    let sep = '\n\n';
    for (let f of parrafo.match(/[^.!?…]+(?:[.!?…]+|$)\s*/g) || [parrafo]) {
      f = f.trim();
      while (f.length > max) { if (actual) { trozos.push(actual); actual = ''; } trozos.push(f.slice(0, max)); f = f.slice(max); }
      if (f) meter(f, sep);
      sep = ' ';
    }
  }
  if (actual) trozos.push(actual);
  return trozos;
}

async function enviarLargo(tel, texto) {
  if (!meta.metaActivo()) { console.warn('[whatsapp] sin configurar: no se envía la respuesta'); return []; }
  const ids = [];
  for (const parte of partirTexto(texto)) ids.push(await meta.enviarTexto(tel, parte));
  return ids;
}

/** Transcribe audio con Deepgram (REST). Sin clave devuelve null. */
export async function transcribir(datos, mime = 'audio/ogg') {
  if (!cfg.deepgramKey) return null;
  const q = new URLSearchParams({ model: C.deepgram.modelo || 'nova-3', language: C.deepgram.idioma || 'es', smart_format: 'true' });
  const r = await fetch(`${cfg.deepgramBase}/v1/listen?${q}`, {
    method: 'POST', headers: { Authorization: `Token ${cfg.deepgramKey}`, 'Content-Type': String(mime).split(';')[0].trim() || 'audio/ogg' },
    body: datos, signal: AbortSignal.timeout(60000),
  });
  if (!r.ok) throw new Error(`Deepgram ${r.status}`);
  const j = await r.json();
  return (j?.results?.channels?.[0]?.alternatives?.[0]?.transcript || '').trim();
}

const IMAGENES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

/** Contenido de un mensaje de Meta: { texto, bloques?, audioFallido?, ignorar? } */
async function contenidoDe(m) {
  switch (m.type) {
    case 'text': return { texto: m.text?.body || '' };
    case 'audio': {
      if (!cfg.deepgramKey || !meta.metaActivo()) return { audioFallido: true };
      try {
        const { datos, mime } = await meta.descargarMedia(m.audio.id);
        const t = await transcribir(datos, mime);
        return t ? { texto: `[Nota de voz transcrita] ${t}` } : { audioFallido: true };
      } catch (err) { console.warn('[whatsapp] nota de voz:', err.message); return { audioFallido: true }; }
    }
    case 'button': return { texto: m.button?.text || m.button?.payload || '' };
    case 'interactive': {
      const i = m.interactive || {};
      const r = i.button_reply || i.list_reply;
      if (r) return { texto: [r.title, r.description].filter(Boolean).join(' — ') };
      if (i.nfm_reply) return { texto: `[Formulario] ${i.nfm_reply.response_json || i.nfm_reply.body || ''}` };
      return { texto: '[Respuesta interactiva]' };
    }
    case 'image': {
      const pie = m.image?.caption ? ` con el texto: «${m.image.caption}»` : '';
      const res = { texto: `[Imagen]${pie}` };
      if (meta.metaActivo()) {
        try {
          const { datos, mime } = await meta.descargarMedia(m.image.id, { maxBytes: 5 * 1024 * 1024 });
          const tipo = mime.split(';')[0].trim();
          if (IMAGENES.has(tipo)) res.bloques = [{ type: 'image', source: { type: 'base64', media_type: tipo, data: datos.toString('base64') } }];
        } catch (err) { console.warn('[whatsapp] imagen:', err.message); }
      }
      return res;
    }
    case 'document': return { texto: `[Documento${m.document?.filename ? ' «' + m.document.filename + '»' : ''}, no se puede abrir aquí]${m.document?.caption ? ' ' + m.document.caption : ''}` };
    case 'video': return { texto: `[Vídeo, no se puede ver aquí]${m.video?.caption ? ' ' + m.video.caption : ''}` };
    case 'sticker': return { texto: '[Pegatina]' };
    case 'location': { const l = m.location || {}; return { texto: `[Ubicación: ${[l.name, l.address].filter(Boolean).join(', ') || `${l.latitude}, ${l.longitude}`}]` }; }
    case 'contacts': return { texto: `[Tarjeta de contacto: ${(m.contacts || []).map((c) => c.name?.formatted_name).filter(Boolean).join(', ')}]` };
    case 'reaction': return { ignorar: true };
    default: return { texto: '[Mensaje de un tipo que no se puede leer aquí]' };
  }
}

// ---------- Conversaciones en memoria, una por contacto ----------
const convs = new Map(); // tel → { id, conv }

/** Reconstruye el historial (solo texto de usuario y asistente) desde la base local. Devuelve el texto de usuario sin responder, si lo hay. */
export function reconstruir(conv, conversacionId) {
  const out = [];
  for (const m of db.mensajes(conversacionId)) {
    if (!m.texto || (m.rol !== 'usuario' && m.rol !== 'asistente')) continue;
    const role = m.rol === 'usuario' ? 'user' : 'assistant';
    const ult = out.at(-1);
    if (ult?.role === role) ult.content[0].text += '\n' + m.texto;
    else out.push({ role, content: [{ type: 'text', text: m.texto }] });
  }
  if (out[0]?.role === 'assistant') out.unshift({ role: 'user', content: [{ type: 'text', text: '[La conversación empezó con un mensaje nuestro]' }] });
  const pendiente = out.at(-1)?.role === 'user' ? out.pop().content[0].text : null;
  conv.messages = out;
  return pendiente;
}

async function conversacionDe(contacto, tel) {
  const fila = db.conversacionAbiertaWhatsApp(contacto.id);
  const id = fila?.id ?? db.abrirConversacion({ canal: 'whatsapp', direccion: 'entrante', contactoId: contacto.id, externoId: tel });
  let e = convs.get(tel);
  if (e && e.id === id) { e.conv.contacto = contacto; return e; }
  const Clase = await claseConversacion();
  const conv = new Clase({ canal: 'whatsapp', direccion: fila?.direccion || 'entrante', contacto, conversacionId: id, extra: { telefono: tel } });
  e = { id, conv, pendiente: fila ? reconstruir(conv, id) : null };
  convs.set(tel, e);
  return e;
}
export const conversacionEnMemoria = (tel) => convs.get(db.normTel(tel)) || null;
export function olvidarConversaciones() { convs.clear(); }

/** Hilo de WhatsApp del contacto (el abierto en 24 h o uno nuevo). */
function hilo(contacto, direccion) {
  return db.conversacionAbiertaWhatsApp(contacto.id)?.id ?? db.abrirConversacion({ canal: 'whatsapp', direccion, contactoId: contacto.id, externoId: contacto.telefono });
}

// ---------- Ventana de 24 h ----------
const ultimaEntrada = new Map();
/** ¿Ha escrito el contacto en las últimas 24 h? (solo entonces se admite texto libre) */
export function dentroDeVentana(tel) {
  const t = db.normTel(tel);
  const mem = ultimaEntrada.get(t) || 0;
  const c = db.contactoPorTelefono(t);
  let enDb = 0;
  if (c) {
    const r = db.abrir().prepare(`SELECT MAX(m.ts) AS ts FROM mensajes m JOIN conversaciones c ON c.id = m.conversacion_id WHERE c.canal = 'whatsapp' AND c.contacto_id = ? AND m.rol = 'usuario'`).get(c.id);
    if (r?.ts) enDb = Date.parse(r.ts.replace(' ', 'T') + 'Z') || 0;
  }
  return Date.now() - Math.max(mem, enDb) < VENTANA_MS - MARGEN_VENTANA_MS;
}

// ---------- Entrada ----------
const colas = new Map(); // tel → { pendientes, timer, cadena, ocupado }

/** Procesa el cuerpo de un webhook de Meta (ya verificado). Devuelve cuántos mensajes nuevos se han encolado. */
export function procesarWebhook(cuerpo) {
  let n = 0;
  for (const entry of cuerpo?.entry || []) {
    for (const ch of entry.changes || []) {
      if (ch.field && ch.field !== 'messages') continue;
      const v = ch.value || {};
      const nombres = new Map((v.contacts || []).map((c) => [c.wa_id, c.profile?.name]));
      for (const m of v.messages || []) {
        if (!m?.id || !m.from || yaVisto(String(m.id))) continue;
        encolar(db.normTel('+' + String(m.from).replace(/\D/g, '')), { m, nombre: nombres.get(m.from) });
        n++;
      }
      for (const s of v.statuses || []) {
        if (s.status === 'failed') {
          console.warn('[whatsapp] envío fallido:', (s.errors || []).map((e) => `${e.code} ${e.title}`).join('; '));
          const tel = s.recipient_id ? db.normTel('+' + String(s.recipient_id).replace(/\D/g, '')) : null;
          const contacto = tel ? db.contactoPorTelefono(tel) : null;
          const errores = (s.errors || []).map((e) => `${e.code} ${e.title || ''}`.trim());
          db.evento('whatsapp_fallo', { id: s.id, telefono: tel, contacto: contacto?.id ?? null, errores: (s.errors || []).map((e) => e.code) });
          avisar({ tipo: 'fallo_whatsapp', contacto: contacto || (tel ? { telefono: tel } : null), detalle: `Meta no ha entregado un mensaje (${errores.join('; ') || 'sin detalle'}). Escríbale o llámele por otro medio.` });
        }
      }
    }
  }
  return n;
}

function encolar(tel, item) {
  let q = colas.get(tel);
  if (!q) colas.set(tel, (q = { pendientes: [], timer: null, cadena: Promise.resolve(), ocupado: false }));
  q.pendientes.push(item);
  clearTimeout(q.timer);
  q.timer = setTimeout(() => {
    q.timer = null;
    q.cadena = q.cadena.then(() => turno(tel, q)).catch((err) => console.error('[whatsapp] turno:', err));
  }, cfg.agruparMs);
}

/** Espera a que no quede nada pendiente (para tests y para un cierre ordenado). */
export async function esperarColas() {
  for (;;) {
    const qs = [...colas.values()];
    if (!qs.some((q) => q.timer || q.ocupado || q.pendientes.length)) return;
    await Promise.all(qs.map((q) => q.cadena));
    await new Promise((ok) => setTimeout(ok, 10));
  }
}

async function turno(tel, q) {
  const lote = q.pendientes.splice(0);
  if (!lote.length) return;
  q.ocupado = true;
  let convId = null;
  try {
    const nombre = lote.map((x) => x.nombre).find(Boolean);
    let contacto = db.contactoPorTelefono(tel) || db.guardarContacto({ telefono: tel, nombre, origen: 'whatsapp' });
    if (!contacto.nombre && nombre) contacto = db.guardarContacto({ telefono: tel, nombre });
    if (hubspotActivo() && !contacto.hubspot_id) await sincronizarContacto(contacto);
    ultimaEntrada.set(tel, Date.now());
    if (meta.metaActivo()) meta.marcarLeido(lote.at(-1).m.id).catch(() => {});

    const partes = [];
    for (const x of lote) partes.push(await contenidoDe(x.m));
    const utiles = partes.filter((p) => !p.ignorar);
    if (!utiles.length) return;
    const texto = utiles.map((p) => p.texto).filter(Boolean).join('\n');
    const bloquesExtra = utiles.flatMap((p) => p.bloques || []);

    const e = await conversacionDe(contacto, tel);
    convId = e.id;
    db.anotar(e.id, 'usuario', texto || '[Nota de voz sin transcribir]', { wa: lote.map((x) => x.m.id) });

    let respuesta;
    if (esBaja(texto)) {
      await bajaComercial({ telefono: tel, email: contacto.email, motivo: texto.slice(0, 300), canal: 'whatsapp', contacto });
      respuesta = CONFIRMACION_BAJA;
      await enviarLargo(tel, respuesta);
      db.anotar(e.id, 'asistente', respuesta);
      db.cerrarConversacion(e.id, { resultado: 'baja', resumen: 'Pidió por WhatsApp no recibir más mensajes comerciales.' });
    } else if (!texto && !bloquesExtra.length) {
      respuesta = PIDE_ESCRITO; // solo notas de voz que no se han podido transcribir
      await enviarLargo(tel, respuesta);
      db.anotar(e.id, 'asistente', respuesta);
    } else {
      const avisos = [];
      if (e.pendiente) { avisos.push(e.pendiente); e.pendiente = null; }
      if (db.estaDeBaja(tel)) avisos.unshift('[Contexto interno: este contacto pidió la baja de comunicaciones comerciales. Atiéndale en lo que pida, pero no le proponga nada comercial por iniciativa propia.]');
      if (utiles.some((p) => p.audioFallido)) avisos.push('[Contexto interno: también ha enviado una nota de voz que no se ha podido transcribir; pídale que la escriba si hace falta.]');
      const bloques = [{ type: 'text', text: [...avisos, texto].filter(Boolean).join('\n') }, ...bloquesExtra];
      const r = await e.conv.responder(bloques, {});
      respuesta = (r?.texto || '').trim();
      if (respuesta) {
        await enviarLargo(tel, respuesta);
        db.anotar(e.id, 'asistente', respuesta);
      }
    }
    if (hubspotActivo() && contacto.hubspot_id) {
      registrarWhatsApp({ contactoId: contacto.hubspot_id, texto: `${contacto.nombre || tel}: ${texto}${respuesta ? `\n${C.empresa.asistente}: ${respuesta}` : ''}` })
        .catch((err) => console.warn('[hubspot] whatsapp:', err.message));
    }
  } catch (err) {
    console.error('[whatsapp] error en el turno:', err.message || err);
    const c = db.contactoPorTelefono(tel);
    db.evento('whatsapp_error', { telefono: tel, contacto: c?.id ?? null, conversacionId: convId, error: String(err.message || err).slice(0, 300) });
    let enviada = false;
    try { enviada = (await enviarLargo(tel, DISCULPA)).length > 0; } catch (e2) { console.error('[whatsapp] tampoco se ha podido enviar la disculpa:', e2.message); }
    // La disculpa solo queda en la conversación si de verdad se ha enviado
    if (convId && enviada) db.anotar(convId, 'asistente', DISCULPA);
    else if (convId) db.anotar(convId, 'sistema', 'No se ha podido responder ni enviar la disculpa.', { fallo: true });
    avisar({ tipo: 'fallo_whatsapp', contacto: c || { telefono: tel }, conversacionId: convId, detalle: `La asistente no ha podido responder un WhatsApp (${String(err.message || err).slice(0, 200)}). ${enviada ? 'Se le ha dicho que una persona del equipo le escribirá en breve.' : 'Tampoco se ha podido enviar la disculpa: escríbale usted.'}` });
    try {
      if (hubspotActivo() && c?.hubspot_id) await crearTarea({ contactoId: c.hubspot_id, asunto: `Responder WhatsApp de ${c.nombre || tel}`, cuerpo: 'La asistente no ha podido responder; revisar la conversación.', prioridad: 'HIGH' });
    } catch (e2) { console.error('[whatsapp] tarea en HubSpot:', e2.message); }
  } finally {
    q.ocupado = false;
    if (!q.pendientes.length && !q.timer && colas.get(tel) === q) colas.delete(tel);
  }
}

// ---------- Salida ----------
async function anotarEnviado(contacto, texto, datos, ctx) {
  const id = hilo(contacto, 'saliente');
  db.anotar(id, 'asistente', texto, datos);
  if (ctx?.conversacionId && ctx.conversacionId !== id) db.anotar(ctx.conversacionId, 'whatsapp_enviado', texto, datos);
  if (hubspotActivo()) {
    const hs = contacto.hubspot_id || (await sincronizarContacto(contacto));
    if (hs) await registrarWhatsApp({ contactoId: hs, texto: `${C.empresa.asistente} (enviado): ${texto}` }).catch((err) => console.warn('[hubspot] whatsapp:', err.message));
  }
  return id;
}

registrar('enviar_whatsapp', async (e, ctx) => {
  const tel = db.normTel(ctx.telefono || ctx.sesion?.telefono || ctx.contacto?.telefono);
  if (!tel) return 'No hay número del interlocutor (por ejemplo, número oculto). Pídale el número o ofrezca que el equipo se lo haga llegar.';
  if (!meta.metaActivo()) return 'WhatsApp no está configurado en este servidor. Ofrezca que una persona del equipo se lo envíe.';
  const contacto = (ctx.contacto?.id && db.contactoPorId(ctx.contacto.id)) || db.contactoPorTelefono(tel) || db.guardarContacto({ telefono: tel, origen: ctx.canal || 'asistente' });
  if (dentroDeVentana(tel)) {
    const id = await meta.enviarTexto(tel, e.texto);
    await anotarEnviado(contacto, e.texto, { wa_enviado: id }, ctx);
    return 'Enviado por WhatsApp.';
  }
  // Fuera de la ventana es un mensaje por iniciativa propia: solo sin baja y con consentimiento para WhatsApp
  if (db.estaDeBaja(tel, contacto.email)) {
    return { enviado: false, motivo: 'Este contacto pidió no recibir comunicaciones comerciales y no ha escrito en las últimas 24 horas: no se le envía WhatsApp. Ofrezca que una persona del equipo le haga llegar lo que pide por el medio que prefiera.' };
  }
  if (!contacto.consentimiento_whatsapp) {
    if (e.acepta_whatsapp && ctx.canal === 'voz') {
      // Lo acaba de aceptar de viva voz en la llamada: queda registrado con su fecha (la transcripción es la prueba)
      const hoy = new Date().toISOString().slice(0, 10);
      db.guardarContacto({ id: contacto.id, telefono: contacto.telefono, consentimiento_whatsapp: hoy });
      contacto.consentimiento_whatsapp = hoy;
      if (ctx.conversacionId) db.anotar(ctx.conversacionId, 'nota', 'Aceptó en la llamada recibir mensajes de WhatsApp de la firma.', { tipo: 'nota', consentimiento_whatsapp: hoy });
    } else {
      return { enviado: false, motivo: 'No consta que haya aceptado recibir WhatsApp de la firma y no ha escrito en las últimas 24 horas. En una llamada, pregúntele si acepta recibirlo por WhatsApp y, si dice que sí, vuelva a usar enviar_whatsapp con acepta_whatsapp. Si no, ofrezca que una persona del equipo se lo haga llegar.' };
    }
  }
  if (!cfg.plantillaSeguimiento) {
    return { enviado: false, motivo: 'Fuera de la ventana de 24 horas WhatsApp solo admite plantillas aprobadas y no hay ninguna configurada. Ofrezca enviarlo por correo o que una persona del equipo se lo haga llegar.' };
  }
  const id = await meta.enviarPlantilla(tel, cfg.plantillaSeguimiento, cfg.idiomaPlantilla, [{ type: 'body', parameters: [{ type: 'text', text: meta.variablePlantilla(e.texto) }] }]);
  await anotarEnviado(contacto, e.texto, { wa_enviado: id, plantilla: cfg.plantillaSeguimiento }, ctx);
  return 'Enviado por WhatsApp (con la plantilla de seguimiento, porque no había escrito en las últimas 24 horas).';
});

/**
 * Envío por iniciativa propia (prospección): solo plantillas, y solo si no está de baja y consta base legal.
 * @returns {Promise<{enviado:boolean, motivo?:string, id?:string, conversacionId?:number}>}
 */
export async function enviarProactivo(tel, plantilla, variables = [], { idioma = cfg.idiomaPlantilla, baseLegal = null, texto = null } = {}) {
  const t = db.normTel(tel);
  if (!t) return { enviado: false, motivo: 'teléfono no válido' };
  if (!plantilla) return { enviado: false, motivo: 'falta la plantilla' };
  if (!meta.metaActivo()) return { enviado: false, motivo: 'WhatsApp no configurado' };
  if (db.estaDeBaja(t, db.contactoPorTelefono(t)?.email)) return { enviado: false, motivo: 'de baja' };
  let contacto = db.contactoPorTelefono(t);
  const base = baseLegal || contacto?.base_legal;
  if (!base) return { enviado: false, motivo: 'sin base legal registrada' };
  // Las reglas de cumplimiento de la prospección mandan: consentimiento expreso para WhatsApp, Robinson siempre, intentos
  const { puedeEnviarWhatsApp } = await import('../prospeccion/cumplimiento.js');
  const ok = puedeEnviarWhatsApp(contacto ? { ...contacto, base_legal: base } : { telefono: t, base_legal: base }, { plantilla });
  if (!ok.ok) return { enviado: false, motivo: ok.motivo, codigo: ok.codigo };
  // Justo antes de escribir: ¿consta la baja en HubSpot? Si HubSpot no responde, no se envía (se reintenta más tarde)
  const hb = await bajaEnHubspot(contacto || { telefono: t });
  if (hb.baja) return { enviado: false, motivo: 'de baja (HubSpot)', codigo: 'baja' };
  if (hb.error) return { enviado: false, motivo: `HubSpot no responde (${hb.error}): no se envía hasta poder comprobar la baja`, codigo: 'hubspot_no_responde', reintentar: true };
  const vars = (variables || []).map(meta.variablePlantilla);
  const id = await meta.enviarPlantilla(t, plantilla, idioma, vars.length ? [{ type: 'body', parameters: vars.map((v) => ({ type: 'text', text: v })) }] : []);
  contacto ||= db.guardarContacto({ telefono: t, base_legal: base, origen: 'prospeccion' });
  const conversacionId = await anotarEnviado(contacto, texto || `[Plantilla «${plantilla}»] ${vars.join(' · ')}`.trim(), { wa_enviado: id, plantilla, variables: vars });
  return { enviado: true, id, conversacionId };
}
