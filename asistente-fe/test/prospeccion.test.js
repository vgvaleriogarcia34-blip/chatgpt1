// Prospección: reglas de cumplimiento, importación CSV y de HubSpot, planificador y reintentos.
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

let C, db, cu, ca;
const LUNES_11 = new Date('2026-11-02T10:00:00Z'); // lunes 2 de noviembre de 2026, 11:00 en Madrid
const h = (base, horas) => new Date(+base + horas * 3600e3);

before(async () => {
  ({ C } = await import('../src/config.js'));
  db = await import('../src/almacen/db.js');
  db.abrir(':memory:');
  cu = await import('../src/prospeccion/cumplimiento.js');
  ca = await import('../src/prospeccion/campanas.js');
});
after(() => db.cerrar());
beforeEach(() => {
  Object.assign(C.prospeccion, { activa: true, horario: 'L-V 10:00-14:00,16:30-20:00', maxIntentos: 3, llamadasSimultaneas: 2, festivos: ['2026-12-08', '01-06'], separacionHoras: 48 });
  C.empresa.zonaHoraria = 'Europe/Madrid';
  const d = db.abrir();
  d.exec('DELETE FROM campana_contactos; DELETE FROM campanas; DELETE FROM bajas; DELETE FROM robinson; DELETE FROM contactos; DELETE FROM conversaciones;');
});

const campana = { nombre: 'Prueba', datos: JSON.stringify({ basesPermitidas: ['consentimiento', 'cliente', 'relacion_previa'] }) };
const campanaIL = { nombre: 'B2B', datos: JSON.stringify({ basesPermitidas: ['relacion_previa'], permiteInteresLegitimo: true, evaluacionInteresLegitimo: 'Evaluación hecha el 1 de octubre con el despacho X; ponderación favorable.' }) };
const ct = (o = {}) => ({ telefono: '+34910000001', base_legal: 'relacion_previa', intentos: 0, ...o });

test('cumplimiento: llamada permitida y cada motivo de rechazo', () => {
  assert.deepEqual(cu.puedeLlamar(ct(), campana, LUNES_11), { ok: true });
  const motivo = (c, camp = campana, ahora = LUNES_11) => cu.puedeLlamar(c, camp, ahora).codigo;
  assert.equal(motivo(ct({ base_legal: null })), 'sin_base_legal');
  assert.match(cu.puedeLlamar(ct({ base_legal: '' }), campana, LUNES_11).motivo, /correo o LinkedIn/);
  assert.equal(motivo(ct({ base_legal: 'consentimiento' })), 'consentimiento_sin_fecha');
  assert.equal(cu.puedeLlamar(ct({ base_legal: 'consentimiento', base_legal_fecha: '2026-05-01' }), campana, LUNES_11).ok, true);
  assert.equal(motivo(ct({ base_legal: 'interes_legitimo_b2b' })), 'interes_legitimo_no_permitido');
  assert.equal(motivo(ct({ base_legal: 'cliente' }), { datos: { basesPermitidas: ['consentimiento'] } }), 'base_no_admitida');
  // Interés legítimo: permitido con evaluación, avisa de revisarlo y no llama a móviles personales
  const il = cu.puedeLlamar(ct({ base_legal: 'interes_legitimo_b2b' }), campanaIL, LUNES_11);
  assert.equal(il.ok, true); assert.match(il.aviso, /abogado/);
  assert.equal(motivo(ct({ base_legal: 'interes_legitimo_b2b', telefono: '+34600111222' }), campanaIL), 'movil_personal');
  assert.equal(motivo(ct({ base_legal: 'interes_legitimo_b2b', telefono: '+34910000009', tipo_linea: 'movil_personal' }), campanaIL), 'movil_personal');
  assert.equal(cu.puedeLlamar(ct({ base_legal: 'interes_legitimo_b2b', telefono: '+34600111222', tipo_linea: 'movil_corporativo' }), campanaIL, LUNES_11).ok, true);
  // Sin evaluación, el permiso de la campaña no vale
  assert.equal(motivo(ct({ base_legal: 'interes_legitimo_b2b' }), { datos: { permiteInteresLegitimo: true, evaluacionInteresLegitimo: '' } }), 'interes_legitimo_no_permitido');
  // Baja y Robinson
  db.darDeBaja('+34910000002');
  assert.equal(motivo(ct({ telefono: '910000002' })), 'baja');
  db.cargarRobinson(['+34910000003'], '2026-10-01');
  assert.equal(motivo(ct({ telefono: '+34910000003' })), 'robinson');
  assert.equal(motivo(ct({ telefono: 'abc' })), 'sin_telefono');
  // Intentos y separación
  assert.equal(motivo(ct({ intentos: 3 })), 'max_intentos');
  assert.equal(motivo(ct({ intentos: 1, ultimo_intento: '2026-11-01 10:00:00' })), 'demasiado_pronto');
  assert.equal(cu.puedeLlamar(ct({ intentos: 1, ultimo_intento: '2026-10-30 10:00:00' }), campana, LUNES_11).ok, true);
  // Horario
  assert.equal(motivo(ct(), campana, new Date('2026-11-07T10:00:00Z')), 'fin_de_semana'); // sábado
  assert.equal(motivo(ct(), campana, new Date('2026-11-08T10:00:00Z')), 'fin_de_semana'); // domingo
  assert.equal(motivo(ct(), campana, new Date('2026-12-08T10:00:00Z')), 'festivo');
  assert.equal(motivo(ct(), campana, new Date('2027-01-06T10:00:00Z')), 'festivo'); // festivo de todos los años (MM-DD)
  assert.equal(motivo(ct(), campana, new Date('2026-11-02T13:30:00Z')), 'fuera_de_horario'); // 14:30, entre tramos
  assert.equal(motivo(ct(), campana, new Date('2026-11-02T07:30:00Z')), 'fuera_de_horario'); // 8:30
  C.prospeccion.horario = 'L-D 07:00-23:00'; // aunque se configure mal, manda el margen legal
  assert.equal(motivo(ct(), campana, new Date('2026-11-02T20:30:00Z')), 'fuera_de_horario'); // 21:30
  assert.equal(motivo(ct(), campana, new Date('2026-11-07T10:00:00Z')), 'fin_de_semana');
});

