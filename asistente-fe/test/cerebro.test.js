// Cerebro: conversación con herramientas y voz por frases, contra un servidor falso de la API de Claude (SSE).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

const peticiones = [];
let guion = []; // respuestas en orden: cada una es una lista de bloques
const srv = http.createServer((req, res) => {
  let cuerpo = '';
  req.on('data', (c) => (cuerpo += c));
  req.on('end', () => {
    peticiones.push({ cabeceras: req.headers, cuerpo: JSON.parse(cuerpo) });
    const bloques = guion.shift() || [{ type: 'text', text: 'Fin.' }];
    res.writeHead(200, { 'Content-Type': 'text/event-stream' });
    const ev = (tipo, datos) => res.write(`event: ${tipo}\ndata: ${JSON.stringify({ type: tipo, ...datos })}\n\n`);
    const usaHerr = bloques.some((b) => b.type === 'tool_use');
    ev('message_start', { message: { id: 'msg_' + peticiones.length, type: 'message', role: 'assistant', model: 'claude-opus-5-5', content: [], stop_reason: null, usage: { input_tokens: 10, output_tokens: 1 } } });
    bloques.forEach((b, i) => {
      if (b.type === 'text') {
        ev('content_block_start', { index: i, content_block: { type: 'text', text: '' } });
        for (const trozo of b.text.match(/.{1,7}/gs) || []) ev('content_block_delta', { index: i, delta: { type: 'text_delta', text: trozo } });
      } else {
        ev('content_block_start', { index: i, content_block: { type: 'tool_use', id: b.id, name: b.name, input: {} } });
        ev('content_block_delta', { index: i, delta: { type: 'input_json_delta', partial_json: JSON.stringify(b.input) } });
      }
      ev('content_block_stop', { index: i });
    });
    ev('message_delta', { delta: { stop_reason: usaHerr ? 'tool_use' : 'end_turn' }, usage: { output_tokens: 20 } });
    ev('message_stop', {});
    res.end();
  });
});

let Conversacion, herramientas, db;
before(async () => {
  await new Promise((ok) => srv.listen(0, ok));
  process.env.ANTHROPIC_BASE_URL = `http://127.0.0.1:${srv.address().port}`;
  process.env.ANTHROPIC_API_KEY = 'prueba';
  db = await import('../src/almacen/db.js');
  db.abrir(':memory:');
  herramientas = await import('../src/cerebro/herramientas.js');
  ({ Conversacion } = await import('../src/cerebro/agente.js'));
});
after(() => { srv.closeAllConnections(); srv.close(); db.cerrar(); });

test('voz: frases en streaming, herramienta y resultado en un solo mensaje', async () => {
  let fichaCtx = null;
  herramientas.registrar('ficha_contacto', async (_e, ctx) => { fichaCtx = ctx; return { nombre: 'Ana', empresa: 'Talleres Ruiz' }; });
  guion = [
    [{ type: 'text', text: 'Un momento, que lo miro.' }, { type: 'tool_use', id: 'tu_1', name: 'ficha_contacto', input: {} }],
    [{ type: 'text', text: 'Hola, Ana. Veo que es de Talleres Ruiz. ¿En qué puedo ayudarle hoy, con la caja o con el equipo?' }],
  ];
  const c = db.guardarContacto({ telefono: '600111222', nombre: 'Ana' });
  const conv = new Conversacion({ canal: 'voz', direccion: 'entrante', contacto: c, conversacionId: db.abrirConversacion({ canal: 'voz', direccion: 'entrante', contactoId: c.id }) });
  const frases = [], usadas = [];
  const r = await conv.responder('Hola, buenos días', { alHablar: (f) => frases.push(f), alHerramienta: (n) => usadas.push(n) });

  assert.deepEqual(usadas, ['ficha_contacto']);
  assert.equal(fichaCtx.canal, 'voz');
  assert.deepEqual(frases, ['Un momento, que lo miro.', 'Hola, Ana.', 'Veo que es de Talleres Ruiz.', '¿En qué puedo ayudarle hoy, con la caja o con el equipo?']);
  assert.equal(r.interrumpida, false);

  const [p1, p2] = peticiones.slice(-2);
  assert.equal(p1.cuerpo.model, 'claude-opus-5-5');
  assert.equal(p1.cuerpo.output_config.effort, 'low');
  assert.equal(p1.cuerpo.fallbacks, 'default');
  assert.match(p1.cabeceras['anthropic-beta'], /server-side-fallback-2026-07-01/);
  assert.equal(p1.cuerpo.system[0].cache_control.ttl, '1h');
  assert.ok(p1.cuerpo.tools.every((t) => t.eager_input_streaming === true));
  assert.equal(p1.cuerpo.temperature, undefined);
  // El contexto interno va delante del primer mensaje del usuario, no en el sistema (no rompe la caché)
  assert.match(p1.cuerpo.messages[0].content[0].text, /Contexto interno/);
  assert.ok(!JSON.stringify(p1.cuerpo.system).includes('Ana'));
  // Segunda petición: asistente con el tool_use y un solo mensaje de usuario con el tool_result
  const ult = p2.cuerpo.messages.at(-1);
  assert.equal(ult.role, 'user');
  assert.equal(ult.content.length, 1);
  assert.equal(ult.content[0].type, 'tool_result');
  assert.equal(ult.content[0].tool_use_id, 'tu_1');
});

