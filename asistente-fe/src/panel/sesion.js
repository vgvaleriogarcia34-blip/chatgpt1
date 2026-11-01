// Acceso al panel: usuario y contraseña (PANEL_USUARIO / PANEL_CLAVE) y cookie HttpOnly firmada con HMAC.
// Sin PANEL_CLAVE el panel está desactivado. La firma usa PANEL_SECRETO o, si no existe, una clave aleatoria
// (las sesiones caducan al reiniciar el servidor).
import crypto from 'node:crypto';
import { C } from '../config.js';

const NOMBRE = 'fe_panel';
const DURACION_H = 12;
const secreto = () => (process.env.PANEL_SECRETO ||= crypto.randomBytes(32).toString('hex'));

export const panelActivo = () => !!C.panel.clave;

const firmar = (datos) => crypto.createHmac('sha256', secreto()).update(datos).digest('base64url');
const igual = (a, b) => {
  const x = crypto.createHash('sha256').update(String(a)).digest(), y = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(x, y);
};

export function comprobarCredenciales(usuario, clave) {
  if (!panelActivo()) return false;
  // Se evalúan las dos comparaciones siempre, para no dar pistas por el tiempo de respuesta
  const u = igual(usuario ?? '', C.panel.usuario), k = igual(clave ?? '', C.panel.clave);
  return u && k;
}

/** Valor de la cookie: datos en base64url + firma. sid identifica la sesión (p. ej. para el chat de prueba). */
export function crearCookie(usuario, ahora = Date.now()) {
  const datos = Buffer.from(JSON.stringify({ u: usuario, exp: ahora + DURACION_H * 3600e3, sid: crypto.randomBytes(12).toString('hex') })).toString('base64url');
  return `${datos}.${firmar(datos)}`;
}

export function leerCookies(req) {
  return Object.fromEntries(String(req.headers.cookie || '').split(';').map((x) => x.trim().split('=')).filter((x) => x[0]).map(([k, ...v]) => [k, v.join('=')]));
}

/** Sesión válida de la petición ({ u, exp, sid }) o null. */
export function sesion(req, ahora = Date.now()) {
  if (!panelActivo()) return null;
  const v = leerCookies(req)[NOMBRE];
  if (!v) return null;
  const [datos, firma] = v.split('.');
  if (!datos || !firma || !igual(firma, firmar(datos))) return null;
  try {
    const s = JSON.parse(Buffer.from(datos, 'base64url').toString());
    return s.exp > ahora ? s : null;
  } catch { return null; }
}

const seguro = (req) => C.urlPublica.startsWith('https://') || req.headers['x-forwarded-proto'] === 'https';
export function cabeceraCookie(req, valor) {
  return `${NOMBRE}=${valor}; Path=/panel; HttpOnly; SameSite=Strict; Max-Age=${valor ? DURACION_H * 3600 : 0}${seguro(req) ? '; Secure' : ''}`;
}

// Freno a los intentos de acceso: 5 fallos en 15 minutos por dirección bloquean esa dirección 15 minutos
const FALLOS = new Map();
const VENTANA = 15 * 60e3;
const ip = (req) => req.socket?.remoteAddress || 'desconocida';
export function bloqueado(req, ahora = Date.now()) {
  const f = FALLOS.get(ip(req));
  if (f && ahora - f.desde > VENTANA) { FALLOS.delete(ip(req)); return false; }
  return !!f && f.n >= 5;
}
export function anotarFallo(req, ahora = Date.now()) {
  const f = FALLOS.get(ip(req));
  if (!f || ahora - f.desde > VENTANA) FALLOS.set(ip(req), { n: 1, desde: ahora }); else f.n++;
  if (FALLOS.size > 10000) FALLOS.clear();
}
export const limpiarFallos = (req) => FALLOS.delete(ip(req));
