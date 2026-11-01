// Almacén local en SQLite (node:sqlite): conversaciones, mensajes, llamadas, campañas, consentimientos y bajas.
// HubSpot es la ficha comercial; aquí queda el registro operativo y lo que exige el cumplimiento (bajas, bases legales).
import fs from 'node:fs';
import path from 'node:path';
import { C } from '../config.js';

process.removeAllListeners('warning'); // node:sqlite avisa de que es experimental en Node 22
const { DatabaseSync } = await import('node:sqlite');

const MIGRACIONES = [
  `CREATE TABLE contactos (
     id INTEGER PRIMARY KEY, telefono TEXT UNIQUE, email TEXT, nombre TEXT, empresa TEXT, cargo TEXT,
     hubspot_id TEXT, base_legal TEXT, base_legal_detalle TEXT, base_legal_fecha TEXT, origen TEXT,
     notas TEXT, creado TEXT DEFAULT (datetime('now')), actualizado TEXT DEFAULT (datetime('now')));
   CREATE TABLE conversaciones (
     id INTEGER PRIMARY KEY, canal TEXT NOT NULL, direccion TEXT NOT NULL, contacto_id INTEGER, externo_id TEXT,
     estado TEXT DEFAULT 'abierta', resumen TEXT, resultado TEXT, campana_id INTEGER,
     inicio TEXT DEFAULT (datetime('now')), fin TEXT, duracion_s INTEGER, coste_eur REAL);
   CREATE INDEX conv_contacto ON conversaciones(contacto_id);
   CREATE INDEX conv_externo ON conversaciones(externo_id);
   CREATE TABLE mensajes (
     id INTEGER PRIMARY KEY, conversacion_id INTEGER NOT NULL, rol TEXT NOT NULL, texto TEXT, datos TEXT,
     ts TEXT DEFAULT (datetime('now')));
   CREATE INDEX msg_conv ON mensajes(conversacion_id);
   CREATE TABLE bajas (telefono TEXT PRIMARY KEY, email TEXT, motivo TEXT, canal TEXT, ts TEXT DEFAULT (datetime('now')));
   CREATE TABLE robinson (telefono TEXT PRIMARY KEY, fecha_lista TEXT);
   CREATE TABLE campanas (
     id INTEGER PRIMARY KEY, nombre TEXT, dolor TEXT, guion TEXT, estado TEXT DEFAULT 'borrador',
     creada TEXT DEFAULT (datetime('now')), datos TEXT);
   CREATE TABLE campana_contactos (
     campana_id INTEGER, contacto_id INTEGER, estado TEXT DEFAULT 'pendiente', intentos INTEGER DEFAULT 0,
     proximo TEXT, resultado TEXT, PRIMARY KEY (campana_id, contacto_id));
   CREATE TABLE eventos (id INTEGER PRIMARY KEY, tipo TEXT, datos TEXT, ts TEXT DEFAULT (datetime('now')));`,
  // Prospección: tipo de línea y consentimiento de WhatsApp del contacto; seguimiento de cada intento de la campaña
  `ALTER TABLE contactos ADD COLUMN tipo_linea TEXT;
   ALTER TABLE contactos ADD COLUMN consentimiento_whatsapp TEXT;
   ALTER TABLE campana_contactos ADD COLUMN ultimo_intento TEXT;
   ALTER TABLE campana_contactos ADD COLUMN conversacion_id INTEGER;
   ALTER TABLE campana_contactos ADD COLUMN llamada_id TEXT;
   ALTER TABLE campana_contactos ADD COLUMN motivo TEXT;
   CREATE INDEX cc_estado ON campana_contactos(estado, proximo);`,
];

let db;
export function abrir(fichero = path.join(C.datos, 'asistente.db')) {
  if (db) return db;
  if (fichero !== ':memory:') fs.mkdirSync(path.dirname(fichero), { recursive: true, mode: 0o700 });
  db = new DatabaseSync(fichero);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
  const v = db.prepare('PRAGMA user_version').get().user_version;
  for (let i = v; i < MIGRACIONES.length; i++) {
    db.exec('BEGIN'); db.exec(MIGRACIONES[i]); db.exec(`PRAGMA user_version = ${i + 1}`); db.exec('COMMIT');
  }
  return db;
}
export function cerrar() { if (db) { db.close(); db = null; } }

export const normTel = (t) => {
  if (!t) return null;
  let s = String(t).replace(/^whatsapp:/, '').replace(/[^\d+]/g, '');
  if (/^[6789]\d{8}$/.test(s)) s = '+34' + s; // número español sin prefijo
  if (/^34[6789]\d{8}$/.test(s)) s = '+' + s;
  return s || null;
};

