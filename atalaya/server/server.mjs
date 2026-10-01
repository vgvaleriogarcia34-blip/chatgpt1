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
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || '').toLowerCase();
const PRUEBA_DIAS = 14;
const PLANES = ['esencial', 'profesional', 'consultora'];
const MAX_BODY = 4 * 1024 * 1024;

/* ---------- Base de datos en un fichero JSON (escritura atómica) ---------- */
fs.mkdirSync(DATA_DIR, { recursive: true });
let db = { users: [], sessions: {}, data: {}, mercado: {} };
try { db = Object.assign(db, JSON.parse(fs.readFileSync(DB_FILE, 'utf8'))); } catch { /* base nueva */ }
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
  if (u.rol === 'admin') return { ok: true, motivo: 'admin' };
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
    plan: PLANES.includes(body.plan) ? body.plan : 'profesional', rol: (db.users.length === 0 && !ADMIN_EMAIL) || email === ADMIN_EMAIL ? 'admin' : 'cliente',
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
  if (PLANES.includes(body.plan)) u.plan = body.plan;
  save(); return { user: pub(u) };
}, { noAccess: true });
route('POST', /^\/api\/me\/solicitar-pago$/, async (req, res, body, u) => { u.solicitudPago = now(); save(); return { ok: true }; }, { noAccess: true });

route('POST', /^\/api\/heartbeat$/, async (req, res, body, u) => {
  u.uso = u.uso || {}; u.uso[today()] = (u.uso[today()] || 0) + 1; u.ultimoAcceso = now(); save();
  return { ok: true };
});

route('GET', /^\/api\/data\/([a-z0-9_-]{1,40})$/i, async (req, res, body, u, m) => ({ data: (db.data[u.id] || {})[m[1]] || null }));
route('PUT', /^\/api\/data\/([a-z0-9_-]{1,40})$/i, async (req, res, body, u, m) => {
  db.data[u.id] = db.data[u.id] || {}; db.data[u.id][m[1]] = body; save(); return { ok: true };
});

route('GET', /^\/api\/admin\/users$/, async () => ({ users: db.users.map(pub) }), { admin: true });
route('PATCH', /^\/api\/admin\/users\/([\w-]+)$/, async (req, res, body, me, m) => {
  const u = db.users.find((x) => x.id === m[1]); if (!u) throw Object.assign(new Error('Usuario no encontrado'), { code: 404 });
  if (['prueba', 'activo', 'bloqueado'].includes(body.estado)) u.estado = body.estado;
  if (typeof body.pagado === 'boolean') u.pagado = body.pagado;
  if (PLANES.includes(body.plan)) u.plan = body.plan;
  if (body.venceAcceso === null || (typeof body.venceAcceso === 'string' && !isNaN(Date.parse(body.venceAcceso)))) u.venceAcceso = body.venceAcceso;
  if (['admin', 'cliente'].includes(body.rol) && u.id !== me.id) u.rol = body.rol;
  if (typeof body.nota === 'string') u.nota = body.nota.slice(0, 2000);
  if (body.registrarPago && typeof body.registrarPago === 'object') {
    u.pagos = u.pagos || [];
    u.pagos.push({ fecha: now(), importe: +body.registrarPago.importe || 0, meses: +body.registrarPago.meses || 0, referencia: String(body.registrarPago.referencia || '').slice(0, 200), por: me.email });
    delete u.solicitudPago;
  }
  save(); return { user: pub(u) };
}, { admin: true });
route('DELETE', /^\/api\/admin\/users\/([\w-]+)$/, async (req, res, body, me, m) => {
  if (m[1] === me.id) throw Object.assign(new Error('No puedes eliminar tu propia cuenta'), { code: 400 });
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
function serveStatic(req, res) {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p === '/') p = '/index.html';
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
    if (!r.opts.public) {
      if (!u) return send(res, 401, { error: 'Inicia sesión' });
      if (r.opts.admin && u.rol !== 'admin') return send(res, 403, { error: 'Solo para administración' });
      if (!r.opts.noAccess && !r.opts.admin && !access(u).ok) return send(res, 402, { error: 'Tu acceso necesita activarse' });
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
