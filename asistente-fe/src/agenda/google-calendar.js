// Agenda: huecos y reservas en Google Calendar (cuenta de servicio, con delegación de dominio opcional).
// Sin credenciales, los huecos salen solo del horario de reuniones y la reserva queda como tarea para una persona del equipo.
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import { C } from '../config.js';
import * as db from '../almacen/db.js';
import { registrar } from '../cerebro/herramientas.js';
import { hubspotActivo, sincronizarContacto, contactoDe, crearReunion, crearTarea, asegurarNegocio } from '../crm/hubspot.js';

const cfg = {
  calendario: null, // cliente inyectado (forma de googleapis calendar v3: freebusy.query, events.insert)
  ahora: () => new Date(),
  calendarId: C.google.calendarId,
  credenciales: C.google.credenciales,
  suplantar: C.google.suplantar,
  horario: C.agenda.horario,
  duracionMin: C.agenda.duracionMin,
  antelacionHoras: C.agenda.antelacionHoras,
  festivos: C.prospeccion.festivos,
  zona: C.empresa.zonaHoraria || 'Europe/Madrid',
};
/** Para tests o reconfiguración. */
export function configurarAgenda(o = {}) { Object.assign(cfg, o); real = null; }

// ---------- Fechas en la zona de la empresa, sin dependencias ----------
const fmt = new Map();
function partes(fecha, zona = cfg.zona) {
  if (!fmt.has(zona)) fmt.set(zona, new Intl.DateTimeFormat('en-GB', { timeZone: zona, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }));
  const p = Object.fromEntries(fmt.get(zona).formatToParts(fecha).filter((x) => x.type !== 'literal').map((x) => [x.type, Number(x.value)]));
  const dia = new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay();
  return { y: p.year, m: p.month, d: p.day, h: p.hour, mi: p.minute, dia };
}
const offsetMin = (fecha, zona) => {
  const p = partes(fecha, zona);
  return Math.round((Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi) - Math.floor(fecha.getTime() / 60000) * 60000) / 60000);
};
/** Hora local (de la zona) → Date. */
export function localAFecha(y, m, d, h, mi, zona = cfg.zona) {
  const t = Date.UTC(y, m - 1, d, h, mi);
  let r = t - offsetMin(new Date(t), zona) * 60000;
  const o2 = offsetMin(new Date(r), zona);
  r = t - o2 * 60000;
  return new Date(r);
}
const dos = (x) => String(x).padStart(2, '0');
const claveDia = (p) => `${p.y}-${dos(p.m)}-${dos(p.d)}`;
/** ISO 8601 con el desfase de la zona: 2026-11-04T10:30:00+01:00 */
export function isoLocal(fecha, zona = cfg.zona) {
  const p = partes(fecha, zona), o = offsetMin(fecha, zona);
  return `${claveDia(p)}T${dos(p.h)}:${dos(p.mi)}:00${o < 0 ? '-' : '+'}${dos(Math.floor(Math.abs(o) / 60))}:${dos(Math.abs(o) % 60)}`;
}
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
/** «martes 4 de noviembre a las 10:30» */
export function textoFecha(fecha, zona = cfg.zona) {
  const p = partes(fecha, zona);
  return `${DIAS[p.dia]} ${p.d} de ${MESES[p.m - 1]} a las ${p.h}:${dos(p.mi)}`;
}

