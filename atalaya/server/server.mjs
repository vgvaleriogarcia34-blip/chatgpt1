// Atalaya · Servidor
// Sirve la web, gestiona cuentas, control de acceso por pago, horas de uso y datos por usuario,
// y conecta el asistente, la extracción de documentos y el agente de mercado con la API de Claude.
//
// Arranque:  cd atalaya/server && npm install && ANTHROPIC_API_KEY=... node server.mjs
// Sin clave de API todo funciona salvo las funciones de IA (el asistente pasa a su modo básico).
// Variables de entorno y comportamiento de seguridad: ver PUESTA-EN-MARCHA.md.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { AsyncLocalStorage } from 'node:async_hooks';

const env = process.env;
const num = (k, d) => (env[k] != null && env[k] !== '' && !isNaN(+env[k]) ? +env[k] : d);
const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, '..');
const DATA_DIR = path.resolve(env.ATALAYA_DATA || path.join(here, 'data'));
const DB_FILE = path.join(DATA_DIR, 'db.json');
const DB_SQL = path.join(DATA_DIR, 'atalaya.db');
const PORT = +env.PORT || 8080;
const COOKIE = 'atalaya_sid';
const SESSION_DAYS = 30;
const MODEL = env.ATALAYA_MODEL || 'claude-opus-5-5';
const ADMIN_COOKIE = 'atalaya_adm';
const ADMIN_HOURS = 12;
const APP_URL = (env.APP_URL || `http://localhost:${PORT}`).replace(/\/$/, '');
const SECURE = env.COOKIE_SECURE === '1';
const PRUEBA_DIAS = 14;
const PLANES = ['esencial', 'profesional', 'consultora', 'grupos'];
const PLANES_LIBRES = ['esencial', 'profesional', 'consultora']; // los que el cliente elige solo; Grupos lo concede la administración
const ORDEN_PLAN = { esencial: 1, profesional: 2, consultora: 3, grupos: 4 };
const NOMBRE_PLAN = { esencial: 'Esencial', profesional: 'Profesional', consultora: 'Consultora', grupos: 'Grupos' };
const PERIODOS = ['mensual', 'anual'];
/* Consultora cobra por tramos de empresas cliente (hasta 5, de 6 a 10 y de 11 a 15; máximo 15). La empresa principal, la del
   propio consultor, no cuenta ni para el límite ni para el tramo. El tramo se nombra por su tope: 5, 10 o 15. */
const TRAMOS_CONSULTORA = [5, 10, 15];
const PRECIO_CONSULTORA = { 5: 349, 10: 549, 15: 749 };
const tramoConsultora = (n) => TRAMOS_CONSULTORA.find((t) => n <= t) || 15;
const NOMBRE_TRAMO = { 5: 'hasta 5 empresas cliente', 10: 'de 6 a 10 empresas cliente', 15: 'de 11 a 15 empresas cliente' };
// Lo que cuenta para el límite y el tramo: en Consultora, las empresas cliente (sin la principal); en los demás, todas
const cuentanEmpresas = (plan, total) => (plan === 'consultora' ? Math.max(0, total - 1) : total);
// Datos por cuenta: tamaño máximo de cada clave y del total de la cuenta (en MB)
const DATA_MAX_CLAVE = num('DATA_MAX_CLAVE_MB', 2) * 1024 * 1024;
const DATA_MAX_CUENTA = num('DATA_MAX_CUENTA_MB', 25) * 1024 * 1024;
const MAX_BODY = Math.max(4 * 1024 * 1024, DATA_MAX_CLAVE + 64 * 1024);
const fallo = (code, msg, extra) => Object.assign(new Error(msg), { code, extra });
const now = () => new Date().toISOString();
const today = () => now().slice(0, 10);
const nid = (p, n) => p + crypto.randomBytes(n || 6).toString('hex');

/* ---------- Errores que no deben tumbar el servidor ---------- */
process.on('unhandledRejection', (e) => console.error('Promesa rechazada sin controlar:', e));
process.on('uncaughtException', (e) => console.error('Excepción sin controlar (el servidor sigue en marcha):', e));
// Últimos errores del registro (para la revisión del sistema en la administración). Solo el texto, recortado y sin correos.
const ERRORES = [];
{
  const original = console.error.bind(console);
  console.error = (...args) => {
    try {
      const t = args.map((x) => (x instanceof Error ? x.message : typeof x === 'string' ? x : JSON.stringify(x))).join(' ')
        .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[correo]').replace(/\s+/g, ' ').trim().slice(0, 300);
      if (t) { ERRORES.push({ fecha: new Date().toISOString(), t }); if (ERRORES.length > 50) ERRORES.shift(); }
    } catch { /* el registro nunca debe fallar */ }
    original(...args);
  };
}

/* ---------- Carpeta de datos: fuera de la web y solo para este usuario ---------- */
{
  const rel = path.relative(ROOT, DATA_DIR);
  // Dentro de la carpeta de la web solo se admite bajo server/, que nunca se sirve
  if (!rel.startsWith('..') && !path.isAbsolute(rel) && rel.split(path.sep)[0] !== 'server') {
    console.error(`\n  ERROR: ATALAYA_DATA (${DATA_DIR}) está dentro de la carpeta que se publica en la web (${ROOT}).\n  Usa una carpeta fuera de ella (por ejemplo /var/lib/atalaya). El servidor no arranca.\n`);
    process.exit(1);
  }
}
// Todo lo que crea el servidor (base, copias, ficheros -wal y -shm de SQLite, secreto) solo lo lee su usuario
process.umask(0o077);
fs.mkdirSync(DATA_DIR, { recursive: true, mode: 0o700 });
try { fs.chmodSync(DATA_DIR, 0o700); } catch { /* carpeta de otro usuario: se deja como está */ }

/* ---------- Almacén: SQLite (node:sqlite) o, de respaldo, un fichero JSON ----------
   SQLite (por defecto): una tabla por colección con una fila por registro. Cada guardado escribe, en una transacción,
   solo las filas que han cambiado desde el anterior. Los datos de las cuentas (simulador, estrategia…), el análisis de
   mercado y el registro de actividad no se cargan en memoria: se leen y escriben directamente en la base.
   La primera vez se migra db.json, que se conserva como db.json.migrado-<fecha>.
   ALMACEN=json mantiene el fichero JSON de las versiones anteriores (o se usa solo si este Node no trae node:sqlite). */
let Sqlite = null;
if ((env.ALMACEN || 'sqlite').toLowerCase() !== 'json') {
  // En Node 22, node:sqlite avisa al cargarse de que es experimental. Solo se usa su parte básica (DatabaseSync, prepare,
  // exec), así que ese aviso concreto se omite; cualquier otro aviso sale como siempre.
  const avisar = process.emitWarning;
  process.emitWarning = function (w, ...r) { const tipo = (r[0] && r[0].type) || r[0] || (w && w.name); if (tipo === 'ExperimentalWarning' && /SQLite/i.test(String((w && w.message) || w))) return; return avisar.call(process, w, ...r); };
  try { Sqlite = await import('node:sqlite'); }
  catch (e) {
    if (fs.existsSync(DB_SQL)) { console.error(`\n  ERROR: la base es SQLite (${DB_SQL}) y este Node (${process.version}) no trae node:sqlite (${e.message}).\n  Usa Node 22.13 o superior. El servidor no arranca.\n`); process.exit(1); }
    console.warn(`\n  Aviso: este Node (${process.version}) no trae node:sqlite: se sigue usando db.json. Para SQLite, Node 22.13 o superior.\n`);
  } finally { process.emitWarning = avisar; }
}
const ALMACEN = Sqlite ? 'sqlite' : 'json';
const COPIAS = 2; // copias mensuales en el disco: al hacer la tercera se escribe sobre la más antigua
const sello = () => now().replace(/[:.]/g, '-');
const vacia = () => ({ users: [], sessions: {}, data: {}, mercado: {}, admin: null, adminSessions: {}, resets: {} });
// Completa lo que falte en una base cargada (de cualquier versión) y da identificador a contactos y pagos antiguos
function normalizar(d) {
  d.users = Array.isArray(d.users) ? d.users : []; d.contactos = Array.isArray(d.contactos) ? d.contactos : [];
  ['sessions', 'adminSessions', 'resets', 'invitaciones', 'lid360', 'stripeEventos', 'data', 'mercado'].forEach((k) => { if (!d[k] || typeof d[k] !== 'object') d[k] = {}; });
  d.contactos.forEach((c) => { if (!c.id) c.id = nid('c'); });
  d.users.forEach((u) => (u.pagos || []).forEach((p) => { if (!p.id) p.id = nid('p', 5); }));
  return d;
}

/* --- db.json: lectura con recuperación desde las copias --- */
const copiaJson = (i) => `${DB_FILE}.${i}`;
const leerDb = (f) => { const d = JSON.parse(fs.readFileSync(f, 'utf8')); if (!d || typeof d !== 'object' || !Array.isArray(d.users)) throw new Error('estructura no válida'); return d; };
function cargarJson() {
  if (!fs.existsSync(DB_FILE)) return { datos: null, recuperada: false };
  let datos = null, recuperada = false;
  try { datos = leerDb(DB_FILE); } catch (e) {
    const hay = Array.from({ length: COPIAS }, (_, i) => copiaJson(i + 1)).filter((f) => fs.existsSync(f));
    console.error(`\n  ERROR: la base de datos ${DB_FILE} existe pero no se puede leer (${e.message}).`);
    if (env.ATALAYA_RECUPERAR !== '1' && env.ATALAYA_RECUPERAR !== 'vacia') {
      console.error(`  El servidor no arranca para no sobrescribirla. Copias disponibles: ${hay.length ? hay.join(', ') : 'ninguna'}.
  Para recuperar: arranca una vez con ATALAYA_RECUPERAR=1 (aparta el fichero dañado y carga la copia válida más reciente)
  o sustituye db.json a mano por una copia. ATALAYA_RECUPERAR=vacia arranca con una base vacía (solo si no hay nada que salvar).\n`);
      process.exit(1);
    }
    const danado = `${DB_FILE}.danado-${sello()}`;
    fs.renameSync(DB_FILE, danado); console.warn(`  Fichero dañado apartado en ${danado}`);
    if (env.ATALAYA_RECUPERAR === '1') {
      for (const f of hay) { try { datos = leerDb(f); console.warn(`  Recuperada la copia ${f}`); break; } catch { console.warn(`  La copia ${f} tampoco se puede leer`); } }
      if (!datos) { console.error('  Ninguna copia es válida. Revisa los ficheros a mano o arranca con ATALAYA_RECUPERAR=vacia.\n'); process.exit(1); }
    } else console.warn('  Arranque con base de datos vacía (ATALAYA_RECUPERAR=vacia).');
    recuperada = true;
  }
  try { fs.chmodSync(DB_FILE, 0o600); } catch { /* sin fichero o sin permiso */ }
  return { datos, recuperada };
}

/* --- SQLite: esquema con migraciones numeradas (PRAGMA user_version) --- */
const COLS = { // tabla → registros [clave, valor] de la base en memoria
  meta: (d) => ['admin', 'adminEnv', 'adminTotp', 'admin2faReset', 'sesionesHash', 'hubspot'].filter((k) => d[k] != null).map((k) => [k, d[k]]),
  usuarios: (d) => d.users.map((u) => [u.id, u]),
  sesiones: (d) => Object.entries(d.sessions),
  sesiones_admin: (d) => Object.entries(d.adminSessions),
  resets: (d) => Object.entries(d.resets),
  invitaciones: (d) => Object.entries(d.invitaciones),
  lid360: (d) => Object.entries(d.lid360),
  contactos: (d) => d.contactos.map((c) => [c.id, c]),
  stripe_eventos: (d) => Object.entries(d.stripeEventos)
};
const OBJ = { sesiones: 'sessions', sesiones_admin: 'adminSessions', resets: 'resets', invitaciones: 'invitaciones', lid360: 'lid360', stripe_eventos: 'stripeEventos' };
const MIGRACIONES = [
  // 1 · colecciones (una fila por registro, en JSON), datos por cuenta y clave, y análisis de mercado
  Object.keys(COLS).map((t) => `CREATE TABLE ${t} (k TEXT PRIMARY KEY, v TEXT NOT NULL);`).join('\n') + `
  CREATE TABLE datos (cuenta TEXT NOT NULL, clave TEXT NOT NULL, v TEXT NOT NULL, bytes INTEGER NOT NULL, actualizado TEXT NOT NULL, PRIMARY KEY (cuenta, clave));
  CREATE TABLE mercado (cuenta TEXT PRIMARY KEY, v TEXT NOT NULL, actualizado TEXT NOT NULL);`,
  // 2 · registro de actividad del gestor de usuarios
  `CREATE TABLE actividad (id INTEGER PRIMARY KEY AUTOINCREMENT, fecha TEXT NOT NULL, quien TEXT NOT NULL, accion TEXT NOT NULL, cuenta TEXT, email TEXT, antes TEXT, despues TEXT, nota TEXT, ip TEXT);
  CREATE INDEX actividad_fecha ON actividad (fecha);
  CREATE INDEX actividad_cuenta ON actividad (cuenta);`
];
function migrarEsquema(s) {
  const v = s.prepare('PRAGMA user_version').get().user_version;
  if (v > MIGRACIONES.length) { console.error(`\n  ERROR: la base tiene el esquema ${v} y este servidor solo conoce hasta el ${MIGRACIONES.length}. Actualiza el servidor.\n`); process.exit(1); }
  for (let i = v; i < MIGRACIONES.length; i++) {
    s.exec('BEGIN IMMEDIATE');
    try { s.exec(MIGRACIONES[i]); s.exec(`PRAGMA user_version = ${i + 1}`); s.exec('COMMIT'); } catch (e) { s.exec('ROLLBACK'); throw e; }
  }
}
const copiaSql = (i) => `${DB_SQL}.${i}`;
const conSqlite = (f, fn) => { let s = null; try { s = new Sqlite.DatabaseSync(f); return fn(s); } finally { try { if (s) s.close(); } catch { /* ya cerrada */ } } };
const sqlSana = (f) => { try { return conSqlite(f, (s) => Object.values(s.prepare('PRAGMA quick_check').get())[0] === 'ok'); } catch { return false; } };
// Migración desde db.json: se escribe en un fichero aparte y solo al terminar sin errores pasa a ser la base
function migrarDesdeJson() {
  const { datos } = cargarJson();
  if (!datos) return;
  const d = normalizar(datos), tmp = DB_SQL + '.migrando';
  [tmp, tmp + '-journal'].forEach((f) => fs.rmSync(f, { force: true }));
  let n = 0;
  conSqlite(tmp, (s) => {
    migrarEsquema(s);
    s.exec('BEGIN IMMEDIATE');
    try {
      for (const [t, f] of Object.entries(COLS)) { const st = s.prepare(`INSERT OR REPLACE INTO ${t} (k, v) VALUES (?, ?)`); for (const [k, v] of f(d)) if (v !== undefined) st.run(k, JSON.stringify(v)); }
      const sd = s.prepare('INSERT OR REPLACE INTO datos (cuenta, clave, v, bytes, actualizado) VALUES (?, ?, ?, ?, ?)');
      for (const [c, claves] of Object.entries(d.data)) for (const [k, v] of Object.entries(claves || {})) { if (v == null) continue; const j = JSON.stringify(v); sd.run(c, k, j, Buffer.byteLength(j), now()); n++; }
      const sm = s.prepare('INSERT OR REPLACE INTO mercado (cuenta, v, actualizado) VALUES (?, ?, ?)');
      for (const [c, a] of Object.entries(d.mercado)) if (a) sm.run(c, JSON.stringify(a), now());
      // Registro de actividad de una base que funcionó con ALMACEN=json
      const sa = s.prepare('INSERT INTO actividad (fecha, quien, accion, cuenta, email, antes, despues, nota, ip) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
      (Array.isArray(d.actividad) ? d.actividad.slice().reverse() : []).forEach((a) => sa.run(a.fecha, a.quien, a.accion, a.cuenta || null, a.email || null, a.antes ? JSON.stringify(a.antes) : null, a.despues ? JSON.stringify(a.despues) : null, a.nota || null, a.ip || null));
      s.exec('COMMIT');
    } catch (e) { s.exec('ROLLBACK'); throw e; }
    const nu = s.prepare('SELECT COUNT(*) AS n FROM usuarios').get().n, ids = new Set(d.users.map((u) => u.id)).size;
    if (nu !== ids || Object.values(s.prepare('PRAGMA integrity_check').get())[0] !== 'ok') throw new Error(`la comprobación de la migración no cuadra (${nu} de ${ids} cuentas)`);
  });
  fs.renameSync(tmp, DB_SQL);
  const guardado = `${DB_FILE}.migrado-${sello()}`;
  fs.renameSync(DB_FILE, guardado);
  console.log(`\n  Base de datos migrada a SQLite (${DB_SQL}): ${d.users.length} cuentas, ${n} datos, ${Object.keys(d.invitaciones).length} invitaciones.\n  db.json se conserva sin cambios como ${guardado}.\n`);
}
let sql = null;
function abrirSqlite() {
  if (fs.existsSync(DB_SQL) && !sqlSana(DB_SQL)) {
    const hay = Array.from({ length: COPIAS }, (_, i) => copiaSql(i + 1)).filter((f) => fs.existsSync(f));
    console.error(`\n  ERROR: la base de datos ${DB_SQL} existe pero no se puede leer o no pasa la comprobación de integridad.`);
    if (env.ATALAYA_RECUPERAR !== '1' && env.ATALAYA_RECUPERAR !== 'vacia') {
      console.error(`  El servidor no arranca para no empeorarla. Copias disponibles: ${hay.length ? hay.join(', ') : 'ninguna'}.
  Para recuperar: arranca una vez con ATALAYA_RECUPERAR=1 (aparta la base dañada y carga la copia válida más reciente)
  o sustituye atalaya.db a mano por una copia. ATALAYA_RECUPERAR=vacia arranca con una base vacía (solo si no hay nada que salvar).\n`);
      process.exit(1);
    }
    const danado = `${DB_SQL}.danado-${sello()}`;
    ['', '-wal', '-shm'].forEach((x) => { if (fs.existsSync(DB_SQL + x)) fs.renameSync(DB_SQL + x, danado + x); });
    console.warn(`  Base dañada apartada en ${danado}`);
    if (env.ATALAYA_RECUPERAR === '1') {
      const buena = hay.find((f) => sqlSana(f) || (console.warn(`  La copia ${f} tampoco se puede leer`), false));
      if (!buena) { console.error('  Ninguna copia es válida. Revisa los ficheros a mano o arranca con ATALAYA_RECUPERAR=vacia.\n'); process.exit(1); }
      fs.copyFileSync(buena, DB_SQL); console.warn(`  Recuperada la copia ${buena}`);
    } else console.warn('  Arranque con base de datos vacía (ATALAYA_RECUPERAR=vacia).');
  }
  if (!fs.existsSync(DB_SQL)) migrarDesdeJson();
  sql = new Sqlite.DatabaseSync(DB_SQL);
  sql.exec('PRAGMA journal_mode = WAL; PRAGMA synchronous = FULL; PRAGMA busy_timeout = 5000;');
  migrarEsquema(sql);
  try { fs.chmodSync(DB_SQL, 0o600); } catch { /* sin permiso */ }
}
// Lo último escrito en cada fila: un guardado compara y solo escribe lo que ha cambiado
const escritos = {};
function leerSqlite() {
  const d = vacia();
  for (const t of Object.keys(COLS)) {
    const m = (escritos[t] = new Map());
    for (const { k, v } of sql.prepare(`SELECT k, v FROM ${t} ORDER BY rowid`).all()) {
      m.set(k, v); const o = JSON.parse(v);
      if (t === 'meta') d[k] = o; else if (t === 'usuarios') d.users.push(o); else if (t === 'contactos') (d.contactos = d.contactos || []).push(o); else (d[OBJ[t]] = d[OBJ[t]] || {})[k] = o;
    }
  }
  normalizar(d); d.contactos.sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));
  delete d.data; delete d.mercado; // viven en sus tablas
  return d;
}
let txProf = 0;
// Transacción (admite anidarse: solo la exterior abre y confirma)
function tx(fn) {
  if (!sql || txProf) { txProf++; try { return fn(); } finally { txProf--; } }
  txProf++; sql.exec('BEGIN IMMEDIATE');
  try { const r = fn(); sql.exec('COMMIT'); return r; } catch (e) { try { sql.exec('ROLLBACK'); } catch { /* sin transacción */ } throw e; } finally { txProf--; }
}
const ST = {};
const stmt = (q) => ST[q] || (ST[q] = sql.prepare(q));
function volcarSqlite() {
  const cambios = [];
  for (const [t, f] of Object.entries(COLS)) {
    const prev = escritos[t] || (escritos[t] = new Map()), vistos = new Set();
    for (const [k, v] of f(db)) { if (v === undefined) continue; vistos.add(k); const s = JSON.stringify(v); if (prev.get(k) !== s) cambios.push([t, k, s]); }
    for (const k of prev.keys()) if (!vistos.has(k)) cambios.push([t, k, null]);
  }
  if (!cambios.length) return;
  tx(() => cambios.forEach(([t, k, s]) => (s == null ? stmt(`DELETE FROM ${t} WHERE k = ?`).run(k) : stmt(`INSERT INTO ${t} (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v`).run(k, s))));
  // Solo con la transacción confirmada se da por escrito (si falla, el siguiente guardado lo reintenta)
  cambios.forEach(([t, k, s]) => (s == null ? escritos[t].delete(k) : escritos[t].set(k, s)));
}

let db = vacia(), recuperada = false;
if (ALMACEN === 'sqlite') { abrirSqlite(); db = leerSqlite(); }
else { const r = cargarJson(); if (r.datos) Object.assign(db, r.datos); recuperada = r.recuperada; normalizar(db); db.actividad = Array.isArray(db.actividad) ? db.actividad : []; }
// La administración ya no es una cuenta de usuario: las cuentas que lo eran pasan a cliente con acceso de cortesía
db.users.forEach((u) => { if (u.rol === 'admin') { u.rol = 'cliente'; u.pagado = true; u.venceAcceso = null; u.estado = 'activo'; u.nota = ((u.nota || '') + ' Antigua cuenta de administración: acceso sin vencimiento.').trim(); } });

// Copia del mes: antes de la primera escritura de cada mes se rota (.1 la del mes anterior, .2 la de hace dos meses;
// la tercera se escribe sobre la más antigua). En SQLite, con VACUUM INTO, que hace una copia coherente y compacta sin parar el servidor.
// Las copias diarias las hacen fuera de este disco las de Hetzner y la copia externa cifrada.
const BASE = ALMACEN === 'sqlite' ? DB_SQL : DB_FILE;
const copia = (i) => `${BASE}.${i}`;
const esteMes = () => today().slice(0, 7);
let copiaMes = (() => { try { return fs.statSync(copia(1)).mtime.toISOString().slice(0, 7); } catch { return null; } })();
function rotarCopias() {
  if (copiaMes === esteMes() || !fs.existsSync(BASE) || txProf) return; // VACUUM INTO no puede ir dentro de una transacción
  try {
    for (let i = COPIAS - 1; i >= 1; i--) if (fs.existsSync(copia(i))) fs.renameSync(copia(i), copia(i + 1));
    if (sql) sql.exec(`VACUUM INTO '${copia(1).replace(/'/g, "''")}'`); else fs.copyFileSync(DB_FILE, copia(1));
    fs.chmodSync(copia(1), 0o600);
    for (let i = COPIAS + 1; fs.existsSync(copia(i)); i++) fs.unlinkSync(copia(i)); // restos del antiguo ciclo de 7 copias
    copiaMes = esteMes();
  } catch (e) { console.error('Copia de seguridad de la base de datos:', e.message); }
}
let saveTimer = null;
function saveNow() {
  clearTimeout(saveTimer); saveTimer = null;
  try {
    rotarCopias();
    if (sql) return volcarSqlite();
    const tmp = DB_FILE + '.tmp';
    fs.rmSync(tmp, { force: true });
    fs.writeFileSync(tmp, JSON.stringify(db), { mode: 0o600 });
    fs.renameSync(tmp, DB_FILE);
  } catch (e) { console.error('No se pudo guardar la base de datos (se reintenta en 5 s):', e); setTimeout(save, 5000).unref(); }
}
// Agrupa las escrituras: como mucho una cada 300 ms (sin aplazarla indefinidamente si llegan muchas seguidas)
function save() { if (!saveTimer) saveTimer = setTimeout(saveNow, 300); }

/* --- Datos de cada cuenta (por clave) y análisis de mercado --- */
const tamanos = new Map(); // solo en modo JSON: tamaño guardado de cada clave por cuenta
const D = sql ? {
  get: (c, k) => { const r = stmt('SELECT v FROM datos WHERE cuenta = ? AND clave = ?').get(c, k); return r ? JSON.parse(r.v) : null; },
  set: (c, k, v, j) => { rotarCopias(); stmt('INSERT INTO datos (cuenta, clave, v, bytes, actualizado) VALUES (?, ?, ?, ?, ?) ON CONFLICT(cuenta, clave) DO UPDATE SET v = excluded.v, bytes = excluded.bytes, actualizado = excluded.actualizado').run(c, k, j, Buffer.byteLength(j), now()); },
  del: (c, k) => { rotarCopias(); stmt('DELETE FROM datos WHERE cuenta = ? AND clave = ?').run(c, k); },
  tamanos: (c) => Object.fromEntries(stmt('SELECT clave, bytes FROM datos WHERE cuenta = ?').all(c).map((r) => [r.clave, r.bytes])),
  borrarCuenta: (c) => { stmt('DELETE FROM datos WHERE cuenta = ?').run(c); stmt('DELETE FROM mercado WHERE cuenta = ?').run(c); },
  mercado: (c) => { const r = stmt('SELECT v FROM mercado WHERE cuenta = ?').get(c); return r ? JSON.parse(r.v) : null; },
  setMercado: (c, a) => { rotarCopias(); stmt('INSERT INTO mercado (cuenta, v, actualizado) VALUES (?, ?, ?) ON CONFLICT(cuenta) DO UPDATE SET v = excluded.v, actualizado = excluded.actualizado').run(c, JSON.stringify(a), now()); }
} : {
  get: (c, k) => (db.data[c] || {})[k] ?? null,
  set: (c, k, v, j) => { (db.data[c] = db.data[c] || {})[k] = v; D.tamanos(c)[k] = Buffer.byteLength(j); save(); },
  del: (c, k) => { if (db.data[c]) delete db.data[c][k]; delete D.tamanos(c)[k]; save(); },
  tamanos: (c) => {
    if (!tamanos.has(c)) { const t = {}; Object.entries(db.data[c] || {}).forEach(([k, v]) => { t[k] = Buffer.byteLength(JSON.stringify(v) || ''); }); tamanos.set(c, t); }
    return tamanos.get(c);
  },
  borrarCuenta: (c) => { delete db.data[c]; delete db.mercado[c]; tamanos.delete(c); save(); },
  mercado: (c) => db.mercado[c] || null,
  setMercado: (c, a) => { db.mercado[c] = a; save(); }
};

