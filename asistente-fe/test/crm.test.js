// CRM (HubSpot): búsqueda por teléfono con variantes, contactos, llamadas, notas, tareas, negocios, bajas y reintentos 429,
// contra un servidor falso local de la API v3 de HubSpot.
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

const peticiones = [];
let fallar429 = 0; // cuántas respuestas 429 dar antes de atender
let nObj = 0;
const fake = http.createServer((req, res) => {
  let cuerpo = '';
  req.on('data', (c) => (cuerpo += c));
  req.on('end', () => {
    const p = { metodo: req.method, ruta: req.url, auth: req.headers.authorization, cuerpo: cuerpo ? JSON.parse(cuerpo) : null };
    peticiones.push(p);
    const json = (o, st = 200, h = {}) => { res.writeHead(st, { 'Content-Type': 'application/json', ...h }); res.end(JSON.stringify(o)); };
    if (p.auth !== 'Bearer hs-prueba') return json({ message: 'no autorizado' }, 401);
    if (fallar429 > 0) { fallar429--; return json({ message: 'Too many requests' }, 429, { 'Retry-After': '1' }); }
    const u = new URL(req.url, 'http://x');
    if (req.method === 'GET' && u.pathname === '/crm/v3/properties/contacts') {
      return json({ results: ['firstname', 'phone', 'fe_base_legal', 'fe_dolor', 'fe_origen', 'fe_asistente_resultado', 'fe_baja'].map((name) => ({ name })) });
    }
    if (req.method === 'POST' && u.pathname === '/crm/v3/objects/contacts/search') {
      const valores = p.cuerpo.filterGroups.flatMap((g) => g.filters.flatMap((f) => f.values || [f.value]));
      if (valores.includes('600111222')) return json({ total: 1, results: [{ id: '501', properties: { firstname: 'Carmen', phone: '600 111 222' } }] });
      return json({ total: 0, results: [] });
    }
    if (req.method === 'POST' && u.pathname === '/crm/v3/objects/companies/search') return json({ total: 0, results: [] });
    if (req.method === 'GET' && /^\/crm\/v3\/objects\/contacts\/\d+$/.test(u.pathname)) {
      return json({ id: '501', properties: { firstname: 'Carmen', company: 'Conservas Ruiz' }, associations: { deals: { results: [{ id: '900' }] } } });
    }
    if (req.method === 'GET' && u.pathname === '/crm/v3/objects/deals/900') return json({ id: '900', properties: { dealname: 'Conservas Ruiz · diagnóstico', dealstage: 'appointmentscheduled' } });
    if (req.method === 'POST' && /^\/crm\/v3\/objects\/\w+$/.test(u.pathname)) return json({ id: `${u.pathname.split('/').pop()}-${++nObj}` }, 201);
    if (req.method === 'PATCH' || req.method === 'PUT') return json({ id: 'ok' });
    json({ message: 'no encontrado' }, 404);
  });
});

let db, hubspot, herramientas;
const de = (metodo, ruta) => peticiones.filter((p) => p.metodo === metodo && (typeof ruta === 'string' ? p.ruta.split('?')[0] === ruta : ruta.test(p.ruta)));

before(async () => {
  await new Promise((ok) => fake.listen(0, '127.0.0.1', ok));
  db = await import('../src/almacen/db.js');
  db.abrir(':memory:');
  hubspot = await import('../src/crm/hubspot.js');
  herramientas = await import('../src/cerebro/herramientas.js');
  hubspot.configurarHubspot({ base: `http://127.0.0.1:${fake.address().port}`, token: 'hs-prueba', propietarioId: '77', pipeline: 'default', etapa: 'appointmentscheduled', esperaMaxMs: 20 });
});
after(() => { fake.close(); db.cerrar(); });
beforeEach(() => { peticiones.length = 0; fallar429 = 0; });

test('variantes de teléfono (E.164, sin +, 0034, nacional, con espacios)', () => {
  const v = hubspot.variantesTelefono('600 111 222');
  for (const x of ['+34600111222', '34600111222', '0034600111222', '600111222', '+34 600 111 222', '600 11 12 22']) assert.ok(v.includes(x), x);
  assert.deepEqual(hubspot.variantesTelefono(''), []);
});

test('búsqueda por teléfono en phone y mobilephone con variantes, y por email', async () => {
  const c = await hubspot.buscarContacto({ telefono: '+34600111222', email: 'Carmen@Ejemplo.es' });
  assert.equal(c.id, '501');
  const b = de('POST', '/crm/v3/objects/contacts/search')[0].cuerpo;
  assert.deepEqual(b.filterGroups.map((g) => g.filters[0].propertyName), ['phone', 'mobilephone', 'email']);
  assert.equal(b.filterGroups[0].filters[0].operator, 'IN');
  assert.ok(b.filterGroups[1].filters[0].values.includes('600111222'));
  assert.equal(b.filterGroups[2].filters[0].value, 'carmen@ejemplo.es');
  assert.equal(await hubspot.buscarContacto({ telefono: '+34699999999' }), null);
});

