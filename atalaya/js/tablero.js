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
  /* Informe de situación general (capítulo del libro corporativo; lo recoge js/libro-comun.js). Es un documento de
     dirección: habla de la empresa con sus cifras e indicadores, no del tablero. La síntesis (conclusión, mensajes
     clave, diagnóstico, asuntos prioritarios, recomendaciones y limitaciones) sale de A.libro.sintesis. Sin
     información propia de la empresa no hay informe. */
  let ultimo = null;
  const informe = () => {
    const I = A.informe, r = ultimo, L = A.libro; if (!I || !r || !L || !L.sintesis) return '';
    const emp = (P.empresas && P.empresas.activa && P.empresas.activa()) || {}, s = L.sintesis(r, emp.nombre || '');
    if (!s || s.vacio) return '';
    I.reset();
    const NV = L.NIVEL_T, pill = (st) => (st ? I.pill(st, NV[st]) : '—'), C = A.cifras, cf = s.cf;
    let h = I.cover({ tipo: 'Informe de situación', kicker: 'Informe de situación' + (cf && cf.anio ? ' · cuentas de ' + cf.anio : ''), titulo: 'Situación general de la empresa', subtitulo: s.eq.t || 'Liquidez, rentabilidad, estructura y crecimiento', empresa: emp.nombre || '' });
    h += I.summary('Resumen ejecutivo', L.resumenHTML(s), s.eq.st || null);
    if (cf && C) {
      const filas = C.CAMPOS.filter((c) => cf[c.k] != null).map((c) => [c.n, C.fmt(c.k, cf[c.k]), L.fuenteCifra(cf.origen[c.k]) + (cf.fecha[c.k] ? ' · ' + C.fechaTxt(cf.fecha[c.k]) : '')]);
      [['ebitdaPct', 'Beneficio del negocio sobre ventas'], ['deudaNeta', 'Deuda neta (deuda bancaria menos caja)'], ['deudaEbitda', 'Deuda neta sobre EBITDA'], ['mesesCaja', 'Caja en meses de costes de estructura']].forEach(([k, n]) => { if (cf[k] != null) filas.push([n, k === 'deudaNeta' ? C.eur(cf[k]) : k === 'mesesCaja' ? fmt(cf[k]) + ' meses' : C.fmt(k, cf[k]), 'Cálculo sobre las cuentas']); });
      h += I.section(cf.ventas != null && cf.ebitdaPct != null ? `La empresa factura ${C.fmt('ventas', cf.ventas)} y convierte en beneficio del negocio el ${C.fmt('ebitdaPct', cf.ebitdaPct)}` : 'Cifras clave de la empresa', I.table(['Magnitud', 'Valor', 'Fuente'], filas, { num: [1] }));
    }
    if (s.pts.length) {
      const peor = s.capas.find((c) => c.st === 'stop') || s.capas.find((c) => c.st === 'warn');
      h += I.section(peor ? `El área de ${peor.n.toLowerCase()} es la primera que hay que corregir: ${peor.st === 'stop' ? `${peor.rojos} ${peor.rojos === 1 ? 'indicador crítico' : 'indicadores críticos'}` : `${peor.ambar} ${peor.ambar === 1 ? 'indicador a vigilar' : 'indicadores a vigilar'}`}` : 'Las cuatro áreas de la empresa están en niveles correctos',
        I.table(['Área', 'Qué valora', 'Situación', 'Críticos', 'A vigilar', 'Correctos'], s.capas.filter((c) => c.total).map((c) => [c.n, c.q, { h: pill(c.st) }, String(c.rojos), String(c.ambar), String(c.verdes)]), { num: [3, 4, 5] }),
        'Las áreas se ordenan según se sostienen: la liquidez permite la rentabilidad y la rentabilidad financia el crecimiento. Un área en nivel crítico condiciona a las siguientes.');
    }
    if (s.ambitos.length && s.global != null) h += I.section(`Valoración global de la empresa: ${fmt(s.global)} sobre 10`, I.table(['Ámbito', 'Valoración', 'Indicadores evaluados'], s.ambitos.map((m) => [m.n, { h: I.pill(stN(m.nota), fmt(m.nota) + ' / 10') }, m.r && m.r.total ? `${m.r.total}: ${m.r.verdes} ${m.r.verdes === 1 ? 'correcto' : 'correctos'}, ${m.r.ambar} a vigilar y ${m.r.rojos} ${m.r.rojos === 1 ? 'crítico' : 'críticos'}` : '—'])));
    if (s.triaje.length) h += I.section('Diagnóstico del consultor: prioridad de actuación por áreas', I.table(['Área', 'Prioridad de actuación'], s.triaje.map((a) => [a.n, { h: I.pill(a.st, a.t) }])), 'Inmediata: de 0 a 14 días. Preferente: durante el trimestre. Programable: sin urgencia.');
    if (s.pend.length) h += I.section(`${s.pend.length === 1 ? 'Un asunto requiere' : s.pend.length + ' asuntos requieren'} actuación${s.pend.length > 15 ? ': los quince primeros' : ''}`, I.table(['N.º', 'Asunto', 'Evidencia', 'Ámbito', 'Área', 'Nivel'], s.pend.slice(0, 15).map((x, i) => [String(i + 1), x.t, x.ev || '—', x.area, x.capaN, { h: pill(x.st) }]), { num: [0] }), 'Ordenados por el área a la que afectan, su gravedad y su relación con los objetivos de la dirección.');
    if (s.objs.length) h += I.section('Objetivos de la dirección', I.table(['Objetivo', 'Fecha', 'Situación'], s.objs.map((o) => [o.t, o.fecha ? new Date(o.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }) : '—', { h: o.cumplido ? I.pill('ok', 'Cumplido') : o.st ? I.pill(o.st, o.st === 'stop' ? `Condicionado: ${o.capaN.toLowerCase()} en nivel crítico` : o.st === 'warn' ? `${o.capaN} a vigilar` : `${o.capaN} en nivel correcto`) : '—' }])), 'Cada objetivo se valora por el área de la que depende.');
    if (s.recs.length) h += I.section('Recomendaciones, por orden de prioridad', `<ol class="rp-steps">${s.recs.map((x) => `<li><b>${esc(x.t)}.</b> ${esc(x.d)}</li>`).join('')}</ol>`);
    h += I.section('Alcance y limitaciones', `<p>El informe valora la empresa en cuatro áreas —liquidez, rentabilidad, estructura y gestión, y crecimiento— a partir de sus cuentas, de los indicadores de gestión disponibles${s.triaje.length ? ' y del diagnóstico del consultor' : ''}. Cada indicador se clasifica como correcto, a vigilar o crítico${s.global != null ? '; la valoración global es la proporción de indicadores correctos, ponderada, sobre 10' : ''}.</p>${s.lim.length ? `<ul>${s.lim.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}`);
    h += I.foot(`Informe de situación${emp.nombre ? ' de ' + emp.nombre.replace(/\.$/, '') : ''}. Las valoraciones se apoyan en la información facilitada por la empresa; las decisiones fiscales y societarias deben contrastarse con sus asesores.`);
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