test('cumplimiento: horario en verano (UTC+2) y análisis del horario', () => {
  assert.equal(cu.comprobarHorario(new Date('2026-07-01T08:30:00Z')).ok, true); // miércoles, 10:30 en Madrid
  assert.equal(cu.comprobarHorario(new Date('2026-07-01T07:30:00Z')).ok, false); // 9:30, antes del tramo
  assert.equal(cu.comprobarHorario(new Date('2026-11-02T18:55:00Z')).ok, false); // 19:55: últimos 10 minutos del tramo
  const g = cu.parsearHorario('L-J 10:00-14:00; V 09:30-13:00');
  assert.deepEqual([...g[0].dias], [1, 2, 3, 4]); assert.deepEqual(g[1].tramos, [[570, 780]]);
  assert.throws(() => cu.parsearHorario('Q 10:00-11:00'));
});

test('cumplimiento: WhatsApp proactivo solo con plantilla y consentimiento expreso', () => {
  const c = ct({ consentimiento_whatsapp: '2026-09-01' });
  assert.equal(cu.puedeEnviarWhatsApp(c, { plantilla: 'seguimiento_ponencia' }, new Date('2026-11-07T22:00:00Z')).ok, true); // sin horario
  assert.equal(cu.puedeEnviarWhatsApp(c, {}).codigo, 'sin_plantilla');
  assert.equal(cu.puedeEnviarWhatsApp(ct(), { plantilla: 'x' }).codigo, 'sin_consentimiento_whatsapp');
  db.darDeBaja(c.telefono);
  assert.equal(cu.puedeEnviarWhatsApp(c, { plantilla: 'x' }).codigo, 'baja');
});

test('lista Robinson: importación en claro y con resúmenes SHA-256', () => {
  const sha = crypto.createHash('sha256').update('34600999888').digest('hex');
  const r = cu.importarRobinsonCSV(`telefono\n600 111 333\n+34 911 222 333\n${sha}\nsin dato\n`, '2026-10-15');
  assert.deepEqual(r, { cargados: 3, descartados: 2 }); // la cabecera y «sin dato» se descartan
  assert.equal(cu.enRobinson('+34600111333'), true);
  assert.equal(cu.enRobinson('911222333'), true);
  assert.equal(cu.enRobinson('+34600999888'), true);
  assert.equal(cu.enRobinson('+34600999887'), false);
});