test('reintento ante 429 respetando Retry-After', async () => {
  fallar429 = 2;
  const id = await hubspot.crearNota({ contactoId: '501', texto: 'Prueba' });
  assert.match(id, /^notes-/);
  assert.equal(de('POST', '/crm/v3/objects/notes').length, 3);
});

test('actualizar_contacto: crea la ficha con propiedades fe_ y la empresa asociada', async () => {
  const c = db.guardarContacto({ telefono: '+34655000111', origen: 'whatsapp' });
  const r = await herramientas.ejecutar('actualizar_contacto', { nombre: 'Javier Gómez Ruiz', empresa: 'Maderas Gómez', cargo: 'Gerente', dolor: 'No sabe si gana dinero con cada obra', empleados: 40 }, { canal: 'whatsapp', contacto: c });
  assert.equal(r.error, undefined, r.contenido);
  assert.match(r.contenido, /Guardado en la ficha/);
  const alta = de('POST', '/crm/v3/objects/contacts')[0].cuerpo.properties;
  assert.equal(alta.firstname, 'Javier');
  assert.equal(alta.lastname, 'Gómez Ruiz');
  assert.equal(alta.phone, '+34655000111');
  assert.equal(alta.fe_dolor, 'No sabe si gana dinero con cada obra');
  assert.equal(alta.fe_origen, 'whatsapp');
  assert.equal(alta.hubspot_owner_id, '77');
  assert.equal(de('POST', '/crm/v3/objects/companies')[0].cuerpo.properties.name, 'Maderas Gómez');
  assert.equal(de('PUT', /\/crm\/v4\/objects\/contact\/contacts-\d+\/associations\/default\/company\//).length, 1);
  const local = db.contactoPorTelefono('+34655000111');
  assert.equal(local.cargo, 'Gerente');
  assert.match(local.hubspot_id, /^contacts-/);
  assert.match(local.notas, /Preocupación: No sabe si gana dinero/);
  assert.equal(de('POST', '/crm/v3/objects/notes').length, 1);
});

test('ficha_contacto: datos locales, HubSpot y negocios', async () => {
  const c = db.guardarContacto({ telefono: '+34600111222', nombre: 'Carmen', base_legal: 'consentimiento', base_legal_detalle: 'ponencia FREMM' });
  const r = JSON.parse((await herramientas.ejecutar('ficha_contacto', {}, { canal: 'voz', contacto: c })).contenido);
  assert.equal(r.local.nombre, 'Carmen');
  assert.equal(r.consentimiento, 'consentimiento (ponencia FREMM)');
  assert.equal(r.hubspot.company, 'Conservas Ruiz');
  assert.equal(r.negocios_abiertos[0].nombre, 'Conservas Ruiz · diagnóstico');
  assert.equal(db.contactoPorTelefono('+34600111222').hubspot_id, '501');
});

test('registrar_nota: nota, tarea con propietario y vencimiento, oportunidad como negocio', async () => {
  const c = db.contactoPorTelefono('+34600111222');
  const conv = db.abrirConversacion({ canal: 'voz', direccion: 'entrante', contactoId: c.id });
  const ctx = { canal: 'voz', contacto: c, conversacionId: conv };
  await herramientas.ejecutar('registrar_nota', { texto: 'Prefiere que le llamen por la tarde' }, ctx);
  await herramientas.ejecutar('registrar_nota', { texto: 'Enviar caso de relevo', tipo: 'tarea', fecha: '2026-11-10T09:00:00+01:00' }, ctx);
  await herramientas.ejecutar('registrar_nota', { texto: 'Quiere ordenar la estructura', tipo: 'oportunidad' }, ctx);
  const tarea = de('POST', '/crm/v3/objects/tasks')[0].cuerpo;
  assert.equal(tarea.properties.hubspot_owner_id, '77');
  assert.equal(tarea.properties.hs_timestamp, '2026-11-10T08:00:00.000Z');
  assert.equal(tarea.properties.hs_task_status, 'NOT_STARTED');
  assert.deepEqual(tarea.associations[0], { to: { id: '501' }, types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 204 }] });
  const negocio = de('POST', '/crm/v3/objects/deals')[0].cuerpo.properties;
  assert.equal(negocio.pipeline, 'default');
  assert.equal(negocio.dealstage, 'appointmentscheduled');
  assert.equal(de('POST', '/crm/v3/objects/notes').length, 2);
  assert.equal(db.mensajes(conv).filter((m) => m.rol === 'nota').length, 3);
});

