// Purga de conservación (CUMPLIMIENTO.md §6.3): una vez al día borra o anonimiza lo que ha superado su plazo.
//   · Mensajes y transcripciones: 12 meses desde la última interacción del contacto (clientes: 72 meses). Se borran los
//     mensajes y el resumen; la conversación queda anónima (sin contacto ni número) solo para las cifras.
//   · Grabaciones: 3 meses. Se borran en Twilio y se quita la dirección.
//   · Eventos y métricas técnicas: 12 meses.
//   · Contactos sin actividad: al vencer el plazo de los mensajes más el de la prueba de la base legal (36 meses), se
//     borra la ficha y su paso por las campañas. Las bajas no caducan (solo teléfono, correo y fecha).
// Los plazos se cambian con las variables CONSERVAR_* (ver PUESTA-EN-MARCHA.md). Con PURGA_ACTIVA=no no se ejecuta.
import { C } from './config.js';
import * as db from './almacen/db.js';

const sql = (d) => d.toISOString().slice(0, 19).replace('T', ' ');
const meses = (ahora, n) => { const d = new Date(ahora); d.setUTCMonth(d.getUTCMonth() - n); return sql(d); };

/**
 * Ejecuta la purga. borrarGrabacion(sid) borra el audio en el proveedor (por defecto, Twilio).
 * @returns {Promise<{ mensajes:number, conversaciones:number, grabaciones:number, eventos:number, contactos:number }>}
 */
export async function purgar(ahora = new Date(), { plazos = C.conservacion, borrarGrabacion } = {}) {
  const d = db.abrir();
  const r = { mensajes: 0, conversaciones: 0, grabaciones: 0, eventos: 0, contactos: 0, erroresGrabacion: 0 };

  // Grabaciones
  if (!borrarGrabacion) { try { borrarGrabacion = (await import('./voz/twilio.js')).borrarGrabacion; } catch { borrarGrabacion = async () => {}; } }
  for (const g of d.prepare('SELECT id, grabacion_sid FROM conversaciones WHERE grabacion_url IS NOT NULL AND inicio < ?').all(meses(ahora, plazos.grabacionesMeses))) {
    try { if (g.grabacion_sid) await borrarGrabacion(g.grabacion_sid); }
    catch (err) { if (err.status !== 404) { r.erroresGrabacion++; console.warn('[conservación] grabación', g.grabacion_sid, err.message); continue; } }
    d.prepare('UPDATE conversaciones SET grabacion_url = NULL, grabacion_sid = NULL WHERE id = ?').run(g.id);
    r.grabaciones++;
  }

  // Mensajes: por contacto, según su última interacción y si es cliente
  const ultima = `SELECT contacto_id, MAX(COALESCE(fin, inicio)) ult FROM conversaciones WHERE contacto_id IS NOT NULL GROUP BY contacto_id`;
  const vencidos = d.prepare(`SELECT u.contacto_id id FROM (${ultima}) u JOIN contactos c ON c.id = u.contacto_id
    WHERE u.ult < CASE WHEN c.base_legal = 'cliente' THEN ? ELSE ? END`).all(meses(ahora, plazos.mensajesClientesMeses), meses(ahora, plazos.mensajesMeses));
  d.exec('BEGIN');
  try {
    for (const { id } of vencidos) {
      r.mensajes += Number(d.prepare('DELETE FROM mensajes WHERE conversacion_id IN (SELECT id FROM conversaciones WHERE contacto_id = ?)').run(id).changes);
      r.conversaciones += Number(d.prepare(`UPDATE conversaciones SET resumen = NULL, contacto_id = NULL, externo_id = NULL, volver_llamar = NULL WHERE contacto_id = ?`).run(id).changes);
    }
    // Conversaciones sin contacto (número oculto, pruebas del panel) con el mismo plazo
    const viejas = d.prepare('SELECT id FROM conversaciones WHERE contacto_id IS NULL AND inicio < ? AND (resumen IS NOT NULL OR externo_id IS NOT NULL OR id IN (SELECT conversacion_id FROM mensajes))').all(meses(ahora, plazos.mensajesMeses));
    for (const { id } of viejas) {
      r.mensajes += Number(d.prepare('DELETE FROM mensajes WHERE conversacion_id = ?').run(id).changes);
      d.prepare('UPDATE conversaciones SET resumen = NULL, externo_id = NULL WHERE id = ?').run(id);
      r.conversaciones++;
    }
    // Contactos sin actividad ni campaña en curso: al vencer mensajes + prueba de la base legal
    const limite = meses(ahora, plazos.mensajesMeses + plazos.pruebaBaseLegalMeses);
    const contactos = d.prepare(`SELECT c.id FROM contactos c WHERE COALESCE(c.actualizado, c.creado) < ?
      AND NOT EXISTS (SELECT 1 FROM conversaciones v WHERE v.contacto_id = c.id)
      AND NOT EXISTS (SELECT 1 FROM campana_contactos cc WHERE cc.contacto_id = c.id AND cc.estado IN ('pendiente', 'reintentar', 'llamando') )`).all(limite);
    for (const { id } of contactos) {
      d.prepare('DELETE FROM campana_contactos WHERE contacto_id = ?').run(id);
      d.prepare('DELETE FROM contactos WHERE id = ?').run(id);
      r.contactos++;
    }
    // Eventos técnicos (salvo los avisos sin resolver de la bandeja)
    r.eventos = Number(d.prepare(`DELETE FROM eventos WHERE ts < ? AND (resuelto IS NOT NULL OR tipo NOT IN ('reunion_pendiente', 'transferencia_sin_respuesta', 'voz_error', 'whatsapp_error', 'whatsapp_fallo', 'urgencia'))`).run(meses(ahora, plazos.eventosMeses)).changes);
    d.exec('COMMIT');
  } catch (err) { d.exec('ROLLBACK'); throw err; }
  db.evento('purga', r);
  return r;
}

let temporizador = null;
/** Purga diaria (la primera, un minuto después de arrancar). Devuelve una función para pararla. */
export function iniciarPurga({ intervaloMs = 24 * 3600e3, primeraMs = 60e3 } = {}) {
  if (!C.conservacion.activa || temporizador) return () => {};
  const paso = () => purgar().then((r) => console.log('[conservación] purga:', JSON.stringify(r))).catch((err) => console.error('[conservación]', err.message));
  const t0 = setTimeout(paso, primeraMs); t0.unref?.();
  temporizador = setInterval(paso, intervaloMs); temporizador.unref?.();
  return () => { clearTimeout(t0); clearInterval(temporizador); temporizador = null; };
}

if (!process.env.NODE_TEST_CONTEXT && process.env.NODE_ENV !== 'test') iniciarPurga();