/* --- Registro de actividad: quién, qué, cuándo, sobre qué cuenta, antes y después --- */
const ACTIVIDAD_DIAS = num('ACTIVIDAD_DIAS', 730);
const ACT = sql ? {
  anotar: (a) => stmt('INSERT INTO actividad (fecha, quien, accion, cuenta, email, antes, despues, nota, ip) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(a.fecha, a.quien, a.accion, a.cuenta || null, a.email || null, a.antes ? JSON.stringify(a.antes) : null, a.despues ? JSON.stringify(a.despues) : null, a.nota || null, a.ip || null),
  listar: (f) => {
    const w = [], p = [];
    if (f.cuenta) { w.push('cuenta = ?'); p.push(f.cuenta); }
    if (f.accion) { w.push('accion LIKE ?'); p.push(f.accion.replace(/[%_]/g, '') + '%'); }
    if (f.desde) { w.push('fecha >= ?'); p.push(f.desde); }
    if (f.hasta) { w.push('fecha <= ?'); p.push(f.hasta + '￿'); }
    if (f.q) { w.push("(IFNULL(email, '') || ' ' || quien || ' ' || accion || ' ' || IFNULL(nota, '')) LIKE ?"); p.push('%' + f.q.replace(/[%_]/g, '') + '%'); }
    return sql.prepare(`SELECT * FROM actividad ${w.length ? 'WHERE ' + w.join(' AND ') : ''} ORDER BY id DESC LIMIT ?`).all(...p, f.limite)
      .map((r) => Object.assign({}, r, { antes: r.antes ? JSON.parse(r.antes) : null, despues: r.despues ? JSON.parse(r.despues) : null }));
  },
  purgar: (lim) => Number(stmt('DELETE FROM actividad WHERE fecha < ?').run(lim).changes),
  borrarCuenta: () => 0 // se conserva: es el rastro de lo que se hizo (ver RGPD.md)
} : {
  anotar: (a) => { db.actividadN = (db.actividadN || 0) + 1; db.actividad.unshift(Object.assign({ id: db.actividadN }, a)); if (db.actividad.length > 20000) db.actividad.length = 20000; save(); },
  listar: (f) => db.actividad.filter((a) => (!f.cuenta || a.cuenta === f.cuenta) && (!f.accion || a.accion.startsWith(f.accion)) && (!f.desde || a.fecha >= f.desde) && (!f.hasta || a.fecha <= f.hasta + '￿')
    && (!f.q || `${a.email || ''} ${a.quien} ${a.accion} ${a.nota || ''}`.toLowerCase().includes(f.q.toLowerCase()))).slice(0, f.limite),
  purgar: (lim) => { const n = db.actividad.length; db.actividad = db.actividad.filter((a) => a.fecha >= lim); if (db.actividad.length !== n) save(); return n - db.actividad.length; },
  borrarCuenta: () => 0
};

// Al parar el servidor (systemd, Docker, Ctrl+C) se guarda lo pendiente y se cierra la base antes de salir
let cerrando = false;
['SIGTERM', 'SIGINT'].forEach((sig) => process.on(sig, () => {
  if (cerrando) return; cerrando = true;
  if (saveTimer) saveNow();
  if (sql) { try { sql.close(); } catch (e) { console.error('Al cerrar la base:', e.message); } }
  console.log(`${sig}: datos guardados, servidor detenido.`); process.exit(0);
}));

// Exportar la base a JSON (para volver a ALMACEN=json o revisar los datos): node server.mjs --exportar-json fichero.json
if (process.argv.includes('--exportar-json')) {
  const dest = path.resolve(process.argv[process.argv.indexOf('--exportar-json') + 1] || path.join(DATA_DIR, `db.exportado-${sello()}.json`));
  const out = Object.assign({}, db);
  if (sql) {
    out.data = {}; out.mercado = {};
    sql.prepare('SELECT cuenta, clave, v FROM datos').all().forEach((r) => { (out.data[r.cuenta] = out.data[r.cuenta] || {})[r.clave] = JSON.parse(r.v); });
    sql.prepare('SELECT cuenta, v FROM mercado').all().forEach((r) => { out.mercado[r.cuenta] = JSON.parse(r.v); });
    out.actividad = ACT.listar({ limite: 1e9 });
  }
  fs.writeFileSync(dest, JSON.stringify(out), { mode: 0o600 });
  console.log(`Base exportada a ${dest} (${out.users.length} cuentas).`);
  if (sql) sql.close();
  process.exit(0);
}

/* ---------- Utilidades ---------- */
const uid = () => 'u' + crypto.randomBytes(8).toString('hex');
const hashPw = (pw, salt) => crypto.scryptSync(pw, salt, 64).toString('hex');
const sha = (t) => crypto.createHash('sha256').update(t).digest('hex');
const safeEq = (a, b) => typeof a === 'string' && typeof b === 'string' && a.length === b.length && crypto.timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
// Lo que sale de una cuenta hacia el navegador: nunca la contraseña ni el secreto del segundo factor
const pub = (u) => { if (!u) return null; const { hash, salt, totp, ...rest } = u; return Object.assign(rest, { dosPasos: !!(totp && totp.activo), requiereTarjeta: pideTarjeta(u) }, PLANES_VARIAS.includes(u.plan) ? { iaEmpresaLimite: { mes: iaEmpresaMesDe(u), dia: IA_DIARIA_EMPRESA } } : {}); };
const emailOk = (e) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e);
function access(u) {
  if (!u) return { ok: false, motivo: 'sin-sesion' };
  if (u.estado === 'bloqueado') return { ok: false, motivo: 'bloqueado' };
  // Cuenta de demostración: acceso pagado sin vencimiento mientras DEMO_PASSWORD esté puesta (ver configurarDemo)
  if (u.demo) return u.demoInactiva ? { ok: false, motivo: 'bloqueado' } : { ok: true, motivo: 'pagado' };
  if (u.pagado && (!u.venceAcceso || Date.parse(u.venceAcceso) > Date.now())) return { ok: true, motivo: 'pagado' };
  // Prueba con tarjeta (Checkout de Stripe con periodo de prueba): manda el estado de la suscripción, no la fecha interna.
  // «trialing» da acceso completo; «past_due» al terminar la prueba, los días de gracia; cancelada (sin tarjeta al final), nada.
  if (!u.pagado && u.stripeSuscripcion) {
    const fin = Date.parse(u.stripeFinPrueba) || 0, gracia = STRIPE_GRACIA_DIAS * 864e5;
    if (u.stripeEstado === 'trialing' && (!fin || fin + gracia > Date.now())) return { ok: true, motivo: 'prueba' };
    if (u.stripeEstado === 'past_due' && fin && fin + gracia > Date.now()) return { ok: true, motivo: 'prueba' };
    // Una suscripción sin prueba que aún no se ha cobrado (p. ej. «incomplete») no quita la prueba interna que quedara
    if (u.pruebaStripeUsada) return { ok: false, motivo: 'pago' };
  }
  // Prueba sin tarjeta con Stripe configurado y precio en línea para su plan: antes de seguir, el Checkout con la tarjeta
  if (pideTarjeta(u)) return { ok: false, motivo: 'tarjeta' };
  // La prueba dura PRUEBA_DIAS desde el alta, o hasta «pruebaHasta» si la administración la ha ampliado
  if (!u.pagado && finPruebaInterna(u) > Date.now()) return { ok: true, motivo: 'prueba' };
  return { ok: false, motivo: 'pago' };
}
function cookies(req) {
  const out = {};
  for (const c of String(req.headers.cookie || '').split(';')) {
    const i = c.indexOf('='); if (i < 1) continue;
    let v = c.slice(i + 1).trim(); try { v = decodeURIComponent(v); } catch { /* valor sin codificar: se usa tal cual */ }
    out[c.slice(0, i).trim()] = v;
  }
  return out;
}
// Las sesiones se guardan por el SHA-256 de su identificador: quien lea db.json no puede usarlas.
// Migración de las bases anteriores (guardadas en claro): basta con aplicar el hash a la clave.
if (!db.sesionesHash) {
  const rehash = (o) => Object.fromEntries(Object.entries(o || {}).map(([k, v]) => [sha(k), v]));
  db.sessions = rehash(db.sessions); db.adminSessions = rehash(db.adminSessions); db.sesionesHash = 1; save();
}
function currentUser(req) {
  const sid = cookies(req)[COOKIE];
  const s = sid && db.sessions[sha(sid)];
  if (!s || Date.parse(s.exp) < Date.now()) return null;
  const u = db.users.find((x) => x.id === s.userId) || null;
  return u && u.demo && u.demoInactiva ? null : u;
}
function startSession(res, u) {
  const sid = crypto.randomBytes(32).toString('hex');
  db.sessions[sha(sid)] = { userId: u.id, exp: new Date(Date.now() + SESSION_DAYS * 864e5).toISOString() };
  res.setHeader('Set-Cookie', `${COOKIE}=${sid}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_DAYS * 86400}${SECURE ? '; Secure' : ''}`);
}
// IP del cliente. Detrás de un proxy (Caddy, Nginx) con TRUST_PROXY=n se toma de X-Forwarded-For la entrada
// que añadió el proxy de confianza más cercano (n-ésima por la derecha); sin TRUST_PROXY no se lee la cabecera.
const TRUST_PROXY = Math.max(0, num('TRUST_PROXY', 0) | 0);
function ipDe(req) {
  if (TRUST_PROXY) {
    const xs = String(req.headers['x-forwarded-for'] || '').split(',').map((s) => s.trim()).filter(Boolean);
    if (xs.length) return xs[Math.max(0, xs.length - TRUST_PROXY)].slice(0, 60);
  }
  return String(req.socket.remoteAddress || '').slice(0, 60);
}

/* ---------- Límites de intentos: un contador por ruta y por clave (IP, correo o cuenta) ---------- */
const LIMITES = { // [máximo, minutos]
  login_ip: [30, 15], login_email: [10, 15], login_demo: [num('DEMO_INTENTOS_HORA', 10), 60], login_demo_ip: [num('DEMO_INTENTOS_HORA', 10), 60], verificar: [10, 15], registro: [num('REGISTROS_HORA', 5), 60],
  contacto: [6, 60], olvido_ip: [10, 60], olvido_email: [3, 60], restablecer: [20, 15], admin: [10, 15], test: [300, 15], dospasos: [10, 15],
  integracion: [num('INTEGRACION_MINUTO', 60), 1], integracion_fallo: [10, 15]
};
const intentos = new Map();
function bloqueado(tipo, clave) {
  const [max, min] = LIMITES[tipo], k = tipo + '|' + clave;
  const a = (intentos.get(k) || []).filter((t) => Date.now() - t < min * 60e3);
  if (a.length) intentos.set(k, a); else intentos.delete(k);
  return a.length >= max;
}
function anotar(tipo, clave) { const k = tipo + '|' + clave; if (!intentos.has(k)) intentos.set(k, []); intentos.get(k).push(Date.now()); }
const demasiados = (msg) => fallo(429, msg || 'Demasiados intentos. Espere unos minutos.');

/* ---------- Administración: contraseña propia, separada de las cuentas de usuario ---------- */
function setAdminPassword(pw) { const salt = crypto.randomBytes(16).toString('hex'); db.admin = { salt, hash: hashPw(pw, salt), cambiado: now() }; db.adminSessions = {}; save(); }
// ADMIN_PASSWORD sirve para la primera configuración y para recuperar el acceso: solo se aplica si cambia su valor
// (se guarda su huella), así una contraseña cambiada desde la administración no se pisa en cada arranque.
if (env.ADMIN_PASSWORD) {
  const pw = env.ADMIN_PASSWORD;
  if (pw.length < 10) console.warn('ADMIN_PASSWORD debe tener al menos 10 caracteres; se ignora.');
  else {
    const usada = !!(db.adminEnv && safeEq(hashPw(pw, db.adminEnv.salt), db.adminEnv.hash));
    if (!db.admin || (!usada && !safeEq(hashPw(pw, db.admin.salt), db.admin.hash))) { setAdminPassword(pw); console.log('Contraseña de administración fijada desde ADMIN_PASSWORD.'); }
    if (!usada) { const salt = crypto.randomBytes(16).toString('hex'); db.adminEnv = { salt, hash: hashPw(pw, salt) }; save(); }
  }
}
// Quien ha perdido el teléfono y los códigos de recuperación de la administración: arrancar con ADMIN_2FA_RESET=<palabra>.
// Como ADMIN_PASSWORD, cada valor se aplica una sola vez (se guarda su huella): si la variable se queda puesta, no vuelve a quitarlo.
if (env.ADMIN_2FA_RESET && db.adminTotp && db.admin2faReset !== sha('2fa:' + env.ADMIN_2FA_RESET)) {
  delete db.adminTotp; db.adminSessions = {}; db.admin2faReset = sha('2fa:' + env.ADMIN_2FA_RESET); save();
  console.warn('ADMIN_2FA_RESET: segundo factor de la administración desactivado. Vuelva a activarlo desde el gestor de usuarios.');
}
// Sin contraseña de administración: código de configuración de un solo uso que solo ve quien arranca el servidor
let setupCode = null;
if (!db.admin) { setupCode = crypto.randomBytes(5).toString('hex').toUpperCase(); console.log(`\n  Configura la administración en ${APP_URL}/admin.html con este código: ${setupCode}\n  (o arranca con ADMIN_PASSWORD=...)\n`); }
function adminSesion(req) {
  const sid = cookies(req)[ADMIN_COOKIE];
  const s = sid && db.adminSessions[sha(sid)];
  return db.admin && s && Date.parse(s.exp) > Date.now() ? s : null;
}
const isAdmin = (req) => !!adminSesion(req);
// «nombre»: quien entra a la administración lo puede indicar al entrar; firma sus acciones en el registro de actividad
function startAdminSession(res, nombre) {
  const sid = crypto.randomBytes(32).toString('hex');
  db.adminSessions[sha(sid)] = { exp: new Date(Date.now() + ADMIN_HOURS * 3600e3).toISOString(), nombre: String(nombre || '').trim().slice(0, 60) || null };
  Object.keys(db.adminSessions).forEach((k) => { if (Date.parse(db.adminSessions[k].exp) < Date.now()) delete db.adminSessions[k]; });
  res.setHeader('Set-Cookie', `${ADMIN_COOKIE}=${sid}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${ADMIN_HOURS * 3600}${SECURE ? '; Secure' : ''}`);
  save();
}

/* ---------- Comprobaciones de producción ---------- */
if (env.NODE_ENV === 'production') {
  const mal = [];
  if (!/^https:\/\//.test(APP_URL)) mal.push(`APP_URL (${APP_URL}) no empieza por https://`);
  if (!SECURE) mal.push('COOKIE_SECURE no está a 1 (las cookies de sesión viajarían sin cifrar)');
  if (mal.length) {
    console.error('\n  ATENCIÓN · configuración insegura para producción:\n   - ' + mal.join('\n   - '));
    if (env.ATALAYA_PERMITIR_INSEGURO !== '1') { console.error('  El servidor no arranca. Corrígelo o, solo si sabes lo que haces, arranca con ATALAYA_PERMITIR_INSEGURO=1.\n'); process.exit(1); }
    console.error('  Se arranca igualmente porque ATALAYA_PERMITIR_INSEGURO=1.\n');
  }
  if (!db.admin) console.warn('\n  ATENCIÓN · la administración no tiene contraseña: configúrala ya con el código de arriba o con ADMIN_PASSWORD.\n');
}

/* ---------- Secreto del servidor (enlaces de los test) ----------
   Los enlaces de las invitaciones se derivan de este secreto y del id de la invitación: en db.json solo queda su hash. */
const SECRETO = (() => {
  if (env.ATALAYA_SECRETO) return env.ATALAYA_SECRETO;
  const f = path.join(DATA_DIR, 'secreto.key');
  try { const s = fs.readFileSync(f, 'utf8').trim(); if (s.length >= 32) return s; } catch { /* se crea */ }
  const s = crypto.randomBytes(32).toString('hex'); fs.writeFileSync(f, s, { mode: 0o600 }); return s;
})();

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
  if (!env.SMTP_HOST) return false;
  try {
    if (!mailer) {
      const { default: nodemailer } = await import('nodemailer');
      mailer = nodemailer.createTransport({ host: env.SMTP_HOST, port: +env.SMTP_PORT || 587, secure: env.SMTP_SECURE === '1', auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined });
    }
    await mailer.sendMail({ from: env.SMTP_FROM || env.SMTP_USER, to, subject, text });
    return true;
  } catch (e) { console.error('Correo:', e.message); return false; }
}

// Avisos al equipo (AVISOS_EMAIL, una o varias direcciones separadas por comas): altas, contactos, solicitudes de
// activación y pagos. No retrasan la respuesta al cliente y, sin correo configurado, no hacen nada.
function avisarEquipo(asunto, lineas, u) {
  if (!env.AVISOS_EMAIL || !env.SMTP_HOST || (u && u.demo)) return;
  const texto = lineas.filter(Boolean).join('\n') + `\n\nGestor de usuarios: ${APP_URL}/admin.html`;
  sendMail(env.AVISOS_EMAIL, `Atalaya · ${asunto}`, texto).catch(() => { /* ya registrado en sendMail */ });
}

/* ---------- HubSpot (CRM de Business Avance): una sola bandeja de interesados ----------
   Con HUBSPOT_TOKEN (token de una aplicación privada con permisos de contactos, empresas, notas y tareas), cada solicitud
   de contacto, de sesión estratégica, de activación o de cambio de plan y cada alta crean o actualizan el contacto por su
   correo (o su teléfono), lo asocian a su empresa (por dominio o por nombre), añaden una nota con el origen y una tarea
   para HUBSPOT_OWNER_ID. Va en segundo plano y en fila (no retrasa la respuesta al cliente); ante 429 o fallos del
   servidor de HubSpot se reintenta. Cada envío tiene una clave: si se repite, no se duplican ni la nota ni la tarea.
   Sin HUBSPOT_TOKEN no hace nada. HUBSPOT_API_URL cambia la dirección base (pruebas). */
const HS_URL = (env.HUBSPOT_API_URL || 'https://api.hubapi.com').replace(/\/$/, '');
const HS_GENERICOS = new Set(['gmail.com', 'googlemail.com', 'hotmail.com', 'hotmail.es', 'outlook.com', 'outlook.es', 'live.com', 'live.es', 'msn.com', 'yahoo.com', 'yahoo.es', 'icloud.com', 'me.com', 'protonmail.com', 'proton.me', 'gmx.com', 'gmx.es', 'aol.com', 'telefonica.net', 'movistar.es']);
const esperar = (ms) => new Promise((r) => setTimeout(r, ms).unref());
const hsEnviados = () => (db.hubspot = db.hubspot && typeof db.hubspot === 'object' ? db.hubspot : {});
async function hsApi(metodo, ruta, cuerpo) {
  for (let i = 0; ; i++) {
    let r = null, j = {};
    try {
      r = await fetch(HS_URL + ruta, { method: metodo, signal: AbortSignal.timeout(20000), headers: { Authorization: `Bearer ${env.HUBSPOT_TOKEN}`, 'Content-Type': 'application/json' }, body: cuerpo ? JSON.stringify(cuerpo) : undefined });
      j = await r.json().catch(() => ({}));
    } catch (e) { r = null; j = { message: e.message }; }
    if (r && r.ok) return j;
    const reintentar = !r || r.status === 429 || r.status >= 500;
    if (!reintentar || i >= (r && r.status === 429 ? 6 : 3)) throw Object.assign(new Error(`HubSpot ${metodo} ${ruta}: ${r ? r.status : 'sin respuesta'} ${j.message || ''}`.trim()), { status: r && r.status, cuerpo: j });
    const ra = r && +r.headers.get('retry-after');
    await esperar(ra > 0 ? Math.min(ra, 30) * 1000 : Math.min(10000, 500 * 2 ** i));
  }
}
const hsBuscar = async (objeto, prop, valor) => {
  const r = await hsApi('POST', `/crm/v3/objects/${objeto}/search`, { filterGroups: [{ filters: [{ propertyName: prop, operator: 'EQ', value: valor }] }], properties: [prop], limit: 1 });
  return (r.results && r.results[0] && String(r.results[0].id)) || null;
};
// Teléfono en E.164 (+34 por defecto), igual que lo guarda el asistente: «600 111 222», «0034600111222» y «+34600111222»
// son el mismo contacto. Si no parece un teléfono, se deja como venía.
function telE164(t) {
  if (!t) return null;
  let s = String(t).trim().replace(/[^\d+]/g, '');
  if (s.startsWith('00')) s = '+' + s.slice(2);
  if (/^[6789]\d{8}$/.test(s)) s = '+34' + s;
  else if (/^34[6789]\d{8}$/.test(s)) s = '+' + s;
  return /^\+\d{8,15}$/.test(s) ? s : String(t).trim();
}
// Contacto de HubSpot por teléfono: en phone o mobilephone, en E.164 o con las formas españolas habituales
async function hsBuscarTelefono(tel) {
  const e = telE164(tel); if (!e) return null;
  const vars = [e];
  if (/^\+34\d{9}$/.test(e)) { const n = e.slice(3); vars.push(n, `+34 ${n.slice(0, 3)} ${n.slice(3, 6)} ${n.slice(6)}`); }
  const grupos = [{ filters: [{ propertyName: 'phone', operator: 'EQ', value: e }] }, { filters: [{ propertyName: 'mobilephone', operator: 'EQ', value: e }] }]
    .concat(vars.slice(1).map((v) => ({ filters: [{ propertyName: 'phone', operator: 'EQ', value: v }] })));
  const r = await hsApi('POST', '/crm/v3/objects/contacts/search', { filterGroups: grupos.slice(0, 5), properties: ['phone', 'mobilephone'], limit: 1 });
  return (r.results && r.results[0] && String(r.results[0].id)) || null;
}
// Contacto por correo (o teléfono): lo crea o le completa los datos. Devuelve su id.
async function hsContacto(d) {
  const props = {};
  const tel = telE164(d.telefono);
  if (d.email) props.email = d.email;
  if (d.nombre) { const [nom, ...ap] = d.nombre.trim().split(/\s+/); props.firstname = nom; if (ap.length) props.lastname = ap.join(' '); }
  if (tel) props.phone = tel;
  if (d.empresa) props.company = d.empresa;
  if (d.cuenta && env.HUBSPOT_PROP_CUENTA) props[env.HUBSPOT_PROP_CUENTA] = d.cuenta;
  let id = d.hubspotContactId || (d.email && (await hsBuscar('contacts', 'email', d.email))) || (tel && (await hsBuscarTelefono(tel))) || null;
  if (id) { await hsApi('PATCH', `/crm/v3/objects/contacts/${id}`, { properties: props }); return id; }
  try { return String((await hsApi('POST', '/crm/v3/objects/contacts', { properties: props })).id); }
  catch (e) { const m = e.status === 409 && /Existing ID:\s*(\d+)/.exec((e.cuerpo && e.cuerpo.message) || ''); if (m) return m[1]; throw e; }
}
// Empresa por dominio del correo (si no es de un proveedor genérico) o por nombre; si no existe se crea
async function hsEmpresa(d) {
  if (d.hubspotCompanyId) return String(d.hubspotCompanyId);
  const dom = d.email && d.email.split('@')[1], dominio = dom && !HS_GENERICOS.has(dom) ? dom : null;
  if (!dominio && !d.empresa) return null;
  const id = (dominio && (await hsBuscar('companies', 'domain', dominio))) || (d.empresa && (await hsBuscar('companies', 'name', d.empresa)));
  if (id) return id;
  return String((await hsApi('POST', '/crm/v3/objects/companies', { properties: Object.assign({ name: d.empresa || dominio }, dominio ? { domain: dominio } : {}) })).id);
}
const hsA = (id, tipo) => ({ to: { id }, types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: tipo }] });
const hsHtml = (s) => String(s || '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])).replace(/\n/g, '<br>');
// Un envío: { clave, origen, nombre, email, telefono, empresa, mensaje, cuenta, contacto (id de la solicitud), tarea (false: solo nota) }
async function hsEnviar(ev) {
  const reg = hsEnviados(), hecho = (reg[ev.clave] = reg[ev.clave] || { fecha: now(), origen: ev.origen });
  const u = ev.cuenta ? db.users.find((x) => x.id === ev.cuenta) : null;
  const d = Object.assign({}, ev, { hubspotContactId: (u && u.hubspotContactId) || null, hubspotCompanyId: (u && u.hubspotCompanyId) || ev.hubspotCompanyId || null });
  if (!hecho.contacto) hecho.contacto = await hsContacto(d);
  else await hsContacto(Object.assign(d, { hubspotContactId: hecho.contacto })); // reenvío: solo se actualizan los datos
  if (hecho.empresa === undefined) {
    hecho.empresa = await hsEmpresa(d);
    if (hecho.empresa) await hsApi('PUT', `/crm/v3/objects/contacts/${hecho.contacto}/associations/companies/${hecho.empresa}/contact_to_company`);
  }
  // Los identificadores quedan en la cuenta y en la solicitud (para el gestor de usuarios y la integración con el asistente)
  if (u) { u.hubspotContactId = hecho.contacto; if (hecho.empresa && !u.hubspotCompanyId) u.hubspotCompanyId = hecho.empresa; }
  const c = ev.contacto && (db.contactos || []).find((x) => x.id === ev.contacto); if (c) { c.hubspotContactId = hecho.contacto; if (hecho.empresa) c.hubspotCompanyId = hecho.empresa; }
  save();
  const asoc = (tc, te) => [hsA(hecho.contacto, tc)].concat(hecho.empresa ? [hsA(hecho.empresa, te)] : []);
  if (!hecho.nota) {
    const cuerpo = `<b>${hsHtml(ev.origen)}</b><br>${hsHtml([ev.nombre, ev.email, ev.telefono, ev.empresa].filter(Boolean).join(' · '))}${ev.mensaje ? '<br><br>' + hsHtml(ev.mensaje) : ''}${ev.cuenta ? `<br><br>Cuenta de Atalaya 360°: ${hsHtml(ev.cuenta)} · ${hsHtml(APP_URL)}/admin.html` : ''}`;
    hecho.nota = String((await hsApi('POST', '/crm/v3/objects/notes', { properties: { hs_timestamp: now(), hs_note_body: cuerpo }, associations: asoc(202, 190) })).id); save();
  }
  if (ev.tarea !== false && !hecho.tarea) {
    const props = { hs_timestamp: new Date(Date.now() + 864e5).toISOString(), hs_task_subject: `${ev.origen}: ${ev.nombre || ev.email}`.slice(0, 250), hs_task_body: hsHtml([ev.mensaje, ev.telefono ? 'Teléfono: ' + ev.telefono : ''].filter(Boolean).join('\n')), hs_task_status: 'NOT_STARTED', hs_task_priority: 'HIGH', hs_task_type: ev.telefono ? 'CALL' : 'EMAIL' };
    if (env.HUBSPOT_OWNER_ID) props.hubspot_owner_id = env.HUBSPOT_OWNER_ID;
    hecho.tarea = String((await hsApi('POST', '/crm/v3/objects/tasks', { properties: props, associations: asoc(204, 192) })).id); save();
  }
  hecho.ok = now();
  const ks = Object.keys(reg); if (ks.length > 3000) ks.sort((a, b) => String(reg[a].fecha).localeCompare(String(reg[b].fecha))).slice(0, ks.length - 3000).forEach((k) => delete reg[k]);
  save();
}
let hsFila = Promise.resolve();
function aHubspot(ev) {
  if (!env.HUBSPOT_TOKEN || !ev || !ev.email && !ev.telefono) return;
  // La cuenta de demostración no es un interesado: nada suyo llega al CRM
  if (db.users.some((x) => x.demo && (x.id === ev.cuenta || x.email === String(ev.email || '').trim().toLowerCase()))) return;
  ev.email = ev.email ? String(ev.email).trim().toLowerCase() : '';
  const r = hsEnviados()[ev.clave];
  if (r && r.ok && (ev.tarea === false || r.tarea)) return; // ya enviado entero: un reenvío no duplica
  // En fila: dos envíos seguidos del mismo correo no crean dos contactos
  hsFila = hsFila.then(() => hsEnviar(ev)).catch((e) => console.error(`HubSpot (${ev.origen}):`, e.message));
}

/* ---------- Registro de actividad ----------
   Cada acción del gestor de usuarios (y los hechos de cuenta relevantes: altas, cambios de plan, pagos de Stripe)
   queda con fecha, autor, acción, cuenta afectada, valores antes y después, nota e IP de quien la hizo. */
function quienDe(req) {
  const s = req && adminSesion(req);
  if (s) return s.nombre ? `${s.nombre} (administración)` : 'administración';
  return req && currentUser(req) ? 'cliente' : 'sistema';
}
function anotarActividad(req, accion, u, extra) {
  extra = extra || {};
  try {
    ACT.anotar({ fecha: now(), quien: extra.quien || quienDe(req), accion, cuenta: u ? u.id : extra.cuenta || null, email: u ? u.email : extra.email || null, antes: extra.antes || null, despues: extra.despues || null, nota: extra.nota ? String(extra.nota).slice(0, 500) : null, ip: req ? ipDe(req) : null });
  } catch (e) { console.error('Registro de actividad:', e.message); }
}
// Solo los campos que cambian, con su valor antes y después
function diferencias(antes, despues, campos) {
  const a = {}, d = {};
  campos.forEach((k) => { const x = antes[k] === undefined ? null : antes[k], y = despues[k] === undefined ? null : despues[k]; if (JSON.stringify(x) !== JSON.stringify(y)) { a[k] = x; d[k] = y; } });
  return Object.keys(a).length ? { antes: a, despues: d } : null;
}
const CAMPOS_CUENTA = ['nombre', 'email', 'empresa', 'telefono', 'plan', 'periodo', 'estado', 'pagado', 'venceAcceso', 'pruebaHasta', 'planPendiente', 'cuotaPactada', 'tramo', 'iaEmpresaMes', 'nota', 'stripeFinPrueba'];
const foto = (u) => JSON.parse(JSON.stringify(Object.fromEntries(CAMPOS_CUENTA.map((k) => [k, u[k]]))));

/* ---------- Segundo factor (TOTP, RFC 6238) ----------
   Códigos de 6 cifras cada 30 s con HMAC-SHA1, como Google Authenticator, Microsoft Authenticator o 1Password.
   El secreto se guarda cifrado (AES-256-GCM con una clave derivada del secreto del servidor) y cada código vale una vez.
   Los códigos de recuperación (10, de un solo uso) se guardan por su HMAC. Obligatorio no es: se activa desde la
   administración (y, si el cliente quiere, en su cuenta). */
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
function base32(buf) {
  let bits = 0, val = 0, out = '';
  for (const b of buf) { val = (val << 8) | b; bits += 8; while (bits >= 5) { out += B32[(val >>> (bits - 5)) & 31]; bits -= 5; } val &= (1 << bits) - 1; }
  return bits ? out + B32[(val << (5 - bits)) & 31] : out;
}
function deBase32(s) {
  const out = []; let bits = 0, val = 0;
  for (const ch of String(s).toUpperCase().replace(/[^A-Z2-7]/g, '')) { val = (val << 5) | B32.indexOf(ch); bits += 5; if (bits >= 8) { out.push((val >>> (bits - 8)) & 255); bits -= 8; } val &= (1 << bits) - 1; }
  return Buffer.from(out);
}
function hotp(clave, contador, digitos = 6) {
  const c = Buffer.alloc(8); c.writeBigUInt64BE(BigInt(contador));
  const h = crypto.createHmac('sha1', clave).update(c).digest(), o = h[h.length - 1] & 15;
  return String((h.readUInt32BE(o) & 0x7fffffff) % 10 ** digitos).padStart(digitos, '0');
}
const igualTexto = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };
// Devuelve el paso de 30 s del código si es válido (admite el anterior y el siguiente por desfase de reloj) y posterior al último usado
function pasoTotp(clave, codigo, ultimo) {
  const t = Math.floor(Date.now() / 30000);
  for (const d of [0, -1, 1]) if (t + d > (ultimo || 0) && igualTexto(hotp(clave, t + d), codigo)) return t + d;
  return 0;
}
const claveCifrado = () => crypto.createHash('sha256').update('atalaya-totp:' + SECRETO).digest();
function cifrar(texto) {
  const iv = crypto.randomBytes(12), c = crypto.createCipheriv('aes-256-gcm', claveCifrado(), iv);
  const ct = Buffer.concat([c.update(texto, 'utf8'), c.final()]);
  return 'v1.' + Buffer.concat([iv, c.getAuthTag(), ct]).toString('base64url');
}
function descifrar(s) {
  const b = Buffer.from(String(s).slice(3), 'base64url'), d = crypto.createDecipheriv('aes-256-gcm', claveCifrado(), b.subarray(0, 12));
  d.setAuthTag(b.subarray(12, 28)); return Buffer.concat([d.update(b.subarray(28)), d.final()]).toString('utf8');
}
const hashRecuperacion = (c) => crypto.createHmac('sha256', SECRETO).update('rec:' + String(c).toUpperCase().replace(/[^A-Z0-9]/g, '')).digest('hex');
function codigosRecuperacion() {
  const codigos = Array.from({ length: 10 }, () => { const s = base32(crypto.randomBytes(7)).slice(0, 10); return s.slice(0, 5) + '-' + s.slice(5); });
  return { codigos, hashes: codigos.map(hashRecuperacion) };
}
const uriTotp = (secreto, cuenta) => `otpauth://totp/${encodeURIComponent('Atalaya 360°:' + cuenta)}?secret=${secreto}&issuer=${encodeURIComponent('Atalaya 360°')}&algorithm=SHA1&digits=6&period=30`;
// Altas a medio hacer: el secreto nuevo espera en memoria (15 min) hasta que se confirma con un código
const altasTotp = new Map();
function iniciarTotp(quien, cuenta) {
  const secreto = base32(crypto.randomBytes(20));
  altasTotp.set(quien, { secreto, exp: Date.now() + 15 * 60e3 });
  return { secreto, secretoAgrupado: secreto.match(/.{1,4}/g).join(' '), uri: uriTotp(secreto, cuenta) };
}
// Confirma el alta con el primer código: devuelve el registro que se guarda y los códigos de recuperación (se ven una vez)
function confirmarTotp(quien, codigo) {
  const p = altasTotp.get(quien);
  if (!p || p.exp < Date.now()) throw fallo(400, 'El alta del segundo factor ha caducado. Empiece de nuevo.');
  const paso = pasoTotp(deBase32(p.secreto), String(codigo || '').trim(), 0);
  if (!paso) throw fallo(400, 'El código no es correcto. Compruebe la hora del teléfono y escriba el código que se ve ahora.');
  altasTotp.delete(quien);
  const r = codigosRecuperacion();
  return { registro: { activo: true, cifrado: cifrar(p.secreto), ultimo: paso, codigos: r.hashes, alta: now() }, codigos: r.codigos };
}
// Comprueba un código de 6 cifras o uno de recuperación (que se gasta). Devuelve 'totp', 'recuperacion' o null.
function comprobarSegundo(t, codigo) {
  const c = String(codigo || '').trim();
  if (!t || !t.activo || !c) return null;
  if (/^\d{6}$/.test(c)) {
    let clave; try { clave = deBase32(descifrar(t.cifrado)); } catch { console.error('Segundo factor: no se puede descifrar el secreto (¿ha cambiado ATALAYA_SECRETO?)'); return null; }
    const paso = pasoTotp(clave, c, t.ultimo); if (!paso) return null;
    t.ultimo = paso; save(); return 'totp';
  }
  const i = (t.codigos || []).indexOf(hashRecuperacion(c));
  if (i < 0) return null;
  t.codigos.splice(i, 1); save(); return 'recuperacion';
}