// ---------- Horario de reuniones ----------
const LETRAS = { D: 0, L: 1, M: 2, X: 3, J: 4, V: 5, S: 6 };
/** 'L-V 09:30-14:00,16:00-19:00' (admite varios tramos separados por ';', p. ej. 'L-J 09:00-14:00; V 09:00-13:00'). */
export function parsearHorario(txt) {
  const reglas = [];
  for (const seg of String(txt).split(';').map((s) => s.trim()).filter(Boolean)) {
    const m = seg.match(/^([LMXJVSD](?:\s*[-/]\s*[LMXJVSD])*)\s+(.+)$/i);
    if (!m) continue;
    const dias = new Set();
    for (const parte of m[1].toUpperCase().replace(/\s/g, '').split('/')) {
      const [a, b] = parte.split('-').map((l) => LETRAS[l]);
      if (b === undefined) dias.add(a);
      else for (let i = a; ; i = (i + 1) % 7) { dias.add(i); if (i === b) break; }
    }
    const tramos = m[2].split(',').map((t) => t.trim().match(/^(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$/)).filter(Boolean)
      .map((t) => ({ desde: +t[1] * 60 + +t[2], hasta: +t[3] * 60 + +t[4] }));
    reglas.push({ dias, tramos });
  }
  return reglas;
}
const tramosDelDia = (reglas, dia) => reglas.filter((r) => r.dias.has(dia)).flatMap((r) => r.tramos);

const solapa = (ini, fin, ocupados) => ocupados.some((o) => ini < o.fin && fin > o.ini);

/** Todos los huecos posibles (orden cronológico) entre desde y desde+dias, respetando horario, festivos, antelación y ocupados. */
export function calcularHuecos({ desde, dias = 10, ocupados = [], paso = 30 } = {}) {
  const ahora = cfg.ahora();
  const minimo = new Date(ahora.getTime() + cfg.antelacionHoras * 3600e3);
  const dur = cfg.duracionMin * 60000;
  const inicio = desde && desde > minimo ? desde : minimo;
  const reglas = parsearHorario(cfg.horario);
  const festivos = new Set(cfg.festivos);
  const p0 = partes(inicio);
  const res = [];
  for (let i = 0; i < dias; i++) {
    const f = new Date(Date.UTC(p0.y, p0.m - 1, p0.d + i));
    const y = f.getUTCFullYear(), m = f.getUTCMonth() + 1, d = f.getUTCDate();
    if (festivos.has(`${y}-${dos(m)}-${dos(d)}`)) continue;
    for (const t of tramosDelDia(reglas, f.getUTCDay())) {
      for (let min = t.desde; min + cfg.duracionMin <= t.hasta; min += paso) {
        const ini = localAFecha(y, m, d, Math.floor(min / 60), min % 60);
        const fin = new Date(ini.getTime() + dur);
        if (ini < inicio || solapa(ini, fin, ocupados)) continue;
        res.push({ ini, fin });
      }
    }
  }
  return res.sort((a, b) => a.ini - b.ini);
}

/** Elige entre 6 y 8 huecos repartidos: uno de mañana y uno de tarde por día (a horas distintas cada día); si faltan, completa en orden. */
export function elegirHuecos(todos, max = 8, min = 6) {
  const porDia = new Map();
  for (const h of todos) {
    const p = partes(h.ini), k = claveDia(p);
    if (!porDia.has(k)) porDia.set(k, { manana: [], tarde: [] });
    porDia.get(k)[p.h < 15 ? 'manana' : 'tarde'].push(h);
  }
  const elegidos = new Set();
  let i = 0;
  for (const g of porDia.values()) {
    for (const lista of [g.manana, g.tarde]) if (lista.length && elegidos.size < max) elegidos.add(lista[(i * 2) % lista.length]);
    i++;
  }
  for (const h of todos) { if (elegidos.size >= min) break; elegidos.add(h); }
  return [...elegidos].sort((a, b) => a.ini - b.ini);
}

/** ¿Encaja la reunión en el horario (y no es festivo)? */
function enHorario(ini, fin) {
  const p = partes(ini), pf = partes(new Date(fin.getTime() - 1));
  if (claveDia(p) !== claveDia(pf) || cfg.festivos.includes(claveDia(p))) return false;
  const a = p.h * 60 + p.mi, b = a + Math.round((fin - ini) / 60000);
  return tramosDelDia(parsearHorario(cfg.horario), p.dia).some((t) => a >= t.desde && b <= t.hasta);
}

// ---------- Google Calendar ----------
let real = null;
async function cliente() {
  if (cfg.calendario) return cfg.calendario;
  if (!cfg.credenciales) return null;
  if (!real) {
    const { google } = await import('googleapis');
    const cred = cfg.credenciales.trim().startsWith('{') ? JSON.parse(cfg.credenciales) : JSON.parse(fs.readFileSync(cfg.credenciales, 'utf8'));
    const auth = new google.auth.JWT({ email: cred.client_email, key: cred.private_key, scopes: ['https://www.googleapis.com/auth/calendar'], subject: cfg.suplantar || undefined });
    real = google.calendar({ version: 'v3', auth });
  }
  return real;
}

async function ocupadosEn(cal, ini, fin) {
  const r = await cal.freebusy.query({ requestBody: { timeMin: ini.toISOString(), timeMax: fin.toISOString(), timeZone: cfg.zona, items: [{ id: cfg.calendarId }] } });
  const c = r.data?.calendars?.[cfg.calendarId] || Object.values(r.data?.calendars || {})[0] || {};
  if (c.errors?.length) throw new Error('freebusy: ' + c.errors.map((e) => e.reason).join(', '));
  return (c.busy || []).map((b) => ({ ini: new Date(b.start), fin: new Date(b.end) }));
}

const formatear = (h) => ({ texto: textoFecha(h.ini), inicio: isoLocal(h.ini) });

function interpretarDesde(s) {
  if (!s) return null;
  const m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const f = m ? localAFecha(+m[1], +m[2], +m[3], 0, 0) : new Date(s);
  return isNaN(f) ? null : f;
}

/** Huecos libres (con la agenda real si está conectada). */
export async function huecosLibres({ desde, dias = 10 } = {}) {
  const d = interpretarDesde(desde);
  const cal = await cliente();
  let ocupados = [], aviso = null;
  if (cal) {
    const ini = new Date(Math.max(cfg.ahora().getTime(), d?.getTime() || 0));
    try { ocupados = await ocupadosEn(cal, ini, new Date(ini.getTime() + (dias + 1) * 86400e3)); }
    catch (err) {
      console.warn('[agenda] freebusy:', err.message);
      aviso = 'No se ha podido leer la agenda ahora: son huecos según el horario habitual y la reserva la confirmará una persona del equipo.';
    }
  } else aviso = 'La agenda no está conectada: son huecos según el horario habitual y la reserva la confirmará una persona del equipo.';
  return { huecos: elegirHuecos(calcularHuecos({ desde: d, dias, ocupados })), aviso, conectada: !!cal && !aviso };
}

registrar('consultar_huecos', async (e) => {
  const { huecos, aviso } = await huecosLibres({ desde: e.desde, dias: e.dias ?? 10 });
  if (!huecos.length) return { huecos: [], aviso: 'No hay huecos libres en esos días. Pruebe a mirar más adelante (más días) u ofrezca que una persona del equipo proponga fecha.' };
  return { duracion_minutos: cfg.duracionMin, zona: 'hora peninsular (Madrid)', huecos: huecos.map(formatear), ...(aviso ? { aviso } : {}) };
});

async function insertarEvento(cal, cuerpo, { meet }) {
  const notas = {};
  let body = cuerpo;
  for (let intento = 0; intento < 3; intento++) {
    try {
      const r = await cal.events.insert({ calendarId: cfg.calendarId, requestBody: body, sendUpdates: body.attendees?.length ? 'all' : 'none', conferenceDataVersion: body.conferenceData ? 1 : 0 });
      return { evento: r.data, ...notas };
    } catch (err) {
      const st = err.code || err.status || err.response?.status, msg = String(err.message || '');
      // Una cuenta de servicio sin delegación no puede invitar ni, a veces, crear Meet: se reintenta sin ello
      if (body.attendees?.length && (st === 403 || /attendee|domain-wide/i.test(msg))) { body = { ...body, attendees: [] }; notas.sinInvitacion = true; continue; }
      if (meet && body.conferenceData && (st === 400 || /conference/i.test(msg))) { const { conferenceData, ...resto } = body; body = resto; notas.sinMeet = true; continue; }
      throw err;
    }
  }
  throw new Error('No se ha podido crear el evento');
}

registrar('agendar_reunion', async (e, ctx) => {
  const ini = new Date(e.inicio);
  if (isNaN(ini)) return 'Fecha no válida: use el campo «inicio» de un hueco devuelto por consultar_huecos.';
  const fin = new Date(ini.getTime() + cfg.duracionMin * 60000);
  const margen = Math.max(0, cfg.antelacionHoras * 3600e3 - 3600e3); // una hora de tolerancia por lo que dura la conversación
  if (ini.getTime() < cfg.ahora().getTime() + margen || !enHorario(ini, fin)) {
    const { huecos } = await huecosLibres({});
    return { reservado: false, motivo: 'Ese momento está fuera del horario de reuniones o con poca antelación.', alternativas: huecos.slice(0, 4).map(formatear) };
  }
  const modalidad = e.modalidad || 'videollamada';
  const email = e.email?.trim().toLowerCase() || undefined;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'El correo no parece válido; pídalo de nuevo y repítalo para confirmarlo.';

  let contacto = contactoDe(ctx);
  if (contacto) {
    contacto = db.guardarContacto({ id: contacto.id, telefono: contacto.telefono, nombre: contacto.nombre || e.nombre, email: email || undefined });
    if (ctx.contacto) Object.assign(ctx.contacto, contacto);
  }
  const cuando = textoFecha(ini);
  const tel = contacto?.telefono;
  const descripcion = [
    `Reunión de diagnóstico con ${C.empresa.responsable} (${C.empresa.nombre}).`, `Motivo: ${e.motivo}`, '',
    `Contacto: ${e.nombre}${contacto?.empresa ? ' · ' + contacto.empresa : ''}${contacto?.cargo ? ' · ' + contacto.cargo : ''}`,
    tel ? `Teléfono: ${tel}` : '', email ? `Correo: ${email}` : '', `Modalidad: ${modalidad}`,
    contacto?.notas ? `\nLo que ha contado:\n${contacto.notas}` : '', '', `Reservada por ${C.empresa.asistente}, asistente de IA, por ${ctx.canal === 'voz' ? 'teléfono' : 'WhatsApp'}.`,
  ].filter((x) => x !== '').join('\n');
  const hsId = contacto && hubspotActivo() ? (contacto.hubspot_id || (await sincronizarContacto(contacto))) : null;
  const titulo = `Diagnóstico ${C.empresa.nombre} · ${e.nombre}${contacto?.empresa ? ' (' + contacto.empresa + ')' : ''}`;

  const cal = await cliente();
  if (!cal) {
    if (ctx.conversacionId) db.anotar(ctx.conversacionId, 'reunion', `Petición de reunión: ${cuando} (${modalidad})`, { inicio: isoLocal(ini), email, motivo: e.motivo, confirmada: false });
    db.evento('reunion_pendiente', { inicio: isoLocal(ini), contacto: contacto?.id ?? null, email, modalidad });
    let crm = 'HubSpot no configurado: queda en la base local.';
    if (hsId) {
      try {
        await crearTarea({ contactoId: hsId, asunto: `Confirmar reunión con ${e.nombre}: ${cuando}`, cuerpo: descripcion, vence: new Date(Math.min(ini.getTime(), cfg.ahora().getTime() + 4 * 3600e3)).toISOString(), prioridad: 'HIGH' });
        await asegurarNegocio(ctx.conversacionId, { contactoId: hsId, nombre: `${contacto?.empresa || e.nombre} · diagnóstico` });
        crm = 'Tarea creada en HubSpot para confirmarla.';
      } catch (err) { crm = `HubSpot ha fallado (${err.message}).`; }
    }
    return { reservado: false, pendiente_de_confirmar: true, cuando, crm,
      indicacion: `La agenda no está conectada. Diga que queda anotada la petición para el ${cuando} y que una persona del equipo se la confirmará${email ? ' y enviará la invitación a ' + email : ''}.` };
  }

  // Comprobar de nuevo que el hueco sigue libre
  const ocupados = await ocupadosEn(cal, ini, fin);
  if (solapa(ini, fin, ocupados)) {
    const { huecos } = await huecosLibres({});
    return { reservado: false, motivo: 'Ese hueco acaba de ocuparse.', alternativas: huecos.slice(0, 4).map(formatear) };
  }
  const meet = modalidad === 'videollamada';
  const cuerpo = {
    summary: titulo, description: descripcion,
    start: { dateTime: isoLocal(ini), timeZone: cfg.zona }, end: { dateTime: isoLocal(fin), timeZone: cfg.zona },
    attendees: email ? [{ email, displayName: e.nombre }] : [],
    ...(meet ? { conferenceData: { createRequest: { requestId: randomUUID(), conferenceSolutionKey: { type: 'hangoutsMeet' } } } } : {}),
    ...(modalidad === 'telefono' ? { location: tel ? `Llamada al ${tel}` : 'Llamada telefónica' } : modalidad === 'presencial' ? { location: 'Presencial (lugar por confirmar)' } : {}),
    reminders: { useDefault: true },
  };
  const { evento, sinInvitacion, sinMeet } = await insertarEvento(cal, cuerpo, { meet });
  const enlace = evento.hangoutLink || evento.conferenceData?.entryPoints?.find((p) => p.entryPointType === 'video')?.uri || null;
  if (ctx.conversacionId) db.anotar(ctx.conversacionId, 'reunion', `Reunión reservada: ${cuando} (${modalidad})`, { eventoId: evento.id, inicio: isoLocal(ini), enlace, email });
  db.evento('reunion', { eventoId: evento.id, inicio: isoLocal(ini), contacto: contacto?.id ?? null, modalidad });

  let crm = 'HubSpot no configurado: queda en la base local y en la agenda.';
  if (hsId) {
    const fallos = [];
    for (const t of [
      () => crearReunion({ contactoId: hsId, titulo, cuerpo: descripcion + (enlace ? `\nEnlace: ${enlace}` : ''), inicio: ini, fin, lugar: enlace || cuerpo.location }),
      () => asegurarNegocio(ctx.conversacionId, { contactoId: hsId, nombre: `${contacto?.empresa || e.nombre} · diagnóstico` }),
      ...(sinInvitacion && email ? [() => crearTarea({ contactoId: hsId, asunto: `Enviar invitación a ${email} (${cuando})`, cuerpo: descripcion, prioridad: 'HIGH' })] : []),
    ]) { try { await t(); } catch (err) { fallos.push(err.message); } }
    crm = fallos.length ? `HubSpot ha fallado en parte (${fallos[0]}).` : 'Registrada en HubSpot.';
  }
  return {
    reservado: true, cuando, modalidad, enlace,
    invitacion: email ? (sinInvitacion ? `no se ha podido enviar desde la agenda; el equipo la enviará a ${email}` : `enviada a ${email}`) : 'sin correo: no se ha enviado invitación',
    ...(meet && sinMeet ? { aviso: 'No se ha podido crear el enlace de videollamada; el equipo lo enviará.' } : {}),
    crm,
  };
});
