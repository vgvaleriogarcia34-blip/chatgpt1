// Campañas de prospección: alta, importación de contactos (CSV o lista de HubSpot), planificador de llamadas y reintentos.
// Todo queda en las tablas campanas y campana_contactos. Cada llamada pasa antes por puedeLlamar (cumplimiento.js).
import { C } from '../config.js';
import * as db from '../almacen/db.js';
import { leerCSVObjetos } from './csv.js';
import { puedeLlamar, normalizarBase, comprobarHorario, enRobinson, separacionHoras, BASES_POR_DEFECTO } from './cumplimiento.js';

const sql = (d) => d.toISOString().slice(0, 19).replace('T', ' '); // mismo formato que datetime('now') de SQLite (UTC)
const q = () => db.abrir();

// Estados de campana_contactos
//   pendiente · reintentar · llamando · completado · agotado · baja · excluido (motivo) · sin_base_legal (escribir por correo o LinkedIn) · error
const DEFINITIVOS = new Set(['sin_base_legal', 'consentimiento_sin_fecha', 'interes_legitimo_no_permitido', 'base_no_admitida', 'movil_personal', 'baja', 'robinson', 'max_intentos', 'sin_telefono']);
const REINTENTABLES = new Set(['no-answer', 'busy', 'buzon', 'volver_a_llamar', 'machine']);
const FINALES = new Set(['completed', 'no-answer', 'busy', 'failed', 'canceled']);
const ATASCADA_MIN = 30; // una llamada «llamando» sin noticias en media hora se da por perdida

// ---------- Campañas ----------
/** Campaña con sus datos de cumplimiento desplegados (basesPermitidas, permiteInteresLegitimo, evaluacionInteresLegitimo). */
export function obtenerCampana(id) {
  const c = q().prepare('SELECT * FROM campanas WHERE id = ?').get(id);
  if (!c) return null;
  let datos = {}; try { datos = JSON.parse(c.datos || '{}'); } catch {}
  return { ...c, ...datos, datos };
}

export function crearCampana({ nombre, dolor = '', guion = '', basesPermitidas = BASES_POR_DEFECTO, permiteInteresLegitimo = false, evaluacionInteresLegitimo = '' }) {
  if (!nombre || !String(nombre).trim()) throw Object.assign(new Error('La campaña necesita un nombre'), { codigo: 400 });
  const bases = [...new Set((basesPermitidas || []).map(normalizarBase).filter(Boolean))];
  if (!bases.length) throw Object.assign(new Error('Indique al menos una base legal admitida'), { codigo: 400 });
  const il = !!permiteInteresLegitimo || bases.includes('interes_legitimo_b2b');
  if (il && String(evaluacionInteresLegitimo || '').trim().length < 20)
    throw Object.assign(new Error('Para admitir interés legítimo B2B hace falta la evaluación de interés legítimo (revisada con su abogado)'), { codigo: 400 });
  const datos = { basesPermitidas: bases.filter((b) => b !== 'interes_legitimo_b2b'), permiteInteresLegitimo: il, evaluacionInteresLegitimo: il ? String(evaluacionInteresLegitimo).trim() : '' };
  const r = q().prepare('INSERT INTO campanas (nombre, dolor, guion, datos) VALUES (?, ?, ?, ?)').run(String(nombre).trim(), String(dolor || '').trim(), String(guion || '').trim(), JSON.stringify(datos));
  return obtenerCampana(Number(r.lastInsertRowid));
}

export function listarCampanas() {
  const cuentas = q().prepare('SELECT campana_id, estado, COUNT(*) n FROM campana_contactos GROUP BY campana_id, estado').all();
  return q().prepare('SELECT id FROM campanas ORDER BY id DESC').all().map(({ id }) => {
    const c = obtenerCampana(id);
    c.contactos = Object.fromEntries(cuentas.filter((x) => x.campana_id === id).map((x) => [x.estado, x.n]));
    return c;
  });
}

