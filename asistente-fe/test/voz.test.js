// Tests del canal de voz: cortador de frases, normalización, firma de Twilio y una llamada completa simulada
// (falso Twilio Media Streams, falso Deepgram, falso ElevenLabs y Conversacion simulada), todo en localhost.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { WebSocketServer, WebSocket } from 'ws';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'voz-test-'));
Object.assign(process.env, {
  URL_PUBLICA: 'https://asistente.test', TWILIO_ACCOUNT_SID: 'ACprueba', TWILIO_AUTH_TOKEN: 'token-de-prueba', TWILIO_NUMERO: '+34910000000',
  DEEPGRAM_API_KEY: 'dg-prueba', ELEVENLABS_API_KEY: 'el-prueba', ELEVENLABS_VOZ_ID: 'voz1', RESPONSABLE_MOVIL: '+34600000000',
  DATOS_DIR: tmp, GRABAR_LLAMADAS: 'false',
});

const twilio = (await import('twilio')).default;
const db = await import('../src/almacen/db.js');
const { crearServidor } = await import('../src/servidor.js');
const { cortadorDeFrases } = await import('../src/cerebro/agente.js');
const { ejecutar } = await import('../src/cerebro/herramientas.js');
const { normalizarParaVoz, ElevenLabsTTS } = await import('../src/voz/tts-elevenlabs.js');
const { DeepgramSTT } = await import('../src/voz/stt-deepgram.js');
const T = await import('../src/voz/twilio.js');
const S = await import('../src/voz/sesion.js');
const R = await import('../src/voz/rutas.js');

const espera = (ms) => new Promise((r) => setTimeout(r, ms));
async function hasta(cond, ms = 3000, que = 'condición') {
  const t0 = Date.now();
  while (!cond()) { if (Date.now() - t0 > ms) throw new Error('Tiempo agotado esperando: ' + que); await espera(10); }
}
const escuchar = (srv) => new Promise((ok) => srv.listen(0, '127.0.0.1', () => ok(srv.address().port)));

// ---------- Infraestructura falsa ----------
let srv, puerto, dg, el, dgPuerto, elPuerto;
const dgConexiones = []; const dgAudio = [];
const elMensajes = [];
const restTwilio = [];

before(async () => {
  db.abrir(':memory:');
  // Falso Deepgram: guarda las conexiones; el test le hace «decir» transcripciones
  dg = new WebSocketServer({ port: 0, host: '127.0.0.1' });
  await new Promise((ok) => dg.on('listening', ok));
  dgPuerto = dg.address().port;
  dg.on('connection', (ws, req) => {
    ws.cabeceras = req.headers; ws.ruta = req.url; dgConexiones.push(ws);
    ws.on('message', (d, bin) => { if (bin) dgAudio.push(d); });
  });
  // Falso ElevenLabs: por cada frase con flush devuelve «audio» (el texto en base64) en dos trozos; avisa isFinal al cerrar
  el = new WebSocketServer({ port: 0, host: '127.0.0.1' });
  await new Promise((ok) => el.on('listening', ok));
  elPuerto = el.address().port;
  el.on('connection', (ws) => {
    ws.on('message', (d) => {
      const m = JSON.parse(d.toString()); elMensajes.push(m);
      if (m.flush && m.text?.trim()) {
        const b = Buffer.from(m.text.trim());
        setTimeout(() => {
          ws.send(JSON.stringify({ audio: b.subarray(0, 4).toString('base64'), contextId: m.context_id }));
          ws.send(JSON.stringify({ audio: b.subarray(4).toString('base64'), contextId: m.context_id }));
        }, 5);
      }
      if (m.close_context) ws.send(JSON.stringify({ isFinal: true, contextId: m.context_id }));
    });
  });
  S.fabricas.stt = () => new DeepgramSTT({ urlBase: `ws://127.0.0.1:${dgPuerto}` });
  S.fabricas.tts = () => new ElevenLabsTTS({ urlBase: `ws://127.0.0.1:${elPuerto}`, silencioFinMs: 60 });
  // Falso cliente REST de Twilio
  const calls = (sid) => ({ update: async (o) => { restTwilio.push({ sid, ...o }); }, recordings: { create: async (o) => restTwilio.push({ sid, grabar: true, ...o }) } });
  calls.create = async (o) => { restTwilio.push({ crear: o }); return { sid: 'CAsaliente1' }; };
  T.ponerClienteTwilio({ calls });

  srv = crearServidor();
  puerto = await escuchar(srv);
});

