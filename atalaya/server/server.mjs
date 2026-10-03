// Atalaya · Servidor
// Sirve la web, gestiona cuentas, control de acceso por pago, horas de uso y datos por usuario,
// y conecta el asistente, la extracción de documentos y el agente de mercado con la API de Claude.
//
// Arranque:  cd atalaya/server && npm install && ANTHROPIC_API_KEY=... node server.mjs
// Sin clave de API todo funciona salvo las funciones de IA (el asistente pasa a su modo básico).

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, '..');
const DATA_DIR = process.env.ATALAYA_DATA || path.join(here, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const PORT = +process.env.PORT || 8080;
const COOKIE = 'atalaya_sid';
const SESSION_DAYS = 30;
const MODEL = process.env.ATALAYA_MODEL || 'claude-opus-5-5';
const ADMIN_COOKIE = 'atalaya_adm';
const ADMIN_HOURS = 12;
const APP_URL = (process.env.APP_URL || `http://localhost:${PORT}`).replace(/\/$/, '');
const PRUEBA_DIAS = 14;
const PLANES = ['esencial', 'profesional', 'consultora', 'grupos'];
const PERIODOS = ['mensual', 'anual'];
const MAX_BODY = 4 * 1024 * 1024;

/* ---------- Base de datos en un fichero JSON (escritura atómica) ---------- */
fs.mkdirSync(DATA_DIR, { recursive: true });
let db = { users: [], sessions: {}, data: {}, mercado: {}, admin: null, adminSessions: {}, resets: {} };
try { db = Object.assign(db, JSON.parse(fs.readFileSync(DB_FILE, 'utf8'))); } catch { /* base nueva */ }
db.adminSessions = db.adminSessions || {}; db.resets = db.resets || {};
// La administración ya no es una cuenta de usuario: las cuentas que lo eran pasan a cliente con acceso de cortesía
db.users.forEach((u) => { if (u.rol === 'admin') { u.rol = 'cliente'; u.pagado = true; u.venceAcceso = null; u.estado = 'activo'; u.nota = ((u.nota || '') + ' Antigua cuenta de administración: acceso sin vencimiento.').trim(); } });
let saveTimer = null;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const tmp = DB_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(db));
    fs.renameSync(tmp, DB_FILE);
  }, 300);
}

/* ---------- Utilidades ---------- */
const now = () => new Date().toISOString();
const today = () => now().slice(0, 10);
const uid = () => 'u' + crypto.randomBytes(8).toString('hex');
const hashPw = (pw, salt) => crypto.scryptSync(pw, salt, 64).toString('hex');
const pub = (u) => { if (!u) return null; const { hash, salt, ...rest } = u; return rest; };
function access(u) {
  if (!u) return { ok: false, motivo: 'sin-sesion' };
  if (u.estado === 'bloqueado') return { ok: false, motivo: 'bloqueado' };
  if (u.pagado && (!u.venceAcceso || Date.parse(u.venceAcceso) > Date.now())) return { ok: true, motivo: 'pagado' };
  if (!u.pagado && Date.parse(u.alta) + PRUEBA_DIAS * 864e5 > Date.now()) return { ok: true, motivo: 'prueba' };
  return { ok: false, motivo: 'pago' };
}
function cookies(req) {
  return Object.fromEntries((req.headers.cookie || '').split(';').map((c) => c.trim().split('=')).filter((p) => p[0]).map(([k, ...v]) => [k, decodeURIComponent(v.join('='))]));
}
function currentUser(req) {
  const sid = cookies(req)[COOKIE];
  const s = sid && db.sessions[sid];
  if (!s || Date.parse(s.exp) < Date.now()) return null;
  return db.users.find((u) => u.id === s.userId) || null;
}
function startSession(res, u) {
  const sid = crypto.randomBytes(32).toString('hex');
  db.sessions[sid] = { userId: u.id, exp: new Date(Date.now() + SESSION_DAYS * 864e5).toISOString() };
  const secure = process.env.COOKIE_SECURE === '1' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${COOKIE}=${sid}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_DAYS * 86400}${secure}`);
}
/* ---------- Administración: contraseña propia, separada de las cuentas de usuario ---------- */
const sha = (t) => crypto.createHash('sha256').update(t).digest('hex');
const safeEq = (a, b) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
function setAdminPassword(pw) { const salt = crypto.randomBytes(16).toString('hex'); db.admin = { salt, hash: hashPw(pw, salt), cambiado: now() }; db.adminSessions = {}; save(); }
if (process.env.ADMIN_PASSWORD) {
  const pw = process.env.ADMIN_PASSWORD;
  if (pw.length < 10) console.warn('ADMIN_PASSWORD debe tener al menos 10 caracteres; se ignora.');
  else if (!db.admin || !safeEq(hashPw(pw, db.admin.salt), db.admin.hash)) setAdminPassword(pw);
}
// Sin contraseña de administración: código de configuración de un solo uso que solo ve quien arranca el servidor
let setupCode = null;
if (!db.admin) { setupCode = crypto.randomBytes(5).toString('hex').toUpperCase(); console.log(`\n  Configura la administración en ${APP_URL}/admin.html con este código: ${setupCode}\n  (o arranca con ADMIN_PASSWORD=...)\n`); }
function isAdmin(req) {
  const sid = cookies(req)[ADMIN_COOKIE];
  const s = sid && db.adminSessions[sid];
  return !!(db.admin && s && Date.parse(s.exp) > Date.now());
}
function startAdminSession(res) {
  const sid = crypto.randomBytes(32).toString('hex');
  db.adminSessions[sid] = { exp: new Date(Date.now() + ADMIN_HOURS * 3600e3).toISOString() };
  Object.keys(db.adminSessions).forEach((k) => { if (Date.parse(db.adminSessions[k].exp) < Date.now()) delete db.adminSessions[k]; });
  const secure = process.env.COOKIE_SECURE === '1' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${ADMIN_COOKIE}=${sid}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${ADMIN_HOURS * 3600}${secure}`);
  save();
}
/* ---------- Recuperación de contraseña ---------- */
const RESET_MIN = 60;
function newResetToken(u, por, minutos) {
  Object.keys(db.resets).forEach((k) => { if (db.resets[k].userId === u.id || Date.parse(db.resets[k].exp) < Date.now()) delete db.resets[k]; });
  const token = crypto.randomBytes(32).toString('hex');
  db.resets[sha(token)] = { userId: u.id, exp: new Date(Date.now() + (minutos || RESET_MIN) * 60e3).toISOString(), por, creado: now() };
  save();
  return token;
}
let mailer = null;
async function sendMail(to, subject, text) {
  if (!process.env.SMTP_HOST) return false;
  try {
    if (!mailer) {
      const { default: nodemailer } = await import('nodemailer');
      mailer = nodemailer.createTransport({ host: process.env.SMTP_HOST, port: +process.env.SMTP_PORT || 587, secure: process.env.SMTP_SECURE === '1', auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined });
    }
    await mailer.sendMail({ from: process.env.SMTP_FROM || process.env.SMTP_USER, to, subject, text });
    return true;
  } catch (e) { console.error('Correo:', e.message); return false; }
}

