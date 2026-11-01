// Panel del asistente (sin frameworks). Todo lo que llega del servidor se pinta con textContent: nunca como HTML.
'use strict';

const $ = (s) => document.querySelector(s);
function el(tag, attrs = {}, ...hijos) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (k === 'class') e.className = v;
    else e.setAttribute(k, v === true ? '' : String(v));
  }
  for (const h of hijos.flat()) if (h !== null && h !== undefined && h !== false) e.append(h instanceof Node ? h : document.createTextNode(String(h)));
  return e;
}
const vaciar = (n) => { while (n.firstChild) n.removeChild(n.firstChild); return n; };

async function api(ruta, cuerpo) {
  const op = cuerpo === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Panel': '1' }, body: JSON.stringify(cuerpo) };
  const r = await fetch('/panel/api/' + ruta, { credentials: 'same-origin', ...op });
  if (r.status === 401) { location.href = '/panel'; throw new Error('Sesión caducada'); }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'Error ' + r.status);
  return j;
}
const leerFichero = (input) => new Promise((ok, ko) => {
  const f = input.files[0];
  if (!f) return ko(new Error('Elija un fichero'));
  if (f.size > 1.8 * 1024 * 1024) return ko(new Error('El fichero pasa de 1,8 MB: impórtelo desde el servidor (vea PUESTA-EN-MARCHA.md)'));
  const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = () => ko(r.error); r.readAsText(f);
});
function mensaje(nodo, texto, tipo = 'ok') { vaciar(nodo).append(el('p', { class: tipo, role: 'status' }, texto)); }
async function conBoton(boton, salida, fn) {
  boton.disabled = true;
  try { await fn(); } catch (err) { mensaje(salida, err.message, 'error'); } finally { boton.disabled = false; }
}
const tabla = (cabeceras, filas) => el('div', { class: 'tabla' }, el('table', {},
  el('thead', {}, el('tr', {}, cabeceras.map((c) => el('th', { class: c.opcional ? 'opcional' : null }, c.t ?? c)))),
  el('tbody', {}, filas.length ? filas.map((f) => el('tr', {}, f.map((x, i) => el('td', { class: cabeceras[i].opcional ? 'opcional' : null }, x ?? '—')))) : el('tr', {}, el('td', { colspan: cabeceras.length }, 'Sin datos.')))));

// ---------- Vistas ----------
async function vistaResumen(c) {
  const r = await api('resumen');
  const cifra = (v, t) => el('div', { class: 'cifra' }, el('b', {}, v ?? '—'), el('span', {}, t));
  c.append(el('h1', {}, 'Resumen de hoy'), el('div', { class: 'cifras' },
    cifra(r.llamadasHoy, `Llamadas (${r.entrantesHoy} entrantes, ${r.salientesHoy} salientes)`),
    cifra(r.whatsappAbiertos, 'WhatsApp abiertos (24 h)'),
    cifra(r.reunionesHoy, `Reuniones agendadas hoy (${r.reuniones7dias} en 7 días)`),
    cifra(r.latenciaMediaMs === null ? '—' : r.latenciaMediaMs + ' ms', `Latencia media de voz (${r.latenciaMuestras} muestras)`),
    cifra(r.campanasActivas, r.prospeccionActiva ? 'Campañas activas' : 'Campañas activas (prospección apagada)'),
    cifra(r.bajas, 'Bajas registradas'),
    cifra(r.robinson, 'Números en la lista Robinson')));
  const salida = el('div');
  const b = el('button', { class: 'secundario', onclick: () => conBoton(b, salida, async () => mensaje(salida, (await api('conocimiento/recargar', {})).mensaje)) }, 'Volver a cargar el conocimiento');
  c.append(el('h2', {}, 'Conocimiento'), el('p', { class: 'suave' }, 'Tras actualizar los documentos y volver a ingestarlos, pulse aquí para que el asistente use la versión nueva.'), b, salida);
}