/* ---------- Stripe Billing (sin SDK: API REST con STRIPE_SECRET_KEY) ----------
   Precios por plan y periodo: STRIPE_PRECIO_<PLAN>_<PERIODO> (p. ej. STRIPE_PRECIO_PROFESIONAL_ANUAL=price_…)
   o STRIPE_PRECIOS='{"profesional-mensual":"price_…", …}'. Consultora, por tramo de empresas cliente:
   STRIPE_PRECIO_CONSULTORA_5_MENSUAL, _5_ANUAL, _10_MENSUAL, _10_ANUAL, _15_MENSUAL y _15_ANUAL (claves «consultora5-mensual»,
   «consultora10-anual»…). Las antiguas STRIPE_PRECIO_CONSULTORA_MENSUAL/ANUAL (y «consultora-mensual») valen como tramo de 5.
   Sin STRIPE_SECRET_KEY, todo sigue como antes:
   enlace de pago manual (P.PAGO_URLS en el navegador) o «Solicitar el enlace de pago». */
const STRIPE_PRECIOS = (() => {
  const m = {};
  // «consultora-mensual» (sin tramo) vale como tramo de 5; una clave explícita del tramo («consultora5-mensual») manda sobre ella
  const antiguo = {};
  const poner = (k, v) => { const r = /^consultora-(mensual|anual)$/.exec(k); if (r) antiguo[r[1]] = v; else m[k] = v; };
  try { Object.entries(JSON.parse(env.STRIPE_PRECIOS || '{}')).forEach(([k, v]) => poner(k.toLowerCase().replace(/_/g, '-').replace(/^consultora-(\d+)-/, 'consultora$1-'), String(v))); } catch { console.error('STRIPE_PRECIOS no es un JSON válido: se ignora.'); }
  PLANES.forEach((p) => PERIODOS.forEach((per) => { const v = env[`STRIPE_PRECIO_${p.toUpperCase()}_${per.toUpperCase()}`]; if (v) poner(`${p}-${per}`, v); }));
  TRAMOS_CONSULTORA.forEach((t) => PERIODOS.forEach((per) => { const v = env[`STRIPE_PRECIO_CONSULTORA_${t}_${per.toUpperCase()}`]; if (v) m[`consultora${t}-${per}`] = v; }));
  PERIODOS.forEach((per) => { if (antiguo[per] && !m[`consultora5-${per}`]) m[`consultora5-${per}`] = antiguo[per]; });
  return m;
})();
const STRIPE = !!env.STRIPE_SECRET_KEY;
const STRIPE_GRACIA_DIAS = num('STRIPE_GRACIA_DIAS', 3); // días de margen tras el fin del periodo pagado (reintentos de cobro)
const planDePrecio = (id) => Object.keys(STRIPE_PRECIOS).find((k) => STRIPE_PRECIOS[k] === id) || null;
// «consultora10-anual» → { plan: 'consultora', tramo: 10, periodo: 'anual' }; «profesional-mensual» → sin tramo
const leerPlanPer = (k) => { const r = /^([a-z]+?)(\d+)?-([a-z]+)$/.exec(String(k || '')); return r ? { plan: r[1], tramo: r[2] ? +r[2] : null, periodo: r[3] } : { plan: null, tramo: null, periodo: null }; };
// Clave del precio de Stripe que toca pagar: en Consultora, la del tramo de sus empresas cliente (o el pendiente, si es mayor)
function clavePrecioDe(u, plan, periodo) {
  if (plan !== 'consultora') return `${plan}-${periodo}`;
  const pend = u.planPendiente && u.planPendiente.plan === 'consultora' ? +u.planPendiente.tramo || 0 : 0;
  return `consultora${Math.max(tramoConsultora(cuentanEmpresas('consultora', nEmpresas(u))), TRAMOS_CONSULTORA.includes(pend) ? pend : 0)}-${periodo}`;
}
/* ---------- Prueba con tarjeta (Checkout con periodo de prueba) ----------
   Con Stripe configurado y un precio en línea para su plan, la prueba de PRUEBA_DIAS días se hace con tarjeta: el Checkout
   la pide y Stripe no cobra hasta el día siguiente al final de la prueba. Solo hay una prueba con Stripe por cuenta
   (u.pruebaStripeUsada). Quedan fuera las cuentas que ya han pagado (Stripe o pago registrado a mano), las de Grupos y las de
   cuota pactada: siguen como antes. */
// STRIPE_PRUEBA_TARJETA=0 vuelve a la prueba sin tarjeta (Stripe solo para pagar, sin periodo de prueba en el Checkout)
const PRUEBA_TARJETA = env.STRIPE_PRUEBA_TARJETA !== '0';
const finPruebaInterna = (u) => Math.max(Date.parse(u.alta) + PRUEBA_DIAS * 864e5, Date.parse(u.pruebaHasta) || 0);
const SUSCRIPCION_VIVA = ['active', 'trialing', 'past_due'];
// Cuenta en la prueba interna, sin tarjeta, a la que se le pide el Checkout antes de seguir
function pideTarjeta(u) {
  if (!STRIPE || !PRUEBA_TARJETA || !u || u.demo || u.estado === 'bloqueado' || u.pagado || u.stripeSuscripcion || (u.pagos || []).length || u.plan === 'grupos' || u.cuotaPactada > 0) return false;
  if (!(finPruebaInterna(u) > Date.now())) return false;
  return !!STRIPE_PRECIOS[clavePrecioDe(u, u.plan, u.periodo || 'mensual')];
}
/* Parámetros de la prueba en el Checkout (null si la cuenta no tiene derecho a ella). Regla de los días:
   - cuenta recién creada (le quedan los PRUEBA_DIAS días, con una hora de margen): trial_period_days = PRUEBA_DIAS;
   - prueba ya empezada sin tarjeta con más de 48 horas por delante: trial_end = el final de su prueba interna (ni pierde ni gana días);
   - menos de 48 horas (Stripe no admite un trial_end tan cercano): trial_period_days = los días que le quedan redondeados
     hacia arriba (1 o 2), es decir, como mucho unas horas de más y nunca de menos. */
function pruebaCheckout(u, plan) {
  if (!PRUEBA_TARJETA || u.pagado || (u.pagos || []).length || u.pruebaStripeUsada || u.stripeSuscripcion || plan === 'grupos' || u.cuotaPactada > 0) return null;
  const fin = finPruebaInterna(u), resto = fin - Date.now();
  if (!(resto > 0)) return null;
  if (Math.abs(resto - PRUEBA_DIAS * 864e5) <= 3600e3) return { 'subscription_data[trial_period_days]': String(PRUEBA_DIAS), fin: Date.now() + PRUEBA_DIAS * 864e5 };
  if (resto > 48 * 3600e3 + 600e3) return { 'subscription_data[trial_end]': String(Math.floor(fin / 1000)), fin };
  const dias = Math.max(1, Math.ceil(resto / 864e5));
  return { 'subscription_data[trial_period_days]': String(dias), fin: Date.now() + dias * 864e5 };
}
// Durante la prueba con tarjeta, la suscripción de Stripe sigue al plan, al periodo y (en Consultora) al tramo de la cuenta:
// se cambia el precio sin prorrateo (no hay nada cobrado todavía). Si no hay precio en línea para lo nuevo, se avisa al equipo.
async function seguirPrecioEnStripe(req, u) {
  if (!STRIPE || u.pagado || !u.stripeSuscripcion || u.stripeEstado !== 'trialing' || u.cuotaPactada > 0) return;
  const clave = clavePrecioDe(u, u.plan, u.periodo || 'mensual'), precio = STRIPE_PRECIOS[clave], { tramo } = leerPlanPer(clave);
  if (!precio || precio === u.stripePrecio) { if (!precio) avisarEquipo(`Cambio en prueba sin precio en línea: ${u.nombre || u.email}`, [`${u.nombre || ''} <${u.email}> está en la prueba con tarjeta y ha pasado a ${NOMBRE_PLAN[u.plan] || u.plan}${tramo ? ` (tramo ${NOMBRE_TRAMO[tramo]})` : ''}, pago ${u.periodo || 'mensual'}, que no tiene precio en Stripe.`, 'Cambie a mano el precio de su suscripción en Stripe antes del final de la prueba.']); return; }
  if (!u.stripeItem) { avisarEquipo(`Cambio en prueba: ${u.nombre || u.email}`, [`${u.nombre || ''} <${u.email}> ha pasado a ${clave} durante la prueba con tarjeta.`, 'Cambie el precio de su suscripción en Stripe (sin prorrateo) antes del final de la prueba.']); return; }
  const antes = u.stripePrecio || null;
  try {
    await stripeApi(`subscriptions/${encodeURIComponent(u.stripeSuscripcion)}`, { 'items[0][id]': u.stripeItem, 'items[0][price]': precio, proration_behavior: 'none', 'metadata[plan]': u.plan, 'metadata[periodo]': u.periodo || 'mensual', 'metadata[tramo]': tramo ? String(tramo) : '' });
    u.stripePrecio = precio; if (tramo) u.tramo = tramo;
    anotarActividad(req, 'stripe.precio', u, { quien: 'cliente', antes: { precio: antes }, despues: Object.assign({ precio: clave }, tramo ? { tramo } : {}), nota: 'Precio de la suscripción cambiado durante la prueba (sin prorrateo)' });
    save();
  } catch (e) {
    avisarEquipo(`No se pudo cambiar el precio en Stripe: ${u.nombre || u.email}`, [`${u.nombre || ''} <${u.email}> está en la prueba con tarjeta y ha pasado a ${clave}, pero Stripe no ha aceptado el cambio.`, 'Cambie el precio de su suscripción en Stripe (sin prorrateo) antes del final de la prueba.']);
  }
}
// Línea de los correos de alta para las cuentas a las que se pedirá la tarjeta al entrar
const AVISO_TARJETA = (u) => (pideTarjeta(u) ? 'Al entrar le pediremos una tarjeta en nuestra pasarela de pago segura. No se cobra nada hasta el final de la prueba y puede cancelar antes sin coste.\n' : '');
const eurTxt = (n) => Number(n).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: 'always' }) + ' €';
const fechaLarga = (ms) => new Date(ms).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Madrid' });
async function stripeApi(ruta, params) {
  let r, j = {};
  try {
    r = await fetch(`${(env.STRIPE_API_URL || 'https://api.stripe.com').replace(/\/$/, '')}/v1/${ruta}`, {
      method: 'POST', signal: AbortSignal.timeout(20000),
      headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(params).toString()
    });
    j = await r.json().catch(() => ({}));
  } catch (e) { console.error(`Stripe (${ruta}):`, e.message); }
  if (!r || !r.ok) {
    if (r) console.error(`Stripe (${ruta}): ${r.status}`, (j.error && j.error.message) || '');
    throw fallo(502, 'La pasarela de pago no ha respondido. Inténtelo de nuevo en unos minutos o solicite el enlace de pago.', { manual: true });
  }
  return j;
}
// Firma del aviso de Stripe: cabecera «t=…,v1=…», HMAC-SHA256 de «t.cuerpo» con STRIPE_WEBHOOK_SECRET y 5 minutos de margen
function firmaStripeOk(cuerpo, cabecera, secreto, ahora = Date.now()) {
  let t = null; const v1 = [];
  String(cabecera || '').split(',').forEach((p) => { const i = p.indexOf('='); if (i < 1) return; const k = p.slice(0, i).trim(), v = p.slice(i + 1).trim(); if (k === 't') t = v; else if (k === 'v1') v1.push(v); });
  if (!/^\d{1,12}$/.test(t || '') || !v1.length || Math.abs(ahora / 1000 - +t) > 300) return false;
  const esperado = Buffer.from(crypto.createHmac('sha256', secreto).update(t + '.').update(cuerpo).digest('hex'), 'hex');
  return v1.some((s) => /^[0-9a-f]{64}$/i.test(s) && crypto.timingSafeEqual(Buffer.from(s, 'hex'), esperado));
}
// Cuenta a la que se refiere un objeto de Stripe: la que se le pasó al crear el pago o la de su cliente de Stripe
function cuentaStripe(o) {
  const meta = o.metadata || {}, sub = ((o.parent && o.parent.subscription_details) || o.subscription_details || {}).metadata || {};
  const id = o.client_reference_id || meta.cuenta || sub.cuenta, cliente = o.customer && (o.customer.id || o.customer);
  return (id && db.users.find((x) => x.id === id)) || (cliente && db.users.find((x) => x.stripeCliente === cliente)) || null;
}
const precioLinea = (l) => l && ((l.price && l.price.id) || (l.pricing && l.pricing.price_details && l.pricing.price_details.price) || (l.plan && l.plan.id)) || null;
// Activa o renueva el acceso pagado: plan y periodo del precio, vencimiento al final del periodo más los días de gracia.
// Si el plan pagado es el que el cliente había pedido (planPendiente), la solicitud queda resuelta.
// Plan, periodo y tramo del precio de Stripe
function planDeStripe(u, planPer) {
  if (!planPer) return;
  const { plan, periodo, tramo } = leerPlanPer(planPer);
  if (PLANES.includes(plan) && plan !== u.plan) { (u.cambiosPlan = u.cambiosPlan || []).push({ de: u.plan, a: plan, fecha: now(), por: 'stripe' }); u.plan = plan; }
  if (PERIODOS.includes(periodo)) u.periodo = periodo;
  // Consultora: el tramo cobrado pasa a ser el facturado
  if (plan === 'consultora' && TRAMOS_CONSULTORA.includes(tramo)) u.tramo = tramo;
}
// Prueba con tarjeta en Stripe: estado «prueba» (sin marcar la cuenta como pagada) con el plan del precio de la suscripción
function pruebaPorStripe(u, planPer, finPruebaSeg) {
  const antes = foto(u);
  planDeStripe(u, planPer);
  if (u.estado !== 'bloqueado') u.estado = 'prueba';
  if (finPruebaSeg) u.stripeFinPrueba = new Date(+finPruebaSeg * 1000).toISOString();
  if (!u.pruebaStripeUsada) u.pruebaStripeUsada = now();
  delete u.solicitudPago;
  return diferencias(antes, foto(u), CAMPOS_CUENTA);
}
function activarPorStripe(u, planPer, finSegundos) {
  const antes = foto(u), eraPagado = u.pagado;
  planDeStripe(u, planPer);
  const pp = u.planPendiente;
  if (pp && (pp.tramo ? u.plan !== 'consultora' || +u.tramo >= +pp.tramo : ORDEN_PLAN[pp.plan] <= ORDEN_PLAN[u.plan])) {
    delete u.planPendiente;
    (db.contactos || []).forEach((c) => { if (c.origen === 'cambio-plan' && c.cuenta === u.id && !c.atendido) c.atendido = now(); });
  }
  u.pagado = true; if (u.estado !== 'bloqueado') u.estado = 'activo';
  if (finSegundos) {
    const v = new Date((+finSegundos + STRIPE_GRACIA_DIAS * 86400) * 1000).toISOString();
    // Sin vencimiento (acceso de cortesía) se respeta; si ya vencía más tarde, no se acorta
    if (!eraPagado || (u.venceAcceso && Date.parse(v) > Date.parse(u.venceAcceso))) u.venceAcceso = v;
  }
  delete u.solicitudPago; delete u.pagoFallido;
  return diferencias(antes, foto(u), CAMPOS_CUENTA);
}
async function eventoStripe(ev) {
  const o = (ev.data && ev.data.object) || {}, u = cuentaStripe(o), tipo = ev.type;
  const quien = { quien: 'stripe', nota: `${tipo} · ${ev.id}` };
  if (!u) { if (/^(checkout|invoice|customer\.subscription)\./.test(tipo)) console.warn(`Stripe: ${tipo} (${ev.id}) sin cuenta de Atalaya asociada.`); return; }
  // La cuenta de demostración nunca tiene pagos: un aviso que la nombrara no cambia nada ni envía correos
  if (u.demo) { console.warn(`Stripe: ${tipo} (${ev.id}) se refiere a la cuenta de demostración; se ignora.`); return; }
  if (tipo === 'checkout.session.completed') {
    if (o.mode !== 'subscription' && o.payment_status !== 'paid') return;
    if (o.customer) u.stripeCliente = o.customer.id || o.customer;
    const subId = o.subscription && (o.subscription.id || o.subscription), otraSub = subId && u.stripeSuscripcion !== subId;
    if (subId) u.stripeSuscripcion = subId;
    const meta = o.metadata || {}, planPer = meta.plan && meta.periodo ? `${meta.plan}${meta.plan === 'consultora' && meta.tramo ? meta.tramo : ''}-${meta.periodo}` : null;
    // Checkout con prueba: la tarjeta queda guardada y no se cobra nada hasta el final de la prueba; la cuenta sigue «en prueba»
    if (o.mode === 'subscription' && meta.prueba === '1' && !u.pagado) {
      // Si el aviso de la suscripción llegó antes, su estado manda; si no, la suscripción recién creada está en prueba
      if (otraSub || !u.stripeEstadoEv) u.stripeEstado = 'trialing';
      const dif = pruebaPorStripe(u, planPer, !u.stripeFinPrueba || otraSub ? +meta.finPrueba || null : null);
      anotarActividad(null, 'stripe.prueba', u, Object.assign({}, quien, dif || {}));
      avisarEquipo(`Prueba con tarjeta: ${u.nombre || u.email}`, [`${u.nombre || ''} <${u.email}> ha añadido la tarjeta en Stripe y empieza la prueba del plan ${NOMBRE_PLAN[u.plan] || u.plan} (${u.periodo}).`, `Primer cobro: ${u.stripeFinPrueba ? fechaLarga(Date.parse(u.stripeFinPrueba)) : 'al final de la prueba'}, salvo que cancele antes.`]);
      save(); return;
    }
    u.stripeEstado = 'active';
    // Vencimiento provisional (un periodo); la factura pagada (invoice.paid) lo fija con la fecha exacta
    const fin = Math.floor(Date.now() / 1000) + (meta.periodo === 'anual' ? 366 : 31) * 86400;
    const dif = activarPorStripe(u, planPer, fin);
    anotarActividad(null, 'stripe.checkout', u, Object.assign({}, quien, dif || {}));
    avisarEquipo(`Pago con tarjeta: ${u.nombre || u.email}`, [`${u.nombre || ''} <${u.email}> ha pagado el plan ${NOMBRE_PLAN[u.plan] || u.plan} (${u.periodo}) en Stripe.`, o.amount_total != null ? `Importe: ${(o.amount_total / 100).toFixed(2)} ${String(o.currency || '').toUpperCase()}` : '']);
  } else if (tipo === 'invoice.paid' || tipo === 'invoice.payment_succeeded') {
    // Factura de 0 € con la que Stripe abre la prueba: no es un pago ni activa el acceso pagado
    if (!(o.amount_paid > 0) && (o.billing_reason === 'subscription_create' || (!u.pagado && u.stripeEstado === 'trialing'))) {
      if (o.customer && !u.stripeCliente) u.stripeCliente = o.customer.id || o.customer;
      save(); return;
    }
    const lineas = (o.lines && o.lines.data) || [], l = lineas.slice().sort((a, b) => ((b.period || {}).end || 0) - ((a.period || {}).end || 0))[0];
    const planPer = planDePrecio(precioLinea(l));
    if (o.customer && !u.stripeCliente) u.stripeCliente = o.customer.id || o.customer;
    const sub = o.subscription || (o.parent && o.parent.subscription_details && o.parent.subscription_details.subscription);
    if (sub) u.stripeSuscripcion = sub.id || sub;
    const dif = activarPorStripe(u, planPer, l && l.period && l.period.end);
    // Renovación de Consultora con menos empresas cliente que el tramo cobrado: la bajada se aplica cambiando el precio en Stripe
    if (u.plan === 'consultora' && +u.tramo > tramoConsultora(cuentanEmpresas('consultora', nEmpresas(u)))) avisarEquipo(`Bajada de tramo posible: ${u.nombre || u.email}`, [`${u.nombre || ''} <${u.email}> tiene ${cuentanEmpresas('consultora', nEmpresas(u))} empresas cliente y Stripe le cobra el tramo ${NOMBRE_TRAMO[u.tramo]}.`, `Para que la siguiente renovación sea del tramo ${NOMBRE_TRAMO[tramoConsultora(cuentanEmpresas('consultora', nEmpresas(u)))]}, cambie el precio de su suscripción en Stripe (sin prorrateo ni devolución).`]);
    u.pagos = u.pagos || [];
    // invoice.paid e invoice.payment_succeeded llegan las dos: el pago se apunta una sola vez por factura
    if (!u.pagos.some((p) => p.stripeFactura === o.id)) {
      const pago = { id: nid('p', 5), fecha: now(), importe: (o.amount_paid || 0) / 100, meses: planPer && planPer.endsWith('-anual') ? 12 : 1, referencia: `Stripe ${o.number || o.id}`, por: 'stripe', stripeFactura: o.id, factura: o.hosted_invoice_url || null };
      u.pagos.push(pago);
      anotarActividad(null, 'pago.stripe', u, Object.assign({}, quien, { despues: Object.assign({ pago }, (dif || {}).despues || {}), antes: (dif || {}).antes || null }));
      avisarEquipo(`Cobro recibido: ${u.nombre || u.email}`, [`Stripe ha cobrado ${pago.importe.toFixed(2)} ${String(o.currency || 'eur').toUpperCase()} a ${u.nombre || ''} <${u.email}> (factura ${o.number || o.id}).`, `Plan ${NOMBRE_PLAN[u.plan] || u.plan} · acceso hasta ${u.venceAcceso ? u.venceAcceso.slice(0, 10) : 'sin vencimiento'}.`]);
    }
  } else if (tipo === 'invoice.payment_failed') {
    u.pagoFallido = now();
    anotarActividad(null, 'pago.fallido', u, Object.assign({}, quien, { nota: `${quien.nota} · intento ${o.attempt_count || 1}` }));
    avisarEquipo(`Cobro fallido: ${u.nombre || u.email}`, [`Stripe no ha podido cobrar a ${u.nombre || ''} <${u.email}> (intento ${o.attempt_count || 1}).`, `El acceso sigue hasta ${u.venceAcceso ? u.venceAcceso.slice(0, 10) : '—'}; Stripe reintentará el cobro.`]);
  } else if (tipo === 'customer.subscription.created' || tipo === 'customer.subscription.updated') {
    const item = o.items && o.items.data && o.items.data[0];
    // Los avisos pueden llegar desordenados: uno más antiguo que el último aplicado de la misma suscripción no cambia el estado
    const t = +ev.created || 0;
    if (t && u.stripeSuscripcion === o.id && u.stripeEstadoEv && t < u.stripeEstadoEv) { anotarActividad(null, 'stripe.suscripcion', u, Object.assign({}, quien, { nota: `${quien.nota} · ${o.status} · aviso atrasado: no cambia el estado` })); save(); return; }
    u.stripeSuscripcion = o.id; u.stripeEstado = o.status; u.stripeCancelaAlFinal = !!o.cancel_at_period_end;
    if (t) u.stripeEstadoEv = t;
    if (item && item.id) u.stripeItem = item.id;
    if (precioLinea(item)) u.stripePrecio = precioLinea(item);
    if (o.trial_end) { u.stripeFinPrueba = new Date(o.trial_end * 1000).toISOString(); if (!u.pruebaStripeUsada) u.pruebaStripeUsada = now(); }
    if (o.customer && !u.stripeCliente) u.stripeCliente = o.customer.id || o.customer;
    let dif = null;
    const planPer = planDePrecio(precioLinea(item));
    // En prueba (sin nada pagado): estado «prueba» con acceso completo mientras Stripe la mantenga
    if (o.status === 'trialing' && !u.pagado) dif = pruebaPorStripe(u, planPer, o.trial_end);
    // Fin de la prueba de una cuenta que aún no ha pagado: el acceso pagado empieza con el final de la prueba más los días de
    // gracia, y la factura pagada (invoice.paid) lo amplía hasta el final del periodo; si el cobro falla, termina con la gracia
    else if (o.status === 'active' && !u.pagado && o.trial_end) dif = activarPorStripe(u, planPer, Math.min(o.trial_end, Math.floor(Date.now() / 1000)));
    else if (o.status === 'active' || o.status === 'trialing') dif = activarPorStripe(u, planPer, o.current_period_end || (item && item.current_period_end));
    anotarActividad(null, 'stripe.suscripcion', u, Object.assign({}, quien, dif || {}, { nota: `${quien.nota} · ${o.status}${o.cancel_at_period_end ? ' · se cancela al final del periodo' : ''}` }));
  } else if (tipo === 'customer.subscription.deleted') {
    // Baja de una suscripción anterior que ya no es la de la cuenta: solo se anota
    if (u.stripeSuscripcion && o.id && o.id !== u.stripeSuscripcion) { anotarActividad(null, 'stripe.baja', u, Object.assign({}, quien, { nota: `${quien.nota} · suscripción antigua ${o.id}` })); save(); return; }
    const enPrueba = !u.pagado;
    u.stripeEstado = 'canceled'; u.stripeCancelaAlFinal = false;
    if (+ev.created) u.stripeEstadoEv = +ev.created;
    anotarActividad(null, 'stripe.baja', u, quien);
    // Prueba terminada sin tarjeta válida (o cancelada en la prueba): Stripe cancela la suscripción y el acceso termina.
    // Los datos se conservan; si vuelve, paga sin prueba.
    if (enPrueba) avisarEquipo(`Prueba terminada sin pago: ${u.nombre || u.email}`, [`${u.nombre || ''} <${u.email}> (plan ${NOMBRE_PLAN[u.plan] || u.plan}) ya no tiene suscripción en Stripe: la prueba ha terminado sin cobro o la ha cancelado.`, 'Su acceso queda cerrado y sus datos se conservan. Si vuelve, paga sin periodo de prueba.']);
    // El acceso pagado sigue hasta su vencimiento y después no se renueva
    else avisarEquipo(`Suscripción cancelada: ${u.nombre || u.email}`, [`${u.nombre || ''} <${u.email}> ya no tiene suscripción en Stripe. El acceso vence el ${u.venceAcceso ? u.venceAcceso.slice(0, 10) : '—'}.`]);
  } else if (tipo === 'customer.subscription.trial_will_end') {
    // Tres días antes del final de la prueba: correo al cliente y aviso al equipo, una sola vez por suscripción y fecha
    const clave = `${o.id}:${o.trial_end || ''}`;
    if (u.avisoFinPrueba === clave) return;
    u.avisoFinPrueba = clave; save();
    const item = o.items && o.items.data && o.items.data[0], precio = (item && (item.price || item.plan)) || {};
    const { plan, tramo, periodo } = leerPlanPer(planDePrecio(precioLinea(item)));
    const intervalo = (precio.recurring && precio.recurring.interval) || precio.interval;
    const planN = NOMBRE_PLAN[plan || u.plan] || plan || u.plan, per = periodo || (intervalo === 'year' ? 'anual' : 'mensual');
    const importe = precio.unit_amount != null ? precio.unit_amount / 100 : null;
    const fin = o.trial_end ? fechaLarga(o.trial_end * 1000) : 'el final de la prueba';
    const cuota = `${importe != null ? eurTxt(importe) + ' más IVA (21 %)' : 'la cuota de su plan más IVA (21 %)'} por el plan ${planN}${tramo ? ` (${NOMBRE_TRAMO[tramo]})` : ''} con pago ${per}`;
    const texto = o.cancel_at_period_end
      ? `Hola${u.nombre ? ' ' + u.nombre : ''}:\n\nSu prueba de Atalaya 360° termina el ${fin}. Como ha cancelado la suscripción, ese día no se le cobrará nada y su acceso terminará. Sus datos se conservan: puede descargarlos desde el menú de su cuenta («Descargar todos mis datos»).\n\nSi cambia de opinión, puede reactivarla antes de esa fecha desde Atalaya: en el menú de su cuenta, «Gestionar el pago: tarjeta y facturas».\n${APP_URL}/acceso.html\n\nEquipo de Business Avance`
      : `Hola${u.nombre ? ' ' + u.nombre : ''}:\n\nSu prueba de Atalaya 360° termina el ${fin}.\nEse día cargaremos en su tarjeta ${cuota}. Después, el cobro se repite cada ${per === 'anual' ? 'año' : 'mes'} hasta que cancele.\n\nSi quiere cambiar de plan o de tarjeta, o cancelar sin coste antes de esa fecha, entre en Atalaya y, en el menú de su cuenta, pulse «Gestionar el pago: tarjeta y facturas»:\n${APP_URL}/acceso.html\nSi cancela antes del ${fin}, no se le cobrará nada y sus datos se conservan.\n\nPara cualquier duda, responda a este correo.\n\nEquipo de Business Avance`;
    const enviado = await sendMail(u.email, `Atalaya 360° · Su prueba termina el ${fin}`, texto);
    anotarActividad(null, 'stripe.finprueba', u, Object.assign({}, quien, { nota: `${quien.nota} · fin de la prueba el ${fin} · ${enviado ? 'correo enviado' : 'sin correo'}` }));
    avisarEquipo(`La prueba termina el ${fin}: ${u.nombre || u.email}`, [`${u.nombre || ''} <${u.email}>: la prueba con tarjeta termina el ${fin}.`, o.cancel_at_period_end ? 'Ha cancelado: no se cobrará.' : `Stripe cobrará ${cuota}.`, enviado ? 'Se le ha enviado el recordatorio por correo.' : 'No se ha podido enviar el recordatorio por correo.']);
  } else return;
  save();
}
async function webhookStripe(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Método no permitido' });
  if (!env.STRIPE_WEBHOOK_SECRET) return send(res, 404, { error: 'Ruta no encontrada' });
  // Cuerpo en bruto: la firma se calcula sobre los bytes tal como llegan
  const cuerpo = await new Promise((resolve, reject) => {
    const trozos = []; let n = 0;
    req.on('data', (c) => { n += c.length; if (n > 1024 * 1024) { reject(fallo(413, 'Petición demasiado grande')); req.destroy(); } else trozos.push(c); });
    req.on('end', () => resolve(Buffer.concat(trozos))); req.on('error', reject);
  }).catch((e) => e);
  if (cuerpo instanceof Error) return res.headersSent || res.destroyed ? undefined : send(res, cuerpo.code || 400, { error: cuerpo.message });
  if (!firmaStripeOk(cuerpo, req.headers['stripe-signature'], env.STRIPE_WEBHOOK_SECRET)) { console.warn(`Stripe: aviso con firma no válida desde ${ipDe(req)}`); return send(res, 400, { error: 'Firma no válida' }); }
  let ev; try { ev = JSON.parse(cuerpo.toString('utf8')); } catch { return send(res, 400, { error: 'JSON no válido' }); }
  if (!ev || typeof ev.id !== 'string' || typeof ev.type !== 'string') return send(res, 400, { error: 'Aviso no válido' });
  // Stripe puede repetir un aviso: cada evento se aplica una sola vez
  if (db.stripeEventos[ev.id]) return send(res, 200, { recibido: true, repetido: true });
  try { await eventoStripe(ev); } catch (e) { console.error(`Stripe: error al aplicar ${ev.type} (${ev.id}):`, e); return send(res, 500, { error: 'No se pudo aplicar; Stripe lo reintentará' }); }
  db.stripeEventos[ev.id] = now();
  const ids = Object.keys(db.stripeEventos); if (ids.length > 5000) ids.sort((a, b) => db.stripeEventos[a].localeCompare(db.stripeEventos[b])).slice(0, ids.length - 5000).forEach((k) => delete db.stripeEventos[k]);
  save();
  return send(res, 200, { recibido: true });
}

