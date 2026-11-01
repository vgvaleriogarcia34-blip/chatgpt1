// API Cloud de WhatsApp (Meta): envío de textos y plantillas, lectura, descarga de medios y seguridad del webhook.
import crypto from 'node:crypto';
import { C } from '../config.js';
import { normTel } from '../almacen/db.js';

const W = C.whatsapp;
const cfg = { base: 'https://graph.facebook.com', token: W.token, phoneNumberId: W.phoneNumberId, appSecret: W.appSecret, verifyToken: W.verifyToken, version: W.version };
/** Para tests o reconfiguración: { base, token, phoneNumberId, appSecret, verifyToken, version } */
export function configurarMeta(o = {}) { Object.assign(cfg, o); }
export const metaActivo = () => !!(cfg.token && cfg.phoneNumberId);
export const metaConfig = () => ({ appSecret: !!cfg.appSecret, verifyToken: !!cfg.verifyToken, activo: metaActivo() });

/** Número para Meta: solo dígitos, con prefijo de país. */
export const telMeta = (tel) => (normTel(tel) || '').replace(/^\+/, '');

async function api(metodo, ruta, cuerpo) {
  if (!metaActivo()) throw new Error('WhatsApp no configurado');
  const r = await fetch(`${cfg.base}/${cfg.version}/${ruta}`, {
    method: metodo,
    headers: { Authorization: `Bearer ${cfg.token}`, ...(cuerpo ? { 'Content-Type': 'application/json' } : {}) },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    signal: AbortSignal.timeout(20000),
  });
  const texto = await r.text();
  let json = null;
  try { json = texto ? JSON.parse(texto) : null; } catch {}
  if (!r.ok) {
    const e = json?.error;
    throw Object.assign(new Error(`Meta ${r.status}: ${e?.message || texto.slice(0, 200)}`), { status: r.status, codigo: e?.code });
  }
  return json;
}

const mensaje = (tel, extra) => api('POST', `${cfg.phoneNumberId}/messages`, { messaging_product: 'whatsapp', recipient_type: 'individual', to: telMeta(tel), ...extra });

/** Texto libre (solo dentro de la ventana de 24 h desde el último mensaje del usuario). Devuelve el id del mensaje. */
export async function enviarTexto(tel, texto) {
  const r = await mensaje(tel, { type: 'text', text: { preview_url: true, body: String(texto).slice(0, 4096) } });
  return r?.messages?.[0]?.id || null;
}

/** Plantilla aprobada. componentes: los de la API (p. ej. [{ type: 'body', parameters: [{ type: 'text', text: '…' }] }]). */
export async function enviarPlantilla(tel, nombre, idioma = 'es', componentes = []) {
  const r = await mensaje(tel, { type: 'template', template: { name: nombre, language: { code: idioma }, ...(componentes?.length ? { components: componentes } : {}) } });
  return r?.messages?.[0]?.id || null;
}

/** Variables de plantilla: Meta no admite saltos de línea, tabuladores ni más de cuatro espacios seguidos. */
export const variablePlantilla = (t) => String(t ?? '').replace(/[\r\n\t]+/g, ' ').replace(/ {4,}/g, '   ').trim().slice(0, 1000);

export const marcarLeido = (id) => api('POST', `${cfg.phoneNumberId}/messages`, { messaging_product: 'whatsapp', status: 'read', message_id: id });

/** Descarga un medio: GET /{media-id} → url temporal → descarga con el token. Devuelve { datos: Buffer, mime }. */
export async function descargarMedia(mediaId, { maxBytes = 16 * 1024 * 1024 } = {}) {
  const info = await api('GET', encodeURIComponent(mediaId));
  if (!info?.url) throw new Error('Meta no ha devuelto la URL del medio');
  const u = new URL(info.url);
  // El token solo se envía a Meta (o a la base configurada, en pruebas)
  const permitido = u.origin === new URL(cfg.base).origin || (u.protocol === 'https:' && /(^|\.)(fbsbx\.com|facebook\.com|whatsapp\.net)$/.test(u.hostname));
  if (!permitido) throw new Error('URL de medio no reconocida');
  const r = await fetch(u, { headers: { Authorization: `Bearer ${cfg.token}` }, signal: AbortSignal.timeout(30000) });
  if (!r.ok) throw new Error(`Descarga de medio: ${r.status}`);
  const datos = Buffer.from(await r.arrayBuffer());
  if (datos.length > maxBytes) throw new Error('Medio demasiado grande');
  return { datos, mime: info.mime_type || r.headers.get('content-type') || 'application/octet-stream' };
}

/** Verificación del webhook (GET): devuelve el challenge si el token coincide, o null. */
export function verificarWebhook(query) {
  const q = query instanceof URLSearchParams ? Object.fromEntries(query) : query || {};
  if (!cfg.verifyToken || q['hub.mode'] !== 'subscribe') return null;
  const a = Buffer.from(String(q['hub.verify_token'] ?? '')), b = Buffer.from(cfg.verifyToken);
  return a.length === b.length && crypto.timingSafeEqual(a, b) ? String(q['hub.challenge'] ?? '') : null;
}

/** Firma X-Hub-Signature-256: HMAC-SHA256 del cuerpo en bruto con el secreto de la app, en tiempo constante. */
export function firmaValida(cuerpoBruto, cabecera) {
  if (!cfg.appSecret || typeof cabecera !== 'string' || !cabecera.startsWith('sha256=')) return false;
  const esperada = crypto.createHmac('sha256', cfg.appSecret).update(cuerpoBruto).digest();
  const recibida = Buffer.from(cabecera.slice(7), 'hex');
  return recibida.length === esperada.length && crypto.timingSafeEqual(recibida, esperada);
}
