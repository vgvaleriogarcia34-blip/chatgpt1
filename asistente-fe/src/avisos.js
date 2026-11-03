// Avisos inmediatos al equipo: lo que no puede esperar a que alguien abra el panel.
//   · Correo (SMTP) a RESPONSABLE_EMAIL.
//   · WhatsApp al móvil del responsable (RESPONSABLE_MOVIL), solo si hay plantilla aprobada (WHATSAPP_PLANTILLA_AVISO_EQUIPO).
// Casos: transferencia sin respuesta, urgencia, fallo técnico (voz o WhatsApp), reunión pendiente de confirmar y baja.
// Nunca lanza: si no hay canal configurado o falla, queda anotado en eventos (tipo aviso_equipo) y en la bandeja del panel.
import { C } from './config.js';
import * as db from './almacen/db.js';
import { enviarCorreo, smtpConfigurado } from './correo.js';
import * as meta from './whatsapp/meta.js';

export const TIPOS = {
  transferencia_sin_respuesta: 'Llamada transferida sin respuesta: hay que devolverla',
  transferencia_imposible: 'Pide hablar con una persona y no se ha podido pasar la llamada',
  urgencia: 'Urgencia de un contacto',
  fallo_voz: 'Fallo técnico en una llamada',
  fallo_whatsapp: 'Fallo técnico en WhatsApp',
  reunion_pendiente: 'Sesión estratégica pendiente de confirmar',
  baja: 'Petición de baja de comunicaciones comerciales',
};

const cfg = {
  correo: enviarCorreo, // inyectables en tests
  whatsapp: (tel, plantilla, idioma, componentes) => meta.enviarPlantilla(tel, plantilla, idioma, componentes),
  repeticionMs: 10 * 60e3, // el mismo aviso (tipo + conversación) no se repite en diez minutos
};
export function configurarAvisos(o = {}) { Object.assign(cfg, o); }

const recientes = new Map();
const urlPanel = (contactoId) => (C.urlPublica ? `${C.urlPublica}/panel${contactoId ? '#contacto/' + contactoId : '#acciones'}` : null);

/** Canales disponibles ahora mismo. */
export function canalesAviso() {
  return {
    correo: smtpConfigurado() && !!C.empresa.emailResponsable,
    whatsapp: !!(C.avisos.plantillaWhatsApp && C.empresa.movilResponsable && meta.metaActivo()),
  };
}

/** Texto del aviso (también es lo que se guarda). */
export function textoAviso({ tipo, detalle, contacto, conversacionId }) {
  const c = contacto || {};
  const ficha = [
    `Contacto: ${[c.nombre, c.empresa && `(${c.empresa})`].filter(Boolean).join(' ') || (c.telefono || c.email ? 'sin nombre' : 'desconocido')}`,
    c.telefono && `Teléfono: ${c.telefono}`, c.email && `Correo: ${c.email}`,
    conversacionId && `Conversación: ${conversacionId}`, urlPanel(c.id) && `Ficha en el panel: ${urlPanel(c.id)}`,
  ].filter(Boolean);
  return [TIPOS[tipo] || tipo, detalle, ficha.join('\n'), `Aviso automático de ${C.empresa.asistente}, la asistente de inteligencia artificial de ${C.empresa.nombre}.`]
    .filter(Boolean).join('\n\n');
}

/**
 * Avisa al equipo. Devuelve { correo, whatsapp } con true, o el motivo por el que no se envió.
 * @param {object} a
 * @param {keyof TIPOS} a.tipo
 * @param {string} [a.detalle]
 * @param {object} [a.contacto]  fila de contactos
 * @param {number} [a.conversacionId]
 */
export async function avisarEquipo({ tipo, detalle = '', contacto = null, conversacionId = null }) {
  const clave = `${tipo}:${conversacionId ? 'v' + conversacionId : contacto?.id ? 'c' + contacto.id : 't' + detalle}`;
  const ahora = Date.now();
  for (const [k, t] of recientes) if (ahora - t > cfg.repeticionMs) recientes.delete(k);
  if (recientes.has(clave)) return { correo: 'repetido', whatsapp: 'repetido' };
  recientes.set(clave, ahora);

  const titulo = TIPOS[tipo] || tipo;
  const texto = textoAviso({ tipo, detalle, contacto, conversacionId });
  const canales = canalesAviso();
  const r = { correo: 'sin configurar', whatsapp: 'sin plantilla' };
  const quien = contacto?.nombre || contacto?.telefono || '';
  if (canales.correo) {
    try { await cfg.correo({ para: C.empresa.emailResponsable, asunto: `[Asistente] ${titulo}${quien ? ' · ' + quien : ''}`, texto }); r.correo = true; }
    catch (err) { r.correo = String(err.message || err).slice(0, 200); console.warn('[avisos] correo:', r.correo); }
  }
  if (canales.whatsapp) {
    const resumen = meta.variablePlantilla(`${titulo}${quien ? ' · ' + quien : ''}${contacto?.telefono && contacto.telefono !== quien ? ' (' + contacto.telefono + ')' : ''}. ${detalle}`.slice(0, 900));
    try { await cfg.whatsapp(C.empresa.movilResponsable, C.avisos.plantillaWhatsApp, C.avisos.idiomaPlantilla, [{ type: 'body', parameters: [{ type: 'text', text: resumen }] }]); r.whatsapp = true; }
    catch (err) { r.whatsapp = String(err.message || err).slice(0, 200); console.warn('[avisos] whatsapp:', r.whatsapp); }
  }
  db.evento('aviso_equipo', { tipo, detalle: String(detalle).slice(0, 500), contacto: contacto?.id ?? null, conversacionId, correo: r.correo, whatsapp: r.whatsapp });
  return r;
}

/** Igual que avisarEquipo, en segundo plano (no retrasa la conversación). */
export function avisar(a) {
  Promise.resolve().then(() => avisarEquipo(a)).catch((err) => console.warn('[avisos]', err.message));
}
