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
const COPIAS = 7;
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
  meta: (d) => ['admin', 'adminEnv', 'adminTotp', 'admin2faReset', 'sesionesHash'].filter((k) => d[k] != null).map((k) => [k, d[k]]),
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

// Copia del día: antes de la primera escritura de cada día se rota (.1 la de ayer … .7). En SQLite, con VACUUM INTO,
// que hace una copia coherente y compacta sin parar el servidor.
const BASE = ALMACEN === 'sqlite' ? DB_SQL : DB_FILE;
const copia = (i) => `${BASE}.${i}`;
let copiaDia = (() => { try { return fs.statSync(copia(1)).mtime.toISOString().slice(0, 10); } catch { return null; } })();
function rotarCopias() {
  if (copiaDia === today() || !fs.existsSync(BASE) || txProf) return; // VACUUM INTO no puede ir dentro de una transacción
  try {
    for (let i = COPIAS - 1; i >= 1; i--) if (fs.existsSync(copia(i))) fs.renameSync(copia(i), copia(i + 1));
    if (sql) sql.exec(`VACUUM INTO '${copia(1).replace(/'/g, "''")}'`); else fs.copyFileSync(DB_FILE, copia(1));
    fs.chmodSync(copia(1), 0o600);
    copiaDia = today();
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
const pub = (u) => { if (!u) return null; const { hash, salt, totp, ...rest } = u; return Object.assign(rest, { dosPasos: !!(totp && totp.activo) }); };
const emailOk = (e) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e);
function access(u) {
  if (!u) return { ok: false, motivo: 'sin-sesion' };
  if (u.estado === 'bloqueado') return { ok: false, motivo: 'bloqueado' };
  if (u.pagado && (!u.venceAcceso || Date.parse(u.venceAcceso) > Date.now())) return { ok: true, motivo: 'pagado' };
  // La prueba dura PRUEBA_DIAS desde el alta, o hasta «pruebaHasta» si la administración la ha ampliado
  if (!u.pagado && Math.max(Date.parse(u.alta) + PRUEBA_DIAS * 864e5, Date.parse(u.pruebaHasta) || 0) > Date.now()) return { ok: true, motivo: 'prueba' };
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
  return db.users.find((u) => u.id === s.userId) || null;
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
  login_ip: [30, 15], login_email: [10, 15], verificar: [10, 15], registro: [num('REGISTROS_HORA', 5), 60],
  contacto: [6, 60], olvido_ip: [10, 60], olvido_email: [3, 60], restablecer: [20, 15], admin: [10, 15], test: [300, 15], dospasos: [10, 15]
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
function avisarEquipo(asunto, lineas) {
  if (!env.AVISOS_EMAIL || !env.SMTP_HOST) return;
  const texto = lineas.filter(Boolean).join('\n') + `\n\nGestor de usuarios: ${APP_URL}/admin.html`;
  sendMail(env.AVISOS_EMAIL, `Atalaya · ${asunto}`, texto).catch(() => { /* ya registrado en sendMail */ });
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
const CAMPOS_CUENTA = ['nombre', 'email', 'empresa', 'telefono', 'plan', 'periodo', 'estado', 'pagado', 'venceAcceso', 'pruebaHasta', 'planPendiente', 'cuotaPactada', 'nota'];
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
   o STRIPE_PRECIOS='{"profesional-mensual":"price_…", …}'. Sin STRIPE_SECRET_KEY, todo sigue como antes:
   enlace de pago manual (P.PAGO_URLS en el navegador) o «Solicitar el enlace de pago». */
const STRIPE_PRECIOS = (() => {
  const m = {};
  try { Object.entries(JSON.parse(env.STRIPE_PRECIOS || '{}')).forEach(([k, v]) => { m[k.toLowerCase().replace(/_/g, '-')] = String(v); }); } catch { console.error('STRIPE_PRECIOS no es un JSON válido: se ignora.'); }
  PLANES.forEach((p) => PERIODOS.forEach((per) => { const v = env[`STRIPE_PRECIO_${p.toUpperCase()}_${per.toUpperCase()}`]; if (v) m[`${p}-${per}`] = v; }));
  return m;
})();
const STRIPE = !!env.STRIPE_SECRET_KEY;
const STRIPE_GRACIA_DIAS = num('STRIPE_GRACIA_DIAS', 3); // días de margen tras el fin del periodo pagado (reintentos de cobro)
const planDePrecio = (id) => Object.keys(STRIPE_PRECIOS).find((k) => STRIPE_PRECIOS[k] === id) || null;
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
function activarPorStripe(u, planPer, finSegundos) {
  const antes = foto(u), eraPagado = u.pagado;
  if (planPer) {
    const [plan, periodo] = planPer.split('-');
    if (PLANES.includes(plan) && plan !== u.plan) { (u.cambiosPlan = u.cambiosPlan || []).push({ de: u.plan, a: plan, fecha: now(), por: 'stripe' }); u.plan = plan; }
    if (PERIODOS.includes(periodo)) u.periodo = periodo;
  }
  if (u.planPendiente && ORDEN_PLAN[u.planPendiente.plan] <= ORDEN_PLAN[u.plan]) {
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
  if (tipo === 'checkout.session.completed') {
    if (o.mode !== 'subscription' && o.payment_status !== 'paid') return;
    if (o.customer) u.stripeCliente = o.customer.id || o.customer;
    if (o.subscription) u.stripeSuscripcion = o.subscription.id || o.subscription;
    u.stripeEstado = 'active';
    const meta = o.metadata || {}, planPer = meta.plan && meta.periodo ? `${meta.plan}-${meta.periodo}` : null;
    // Vencimiento provisional (un periodo); la factura pagada (invoice.paid) lo fija con la fecha exacta
    const fin = Math.floor(Date.now() / 1000) + (meta.periodo === 'anual' ? 366 : 31) * 86400;
    const dif = activarPorStripe(u, planPer, fin);
    anotarActividad(null, 'stripe.checkout', u, Object.assign({}, quien, dif || {}));
    avisarEquipo(`Pago con tarjeta: ${u.nombre || u.email}`, [`${u.nombre || ''} <${u.email}> ha pagado el plan ${NOMBRE_PLAN[u.plan] || u.plan} (${u.periodo}) en Stripe.`, o.amount_total != null ? `Importe: ${(o.amount_total / 100).toFixed(2)} ${String(o.currency || '').toUpperCase()}` : '']);
  } else if (tipo === 'invoice.paid' || tipo === 'invoice.payment_succeeded') {
    const lineas = (o.lines && o.lines.data) || [], l = lineas.slice().sort((a, b) => ((b.period || {}).end || 0) - ((a.period || {}).end || 0))[0];
    const planPer = planDePrecio(precioLinea(l));
    if (o.customer && !u.stripeCliente) u.stripeCliente = o.customer.id || o.customer;
    const sub = o.subscription || (o.parent && o.parent.subscription_details && o.parent.subscription_details.subscription);
    if (sub) u.stripeSuscripcion = sub.id || sub;
    const dif = activarPorStripe(u, planPer, l && l.period && l.period.end);
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
    u.stripeSuscripcion = o.id; u.stripeEstado = o.status; u.stripeCancelaAlFinal = !!o.cancel_at_period_end;
    if (o.customer && !u.stripeCliente) u.stripeCliente = o.customer.id || o.customer;
    let dif = null;
    if (o.status === 'active' || o.status === 'trialing') dif = activarPorStripe(u, planDePrecio(precioLinea(item)), o.current_period_end || (item && item.current_period_end));
    anotarActividad(null, 'stripe.suscripcion', u, Object.assign({}, quien, dif || {}, { nota: `${quien.nota} · ${o.status}${o.cancel_at_period_end ? ' · se cancela al final del periodo' : ''}` }));
  } else if (tipo === 'customer.subscription.deleted') {
    u.stripeEstado = 'canceled'; u.stripeCancelaAlFinal = false;
    // El acceso pagado sigue hasta su vencimiento y después no se renueva
    anotarActividad(null, 'stripe.baja', u, quien);
    avisarEquipo(`Suscripción cancelada: ${u.nombre || u.email}`, [`${u.nombre || ''} <${u.email}> ya no tiene suscripción en Stripe. El acceso vence el ${u.venceAcceso ? u.venceAcceso.slice(0, 10) : '—'}.`]);
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
  return c.beta.messages.create({
    model: MODEL, max_tokens: 16000, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default', ...params
  });
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
  pago: { n: num('IA_DIARIA_PAGO', 200), c: num('IA_CARACTERES_PAGO', 10000000) }
};
// Qué funciones de IA abre cada plan (como P.puede en js/platform.js); null = todos los planes
const IA_PLAN = {
  chat: null, extract: null,
  escucha: { planes: ['consultora'], msg: 'La lectura con IA de la auditoría integral está incluida en el plan Consultora.' },
  mercado: { planes: ['profesional', 'consultora', 'grupos'], msg: 'El agente de mercado forma parte del sistema estratégico, incluido desde el plan Profesional.' }
};
async function conIA(u, funcion, peso, chars, fn) {
  const p = IA_PLAN[funcion]; if (p && !p.planes.includes(u.plan)) throw fallo(403, p.msg);
  if (!(await claude())) throw fallo(503, 'La IA no está configurada en el servidor');
  const tipo = access(u).motivo === 'pagado' ? 'pago' : 'prueba', lim = CUOTA_IA[tipo];
  u.usoIA = u.usoIA || {}; const d = (u.usoIA[today()] = u.usoIA[today()] || { n: 0, c: 0 });
  if (d.n + peso > lim.n || d.c + chars > lim.c) {
    throw fallo(429, tipo === 'prueba'
      ? `Ha llegado al límite diario de IA de la prueba gratuita (${lim.n} consultas o su volumen de texto). Se renueva mañana; con el plan activado el límite es mayor.`
      : `Ha llegado al límite diario de IA de su cuenta (${lim.n} consultas o su volumen de texto). Se renueva mañana; si necesita más, escríbanos.`);
  }
  d.n += peso; d.c += chars; u.iaTotal = (u.iaTotal || 0) + peso;
  Object.keys(u.usoIA).sort().slice(0, -60).forEach((k) => delete u.usoIA[k]); // solo los últimos 60 días
  save();
  try { return await fn(); } catch (e) {
    // Si la API no llegó a responder (caída, saturación) la consulta no cuenta
    if (e.status || /Connection|Timeout/.test((e.constructor && e.constructor.name) || '')) { d.n -= peso; d.c -= chars; u.iaTotal -= peso; save(); }
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
route('GET', /^\/api\/health$/, async () => ({ atalaya: true, ia: !!(await claude()), version: 2, stripe: STRIPE ? Object.keys(STRIPE_PRECIOS) : false }), { public: true });

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
  return { user: pub(u) };
}, { public: true });

route('POST', /^\/api\/login$/, async (req, res, body) => {
  const ip = ipDe(req), email = String(body.email || '').trim().toLowerCase().slice(0, 160);
  if (bloqueado('login_ip', ip) || bloqueado('login_email', email)) throw demasiados();
  const u = db.users.find((x) => x.email === email);
  const ref = u || DUMMY;
  const ok = safeEq(hashPw(String(body.password || ''), ref.salt), ref.hash) && !!u;
  if (!ok) { anotar('login_ip', ip); anotar('login_email', email); throw fallo(401, 'Correo o contraseña incorrectos'); }
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
  ['nombre', 'empresa', 'telefono'].forEach((k) => { if (typeof body[k] === 'string') u[k] = body[k].slice(0, 160); });
  if (PLANES.includes(body.plan) && body.plan !== u.plan) {
    const nuevo = body.plan;
    if (nuevo === 'grupos') throw fallo(403, 'El plan Grupos se contrata a medida: pida la propuesta con «Contactar con nuestro equipo».');
    // Bajar a un plan con menos empresas exige borrar antes las que sobran
    const lim = LIMITE_EMPRESAS[nuevo];
    if (nEmpresas(u) > lim) throw fallo(400, `Tiene ${nEmpresas(u)} empresas y ese plan admite ${lim}. Borre antes las que sobran.`);
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
      throw fallo(409, `Hemos recibido su petición de pasar al plan ${NOMBRE_PLAN[nuevo]}. Como su acceso ya está activado, el cambio se aplica cuando nuestro equipo confirme la nueva cuota; le avisaremos. Mientras, sigue con su plan actual.`, { pendiente: true, planPendiente: u.planPendiente });
    }
    (u.cambiosPlan = u.cambiosPlan || []).push({ de: u.plan, a: nuevo, fecha: now() });
    anotarActividad(req, 'plan.cambio', u, { quien: 'cliente', antes: { plan: u.plan }, despues: { plan: nuevo } });
    u.plan = nuevo;
    if (u.planPendiente) { delete u.planPendiente; (db.contactos || []).forEach((c) => { if (c.origen === 'cambio-plan' && c.cuenta === u.id && !c.atendido) c.atendido = now(); }); }
  }
  if (PERIODOS.includes(body.periodo)) u.periodo = body.periodo;
  save(); return { user: pub(u) };
}, { noAccess: true });
// Solicitudes de contacto para el plan Grupos (a medida): públicas, con límite de envíos
route('POST', /^\/api\/contacto$/, async (req, res, body) => {
  const ip = ipDe(req);
  if (bloqueado('contacto', ip)) throw demasiados('Demasiados envíos. Espere unos minutos.');
  anotar('contacto', ip);
  const t = (k, n) => String(body[k] || '').slice(0, n || 160);
  if (!emailOk(t('email'))) throw fallo(400, 'Escriba un correo válido');
  db.contactos = db.contactos || [];
  const c = { id: nid('c'), fecha: now(), plan: t('plan', 20), nombre: t('nombre'), email: t('email'), telefono: t('telefono', 40), empresa: t('empresa'), sociedades: t('sociedades', 6), mensaje: t('mensaje', 2000), origen: t('origen', 40) };
  // Si llega con sesión de cliente (p. ej. datos de facturación al pedir la activación), se enlaza con su cuenta
  const yo = currentUser(req); if (yo && String(yo.email) === c.email.toLowerCase()) c.cuenta = yo.id;
  db.contactos.unshift(c);
  db.contactos = db.contactos.slice(0, 500); save();
  const que = c.plan === 'sesion' ? 'Sesión de 60 minutos' : c.origen === 'activacion' ? 'Solicitud de activación' : `Contacto${c.plan ? ' · plan ' + (NOMBRE_PLAN[c.plan] || c.plan) : ''}`;
  avisarEquipo(`${que}: ${c.nombre || c.email}`, [`${c.nombre} <${c.email}>${c.telefono ? ' · ' + c.telefono : ''}${c.empresa ? ' · ' + c.empresa : ''}${c.sociedades ? ' · ' + c.sociedades + ' sociedades' : ''}`, c.mensaje ? `\n${c.mensaje}` : '']);
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
  // Se avisa una vez al día como mucho (el botón «Pagar ahora» también la marca)
  const nueva = !u.solicitudPago || u.solicitudPago.slice(0, 10) !== today();
  u.solicitudPago = now(); save();
  if (nueva) {
    anotarActividad(req, 'pago.solicitud', u, { quien: 'cliente', despues: { plan: u.plan, periodo: u.periodo || 'mensual' } });
    avisarEquipo(`Solicitud de activación: ${u.nombre || u.email}`, [`${u.nombre || ''} <${u.email}> quiere activar el plan ${NOMBRE_PLAN[u.plan] || u.plan} (pago ${u.periodo || 'mensual'}).`, u.telefono ? `Teléfono: ${u.telefono}` : '', 'Envíele el enlace de pago y regístrelo en el gestor de usuarios al cobrar.']);
  }
  return { ok: true };
}, { noAccess: true });
route('POST', /^\/api\/me\/password$/, async (req, res, body, u) => {
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
  const u = db.users.find((x) => x.email === email);
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
  return { configurado: !!db.admin, sesion: !!s, correo: !!env.SMTP_HOST, dosPasos: !!(t && t.activo), ...(s ? { nombre: s.nombre || null, recuperacion: t && t.activo ? (t.codigos || []).length : null, stripe: STRIPE ? { precios: Object.keys(STRIPE_PRECIOS), webhook: !!env.STRIPE_WEBHOOK_SECRET } : false, almacen: ALMACEN, avisos: !!(env.AVISOS_EMAIL && env.SMTP_HOST) } : {}) };
}, { public: true });
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
  if (String(body.password || '').length < 8) throw fallo(400, 'La contraseña debe tener al menos 8 caracteres');
  u.salt = crypto.randomBytes(16).toString('hex'); u.hash = hashPw(String(body.password), u.salt); delete u.solicitudReset; u.passwordCambiada = now();
  Object.keys(db.sessions).forEach((k) => { if (db.sessions[k].userId === u.id) delete db.sessions[k]; });
  Object.keys(db.resets).forEach((k) => { if (db.resets[k].userId === u.id) delete db.resets[k]; });
  anotarActividad(req, 'cuenta.contrasena', u, { nota: 'Contraseña nueva puesta por la administración; sesiones cerradas' });
  save(); return { ok: true };
}, { admin: true });
route('POST', /^\/api\/admin\/users\/([\w-]+)\/reset$/, async (req, res, body, me, m) => {
  const u = db.users.find((x) => x.id === m[1]); if (!u) throw fallo(404, 'Usuario no encontrado');
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
route('GET', /^\/api\/data\/([A-Za-z0-9_-]{1,80})$/, async (req, res, body, u, m) => { if (access(u).motivo === 'bloqueado') throw fallo(402, 'Su acceso está suspendido'); claveDe(m[1]); return { data: D.get(u.id, m[1]) }; }, { noAccess: true });
// Empresas por plan: el servidor también lo comprueba (no basta con el navegador)
const LIMITE_EMPRESAS = { esencial: 1, profesional: 1, consultora: 15, grupos: Infinity };
route('PUT', /^\/api\/data\/([A-Za-z0-9_-]{1,80})$/, async (req, res, body, u, m) => {
  const key = m[1], { base, empresa } = claveDe(key);
  const borrar = body === null;
  const regla = CLAVES[base];
  if (regla && !borrar && !regla.planes.includes(u.plan)) throw fallo(403, regla.msg);
  if (key === 'empresas') {
    const lista = body && Array.isArray(body.lista) ? body.lista : null;
    if (!lista || !lista.length || lista.length > 500 || !lista.some((e) => e && e.id === 'principal')) throw fallo(400, 'Registro de empresas no válido');
    const lim = LIMITE_EMPRESAS[u.plan] != null ? LIMITE_EMPRESAS[u.plan] : 1;
    const reg = D.get(u.id, 'empresas'), antes = reg && Array.isArray(reg.lista) ? reg.lista.length : 1;
    // Se puede quedar igual o bajar aunque se esté por encima (p. ej. tras cambiar a un plan menor), pero no subir del límite
    if (lista.length > lim && lista.length > antes) throw fallo(403, lim === 1 ? 'Su plan incluye una empresa. Para varias, pase a Consultora o a Grupos.' : `Su plan incluye hasta ${lim} empresas.`);
  }
  if (empresa && !borrar) {
    const reg = D.get(u.id, 'empresas'), ids = reg && Array.isArray(reg.lista) ? reg.lista.map((e) => e && e.id) : [];
    if (!ids.includes(empresa)) throw fallo(403, 'Esa empresa no está dada de alta en su cuenta');
  }
  if (borrar) { D.del(u.id, key); return { ok: true }; }
  const t = D.tamanos(u.id), json = JSON.stringify(body), bytes = Buffer.byteLength(json);
  if (bytes > DATA_MAX_CLAVE) throw fallo(413, `Este dato ocupa ${mb(bytes)} y el máximo es ${mb(DATA_MAX_CLAVE)}. Borre documentos o cargas antiguas y vuelva a guardar.`);
  const total = Object.values(t).reduce((a, b) => a + b, 0) - (t[key] || 0) + bytes;
  if (total > DATA_MAX_CUENTA) throw fallo(413, `Su cuenta llegaría a ${mb(total)} y el máximo es ${mb(DATA_MAX_CUENTA)}. Borre empresas o datos que no use, o escríbanos para ampliarlo.`);
  D.set(u.id, key, body, json); return { ok: true };
});

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
    const enviado = b.enviar && v.email ? await invMail(v) : false;
    out.push(Object.assign(invPub(v), { enviado }));
  }
  save();
  return { invitaciones: out, correo: !!env.SMTP_HOST };
});
route('GET', /^\/api\/invitaciones$/, async (req, res, body, u) => {
  const url = new URL(req.url, 'http://x'), emp = url.searchParams.get('empresa');
  // Bolsas del 360: solo con tres respuestas o más, en orden aleatorio y sin nombres
  const lid360 = Object.entries(db.lid360).filter(([k]) => k.startsWith(u.id + '|') && (!emp || k.split('|')[1] === emp)).map(([k, l]) => ({ empresaId: k.split('|')[1], pid: k.split('|')[2], n: l.length, resps: l.length >= MIN_LID360 ? l.map((x) => x.resp).sort(() => Math.random() - 0.5) : null }));
  return { invitaciones: Object.values(db.invitaciones).filter((v) => v.owner === u.id && (!emp || v.empresaId === emp)).sort((a, b) => b.creado.localeCompare(a.creado)).map(invPub), lid360, minLid360: MIN_LID360, correo: !!env.SMTP_HOST };
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
    const ok = await invMail(v, true); if (!ok) throw fallo(503, 'No hay correo configurado en el servidor: copie el enlace y envíelo usted.');
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
route('GET', /^\/api\/admin\/users$/, async () => ({ users: db.users.map((u) => Object.assign(pub(u), { empresas: nEmpresas(u) })) }), { admin: true });
route('PATCH', /^\/api\/admin\/users\/([\w-]+)$/, async (req, res, body, me, m) => {
  const u = usuarioDe(m[1]), antes = foto(u);
  if (['prueba', 'activo', 'bloqueado'].includes(body.estado)) u.estado = body.estado;
  if (typeof body.pagado === 'boolean') u.pagado = body.pagado;
  if (PLANES.includes(body.plan)) {
    // La administración confirma (o decide) el plan: se cierra la solicitud de cambio pendiente
    if (body.plan !== u.plan) (u.cambiosPlan = u.cambiosPlan || []).push({ de: u.plan, a: body.plan, fecha: now(), por: 'administración' });
    u.plan = body.plan; delete u.planPendiente; cerrarCambioPlan(u);
  }
  if (body.planPendiente === null) { delete u.planPendiente; cerrarCambioPlan(u); }
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
  save(); return { user: pub(u) };
}, { admin: true });
// Borrar una cuenta borra todo lo suyo: datos, análisis de mercado, sesiones, enlaces de contraseña, invitaciones
// (con sus respuestas), solicitudes de contacto con su correo y uso de IA (va en la propia cuenta).
// En el registro de actividad queda que se borró (correo, plan y fechas), no sus datos.
route('DELETE', /^\/api\/admin\/users\/([\w-]+)$/, async (req, res, body, me, m) => {
  const id = m[1], u = usuarioDe(id);
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
  const enviado = body.enviar ? await sendMail(u.email, 'Atalaya 360° · Su cuenta está lista', `Hola${u.nombre ? ' ' + u.nombre : ''}:\n\nLe hemos creado una cuenta en Atalaya 360° con el plan ${NOMBRE_PLAN[u.plan]}${u.pagado ? '' : ` y ${Math.round(((Date.parse(u.pruebaHasta) || Date.now() + PRUEBA_DIAS * 864e5) - Date.now()) / 864e5)} días de prueba`}.\nPara elegir su contraseña abra este enlace (válido 7 días):\n${link}\n\nEquipo de Business Avance`) : false;
  anotarActividad(req, 'cuenta.crear', u, { despues: foto(u) });
  save();
  return { user: pub(u), token, minutos: 7 * 24 * 60, enviado };
}, { admin: true });
// Ampliar la prueba gratuita: «dias» más desde hoy o desde el final actual, si aún no ha terminado
route('POST', /^\/api\/admin\/users\/([\w-]+)\/prueba$/, async (req, res, body, me, m) => {
  const u = usuarioDe(m[1]), dias = Math.round(+body.dias || 0);
  if (dias < 1 || dias > 90) throw fallo(400, 'Indique entre 1 y 90 días');
  if (u.pagado) throw fallo(409, 'Esta cuenta tiene el acceso pagado: amplíe su vencimiento registrando un pago o cambiando la fecha.');
  const antes = foto(u), fin = Math.max(Date.now(), Date.parse(u.alta) + PRUEBA_DIAS * 864e5, Date.parse(u.pruebaHasta) || 0);
  u.pruebaHasta = new Date(fin + dias * 864e5).toISOString();
  if (u.estado !== 'bloqueado') u.estado = 'prueba';
  anotarActividad(req, 'prueba.ampliar', u, Object.assign({ nota: `${dias} días más` }, diferencias(antes, foto(u), CAMPOS_CUENTA) || {}));
  save(); return { user: pub(u) };
}, { admin: true });
// Registrar un pago y ampliar el acceso «meses» desde el vencimiento actual (o desde hoy si ya venció)
route('POST', /^\/api\/admin\/users\/([\w-]+)\/pagos$/, async (req, res, body, me, m) => {
  const u = usuarioDe(m[1]), antes = foto(u);
  if (!(+String(body.importe).replace(',', '.') >= 0)) throw fallo(400, 'Importe no válido');
  const pago = nuevoPago(u, body, 'administración');
  if (body.ampliar !== false && pago.meses > 0) {
    const base = u.pagado && u.venceAcceso && Date.parse(u.venceAcceso) > Date.now() ? new Date(u.venceAcceso) : new Date();
    base.setMonth(base.getMonth() + pago.meses);
    Object.assign(u, { pagado: true, venceAcceso: base.toISOString() }); if (u.estado !== 'bloqueado') u.estado = 'activo';
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
  if (u.totp && u.totp.activo) throw fallo(409, 'El segundo factor ya está activado');
  return iniciarTotp('u:' + u.id, u.email);
}, { noAccess: true });
route('POST', /^\/api\/me\/2fa\/activar$/, async (req, res, body, u) => {
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
  if (!STRIPE) throw fallo(404, 'El pago en línea no está configurado: solicite el enlace de pago.', { manual: true });
  if (u.estado === 'bloqueado') throw fallo(403, 'Su acceso está suspendido. Póngase en contacto con nosotros.');
  // Plan que se paga: el elegido (si el cliente puede elegirlo), el pendiente de confirmar o el actual
  const plan = PLANES_LIBRES.includes(body.plan) || (body.plan === 'grupos' && u.plan === 'grupos') ? body.plan : (u.planPendiente && u.planPendiente.plan) || u.plan;
  const periodo = PERIODOS.includes(body.periodo) ? body.periodo : (u.planPendiente && u.planPendiente.periodo) || u.periodo || 'mensual';
  const precio = STRIPE_PRECIOS[`${plan}-${periodo}`];
  if (!precio) throw fallo(404, `El plan ${NOMBRE_PLAN[plan] || plan} con pago ${periodo} no se puede pagar en línea: solicite el enlace de pago.`, { manual: true });
  if (u.stripeSuscripcion && ['active', 'trialing', 'past_due'].includes(u.stripeEstado)) throw fallo(409, 'Ya tiene una suscripción. Cambie de plan o de tarjeta desde «Gestionar el pago».', { portal: true });
  const p = {
    mode: 'subscription', 'line_items[0][price]': precio, 'line_items[0][quantity]': '1', client_reference_id: u.id, locale: 'es',
    'metadata[cuenta]': u.id, 'metadata[plan]': plan, 'metadata[periodo]': periodo,
    'subscription_data[metadata][cuenta]': u.id, 'subscription_data[metadata][plan]': plan, 'subscription_data[metadata][periodo]': periodo,
    success_url: env.STRIPE_URL_OK || `${APP_URL}/app.html?pago=ok`, cancel_url: env.STRIPE_URL_CANCELAR || `${APP_URL}/acceso.html#pago`,
    billing_address_collection: 'required', 'tax_id_collection[enabled]': 'true'
  };
  if (u.stripeCliente) Object.assign(p, { customer: u.stripeCliente, 'customer_update[name]': 'auto', 'customer_update[address]': 'auto' });
  else p.customer_email = u.email;
  if (env.STRIPE_IMPUESTOS === '1') p['automatic_tax[enabled]'] = 'true';
  const s = await stripeApi('checkout/sessions', p);
  anotarActividad(req, 'pago.checkout', u, { quien: 'cliente', despues: { plan, periodo }, nota: s.id });
  return { url: s.url };
}, { noAccess: true });
route('POST', /^\/api\/me\/pago\/portal$/, async (req, res, body, u) => {
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
  const r = await conIA(u, 'chat', 1, largo + JSON.stringify(tools).length, () => ask({ system: SYSTEM_CHAT + (pagina ? `\nEl usuario está ahora en: ${pagina}.` : ''), tools, messages, output_config: { effort: 'low' } }));
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
  }));
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
  }));
  return { datos: jsonOf(textOf(r)) };
});