function send(res, code, body) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', (c) => { size += c.length; if (size > MAX_BODY) { reject(new Error('Petición demasiado grande')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => { try { resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}); } catch { reject(new Error('JSON no válido')); } });
    req.on('error', reject);
  });
}
const attempts = new Map();
function rateLimited(ip) {
  const a = (attempts.get(ip) || []).filter((t) => Date.now() - t < 15 * 60e3);
  attempts.set(ip, a);
  return a.length >= 10;
}

/* ---------- Claude (opcional) ---------- */
let anthropic = null;
async function claude() {
  if (anthropic !== null) return anthropic;
  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN && process.env.ATALAYA_IA !== '1') return (anthropic = false);
  try {
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    anthropic = new Anthropic();
  } catch { anthropic = false; }
  return anthropic;
}
// Llamada con reintento automático en otro modelo si un clasificador rechaza la petición
async function ask(params) {
  const c = await claude();
  if (!c) throw Object.assign(new Error('La IA no está configurada en el servidor'), { code: 503 });
  return c.beta.messages.create({
    model: MODEL, max_tokens: 16000, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default', ...params
  });
}
const textOf = (msg) => msg.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n');
function jsonOf(text) {
  const a = text.indexOf('{'), b = text.lastIndexOf('}');
  if (a < 0 || b < a) throw new Error('La respuesta no contiene JSON');
  return JSON.parse(text.slice(a, b + 1));
}

const SYSTEM_CHAT = `Eres el asistente de Atalaya, un simulador de inversión y crecimiento para empresarios de pymes españolas, muchos sin formación financiera.
Habla en español claro, con frases cortas y sin jerga; si usas un término técnico, explícalo en una frase.
Antes de opinar sobre la situación de la empresa, consulta la herramienta ver_situacion. No inventes cifras: usa las del simulador.
Cuando el usuario pida cambiar algo, hazlo con las herramientas y después explica qué ha cambiado (antes → ahora) y qué significa.
Si expresa una preocupación, identifica qué semáforos y variables la afectan y propone de una a tres acciones concretas con cifras, empezando por las más sencillas.
Para estructuras societarias y relaciones entre sociedades de un grupo, explica cómo funcionan con ejemplos y recuerda que la fiscalidad la debe confirmar su asesor.
Responde en 3-8 frases salvo que pidan detalle. Tus respuestas pueden leerse en voz alta: no uses tablas, asteriscos ni símbolos.`;

// Fuentes oficiales para el análisis de mercado
const FUENTES_OFICIALES = ['ine.es', 'bde.es', 'ecb.europa.eu', 'ec.europa.eu', 'imf.org', 'oecd.org', 'worldbank.org', 'boe.es', 'agenciatributaria.es', 'seg-social.es', 'sepe.es', 'cnmc.es', 'economia.gob.es', 'mintur.gob.es', 'mapa.gob.es', 'transportes.gob.es', 'mites.gob.es', 'hacienda.gob.es', 'airef.es', 'cis.es', 'icex.es', 'camara.es', 'cepyme.es', 'ceoe.es'];

async function agenteMercado(perfil) {
  const ctx = JSON.stringify(perfil).slice(0, 6000);
  const pedir = async (instr, domains) => {
    const tools = [{ type: 'web_search_20260209', name: 'web_search', max_uses: 8, ...(domains ? { allowed_domains: domains } : {}) }];
    let messages = [{ role: 'user', content: instr }];
    for (let i = 0; i < 4; i++) {
      const r = await ask({ messages, tools, output_config: { effort: 'medium' } });
      if (r.stop_reason === 'pause_turn') { messages = messages.concat([{ role: 'assistant', content: r.content }]); continue; }
      if (r.stop_reason === 'refusal') throw new Error('La consulta fue rechazada');
      return jsonOf(textOf(r));
    }
    throw new Error('La búsqueda no terminó a tiempo');
  };
  const macro = await pedir(`Fecha de hoy: ${today()}. Empresa: ${ctx}.
Busca en fuentes oficiales los datos más recientes y devuelve SOLO un objeto JSON con esta forma:
{"resumen": "3-4 frases", "macroGlobal":[{"indicador","valor","tendencia":"sube|baja|estable","fecha","fuente","url","impacto":"qué supone para esta empresa"}],
"macroEspana":[igual], "sector":{"nombre","situacion","crecimiento","tendencias":[],"riesgos":[],"oportunidades":[],"fuentes":[{"nombre","url"}]},
"porCliente":[{"target","riesgo","oportunidad","nivel":1-5}], "porProducto":[{"tipologia","riesgo","oportunidad","nivel":1-5}],
"implicaciones":[{"plan":"financiero|comercial|compras|personas|expansion|operaciones|fiscal","accion","prioridad":"alta|media|baja"}],
"ajustesEscenario":{"ventasF":número entre 0.5 y 1.3 o null,"tipoDelta":puntos o null,"margenDelta":puntos o null,"dsoDelta":días o null,"justificacion"}}
Incluye al menos: crecimiento del PIB mundial y de la zona euro, tipos del BCE y Euríbor, inflación (IPC) de España, paro, PIB de España, y los indicadores del sector. Cita fecha y fuente de cada dato. No inventes valores: si no encuentras uno, omítelo.`, FUENTES_OFICIALES);
  let comp = { competencia: [] };
  try {
    comp = await pedir(`Fecha de hoy: ${today()}. Empresa: ${ctx}.
Identifica sus principales competidores en España en su sector y tipologías de producto. Prioriza registros oficiales, informes sectoriales y webs de las propias empresas.
Devuelve SOLO un JSON: {"competencia":[{"nombre","posicion":"líder|retador|nicho|nuevo entrante","fortalezas","amenaza":1-5,"fuente","url"}]}`);
  } catch { /* la competencia es opcional */ }
  return Object.assign(macro, comp, { fecha: now() });
}