function cambiarEstado(id, estado) {
  if (!obtenerCampana(id)) throw Object.assign(new Error('Campaña no encontrada'), { codigo: 404 });
  q().prepare('UPDATE campanas SET estado = ? WHERE id = ?').run(estado, id);
  return obtenerCampana(id);
}
export const pausarCampana = (id) => cambiarEstado(id, 'pausada');
export const reanudarCampana = (id) => cambiarEstado(id, 'activa'); // también la activa la primera vez

/** Resultados de una campaña: totales por estado y por resultado, y la lista de contactos. */
export function resultadosCampana(id, { estado = null, limite = 500 } = {}) {
  const d = q();
  return {
    campana: obtenerCampana(id),
    porEstado: d.prepare('SELECT estado, COUNT(*) n FROM campana_contactos WHERE campana_id = ? GROUP BY estado').all(id),
    porResultado: d.prepare('SELECT resultado, COUNT(*) n FROM campana_contactos WHERE campana_id = ? AND resultado IS NOT NULL GROUP BY resultado').all(id),
    contactos: d.prepare(`SELECT cc.*, c.nombre, c.empresa, c.cargo, c.telefono, c.email, c.base_legal, c.origen FROM campana_contactos cc JOIN contactos c ON c.id = cc.contacto_id
      WHERE cc.campana_id = ? ${estado ? 'AND cc.estado = ?' : ''} ORDER BY cc.contacto_id LIMIT ?`).all(...[id, estado, limite].filter((x) => x !== null)),
  };
}

// ---------- Importación ----------
const vacio = (v) => (v === undefined || v === null || String(v).trim() === '' ? undefined : String(v).trim());

/**
 * Da de alta (o actualiza) contactos y los añade a la campaña.
 * Columnas: telefono, nombre, empresa, cargo, email, base_legal, base_legal_detalle, base_legal_fecha, origen
 * y, opcionales, tipo_linea (fijo | movil_corporativo | movil_personal) y consentimiento_whatsapp (fecha).
 */
export function importarFilas(campanaId, filas, { origen = 'importacion' } = {}) {
  if (!obtenerCampana(campanaId)) throw Object.assign(new Error('Campaña no encontrada'), { codigo: 404 });
  const d = q();
  const r = { importados: 0, yaEstaban: 0, sinBaseLegal: 0, excluidos: 0, rechazados: [] };
  const insertar = d.prepare('INSERT OR IGNORE INTO campana_contactos (campana_id, contacto_id, estado, motivo) VALUES (?, ?, ?, ?)');
  const extra = d.prepare('UPDATE contactos SET tipo_linea = COALESCE(?, tipo_linea), consentimiento_whatsapp = COALESCE(?, consentimiento_whatsapp) WHERE id = ?');
  d.exec('BEGIN');
  try {
    for (const [i, f] of filas.entries()) {
      const fila = f._fila ?? i + 1;
      const tel = db.normTel(f.telefono);
      if (!tel || !/^\+\d{9,15}$/.test(tel)) { r.rechazados.push({ fila, motivo: 'teléfono no válido' }); continue; }
      const baseTxt = vacio(f.base_legal);
      const base = normalizarBase(baseTxt);
      if (baseTxt && !base) { r.rechazados.push({ fila, motivo: `base legal desconocida: «${baseTxt}»` }); continue; }
      const linea = vacio(f.tipo_linea);
      if (linea && !['fijo', 'movil_corporativo', 'movil_personal'].includes(linea)) { r.rechazados.push({ fila, motivo: `tipo de línea desconocido: «${linea}»` }); continue; }
      const c = db.guardarContacto({
        telefono: tel, nombre: vacio(f.nombre), empresa: vacio(f.empresa), cargo: vacio(f.cargo), email: vacio(f.email),
        base_legal: base || undefined, base_legal_detalle: vacio(f.base_legal_detalle), base_legal_fecha: vacio(f.base_legal_fecha),
        origen: vacio(f.origen) ?? (db.contactoPorTelefono(tel) ? undefined : origen), // el origen de un contacto ya conocido no se pisa
      });
      extra.run(linea ?? null, vacio(f.consentimiento_whatsapp) ?? null, c.id);
      let estado = 'pendiente', motivo = null;
      if (!c.base_legal) { estado = 'sin_base_legal'; motivo = 'Sin base legal: primer contacto por correo o LinkedIn.'; r.sinBaseLegal++; }
      else if (db.estaDeBaja(tel)) { estado = 'excluido'; motivo = 'baja'; r.excluidos++; }
      else if (enRobinson(tel)) { estado = 'excluido'; motivo = 'robinson'; r.excluidos++; }
      const ins = insertar.run(campanaId, c.id, estado, motivo);
      if (ins.changes) r.importados++; else r.yaEstaban++;
    }
    d.exec('COMMIT');
  } catch (err) { d.exec('ROLLBACK'); throw err; }
  return r;
}

