// Reglas de cumplimiento de la prospección: quién puede recibir una llamada o un WhatsApp comercial, y cuándo.
// Decisión de la empresa: solo con base legal (consentimiento o relación previa), sin bajas ni lista Robinson,
// en horario legal y con un número limitado de intentos. A quien no tenga base legal se le escribe (correo o LinkedIn), no se le llama.
import crypto from 'node:crypto';
import { C } from '../config.js';
import * as db from '../almacen/db.js';
import { leerCSV } from './csv.js';

// Bases legales admitidas en contactos y campañas
export const BASES = {
  consentimiento: 'Consentimiento expreso para recibir llamadas comerciales',
  cliente: 'Cliente o excliente (relación contractual)',
  relacion_previa: 'Relación previa: asistente a una ponencia, formulario, asociación, contacto directo',
  interes_legitimo_b2b: 'Interés legítimo B2B (revisar con abogado)',
};
// Las que vale una campaña si no dice otra cosa (el interés legítimo nunca va por defecto)
export const BASES_POR_DEFECTO = ['consentimiento', 'cliente', 'relacion_previa'];

const SINONIMOS = {
  consentimiento: 'consentimiento', consentimiento_expreso: 'consentimiento', opt_in: 'consentimiento',
  cliente: 'cliente', excliente: 'cliente', contrato: 'cliente',
  relacion_previa: 'relacion_previa', relacion: 'relacion_previa', ponencia: 'relacion_previa', formulario: 'relacion_previa', asociacion: 'relacion_previa',
  interes_legitimo_b2b: 'interes_legitimo_b2b', interes_legitimo: 'interes_legitimo_b2b',
};
/** Normaliza lo que venga en un CSV o en HubSpot («Relación previa», «relacion-previa»…) a una clave de BASES, o null. */
export function normalizarBase(v) {
  if (!v) return null;
  const k = String(v).trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[\s-]+/g, '_');
  return SINONIMOS[k] || null;
}

export const separacionHoras = () => Number(C.prospeccion.separacionHoras ?? process.env.PROSPECCION_SEPARACION_H ?? 48);
const MARGEN_FIN_MIN = 10; // no se empieza una llamada en los últimos 10 minutos de un tramo

// ---------- Horario ----------
const DIAS = { L: 1, M: 2, X: 3, J: 4, V: 5, S: 6, D: 7 };

/** Fecha, día de la semana (L=1 … D=7) y minuto del día en la zona horaria indicada. */
export function horaLocal(ahora = new Date(), zona = C.empresa.zonaHoraria) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: zona, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'short', hourCycle: 'h23' })
    .formatToParts(ahora).map((x) => [x.type, x.value]));
  const dia = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 }[p.weekday];
  return { fecha: `${p.year}-${p.month}-${p.day}`, dia, minutos: Number(p.hour) * 60 + Number(p.minute) };
}

/** «L-V 10:00-14:00,16:30-20:00; S 10:00-13:00» → [{ dias:Set, tramos:[[600,840],[990,1200]] }] */
export function parsearHorario(spec) {
  const min = (h) => { const [a, b = '0'] = h.split(':'); return Number(a) * 60 + Number(b); };
  return String(spec || '').split(';').map((g) => g.trim()).filter(Boolean).map((g) => {
    const [diasTxt, tramosTxt = ''] = g.split(/\s+/, 2);
    const dias = new Set();
    for (const parte of diasTxt.toUpperCase().split(/[,/]/)) {
      const [a, b] = parte.split('-');
      if (!DIAS[a] || (b && !DIAS[b])) throw new Error(`Horario no válido: «${g}»`);
      for (let d = DIAS[a]; d <= DIAS[b || a]; d++) dias.add(d);
    }
    const tramos = tramosTxt.split(',').filter(Boolean).map((t) => {
      const [i, f] = t.split('-').map(min);
      if (!(f > i)) throw new Error(`Tramo no válido: «${t}»`);
      return [i, f];
    });
    return { dias, tramos };
  });
}

const esFestivo = (fecha, festivos) => festivos.some((f) => f === fecha || f === fecha.slice(5)); // AAAA-MM-DD o MM-DD (todos los años)

