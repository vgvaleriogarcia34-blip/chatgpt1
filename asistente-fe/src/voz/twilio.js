// Twilio: firma de los webhooks, TwiML de entrada y salida, llamadas salientes, colgar, transferir y grabar.
// El cliente REST se crea solo si hay credenciales; los tests inyectan uno falso con ponerClienteTwilio().
import crypto from 'node:crypto';
import twilio from 'twilio';
import { C } from '../config.js';

let cliente = null;
export function clienteTwilio() {
  if (cliente) return cliente;
  if (!C.twilio.accountSid || !C.twilio.authToken) return null;
  return (cliente = twilio(C.twilio.accountSid, C.twilio.authToken));
}
export function ponerClienteTwilio(c) { cliente = c; }

export const vozConfigurada = () => !!(C.twilio.accountSid && C.twilio.authToken && C.deepgram.apiKey && C.elevenlabs.apiKey && C.elevenlabs.vozId && C.urlPublica);

export const urlPublica = (ruta) => C.urlPublica + ruta;
export const urlWs = (ruta) => urlPublica(ruta).replace(/^http/, 'ws'); // https → wss

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));

/** Cuerpo application/x-www-form-urlencoded de Twilio → objeto. */
export const formulario = (buf) => Object.fromEntries(new URLSearchParams(buf.toString('utf8')));

/** Comprueba X-Twilio-Signature con la URL pública exacta (ruta y consulta incluidas) y los parámetros del cuerpo. */
export function firmaValida(req, params) {
  const firma = req.headers['x-twilio-signature'];
  if (!C.twilio.authToken || !C.urlPublica || !firma) return false;
  try { return twilio.validateRequest(C.twilio.authToken, firma, C.urlPublica + req.url, params); } catch { return false; }
}

/** Testigo que viaja como <Parameter> al flujo de audio, para que nadie abra una sesión sin pasar por el webhook firmado. */
export function firmaStream(callSid) {
  return crypto.createHmac('sha256', C.twilio.authToken || 'sin-clave').update('voz-stream:' + callSid).digest('base64url');
}
export function firmaStreamValida(callSid, firma) {
  if (!C.twilio.authToken || !callSid || typeof firma !== 'string') return false;
  const a = Buffer.from(firmaStream(callSid)), b = Buffer.from(firma);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** TwiML que conecta la llamada al WebSocket de audio, con los parámetros de la sesión. */
export function twimlStream(parametros) {
  const ps = Object.entries(parametros).filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `<Parameter name="${esc(k)}" value="${esc(v)}"/>`).join('');
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Connect><Stream url="${esc(urlWs('/voz/stream'))}">${ps}</Stream></Connect></Response>`;
}
export function twimlDecirYColgar(texto) {
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Say language="es-ES">${esc(texto)}</Say><Hangup/></Response>`;
}

/** Lanza una llamada saliente. parametros (contactoId, campanaId…) viajan en la consulta de las URL de Twilio, que también se firman. */
export async function llamadaSaliente({ to, parametros = {}, amd = 'Enable' }) {
  const c = clienteTwilio();
  if (!c) throw new Error('Twilio no está configurado');
  const q = new URLSearchParams(Object.entries(parametros).filter(([, v]) => v !== undefined && v !== null && v !== '').map(([k, v]) => [k, String(v)])).toString();
  const con = (r) => urlPublica(r) + (q ? '?' + q : '');
  return c.calls.create({
    to, from: C.twilio.numero,
    url: con('/voz/saliente-twiml'), method: 'POST',
    statusCallback: con('/voz/estado'), statusCallbackMethod: 'POST',
    machineDetection: amd, asyncAmd: 'true', // el resultado llega aparte; la conversación empieza sin esperar
    asyncAmdStatusCallback: con('/voz/amd'), asyncAmdStatusCallbackMethod: 'POST',
    timeout: 30,
  });
}

export async function colgarLlamada(callSid) {
  const c = clienteTwilio();
  if (c && callSid) await c.calls(callSid).update({ status: 'completed' });
}

/** Consulta firmada (por Twilio) que acompaña a las URL de devolución: solo los valores con contenido. */
const consulta = (o) => { const q = new URLSearchParams(Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== '').map(([k, v]) => [k, String(v)])).toString(); return q ? '?' + q : ''; };

/**
 * Sustituye el flujo de audio por un aviso y un <Dial> al móvil indicado (por defecto, el del responsable).
 * Al acabar el <Dial>, Twilio llama a /voz/transferencia-fin con DialCallStatus: si nadie contesta, se avisa y se cuelga con
 * un mensaje de que le devolverán la llamada.
 */
export async function transferirLlamada(callSid, { aviso, numero = C.empresa.movilResponsable, conversacionId = null, contactoId = null } = {}) {
  const c = clienteTwilio();
  if (!c) throw new Error('Twilio no está configurado');
  if (!numero) throw new Error('No hay móvil configurado para transferir');
  const accion = urlPublica('/voz/transferencia-fin') + consulta({ conversacionId, contactoId });
  const twiml = `<Response>${aviso ? `<Say language="es-ES">${esc(aviso)}</Say>` : ''}<Dial callerId="${esc(C.twilio.numero)}" timeout="25" action="${esc(accion)}" method="POST">${esc(numero)}</Dial></Response>`;
  await c.calls(callSid).update({ twiml });
}

/** Graba la llamada (dos canales); al terminar, Twilio avisa en /voz/grabacion con la dirección del audio. */
export async function grabarLlamada(callSid, { conversacionId = null } = {}) {
  const c = clienteTwilio();
  if (c && callSid) await c.calls(callSid).recordings.create({ recordingChannels: 'dual', recordingStatusCallback: urlPublica('/voz/grabacion') + consulta({ conversacionId }), recordingStatusCallbackMethod: 'POST', recordingStatusCallbackEvent: ['completed'] });
}

/** Detiene la grabación en curso de la llamada (la persona ha pedido que no se grabe). */
export async function pararGrabacion(callSid) {
  const c = clienteTwilio();
  if (c && callSid) await c.calls(callSid).recordings('Twilio.CURRENT').update({ status: 'stopped' });
}

/** Borra una grabación en Twilio (purga de conservación, o porque la persona pidió que no se grabara). */
export async function borrarGrabacion(sid) {
  const c = clienteTwilio();
  if (c && sid) await c.recordings(sid).remove();
}