export function importarCSV(campanaId, texto, opciones) {
  const filas = leerCSVObjetos(texto);
  if (!filas.length) throw Object.assign(new Error('El CSV está vacío o no tiene cabecera'), { codigo: 400 });
  if (!('telefono' in filas[0])) throw Object.assign(new Error('Falta la columna «telefono» en la cabecera'), { codigo: 400 });
  return importarFilas(campanaId, filas, opciones);
}

// Base legal nativa de HubSpot (hs_legal_basis) → la nuestra; ante la duda, la más restrictiva
function baseDeHubSpot(p) {
  if (p.base_legal) return p.base_legal;
  // fe_base_legal (la crea src/crm/preparar-hubspot.js) es texto libre: «relacion_previa (ponencia FREMM 2026)»
  if (p.fe_base_legal) {
    const t = String(p.fe_base_legal).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[\s-]+/g, '_');
    const k = ['interes_legitimo_b2b', 'interes_legitimo', 'consentimiento', 'relacion_previa', 'cliente'].find((x) => t.includes(x));
    if (k) return k;
  }
  const v = String(p.hs_legal_basis || '').toLowerCase();
  if (!v) return undefined;
  if (v.includes('contract') || v.includes('existing customer')) return 'cliente';
  if (v.includes('consent')) return 'consentimiento';
  if (v.includes('legitimate')) return 'interes_legitimo_b2b';
  return undefined;
}

/** Importa los miembros de una lista de HubSpot (GET /crm/v3/lists/{id}/memberships y lectura por lotes de los contactos). */
export async function importarDesdeHubSpot(campanaId, listaId, { token = C.hubspot.token, fetchFn = fetch, base = 'https://api.hubapi.com' } = {}) {
  if (!token) throw Object.assign(new Error('HubSpot no está configurado (falta HUBSPOT_TOKEN)'), { codigo: 400 });
  if (!/^\d+$/.test(String(listaId))) throw Object.assign(new Error('Identificador de lista no válido'), { codigo: 400 });
  const pedir = async (ruta, opciones = {}) => {
    const r = await fetchFn(base + ruta, { ...opciones, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } });
    if (!r.ok) throw Object.assign(new Error(`HubSpot respondió ${r.status}`), { codigo: 502 });
    return r.json();
  };
  const ids = [];
  let after = '';
  do {
    const p = await pedir(`/crm/v3/lists/${listaId}/memberships?limit=250${after ? '&after=' + encodeURIComponent(after) : ''}`);
    for (const m of p.results || []) ids.push(String(m.recordId ?? m.id));
    after = p.paging?.next?.after || '';
  } while (after && ids.length < 20000);
  const props = ['firstname', 'lastname', 'phone', 'mobilephone', 'company', 'jobtitle', 'email', 'hs_legal_basis', 'fe_base_legal', 'fe_origen', 'fe_baja', 'base_legal', 'base_legal_detalle', 'base_legal_fecha', 'origen', 'tipo_linea', 'consentimiento_whatsapp'];
  const filas = [];
  for (let i = 0; i < ids.length; i += 100) {
    const lote = await pedir('/crm/v3/objects/contacts/batch/read', { method: 'POST', body: JSON.stringify({ properties: props, inputs: ids.slice(i, i + 100).map((id) => ({ id })) }) });
    for (const x of lote.results || []) {
      const p = x.properties || {};
      if (p.fe_baja === 'true' && (p.phone || p.mobilephone)) db.darDeBaja(p.phone || p.mobilephone, { email: p.email || null, motivo: 'baja registrada en HubSpot', canal: 'hubspot' });
      filas.push({
        _fila: `HubSpot ${x.id}`, telefono: p.phone || p.mobilephone, nombre: [p.firstname, p.lastname].filter(Boolean).join(' '),
        empresa: p.company, cargo: p.jobtitle, email: p.email, base_legal: baseDeHubSpot(p), base_legal_detalle: p.base_legal_detalle || p.fe_base_legal || p.hs_legal_basis,
        base_legal_fecha: p.base_legal_fecha, origen: p.origen || p.fe_origen || `HubSpot lista ${listaId}`, tipo_linea: p.tipo_linea, consentimiento_whatsapp: p.consentimiento_whatsapp,
      });
    }
  }
  const r = importarFilas(campanaId, filas, { origen: `HubSpot lista ${listaId}` });
  // Guardar el id de HubSpot en el contacto
  for (const x of filas) { const c = db.contactoPorTelefono(x.telefono); if (c && !c.hubspot_id) db.guardarContacto({ telefono: c.telefono, hubspot_id: x._fila.slice(8) }); }
  return { ...r, enLista: ids.length };
}