/* ---------- Cabeceras de seguridad ----------
   La política de contenidos admite lo que la aplicación usa: sus ficheros, las librerías de cdnjs (Three.js, PDF.js con
   su worker, lectura de Excel, html2pdf), las fuentes de Google, la API de Claude con clave propia (conexiones.js) y los
   blob: de vídeo, PDF y calendario. Los scripts en línea de cada página se autorizan por su hash, página a página. */
const CDN = 'https://cdnjs.cloudflare.com';
const csp = (hashes) => [
  "default-src 'self'", `script-src 'self' ${CDN}${hashes && hashes.length ? ' ' + hashes.join(' ') : ''}`, `worker-src 'self' blob: ${CDN}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com", "font-src 'self' data: https://fonts.gstatic.com", "img-src 'self' data: blob:",
  "media-src 'self' blob:", `connect-src 'self' https://api.anthropic.com ${CDN}`, "frame-src 'self' blob:", "frame-ancestors 'self'",
  "object-src 'none'", "base-uri 'self'", "form-action 'self'"
].join('; ');
const CSP_BASE = csp();
function cabeceras(res) {
  res.setHeader('Content-Security-Policy', CSP_BASE);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'microphone=(self), camera=(), geolocation=(), payment=(), usb=()');
  if (SECURE) res.setHeader('Strict-Transport-Security', 'max-age=31536000');
}

function send(res, code, body) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    if (+req.headers['content-length'] > MAX_BODY) { req.resume(); return reject(fallo(413, 'Petición demasiado grande')); }
    let size = 0, roto = false; const chunks = [];
    req.on('data', (c) => { if (roto) return; size += c.length; if (size > MAX_BODY) { roto = true; chunks.length = 0; reject(fallo(413, 'Petición demasiado grande')); } else chunks.push(c); });
    req.on('end', () => { if (roto) return; try { resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}); } catch { reject(fallo(400, 'JSON no válido')); } });
    req.on('error', reject);
  });
}

/* ---------- Claude (opcional) ---------- */
let anthropic = null;
async function claude() {
  if (anthropic !== null) return anthropic;
  if (!env.ANTHROPIC_API_KEY && !env.ANTHROPIC_AUTH_TOKEN && env.ATALAYA_IA !== '1') return (anthropic = false);
  try {
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    anthropic = new Anthropic();
  } catch { anthropic = false; }
  return anthropic;
}
// Llamada con reintento automático en otro modelo si un clasificador rechaza la petición
async function ask(params) {
  const c = await claude();
  if (!c) throw fallo(503, 'La IA no está configurada en el servidor');
  const r = await c.beta.messages.create({
    model: MODEL, max_tokens: 16000, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default', ...params
  });
  // Coste de la llamada, para el tope en euros de la cuenta de demostración (conIA abre el contexto con IA_GASTO.run)
  const g = IA_GASTO.getStore(); if (g) g.usd += costeLlamada(r, params);
  return r;
}
/* Coste estimado de una llamada a partir del uso que devuelve Anthropic: entrada a 4 $ por millón de tokens (también la que
   se lee o escribe en la caché, contada como entrada normal para no quedarse cortos), salida a 20 $ por millón y búsquedas
   web a 10 $ cada mil. Sin uso en la respuesta, una estimación prudente: un token por cada 3 caracteres enviados y la salida
   máxima pedida (max_tokens, 16.000 por defecto), más las búsquedas web que admita la herramienta. */
const IA_PRECIO = { entrada: num('IA_USD_MTOK_ENTRADA', 4), salida: num('IA_USD_MTOK_SALIDA', 20), busqueda: num('IA_USD_BUSQUEDA', 0.01) };
const EUR_USD = num('EUR_USD', 1.08); // dólares por euro: el coste en euros es el coste en dólares dividido entre EUR_USD
const IA_GASTO = new AsyncLocalStorage();
function costeLlamada(r, params) {
  const us = r && r.usage;
  if (us && (us.input_tokens != null || us.output_tokens != null)) {
    const ent = (+us.input_tokens || 0) + (+us.cache_creation_input_tokens || 0) + (+us.cache_read_input_tokens || 0);
    const bus = +((us.server_tool_use || {}).web_search_requests) || 0;
    return ent * IA_PRECIO.entrada / 1e6 + (+us.output_tokens || 0) * IA_PRECIO.salida / 1e6 + bus * IA_PRECIO.busqueda;
  }
  const chars = JSON.stringify((params && (params.messages || [])) || []).length + String((params && params.system) || '').length;
  const busq = ((params && params.tools) || []).reduce((a, t) => a + (t && /^web_search/.test(t.type || '') ? +t.max_uses || 5 : 0), 0);
  return (chars / 3) * IA_PRECIO.entrada / 1e6 + ((params && params.max_tokens) || 16000) * IA_PRECIO.salida / 1e6 + busq * IA_PRECIO.busqueda;
}
const textOf = (msg) => msg.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n');
function jsonOf(text) {
  const a = text.indexOf('{'), b = text.lastIndexOf('}');
  try { if (a < 0 || b < a) throw new Error(); return JSON.parse(text.slice(a, b + 1)); } catch { throw fallo(502, 'La IA no ha devuelto datos legibles. Inténtelo de nuevo.'); }
}

/* ---------- Cuota diaria de IA por cuenta ----------
   Cada cuenta tiene un máximo de consultas y de texto enviado al día; la prueba gratuita, menos que una cuenta pagada.
   El uso queda en la cuenta (usoIA por día e iaTotal) y lo ve la administración. */
const CUOTA_IA = {
  prueba: { n: num('IA_DIARIA_PRUEBA', 20), c: num('IA_CARACTERES_PRUEBA', 1500000) },
  pago: { n: num('IA_DIARIA_PAGO', 200), c: num('IA_CARACTERES_PAGO', 10000000) },
  // Cuenta de demostración: cuota propia, más baja (la comparten quienes la usan a la vez); la cuota por empresa también se aplica
  demo: { n: num('IA_DIARIA_DEMO', 60), c: num('IA_CARACTERES_DEMO', 3000000) }
};
// Tope de gasto diario de IA de la cuenta de demostración, en euros (además de la cuota por número de consultas)
const IA_DEMO_EUR_DIA = num('IA_DEMO_EUR_DIA', 1.5);
const MSG_IA_DEMO = 'Por hoy se ha alcanzado el uso de IA previsto para la demostración. Vuelve a estar disponible mañana.';
// Qué funciones de IA abre cada plan (como P.puede en js/platform.js); null = todos los planes
const IA_PLAN = {
  chat: null, extract: null,
  escucha: { planes: ['consultora'], msg: 'La lectura con IA de la auditoría integral está incluida en el plan Consultora.' },
  mercado: { planes: ['profesional', 'consultora', 'grupos'], msg: 'El agente de mercado forma parte del sistema estratégico, incluido desde el plan Profesional.' }
};
/* Cuota por empresa en los planes con varias empresas (Consultora y Grupos): además de la diaria de la cuenta, cada empresa
   tiene un máximo de consultas al mes (IA_MENSUAL_EMPRESA, 300) y al día (IA_DIARIA_EMPRESA, 40), con los mismos pesos.
   La administración puede ampliar la mensual de una cuenta concreta (iaEmpresaMes). El navegador indica la empresa en la
   cabecera X-Atalaya-Empresa; si no viene o no es de la cuenta, cuenta como la principal.
   Uso: u.usoIAEmpresa[empresa]['AAAA-MM'] = {n, c} (mes) y ['AAAA-MM-DD'] = {n, c} (día); se guardan 13 meses y 7 días. */
const IA_MENSUAL_EMPRESA = num('IA_MENSUAL_EMPRESA', 300);
const IA_DIARIA_EMPRESA = num('IA_DIARIA_EMPRESA', 40);
const PLANES_VARIAS = ['consultora', 'grupos'];
const iaEmpresaMesDe = (u) => (+u.iaEmpresaMes > 0 ? +u.iaEmpresaMes : IA_MENSUAL_EMPRESA);
function empresaIA(u, req) {
  const h = String((req && req.headers['x-atalaya-empresa']) || '').trim().slice(0, 80);
  if (!h || h === 'principal' || !/^[\w-]+$/.test(h)) return 'principal';
  const reg = D.get(u.id, 'empresas');
  return reg && Array.isArray(reg.lista) && reg.lista.some((e) => e && e.id === h && !e.modelo) ? h : 'principal';
}
function usoEmpresa(u, em, crear) {
  const todo = u.usoIAEmpresa || (crear ? (u.usoIAEmpresa = {}) : {}), x = todo[em] || (crear ? (todo[em] = {}) : {});
  const mes = today().slice(0, 7), dia = today();
  return { x, mes: x[mes] || (crear ? (x[mes] = { n: 0, c: 0 }) : { n: 0, c: 0 }), dia: x[dia] || (crear ? (x[dia] = { n: 0, c: 0 }) : { n: 0, c: 0 }) };
}
function purgarUsoEmpresa(u) {
  const t = u.usoIAEmpresa; if (!t) return;
  Object.keys(t).forEach((em) => {
    const ks = Object.keys(t[em]);
    ks.filter((k) => k.length === 7).sort().slice(0, -13).forEach((k) => delete t[em][k]);
    ks.filter((k) => k.length === 10).sort().slice(0, -7).forEach((k) => delete t[em][k]);
    if (!Object.keys(t[em]).length) delete t[em];
  });
}
async function conIA(u, funcion, peso, chars, fn, req) {
  const p = IA_PLAN[funcion]; if (p && !p.planes.includes(u.plan)) throw fallo(403, p.msg);
  if (!(await claude())) throw fallo(503, 'La IA no está configurada en el servidor');
  const tipo = u.demo ? 'demo' : access(u).motivo === 'pagado' ? 'pago' : 'prueba', lim = CUOTA_IA[tipo];
  u.usoIA = u.usoIA || {}; const d = (u.usoIA[today()] = u.usoIA[today()] || { n: 0, c: 0 });
  // Demostración: tope en euros del día (el gasto se apunta al terminar cada consulta) y cuota por número, con el mismo aviso
  if (tipo === 'demo' && (d.eur || 0) >= IA_DEMO_EUR_DIA) throw fallo(429, MSG_IA_DEMO, { limiteDemo: true });
  if (d.n + peso > lim.n || d.c + chars > lim.c) {
    throw fallo(429, tipo === 'demo'
      ? MSG_IA_DEMO
      : tipo === 'prueba'
      ? `Ha llegado al límite diario de IA de la prueba gratuita (${lim.n} consultas o su volumen de texto). Se renueva mañana; con el plan activado el límite es mayor.`
      : `Ha llegado al límite diario de IA de su cuenta (${lim.n} consultas o su volumen de texto). Se renueva mañana; si necesita más, escríbanos.`, tipo === 'demo' ? { limiteDemo: true } : undefined);
  }
  // Varias empresas: la cuota de la empresa en la que se trabaja (las demás siguen pudiendo usar la IA)
  let ue = null;
  if (PLANES_VARIAS.includes(u.plan)) {
    const em = empresaIA(u, req), v = usoEmpresa(u, em, false), limMes = iaEmpresaMesDe(u);
    if (u.demo && (v.mes.n + peso > limMes || v.dia.n + peso > IA_DIARIA_EMPRESA)) throw fallo(429, MSG_IA_DEMO, { limiteDemo: true });
    if (v.mes.n + peso > limMes) throw fallo(429, `Ha llegado al límite mensual de IA de esta empresa (${limMes} consultas). Se renueva el día 1; si necesita más, escríbanos.`, { cuota: 'empresa-mes', empresa: em });
    if (v.dia.n + peso > IA_DIARIA_EMPRESA) throw fallo(429, `Ha llegado al límite diario de IA de esta empresa (${IA_DIARIA_EMPRESA} consultas). Se renueva mañana; si necesita más, escríbanos.`, { cuota: 'empresa-dia', empresa: em });
    ue = usoEmpresa(u, em, true);
    ue.mes.n += peso; ue.mes.c += chars; ue.dia.n += peso; ue.dia.c += chars;
    purgarUsoEmpresa(u);
  }
  d.n += peso; d.c += chars; u.iaTotal = (u.iaTotal || 0) + peso;
  Object.keys(u.usoIA).sort().slice(0, -60).forEach((k) => delete u.usoIA[k]); // solo los últimos 60 días
  save();
  const gasto = { usd: 0 };
  const apuntar = () => { if (gasto.usd > 0) { const eur = gasto.usd / EUR_USD; d.eur = Math.round(((d.eur || 0) + eur) * 1e4) / 1e4; u.iaEurTotal = Math.round(((u.iaEurTotal || 0) + eur) * 1e4) / 1e4; save(); } };
  try { const r = await IA_GASTO.run(gasto, fn); apuntar(); return r; } catch (e) {
    apuntar(); // lo que llegó a responder la API se ha gastado, aunque la consulta falle después
    // Si la API no llegó a responder (caída, saturación) la consulta no cuenta
    if (e.status || /Connection|Timeout/.test((e.constructor && e.constructor.name) || '')) {
      d.n -= peso; d.c -= chars; u.iaTotal -= peso;
      if (ue) { ue.mes.n -= peso; ue.mes.c -= chars; ue.dia.n -= peso; ue.dia.c -= chars; }
      save();
    }
    throw e;
  }
}

const SYSTEM_CHAT = `Eres el asistente de Atalaya, un simulador de inversión y crecimiento para empresarios de pymes españolas, muchos sin formación financiera.
Habla en español claro, con frases cortas y sin jerga; si usas un término técnico, explícalo en una frase.
Antes de opinar sobre la situación de la empresa, consulta la herramienta ver_situacion. No inventes cifras: usa las del simulador.
Cuando el usuario pida cambiar algo, hazlo con las herramientas y después explica qué ha cambiado (antes → ahora) y qué significa.
Si expresa una preocupación, identifica qué semáforos y variables la afectan y propone de una a tres acciones concretas con cifras, empezando por las más sencillas.
Para estructuras societarias y relaciones entre sociedades de un grupo, explica cómo funcionan con ejemplos y recuerda que la fiscalidad la debe confirmar su asesor.
Responde en 3-8 frases salvo que pidan detalle. Tus respuestas pueden leerse en voz alta: no uses tablas, asteriscos ni símbolos.
También eres el guía de Atalaya 360°: llevas al usuario de un mundo a otro (inicio, simulador de inversión, sistema estratégico, personas y equipos, mesa de trabajo y vista de grupo), a cualquier módulo, capítulo o pestaña, cierras ventanas, mapas e informes y abres el manual en el apartado que necesite. Usa donde_estoy para saber dónde está y qué hay, e ir_a_mundo, ir_a_zona, cerrar y abrir_manual para moverle. Cuando pida ir a un sitio, hazlo directamente y di en una o dos frases qué va a encontrar y qué conviene mirar primero.`;

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
      if (r.stop_reason === 'refusal') throw fallo(502, 'La consulta fue rechazada');
      return jsonOf(textOf(r));
    }
    throw fallo(504, 'La búsqueda no terminó a tiempo');
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

// «stripe»: planes y periodos que se pueden pagar en línea (Checkout); false si el cobro sigue siendo manual
route('GET', /^\/api\/health$/, async () => ({ atalaya: true, ia: !!(await claude()), version: 2, stripe: STRIPE ? Object.keys(STRIPE_PRECIOS) : false, pruebaTarjeta: STRIPE && PRUEBA_TARJETA }), { public: true });

// Hash de referencia para que un correo inexistente tarde lo mismo que una contraseña errónea
const DUMMY = (() => { const salt = crypto.randomBytes(16).toString('hex'); return { salt, hash: hashPw(crypto.randomBytes(16).toString('hex'), salt) }; })();

route('POST', /^\/api\/register$/, async (req, res, body) => {
  const ip = ipDe(req);
  if (bloqueado('registro', ip)) throw demasiados('Se han creado demasiadas cuentas desde esta conexión. Inténtelo dentro de una hora.');
  const email = String(body.email || '').trim().toLowerCase();
  if (!emailOk(email) || email.length > 160) throw fallo(400, 'Correo no válido');
  if (String(body.password || '').length < 8) throw fallo(400, 'La contraseña debe tener al menos 8 caracteres');
  if (db.users.some((u) => u.email === email)) throw fallo(409, 'Ya hay una cuenta con ese correo');
  anotar('registro', ip);
  const salt = crypto.randomBytes(16).toString('hex');
  const u = {
    id: uid(), nombre: String(body.nombre || '').slice(0, 120), email, empresa: String(body.empresa || '').slice(0, 160), telefono: String(body.telefono || '').slice(0, 40),
    // Grupos se contrata a medida: no se puede elegir al darse de alta
    plan: PLANES_LIBRES.includes(body.plan) ? body.plan : 'profesional', periodo: PERIODOS.includes(body.periodo) ? body.periodo : 'mensual', rol: 'cliente',
    estado: 'prueba', pagado: false, venceAcceso: null, alta: now(), ultimoAcceso: now(), sesiones: 1, uso: {}, pagos: [], salt, hash: hashPw(String(body.password), salt)
  };
  db.users.push(u); save(); startSession(res, u);
  anotarActividad(req, 'cuenta.alta', u, { quien: 'cliente', despues: { plan: u.plan, periodo: u.periodo } });
  avisarEquipo(`Nueva cuenta: ${u.nombre || u.email}`, [`${u.nombre || ''} <${u.email}>${u.empresa ? ' · ' + u.empresa : ''}${u.telefono ? ' · ' + u.telefono : ''}`, `Plan elegido: ${NOMBRE_PLAN[u.plan]} (${u.periodo}). Prueba de ${PRUEBA_DIAS} días.`]);
  aHubspot({ clave: 'alta:' + u.id, origen: 'Atalaya · alta de cuenta', nombre: u.nombre, email: u.email, telefono: u.telefono, empresa: u.empresa, cuenta: u.id, mensaje: `Alta en Atalaya 360° con el plan ${NOMBRE_PLAN[u.plan]} (${u.periodo}). Prueba de ${PRUEBA_DIAS} días.` });
  return { user: pub(u) };
}, { public: true });

route('POST', /^\/api\/login$/, async (req, res, body) => {
  const ip = ipDe(req), email = String(body.email || '').trim().toLowerCase().slice(0, 160);
  if (bloqueado('login_ip', ip) || bloqueado('login_email', email)) throw demasiados();
  // Cuenta de demostración: además, su propio límite de fallos (por IP y en total para la cuenta), más estricto
  const aDemo = email === DEMO_EMAIL;
  if (aDemo && (bloqueado('login_demo', 'cuenta') || bloqueado('login_demo_ip', ip))) throw demasiados();
  const u = db.users.find((x) => x.email === email);
  const ref = u || DUMMY;
  // Una cuenta de demostración desactivada (sin DEMO_PASSWORD) responde como una contraseña errónea
  const ok = safeEq(hashPw(String(body.password || ''), ref.salt), ref.hash) && !!u && !(u.demo && u.demoInactiva);
  if (!ok) { anotar('login_ip', ip); anotar('login_email', email); if (aDemo) { anotar('login_demo', 'cuenta'); anotar('login_demo_ip', ip); } throw fallo(401, 'Correo o contraseña incorrectos'); }
  // Segundo factor (si el cliente lo activó): sin código se pide; con código erróneo cuenta como intento fallido
  if (u.totp && u.totp.activo) {
    if (!String(body.codigo || '').trim()) throw fallo(401, 'Escriba el código de su aplicación de autenticación.', { segundoFactor: true });
    if (!comprobarSegundo(u.totp, body.codigo)) { anotar('login_ip', ip); anotar('login_email', email); throw fallo(401, 'El código no es correcto o ya se ha usado.', { segundoFactor: true }); }
  }
  u.ultimoAcceso = now(); u.sesiones = (u.sesiones || 0) + 1; save(); startSession(res, u);
  return { user: pub(u) };
}, { public: true });

route('POST', /^\/api\/logout$/, async (req, res) => {
  const sid = cookies(req)[COOKIE]; if (sid) { delete db.sessions[sha(sid)]; save(); }
  res.setHeader('Set-Cookie', `${COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${SECURE ? '; Secure' : ''}`);
  return { ok: true };
}, { public: true });

route('GET', /^\/api\/me$/, async (req, res, body, u) => ({ user: pub(u) }), { noAccess: true });
/* Cambio de plan por el propio cliente:
   - sin pagar (prueba o pendiente de activar): libre entre Esencial, Profesional y Consultora;
   - con el acceso pagado: bajar se aplica al momento; subir queda como «planPendiente» hasta que la administración lo confirma
     (al cambiar el plan en el gestor de usuarios), porque cambia la cuota;
   - Grupos solo lo concede la administración. */
route('PATCH', /^\/api\/me$/, async (req, res, body, u) => {
  const precioAntes = `${u.plan}-${u.periodo}`;
  // La cuenta de demostración no cambia de plan ni de forma de pago (la vista de Grupos tiene su propia ruta: /api/me/demo/vista)
  if (u.demo && ((PLANES.includes(body.plan) && body.plan !== u.plan) || (PERIODOS.includes(body.periodo) && body.periodo !== (u.periodo || 'mensual')))) throw fallo(403, NO_DEMO.plan);
  ['nombre', 'empresa', 'telefono'].forEach((k) => { if (typeof body[k] === 'string') u[k] = body[k].slice(0, 160); });
  if (PLANES.includes(body.plan) && body.plan !== u.plan) {
    const nuevo = body.plan;
    if (nuevo === 'grupos') throw fallo(403, 'El plan Grupos se contrata a medida: pida la propuesta con «Contactar con nuestro equipo».');
    // Bajar a un plan con menos empresas exige borrar antes las que sobran
    const lim = LIMITE_EMPRESAS[nuevo];
    const nCu = cuentanEmpresas(nuevo, nEmpresas(u));
    if (nCu > lim) throw fallo(400, `Tiene ${nCu} empresas y ese plan admite ${lim}. Borre antes las que sobran.`);
    if (u.pagado && ORDEN_PLAN[nuevo] > (ORDEN_PLAN[u.plan] || 0)) {
      const periodo = PERIODOS.includes(body.periodo) ? body.periodo : u.periodo || 'mensual';
      u.planPendiente = { plan: nuevo, periodo, fecha: now() };
      // Aparece en los avisos de la administración como una solicitud más
      db.contactos = (db.contactos || []).filter((c) => !(c.origen === 'cambio-plan' && c.cuenta === u.id && !c.atendido));
      db.contactos.unshift({ id: nid('c'), fecha: now(), plan: nuevo, nombre: u.nombre || '', email: u.email, telefono: u.telefono || '', empresa: u.empresa || '', mensaje: `Cambio de plan solicitado: de ${NOMBRE_PLAN[u.plan] || u.plan} a ${NOMBRE_PLAN[nuevo]} (pago ${periodo}), con el acceso ya pagado. Para confirmarlo, cambia su plan en la tabla de usuarios.`, origen: 'cambio-plan', cuenta: u.id });
      db.contactos = db.contactos.slice(0, 500);
      save();
      anotarActividad(req, 'plan.solicitud', u, { quien: 'cliente', despues: { planPendiente: u.planPendiente } });
      avisarEquipo(`Cambio de plan pedido: ${u.nombre || u.email}`, [`${u.nombre || ''} <${u.email}> pide pasar de ${NOMBRE_PLAN[u.plan] || u.plan} a ${NOMBRE_PLAN[nuevo]} (pago ${periodo}) con el acceso ya pagado.`, 'Se confirma cambiando su plan en el gestor de usuarios.']);
      aHubspot({ clave: `plan:${u.id}:${nuevo}:${periodo}:${today()}`, origen: 'Atalaya · cambio de plan', nombre: u.nombre, email: u.email, telefono: u.telefono, empresa: u.empresa, cuenta: u.id, contacto: db.contactos[0].id, mensaje: db.contactos[0].mensaje });
      throw fallo(409, `Hemos recibido su petición de pasar al plan ${NOMBRE_PLAN[nuevo]}. Como su acceso ya está activado, el cambio se aplica cuando nuestro equipo confirme la nueva cuota; le avisaremos. Mientras, sigue con su plan actual.`, { pendiente: true, planPendiente: u.planPendiente });
    }
    (u.cambiosPlan = u.cambiosPlan || []).push({ de: u.plan, a: nuevo, fecha: now() });
    anotarActividad(req, 'plan.cambio', u, { quien: 'cliente', antes: { plan: u.plan }, despues: { plan: nuevo } });
    aHubspot({ clave: `plan:${u.id}:${nuevo}:${today()}`, origen: 'Atalaya · cambio de plan', nombre: u.nombre, email: u.email, telefono: u.telefono, empresa: u.empresa, cuenta: u.id, mensaje: `Ha cambiado su plan de ${NOMBRE_PLAN[u.plan] || u.plan} a ${NOMBRE_PLAN[nuevo]} (${u.pagado ? 'acceso pagado' : 'en prueba o pendiente de activar'}).` });
    u.plan = nuevo;
    if (u.planPendiente) { delete u.planPendiente; (db.contactos || []).forEach((c) => { if (c.origen === 'cambio-plan' && c.cuenta === u.id && !c.atendido) c.atendido = now(); }); }
  }
  if (PERIODOS.includes(body.periodo)) u.periodo = body.periodo;
  save();
  // En la prueba con tarjeta, el precio de la suscripción sigue al plan y al periodo nuevos
  if (!u.pagado && precioAntes !== `${u.plan}-${u.periodo}`) await seguirPrecioEnStripe(req, u);
  return { user: pub(u) };
}, { noAccess: true });
// Solicitudes de contacto para el plan Grupos (a medida): públicas, con límite de envíos
route('POST', /^\/api\/contacto$/, async (req, res, body) => {
  const ip = ipDe(req);
  if (bloqueado('contacto', ip)) throw demasiados('Demasiados envíos. Espere unos minutos.');
  anotar('contacto', ip);
  const t = (k, n) => String(body[k] || '').slice(0, n || 160);
  if (!emailOk(t('email'))) throw fallo(400, 'Escriba un correo válido');
  db.contactos = db.contactos || [];
  const c = { id: nid('c'), fecha: now(), plan: body.tipo === 'sesion' ? 'sesion' : t('plan', 20), nombre: t('nombre'), email: t('email'), telefono: t('telefono', 40), empresa: t('empresa'), sociedades: t('sociedades', 6), mensaje: t('mensaje', 2000), origen: t('origen', 40) };
  // Si llega con sesión de cliente (p. ej. datos de facturación al pedir la activación), se enlaza con su cuenta
  const yo = currentUser(req); if (yo && String(yo.email) === c.email.toLowerCase()) c.cuenta = yo.id;
  // Desde una sesión de la cuenta de demostración: no es una solicitud real (no se guarda, no va a HubSpot ni sale ningún correo)
  if (yo && yo.demo) return { ok: true };
  // Un reenvío de la misma solicitud (mismo correo, tipo y mensaje, sin atender, en las últimas 24 horas) no se duplica
  const huella = sha([c.email.toLowerCase(), c.plan, c.origen, c.mensaje].join('|')).slice(0, 24);
  const previa = (db.contactos || []).find((x) => x.huella === huella && !x.atendido && Date.now() - Date.parse(x.fecha) < 864e5);
  if (previa) return { ok: true, repetida: true };
  c.huella = huella;
  db.contactos.unshift(c);
  db.contactos = db.contactos.slice(0, 500); save();
  const que = c.plan === 'sesion' ? 'Sesión de 60 minutos' : c.origen === 'activacion' ? 'Solicitud de activación' : `Contacto${c.plan ? ' · plan ' + (NOMBRE_PLAN[c.plan] || c.plan) : ''}`;
  avisarEquipo(`${que}: ${c.nombre || c.email}`, [`${c.nombre} <${c.email}>${c.telefono ? ' · ' + c.telefono : ''}${c.empresa ? ' · ' + c.empresa : ''}${c.sociedades ? ' · ' + c.sociedades + ' sociedades' : ''}`, c.mensaje ? `\n${c.mensaje}` : '']);
  const origenHs = c.plan === 'sesion' ? 'Atalaya · solicitud de sesión estratégica' : c.origen === 'activacion' ? 'Atalaya · solicitud de activación' : c.plan === 'grupos' ? 'Atalaya · contacto del plan Grupos' : 'Atalaya · solicitud de contacto';
  aHubspot({ clave: 'contacto:' + huella, origen: origenHs, nombre: c.nombre, email: c.email, telefono: c.telefono, empresa: c.empresa, cuenta: c.cuenta || null, contacto: c.id, tarea: !(c.origen === 'activacion' && c.cuenta), mensaje: [c.mensaje, c.sociedades ? `Sociedades: ${c.sociedades}` : '', c.origen ? `Página de origen: ${c.origen}` : ''].filter(Boolean).join('\n') });
  return { ok: true };
}, { public: true });
route('GET', /^\/api\/admin\/contactos$/, async () => ({ contactos: db.contactos || [] }), { admin: true });
// Comprueba la contraseña antes de una acción irreversible (borrar una empresa)
route('POST', /^\/api\/me\/verificar$/, async (req, res, body, u) => {
  if (bloqueado('verificar', u.id)) throw demasiados();
  const ok = safeEq(hashPw(String(body.password || ''), u.salt), u.hash);
  if (!ok) anotar('verificar', u.id);
  return { ok };
}, { noAccess: true });
route('POST', /^\/api\/me\/solicitar-pago$/, async (req, res, body, u) => {
  if (u.demo) throw fallo(403, NO_DEMO.pago);
  // Se avisa una vez al día como mucho (el botón «Pagar ahora» también la marca)
  const nueva = !u.solicitudPago || u.solicitudPago.slice(0, 10) !== today();
  u.solicitudPago = now(); save();
  if (nueva) {
    anotarActividad(req, 'pago.solicitud', u, { quien: 'cliente', despues: { plan: u.plan, periodo: u.periodo || 'mensual' } });
    avisarEquipo(`Solicitud de activación: ${u.nombre || u.email}`, [`${u.nombre || ''} <${u.email}> quiere activar el plan ${NOMBRE_PLAN[u.plan] || u.plan} (pago ${u.periodo || 'mensual'}).`, u.telefono ? `Teléfono: ${u.telefono}` : '', 'Envíele el enlace de pago y regístrelo en el gestor de usuarios al cobrar.']);
    aHubspot({ clave: `activacion:${u.id}:${today()}`, origen: 'Atalaya · solicitud de activación', nombre: u.nombre, email: u.email, telefono: u.telefono, empresa: u.empresa, cuenta: u.id, mensaje: `Quiere activar el plan ${NOMBRE_PLAN[u.plan] || u.plan} (pago ${u.periodo || 'mensual'}). Enviarle el enlace de pago.` });
  }
  return { ok: true };
}, { noAccess: true });
route('POST', /^\/api\/me\/password$/, async (req, res, body, u) => {
  if (u.demo) throw fallo(403, NO_DEMO.contrasena);
  if (bloqueado('verificar', u.id)) throw demasiados();
  if (!safeEq(hashPw(String(body.actual || ''), u.salt), u.hash)) { anotar('verificar', u.id); throw fallo(400, 'La contraseña actual no es correcta'); }
  if (String(body.nueva || '').length < 8) throw fallo(400, 'La nueva contraseña debe tener al menos 8 caracteres');
  u.salt = crypto.randomBytes(16).toString('hex'); u.hash = hashPw(String(body.nueva), u.salt);
  const sid = cookies(req)[COOKIE], mia = sid ? sha(sid) : null;
  Object.keys(db.sessions).forEach((k) => { if (db.sessions[k].userId === u.id && k !== mia) delete db.sessions[k]; });
  save(); return { ok: true };
}, { noAccess: true });

