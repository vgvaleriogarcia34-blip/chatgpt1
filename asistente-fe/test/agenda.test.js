// Agenda (Google Calendar): huecos con horario, festivos, antelación y ocupados; reserva con Meet y registro en HubSpot.
// googleapis se sustituye por un cliente simulado inyectado; HubSpot, por un servidor falso local.
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

const hsPeticiones = [];
let nObj = 0;
const fakeHs = http.createServer((req, res) => {
  let cuerpo = '';
  req.on('data', (c) => (cuerpo += c));
  req.on('end', () => {
    hsPeticiones.push({ metodo: req.method, ruta: req.url.split('?')[0], cuerpo: cuerpo ? JSON.parse(cuerpo) : null });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    if (req.url.startsWith('/crm/v3/properties')) return res.end(JSON.stringify({ results: [] }));
    if (req.url.endsWith('/search')) return res.end(JSON.stringify({ results: [] }));
    res.end(JSON.stringify({ id: `hs-${++nObj}` }));
  });
});

// Cliente de Calendar simulado (forma de googleapis calendar v3)
const cal = {
  ocupados: [],
  consultas: [],
  inserciones: [],
  fallo: null, // función (params) => error a lanzar, o null
  freebusy: { query: async ({ requestBody }) => { cal.consultas.push(requestBody); return { data: { calendars: { primary: { busy: cal.ocupados } } } }; } },
  events: {
    insert: async (p) => {
      cal.inserciones.push(structuredClone(p));
      const e = cal.fallo?.(p);
      if (e) throw e;
      return { data: { id: 'ev1', hangoutLink: p.requestBody.conferenceData ? 'https://meet.google.com/abc-defg-hij' : undefined } };
    },
  },
};

// Lunes 2 de noviembre de 2026, 9:00 en Madrid
const AHORA = new Date('2026-11-02T08:00:00Z');
let db, agenda, herramientas, hubspot;
before(async () => {
  await new Promise((ok) => fakeHs.listen(0, '127.0.0.1', ok));
  db = await import('../src/almacen/db.js');
  db.abrir(':memory:');
  hubspot = await import('../src/crm/hubspot.js');
  hubspot.configurarHubspot({ base: `http://127.0.0.1:${fakeHs.address().port}`, token: 'hs-prueba', propietarioId: '77', esperaMaxMs: 10 });
  agenda = await import('../src/agenda/google-calendar.js');
  herramientas = await import('../src/cerebro/herramientas.js');
});
after(() => { fakeHs.close(); db.cerrar(); });
beforeEach(() => {
  agenda.configurarAgenda({ calendario: null, credenciales: '', ahora: () => AHORA, calendarId: 'primary', horario: 'L-V 09:30-14:00,16:00-19:00', duracionMin: 30, antelacionHoras: 24, festivos: ['2026-11-04'], zona: 'Europe/Madrid' });
  Object.assign(cal, { ocupados: [], consultas: [], inserciones: [], fallo: null });
  hsPeticiones.length = 0;
});

