// WhatsApp: webhook firmado, deduplicación, agrupación, notas de voz, bajas, ventana de 24 h y envíos proactivos,
// contra servidores falsos locales de Meta y Deepgram y con una Conversacion simulada.
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import crypto from 'node:crypto';

const SECRETO = 'secreto-de-prueba';
const enviados = []; // cuerpos POST /messages
const deepgram = [];
let dgTexto = 'quería información sobre el relevo';

const fake = http.createServer((req, res) => {
  const partes = [];
  req.on('data', (c) => partes.push(c));
  req.on('end', () => {
    const cuerpo = Buffer.concat(partes);
    const url = new URL(req.url, 'http://x');
    const json = (o, st = 200) => { res.writeHead(st, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(o)); };
    if (url.pathname === '/v1/listen') {
      deepgram.push({ query: Object.fromEntries(url.searchParams), auth: req.headers.authorization, tipo: req.headers['content-type'], bytes: cuerpo.length });
      return json({ results: { channels: [{ alternatives: [{ transcript: dgTexto }] }] } });
    }
    if (req.headers.authorization !== 'Bearer tok-meta') return json({ error: { message: 'sin token' } }, 401);
    if (req.method === 'POST' && url.pathname === '/v23.0/PNID/messages') {
      const b = JSON.parse(cuerpo.toString());
      if (b.status !== 'read') enviados.push(b);
      return json({ messaging_product: 'whatsapp', messages: [{ id: 'wamid.out' + enviados.length }] });
    }
    if (req.method === 'GET' && url.pathname === '/v23.0/AUDIO1') return json({ url: `${base}/media/AUDIO1`, mime_type: 'audio/ogg; codecs=opus' });
    if (req.method === 'GET' && url.pathname === '/media/AUDIO1') { res.writeHead(200, { 'Content-Type': 'audio/ogg' }); return res.end(Buffer.from('OggS-audio-falso')); }
    json({ error: { message: 'no encontrado' } }, 404);
  });
});

// Conversacion simulada: guarda lo que recibe y responde con eco
const turnos = [];
class ConvFalsa {
  constructor(o) { Object.assign(this, o); this.messages = []; ConvFalsa.creadas.push(this); }
  async responder(bloques) {
    const texto = bloques.filter((b) => b.type === 'text').map((b) => b.text).join('\n');
    turnos.push({ conv: this, texto, bloques });
    this.messages.push({ role: 'user', content: bloques }, { role: 'assistant', content: [{ type: 'text', text: 'Respuesta.' }] });
    return { texto: ConvFalsa.respuesta, interrumpida: false, terminada: null };
  }
}
ConvFalsa.creadas = [];
ConvFalsa.respuesta = 'Gracias por escribir. ¿En qué le puedo ayudar?';

let base, srv, url, db, meta, canal, herramientas, hubspot;
before(async () => {
  await new Promise((ok) => fake.listen(0, '127.0.0.1', ok));
  base = `http://127.0.0.1:${fake.address().port}`;
  db = await import('../src/almacen/db.js');
  db.abrir(':memory:');
  hubspot = await import('../src/crm/hubspot.js');
  hubspot.configurarHubspot({ token: '' });
  meta = await import('../src/whatsapp/meta.js');
  meta.configurarMeta({ base, token: 'tok-meta', phoneNumberId: 'PNID', appSecret: SECRETO, verifyToken: 'verifica', version: 'v23.0' });
  canal = await import('../src/whatsapp/canal.js');
  canal.configurarCanal({ Conversacion: ConvFalsa, agruparMs: 120, deepgramBase: base, deepgramKey: 'dg-clave', plantillaSeguimiento: '' });
  herramientas = await import('../src/cerebro/herramientas.js');
  await import('../src/whatsapp/rutas.js');
  const { crearServidor } = await import('../src/servidor.js');
  srv = crearServidor();
  await new Promise((ok) => srv.listen(0, '127.0.0.1', ok));
  url = `http://127.0.0.1:${srv.address().port}`;
});
after(async () => { await canal.esperarColas(); srv.close(); fake.close(); db.cerrar(); });
beforeEach(() => { enviados.length = 0; turnos.length = 0; deepgram.length = 0; });