/** ¿Se puede empezar una llamada comercial ahora? Horario configurado y, en todo caso, días laborables de 9:00 a 21:00. */
export function comprobarHorario(ahora = new Date(), { horario = C.prospeccion.horario, festivos = C.prospeccion.festivos, zona = C.empresa.zonaHoraria } = {}) {
  const h = horaLocal(ahora, zona);
  if (h.dia >= 6) return { ok: false, codigo: 'fin_de_semana', motivo: 'Sábados y domingos no se hacen llamadas comerciales.' };
  if (esFestivo(h.fecha, festivos || [])) return { ok: false, codigo: 'festivo', motivo: `El ${h.fecha} es festivo: no se hacen llamadas comerciales.` };
  if (h.minutos < 9 * 60 || h.minutos >= 21 * 60 - MARGEN_FIN_MIN) return { ok: false, codigo: 'fuera_de_horario', motivo: 'Fuera del margen legal (días laborables de 9:00 a 21:00).' };
  const dentro = parsearHorario(horario).some((g) => g.dias.has(h.dia) && g.tramos.some(([i, f]) => h.minutos >= i && h.minutos < f - MARGEN_FIN_MIN));
  if (!dentro) return { ok: false, codigo: 'fuera_de_horario', motivo: `Fuera del horario de llamadas configurado (${horario}).` };
  return { ok: true };
}

// ---------- Lista Robinson ----------
const hash = (alg, s) => crypto.createHash(alg).update(s).digest('hex');
const variantes = (tel) => { const t = db.normTel(tel) || ''; const sin = t.replace(/^\+/, ''); return [t, sin, sin.replace(/^34/, '')]; };

/** ¿Está en la lista Robinson? Admite la lista en claro o con los teléfonos resumidos en SHA-256 o MD5 (formato a confirmar con el fichero real). */
export function enRobinson(tel) {
  if (db.enRobinson(tel)) return true;
  const st = db.abrir().prepare('SELECT 1 FROM robinson WHERE telefono = ?');
  return variantes(tel).some((v) => v && (st.get('sha256:' + hash('sha256', v)) || st.get('md5:' + hash('md5', v))));
}

/**
 * Importa el fichero de la lista Robinson que la empresa descarga del servicio de Adigital.
 * Toma de cada fila la primera celda que parezca un teléfono o un resumen SHA-256/MD5. Devuelve { cargados, descartados }.
 */
export function importarRobinsonCSV(texto, fechaLista = new Date().toISOString().slice(0, 10)) {
  const d = db.abrir(), st = d.prepare('INSERT OR REPLACE INTO robinson (telefono, fecha_lista) VALUES (?, ?)');
  let cargados = 0, descartados = 0;
  d.exec('BEGIN');
  try {
    for (const fila of leerCSV(texto)) {
      let clave = null;
      for (const celda of fila.map((x) => x.trim())) {
        if (/^[a-f0-9]{64}$/i.test(celda)) { clave = 'sha256:' + celda.toLowerCase(); break; }
        if (/^[a-f0-9]{32}$/i.test(celda)) { clave = 'md5:' + celda.toLowerCase(); break; }
        const t = db.normTel(celda);
        if (t && /^\+?\d{9,15}$/.test(t)) { clave = t; break; }
      }
      if (clave) { st.run(clave, fechaLista); cargados++; } else descartados++;
    }
    d.exec('COMMIT');
  } catch (err) { d.exec('ROLLBACK'); throw err; }
  return { cargados, descartados };
}

// ---------- Reglas ----------
const esMovil = (tel) => /^\+34[67]\d{8}$/.test(db.normTel(tel) || '');

/** Lo que la campaña admite: bases permitidas e interés legítimo (solo si está permitido y con la evaluación hecha). */
export function reglasCampana(campana) {
  let datos = campana?.datos ?? {};
  if (typeof datos === 'string') { try { datos = JSON.parse(datos); } catch { datos = {}; } }
  const r = { ...datos, ...campana };
  const bases = (r.basesPermitidas || r.bases_permitidas || BASES_POR_DEFECTO).map(normalizarBase).filter(Boolean);
  return {
    bases: new Set(bases.filter((b) => b !== 'interes_legitimo_b2b')),
    interesLegitimo: !!(r.permiteInteresLegitimo && String(r.evaluacionInteresLegitimo || '').trim().length >= 20),
  };
}