const madrid = (iso) => new Intl.DateTimeFormat('es-ES', { timeZone: 'Europe/Madrid', weekday: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(iso));
const horaMadrid = (d) => { const [h, m] = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Madrid', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(d).split(':').map(Number); return h * 60 + m; };

test('fechas: texto en español, ISO con desfase (invierno y verano) y horario', () => {
  assert.equal(agenda.textoFecha(new Date('2026-11-03T09:30:00Z')), 'martes 3 de noviembre a las 10:30');
  assert.equal(agenda.isoLocal(new Date('2026-11-03T09:30:00Z')), '2026-11-03T10:30:00+01:00');
  assert.equal(agenda.isoLocal(new Date('2026-07-01T08:00:00Z')), '2026-07-01T10:00:00+02:00');
  assert.equal(agenda.localAFecha(2026, 3, 30, 10, 0).toISOString(), '2026-03-30T08:00:00.000Z'); // tras el cambio de hora
  const h = agenda.parsearHorario('L-J 09:00-14:00; V 09:00-13:00');
  assert.deepEqual([...h[0].dias], [1, 2, 3, 4]);
  assert.deepEqual(h[1].tramos, [{ desde: 540, hasta: 780 }]);
});

test('huecos: respetan horario, antelación, fines de semana y festivos', () => {
  const todos = agenda.calcularHuecos({ dias: 7 });
  assert.ok(todos.length > 20);
  for (const h of todos) {
    assert.ok(h.ini >= new Date(AHORA.getTime() + 24 * 3600e3), 'antelación mínima');
    const a = horaMadrid(h.ini), b = horaMadrid(h.fin);
    assert.ok((a >= 570 && b <= 840) || (a >= 960 && b <= 1140), `fuera de horario: ${madrid(h.ini)}`);
    const dia = madrid(h.ini);
    assert.ok(!/sábado|domingo/.test(dia), dia);
    assert.ok(!/^miércoles, 4/.test(dia), 'el 4 es festivo');
  }
  assert.equal(agenda.isoLocal(todos[0].ini), '2026-11-03T09:30:00+01:00');
});

test('huecos: no se solapan con lo ocupado', () => {
  const ocupados = [{ ini: new Date('2026-11-03T08:30:00Z'), fin: new Date('2026-11-03T10:00:00Z') }]; // martes 9:30-11:00
  const todos = agenda.calcularHuecos({ dias: 2, ocupados });
  assert.ok(todos.every((h) => !(h.ini < ocupados[0].fin && h.fin > ocupados[0].ini)));
  assert.equal(agenda.isoLocal(todos[0].ini), '2026-11-03T11:00:00+01:00');
});

test('consultar_huecos sin credenciales: 6-8 huecos legibles y aviso de confirmación por una persona', async () => {
  const r = JSON.parse((await herramientas.ejecutar('consultar_huecos', {}, { canal: 'voz' })).contenido);
  assert.ok(r.huecos.length >= 6 && r.huecos.length <= 8, String(r.huecos.length));
  assert.match(r.aviso, /confirmará una persona/);
  for (const h of r.huecos) {
    assert.match(h.texto, /^(lunes|martes|miércoles|jueves|viernes) \d{1,2} de noviembre a las \d{1,2}:\d{2}$/);
    assert.match(h.inicio, /^2026-11-\d{2}T\d{2}:\d{2}:00\+01:00$/);
  }
  assert.ok(new Set(r.huecos.map((h) => h.inicio.slice(0, 10))).size >= 3, 'repartidos en varios días');
});

test('consultar_huecos con la agenda: consulta freebusy y excluye lo ocupado', async () => {
  agenda.configurarAgenda({ calendario: cal });
  cal.ocupados = [{ start: '2026-11-03T08:00:00Z', end: '2026-11-03T13:00:00Z' }]; // martes por la mañana entero
  const r = JSON.parse((await herramientas.ejecutar('consultar_huecos', { desde: '2026-11-03', dias: 3 }, { canal: 'voz' })).contenido);
  assert.equal(cal.consultas.length, 1);
  assert.equal(cal.consultas[0].items[0].id, 'primary');
  assert.equal(r.aviso, undefined);
  assert.ok(!r.huecos.some((h) => /^2026-11-03T(09|10|11|12|13):/.test(h.inicio)));
});

test('agendar_reunion con videollamada: comprueba el hueco, crea el evento con Meet e invitado, y lo registra en HubSpot', async () => {
  agenda.configurarAgenda({ calendario: cal });
  const c = db.guardarContacto({ telefono: '+34600123123', nombre: 'Pilar', empresa: 'Aceites Pilar', notas: 'Preocupación: el margen' });
  const conv = db.abrirConversacion({ canal: 'voz', direccion: 'entrante', contactoId: c.id });
  const r = JSON.parse((await herramientas.ejecutar('agendar_reunion', { inicio: '2026-11-05T10:30:00+01:00', nombre: 'Pilar Sanz', email: 'Pilar@Aceites.es', motivo: 'Margen por producto', modalidad: 'videollamada' }, { canal: 'voz', contacto: c, conversacionId: conv })).contenido);
  assert.equal(r.reservado, true, JSON.stringify(r));
  assert.equal(r.cuando, 'jueves 5 de noviembre a las 10:30');
  assert.equal(r.enlace, 'https://meet.google.com/abc-defg-hij');
  assert.match(r.invitacion, /enviada a pilar@aceites.es/);
  assert.equal(cal.consultas.length, 1, 'vuelve a comprobar el hueco');
  const p = cal.inserciones[0];
  assert.equal(p.sendUpdates, 'all');
  assert.equal(p.conferenceDataVersion, 1);
  assert.equal(p.requestBody.conferenceData.createRequest.conferenceSolutionKey.type, 'hangoutsMeet');
  assert.ok(p.requestBody.conferenceData.createRequest.requestId);
  assert.deepEqual(p.requestBody.attendees, [{ email: 'pilar@aceites.es', displayName: 'Pilar Sanz' }]);
  assert.equal(p.requestBody.start.dateTime, '2026-11-05T10:30:00+01:00');
  assert.equal(p.requestBody.end.dateTime, '2026-11-05T11:00:00+01:00');
  assert.match(p.requestBody.description, /Margen por producto/);
  assert.match(p.requestBody.description, /el margen/);
  const reunion = hsPeticiones.find((x) => x.ruta === '/crm/v3/objects/meetings');
  assert.equal(reunion.cuerpo.properties.hs_meeting_start_time, '2026-11-05T09:30:00.000Z');
  assert.equal(reunion.cuerpo.properties.hs_meeting_location, 'https://meet.google.com/abc-defg-hij');
  assert.ok(hsPeticiones.some((x) => x.ruta === '/crm/v3/objects/deals'));
  assert.equal(db.contactoPorTelefono('+34600123123').email, 'pilar@aceites.es');
  assert.ok(db.mensajes(conv).some((m) => m.rol === 'reunion'));
});

test('agendar_reunion: si el hueco se ha ocupado, no reserva y ofrece alternativas', async () => {
  agenda.configurarAgenda({ calendario: cal });
  cal.ocupados = [{ start: '2026-11-05T09:00:00Z', end: '2026-11-05T10:00:00Z' }];
  const r = JSON.parse((await herramientas.ejecutar('agendar_reunion', { inicio: '2026-11-05T10:30:00+01:00', nombre: 'Pilar', motivo: 'x' }, { canal: 'voz' })).contenido);
  assert.equal(r.reservado, false);
  assert.match(r.motivo, /ocuparse/);
  assert.ok(r.alternativas.length > 0);
  assert.equal(cal.inserciones.length, 0);
});

test('agendar_reunion: fuera de horario o en festivo se rechaza', async () => {
  agenda.configurarAgenda({ calendario: cal });
  for (const inicio of ['2026-11-05T14:00:00+01:00', '2026-11-04T10:00:00+01:00', '2026-11-07T10:00:00+01:00', '2026-11-02T12:00:00+01:00']) {
    const r = JSON.parse((await herramientas.ejecutar('agendar_reunion', { inicio, nombre: 'X', motivo: 'x' }, { canal: 'voz' })).contenido);
    assert.equal(r.reservado, false, inicio);
  }
  assert.equal(cal.inserciones.length, 0);
});

test('agendar_reunion: sin delegación no puede invitar y reintenta sin invitado (tarea para el equipo)', async () => {
  agenda.configurarAgenda({ calendario: cal });
  cal.fallo = (p) => (p.requestBody.attendees?.length ? Object.assign(new Error('Service accounts cannot invite attendees without Domain-Wide Delegation of Authority.'), { code: 403 }) : null);
  const c = db.guardarContacto({ telefono: '+34600123124', nombre: 'Tomás' });
  const r = JSON.parse((await herramientas.ejecutar('agendar_reunion', { inicio: '2026-11-06T17:00:00+01:00', nombre: 'Tomás', email: 'tomas@ejemplo.es', motivo: 'Relevo', modalidad: 'telefono' }, { canal: 'whatsapp', contacto: c })).contenido);
  assert.equal(r.reservado, true);
  assert.match(r.invitacion, /el equipo la enviará/);
  assert.equal(cal.inserciones.length, 2);
  assert.equal(cal.inserciones[1].sendUpdates, 'none');
  assert.equal(cal.inserciones[1].requestBody.location, 'Llamada al +34600123124');
  assert.ok(hsPeticiones.some((x) => x.ruta === '/crm/v3/objects/tasks' && /Enviar invitación/.test(x.cuerpo.properties.hs_task_subject)));
});

test('agendar_reunion sin credenciales: queda como petición y tarea en el CRM', async () => {
  const c = db.guardarContacto({ telefono: '+34600123125', nombre: 'Inés' });
  const r = JSON.parse((await herramientas.ejecutar('agendar_reunion', { inicio: '2026-11-05T16:30:00+01:00', nombre: 'Inés', email: 'ines@ejemplo.es', motivo: 'Caja' }, { canal: 'voz', contacto: c })).contenido);
  assert.equal(r.reservado, false);
  assert.equal(r.pendiente_de_confirmar, true);
  assert.match(r.indicacion, /una persona del equipo/);
  const t = hsPeticiones.find((x) => x.ruta === '/crm/v3/objects/tasks');
  assert.match(t.cuerpo.properties.hs_task_subject, /Confirmar reunión con Inés: jueves 5 de noviembre a las 16:30/);
  assert.equal(t.cuerpo.properties.hs_task_priority, 'HIGH');
});

test('sesión estratégica: mismo nombre en Calendar y HubSpot, y la sesión llega a la mesa de Atalaya con el contrato común', async () => {
  const at = [];
  const fakeAt = http.createServer((req, res) => {
    let b = ''; req.on('data', (c) => (b += c)); req.on('end', () => {
      at.push({ ruta: req.url, auth: req.headers.authorization, cuerpo: JSON.parse(b) });
      res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ ok: true, empresa: 'emp-1' }));
    });
  });
  await new Promise((ok) => fakeAt.listen(0, '127.0.0.1', ok));
  const atalaya = await import('../src/integraciones/atalaya.js');
  try {
    atalaya.configurarAtalaya({ url: `http://127.0.0.1:${fakeAt.address().port}/`, token: 'tok-integracion' });
    agenda.configurarAgenda({ calendario: cal, duracionMin: 60 });
    const c = db.guardarContacto({ telefono: '+34600123199', nombre: 'Rosa Gil', empresa: 'Muebles Gil', email: 'rosa@gil.es' });
    const conv = db.abrirConversacion({ canal: 'whatsapp', direccion: 'entrante', contactoId: c.id });
    const r = JSON.parse((await herramientas.ejecutar('agendar_reunion', { inicio: '2026-11-05T10:00:00+01:00', nombre: 'Rosa Gil', email: 'rosa@gil.es', motivo: 'Relevo', modalidad: 'videollamada' }, { canal: 'whatsapp', contacto: c, conversacionId: conv })).contenido);
    assert.equal(r.reservado, true);
    const p = cal.inserciones[0].requestBody;
    assert.equal(p.summary, 'Sesión estratégica · Muebles Gil');
    assert.equal(p.end.dateTime, '2026-11-05T11:00:00+01:00', '60 minutos');
    assert.match(p.description, /^Sesión estratégica con Valerio García \(Familias Empresarias, de Business Avance\): 60 minutos, sin coste y sin compromiso\./);
    assert.doesNotMatch(p.description + p.summary, /diagn[oó]stico/i);
    assert.equal(hsPeticiones.find((x) => x.ruta === '/crm/v3/objects/meetings').cuerpo.properties.hs_meeting_title, 'Sesión estratégica · Muebles Gil');
    assert.equal(hsPeticiones.find((x) => x.ruta === '/crm/v3/objects/deals').cuerpo.properties.dealname, 'Muebles Gil · sesión estratégica');
    // Atalaya (en segundo plano)
    for (let i = 0; i < 100 && !at.length; i++) await new Promise((ok) => setTimeout(ok, 10));
    assert.equal(at.length, 1);
    assert.equal(at[0].ruta, '/api/integracion/reunion'); assert.equal(at[0].auth, 'Bearer tok-integracion');
    const b = at[0].cuerpo;
    assert.equal(b.id, 'ev1'); assert.equal(b.inicio, '2026-11-05T09:00:00.000Z'); assert.equal(b.fin, '2026-11-05T10:00:00.000Z');
    assert.equal(b.titulo, 'Sesión estratégica · Muebles Gil'); assert.equal(b.enlace, 'https://meet.google.com/abc-defg-hij');
    assert.equal(b.nombre, 'Rosa Gil'); assert.equal(b.email, 'rosa@gil.es'); assert.equal(b.telefono, '+34600123199'); assert.equal(b.empresa, 'Muebles Gil');
    assert.equal(b.origen, 'asistente'); assert.ok(b.hubspotContactId);
    assert.ok(db.abrir().prepare(`SELECT 1 FROM eventos WHERE tipo = 'atalaya_reunion' AND json_extract(datos, '$.ok') = 1`).get());
    // Sin configurar no se llama
    atalaya.configurarAtalaya({ url: '', token: '' });
    assert.deepEqual(await atalaya.reunionAAtalaya({ id: 'x', inicio: new Date(), fin: new Date() }), { ok: false, motivo: 'no_configurada' });
    assert.equal(at.length, 1);
  } finally { fakeAt.close(); }
});