test('importación CSV: separador «;», base legal, rechazos y sin base legal', () => {
  const k = ca.crearCampana({ nombre: 'Ventas rentables', dolor: 'incrementar ventas rentables', guion: 'Breve' });
  db.darDeBaja('+34910000005');
  const csv = '﻿telefono;nombre;empresa;cargo;email;base_legal;base_legal_detalle;base_legal_fecha;origen\n'
    + '600 111 001;Ana Ruiz;"Talleres Ruiz; S.L.";Gerente;ana@x.es;Relación previa;Ponencia FREMM;2026-10-01;ponencia\n'
    + '600111002;Luis;Lácteos;CEO;;cliente;;;\n'
    + '600111003;Sin base;Empresa;;;;;;linkedin\n'
    + '12;Mal;;;;cliente;;;\n'
    + '600111004;Rara;;;;amistad;;;\n'
    + '910000005;De baja;;;;cliente;;;\n'
    + '600 111 001;Ana repetida;;;;relacion_previa;;;\n';
  const r = ca.importarCSV(k.id, csv);
  assert.equal(r.importados, 4); assert.equal(r.yaEstaban, 1); assert.equal(r.sinBaseLegal, 1); assert.equal(r.excluidos, 1);
  assert.deepEqual(r.rechazados.map((x) => x.fila), [5, 6]);
  const ana = db.contactoPorTelefono('600111001');
  assert.equal(ana.empresa, 'Talleres Ruiz; S.L.'); assert.equal(ana.base_legal, 'relacion_previa'); assert.equal(ana.origen, 'ponencia');
  const res = ca.resultadosCampana(k.id);
  assert.equal(res.contactos.find((x) => x.telefono === '+34600111003').estado, 'sin_base_legal');
  assert.throws(() => ca.importarCSV(k.id, 'nombre,email\nA,a@x.es'), /telefono/);
  assert.throws(() => ca.crearCampana({ nombre: 'IL', permiteInteresLegitimo: true }), /evaluación/);
});

test('importación desde una lista de HubSpot (API simulada)', async () => {
  const k = ca.crearCampana({ nombre: 'HubSpot' });
  const llamadas = [];
  const fetchFn = async (url, op = {}) => {
    llamadas.push([op.method || 'GET', url, op.headers.Authorization]);
    const u = new URL(url);
    let cuerpo;
    if (u.pathname === '/crm/v3/lists/77/memberships') cuerpo = u.searchParams.get('after') ? { results: [{ recordId: '3' }] } : { results: [{ recordId: '1' }, { recordId: '2' }], paging: { next: { after: 'p2' } } };
    else if (u.pathname === '/crm/v3/objects/contacts/batch/read') cuerpo = { results: JSON.parse(op.body).inputs.map(({ id }) => ({ id, properties: {
      firstname: 'C' + id, lastname: 'Prueba', phone: '60022200' + id, company: 'Emp ' + id,
      hs_legal_basis: id === '1' ? 'Performance of a contract' : id === '2' ? 'Legitimate interest – prospect/lead' : null, fe_base_legal: id === '3' ? 'Relación previa (ponencia FREMM)' : null, fe_baja: id === '3' ? 'true' : null } })) };
    return { ok: !!cuerpo, status: cuerpo ? 200 : 404, json: async () => cuerpo };
  };
  const r = await ca.importarDesdeHubSpot(k.id, '77', { token: 'pat-prueba', fetchFn, base: 'http://hubspot.falso' });
  assert.equal(r.enLista, 3); assert.equal(r.importados, 3); assert.equal(r.sinBaseLegal, 0); assert.equal(r.excluidos, 1);
  assert.equal(db.contactoPorTelefono('600222003').base_legal, 'relacion_previa'); assert.equal(db.estaDeBaja('600222003'), true);
  assert.equal(llamadas[0][2], 'Bearer pat-prueba');
  assert.equal(db.contactoPorTelefono('600222001').base_legal, 'cliente');
  assert.equal(db.contactoPorTelefono('600222002').base_legal, 'interes_legitimo_b2b');
  assert.equal(db.contactoPorTelefono('600222001').hubspot_id, '1');
  await assert.rejects(ca.importarDesdeHubSpot(k.id, '77', { token: '' }), /HUBSPOT_TOKEN/);
});

