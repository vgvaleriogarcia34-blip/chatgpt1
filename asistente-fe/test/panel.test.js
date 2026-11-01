// Panel: desactivado sin clave, acceso con usuario y contraseña, API protegida y escape del HTML.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

let C, db, srv, base, panel;
before(async () => {
  delete process.env.ANTHROPIC_API_KEY; delete process.env.ANTHROPIC_AUTH_TOKEN;
  ({ C } = await import('../src/config.js'));
  db = await import('../src/almacen/db.js');
  db.abrir(':memory:');
  const s = await import('../src/servidor.js');
  panel = await import('../src/panel/rutas.js');
  srv = s.crearServidor();
  await new Promise((ok) => srv.listen(0, '127.0.0.1', ok));
  base = `http://127.0.0.1:${srv.address().port}`;
});
after(() => { srv.close(); db.cerrar(); });

const pedir = (ruta, op = {}) => fetch(base + ruta, { redirect: 'manual', ...op });

test('sin PANEL_CLAVE el panel está desactivado', async () => {
  C.panel.clave = '';
  let r = await pedir('/panel');
  assert.equal(r.status, 503); assert.match(await r.text(), /PANEL_CLAVE/);
  r = await pedir('/panel/api/resumen');
  assert.equal(r.status, 503);
  r = await pedir('/panel/entrar', { method: 'POST', body: 'usuario=admin&clave=' });
  assert.equal(r.status, 503);
});

let cookie;
test('con clave pide iniciar sesión y entra con la contraseña correcta', async () => {
  Object.assign(C.panel, { usuario: 'admin', clave: 'clave-de-prueba-larga' });
  let r = await pedir('/panel');
  assert.equal(r.status, 200);
  const t = await r.text();
  assert.match(t, /<form method="post" action="\/panel\/entrar"/); assert.doesNotMatch(t, /panel\.js/);
  assert.match(r.headers.get('content-security-policy'), /script-src 'self'/);
  assert.equal((await pedir('/panel/api/resumen')).status, 401);
  assert.equal((await pedir('/panel/panel.js')).status, 401);
  assert.equal((await pedir('/panel/panel.css')).status, 200);

  r = await pedir('/panel/entrar', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'usuario=admin&clave=mala' });
  assert.equal(r.status, 401); assert.match(await r.text(), /incorrectos/);

  r = await pedir('/panel/entrar', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'usuario=admin&clave=clave-de-prueba-larga' });
  assert.equal(r.status, 303);
  const sc = r.headers.get('set-cookie');
  assert.match(sc, /HttpOnly/); assert.match(sc, /SameSite=Strict/); assert.match(sc, /Path=\/panel/);
  cookie = sc.split(';')[0];

  r = await pedir('/panel', { headers: { cookie } });
  assert.match(await r.text(), /panel\.js/);
  r = await pedir('/panel/api/resumen', { headers: { cookie } });
  assert.equal(r.status, 200);
  const j = await r.json();
  assert.equal(j.llamadasHoy, 0); assert.equal(j.latenciaMediaMs, null);

  // Cookie manipulada
  const [nombre, valor] = cookie.split('=');
  const [datos, firma] = valor.split('.');
  const otra = Buffer.from(JSON.stringify({ u: 'admin', exp: Date.now() + 1e9, sid: 'x' })).toString('base64url');
  assert.equal((await pedir('/panel/api/resumen', { headers: { cookie: `${nombre}=${otra}.${firma}` } })).status, 401);
  assert.ok(datos);
});

test('API: resumen, campañas, bajas y protección de las peticiones POST', async () => {
  const post = (ruta, cuerpo, extra = {}) => pedir('/panel/api/' + ruta, { method: 'POST', headers: { cookie, 'Content-Type': 'application/json', 'X-Panel': '1', ...extra }, body: JSON.stringify(cuerpo) });
  assert.equal((await pedir('/panel/api/campanas', { method: 'POST', headers: { cookie }, body: '{}' })).status, 403); // sin cabecera propia
  let r = await post('campanas', { nombre: 'Afianzar el equipo', dolor: 'no meter más personal sino afianzar el equipo' });
  assert.equal(r.status, 200);
  const k = await r.json();
  r = await post(`campanas/${k.id}/importar`, { csv: 'telefono,nombre,base_legal\n600123123,Marta,cliente\n600123124,Pedro,\n' });
  const imp = await r.json();
  assert.equal(imp.importados, 2); assert.equal(imp.sinBaseLegal, 1);
  assert.equal((await (await post(`campanas/${k.id}/reanudar`, {})).json()).estado, 'activa');
  assert.equal((await (await post(`campanas/${k.id}/pausar`, {})).json()).estado, 'pausada');
  r = await pedir(`/panel/api/campanas/${k.id}`, { headers: { cookie } });
  assert.equal((await r.json()).contactos.length, 2);
  assert.equal((await post('campanas', { nombre: '' })).status, 400);

  assert.equal((await post('bajas', { telefono: '600 555 444', motivo: 'lo pidió por correo' })).status, 200);
  assert.equal(db.estaDeBaja('+34600555444'), true);
  r = await post('robinson', { csv: '600777888\n600777889\n', fecha: '2026-10-30' });
  assert.deepEqual(await r.json(), { cargados: 2, descartados: 0 });

  db.evento('latencia', { ms: 700 }); db.evento('latencia', 900);
  const conv = db.abrirConversacion({ canal: 'voz', direccion: 'entrante' });
  db.cerrarConversacion(conv, { resultado: 'reunion_agendada', resumen: 'Reunión el martes' });
  const j = await (await pedir('/panel/api/resumen', { headers: { cookie } })).json();
  assert.equal(j.latenciaMediaMs, 800); assert.equal(j.llamadasHoy, 1); assert.equal(j.reunionesHoy, 1); assert.equal(j.robinson, 2);

  // Recargar el conocimiento
  r = await post('conocimiento/recargar', {});
  assert.equal((await r.json()).ok, true);
  // Probar el asistente sin clave de Anthropic: avisa, no cae
  r = await post('probar', { texto: 'Hola' });
  assert.equal(r.status, 503); assert.match((await r.json()).error, /ANTHROPIC_API_KEY/);
});