/* ---------- API ---------- */
const routes = [];
const route = (method, re, fn, opts = {}) => routes.push({ method, re, fn, opts });

route('GET', /^\/api\/health$/, async () => ({ atalaya: true, ia: !!(await claude()), version: 2 }), { public: true });

route('POST', /^\/api\/register$/, async (req, res, body) => {
  const email = String(body.email || '').trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw Object.assign(new Error('Correo no válido'), { code: 400 });
  if (String(body.password || '').length < 8) throw Object.assign(new Error('La contraseña debe tener al menos 8 caracteres'), { code: 400 });
  if (db.users.some((u) => u.email === email)) throw Object.assign(new Error('Ya hay una cuenta con ese correo'), { code: 409 });
  const salt = crypto.randomBytes(16).toString('hex');
  const u = {
    id: uid(), nombre: String(body.nombre || '').slice(0, 120), email, empresa: String(body.empresa || '').slice(0, 160), telefono: String(body.telefono || '').slice(0, 40),
    plan: PLANES.includes(body.plan) ? body.plan : 'profesional', periodo: PERIODOS.includes(body.periodo) ? body.periodo : 'mensual', rol: 'cliente',
    estado: 'prueba', pagado: false, venceAcceso: null, alta: now(), ultimoAcceso: now(), sesiones: 1, uso: {}, pagos: [], salt, hash: hashPw(body.password, salt)
  };
  db.users.push(u); save(); startSession(res, u);
  return { user: pub(u) };
}, { public: true });

route('POST', /^\/api\/login$/, async (req, res, body) => {
  const ip = req.socket.remoteAddress;
  if (rateLimited(ip)) throw Object.assign(new Error('Demasiados intentos. Espera unos minutos.'), { code: 429 });
  const u = db.users.find((x) => x.email === String(body.email || '').trim().toLowerCase());
  const ok = u && crypto.timingSafeEqual(Buffer.from(hashPw(String(body.password || ''), u.salt), 'hex'), Buffer.from(u.hash, 'hex'));
  if (!ok) { attempts.get(ip).push(Date.now()); throw Object.assign(new Error('Correo o contraseña incorrectos'), { code: 401 }); }
  u.ultimoAcceso = now(); u.sesiones = (u.sesiones || 0) + 1; save(); startSession(res, u);
  return { user: pub(u) };
}, { public: true });

route('POST', /^\/api\/logout$/, async (req, res) => {
  const sid = cookies(req)[COOKIE]; if (sid) { delete db.sessions[sid]; save(); }
  res.setHeader('Set-Cookie', `${COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`);
  return { ok: true };
}, { public: true });

route('GET', /^\/api\/me$/, async (req, res, body, u) => ({ user: pub(u) }), { noAccess: true });
route('PATCH', /^\/api\/me$/, async (req, res, body, u) => {
  ['nombre', 'empresa', 'telefono'].forEach((k) => { if (typeof body[k] === 'string') u[k] = body[k].slice(0, 160); });
  if (PLANES.includes(body.plan) && body.plan !== u.plan) {
    // Bajar a un plan con menos empresas exige borrar antes las que sobran
    const lim = LIMITE_EMPRESAS[body.plan];
    if (nEmpresas(u) > lim) throw Object.assign(new Error(`Tienes ${nEmpresas(u)} empresas y ese plan admite ${lim}. Borra antes las que sobran.`), { code: 400 });
    (u.cambiosPlan = u.cambiosPlan || []).push({ de: u.plan, a: body.plan, fecha: now() });
    u.plan = body.plan;
  }
  if (PERIODOS.includes(body.periodo)) u.periodo = body.periodo;
  save(); return { user: pub(u) };
}, { noAccess: true });
// Solicitudes de contacto para el plan Grupos (a medida): públicas, con límite de intentos
route('POST', /^\/api\/contacto$/, async (req, res, body) => {
  const ip = req.socket.remoteAddress;
  if (rateLimited(ip)) throw Object.assign(new Error('Demasiados envíos. Espera unos minutos.'), { code: 429 });
  attempts.get(ip).push(Date.now());
  const t = (k, n) => String(body[k] || '').slice(0, n || 160);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(t('email'))) throw Object.assign(new Error('Escribe un correo válido'), { code: 400 });
  db.contactos = db.contactos || [];
  db.contactos.unshift({ fecha: now(), plan: t('plan', 20), nombre: t('nombre'), email: t('email'), telefono: t('telefono', 40), empresa: t('empresa'), sociedades: t('sociedades', 6), mensaje: t('mensaje', 2000), origen: t('origen', 40) });
  db.contactos = db.contactos.slice(0, 500); save();
  return { ok: true };
}, { public: true });
route('GET', /^\/api\/admin\/contactos$/, async () => ({ contactos: db.contactos || [] }), { admin: true });
// Comprueba la contraseña antes de una acción irreversible (borrar una empresa)
route('POST', /^\/api\/me\/verificar$/, async (req, res, body, u) => {
  const ip = req.socket.remoteAddress;
  if (rateLimited(ip)) throw Object.assign(new Error('Demasiados intentos. Espera unos minutos.'), { code: 429 });
  const ok = crypto.timingSafeEqual(Buffer.from(hashPw(String(body.password || ''), u.salt), 'hex'), Buffer.from(u.hash, 'hex'));
  if (!ok) attempts.get(ip).push(Date.now());
  return { ok };
}, { noAccess: true });
route('POST', /^\/api\/me\/solicitar-pago$/, async (req, res, body, u) => { u.solicitudPago = now(); save(); return { ok: true }; }, { noAccess: true });
route('POST', /^\/api\/me\/password$/, async (req, res, body, u) => {
  if (!safeEq(hashPw(String(body.actual || ''), u.salt), u.hash)) throw Object.assign(new Error('La contraseña actual no es correcta'), { code: 400 });
  if (String(body.nueva || '').length < 8) throw Object.assign(new Error('La nueva contraseña debe tener al menos 8 caracteres'), { code: 400 });
  u.salt = crypto.randomBytes(16).toString('hex'); u.hash = hashPw(body.nueva, u.salt);
  const sid = cookies(req)[COOKIE]; Object.keys(db.sessions).forEach((k) => { if (db.sessions[k].userId === u.id && k !== sid) delete db.sessions[k]; });
  save(); return { ok: true };
}, { noAccess: true });