function campanaConContactos(n, extra = {}) {
  const k = ca.crearCampana({ nombre: 'Planificador' });
  const filas = Array.from({ length: n }, (_, i) => ({ telefono: `91000${String(i).padStart(4, '0')}`, nombre: 'P' + i, base_legal: 'cliente', ...extra }));
  ca.importarFilas(k.id, filas);
  ca.reanudarCampana(k.id);
  return k;
}

test('planificador: no supera las llamadas simultáneas y respeta el horario y las pausas', async () => {
  const k = campanaConContactos(5);
  const lanzadas = [];
  const llamar = async (o) => { lanzadas.push(o); return { callSid: 'CA' + o.contactoId, conversacionId: null }; };
  assert.equal((await ca.vuelta(new Date('2026-11-07T10:00:00Z'), { llamar })).lanzadas, 0); // sábado
  let r = await ca.vuelta(LUNES_11, { llamar });
  assert.equal(r.lanzadas, 2); assert.equal(lanzadas.length, 2);
  assert.equal(lanzadas[0].campana.id, k.id); assert.ok(lanzadas[0].contacto.telefono);
  r = await ca.vuelta(h(LUNES_11, 0.02), { llamar });
  assert.equal(r.lanzadas, 0); assert.match(r.motivo, /simultáneas/);
  // Termina una: entra otra
  ca.alEstado({ callSid: lanzadas[0].contactoId && 'CA' + lanzadas[0].contactoId, estado: 'completed', resultado: 'no_interesado' }, h(LUNES_11, 0.05));
  assert.equal((await ca.vuelta(h(LUNES_11, 0.06), { llamar })).lanzadas, 1);
  // Pausada: no lanza
  ca.pausarCampana(k.id);
  ca.alEstado({ callSid: 'CA' + lanzadas[1].contactoId, estado: 'completed', resultado: 'interesado' });
  assert.equal((await ca.vuelta(h(LUNES_11, 0.1), { llamar })).lanzadas, 0);
  // Desactivada globalmente: no lanza
  ca.reanudarCampana(k.id); C.prospeccion.activa = false;
  assert.match((await ca.vuelta(h(LUNES_11, 0.1), { llamar })).motivo, /desactivada/);
  const res = ca.resultadosCampana(k.id);
  assert.deepEqual(Object.fromEntries(res.porResultado.map((x) => [x.resultado, x.n])), { no_interesado: 1, interesado: 1 });
});

test('planificador: reintentos tras no contesta, comunica y buzón, con separación y máximo de intentos', async () => {
  C.prospeccion.llamadasSimultaneas = 5;
  const k = campanaConContactos(1);
  const llamar = async (o) => ({ callSid: 'CA-' + Math.random(), conversacionId: null, o });
  let t = LUNES_11;
  // Intento 1: no contesta
  assert.equal((await ca.vuelta(t, { llamar })).lanzadas, 1);
  let cc = ca.resultadosCampana(k.id).contactos[0];
  ca.alEstado({ campanaId: k.id, contactoId: cc.contacto_id, estado: 'no-answer' }, t);
  cc = ca.resultadosCampana(k.id).contactos[0];
  assert.equal(cc.estado, 'reintentar'); assert.equal(cc.intentos, 1);
  // Al día siguiente todavía no (48 h)
  assert.equal((await ca.vuelta(h(t, 24), { llamar })).lanzadas, 0);
  // Intento 2 a las 48 h: buzón (la conversación lo registra como resultado)
  t = h(t, 48);
  assert.equal((await ca.vuelta(t, { llamar })).lanzadas, 1);
  const conv = db.abrirConversacion({ canal: 'voz', direccion: 'saliente', contactoId: cc.contacto_id, campanaId: k.id });
  db.cerrarConversacion(conv, { resultado: 'buzon', resumen: 'Saltó el buzón' });
  ca.alEstado({ campanaId: k.id, contactoId: cc.contacto_id, estado: 'completed', conversacionId: conv }, t);
  cc = ca.resultadosCampana(k.id).contactos[0];
  assert.equal(cc.estado, 'reintentar'); assert.equal(cc.resultado, 'buzon'); assert.equal(cc.conversacion_id, conv);
  // Intento 3: comunica → agotado (máximo 3)
  t = h(t, 49);
  assert.equal((await ca.vuelta(t, { llamar })).lanzadas, 1);
  ca.alEstado({ campanaId: k.id, contactoId: cc.contacto_id, estado: 'busy' }, t);
  cc = ca.resultadosCampana(k.id).contactos[0];
  assert.equal(cc.estado, 'agotado'); assert.equal(cc.intentos, 3);
  assert.equal((await ca.vuelta(h(t, 72), { llamar })).lanzadas, 0);
});