// Agente de mercado: análisis 360 con fuentes oficiales, guardado por usuario. Cuenta como 5 consultas (hace búsquedas web)
const PESO_MERCADO = 5;
route('GET', /^\/api\/mercado$/, async (req, res, body, u) => ({ analisis: D.mercado(u.id) }));
route('POST', /^\/api\/mercado\/actualizar$/, async (req, res, body, u) => {
  const perfil = { sector: body.sector, actividad: body.actividad, region: body.region, productos: body.productos, clientes: body.clientes, ventas: body.ventas };
  if (JSON.stringify(perfil).length > 20000) throw fallo(400, 'El perfil de la empresa es demasiado largo');
  const a = await conIA(u, 'mercado', PESO_MERCADO, 6000, () => agenteMercado(perfil));
  a.perfil = perfil;
  D.setMercado(u.id, a);
  return { analisis: a };
});

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
  try {
    // Las peticiones que cambian datos deben ser JSON: un formulario de otra web no puede enviarlas sin permiso del navegador
    if (req.method !== 'GET' && !(req.headers['content-type'] || '').includes('application/json')) return send(res, 415, { error: 'Se esperaba JSON' });
    const body = req.method === 'GET' ? {} : await readBody(req);
    const u = currentUser(req);
    if (r.opts.admin) {
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
      if (!a || !a.perfil || access(u).motivo !== 'pagado' || !IA_PLAN.mercado.planes.includes(u.plan) || Date.now() - Date.parse(a.fecha) < autoDias * 864e5) continue;
      try { const n = await agenteMercado(a.perfil); n.perfil = a.perfil; D.setMercado(u.id, n); } catch (e) { console.error('Agente de mercado:', e.message); }
    }
  }, 6 * 3600e3);
}
