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
// Tabla que en el móvil se convierte en tarjetas (cada celda lleva su rótulo): no se corta ninguna columna
const tabla = (cabeceras, filas) => el('div', { class: 'tabla' }, el('table', {},
  el('thead', {}, el('tr', {}, cabeceras.map((c) => el('th', {}, c)))),
  el('tbody', {}, filas.length ? filas.map((f) => el('tr', {}, f.map((x, i) => el('td', { 'data-rotulo': cabeceras[i] || null }, x === '' || x === null || x === undefined ? '—' : x))))
    : el('tr', {}, el('td', { colspan: cabeceras.length, class: 'vacia' }, 'Sin datos.')))));

// ---------- Textos legibles ----------
let T = {};
const tx = (grupo, codigo) => {
  if (codigo === null || codigo === undefined || codigo === '') return '';
  const t = T[grupo]?.[codigo];
  if (t) return t;
  const s = String(codigo).replace(/[_-]+/g, ' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
};
const fecha = (ts) => {
  if (!ts) return '—';
  const d = new Date(String(ts).includes('T') ? ts : String(ts).replace(' ', 'T') + 'Z');
  return isNaN(d) ? String(ts) : d.toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
};
const quien = (v) => [v.nombre || v.telefono || 'Desconocido', v.empresa ? ` (${v.empresa})` : ''].join('');
const resultadoDe = (v) => (v.reunion_pendiente ? tx('resultado', 'reunion_pendiente') : tx('resultado', v.resultado) || tx('estadoConversacion', v.estado));
const enlaceContacto = (id, texto) => (id ? el('a', { href: '#contacto/' + id }, texto) : texto);

// ---------- Vistas ----------
async function vistaResumen(c) {
  const r = await api('resumen');
  const cifra = (v, t, destino) => el(destino ? 'a' : 'div', { class: 'cifra', href: destino || null }, el('b', {}, v ?? '—'), el('span', {}, t));
  c.append(el('h1', {}, 'Resumen de hoy'),
    r.prospeccionActiva ? null : el('p', { class: 'aviso' }, 'La prospección está apagada (PROSPECCION_ACTIVA=no): las campañas no hacen llamadas.'),
    el('div', { class: 'cifras' },
      cifra(r.requiereAccion, 'Requieren acción', '#acciones'),
      cifra(r.llamadasHoy, `Llamadas (${r.entrantesHoy} entrantes, ${r.salientesHoy} salientes)`, '#conversaciones'),
      cifra(r.whatsappAbiertos, 'WhatsApp abiertos (24 h)'),
      cifra(r.reunionesHoy, `Sesiones agendadas hoy (${r.reuniones7dias} en 7 días)`),
      cifra(r.reunionesPorConfirmar, 'Sesiones por confirmar', '#acciones'),
      cifra(r.latenciaMediaMs === null ? '—' : r.latenciaMediaMs + ' ms', `Latencia media de voz (${r.latenciaMuestras} muestras)`),
      cifra(r.campanasActivas, r.prospeccionActiva ? 'Campañas activas' : 'Campañas activas (prospección apagada)', '#campanas'),
      cifra(r.bajas, 'Bajas registradas', '#bajas'),
      cifra(r.robinson, 'Números en la lista Robinson')));
  const salida = el('div');
  const b = el('button', { class: 'secundario', onclick: () => conBoton(b, salida, async () => mensaje(salida, (await api('conocimiento/recargar', {})).mensaje)) }, 'Volver a cargar el conocimiento');
  c.append(el('h2', {}, 'Conocimiento'), el('p', { class: 'suave' }, 'Tras actualizar los documentos y volver a ingestarlos, pulse aquí para que el asistente use la versión nueva.'), b, salida);
}

async function vistaAcciones(c) {
  const lista = await api('acciones'), salida = el('div');
  c.append(el('h1', {}, 'Requiere acción'),
    el('p', { class: 'suave' }, 'Sesiones por confirmar, transferencias que nadie atendió, urgencias y fallos técnicos. Márquelos como resueltos cuando estén atendidos.'), salida);
  if (!lista.length) return c.append(el('p', { class: 'ok' }, 'No hay nada pendiente.'));
  c.append(el('ul', { class: 'lista' }, lista.map((x) => {
    const b = el('button', { class: 'secundario', onclick: () => conBoton(b, salida, async () => { await api(`acciones/${x.id}/resolver`, {}); irA('acciones'); }) }, 'Marcar como resuelto');
    return el('li', { class: 'tarjeta' },
      el('p', {}, el('strong', {}, x.titulo), el('span', { class: 'suave' }, ' · ' + fecha(x.ts))),
      x.contacto ? el('p', {}, enlaceContacto(x.contacto.id, quien(x.contacto)), x.contacto.telefono ? ` · ${x.contacto.telefono}` : '') : null,
      x.detalle ? el('p', {}, x.detalle) : null,
      el('div', { class: 'botones' }, b, x.conversacionId ? el('a', { href: '#conversacion/' + x.conversacionId }, 'Ver la conversación') : null));
  })));
}

const RESULTADOS_FILTRO = ['reunion_agendada', 'reunion_pendiente', 'interesado', 'enviar_informacion', 'volver_a_llamar', 'no_interesado', 'baja', 'atendido', 'transferido', 'transferencia_sin_respuesta', 'buzon', 'equivocado', 'colgada', 'sin_resultado'];
let filtros = { q: '', canal: '', resultado: '', desde: '', hasta: '' };
const consulta = (o) => Object.entries(o).filter(([, v]) => v).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');

async function vistaConversaciones(c) {
  const f = {
    q: el('input', { type: 'search', placeholder: 'Nombre, empresa, teléfono, correo o texto del resumen', value: filtros.q }),
    canal: el('select', {}, [['', 'Todos'], ['voz', 'Llamadas'], ['whatsapp', 'WhatsApp'], ['prueba', 'Pruebas del panel']].map(([v, t]) => el('option', { value: v, selected: v === filtros.canal }, t))),
    resultado: el('select', {}, el('option', { value: '' }, 'Todos'), RESULTADOS_FILTRO.map((v) => el('option', { value: v, selected: v === filtros.resultado }, v === 'transferencia_sin_respuesta' ? 'Transferencia sin respuesta' : tx('resultado', v)))),
    desde: el('input', { type: 'date', value: filtros.desde }), hasta: el('input', { type: 'date', value: filtros.hasta }),
  };
  const aplicar = (e) => { e?.preventDefault(); filtros = Object.fromEntries(Object.entries(f).map(([k, n]) => [k, n.value.trim()])); irA('conversaciones'); };
  const limpiar = el('button', { type: 'button', class: 'secundario', onclick: () => { filtros = { q: '', canal: '', resultado: '', desde: '', hasta: '' }; irA('conversaciones'); } }, 'Quitar filtros');
  const lista = await api('conversaciones?limite=200&' + consulta(filtros));
  c.append(el('h1', {}, 'Conversaciones'),
    el('form', { class: 'tarjeta filtros', onsubmit: aplicar },
      el('label', { class: 'ancho' }, 'Buscar', f.q), el('label', {}, 'Canal', f.canal), el('label', {}, 'Resultado', f.resultado),
      el('label', {}, 'Desde', f.desde), el('label', {}, 'Hasta', f.hasta),
      el('div', { class: 'botones ancho' }, el('button', { type: 'submit' }, 'Filtrar'), limpiar,
        el('a', { class: 'boton secundario', href: '/panel/api/exportar/conversaciones?' + consulta(filtros), download: '' }, 'Exportar CSV'))),
    el('p', { class: 'suave' }, `${lista.length} ${lista.length === 1 ? 'conversación' : 'conversaciones'}${lista.length === 200 ? ' (las 200 más recientes; afine la búsqueda o exporte el CSV)' : ''}.`),
    tabla(['Fecha', 'Canal', 'Contacto', 'Resultado', 'Resumen', ''], lista.map((v) => [
      fecha(v.inicio), `${tx('canal', v.canal)} ${tx('direccion', v.direccion)}`, enlaceContacto(v.contacto_id, quien(v)),
      [resultadoDe(v), v.transferencia === 'sin_respuesta' ? ' · transferencia sin respuesta' : ''].join(''),
      (v.resumen || '').slice(0, 160), el('a', { href: '#conversacion/' + v.id }, 'Ver'),
    ])));
}

async function vistaConversacion(c, id) {
  const v = await api('conversaciones/' + id);
  c.append(el('p', {}, el('a', { href: '#conversaciones' }, '← Conversaciones'), v.contacto_id ? [' · ', el('a', { href: '#contacto/' + v.contacto_id }, 'Ficha del contacto')] : null),
    el('div', { class: 'tarjeta' },
      el('h1', {}, `Conversación ${v.id} · ${tx('canal', v.canal)} ${tx('direccion', v.direccion)}`),
      el('p', {}, `${fecha(v.inicio)} · ${quien(v)}${v.duracion_s ? ' · ' + v.duracion_s + ' s' : ''}`),
      el('p', {}, el('strong', {}, 'Resultado: '), resultadoDe(v) || '—'),
      v.transferencia ? el('p', {}, el('strong', {}, 'Transferencia: '), tx('transferencia', v.transferencia)) : null,
      v.volver_llamar ? el('p', {}, el('strong', {}, 'Pidió que le llamen: '), fecha(v.volver_llamar)) : null,
      el('p', {}, el('strong', {}, 'Resumen: '), v.resumen || '—'),
      v.grabada ? el('p', {}, el('a', { href: `/panel/api/conversaciones/${v.id}/grabacion`, target: '_blank', rel: 'noopener' }, 'Escuchar la grabación')) : null,
      el('section', { class: 'transcripcion' }, v.mensajes.map((m) => el('div', { class: 'msg ' + m.rol }, el('span', { class: 'rol' }, `${tx('rol', m.rol)} · ${fecha(m.ts)}`), el('p', {}, m.texto || '')))),
      el('p', {}, el('a', { href: '/panel/conversacion/' + v.id, target: '_blank', rel: 'noopener' }, 'Versión para imprimir'))));
}

let buscarContacto = '';
async function vistaContactos(c) {
  const q = el('input', { type: 'search', placeholder: 'Nombre, empresa, teléfono o correo', value: buscarContacto });
  const lista = await api('contactos?limite=300' + (buscarContacto ? '&q=' + encodeURIComponent(buscarContacto) : ''));
  c.append(el('h1', {}, 'Contactos'),
    el('form', { class: 'tarjeta filtros', onsubmit: (e) => { e.preventDefault(); buscarContacto = q.value.trim(); irA('contactos'); } },
      el('label', { class: 'ancho' }, 'Buscar', q),
      el('div', { class: 'botones ancho' }, el('button', { type: 'submit' }, 'Buscar'),
        el('a', { class: 'boton secundario', href: '/panel/api/exportar/contactos' + (buscarContacto ? '?q=' + encodeURIComponent(buscarContacto) : ''), download: '' }, 'Exportar contactos (CSV)'),
        el('a', { class: 'boton secundario', href: '/panel/api/exportar/sin-base-legal', download: '' }, 'Sin base legal: escribir por correo o LinkedIn (CSV)'))),
    tabla(['Contacto', 'Teléfono', 'Correo', 'Base legal', 'Última actividad', ''], lista.map((x) => [
      enlaceContacto(x.id, quien(x)), x.telefono, x.email, [tx('base', x.base_legal || ''), x.de_baja ? ' · de baja' : ''].join(''), fecha(x.ultima || x.actualizado), el('a', { href: '#contacto/' + x.id }, 'Ficha'),
    ])));
}

async function vistaContacto(c, id) {
  const f = await api('contactos/' + id), k = f.contacto, salida = el('div');
  const dato = (t, v) => (v ? el('p', {}, el('strong', {}, t + ': '), v) : null);
  const bInv = el('button', { type: 'button', disabled: !k.email || !f.atalaya, title: !f.atalaya ? 'Configure ATALAYA_URL e INTEGRACION_TOKEN' : !k.email ? 'El contacto no tiene correo' : null,
    onclick: () => conBoton(bInv, salida, async () => {
      const r = await api(`contactos/${id}/invitar`, {});
      if (!r.ok) throw new Error(r.motivo || 'Atalaya no ha aceptado la invitación');
      vaciar(salida).append(el('p', { class: 'ok', role: 'status' }, r.enlace ? 'Invitación creada. Atalaya no tiene correo configurado: envíele este enlace: ' : `Invitación enviada a ${k.email}.`, r.enlace ? el('a', { href: r.enlace, target: '_blank', rel: 'noopener' }, r.enlace) : null));
    }) }, 'Invitar a Atalaya');
  const bBaja = el('button', { type: 'button', class: 'secundario', disabled: f.deBaja, onclick: () => {
    if (!confirm('¿Dar de baja a este contacto? No se le volverá a llamar ni a escribir con fines comerciales.')) return;
    conBoton(bBaja, salida, async () => { const r = await api(`contactos/${id}/baja`, { motivo: 'baja desde la ficha del panel' }); mensaje(salida, 'Baja registrada. ' + r.hubspot); irA('contacto', id); });
  } }, f.deBaja ? 'Dado de baja' : 'Dar de baja');
  c.append(el('p', {}, el('a', { href: '#contactos' }, '← Contactos')),
    el('div', { class: 'tarjeta' }, el('h1', {}, quien(k)),
      f.deBaja ? el('p', { class: 'aviso' }, 'Pidió la baja de comunicaciones comerciales: no se le llama ni se le escribe por ningún canal.') : null,
      dato('Cargo', k.cargo), dato('Teléfono', k.telefono), dato('Correo', k.email), dato('Base legal', [tx('base', k.base_legal || ''), k.base_legal_detalle, k.base_legal_fecha].filter(Boolean).join(' · ')),
      dato('Tipo de línea', tx('linea', k.tipo_linea)), dato('Consentimiento para WhatsApp', k.consentimiento_whatsapp), dato('Origen', k.origen), dato('Notas', k.notas),
      f.hubspot ? el('p', {}, el('strong', {}, 'HubSpot: '), f.hubspot.enlace ? el('a', { href: f.hubspot.enlace, target: '_blank', rel: 'noopener' }, 'Abrir la ficha en HubSpot') : `id ${f.hubspot.id}`) : dato('HubSpot', 'sin ficha todavía'),
      el('div', { class: 'botones' }, bInv, bBaja),
      !f.atalaya ? el('p', { class: 'suave' }, 'Para invitar a Atalaya hay que configurar ATALAYA_URL e INTEGRACION_TOKEN (vea Integraciones).') : !k.email ? el('p', { class: 'suave' }, 'Para invitar a Atalaya hace falta el correo del contacto.') : null, salida),
    el('h2', {}, 'Cronología'),
    f.cronologia.length ? el('ol', { class: 'cronologia' }, f.cronologia.map((x) => el('li', { class: 'tarjeta ' + x.tipo },
      el('p', {}, el('span', { class: 'suave' }, fecha(x.ts) + ' · '), el('strong', {}, x.titulo)),
      x.detalle ? el('p', {}, x.detalle) : null,
      x.conversacionId && x.tipo === 'conversacion' ? el('p', {}, el('a', { href: '#conversacion/' + x.conversacionId }, 'Ver la conversación'), x.grabada ? [' · ', el('a', { href: `/panel/api/conversaciones/${x.conversacionId}/grabacion`, target: '_blank', rel: 'noopener' }, 'Grabación')] : null) : null)))
      : el('p', {}, 'Sin actividad todavía.'));
}

async function vistaCampanas(c) {
  const { campanas, bases, prospeccionActiva } = await api('campanas');
  const salida = el('div');
  c.append(el('h1', {}, 'Campañas de prospección'),
    prospeccionActiva ? null : el('p', { class: 'aviso' }, 'La prospección está apagada (PROSPECCION_ACTIVA=no): ninguna campaña hace llamadas aunque esté activa.'),
    el('p', { class: 'aviso' }, 'Solo se llama a contactos con base legal (consentimiento, cliente o relación previa), que no estén de baja ni en la lista Robinson, en el horario configurado y de lunes a viernes de 9:00 a 21:00. A quien no tenga base legal se le escribe por correo o LinkedIn.'));
  c.append(tabla(['Campaña', 'Estado', 'Contactos', ''], campanas.map((k) => [
    el('span', {}, el('strong', {}, k.nombre), el('br'), el('span', { class: 'suave' }, k.dolor || '')), tx('estadoCampana', k.estado),
    Object.entries(k.contactos).map(([e, n]) => `${tx('estadoContacto', e)}: ${n}`).join(' · ') || '0',
    el('a', { href: '#campana/' + k.id }, 'Abrir'),
  ])));
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
  const accion = (texto, ruta) => { const b = el('button', { class: 'secundario', onclick: () => conBoton(b, salida, async () => { const x = await api(`campanas/${id}/${ruta}`, {}); await irA('campana', id); if (x.aviso) mensaje($('#salida-campana'), x.aviso, 'error'); }) }, texto); return b; };
  salida.id = 'salida-campana';
  c.append(el('p', {}, el('a', { href: '#campanas' }, '← Todas las campañas')),
    el('h1', {}, k.nombre),
    k.estado === 'activa' && !r.prospeccionActiva ? el('p', { class: 'aviso' }, 'Esta campaña está activa, pero la prospección está apagada (PROSPECCION_ACTIVA=no): no se hará ninguna llamada hasta encenderla y reiniciar el servidor.') : null,
    el('p', {}, el('strong', {}, 'Estado: '), tx('estadoCampana', k.estado), ' · ', el('strong', {}, 'Abre con: '), k.dolor || '—'),
    el('p', { class: 'suave' }, 'Bases admitidas: ' + [...(k.basesPermitidas || []).map((b) => tx('base', b)), k.permiteInteresLegitimo ? 'Interés legítimo B2B (revisar con abogado)' : null].filter(Boolean).join(', ')),
    el('div', { class: 'botones' }, k.estado === 'activa' ? accion('Pausar', 'pausar') : accion(k.estado === 'pausada' ? 'Reanudar' : 'Activar', 'reanudar'),
      el('a', { class: 'boton secundario', href: '/panel/api/exportar/sin-base-legal?campana=' + id, download: '' }, 'Sin base legal: CSV para correo o LinkedIn')), salida);
  const fichero = el('input', { type: 'file', accept: '.csv,text/csv' }), lista = el('input', { inputmode: 'numeric', placeholder: 'Identificador de la lista' });
  const bi = el('button', { type: 'button' }, 'Importar CSV'), bh = el('button', { type: 'button', class: 'secundario' }, 'Importar lista de HubSpot');
  const informe = (x) => {
    vaciar(salida).append(el('p', { class: 'ok', role: 'status' }, `Importados ${x.importados}, ya estaban ${x.yaEstaban}, sin base legal ${x.sinBaseLegal} (escribirles por correo o LinkedIn), excluidos por baja o Robinson ${x.excluidos}, rechazados ${x.rechazados.length}` + (x.rechazados.length ? ': ' + x.rechazados.slice(0, 10).map((y) => `fila ${y.fila} (${y.motivo})`).join('; ') : '.')));
    if (x.nuncaSeLlamaran?.length) salida.append(el('div', { class: 'aviso' }, el('p', {}, el('strong', {}, `${x.nuncaSeLlamaran.length} contacto${x.nuncaSeLlamaran.length === 1 ? '' : 's'} no se llamará${x.nuncaSeLlamaran.length === 1 ? '' : 'n'} nunca en esta campaña:`)),
      el('ul', {}, x.nuncaSeLlamaran.slice(0, 50).map((y) => el('li', {}, `Fila ${y.fila}: ${y.nombre || y.telefono} · ${y.motivo}`)))));
    if (!r.prospeccionActiva) salida.append(el('p', { class: 'aviso' }, 'Recuerde: la prospección está apagada (PROSPECCION_ACTIVA=no).'));
  };
  bi.addEventListener('click', () => conBoton(bi, salida, async () => { informe(await api(`campanas/${id}/importar`, { csv: await leerFichero(fichero) })); }));
  bh.addEventListener('click', () => conBoton(bh, salida, async () => { informe(await api(`campanas/${id}/hubspot`, { listaId: lista.value.trim() })); }));
  c.append(el('h2', {}, 'Importar contactos'), el('div', { class: 'tarjeta' },
    el('p', { class: 'suave' }, 'CSV con las columnas: telefono, nombre, empresa, cargo, email, base_legal, base_legal_detalle, base_legal_fecha, origen (y, si las tiene, tipo_linea y consentimiento_whatsapp). base_legal: consentimiento, cliente, relacion_previa o interes_legitimo_b2b.'),
    el('label', {}, 'Fichero CSV', fichero), bi, el('hr'), el('label', {}, 'Lista de HubSpot', lista), bh));
  c.append(el('h2', {}, 'Resultados'),
    el('p', {}, r.porEstado.map((x) => `${tx('estadoContacto', x.estado)}: ${x.n}`).join(' · ') || 'Sin contactos.'),
    el('p', { class: 'suave' }, r.porResultado.map((x) => `${tx('resultado', x.resultado)}: ${x.n}`).join(' · ')),
    tabla(['Contacto', 'Teléfono', 'Base legal', 'Estado', 'Intentos', 'Resultado o motivo'], r.contactos.map((x) => [
      enlaceContacto(x.contacto_id, quien(x)), x.telefono, x.base_legal ? tx('base', x.base_legal) : 'Sin base: correo o LinkedIn', tx('estadoContacto', x.estado), x.intentos,
      [x.resultado ? tx('resultado', x.resultado) : '', x.motivo && !T.resultado?.[x.motivo] ? x.motivo : '', x.pedido ? `Llamar el ${fecha(x.pedido)} (pedido)` : ''].filter(Boolean).join(' · '),
    ])));
}

async function vistaBajas(c) {
  const r = await api('bajas'), salida = el('div');
  const tel = el('input', { inputmode: 'tel', placeholder: '+34 600 000 000' }), correo = el('input', { type: 'email', placeholder: 'nombre@empresa.es' }), motivo = el('input');
  const b = el('button', { type: 'submit' }, 'Dar de baja');
  const fichero = el('input', { type: 'file', accept: '.csv,.txt,text/csv,text/plain' }), fechaLista = el('input', { type: 'date' });
  const br = el('button', { type: 'button' }, 'Importar lista Robinson');
  br.addEventListener('click', () => conBoton(br, salida, async () => { const x = await api('robinson', { csv: await leerFichero(fichero), fecha: fechaLista.value || undefined }); mensaje(salida, `Cargados ${x.cargados} números; descartadas ${x.descartados} filas sin teléfono.`); }));
  c.append(el('h1', {}, 'Bajas y lista Robinson'), salida,
    el('h2', {}, 'Lista Robinson'), el('div', { class: 'tarjeta' },
      el('p', {}, `Números cargados: ${r.robinson.n}${r.robinson.fecha ? ' · lista del ' + r.robinson.fecha : ''}`),
      el('p', { class: 'suave' }, 'Descargue la lista del servicio de Adigital (como empresa adherida) y cárguela aquí al menos una vez al mes, antes de cada campaña.'),
      el('label', {}, 'Fichero', fichero), el('label', {}, 'Fecha de la lista', fechaLista), br),
    el('h2', {}, 'Añadir una baja'), el('form', { class: 'tarjeta', onsubmit: (e) => { e.preventDefault(); conBoton(b, salida, async () => { const x = await api('bajas', { telefono: tel.value.trim() || undefined, email: correo.value.trim() || undefined, motivo: motivo.value }); await irA('bajas'); mensaje($('#contenido div'), 'Baja registrada. ' + x.hubspot); }); } },
      el('p', { class: 'suave' }, 'Con el teléfono, el correo o los dos. Una baja por correo bloquea también las llamadas a los teléfonos de ese contacto, y al revés. Llega también a HubSpot.'),
      el('label', {}, 'Teléfono', tel), el('label', {}, 'Correo', correo), el('label', {}, 'Motivo (opcional)', motivo), b),
    el('h2', {}, `Bajas (${r.bajas.length})`),
    tabla(['Teléfono', 'Correo', 'Fecha', 'Canal', 'Motivo'], r.bajas.map((x) => [x.telefono, x.email, fecha(x.ts), tx('canal', x.canal), x.motivo])));
}

async function vistaIntegraciones(c) {
  c.append(el('h1', {}, 'Integraciones'), el('p', { class: 'suave' }, 'Qué está configurado y si responde ahora (cada comprobación espera como mucho 5 segundos).'));
  const sitio = el('div', {}, el('p', {}, 'Comprobando…')); c.append(sitio);
  const { integraciones } = await api('integraciones');
  vaciar(sitio).append(tabla(['Integración', 'Configurada', 'Responde', 'Detalle'], integraciones.map((x) => [
    x.nombre, el('span', { class: x.configurada ? 'ok' : 'suave' }, x.configurada ? 'Sí' : 'No'),
    x.responde === null ? '—' : el('span', { class: x.responde ? 'ok' : 'error' }, x.responde ? 'Sí' : 'No'), x.detalle || '',
  ])));
}

function vistaProbar(c) {
  const chat = el('div', { id: 'chat', 'aria-live': 'polite' }), salida = el('div');
  const texto = el('textarea', { placeholder: 'Escriba como si fuera un cliente por WhatsApp', rows: 3 });
  const b = el('button', { type: 'submit' }, 'Enviar');
  const pinta = (rol, t) => { chat.append(el('div', { class: 'msg ' + rol }, el('span', { class: 'rol' }, tx('rol', rol)), el('p', {}, t))); chat.scrollTop = chat.scrollHeight; };
  const reiniciar = el('button', { type: 'button', class: 'secundario', onclick: () => conBoton(reiniciar, salida, async () => { await api('probar', { reiniciar: true }); vaciar(chat); vaciar(salida); }) }, 'Empezar de nuevo');
  c.append(el('h1', {}, 'Probar el asistente'),
    el('p', { class: 'suave' }, 'Conversación de WhatsApp simulada contra un contacto de prueba. Las herramientas son las reales (agenda, CRM): no confirme reuniones que no quiera reservar.'),
    chat, el('form', { onsubmit: (e) => { e.preventDefault(); const t = texto.value.trim(); if (!t) return; pinta('usuario', t); texto.value = '';
      conBoton(b, salida, async () => { const r = await api('probar', { texto: t }); if (r.herramientas.length) pinta('herramienta', 'Herramientas: ' + r.herramientas.join(', ')); pinta('asistente', r.texto || '(sin texto)'); if (r.terminada) pinta('herramienta', `Conversación cerrada: ${tx('resultado', r.terminada.resultado)}`); }); } },
    el('label', {}, 'Mensaje', texto), el('div', { class: 'botones' }, b, reiniciar)), salida);
}

// ---------- Navegación (con el hash: atrás y adelante funcionan, y los avisos por correo enlazan a la ficha) ----------
const VISTAS = {
  resumen: ['Resumen', vistaResumen], acciones: ['Requiere acción', vistaAcciones], conversaciones: ['Conversaciones', vistaConversaciones],
  contactos: ['Contactos', vistaContactos], campanas: ['Campañas', vistaCampanas], bajas: ['Bajas y Robinson', vistaBajas],
  integraciones: ['Integraciones', vistaIntegraciones], probar: ['Probar', vistaProbar],
  conversacion: [null, vistaConversacion, 'conversaciones'], contacto: [null, vistaContacto, 'contactos'], campana: [null, vistaCampana, 'campanas'],
};
let pendientes = null;
async function pintar() {
  const [vista, arg] = (location.hash.slice(1) || 'resumen').split('/');
  const v = VISTAS[vista] ? vista : 'resumen';
  const nav = vaciar($('#pestanas'));
  for (const [k, [t]] of Object.entries(VISTAS)) {
    if (!t) continue;
    nav.append(el('a', { href: '#' + k, 'aria-current': k === v || VISTAS[v][2] === k ? 'page' : null }, t, k === 'acciones' && pendientes ? el('span', { class: 'contador' }, String(pendientes)) : null));
  }
  const c = vaciar($('#contenido'));
  try { await VISTAS[v][1](c, arg); } catch (err) { c.append(el('p', { class: 'error' }, err.message)); }
}
function irA(vista, arg) {
  const h = '#' + vista + (arg !== undefined && arg !== null ? '/' + arg : '');
  if (location.hash === h) return pintar();
  location.hash = h; // dispara hashchange → pintar
  return Promise.resolve();
}
window.addEventListener('hashchange', pintar);
Promise.all([api('textos').then((t) => { T = t; }).catch(() => {}), api('resumen').then((r) => { pendientes = r.requiereAccion; }).catch(() => {})]).then(pintar);