// ---------- Planificador ----------
let llamarCache;
async function cargarLlamar() {
  if (llamarCache !== undefined) return llamarCache;
  try { const m = await import('../voz/rutas.js'); llamarCache = typeof m.llamar === 'function' ? m.llamar : null; }
  catch { llamarCache = null; }
  return llamarCache;
}

function liberarAtascadas(ahora) {
  q().prepare(`UPDATE campana_contactos SET estado = 'reintentar', motivo = 'sin noticias de la llamada', proximo = ? WHERE estado = 'llamando' AND ultimo_intento < ?`)
    .run(sql(new Date(+ahora + separacionHoras() * 3600e3)), sql(new Date(ahora - ATASCADA_MIN * 60e3)));
}

/**
 * Una vuelta del planificador: lanza las siguientes llamadas elegibles sin pasar de C.prospeccion.llamadasSimultaneas.
 * @returns {Promise<{lanzadas:number, motivo?:string}>}
 */
export async function vuelta(ahora = new Date(), { llamar } = {}) {
  if (!C.prospeccion.activa) return { lanzadas: 0, motivo: 'prospección desactivada' };
  const d = q();
  liberarAtascadas(ahora);
  let hueco = C.prospeccion.llamadasSimultaneas - d.prepare(`SELECT COUNT(*) n FROM campana_contactos WHERE estado = 'llamando'`).get().n;
  if (hueco <= 0) return { lanzadas: 0, motivo: 'llamadas simultáneas al máximo' };
  const h = comprobarHorario(ahora);
  if (!h.ok) return { lanzadas: 0, motivo: h.motivo };
  llamar ??= await cargarLlamar();
  if (!llamar) return { lanzadas: 0, motivo: 'módulo de voz no disponible' };

  const ahoraSql = sql(ahora);
  const candidatos = d.prepare(`SELECT c.*, cc.campana_id, cc.estado AS cc_estado, cc.intentos, cc.ultimo_intento FROM campana_contactos cc JOIN contactos c ON c.id = cc.contacto_id
    WHERE cc.campana_id = ? AND cc.estado IN ('pendiente', 'reintentar') AND (cc.proximo IS NULL OR cc.proximo <= ?) ORDER BY cc.intentos, cc.proximo, cc.contacto_id LIMIT 100`);
  const excluir = d.prepare('UPDATE campana_contactos SET estado = ?, motivo = ? WHERE campana_id = ? AND contacto_id = ?');
  const aplazar = d.prepare('UPDATE campana_contactos SET proximo = ? WHERE campana_id = ? AND contacto_id = ?');
  const marcar = d.prepare(`UPDATE campana_contactos SET estado = 'llamando', intentos = intentos + 1, ultimo_intento = ?, proximo = NULL, motivo = NULL WHERE campana_id = ? AND contacto_id = ? AND estado IN ('pendiente', 'reintentar')`);
  const anotarLlamada = d.prepare('UPDATE campana_contactos SET llamada_id = ?, conversacion_id = ? WHERE campana_id = ? AND contacto_id = ?');
  const fallo = d.prepare(`UPDATE campana_contactos SET estado = 'reintentar', intentos = intentos - 1, proximo = ?, motivo = ? WHERE campana_id = ? AND contacto_id = ?`);

  let lanzadas = 0;
  const campanas = d.prepare(`SELECT id FROM campanas WHERE estado = 'activa' ORDER BY id`).all().map((x) => obtenerCampana(x.id));
  for (const campana of campanas) {
    if (hueco <= 0) break;
    for (const ct of candidatos.all(campana.id, ahoraSql)) {
      if (hueco <= 0) break;
      const r = puedeLlamar(ct, campana, ahora);
      if (!r.ok) {
        if (DEFINITIVOS.has(r.codigo)) excluir.run(r.codigo === 'max_intentos' ? 'agotado' : r.codigo === 'baja' ? 'baja' : 'excluido', r.motivo, campana.id, ct.id);
        else if (r.codigo === 'demasiado_pronto') aplazar.run(sql(new Date(new Date(ct.ultimo_intento.replace(' ', 'T') + 'Z').getTime() + separacionHoras() * 3600e3)), campana.id, ct.id);
        continue; // horario: se queda como está
      }
      if (!marcar.run(ahoraSql, campana.id, ct.id).changes) continue;
      hueco--; lanzadas++;
      const contacto = db.contactoPorId(ct.id);
      try {
        const x = await llamar({ telefono: contacto.telefono, contacto, campana, campanaId: campana.id, contactoId: contacto.id });
        if (x?.ok === false) {
          // voz/rutas.js no lanza excepciones: devuelve { ok:false, motivo }
          if (x.motivo === 'baja') { excluir.run('baja', 'Pidió no recibir más comunicaciones comerciales (baja propia).', campana.id, ct.id); continue; }
          if (x.motivo === 'telefono_no_valido') { excluir.run('excluido', 'Teléfono no válido.', campana.id, ct.id); continue; }
          throw new Error(x.error || x.motivo || 'no se pudo llamar');
        }
        anotarLlamada.run(x?.callSid ?? x?.llamadaId ?? x?.sid ?? null, x?.conversacionId ?? null, campana.id, ct.id);
        db.evento('prospeccion_llamada', { campanaId: campana.id, contactoId: ct.id, aviso: r.aviso || null });
      } catch (err) {
        // Error técnico al lanzarla: no cuenta como intento; se vuelve a probar en 15 minutos
        console.error('[prospección] no se pudo lanzar la llamada:', err.message);
        fallo.run(sql(new Date(+ahora + 15 * 60e3)), `error al llamar: ${String(err.message).slice(0, 200)}`, campana.id, ct.id);
      }
    }
  }
  return { lanzadas };
}