// «He olvidado mi contraseña»: siempre responde igual para no revelar qué correos existen
route('POST', /^\/api\/password\/olvido$/, async (req, res, body) => {
  const ip = req.socket.remoteAddress;
  if (rateLimited(ip)) throw Object.assign(new Error('Demasiados intentos. Espera unos minutos.'), { code: 429 });
  attempts.get(ip).push(Date.now());
  const u = db.users.find((x) => x.email === String(body.email || '').trim().toLowerCase());
  let correo = !!process.env.SMTP_HOST;
  if (u) {
    const token = newResetToken(u, 'usuario');
    const link = `${APP_URL}/acceso.html#reset=${token}`;
    const sent = await sendMail(u.email, 'Atalaya · Restablecer tu contraseña', `Hola${u.nombre ? ' ' + u.nombre : ''}:\n\nPara crear una contraseña nueva abre este enlace (caduca en ${RESET_MIN} minutos):\n${link}\n\nSi no lo has pedido tú, ignora este mensaje.`);
    if (!sent) { u.solicitudReset = now(); save(); console.log(`Recuperación de contraseña para ${u.email}: ${link}`); }
  }
  return { ok: true, correo };
}, { public: true });
route('POST', /^\/api\/password\/restablecer$/, async (req, res, body) => {
  const r = db.resets[sha(String(body.token || ''))];
  if (!r || Date.parse(r.exp) < Date.now()) throw Object.assign(new Error('El enlace no es válido o ha caducado. Pide uno nuevo.'), { code: 400 });
  if (String(body.password || '').length < 8) throw Object.assign(new Error('La contraseña debe tener al menos 8 caracteres'), { code: 400 });
  const u = db.users.find((x) => x.id === r.userId); if (!u) throw Object.assign(new Error('Usuario no encontrado'), { code: 404 });
  u.salt = crypto.randomBytes(16).toString('hex'); u.hash = hashPw(body.password, u.salt); delete u.solicitudReset;
  delete db.resets[sha(String(body.token))];
  Object.keys(db.sessions).forEach((k) => { if (db.sessions[k].userId === u.id) delete db.sessions[k]; });
  u.ultimoAcceso = now(); save(); startSession(res, u);
  return { user: pub(u) };
}, { public: true });

// Acceso de administración
route('GET', /^\/api\/admin\/estado$/, async (req) => ({ configurado: !!db.admin, sesion: isAdmin(req), correo: !!process.env.SMTP_HOST }), { public: true });
route('POST', /^\/api\/admin\/configurar$/, async (req, res, body) => {
  if (db.admin) throw Object.assign(new Error('La administración ya está configurada'), { code: 409 });
  const ip = req.socket.remoteAddress;
  if (rateLimited(ip)) throw Object.assign(new Error('Demasiados intentos. Espera unos minutos.'), { code: 429 });
  if (!setupCode || String(body.codigo || '').trim().toUpperCase() !== setupCode) { attempts.get(ip).push(Date.now()); throw Object.assign(new Error('Código de configuración incorrecto (se muestra en la consola del servidor)'), { code: 401 }); }
  if (String(body.password || '').length < 10) throw Object.assign(new Error('La contraseña de administración debe tener al menos 10 caracteres'), { code: 400 });
  setAdminPassword(String(body.password)); setupCode = null; startAdminSession(res);
  return { ok: true };
}, { public: true });
route('POST', /^\/api\/admin\/login$/, async (req, res, body) => {
  const ip = req.socket.remoteAddress;
  if (rateLimited(ip)) throw Object.assign(new Error('Demasiados intentos. Espera unos minutos.'), { code: 429 });
  if (!db.admin || !safeEq(hashPw(String(body.password || ''), db.admin.salt), db.admin.hash)) { attempts.get(ip).push(Date.now()); throw Object.assign(new Error('Contraseña de administración incorrecta'), { code: 401 }); }
  startAdminSession(res); return { ok: true };
}, { public: true });
route('POST', /^\/api\/admin\/logout$/, async (req, res) => {
  const sid = cookies(req)[ADMIN_COOKIE]; if (sid) { delete db.adminSessions[sid]; save(); }
  res.setHeader('Set-Cookie', `${ADMIN_COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`);
  return { ok: true };
}, { public: true });
route('POST', /^\/api\/admin\/password$/, async (req, res, body) => {
  if (!safeEq(hashPw(String(body.actual || ''), db.admin.salt), db.admin.hash)) throw Object.assign(new Error('La contraseña actual no es correcta'), { code: 400 });
  if (String(body.nueva || '').length < 10) throw Object.assign(new Error('La nueva contraseña debe tener al menos 10 caracteres'), { code: 400 });
  setAdminPassword(String(body.nueva)); startAdminSession(res); return { ok: true };
}, { admin: true });
// La administración pone directamente una contraseña nueva a un usuario (se cierran sus sesiones abiertas)
route('POST', /^\/api\/admin\/users\/([\w-]+)\/password$/, async (req, res, body, me, m) => {
  const u = db.users.find((x) => x.id === m[1]); if (!u) throw Object.assign(new Error('Usuario no encontrado'), { code: 404 });
  if (String(body.password || '').length < 8) throw Object.assign(new Error('La contraseña debe tener al menos 8 caracteres'), { code: 400 });
  u.salt = crypto.randomBytes(16).toString('hex'); u.hash = hashPw(String(body.password), u.salt); delete u.solicitudReset; u.passwordCambiada = now();
  Object.keys(db.sessions).forEach((k) => { if (db.sessions[k].userId === u.id) delete db.sessions[k]; });
  Object.keys(db.resets).forEach((k) => { if (db.resets[k].userId === u.id) delete db.resets[k]; });
  save(); return { ok: true };
}, { admin: true });
route('POST', /^\/api\/admin\/users\/([\w-]+)\/reset$/, async (req, res, body, me, m) => {
  const u = db.users.find((x) => x.id === m[1]); if (!u) throw Object.assign(new Error('Usuario no encontrado'), { code: 404 });
  const token = newResetToken(u, 'administración');
  const enviado = body.enviar ? await sendMail(u.email, 'Atalaya · Restablecer tu contraseña', `Hola${u.nombre ? ' ' + u.nombre : ''}:\n\nPara crear una contraseña nueva abre este enlace (caduca en ${RESET_MIN} minutos):\n${APP_URL}/acceso.html#reset=${token}`) : false;
  delete u.solicitudReset; save();
  return { token, minutos: RESET_MIN, enviado };
}, { admin: true });

