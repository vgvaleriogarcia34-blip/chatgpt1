// Envío de correo por SMTP, sin dependencias (node:net y node:tls): TLS directo en el puerto 465 y STARTTLS en los
// demás; autenticación AUTH PLAIN. Nunca manda la contraseña sin cifrar salvo a un servidor local (pruebas).
import net from 'node:net';
import tls from 'node:tls';
import crypto from 'node:crypto';
import os from 'node:os';
import { C } from './config.js';

export const smtpConfigurado = (s = C.smtp) => !!(s.host && s.de);

const sinSaltos = (t) => String(t ?? '').replace(/[\r\n]+/g, ' ').trim();
/** «Nombre <correo>» o «correo» → correo */
const direccion = (t) => { const m = sinSaltos(t).match(/<([^<>\s]+@[^<>\s]+)>/); return (m ? m[1] : sinSaltos(t)).replace(/[<>\s]/g, ''); };
const b64 = (t) => Buffer.from(String(t), 'utf8').toString('base64');
/** Cabecera con texto no ASCII (RFC 2047). */
const cabecera = (t) => (/^[\x20-\x7e]*$/.test(t) ? t : `=?UTF-8?B?${b64(t)}?=`);
const local = (h) => /^(localhost|127\.\d+\.\d+\.\d+|::1)$/.test(h);

