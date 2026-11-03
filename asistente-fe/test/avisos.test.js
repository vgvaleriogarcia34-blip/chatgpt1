// Avisos al equipo: correo por SMTP (servidor SMTP falso local), WhatsApp con plantilla al responsable, registro en
// eventos y sin repeticiones; y el fallo de WhatsApp, que avisa y no anota una disculpa que no se envió.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';

Object.assign(process.env, { RESPONSABLE_EMAIL: 'valerio@ejemplo.es', RESPONSABLE_MOVIL: '+34600000001', URL_PUBLICA: 'https://asistente.test' });

// Servidor SMTP falso: guarda las órdenes y el mensaje
const sesiones = [];
const smtp = net.createServer((s) => {
  const ses = { ordenes: [], datos: '' }; sesiones.push(ses);
  let enDatos = false, buf = '';
  s.write('220 smtp.falso ESMTP\r\n');
  s.on('data', (d) => {
    buf += d.toString('utf8');
    let i;
    while ((i = buf.indexOf('\r\n')) >= 0) {
      const l = buf.slice(0, i); buf = buf.slice(i + 2);
      if (enDatos) { if (l === '.') { enDatos = false; s.write('250 2.0.0 aceptado\r\n'); } else ses.datos += l + '\r\n'; continue; }
      ses.ordenes.push(l);
      if (/^EHLO/.test(l)) s.write('250-smtp.falso\r\n250-AUTH PLAIN LOGIN\r\n250 8BITMIME\r\n');
      else if (/^AUTH PLAIN/.test(l)) s.write(Buffer.from(l.slice(11), 'base64').toString() === '\0asistente\0clave-smtp' ? '235 2.7.0 ok\r\n' : '535 no\r\n');
      else if (/^(MAIL|RCPT)/.test(l)) s.write('250 ok\r\n');
      else if (l === 'DATA') { enDatos = true; s.write('354 adelante\r\n'); }
      else if (l === 'QUIT') { s.write('221 adiós\r\n'); s.end(); }
      else s.write('500 ?\r\n');
    }
  });
});

let C, db, correo, avisos, meta;
before(async () => {
  await new Promise((ok) => smtp.listen(0, '127.0.0.1', ok));
  ({ C } = await import('../src/config.js'));
  Object.assign(C.smtp, { host: '127.0.0.1', puerto: smtp.address().port, usuario: 'asistente', clave: 'clave-smtp', de: 'Asistente FE <asistente@ejemplo.es>' });
  db = await import('../src/almacen/db.js');
  db.abrir(':memory:');
  correo = await import('../src/correo.js');
  avisos = await import('../src/avisos.js');
  meta = await import('../src/whatsapp/meta.js');
});
after(() => { smtp.close(); db.cerrar(); });

const b64 = (t) => Buffer.from(t.replace(/\r\n/g, ''), 'base64').toString('utf8');

test('SMTP: autenticación, sobre, asunto codificado, cuerpo en base64 y transparencia de puntos', async () => {
  await correo.enviarCorreo({ para: 'valerio@ejemplo.es', asunto: 'Sesión estratégica\r\nBcc: otro@x.es', texto: 'Hola\n.línea con punto\nAdiós' });
  const s = sesiones.at(-1);
  assert.ok(s.ordenes.some((o) => o.startsWith('AUTH PLAIN')));
  assert.ok(s.ordenes.includes('MAIL FROM:<asistente@ejemplo.es>'));
  assert.ok(s.ordenes.includes('RCPT TO:<valerio@ejemplo.es>'));
  const [cab, cuerpo] = s.datos.split('\r\n\r\n');
  assert.doesNotMatch(cab, /^Bcc:/m, 'sin inyección de cabeceras');
  const asunto = cab.match(/^Subject: =\?UTF-8\?B\?(.+)\?=$/m)[1];
  assert.equal(Buffer.from(asunto, 'base64').toString(), 'Sesión estratégica Bcc: otro@x.es');
  assert.match(cab, /^From: Asistente FE <asistente@ejemplo\.es>\r?$/m);
  assert.equal(b64(cuerpo), 'Hola\r\n.línea con punto\r\nAdiós');
  await assert.rejects(correo.enviarCorreo({ para: 'x@y.es', asunto: 'a', texto: 'b' }, { ...C.smtp, clave: 'mala' }), /SMTP 535/);
});