test('finalizar en llamada: cierra en la base y registra la llamada con transcripción, negocio y sin duplicar', async () => {
  const c = db.contactoPorTelefono('+34600111222');
  const conv = db.abrirConversacion({ canal: 'voz', direccion: 'saliente', contactoId: c.id });
  db.anotar(conv, 'asistente', 'Buenos días, soy Lucía, el asistente de inteligencia artificial de Familias Empresarias.');
  db.anotar(conv, 'usuario', 'Hola, dígame.');
  const ctx = { canal: 'voz', direccion: 'saliente', contacto: c, conversacionId: conv };
  await herramientas.ejecutar('registrar_nota', { texto: 'Interés en relevo', tipo: 'oportunidad' }, ctx);
  const r = await herramientas.ejecutar('finalizar', { resultado: 'reunion_agendada', resumen: 'Carmen, gerente de Conservas Ruiz. Reunión el martes.' }, ctx);
  assert.match(r.contenido, /registrada en el CRM/);
  const fila = db.abrir().prepare('SELECT * FROM conversaciones WHERE id = ?').get(conv);
  assert.equal(fila.estado, 'cerrada');
  assert.equal(fila.resultado, 'reunion_agendada');
  const llamada = de('POST', '/crm/v3/objects/calls')[0].cuerpo;
  assert.equal(llamada.properties.hs_call_direction, 'OUTBOUND');
  assert.equal(llamada.properties.hs_call_status, 'COMPLETED');
  assert.match(llamada.properties.hs_call_body, /Conservas Ruiz/);
  assert.match(llamada.properties.hs_call_body, /Interlocutor: Hola, dígame\./);
  assert.equal(llamada.associations[0].types[0].associationTypeId, 194);
  assert.equal(de('POST', '/crm/v3/objects/deals').length, 1, 'un solo negocio por conversación');
  assert.equal(de('PATCH', '/crm/v3/objects/contacts/501').at(-1).cuerpo.properties.fe_asistente_resultado, 'reunion_agendada');
  // El fin de llamada de la voz no la duplica
  peticiones.length = 0;
  await hubspot.alTerminarLlamada(conv, { duracion: 95 });
  assert.equal(de('POST', '/crm/v3/objects/calls').length, 0);
});

test('fin de llamada sin finalizar: sube la llamada con duración y transcripción', async () => {
  const c = db.contactoPorTelefono('+34600111222');
  const conv = db.abrirConversacion({ canal: 'voz', direccion: 'entrante', contactoId: c.id });
  db.anotar(conv, 'usuario', 'Llamaba por lo de la ponencia');
  await hubspot.alTerminarLlamada(conv, { contacto: c, direccion: 'entrante', resultado: 'colgada', duracion: 42, transcripcion: [{ rol: 'usuario', texto: 'Llamaba por lo de la ponencia' }] });
  const ll = de('POST', '/crm/v3/objects/calls')[0].cuerpo.properties;
  assert.equal(ll.hs_call_direction, 'INBOUND');
  assert.equal(ll.hs_call_duration, '42000');
  assert.match(ll.hs_call_body, /Interlocutor: Llamaba por lo de la ponencia/);
});

test('dar_de_baja: base local, fe_baja en HubSpot y nota', async () => {
  const c = db.contactoPorTelefono('+34600111222');
  const r = await herramientas.ejecutar('dar_de_baja', { motivo: 'No quiere más llamadas' }, { canal: 'voz', contacto: c });
  assert.match(r.contenido, /Baja registrada/);
  assert.equal(db.estaDeBaja('+34600111222'), true);
  assert.equal(de('PATCH', '/crm/v3/objects/contacts/501')[0].cuerpo.properties.fe_baja, 'true');
  assert.match(de('POST', '/crm/v3/objects/notes')[0].cuerpo.properties.hs_note_body, /Baja de comunicaciones comerciales/);
});

test('mensajes de WhatsApp como comunicación WHATS_APP', async () => {
  await hubspot.registrarWhatsApp({ contactoId: '501', texto: 'Carmen: hola\nLucía: buenos días' });
  const p = de('POST', '/crm/v3/objects/communications')[0].cuerpo;
  assert.equal(p.properties.hs_communication_channel_type, 'WHATS_APP');
  assert.equal(p.associations[0].types[0].associationTypeId, 81);
});