after(async () => {
  srv.close(); dg.close(); el.close();
  for (const c of dgConexiones) c.terminate();
  db.cerrar();
  fs.rmSync(tmp, { recursive: true, force: true });
});

// Falso Twilio: abre el flujo, manda start y media y devuelve las marcas cuando se le pide
async function abrirFlujo({ callSid, parametros, ecoMarcas = true }) {
  const ws = new WebSocket(`ws://127.0.0.1:${puerto}/voz/stream`);
  const rec = []; const f = { ws, rec, ecoMarcas, cerrado: false };
  ws.on('message', (d) => {
    const m = JSON.parse(d.toString()); rec.push(m);
    if (m.event === 'mark' && f.ecoMarcas) setTimeout(() => ws.readyState === 1 && ws.send(JSON.stringify({ event: 'mark', streamSid: 'MZ1', mark: m.mark })), 5);
  });
  ws.on('close', () => { f.cerrado = true; });
  await new Promise((ok) => ws.on('open', ok));
  ws.send(JSON.stringify({ event: 'connected', protocol: 'Call', version: '1.0.0' }));
  ws.send(JSON.stringify({ event: 'start', streamSid: 'MZ1', start: { streamSid: 'MZ1', callSid, tracks: ['inbound'], customParameters: { firma: T.firmaStream(callSid), ...parametros } } }));
  f.media = () => ws.send(JSON.stringify({ event: 'media', streamSid: 'MZ1', media: { track: 'inbound', payload: Buffer.alloc(160, 0xff).toString('base64') } }));
  f.audios = () => rec.filter((m) => m.event === 'media').map((m) => Buffer.from(m.media.payload, 'base64').toString()).join('');
  f.devolverMarcas = () => { for (const m of rec.filter((x) => x.event === 'mark')) ws.send(JSON.stringify({ event: 'mark', streamSid: 'MZ1', mark: m.mark })); };
  return f;
}
const dgDice = (ws, texto, { final = true, speechFinal = final } = {}) =>
  ws.send(JSON.stringify({ type: 'Results', is_final: final, speech_final: speechFinal, channel: { alternatives: [{ transcript: texto }] } }));

// Conversacion simulada: guion de respuestas por turno
function conversacionSimulada(guion) {
  const llamadas = [];
  S.fabricas.conversacion = (o) => {
    const conv = {
      ...o, messages: [], terminada: null, contextoPendiente: '[contexto]', llamadas,
      async responder(texto, { alHablar, signal }) {
        llamadas.push({ texto, signal });
        const paso = guion[llamadas.length - 1] || { frases: ['De acuerdo.'] };
        let dicho = '';
        for (const f of paso.frases) {
          if (paso.pausa) await new Promise((ok) => { const t = setTimeout(ok, paso.pausa); signal.addEventListener('abort', () => { clearTimeout(t); ok(); }); });
          if (signal.aborted) return { texto: dicho, interrumpida: true, terminada: null };
          alHablar(f); dicho += (dicho ? ' ' : '') + f;
        }
        if (paso.esperaAbort) await new Promise((ok) => signal.addEventListener('abort', ok));
        if (signal.aborted) return { texto: dicho, interrumpida: true, terminada: null };
        if (paso.finalizar) conv.terminada = paso.finalizar;
        if (paso.transferir) await ejecutar('transferir_llamada', { motivo: paso.transferir }, { canal: 'voz', ...o.extra });
        return { texto: dicho, interrumpida: false, terminada: conv.terminada };
      },
    };
    return conv;
  };
  return llamadas;
}