// ---------- Contactos ----------
export function contactoPorTelefono(tel) { return abrir().prepare('SELECT * FROM contactos WHERE telefono = ?').get(normTel(tel)) || null; }
export function contactoPorId(id) { return abrir().prepare('SELECT * FROM contactos WHERE id = ?').get(id) || null; }
export function guardarContacto(c) {
  const d = abrir(), tel = normTel(c.telefono);
  const prev = tel ? contactoPorTelefono(tel) : (c.id ? contactoPorId(c.id) : null);
  const campos = ['email', 'nombre', 'empresa', 'cargo', 'hubspot_id', 'base_legal', 'base_legal_detalle', 'base_legal_fecha', 'origen', 'notas'];
  if (prev) {
    const set = campos.filter((k) => c[k] !== undefined && c[k] !== null);
    if (set.length) d.prepare(`UPDATE contactos SET ${set.map((k) => `${k} = ?`).join(', ')}, actualizado = datetime('now') WHERE id = ?`).run(...set.map((k) => c[k]), prev.id);
    return contactoPorId(prev.id);
  }
  const r = d.prepare(`INSERT INTO contactos (telefono, ${campos.join(', ')}) VALUES (?, ${campos.map(() => '?').join(', ')})`).run(tel, ...campos.map((k) => c[k] ?? null));
  return contactoPorId(Number(r.lastInsertRowid));
}

// ---------- Conversaciones y mensajes ----------
export function abrirConversacion({ canal, direccion, contactoId = null, externoId = null, campanaId = null }) {
  const r = abrir().prepare('INSERT INTO conversaciones (canal, direccion, contacto_id, externo_id, campana_id) VALUES (?, ?, ?, ?, ?)').run(canal, direccion, contactoId, externoId, campanaId);
  return Number(r.lastInsertRowid);
}
export function conversacionAbiertaWhatsApp(contactoId) {
  // Hilo de WhatsApp abierto en las últimas 24 h (ventana de servicio de Meta)
  return abrir().prepare(`SELECT * FROM conversaciones WHERE canal = 'whatsapp' AND contacto_id = ? AND estado = 'abierta' AND inicio > datetime('now', '-1 day') ORDER BY id DESC LIMIT 1`).get(contactoId) || null;
}
export function conversacionPorExterno(externoId) { return abrir().prepare('SELECT * FROM conversaciones WHERE externo_id = ? ORDER BY id DESC LIMIT 1').get(externoId) || null; }
export function cerrarConversacion(id, { resumen = null, resultado = null, duracion = null } = {}) {
  abrir().prepare(`UPDATE conversaciones SET estado = 'cerrada', fin = datetime('now'), resumen = COALESCE(?, resumen), resultado = COALESCE(?, resultado), duracion_s = COALESCE(?, duracion_s) WHERE id = ?`).run(resumen, resultado, duracion, id);
}
export function anotar(conversacionId, rol, texto, datos = null) {
  abrir().prepare('INSERT INTO mensajes (conversacion_id, rol, texto, datos) VALUES (?, ?, ?, ?)').run(conversacionId, rol, texto, datos ? JSON.stringify(datos) : null);
}
export function mensajes(conversacionId) { return abrir().prepare('SELECT * FROM mensajes WHERE conversacion_id = ? ORDER BY id').all(conversacionId); }
export function historialContacto(contactoId, limite = 5) {
  // Resúmenes de las últimas conversaciones, para que el asistente sepa de qué se habló antes
  return abrir().prepare(`SELECT canal, direccion, inicio, resumen, resultado FROM conversaciones WHERE contacto_id = ? AND resumen IS NOT NULL ORDER BY id DESC LIMIT ?`).all(contactoId, limite);
}

// ---------- Bajas y lista Robinson ----------
export function darDeBaja(telefono, { email = null, motivo = null, canal = null } = {}) {
  abrir().prepare('INSERT OR REPLACE INTO bajas (telefono, email, motivo, canal) VALUES (?, ?, ?, ?)').run(normTel(telefono), email, motivo, canal);
}
export function estaDeBaja(telefono) { return !!abrir().prepare('SELECT 1 FROM bajas WHERE telefono = ?').get(normTel(telefono)); }
export function enRobinson(telefono) { return !!abrir().prepare('SELECT 1 FROM robinson WHERE telefono = ?').get(normTel(telefono)); }
export function cargarRobinson(telefonos, fechaLista) {
  const d = abrir(), st = d.prepare('INSERT OR REPLACE INTO robinson (telefono, fecha_lista) VALUES (?, ?)');
  d.exec('BEGIN'); for (const t of telefonos) { const x = normTel(t); if (x) st.run(x, fechaLista); } d.exec('COMMIT');
}

export function evento(tipo, datos) { abrir().prepare('INSERT INTO eventos (tipo, datos) VALUES (?, ?)').run(tipo, JSON.stringify(datos ?? null)); }