test('escape de HTML: transcripción en el servidor y pintado con textContent en el navegador', async () => {
  assert.equal(panel.escapar('<img src=x onerror="alert(1)">&\''), '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;&amp;&#39;');
  const c = db.guardarContacto({ telefono: '600000111', nombre: '<script>alert("n")</script>', empresa: '"><b>X</b>' });
  const conv = db.abrirConversacion({ canal: 'whatsapp', direccion: 'entrante', contactoId: c.id });
  db.anotar(conv, 'usuario', '<img src=x onerror=alert(1)>');
  db.cerrarConversacion(conv, { resumen: '</p><script>robar()</script>' });
  const r = await pedir('/panel/conversacion/' + conv, { headers: { cookie } });
  const t = await r.text();
  assert.equal(r.status, 200);
  assert.doesNotMatch(t, /<script>|<img|<b>X/);
  assert.match(t, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.match(t, /&lt;script&gt;alert\(&quot;n&quot;\)&lt;\/script&gt;/);
  // La API devuelve JSON (no HTML) y el script del panel nunca usa innerHTML ni insertAdjacentHTML
  const api = await pedir('/panel/api/conversaciones/' + conv, { headers: { cookie } });
  assert.match(api.headers.get('content-type'), /application\/json/);
  const js = fs.readFileSync(new URL('../src/panel/publico/panel.js', import.meta.url), 'utf8');
  assert.doesNotMatch(js, /innerHTML|outerHTML|insertAdjacentHTML|document\.write/);
  assert.equal((await pedir('/panel/conversacion/' + conv)).status, 401);
});

test('salir borra la cookie y demasiados intentos bloquean el acceso', async () => {
  const r = await pedir('/panel/salir', { method: 'POST', headers: { cookie } });
  assert.equal(r.status, 303); assert.match(r.headers.get('set-cookie'), /Max-Age=0/);
  let ultimo;
  for (let i = 0; i < 6; i++) ultimo = await pedir('/panel/entrar', { method: 'POST', body: 'usuario=admin&clave=no' });
  assert.equal(ultimo.status, 429);
});

test('probar el asistente por texto contra una API de Claude simulada', async () => {
  const http = await import('node:http');
  const falso = http.createServer((req, res) => {
    req.resume(); req.on('end', () => {
      res.writeHead(200, { 'Content-Type': 'text/event-stream' });
      const ev = (tipo, d) => res.write(`event: ${tipo}\ndata: ${JSON.stringify({ type: tipo, ...d })}\n\n`);
      ev('message_start', { message: { id: 'm1', type: 'message', role: 'assistant', model: 'claude-opus-5-5', content: [], stop_reason: null, usage: { input_tokens: 1, output_tokens: 1 } } });
      ev('content_block_start', { index: 0, content_block: { type: 'text', text: '' } });
      ev('content_block_delta', { index: 0, delta: { type: 'text_delta', text: 'Buenos días, soy Lucía, el asistente de IA. ¿En qué le ayudo?' } });
      ev('content_block_stop', { index: 0 });
      ev('message_delta', { delta: { stop_reason: 'end_turn' }, usage: { output_tokens: 5 } });
      ev('message_stop', {}); res.end();
    });
  });
  await new Promise((ok) => falso.listen(0, '127.0.0.1', ok));
  process.env.ANTHROPIC_BASE_URL = `http://127.0.0.1:${falso.address().port}`;
  process.env.ANTHROPIC_API_KEY = 'prueba';
  try {
    const login = await pedir('/panel/entrar', { method: 'POST', body: `usuario=admin&clave=${C.panel.clave}` });
    // la IP puede seguir bloqueada por la prueba anterior: se crea la cookie directamente
    const { crearCookie } = await import('../src/panel/sesion.js');
    const ck = login.status === 303 ? login.headers.get('set-cookie').split(';')[0] : 'fe_panel=' + crearCookie('admin');
    const r = await pedir('/panel/api/probar', { method: 'POST', headers: { cookie: ck, 'X-Panel': '1', 'Content-Type': 'application/json' }, body: JSON.stringify({ texto: 'Hola, ¿quién es?' }) });
    assert.equal(r.status, 200);
    const j = await r.json();
    assert.match(j.texto, /asistente de IA/);
    const msgs = db.mensajes(j.conversacionId);
    assert.deepEqual(msgs.map((m) => m.rol), ['usuario', 'asistente']);
    assert.equal(db.abrir().prepare('SELECT canal FROM conversaciones WHERE id = ?').get(j.conversacionId).canal, 'prueba');
  } finally { falso.close(); delete process.env.ANTHROPIC_API_KEY; }
});