test('entrada de herramienta no válida: se devuelve como error, no se ejecuta', async () => {
  let ejecutada = false;
  herramientas.registrar('agendar_reunion', async () => { ejecutada = true; return 'ok'; });
  guion = [
    [{ type: 'tool_use', id: 'tu_2', name: 'agendar_reunion', input: { nombre: 'Ana' } }],
    [{ type: 'text', text: '¿Me confirma la hora?' }],
  ];
  const conv = new Conversacion({ canal: 'whatsapp', direccion: 'entrante', conversacionId: db.abrirConversacion({ canal: 'whatsapp', direccion: 'entrante' }) });
  await conv.responder('Quiero una reunión');
  assert.equal(ejecutada, false);
  const res = peticiones.at(-1).cuerpo.messages.at(-1).content[0];
  assert.equal(res.is_error, true);
  assert.match(res.content, /INVALID_JSON/);
  assert.equal(peticiones.at(-1).cuerpo.output_config.effort, 'medium');
});

test('finalizar deja la conversación terminada; transferir solo en voz', async () => {
  herramientas.registrar('finalizar', async () => 'guardado');
  herramientas.registrar('transferir_llamada', async () => 'transferida');
  guion = [
    [{ type: 'text', text: 'Le paso con el equipo.' }, { type: 'tool_use', id: 'tu_3', name: 'transferir_llamada', input: { motivo: 'urgencia' } }, { type: 'tool_use', id: 'tu_4', name: 'finalizar', input: { resultado: 'transferido', resumen: 'Cliente con urgencia.' } }],
    [{ type: 'text', text: '' }],
  ];
  const conv = new Conversacion({ canal: 'whatsapp', direccion: 'entrante', conversacionId: db.abrirConversacion({ canal: 'whatsapp', direccion: 'entrante' }) });
  const r = await conv.responder('Es urgente');
  assert.deepEqual(r.terminada, { resultado: 'transferido', resumen: 'Cliente con urgencia.' });
  const resultados = peticiones.at(-1).cuerpo.messages.at(-1).content;
  assert.equal(resultados.length, 2);
  assert.equal(resultados.find((x) => x.tool_use_id === 'tu_3').is_error, true); // transferir no existe en WhatsApp
});

test('interrupción: queda solo lo dicho, como mensaje nuevo', async () => {
  guion = [[{ type: 'text', text: 'Le cuento cómo trabajamos. Primero hacemos un diagnóstico de la empresa con sus números reales, y después' }]];
  const conv = new Conversacion({ canal: 'voz', direccion: 'entrante', conversacionId: db.abrirConversacion({ canal: 'voz', direccion: 'entrante' }) });
  const ac = new AbortController();
  const r = await conv.responder('¿Cómo trabajáis?', { signal: ac.signal, alHablar: () => ac.abort() });
  assert.equal(r.interrumpida, true);
  const ult = conv.messages.at(-1);
  assert.equal(ult.role, 'assistant');
  assert.match(ult.content[0].text, /^Le cuento cómo trabajamos\..*interrumpido/);
});