let nId = 0;
const msgTexto = (from, body) => ({ from, id: `wamid.in${++nId}`, timestamp: '1700000000', type: 'text', text: { body } });
const cuerpoWebhook = (mensajes, nombre = 'Ana Pérez') => ({
  object: 'whatsapp_business_account',
  entry: [{ id: 'WABA', changes: [{ field: 'messages', value: { messaging_product: 'whatsapp', metadata: { phone_number_id: 'PNID' }, contacts: [{ wa_id: mensajes[0].from, profile: { name: nombre } }], messages: mensajes } }] }],
});
const firmar = (cuerpo) => 'sha256=' + crypto.createHmac('sha256', SECRETO).update(cuerpo).digest('hex');
async function postear(obj, firma) {
  const cuerpo = JSON.stringify(obj);
  return fetch(`${url}/whatsapp/webhook`, { method: 'POST', body: cuerpo, headers: { 'Content-Type': 'application/json', 'X-Hub-Signature-256': firma ?? firmar(cuerpo) } });
}

test('verificación del webhook (GET)', async () => {
  const ok = await fetch(`${url}/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=verifica&hub.challenge=12345`);
  assert.equal(ok.status, 200);
  assert.equal(await ok.text(), '12345');
  const ko = await fetch(`${url}/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=otro&hub.challenge=12345`);
  assert.equal(ko.status, 403);
});

test('firma X-Hub-Signature-256: válida, inválida y ausente', async () => {
  const cuerpo = Buffer.from('{"a":1}');
  assert.equal(meta.firmaValida(cuerpo, firmar(cuerpo)), true);
  assert.equal(meta.firmaValida(cuerpo, firmar(Buffer.from('{"a":2}'))), false);
  assert.equal(meta.firmaValida(cuerpo, 'sha256=abc'), false);
  assert.equal(meta.firmaValida(cuerpo, undefined), false);
  const r = await postear(cuerpoWebhook([msgTexto('34600000001', 'hola')]), 'sha256=' + '0'.repeat(64));
  assert.equal(r.status, 401);
  await canal.esperarColas();
  assert.equal(turnos.length, 0);
});

test('mensaje de texto: 200 inmediato, contacto creado, respuesta enviada y anotada', async () => {
  const r = await postear(cuerpoWebhook([msgTexto('34600000002', 'Hola, ¿qué hacéis?')]));
  assert.equal(r.status, 200);
  assert.equal(turnos.length, 0); // se procesa en segundo plano
  await canal.esperarColas();
  assert.equal(turnos.length, 1);
  assert.match(turnos[0].texto, /qué hacéis/);
  const c = db.contactoPorTelefono('+34600000002');
  assert.equal(c.nombre, 'Ana Pérez');
  assert.equal(c.origen, 'whatsapp');
  assert.equal(enviados.length, 1);
  assert.equal(enviados[0].to, '34600000002');
  assert.equal(enviados[0].text.body, ConvFalsa.respuesta);
  const conv = db.conversacionAbiertaWhatsApp(c.id);
  assert.deepEqual(db.mensajes(conv.id).map((m) => m.rol), ['usuario', 'asistente']);
});

test('deduplicación: el mismo id reintentado por Meta se procesa una vez', async () => {
  const m = msgTexto('34600000003', 'Primer mensaje');
  await postear(cuerpoWebhook([m]));
  await postear(cuerpoWebhook([m]));
  await canal.esperarColas();
  await postear(cuerpoWebhook([m])); // tras procesarlo, también
  await canal.esperarColas();
  assert.equal(turnos.length, 1);
  assert.equal(enviados.length, 1);
});

test('agrupación: mensajes seguidos en la ventana van en un solo turno; la conversación se reutiliza', async () => {
  await postear(cuerpoWebhook([msgTexto('34600000004', 'Buenas')]));
  await postear(cuerpoWebhook([msgTexto('34600000004', 'Soy gerente de una empresa familiar')]));
  await postear(cuerpoWebhook([msgTexto('34600000004', 'y tenemos un tema de relevo')]));
  await canal.esperarColas();
  assert.equal(turnos.length, 1);
  assert.match(turnos[0].texto, /Buenas\nSoy gerente de una empresa familiar\ny tenemos un tema de relevo/);
  await postear(cuerpoWebhook([msgTexto('34600000004', 'Otra cosa')]));
  await canal.esperarColas();
  assert.equal(turnos.length, 2);
  assert.equal(turnos[1].conv, turnos[0].conv, 'misma Conversacion en memoria');
});

