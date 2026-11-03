// Rutas de la voz: webhooks de Twilio (firmados), flujo de audio en WebSocket y llamar() para la prospección.
import { ruta, rutaWs, leerCuerpo, enviar } from '../servidor.js';
import { C } from '../config.js';
import * as db from '../almacen/db.js';
import { SesionVoz, sesiones, amdPendientes } from './sesion.js';
import { firmaValida, formulario, twimlStream, twimlDecirYColgar, firmaStream, llamadaSaliente, vozConfigurada } from './twilio.js';
import { avisar } from '../avisos.js';
import { hubspotActivo, sincronizarContacto, crearTarea } from '../crm/hubspot.js';

export { ganchos } from './sesion.js';
export const alEstadoLlamada = []; // fn({ callSid, estado, duracion, telefono, contactoId, campanaId, answeredBy }) al acabar cada llamada

const XML = 'text/xml; charset=utf-8';
const log = (...a) => console.log('[voz]', ...a);
const NO_DISPONIBLE = 'Disculpe, en este momento no podemos atender su llamada. Por favor, inténtelo más tarde o escríbanos por WhatsApp. Gracias.';

/** Lee el cuerpo y comprueba la firma de Twilio; si no es válida responde 403 y devuelve null. */
async function webhook(req, res) {
  const p = formulario(await leerCuerpo(req));
  if (!firmaValida(req, p)) {
    log(`firma de Twilio no válida en ${req.url.split('?')[0]}`);
    enviar(res, 403, 'Firma no válida');
    return null;
  }
  return p;
}

ruta('POST', '/voz/entrante', async (req, res) => {
  const p = await webhook(req, res); if (!p) return;
  if (!vozConfigurada()) return enviar(res, 200, twimlDecirYColgar(NO_DISPONIBLE), XML);
  enviar(res, 200, twimlStream({ direccion: 'entrante', callSid: p.CallSid, desde: p.From, firma: firmaStream(p.CallSid) }), XML);
});

ruta('POST', '/voz/saliente-twiml', async (req, res, { url }) => {
  const p = await webhook(req, res); if (!p) return;
  enviar(res, 200, twimlStream({
    direccion: 'saliente', callSid: p.CallSid, telefono: p.To,
    contactoId: url.searchParams.get('contactoId'), campanaId: url.searchParams.get('campanaId'),
    firma: firmaStream(p.CallSid),
  }), XML);
});

const FINALES = new Set(['completed', 'no-answer', 'busy', 'failed', 'canceled']);
ruta('POST', '/voz/estado', async (req, res, { url }) => {
  const p = await webhook(req, res); if (!p) return;
  const datos = {
    callSid: p.CallSid, estado: p.CallStatus, duracion: p.CallDuration ? Number(p.CallDuration) : 0,
    telefono: db.normTel(p.To), contactoId: url.searchParams.get('contactoId') ? Number(url.searchParams.get('contactoId')) : null,
    campanaId: url.searchParams.get('campanaId') ? Number(url.searchParams.get('campanaId')) : null, answeredBy: p.AnsweredBy || null,
  };
  db.evento('llamada_estado', datos);
  if (FINALES.has(datos.estado)) {
    // Si la sesión no llegó a cerrar su conversación (caída del WebSocket), se cierra aquí
    const conv = db.conversacionPorExterno(datos.callSid);
    if (conv && conv.estado === 'abierta' && !sesiones.has(datos.callSid)) db.cerrarConversacion(conv.id, { resultado: datos.estado === 'completed' ? 'colgada' : datos.estado, duracion: datos.duracion });
    for (const fn of alEstadoLlamada) Promise.resolve().then(() => fn(datos)).catch((err) => log('gancho alEstadoLlamada:', err.message));
  }
  enviar(res, 204, '');
});

ruta('POST', '/voz/amd', async (req, res) => {
  const p = await webhook(req, res); if (!p) return;
  const r = p.AnsweredBy || 'unknown';
  db.evento('amd', { callSid: p.CallSid, resultado: r, ms: p.MachineDetectionDuration ? Number(p.MachineDetectionDuration) : null });
  if (/^machine|^fax/.test(r)) {
    const s = sesiones.get(p.CallSid);
    if (s) s.buzon();
    else { amdPendientes.add(p.CallSid); setTimeout(() => amdPendientes.delete(p.CallSid), 120_000).unref?.(); }
  }
  enviar(res, 204, '');
});

