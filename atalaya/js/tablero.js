/* Atalaya 360° · Tablero general de la empresa
   Visión macro: el equilibrio viable, las cinco capas con su semáforo (datos, liquidez, rentabilidad,
   estructura y crecimiento), cada planeta con su nota y lo que toca primero, las prioridades de toda la
   empresa en orden y los objetivos del empresario con el estado de la capa de la que dependen.
   Las cifras clave salen de la fuente única (js/cifras.js) con su origen y fecha, y el triaje del consultor (auditoría
   integral) es una capa más: entra en las prioridades y se contrasta con lo que dicen los datos.
   Menú: el archivador común (js/archivador.js) con un área «Tablero» y cuatro módulos, cada uno con su #:
   La empresa, de un vistazo (#vistazo), Prioridades (#prioridades), Objetivos (#objetivos) y Mundos (#mundos). */
(function () {
  const A = window.Atalaya, P = A.platform;
  const $ = (s, r) => (r || document).querySelector(s);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fmt = (n) => (n == null ? '—' : String(n.toFixed(1)).replace('.', ','));
  const stN = (n) => (n == null ? '' : n >= 7 ? 'ok' : n >= 5 ? 'warn' : 'stop');
  const ST = { ok: 'Verde', warn: 'Ámbar', stop: 'Rojo', '': 'Sin datos' };
  const URL = { simulador: 'app.html', estrategia: 'estrategia.html', personas: 'personas.html', mesa: 'mesa.html', cifras: 'app.html', auditoria: 'intervencion.html' };
  const NIV = { stop: 'Urgencias', warn: 'Preferente', ok: 'Programable' };
  const MAPA = { simulador: true, estrategia: true, personas: true };
  const fecha = (f) => (f ? new Date(f).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) : '');

  /* Módulos del tablero (archivador común, js/archivador.js): un área «Tablero» con cuatro módulos, cada uno con su #.
     Los nombres y las preguntas son los del catálogo (js/catalogo.js). */
  const MODS = [['vistazo', 'La empresa, de un vistazo'], ['prioridades', 'Prioridades'], ['objetivos', 'Objetivos'], ['mundos', 'Mundos']];
  const esMod = (k) => MODS.some((m) => m[0] === k);
  let mod = 'vistazo', arch = null, arrancado = false, volviendo = false;
  const areasArch = () => {
    const cat = A.catalogo && A.catalogo.mundo('tablero'), q = (k) => { const m = cat && cat.areas.flatMap((a) => a.modulos).find((x) => x.k === k); return m ? m.pregunta : ''; };
    return [{ k: 'tablero', n: 'Tablero', modulos: MODS.map(([k, n]) => ({ k, n, pregunta: q(k) })) }];
  };
  const marcarHash = () => { if (location.hash === '#' + mod) return; try { if (arrancado && !volviendo) history.pushState(null, '', '#' + mod); else history.replaceState(null, '', '#' + mod); } catch (e) { /* sin historial */ } };
  // Abre un módulo sin volver a calcular: todos están pintados y solo se ve el abierto
  const mostrar = (k, o) => {
    if (!esMod(k)) return;
    mod = k;
    document.querySelectorAll('#tbMain > [data-mod]').forEach((x) => { x.hidden = x.dataset.mod !== mod; });
    marcarHash();
    if (arch) arch.refrescar();
    const t = $('.ar-cab'); if (t && o && o.ver) { const y = t.getBoundingClientRect().top + scrollY - 84; if (scrollY > y) scrollTo({ top: Math.max(0, y) }); }
  };
  const bloque = (k, html) => `<div class="ar-mod tb-mod" data-mod="${k}"${k === mod ? '' : ' hidden'}>${html}</div>`;

  const pintar = (r) => {
    const main = $('#tbMain'), emp = (P.empresas && P.empresas.activa && P.empresas.activa()) || {}, nt = r.nota, mundos = Object.entries(nt.mundos);
    // Un objetivo cumplido (su meta de la mesa está cumplida) sale en verde y ya no depende de su capa
    const objs = r.objetivos.map((o) => Object.assign(o, { st: o.cumplido ? 'ok' : (r.capas.find((c) => c.id === o.capa) || {}).st || '' }));
    main.innerHTML = bloque('vistazo', `
      <section class="glass pad tb-hero"><div><div class="eyebrow">Tablero general${emp.nombre ? ' · ' + esc(emp.nombre) : ''}</div><h1 class="tb-h1">La empresa, <em>de un vistazo</em></h1>
        <p class="muted" style="margin:0">Primero lo que la sostiene: liquidez, después rentabilidad y, con las dos en verde, crecimiento. Las prioridades salen de los semáforos de todos los mundos y de sus objetivos.</p></div>
        <div class="tb-kpis"><div class="tb-k"><small>Nota de la empresa</small><b class="${stN(nt.global)}">${nt.global == null ? 'Sin nota' : fmt(nt.global) + '<span>/10</span>'}</b>${nt.global == null ? '<span>Ningún mundo tiene todavía datos propios con los que calcularla.</span>' : ''}${nt.fecha ? `<span>Calculada con los datos guardados de cada mundo el ${esc(new Date(nt.fecha).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }))}: la misma nota en todas las páginas.</span>` : ''}</div>
          <div class="tb-k tb-eq ${r.equilibrio.st}"><small>Equilibrio viable</small><b><i class="pr-luz ${r.equilibrio.st}"></i>${esc(r.equilibrio.t)}</b><span>${esc(r.equilibrio.d)}</span></div></div></section>

      <section class="glass pad stack" id="tbCifras"><div class="row"><div class="eyebrow">Cifras clave</div><span class="spacer"></span><small class="muted">Una sola fuente para todos los mundos: simulador, sistema estratégico, auditoría y cartera</small></div>
        ${A.cifras ? A.cifras.html(r.cifras) : ''}</section>

      ${r.triaje ? `<section class="glass pad stack" id="tbTriaje"><div class="row"><div class="eyebrow">Triaje del consultor · auditoría integral</div><span class="spacer"></span><small class="muted">${r.triaje.calculado ? 'Calculado con los datos guardados de la auditoría' : 'Lo último guardado en la auditoría'}${r.triaje.fecha ? ' · última sesión el ' + esc(fecha(r.triaje.fecha)) : ''}</small><a class="btn small" href="intervencion.html#triaje">Abrir el triaje</a></div>
        ${r.triaje.areas.length ? `<ul class="tb-objs">${['stop', 'warn', 'ok'].flatMap((st) => r.triaje.areas.filter((a) => a.st === st)).map((a) => `<li><i class="pr-luz ${a.st}"></i><span><b>${esc(a.n)} · ${NIV[a.st]}</b><small>Cuenta en la capa «${esc((r.capas.find((c) => c.id === a.capa) || {}).n || '')}»</small></span></li>`).join('')}</ul>` : '<p class="small muted" style="margin:0">El consultor todavía no ha hecho el triaje de las áreas.</p>'}
        ${(r.contraste || []).map((c) => `<div class="alert warn small"><b>${esc(c.t)}.</b> ${esc(c.d)}</div>`).join('')}</section>` : ''}

      <section class="glass pad stack"><div class="eyebrow">Las capas de la empresa, en el orden en que se sostienen</div>
        <ol class="tb-capas">${r.capas.map((c, i) => `<li class="tb-capa ${c.st}"><span class="pr-luz ${c.st}"></span><b>${i + 1} · ${esc(c.n)}</b><small>${esc(c.d)}</small><em>${c.total ? `${c.rojos} rojo${c.rojos === 1 ? '' : 's'} · ${c.ambar} ámbar · ${c.verdes} verde${c.verdes === 1 ? '' : 's'}` : 'Sin datos: sin comprobaciones'}</em></li>`).join('')}</ol></section>`)

      + bloque('mundos', `<section class="glass pad stack"><div class="row"><div class="eyebrow">Los mundos de la empresa</div><span class="spacer"></span><small class="muted">La nota de cada mundo y lo que toca primero en él</small></div></section>
      <section class="tb-grid">${mundos.map(([k, m]) => { const top = r.pend.filter((x) => x.mundo === k).slice(0, 3);
        return `<article class="glass pad tb-planeta"><div class="row"><b class="tb-pn">${esc(m.n)}</b><span class="spacer"></span><span class="tb-nota ${stN(m.nota)}">${m.nota == null ? 'Sin nota' : fmt(m.nota)}</span></div>
          <small class="muted">${m.nota == null ? esc(m.motivo ? 'Sin nota: ' + m.motivo : 'Sin datos con los que calcular su nota') : esc(A.nota.desglose(A.nota.puntuar(m.puntos)))} · ${esc(A.nota.fechaTxt ? A.nota.fechaTxt(m) : fecha(m.fecha))}</small>
          <ol class="tb-top">${top.map((x) => `<li class="${x.st}"><a href="${URL[k]}${x.zona ? '#' + esc(x.zona) : ''}"><i class="pr-luz ${x.st}"></i><span>${esc(x.t)}<em>${esc(x.capaN)} · prioridad ${x.rango}</em></span></a></li>`).join('') || '<li class="tb-vacio">Nada pendiente en rojo ni en ámbar.</li>'}</ol>
          <div class="row"><a class="btn small" href="${URL[k]}${MAPA[k] ? '#mapa' : ''}">${MAPA[k] ? 'Abrir el mapa con sus prioridades' : 'Abrir'}</a></div></article>`; }).join('')}</section>`)

      + bloque('prioridades', `<section class="glass pad stack"><div class="row"><div class="eyebrow">Prioridades de la empresa</div><span class="spacer"></span><small class="muted">${r.pend.length} puntos por tratar · los diez primeros</small></div>
        <ol class="tb-prio">${r.pend.slice(0, 10).map((x) => `<li><a class="tb-pi ${x.st}" href="${URL[x.mundo]}${x.zona ? '#' + esc(x.zona) : ''}"><b>${x.rango}</b><i class="pr-luz ${x.st}"></i><span><strong>${esc(x.t)}</strong>${x.d ? `<small>${esc(x.d)}</small>` : ''}<em>${esc(x.mundoN)} · ${esc(x.capaN)}${x.obj ? ' · sirve a «' + esc(x.obj.t) + '»' : ''}</em></span><span class="tb-go">→</span></a></li>`).join('') || '<li class="tb-vacio">Nada en rojo ni en ámbar.</li>'}</ol></section>`)

      + bloque('objetivos', `<section class="glass pad stack"><div class="eyebrow">Objetivos del empresario</div>
        ${objs.length ? `<ul class="tb-objs">${objs.map((o) => `<li><i class="pr-luz ${o.st}"></i><span><b>${esc(o.t)}</b><small>${esc(o.fuente)} · ${o.cumplido ? `cumplido${o.cumplidoFecha ? ' el ' + esc(fecha(o.cumplidoFecha)) : ''} (meta de la mesa cumplida)` : `depende de la capa «${esc((r.capas.find((c) => c.id === o.capa) || {}).n || '')}», hoy en ${esc(ST[o.st] || 'sin datos').toLowerCase()}${o.fecha ? ' · fecha ' + esc(o.fecha) : ''}`}</small></span></li>`).join('')}</ul>`
          : '<p class="small muted" style="margin:0">Sin objetivos todavía. Se recogen de la primera sesión de la auditoría y de las metas de la mesa de trabajo.</p>'}
        <p class="small muted" style="margin:0">Regla: liquidez genera rentabilidad, rentabilidad genera crecimiento; no se busca crecimiento con liquidez. Un objetivo de crecimiento con la liquidez en rojo espera a que la caja esté sostenida.</p></section>`);
    if (A.cosmos && A.cosmos.type3d) try { A.cosmos.type3d(main); } catch (e) { /* sin volumen */ }
    montarArch();
  };
  function montarArch() {
    if (!A.archivador) return;
    if (arch) { arch.refrescar(); return; }
    arch = A.archivador.montar({ mundo: 'tablero', areas: areasArch, actual: () => mod, ir: (k) => mostrar(k, { ver: true }), antes: $('#tbMain'), panel: () => $('#tbMain') });
    marcarHash(); arrancado = true;
    // Atrás y adelante del navegador recorren los módulos visitados; un # en la misma página abre su módulo
    const alVolver = () => { const k = location.hash.replace('#', ''); if (esMod(k) && k !== mod) { volviendo = true; try { mostrar(k); } finally { volviendo = false; } } };
    addEventListener('popstate', alVolver); addEventListener('hashchange', alVolver);
  }
  /* Capítulo del libro corporativo: el tablero en formato de informe (lo recoge js/libro-comun.js) */
  let ultimo = null;
  const informe = () => {
    const I = A.informe, r = ultimo; if (!I || !r) return '';
    I.reset();
    const emp = (P.empresas && P.empresas.activa && P.empresas.activa()) || {}, nt = r.nota, f10 = (n) => (n == null ? 'Sin nota' : fmt(n) + '/10');
    const pill = (st, t) => (st ? I.pill(st, t || ST[st]) : esc(t || 'Sin datos'));
    let h = I.cover({ tipo: 'Tablero general', titulo: 'La empresa, de un vistazo', empresa: emp.nombre || '' });
    h += I.summary('En pocas palabras', `<p><b>Nota de la empresa: ${esc(f10(nt.global))}.</b> ${esc(r.equilibrio.t)}. ${esc(r.equilibrio.d)}</p><p class="rp-muted">Calculada con los datos guardados de cada mundo${nt.fecha ? ' el ' + esc(new Date(nt.fecha).toLocaleString('es-ES', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })) : ''}.</p>`, r.equilibrio.st || null);
    h += I.section('Nota de cada mundo', I.table(['Mundo', 'Nota', 'Comprobaciones', 'Calculada'], Object.values(nt.mundos).map((m) => [m.n, { h: pill(stN(m.nota), f10(m.nota)) }, m.nota == null ? (m.motivo ? 'Sin nota: ' + m.motivo : '—') : A.nota.desglose(A.nota.puntuar(m.puntos)), A.nota.fechaTxt ? A.nota.fechaTxt(m) : fecha(m.fecha)])));
    h += I.section('Las capas de la empresa', I.table(['Capa', 'Estado', 'Rojos', 'Ámbar', 'Verdes'], r.capas.map((c) => [c.n, { h: pill(c.st) }, String(c.rojos), String(c.ambar), String(c.verdes)]), { num: [2, 3, 4] }));
    if (r.cifras && !r.cifras.sinDatos && A.cifras) h += I.section('Cifras clave', I.table(['Cifra', 'Valor', 'Origen'], A.cifras.CAMPOS.map((c) => [c.n, A.cifras.fmt(c.k, r.cifras[c.k]), r.cifras[c.k] == null ? 'Sin dato' : r.cifras.origen[c.k] + ' · ' + A.cifras.fechaTxt(r.cifras.fecha[c.k])])));
    if (r.triaje && r.triaje.areas.length) h += I.section('Triaje del consultor', I.table(['Área', 'Nivel'], ['stop', 'warn', 'ok'].flatMap((st) => r.triaje.areas.filter((a) => a.st === st)).map((a) => [a.n, { h: I.pill(a.st, NIV[a.st]) }])));
    h += I.section('Prioridades de la empresa', r.pend.length ? I.table(['N.º', 'Qué tratar', 'Mundo', 'Capa'], r.pend.slice(0, 15).map((x) => [String(x.rango), x.t, x.mundoN, x.capaN]), { num: [0] }) : '<p class="rp-muted">Nada en rojo ni en ámbar.</p>');
    const objs = r.objetivos || [];
    if (objs.length) h += I.section('Objetivos del empresario', I.table(['Objetivo', 'Origen', 'Estado'], objs.map((o) => [o.t, o.fuente, { h: o.cumplido ? I.pill('ok', 'Cumplido') : pill(o.st, 'Capa ' + ((r.capas.find((c) => c.id === o.capa) || {}).n || '').toLowerCase()) }])));
    h += I.foot('Tablero general: las prioridades siguen la regla liquidez, rentabilidad y crecimiento. Las notas se calculan con los datos guardados de cada mundo.');
    return h;
  };
  A.tablero = { informe, areasArch, get listo() { return !!ultimo; } };
  const iniciar = async () => {
    const ok = await P.guard(); if (!ok) return;
    { const h = location.hash.replace('#', ''); if (esMod(h)) mod = h; }
    P.mountAccount($('#account')); if (P.empresas && P.empresas.cargar) await P.empresas.cargar();
    try { const r = await A.prioridad.calcular(); ultimo = r; if (r) pintar(r); else $('#tbMain').innerHTML = '<p>No se ha podido calcular el tablero.</p>'; }
    catch (e) { console.error(e); $('#tbMain').innerHTML = '<p>No se ha podido calcular el tablero.</p>'; }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