/**
 * Estado de una llamada (lo emite voz/rutas.js con alEstadoLlamada). Admite { estado | status, callSid, conversacionId,
 * campanaId, contactoId, resultado, answeredBy }. Al terminar decide: reintentar, agotado, baja o completado.
 */
export function alEstado(ev = {}, ahora = new Date()) {
  const d = q();
  const estado = String(ev.estado ?? ev.status ?? ev.CallStatus ?? '').toLowerCase();
  const sid = ev.callSid ?? ev.llamadaId ?? ev.CallSid ?? null;
  let cc = null;
  if (ev.campanaId && ev.contactoId) cc = d.prepare('SELECT * FROM campana_contactos WHERE campana_id = ? AND contacto_id = ?').get(ev.campanaId, ev.contactoId);
  if (!cc && sid) cc = d.prepare('SELECT * FROM campana_contactos WHERE llamada_id = ?').get(sid);
  if (!cc && ev.conversacionId) cc = d.prepare('SELECT * FROM campana_contactos WHERE conversacion_id = ?').get(ev.conversacionId);
  if (!cc) return null;
  const convId = ev.conversacionId ?? cc.conversacion_id ?? (sid ? db.conversacionPorExterno(sid)?.id : null) ?? null;
  if (convId || sid) d.prepare('UPDATE campana_contactos SET conversacion_id = COALESCE(?, conversacion_id), llamada_id = COALESCE(?, llamada_id) WHERE campana_id = ? AND contacto_id = ?').run(convId ?? null, sid, cc.campana_id, cc.contacto_id);
  // Solo se decide una vez por intento, salvo que llegue el resultado de la conversación después del estado de Twilio
  const tardio = ev.resultado && cc.resultado === 'sin_resultado' && ['reintentar', 'completado', 'agotado'].includes(cc.estado);
  if (!FINALES.has(estado) || (cc.estado !== 'llamando' && !tardio)) return cc;

  let resultado = ev.resultado ?? (convId ? d.prepare('SELECT resultado FROM conversaciones WHERE id = ?').get(convId)?.resultado : null) ?? null;
  if (!resultado && /machine|fax/.test(String(ev.answeredBy ?? ev.AnsweredBy ?? ''))) resultado = 'buzon';
  const clave = estado === 'completed' ? resultado : estado;
  let nuevo;
  if (estado === 'failed') nuevo = 'error';
  else if (resultado === 'baja') nuevo = 'baja';
  else if (estado === 'completed' && !resultado && Number(ev.duracion) >= 20) nuevo = 'completado'; // hablaron, aunque no conste el resultado
  else if (estado === 'canceled' || REINTENTABLES.has(clave) || (estado === 'completed' && !resultado)) nuevo = cc.intentos >= C.prospeccion.maxIntentos ? 'agotado' : 'reintentar';
  else nuevo = 'completado';
  const proximo = nuevo === 'reintentar' ? sql(new Date(+ahora + separacionHoras() * 3600e3)) : null;
  d.prepare('UPDATE campana_contactos SET estado = ?, resultado = ?, motivo = ?, proximo = ? WHERE campana_id = ? AND contacto_id = ?')
    .run(nuevo, resultado || (estado === 'completed' ? 'sin_resultado' : estado), estado, proximo, cc.campana_id, cc.contacto_id);
  return d.prepare('SELECT * FROM campana_contactos WHERE campana_id = ? AND contacto_id = ?').get(cc.campana_id, cc.contacto_id);
}