test('sesión pendiente de confirmar (sin agenda): aviso inmediato al equipo y evento para la bandeja', async () => {
  const avisos = await import('../src/avisos.js');
  const { C } = await import('../src/config.js');
  Object.assign(C.smtp, { host: 'smtp.test', de: 'asistente@ejemplo.es' }); C.empresa.emailResponsable = 'valerio@ejemplo.es';
  const correos = [];
  avisos.configurarAvisos({ correo: async (m) => { correos.push(m); } });
  const c = db.guardarContacto({ telefono: '+34600123126', nombre: 'Jaime' });
  const conv = db.abrirConversacion({ canal: 'voz', direccion: 'entrante', contactoId: c.id });
  const r = JSON.parse((await herramientas.ejecutar('agendar_reunion', { inicio: '2026-11-05T17:00:00+01:00', nombre: 'Jaime', motivo: 'Caja' }, { canal: 'voz', contacto: c, conversacionId: conv })).contenido);
  assert.equal(r.pendiente_de_confirmar, true);
  const ev = JSON.parse(db.abrir().prepare(`SELECT datos FROM eventos WHERE tipo = 'reunion_pendiente' ORDER BY id DESC`).get().datos);
  assert.equal(ev.conversacionId, conv); assert.equal(ev.contacto, c.id);
  for (let i = 0; i < 100 && !correos.length; i++) await new Promise((ok) => setTimeout(ok, 10));
  assert.match(correos[0].asunto, /Sesión estratégica pendiente de confirmar · Jaime/);
  assert.match(correos[0].texto, /jueves 5 de noviembre a las 17:00/);
  assert.match(hsPeticiones.find((x) => x.ruta === '/crm/v3/objects/deals').cuerpo.properties.dealname, /Jaime · sesión estratégica/);
});