// Fin del <Dial> de una transferencia: si nadie contesta, se le dice que le devolverán la llamada, se crea una tarea
// de prioridad alta y se avisa al equipo. Queda registrado si la transferencia se atendió.
export const DEVOLVER = `Disculpe, en este momento ${C.empresa.responsable.split(' ')[0]} no puede atenderle. Le devolverá la llamada lo antes posible. Gracias por llamar.`;
ruta('POST', '/voz/transferencia-fin', async (req, res, { url }) => {
  const p = await webhook(req, res); if (!p) return;
  const estado = String(p.DialCallStatus || '').toLowerCase();
  const convId = Number(url.searchParams.get('conversacionId')) || db.conversacionPorExterno(p.CallSid)?.id || null;
  const conv = convId ? db.conversacionPorId(convId) : null;
  const contacto = (url.searchParams.get('contactoId') && db.contactoPorId(Number(url.searchParams.get('contactoId'))))
    || (conv?.contacto_id && db.contactoPorId(conv.contacto_id)) || null;
  const atendida = estado === 'completed' || estado === 'answered';
  db.marcarConversacion(convId, { transferencia: atendida ? 'atendida' : 'sin_respuesta' });
  if (atendida) {
    db.evento('transferencia_atendida', { conversacionId: convId, callSid: p.CallSid, duracion: Number(p.DialCallDuration) || 0 });
    return enviar(res, 200, '<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>', XML);
  }
  db.evento('transferencia_sin_respuesta', { conversacionId: convId, contacto: contacto?.id ?? null, callSid: p.CallSid, estado });
  enviar(res, 200, twimlDecirYColgar(DEVOLVER), XML);
  const quien = contacto?.nombre || contacto?.telefono || 'contacto';
  avisar({ tipo: 'transferencia_sin_respuesta', contacto, conversacionId: convId, detalle: `Pidió hablar con una persona y nadie contestó (${estado || 'sin estado'}). ${conv?.resumen || ''}`.trim() });
  if (hubspotActivo() && contacto) {
    Promise.resolve().then(async () => {
      const id = contacto.hubspot_id || (await sincronizarContacto(contacto));
      if (id) await crearTarea({ contactoId: id, asunto: `Devolver la llamada a ${quien} (transferencia sin respuesta)`, cuerpo: conv?.resumen || 'La llamada se transfirió y nadie contestó.', prioridad: 'HIGH', vence: new Date(Date.now() + 2 * 3600e3).toISOString() });
    }).catch((err) => log('tarea de transferencia:', err.message));
  }
});

// Grabación terminada (solo con GRABAR_LLAMADAS): se guarda la dirección del audio en la conversación
ruta('POST', '/voz/grabacion', async (req, res, { url }) => {
  const p = await webhook(req, res); if (!p) return;
  if (p.RecordingUrl && (!p.RecordingStatus || p.RecordingStatus === 'completed')) {
    const convId = Number(url.searchParams.get('conversacionId')) || db.conversacionPorExterno(p.CallSid)?.id || null;
    db.marcarConversacion(convId, { grabacion_url: p.RecordingUrl, grabacion_sid: p.RecordingSid || null });
    db.evento('grabacion', { conversacionId: convId, sid: p.RecordingSid || null, duracion: Number(p.RecordingDuration) || 0 });
  }
  enviar(res, 204, '');
});

rutaWs('/voz/stream', (ws) => new SesionVoz(ws));

/**
 * Lanza una llamada saliente (la usa la prospección). Comprobar horario, Robinson y base legal es cosa de quien llama;
 * aquí solo se bloquean los números dados de baja.
 * @returns {Promise<{ ok: boolean, callSid?: string, motivo?: string }>}
 */
export async function llamar({ telefono, contactoId = null, campanaId = null }) {
  const to = db.normTel(telefono);
  if (!to) return { ok: false, motivo: 'telefono_no_valido' };
  if (db.estaDeBaja(to, contactoId ? db.contactoPorId(Number(contactoId))?.email : null)) return { ok: false, motivo: 'baja' };
  if (!vozConfigurada() || !C.twilio.numero) return { ok: false, motivo: 'voz_no_configurada' };
  try {
    const c = await llamadaSaliente({ to, parametros: { contactoId, campanaId } });
    db.evento('llamada_saliente', { callSid: c.sid, telefono: to, contactoId, campanaId });
    return { ok: true, callSid: c.sid };
  } catch (err) {
    log('no se pudo lanzar la llamada:', err.message);
    return { ok: false, motivo: 'error_twilio', error: err.message };
  }
}
