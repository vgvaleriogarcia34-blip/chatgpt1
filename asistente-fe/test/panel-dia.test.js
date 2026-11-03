// Panel para el día a día: bandeja «requiere acción», sesiones por confirmar que no cuentan como agendadas, búsqueda y
// filtros, ficha con cronología y enlace a HubSpot, invitación a Atalaya, CSV seguro, bajas compartidas y con HubSpot,
// estado de las integraciones y textos legibles.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

const hs = [];
const fakeHs = http.createServer((req, res) => {
  let b = ''; req.on('data', (c) => (b += c)); req.on('end', () => {
    hs.push({ metodo: req.method, ruta: req.url.split('?')[0], cuerpo: b ? JSON.parse(b) : null });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    if (req.url.startsWith('/account-info/v3/details')) return res.end(JSON.stringify({ portalId: 1234567, uiDomain: 'app-eu1.hubspot.com' }));
    if (req.url.startsWith('/crm/v3/properties')) return res.end(JSON.stringify({ results: [{ name: 'fe_baja' }] }));
    if (req.url.endsWith('/search')) return res.end(JSON.stringify({ results: [] }));
    res.end(JSON.stringify({ id: 'hs-' + hs.length }));
  });
});
const at = [];
const fakeAt = http.createServer((req, res) => {
  let b = ''; req.on('data', (c) => (b += c)); req.on('end', () => {
    at.push({ ruta: req.url, auth: req.headers.authorization, cuerpo: b ? JSON.parse(b) : null });
    res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ ok: true, enlace: 'https://atalaya.test/acceso.html#alta=abc' }));
  });
});

let C, db, srv, base, cookie, hubspot;
before(async () => {
  await new Promise((ok) => fakeHs.listen(0, '127.0.0.1', ok));
  await new Promise((ok) => fakeAt.listen(0, '127.0.0.1', ok));
  delete process.env.ANTHROPIC_API_KEY; delete process.env.ANTHROPIC_AUTH_TOKEN;
  ({ C } = await import('../src/config.js'));
  Object.assign(C.panel, { usuario: 'admin', clave: 'clave-de-prueba-larga' });
  db = await import('../src/almacen/db.js');
  db.abrir(':memory:');
  hubspot = await import('../src/crm/hubspot.js');
  hubspot.configurarHubspot({ base: `http://127.0.0.1:${fakeHs.address().port}`, token: 'hs', esperaMaxMs: 10 });
  (await import('../src/integraciones/atalaya.js')).configurarAtalaya({ url: `http://127.0.0.1:${fakeAt.address().port}`, token: 'tok-int' });
  const s = await import('../src/servidor.js');
  await import('../src/panel/rutas.js');
  srv = s.crearServidor();
  await new Promise((ok) => srv.listen(0, '127.0.0.1', ok));
  base = `http://127.0.0.1:${srv.address().port}`;
  cookie = 'fe_panel=' + (await import('../src/panel/sesion.js')).crearCookie('admin');
});
after(() => { srv.close(); fakeHs.close(); fakeAt.close(); db.cerrar(); });

const get = (ruta) => fetch(base + '/panel/api/' + ruta, { headers: { cookie } });
const getJ = async (ruta) => { const r = await get(ruta); assert.equal(r.status, 200, ruta); return r.json(); };
const post = async (ruta, cuerpo = {}) => fetch(base + '/panel/api/' + ruta, { method: 'POST', headers: { cookie, 'X-Panel': '1', 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) });

