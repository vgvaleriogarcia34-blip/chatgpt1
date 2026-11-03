// Purga de conservación (CUMPLIMIENTO.md §6.3): mensajes, grabaciones, eventos y contactos al vencer sus plazos.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

let db, cons;
before(async () => {
  db = await import('../src/almacen/db.js');
  db.abrir(':memory:');
  cons = await import('../src/conservacion.js');
});
after(() => db.cerrar());

const AHORA = new Date('2027-12-01T10:00:00Z');
const viejo = (tabla, id, ts, col = 'inicio') => db.abrir().prepare(`UPDATE ${tabla} SET ${col} = ? WHERE id = ?`).run(ts, id);

test('borra mensajes y anonimiza conversaciones vencidas; los clientes tienen su propio plazo; las bajas no caducan', async () => {
  const d = db.abrir();
  const prospecto = db.guardarContacto({ telefono: '+34600200001', nombre: 'Prospecto', base_legal: 'relacion_previa' });
  const cliente = db.guardarContacto({ telefono: '+34600200002', nombre: 'Cliente', base_legal: 'cliente' });
  const reciente = db.guardarContacto({ telefono: '+34600200003', nombre: 'Reciente' });
  const conv = (c, ts) => { const id = db.abrirConversacion({ canal: 'voz', direccion: 'entrante', contactoId: c.id, externoId: 'CA' + c.id }); db.anotar(id, 'usuario', 'Hola'); db.cerrarConversacion(id, { resumen: 'Resumen con datos', resultado: 'atendido' }); viejo('conversaciones', id, ts); viejo('conversaciones', id, ts, 'fin'); return id; };
  const a = conv(prospecto, '2026-10-01 10:00:00'); // 14 meses
  const b = conv(cliente, '2026-10-01 10:00:00'); // cliente: se conserva
  const c = conv(reciente, '2027-11-01 10:00:00'); // reciente
  // Grabación de hace 4 meses y otra de hace 1 mes
  db.marcarConversacion(c, { grabacion_url: 'https://api.twilio.com/x/RE1', grabacion_sid: 'RE1' }); viejo('conversaciones', c, '2027-07-15 10:00:00');
  const g2 = db.abrirConversacion({ canal: 'voz', direccion: 'entrante', contactoId: reciente.id }); db.marcarConversacion(g2, { grabacion_url: 'https://api.twilio.com/x/RE2', grabacion_sid: 'RE2' }); viejo('conversaciones', g2, '2027-11-20 10:00:00');
  // Eventos: uno técnico viejo, un aviso pendiente viejo (se queda en la bandeja), uno reciente
  const e1 = db.evento('latencia', { ms: 800 }); viejo('eventos', e1, '2026-10-01 10:00:00', 'ts');
  const e2 = db.evento('reunion_pendiente', { contacto: prospecto.id }); viejo('eventos', e2, '2026-10-01 10:00:00', 'ts');
  const e3 = db.evento('latencia', { ms: 700 }); viejo('eventos', e3, '2027-11-01 10:00:00', 'ts');
  // Contacto sin actividad desde hace más de 4 años (12 + 36 meses), y otro con campaña en curso
  const dormido = db.guardarContacto({ telefono: '+34600200004', nombre: 'Dormido' }); viejo('contactos', dormido.id, '2023-10-01 10:00:00', 'actualizado');
  const enCampana = db.guardarContacto({ telefono: '+34600200005', nombre: 'En campaña' }); viejo('contactos', enCampana.id, '2023-10-01 10:00:00', 'actualizado');
  d.prepare(`INSERT INTO campanas (id, nombre) VALUES (1, 'x')`).run();
  d.prepare(`INSERT INTO campana_contactos (campana_id, contacto_id, estado) VALUES (1, ?, 'pendiente')`).run(enCampana.id);
  db.darDeBaja('+34600200004', { motivo: 'no llamar' });

  const borradas = [];
  const r = await cons.purgar(AHORA, { borrarGrabacion: async (sid) => borradas.push(sid) });
  assert.equal(r.conversaciones, 1); assert.equal(r.mensajes, 1); assert.equal(r.grabaciones, 1); assert.equal(r.eventos, 1); assert.equal(r.contactos, 1);
  assert.deepEqual(borradas, ['RE1']);
  const A = db.conversacionPorId(a);
  assert.equal(A.resumen, null); assert.equal(A.contacto_id, null); assert.equal(A.externo_id, null); assert.equal(A.resultado, 'atendido', 'las cifras se mantienen');
  assert.equal(db.mensajes(a).length, 0);
  assert.equal(db.mensajes(b).length, 1); assert.equal(db.conversacionPorId(b).resumen, 'Resumen con datos');
  assert.equal(db.mensajes(c).length, 1);
  assert.equal(db.conversacionPorId(c).grabacion_url, null); assert.ok(db.conversacionPorId(g2).grabacion_url);
  assert.ok(!db.contactoPorId(dormido.id)); assert.ok(db.contactoPorId(enCampana.id));
  assert.equal(db.estaDeBaja('+34600200004'), true, 'la baja no caduca');
  assert.ok(d.prepare('SELECT 1 FROM eventos WHERE id = ?').get(e2), 'el aviso sin resolver sigue en la bandeja');
  assert.ok(d.prepare(`SELECT 1 FROM eventos WHERE tipo = 'purga'`).get());
  // Segunda pasada: nada más que hacer
  const r2 = await cons.purgar(AHORA, { borrarGrabacion: async () => {} });
  assert.deepEqual({ ...r2, eventos: 0 }, { mensajes: 0, conversaciones: 0, grabaciones: 0, eventos: 0, contactos: 0, erroresGrabacion: 0 }); // (el evento «purga» de hoy es «viejo» para AHORA)
});