/** Mensaje RFC 5322 en texto plano UTF-8 (cuerpo en base64, líneas de 76). */
export function componerMensaje({ de, para, asunto, texto, fecha = new Date() }) {
  const nombreDe = sinSaltos(de).replace(/<[^>]*>/, '').replace(/"/g, '').trim();
  const lineas = [
    `From: ${nombreDe ? `${cabecera(nombreDe)} <${direccion(de)}>` : direccion(de)}`,
    `To: ${para.map(direccion).join(', ')}`,
    `Subject: ${cabecera(sinSaltos(asunto).slice(0, 200))}`,
    `Date: ${fecha.toUTCString().replace('GMT', '+0000')}`,
    `Message-ID: <${crypto.randomUUID()}@${direccion(de).split('@')[1] || 'asistente'}>`,
    'MIME-Version: 1.0', 'Content-Type: text/plain; charset=utf-8', 'Content-Transfer-Encoding: base64',
    '', ...(b64(String(texto ?? '').replace(/\r?\n/g, '\r\n')).match(/.{1,76}/g) || ['']),
  ];
  return lineas.join('\r\n');
}

/** Conversación SMTP sobre un socket: lee respuestas completas (multilínea) y manda órdenes. */
function canal(socket) {
  let buf = '', esperando = null, cola = [];
  const alDato = (d) => {
    buf += d.toString('utf8');
    for (;;) {
      const lineas = buf.split('\r\n');
      const fin = lineas.findIndex((l) => /^\d{3} /.test(l) || /^\d{3}$/.test(l));
      if (fin < 0) return;
      const resp = lineas.slice(0, fin + 1);
      buf = lineas.slice(fin + 1).join('\r\n');
      const r = { codigo: Number(resp[fin].slice(0, 3)), texto: resp.map((l) => l.slice(4)).join('\n') };
      if (esperando) { const e = esperando; esperando = null; e.ok(r); } else cola.push(r);
    }
  };
  const alError = (err) => { if (esperando) { const e = esperando; esperando = null; e.ko(err); } };
  socket.on('data', alDato); socket.on('error', alError);
  socket.on('close', () => alError(new Error('El servidor SMTP cerró la conexión')));
  const leer = () => (cola.length ? Promise.resolve(cola.shift()) : new Promise((ok, ko) => { esperando = { ok, ko }; }));
  return {
    leer,
    soltar() { socket.off('data', alDato); socket.off('error', alError); socket.removeAllListeners('close'); },
    async orden(linea, esperado) {
      if (linea !== null) socket.write(linea + '\r\n');
      const r = await leer();
      const ok = Array.isArray(esperado) ? esperado.includes(r.codigo) : r.codigo === esperado;
      if (!ok) throw Object.assign(new Error(`SMTP ${r.codigo}: ${r.texto.slice(0, 200)}`), { codigo: r.codigo });
      return r;
    },
  };
}

const conectar = (s) => new Promise((ok, ko) => {
  const op = { host: s.host, port: s.puerto, servername: net.isIP(s.host) ? undefined : s.host };
  const sock = s.puerto === 465 ? tls.connect(op, () => ok(sock)) : net.connect(op, () => ok(sock));
  sock.once('error', ko);
});
const cifrar = (sock, s) => new Promise((ok, ko) => {
  const t = tls.connect({ socket: sock, servername: net.isIP(s.host) ? undefined : s.host }, () => ok(t));
  t.once('error', ko);
});

/**
 * Abre la sesión (saludo, EHLO, STARTTLS si se ofrece, AUTH si hay usuario) y ejecuta fn(c) con ella.
 * @returns el valor de fn
 */
async function sesionSmtp(s, fn) {
  let sock = await conectar(s);
  sock.setTimeout(s.timeoutMs || 15000, () => sock.destroy(new Error('Tiempo agotado con el servidor SMTP')));
  let c = canal(sock);
  try {
    await c.orden(null, 220);
    const yo = os.hostname().replace(/[^\w.-]/g, '') || 'asistente';
    let ehlo = await c.orden(`EHLO ${yo}`, 250);
    let cifrado = s.puerto === 465;
    if (!cifrado && /(^|\n)STARTTLS/i.test(ehlo.texto)) {
      await c.orden('STARTTLS', 220);
      c.soltar();
      sock = await cifrar(sock, s);
      sock.setTimeout(s.timeoutMs || 15000, () => sock.destroy(new Error('Tiempo agotado con el servidor SMTP')));
      c = canal(sock); cifrado = true;
      ehlo = await c.orden(`EHLO ${yo}`, 250);
    }
    if (s.usuario) {
      if (!cifrado && !local(s.host)) throw new Error('El servidor SMTP no ofrece STARTTLS: no se envía la contraseña sin cifrar');
      await c.orden(`AUTH PLAIN ${b64(`\0${s.usuario}\0${s.clave || ''}`)}`, 235);
    }
    const r = await fn(c);
    try { await c.orden('QUIT', [221, 250]); } catch {}
    return r;
  } finally { sock.destroy(); }
}

/**
 * Envía un correo de texto. para: dirección o lista.
 * @returns {Promise<{ok:true}>} o lanza un error con el motivo
 */
export async function enviarCorreo({ para, asunto, texto }, s = C.smtp) {
  if (!smtpConfigurado(s)) throw new Error('SMTP no configurado (SMTP_HOST y SMTP_FROM)');
  const destinos = (Array.isArray(para) ? para : String(para || '').split(',')).map(direccion).filter((x) => /^[^\s@]+@[^\s@]+$/.test(x));
  if (!destinos.length) throw new Error('No hay destinatario válido');
  const mensaje = componerMensaje({ de: s.de, para: destinos, asunto, texto });
  await sesionSmtp(s, async (c) => {
    await c.orden(`MAIL FROM:<${direccion(s.de)}>`, 250);
    for (const d of destinos) await c.orden(`RCPT TO:<${d}>`, [250, 251]);
    await c.orden('DATA', 354);
    // Transparencia: una línea que empieza por «.» se dobla
    await c.orden(mensaje.split('\r\n').map((l) => (l.startsWith('.') ? '.' + l : l)).join('\r\n') + '\r\n.', 250);
  });
  return { ok: true };
}

/** Comprueba que el servidor responde y acepta la autenticación (sin enviar nada). */
export async function comprobarSmtp(s = C.smtp) {
  if (!smtpConfigurado(s)) throw new Error('SMTP no configurado');
  await sesionSmtp({ ...s, timeoutMs: 6000 }, async () => true);
  return true;
}