// «He olvidado mi contraseña»: siempre responde igual para no revelar qué correos existen
route('POST', /^\/api\/password\/olvido$/, async (req, res, body) => {
  const ip = ipDe(req), email = String(body.email || '').trim().toLowerCase().slice(0, 160);
  if (bloqueado('olvido_ip', ip) || bloqueado('olvido_email', email)) throw demasiados();
  anotar('olvido_ip', ip); anotar('olvido_email', email);
  // La cuenta de demostración no recupera la contraseña por correo (se fija con DEMO_PASSWORD): responde igual que un correo sin cuenta
  const u = db.users.find((x) => x.email === email && !x.demo);
  const correo = !!env.SMTP_HOST;
  if (u) {
    const token = newResetToken(u, 'usuario');
    const link = `${APP_URL}/acceso.html#reset=${token}`;
    const sent = await sendMail(u.email, 'Atalaya · Restablecer su contraseña', `Hola${u.nombre ? ' ' + u.nombre : ''}:\n\nPara crear una contraseña nueva abra este enlace (caduca en ${RESET_MIN} minutos):\n${link}\n\nSi no lo ha pedido usted, ignore este mensaje.`);
    // El enlace nunca se escribe en el registro: sin correo, la administración ve la solicitud y genera uno nuevo
    if (!sent) { u.solicitudReset = now(); save(); }
    console.log(`Recuperación de contraseña pedida para la cuenta ${u.id}: ${sent ? 'enlace enviado por correo' : 'sin correo; queda como aviso en la administración'}.`);
  }
  return { ok: true, correo };
}, { public: true });
route('POST', /^\/api\/password\/restablecer$/, async (req, res, body) => {
  const ip = ipDe(req);
  if (bloqueado('restablecer', ip)) throw demasiados();
  const k = sha(String(body.token || '')), r = db.resets[k];
  if (!r || Date.parse(r.exp) < Date.now()) { anotar('restablecer', ip); throw fallo(400, 'El enlace no es válido o ha caducado. Pida uno nuevo.'); }
  if (String(body.password || '').length < 8) throw fallo(400, 'La contraseña debe tener al menos 8 caracteres');
  const u = db.users.find((x) => x.id === r.userId); if (!u) throw fallo(404, 'Usuario no encontrado');
  if (u.demo) { delete db.resets[k]; save(); throw fallo(400, 'El enlace no es válido o ha caducado. Pida uno nuevo.'); }
  u.salt = crypto.randomBytes(16).toString('hex'); u.hash = hashPw(String(body.password), u.salt); delete u.solicitudReset;
  delete db.resets[k];
  Object.keys(db.sessions).forEach((s) => { if (db.sessions[s].userId === u.id) delete db.sessions[s]; });
  // Con el segundo factor activado, el enlace cambia la contraseña pero no abre sesión: hay que entrar con el código
  if (u.totp && u.totp.activo) { save(); return { user: null, segundoFactor: true }; }
  u.ultimoAcceso = now(); save(); startSession(res, u);
  return { user: pub(u) };
}, { public: true });

// Acceso de administración (con su propio límite de intentos)
route('GET', /^\/api\/admin\/estado$/, async (req) => {
  const s = adminSesion(req), t = db.adminTotp;
  return { configurado: !!db.admin, sesion: !!s, correo: !!env.SMTP_HOST, dosPasos: !!(t && t.activo), ...(s ? { nombre: s.nombre || null, recuperacion: t && t.activo ? (t.codigos || []).length : null, stripe: STRIPE ? { precios: Object.keys(STRIPE_PRECIOS), webhook: !!env.STRIPE_WEBHOOK_SECRET } : false, almacen: ALMACEN, avisos: !!(env.AVISOS_EMAIL && env.SMTP_HOST), demo: estadoDemo() } : {}) };
}, { public: true });
/* ---------- Revisión del sistema (administración) ----------
   GET  /api/admin/revision     comprobaciones automáticas del servidor, la base, las copias, la configuración y las cuentas.
   POST /api/admin/revision/ia  la misma revisión, leída por la IA: qué corregir primero y cómo.
   A la IA solo se le envían recuentos y estados, nunca correos, nombres ni datos de las empresas. */
const ARCHIVOS_WEB = ['index.html', 'acceso.html', 'portal.html', 'app.html', 'estrategia.html', 'mesa.html', 'tablero.html', 'libro.html', 'admin.html', 'manual.html', 'privacidad.html', 'js/platform.js', 'css/atalaya.css'];
const diasDesde = (f) => (f ? Math.floor((Date.now() - Date.parse(f)) / 864e5) : null);
function revisionSistema() {
  const c = []; // { nivel: 'grave' | 'aviso' | 'ok', area, texto, como }
  const pon = (nivel, area, texto, como) => c.push({ nivel, area, texto, ...(como ? { como } : {}) });
  const prod = env.NODE_ENV === 'production';

  // Servidor y seguridad
  if (!prod) pon('aviso', 'Servidor', 'El servidor no está en modo producción.', 'Arranque con NODE_ENV=production.');
  if (!/^https:\/\//.test(APP_URL)) pon(prod ? 'grave' : 'aviso', 'Servidor', `La dirección pública (${APP_URL}) no usa HTTPS.`, 'Ponga APP_URL=https://su-dominio y un proxy con certificado (Caddy).');
  if (!SECURE) pon(prod ? 'grave' : 'aviso', 'Servidor', 'Las cookies no van marcadas como seguras.', 'Ponga COOKIE_SECURE=1 cuando haya HTTPS.');
  if (prod && !TRUST_PROXY) pon('aviso', 'Servidor', 'No se indica el proxy de confianza: los límites de intentos ven la IP del proxy, no la del cliente.', 'Con Caddy en la misma máquina, TRUST_PROXY=1.');
  const totp = db.adminTotp;
  if (!(totp && totp.activo)) pon('grave', 'Seguridad', 'La administración no tiene segundo factor.', 'Actívelo en «Seguridad» y guarde los códigos de recuperación fuera del servidor.');
  else if ((totp.codigos || []).length < 3) pon('aviso', 'Seguridad', `Quedan ${(totp.codigos || []).length} códigos de recuperación.`, 'Genere códigos nuevos en «Seguridad».');
  if (!env.ATALAYA_SECRETO && !fs.existsSync(path.join(DATA_DIR, 'secreto.key'))) pon('grave', 'Seguridad', 'No hay secreto del servidor.', 'Revise los permisos de la carpeta de datos.');

  // Base de datos
  let tam = null;
  if (ALMACEN === 'sqlite' && sql) {
    try { const r = sql.prepare('PRAGMA quick_check').get(); const v = r && Object.values(r)[0]; v === 'ok' ? pon('ok', 'Base de datos', 'La base pasa la comprobación de integridad.') : pon('grave', 'Base de datos', `La comprobación de integridad da: ${String(v).slice(0, 120)}`, 'Pare el servidor y recupere la última copia (ATALAYA_RECUPERAR=1).'); }
    catch (e) { pon('grave', 'Base de datos', 'No se pudo comprobar la integridad de la base.', e.message.slice(0, 120)); }
    try { tam = fs.statSync(DB_SQL).size + (fs.existsSync(DB_SQL + '-wal') ? fs.statSync(DB_SQL + '-wal').size : 0); } catch { /* sin base todavía */ }
  } else pon('aviso', 'Base de datos', 'La base está en un fichero JSON, no en SQLite.', 'Use Node 22.13 o superior y quite ALMACEN=json.');

  // Copias
  const copias = [];
  for (let i = 1; i <= COPIAS; i++) { try { copias.push({ n: i, fecha: fs.statSync(copia(i)).mtime.toISOString() }); } catch { /* no existe */ } }
  const ultima = copias[0] && copias[0].fecha;
  if (!copias.length) pon(db.users.length ? 'aviso' : 'ok', 'Copias', db.users.length ? 'Todavía no hay copias mensuales en el disco.' : 'Sin copias todavía (no hay cuentas).', 'Se crean solas antes de la primera escritura de cada mes.');
  else if (diasDesde(ultima) > 40) pon('aviso', 'Copias', `La copia mensual más reciente es de hace ${diasDesde(ultima)} días.`, 'Es normal si no ha habido cambios este mes; si los hubo, revise los errores del registro.');
  else pon('ok', 'Copias', `${copias.length} ${copias.length === 1 ? 'copia mensual' : 'copias mensuales'} en el disco (se guardan ${COPIAS}; la siguiente se escribe sobre la más antigua); la última, ${diasDesde(ultima) === 0 ? 'de hoy' : `de hace ${diasDesde(ultima)} ${diasDesde(ultima) === 1 ? 'día' : 'días'}`}.`);
  let externa = null;
  try { externa = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'copia-externa.json'), 'utf8')); } catch { /* sin registro */ }
  if (!externa) pon('grave', 'Copias', 'No consta ninguna copia fuera de este servidor.', 'Configure despliegue/copia-seguridad.sh (se instala con instalar.sh) y su destino externo.');
  else if (!externa.ok) pon('grave', 'Copias', `La última copia externa falló (${String(externa.error || 'sin detalle').slice(0, 120)}).`, 'Revise el destino y la contraseña de la copia en el servidor.');
  else if (diasDesde(externa.fecha) > 1) pon('grave', 'Copias', `La última copia externa es de hace ${diasDesde(externa.fecha)} días.`, 'Revise la tarea programada de copia (systemctl status atalaya-copia.timer).');
  else pon('ok', 'Copias', `Copia externa al día (${externa.destino || 'destino configurado'}).`);

  // Disco
  try {
    const st = fs.statfsSync(DATA_DIR), libre = st.bavail * st.bsize, total = st.blocks * st.bsize, pct = total ? Math.round((libre / total) * 100) : null;
    if (pct != null && pct < 10) pon('grave', 'Disco', `Queda un ${pct} % del disco libre.`, 'Amplíe el disco o borre copias antiguas.');
    else if (pct != null && pct < 25) pon('aviso', 'Disco', `Queda un ${pct} % del disco libre.`);
    else pon('ok', 'Disco', `Disco libre: ${pct} %.`);
  } catch { /* statfs no disponible */ }

  // Web
  const faltan = ARCHIVOS_WEB.filter((f) => !fs.existsSync(path.join(ROOT, f)));
  faltan.length ? pon('grave', 'Web', `Faltan archivos de la aplicación: ${faltan.join(', ')}.`, 'Vuelva a desplegar con despliegue/actualizar.sh.') : pon('ok', 'Web', 'Están todos los archivos principales de la aplicación.');

  // Servicios conectados
  if (!env.ANTHROPIC_API_KEY && !env.ANTHROPIC_AUTH_TOKEN) pon('aviso', 'Servicios', 'La IA no está configurada: el asistente funciona en modo básico.', 'Ponga ANTHROPIC_API_KEY.');
  if (!env.SMTP_HOST) pon('aviso', 'Servicios', 'No hay correo de salida: las invitaciones y contraseñas olvidadas se atienden a mano.', 'Configure SMTP_HOST, SMTP_USER, SMTP_PASS y SMTP_FROM.');
  if (STRIPE && !env.STRIPE_WEBHOOK_SECRET) pon('grave', 'Servicios', 'Stripe está activo sin secreto del webhook: los cobros no se confirman.', 'Ponga STRIPE_WEBHOOK_SECRET.');
  if (!STRIPE) pon('aviso', 'Servicios', 'El cobro con tarjeta (Stripe) no está activo: los pagos se registran a mano.');
  if (STRIPE && PRUEBA_TARJETA && !env.SMTP_HOST) pon('aviso', 'Servicios', 'La prueba con tarjeta está activa sin correo: el cliente no recibe el recordatorio tres días antes del primer cobro.', 'Configure SMTP_HOST y los demás datos del correo.');
  if (!env.HUBSPOT_TOKEN) pon('aviso', 'Servicios', 'HubSpot no está conectado: las solicitudes no llegan al CRM.', 'Ponga HUBSPOT_TOKEN y HUBSPOT_OWNER_ID.');
  if (!env.INTEGRACION_TOKEN) pon('aviso', 'Servicios', 'La integración con el asistente telefónico está apagada.', 'Ponga el mismo INTEGRACION_TOKEN aquí y en el asistente.');

  // Cuentas y tareas pendientes (solo recuentos). La cuenta de demostración no cuenta: no es un cliente
  const us = db.users.filter((u) => !u.demo), porPlan = {}, est = { pagando: 0, prueba: 0, sinAcceso: 0, bloqueadas: 0 };
  us.forEach((u) => {
    porPlan[u.plan] = (porPlan[u.plan] || 0) + 1;
    const a = access(u);
    if (u.estado === 'bloqueado') est.bloqueadas++; else if (a.motivo === 'pagado') est.pagando++; else if (a.motivo === 'prueba' || a.motivo === 'tarjeta') est.prueba++; else est.sinAcceso++;
  });
  const fallidos = us.filter((u) => u.pagoFallido).length;
  const venceSemana = us.filter((u) => u.pagado && u.venceAcceso && Date.parse(u.venceAcceso) > Date.now() && Date.parse(u.venceAcceso) - Date.now() < 7 * 864e5).length;
  const pendientes = {
    contactos: (db.contactos || []).filter((x) => !x.atendido).length,
    contactosAntiguos: (db.contactos || []).filter((x) => !x.atendido && diasDesde(x.fecha) > 2).length,
    activacion: us.filter((u) => u.solicitudPago).length,
    cambioPlan: us.filter((u) => u.planPendiente).length,
    contrasena: us.filter((u) => u.solicitudReset).length,
  };
  if (fallidos) pon('grave', 'Cobros', `${fallidos} ${fallidos === 1 ? 'cuenta tiene' : 'cuentas tienen'} un cobro fallido.`, 'Revise la tabla de usuarios (estado «cobro fallido») y contacte con el cliente.');
  if (venceSemana) pon('aviso', 'Cobros', `${venceSemana} ${venceSemana === 1 ? 'acceso pagado vence' : 'accesos pagados vencen'} en los próximos 7 días.`);
  if (pendientes.contactosAntiguos) pon('aviso', 'Atención', `${pendientes.contactosAntiguos} solicitudes llevan más de 2 días sin atender.`, 'Ábralas en «Pendiente de atender».');
  // Cuota de IA por empresa (Consultora y Grupos): cuentas con alguna empresa por encima del 80 % de su cuota de este mes
  const mesIA = today().slice(0, 7), cercaIA = us.filter((u) => PLANES_VARIAS.includes(u.plan) && Object.values(u.usoIAEmpresa || {}).some((x) => x[mesIA] && x[mesIA].n >= 0.8 * iaEmpresaMesDe(u)));
  if (cercaIA.length) pon('aviso', 'IA', `${cercaIA.length} ${cercaIA.length === 1 ? 'cuenta tiene' : 'cuentas tienen'} alguna empresa por encima del 80 % de su cuota mensual de IA.`, 'Revise el uso de IA por empresa en la ficha de cada cuenta y, si conviene, amplíe su cuota.');
  const dm = db.users.find((u) => u.demo);
  if (dm && !dm.demoInactiva) pon('ok', 'Demostración', `Cuenta de demostración activa (plan ${NOMBRE_PLAN[dm.plan] || dm.plan}); se restablece cada noche${dm.demoRestablecida ? `, la última vez ${diasDesde(dm.demoRestablecida) === 0 ? 'hoy' : `hace ${diasDesde(dm.demoRestablecida)} días`}` : ''}.`);
  else if (dm) pon('ok', 'Demostración', 'La cuenta de demostración está desactivada (no hay DEMO_PASSWORD).');
  if (dm && !dm.demoInactiva && dm.demoRestablecida && diasDesde(dm.demoRestablecida) > 1) pon('aviso', 'Demostración', `La cuenta de demostración no se restablece desde hace ${diasDesde(dm.demoRestablecida)} días.`, 'Revise los errores del registro o restablézcala desde su ficha.');
  if (pendientes.activacion + pendientes.cambioPlan + pendientes.contrasena) pon('aviso', 'Atención', `Solicitudes abiertas: ${pendientes.activacion} de activación, ${pendientes.cambioPlan} de cambio de plan y ${pendientes.contrasena} de contraseña.`);

  // Errores recientes
  const err24 = ERRORES.filter((e) => Date.now() - Date.parse(e.fecha) < 864e5);
  if (err24.length) pon(err24.length > 10 ? 'grave' : 'aviso', 'Errores', `${err24.length} errores en el registro en las últimas 24 horas.`, 'Véalos abajo o en «docker compose logs atalaya».');
  else pon('ok', 'Errores', 'Sin errores en el registro en las últimas 24 horas.');

  const orden = { grave: 0, aviso: 1, ok: 2 };
  c.sort((a, b) => orden[a.nivel] - orden[b.nivel]);
  return {
    fecha: now(),
    resumen: { graves: c.filter((x) => x.nivel === 'grave').length, avisos: c.filter((x) => x.nivel === 'aviso').length, correctas: c.filter((x) => x.nivel === 'ok').length },
    comprobaciones: c,
    servidor: { version: '2.2', node: process.version, enMarchaHoras: Math.round(process.uptime() / 360) / 10, memoriaMB: Math.round(process.memoryUsage().rss / 1048576), almacen: ALMACEN, baseMB: tam != null ? Math.round(tam / 104857.6) / 10 : null, produccion: prod },
    copias, copiaExterna: externa ? { fecha: externa.fecha, ok: !!externa.ok, destino: externa.destino || null } : null,
    cuentas: { total: us.length, porPlan, ...est, cobrosFallidos: fallidos, vencenEstaSemana: venceSemana },
    pendientes,
    errores: ERRORES.slice(-20).reverse(),
  };
}
route('GET', /^\/api\/admin\/revision$/, async () => revisionSistema(), { admin: true });
route('POST', /^\/api\/admin\/revision\/ia$/, async (req, res, body) => {
  const r = revisionSistema();
  const pregunta = String((body && body.pregunta) || '').slice(0, 1500);
  const msg = await ask({
    max_tokens: 4000,
    output_config: { effort: 'medium' },
    system: `Es el técnico de guardia de Atalaya 360°, una aplicación web de Business Avance para pymes (Node 22, SQLite, Docker, Caddy, copias externas).
Recibe la revisión automática del servidor en JSON (solo recuentos y estados, sin datos personales). Escriba para el administrador, que no es informático: de usted, en castellano de España, frases cortas, sin superlativos y sin tablas.
Estructura: 1) Estado general en una o dos frases. 2) Qué corregir, de lo más urgente a lo menos, con el paso exacto (variable, orden o pantalla) y por qué importa. 3) Qué vigilar esta semana. No invente datos que no estén en la revisión; si algo no se puede saber con ella, dígalo y diga cómo comprobarlo.`,
    messages: [{ role: 'user', content: `Revisión del ${r.fecha}:\n${JSON.stringify(r).slice(0, 30000)}${pregunta ? `\n\nPregunta del administrador: ${pregunta}` : ''}` }],
  });
  return { revision: r, informe: textOf(msg) };
}, { admin: true });
route('POST', /^\/api\/admin\/configurar$/, async (req, res, body) => {
  if (db.admin) throw fallo(409, 'La administración ya está configurada');
  const ip = ipDe(req);
  if (bloqueado('admin', ip)) throw demasiados();
  if (!setupCode || String(body.codigo || '').trim().toUpperCase() !== setupCode) { anotar('admin', ip); throw fallo(401, 'Código de configuración incorrecto (se muestra en la consola del servidor)'); }
  if (String(body.password || '').length < 10) throw fallo(400, 'La contraseña de administración debe tener al menos 10 caracteres');
  setAdminPassword(String(body.password)); setupCode = null; startAdminSession(res, body.nombre);
  anotarActividad(req, 'admin.configurar', null, { quien: String(body.nombre || '').trim().slice(0, 60) || 'administración' });
  return { ok: true };
}, { public: true });
route('POST', /^\/api\/admin\/login$/, async (req, res, body) => {
  const ip = ipDe(req);
  if (bloqueado('admin', ip)) throw demasiados();
  const ref = db.admin || DUMMY;
  if (!safeEq(hashPw(String(body.password || ''), ref.salt), ref.hash) || !db.admin) { anotar('admin', ip); throw fallo(401, 'Contraseña de administración incorrecta'); }
  const nombre = String(body.nombre || '').trim().slice(0, 60), quien = nombre ? `${nombre} (administración)` : 'administración';
  // Segundo factor: con la contraseña correcta y sin código, se pide el código; un código erróneo cuenta como intento fallido
  let via = null;
  if (db.adminTotp && db.adminTotp.activo) {
    if (!String(body.codigo || '').trim()) throw fallo(401, 'Escriba el código de su aplicación de autenticación (o un código de recuperación).', { segundoFactor: true });
    via = comprobarSegundo(db.adminTotp, body.codigo);
    if (!via) { anotar('admin', ip); anotarActividad(req, 'admin.entrar.fallido', null, { quien, nota: 'Contraseña correcta y código de segundo factor erróneo' }); throw fallo(401, 'El código no es correcto o ya se ha usado.', { segundoFactor: true }); }
  }
  startAdminSession(res, nombre);
  anotarActividad(req, 'admin.entrar', null, { quien, nota: via === 'recuperacion' ? `Con un código de recuperación (quedan ${db.adminTotp.codigos.length})` : via ? 'Con segundo factor' : null });
  return { ok: true, recuperacion: via === 'recuperacion' ? db.adminTotp.codigos.length : undefined };
}, { public: true });
route('POST', /^\/api\/admin\/logout$/, async (req, res) => {
  const sid = cookies(req)[ADMIN_COOKIE]; if (sid && db.adminSessions[sha(sid)]) { anotarActividad(req, 'admin.salir', null); delete db.adminSessions[sha(sid)]; save(); }
  res.setHeader('Set-Cookie', `${ADMIN_COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${SECURE ? '; Secure' : ''}`);
  return { ok: true };
}, { public: true });
route('POST', /^\/api\/admin\/password$/, async (req, res, body) => {
  if (!safeEq(hashPw(String(body.actual || ''), db.admin.salt), db.admin.hash)) throw fallo(400, 'La contraseña actual no es correcta');
  if (String(body.nueva || '').length < 10) throw fallo(400, 'La nueva contraseña debe tener al menos 10 caracteres');
  const nombre = adminSesion(req).nombre;
  anotarActividad(req, 'admin.contrasena', null);
  setAdminPassword(String(body.nueva)); startAdminSession(res, nombre); return { ok: true };
}, { admin: true });
// La administración pone directamente una contraseña nueva a un usuario (se cierran sus sesiones abiertas)
route('POST', /^\/api\/admin\/users\/([\w-]+)\/password$/, async (req, res, body, me, m) => {
  const u = db.users.find((x) => x.id === m[1]); if (!u) throw fallo(404, 'Usuario no encontrado');
  noDemoAdmin(u);
  if (String(body.password || '').length < 8) throw fallo(400, 'La contraseña debe tener al menos 8 caracteres');
  u.salt = crypto.randomBytes(16).toString('hex'); u.hash = hashPw(String(body.password), u.salt); delete u.solicitudReset; u.passwordCambiada = now();
  Object.keys(db.sessions).forEach((k) => { if (db.sessions[k].userId === u.id) delete db.sessions[k]; });
  Object.keys(db.resets).forEach((k) => { if (db.resets[k].userId === u.id) delete db.resets[k]; });
  anotarActividad(req, 'cuenta.contrasena', u, { nota: 'Contraseña nueva puesta por la administración; sesiones cerradas' });
  save(); return { ok: true };
}, { admin: true });
route('POST', /^\/api\/admin\/users\/([\w-]+)\/reset$/, async (req, res, body, me, m) => {
  const u = db.users.find((x) => x.id === m[1]); if (!u) throw fallo(404, 'Usuario no encontrado');
  noDemoAdmin(u);
  const token = newResetToken(u, 'administración');
  const enviado = body.enviar ? await sendMail(u.email, 'Atalaya · Restablecer su contraseña', `Hola${u.nombre ? ' ' + u.nombre : ''}:\n\nPara crear una contraseña nueva abra este enlace (caduca en ${RESET_MIN} minutos):\n${APP_URL}/acceso.html#reset=${token}`) : false;
  delete u.solicitudReset; save();
  anotarActividad(req, 'cuenta.enlace-contrasena', u, { nota: enviado ? 'Enlace enviado por correo' : 'Enlace generado' });
  return { token, minutos: RESET_MIN, enviado };
}, { admin: true });