test('bandeja «requiere acción»: lo que se escribe en eventos aparece, se resuelve y las sesiones por confirmar no cuentan como agendadas', async () => {
  const c = db.guardarContacto({ telefono: '+34600111001', nombre: 'Marta Sanz', empresa: 'Sanz Hnos.' });
  const conf = db.abrirConversacion({ canal: 'voz', direccion: 'entrante', contactoId: c.id });
  db.cerrarConversacion(conf, { resultado: 'reunion_agendada', resumen: 'Sesión el jueves' });
  const pend = db.abrirConversacion({ canal: 'whatsapp', direccion: 'entrante', contactoId: c.id });
  db.cerrarConversacion(pend, { resultado: 'reunion_agendada', resumen: 'Pide sesión, sin agenda' });
  db.evento('reunion_pendiente', { cuando: 'jueves 5 de noviembre a las 10:00', contacto: c.id, conversacionId: pend, modalidad: 'videollamada' });
  db.evento('transferencia_sin_respuesta', { conversacionId: conf, estado: 'no-answer' });
  db.evento('voz_error', { conversacionId: conf, error: 'overloaded' });
  db.evento('whatsapp_error', { telefono: '+34600111001', error: 'Meta 500' });
  db.evento('whatsapp_fallo', { id: 'wamid.x', errores: [131026] });
  db.evento('latencia', { ms: 500 }); // no es una acción

  let r = await getJ('resumen');
  assert.equal(r.reunionesHoy, 1, 'la pendiente no cuenta'); assert.equal(r.reunionesPorConfirmar, 1); assert.equal(r.requiereAccion, 5);
  const lista = await getJ('acciones');
  assert.deepEqual(lista.map((x) => x.tipo).sort(), ['reunion_pendiente', 'transferencia_sin_respuesta', 'voz_error', 'whatsapp_error', 'whatsapp_fallo']);
  const p = lista.find((x) => x.tipo === 'reunion_pendiente');
  assert.equal(p.titulo, 'Sesión por confirmar'); assert.equal(p.contacto.id, c.id); assert.match(p.detalle, /jueves 5 de noviembre/);
  assert.equal(lista.find((x) => x.tipo === 'voz_error').contacto.nombre, 'Marta Sanz', 'contacto a través de la conversación');
  assert.equal(lista.find((x) => x.tipo === 'whatsapp_error').contacto.id, c.id, 'contacto a través del teléfono');
  // La lista de conversaciones la marca como «por confirmar»
  const convs = await getJ('conversaciones');
  assert.equal(convs.find((v) => v.id === pend).reunion_pendiente, true);
  assert.equal((await getJ('conversaciones?resultado=reunion_agendada')).length, 1);
  assert.equal((await getJ('conversaciones?resultado=reunion_pendiente'))[0].id, pend);
  // Resolver (POST protegido)
  assert.equal((await fetch(base + `/panel/api/acciones/${p.id}/resolver`, { method: 'POST', headers: { cookie } })).status, 403);
  assert.deepEqual(await (await post(`acciones/${p.id}/resolver`)).json(), { ok: true });
  r = await getJ('resumen');
  assert.equal(r.reunionesHoy, 2, 'confirmada, ya cuenta'); assert.equal(r.reunionesPorConfirmar, 0); assert.equal(r.requiereAccion, 4);
});

test('búsqueda y filtros por resultado, canal y fecha', async () => {
  const c = db.guardarContacto({ telefono: '+34600111002', nombre: 'Íñigo Lasa', empresa: 'Conservas Lasa', email: 'inigo@lasa.es' });
  const v = db.abrirConversacion({ canal: 'whatsapp', direccion: 'entrante', contactoId: c.id });
  db.cerrarConversacion(v, { resultado: 'volver_a_llamar', resumen: 'Quiere hablar del relevo en la conservera' });
  assert.deepEqual((await getJ('conversaciones?q=lasa')).map((x) => x.id), [v]);
  assert.deepEqual((await getJ('conversaciones?q=600111002')).map((x) => x.id), [v]);
  assert.deepEqual((await getJ('conversaciones?q=conservera')).map((x) => x.id), [v]);
  assert.deepEqual((await getJ('conversaciones?q=inigo@lasa')).map((x) => x.id), [v]);
  assert.equal((await getJ('conversaciones?resultado=volver_a_llamar&canal=whatsapp')).length, 1);
  assert.equal((await getJ('conversaciones?resultado=volver_a_llamar&canal=voz')).length, 0);
  assert.equal((await getJ('conversaciones?q=lasa&desde=2099-01-01')).length, 0);
  const hoy = new Date().toISOString().slice(0, 10);
  assert.equal((await getJ(`conversaciones?q=lasa&desde=${hoy}&hasta=${hoy}`)).length, 1);
  assert.equal((await getJ('conversaciones?q=%25')).length, 0, 'los comodines de LIKE se escapan');
  const t = await getJ('textos');
  assert.equal(t.resultado.volver_a_llamar, 'Volver a llamar'); assert.equal(t.estadoContacto.sin_base_legal, 'Sin base legal (correo o LinkedIn)');
});