test('sin HUBSPOT_TOKEN: todo funciona con la base local y lo indica', async () => {
  hubspot.configurarHubspot({ token: '' });
  try {
    const c = db.guardarContacto({ telefono: '+34644000222' });
    const conv = db.abrirConversacion({ canal: 'whatsapp', direccion: 'entrante', contactoId: c.id });
    const ctx = { canal: 'whatsapp', contacto: c, conversacionId: conv };
    let r = await herramientas.ejecutar('actualizar_contacto', { nombre: 'Elena', empresa: 'Hornos Elena' }, ctx);
    assert.match(r.contenido, /HubSpot no está configurado/);
    assert.equal(db.contactoPorTelefono('+34644000222').empresa, 'Hornos Elena');
    r = await herramientas.ejecutar('registrar_nota', { texto: 'Llamar el lunes', tipo: 'tarea' }, ctx);
    assert.match(r.contenido, /HubSpot no está configurado/);
    r = JSON.parse((await herramientas.ejecutar('ficha_contacto', {}, ctx)).contenido);
    assert.equal(r.local.nombre, 'Elena');
    r = await herramientas.ejecutar('finalizar', { resultado: 'interesado', resumen: 'Elena, panadería.' }, ctx);
    assert.match(r.contenido, /cerrada/);
    assert.equal(peticiones.length, 0);
  } finally { hubspot.configurarHubspot({ token: 'hs-prueba' }); }
});

test('empresa: el id de la empresa en HubSpot queda en la ficha local (lo usa Atalaya)', async () => {
  const c = db.guardarContacto({ telefono: '+34655000333' });
  await herramientas.ejecutar('actualizar_contacto', { nombre: 'Lola', empresa: 'Aceitunas Lola' }, { canal: 'voz', contacto: c });
  const id = de('POST', '/crm/v3/objects/companies')[0];
  assert.ok(id);
  assert.match(db.contactoPorTelefono('+34655000333').hubspot_company_id, /^companies-\d+$/);
});

test('registrar_nota urgente: tarea de prioridad alta, evento y aviso', async () => {
  const c = db.contactoPorTelefono('+34600111222');
  const conv = db.abrirConversacion({ canal: 'whatsapp', direccion: 'entrante', contactoId: c.id });
  const r = await herramientas.ejecutar('registrar_nota', { texto: 'Se le ha parado la nómina y necesita hablar hoy', urgente: true }, { canal: 'whatsapp', contacto: c, conversacionId: conv });
  assert.match(r.contenido, /equipo está avisado/);
  const t = de('POST', '/crm/v3/objects/tasks')[0].cuerpo.properties;
  assert.equal(t.hs_task_priority, 'HIGH'); assert.match(t.hs_task_subject, /^URGENTE · Carmen/);
  assert.ok(db.abrir().prepare(`SELECT 1 FROM eventos WHERE tipo = 'urgencia' AND json_extract(datos, '$.conversacionId') = ?`).get(conv));
});

test('finalizar «volver a llamar» con hora pedida y campaña de origen: la tarea vence a esa hora y la llamada nombra la campaña', async () => {
  const c = db.contactoPorTelefono('+34600111222');
  const conv = db.abrirConversacion({ canal: 'voz', direccion: 'saliente', contactoId: c.id });
  const pedida = new Date(Date.now() + 2 * 86400e3); pedida.setUTCSeconds(0, 0);
  await herramientas.ejecutar('finalizar', { resultado: 'volver_a_llamar', resumen: 'Mejor pasado mañana.', volver_a_llamar: pedida.toISOString() }, { canal: 'voz', direccion: 'saliente', contacto: c, conversacionId: conv, campana: { id: 3, nombre: 'Relevo 2026' } });
  assert.equal(db.conversacionPorId(conv).volver_llamar, pedida.toISOString().slice(0, 19).replace('T', ' '));
  const t = de('POST', '/crm/v3/objects/tasks')[0].cuerpo.properties;
  assert.equal(t.hs_timestamp, pedida.toISOString()); assert.match(t.hs_task_subject, /Volver a llamar: Carmen \(.+hora pedida\)/);
  const ll = de('POST', '/crm/v3/objects/calls')[0].cuerpo.properties;
  assert.match(ll.hs_call_title, /campaña «Relevo 2026»/); assert.match(ll.hs_call_body, /Campaña de origen: Relevo 2026/);
  // Una fecha pasada no se guarda
  const conv2 = db.abrirConversacion({ canal: 'voz', direccion: 'saliente', contactoId: c.id });
  await herramientas.ejecutar('finalizar', { resultado: 'volver_a_llamar', resumen: 'x', volver_a_llamar: '2020-01-01T10:00:00Z' }, { canal: 'voz', contacto: c, conversacionId: conv2 });
  assert.equal(db.conversacionPorId(conv2).volver_llamar, null);
});

test('cuenta de HubSpot para los enlaces del panel', async () => {
  assert.equal(hubspot.enlaceContactoHubspot('42', { portalId: '99', uiDomain: 'app-eu1.hubspot.com' }), 'https://app-eu1.hubspot.com/contacts/99/record/0-1/42');
  assert.equal(hubspot.enlaceContactoHubspot('42', null), null);
});