async function vistaConversaciones(c, canal = '') {
  const filtro = el('select', { onchange: () => irA('conversaciones', filtro.value) },
    [['', 'Todos los canales'], ['voz', 'Llamadas'], ['whatsapp', 'WhatsApp'], ['prueba', 'Pruebas del panel']].map(([v, t]) => el('option', { value: v, selected: v === canal }, t)));
  const lista = await api('conversaciones?limite=100' + (canal ? '&canal=' + encodeURIComponent(canal) : ''));
  const detalle = el('div');
  c.append(el('h1', {}, 'Conversaciones'), el('label', {}, 'Canal', filtro), detalle,
    tabla(['Fecha', 'Canal', 'Contacto', 'Resultado', { t: 'Resumen', opcional: true }, ''], lista.map((v) => [
      v.inicio, `${v.canal} ${v.direccion}`, [v.nombre || v.telefono || 'desconocido', v.empresa ? ` (${v.empresa})` : ''].join(''), v.resultado || v.estado,
      (v.resumen || '').slice(0, 160), el('button', { class: 'enlace', onclick: () => verConversacion(v.id, detalle) }, 'Ver'),
    ])));
}
async function verConversacion(id, nodo) {
  const v = await api('conversaciones/' + id);
  vaciar(nodo).append(el('div', { class: 'tarjeta' },
    el('h2', {}, `Conversación ${v.id} · ${v.canal} ${v.direccion}`),
    el('p', {}, `${v.inicio} · ${v.nombre || v.telefono || 'desconocido'}${v.empresa ? ' (' + v.empresa + ')' : ''}${v.duracion_s ? ' · ' + v.duracion_s + ' s' : ''}`),
    el('p', {}, el('strong', {}, 'Resultado: '), v.resultado || '—'), el('p', {}, el('strong', {}, 'Resumen: '), v.resumen || '—'),
    el('section', { class: 'transcripcion' }, v.mensajes.map((m) => el('div', { class: 'msg ' + m.rol }, el('span', { class: 'rol' }, `${m.rol} · ${m.ts}`), el('p', {}, m.texto || '')))),
    el('p', {}, el('a', { href: '/panel/conversacion/' + v.id, target: '_blank', rel: 'noopener' }, 'Versión para imprimir'))));
  nodo.scrollIntoView({ behavior: 'smooth' });
}

async function vistaCampanas(c) {
  const { campanas, bases } = await api('campanas');
  const salida = el('div');
  c.append(el('h1', {}, 'Campañas de prospección'),
    el('p', { class: 'aviso' }, 'Solo se llama a contactos con base legal (consentimiento, cliente o relación previa), que no estén de baja ni en la lista Robinson, en el horario configurado y de lunes a viernes de 9:00 a 21:00. A quien no tenga base legal se le escribe por correo o LinkedIn.'));
  c.append(tabla(['Campaña', 'Estado', 'Contactos', ''], campanas.map((k) => [
    el('span', {}, el('strong', {}, k.nombre), el('br'), el('span', { class: 'suave' }, k.dolor || '')), k.estado,
    Object.entries(k.contactos).map(([e, n]) => `${e}: ${n}`).join(' · ') || '0',
    el('button', { class: 'enlace', onclick: () => irA('campana', k.id) }, 'Abrir'),
  ])));
  // Alta de campaña
  const f = {
    nombre: el('input', { required: true }), dolor: el('input', { placeholder: 'Por ejemplo: incrementar ventas rentables' }),
    guion: el('textarea', { placeholder: 'Indicaciones para el asistente: tono, preguntas clave, qué ofrecer' }),
    il: el('input', { type: 'checkbox' }), evaluacion: el('textarea', { placeholder: 'Resumen de la evaluación de interés legítimo, revisada con su abogado' }),
  };
  const casillas = Object.entries(bases).filter(([k]) => k !== 'interes_legitimo_b2b').map(([k, t]) => { const i = el('input', { type: 'checkbox', value: k, checked: true }); return { i, l: el('label', { class: 'casilla' }, i, t) }; });
  const b = el('button', { type: 'submit' }, 'Crear campaña');
  c.append(el('h2', {}, 'Nueva campaña'), el('form', { class: 'tarjeta', onsubmit: (e) => { e.preventDefault(); conBoton(b, salida, async () => {
    const k = await api('campanas', { nombre: f.nombre.value, dolor: f.dolor.value, guion: f.guion.value, basesPermitidas: casillas.filter((x) => x.i.checked).map((x) => x.i.value), permiteInteresLegitimo: f.il.checked, evaluacionInteresLegitimo: f.evaluacion.value });
    irA('campana', k.id);
  }); } },
  el('label', {}, 'Nombre', f.nombre), el('label', {}, 'Dolor con el que abrir', f.dolor), el('label', {}, 'Guion o indicaciones', f.guion),
  el('fieldset', {}, el('legend', {}, 'Bases legales admitidas'), casillas.map((x) => x.l),
    el('label', { class: 'casilla' }, f.il, 'Admitir interés legítimo B2B (revisar con abogado; nunca móviles personales)'), el('label', {}, 'Evaluación de interés legítimo', f.evaluacion)),
  b, salida));
}