// Planes a medida (Grupos): la administración concede el acceso a quien pidió contacto.
// Si no tiene cuenta, se crea con el plan y una invitación para que elija su contraseña (válida 7 días).
route('POST', /^\/api\/admin\/conceder$/, async (req, res, body) => {
  const email = String(body.email || '').trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw Object.assign(new Error('Correo no válido'), { code: 400 });
  const plan = PLANES.includes(body.plan) ? body.plan : 'grupos', periodo = PERIODOS.includes(body.periodo) ? body.periodo : 'mensual';
  const cuota = Math.max(0, +body.cuota || 0), meses = Math.max(1, Math.min(36, +body.meses || (periodo === 'anual' ? 12 : 1)));
  let u = db.users.find((x) => x.email === email), creado = false;
  if (!u) {
    const salt = crypto.randomBytes(16).toString('hex');
    u = { id: uid(), nombre: String(body.nombre || '').slice(0, 120), email, empresa: String(body.empresa || '').slice(0, 160), telefono: String(body.telefono || '').slice(0, 40), rol: 'cliente', alta: now(), ultimoAcceso: null, sesiones: 0, uso: {}, pagos: [], salt, hash: hashPw(crypto.randomBytes(24).toString('hex'), salt) };
    db.users.push(u); creado = true;
  }
  const venc = new Date(); venc.setMonth(venc.getMonth() + meses);
  Object.assign(u, { plan, periodo, estado: 'activo', pagado: true, venceAcceso: venc.toISOString(), cuotaPactada: cuota || null, concedido: now() });
  (db.contactos || []).forEach((c) => { if (String(c.email).toLowerCase() === email) c.atendido = now(); });
  const token = creado ? newResetToken(u, 'invitación', 7 * 24 * 60) : null;
  const link = token ? `${APP_URL}/acceso.html#reset=${token}` : null;
  const enviado = body.enviar ? await sendMail(u.email, 'Atalaya 360° · Su acceso está listo', `Hola${u.nombre ? ' ' + u.nombre : ''}:\n\nYa tiene acceso a Atalaya 360° con el plan ${plan === 'grupos' ? 'Grupos' : plan}.\n${link ? 'Para elegir su contraseña abra este enlace (válido 7 días):\n' + link : 'Entre con su correo y su contraseña de siempre en ' + APP_URL + '/acceso.html'}\n\nEquipo de Business Avance`) : false;
  save();
  return { user: pub(u), creado, token, minutos: token ? 7 * 24 * 60 : 0, enviado };
}, { admin: true });

route('POST', /^\/api\/heartbeat$/, async (req, res, body, u) => {
  u.uso = u.uso || {}; u.uso[today()] = (u.uso[today()] || 0) + 1; u.ultimoAcceso = now(); save();
  return { ok: true };
});

route('GET', /^\/api\/data\/([a-z0-9_-]{1,40})$/i, async (req, res, body, u, m) => ({ data: (db.data[u.id] || {})[m[1]] || null }));
// Empresas por plan: el servidor también lo comprueba (no basta con el navegador)
const LIMITE_EMPRESAS = { esencial: 1, profesional: 1, consultora: 15, grupos: Infinity };
route('PUT', /^\/api\/data\/([a-z0-9_-]{1,40})$/i, async (req, res, body, u, m) => {
  db.data[u.id] = db.data[u.id] || {};
  const key = m[1], mine = db.data[u.id];
  if (key === 'empresas') {
    const lista = body && Array.isArray(body.lista) ? body.lista : null;
    if (!lista || !lista.length || lista.length > 500 || !lista.some((e) => e && e.id === 'principal')) throw Object.assign(new Error('Registro de empresas no válido'), { code: 400 });
    const lim = LIMITE_EMPRESAS[u.plan] != null ? LIMITE_EMPRESAS[u.plan] : 1;
    const antes = mine.empresas && Array.isArray(mine.empresas.lista) ? mine.empresas.lista.length : 1;
    // Se puede quedar igual o bajar aunque se esté por encima (p. ej. tras cambiar a un plan menor), pero no subir del límite
    if (lista.length > lim && lista.length > antes) throw Object.assign(new Error(lim === 1 ? 'Tu plan incluye una empresa. Para varias, pasa a Consultora o a Grupos.' : `Tu plan incluye hasta ${lim} empresas.`), { code: 403 });
  }
  // Personas y equipos es del plan Consultora: el resto puede leer lo que tuviera, pero no guardar
  if (/^personas(--|$)/.test(key) && body !== null && u.plan !== 'consultora') throw Object.assign(new Error('Personas y equipos está incluido en el plan Consultora.'), { code: 403 });
  if (/^consultor(--|$)/.test(key) && body !== null && u.plan !== 'consultora') throw Object.assign(new Error('El cuaderno del consultor está incluido en el plan Consultora.'), { code: 403 });
  const sub = key.match(/^(simulador|estrategia|personas|consultor)--([a-z0-9_-]+)$/i);
  if (sub && body !== null) {
    const ids = mine.empresas && Array.isArray(mine.empresas.lista) ? mine.empresas.lista.map((e) => e && e.id) : [];
    if (!ids.includes(sub[2])) throw Object.assign(new Error('Esa empresa no está dada de alta en tu cuenta'), { code: 403 });
  }
  mine[key] = body; save(); return { ok: true };
});