let temporizador = null;
/**
 * Arranca el planificador (cada minuto) si C.prospeccion.activa. Se suscribe a los estados de llamada de voz/rutas.js.
 * Devuelve una función para pararlo.
 */
export async function iniciarPlanificador({ intervaloMs = 60_000, llamar, suscribir } = {}) {
  if (!C.prospeccion.activa || temporizador) return () => {};
  const manejar = (ev) => { try { alEstado(ev); } catch (err) { console.error('[prospección] estado de llamada:', err.message); } };
  if (suscribir) suscribir(manejar);
  else {
    try {
      const m = await import('../voz/rutas.js');
      // Estado de Twilio al acabar la llamada (no contesta, comunica, completada…)
      if (Array.isArray(m.alEstadoLlamada)) m.alEstadoLlamada.push(manejar);
      else if (typeof m.alEstadoLlamada === 'function') m.alEstadoLlamada(manejar);
      // Resultado de la conversación (finalizar), en cuanto la sesión de voz la cierra
      m.ganchos?.alTerminar?.push((conversacionId, x) => manejar({ estado: 'completed', conversacionId, callSid: x.callSid, campanaId: x.campana?.id, contactoId: x.contacto?.id, resultado: x.resultado, duracion: x.duracion }));
    } catch {}
  }
  let ocupado = false;
  const paso = async () => {
    if (ocupado) return; ocupado = true;
    try { await vuelta(new Date(), { llamar }); } catch (err) { console.error('[prospección]', err.message); } finally { ocupado = false; }
  };
  temporizador = setInterval(paso, intervaloMs);
  temporizador.unref?.();
  paso();
  return () => { clearInterval(temporizador); temporizador = null; };
}