test('nota de voz: se descarga con el token, se transcribe con Deepgram y llega como texto', async () => {
  dgTexto = 'quería información sobre el relevo';
  await postear(cuerpoWebhook([{ from: '34600000005', id: `wamid.in${++nId}`, type: 'audio', audio: { id: 'AUDIO1', mime_type: 'audio/ogg; codecs=opus', voice: true } }]));
  await canal.esperarColas();
  assert.equal(deepgram.length, 1);
  assert.deepEqual(deepgram[0].query, { model: 'nova-3', language: 'es', smart_format: 'true' });
  assert.equal(deepgram[0].auth, 'Token dg-clave');
  assert.equal(deepgram[0].tipo, 'audio/ogg');
  assert.ok(deepgram[0].bytes > 0);
  assert.match(turnos[0].texto, /\[Nota de voz transcrita\] quería información sobre el relevo/);
});

test('nota de voz sin clave de Deepgram: pide que lo escriba sin llamar a Claude', async () => {
  canal.configurarCanal({ deepgramKey: '' });
  try {
    await postear(cuerpoWebhook([{ from: '34600000006', id: `wamid.in${++nId}`, type: 'audio', audio: { id: 'AUDIO1', voice: true } }]));
    await canal.esperarColas();
    assert.equal(turnos.length, 0);
    assert.equal(enviados.length, 1);
    assert.match(enviados[0].text.body, /escribirme/);
  } finally { canal.configurarCanal({ deepgramKey: 'dg-clave' }); }
});

test('botón e interactivo se leen como texto', async () => {
  await postear(cuerpoWebhook([
    { from: '34600000007', id: `wamid.in${++nId}`, type: 'button', button: { text: 'Sí, me interesa', payload: 'SI' } },
    { from: '34600000007', id: `wamid.in${++nId}`, type: 'interactive', interactive: { type: 'list_reply', list_reply: { id: 'x', title: 'Martes', description: 'por la mañana' } } },
  ]));
  await canal.esperarColas();
  assert.match(turnos[0].texto, /Sí, me interesa\nMartes — por la mañana/);
});

test('baja: «BAJA» registra la baja y confirma; si vuelve a escribir se le atiende con aviso interno', async () => {
  await postear(cuerpoWebhook([msgTexto('34600000008', 'BAJA')]));
  await canal.esperarColas();
  assert.equal(db.estaDeBaja('+34600000008'), true);
  assert.equal(turnos.length, 0);
  assert.match(enviados[0].text.body, /dado de baja/);
  await postear(cuerpoWebhook([msgTexto('34600000008', 'Una duda sobre la factura')]));
  await canal.esperarColas();
  assert.equal(turnos.length, 1);
  assert.match(turnos[0].texto, /pidió la baja/);
  assert.match(turnos[0].texto, /factura/);
  assert.equal(canal.esBaja('Por favor, no me escribáis más'), true);
  assert.equal(canal.esBaja('Quiero darme de baja'), true);
  assert.equal(canal.esBaja('¿Me podéis escribir mañana?'), false);
  assert.equal(canal.esBaja('Tenemos un problema de bajas laborales'), false);
});

test('reinicio: la conversación abierta se reconstruye desde la base (solo texto usuario/asistente)', async () => {
  const c = db.guardarContacto({ telefono: '+34600000009', nombre: 'Luis' });
  const id = db.abrirConversacion({ canal: 'whatsapp', direccion: 'entrante', contactoId: c.id });
  db.anotar(id, 'usuario', 'Hola, soy Luis');
  db.anotar(id, 'asistente', 'Hola, Luis. ¿En qué le ayudo?');
  db.anotar(id, 'herramienta', 'ficha_contacto: {...}');
  db.anotar(id, 'usuario', '¿Tenéis talleres?'); // quedó sin responder
  canal.olvidarConversaciones();
  await postear(cuerpoWebhook([msgTexto('34600000009', '¿Y precios?')]));
  await canal.esperarColas();
  const conv = turnos[0].conv;
  assert.equal(conv.conversacionId, id);
  assert.equal(conv.messages[0].content[0].text, 'Hola, soy Luis');
  assert.equal(conv.messages[1].content[0].text, 'Hola, Luis. ¿En qué le ayudo?');
  assert.match(turnos[0].texto, /¿Tenéis talleres\?\n¿Y precios\?/);
});