// Planes a medida (Grupos): la administración concede el acceso a quien pidió contacto.
// Si no tiene cuenta, se crea con el plan y una invitación para que elija su contraseña (válida 7 días).
route('POST', /^\/api\/admin\/conceder$/, async (req, res, body) => {
  const email = String(body.email || '').trim().toLowerCase();
  if (!emailOk(email)) throw fallo(400, 'Correo no válido');
  const plan = PLANES.includes(body.plan) ? body.plan : 'grupos', periodo = PERIODOS.includes(body.periodo) ? body.periodo : 'mensual';
  const cuota = Math.max(0, +body.cuota || 0), meses = Math.max(1, Math.min(36, +body.meses || (periodo === 'anual' ? 12 : 1)));
  let u = db.users.find((x) => x.email === email), creado = false;
  if (u) noDemoAdmin(u);
  const antes = u ? foto(u) : {};
  if (!u) { u = cuentaNueva(body, email); db.users.push(u); creado = true; }
  const venc = new Date(); venc.setMonth(venc.getMonth() + meses);
  Object.assign(u, { plan, periodo, estado: 'activo', pagado: true, venceAcceso: venc.toISOString(), cuotaPactada: cuota || null, concedido: now() });
  delete u.planPendiente;
  (db.contactos || []).forEach((c) => { if (String(c.email).toLowerCase() === email && !c.atendido) c.atendido = now(); });
  anotarActividad(req, creado ? 'cuenta.crear' : 'plan.conceder', u, Object.assign({ nota: `Plan a medida concedido: ${cuota} €/mes, ${meses} meses` }, diferencias(antes, foto(u), CAMPOS_CUENTA) || {}));
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

/* ---------- Datos por cuenta ----------
   Solo se aceptan las claves que usa la aplicación (P.saveData en js/): las de cada empresa llevan «--id» salvo la principal.
   Cada clave dice qué planes pueden guardarla (como P.puede en js/platform.js); borrar (null) siempre se permite.
   Si se añade un dato nuevo en el navegador, hay que darlo de alta aquí. */
const CLAVES = {
  simulador: null, agenda: null, nota: null, libro: null, empresas: null,
  estrategia: { planes: ['profesional', 'consultora', 'grupos'], msg: 'El sistema estratégico está incluido desde el plan Profesional.' },
  personas: { planes: ['consultora'], msg: 'Personas y equipos está incluido en el plan Consultora.' },
  intervencion: { planes: ['consultora'], msg: 'La auditoría integral está incluida en el plan Consultora.' },
  consultor: { planes: ['consultora'], msg: 'El cuaderno del consultor está incluido en el plan Consultora.' },
  grupo: { planes: ['consultora', 'grupos'], msg: 'La vista de grupo y la cartera de clientes están en los planes Consultora y Grupos.' }
};
const POR_EMPRESA = ['simulador', 'estrategia', 'personas', 'consultor', 'agenda', 'nota', 'libro', 'intervencion'];
function claveDe(key) {
  const m = /^([a-z]+)(?:--([a-z0-9_-]{1,40}))?$/i.exec(key);
  if (!m || !Object.prototype.hasOwnProperty.call(CLAVES, m[1]) || (m[2] && !POR_EMPRESA.includes(m[1]))) throw fallo(400, 'Dato no reconocido');
  return { base: m[1], empresa: m[2] || null };
}
const mb = (b) => (b < 1048576 ? Math.ceil(b / 1024) + ' KB' : (b / 1048576).toLocaleString('es-ES', { maximumFractionDigits: 1 }) + ' MB');
// Lectura permitida aunque la prueba o el pago hayan vencido, para que el cliente pueda descargar sus datos; la escritura sigue bloqueada.
// Versión de un dato: huella de su contenido. El navegador la manda al guardar (X-Atalaya-Version) y, si otra pestaña u otro
// equipo guardó antes, se responde 409 con lo que hay para que lo combine en lugar de pisarlo.
const versionDe = (v) => (v == null ? '' : crypto.createHash('sha1').update(JSON.stringify(v)).digest('hex').slice(0, 16));
route('GET', /^\/api\/data\/([A-Za-z0-9_-]{1,80})$/, async (req, res, body, u, m) => { if (access(u).motivo === 'bloqueado') throw fallo(402, 'Su acceso está suspendido'); claveDe(m[1]); const data = D.get(u.id, m[1]); return { data, ver: versionDe(data) }; }, { noAccess: true });
// Empresas por plan: el servidor también lo comprueba (no basta con el navegador)
// Consultora: 15 empresas cliente, sin contar la principal (ver cuentanEmpresas)
const LIMITE_EMPRESAS = { esencial: 1, profesional: 1, consultora: 15, grupos: Infinity };
route('PUT', /^\/api\/data\/([A-Za-z0-9_-]{1,80})$/, async (req, res, body, u, m) => {
  const key = m[1], { base, empresa } = claveDe(key);
  const borrar = body === null;
  const regla = CLAVES[base];
  let pasoTramo = null;
  if (regla && !borrar && !regla.planes.includes(u.plan)) throw fallo(403, regla.msg);
  if (key === 'empresas') {
    const lista = body && Array.isArray(body.lista) ? body.lista : null;
    if (!lista || !lista.length || lista.length > 500 || !lista.some((e) => e && e.id === 'principal')) throw fallo(400, 'Registro de empresas no válido');
    const lim = LIMITE_EMPRESAS[u.plan] != null ? LIMITE_EMPRESAS[u.plan] : 1;
    const reg = D.get(u.id, 'empresas'), antes = reg && Array.isArray(reg.lista) ? reg.lista.length : 1;
    const nNuevo = cuentanEmpresas(u.plan, lista.length), nAntes = cuentanEmpresas(u.plan, antes);
    // Se puede quedar igual o bajar aunque se esté por encima (p. ej. tras cambiar a un plan menor), pero no subir del límite
    if (nNuevo > lim && lista.length > antes) throw fallo(403, lim === 1 ? 'Su plan incluye una empresa. Para varias, pase a Consultora o a Grupos.' : `Su plan incluye hasta ${lim} ${u.plan === 'consultora' ? 'empresas cliente (su propia empresa no cuenta)' : 'empresas'}.`);
    if (u.plan === 'consultora') pasoTramo = { nAntes, nNuevo };
  }
  if (empresa && !borrar) {
    const reg = D.get(u.id, 'empresas'), ids = reg && Array.isArray(reg.lista) ? reg.lista.map((e) => e && e.id) : [];
    if (!ids.includes(empresa)) throw fallo(403, 'Esa empresa no está dada de alta en su cuenta');
  }
  const esperada = req.headers['x-atalaya-version'];
  if (esperada !== undefined) {
    const actual = D.get(u.id, key);
    if (actual != null && versionDe(actual) !== esperada) throw fallo(409, 'Otra pestaña u otro equipo ha guardado cambios antes', { conflicto: true, data: actual, ver: versionDe(actual) });
  }
  if (borrar) { D.del(u.id, key); return { ok: true }; }
  const t = D.tamanos(u.id), json = JSON.stringify(body), bytes = Buffer.byteLength(json);
  if (bytes > DATA_MAX_CLAVE) throw fallo(413, `Este dato ocupa ${mb(bytes)} y el máximo es ${mb(DATA_MAX_CLAVE)}. Borre documentos o cargas antiguas y vuelva a guardar.`);
  const total = Object.values(t).reduce((a, b) => a + b, 0) - (t[key] || 0) + bytes;
  if (total > DATA_MAX_CUENTA) throw fallo(413, `Su cuenta llegaría a ${mb(total)} y el máximo es ${mb(DATA_MAX_CUENTA)}. Borre empresas o datos que no use, o escríbanos para ampliarlo.`);
  D.set(u.id, key, body, json);
  if (pasoTramo) cambioDeTramo(req, u, pasoTramo.nAntes, pasoTramo.nNuevo);
  return { ok: true, ver: versionDe(body) };
});
/* Paso de tramo en Consultora al dar de alta empresas cliente. En prueba (o sin pagar) la cuota sigue a las empresas al momento.
   Con el acceso pagado, el tramo facturado (u.tramo) se fija y la subida queda como solicitud de cambio (planPendiente con
   tramo) hasta que la administración la confirma o Stripe cobra el precio del tramo nuevo; bajar de tramo al borrar empresas
   se aplica en la siguiente renovación (registro de un pago o cobro de Stripe), sin devoluciones. */
function cambioDeTramo(req, u, nAntes, nNuevo) {
  if (u.demo) return; // sin cuota: el tramo de la demostración no se factura ni se pide
  // En la prueba con tarjeta, la suscripción de Stripe sigue al tramo nuevo (sin prorrateo)
  if (u.plan === 'consultora' && !u.pagado && !(u.cuotaPactada > 0) && tramoConsultora(nAntes) !== tramoConsultora(nNuevo)) { seguirPrecioEnStripe(req, u).catch(() => {}); return; }
  if (u.plan !== 'consultora' || !u.pagado || u.cuotaPactada > 0) return;
  const facturado = +u.tramo || tramoConsultora(nAntes), nuevo = tramoConsultora(nNuevo);
  if (!u.tramo) u.tramo = facturado;
  if (nuevo <= facturado || (u.planPendiente && u.planPendiente.plan === 'consultora' && +u.planPendiente.tramo >= nuevo)) { save(); return; }
  const periodo = u.periodo || 'mensual';
  u.planPendiente = { plan: 'consultora', periodo, tramo: nuevo, fecha: now() };
  const mensaje = `Cambio de tramo de Consultora: pasa a ${nNuevo} empresas cliente, tramo ${NOMBRE_TRAMO[nuevo]} (${PRECIO_CONSULTORA[nuevo]} €/mes antes del descuento anual), desde el tramo ${NOMBRE_TRAMO[facturado]}. Para confirmarlo, use «Confirmar el cambio» en los avisos del gestor de usuarios${u.stripeSuscripcion ? ' y cambie el precio de su suscripción en Stripe' : ''}.`;
  db.contactos = (db.contactos || []).filter((c) => !(c.origen === 'cambio-plan' && c.cuenta === u.id && !c.atendido));
  db.contactos.unshift({ id: nid('c'), fecha: now(), plan: 'consultora', nombre: u.nombre || '', email: u.email, telefono: u.telefono || '', empresa: u.empresa || '', mensaje, origen: 'cambio-plan', cuenta: u.id });
  db.contactos = db.contactos.slice(0, 500);
  save();
  anotarActividad(req, 'plan.tramo', u, { quien: 'cliente', antes: { tramo: facturado }, despues: { planPendiente: u.planPendiente } });
  avisarEquipo(`Cambio de tramo: ${u.nombre || u.email}`, [`${u.nombre || ''} <${u.email}> tiene ahora ${nNuevo} empresas cliente en Consultora (pago ${periodo}).`, mensaje]);
}

/* ---------- Test de personas por enlace ----------
   El responsable crea una invitación de un solo uso (caduca a los 14 días) para que una persona responda
   un test sin cuenta. La persona da su consentimiento y responde (puede dejarlo a medias y retomarlo);
   la aplicación recoge las respuestas completadas y las lleva a su ficha.
   El enlace se deriva del secreto del servidor y del id: en db.json solo queda su hash (las invitaciones
   antiguas, con el enlace guardado, siguen funcionando). */
const INV_DIAS = 14;
const TESTS_INV = { disc: 12, roles: 27, enea: 27, lid: 12, lid360: 12, prep: 8 };
const TEST_NOMBRE = { disc: 'estilo de comportamiento (DISC)', roles: 'aportaciones al equipo', enea: 'motivación (eneagrama)', lid: 'estilo de liderazgo', lid360: 'cómo dirige su responsable', prep: 'preparación para una tarea' };
db.invitaciones = db.invitaciones || {};
db.lid360 = db.lid360 || {};
const MIN_LID360 = 3; // por debajo de tres respuestas no se entregan: no serían confidenciales
const invTok = (v) => v.token || crypto.createHmac('sha256', SECRETO).update('inv:' + v.id).digest('base64url');
const invEstado = (v) => (['completado', 'anulado'].includes(v.estado) ? v.estado : Date.parse(v.caduca) < Date.now() ? 'caducado' : v.estado);
const invPub = (v) => ({ id: v.id, empresaId: v.empresaId, pid: v.pid, nombre: v.nombre, test: v.test, tid: v.tid, tarea: v.tarea, lider: v.lider, email: v.email, estado: invEstado(v), creado: v.creado, caduca: v.caduca, abierto: v.abierto, actualizado: v.actualizado, completado: v.completado, importada: v.importada, recordatorios: v.recordatorios || 0, progreso: Array.isArray(v.resp) ? v.resp.filter((x) => x != null).length : 0, total: TESTS_INV[v.test], resp: v.estado === 'completado' && v.test !== 'lid360' ? v.resp : undefined, nacimiento: v.estado === 'completado' && v.identidad ? v.nacimiento : undefined, url: `${APP_URL}/test.html#t=${invTok(v)}${v.identidad ? '&id=1' : ''}` });
const invDe = (u, id) => { const v = Object.values(db.invitaciones).find((x) => x.id === id && x.owner === u.id); if (!v) throw fallo(404, 'Invitación no encontrada'); return v; };
const invMail = (v, recordatorio) => sendMail(v.email, `${recordatorio ? 'Recordatorio: ' : ''}${v.empresa || 'Su empresa'} le pide responder un cuestionario`,
  `Hola${v.nombre ? ', ' + v.nombre : ''}:\n\n${v.empresa || 'Su empresa'} le invita a responder un cuestionario breve sobre ${TEST_NOMBRE[v.test]}${v.tarea ? ' («' + v.tarea + '»)' : ''}${v.lider && v.test === 'lid360' ? ', pensando en ' + v.lider : ''}.\n\nSe responde en unos minutos, sin crear ninguna cuenta. Antes de empezar verá para qué se usan sus respuestas y podrá aceptar o no.\n\n${APP_URL}/test.html#t=${invTok(v)}${v.identidad ? '&id=1' : ''}\n\nEl enlace es personal y caduca el ${new Date(v.caduca).toLocaleDateString('es-ES')}.\n\nAtalaya 360°`);
function nuevaInv(u, body) {
  const v = { id: 'i' + crypto.randomBytes(6).toString('hex'), owner: u.id, empresaId: String(body.empresaId || 'principal').slice(0, 40), empresa: String(body.empresa || '').slice(0, 120), pid: String(body.pid || '').slice(0, 40), nombre: String(body.nombre || '').slice(0, 120), test: body.test, tid: body.tid ? String(body.tid).slice(0, 40) : null, tarea: body.tarea ? String(body.tarea).slice(0, 160) : null, lider: body.lider ? String(body.lider).slice(0, 120) : null, de: body.de ? String(body.de).slice(0, 40) : null, email: body.email ? String(body.email).trim().toLowerCase().slice(0, 160) : null, resumen: body.resumen !== false, estado: 'enviado', creado: now(), caduca: new Date(Date.now() + INV_DIAS * 864e5).toISOString(), resp: null };
  // La lectura complementaria de identidad (fecha de nacimiento) solo si la empresa la tiene activada; nunca en el 360
  v.identidad = !!body.identidad && body.test !== 'lid360';
  db.invitaciones[sha(invTok(v))] = v;
  return v;
}
route('POST', /^\/api\/invitaciones$/, async (req, res, body, u) => {
  if (u.plan !== 'consultora') throw fallo(403, 'Los test por enlace están incluidos en el plan Consultora.');
  const lista = Array.isArray(body.lista) ? body.lista : [body];
  if (!lista.length || lista.length > 100) throw fallo(400, 'Entre 1 y 100 invitaciones por envío');
  if (Object.values(db.invitaciones).filter((x) => x.owner === u.id).length + lista.length > 5000) throw fallo(413, 'Ha llegado al máximo de invitaciones guardadas. Borre las antiguas.');
  const out = [];
  for (const b of lista) {
    if (!b || !TESTS_INV[b.test]) throw fallo(400, 'Test no válido');
    if (b.email && !emailOk(String(b.email).trim())) throw fallo(400, 'Correo no válido: ' + String(b.email).slice(0, 160));
    const v = nuevaInv(u, b);
    // La cuenta de demostración no envía correos a terceros: se crea el enlace y quien presenta lo copia
    const enviado = b.enviar && v.email && !u.demo ? await invMail(v) : false;
    out.push(Object.assign(invPub(v), { enviado }));
  }
  save();
  return { invitaciones: out, correo: !!env.SMTP_HOST && !u.demo };
});
route('GET', /^\/api\/invitaciones$/, async (req, res, body, u) => {
  const url = new URL(req.url, 'http://x'), emp = url.searchParams.get('empresa');
  // Bolsas del 360: solo con tres respuestas o más, en orden aleatorio y sin nombres
  const lid360 = Object.entries(db.lid360).filter(([k]) => k.startsWith(u.id + '|') && (!emp || k.split('|')[1] === emp)).map(([k, l]) => ({ empresaId: k.split('|')[1], pid: k.split('|')[2], n: l.length, resps: l.length >= MIN_LID360 ? l.map((x) => x.resp).sort(() => Math.random() - 0.5) : null }));
  return { invitaciones: Object.values(db.invitaciones).filter((v) => v.owner === u.id && (!emp || v.empresaId === emp)).sort((a, b) => b.creado.localeCompare(a.creado)).map(invPub), lid360, minLid360: MIN_LID360, correo: !!env.SMTP_HOST && !u.demo };
});
// La ficha ya recogió las respuestas del 360 de un responsable: se vacía su bolsa
route('POST', /^\/api\/lid360\/([\w-]+)\/importado$/, async (req, res, body, u, m) => {
  const emp = String(body.empresaId || 'principal').slice(0, 40), k = u.id + '|' + emp + '|' + m[1];
  const l = db.lid360[k] || []; if (l.length < MIN_LID360) throw fallo(409, 'Aún no hay respuestas suficientes');
  delete db.lid360[k]; save(); return { ok: true, n: l.length };
});
route('POST', /^\/api\/invitaciones\/([\w-]+)\/(anular|recordar|reenviar|importada|borrar)$/, async (req, res, body, u, m) => {
  const v = invDe(u, m[1]), acc = m[2];
  if (acc === 'anular') { if (v.estado !== 'completado') v.estado = 'anulado'; }
  else if (acc === 'importada') v.importada = now();
  else if (acc === 'borrar') { delete db.invitaciones[sha(invTok(v))]; save(); return { ok: true }; }
  else if (acc === 'recordar') {
    if (invEstado(v) === 'completado' || invEstado(v) === 'anulado' || invEstado(v) === 'caducado') throw fallo(409, 'Esta invitación ya no está abierta');
    if (!v.email) throw fallo(400, 'La invitación no tiene correo');
    if (u.demo) throw fallo(403, NO_DEMO.correo);
    const ok = await invMail(v, true); if (!ok) throw fallo(503, 'No hay correo configurado en el servidor: copie el enlace y envíelo usted.');
    v.recordatorios = (v.recordatorios || 0) + 1; v.recordado = now();
  } else if (acc === 'reenviar') {
    // Nuevo enlace con nuevo plazo; el anterior deja de valer. Conserva lo que ya hubiera respondido.
    if (v.estado !== 'completado') v.estado = 'anulado';
    const n = nuevaInv(u, Object.assign({}, v, { enviar: false }));
    if (v.estado === 'anulado' && Array.isArray(v.resp)) { n.resp = v.resp; n.estado = 'a medias'; n.consent = v.consent; }
    const enviado = n.email && !u.demo ? await invMail(n) : false;
    save(); return { invitacion: Object.assign(invPub(n), { enviado }) };
  }
  save(); return { invitacion: invPub(v) };
});
// Página pública del test: solo con el enlace
const invToken = (t) => { const v = db.invitaciones[sha(String(t || ''))]; if (!v) throw fallo(404, 'Este enlace no es válido.'); return v; };
route('GET', /^\/api\/t\/([\w-]{20,64})$/, async (req, res, body, u, m) => {
  const ip = ipDe(req);
  if (bloqueado('test', ip)) throw demasiados();
  anotar('test', ip);
  const v = invToken(m[1]), st = invEstado(v);
  if (st === 'enviado') { v.estado = 'abierto'; v.abierto = now(); save(); }
  return { empresa: v.empresa, nombre: v.nombre, test: v.test, tarea: v.tarea, lider: v.lider, estado: invEstado(v), caduca: v.caduca, resp: st === 'completado' ? null : v.resp, nacimiento: st === 'completado' ? null : v.nacimiento || null, consent: !!v.consent, resumen: v.resumen !== false };
}, { public: true });
route('PUT', /^\/api\/t\/([\w-]{20,64})$/, async (req, res, body, u, m) => {
  const ip = ipDe(req);
  if (bloqueado('test', ip)) throw demasiados();
  anotar('test', ip);
  const v = invToken(m[1]), st = invEstado(v);
  if (st === 'completado') throw fallo(409, 'Este cuestionario ya se entregó. Gracias.');
  if (st === 'anulado' || st === 'caducado') throw fallo(410, st === 'caducado' ? 'Este enlace ha caducado. Pida uno nuevo a quien se lo envió.' : 'Este enlace se ha anulado.');
  if (!body.consent) throw fallo(400, 'Hace falta su consentimiento para guardar las respuestas.');
  const n = TESTS_INV[v.test], resp = body.resp;
  if (!Array.isArray(resp) || resp.length !== n) throw fallo(400, 'Respuestas no válidas');
  const okItem = (x) => x == null || (v.test === 'disc' ? x && typeof x === 'object' && /^[DISC]$/.test(x.mas) && /^[DISC]$/.test(x.menos) && x.mas !== x.menos : Number.isInteger(x) && x >= (v.test === 'roles' ? 0 : 1) && x <= ({ roles: 4, lid: 4, lid360: 4 }[v.test] || 5));
  if (!resp.every(okItem)) throw fallo(400, 'Respuestas no válidas');
  v.resp = v.test === 'disc' ? resp.map((x) => (x ? { mas: x.mas, menos: x.menos } : null)) : resp;
  v.consent = v.consent || now(); v.actualizado = now(); v.ip = ip;
  if (v.identidad && typeof body.nacimiento === 'string' && /^(19|20)\d{2}-\d{2}-\d{2}$/.test(body.nacimiento)) v.nacimiento = body.nacimiento;
  if (body.fin) {
    if (resp.some((x) => x == null)) throw fallo(400, 'Faltan respuestas'); v.estado = 'completado'; v.completado = now();
    // 360 del responsable: la respuesta pasa a una bolsa sin nombre por responsable y la invitación olvida quién respondió
    if (v.test === 'lid360') { const k = v.owner + '|' + v.empresaId + '|' + v.pid; (db.lid360[k] = db.lid360[k] || []).push({ resp: v.resp, mes: now().slice(0, 7) }); v.resp = null; v.de = null; v.ip = null; v.importada = now(); }
  }
  else v.estado = 'a medias';
  save(); return { ok: true, estado: v.estado };
}, { public: true });

// Cada usuario con el número de empresas o sociedades que tiene dadas de alta (para el precio de Grupos)
const nEmpresas = (u) => { const r = D.get(u.id, 'empresas'); return r && Array.isArray(r.lista) ? r.lista.length : 1; };
const usuarioDe = (id) => { const u = db.users.find((x) => x.id === id); if (!u) throw fallo(404, 'Usuario no encontrado'); return u; };
// Cuenta creada por la administración (a mano o al conceder un plan a medida): contraseña aleatoria que nadie conoce;
// el cliente elige la suya con la invitación
function cuentaNueva(b, email) {
  const salt = crypto.randomBytes(16).toString('hex');
  return { id: uid(), nombre: String(b.nombre || '').slice(0, 120), email, empresa: String(b.empresa || '').slice(0, 160), telefono: String(b.telefono || '').slice(0, 40), plan: 'profesional', periodo: 'mensual', rol: 'cliente', estado: 'prueba', pagado: false, venceAcceso: null, alta: now(), ultimoAcceso: null, sesiones: 0, uso: {}, pagos: [], salt, hash: hashPw(crypto.randomBytes(24).toString('hex'), salt), creadoPor: 'administración' };
}
const cerrarCambioPlan = (u) => (db.contactos || []).forEach((c) => { if (c.origen === 'cambio-plan' && c.cuenta === u.id && !c.atendido) c.atendido = now(); });
function nuevoPago(u, d, por) {
  const p = { id: nid('p', 5), fecha: d.fecha && !isNaN(Date.parse(d.fecha)) ? new Date(d.fecha).toISOString() : now(), importe: Math.round((+String(d.importe).replace(',', '.') || 0) * 100) / 100, meses: Math.max(0, Math.min(36, +d.meses || 0)), referencia: String(d.referencia || '').slice(0, 200), por };
  (u.pagos = u.pagos || []).push(p); delete u.solicitudPago;
  return p;
}
// Uso de IA de este mes por empresa (planes con varias empresas), con el nombre de cada una, para el detalle de la cuenta
function iaPorEmpresa(u) {
  if (!PLANES_VARIAS.includes(u.plan) && !u.usoIAEmpresa) return null;
  const reg = D.get(u.id, 'empresas'), lista = reg && Array.isArray(reg.lista) ? reg.lista.filter((e) => e && e.id && !e.modelo) : [{ id: 'principal', nombre: u.empresa || 'Mi empresa' }];
  const mes = today().slice(0, 7), t = u.usoIAEmpresa || {};
  const ids = Array.from(new Set(lista.map((e) => e.id).concat(Object.keys(t))));
  return ids.map((id) => { const e = lista.find((x) => x.id === id); return { id, nombre: e ? e.nombre || id : 'Empresa borrada', principal: id === 'principal', mes: (t[id] && t[id][mes]) || { n: 0, c: 0 }, hoy: (t[id] && t[id][today()]) || { n: 0, c: 0 } }; });
}
route('GET', /^\/api\/admin\/users$/, async () => ({ users: db.users.map((u) => Object.assign(pub(u), { empresas: nEmpresas(u), iaEmpresas: iaPorEmpresa(u) })) }), { admin: true });
route('PATCH', /^\/api\/admin\/users\/([\w-]+)$/, async (req, res, body, me, m) => {
  const u = usuarioDe(m[1]), antes = foto(u);
  // Demostración: plan, pago y vencimiento los fija el servidor (DEMO_PLAN); la nota, el bloqueo y la cuota de IA por empresa sí se cambian
  if (u.demo && (['pagado', 'venceAcceso', 'tramo', 'registrarPago', 'planPendiente'].some((k) => k in body) || (PLANES.includes(body.plan) && body.plan !== u.plan) || (PERIODOS.includes(body.periodo) && body.periodo !== (u.periodo || 'mensual')) || body.estado === 'prueba')) throw fallo(409, NO_DEMO.admin);
  if (['prueba', 'activo', 'bloqueado'].includes(body.estado)) u.estado = body.estado;
  if (typeof body.pagado === 'boolean') u.pagado = body.pagado;
  if (PLANES.includes(body.plan)) {
    // La administración confirma (o decide) el plan: se cierra la solicitud de cambio pendiente
    if (body.plan !== u.plan) (u.cambiosPlan = u.cambiosPlan || []).push({ de: u.plan, a: body.plan, fecha: now(), por: 'administración' });
    u.plan = body.plan; delete u.planPendiente; cerrarCambioPlan(u);
  }
  if (body.planPendiente === null) { delete u.planPendiente; cerrarCambioPlan(u); }
  // Tramo facturado de Consultora (5, 10 o 15): lo fija la administración al confirmar un cambio de tramo; null lo vuelve automático
  // Cuota mensual de IA por empresa ampliada para esta cuenta (null o 0: la general, IA_MENSUAL_EMPRESA)
  if (body.iaEmpresaMes === null || +body.iaEmpresaMes === 0) delete u.iaEmpresaMes;
  else if (Number.isFinite(+body.iaEmpresaMes) && +body.iaEmpresaMes > 0) u.iaEmpresaMes = Math.min(100000, Math.round(+body.iaEmpresaMes));
  if (body.tramo === null) delete u.tramo;
  else if (TRAMOS_CONSULTORA.includes(+body.tramo)) { u.tramo = +body.tramo; if (u.planPendiente && u.planPendiente.tramo && u.planPendiente.plan === u.plan && +u.planPendiente.tramo <= u.tramo) { delete u.planPendiente; cerrarCambioPlan(u); } }
  if (PERIODOS.includes(body.periodo)) u.periodo = body.periodo;
  if (body.venceAcceso === null || (typeof body.venceAcceso === 'string' && !isNaN(Date.parse(body.venceAcceso)))) u.venceAcceso = body.venceAcceso;
  if (typeof body.nota === 'string') u.nota = body.nota.slice(0, 2000);
  let pago = null;
  if (body.registrarPago && typeof body.registrarPago === 'object') pago = nuevoPago(u, body.registrarPago, 'administración');
  const dif = diferencias(antes, foto(u), CAMPOS_CUENTA);
  if (dif || pago) {
    const accion = pago ? 'pago.registrar' : dif.despues.estado === 'bloqueado' ? 'cuenta.bloquear' : dif.antes.estado === 'bloqueado' ? 'cuenta.desbloquear' : 'plan' in dif.despues ? 'plan.cambio' : 'cuenta.modificar';
    anotarActividad(req, accion, u, { antes: dif && dif.antes, despues: Object.assign({}, dif && dif.despues, pago ? { pago } : {}), nota: typeof body.motivo === 'string' ? body.motivo : null });
  }
  save();
  // En la prueba con tarjeta, un cambio de plan, periodo o tramo hecho por la administración también cambia el precio en Stripe
  if (dif && ['plan', 'periodo', 'tramo'].some((k) => k in dif.despues)) await seguirPrecioEnStripe(req, u);
  return { user: pub(u) };
}, { admin: true });
// Borrar una cuenta borra todo lo suyo: datos, análisis de mercado, sesiones, enlaces de contraseña, invitaciones
// (con sus respuestas), solicitudes de contacto con su correo y uso de IA (va en la propia cuenta).
// En el registro de actividad queda que se borró (correo, plan y fechas), no sus datos.
route('DELETE', /^\/api\/admin\/users\/([\w-]+)$/, async (req, res, body, me, m) => {
  const id = m[1], u = usuarioDe(id);
  noDemoAdmin(u);
  tx(() => {
    D.borrarCuenta(id);
    db.users = db.users.filter((x) => x.id !== id);
    Object.keys(db.sessions).forEach((k) => { if (db.sessions[k].userId === id) delete db.sessions[k]; });
    Object.keys(db.resets).forEach((k) => { if (db.resets[k].userId === id) delete db.resets[k]; });
    Object.keys(db.invitaciones).forEach((k) => { if (db.invitaciones[k].owner === id) delete db.invitaciones[k]; });
    Object.keys(db.lid360).forEach((k) => { if (k.startsWith(id + '|')) delete db.lid360[k]; });
    db.contactos = (db.contactos || []).filter((c) => String(c.email || '').toLowerCase() !== u.email && c.cuenta !== id);
    anotarActividad(req, 'cuenta.borrar', u, { antes: { plan: u.plan, estado: u.estado, pagado: !!u.pagado, alta: u.alta, pagos: (u.pagos || []).length }, nota: typeof body.motivo === 'string' ? body.motivo : null });
    if (sql) volcarSqlite(); else save();
  });
  return { ok: true };
}, { admin: true });

// Crear un usuario a mano: en prueba o con acceso activo, y una invitación (7 días) para que elija su contraseña
route('POST', /^\/api\/admin\/users$/, async (req, res, body) => {
  const email = String(body.email || '').trim().toLowerCase();
  if (!emailOk(email) || email.length > 160) throw fallo(400, 'Correo no válido');
  if (db.users.some((u) => u.email === email)) throw fallo(409, 'Ya hay una cuenta con ese correo');
  const u = cuentaNueva(body, email);
  if (PLANES.includes(body.plan)) u.plan = body.plan;
  if (PERIODOS.includes(body.periodo)) u.periodo = body.periodo;
  if (body.activo) { const meses = Math.max(1, Math.min(36, +body.meses || 1)), v = new Date(); v.setMonth(v.getMonth() + meses); Object.assign(u, { estado: 'activo', pagado: true, venceAcceso: v.toISOString() }); }
  else if (+body.diasPrueba > 0) u.pruebaHasta = new Date(Date.now() + Math.min(90, +body.diasPrueba) * 864e5).toISOString();
  if (typeof body.nota === 'string') u.nota = body.nota.slice(0, 2000);
  db.users.push(u);
  const token = newResetToken(u, 'invitación', 7 * 24 * 60), link = `${APP_URL}/acceso.html#reset=${token}`;
  const enviado = body.enviar ? await sendMail(u.email, 'Atalaya 360° · Su cuenta está lista', `Hola${u.nombre ? ' ' + u.nombre : ''}:\n\nLe hemos creado una cuenta en Atalaya 360° con el plan ${NOMBRE_PLAN[u.plan]}${u.pagado ? '' : ` y ${Math.round(((Date.parse(u.pruebaHasta) || Date.now() + PRUEBA_DIAS * 864e5) - Date.now()) / 864e5)} días de prueba`}.\n${AVISO_TARJETA(u)}Para elegir su contraseña abra este enlace (válido 7 días):\n${link}\n\nEquipo de Business Avance`) : false;
  anotarActividad(req, 'cuenta.crear', u, { despues: foto(u) });
  save();
  return { user: pub(u), token, minutos: 7 * 24 * 60, enviado };
}, { admin: true });
// Ampliar la prueba gratuita: «dias» más desde hoy o desde el final actual, si aún no ha terminado
route('POST', /^\/api\/admin\/users\/([\w-]+)\/prueba$/, async (req, res, body, me, m) => {
  const u = usuarioDe(m[1]), dias = Math.round(+body.dias || 0);
  noDemoAdmin(u);
  if (dias < 1 || dias > 90) throw fallo(400, 'Indique entre 1 y 90 días');
  if (u.pagado) throw fallo(409, 'Esta cuenta tiene el acceso pagado: amplíe su vencimiento registrando un pago o cambiando la fecha.');
  const antes = foto(u), fin = Math.max(Date.now(), Date.parse(u.alta) + PRUEBA_DIAS * 864e5, Date.parse(u.pruebaHasta) || 0);
  // Prueba con tarjeta: se amplía en Stripe (el primer cobro se retrasa); su fecha es la que manda
  let nota = `${dias} días más`;
  if (u.stripeSuscripcion && u.stripeEstado === 'trialing') {
    const finSt = Math.max(Date.now(), Date.parse(u.stripeFinPrueba) || 0) + dias * 864e5;
    await stripeApi(`subscriptions/${encodeURIComponent(u.stripeSuscripcion)}`, { trial_end: String(Math.floor(finSt / 1000)), proration_behavior: 'none' });
    u.stripeFinPrueba = new Date(finSt).toISOString(); nota += ' (también en Stripe: el primer cobro se retrasa)';
  }
  u.pruebaHasta = new Date(fin + dias * 864e5).toISOString();
  if (u.estado !== 'bloqueado') u.estado = 'prueba';
  anotarActividad(req, 'prueba.ampliar', u, Object.assign({ nota }, diferencias(antes, foto(u), CAMPOS_CUENTA) || {}));
  save(); return { user: pub(u) };
}, { admin: true });
// Registrar un pago y ampliar el acceso «meses» desde el vencimiento actual (o desde hoy si ya venció)
route('POST', /^\/api\/admin\/users\/([\w-]+)\/pagos$/, async (req, res, body, me, m) => {
  const u = usuarioDe(m[1]), antes = foto(u);
  noDemoAdmin(u);
  if (!(+String(body.importe).replace(',', '.') >= 0)) throw fallo(400, 'Importe no válido');
  const pago = nuevoPago(u, body, 'administración');
  if (body.ampliar !== false && pago.meses > 0) {
    const base = u.pagado && u.venceAcceso && Date.parse(u.venceAcceso) > Date.now() ? new Date(u.venceAcceso) : new Date();
    base.setMonth(base.getMonth() + pago.meses);
    Object.assign(u, { pagado: true, venceAcceso: base.toISOString() }); if (u.estado !== 'bloqueado') u.estado = 'activo';
    // Renovación de Consultora: el tramo facturado pasa a ser el de sus empresas cliente de hoy (sube o baja), o el pedido si es mayor
    if (u.plan === 'consultora' && !(u.cuotaPactada > 0)) {
      const pend = u.planPendiente && u.planPendiente.plan === 'consultora' ? +u.planPendiente.tramo || 0 : 0;
      u.tramo = Math.max(tramoConsultora(cuentanEmpresas('consultora', nEmpresas(u))), TRAMOS_CONSULTORA.includes(pend) ? pend : 0);
      if (pend && pend <= u.tramo) { delete u.planPendiente; cerrarCambioPlan(u); }
    }
  }
  const dif = diferencias(antes, foto(u), CAMPOS_CUENTA) || {};
  anotarActividad(req, 'pago.registrar', u, { antes: dif.antes, despues: Object.assign({ pago }, dif.despues) });
  save(); return { user: pub(u), pago };
}, { admin: true });
// Corregir un pago (importe, meses, referencia, fecha) o anularlo; no cambia el vencimiento (eso se ajusta aparte)
route('PATCH', /^\/api\/admin\/users\/([\w-]+)\/pagos\/([\w-]+)$/, async (req, res, body, me, m) => {
  const u = usuarioDe(m[1]), p = (u.pagos || []).find((x) => x.id === m[2]);
  if (!p) throw fallo(404, 'Pago no encontrado');
  const antes = JSON.parse(JSON.stringify(p));
  if (body.importe != null) { const v = +String(body.importe).replace(',', '.'); if (!(v >= 0)) throw fallo(400, 'Importe no válido'); p.importe = Math.round(v * 100) / 100; }
  if (body.meses != null) p.meses = Math.max(0, Math.min(36, +body.meses || 0));
  if (typeof body.referencia === 'string') p.referencia = body.referencia.slice(0, 200);
  if (typeof body.fecha === 'string' && !isNaN(Date.parse(body.fecha))) p.fecha = new Date(body.fecha).toISOString();
  if (typeof body.anulado === 'boolean') { if (body.anulado) p.anulado = now(); else delete p.anulado; }
  const motivo = String(body.motivo || '').trim().slice(0, 300);
  if (!motivo) throw fallo(400, 'Indique el motivo de la corrección (queda en el registro de actividad)');
  p.corregido = now();
  anotarActividad(req, p.anulado && !antes.anulado ? 'pago.anular' : 'pago.corregir', u, { antes: { pago: antes }, despues: { pago: p }, nota: motivo });
  save(); return { user: pub(u), pago: p };
}, { admin: true });
// Cerrar solicitudes de una cuenta: activación (pago), contraseña olvidada o cambio de plan
route('POST', /^\/api\/admin\/users\/([\w-]+)\/cerrar$/, async (req, res, body, me, m) => {
  const u = usuarioDe(m[1]), tipo = body.tipo, campo = { pago: 'solicitudPago', reset: 'solicitudReset', plan: 'planPendiente' }[tipo];
  if (!campo) throw fallo(400, 'Solicitud no reconocida');
  const antes = u[campo] ?? null; delete u[campo]; if (tipo === 'plan') cerrarCambioPlan(u);
  anotarActividad(req, 'solicitud.cerrar', u, { antes: { [campo]: antes }, despues: { [campo]: null }, nota: String(body.nota || '').slice(0, 300) || null });
  save(); return { user: pub(u) };
}, { admin: true });
// Cerrar (o reabrir) una solicitud de contacto o de sesión
route('POST', /^\/api\/admin\/contactos\/([\w-]+)\/(cerrar|reabrir)$/, async (req, res, body, me, m) => {
  const c = (db.contactos || []).find((x) => x.id === m[1]); if (!c) throw fallo(404, 'Solicitud no encontrada');
  const antes = { atendido: c.atendido || null };
  if (m[2] === 'cerrar') { c.atendido = now(); if (body.nota) c.notaCierre = String(body.nota).slice(0, 300); } else { delete c.atendido; delete c.notaCierre; }
  anotarActividad(req, m[2] === 'cerrar' ? 'solicitud.cerrar' : 'solicitud.reabrir', null, { cuenta: c.cuenta || null, email: c.email, antes, despues: { atendido: c.atendido || null }, nota: `${c.plan === 'sesion' ? 'Sesión' : c.origen || 'Contacto'}${c.notaCierre ? ' · ' + c.notaCierre : ''}` });
  save(); return { contacto: c };
}, { admin: true });
// Quitar el segundo factor de un cliente que ha perdido el teléfono y sus códigos de recuperación
route('POST', /^\/api\/admin\/users\/([\w-]+)\/2fa-quitar$/, async (req, res, body, me, m) => {
  const u = usuarioDe(m[1]); if (!u.totp) throw fallo(409, 'Esta cuenta no tiene segundo factor');
  delete u.totp;
  anotarActividad(req, 'dospasos.quitar', u, { nota: String(body.motivo || '').slice(0, 300) || null });
  save(); return { user: pub(u) };
}, { admin: true });
// Registro de actividad: filtros por cuenta, acción (prefijo), texto y fechas; hasta 5.000 entradas por consulta
route('GET', /^\/api\/admin\/actividad$/, async (req) => {
  const q = new URL(req.url, 'http://x').searchParams, f = (k, n) => String(q.get(k) || '').trim().slice(0, n || 80);
  const fecha = (k) => (/^\d{4}-\d{2}-\d{2}/.test(f(k)) ? f(k, 10) : '');
  return { actividad: ACT.listar({ cuenta: f('cuenta'), accion: f('accion', 40), q: f('q'), desde: fecha('desde'), hasta: fecha('hasta'), limite: Math.max(1, Math.min(5000, +q.get('limite') || 500)) }), dias: ACTIVIDAD_DIAS };
}, { admin: true });

/* ---------- Segundo factor de la administración ---------- */
route('POST', /^\/api\/admin\/2fa\/iniciar$/, async (req) => {
  if (db.adminTotp && db.adminTotp.activo) throw fallo(409, 'El segundo factor ya está activado. Para cambiar de teléfono, desactívelo y vuelva a activarlo.');
  return iniciarTotp('admin', 'administración');
}, { admin: true });
route('POST', /^\/api\/admin\/2fa\/activar$/, async (req, res, body) => {
  if (bloqueado('dospasos', 'admin')) throw demasiados();
  let r; try { r = confirmarTotp('admin', body.codigo); } catch (e) { anotar('dospasos', 'admin'); throw e; }
  db.adminTotp = r.registro;
  // Las demás sesiones de administración se cierran: a partir de ahora hace falta el código para entrar
  const sid = cookies(req)[ADMIN_COOKIE], mia = sid ? sha(sid) : null;
  Object.keys(db.adminSessions).forEach((k) => { if (k !== mia) delete db.adminSessions[k]; });
  anotarActividad(req, 'dospasos.activar', null, { nota: 'Segundo factor de la administración' });
  save(); return { ok: true, codigos: r.codigos };
}, { admin: true });
const exigirPasswordAdmin = (req, body) => {
  if (bloqueado('dospasos', 'admin')) throw demasiados();
  const okPw = safeEq(hashPw(String(body.password || ''), db.admin.salt), db.admin.hash);
  if (!okPw || !comprobarSegundo(db.adminTotp, body.codigo)) { anotar('dospasos', 'admin'); throw fallo(400, okPw ? 'El código no es correcto o ya se ha usado.' : 'La contraseña de administración no es correcta.'); }
};
route('POST', /^\/api\/admin\/2fa\/desactivar$/, async (req, res, body) => {
  if (!db.adminTotp || !db.adminTotp.activo) throw fallo(409, 'El segundo factor no está activado');
  exigirPasswordAdmin(req, body);
  delete db.adminTotp;
  anotarActividad(req, 'dospasos.desactivar', null, { nota: 'Segundo factor de la administración' });
  save(); return { ok: true };
}, { admin: true });
route('POST', /^\/api\/admin\/2fa\/recuperacion$/, async (req, res, body) => {
  if (!db.adminTotp || !db.adminTotp.activo) throw fallo(409, 'El segundo factor no está activado');
  exigirPasswordAdmin(req, body);
  const r = codigosRecuperacion(); db.adminTotp.codigos = r.hashes;
  anotarActividad(req, 'dospasos.recuperacion', null, { nota: 'Códigos de recuperación nuevos (los anteriores dejan de valer)' });
  save(); return { ok: true, codigos: r.codigos };
}, { admin: true });

/* ---------- Segundo factor del cliente (opcional) ---------- */
route('POST', /^\/api\/me\/2fa\/iniciar$/, async (req, res, body, u) => {
  if (u.demo) throw fallo(403, NO_DEMO.dospasos);
  if (u.totp && u.totp.activo) throw fallo(409, 'El segundo factor ya está activado');
  return iniciarTotp('u:' + u.id, u.email);
}, { noAccess: true });
route('POST', /^\/api\/me\/2fa\/activar$/, async (req, res, body, u) => {
  if (u.demo) throw fallo(403, NO_DEMO.dospasos);
  if (bloqueado('dospasos', u.id)) throw demasiados();
  let r; try { r = confirmarTotp('u:' + u.id, body.codigo); } catch (e) { anotar('dospasos', u.id); throw e; }
  u.totp = r.registro;
  anotarActividad(req, 'dospasos.activar', u, { quien: 'cliente' });
  save(); return { ok: true, codigos: r.codigos, user: pub(u) };
}, { noAccess: true });
route('POST', /^\/api\/me\/2fa\/desactivar$/, async (req, res, body, u) => {
  if (!u.totp || !u.totp.activo) throw fallo(409, 'El segundo factor no está activado');
  if (bloqueado('dospasos', u.id)) throw demasiados();
  const okPw = safeEq(hashPw(String(body.password || ''), u.salt), u.hash);
  if (!okPw || !comprobarSegundo(u.totp, body.codigo)) { anotar('dospasos', u.id); throw fallo(400, okPw ? 'El código no es correcto o ya se ha usado.' : 'La contraseña no es correcta.'); }
  delete u.totp;
  anotarActividad(req, 'dospasos.desactivar', u, { quien: 'cliente' });
  save(); return { ok: true, user: pub(u) };
}, { noAccess: true });

/* ---------- Pago en línea con Stripe (Checkout y portal del cliente) ---------- */
route('POST', /^\/api\/me\/pago\/checkout$/, async (req, res, body, u) => {
  if (u.demo) throw fallo(403, NO_DEMO.pago);
  if (!STRIPE) throw fallo(404, 'El pago en línea no está configurado: solicite el enlace de pago.', { manual: true });
  if (u.estado === 'bloqueado') throw fallo(403, 'Su acceso está suspendido. Póngase en contacto con nosotros.');
  // Plan que se paga: el elegido (si el cliente puede elegirlo), el pendiente de confirmar o el actual
  const plan = PLANES_LIBRES.includes(body.plan) || (body.plan === 'grupos' && u.plan === 'grupos') ? body.plan : (u.planPendiente && u.planPendiente.plan) || u.plan;
  const periodo = PERIODOS.includes(body.periodo) ? body.periodo : (u.planPendiente && u.planPendiente.periodo) || u.periodo || 'mensual';
  const claveP = clavePrecioDe(u, plan, periodo), { tramo } = leerPlanPer(claveP);
  const precio = STRIPE_PRECIOS[claveP];
  if (!precio) throw fallo(404, `El plan ${NOMBRE_PLAN[plan] || plan}${tramo ? ` (tramo ${NOMBRE_TRAMO[tramo]})` : ''} con pago ${periodo} no se puede pagar en línea: solicite el enlace de pago.`, { manual: true });
  if (u.stripeSuscripcion && SUSCRIPCION_VIVA.includes(u.stripeEstado)) throw fallo(409, 'Ya tiene una suscripción. Cambie de plan o de tarjeta desde «Gestionar el pago».', { portal: true });
  // Prueba de PRUEBA_DIAS días con tarjeta: solo una por cuenta y solo si nunca ha pagado (ver pruebaCheckout)
  const prueba = pruebaCheckout(u, plan);
  const p = {
    mode: 'subscription', 'line_items[0][price]': precio, 'line_items[0][quantity]': '1', client_reference_id: u.id, locale: 'es',
    'metadata[cuenta]': u.id, 'metadata[plan]': plan, 'metadata[periodo]': periodo,
    'subscription_data[metadata][cuenta]': u.id, 'subscription_data[metadata][plan]': plan, 'subscription_data[metadata][periodo]': periodo,
    ...(tramo ? { 'metadata[tramo]': String(tramo), 'subscription_data[metadata][tramo]': String(tramo) } : {}),
    success_url: env.STRIPE_URL_OK || `${APP_URL}/app.html?pago=ok`, cancel_url: env.STRIPE_URL_CANCELAR || `${APP_URL}/acceso.html#pago`,
    billing_address_collection: 'required', 'tax_id_collection[enabled]': 'true', payment_method_collection: 'always'
  };
  if (prueba) {
    const { fin, ...dias } = prueba;
    Object.assign(p, dias, {
      'subscription_data[trial_settings][end_behavior][missing_payment_method]': 'cancel',
      'metadata[prueba]': '1', 'metadata[finPrueba]': String(Math.floor(fin / 1000)), 'subscription_data[metadata][prueba]': '1'
    });
  }
  if (u.stripeCliente) Object.assign(p, { customer: u.stripeCliente, 'customer_update[name]': 'auto', 'customer_update[address]': 'auto' });
  else p.customer_email = u.email;
  if (env.STRIPE_IMPUESTOS === '1') p['automatic_tax[enabled]'] = 'true';
  const s = await stripeApi('checkout/sessions', p);
  anotarActividad(req, 'pago.checkout', u, { quien: 'cliente', despues: Object.assign({ plan, periodo }, tramo ? { tramo } : {}), nota: `${s.id}${prueba ? ` · con prueba hasta el ${fechaLarga(prueba.fin)}` : ''}` });
  return { url: s.url, prueba: prueba ? new Date(prueba.fin).toISOString() : null };
}, { noAccess: true });
route('POST', /^\/api\/me\/pago\/portal$/, async (req, res, body, u) => {
  if (u.demo) throw fallo(403, NO_DEMO.pago);
  if (!STRIPE) throw fallo(404, 'El pago en línea no está configurado.', { manual: true });
  if (!u.stripeCliente) throw fallo(404, 'Su cuenta no tiene pagos en línea todavía.', { manual: true });
  const s = await stripeApi('billing_portal/sessions', { customer: u.stripeCliente, return_url: env.STRIPE_URL_PORTAL || `${APP_URL}/app.html`, locale: 'es' });
  return { url: s.url };
}, { noAccess: true });

// Asistente: el bucle de herramientas se ejecuta en el navegador; el servidor solo habla con Claude
route('POST', /^\/api\/chat$/, async (req, res, body, u) => {
  const tools = (Array.isArray(body.tools) ? body.tools : []).slice(0, 16).filter((t) => t && /^[a-z_]{1,40}$/.test(t.name))
    .map((t) => ({ name: t.name, description: String(t.description || '').slice(0, 2000), input_schema: t.input_schema && t.input_schema.type === 'object' ? t.input_schema : { type: 'object', properties: {} } }));
  const messages = Array.isArray(body.messages) ? body.messages.slice(-40) : [];
  const largo = JSON.stringify(messages).length;
  if (!messages.length || largo > 400000) throw fallo(400, 'Conversación no válida');
  const pagina = String(body.page || '').replace(/[^a-z]/g, '').slice(0, 20);
  const r = await conIA(u, 'chat', 1, largo + JSON.stringify(tools).length, () => ask({ system: SYSTEM_CHAT + (pagina ? `\nEl usuario está ahora en: ${pagina}.` : ''), tools, messages, output_config: { effort: 'low' } }), req);
  return { content: r.content, stop_reason: r.stop_reason };
});

// Auditoría integral: lectura entre líneas de la transcripción de una sesión de diagnóstico
route('POST', /^\/api\/escucha$/, async (req, res, body, u) => {
  const texto = String(body.texto || '').slice(0, 200000);
  const instr = String(body.instrucciones || '').slice(0, 6000);
  const forma = String(body.forma || '').slice(0, 4000);
  if (!texto) throw fallo(400, 'Transcripción vacía');
  const r = await conIA(u, 'escucha', 1, texto.length + instr.length + forma.length, () => ask({
    system: 'Eres un consultor sénior de pymes familiares españolas experto en diagnóstico: escuchas cómo el empresario describe su empresa, separas síntomas de causas, lees entre líneas lo que quiere decir y no dice, y priorizas las causas cuyo 20 % de solución da el 80 % del resultado. Cada afirmación se apoya en una cita literal de la transcripción; no inventas. Respondes en español y solo con JSON.',
    messages: [{ role: 'user', content: `${instr}\n\nDevuelve SOLO JSON con esta forma: ${forma}\n\nTranscripción:\n${texto}` }],
    output_config: { effort: 'medium' }
  }), req);
  return { datos: jsonOf(textOf(r)) };
});

// Extracción de datos de documentos (balances, cuentas, tesorería, tareas…)
route('POST', /^\/api\/extract$/, async (req, res, body, u) => {
  const texto = String(body.texto || '').slice(0, 300000);
  const destino = String(body.destino || 'cuentas').slice(0, 40);
  const forma = String(body.forma || '').slice(0, 3000);
  if (!texto) throw fallo(400, 'Documento vacío');
  const r = await conIA(u, 'extract', 1, texto.length + forma.length, () => ask({
    system: 'Extraes datos de documentos de empresa (cuentas anuales, balances, extractos, listados) con exactitud. No inventas valores: si un dato no aparece, lo omites. Importes en euros como números sin separadores.',
    messages: [{ role: 'user', content: `Destino: ${destino}. Devuelve SOLO JSON con esta forma: ${forma}\n\nDocumento:\n${texto}` }],
    output_config: { effort: 'low' }
  }), req);
  return { datos: jsonOf(textOf(r)) };
});

// Agente de mercado: análisis 360 con fuentes oficiales, guardado por usuario. Cuenta como 5 consultas (hace búsquedas web)
const PESO_MERCADO = 5;
route('GET', /^\/api\/mercado$/, async (req, res, body, u) => ({ analisis: D.mercado(u.id) }));
route('POST', /^\/api\/mercado\/actualizar$/, async (req, res, body, u) => {
  const perfil = { sector: body.sector, actividad: body.actividad, region: body.region, productos: body.productos, clientes: body.clientes, ventas: body.ventas };
  if (JSON.stringify(perfil).length > 20000) throw fallo(400, 'El perfil de la empresa es demasiado largo');
  const a = await conIA(u, 'mercado', PESO_MERCADO, 6000, () => agenteMercado(perfil), req);
  a.perfil = perfil;
  D.setMercado(u.id, a);
  return { analisis: a };
});

/* ---------- Integración con el asistente de Familias Empresarias ----------
   El asistente (asistente-fe) llama a estas rutas con «Authorization: Bearer <INTEGRACION_TOKEN>». Sin INTEGRACION_TOKEN
   configurado responden 404. La comprobación del token y el límite de peticiones están en manejar().
   · POST /api/integracion/reunion: la sesión estratégica agendada pasa a la mesa de trabajo de la empresa (clave agenda o
     agenda--<empresa>) como tarea de tipo reunión con oid «asistente:reunion:<id>». Si se repite, se actualiza la misma.
   · POST /api/integracion/invitar: invitación de alta en Atalaya 360° con nombre, empresa, teléfono y empresa de HubSpot
     ya rellenos (cuenta en prueba y enlace para elegir contraseña, válido 7 días). */
const ZONA = env.ZONA_HORARIA || 'Europe/Madrid';
const OID_REUNION = (id) => `asistente:reunion:${id}`; // mismo formato que A.mesa.oid(mundo, tipo, id) de js/mesa-comun.js
// Fecha y hora locales (zona de la empresa) de un instante ISO
function fechaHoraLocal(iso) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: ZONA, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
  return { fecha: `${p.year}-${p.month}-${p.day}`, hora: `${p.hour}:${p.minute}` };
}
const txt = (v, n) => String(v == null ? '' : v).trim().slice(0, n || 160);
// Empresa de Atalaya a la que pertenece la reunión: por el id de HubSpot de la ficha de empresa, por el de la cuenta,
// por el correo de la ficha (contacto o responsable) o por el correo de la cuenta (su empresa principal)
function buscarEmpresa(d) {
  const hs = txt(d.hubspotCompanyId || d.hubspotId, 40), email = txt(d.email).toLowerCase();
  const regs = db.users.filter((u) => !u.demo).map((u) => { const r = D.get(u.id, 'empresas'); return { u, lista: r && Array.isArray(r.lista) ? r.lista.filter((e) => e && e.id && !e.modelo) : [] }; });
  if (hs) {
    for (const { u, lista } of regs) { const e = lista.find((x) => String(x.hubspotId || '') === hs); if (e) return { u, e, por: 'hubspotId' }; }
    const u = db.users.find((x) => !x.demo && String(x.hubspotCompanyId || '') === hs); if (u) return { u, e: { id: 'principal', nombre: u.empresa }, por: 'hubspotId de la cuenta' };
  }
  if (d.hubspotContactId) { const u = db.users.find((x) => !x.demo && String(x.hubspotContactId || '') === txt(d.hubspotContactId, 40)); if (u) return { u, e: { id: 'principal', nombre: u.empresa }, por: 'contacto de HubSpot' }; }
  if (email) {
    const u = db.users.find((x) => x.email === email && !x.demo);
    if (u) return { u, e: (regs.find((r) => r.u === u).lista.find((x) => x.id === 'principal')) || { id: 'principal', nombre: u.empresa }, por: 'correo de la cuenta' };
    for (const { u: v, lista } of regs) { const e = lista.find((x) => [x.email, x.contacto, x.responsableEmail].some((c) => String(c || '').trim().toLowerCase() === email)); if (e) return { u: v, e, por: 'correo de la ficha' }; }
  }
  return null;
}
route('POST', /^\/api\/integracion\/reunion$/, async (req, res, body) => {
  const id = txt(body.id, 120);
  if (!/^[\w.:@-]{1,120}$/.test(id)) throw fallo(400, 'Falta el identificador de la reunión (id)');
  if (isNaN(Date.parse(body.inicio))) throw fallo(400, 'Falta la fecha de inicio (inicio, ISO)');
  const b = buscarEmpresa(body);
  if (!b) {
    anotarActividad(req, 'integracion.reunion.sin-cuenta', null, { quien: 'asistente', email: txt(body.email) || null, nota: `Reunión ${id} · ${txt(body.empresa)}${body.hubspotCompanyId ? ' · HubSpot ' + txt(body.hubspotCompanyId, 40) : ''}` });
    return { ok: false, motivo: 'sin-cuenta' };
  }
  const { u, e } = b, clave = e.id === 'principal' ? 'agenda' : 'agenda--' + e.id;
  const { fecha, hora } = fechaHoraLocal(body.inicio);
  const fin = Date.parse(body.fin), dur = fin > Date.parse(body.inicio) ? Math.min(600, Math.round((fin - Date.parse(body.inicio)) / 60000)) : 60;
  const nombre = txt(body.nombre, 120), empresa = txt(body.empresa) || e.nombre || u.empresa || '';
  const t = nombre ? `Sesión estratégica con ${nombre}${empresa ? ` (${empresa})` : ''}` : txt(body.titulo) || `Sesión estratégica${empresa ? ` (${empresa})` : ''}`;
  const enlace = /^https?:\/\//.test(txt(body.enlace, 500)) ? txt(body.enlace, 500) : '';
  const oid = OID_REUNION(id);
  const st = Object.assign({ v: 1, tareas: [], repetitivas: [], metas: [], semana: [], reuniones: [], delegaciones: [], descartadas: [], logros: {} }, D.get(u.id, clave) || {});
  if (!Array.isArray(st.tareas)) st.tareas = [];
  const datos = { t, fecha, hora, dur, enlace, contacto: [nombre, txt(body.telefono, 40), txt(body.email)].filter(Boolean).join(' · '), inicio: new Date(body.inicio).toISOString() };
  let x = st.tareas.find((y) => y.oid === oid), accion = 'sin-cambios';
  if (!x) {
    x = Object.assign({ id: 't' + crypto.randomBytes(5).toString('hex'), oid, entrada: today(), tipo: 'imperativa', estado: 'pendiente', impacto: 4, esfuerzo: 2, clave: true, area: 'Dirección', mundo: 'asistente', origen: 'Asistente telefónico · reunión agendada', resp: 'Valerio García (Business Avance)' }, datos);
    st.tareas.push(x); accion = 'creada';
  } else if (Object.keys(datos).some((k) => String(x[k] || '') !== String(datos[k] || ''))) {
    // Cambio de hora o de datos: se actualiza la misma tarea (y vuelve a pendiente si se había movido de día)
    Object.assign(x, datos, { actualizado: now() }); accion = 'actualizada';
  }
  if (accion !== 'sin-cambios') {
    // El servidor escribe la fuente: cambia la versión del dato y el navegador lo combina con lo suyo al guardar (409)
    const json = JSON.stringify(st);
    if (Buffer.byteLength(json) > DATA_MAX_CLAVE) throw fallo(413, 'La agenda de esa empresa ocupa demasiado');
    D.set(u.id, clave, st, json);
    anotarActividad(req, 'integracion.reunion', u, { quien: 'asistente', despues: { empresa: e.id, clave, fecha, hora, dur, oid }, nota: `${accion === 'creada' ? 'Reunión añadida' : 'Reunión actualizada'} en la mesa de ${e.nombre || 'la empresa'} (${b.por}): ${t}` });
  }
  return { ok: true, cuenta: u.id, empresa: e.id, tarea: x.id, accion };
}, { integracion: true });
route('POST', /^\/api\/integracion\/invitar$/, async (req, res, body) => {
  const email = txt(body.email).toLowerCase();
  if (!emailOk(email)) throw fallo(400, 'Correo no válido');
  const hs = txt(body.hubspotCompanyId || body.hubspotId, 40) || null, hc = txt(body.hubspotContactId, 40) || null;
  let u = db.users.find((x) => x.email === email), creada = false;
  if (u && u.demo) return { ok: false, motivo: 'demostracion' };
  // Una cuenta que ya se usa no se toca: basta con que entre con su contraseña
  if (u && (u.ultimoAcceso || (u.sesiones || 0) > 0)) {
    if (hs && !u.hubspotCompanyId) { u.hubspotCompanyId = hs; save(); }
    anotarActividad(req, 'integracion.invitar', u, { quien: 'asistente', nota: 'Ya tenía cuenta en uso: no se envía invitación' });
    return { ok: true, cuenta: u.id, existente: true };
  }
  if (!u) {
    u = cuentaNueva({ nombre: txt(body.nombre, 120), empresa: txt(body.empresa), telefono: txt(body.telefono, 40) }, email);
    u.creadoPor = 'asistente'; u.plan = PLANES_LIBRES.includes(body.plan) ? body.plan : 'profesional';
    db.users.push(u); creada = true;
    // Ficha de la empresa principal con su nombre y su id de HubSpot
    if (hs || u.empresa) { const j = JSON.stringify({ lista: [{ id: 'principal', nombre: u.empresa || 'Mi empresa', rol: 'holding', participacion: 100, alta: now(), hubspotId: hs || '' }] }); D.set(u.id, 'empresas', JSON.parse(j), j); }
  } else ['nombre', 'empresa', 'telefono'].forEach((k) => { if (!u[k] && txt(body[k])) u[k] = txt(body[k], k === 'telefono' ? 40 : 160); });
  if (hs) u.hubspotCompanyId = hs; if (hc) u.hubspotContactId = hc;
  // La prueba empieza al invitar: 14 días desde hoy
  u.pruebaHasta = new Date(Date.now() + PRUEBA_DIAS * 864e5).toISOString(); u.invitado = now();
  const token = newResetToken(u, 'invitación', 7 * 24 * 60), enlace = `${APP_URL}/acceso.html#reset=${token}`;
  const enviado = await sendMail(u.email, 'Atalaya 360° · Su invitación', `Hola${u.nombre ? ' ' + u.nombre : ''}:\n\nLe invitamos a Atalaya 360°, el software de Business Avance, con ${PRUEBA_DIAS} días de prueba del plan ${NOMBRE_PLAN[u.plan]}${u.empresa ? ` para ${u.empresa}` : ''}.\n${AVISO_TARJETA(u)}Para elegir su contraseña y entrar abra este enlace (válido 7 días):\n${enlace}\n\nEquipo de Business Avance`);
  anotarActividad(req, 'integracion.invitar', u, { quien: 'asistente', despues: creada ? foto(u) : { pruebaHasta: u.pruebaHasta }, nota: `${creada ? 'Cuenta creada' : 'Invitación renovada'} desde el asistente o HubSpot${hs ? ' · empresa HubSpot ' + hs : ''} · ${enviado ? 'correo enviado' : 'sin correo: enlace devuelto'}` });
  save();
  aHubspot({ clave: `invitacion:${u.id}:${today()}`, origen: 'Atalaya · invitación de alta enviada', nombre: u.nombre, email: u.email, telefono: u.telefono, empresa: u.empresa, cuenta: u.id, hubspotCompanyId: hs, tarea: false, mensaje: `Invitación de alta en Atalaya 360° (plan ${NOMBRE_PLAN[u.plan]}, ${PRUEBA_DIAS} días de prueba). ${enviado ? 'Enviada por correo.' : 'Sin correo configurado: enlace entregado al asistente.'}` });
  return Object.assign({ ok: true, cuenta: u.id, creada, enviado }, enviado ? {} : { enlace });
}, { integracion: true });

/* ---------- Ficheros estáticos ----------
   Solo se sirven los tipos que usa la web; nunca server/, node_modules/, ficheros o carpetas que empiezan por punto,
   ni documentos internos (.md, .skill, .json…). */
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.ico': 'image/x-icon', '.mp4': 'video/mp4', '.webm': 'video/webm', '.vtt': 'text/vtt; charset=utf-8', '.woff': 'font/woff', '.woff2': 'font/woff2' };
// Páginas del área de clientes que el servidor no entrega sin sesión con acceso (o sesión de administración)
const PRIVADAS = new Set(['/manual.html']);
const ROOT_REAL = fs.realpathSync(ROOT);
const prohibido = (rel) => { const p = rel.split(path.sep); return !rel || rel.startsWith('..') || path.isAbsolute(rel) || ['server', 'node_modules'].includes(p[0]) || p.some((x) => x.startsWith('.')); };
const noEncontrado = (res, code) => { res.writeHead(code || 404, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(code === 400 ? 'Dirección no válida' : code === 405 ? 'Método no permitido' : 'No encontrado'); };
// Hash de cada script en línea de la página, para autorizarlo en la política de contenidos sin 'unsafe-inline'
const hashesInline = (html) => [...html.matchAll(/<script\b(?![^>]*\bsrc\s*=)[^>]*>([\s\S]*?)<\/script\s*>/gi)].map((m) => `'sha256-${crypto.createHash('sha256').update(m[1].replace(/\r\n?/g, '\n')).digest('base64')}'`);
function serveStatic(req, res, url) {
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.setHeader('Allow', 'GET, HEAD'); return noEncontrado(res, 405); }
  let p; try { p = decodeURIComponent(url.pathname); } catch { return noEncontrado(res, 400); }
  if (p.includes('\0')) return noEncontrado(res, 400);
  if (p === '/') p = '/index.html';
  if (PRIVADAS.has(p) && !access(currentUser(req)).ok && !isAdmin(req)) { res.writeHead(302, { Location: '/acceso.html', 'Cache-Control': 'no-store' }); return res.end(); }
  const file = path.resolve(ROOT, '.' + p), tipo = TYPES[path.extname(file).toLowerCase()];
  if (!tipo || prohibido(path.relative(ROOT, file))) return noEncontrado(res);
  fs.realpath(file, (e0, real) => {
    // Un enlace simbólico no puede sacar ficheros de fuera de la web
    if (e0 || prohibido(path.relative(ROOT_REAL, real))) return noEncontrado(res);
    fs.stat(real, (err, st) => {
      if (err || !st.isFile()) return noEncontrado(res);
      const h = { 'Content-Type': tipo, 'Last-Modified': st.mtime.toUTCString() };
      if (tipo.startsWith('text/html')) {
        return fs.readFile(real, 'utf8', (e2, html) => {
          if (e2) return noEncontrado(res);
          res.setHeader('Content-Security-Policy', csp(hashesInline(html)));
          res.writeHead(200, Object.assign(h, { 'Content-Length': Buffer.byteLength(html), 'Cache-Control': 'no-cache' }));
          res.end(req.method === 'HEAD' ? undefined : html);
        });
      }
      // Rangos de bytes (los vídeos los piden para avanzar y Safari los exige)
      h['Accept-Ranges'] = 'bytes';
      let a = 0, b = st.size - 1, code = 200;
      const rg = /^bytes=(\d*)-(\d*)$/.exec(String(req.headers.range || '').trim());
      if (rg && (rg[1] || rg[2])) {
        if (rg[1]) { a = +rg[1]; b = rg[2] ? Math.min(+rg[2], st.size - 1) : st.size - 1; } else { a = Math.max(0, st.size - +rg[2]); }
        if (a > b || a >= st.size) { res.writeHead(416, { 'Content-Range': `bytes */${st.size}` }); return res.end(); }
        code = 206; h['Content-Range'] = `bytes ${a}-${b}/${st.size}`;
      }
      h['Content-Length'] = st.size ? b - a + 1 : 0;
      res.writeHead(code, h);
      if (req.method === 'HEAD' || !st.size) return res.end();
      const s = fs.createReadStream(real, { start: a, end: b });
      s.on('error', () => res.destroy()); s.pipe(res);
    });
  });
}

async function manejar(req, res) {
  cabeceras(res);
  let url; try { url = new URL(req.url, 'http://x'); } catch { return send(res, 400, { error: 'Dirección no válida' }); }
  if (!url.pathname.startsWith('/api/')) return serveStatic(req, res, url);
  // El aviso de Stripe se lee en bruto (la firma se comprueba sobre los bytes recibidos) y no lleva sesión
  if (url.pathname === '/api/stripe/webhook') return webhookStripe(req, res);
  const r = routes.find((x) => x.method === req.method && x.re.test(url.pathname));
  if (!r) return send(res, 404, { error: 'Ruta no encontrada' });
  if (r.opts.integracion) {
    // Sin token configurado la integración no existe; con token, Bearer comparado en tiempo constante y límite por IP
    if (!env.INTEGRACION_TOKEN) return send(res, 404, { error: 'Ruta no encontrada' });
    const ip = ipDe(req);
    if (bloqueado('integracion_fallo', ip) || bloqueado('integracion', ip)) return send(res, 429, { error: 'Demasiadas peticiones' });
    anotar('integracion', ip);
    const m = /^Bearer\s+(.+)$/i.exec(String(req.headers.authorization || ''));
    if (!m || !igualTexto(sha('int:' + m[1].trim()), sha('int:' + env.INTEGRACION_TOKEN))) { anotar('integracion_fallo', ip); return send(res, 401, { error: 'No autorizado' }); }
  }
  try {
    // Las peticiones que cambian datos deben ser JSON: un formulario de otra web no puede enviarlas sin permiso del navegador
    if (req.method !== 'GET' && !(req.headers['content-type'] || '').includes('application/json')) return send(res, 415, { error: 'Se esperaba JSON' });
    const body = req.method === 'GET' ? {} : await readBody(req);
    const u = currentUser(req);
    if (u && u.demo) demoVista = Date.now(); // uso reciente de la demostración (aplaza el restablecimiento nocturno)
    if (r.opts.integracion) { /* ya autenticada arriba */ }
    else if (r.opts.admin) {
      if (!isAdmin(req)) return send(res, 401, { error: 'Entre con la contraseña de administración' });
    } else if (!r.opts.public) {
      if (!u) return send(res, 401, { error: 'Inicie sesión' });
      if (!r.opts.noAccess && !access(u).ok) return send(res, 402, { error: 'Su acceso necesita activarse' });
    }
    const out = await r.fn(req, res, body, u, url.pathname.match(r.re));
    send(res, 200, out);
  } catch (e) {
    // Los errores propios (con código) se explican al cliente; los demás se registran y el cliente recibe un mensaje genérico
    let code = 500, msg = 'Error interno del servidor. Inténtelo de nuevo.';
    if (Number.isInteger(e.code) && e.code >= 400 && e.code < 600) { code = e.code; msg = e.message; }
    else if (e.status || /Connection|Timeout/.test((e.constructor && e.constructor.name) || '')) {
      // Error de la API de Claude: no se reenvía su mensaje
      code = e.status === 429 || e.status === 529 ? 503 : 502;
      msg = code === 503 ? 'La IA está saturada en este momento. Inténtelo de nuevo en unos minutos.' : 'La IA no ha podido responder. Inténtelo de nuevo.';
      console.error(`Claude (${req.method} ${url.pathname}):`, e.status || '', e.message);
    } else console.error(`Error en ${req.method} ${url.pathname}:`, e);
    if (!res.headersSent) send(res, code, Object.assign({}, e.code === code && e.extra ? e.extra : {}, { error: msg }));
  }
}

/* ---------- Cuenta de demostración (presentaciones comerciales) ----------
   La crea el propio servidor, como ADMIN_PASSWORD la contraseña de la administración, con estas variables:
   · DEMO_PASSWORD (secreta, 12 caracteres como mínimo): sin ella no hay demostración; si la cuenta ya existía, queda
     desactivada (no se puede entrar) y se conserva. Si cambia, se pone la nueva y se cierran las sesiones abiertas.
   · DEMO_EMAIL (demo@businessavance.es): correo con el que se entra. Si ya es de una cuenta de cliente, no se toca.
   · DEMO_PLAN (consultora): plan con el que se enseña. Si cambia, la cuenta pasa a ese plan con sus datos de partida.
   · DEMO_HORA (04:00, en ZONA_HORARIA): hora a la que se restablece cada noche.
   La cuenta lleva demo: true: acceso pagado sin vencimiento, nunca pide tarjeta ni abre Stripe, no cambia de contraseña,
   correo ni plan desde la aplicación, no envía correos a terceros y no cuenta como cliente (cuotas, HubSpot, avisos al
   equipo, revisión del sistema). Sus datos se restablecen cada noche y a petición desde la administración con la semilla
   de server/demo-semilla.json (empresas ficticias; ver generar-semilla-demo.mjs). Admite varias sesiones a la vez. */
const NO_DEMO = {
  plan: 'La cuenta de demostración no cambia de plan ni de forma de pago.',
  pago: 'La cuenta de demostración no tiene pagos: no se abre la pasarela de pago.',
  contrasena: 'La contraseña de la cuenta de demostración no se cambia desde la aplicación.',
  dospasos: 'La cuenta de demostración no usa la verificación en dos pasos: la comparten varias personas.',
  correo: 'La cuenta de demostración no envía correos: copie el enlace si quiere enseñarlo.',
  admin: 'La cuenta de demostración se gestiona con las variables DEMO_PASSWORD y DEMO_PLAN del servidor. Desde aquí puede restablecer sus datos, bloquearla o escribir una nota.'
};
const noDemoAdmin = (u) => { if (u && u.demo) throw fallo(409, NO_DEMO.admin); };
const DEMO_EMAIL = String(env.DEMO_EMAIL || 'demo@businessavance.es').trim().toLowerCase();
const DEMO_PLAN = PLANES.includes(String(env.DEMO_PLAN || '').toLowerCase()) ? String(env.DEMO_PLAN).toLowerCase() : 'consultora';
if (env.DEMO_PLAN && !PLANES.includes(String(env.DEMO_PLAN).toLowerCase())) console.warn(`DEMO_PLAN=${env.DEMO_PLAN} no es un plan conocido (${PLANES.join(', ')}); se usa consultora.`);
const DEMO_HORA = (() => { const m = /^(\d{1,2}):(\d{2})$/.exec(String(env.DEMO_HORA || '04:00').trim()); return m && +m[1] < 24 && +m[2] < 60 ? [+m[1], +m[2]] : [4, 0]; })();
// Vistas entre las que puede cambiar la demostración sin tocar ningún cobro (los dos planes con varias empresas)
const VISTAS_DEMO = ['consultora', 'grupos'];
const SEMILLA_DEMO = (() => {
  try { const j = JSON.parse(fs.readFileSync(path.join(here, 'demo-semilla.json'), 'utf8')); if (j && j.planes) return j; } catch (e) { if (env.DEMO_PASSWORD) console.warn('No se puede leer server/demo-semilla.json: la demostración se queda sin datos de partida.', e.message); }
  return { planes: {} };
})();
// Fecha local (ZONA_HORARIA) de un instante, en AAAA-MM-DD
const fechaLocal = (ms) => { const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: ZONA, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(ms)).map((x) => [x.type, x.value])); return `${p.year}-${p.month}-${p.day}`; };
// Fechas relativas de la semilla: «@d+7» (fecha, dentro de 7 días) y «@t-3» (instante, hace 3 días)
function fechasDemo(v, ahora) {
  if (typeof v === 'string') {
    const m = /^@([dt])([+-]\d{1,5})$/.exec(v); if (!m) return v;
    const ms = ahora + +m[2] * 864e5;
    return m[1] === 'd' ? fechaLocal(ms) : new Date(ms).toISOString();
  }
  if (Array.isArray(v)) return v.map((x) => fechasDemo(x, ahora));
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, fechasDemo(x, ahora)]));
  return v;
}
/* Restablece la cuenta de demostración: borra todos sus datos (empresas, mundos, análisis de mercado, invitaciones a
   test con sus respuestas) y pone los de la semilla del plan. «plan»: el de la vista elegida (por defecto, DEMO_PLAN).
   El uso de IA del día no se pone a cero: la cuota diaria sigue siendo la misma aunque se restablezca a mano. */