test('ficha de contacto: cronología completa, enlace a HubSpot e invitación a Atalaya', async () => {
  const c = db.guardarContacto({ telefono: '+34600111003', nombre: 'Elena Mora', empresa: 'Mora Logística', email: 'elena@mora.es', hubspot_id: '901', hubspot_company_id: '7001', base_legal: 'cliente' });
  const v = db.abrirConversacion({ canal: 'voz', direccion: 'entrante', contactoId: c.id });
  db.anotar(v, 'usuario', 'Hola'); db.anotar(v, 'asistente', 'Buenos días');
  db.anotar(v, 'nota', 'Le preocupa la caja', { tipo: 'nota' });
  db.anotar(v, 'reunion', 'Reunión reservada: jueves 5 de noviembre a las 10:00', { eventoId: 'ev1' });
  db.cerrarConversacion(v, { resultado: 'reunion_agendada', resumen: 'Sesión agendada para el jueves' });
  db.marcarConversacion(v, { transferencia: 'sin_respuesta', grabacion_url: 'https://api.twilio.com/2010-04-01/Accounts/AC/Recordings/RE1' });
  const k = (await import('../src/prospeccion/campanas.js')).crearCampana({ nombre: 'Relevo 2026' });
  db.abrir().prepare(`INSERT INTO campana_contactos (campana_id, contacto_id, estado, intentos, resultado) VALUES (?, ?, 'completado', 1, 'reunion_agendada')`).run(k.id, c.id);

  const f = await getJ('contactos/' + c.id);
  assert.equal(f.hubspot.enlace, 'https://app-eu1.hubspot.com/contacts/1234567/record/0-1/901');
  assert.equal(f.atalaya, true); assert.equal(f.deBaja, false);
  const tipos = f.cronologia.map((x) => x.tipo);
  for (const t of ['conversacion', 'nota', 'reunion', 'campana']) assert.ok(tipos.includes(t), t);
  const conv = f.cronologia.find((x) => x.tipo === 'conversacion');
  assert.match(conv.titulo, /Llamada entrante · Sesión agendada/); assert.match(conv.detalle, /2 mensajes/); assert.match(conv.detalle, /Transferencia: Sin respuesta/);
  assert.equal(conv.grabada, true);
  assert.match(f.cronologia.find((x) => x.tipo === 'campana').titulo, /Campaña «Relevo 2026»: Completado/);
  // El detalle de la conversación no expone la dirección de la grabación
  const d = await getJ('conversaciones/' + v);
  assert.equal(d.grabada, true); assert.equal(d.grabacion_url, undefined);
  // Invitar a Atalaya con el contrato común
  const r = await (await post(`contactos/${c.id}/invitar`)).json();
  assert.deepEqual(r, { ok: true, enlace: 'https://atalaya.test/acceso.html#alta=abc' });
  assert.equal(at[0].ruta, '/api/integracion/invitar'); assert.equal(at[0].auth, 'Bearer tok-int');
  assert.deepEqual(at[0].cuerpo, { email: 'elena@mora.es', nombre: 'Elena Mora', empresa: 'Mora Logística', telefono: '+34600111003', hubspotCompanyId: '7001', hubspotContactId: '901' });
  assert.ok((await getJ('contactos/' + c.id)).cronologia.some((x) => x.tipo === 'atalaya_invitacion'));
  // Sin correo no se invita
  const sin = db.guardarContacto({ telefono: '+34600111004', nombre: 'Sin correo' });
  assert.equal((await (await post(`contactos/${sin.id}/invitar`)).json()).ok, false);
  assert.equal(at.length, 1);
  // Lista de contactos con búsqueda
  assert.deepEqual((await getJ('contactos?q=mora')).map((x) => x.id), [c.id]);
});