async function vistaCampana(c, id) {
  const r = await api('campanas/' + id);
  const k = r.campana, salida = el('div');
  const accion = (texto, ruta) => { const b = el('button', { class: 'secundario', onclick: () => conBoton(b, salida, async () => { await api(`campanas/${id}/${ruta}`, {}); irA('campana', id); }) }, texto); return b; };
  c.append(el('p', {}, el('button', { class: 'enlace', onclick: () => irA('campanas') }, '← Todas las campañas')),
    el('h1', {}, k.nombre), el('p', {}, el('strong', {}, 'Estado: '), k.estado, ' · ', el('strong', {}, 'Abre con: '), k.dolor || '—'),
    el('p', { class: 'suave' }, 'Bases admitidas: ' + [...(k.basesPermitidas || []), k.permiteInteresLegitimo ? 'interes_legitimo_b2b (revisar con abogado)' : null].filter(Boolean).join(', ')),
    el('div', { class: 'botones' }, k.estado === 'activa' ? accion('Pausar', 'pausar') : accion(k.estado === 'pausada' ? 'Reanudar' : 'Activar', 'reanudar')), salida);
  // Importar
  const fichero = el('input', { type: 'file', accept: '.csv,text/csv' }), lista = el('input', { inputmode: 'numeric', placeholder: 'Identificador de la lista' });
  const bi = el('button', { type: 'button' }, 'Importar CSV'), bh = el('button', { type: 'button', class: 'secundario' }, 'Importar lista de HubSpot');
  const informe = (x) => mensaje(salida, `Importados ${x.importados}, ya estaban ${x.yaEstaban}, sin base legal ${x.sinBaseLegal} (escribirles por correo o LinkedIn), excluidos ${x.excluidos}, rechazados ${x.rechazados.length}` + (x.rechazados.length ? ': ' + x.rechazados.slice(0, 10).map((y) => `fila ${y.fila} (${y.motivo})`).join('; ') : '.'));
  bi.addEventListener('click', () => conBoton(bi, salida, async () => { informe(await api(`campanas/${id}/importar`, { csv: await leerFichero(fichero) })); }));
  bh.addEventListener('click', () => conBoton(bh, salida, async () => { informe(await api(`campanas/${id}/hubspot`, { listaId: lista.value.trim() })); }));
  c.append(el('h2', {}, 'Importar contactos'), el('div', { class: 'tarjeta' },
    el('p', { class: 'suave' }, 'CSV con las columnas: telefono, nombre, empresa, cargo, email, base_legal, base_legal_detalle, base_legal_fecha, origen (y, si las tiene, tipo_linea y consentimiento_whatsapp). base_legal: consentimiento, cliente, relacion_previa o interes_legitimo_b2b.'),
    el('label', {}, 'Fichero CSV', fichero), bi, el('hr'), el('label', {}, 'Lista de HubSpot', lista), bh));
  // Resultados
  c.append(el('h2', {}, 'Resultados'),
    el('p', {}, r.porEstado.map((x) => `${x.estado}: ${x.n}`).join(' · ') || 'Sin contactos.'),
    el('p', { class: 'suave' }, r.porResultado.map((x) => `${x.resultado}: ${x.n}`).join(' · ')),
    tabla(['Contacto', 'Teléfono', 'Base legal', 'Estado', 'Intentos', { t: 'Resultado o motivo', opcional: true }], r.contactos.map((x) => [
      [x.nombre || '—', x.empresa ? ` (${x.empresa})` : ''].join(''), x.telefono, x.base_legal || 'sin base: correo o LinkedIn', x.estado, x.intentos, x.resultado || x.motivo || '',
    ])));
}