test('planificador: excluye a quien se da de baja o entra en Robinson y no cuenta los fallos técnicos', async () => {
  C.prospeccion.llamadasSimultaneas = 5;
  const k = campanaConContactos(3);
  const [a, b] = ca.resultadosCampana(k.id).contactos;
  db.darDeBaja(a.telefono); db.cargarRobinson([b.telefono], '2026-11-01');
  const llamar = async () => { throw new Error('Twilio caído'); };
  assert.equal((await ca.vuelta(LUNES_11, { llamar })).lanzadas, 1);
  const res = Object.fromEntries(ca.resultadosCampana(k.id).contactos.map((x) => [x.telefono, x]));
  assert.equal(res[a.telefono].estado, 'baja');
  assert.equal(res[b.telefono].estado, 'excluido'); assert.match(res[b.telefono].motivo, /Robinson/);
  const c = Object.values(res).find((x) => x.telefono !== a.telefono && x.telefono !== b.telefono);
  assert.equal(c.estado, 'reintentar'); assert.equal(c.intentos, 0); assert.match(c.motivo, /Twilio caído/);
  // Resultado «baja» en la conversación: se marca como baja
  db.abrir().prepare(`UPDATE campana_contactos SET estado = 'llamando', intentos = 1 WHERE contacto_id = ?`).run(c.contacto_id);
  ca.alEstado({ campanaId: k.id, contactoId: c.contacto_id, estado: 'completed', resultado: 'baja' });
  assert.equal(ca.resultadosCampana(k.id, { estado: 'baja' }).contactos.length, 2);
});

test('planificador: arranca solo con la prospección activa y se suscribe a los estados de llamada', async () => {
  C.prospeccion.activa = false;
  let suscrito = null;
  const parar0 = await ca.iniciarPlanificador({ llamar: async () => ({}), suscribir: (fn) => (suscrito = fn) });
  assert.equal(suscrito, null); parar0();
  C.prospeccion.activa = true;
  const parar = await ca.iniciarPlanificador({ intervaloMs: 3600e3, llamar: async () => ({}), suscribir: (fn) => (suscrito = fn) });
  assert.equal(typeof suscrito, 'function');
  assert.doesNotThrow(() => suscrito({ callSid: 'desconocido', estado: 'completed' }));
  parar();
});

test('planificador: respuestas { ok:false } de llamar() y resultado de la conversación que llega tarde', async () => {
  C.prospeccion.llamadasSimultaneas = 5;
  const k = campanaConContactos(3);
  const [a, b, c] = ca.resultadosCampana(k.id).contactos;
  const respuestas = { [a.telefono]: { ok: false, motivo: 'baja' }, [b.telefono]: { ok: false, motivo: 'voz_no_configurada' }, [c.telefono]: { ok: true, callSid: 'CA-tarde' } };
  assert.equal((await ca.vuelta(LUNES_11, { llamar: async (o) => respuestas[o.telefono] })).lanzadas, 3);
  let res = Object.fromEntries(ca.resultadosCampana(k.id).contactos.map((x) => [x.telefono, x]));
  assert.equal(res[a.telefono].estado, 'baja');
  assert.equal(res[b.telefono].estado, 'reintentar'); assert.equal(res[b.telefono].intentos, 0);
  assert.equal(res[c.telefono].estado, 'llamando'); assert.equal(res[c.telefono].llamada_id, 'CA-tarde');
  // Twilio avisa antes de que la sesión cierre la conversación: llamada corta sin resultado → reintentar…
  ca.alEstado({ callSid: 'CA-tarde', estado: 'completed', duracion: 8, campanaId: k.id, contactoId: c.contacto_id }, LUNES_11);
  assert.equal(ca.resultadosCampana(k.id, { estado: 'reintentar' }).contactos.length, 2);
  // …y el resultado de la conversación, al llegar, lo corrige
  ca.alEstado({ callSid: 'CA-tarde', estado: 'completed', resultado: 'reunion_agendada' }, LUNES_11);
  res = Object.fromEntries(ca.resultadosCampana(k.id).contactos.map((x) => [x.telefono, x]));
  assert.equal(res[c.telefono].estado, 'completado'); assert.equal(res[c.telefono].resultado, 'reunion_agendada');
  // Un segundo aviso no cambia nada
  ca.alEstado({ callSid: 'CA-tarde', estado: 'no-answer' }, LUNES_11);
  assert.equal(ca.resultadosCampana(k.id, { estado: 'completado' }).contactos.length, 1);
});