// ---------- Unidades ----------
test('cortador de frases: corta por signos y vacía el resto', () => {
  const fr = []; const c = cortadorDeFrases((f) => fr.push(f));
  for (const t of ['Buenos días, soy Lu', 'cía. ¿En qué', ' puedo ayudarle? Le cuento', ' algo']) c.meter(t);
  assert.deepEqual(fr, ['Buenos días, soy Lucía.', '¿En qué puedo ayudarle?']);
  c.vaciar();
  assert.deepEqual(fr.at(-1), 'Le cuento algo');
});

test('normalización para voz', () => {
  assert.equal(normalizarParaVoz('**Hola** _usted_ 😊'), 'Hola usted');
  assert.equal(normalizarParaVoz('Cuesta 1.500 € o €200'), 'Cuesta 1.500 euros o 200 euros');
  assert.equal(normalizarParaVoz('- Margen del 12% en [la web](https://x.es)'), 'Margen del 12 por ciento en la web');
  assert.equal(normalizarParaVoz('Vea https://businessavance.es/precios ahora'), 'Vea el enlace ahora');
  assert.equal(normalizarParaVoz('A las 10:30 h. ## Fin'), 'A las 10:30 Fin');
  assert.equal(normalizarParaVoz('Marketing & ventas'), 'Marketing y ventas');
  assert.equal(normalizarParaVoz('El correo es ana_lopez@x.es'), 'El correo es ana_lopez@x.es');
});

test('Deepgram: URL, cabecera, eventos y turno acumulado', async () => {
  const stt = new DeepgramSTT({ urlBase: `ws://127.0.0.1:${dgPuerto}` });
  const ev = [];
  stt.on('hablaInicio', () => ev.push(['inicio'])); stt.on('parcial', (t) => ev.push(['parcial', t])); stt.on('final', (t) => ev.push(['final', t]));
  const antes = dgConexiones.length;
  stt.conectar();
  await hasta(() => dgConexiones.length > antes, 2000, 'conexión a Deepgram');
  const ws = dgConexiones.at(-1);
  assert.equal(ws.cabeceras.authorization, 'Token dg-prueba');
  for (const k of ['model=nova-3', 'language=es', 'encoding=mulaw', 'sample_rate=8000', 'interim_results=true', 'endpointing=300', 'utterance_end_ms=1000', 'vad_events=true']) assert.ok(ws.ruta.includes(k), k);
  ws.send(JSON.stringify({ type: 'SpeechStarted' }));
  dgDice(ws, 'Quería', { final: false });
  dgDice(ws, 'Quería información', { final: true, speechFinal: false });
  dgDice(ws, 'sobre el relevo', { final: true, speechFinal: true });
  ws.send(JSON.stringify({ type: 'UtteranceEnd' })); // sin texto pendiente: no da otro final
  await hasta(() => ev.some((e) => e[0] === 'final'), 2000, 'final');
  await espera(30);
  assert.deepEqual(ev, [['inicio'], ['parcial', 'Quería'], ['parcial', 'Quería información'], ['parcial', 'Quería información sobre el relevo'], ['final', 'Quería información sobre el relevo']]);
  stt.cerrar();
});

