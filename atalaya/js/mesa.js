/* Atalaya 360° · Mesa de trabajo
   Un solo sitio para organizar todo el trabajo que sale del ecosistema (inversión, sistema estratégico, personas)
   y el que el empresario apunta: pensar, priorizar y proteger el tiempo.
   · Hoy: imperativas (sí o sí), importantes, seguimientos agrupados, repetitivas, horario, logros y cierre del día.
   · Bandeja: todas las tareas con fecha de entrada y fecha de acción; trae el trabajo de los otros mundos.
   · Prioridades 20/80: impacto frente a esfuerzo y el 20 % de tareas que concentra el resultado.
   · Agenda: semana con horas reservadas, semana ideal protegida y exportación al calendario.
   · Metas SMART: de objetivo a meta que depende solo de quien la ejecuta, con beneficio, pros y contras,
     obstáculos y plan de acción que baja a la bandeja.
   · Repetitivas y semana ideal · Reuniones y delegación. */
(function () {
  const A = window.Atalaya, M = A.mesa;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const P = () => A.platform;
  let ST = null, tab = 'hoy', dia = M.hoy(), semana0 = null, metaSel = null, reuSel = null, delSel = null, filtro = { estado: 'pendiente', mundo: 'todos' };
  const guardar = (() => { let t; return () => { clearTimeout(t); t = setTimeout(() => M.guardarYa(ST), 500); }; })();

  /* ---------- Fechas ---------- */
  const D = (s) => new Date(s + 'T12:00:00');
  const iso = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
  const sumar = (s, n) => { const d = D(s); d.setDate(d.getDate() + n); return iso(d); };
  const lunes = (s) => { const d = D(s); const w = (d.getDay() + 6) % 7; d.setDate(d.getDate() - w); return iso(d); };
  const dow = (s) => ((D(s).getDay() + 6) % 7) + 1; // 1 lunes … 7 domingo
  const DIAS = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  const fLarga = (s) => D(s).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  const fCorta = (s) => (s ? D(s).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) : '—');
  const hm = (min) => `${Math.floor(min / 60)} h${min % 60 ? ' ' + (min % 60) + ' min' : ''}`;
  const aMin = (h) => { const [a, b] = String(h || '0:0').split(':').map(Number); return a * 60 + (b || 0); };
  const deMin = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  const laborable = (s) => { let x = s; do { x = sumar(x, 1); } while (dow(x) > 5); return x; };

  const AREAS = ['Finanzas', 'Comercial', 'Operaciones', 'Personas', 'Inversión', 'Estrategia', 'Dirección', 'Personal'];
  const TIPOS = { imperativa: 'Imperativa', importante: 'Importante', seguimiento: 'Llamada o seguimiento', delegada: 'Delegada' };
  const MUNDOS = { manual: 'Apuntada aquí', simulador: 'Simulador de inversión', estrategia: 'Sistema estratégico', personas: 'Personas y equipos', meta: 'Meta SMART', reunion: 'Reunión', delegacion: 'Delegación', intervencion: 'Auditoría integral' };
  const pend = () => ST.tareas.filter((t) => t.estado !== 'hecha');
  const tarea = (id) => ST.tareas.find((t) => t.id === id);
  const score = (t) => (+t.impacto || 3) * 2 - (+t.esfuerzo || 3) + (t.clave ? 3 : 0);

  /* ---------- Repetitivas: ¿toca hoy? ---------- */
  const toca = (r, s) => {
    const d = D(s), w = dow(s), dm = d.getDate(), m = d.getMonth() + 1;
    if (r.freq === 'diaria') return r.finde ? true : w <= 5;
    if (r.freq === 'semanal') return (r.dias || [1]).includes(w);
    if (r.freq === 'mensual') return dm === (+r.dia || 1);
    if (r.freq === 'trimestral') return dm === (+r.dia || 1) && (m - (+r.mes || 1) + 12) % 3 === 0;
    if (r.freq === 'anual') return dm === (+r.dia || 1) && m === (+r.mes || 1);
    return false;
  };
  const repDe = (s) => ST.repetitivas.filter((r) => toca(r, s));

  /* ---------- Componentes ---------- */
  const chip = (t, cls) => `<span class="ms-chip ${cls || ''}">${esc(t)}</span>`;
  const filaTarea = (t, opts) => {
    opts = opts || {};
    const tarde = t.estado !== 'hecha' && t.fecha && t.fecha < M.hoy();
    return `<li class="ms-t ${t.estado === 'hecha' ? 'hecha' : ''} ${t.clave ? 'clave' : ''}" data-id="${t.id}">
      <input type="checkbox" class="ms-ok" ${t.estado === 'hecha' ? 'checked' : ''} aria-label="Hecha">
      <div class="ms-tx"><b>${t.clave ? '★ ' : ''}${esc(t.t)}</b><small>${[t.area, t.mundo && t.mundo !== 'manual' ? MUNDOS[t.mundo] : null, t.contacto, t.delegadoA ? 'delegada en ' + t.delegadoA : null, t.resp].filter(Boolean).map(esc).join(' · ')}${tarde ? ' · <em class="tarde">atrasada desde el ' + fCorta(t.fecha) + '</em>' : ''}</small></div>
      <span class="ms-dur">${t.hora ? esc(t.hora) + ' · ' : ''}${t.dur ? t.dur + ' min' : ''}</span>
      <span class="ms-acc">${opts.manana ? '<button class="icon-btn" data-man title="Pasar al siguiente día laborable" aria-label="Al siguiente día">→</button>' : ''}<button class="icon-btn" data-ed title="Editar, reservar hora o convertir en meta" aria-label="Editar">✎</button></span></li>`;
  };
  const wireTareas = (host) => {
    $$('.ms-t', host).forEach((li) => {
      const t = tarea(li.dataset.id); if (!t) return;
      $('.ms-ok', li).onchange = (e) => { t.estado = e.target.checked ? 'hecha' : 'pendiente'; t.hecha = e.target.checked ? M.hoy() : null; if (t.metaId) syncMeta(t); guardar(); render(); };
      const mn = $('[data-man]', li); if (mn) mn.onclick = () => { t.fecha = laborable(t.fecha || dia); t.hora = ''; guardar(); render(); };
      $('[data-ed]', li).onclick = () => editar(t);
    });
  };
  const syncMeta = (t) => { const m = ST.metas.find((x) => x.id === t.metaId); if (!m) return; const a = (m.acciones || []).find((x) => x.tareaId === t.id); if (a) a.hecha = t.estado === 'hecha' ? M.hoy() : ''; };

  /* Ventana de edición de una tarea: fecha, hora, duración, tipo, prioridad y conversión en meta */
  const editar = (t) => {
    const back = document.createElement('div'); back.className = 'ef-back';
    back.innerHTML = `<div class="ef-card glass pad stack ms-ed" role="dialog" aria-modal="true" aria-label="Editar tarea">
      <div class="row"><div class="eyebrow">Tarea</div><span class="spacer"></span><button class="btn ghost small" data-x>Cerrar</button></div>
      <textarea class="input" rows="2" data-f="t">${esc(t.t)}</textarea>
      <div class="ms-g3"><label class="small">Fecha de acción<input class="input" type="date" data-f="fecha" value="${esc(t.fecha || '')}"></label><label class="small">Hora reservada<input class="input" type="time" data-f="hora" value="${esc(t.hora || '')}" step="900"></label><label class="small">Duración (min)<input class="input" type="number" min="5" step="5" data-f="dur" value="${esc(t.dur || 30)}"></label></div>
      <div class="ms-g3"><label class="small">Tipo<select class="input" data-f="tipo">${Object.keys(TIPOS).map((k) => `<option value="${k}" ${t.tipo === k ? 'selected' : ''}>${TIPOS[k]}</option>`).join('')}</select></label><label class="small">Área<select class="input" data-f="area"><option value="">—</option>${AREAS.map((a) => `<option ${t.area === a ? 'selected' : ''}>${a}</option>`).join('')}</select></label><label class="small">Contacto o grupo<input class="input" data-f="contacto" value="${esc(t.contacto || '')}" placeholder="Cliente, proveedor, equipo…"></label></div>
      <div class="ms-g3"><label class="small">Impacto en resultados<select class="input" data-f="impacto">${[1, 2, 3, 4, 5].map((v) => `<option value="${v}" ${+t.impacto === v ? 'selected' : ''}>${v} · ${['muy bajo', 'bajo', 'medio', 'alto', 'muy alto'][v - 1]}</option>`).join('')}</select></label><label class="small">Esfuerzo<select class="input" data-f="esfuerzo">${[1, 2, 3, 4, 5].map((v) => `<option value="${v}" ${+t.esfuerzo === v ? 'selected' : ''}>${v} · ${['muy bajo', 'bajo', 'medio', 'alto', 'muy alto'][v - 1]}</option>`).join('')}</select></label><label class="small ms-inl"><input type="checkbox" data-f="clave" ${t.clave ? 'checked' : ''}> Actividad clave (de las del 20 % que dan el 80 % del resultado)</label></div>
      ${t.origen ? `<p class="small muted" style="margin:0">Origen: ${esc(t.origen)}</p>` : ''}
      <div class="row"><button class="btn solid" data-ok>Guardar</button><button class="btn" data-meta>Convertir en meta SMART</button>${t.fecha && t.hora ? `<a class="btn ghost" target="_blank" rel="noopener" href="${gcal(t)}">Añadir a Google Calendar</a>` : ''}<span class="spacer"></span><button class="btn ghost" data-del>Borrar</button></div></div>`;
    document.body.appendChild(back);
    const close = () => back.remove();
    back.onclick = (e) => { if (e.target === back) close(); };
    $('[data-x]', back).onclick = close;
    const leer = () => { $$('[data-f]', back).forEach((i) => { const k = i.dataset.f; t[k] = i.type === 'checkbox' ? i.checked : ['impacto', 'esfuerzo', 'dur'].includes(k) ? +i.value || 0 : i.value; }); };
    $('[data-ok]', back).onclick = () => { leer(); guardar(); close(); render(); };
    $('[data-meta]', back).onclick = () => { leer(); const m = nuevaMeta({ objetivo: t.t, area: t.area, desde: t.id }); t.metaId = m.id; guardar(); close(); tab = 'metas'; metaSel = m.id; render(); };
    $('[data-del]', back).onclick = () => { ST.tareas = ST.tareas.filter((x) => x !== t); guardar(); close(); render(); };
    back.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
    $('textarea', back).focus();
  };
  const gcal = (t) => { const s = (t.fecha + 'T' + t.hora).replace(/[-:]/g, ''), e = new Date(D(t.fecha).setHours(...t.hora.split(':').map(Number)) + (t.dur || 30) * 6e4); const f = iso(e).replace(/-/g, '') + 'T' + String(e.getHours()).padStart(2, '0') + String(e.getMinutes()).padStart(2, '0'); return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(t.t)}&dates=${s}00/${f}00&details=${encodeURIComponent('Desde la mesa de trabajo de Atalaya 360°' + (t.origen ? ' · ' + t.origen : ''))}`; };
  const ics = (lista, nombre) => {
    const z = (n) => String(n).padStart(2, '0');
    const fmt = (s, h, mas) => { const d = D(s); const [a, b] = h.split(':').map(Number); d.setHours(a, b + (mas || 0), 0, 0); return `${d.getFullYear()}${z(d.getMonth() + 1)}${z(d.getDate())}T${z(d.getHours())}${z(d.getMinutes())}00`; };
    const ev = lista.map((t) => `BEGIN:VEVENT\r\nUID:${t.id}@atalaya360\r\nDTSTAMP:${fmt(M.hoy(), '00:00')}\r\nDTSTART:${fmt(t.fecha, t.hora)}\r\nDTEND:${fmt(t.fecha, t.hora, t.dur || 30)}\r\nSUMMARY:${String(t.t).replace(/[,;\n]/g, ' ')}\r\nEND:VEVENT`).join('\r\n');
    const txt = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Business Avance//Atalaya 360//ES\r\n${ev}\r\nEND:VCALENDAR`;
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([txt], { type: 'text/calendar' })); a.download = nombre + '.ics'; document.body.appendChild(a); a.click(); setTimeout(() => a.remove(), 100);
  };

  /* ---------- HOY ---------- */
  const vHoy = (host) => {
    const del = ST.tareas.filter((t) => t.fecha === dia);
    const imp = del.filter((t) => t.tipo === 'imperativa'), im2 = del.filter((t) => t.tipo === 'importante' || !t.tipo), seg = del.filter((t) => t.tipo === 'seguimiento'), dl = del.filter((t) => t.tipo === 'delegada');
    const minImp = imp.filter((t) => t.estado !== 'hecha').reduce((a, t) => a + (+t.dur || 30), 0);
    const largas = imp.filter((t) => (+t.dur || 30) > 60);
    const reps = repDe(dia), hechasRep = (r) => !!(r.hechas && r.hechas[dia]);
    const atras = pend().filter((t) => t.fecha && t.fecha < dia);
    const grupos = {}; seg.forEach((t) => (grupos[t.contacto || 'Sin agrupar'] = grupos[t.contacto || 'Sin agrupar'] || []).push(t));
    const logros = ST.logros[dia] || '';
    host.innerHTML = `<div class="glass pad row ms-dia"><button class="btn ghost small" data-d="-1">←</button><div><div class="eyebrow">${dia === M.hoy() ? 'Hoy' : 'Día'}</div><h2 class="ms-fecha">${esc(fLarga(dia))}</h2></div><button class="btn ghost small" data-d="1">→</button>${dia !== M.hoy() ? '<button class="btn ghost small" data-d="0">Volver a hoy</button>' : ''}<span class="spacer"></span><button class="btn solid" id="msCerrar">Cerrar el día</button></div>
      <div class="glass pad row ms-add"><input class="input" id="msNueva" placeholder="Apunte una tarea para este día…" autocomplete="off"><select class="input" id="msTipo">${Object.keys(TIPOS).filter((k) => k !== 'delegada').map((k) => `<option value="${k}">${TIPOS[k]}</option>`).join('')}</select><input class="input" type="number" id="msDur" value="30" min="5" step="5" aria-label="Minutos"><button class="btn solid" id="msAdd">Añadir</button></div>
      ${atras.length ? `<div class="alert warn row"><span>${atras.length} tarea${atras.length > 1 ? 's' : ''} atrasada${atras.length > 1 ? 's' : ''} de días anteriores.</span><span class="spacer"></span><button class="btn small" id="msTraer">Traerlas a este día</button></div>` : ''}
      <div class="grid ms-two"><div class="stack">
        <section class="glass pad stack"><div class="row"><div class="eyebrow">Imperativas · sí o sí hoy</div><span class="spacer"></span>${chip(hm(minImp) + ' de 4 h', minImp > 240 ? 'stop' : minImp > 180 ? 'warn' : 'ok')}</div>
          ${imp.length ? `<ul class="ms-list">${imp.map((t) => filaTarea(t, { manana: true })).join('')}</ul>` : '<p class="small muted">Elija las pocas cosas que hará hoy pase lo que pase. Cada una de una hora como mucho y, entre todas, no más de cuatro horas.</p>'}
          ${minImp > 240 ? '<p class="small ms-aviso">Más de cuatro horas de imperativas: no es realista. Pase alguna a importante o a otro día.</p>' : ''}${largas.length ? `<p class="small ms-aviso">${largas.length} imperativa${largas.length > 1 ? 's' : ''} de más de una hora: divídala${largas.length > 1 ? 's' : ''} en partes.</p>` : ''}</section>
        <section class="glass pad stack"><div class="eyebrow">Importantes</div>${im2.length ? `<ul class="ms-list">${im2.map((t) => filaTarea(t, { manana: true })).join('')}</ul>` : '<p class="small muted">Lo que conviene hacer hoy si queda tiempo después de las imperativas.</p>'}</section>
        <section class="glass pad stack"><div class="eyebrow">Llamadas y seguimientos, agrupados</div>${seg.length ? Object.keys(grupos).map((g) => `<h4 class="ms-g">${esc(g)}</h4><ul class="ms-list">${grupos[g].map((t) => filaTarea(t, { manana: true })).join('')}</ul>`).join('') : '<p class="small muted">Agrupe las llamadas y mensajes por cliente, proveedor o equipo y hágalos en un solo bloque: menos interrupciones.</p>'}${dl.length ? `<div class="eyebrow">Delegadas: revisar hoy</div><ul class="ms-list">${dl.map((t) => filaTarea(t)).join('')}</ul>` : ''}</section>
      </div><div class="stack">
        <section class="glass pad stack"><div class="eyebrow">Horario</div>${horario(dia)}</section>
        <section class="glass pad stack"><div class="eyebrow">Repetitivas de hoy</div>${reps.length ? `<ul class="ms-list">${reps.map((r) => `<li class="ms-t ${hechasRep(r) ? 'hecha' : ''} ${r.clave ? 'clave' : ''}"><input type="checkbox" data-rep="${r.id}" ${hechasRep(r) ? 'checked' : ''}><div class="ms-tx"><b>${r.clave ? '★ ' : ''}${esc(r.t)}</b><small>${esc(FREQ[r.freq])}${r.area ? ' · ' + esc(r.area) : ''}</small></div><span class="ms-dur">${r.hora ? esc(r.hora) : ''}</span></li>`).join('')}</ul>` : '<p class="small muted">Defina en «Repetitivas» lo que hay que hacer cada día, semana o mes, para que no se olvide ni se convierta en imprevisto.</p>'}</section>
        <section class="glass pad stack"><div class="eyebrow">Logros de hoy</div><textarea class="input" id="msLogros" rows="4" placeholder="Lo conseguido hoy, aunque sea pequeño">${esc(logros)}</textarea></section>
      </div></div>`;
    $$('[data-d]', host).forEach((b) => (b.onclick = () => { const n = +b.dataset.d; dia = n ? sumar(dia, n) : M.hoy(); render(); }));
    const add = () => { const v = $('#msNueva', host).value.trim(); if (!v) return; ST.tareas.push({ id: M.uid(), t: v, entrada: M.hoy(), fecha: dia, tipo: $('#msTipo', host).value, dur: +$('#msDur', host).value || 30, estado: 'pendiente', impacto: 3, esfuerzo: 3, mundo: 'manual' }); guardar(); render(); setTimeout(() => { const i = $('#msNueva'); if (i) i.focus(); }, 20); };
    $('#msAdd', host).onclick = add; $('#msNueva', host).onkeydown = (e) => { if (e.key === 'Enter') add(); };
    const tr = $('#msTraer', host); if (tr) tr.onclick = () => { atras.forEach((t) => { t.fecha = dia; }); guardar(); render(); };
    $$('[data-rep]', host).forEach((c) => (c.onchange = () => { const r = ST.repetitivas.find((x) => x.id === c.dataset.rep); r.hechas = r.hechas || {}; if (c.checked) r.hechas[dia] = true; else delete r.hechas[dia]; guardar(); render(); }));
    $('#msLogros', host).oninput = (e) => { ST.logros[dia] = e.target.value; guardar(); };
    $('#msCerrar', host).onclick = () => {
      const quedan = del.filter((t) => t.estado !== 'hecha'), sig = laborable(dia);
      quedan.forEach((t) => { t.fecha = sig; t.hora = ''; t.aplazada = (t.aplazada || 0) + 1; });
      guardar(); render();
      const n = quedan.length, rep = quedan.filter((t) => t.aplazada >= 2).length;
      toast(n ? `Día cerrado. ${n} tarea${n > 1 ? 's pasan' : ' pasa'} al ${fLarga(sig)}.${rep ? ` ${rep} ya se ha${rep > 1 ? 'n' : ''} aplazado dos veces: decida si dividirla${rep > 1 ? 's' : ''}, delegarla${rep > 1 ? 's' : ''} o quitarla${rep > 1 ? 's' : ''}.` : ''}` : 'Día cerrado: todo hecho.');
    };
    wireTareas(host);
  };
  /* Horario del día: horas reservadas y bloques de la semana ideal */
  const horario = (s) => {
    const ini = 7 * 60, fin = 21 * 60, px = 0.9;
    const res = ST.tareas.filter((t) => t.fecha === s && t.hora).map((t) => ({ a: aMin(t.hora), d: +t.dur || 30, t: t.t, cls: t.clave ? 'clave' : t.estado === 'hecha' ? 'hecha' : '' }));
    const ideal = ST.semana.filter((b) => +b.dia === dow(s)).map((b) => ({ a: aMin(b.desde), d: Math.max(15, aMin(b.hasta) - aMin(b.desde)), t: b.t, cls: 'ideal ' + (b.tipo || '') }));
    const reps = repDe(s).filter((r) => r.hora).map((r) => ({ a: aMin(r.hora), d: +r.dur || 30, t: r.t, cls: 'rep' }));
    const all = ideal.concat(reps, res).filter((x) => x.a >= ini && x.a < fin);
    return `<div class="ms-hor" style="height:${(fin - ini) * px}px">${Array.from({ length: (fin - ini) / 60 }, (_, i) => `<span class="ms-h" style="top:${i * 60 * px}px">${String(7 + i).padStart(2, '0')}:00</span>`).join('')}${all.map((x) => `<div class="ms-blk ${x.cls}" style="top:${(x.a - ini) * px}px;height:${Math.max(16, x.d * px - 2)}px" title="${esc(x.t)}">${esc(deMin(x.a))} ${esc(x.t)}</div>`).join('')}</div>`;
  };

  /* ---------- BANDEJA ---------- */
  const vBandeja = (host) => {
    const l = ST.tareas.filter((t) => (filtro.estado === 'todas' || (filtro.estado === 'hecha' ? t.estado === 'hecha' : t.estado !== 'hecha')) && (filtro.mundo === 'todos' || (t.mundo || 'manual') === filtro.mundo)).sort((a, b) => (a.fecha || '9999').localeCompare(b.fecha || '9999') || score(b) - score(a));
    host.innerHTML = `<div class="glass pad stack"><p style="margin:0">Todo lo que hay que hacer, en un solo sitio: lo que apunte aquí y lo que sale del simulador, del sistema estratégico y de personas y equipos. Ponga a cada tarea una <b>fecha de acción</b>: cada día elegirá entre las que tocan, sin releer toda la lista.</p>
        <div class="row ms-add"><input class="input" id="msNueva" placeholder="Nueva tarea…" autocomplete="off"><select class="input" id="msArea"><option value="">Área</option>${AREAS.map((a) => `<option>${a}</option>`).join('')}</select><input class="input" type="date" id="msF"><button class="btn solid" id="msAdd">Apuntar</button><span class="spacer"></span><button class="btn" id="msImp">Traer el trabajo del ecosistema</button></div><p class="small muted" id="msImpMsg" style="margin:0"></p></div>
      <div class="glass pad stack"><div class="row ms-fil"><span class="small muted">Ver</span>${[['pendiente', 'Pendientes'], ['hecha', 'Hechas'], ['todas', 'Todas']].map(([k, n]) => `<button class="chip" aria-pressed="${filtro.estado === k}" data-fe="${k}">${n}</button>`).join('')}<span class="ms-sep"></span>${[['todos', 'Todos los orígenes']].concat(Object.entries(MUNDOS).slice(0, 5)).map(([k, n]) => `<button class="chip" aria-pressed="${filtro.mundo === k}" data-fm="${k}">${n}</button>`).join('')}</div>
        ${l.length ? `<div class="table-wrap"><table class="ms-tab"><thead><tr><th>Entrada</th><th style="text-align:left">Tarea</th><th>Fecha de acción</th><th>Tipo</th><th title="Actividad clave">★</th><th>Impacto</th><th>Esfuerzo</th><th></th></tr></thead><tbody>${l.map((t) => `<tr data-id="${t.id}" class="${t.estado === 'hecha' ? 'hecha' : ''}"><td class="small">${fCorta(t.entrada)}</td><td style="text-align:left"><b>${esc(t.t)}</b><br><small class="muted">${[t.area, t.mundo && t.mundo !== 'manual' ? MUNDOS[t.mundo] : '', t.origen].filter(Boolean).map(esc).join(' · ')}</small></td><td><input class="input" type="date" data-k="fecha" value="${esc(t.fecha || '')}"></td><td><select class="input" data-k="tipo">${Object.keys(TIPOS).map((k) => `<option value="${k}" ${t.tipo === k ? 'selected' : ''}>${TIPOS[k]}</option>`).join('')}</select></td><td><input type="checkbox" data-k="clave" ${t.clave ? 'checked' : ''} aria-label="Actividad clave"></td><td><select class="input ms-n" data-k="impacto">${[1, 2, 3, 4, 5].map((v) => `<option ${+t.impacto === v ? 'selected' : ''}>${v}</option>`).join('')}</select></td><td><select class="input ms-n" data-k="esfuerzo">${[1, 2, 3, 4, 5].map((v) => `<option ${+t.esfuerzo === v ? 'selected' : ''}>${v}</option>`).join('')}</select></td><td class="ms-act"><button class="btn ghost small" data-ed>Editar</button><button class="btn ghost small" data-ok>${t.estado === 'hecha' ? 'Reabrir' : 'Hecha'}</button></td></tr>`).join('')}</tbody></table></div>` : '<p class="muted small">No hay tareas con este filtro.</p>'}</div>`;
    const add = () => { const v = $('#msNueva', host).value.trim(); if (!v) return; ST.tareas.push({ id: M.uid(), t: v, entrada: M.hoy(), fecha: $('#msF', host).value || '', area: $('#msArea', host).value, tipo: 'importante', estado: 'pendiente', impacto: 3, esfuerzo: 3, mundo: 'manual' }); guardar(); render(); setTimeout(() => { const i = $('#msNueva'); if (i) i.focus(); }, 20); };
    $('#msAdd', host).onclick = add; $('#msNueva', host).onkeydown = (e) => { if (e.key === 'Enter') add(); };
    $('#msImp', host).onclick = async () => { const n = await importar(); $('#msImpMsg').textContent = n ? `${n} tarea${n > 1 ? 's' : ''} nueva${n > 1 ? 's' : ''} traída${n > 1 ? 's' : ''} de los otros mundos.` : 'No hay trabajo nuevo en los otros mundos.'; if (n) setTimeout(render, 900); };
    $$('[data-fe]', host).forEach((b) => (b.onclick = () => { filtro.estado = b.dataset.fe; render(); }));
    $$('[data-fm]', host).forEach((b) => (b.onclick = () => { filtro.mundo = b.dataset.fm; render(); }));
    $$('tr[data-id]', host).forEach((tr) => {
      const t = tarea(tr.dataset.id);
      $$('[data-k]', tr).forEach((i) => (i.onchange = () => { const k = i.dataset.k; t[k] = i.type === 'checkbox' ? i.checked : ['impacto', 'esfuerzo'].includes(k) ? +i.value : i.value; guardar(); }));
      $('[data-ed]', tr).onclick = () => editar(t);
      $('[data-ok]', tr).onclick = () => { t.estado = t.estado === 'hecha' ? 'pendiente' : 'hecha'; t.hecha = t.estado === 'hecha' ? M.hoy() : null; if (t.metaId) syncMeta(t); guardar(); render(); };
    });
  };
  /* Trae el trabajo guardado en los otros mundos de la empresa activa */
  const importar = async () => {
    const items = [];
    const loc = (k) => { try { return JSON.parse(localStorage.getItem(P() && P().k ? P().k(k) : k)); } catch (e) { return null; } };
    const est = (P() && (await P().loadData('estrategia'))) || loc('atalaya.estrategia.v1');
    if (est && est.plan && Array.isArray(est.plan.acciones)) est.plan.acciones.filter((a) => a.accion && a.estado !== 'Hecha').forEach((a) => items.push({ t: a.accion, area: a.area, resp: a.responsable, fecha: a.fin || '', mundo: 'estrategia', origen: 'Plan de empresa', oid: 'est:plan:' + a.accion, impacto: 4 }));
    if (est && est.c360) Object.keys(est.c360).forEach((mod) => (est.c360[mod].obj || []).filter((o) => o.meta !== '' && o.meta != null).forEach((o) => items.push({ t: `Objetivo: ${o.dir === 'bajar' ? 'bajar' : 'subir'} «${o.k}» de ${o.actual} a ${o.meta}${o.u ? ' ' + o.u : ''}`, area: 'Estrategia', fecha: o.fecha || '', mundo: 'estrategia', origen: 'Objetivo del módulo ' + mod + ' · conviértalo en meta SMART', oid: 'est:obj:' + mod + ':' + o.k, impacto: 5 })));
    const per = P() && P().puede && P().puede('personas') && ((await P().loadData('personas')) || loc('atalaya.personas.v1'));
    if (per && Array.isArray(per.personas)) per.personas.forEach((c) => (c.tareas || []).filter((t) => t.acuerdo && t.acuerdo.revision).forEach((t) => { const jefe = per.personas.find((x) => x.id === c.responsable); items.push({ t: `Revisar el acuerdo de liderazgo con ${c.nombre} en «${t.nombre}»`, area: 'Personas', fecha: t.acuerdo.revision, resp: jefe ? jefe.nombre : '', mundo: 'personas', origen: 'Liderazgo a medida', oid: 'per:acu:' + c.id + ':' + t.id, impacto: 3, tipo: 'seguimiento', contacto: 'Equipo' }); }));
    const n0 = ST.tareas.length;
    items.forEach((x) => { if (!ST.tareas.some((y) => y.oid === x.oid)) ST.tareas.push(Object.assign({ id: M.uid(), entrada: M.hoy(), tipo: 'importante', estado: 'pendiente', esfuerzo: 3, clave: false }, x)); });
    guardar();
    return ST.tareas.length - n0;
  };

  /* ---------- PRIORIDADES 20/80 ---------- */
  const vPrior = (host) => {
    const l = pend(), cuad = { ya: [], plan: [], agrupar: [], cuestionar: [] };
    l.forEach((t) => { const ai = +t.impacto >= 4 || t.clave, ae = +t.esfuerzo >= 4; cuad[ai ? (ae ? 'plan' : 'ya') : (ae ? 'cuestionar' : 'agrupar')].push(t); });
    const top = l.slice().sort((a, b) => score(b) - score(a)).slice(0, Math.max(1, Math.ceil(l.length * 0.2)));
    const w0 = lunes(M.hoy()), sem = ST.tareas.filter((t) => t.hora && t.fecha >= w0 && t.fecha <= sumar(w0, 6));
    const minT = sem.reduce((a, t) => a + (+t.dur || 30), 0), minC = sem.filter((t) => t.clave).reduce((a, t) => a + (+t.dur || 30), 0);
    const Q = (k, t, d, cls) => `<div class="ms-q ${cls}"><b>${t}</b><small>${d}</small><ul>${cuad[k].slice(0, 8).map((x) => `<li data-id="${x.id}">${esc(x.t)}</li>`).join('') || '<li class="muted">—</li>'}</ul>${cuad[k].length > 8 ? `<small>y ${cuad[k].length - 8} más</small>` : ''}</div>`;
    host.innerHTML = `<div class="grid ms-two"><div class="glass pad stack"><div class="eyebrow">Su 20 %</div><p style="margin:0">El 20 % de las tareas suele dar el 80 % del resultado. Estas son las <b>${top.length}</b> de mayor impacto y menor esfuerzo, más las que ha marcado como actividad clave. Protéjalas en la agenda antes que nada.</p>
          <ol class="ms-top">${top.map((t) => `<li data-id="${t.id}"><span><b>${esc(t.t)}</b><small>${[t.area, 'impacto ' + t.impacto, 'esfuerzo ' + t.esfuerzo].filter(Boolean).map(esc).join(' · ')}${t.fecha ? ' · ' + fCorta(t.fecha) : ' · sin fecha'}${t.hora ? ' a las ' + esc(t.hora) : ''}</small></span><button class="btn small" data-res>${t.hora ? 'Cambiar hora' : 'Reservar hora'}</button></li>`).join('') || '<li class="muted">Sin tareas pendientes.</li>'}</ol></div>
        <div class="glass pad stack"><div class="eyebrow">Su tiempo esta semana</div>${A.heroMundo ? '' : ''}
          <div class="ms-kp"><div><span>Horas reservadas</span><b>${hm(minT)}</b></div><div><span>En actividades clave</span><b>${minT ? Math.round((minC / minT) * 100) : 0} %</b></div><div><span>Pendientes</span><b>${l.length}</b></div><div><span>Atrasadas</span><b>${l.filter((t) => t.fecha && t.fecha < M.hoy()).length}</b></div></div>
          <p class="small muted" style="margin:0">Una pauta útil: reservar cada día entre dos y tres horas para las actividades clave y las metas, y llevar las peticiones de los demás a los huecos libres, no encima de ellas.</p></div></div>
      <div class="glass pad stack"><div class="eyebrow">Impacto frente a esfuerzo</div><div class="ms-mat">${Q('ya', 'Hacer ya', 'Mucho impacto, poco esfuerzo', 'ya')}${Q('plan', 'Planificar y proteger', 'Mucho impacto, mucho esfuerzo: dividir y reservar tiempo', 'plan')}${Q('agrupar', 'Agrupar o delegar', 'Poco impacto, poco esfuerzo: en bloque o a otra persona', 'agrupar')}${Q('cuestionar', 'Cuestionar', 'Poco impacto, mucho esfuerzo: ¿hace falta?', 'cuestionar')}</div><p class="small muted" style="margin:0">Cambie el impacto y el esfuerzo de cada tarea en la bandeja o al editarla. Toque una tarea para editarla.</p></div>`;
    $$('[data-id]', host).forEach((li) => { const t = tarea(li.dataset.id); if (!t) return; const b = $('[data-res]', li); if (b) b.onclick = (e) => { e.stopPropagation(); editar(t); }; else li.onclick = () => editar(t); });
  };

  /* ---------- AGENDA SEMANAL ---------- */
  const vAgenda = (host) => {
    semana0 = semana0 || lunes(M.hoy());
    const dias = Array.from({ length: 7 }, (_, i) => sumar(semana0, i)), ini = 7 * 60, fin = 21 * 60, px = 0.8;
    const sinHora = pend().filter((t) => t.fecha && t.fecha >= semana0 && t.fecha <= dias[6] && !t.hora);
    const col = (s) => {
      const res = ST.tareas.filter((t) => t.fecha === s && t.hora).map((t) => ({ id: t.id, a: aMin(t.hora), d: +t.dur || 30, t: t.t, cls: (t.clave ? 'clave ' : '') + (t.estado === 'hecha' ? 'hecha' : '') }));
      const ideal = ST.semana.filter((b) => +b.dia === dow(s)).map((b) => ({ a: aMin(b.desde), d: Math.max(15, aMin(b.hasta) - aMin(b.desde)), t: b.t, cls: 'ideal ' + (b.tipo || '') }));
      const reps = repDe(s).filter((r) => r.hora).map((r) => ({ a: aMin(r.hora), d: +r.dur || 30, t: r.t, cls: 'rep' }));
      return `<div class="ms-col ${s === M.hoy() ? 'hoy' : ''}" data-s="${s}" style="height:${(fin - ini) * px}px">${ideal.concat(reps, res).filter((x) => x.a >= ini && x.a < fin).map((x) => `<div class="ms-blk ${x.cls}" ${x.id ? `data-id="${x.id}"` : ''} style="top:${(x.a - ini) * px}px;height:${Math.max(14, x.d * px - 2)}px" title="${esc(deMin(x.a) + ' ' + x.t)}">${esc(deMin(x.a))} ${esc(x.t)}</div>`).join('')}</div>`;
    };
    host.innerHTML = `<div class="glass pad row"><button class="btn ghost small" data-w="-7">←</button><div><div class="eyebrow">Semana</div><h2 class="ms-fecha">${fCorta(dias[0])} – ${fCorta(dias[6])}</h2></div><button class="btn ghost small" data-w="7">→</button><button class="btn ghost small" data-w="0">Esta semana</button><span class="spacer"></span><button class="btn" id="msIcs">Exportar al calendario (.ics)</button></div>
      <div class="glass pad"><div class="ms-sem"><div class="ms-hcol" style="height:${(fin - ini) * px}px">${Array.from({ length: (fin - ini) / 60 }, (_, i) => `<span style="top:${i * 60 * px}px">${String(7 + i).padStart(2, '0')}</span>`).join('')}</div>${dias.map((s) => `<div class="ms-dcol"><div class="ms-dh ${s === M.hoy() ? 'hoy' : ''}">${DIAS[dow(s)].slice(0, 3)} ${D(s).getDate()}</div>${col(s)}</div>`).join('')}</div>
        <p class="small muted" style="margin:6px 0 0">Toque un hueco para reservar tiempo a una tarea. En color suave, la semana ideal protegida; con estrella dorada, las actividades clave.</p></div>
      ${sinHora.length ? `<div class="glass pad stack"><div class="eyebrow">Con fecha esta semana, sin hora reservada</div><ul class="ms-list">${sinHora.map((t) => filaTarea(t)).join('')}</ul></div>` : ''}`;
    $$('[data-w]', host).forEach((b) => (b.onclick = () => { const n = +b.dataset.w; semana0 = n ? sumar(semana0, n) : lunes(M.hoy()); render(); }));
    $('#msIcs', host).onclick = () => { const l = ST.tareas.filter((t) => t.hora && t.fecha >= semana0 && t.fecha <= dias[6]); if (!l.length) return toast('No hay horas reservadas esta semana.'); ics(l, 'atalaya-semana-' + semana0); };
    $$('.ms-col', host).forEach((c) => (c.onclick = (e) => {
      const b = e.target.closest('.ms-blk[data-id]'); if (b) return editar(tarea(b.dataset.id));
      const r = c.getBoundingClientRect(), m = Math.round(((e.clientY - r.top) / px + ini) / 15) * 15;
      reservar(c.dataset.s, deMin(Math.min(fin - 30, Math.max(ini, m))));
    }));
    wireTareas(host);
  };
  const reservar = (s, h) => {
    const l = pend().sort((a, b) => score(b) - score(a)).slice(0, 40);
    const back = document.createElement('div'); back.className = 'ef-back';
    back.innerHTML = `<div class="ef-card glass pad stack ms-ed" role="dialog" aria-modal="true" aria-label="Reservar tiempo"><div class="row"><div><div class="eyebrow">Reservar tiempo</div><h3 style="margin:4px 0 0">${esc(fLarga(s))} · ${esc(h)}</h3></div><span class="spacer"></span><button class="btn ghost small" data-x>Cerrar</button></div>
      <label class="small">Tarea pendiente<select class="input" id="rsT"><option value="">— nueva tarea —</option>${l.map((t) => `<option value="${t.id}">${t.clave ? '★ ' : ''}${esc(t.t)}</option>`).join('')}</select></label>
      <input class="input" id="rsN" placeholder="O escriba una nueva"><div class="ms-g3"><label class="small">Hora<input class="input" type="time" id="rsH" value="${h}" step="900"></label><label class="small">Duración (min)<input class="input" type="number" id="rsD" value="60" min="15" step="15"></label></div>
      <div class="row"><button class="btn solid" data-ok>Reservar</button></div></div>`;
    document.body.appendChild(back);
    const close = () => back.remove(); back.onclick = (e) => { if (e.target === back) close(); }; $('[data-x]', back).onclick = close;
    $('[data-ok]', back).onclick = () => { const id = $('#rsT', back).value, nv = $('#rsN', back).value.trim(); let t = id && tarea(id); if (!t) { if (!nv) return; t = { id: M.uid(), t: nv, entrada: M.hoy(), tipo: 'importante', estado: 'pendiente', impacto: 3, esfuerzo: 3, mundo: 'manual' }; ST.tareas.push(t); } t.fecha = s; t.hora = $('#rsH', back).value; t.dur = +$('#rsD', back).value || 60; guardar(); close(); render(); };
  };

  /* ---------- METAS SMART ---------- */
  const TERCEROS = /\b(que (el|la|los|las|mis?|nuestr[oa]s?|su|sus)\b[^.]{0,60}\b(compre|compren|pague|paguen|acepte|acepten|apruebe|aprueben|firme|firmen|contrate|contraten|llame|llamen|responda|respondan|decida|decidan|baje|bajen|suba|suban|conceda|concedan|vuelva|vuelvan|elija|elijan)|conseguir que|lograr que|hacer que|si (el|la|los|las) |depende de|esperar a|a la espera de|cuando (el|la|los|las) |el banco|los bancos|el cliente|los clientes|el proveedor|los proveedores|la administración|hacienda|el mercado|el gobierno)/i;
  const nuevaMeta = (o) => { const m = Object.assign({ id: M.uid(), creada: M.hoy(), area: '', objetivo: '', especifica: '', indicador: '', actual: '', valor: '', unidad: '', fecha: '', responsable: '', medios: false, solo: false, beneficio: '', beneficios: '', perdidas: '', pros: '', contras: '', obstaculos: [{ o: '', s: '' }], acciones: [{ t: '', fecha: '', revisada: '', hecha: '' }], seguimiento: '', valores: '', merece: '', afirmacion: '', prioridad: ST.metas.length + 1, plazo: 'corto', tangible: true, estado: 'activa' }, o || {}); ST.metas.push(m); return m; };
  const smart = (m) => {
    const txt = [m.especifica].concat((m.acciones || []).map((a) => a.t)).join(' . ');
    const terc = TERCEROS.exec(txt);
    const num = (v) => v !== '' && v != null && isFinite(+String(v).replace(',', '.'));
    const verbo = /^\s*(\w+?)(ar|er|ir)(se|lo|la|le)?\b/i.test(m.especifica || '');
    const sube = num(m.actual) && num(m.valor) && +m.actual > 0 ? Math.abs(+String(m.valor).replace(',', '.') / +String(m.actual).replace(',', '.') - 1) : null;
    const resp = String(m.responsable || '').trim();
    const varios = /,| y | e |\/|equipo|todos|departamento/i.test(resp);
    return [
      { k: 'S', n: 'Específica', ok: (m.especifica || '').trim().split(/\s+/).length >= 5 && verbo, h: verbo ? 'Escríbala en al menos cinco palabras: qué hará exactamente.' : 'Empiece por un verbo de acción suyo: «hacer», «llamar», «revisar», «presentar»…' },
      { k: 'M', n: 'Medible', ok: !!(m.indicador || '').trim() && num(m.valor), h: 'Indique con qué indicador se mide y el valor que quiere alcanzar (un número).' },
      { k: 'A', n: 'Alcanzable y aplicable', ok: !!m.medios && !(sube != null && sube > 1), warn: sube != null && sube > 1, h: sube != null && sube > 1 ? 'Supone más del doble del valor actual: compruebe que es realista o divídala en metas más pequeñas.' : 'Confirme que tiene los medios, el tiempo y las capacidades para hacerla.' },
      { k: 'R', n: 'Rentable y realista', ok: !!(m.beneficio || '').trim() && m.merece === 'si', h: 'Escriba qué gana con ella (en euros o en tiempo, si puede) y confirme que merece el tiempo, el esfuerzo y el dinero.' },
      { k: 'T', n: 'En el tiempo', ok: !!m.fecha && m.fecha >= M.hoy(), h: m.fecha && m.fecha < M.hoy() ? 'La fecha límite ya ha pasado.' : 'Ponga una fecha límite.' },
      { k: '★', n: 'Depende solo de quien la ejecuta', ok: !!resp && !varios && !terc && !!m.solo, h: terc ? `Depende de un tercero («${terc[0].trim()}»). Reescríbala en lo que usted hace: en lugar de «que el cliente compre», «hacer ocho visitas de venta a la semana».` : !resp ? 'Indique una sola persona responsable.' : varios ? 'Una meta tiene una sola persona responsable, no un equipo ni varias personas.' : 'Confirme que su cumplimiento depende solo de quien la ejecuta.' }
    ];
  };
  /* Número fijo de cada meta (META-01, META-02…) para reconocerla en listas, informes y la nota */
  const numMeta = (m) => { if (!m.num) { m.num = ST.metas.reduce((a, x) => Math.max(a, +x.num || 0), 0) + 1; guardar(); } return 'META-' + String(m.num).padStart(2, '0'); };
  /* La meta en una frase: quién, qué, cuánto, cuándo y para qué */
  const frase = (m) => {
    const q = (m.especifica || m.objetivo || '').trim().replace(/[.\s]+$/, ''); if (!q) return '';
    const n = (v) => String(v || '').trim();
    return `${n(m.responsable) ? n(m.responsable) + ' va a ' : ''}${n(m.responsable) ? q.charAt(0).toLowerCase() + q.slice(1) : q}${n(m.valor) && !(q.includes(n(m.valor)) && !n(m.actual)) ? `, ${n(m.actual) ? 'pasando de ' + n(m.actual) + ' a ' : 'hasta '}${n(m.valor)} ${n(m.unidad)}${n(m.indicador) && !q.toLowerCase().includes(n(m.indicador).toLowerCase()) && !n(m.indicador).toLowerCase().includes(n(m.unidad).toLowerCase()) ? ' (' + n(m.indicador).toLowerCase() + ')' : ''}` : ''}${m.fecha ? ', antes del ' + fCorta(m.fecha) + ' de ' + m.fecha.slice(0, 4) : ''}${n(m.beneficio) ? ', para ' + n(m.beneficio).charAt(0).toLowerCase() + n(m.beneficio).slice(1).replace(/[.\s]+$/, '') : ''}.`;
  };
  /* Semáforo del beneficio: claro y cuantificado, con pros y contras pesados y confirmación de que compensa */
  const CUANT = /\d[\d.,]*\s*(€|eur|euros|k€|mil|millones|%|horas?|h\b|d[ií]as?|semanas?|meses|minutos|clientes|pedidos|unidades|visitas|puntos)/i;
  const evalBeneficio = (m) => {
    const b = (m.beneficio || '').trim(), tips = [];
    if (!b) return { st: 'stop', t: 'Sin beneficio definido', tips: ['Escriba qué gana la empresa si la cumple, en euros, en horas o en clientes.'] };
    if (m.merece === 'no' || m.valores === 'no') return { st: 'stop', t: m.merece === 'no' ? 'Usted mismo dice que no compensa' : 'No encaja con sus valores', tips: ['Replantee la meta o descártela: el tiempo que le dedique lo quita de su 20 %.'] };
    const cuant = CUANT.test(b) || CUANT.test(m.beneficios || '');
    if (!cuant) tips.push('Cuantifique el beneficio: «40.000 € más de venta al año», «6 horas a la semana liberadas».');
    if (!(m.pros || '').trim()) tips.push('Anote los pros de ejecutarla.');
    if (!(m.contras || '').trim()) tips.push('Anote los contras: tiempo, dinero y renuncias. Sin ellos no se puede pesar si compensa.');
    if (m.merece !== 'si') tips.push('Confirme si merece el tiempo, el esfuerzo y el dinero.');
    const ok = cuant && (m.pros || '').trim() && (m.contras || '').trim() && m.merece === 'si';
    return ok ? { st: 'ok', t: 'Beneficio claro y pesado frente a los costes', tips } : { st: 'warn', t: cuant ? 'Beneficio cuantificado, falta pesarlo' : 'Beneficio poco concreto', tips };
  };
  /* Mejorar la definición: con Claude si está disponible (servidor o visor); si no, con reglas propias */
  const ia = async (prompt) => {
    if (A.ia) { const v = await A.ia.asegurar('Mejorar la definición de la meta'); return v ? A.ia.texto(prompt, { page: 'mesa' }) : null; }
    const Pl = P();
    try { await Pl.ready; if (Pl.mode === 'server' && Pl.serverInfo && Pl.serverInfo.ia) { const r = await Pl.api('/chat', { method: 'POST', body: JSON.stringify({ messages: [{ role: 'user', content: prompt }], tools: [], page: 'mesa' }) }); const t = (r.content || []).filter((x) => x.type === 'text').map((x) => x.text).join('\n'); if (t) return t; } } catch (e) { /* sin servidor */ }
    try { if (window.claude && window.claude.use) { const sm = await window.claude.use('sample'); if (sm) { const r = await sm([{ role: 'user', content: prompt }]); if (r && r.text) return r.text; } } } catch (e) { /* sin permiso */ }
    return null;
  };
  const VERBOS = { ventas: 'hacer', clientes: 'visitar', llamadas: 'hacer', ofertas: 'presentar', visitas: 'hacer', horas: 'dedicar', reuniones: 'celebrar' };
  const mejorarReglas = (m) => {
    const s = smart(m), cambios = [], prop = {};
    let q = (m.especifica || m.objetivo || '').trim();
    const terc = TERCEROS.exec(q);
    const u0 = (m.unidad || '').toLowerCase(), vb = Object.keys(VERBOS).find((k) => u0.includes(k));
    const periodo = (m.indicador || '').toLowerCase().match(/(por|a la|al|cada)\s+(dia|día|semana|mes|trimestre|año)/);
    if (terc) {
      cambios.push(`«${q}» depende de otros. Escriba lo que hará usted para provocarlo: por ejemplo, «presentar 10 ofertas a clientes actuales cada mes».`);
      // Con la cifra y la unidad se puede reescribir en lo que hace la persona
      if (m.valor && m.unidad) { prop.especifica = `${(vb ? VERBOS[vb] : 'hacer').replace(/^./, (c) => c.toUpperCase())} ${m.valor} ${m.unidad}${periodo ? ' ' + periodo[0] : ''}${/client/i.test(q + ' ' + (m.objetivo || '')) && !/client/i.test(m.unidad) ? ' a clientes' : ''}`; q = ''; }
    }
    if (q && !/^\s*\w+?(ar|er|ir)(se|lo|la|le)?\b/i.test(q)) { const u = (m.unidad || '').toLowerCase(); const v = Object.keys(VERBOS).find((k) => u.includes(k)); q = (v ? VERBOS[v] : 'conseguir') + ' ' + q.charAt(0).toLowerCase() + q.slice(1); prop.especifica = q.charAt(0).toUpperCase() + q.slice(1); cambios.push('Empiece por un verbo de acción suyo.'); }
    if (q && m.valor && m.unidad && !q.includes(String(m.valor))) { prop.especifica = (prop.especifica || q).replace(/[.\s]+$/, '') + ` (${m.valor} ${m.unidad}${m.indicador && /semana|mes|dia|día/i.test(m.indicador) ? ' ' + m.indicador.toLowerCase().replace(/^.*?(por|a la|al|cada)\s/, 'por ') : ''})`; cambios.push('Incluya la cifra en la propia frase de la meta.'); }
    s.filter((y) => !y.ok && y.k !== '★').forEach((y) => cambios.push(y.n + ': ' + y.h));
    return { prop, cambios };
  };
  const proponer = async (host, m) => {
    const box = $('#msProp', host); box.innerHTML = '<p class="small muted" style="margin:0">Analizando la meta…</p>';
    const r = mejorarReglas(m);
    let txt = null;
    const prompt = `Eres consultor de pymes. Mejora la definición de esta meta para que sea SMART (específica, medible, alcanzable, rentable y con fecha) y dependa solo de quien la ejecuta, sin depender de clientes, bancos ni terceros. Devuelve solo JSON: {"especifica": "frase que empieza por un verbo de acción de la persona", "indicador": "...", "valor": "número", "unidad": "...", "beneficio": "beneficio cuantificado si se puede", "motivo": "en una frase, qué has cambiado y por qué"}.\nMeta actual: ${JSON.stringify({ objetivo: m.objetivo, especifica: m.especifica, indicador: m.indicador, actual: m.actual, valor: m.valor, unidad: m.unidad, fecha: m.fecha, responsable: m.responsable, beneficio: m.beneficio, pros: m.pros, contras: m.contras })}`;
    try { txt = await ia(prompt); } catch (e) { txt = null; }
    let j = null; if (txt) { try { j = JSON.parse(txt.slice(txt.indexOf('{'), txt.lastIndexOf('}') + 1)); } catch (e) { j = null; } }
    const prop = j ? Object.fromEntries(['especifica', 'indicador', 'valor', 'unidad', 'beneficio'].filter((k) => j[k] && String(j[k]).trim() && String(j[k]) !== String(m[k] || '')).map((k) => [k, String(j[k]).trim()])) : r.prop;
    const nombres = { especifica: 'Qué hará', indicador: 'Indicador', valor: 'Valor meta', unidad: 'Unidad', beneficio: 'Beneficio' };
    box.innerHTML = `<div class="ms-propc"><div class="eyebrow">${j ? 'Propuesta de redacción (con Claude)' : 'Cómo mejorarla'}</div>
      ${j && j.motivo ? `<p class="small" style="margin:0">${esc(j.motivo)}</p>` : ''}
      ${Object.keys(prop).length ? `<table class="ms-tab"><tbody>${Object.keys(prop).map((k) => `<tr><td style="text-align:left;width:120px" class="small muted">${nombres[k]}</td><td style="text-align:left"><s class="muted small">${esc(m[k] || '—')}</s><br><b>${esc(prop[k])}</b></td></tr>`).join('')}</tbody></table><div class="row"><button class="btn solid small" id="msUsar">Usar esta redacción</button><button class="btn ghost small" id="msDescartar">Descartar</button></div>` : ''}
      ${!j && r.cambios.length ? `<ul class="small" style="margin:0;padding-left:18px">${r.cambios.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>` : ''}
      ${!j && !r.cambios.length && !Object.keys(prop).length ? '<p class="small" style="margin:0">La meta ya está bien definida.</p>' : ''}
      ${!j ? '<p class="small muted" style="margin:0">Con el servidor de Atalaya y Claude conectados, la propuesta de redacción se escribe automáticamente.</p>' : ''}</div>`;
    const u = $('#msUsar', box); if (u) u.onclick = () => { Object.assign(m, prop); guardar(); render(); toast('Redacción actualizada. Revise que sigue diciendo lo que usted quiere.'); };
    const dsc = $('#msDescartar', box); if (dsc) dsc.onclick = () => { box.innerHTML = ''; };
  };
  const vMetas = (host) => {
    const m = metaSel && ST.metas.find((x) => x.id === metaSel);
    if (!m) {
      const l = ST.metas.slice().sort((a, b) => (a.estado === 'cumplida') - (b.estado === 'cumplida') || (+a.prioridad || 99) - (+b.prioridad || 99));
      host.innerHTML = `<div class="glass pad stack"><p style="margin:0">Un <b>objetivo</b> dice a dónde quiere llegar («aumentar la facturación un 5 %»); una <b>meta</b> es un paso concreto que depende de usted y le acerca («hacer ocho visitas a clientes actuales cada semana»). Aquí cada objetivo se convierte en metas <b>SMART</b>: específicas, medibles, alcanzables, rentables y con fecha, y que dependen <b>solo de quien las ejecuta</b>. Cada meta baja a un plan de acción que llega a su bandeja.</p><div class="row"><button class="btn solid" id="msNM">Nueva meta</button></div></div>
        ${l.length ? `<div class="glass pad stack"><div class="eyebrow">Lista de metas prioritarias</div><div class="table-wrap"><table class="ms-tab"><thead><tr><th>Prioridad</th><th>Meta n.º</th><th style="text-align:left">Meta</th><th>Área</th><th>Fecha</th><th>Plazo</th><th>SMART</th><th>Beneficio</th><th>Avance</th><th></th></tr></thead><tbody>${l.map((x) => { const s = smart(x), ok = s.filter((y) => y.ok).length, ac = (x.acciones || []).filter((a) => a.t), hechas = ac.filter((a) => a.hecha).length; return `<tr data-m="${x.id}" class="${x.estado === 'cumplida' ? 'hecha' : ''}"><td><input class="input ms-n" type="number" min="1" data-p value="${esc(x.prioridad)}"></td><td class="ms-mid">${numMeta(x)}</td><td style="text-align:left"><b>${esc(x.especifica || x.objetivo || 'Meta sin definir')}</b><br><small class="muted">${esc(x.objetivo && x.especifica ? 'Objetivo: ' + x.objetivo : '')}</small></td><td>${esc(x.area || '—')}</td><td>${fCorta(x.fecha)}</td><td>${x.plazo === 'largo' ? 'Largo' : 'Corto'} · ${x.tangible ? 'tangible' : 'intangible'}</td><td><span class="ms-smart">${s.map((y) => `<i class="${y.ok ? 'ok' : y.warn ? 'warn' : ''}" title="${esc(y.n)}">${y.k}</i>`).join('')}</span><small class="muted"> ${ok}/6</small></td><td>${(() => { const eb = evalBeneficio(x); return `<span class="ms-luz ${eb.st}" title="${esc(eb.t)}"></span>`; })()}</td><td>${ac.length ? `${hechas}/${ac.length}` : '—'}</td><td><button class="btn small" data-ab>Abrir</button></td></tr>`; }).join('')}</tbody></table></div></div>` : ''}`;
      $('#msNM', host).onclick = () => { const x = nuevaMeta(); metaSel = x.id; guardar(); render(); };
      $$('tr[data-m]', host).forEach((tr) => { const x = ST.metas.find((y) => y.id === tr.dataset.m); $('[data-ab]', tr).onclick = () => { metaSel = x.id; render(); }; $('[data-p]', tr).onchange = (e) => { x.prioridad = +e.target.value; guardar(); }; });
      return;
    }
    const s = smart(m), listo = s.every((y) => y.ok), eb = evalBeneficio(m);
    const campo = (k, t, ph, rows) => `<label class="small">${t}${rows ? `<textarea class="input" rows="${rows}" data-f="${k}" placeholder="${esc(ph || '')}">${esc(m[k] || '')}</textarea>` : `<input class="input" data-f="${k}" value="${esc(m[k] || '')}" placeholder="${esc(ph || '')}">`}</label>`;
    host.innerHTML = `<div class="glass pad row"><button class="btn ghost small" id="msVolver">← Lista de metas</button><span class="spacer"></span>${listo ? chip('Meta SMART lista', 'ok') : chip(`${s.filter((y) => y.ok).length} de 6 criterios`, 'warn')}<button class="btn" id="msBajar">Pasar el plan de acción a la bandeja</button><button class="btn ghost small" id="msCumplida">${m.estado === 'cumplida' ? 'Reabrir' : 'Marcar como cumplida'}</button><button class="btn ghost small" id="msBorrar">Borrar</button></div>
      <section class="glass pad ms-ficha"><div class="ms-fid"><small>Meta n.º</small><b>${numMeta(m)}</b><span class="ms-luz ${eb.st}" title="Beneficio: ${esc(eb.t)}"></span></div>
        <div class="ms-ftx"><div class="eyebrow">La meta en una frase</div><p class="ms-frase">${esc(frase(m)) || '<span class="muted">Escriba qué va a hacer, con qué cifra, cuándo y para qué: aquí aparecerá la meta completa.</span>'}</p>
          <div class="row ms-fchips">${s.map((y) => `<span class="ms-chip ${y.ok ? 'ok' : y.warn ? 'warn' : ''}" title="${esc(y.n)}">${y.k}</span>`).join('')}<span class="ms-chip ${eb.st}">Beneficio: ${esc(eb.t.toLowerCase())}</span></div></div>
        <div class="ms-fbtns"><button class="btn small" id="msMejorar">Mejorar la definición</button><button class="btn ghost small" id="msEvalB">Evaluar el beneficio</button></div>
        <div id="msProp" class="ms-prop"></div></section>
      <div class="grid ms-meta"><div class="stack">
        <section class="glass pad stack"><div class="eyebrow">1 · De dónde parte</div>
          <div class="ms-g3"><label class="small">Área<select class="input" data-f="area"><option value="">—</option>${AREAS.map((a) => `<option ${m.area === a ? 'selected' : ''}>${a}</option>`).join('')}</select></label><label class="small">Plazo<select class="input" data-f="plazo"><option value="corto" ${m.plazo !== 'largo' ? 'selected' : ''}>Corto plazo</option><option value="largo" ${m.plazo === 'largo' ? 'selected' : ''}>Largo plazo</option></select></label><label class="small">Tipo<select class="input" data-f="tangible"><option value="1" ${m.tangible ? 'selected' : ''}>Tangible</option><option value="0" ${!m.tangible ? 'selected' : ''}>Intangible</option></select></label></div>
          ${campo('objetivo', 'Objetivo general', 'Por ejemplo: aumentar la facturación del próximo año un 5 %')}</section>
        <section class="glass pad stack"><div class="eyebrow">2 · La meta SMART</div>
          ${campo('especifica', 'Qué voy a hacer exactamente (empiece por un verbo de acción suyo)', 'Por ejemplo: hacer ocho visitas de venta a clientes actuales cada semana', 2)}
          <div class="ms-g3">${campo('indicador', 'Indicador', 'Visitas por semana')}${campo('actual', 'Valor actual', '3')}${campo('valor', 'Valor meta', '8')}</div>
          <div class="ms-g3">${campo('unidad', 'Unidad', 'visitas')}<label class="small">Fecha límite<input class="input" type="date" data-f="fecha" value="${esc(m.fecha || '')}"></label>${campo('responsable', 'Responsable (una sola persona)', 'Su nombre')}</div>
          <label class="small ms-inl"><input type="checkbox" data-f="medios" ${m.medios ? 'checked' : ''}> Tengo los medios, el tiempo y las capacidades para hacerla.</label>
          <label class="small ms-inl"><input type="checkbox" data-f="solo" ${m.solo ? 'checked' : ''}> Cumplirla depende solo de mí, no de un cliente, un proveedor, un banco ni otra persona.</label></section>
        <section class="glass pad stack" id="msSecB"><div class="row"><div class="eyebrow">3 · Por qué merece la pena</div><span class="spacer"></span><span class="ms-chip ${eb.st}"><span class="ms-luz ${eb.st}"></span> ${esc(eb.t)}</span></div>
          ${campo('beneficio', 'Beneficio de lograrla (en euros o en tiempo, si puede)', 'Por ejemplo: 40.000 € más de venta al año', 1)}
          <div class="ms-g2">${campo('beneficios', 'Otros beneficios', '', 3)}${campo('perdidas', 'Pérdidas que evita', '', 3)}</div>
          <div class="ms-g2">${campo('pros', 'Pros de ejecutarla', 'Lo que gana la empresa y usted', 3)}${campo('contras', 'Contras de ejecutarla', 'Lo que cuesta: tiempo, dinero, renuncias', 3)}</div>
          <div class="ms-g2"><label class="small">¿Se ajusta a mis valores?<select class="input" data-f="valores"><option value="">—</option><option value="si" ${m.valores === 'si' ? 'selected' : ''}>Sí</option><option value="no" ${m.valores === 'no' ? 'selected' : ''}>No</option></select></label><label class="small">¿Merece el tiempo, el esfuerzo y el dinero?<select class="input" data-f="merece"><option value="">—</option><option value="si" ${m.merece === 'si' ? 'selected' : ''}>Sí</option><option value="no" ${m.merece === 'no' ? 'selected' : ''}>No</option></select></label></div></section>
        <section class="glass pad stack"><div class="eyebrow">4 · Obstáculos y soluciones</div>
          ${(m.obstaculos || []).map((o, i) => `<div class="ms-g2 ms-ob" data-o="${i}"><input class="input" data-ok="o" value="${esc(o.o)}" placeholder="Posible obstáculo"><input class="input" data-ok="s" value="${esc(o.s)}" placeholder="Posible solución"></div>`).join('')}<div class="row"><button class="btn ghost small" id="msOb">Añadir obstáculo</button></div></section>
        <section class="glass pad stack"><div class="eyebrow">5 · Plan de acción</div>
          <div class="table-wrap"><table class="ms-tab"><thead><tr><th style="text-align:left">Acción concreta (suya)</th><th>Fecha límite</th><th>Fecha revisada</th><th>Hecha</th></tr></thead><tbody>${(m.acciones || []).map((a, i) => `<tr data-a="${i}"><td><input class="input" data-ak="t" value="${esc(a.t)}" placeholder="Por ejemplo: preparar la lista de 40 clientes a visitar"></td><td><input class="input" type="date" data-ak="fecha" value="${esc(a.fecha)}"></td><td><input class="input" type="date" data-ak="revisada" value="${esc(a.revisada)}"></td><td style="text-align:center"><input type="checkbox" data-ak="hecha" ${a.hecha ? 'checked' : ''}></td></tr>`).join('')}</tbody></table></div><div class="row"><button class="btn ghost small" id="msAc">Añadir acción</button></div>
          ${campo('seguimiento', 'Cómo mediré el avance', 'Por ejemplo: cada viernes, visitas hechas en la hoja de seguimiento')}</section>
        <section class="glass pad stack"><div class="eyebrow">6 · Afirmación</div>${campo('afirmacion', 'Una frase en positivo y en presente que le recuerde la meta', 'Por ejemplo: «Cada semana visito a ocho clientes y salgo de cada visita con un siguiente paso».', 2)}</section>
      </div>
      <aside class="glass pad stack ms-val"><div class="eyebrow">Comprobación</div>${s.map((y) => `<div class="ms-cr ${y.ok ? 'ok' : y.warn ? 'warn' : ''}"><i>${y.k}</i><div><b>${esc(y.n)}</b>${y.ok ? '' : `<small>${esc(y.h)}</small>`}</div></div>`).join('')}
        ${listo ? '<div class="alert ok">La meta es SMART y depende solo de quien la ejecuta. Pase el plan de acción a la bandeja y reserve tiempo.</div>' : ''}
        <p class="small muted" style="margin:0">Resultado: ${esc(m.especifica || '—')}${m.valor ? ` · de ${esc(m.actual || '?')} a ${esc(m.valor)} ${esc(m.unidad || '')}` : ''}${m.fecha ? ` · antes del ${fCorta(m.fecha)}` : ''}${m.responsable ? ` · ${esc(m.responsable)}` : ''}.</p></aside></div>`;
    $('#msVolver', host).onclick = () => { metaSel = null; render(); };
    $('#msMejorar', host).onclick = () => proponer(host, m);
    $('#msEvalB', host).onclick = async () => {
      const box = $('#msProp', host), e = evalBeneficio(m);
      box.innerHTML = `<div class="ms-propc"><div class="eyebrow">Beneficio de la meta</div><p style="margin:0"><span class="ms-luz ${e.st}"></span> <b>${esc(e.t)}</b></p>${e.tips.length ? `<ul class="small" style="margin:0;padding-left:18px">${e.tips.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : '<p class="small" style="margin:0">Está cuantificado, tiene pros y contras y usted confirma que compensa.</p>'}<p class="small muted" style="margin:0" id="msEvIA"></p></div>`;
      const t = await ia(`Eres consultor de pymes. Evalúa en tres frases, con números si se puede, si este beneficio compensa el esfuerzo de la meta y qué falta para que quede claro. Sin listas ni símbolos. Meta: ${frase(m) || m.objetivo}. Beneficio: ${m.beneficio || '—'}. Otros beneficios: ${m.beneficios || '—'}. Pérdidas que evita: ${m.perdidas || '—'}. Pros: ${m.pros || '—'}. Contras: ${m.contras || '—'}.`).catch(() => null);
      const el = $('#msEvIA', box); if (el && t) { el.classList.remove('muted'); el.textContent = t.trim(); }
    };
    $$('[data-f]', host).forEach((i) => (i.oninput = i.onchange = () => { const k = i.dataset.f; m[k] = i.type === 'checkbox' ? i.checked : k === 'tangible' ? i.value === '1' : i.value; guardar(); if (i.type === 'checkbox' || i.tagName === 'SELECT' || i.type === 'date') render(); else refrescarVal(host, m); }));
    $$('.ms-ob', host).forEach((d) => $$('[data-ok]', d).forEach((i) => (i.oninput = () => { m.obstaculos[+d.dataset.o][i.dataset.ok] = i.value; guardar(); })));
    $('#msOb', host).onclick = () => { m.obstaculos.push({ o: '', s: '' }); guardar(); render(); };
    $$('tr[data-a]', host).forEach((tr) => $$('[data-ak]', tr).forEach((i) => (i.oninput = i.onchange = () => { const a = m.acciones[+tr.dataset.a]; a[i.dataset.ak] = i.type === 'checkbox' ? (i.checked ? M.hoy() : '') : i.value; const t = a.tareaId && tarea(a.tareaId); if (t) { t.t = a.t; t.fecha = a.revisada || a.fecha; t.estado = a.hecha ? 'hecha' : 'pendiente'; } guardar(); refrescarVal(host, m); })));
    $('#msAc', host).onclick = () => { m.acciones.push({ t: '', fecha: '', revisada: '', hecha: '' }); guardar(); render(); };
    $('#msBajar', host).onclick = () => { let n = 0; (m.acciones || []).filter((a) => a.t).forEach((a) => { if (a.tareaId && tarea(a.tareaId)) return; const t = { id: M.uid(), t: a.t, entrada: M.hoy(), fecha: a.revisada || a.fecha || '', tipo: 'importante', estado: a.hecha ? 'hecha' : 'pendiente', impacto: 5, esfuerzo: 3, clave: true, area: m.area, resp: m.responsable, mundo: 'meta', metaId: m.id, origen: 'Meta: ' + (m.especifica || m.objetivo) }; ST.tareas.push(t); a.tareaId = t.id; n++; }); guardar(); toast(n ? `${n} acción${n > 1 ? 'es pasan' : ' pasa'} a la bandeja como actividad clave.` : 'Las acciones ya estaban en la bandeja (o están vacías).'); };
    $('#msCumplida', host).onclick = () => { m.estado = m.estado === 'cumplida' ? 'activa' : 'cumplida'; m.cumplida = m.estado === 'cumplida' ? M.hoy() : ''; guardar(); render(); };
    $('#msBorrar', host).onclick = (e) => { if (!e.target.dataset.ok) { e.target.dataset.ok = 1; e.target.textContent = '¿Seguro? Toque otra vez'; return; } ST.metas = ST.metas.filter((x) => x !== m); metaSel = null; guardar(); render(); };
  };
  const refrescarVal = (host, m) => {
    const fr = $('.ms-frase', host); if (fr) { const t = frase(m); if (t) fr.textContent = t; }
    const eb = evalBeneficio(m); $$('.ms-ficha .ms-luz, #msSecB .ms-luz', host).forEach((x) => (x.className = 'ms-luz ' + eb.st));
    const box = $('.ms-val', host); if (!box) return; const s = smart(m); $$('.ms-cr', box).forEach((d, i) => { d.className = 'ms-cr ' + (s[i].ok ? 'ok' : s[i].warn ? 'warn' : ''); const sm = $('small', d); if (s[i].ok) { if (sm) sm.remove(); } else if (sm) sm.textContent = s[i].h; else d.querySelector('div').insertAdjacentHTML('beforeend', `<small>${esc(s[i].h)}</small>`); }); };

  /* ---------- REPETITIVAS Y SEMANA IDEAL ---------- */
  const FREQ = { diaria: 'Diaria', semanal: 'Semanal', mensual: 'Mensual', trimestral: 'Trimestral', anual: 'Anual' };
  const vRep = (host) => {
    const mes = M.hoy().slice(0, 7);
    host.innerHTML = `<div class="grid ms-two"><section class="glass pad stack"><div class="eyebrow">Tareas repetitivas</div><p class="small" style="margin:0">Lo que hay que hacer con una frecuencia fija. Tenerlo identificado evita olvidos, retrasos e imprevistos. Marque con estrella las que son actividad clave.</p>
        <div class="ms-g3"><input class="input" id="rpT" placeholder="Por ejemplo: revisar la tesorería"><select class="input" id="rpF">${Object.keys(FREQ).map((k) => `<option value="${k}">${FREQ[k]}</option>`).join('')}</select><input class="input" type="time" id="rpH" step="900" aria-label="Hora"></div>
        <div class="ms-g3"><span class="small" id="rpDias">${[1, 2, 3, 4, 5, 6, 7].map((d) => `<label class="ms-inl"><input type="checkbox" value="${d}" ${d === 1 ? 'checked' : ''}>${DIAS[d].slice(0, 2)}</label>`).join('')}</span><label class="small">Día del mes<input class="input" type="number" id="rpD" min="1" max="31" value="1"></label><label class="small">Mes de referencia<input class="input" type="number" id="rpM" min="1" max="12" value="1"></label></div>
        <div class="row"><label class="small ms-inl"><input type="checkbox" id="rpC"> Actividad clave</label><input class="input ms-n" type="number" id="rpDur" value="30" min="5" step="5" aria-label="Minutos"><span class="small muted">min</span><span class="spacer"></span><button class="btn solid" id="rpAdd">Añadir</button></div>
        ${ST.repetitivas.length ? `<div class="table-wrap"><table class="ms-tab"><thead><tr><th style="text-align:left">Tarea</th><th>Frecuencia</th><th>Cuándo</th><th>Hora</th><th>Hechas este mes</th><th></th></tr></thead><tbody>${ST.repetitivas.map((r) => `<tr data-r="${r.id}"><td style="text-align:left">${r.clave ? '★ ' : ''}${esc(r.t)}</td><td>${FREQ[r.freq]}</td><td class="small">${r.freq === 'semanal' ? (r.dias || []).map((d) => DIAS[d].slice(0, 2)).join(' ') : r.freq === 'diaria' ? 'Lunes a viernes' : r.freq === 'mensual' ? 'Día ' + r.dia : 'Día ' + r.dia + ' · mes ' + r.mes}</td><td>${esc(r.hora || '—')}</td><td>${Object.keys(r.hechas || {}).filter((k) => k.startsWith(mes)).length}</td><td><button class="btn ghost small" data-del>Quitar</button></td></tr>`).join('')}</tbody></table></div>` : ''}</section>
      <section class="glass pad stack"><div class="eyebrow">Semana ideal · tiempo protegido</div><p class="small" style="margin:0">Bloquee en la semana los huecos para sus actividades clave, sus metas y sus repetitivas. Cuando alguien le pida tiempo, llévelo a los huecos libres, no encima de estos bloques.</p>
        <div class="ms-g3"><select class="input" id="siD">${[1, 2, 3, 4, 5, 6, 7].map((d) => `<option value="${d}">${DIAS[d]}</option>`).join('')}</select><input class="input" type="time" id="siA" value="09:00" step="900"><input class="input" type="time" id="siB" value="11:00" step="900"></div>
        <div class="ms-g3"><input class="input" id="siT" placeholder="Por ejemplo: actividades clave comerciales"><select class="input" id="siTipo"><option value="clave">Actividades clave</option><option value="metas">Metas</option><option value="rep">Repetitivas</option><option value="reuniones">Reuniones y llamadas</option><option value="personal">Personal</option></select><button class="btn solid" id="siAdd">Bloquear</button></div>
        <label class="small ms-inl"><input type="checkbox" id="siTodos"> Repetir de lunes a viernes</label>
        ${ST.semana.length ? `<ul class="ms-list">${ST.semana.slice().sort((a, b) => a.dia - b.dia || a.desde.localeCompare(b.desde)).map((b) => `<li class="ms-t" data-b="${b.id}"><div class="ms-tx"><b>${esc(DIAS[b.dia])} · ${esc(b.desde)}–${esc(b.hasta)}</b><small>${esc(b.t)} · ${esc({ clave: 'actividades clave', metas: 'metas', rep: 'repetitivas', reuniones: 'reuniones y llamadas', personal: 'personal' }[b.tipo] || '')}</small></div><span class="ms-acc"><button class="icon-btn" data-del aria-label="Quitar">×</button></span></li>`).join('')}</ul>` : ''}</section></div>`;
    $('#rpAdd', host).onclick = () => { const t = $('#rpT', host).value.trim(); if (!t) return; ST.repetitivas.push({ id: M.uid(), t, freq: $('#rpF', host).value, hora: $('#rpH', host).value, dias: $$('#rpDias input', host).filter((c) => c.checked).map((c) => +c.value), dia: +$('#rpD', host).value || 1, mes: +$('#rpM', host).value || 1, clave: $('#rpC', host).checked, dur: +$('#rpDur', host).value || 30, hechas: {} }); guardar(); render(); };
    $$('tr[data-r] [data-del]', host).forEach((b) => (b.onclick = () => { ST.repetitivas = ST.repetitivas.filter((r) => r.id !== b.closest('tr').dataset.r); guardar(); render(); }));
    $('#siAdd', host).onclick = () => { const t = $('#siT', host).value.trim() || $('#siTipo', host).selectedOptions[0].text; const ds = $('#siTodos', host).checked ? [1, 2, 3, 4, 5] : [+$('#siD', host).value]; ds.forEach((d) => ST.semana.push({ id: M.uid(), dia: d, desde: $('#siA', host).value, hasta: $('#siB', host).value, t, tipo: $('#siTipo', host).value })); guardar(); render(); };
    $$('li[data-b] [data-del]', host).forEach((b) => (b.onclick = () => { ST.semana = ST.semana.filter((x) => x.id !== b.closest('li').dataset.b); guardar(); render(); }));
  };

  /* ---------- REUNIONES Y DELEGACIÓN ---------- */
  const vReu = (host) => {
    const r = reuSel && ST.reuniones.find((x) => x.id === reuSel), d = delSel && ST.delegaciones.find((x) => x.id === delSel);
    const fila = (cls, campos, i) => `<tr data-${cls}="${i}">${campos}</tr>`;
    host.innerHTML = `<div class="grid ms-two"><section class="glass pad stack"><div class="row"><div class="eyebrow">Reuniones</div><span class="spacer"></span><button class="btn small" id="reNew">Nueva reunión</button></div>
        <p class="small" style="margin:0">Orden del día antes, acta con acciones después. Las acciones del acta pasan a la bandeja de cada responsable.</p>
        ${ST.reuniones.length ? `<div class="row ms-fil">${ST.reuniones.map((x) => `<button class="chip" aria-pressed="${x.id === reuSel}" data-re="${x.id}">${esc(x.titulo || 'Reunión')} · ${fCorta(x.fecha)}</button>`).join('')}</div>` : ''}
        ${r ? `<div class="ms-g2"><label class="small">Título<input class="input" data-rf="titulo" value="${esc(r.titulo)}"></label><label class="small">Lugar<input class="input" data-rf="lugar" value="${esc(r.lugar || '')}"></label></div>
          <div class="ms-g3"><label class="small">Fecha<input class="input" type="date" data-rf="fecha" value="${esc(r.fecha || '')}"></label><label class="small">Hora<input class="input" type="time" data-rf="hora" value="${esc(r.hora || '')}" step="900"></label><label class="small">Duración (min)<input class="input" type="number" data-rf="dur" value="${esc(r.dur || 60)}" step="15"></label></div>
          <label class="small">Propósito<input class="input" data-rf="proposito" value="${esc(r.proposito || '')}" placeholder="Qué tiene que quedar decidido al salir"></label>
          <h4 class="ms-g">Orden del día</h4><table class="ms-tab"><thead><tr><th>Hora</th><th style="text-align:left">Tema</th><th>Responsable</th></tr></thead><tbody>${(r.puntos || []).map((p, i) => fila('rp', `<td><input class="input" type="time" data-pk="hora" value="${esc(p.hora)}"></td><td><input class="input" data-pk="tema" value="${esc(p.tema)}"></td><td><input class="input" data-pk="resp" value="${esc(p.resp)}"></td>`, i)).join('')}</tbody></table><div class="row"><button class="btn ghost small" id="rePt">Añadir punto</button></div>
          <h4 class="ms-g">Acta · acciones a tomar</h4><table class="ms-tab"><thead><tr><th style="text-align:left">Acción</th><th>Responsable</th><th>Fecha</th></tr></thead><tbody>${(r.acta || []).map((a, i) => fila('ra', `<td><input class="input" data-ak="t" value="${esc(a.t)}"></td><td><input class="input" data-ak="resp" value="${esc(a.resp)}"></td><td><input class="input" type="date" data-ak="fecha" value="${esc(a.fecha)}"></td>`, i)).join('')}</tbody></table>
          <div class="row"><button class="btn ghost small" id="reAc">Añadir acción</button><span class="spacer"></span><button class="btn" id="reBaja">Pasar las acciones a la bandeja</button><button class="btn ghost small" id="reDel">Borrar</button></div>` : '<p class="small muted" style="margin:0">Cree una reunión o elija una de la lista.</p>'}</section>
      <section class="glass pad stack"><div class="row"><div class="eyebrow">Delegación</div><span class="spacer"></span><button class="btn small" id="deNew">Nueva delegación</button></div>
        <p class="small" style="margin:0">Delegar bien libera horas para su 20 %. Piense qué gana usted, qué gana quien la recibe, cómo enseñarla y cómo hará el seguimiento.</p>
        ${ST.delegaciones.length ? `<div class="row ms-fil">${ST.delegaciones.map((x) => `<button class="chip" aria-pressed="${x.id === delSel}" data-de="${x.id}">${esc(x.tarea || 'Delegación')}${x.a ? ' → ' + esc(x.a) : ''}</button>`).join('')}</div>` : ''}
        ${d ? `<div class="ms-g2"><label class="small">Tarea delegada<input class="input" data-df="tarea" value="${esc(d.tarea)}"></label><label class="small">A quién<input class="input" data-df="a" value="${esc(d.a || '')}"></label></div>
          <div class="ms-g2"><label class="small">Beneficios para mí<textarea class="input" rows="2" data-df="mio">${esc(d.mio || '')}</textarea></label><label class="small">Beneficios para quien la recibe<textarea class="input" rows="2" data-df="suyo">${esc(d.suyo || '')}</textarea></label></div>
          <h4 class="ms-g">Pasos para enseñar la tarea</h4><table class="ms-tab"><thead><tr><th style="text-align:left">Paso</th><th>Fecha límite</th><th>Hecho</th></tr></thead><tbody>${(d.pasos || []).map((p, i) => fila('dp', `<td><input class="input" data-pk="t" value="${esc(p.t)}"></td><td><input class="input" type="date" data-pk="fecha" value="${esc(p.fecha)}"></td><td style="text-align:center"><input type="checkbox" data-pk="hecho" ${p.hecho ? 'checked' : ''}></td>`, i)).join('')}</tbody></table><div class="row"><button class="btn ghost small" id="dePa">Añadir paso</button></div>
          <label class="small">Método de seguimiento<input class="input" data-df="seguimiento" value="${esc(d.seguimiento || '')}" placeholder="Por ejemplo: revisión de diez minutos cada viernes"></label>
          <label class="small">Progreso (fecha y nota)<textarea class="input" rows="3" data-df="progreso">${esc(d.progreso || '')}</textarea></label>
          <div class="row"><button class="btn" id="deBaja">Crear las revisiones en la bandeja</button><span class="spacer"></span><button class="btn ghost small" id="deDel">Borrar</button></div>` : '<p class="small muted" style="margin:0">Cree una delegación o elija una de la lista.</p>'}</section></div>`;
    $('#reNew', host).onclick = () => { const x = { id: M.uid(), titulo: 'Reunión', fecha: M.hoy(), hora: '', dur: 60, lugar: '', proposito: '', puntos: [{ hora: '', tema: '', resp: '' }], acta: [{ t: '', resp: '', fecha: '' }] }; ST.reuniones.push(x); reuSel = x.id; guardar(); render(); };
    $$('[data-re]', host).forEach((b) => (b.onclick = () => { reuSel = b.dataset.re; render(); }));
    if (r) {
      $$('[data-rf]', host).forEach((i) => (i.onchange = () => { r[i.dataset.rf] = i.value; guardar(); }));
      $$('tr[data-rp]', host).forEach((tr) => $$('[data-pk]', tr).forEach((i) => (i.onchange = () => { r.puntos[+tr.dataset.rp][i.dataset.pk] = i.value; guardar(); })));
      $$('tr[data-ra]', host).forEach((tr) => $$('[data-ak]', tr).forEach((i) => (i.onchange = () => { r.acta[+tr.dataset.ra][i.dataset.ak] = i.value; guardar(); })));
      $('#rePt', host).onclick = () => { r.puntos.push({ hora: '', tema: '', resp: '' }); guardar(); render(); };
      $('#reAc', host).onclick = () => { r.acta.push({ t: '', resp: '', fecha: '' }); guardar(); render(); };
      $('#reBaja', host).onclick = () => { let n = 0; r.acta.filter((a) => a.t).forEach((a, i) => { const oid = 'reu:' + r.id + ':' + i; if (ST.tareas.some((t) => t.oid === oid)) return; ST.tareas.push({ id: M.uid(), oid, t: a.t, resp: a.resp, fecha: a.fecha, entrada: M.hoy(), tipo: 'importante', estado: 'pendiente', impacto: 3, esfuerzo: 3, mundo: 'reunion', origen: 'Acta: ' + r.titulo }); n++; }); if (r.fecha && r.hora && !ST.tareas.some((t) => t.oid === 'reu:' + r.id)) ST.tareas.push({ id: M.uid(), oid: 'reu:' + r.id, t: 'Reunión: ' + r.titulo, fecha: r.fecha, hora: r.hora, dur: +r.dur || 60, entrada: M.hoy(), tipo: 'imperativa', estado: 'pendiente', impacto: 3, esfuerzo: 2, mundo: 'reunion' }); guardar(); toast(`${n} acción${n === 1 ? '' : 'es'} en la bandeja${r.fecha && r.hora ? ' y la reunión reservada en la agenda' : ''}.`); };
      $('#reDel', host).onclick = () => { ST.reuniones = ST.reuniones.filter((x) => x !== r); reuSel = null; guardar(); render(); };
    }
    $('#deNew', host).onclick = () => { const x = { id: M.uid(), tarea: '', a: '', mio: '', suyo: '', pasos: [{ t: '', fecha: '', hecho: false }], seguimiento: '', progreso: '' }; ST.delegaciones.push(x); delSel = x.id; guardar(); render(); };
    $$('[data-de]', host).forEach((b) => (b.onclick = () => { delSel = b.dataset.de; render(); }));
    if (d) {
      $$('[data-df]', host).forEach((i) => (i.onchange = () => { d[i.dataset.df] = i.value; guardar(); }));
      $$('tr[data-dp]', host).forEach((tr) => $$('[data-pk]', tr).forEach((i) => (i.onchange = () => { d.pasos[+tr.dataset.dp][i.dataset.pk] = i.type === 'checkbox' ? i.checked : i.value; guardar(); })));
      $('#dePa', host).onclick = () => { d.pasos.push({ t: '', fecha: '', hecho: false }); guardar(); render(); };
      $('#deBaja', host).onclick = () => { let n = 0; d.pasos.filter((p) => p.t && p.fecha).forEach((p, i) => { const oid = 'del:' + d.id + ':' + i; if (ST.tareas.some((t) => t.oid === oid)) return; ST.tareas.push({ id: M.uid(), oid, t: `Delegación «${d.tarea}»: ${p.t}`, fecha: p.fecha, entrada: M.hoy(), tipo: 'delegada', delegadoA: d.a, estado: p.hecho ? 'hecha' : 'pendiente', impacto: 3, esfuerzo: 2, mundo: 'delegacion' }); n++; }); guardar(); toast(n ? `${n} revisión${n > 1 ? 'es' : ''} de la delegación en la bandeja.` : 'Ponga fecha a los pasos para crear las revisiones.'); };
      $('#deDel', host).onclick = () => { ST.delegaciones = ST.delegaciones.filter((x) => x !== d); delSel = null; guardar(); render(); };
    }
  };

  /* ---------- Informe del plan de trabajo ---------- */
  const informe = () => {
    const In = A.informe; if (!In) return; In.reset();
    const e = P() && P().empresas && P().empresas.activa(), l = pend(), top = l.slice().sort((a, b) => score(b) - score(a)).slice(0, Math.max(1, Math.ceil(l.length * 0.2)));
    const w0 = lunes(M.hoy()), sem = ST.tareas.filter((t) => t.hora && t.fecha >= w0 && t.fecha <= sumar(w0, 6)).sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora));
    let h = In.cover({ tipo: 'Mesa de trabajo', kicker: 'Plan de trabajo', titulo: 'Prioridades, metas y agenda', subtitulo: (() => { const na = ST.metas.filter((m) => m.estado !== 'cumplida').length; return `${l.length} tarea${l.length === 1 ? '' : 's'} pendiente${l.length === 1 ? '' : 's'} · ${na} meta${na === 1 ? '' : 's'} activa${na === 1 ? '' : 's'}`; })(), empresa: (e && e.nombre) || 'Mi empresa' });
    h += In.summary('Resumen', `<p>${top.length} tarea${top.length > 1 ? 's' : ''} concentran el impacto (el 20 %). ${ST.metas.length} meta${ST.metas.length === 1 ? '' : 's'}, ${ST.metas.filter((m) => smart(m).every((y) => y.ok)).length} completamente SMART. ${sem.length} bloques reservados esta semana.</p>`);
    if (top.length) h += In.section('Su 20 %', In.table(['Tarea', 'Área', 'Impacto', 'Esfuerzo', 'Fecha'], top.map((t) => [t.t, t.area || '—', String(t.impacto), String(t.esfuerzo), t.fecha ? fCorta(t.fecha) + (t.hora ? ' ' + t.hora : '') : '—'])));
    ST.metas.filter((m) => m.estado !== 'cumplida').forEach((m) => {
      const s = smart(m);
      h += In.section(numMeta(m) + ' · ' + (m.especifica || m.objetivo || 'sin definir'), In.table(['Campo', 'Contenido'], [['La meta en una frase', frase(m) || '—'], ['Objetivo de partida', m.objetivo || '—'], ['Beneficio (semáforo)', ({ ok: 'Verde', warn: 'Ámbar', stop: 'Rojo' })[evalBeneficio(m).st] + ': ' + evalBeneficio(m).t], ['Indicador', `${m.indicador || '—'}: de ${m.actual || '?'} a ${m.valor || '?'} ${m.unidad || ''}`], ['Fecha límite', fCorta(m.fecha)], ['Responsable', m.responsable || '—'], ['Beneficio', m.beneficio || '—'], ['Pros', m.pros || '—'], ['Contras', m.contras || '—'], ['Obstáculos y soluciones', (m.obstaculos || []).filter((o) => o.o).map((o) => `${o.o} → ${o.s}`).join(' · ') || '—'], ['Seguimiento', m.seguimiento || '—'], ['Afirmación', m.afirmacion || '—'], ['Criterios', s.map((y) => `${y.k} ${y.ok ? '✓' : '✗'}`).join('  ')]]) + ((m.acciones || []).some((a) => a.t) ? In.table(['Acción', 'Fecha límite', 'Revisada', 'Hecha'], m.acciones.filter((a) => a.t).map((a) => [a.t, fCorta(a.fecha), fCorta(a.revisada), a.hecha ? fCorta(a.hecha) : '—'])) : ''));
    });
    if (sem.length) h += In.section('Agenda de la semana', In.table(['Día', 'Hora', 'Tarea', 'Minutos'], sem.map((t) => [fLarga(t.fecha), t.hora, t.t, String(t.dur || 30)])));
    if (ST.repetitivas.length) h += In.section('Tareas repetitivas', In.table(['Tarea', 'Frecuencia', 'Hora'], ST.repetitivas.map((r) => [(r.clave ? '★ ' : '') + r.t, FREQ[r.freq], r.hora || '—'])));
    if (ST.delegaciones.length) h += In.section('Delegaciones', In.table(['Tarea', 'A quién', 'Seguimiento', 'Pasos hechos'], ST.delegaciones.map((d) => [d.tarea, d.a || '—', d.seguimiento || '—', `${(d.pasos || []).filter((p) => p.hecho).length}/${(d.pasos || []).filter((p) => p.t).length}`])));
    h += In.section('Pendientes por fecha', In.table(['Fecha', 'Tarea', 'Tipo', 'Origen'], l.slice().sort((a, b) => (a.fecha || '9').localeCompare(b.fecha || '9')).slice(0, 60).map((t) => [t.fecha ? fCorta(t.fecha) : 'Sin fecha', (t.clave ? '★ ' : '') + t.t, TIPOS[t.tipo] || '—', MUNDOS[t.mundo || 'manual']])));
    h += In.foot('Plan de trabajo generado en la mesa de trabajo de Atalaya 360°.');
    In.open({ titulo: 'Plan de trabajo', html: h });
  };

  /* ---------- Navegación ---------- */
  const TABS = [['hoy', 'Hoy'], ['bandeja', 'Bandeja'], ['prioridades', 'Prioridades 20/80'], ['agenda', 'Agenda semanal'], ['metas', 'Metas SMART'], ['repetitivas', 'Repetitivas y semana ideal'], ['reuniones', 'Reuniones y delegación']];
  const VISTAS = { hoy: vHoy, bandeja: vBandeja, prioridades: vPrior, agenda: vAgenda, metas: vMetas, repetitivas: vRep, reuniones: vReu };
  const toast = (t) => { $$('.ms-toast').forEach((x) => x.remove()); const d = document.createElement('div'); d.className = 'alert ok ms-toast'; d.textContent = t; document.body.appendChild(d); setTimeout(() => d.remove(), 6000); };
  function render() {
    $('#msTabs').innerHTML = TABS.map(([k, n]) => `<button role="tab" data-t="${k}" aria-selected="${k === tab}">${n}${k === 'bandeja' ? ` <small>${pend().length}</small>` : k === 'metas' && ST.metas.length ? ` <small>${ST.metas.filter((m) => m.estado !== 'cumplida').length}</small>` : ''}</button>`).join('');
    $$('#msTabs [data-t]').forEach((b) => (b.onclick = () => { tab = b.dataset.t; if (tab !== 'metas') metaSel = null; try { history.replaceState(null, '', '#' + tab); } catch (e) { /* nada */ } render(); }));
    const host = $('#msPanel'), y = scrollY;
    try { VISTAS[tab](host); } catch (e) { host.innerHTML = `<div class="alert stop">No se pudo mostrar: ${esc(e.message)}</div>`; console.error(e); }
    scrollTo({ top: y });
  }
  A.mesa.abrirMeta = (id) => { tab = 'metas'; metaSel = id; render(); scrollTo({ top: ($('#msTabs') || document.body).offsetTop - 90 }); };
  A.mesa.start = async () => {
    A.sky && A.sky();
    const Pl = P();
    if (Pl) { const ok = await Pl.guard(); if (!ok) return; Pl.mountAccount($('#account')); if (Pl.empresas) await Pl.empresas.cargar(); }
    ST = await M.cargar();
    const h = location.hash.replace('#', ''); if (VISTAS[h]) tab = h;
    // Una meta concreta pedida desde la nota de la empresa
    try { const mm = sessionStorage.getItem('atalaya.mesa.meta'); if (mm) { sessionStorage.removeItem('atalaya.mesa.meta'); if (ST.metas.some((x) => x.id === mm)) { tab = 'metas'; metaSel = mm; } } } catch (e) { /* nada */ }
    // La portada: titular, empresa y estado de la semana, como en los otros mundos
    const e = Pl && Pl.empresas && Pl.empresas.activa();
    const hero = $('#msHero');
    const pintaHero = () => {
      if (!A.heroMundo || !hero) return;
      const l = pend(), hoyL = ST.tareas.filter((t) => t.fecha === M.hoy()), atras = l.filter((t) => t.fecha && t.fecha < M.hoy()), metasL = ST.metas.filter((m) => m.estado !== 'cumplida'), smartOk = metasL.filter((m) => smart(m).every((y) => y.ok)).length;
      const w0 = lunes(M.hoy()), sem = ST.tareas.filter((t) => t.hora && t.fecha >= w0 && t.fecha <= sumar(w0, 6)), minT = sem.reduce((a, t) => a + (+t.dur || 30), 0), minC = sem.filter((t) => t.clave).reduce((a, t) => a + (+t.dur || 30), 0);
      const hc = { kicker: 'Mesa de trabajo', titulo: '¿Está haciendo <em>lo que de verdad importa</em>?', lede: 'Todo el trabajo del simulador, del sistema estratégico y de personas y equipos en una sola mesa: pensar, priorizar y proteger el tiempo para el 20 % que da el resultado, con metas que dependen solo de quien las ejecuta.',
        empresa: (e && e.nombre) || 'Mi empresa', datos: [['Pendientes', String(l.length)], ['Hoy', String(hoyL.length)], ['Metas activas', String(metasL.length)], ['Repetitivas', String(ST.repetitivas.length)]],
        acciones: [{ t: 'Traer el trabajo del ecosistema', cls: 'solid', fn: async () => { const n = await importar(); toast(n ? `${n} tarea${n > 1 ? 's' : ''} traída${n > 1 ? 's' : ''} de los otros mundos.` : 'No hay trabajo nuevo en los otros mundos.'); pintaHero(); render(); } }, { t: 'Nueva meta SMART', fn: () => { const m = nuevaMeta(); metaSel = m.id; tab = 'metas'; guardar(); render(); } }, { t: 'Informe del plan de trabajo', cls: 'ghost', fn: informe }],
        veredicto: { kicker: 'Su semana', st: atras.length > 5 ? 'stop' : atras.length || (minT && minC / minT < 0.3) ? 'warn' : 'ok', titulo: minT ? `${Math.round((minC / minT) * 100)} % del tiempo reservado va al 20 %` : 'Sin tiempo reservado esta semana', texto: `${atras.length} tarea${atras.length === 1 ? '' : 's'} atrasada${atras.length === 1 ? '' : 's'}, ${smartOk} de ${metasL.length} metas SMART completas. Cada franja es una tarea de hoy y de los próximos días.`,
          luces: l.filter((t) => t.fecha && t.fecha <= sumar(M.hoy(), 6)).sort((a, b) => a.fecha.localeCompare(b.fecha)).slice(0, 30).map((t) => ({ n: t.t, v: fCorta(t.fecha), st: t.fecha < M.hoy() ? 'stop' : t.clave ? 'ok' : 'warn', fn: () => editar(t) })) },
        kpis: [{ k: 'Horas reservadas', v: hm(minT), d: 'esta semana', fn: () => { tab = 'agenda'; render(); } }, { k: 'En actividades clave', v: (minT ? Math.round((minC / minT) * 100) : 0) + ' %', d: 'del tiempo reservado', st: minT ? (minC / minT >= 0.4 ? 'ok' : minC / minT >= 0.2 ? 'warn' : 'stop') : null, fn: () => { tab = 'prioridades'; render(); } }, { k: 'Atrasadas', v: String(atras.length), st: atras.length ? 'stop' : 'ok', fn: () => { tab = 'hoy'; render(); } }, { k: 'Metas SMART', v: `${smartOk}/${metasL.length}`, d: 'completas', fn: () => { tab = 'metas'; metaSel = null; render(); } }] };
      hero.innerHTML = A.heroMundo.html(hc); A.heroMundo.wire(hero, hc);
    };
    pintaHero();
    const r0 = render; render = function () { r0(); pintaHero(); }; // eslint-disable-line no-func-assign
    render();
    if (A.assistant) A.assistant.init({ page: 'mesa' });
    A.mesa.informe = informe; A.mesa.listo = true;
  };
})();