/* ---------- Test de personas por enlace ----------
   El responsable crea una invitación de un solo uso (caduca a los 14 días) para que una persona responda
   un test sin cuenta. La persona da su consentimiento y responde (puede dejarlo a medias y retomarlo);
   la aplicación recoge las respuestas completadas y las lleva a su ficha. */
const INV_DIAS = 14;
const TESTS_INV = { disc: 12, roles: 27, enea: 27, lid: 12, lid360: 12, prep: 8 };
const TEST_NOMBRE = { disc: 'estilo de comportamiento (DISC)', roles: 'aportaciones al equipo', enea: 'motivación (eneagrama)', lid: 'estilo de liderazgo', lid360: 'cómo dirige su responsable', prep: 'preparación para una tarea' };
db.invitaciones = db.invitaciones || {};
const invEstado = (v) => (['completado', 'anulado'].includes(v.estado) ? v.estado : Date.parse(v.caduca) < Date.now() ? 'caducado' : v.estado);
const invPub = (v) => ({ id: v.id, empresaId: v.empresaId, pid: v.pid, nombre: v.nombre, test: v.test, tid: v.tid, tarea: v.tarea, lider: v.lider, email: v.email, estado: invEstado(v), creado: v.creado, caduca: v.caduca, abierto: v.abierto, actualizado: v.actualizado, completado: v.completado, importada: v.importada, recordatorios: v.recordatorios || 0, progreso: Array.isArray(v.resp) ? v.resp.filter((x) => x != null).length : 0, total: TESTS_INV[v.test], resp: v.estado === 'completado' ? v.resp : undefined, de: v.de, url: `${APP_URL}/test.html#t=${v.token}` });
const invDe = (u, id) => { const v = Object.values(db.invitaciones).find((x) => x.id === id && x.owner === u.id); if (!v) throw Object.assign(new Error('Invitación no encontrada'), { code: 404 }); return v; };
const invMail = (v, recordatorio) => sendMail(v.email, `${recordatorio ? 'Recordatorio: ' : ''}${v.empresa || 'Su empresa'} le pide responder un cuestionario`,
  `Hola${v.nombre ? ', ' + v.nombre : ''}:\n\n${v.empresa || 'Su empresa'} le invita a responder un cuestionario breve sobre ${TEST_NOMBRE[v.test]}${v.tarea ? ' («' + v.tarea + '»)' : ''}${v.lider && v.test === 'lid360' ? ', pensando en ' + v.lider : ''}.\n\nSe responde en unos minutos, sin crear ninguna cuenta. Antes de empezar verá para qué se usan sus respuestas y podrá aceptar o no.\n\n${APP_URL}/test.html#t=${v.token}\n\nEl enlace es personal y caduca el ${new Date(v.caduca).toLocaleDateString('es-ES')}.\n\nAtalaya 360°`);