function restablecerDemo(u, motivo, req, plan) {
  plan = PLANES.includes(plan) ? plan : DEMO_PLAN;
  const datos = SEMILLA_DEMO.planes[plan] || {}, ahora = Date.now();
  let n = 0;
  tx(() => {
    D.borrarCuenta(u.id);
    for (const [k, v] of Object.entries(datos)) { const val = fechasDemo(v, ahora), j = JSON.stringify(val); D.set(u.id, k, val, j); n++; }
  });
  Object.keys(db.invitaciones).forEach((k) => { if (db.invitaciones[k].owner === u.id) delete db.invitaciones[k]; });
  Object.keys(db.lid360).forEach((k) => { if (k.startsWith(u.id + '|')) delete db.lid360[k]; });
  const reg = datos.empresas && Array.isArray(datos.empresas.lista) ? datos.empresas.lista.find((e) => e.id === 'principal') : null;
  Object.assign(u, { plan, periodo: 'mensual', nombre: 'Cuenta de demostración', empresa: (reg && reg.nombre) || 'Empresa de demostración', telefono: '', demoRestablecida: now() });
  ['planPendiente', 'tramo', 'cambiosPlan', 'solicitudPago', 'solicitudReset', 'cuotaPactada'].forEach((k) => delete u[k]);
  anotarActividad(req || null, 'demo.restablecer', u, { quien: req ? undefined : 'sistema', nota: `${motivo} · plan ${NOMBRE_PLAN[plan]} · ${n} datos de partida` });
  save();
  return n;
}
// Próxima hora de restablecimiento (DEMO_HORA en ZONA_HORARIA), en milisegundos, después de «desde»
function proximoRestablecimiento(desde = Date.now(), hora = DEMO_HORA, zona = ZONA) {
  const offset = (ms) => { const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: zona, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(ms)).map((x) => [x.type, x.value])); return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - Math.floor(ms / 1000) * 1000; };
  for (let dia = 0; dia < 3; dia++) {
    const [y, mo, d] = fechaLocal(desde + dia * 864e5).split('-').map(Number);
    const local = Date.UTC(y, mo - 1, d, hora[0], hora[1]);
    let t = local - offset(local); t = local - offset(t); // dos pasadas: el desfase de ese día (horario de verano o de invierno)
    if (t > desde) return t;
  }
  return desde + 864e5;
}
const demoActiva = () => db.users.find((u) => u.demo && !u.demoInactiva) || null;
/* Uso reciente de la demostración: la última petición con su sesión (en memoria) o el último pulso de uso o entrada.
   Si alguien la ha usado en los últimos DEMO_ESPERA_MIN minutos (30), el restablecimiento nocturno se aplaza de 30 en 30
   minutos, como mucho hasta DEMO_HORA_LIMITE (07:00): a esa hora se restablece aunque siga en uso. */