test('importación: avisa de los que no se llamarán nunca y los vuelve a evaluar si se reimportan corregidos', () => {
  const k = ca.crearCampana({ nombre: 'Aviso al importar', basesPermitidas: ['consentimiento', 'relacion_previa'] });
  const r = ca.importarCSV(k.id, 'telefono,nombre,base_legal,base_legal_fecha\n'
    + '910000101,Con fecha,consentimiento,2026-09-01\n'
    + '910000102,Sin fecha,consentimiento,\n'
    + '910000103,Frío,interes_legitimo_b2b,\n'
    + '910000104,Cliente,cliente,\n'
    + '910000105,Sin base,,\n');
  assert.equal(r.importados, 5); assert.equal(r.sinBaseLegal, 1); assert.equal(r.excluidos, 0);
  assert.deepEqual(r.nuncaSeLlamaran.map((x) => [x.nombre, x.codigo]), [['Sin fecha', 'consentimiento_sin_fecha'], ['Frío', 'interes_legitimo_no_permitido'], ['Cliente', 'base_no_admitida']]);
  assert.match(r.nuncaSeLlamaran[0].motivo, /sin prueba no se llama/);
  const est = () => Object.fromEntries(ca.resultadosCampana(k.id).contactos.map((x) => [x.nombre, x.estado]));
  assert.deepEqual(est(), { 'Con fecha': 'pendiente', 'Sin fecha': 'excluido', 'Frío': 'excluido', 'Cliente': 'excluido', 'Sin base': 'sin_base_legal' });
  // Reimportado con la fecha del consentimiento: pasa a pendiente
  const r2 = ca.importarCSV(k.id, 'telefono,nombre,base_legal,base_legal_fecha\n910000102,Sin fecha,consentimiento,2026-10-15\n');
  assert.equal(r2.yaEstaban, 1); assert.equal(r2.nuncaSeLlamaran.length, 0);
  assert.equal(est()['Sin fecha'], 'pendiente');
});

test('«volver a llamar» respeta el día y la hora pedidos (antes de las 48 h y aunque se hayan agotado los intentos)', async () => {
  C.prospeccion.llamadasSimultaneas = 5; C.prospeccion.maxIntentos = 1;
  const k = campanaConContactos(1);
  const llamar = async () => ({ callSid: 'CA-pedido', conversacionId: null });
  assert.equal((await ca.vuelta(LUNES_11, { llamar })).lanzadas, 1);
  const cc0 = ca.resultadosCampana(k.id).contactos[0];
  // Pide que le llamen mañana martes a las 17:00 (Madrid) = 16:00 UTC
  const conv = db.abrirConversacion({ canal: 'voz', direccion: 'saliente', contactoId: cc0.contacto_id, campanaId: k.id });
  db.cerrarConversacion(conv, { resultado: 'volver_a_llamar', resumen: 'Mejor mañana por la tarde', volverLlamar: '2026-11-03T17:00:00+01:00' });
  // fechaPedida usa la hora real para descartar fechas pasadas: en la prueba se guarda tal cual
  db.marcarConversacion(conv, { volver_llamar: '2026-11-03 16:00:00' });
  ca.alEstado({ campanaId: k.id, contactoId: cc0.contacto_id, estado: 'completed', conversacionId: conv }, LUNES_11);
  let cc = ca.resultadosCampana(k.id).contactos[0];
  assert.equal(cc.estado, 'reintentar', 'no se agota: lo pidió'); assert.equal(cc.proximo, '2026-11-03 16:00:00'); assert.equal(cc.pedido, '2026-11-03 16:00:00');
  assert.equal((await ca.vuelta(h(LUNES_11, 28), { llamar })).lanzadas, 0, 'a las 15:00 del martes todavía no');
  assert.equal((await ca.vuelta(h(LUNES_11, 30.1), { llamar })).lanzadas, 1, 'a las 17:06 del martes, sí (30 h después, sin esperar 48)');
  cc = ca.resultadosCampana(k.id).contactos[0];
  assert.equal(cc.pedido, null); assert.equal(cc.intentos, 2);
  C.prospeccion.maxIntentos = 3;
});
