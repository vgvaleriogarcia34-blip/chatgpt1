// Estado de las integraciones para el panel: qué está configurado y, si se pide, si responde ahora.
// Cada comprobación tiene su tiempo límite (5 s) y nunca lanza: devuelve { responde: false, detalle }.
import { C } from '../config.js';
import { vozConfigurada } from '../voz/twilio.js';
import { metaActivo } from '../whatsapp/meta.js';
import { hubspotActivo, cuentaHubspot } from '../crm/hubspot.js';
import { agendaConfigurada, comprobarAgenda } from '../agenda/google-calendar.js';
import { smtpConfigurado, comprobarSmtp } from '../correo.js';
import { atalayaActiva, comprobarAtalaya, urlAtalaya } from './atalaya.js';
import { canalesAviso } from '../avisos.js';

const cfg = { fetch: (...a) => fetch(...a), timeoutMs: 5000 };
export function configurarEstado(o = {}) { Object.assign(cfg, o); }

async function pedir(url, headers = {}) {
  const r = await cfg.fetch(url, { headers, signal: AbortSignal.timeout(cfg.timeoutMs) });
  await r.arrayBuffer().catch(() => {});
  if (!r.ok) throw new Error(`responde ${r.status}`);
  return true;
}
const basica = (u, p) => 'Basic ' + Buffer.from(`${u}:${p}`).toString('base64');

/** Lista de integraciones: { clave, nombre, configurada, falta?, comprobar? } */
function lista() {
  const anthropic = process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN;
  const av = canalesAviso();
  return [
    { clave: 'claude', nombre: 'Claude (Anthropic)', configurada: !!anthropic, falta: 'ANTHROPIC_API_KEY',
      comprobar: () => pedir(`${(process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com').replace(/\/$/, '')}/v1/models?limit=1`, process.env.ANTHROPIC_API_KEY ? { 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' } : { Authorization: `Bearer ${process.env.ANTHROPIC_AUTH_TOKEN}`, 'anthropic-version': '2023-06-01' }) },
    { clave: 'twilio', nombre: 'Llamadas (Twilio)', configurada: !!(C.twilio.accountSid && C.twilio.authToken && C.twilio.numero), falta: 'TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN y TWILIO_NUMERO',
      comprobar: () => pedir(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(C.twilio.accountSid)}.json`, { Authorization: basica(C.twilio.accountSid, C.twilio.authToken) }) },
    { clave: 'voz', nombre: 'Voz completa (Twilio + Deepgram + ElevenLabs + URL pública)', configurada: vozConfigurada(), falta: 'las variables de Twilio, Deepgram, ElevenLabs y URL_PUBLICA' },
    { clave: 'deepgram', nombre: 'Voz a texto (Deepgram)', configurada: !!C.deepgram.apiKey, falta: 'DEEPGRAM_API_KEY',
      comprobar: () => pedir('https://api.deepgram.com/v1/projects', { Authorization: `Token ${C.deepgram.apiKey}` }) },
    { clave: 'elevenlabs', nombre: 'Texto a voz (ElevenLabs)', configurada: !!(C.elevenlabs.apiKey && C.elevenlabs.vozId), falta: 'ELEVENLABS_API_KEY y ELEVENLABS_VOZ_ID',
      comprobar: () => pedir(`https://api.elevenlabs.io/v1/voices/${encodeURIComponent(C.elevenlabs.vozId)}`, { 'xi-api-key': C.elevenlabs.apiKey }) },
    { clave: 'whatsapp', nombre: 'WhatsApp (Meta)', configurada: metaActivo() && !!C.whatsapp.appSecret, falta: 'WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID y WHATSAPP_APP_SECRET',
      comprobar: () => pedir(`https://graph.facebook.com/${C.whatsapp.version}/${encodeURIComponent(C.whatsapp.phoneNumberId)}?fields=display_phone_number`, { Authorization: `Bearer ${C.whatsapp.token}` }) },
    { clave: 'hubspot', nombre: 'CRM (HubSpot)', configurada: hubspotActivo(), falta: 'HUBSPOT_TOKEN', comprobar: () => cuentaHubspot({ forzar: true }).then(() => true) },
    { clave: 'agenda', nombre: 'Agenda (Google Calendar)', configurada: agendaConfigurada(), falta: 'GOOGLE_CREDENCIALES', comprobar: comprobarAgenda },
    { clave: 'correo', nombre: 'Avisos por correo (SMTP)', configurada: av.correo, falta: 'SMTP_HOST, SMTP_FROM (y SMTP_USER, SMTP_PASS) y RESPONSABLE_EMAIL', comprobar: () => comprobarSmtp() },
    { clave: 'aviso_whatsapp', nombre: 'Avisos por WhatsApp al responsable', configurada: av.whatsapp, falta: 'WHATSAPP_PLANTILLA_AVISO_EQUIPO, RESPONSABLE_MOVIL y WhatsApp' },
    { clave: 'transferencia', nombre: 'Transferencia de llamadas', configurada: !!C.empresa.movilResponsable, falta: 'RESPONSABLE_MOVIL' },
    { clave: 'atalaya', nombre: 'Atalaya 360°', configurada: atalayaActiva(), falta: 'ATALAYA_URL e INTEGRACION_TOKEN', detalle: urlAtalaya() || null, comprobar: comprobarAtalaya },
    { clave: 'privacidad', nombre: 'Enlace a la política de privacidad', configurada: !!C.empresa.urlPrivacidad, falta: 'URL_PRIVACIDAD', detalle: C.empresa.urlPrivacidad || null },
    { clave: 'prospeccion', nombre: 'Prospección (llamadas salientes)', configurada: C.prospeccion.activa, falta: 'PROSPECCION_ACTIVA' },
  ];
}

/** «Falta HUBSPOT_TOKEN», pero «Faltan TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN y TWILIO_NUMERO» o «Faltan las variables…». */
export function textoFalta(falta) {
  const t = String(falta || '').trim();
  if (/^PROSPECCION_ACTIVA/.test(t)) return 'Apagada: para encenderla, PROSPECCION_ACTIVA=sí';
  const varias = /^(las|los)\s/i.test(t) || /,|\sy\s|\se\s/.test(t.replace(/\([^)]*\)/g, ''));
  return `${varias ? 'Faltan' : 'Falta'} ${t}`;
}

/** @returns {Promise<Array<{ clave, nombre, configurada, responde: boolean|null, detalle: string|null }>>} */
export async function estadoIntegraciones({ comprobar = true } = {}) {
  return Promise.all(lista().map(async (x) => {
    const base = { clave: x.clave, nombre: x.nombre, configurada: x.configurada, responde: null, detalle: x.configurada ? (x.detalle || null) : textoFalta(x.falta) };
    if (!comprobar || !x.configurada || !x.comprobar) return base;
    try { await Promise.race([x.comprobar(), new Promise((_, ko) => setTimeout(() => ko(new Error('no responde en 5 s')), cfg.timeoutMs + 500).unref?.())]); return { ...base, responde: true }; }
    catch (err) { return { ...base, responde: false, detalle: String(err.message || err).slice(0, 200) }; }
  }));
}