async function vistaBajas(c) {
  const r = await api('bajas'), salida = el('div');
  const tel = el('input', { inputmode: 'tel', placeholder: '+34 600 000 000' }), motivo = el('input');
  const b = el('button', { type: 'submit' }, 'Dar de baja');
  const fichero = el('input', { type: 'file', accept: '.csv,.txt,text/csv,text/plain' }), fecha = el('input', { type: 'date' });
  const br = el('button', { type: 'button' }, 'Importar lista Robinson');
  br.addEventListener('click', () => conBoton(br, salida, async () => { const x = await api('robinson', { csv: await leerFichero(fichero), fecha: fecha.value || undefined }); mensaje(salida, `Cargados ${x.cargados} números; descartadas ${x.descartados} filas sin teléfono.`); }));
  c.append(el('h1', {}, 'Bajas y lista Robinson'), salida,
    el('h2', {}, 'Lista Robinson'), el('div', { class: 'tarjeta' },
      el('p', {}, `Números cargados: ${r.robinson.n}${r.robinson.fecha ? ' · lista del ' + r.robinson.fecha : ''}`),
      el('p', { class: 'suave' }, 'Descargue la lista del servicio de Adigital (como empresa adherida) y cárguela aquí al menos una vez al mes, antes de cada campaña.'),
      el('label', {}, 'Fichero', fichero), el('label', {}, 'Fecha de la lista', fecha), br),
    el('h2', {}, 'Añadir una baja'), el('form', { class: 'tarjeta', onsubmit: (e) => { e.preventDefault(); conBoton(b, salida, async () => { await api('bajas', { telefono: tel.value, motivo: motivo.value }); irA('bajas'); }); } },
      el('label', {}, 'Teléfono', tel), el('label', {}, 'Motivo (opcional)', motivo), b),
    el('h2', {}, `Bajas (${r.bajas.length})`),
    tabla(['Teléfono', 'Fecha', 'Canal', { t: 'Motivo', opcional: true }], r.bajas.map((x) => [x.telefono, x.ts, x.canal, x.motivo])));
}

function vistaProbar(c) {
  const chat = el('div', { id: 'chat', 'aria-live': 'polite' }), salida = el('div');
  const texto = el('textarea', { placeholder: 'Escriba como si fuera un cliente por WhatsApp', rows: 3 });
  const b = el('button', { type: 'submit' }, 'Enviar');
  const pinta = (rol, t) => { chat.append(el('div', { class: 'msg ' + rol }, el('span', { class: 'rol' }, rol), el('p', {}, t))); chat.scrollTop = chat.scrollHeight; };
  const reiniciar = el('button', { type: 'button', class: 'secundario', onclick: () => conBoton(reiniciar, salida, async () => { await api('probar', { reiniciar: true }); vaciar(chat); vaciar(salida); }) }, 'Empezar de nuevo');
  c.append(el('h1', {}, 'Probar el asistente'),
    el('p', { class: 'suave' }, 'Conversación de WhatsApp simulada contra un contacto de prueba. Las herramientas son las reales (agenda, CRM): no confirme reuniones que no quiera reservar.'),
    chat, el('form', { onsubmit: (e) => { e.preventDefault(); const t = texto.value.trim(); if (!t) return; pinta('usuario', t); texto.value = '';
      conBoton(b, salida, async () => { const r = await api('probar', { texto: t }); if (r.herramientas.length) pinta('herramienta', 'Herramientas: ' + r.herramientas.join(', ')); pinta('asistente', r.texto || '(sin texto)'); if (r.terminada) pinta('herramienta', `Conversación cerrada: ${r.terminada.resultado}`); }); } },
    el('label', {}, 'Mensaje', texto), el('div', { class: 'botones' }, b, reiniciar)), salida);
}

// ---------- Navegación ----------
const VISTAS = { resumen: ['Resumen', vistaResumen], conversaciones: ['Conversaciones', vistaConversaciones], campanas: ['Campañas', vistaCampanas], bajas: ['Bajas y Robinson', vistaBajas], probar: ['Probar', vistaProbar], campana: [null, vistaCampana] };
async function irA(vista, arg) {
  const nav = vaciar($('#pestanas'));
  for (const [k, [t]] of Object.entries(VISTAS)) if (t) nav.append(el('button', { 'aria-selected': String(k === vista || (vista === 'campana' && k === 'campanas')), onclick: () => irA(k) }, t));
  const c = vaciar($('#contenido'));
  try { await VISTAS[vista][1](c, arg); } catch (err) { c.append(el('p', { class: 'error' }, err.message)); }
}
irA('resumen');