const DEMO_ESPERA = num('DEMO_ESPERA_MIN', 30) * 60e3;
const DEMO_LIMITE = (() => { const m = /^(\d{1,2}):(\d{2})$/.exec(String(env.DEMO_HORA_LIMITE || '07:00').trim()); return m && +m[1] < 24 && +m[2] < 60 ? [+m[1], +m[2]] : [7, 0]; })();
let demoVista = 0;
const actividadDemo = (u) => Math.max(demoVista, Date.parse(u.ultimoAcceso) || 0);
const sesionesDemo = (u) => Object.values(db.sessions).filter((x) => x.userId === u.id && Date.parse(x.exp) > Date.now()).length;
let demoTimer = null, demoProxima = null, demoAplazada = null;
const esperarHasta = (t, fn) => { clearTimeout(demoTimer); demoProxima = t; demoTimer = setTimeout(fn, Math.min(2 ** 31 - 1, Math.max(1000, t - Date.now()))); demoTimer.unref(); };
function programarDemo() {
  clearTimeout(demoTimer); demoTimer = null; demoProxima = null; demoAplazada = null;
  if (!demoActiva()) return;
  const t = proximoRestablecimiento();
  // Hora límite de ese mismo turno (la primera DEMO_HORA_LIMITE después de la hora del restablecimiento)
  const limite = proximoRestablecimiento(t - 1000, DEMO_LIMITE);
  // setTimeout no admite más de ~24,8 días; con una espera de horas basta con volver a calcular al despertar
  esperarHasta(t, () => (Date.now() < t - 1000 ? programarDemo() : intentoDemo(limite)));
}
function intentoDemo(limite) {
  const u = demoActiva(); if (!u) return programarDemo();
  const ahora = Date.now();
  if (ahora - actividadDemo(u) < DEMO_ESPERA && ahora < limite - 1000) {
    const sig = Math.min(ahora + DEMO_ESPERA, limite);
    demoAplazada = new Date(sig).toISOString();
    console.log(`Restablecimiento de la demostración aplazado: se ha usado en los últimos ${Math.round(DEMO_ESPERA / 60e3)} minutos (siguiente intento ${demoAplazada}).`);
    return esperarHasta(sig, () => intentoDemo(limite));
  }
  try { restablecerDemo(u, demoAplazada ? 'restablecimiento nocturno (aplazado por uso)' : 'restablecimiento nocturno'); console.log('Cuenta de demostración restablecida (restablecimiento nocturno).'); } catch (e) { console.error('Restablecer la demostración:', e.message); }
  programarDemo();
}
const hhmm = (h) => h.map((x) => String(x).padStart(2, '0')).join(':');
const estadoDemo = () => { const u = db.users.find((x) => x.demo); if (!u) return null; const act = actividadDemo(u); return { cuenta: u.id, email: u.email, activa: !u.demoInactiva, plan: u.plan, planEnv: DEMO_PLAN, hora: hhmm(DEMO_HORA), limite: hhmm(DEMO_LIMITE), zona: ZONA, proximo: demoProxima ? new Date(demoProxima).toISOString() : null, aplazada: demoAplazada, ultimo: u.demoRestablecida || null, sesiones: sesionesDemo(u), ultimaActividad: act ? new Date(act).toISOString() : null, enUso: Date.now() - act < DEMO_ESPERA, iaEurHoy: ((u.usoIA || {})[today()] || {}).eur || 0, iaEurDia: IA_DEMO_EUR_DIA }; };
const cerrarSesionesDe = (u) => Object.keys(db.sessions).forEach((k) => { if (db.sessions[k].userId === u.id) delete db.sessions[k]; });
function configurarDemo() {
  let pw = env.DEMO_PASSWORD || '';
  if (pw && pw.length < 12) { console.warn('DEMO_PASSWORD debe tener al menos 12 caracteres; se ignora (sin cuenta de demostración).'); pw = ''; }
  let u = db.users.find((x) => x.demo);
  if (!pw) {
    // Sin contraseña no hay demostración: la cuenta que hubiera queda desactivada, con sus datos, y se cierran sus sesiones
    if (u && sesionesDemo(u)) { cerrarSesionesDe(u); save(); }
    if (u && !u.demoInactiva) { u.demoInactiva = now(); cerrarSesionesDe(u); anotarActividad(null, 'demo.desactivar', u, { quien: 'sistema', nota: 'Sin DEMO_PASSWORD: no se puede entrar' }); save(); console.log('Cuenta de demostración desactivada (no hay DEMO_PASSWORD).'); }
    return;
  }
  if (!emailOk(DEMO_EMAIL)) { console.warn(`DEMO_EMAIL (${DEMO_EMAIL}) no es un correo válido: no se crea la cuenta de demostración.`); return; }
  if (db.users.some((x) => x.email === DEMO_EMAIL && !x.demo)) { console.warn(`DEMO_EMAIL (${DEMO_EMAIL}) ya es el correo de una cuenta de cliente: no se convierte en demostración. Elija otro correo.`); return; }
  const nueva = !u;
  if (nueva) {
    u = { id: uid(), nombre: 'Cuenta de demostración', email: DEMO_EMAIL, empresa: '', telefono: '', plan: DEMO_PLAN, periodo: 'mensual', rol: 'cliente', estado: 'activo', pagado: true, venceAcceso: null, alta: now(), ultimoAcceso: null, sesiones: 0, uso: {}, pagos: [], demo: true, creadoPor: 'servidor (DEMO_PASSWORD)', salt: '', hash: '' };
    db.users.push(u);
  }
  const notas = [];
  if (u.email !== DEMO_EMAIL) { notas.push(`correo ${u.email} → ${DEMO_EMAIL}`); u.email = DEMO_EMAIL; }
  if (!u.salt || !safeEq(hashPw(pw, u.salt), u.hash)) {
    u.salt = crypto.randomBytes(16).toString('hex'); u.hash = hashPw(pw, u.salt);
    if (!nueva) { cerrarSesionesDe(u); notas.push('contraseña nueva desde DEMO_PASSWORD; sesiones cerradas'); }
  }
  if (u.demoInactiva) { delete u.demoInactiva; notas.push('reactivada'); }
  Object.assign(u, { pagado: true, venceAcceso: null, rol: 'cliente' }); if (u.estado !== 'bloqueado') u.estado = 'activo';
  delete u.totp; delete u.pruebaHasta;
  if (nueva || u.demoPlanEnv !== DEMO_PLAN) { if (!nueva) notas.push(`DEMO_PLAN: ${DEMO_PLAN}`); u.demoPlanEnv = DEMO_PLAN; restablecerDemo(u, nueva ? 'cuenta creada' : 'DEMO_PLAN cambiado'); }
  if (nueva) { anotarActividad(null, 'demo.crear', u, { quien: 'sistema', despues: { plan: u.plan }, nota: 'Cuenta de demostración creada desde DEMO_PASSWORD' }); console.log(`Cuenta de demostración creada: ${DEMO_EMAIL} (plan ${NOMBRE_PLAN[u.plan]}).`); }
  else if (notas.length) { anotarActividad(null, 'demo.configurar', u, { quien: 'sistema', nota: notas.join(' · ') }); console.log(`Cuenta de demostración: ${notas.join(' · ')}.`); }
  save();
}
configurarDemo();
programarDemo();
// Restablecer la demostración desde su ficha en la administración
route('POST', /^\/api\/admin\/users\/([\w-]+)\/demo\/restablecer$/, async (req, res, body, me, m) => {
  const u = usuarioDe(m[1]);
  if (!u.demo) throw fallo(409, 'Esta cuenta no es la de demostración.');
  // Con una sesión abierta o un uso reciente, se pide confirmación expresa (puede haber una presentación en curso)
  const act = actividadDemo(u), enUso = Date.now() - act < DEMO_ESPERA, ses = sesionesDemo(u);
  if ((enUso || ses) && body.confirmado !== true) throw fallo(409, `La demostración tiene ${ses} ${ses === 1 ? 'sesión abierta' : 'sesiones abiertas'}${enUso ? ` y se ha usado hace ${Math.max(1, Math.round((Date.now() - act) / 60e3))} minutos` : ''}. Si la restablece ahora, quien la esté usando pierde lo que haya escrito. Confirme para seguir.`, { sesionActiva: true, sesiones: ses, enUso });
  const n = restablecerDemo(u, 'restablecida desde la administración', req, DEMO_PLAN);
  return { user: pub(u), datos: n };
}, { admin: true });
// Vista de la demostración: Consultora (cartera de clientes) o Grupos (grupo empresarial con consolidado). Cada vista tiene
// sus datos de partida, así que cambiar de vista restablece la demostración. No toca ningún cobro ni avisa a nadie.
route('POST', /^\/api\/me\/demo\/vista$/, async (req, res, body, u) => {
  if (!u.demo) throw fallo(403, 'Solo la cuenta de demostración cambia de vista.');
  if (!VISTAS_DEMO.includes(body.plan) || !VISTAS_DEMO.includes(u.plan)) throw fallo(400, 'La demostración puede enseñarse como Consultora o como Grupos.');
  if (body.plan !== u.plan) restablecerDemo(u, `vista ${NOMBRE_PLAN[body.plan]} elegida en la aplicación`, req, body.plan);
  return { user: pub(u) };
});

const server = http.createServer((req, res) => {
  manejar(req, res).catch((e) => {
    console.error(`Error no controlado en ${req.method} ${String(req.url).slice(0, 200)}:`, e);
    if (!res.headersSent) { try { send(res, 500, { error: 'Error interno del servidor' }); } catch { res.destroy(); } } else res.destroy();
  });
});
server.on('error', (e) => { console.error('No se pudo arrancar el servidor:', e.message); process.exit(1); });
server.listen(PORT, () => {
  console.log(`Atalaya en http://localhost:${PORT}  (IA: ${env.ANTHROPIC_API_KEY ? 'configurada' : 'sin clave'} · base: ${ALMACEN === 'sqlite' ? DB_SQL : DB_FILE} · Stripe: ${STRIPE ? Object.keys(STRIPE_PRECIOS).length + ' precios' + (env.STRIPE_WEBHOOK_SECRET ? ', avisos firmados' : ', SIN STRIPE_WEBHOOK_SECRET (los pagos no activarán el acceso)') : 'no'})`);
  if (recuperada) saveNow();
});

// Limpieza periódica: contadores de intentos, sesiones y enlaces caducados
setInterval(() => {
  for (const [k, a] of intentos) { const lim = LIMITES[k.split('|')[0]]; const f = a.filter((t) => Date.now() - t < (lim ? lim[1] : 60) * 60e3); if (f.length) intentos.set(k, f); else intentos.delete(k); }
}, 10 * 60e3).unref();
// Conservación: una invitación importada o cerrada (caducada o anulada) se borra a los 30 días; la IP de quien respondió, al importarla
const PURGA_DIAS = +env.INVITACIONES_DIAS || 30;
const purgarInvitaciones = () => {
  let n = 0; const lim = Date.now() - PURGA_DIAS * 864e5;
  Object.entries(db.invitaciones).forEach(([k, v]) => {
    const st = invEstado(v), ref = v.importada || (st === 'caducado' ? v.caduca : st === 'anulado' ? (v.actualizado || v.creado) : null);
    if (v.importada && v.ip) { v.ip = null; n++; }
    if (ref && Date.parse(ref) < lim) { delete db.invitaciones[k]; n++; }
  });
  if (n) save();
};
// El registro de actividad se conserva ACTIVIDAD_DIAS (730 por defecto) y después se borra
const purgar = () => {
  purgarInvitaciones();
  try { const n = ACT.purgar(new Date(Date.now() - ACTIVIDAD_DIAS * 864e5).toISOString()); if (n) console.log(`Registro de actividad: ${n} entradas de más de ${ACTIVIDAD_DIAS} días borradas.`); } catch (e) { console.error('Purga del registro de actividad:', e.message); }
};
purgar();
setInterval(purgar, 6 * 3600e3).unref();
setInterval(() => {
  let n = 0;
  [db.sessions, db.adminSessions, db.resets].forEach((o) => Object.keys(o).forEach((k) => { if (Date.parse(o[k].exp) < Date.now()) { delete o[k]; n++; } }));
  if (n) save();
}, 3600e3).unref();

// Actualización periódica opcional del análisis de mercado (MERCADO_AUTO_DIAS=7 para refrescar semanalmente).
// Solo para cuentas pagadas con un plan que incluye el agente de mercado (nunca en la prueba gratuita).
const autoDias = +env.MERCADO_AUTO_DIAS || 0;
if (autoDias > 0) {
  setInterval(async () => {
    for (const u of db.users) {
      const a = D.mercado(u.id);
      if (u.demo || !a || !a.perfil || access(u).motivo !== 'pagado' || !IA_PLAN.mercado.planes.includes(u.plan) || Date.now() - Date.parse(a.fecha) < autoDias * 864e5) continue;
      try { const n = await agenteMercado(a.perfil); n.perfil = a.perfil; D.setMercado(u.id, n); } catch (e) { console.error('Agente de mercado:', e.message); }
    }
  }, 6 * 3600e3);
}