test('respuesta larga: se parte en varios mensajes', async () => {
  const largo = Array.from({ length: 40 }, (_, i) => `Esta es la frase número ${i + 1} de una respuesta bastante larga.`).join(' ') + '\n\n' + 'Segundo párrafo.';
  const trozos = canal.partirTexto(largo, 500);
  assert.ok(trozos.length >= 5);
  assert.ok(trozos.every((t) => t.length <= 500));
  assert.equal(trozos.join(' ').replace(/\s+/g, ' '), largo.replace(/\s+/g, ' '));
  ConvFalsa.respuesta = largo;
  canal.configurarCanal({ maxCaracteres: 500 });
  try {
    await postear(cuerpoWebhook([msgTexto('34600000010', 'Cuénteme todo')]));
    await canal.esperarColas();
    assert.equal(enviados.length, trozos.length);
  } finally { ConvFalsa.respuesta = 'Gracias por escribir. ¿En qué le puedo ayudar?'; canal.configurarCanal({ maxCaracteres: 1500 }); }
});

test('enviar_whatsapp: texto libre dentro de la ventana; fuera, plantilla o rechazo', async () => {
  // Dentro: el contacto 34600000002 escribió en el test anterior
  const c2 = db.contactoPorTelefono('+34600000002');
  let r = await herramientas.ejecutar('enviar_whatsapp', { texto: 'Aquí tiene el enlace.' }, { canal: 'voz', contacto: c2, conversacionId: null });
  assert.equal(r.error, undefined);
  assert.match(r.contenido, /Enviado/);
  assert.equal(enviados.at(-1).type, 'text');

  // Fuera: contacto que nunca escribió (o hace más de 24 h)
  const c = db.guardarContacto({ telefono: '+34611111111', nombre: 'Marta' });
  const viejo = db.abrirConversacion({ canal: 'whatsapp', direccion: 'entrante', contactoId: c.id });
  db.anotar(viejo, 'usuario', 'Hola');
  db.abrir().prepare(`UPDATE mensajes SET ts = datetime('now', '-2 days') WHERE conversacion_id = ?`).run(viejo);
  assert.equal(canal.dentroDeVentana('+34611111111'), false);
  r = await herramientas.ejecutar('enviar_whatsapp', { texto: 'Información' }, { canal: 'voz', contacto: c });
  assert.match(r.contenido, /plantillas aprobadas/);
  const n = enviados.length;

  canal.configurarCanal({ plantillaSeguimiento: 'seguimiento_fe' });
  try {
    r = await herramientas.ejecutar('enviar_whatsapp', { texto: 'Le dejo el enlace:\nhttps://businessavance.es' }, { canal: 'voz', contacto: c });
    assert.match(r.contenido, /plantilla/);
    const p = enviados.at(-1);
    assert.equal(enviados.length, n + 1);
    assert.equal(p.type, 'template');
    assert.equal(p.template.name, 'seguimiento_fe');
    assert.equal(p.template.language.code, 'es');
    assert.equal(p.template.components[0].parameters[0].text, 'Le dejo el enlace: https://businessavance.es');
  } finally { canal.configurarCanal({ plantillaSeguimiento: '' }); }
});

test('enviarProactivo: solo plantillas, respeta bajas y exige base legal', async () => {
  assert.deepEqual(await canal.enviarProactivo('+34600000008', 'presentacion', ['Ana']), { enviado: false, motivo: 'de baja' });
  assert.equal((await canal.enviarProactivo('+34622222222', 'presentacion', ['Pedro'])).motivo, 'sin base legal registrada');
  db.guardarContacto({ telefono: '+34644444444', nombre: 'Luis', base_legal: 'cliente' });
  assert.equal((await canal.enviarProactivo('+34644444444', 'presentacion', ['Luis'])).codigo, 'sin_consentimiento_whatsapp');
  db.guardarContacto({ telefono: '+34633333333', nombre: 'Rosa', base_legal: 'consentimiento', base_legal_detalle: 'formulario web', base_legal_fecha: '2026-10-01', consentimiento_whatsapp: '2026-10-01' });
  const r = await canal.enviarProactivo('+34633333333', 'presentacion', ['Rosa', 'relevo'], { texto: 'Hola, Rosa: le escribimos por el relevo.' });
  assert.equal(r.enviado, true);
  const p = enviados.at(-1);
  assert.equal(p.type, 'template');
  assert.deepEqual(p.template.components[0].parameters.map((x) => x.text), ['Rosa', 'relevo']);
  // Si responde, se reutiliza ese hilo y el asistente sabe qué se le envió
  canal.olvidarConversaciones();
  await postear(cuerpoWebhook([msgTexto('34633333333', 'Sí, cuénteme')]));
  await canal.esperarColas();
  const conv = turnos.at(-1).conv;
  assert.equal(conv.conversacionId, r.conversacionId);
  assert.match(conv.messages[1].content[0].text, /le escribimos por el relevo/);
});