test('avisarEquipo: correo y WhatsApp con plantilla, evento y sin repetirse', async () => {
  const wa = [];
  meta.configurarMeta({ token: 'tok', phoneNumberId: 'PN', base: 'http://127.0.0.1:9' });
  C.avisos.plantillaWhatsApp = 'aviso_equipo';
  avisos.configurarAvisos({ whatsapp: async (...a) => { wa.push(a); return 'wamid.1'; } });
  const contacto = db.guardarContacto({ telefono: '+34611222333', nombre: 'Carmen Ruiz', empresa: 'Conservas Ruiz', email: 'carmen@ruiz.es' });
  const n = sesiones.length;
  const r = await avisos.avisarEquipo({ tipo: 'transferencia_sin_respuesta', contacto, conversacionId: 41, detalle: 'Nadie contestó.' });
  assert.deepEqual(r, { correo: true, whatsapp: true });
  const s = sesiones.at(-1);
  assert.equal(sesiones.length, n + 1);
  const texto = b64(s.datos.split('\r\n\r\n')[1]);
  assert.match(texto, /Llamada transferida sin respuesta/);
  assert.match(texto, /Carmen Ruiz \(Conservas Ruiz\)/); assert.match(texto, /\+34611222333/);
  assert.match(texto, new RegExp(`https://asistente\\.test/panel#contacto/${contacto.id}`));
  assert.equal(wa[0][0], '+34600000001'); assert.equal(wa[0][1], 'aviso_equipo');
  assert.match(wa[0][3][0].parameters[0].text, /transferida sin respuesta: hay que devolverla · Carmen Ruiz \(\+34611222333\)\. Nadie contestó/);
  assert.doesNotMatch(wa[0][3][0].parameters[0].text, /\n/);
  // El mismo aviso no se repite
  assert.deepEqual(await avisos.avisarEquipo({ tipo: 'transferencia_sin_respuesta', contacto, conversacionId: 41 }), { correo: 'repetido', whatsapp: 'repetido' });
  const ev = db.abrir().prepare(`SELECT datos FROM eventos WHERE tipo = 'aviso_equipo'`).all().map((x) => JSON.parse(x.datos));
  assert.equal(ev.length, 1); assert.equal(ev[0].tipo, 'transferencia_sin_respuesta'); assert.equal(ev[0].correo, true);
  // Sin plantilla ni SMTP: no se envía, pero queda anotado
  C.avisos.plantillaWhatsApp = ''; const host = C.smtp.host; C.smtp.host = '';
  assert.deepEqual(await avisos.avisarEquipo({ tipo: 'urgencia', contacto, detalle: 'x' }), { correo: 'sin configurar', whatsapp: 'sin plantilla' });
  C.smtp.host = host; meta.configurarMeta({ token: '', phoneNumberId: '' });
});

test('WhatsApp: si falla el turno y no se puede enviar la disculpa, no se anota y se avisa al equipo', async () => {
  const canal = await import('../src/whatsapp/canal.js');
  const hubspot = await import('../src/crm/hubspot.js');
  hubspot.configurarHubspot({ token: '' });
  const enviados = [];
  avisos.configurarAvisos({ correo: async (m) => { enviados.push(m); } });
  class ConvRota { constructor(o) { Object.assign(this, o); this.messages = []; } async responder() { throw new Error('API de Claude caída'); } }
  canal.configurarCanal({ Conversacion: ConvRota, agruparMs: 20 });
  canal.procesarWebhook({ entry: [{ changes: [{ field: 'messages', value: { contacts: [{ wa_id: '34622333444', profile: { name: 'Luis' } }], messages: [{ from: '34622333444', id: 'wamid.rota1', type: 'text', text: { body: 'Hola, quería información' } }] } }] }] });
  await canal.esperarColas();
  const c = db.contactoPorTelefono('+34622333444');
  const conv = db.abrir().prepare(`SELECT * FROM conversaciones WHERE contacto_id = ?`).get(c.id);
  const roles = db.mensajes(conv.id).map((m) => m.rol);
  assert.ok(!roles.includes('asistente'), 'la disculpa no enviada no queda como dicha');
  assert.ok(roles.includes('sistema'));
  const ev = db.abrir().prepare(`SELECT datos FROM eventos WHERE tipo = 'whatsapp_error'`).get();
  assert.equal(JSON.parse(ev.datos).contacto, c.id);
  await new Promise((ok) => setTimeout(ok, 30));
  assert.equal(enviados.length, 1);
  assert.match(enviados[0].asunto, /Fallo técnico en WhatsApp · Luis/);
  assert.match(enviados[0].texto, /Tampoco se ha podido enviar la disculpa/);
});