test('CSV: «;», BOM, fórmulas neutralizadas; contactos y sin base legal (sin los de baja)', async () => {
  const c = db.guardarContacto({ telefono: '+34600111005', nombre: '=HYPERLINK("http://malo")', empresa: 'Uno; Dos "S.L."', email: 'x@uno.es' });
  const v = db.abrirConversacion({ canal: 'whatsapp', direccion: 'entrante', contactoId: c.id });
  db.cerrarConversacion(v, { resultado: 'volver_a_llamar', resumen: '+34 llamar\nmañana' });
  let r = await get('exportar/conversaciones?resultado=volver_a_llamar&canal=whatsapp');
  assert.match(r.headers.get('content-type'), /text\/csv/); assert.match(r.headers.get('content-disposition'), /attachment; filename="conversaciones-\d{4}-\d\d-\d\d\.csv"/);
  const bruto = Buffer.from(await r.arrayBuffer());
  assert.deepEqual([...bruto.subarray(0, 3)], [0xef, 0xbb, 0xbf], 'BOM UTF-8');
  const t = bruto.toString('utf8').slice(1);
  const lineas = t.split('\r\n');
  assert.equal(lineas[0].split(';')[0], 'Fecha (UTC)');
  assert.ok(t.includes(`"'=HYPERLINK(""http://malo"")"`), 'fórmula neutralizada y comillas dobladas');
  assert.ok(t.includes('"Uno; Dos ""S.L."""'));
  assert.ok(t.includes(`"'+34 llamar\nmañana"`));
  assert.ok(t.includes(';Volver a llamar;'), 'texto legible, no el código');
  r = await get('exportar/contactos?q=uno');
  assert.match(await r.text(), /'=HYPERLINK/);
  // Sin base legal: para escribirles por correo o LinkedIn; quien está de baja no sale
  const ca = await import('../src/prospeccion/campanas.js');
  const k = ca.crearCampana({ nombre: 'Frío' });
  ca.importarCSV(k.id, 'telefono,nombre,empresa,email\n600111006,Pablo,Pablo S.A.,pablo@x.es\n600111007,Rita,Rita S.L.,rita@x.es\n');
  db.darDeBaja(null, { email: 'rita@x.es' });
  const s = await (await get('exportar/sin-base-legal?campana=' + k.id)).text();
  assert.match(s, /Pablo;Pablo S\.A\.;;pablo@x\.es;'\+34600111006/);
  assert.doesNotMatch(s, /Rita/);
});

test('bajas: desde el panel llegan a HubSpot y una baja por correo bloquea también el teléfono (y al revés)', async () => {
  const c = db.guardarContacto({ telefono: '+34600111008', nombre: 'Ana', email: 'Ana@Correo.es' });
  hs.length = 0;
  let r = await post('bajas', { email: 'ana@correo.es', motivo: 'lo pidió por correo' });
  assert.equal(r.status, 200);
  assert.match((await r.json()).hubspot, /HubSpot/);
  assert.equal(db.estaDeBaja('+34600111008'), true, 'baja por correo bloquea las llamadas');
  const { llamar } = { llamar: (await import('../src/prospeccion/cumplimiento.js')).puedeLlamar };
  assert.equal(llamar({ ...c, base_legal: 'cliente' }, { datos: {} }, new Date('2026-11-02T10:00:00Z')).codigo, 'baja');
  assert.ok(hs.some((p) => p.ruta === '/crm/v3/objects/notes' && /Baja de comunicaciones comerciales/.test(p.cuerpo.properties.hs_note_body)), 'nota de baja en HubSpot');
  assert.ok(hs.some((p) => p.metodo === 'PATCH' && p.cuerpo?.properties?.fe_baja === 'true'));
  // Por teléfono: guarda también el correo del contacto
  const d = db.guardarContacto({ telefono: '+34600111009', nombre: 'Berta', email: 'berta@x.es' });
  assert.equal((await post('bajas', { telefono: '600 111 009' })).status, 200);
  assert.equal(db.estaDeBaja(null, 'BERTA@x.es'), true);
  // Otro contacto con el mismo correo y otro teléfono también queda bloqueado
  db.guardarContacto({ telefono: '+34600111010', email: 'berta@x.es' });
  assert.equal(db.estaDeBaja('+34600111010'), true);
  // Desde la ficha
  const e = db.guardarContacto({ telefono: '+34600111011', nombre: 'Carla' });
  assert.equal((await post(`contactos/${e.id}/baja`, {})).status, 200);
  assert.equal((await getJ('contactos/' + e.id)).deBaja, true);
  assert.equal((await post('bajas', {})).status, 400);
  assert.equal((await post('bajas', { email: 'no-es-correo' })).status, 400);
  assert.ok(d);
});

test('integraciones: qué está configurado y si responde; campañas avisan si la prospección está apagada', async () => {
  const { integraciones } = await getJ('integraciones');
  const x = Object.fromEntries(integraciones.map((i) => [i.clave, i]));
  assert.equal(x.hubspot.configurada, true); assert.equal(x.hubspot.responde, true);
  assert.equal(x.twilio.configurada, false); assert.equal(x.twilio.responde, null); assert.match(x.twilio.detalle, /TWILIO_ACCOUNT_SID/);
  assert.equal(x.correo.configurada, false); assert.equal(x.atalaya.configurada, true);
  assert.equal(x.prospeccion.configurada, false);
  C.prospeccion.activa = false;
  const k = (await import('../src/prospeccion/campanas.js')).crearCampana({ nombre: 'Apagada' });
  (await import('../src/prospeccion/cumplimiento.js')).importarRobinsonCSV('+34999999999\n');
  const r = await (await post(`campanas/${k.id}/reanudar`)).json();
  assert.equal(r.estado, 'activa'); assert.match(r.aviso, /PROSPECCION_ACTIVA=no/);
  assert.equal((await getJ('campanas')).prospeccionActiva, false);
});

test('panel.js: navegación por pestañas sin ocultar, tablas con rótulos para el móvil y sin innerHTML', async () => {
  const fs = await import('node:fs');
  const js = fs.readFileSync(new URL('../src/panel/publico/panel.js', import.meta.url), 'utf8');
  const css = fs.readFileSync(new URL('../src/panel/publico/panel.css', import.meta.url), 'utf8');
  assert.doesNotMatch(js, /innerHTML|outerHTML|insertAdjacentHTML|document\.write/);
  assert.match(js, /'data-rotulo'/);
  assert.match(css, /nav \{[^}]*flex-wrap: wrap/);
  assert.doesNotMatch(css, /opcional \{ display: none/);
});

test('invitar a Atalaya: el servidor lo rechaza para un contacto dado de baja', async () => {
  const c = db.guardarContacto({ telefono: '+34600111020', nombre: 'Baja Atalaya', email: 'baja@atalaya.es' });
  db.darDeBaja(c.telefono);
  const n = at.length;
  const r = await post(`contactos/${c.id}/invitar`);
  assert.equal(r.status, 409); assert.match((await r.json()).error, /baja/);
  assert.equal(at.length, n, 'no llega a Atalaya');
  assert.equal((await getJ('contactos/' + c.id)).deBaja, true);
});

test('bandeja: confirmar una sesión por confirmar con fecha y hora, y reintentar un envío fallido a Atalaya', async () => {
  const c = db.guardarContacto({ telefono: '+34600111021', nombre: 'Olga Ruiz', empresa: 'Ruiz S.L.', email: 'olga@ruiz.es' });
  const conv = db.abrirConversacion({ canal: 'voz', direccion: 'entrante', contactoId: c.id });
  db.cerrarConversacion(conv, { resultado: 'reunion_agendada', resumen: 'Pide sesión' });
  const ev = db.evento('reunion_pendiente', { inicio: '2026-12-10T10:00:00+01:00', cuando: 'jueves 10 de diciembre a las 10:00', contacto: c.id, conversacionId: conv, modalidad: 'videollamada', email: 'olga@ruiz.es', nombre: 'Olga Ruiz' });
  const p = (await getJ('acciones')).find((x) => x.id === ev);
  assert.equal(p.inicio, '2026-12-10T10:00:00+01:00'); assert.match(p.detalle, /HubSpot/);
  assert.equal((await post(`acciones/${ev}/confirmar`, { inicio: 'no' })).status, 400);
  const n = at.length; hs.length = 0;
  const r = await (await post(`acciones/${ev}/confirmar`, { inicio: '2026-12-11T16:30' })).json();
  assert.equal(r.ok, true); assert.equal(r.cuando, 'viernes 11 de diciembre a las 16:30'); assert.equal(r.atalaya, 'Enviada a Atalaya.');
  assert.ok(hs.some((x) => x.ruta === '/crm/v3/objects/meetings'), 'reunión en HubSpot');
  assert.equal(at.length, n + 1); assert.equal(at.at(-1).ruta, '/api/integracion/reunion'); assert.equal(at.at(-1).cuerpo.inicio, '2026-12-11T15:30:00.000Z');
  assert.ok(!(await getJ('acciones')).some((x) => x.id === ev), 'ya no está en la bandeja');
  // Fallo de envío a Atalaya: aparece en la bandeja y se reintenta desde el panel
  const f = db.evento('atalaya_reunion_fallo', { cuerpo: { id: 'ev-z', inicio: '2026-12-14T09:00:00.000Z', fin: '2026-12-14T10:00:00.000Z', titulo: 'Sesión estratégica · Z', origen: 'asistente' }, motivo: 'Atalaya no responde (fetch failed)', intentos: 3, contacto: c.id });
  const x = (await getJ('acciones')).find((y) => y.id === f);
  assert.equal(x.titulo, 'Sesión no enviada a Atalaya'); assert.match(x.detalle, /14\/12\/26, 10:00 \(3 intentos\): Atalaya no responde/); assert.equal(x.contacto.id, c.id);
  assert.equal((await (await post(`acciones/${f}/reintentar`)).json()).ok, true);
  assert.equal(at.at(-1).cuerpo.id, 'ev-z');
  assert.ok(!(await getJ('acciones')).some((y) => y.id === f));
});

test('panel: textos legibles de campañas e integraciones, plurales y aviso de la lista Robinson', async () => {
  const est = await import('../src/integraciones/estado.js');
  assert.equal(est.textoFalta('HUBSPOT_TOKEN'), 'Falta HUBSPOT_TOKEN');
  assert.equal(est.textoFalta('las variables de Twilio, Deepgram, ElevenLabs y URL_PUBLICA'), 'Faltan las variables de Twilio, Deepgram, ElevenLabs y URL_PUBLICA');
  assert.equal(est.textoFalta('TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN y TWILIO_NUMERO'), 'Faltan TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN y TWILIO_NUMERO');
  assert.equal(est.textoFalta('ATALAYA_URL e INTEGRACION_TOKEN'), 'Faltan ATALAYA_URL e INTEGRACION_TOKEN');
  const { integraciones } = await getJ('integraciones?comprobar=0');
  assert.ok(!integraciones.some((i) => /^Falta (las|los) |^Falta [A-Z_]+(,| y | e )/.test(i.detalle || '')), 'sin «Falta las variables»');
  // Campaña: quien está de baja y seguía «Pendiente» sale «Excluido (baja)»; el motivo «baja» se lee «Dado de baja»
  const ca = await import('../src/prospeccion/campanas.js');
  const k = ca.crearCampana({ nombre: 'Textos' });
  ca.importarCSV(k.id, 'telefono,nombre,base_legal\n600111030,Pendiente de baja,cliente\n600111031,Excluida,cliente\n');
  db.darDeBaja('+34600111030');
  db.abrir().prepare(`UPDATE campana_contactos SET estado = 'excluido', motivo = 'baja' WHERE campana_id = ? AND contacto_id = ?`).run(k.id, db.contactoPorTelefono('600111031').id);
  const r = await getJ('campanas/' + k.id);
  const porTel = Object.fromEntries(r.contactos.map((x) => [x.telefono, x]));
  assert.equal(porTel['+34600111030'].estado_visible, 'excluido_baja'); assert.equal(porTel['+34600111030'].motivo_visible, 'Dado de baja');
  assert.equal(porTel['+34600111031'].motivo_visible, 'Dado de baja');
  assert.equal((await getJ('textos')).estadoContacto.excluido_baja, 'Excluido (baja)');
  const f = await getJ('contactos/' + db.contactoPorTelefono('600111030').id);
  assert.match(f.cronologia.find((x) => x.tipo === 'campana').titulo, /Excluido \(baja\)/);
  // Una conversación con un mensaje: «1 mensaje»
  const v = db.abrirConversacion({ canal: 'whatsapp', direccion: 'entrante', contactoId: db.contactoPorTelefono('600111030').id });
  db.anotar(v, 'usuario', 'Hola');
  assert.match((await getJ('contactos/' + db.contactoPorTelefono('600111030').id)).cronologia.find((x) => x.tipo === 'conversacion').detalle, /(^|· )1 mensaje($| ·)/);
  // Resumen y campañas llevan el estado de la lista Robinson para el aviso
  const res = await getJ('resumen');
  assert.equal(typeof res.robinsonEstado.vigente, 'boolean'); assert.equal(res.robinsonEstado.maxDias, 30);
  assert.ok('robinson' in (await getJ('campanas')));
});

test('panel.js: pintado sin carreras, fechas dd/mm/aaaa y sin «null»', async () => {
  const fs = await import('node:fs');
  const js = fs.readFileSync(new URL('../src/panel/publico/panel.js', import.meta.url), 'utf8');
  assert.match(js, /pintado/, 'contador de pintado');
  assert.match(js, /dd\/mm\/aaaa/);
  assert.doesNotMatch(js, /type: 'date'/);
  assert.doesNotMatch(js, /\bc\.append\(/, 'append nativo pinta «null»: se usa meter()');
  const r = await fetch(base + '/panel', { headers: { cookie } });
  assert.match(await r.text(), /<html lang="es-ES">/);
});
