// Webhook de WhatsApp (Meta): verificación (GET) y mensajes (POST, con firma X-Hub-Signature-256).
// Se responde 200 al momento y el mensaje se procesa en segundo plano (Meta reintenta si tarda).
import { ruta, leerCuerpo, enviar } from '../servidor.js';
import { verificarWebhook, firmaValida, metaConfig } from './meta.js';
import { procesarWebhook } from './canal.js';

ruta('GET', '/whatsapp/webhook', async (req, res, { url }) => {
  const reto = verificarWebhook(url.searchParams);
  if (reto === null) return enviar(res, 403, 'Prohibido');
  enviar(res, 200, reto);
});

let avisado = false;
ruta('POST', '/whatsapp/webhook', async (req, res) => {
  const bruto = await leerCuerpo(req);
  if (!metaConfig().appSecret) {
    if (!avisado) { console.warn('[whatsapp] falta WHATSAPP_APP_SECRET: se rechazan los webhooks'); avisado = true; }
    return enviar(res, 503, 'No configurado');
  }
  if (!firmaValida(bruto, req.headers['x-hub-signature-256'])) return enviar(res, 401, 'Firma no válida');
  let cuerpo;
  try { cuerpo = JSON.parse(bruto.toString('utf8')); } catch { return enviar(res, 400, 'JSON no válido'); }
  enviar(res, 200, 'EVENT_RECEIVED');
  setImmediate(() => {
    try { procesarWebhook(cuerpo); } catch (err) { console.error('[whatsapp] webhook:', err); }
  });
});