const no = (codigo, motivo) => ({ ok: false, codigo, motivo });

// Reglas comunes a llamada y WhatsApp: teléfono, baja, Robinson, intentos y separación
function comunes(contacto, ahora) {
  const tel = db.normTel(contacto?.telefono);
  if (!tel || !/^\+\d{9,15}$/.test(tel)) return no('sin_telefono', 'Sin teléfono válido.');
  if (db.estaDeBaja(tel)) return no('baja', 'Pidió no recibir más comunicaciones comerciales (baja propia).');
  if (enRobinson(tel)) return no('robinson', 'Está inscrito en la lista Robinson.');
  const max = C.prospeccion.maxIntentos;
  if ((contacto.intentos || 0) >= max) return no('max_intentos', `Alcanzado el máximo de ${max} intentos.`);
  if (contacto.ultimo_intento) {
    const ult = new Date(String(contacto.ultimo_intento).replace(' ', 'T') + (/[zZ]|[+-]\d\d:?\d\d$/.test(contacto.ultimo_intento) ? '' : 'Z'));
    const espera = separacionHoras() * 3600e3 - (ahora - ult);
    if (espera > 0) return no('demasiado_pronto', `Faltan ${Math.ceil(espera / 3600e3)} h para el siguiente intento (separación mínima de ${separacionHoras()} h).`);
  }
  return null;
}

/**
 * ¿Se puede llamar a este contacto en esta campaña ahora?
 * @param {object} contacto  fila de contactos, con intentos y ultimo_intento de la campaña si los hay
 * @param {object} campana   fila de campanas (datos en JSON) o el objeto normalizado
 * @param {Date} ahora
 * @returns {{ok:boolean, codigo?:string, motivo?:string, aviso?:string}}
 */
export function puedeLlamar(contacto, campana, ahora = new Date()) {
  const base = normalizarBase(contacto?.base_legal);
  const sinBase = 'Sin base legal para llamarle: primer contacto por correo o LinkedIn, no por teléfono.';
  if (!base) return no('sin_base_legal', sinBase);
  if (base === 'consentimiento' && !contacto.base_legal_fecha) return no('consentimiento_sin_fecha', 'Consta consentimiento pero no su fecha: sin prueba no se llama.');
  const reglas = reglasCampana(campana);
  let aviso;
  if (base === 'interes_legitimo_b2b') {
    if (!reglas.interesLegitimo) return no('interes_legitimo_no_permitido', 'La campaña no admite interés legítimo B2B (o falta la evaluación): primer contacto por correo o LinkedIn.');
    if (contacto.tipo_linea !== 'movil_corporativo' && contacto.tipo_linea !== 'fijo' && (contacto.tipo_linea === 'movil_personal' || esMovil(contacto.telefono)))
      return no('movil_personal', 'Base B2B sin consentimiento: no se llama a móviles personales (márquelo como móvil corporativo si lo es).');
    aviso = 'Interés legítimo B2B: revisar con abogado.';
  } else if (!reglas.bases.has(base)) return no('base_no_admitida', `La campaña no admite la base «${base}».`);
  const c = comunes(contacto, ahora);
  if (c) return c;
  const h = comprobarHorario(ahora);
  if (!h.ok) return h;
  return aviso ? { ok: true, aviso } : { ok: true };
}

/**
 * WhatsApp proactivo (iniciado por la empresa): mismas reglas salvo el horario, solo con plantilla aprobada
 * y con consentimiento expreso para WhatsApp (contacto.consentimiento_whatsapp con su fecha).
 */
export function puedeEnviarWhatsApp(contacto, { plantilla } = {}, ahora = new Date()) {
  if (!plantilla) return no('sin_plantilla', 'Fuera de la ventana de 24 h solo se escribe con una plantilla aprobada por Meta.');
  if (!contacto?.consentimiento_whatsapp) return no('sin_consentimiento_whatsapp', 'Sin consentimiento expreso para recibir WhatsApp.');
  return comunes(contacto, ahora) || { ok: true };
}