test('firma de Twilio: TwiML de entrada con firma calculada y rechazo sin ella', async () => {
  const params = { CallSid: 'CAentra1', From: '+34611222333', To: '+34910000000' };
  const url = 'https://asistente.test/voz/entrante';
  const firma = twilio.getExpectedTwilioSignature('token-de-prueba', url, params);
  const ok = await fetch(`http://127.0.0.1:${puerto}/voz/entrante`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Twilio-Signature': firma }, body: new URLSearchParams(params) });
  assert.equal(ok.status, 200);
  const xml = await ok.text();
  assert.match(xml, /<Connect><Stream url="wss:\/\/asistente\.test\/voz\/stream">/);
  assert.match(xml, /<Parameter name="callSid" value="CAentra1"\/>/);
  assert.match(xml, /<Parameter name="direccion" value="entrante"\/>/);
  assert.ok(xml.includes(`<Parameter name="firma" value="${T.firmaStream('CAentra1')}"/>`));
  const ko = await fetch(`http://127.0.0.1:${puerto}/voz/entrante`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Twilio-Signature': 'falsa' }, body: new URLSearchParams(params) });
  assert.equal(ko.status, 403);
  // Saliente: la firma cubre también la consulta con contacto y campaña
  const urlS = 'https://asistente.test/voz/saliente-twiml?contactoId=7&campanaId=3';
  const pS = { CallSid: 'CAsal9', To: '+34611000111' };
  const rS = await fetch(`http://127.0.0.1:${puerto}/voz/saliente-twiml?contactoId=7&campanaId=3`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Twilio-Signature': twilio.getExpectedTwilioSignature('token-de-prueba', urlS, pS) }, body: new URLSearchParams(pS) });
  const xS = await rS.text();
  assert.match(xS, /name="contactoId" value="7"/); assert.match(xS, /name="campanaId" value="3"/); assert.match(xS, /name="direccion" value="saliente"/);
});

test('flujo de audio con testigo falso: se rechaza', async () => {
  const ws = new WebSocket(`ws://127.0.0.1:${puerto}/voz/stream`);
  await new Promise((ok) => ws.on('open', ok));
  const cerrado = new Promise((ok) => ws.on('close', (c) => ok(c)));
  ws.send(JSON.stringify({ event: 'start', streamSid: 'MZx', start: { streamSid: 'MZx', callSid: 'CAx', customParameters: { firma: 'inventada' } } }));
  assert.equal(await cerrado, 1008);
});

// ---------- Llamada completa ----------
test('llamada entrante: saludo, turno, barge-in con clear, colgado tras finalizar, marcas y gancho', async () => {
  const llamadas = conversacionSimulada([
    { frases: ['Buenos días, soy Lucía, asistente de inteligencia artificial.', '¿En qué puedo ayudarle?'] },
    { frases: ['Claro, le cuento.'] },
    { frases: ['Nuestro método tiene varias fases.'], esperaAbort: true },
    { frases: ['Perfecto, gracias por su llamada. Que tenga un buen día.'], finalizar: { resultado: 'atendido', resumen: 'Pidió información y se despidió.' } },
  ]);
  const terminadas = [];
  S.ganchos.alTerminar.push((id, d) => terminadas.push({ id, d }));
  const nDg = dgConexiones.length;
  const f = await abrirFlujo({ callSid: 'CAllamada1', parametros: { direccion: 'entrante', desde: '+34611222333' } });

  // Saludo: Claude saluda sin esperar
  await hasta(() => f.audios().includes('¿En qué puedo ayudarle?'), 3000, 'saludo');
  assert.equal(llamadas[0].texto, '[La llamada acaba de conectarse. Salude.]');
  assert.ok(f.rec.some((m) => m.event === 'mark' && m.streamSid === 'MZ1'), 'marcas tras el audio');
  const ses = S.sesiones.get('CAllamada1');
  assert.ok(ses, 'sesión registrada');
  await hasta(() => !ses.hablando, 2000, 'fin del saludo');

  // El audio de Twilio llega a Deepgram
  await hasta(() => dgConexiones.length > nDg, 2000, 'Deepgram conectado');
  const dgWs = dgConexiones.at(-1);
  const nAudio = dgAudio.length; f.media(); f.media();
  await hasta(() => dgAudio.length >= nAudio + 2, 2000, 'audio a Deepgram');

  // Turno normal
  dgDice(dgWs, 'Quería información sobre sus servicios.');
  await hasta(() => f.audios().includes('Claro, le cuento.'), 3000, 'respuesta al turno');
  assert.equal(llamadas[1].texto, 'Quería información sobre sus servicios.');
  await hasta(() => !ses.hablando, 2000, 'fin del turno');

  // Barge-in: el asistente habla (sin devolver marcas = aún suena) y la persona le corta con dos palabras
  f.ecoMarcas = false;
  dgDice(dgWs, '¿Cómo trabajan?');
  await hasta(() => f.audios().includes('varias fases'), 3000, 'respuesta larga');
  dgDice(dgWs, 'ajá', { final: false }); // una palabra: no corta
  await espera(50);
  assert.ok(!f.rec.some((m) => m.event === 'clear'), 'un «ajá» no corta');
  dgDice(dgWs, 'Perdone un momento', { final: false });
  await hasta(() => f.rec.some((m) => m.event === 'clear'), 2000, 'clear a Twilio');
  assert.equal(llamadas[2].signal.aborted, true, 'stream de Claude abortado');
  assert.ok(elMensajes.some((m) => m.close_context), 'contexto de TTS cerrado');

  // Despedida y finalizar: cuelga cuando se reproduce la última marca
  f.ecoMarcas = true;
  dgDice(dgWs, 'Perdone un momento, ya está, muchas gracias.');
  await hasta(() => f.audios().includes('Que tenga un buen día.'), 3000, 'despedida');
  assert.ok(!restTwilio.some((r) => r.sid === 'CAllamada1'), 'no cuelga antes de reproducir el audio');
  await hasta(() => restTwilio.some((r) => r.sid === 'CAllamada1' && r.status === 'completed'), 3000, 'colgar por la API');
  await hasta(() => f.cerrado, 2000, 'WebSocket cerrado');
  await hasta(() => terminadas.length === 1, 2000, 'gancho alTerminar');

  const conv = db.conversacionPorExterno('CAllamada1');
  assert.equal(conv.estado, 'cerrada'); assert.equal(conv.resultado, 'atendido'); assert.equal(conv.canal, 'voz');
  assert.equal(terminadas[0].id, conv.id);
  assert.equal(terminadas[0].d.resultado, 'atendido');
  const roles = db.mensajes(conv.id).map((m) => m.rol);
  assert.ok(roles.includes('usuario') && roles.includes('asistente'));
  const lat = db.abrir().prepare("SELECT datos FROM eventos WHERE tipo = 'latencia'").all().map((r) => JSON.parse(r.datos));
  assert.ok(lat.length >= 2 && lat.every((l) => l.conversacionId === conv.id && l.ms >= 0), 'latencia por turno');
  S.ganchos.alTerminar.length = 0;
});

test('silencio: «¿Sigue ahí?» y después despedida y colgar', async () => {
  Object.assign(S.TIEMPOS, { silencio: 80, despedida: 120 });
  conversacionSimulada([{ frases: ['Buenos días, soy Lucía.'] }]);
  const f = await abrirFlujo({ callSid: 'CAsilencio', parametros: { direccion: 'entrante', desde: '+34622000000' } });
  await hasta(() => f.audios().includes('¿Sigue ahí?'), 3000, 'aviso de silencio');
  await hasta(() => f.audios().includes('Le llamaremos en otro momento'), 3000, 'despedida');
  await hasta(() => restTwilio.some((r) => r.sid === 'CAsilencio' && r.status === 'completed'), 3000, 'colgar');
  Object.assign(S.TIEMPOS, { silencio: 8000, despedida: 20000 });
});

test('saliente: espera a que hablen, saluda; contestador → buzon sin mensaje; estado → gancho', async () => {
  const contacto = db.guardarContacto({ telefono: '+34633444555', nombre: 'Ana' });
  const llamadas = conversacionSimulada([{ frases: ['Hola Ana, soy Lucía.'], esperaAbort: true }]);
  const f = await abrirFlujo({ callSid: 'CAsal1', parametros: { direccion: 'saliente', telefono: '+34633444555', contactoId: String(contacto.id) } });
  await hasta(() => dgConexiones.at(-1) && S.sesiones.has('CAsal1'), 2000, 'sesión saliente');
  await hasta(() => dgConexiones.length && dgConexiones.at(-1).readyState === 1, 2000);
  await espera(100);
  assert.equal(llamadas.length, 0, 'no saluda antes de que hablen');
  dgDice(dgConexiones.at(-1), '¿Dígame?');
  await hasta(() => llamadas.length === 1, 2000, 'saludo saliente');
  assert.match(llamadas[0].texto, /«¿Dígame\?»/);

  // AMD asíncrono con firma
  const url = 'https://asistente.test/voz/amd';
  const p = { CallSid: 'CAsal1', AnsweredBy: 'machine_end_beep' };
  const r = await fetch(`http://127.0.0.1:${puerto}/voz/amd`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Twilio-Signature': twilio.getExpectedTwilioSignature('token-de-prueba', url, p) }, body: new URLSearchParams(p) });
  assert.equal(r.status, 204);
  await hasta(() => f.cerrado, 2000, 'colgado por contestador');
  assert.ok(restTwilio.some((x) => x.sid === 'CAsal1' && x.status === 'completed'));
  const conv = db.conversacionPorExterno('CAsal1');
  assert.equal(conv.resultado, 'buzon'); assert.equal(conv.contacto_id, contacto.id);

  // statusCallback → gancho de prospección
  const estados = []; R.alEstadoLlamada.push((d) => estados.push(d));
  const urlE = 'https://asistente.test/voz/estado?contactoId=5&campanaId=2';
  const pE = { CallSid: 'CAnadie', CallStatus: 'no-answer', To: '+34644000000' };
  const rE = await fetch(`http://127.0.0.1:${puerto}/voz/estado?contactoId=5&campanaId=2`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Twilio-Signature': twilio.getExpectedTwilioSignature('token-de-prueba', urlE, pE) }, body: new URLSearchParams(pE) });
  assert.equal(rE.status, 204);
  await hasta(() => estados.length === 1, 1000, 'gancho de estado');
  assert.deepEqual({ ...estados[0], duracion: undefined }, { callSid: 'CAnadie', estado: 'no-answer', duracion: undefined, telefono: '+34644000000', contactoId: 5, campanaId: 2, answeredBy: null });
});

test('transferir_llamada: aviso y Dial al móvil del responsable al terminar de hablar', async () => {
  conversacionSimulada([{ frases: ['Le paso ahora mismo.'], transferir: 'Quiere hablar con una persona' }]);
  const f = await abrirFlujo({ callSid: 'CAtransf', parametros: { direccion: 'entrante', desde: '+34655000000' } });
  await hasta(() => restTwilio.some((r) => r.sid === 'CAtransf' && r.twiml), 3000, 'transferencia');
  const tw = restTwilio.find((r) => r.sid === 'CAtransf').twiml;
  assert.match(tw, /<Say language="es-ES">Le paso con Valerio/);
  assert.match(tw, /<Dial callerId="\+34910000000"[^>]*>\+34600000000<\/Dial>/);
  assert.ok(f.audios().includes('Le paso ahora mismo.'), 'la frase suena antes de transferir');
  f.ws.send(JSON.stringify({ event: 'stop', streamSid: 'MZ1' }));
  await hasta(() => db.conversacionPorExterno('CAtransf').estado === 'cerrada', 2000);
  assert.equal(db.conversacionPorExterno('CAtransf').resultado, 'transferido');
});

test('llamar(): crea la llamada con AMD asíncrono y bloquea bajas', async () => {
  const r = await R.llamar({ telefono: '611 999 888', contactoId: 4, campanaId: 9 });
  assert.deepEqual(r, { ok: true, callSid: 'CAsaliente1' });
  const c = restTwilio.find((x) => x.crear).crear;
  assert.equal(c.to, '+34611999888'); assert.equal(c.from, '+34910000000');
  assert.equal(c.url, 'https://asistente.test/voz/saliente-twiml?contactoId=4&campanaId=9');
  assert.equal(c.statusCallback, 'https://asistente.test/voz/estado?contactoId=4&campanaId=9');
  assert.equal(c.asyncAmd, 'true'); assert.ok(c.machineDetection);
  assert.equal(c.asyncAmdStatusCallback, 'https://asistente.test/voz/amd?contactoId=4&campanaId=9');
  db.darDeBaja('+34611999777');
  assert.deepEqual(await R.llamar({ telefono: '+34611999777' }), { ok: false, motivo: 'baja' });
});

// ---------- Transferencia con salida, fallo técnico y grabación ----------
const firmado = (ruta, p) => fetch(`http://127.0.0.1:${puerto}${ruta}`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Twilio-Signature': twilio.getExpectedTwilioSignature('token-de-prueba', 'https://asistente.test' + ruta, p) }, body: new URLSearchParams(p) });

async function prepararAvisosYHubspot() {
  const http = await import('node:http');
  const hs = [];
  const fakeHs = http.createServer((req, res) => {
    let b = ''; req.on('data', (c) => (b += c)); req.on('end', () => {
      hs.push({ metodo: req.method, ruta: req.url.split('?')[0], cuerpo: b ? JSON.parse(b) : null });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      if (req.url.startsWith('/crm/v3/properties')) return res.end(JSON.stringify({ results: [] }));
      if (req.url.endsWith('/search')) return res.end(JSON.stringify({ results: [] }));
      res.end(JSON.stringify({ id: 'hs-' + hs.length }));
    });
  });
  await new Promise((ok) => fakeHs.listen(0, '127.0.0.1', ok));
  const hubspot = await import('../src/crm/hubspot.js');
  hubspot.configurarHubspot({ base: `http://127.0.0.1:${fakeHs.address().port}`, token: 'hs', esperaMaxMs: 10 });
  const { C } = await import('../src/config.js');
  Object.assign(C.smtp, { host: 'smtp.test', de: 'asistente@ejemplo.es' }); C.empresa.emailResponsable = 'valerio@ejemplo.es';
  const correos = [];
  (await import('../src/avisos.js')).configurarAvisos({ correo: async (m) => { correos.push(m); } });
  return { hs, correos, cerrar: () => { fakeHs.close(); hubspot.configurarHubspot({ token: '' }); } };
}

test('transferencia: <Dial> con action; sin respuesta → mensaje, tarea de prioridad alta y aviso; atendida → se registra', async () => {
  const x = await prepararAvisosYHubspot();
  try {
    conversacionSimulada([{ frases: ['Le paso ahora mismo.'], transferir: 'Cliente con una urgencia' }]);
    const f = await abrirFlujo({ callSid: 'CAtr2', parametros: { direccion: 'entrante', desde: '+34655000002' } });
    await hasta(() => restTwilio.some((r) => r.sid === 'CAtr2' && r.twiml), 3000, 'transferencia');
    const conv = db.conversacionPorExterno('CAtr2');
    const tw = restTwilio.find((r) => r.sid === 'CAtr2').twiml;
    assert.ok(tw.includes(`action="https://asistente.test/voz/transferencia-fin?conversacionId=${conv.id}&amp;contactoId=${conv.contacto_id}"`), tw);
    assert.match(tw, /timeout="25"/);
    f.ws.send(JSON.stringify({ event: 'stop', streamSid: 'MZ1' }));
    await hasta(() => db.conversacionPorId(conv.id).estado === 'cerrada', 2000);

    const r = await firmado(`/voz/transferencia-fin?conversacionId=${conv.id}&contactoId=${conv.contacto_id}`, { CallSid: 'CAtr2', DialCallStatus: 'no-answer' });
    assert.equal(r.status, 200);
    const xml = await r.text();
    assert.match(xml, /<Say language="es-ES">Disculpe, en este momento Valerio no puede atenderle\. Le devolverá la llamada/); assert.match(xml, /<Hangup\/>/);
    assert.equal(db.conversacionPorId(conv.id).transferencia, 'sin_respuesta');
    await hasta(() => x.hs.some((p) => p.ruta === '/crm/v3/objects/tasks'), 2000, 'tarea en HubSpot');
    const t = x.hs.find((p) => p.ruta === '/crm/v3/objects/tasks').cuerpo.properties;
    assert.equal(t.hs_task_priority, 'HIGH'); assert.match(t.hs_task_subject, /Devolver la llamada a \+34655000002/);
    await hasta(() => x.correos.length === 1, 2000, 'aviso por correo');
    assert.match(x.correos[0].asunto, /transferida sin respuesta/);
    assert.ok(db.abrir().prepare(`SELECT 1 FROM eventos WHERE tipo = 'transferencia_sin_respuesta' AND resuelto IS NULL`).get());
    // Sin firma: rechazada
    assert.equal((await fetch(`http://127.0.0.1:${puerto}/voz/transferencia-fin`, { method: 'POST', body: 'DialCallStatus=completed' })).status, 403);
    // Atendida
    const r2 = await firmado(`/voz/transferencia-fin?conversacionId=${conv.id}`, { CallSid: 'CAtr2', DialCallStatus: 'completed', DialCallDuration: '95' });
    assert.match(await r2.text(), /<Hangup\/>/);
    assert.equal(db.conversacionPorId(conv.id).transferencia, 'atendida');
  } finally { x.cerrar(); }
});

test('fallo de Claude en una llamada: la disculpa queda en la transcripción, aviso al equipo y volver a llamar con prioridad alta', async () => {
  const x = await prepararAvisosYHubspot();
  const terminadas = [];
  S.ganchos.alTerminar.push((id, d) => terminadas.push({ id, d }));
  try {
    S.fabricas.conversacion = (o) => ({ ...o, messages: [], terminada: null, contextoPendiente: null, async responder() { throw new Error('overloaded_error'); } });
    const f = await abrirFlujo({ callSid: 'CAfallo', parametros: { direccion: 'entrante', desde: '+34655000003' } });
    await hasta(() => f.audios().includes('he tenido un problema técnico'), 3000, 'disculpa');
    await hasta(() => restTwilio.some((r) => r.sid === 'CAfallo' && r.status === 'completed'), 3000, 'colgar');
    await hasta(() => terminadas.length === 1, 2000, 'cierre');
    const conv = db.conversacionPorExterno('CAfallo');
    assert.equal(conv.resultado, 'volver_a_llamar');
    assert.ok(db.mensajes(conv.id).some((m) => m.rol === 'asistente' && /problema técnico/.test(m.texto)), 'disculpa en la transcripción');
    assert.equal(terminadas[0].d.prioridad, 'HIGH');
    await hasta(() => x.correos.length === 1, 2000, 'aviso');
    assert.match(x.correos[0].asunto, /Fallo técnico en una llamada/);
    assert.match(x.correos[0].texto, /overloaded_error/);
    // El cierre en HubSpot crea la tarea de volver a llamar con prioridad alta
    const hubspot = await import('../src/crm/hubspot.js');
    await hubspot.alTerminarLlamada(conv.id, terminadas[0].d);
    const t = x.hs.find((p) => p.ruta === '/crm/v3/objects/tasks').cuerpo.properties;
    assert.equal(t.hs_task_priority, 'HIGH'); assert.match(t.hs_task_subject, /^Volver a llamar/);
  } finally { x.cerrar(); S.ganchos.alTerminar.length = 0; }
});

test('grabación: la dirección del audio llega por el aviso firmado de Twilio y se guarda en la conversación', async () => {
  const conv = db.abrirConversacion({ canal: 'voz', direccion: 'entrante', externoId: 'CAgrab' });
  const r = await firmado(`/voz/grabacion?conversacionId=${conv}`, { CallSid: 'CAgrab', RecordingSid: 'RE123', RecordingUrl: 'https://api.twilio.com/2010-04-01/Accounts/ACprueba/Recordings/RE123', RecordingStatus: 'completed', RecordingDuration: '61' });
  assert.equal(r.status, 204);
  const c = db.conversacionPorId(conv);
  assert.equal(c.grabacion_sid, 'RE123'); assert.match(c.grabacion_url, /Recordings\/RE123$/);
  // La petición de grabar lleva su aviso
  await T.grabarLlamada('CAgrab', { conversacionId: conv });
  const g = restTwilio.find((x) => x.grabar && x.sid === 'CAgrab');
  assert.equal(g.recordingStatusCallback, `https://asistente.test/voz/grabacion?conversacionId=${conv}`);
});