function nuevaInv(u, body) {
  const token = crypto.randomBytes(24).toString('base64url');
  const v = { id: 'i' + crypto.randomBytes(6).toString('hex'), token, owner: u.id, empresaId: String(body.empresaId || 'principal').slice(0, 40), empresa: String(body.empresa || '').slice(0, 120), pid: String(body.pid || '').slice(0, 40), nombre: String(body.nombre || '').slice(0, 120), test: body.test, tid: body.tid ? String(body.tid).slice(0, 40) : null, tarea: body.tarea ? String(body.tarea).slice(0, 160) : null, lider: body.lider ? String(body.lider).slice(0, 120) : null, de: body.de ? String(body.de).slice(0, 40) : null, email: body.email ? String(body.email).trim().toLowerCase().slice(0, 160) : null, resumen: body.resumen !== false, estado: 'enviado', creado: now(), caduca: new Date(Date.now() + INV_DIAS * 864e5).toISOString(), resp: null };
  db.invitaciones[sha(token)] = v;
  return v;
}
route('POST', /^\/api\/invitaciones$/, async (req, res, body, u) => {
  if (u.plan !== 'consultora') throw Object.assign(new Error('Los test por enlace están incluidos en el plan Consultora.'), { code: 403 });
  const lista = Array.isArray(body.lista) ? body.lista : [body];
  if (!lista.length || lista.length > 100) throw Object.assign(new Error('Entre 1 y 100 invitaciones por envío'), { code: 400 });
  const out = [];
  for (const b of lista) {
    if (!TESTS_INV[b.test]) throw Object.assign(new Error('Test no válido'), { code: 400 });
    if (b.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(b.email).trim())) throw Object.assign(new Error('Correo no válido: ' + b.email), { code: 400 });
    const v = nuevaInv(u, b);
    const enviado = b.enviar && v.email ? await invMail(v) : false;
    out.push(Object.assign(invPub(v), { enviado }));
  }
  save();
  return { invitaciones: out, correo: !!process.env.SMTP_HOST };
});
route('GET', /^\/api\/invitaciones$/, async (req, res, body, u) => {
  const url = new URL(req.url, 'http://x'), emp = url.searchParams.get('empresa');
  return { invitaciones: Object.values(db.invitaciones).filter((v) => v.owner === u.id && (!emp || v.empresaId === emp)).sort((a, b) => b.creado.localeCompare(a.creado)).map(invPub), correo: !!process.env.SMTP_HOST };
});
route('POST', /^\/api\/invitaciones\/([\w-]+)\/(anular|recordar|reenviar|importada|borrar)$/, async (req, res, body, u, m) => {
  const v = invDe(u, m[1]), acc = m[2];
  if (acc === 'anular') { if (v.estado !== 'completado') v.estado = 'anulado'; }
  else if (acc === 'importada') v.importada = now();
  else if (acc === 'borrar') { delete db.invitaciones[sha(v.token)]; save(); return { ok: true }; }
  else if (acc === 'recordar') {
    if (invEstado(v) === 'completado' || invEstado(v) === 'anulado' || invEstado(v) === 'caducado') throw Object.assign(new Error('Esta invitación ya no está abierta'), { code: 409 });
    if (!v.email) throw Object.assign(new Error('La invitación no tiene correo'), { code: 400 });
    const ok = await invMail(v, true); if (!ok) throw Object.assign(new Error('No hay correo configurado en el servidor: copie el enlace y envíelo usted.'), { code: 503 });
    v.recordatorios = (v.recordatorios || 0) + 1; v.recordado = now();
  } else if (acc === 'reenviar') {
    // Nuevo enlace con nuevo plazo; el anterior deja de valer. Conserva lo que ya hubiera respondido.
    if (v.estado !== 'completado') v.estado = 'anulado';
    const n = nuevaInv(u, Object.assign({}, v, { enviar: false }));
    if (v.estado === 'anulado' && Array.isArray(v.resp)) { n.resp = v.resp; n.estado = 'a medias'; n.consent = v.consent; }
    const enviado = n.email ? await invMail(n) : false;
    save(); return { invitacion: Object.assign(invPub(n), { enviado }) };
  }
  save(); return { invitacion: invPub(v) };
});
// Página pública del test: solo con el enlace
const invToken = (t) => { const v = db.invitaciones[sha(String(t || ''))]; if (!v) throw Object.assign(new Error('Este enlace no es válido.'), { code: 404 }); return v; };
route('GET', /^\/api\/t\/([\w-]{20,64})$/, async (req, res, body, u, m) => {
  const v = invToken(m[1]), st = invEstado(v);
  if (st === 'enviado') { v.estado = 'abierto'; v.abierto = now(); save(); }
  return { empresa: v.empresa, nombre: v.nombre, test: v.test, tarea: v.tarea, lider: v.lider, estado: invEstado(v), caduca: v.caduca, resp: st === 'completado' ? null : v.resp, consent: !!v.consent, resumen: v.resumen !== false };
}, { public: true });
route('PUT', /^\/api\/t\/([\w-]{20,64})$/, async (req, res, body, u, m) => {
  const ip = req.socket.remoteAddress || '';
  const v = invToken(m[1]), st = invEstado(v);
  if (st === 'completado') throw Object.assign(new Error('Este cuestionario ya se entregó. Gracias.'), { code: 409 });
  if (st === 'anulado' || st === 'caducado') throw Object.assign(new Error(st === 'caducado' ? 'Este enlace ha caducado. Pida uno nuevo a quien se lo envió.' : 'Este enlace se ha anulado.'), { code: 410 });
  if (!body.consent) throw Object.assign(new Error('Hace falta su consentimiento para guardar las respuestas.'), { code: 400 });
  const n = TESTS_INV[v.test], resp = body.resp;
  if (!Array.isArray(resp) || resp.length !== n) throw Object.assign(new Error('Respuestas no válidas'), { code: 400 });
  const okItem = (x) => x == null || (v.test === 'disc' ? x && typeof x === 'object' && /^[DISC]$/.test(x.mas) && /^[DISC]$/.test(x.menos) && x.mas !== x.menos : Number.isInteger(x) && x >= (v.test === 'roles' ? 0 : 1) && x <= ({ roles: 4, lid: 4, lid360: 4 }[v.test] || 5));
  if (!resp.every(okItem)) throw Object.assign(new Error('Respuestas no válidas'), { code: 400 });
  v.resp = v.test === 'disc' ? resp.map((x) => (x ? { mas: x.mas, menos: x.menos } : null)) : resp;
  v.consent = v.consent || now(); v.actualizado = now(); v.ip = ip.slice(0, 60);
  if (body.fin) { if (resp.some((x) => x == null)) throw Object.assign(new Error('Faltan respuestas'), { code: 400 }); v.estado = 'completado'; v.completado = now(); }
  else v.estado = 'a medias';
  save(); return { ok: true, estado: v.estado };
}, { public: true });

// Cada usuario con el número de empresas o sociedades que tiene dadas de alta (para el precio de Grupos)
const nEmpresas = (u) => { const r = (db.data[u.id] || {}).empresas; return r && Array.isArray(r.lista) ? r.lista.length : 1; };
route('GET', /^\/api\/admin\/users$/, async () => ({ users: db.users.map((u) => Object.assign(pub(u), { empresas: nEmpresas(u) })) }), { admin: true });
route('PATCH', /^\/api\/admin\/users\/([\w-]+)$/, async (req, res, body, me, m) => {
  const u = db.users.find((x) => x.id === m[1]); if (!u) throw Object.assign(new Error('Usuario no encontrado'), { code: 404 });
  if (['prueba', 'activo', 'bloqueado'].includes(body.estado)) u.estado = body.estado;
  if (typeof body.pagado === 'boolean') u.pagado = body.pagado;
  if (PLANES.includes(body.plan)) u.plan = body.plan;
  if (PERIODOS.includes(body.periodo)) u.periodo = body.periodo;
  if (body.venceAcceso === null || (typeof body.venceAcceso === 'string' && !isNaN(Date.parse(body.venceAcceso)))) u.venceAcceso = body.venceAcceso;
  if (typeof body.nota === 'string') u.nota = body.nota.slice(0, 2000);
  if (body.registrarPago && typeof body.registrarPago === 'object') {
    u.pagos = u.pagos || [];
    u.pagos.push({ fecha: now(), importe: +body.registrarPago.importe || 0, meses: +body.registrarPago.meses || 0, referencia: String(body.registrarPago.referencia || '').slice(0, 200), por: 'administración' });
    delete u.solicitudPago;
  }
  save(); return { user: pub(u) };
}, { admin: true });
route('DELETE', /^\/api\/admin\/users\/([\w-]+)$/, async (req, res, body, me, m) => {
  db.users = db.users.filter((u) => u.id !== m[1]); delete db.data[m[1]]; delete db.mercado[m[1]];
  Object.keys(db.sessions).forEach((k) => { if (db.sessions[k].userId === m[1]) delete db.sessions[k]; });
  save(); return { ok: true };
}, { admin: true });

