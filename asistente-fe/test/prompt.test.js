// Instrucciones de la asistente: presentación, responsable de los datos, sesión estratégica y privacidad, todo en castellano.
import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.URL_PRIVACIDAD = 'https://atalaya.ejemplo.es/privacidad.html#asistente';
delete process.env.REUNION_MINUTOS; delete process.env.RESPONSABLE_NOMBRE; delete process.env.ASISTENTE_NOMBRE;
const { sistema, contextoInicial } = await import('../src/cerebro/prompt.js');
const { DEFINICIONES } = await import('../src/cerebro/herramientas.js');
const { C } = await import('../src/config.js');

test('presentación, marca y responsable de los datos', () => {
  for (const canal of ['voz', 'whatsapp']) {
    const t = sistema(canal)[1].text;
    assert.match(t, /Soy Lucía, la asistente de inteligencia artificial de Familias Empresarias, de Business Avance/);
    assert.match(t, /AKOMPANO GROUP, S\.L\. \(NIF B05544713\), nombre comercial Business Avance International Consulting/);
    assert.match(t, /https:\/\/atalaya\.ejemplo\.es\/privacidad\.html#asistente/);
    assert.match(t, /dar_de_baja/);
  }
});

test('primera reunión: sesión estratégica de 60 minutos con Valerio García, sin coste; nunca «diagnóstico»', () => {
  assert.equal(C.agenda.duracionMin, 60);
  const t = sistema('voz')[1].text;
  assert.match(t, /una sesión estratégica de 60 minutos con Valerio García, sin coste y sin compromiso/);
  assert.doesNotMatch(t, /reunión de diagnóstico|diagnóstico de \d+ minutos|primera reunión de diagnóstico/i);
});

test('sin instrucciones en inglés y con la fecha pedida en finalizar', () => {
  const t = sistema('voz').map((b) => b.text).slice(1).join('\n');
  assert.doesNotMatch(t, /Latency|begin your|immediately/i);
  assert.match(t, /empiece su respuesta visible de inmediato/);
  const fin = DEFINICIONES.find((d) => d.name === 'finalizar');
  assert.ok(fin.input_schema.properties.volver_a_llamar);
  assert.ok(DEFINICIONES.find((d) => d.name === 'registrar_nota').input_schema.properties.urgente);
  assert.match(contextoInicial({ canal: 'voz', direccion: 'entrante' }), /asistente de IA/);
});

test('URL_PRIVACIDAD por defecto: la de Atalaya si hay ATALAYA_URL; sin ninguna, el asistente no promete el enlace', async () => {
  const { execFileSync } = await import('node:child_process');
  const leer = (env) => JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e',
    "const { C } = await import('./src/config.js'); const { sistema } = await import('./src/cerebro/prompt.js'); console.log(JSON.stringify({ url: C.empresa.urlPrivacidad, voz: sistema('voz')[1].text, wa: sistema('whatsapp')[1].text }));"],
  { cwd: new URL('..', import.meta.url), env: { PATH: process.env.PATH, NODE_TEST_CONTEXT: '1', ...env }, encoding: 'utf8' }).trim().split('\n').at(-1));
  let r = leer({ ATALAYA_URL: 'https://atalaya.ejemplo.es/' });
  assert.equal(r.url, 'https://atalaya.ejemplo.es/privacidad.html#asistente');
  assert.match(r.voz, /envíele el enlace por WhatsApp|ofrezca enviarle el enlace por WhatsApp \(https:\/\/atalaya\.ejemplo\.es\/privacidad\.html#asistente\)/);
  r = leer({ ATALAYA_URL: 'https://atalaya.ejemplo.es', URL_PRIVACIDAD: 'https://otra.es/privacidad' });
  assert.equal(r.url, 'https://otra.es/privacidad');
  r = leer({});
  assert.equal(r.url, '');
  assert.doesNotMatch(r.voz, /enviarle el enlace/); assert.match(r.voz, /el equipo se la hará llegar/);
  assert.doesNotMatch(r.wa, /política de privacidad \(/);
});