// Asistente: el bucle de herramientas se ejecuta en el navegador; el servidor solo habla con Claude
route('POST', /^\/api\/chat$/, async (req, res, body) => {
  const tools = (Array.isArray(body.tools) ? body.tools : []).slice(0, 16).filter((t) => /^[a-z_]{1,40}$/.test(t.name))
    .map((t) => ({ name: t.name, description: String(t.description || '').slice(0, 2000), input_schema: t.input_schema && t.input_schema.type === 'object' ? t.input_schema : { type: 'object', properties: {} } }));
  const messages = Array.isArray(body.messages) ? body.messages.slice(-40) : [];
  if (!messages.length || JSON.stringify(messages).length > 400000) throw Object.assign(new Error('Conversación no válida'), { code: 400 });
  const r = await ask({ system: SYSTEM_CHAT, tools, messages, output_config: { effort: 'low' } });
  return { content: r.content, stop_reason: r.stop_reason };
});

// Extracción de datos de documentos (balances, cuentas, tesorería, tareas…)
route('POST', /^\/api\/extract$/, async (req, res, body) => {
  const texto = String(body.texto || '').slice(0, 300000);
  const destino = String(body.destino || 'cuentas').slice(0, 40);
  const forma = String(body.forma || '').slice(0, 3000);
  if (!texto) throw Object.assign(new Error('Documento vacío'), { code: 400 });
  const r = await ask({
    system: 'Extraes datos de documentos de empresa (cuentas anuales, balances, extractos, listados) con exactitud. No inventas valores: si un dato no aparece, lo omites. Importes en euros como números sin separadores.',
    messages: [{ role: 'user', content: `Destino: ${destino}. Devuelve SOLO JSON con esta forma: ${forma}\n\nDocumento:\n${texto}` }],
    output_config: { effort: 'low' }
  });
  return { datos: jsonOf(textOf(r)) };
});

// Agente de mercado: análisis 360 con fuentes oficiales, guardado por usuario
route('GET', /^\/api\/mercado$/, async (req, res, body, u) => ({ analisis: db.mercado[u.id] || null }));
route('POST', /^\/api\/mercado\/actualizar$/, async (req, res, body, u) => {
  const perfil = { sector: body.sector, actividad: body.actividad, region: body.region, productos: body.productos, clientes: body.clientes, ventas: body.ventas };
  const a = await agenteMercado(perfil);
  a.perfil = perfil;
  db.mercado[u.id] = a; save();
  return { analisis: a };
});

/* ---------- Ficheros estáticos ---------- */
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.csv': 'text/csv; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.md': 'text/markdown; charset=utf-8' };
// Páginas del área de clientes que el servidor no entrega sin sesión con acceso (o sesión de administración)
const PRIVADAS = new Set(['/manual.html']);
function serveStatic(req, res) {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p === '/') p = '/index.html';
  if (PRIVADAS.has(p) && !access(currentUser(req)).ok && !isAdmin(req)) { res.writeHead(302, { Location: '/acceso.html', 'Cache-Control': 'no-store' }); return res.end(); }
  const file = path.resolve(ROOT, '.' + p);
  const rel = path.relative(ROOT, file);
  if (rel.startsWith('..') || path.isAbsolute(rel) || rel.split(path.sep)[0] === 'server') { res.writeHead(404); return res.end('No encontrado'); }
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404); return res.end('No encontrado'); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff' });
    res.end(buf);
  });
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (!url.pathname.startsWith('/api/')) return serveStatic(req, res);
  const r = routes.find((x) => x.method === req.method && x.re.test(url.pathname));
  if (!r) return send(res, 404, { error: 'Ruta no encontrada' });
  try {
    // Las peticiones que cambian datos deben ser JSON: un formulario de otra web no puede enviarlas sin permiso del navegador
    if (req.method !== 'GET' && !(req.headers['content-type'] || '').includes('application/json')) return send(res, 415, { error: 'Se esperaba JSON' });
    const body = req.method === 'GET' ? {} : await readBody(req);
    const u = currentUser(req);
    if (r.opts.admin) {
      if (!isAdmin(req)) return send(res, 401, { error: 'Entra con la contraseña de administración' });
    } else if (!r.opts.public) {
      if (!u) return send(res, 401, { error: 'Inicia sesión' });
      if (!r.opts.noAccess && !access(u).ok) return send(res, 402, { error: 'Tu acceso necesita activarse' });
    }
    const out = await r.fn(req, res, body, u, url.pathname.match(r.re));
    send(res, 200, out);
  } catch (e) {
    const code = e.code && Number.isInteger(e.code) ? e.code : e.status || 500;
    if (code >= 500) console.error(e);
    send(res, code >= 400 && code < 600 ? code : 500, { error: e.message || 'Error interno' });
  }
}).listen(PORT, () => console.log(`Atalaya en http://localhost:${PORT}  (IA: ${process.env.ANTHROPIC_API_KEY ? 'configurada' : 'sin clave'})`));

// Actualización periódica opcional del análisis de mercado (MERCADO_AUTO_DIAS=7 para refrescar semanalmente)
const autoDias = +process.env.MERCADO_AUTO_DIAS || 0;
if (autoDias > 0) {
  setInterval(async () => {
    for (const u of db.users) {
      const a = db.mercado[u.id];
      if (!a || !a.perfil || !access(u).ok || Date.now() - Date.parse(a.fecha) < autoDias * 864e5) continue;
      try { const n = await agenteMercado(a.perfil); n.perfil = a.perfil; db.mercado[u.id] = n; save(); } catch (e) { console.error('Agente de mercado:', e.message); }
    }
  }, 6 * 3600e3);
}
