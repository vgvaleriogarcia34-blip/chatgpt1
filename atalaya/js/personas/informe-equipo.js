/* Atalaya 360° · Personas y equipos · Foto completa del equipo y alineamiento
   · Foto del equipo: composición, mapa conductual con todos sus miembros, perfiles DISC, aportaciones cubiertas,
     motivación e identidad, liderazgo, competencias del equipo, dinámica y plan.
   · Alineamiento: encaje de cada persona con su puesto, cada puesto con su mejor candidato interno y sus relevos,
     y cada equipo con lo que necesita su objetivo; con recomendaciones.
   Mismas hojas A4 con membrete que el informe completo de la persona. */
(function () {
  const A = window.Atalaya, H = A.personasDatos, X = A.informeCompletoDatos, R = A.personas;
  const P = () => R.pp, esc = R.esc, F4 = ['D', 'I', 'S', 'C'];
  const r0 = Math.round;
  const ini = (n) => String(n || '?').split(' ').filter(Boolean).slice(0, 2).map((x) => x[0]).join('').toUpperCase();
  const pill = (st, t) => `<span class="pp-pill ${st}">${esc(t)}</span>`;
  const tabla = (heads, rows) => `<table class="pp-t"><thead><tr>${heads.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c && typeof c === 'object' ? c.h : esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  const kpis = (l) => `<div class="pp-kp">${l.map((k) => `<div class="${k.st || ''}"><span>${esc(k.k)}</span><b>${esc(k.v)}</b>${k.d ? `<small>${esc(k.d)}</small>` : ''}</div>`).join('')}</div>`;
  const arq = (p) => { const x = R.identidad && R.identidad(p), D = A.identidadDatos; return x && D ? { e: D.ARQ[x.esencia] || D.ARQ[1], c: D.CICLO[x.ciclo] } : null; };

  /* ---------- Foto completa del equipo ---------- */
  R.informeEquipoCompleto = (ids, nombre, objetivo) => {
    const In = A.informe, e = R.empresa(), an = R.analizarEquipo(ids), M = an.miembros, pp = P();
    const pages = [], pag = (titulo, sub, html, idx) => pages.push({ titulo, sub, html, idx: idx !== false });
    const media = an.media;
    const lec = R.lecEquipo(ids, nombre, objetivo), Fm = R.inf, hayId = M.some((p) => arq(p));
    pag('Equipo', 'Resumen ejecutivo', `
      ${pp.resumenPp(lec.lead, lec.claves)}
      ${kpis([{ k: 'Personas', v: String(M.length) }].concat(an.conRoles.length ? [{ k: 'Aportaciones cubiertas', v: `${lec.cub} de 9`, st: an.faltan.length > 2 ? 'stop' : an.faltan.length ? 'warn' : 'ok' }] : [], an.conDisc.length ? [{ k: 'Diferencias de estilo a pactar', v: String(an.tensiones.length), st: an.tensiones.length ? 'warn' : 'ok' }] : [], lec.encM != null ? [{ k: 'Encaje medio con el puesto', v: lec.encM + ' %', st: lec.encM >= 75 ? 'ok' : lec.encM >= 55 ? 'warn' : 'stop' }] : []))}
      <div class="pp-nota"><b>Uso responsable.</b> ${esc(Fm.LIM_BASE)}</div>`);
    pag('Equipo', 'Composición', `
      <p class="pp-intro">Quién forma ${esc(lec.eq)} y el perfil de cada persona.</p>
      ${tabla(['Persona', 'Puesto', 'Estilo de comportamiento', 'Aportación natural'].concat(hayId ? ['Identidad'] : [], ['Encaje']), M.map((p) => { const est = p.disc && R.discEstilo(p.disc), enc = R.encaje(p, R.puestoDe(p)), a = arq(p); return [{ h: `<b>${esc(p.nombre)}</b>` }, (R.puestoDe(p) || {}).nombre || '—', est ? { h: `<span class="pp-dot" style="background:${H.DISC[est.pri].c}"></span>${esc(est.nombre)}` } : '—', p.roles && p.roles.scores ? H.ROLES[R.rolesOrden(p.roles.scores)[0]].n : '—'].concat(hayId ? [a ? a.e.n : '—'] : [], [enc && enc.total != null ? { h: pill(enc.st, enc.total + ' %') } : '—']); }))}`);
    if (an.conDisc.length) {
      pag('Equipo', 'Mapa conductual del equipo', `
        <p class="pp-intro">Dónde se sitúa cada persona respecto a las ocho tendencias de comportamiento. Un equipo con puntos repartidos cubre más situaciones; uno concentrado comparte fortalezas y puntos ciegos.</p>
        <div class="pp-mapa-w">${pp.mapa(null, null, 'Cada círculo es una persona, con sus iniciales y el color de su estilo principal', an.conDisc.map((p) => ({ d: p.disc, t: ini(p.nombre), nombre: p.nombre + ' · ' + R.discEstilo(p.disc).nombre, c: H.DISC[R.discEstilo(p.disc).pri].c })))}</div>
        <ol class="pe-ley pp-ley">${an.conDisc.map((p) => `<li><b style="background:${H.DISC[R.discEstilo(p.disc).pri].c}">${esc(ini(p.nombre))}</b><span>${esc(p.nombre)}</span></li>`).join('')}</ol>
        <div class="pp-row"><div>${pp.banda('Perfil medio del equipo')}<p>${F4.map((k) => `<b style="color:${H.DISC[k].c}">${k}</b> ${esc(H.DISC[k].n.toLowerCase())}: ${media[k]}`).join(' · ')}. Reparto de estilos principales: ${F4.map((k) => `${an.dist[k]} ${esc(H.DISC[k].n.toLowerCase())}`).join(', ')}.</p></div>${pp.barras(media, 'Media del equipo')}</div>`);
      pag('Equipo', 'Perfiles de comportamiento', `
        <p class="pp-intro">El perfil de comportamiento de cada persona: dominancia (D), influencia (I), estabilidad (S) y cumplimiento (C), de 0 a 100.</p>
        <div class="pp-minis">${an.conDisc.map((p) => `<div><b>${esc(p.nombre)}</b><small>${esc(R.discEstilo(p.disc).nombre)}</small>${pp.barras(p.disc, '')}</div>`).join('')}</div>`);
    }
    if (an.conRoles.length) {
      pag('Equipo', 'Aportaciones al equipo', `
        <p class="pp-intro">Un equipo equilibrado tiene cubiertas las nueve aportaciones, aunque una persona cubra varias. Verde: alguien la tiene como aportación natural (60 % o más); ámbar: a medias; rojo: nadie la cubre.</p>
        ${tabla(['Aportación', 'Familia', 'Quién la cubre mejor', 'Puntuación', 'Situación'], an.cobertura.map((c) => [H.ROLES[c.k].n, H.ROLES[c.k].g, c.best ? R.nombre(c.best.id) : '—', c.best ? c.best.v + ' %' : '—', { h: pill(c.nivel === 'sin' ? 'warn' : c.nivel, c.nivel === 'ok' ? 'Cubierta' : c.nivel === 'warn' ? 'A medias' : 'Sin cubrir') }]))}
        ${an.faltan.length ? `<div class="pp-resumen"><b>Falta:</b> ${an.faltan.map((k) => esc(H.ROLES[k].n.toLowerCase())).join(', ')}. ${esc(H.ROLES[an.faltan[0]].falta)}</div>` : '<div class="pp-resumen">Todas las aportaciones tienen a alguien que las cubre.</div>'}`);
    }
    const conA = M.filter((p) => arq(p));
    if (an.conEnea.length || conA.length) {
      const cuenta = (l) => { const o = {}; l.forEach((x) => (o[x] = (o[x] || 0) + 1)); return Object.entries(o).sort((a, b) => b[1] - a[1]); };
      pag('Equipo', conA.length ? 'Motivación e identidad' : 'Motivación', `
        <p class="pp-intro">Lo que mueve a las personas del equipo${conA.length ? ' y su identidad de fondo' : ''}. Un equipo con motivaciones distintas necesita un liderazgo que hable a cada una.</p>
        ${an.conEnea.length ? `${pp.banda('Centros de motivación')}<p>${Object.keys(an.centros).map((c) => `<b>${esc(c)}</b>: ${an.centros[c]}`).join(' · ')}.</p>${tabla(['Persona', 'Le mueve', 'Le incomoda'], an.conEnea.map((p) => [p.nombre, H.ENEA[p.enea.tipo].motivacion, H.ENEA[p.enea.tipo].miedo]))}` : ''}
        ${conA.length ? `${pp.banda('Identidad de fondo y momento actual')}${tabla(['Persona', 'Identidad', 'Momento actual'], conA.map((p) => { const a = arq(p); return [p.nombre, a.e.n + ' · ' + a.e.lema, a.c.n]; }))}<p class="pp-intro">Identidades presentes: ${cuenta(conA.map((p) => arq(p).e.n)).map(([k, v]) => `${esc(k)} (${v})`).join(', ')}.</p>` : ''}`);
    }
    const lideres = M.filter((p) => M.some((x) => x.responsable === p.id) || (p.lid && p.lid.estilo));
    const mm = lideres.length && R.mapaMando ? lideres.flatMap((l) => R.mapaMando(l).filter((f) => f.t && f.nv).map((f) => [l.nombre, f.c.nombre, f.t.nombre, A.liderazgoDatos.ESTILOS[f.toca].n, f.des ? { h: pill(f.des.st, f.des.st === 'ok' ? 'Ajustado' : f.des.tipo === 'mas' ? 'Dirige de más' : 'Dirige de menos') } : '—'])).slice(0, 14) : [];
    const conLid = M.filter((p) => p.disc || (R.lidCalc && p.lid && p.lid.estilo && R.lidCalc(p.lid.estilo.resp)));
    if (conLid.length || mm.length) pag('Equipo', 'Liderazgo', `
      <p class="pp-intro">El estilo de liderazgo natural de cada persona según su comportamiento y, cuando se ha valorado, su estilo de dirección de referencia.</p>
      ${conLid.length ? tabla(['Persona', 'Estilo natural de liderazgo', 'Estilo de dirección de referencia', 'Eficacia'], conLid.map((p) => { const est = p.disc && R.discEstilo(p.disc), lc = R.lidCalc && p.lid && p.lid.estilo && R.lidCalc(p.lid.estilo.resp), LE = A.liderazgoDatos && A.liderazgoDatos.ESTILOS; return [p.nombre, est ? X.ESTILO[est.pri].lid.n : '—', lc && LE ? LE[lc.pri].n : '—', lc ? lc.eficacia + ' %' : '—']; })) : ''}
      ${mm.length ? `${pp.banda('Dirección por tarea')}${tabla(['Responsable', 'Colaborador', 'Tarea', 'Estilo que corresponde', 'Ajuste'], mm)}` : ''}`);
    if (an.conDisc.length) {
      const cp = X.COMPETENCIAS.map((c) => ({ n: c.n, v: r0(an.conDisc.reduce((a, p) => a + X.calc(c.w, p.disc), 0) / an.conDisc.length) })).sort((a, b) => b.v - a.v);
      pag('Equipo', 'Competencias del equipo', `
        <p class="pp-intro">La facilidad media del equipo en dieciséis competencias conductuales. Las más altas son sus fortalezas naturales; las más bajas, las que le exigirán más esfuerzo o una incorporación que las aporte.</p>
        <div class="pp-comp">${cp.map((x) => pp.filaBar(x.n, x.v)).join('')}</div>
        <div class="pp-cols"><div>${pp.banda('Fortalezas naturales')}${pp.lista(cp.slice(0, 4).map((x) => x.n))}</div><div>${pp.banda('Le exigen más esfuerzo')}${pp.lista(cp.slice(-4).reverse().map((x) => x.n))}</div></div>`);
    }
    if (an.conDisc.length) pag('Equipo', 'Diferencias de estilo', `
      <p class="pp-intro">Diferencias de estilo que conviene pactar: no son conflictos, son formas distintas de trabajar.</p>
      ${an.tensiones.length ? tabla(['Entre', 'Diferencia', 'Cómo pactarla'], an.tensiones.slice(0, 10).map((t) => [R.nombre(t.a) + ' y ' + R.nombre(t.b), t.t.txt, t.t.clave])) : '<p>No hay diferencias de estilo relevantes entre los miembros valorados.</p>'}`);
    if (lec.ri.length || lec.op.length) pag('Diagnóstico', 'Riesgos y oportunidades', `
      <p class="pp-intro">Lo que conviene vigilar y lo que conviene aprovechar${objetivo ? ' para el objetivo «' + esc(objetivo) + '»' : ''}.</p>
      ${pp.ryoPp(lec.ri, lec.op)}`);
    const tq = lec.tq;
    pag('Plan del equipo', 'Recomendaciones y próximos pasos', `
      <p class="pp-intro">Acciones por orden de prioridad, con su impacto esperado, responsable y plazo.</p>
      ${pp.recosPp(lec.rc)}
      ${an.conDisc.length || an.conRoles.length ? `${pp.banda('Fichas de entrenamiento para el equipo')}<div class="pp-tabs">${tq.slice(0, 4).map((t) => `<div class="pp-tab"><b>${esc(t.t.titulo)}</b><p>${esc(t.t.objetivo)}</p><ol>${t.t.pasos.slice(0, 3).map((s) => `<li>${esc(s)}</li>`).join('')}</ol><small>${esc(t.motivos.join(' '))}</small></div>`).join('')}</div>
      ${pp.banda('Hitos')}<ol class="pp-list pp-ol"><li>Mes 1: sesión de devolución de 60 minutos con todo el equipo.</li><li>Mes 1: cinco normas de funcionamiento acordadas (reuniones, mensajes, desacuerdos, plazos y ayuda).</li>${an.faltan.length ? `<li>Mes 3: decidido quién cubre ${esc(H.ROLES[an.faltan[0]].n.toLowerCase())} o si se incorpora a alguien.</li>` : ''}<li>Mes 3: revisión del equipo con este mismo diagnóstico.</li></ol>` : ''}
      ${pp.firma()}`);
    pag('Anexo', 'Metodología, fuentes y limitaciones', pp.anexoPp([an.conDisc.length && Fm.MET.disc, an.conRoles.length && Fm.MET.roles, an.conEnea.length && Fm.MET.enea, lec.encM != null && Fm.MET.encaje, an.conDisc.length && ['Competencias conductuales', 'Estimación de la facilidad natural en cada competencia a partir de los cuatro factores de comportamiento. No valora el desempeño.'], Fm.MET.fuentes].filter(Boolean), lec.lim));
    pp.montar({ pages, nota: an.conDisc.length < M.length || an.conRoles.length < M.length ? `Faltan cuestionarios por responder: comportamiento, ${M.length - an.conDisc.length} de ${M.length} personas; aportaciones, ${M.length - an.conRoles.length} de ${M.length}.` : '', titulo: 'Diagnóstico completo del equipo · ' + nombre, pie: `${esc(In.marcaTxt())} · Equipo ${esc(nombre)} · ${esc(e.nombre)}${In.elaborado() ? ' · ' + esc(In.elaborado()) : ''}`,
      portada: pp.portada({ kicker: 'Personas y organización', titulo: 'Diagnóstico completo del equipo', nombre, linea: [Fm.pl(M.length, 'persona', 'personas'), objetivo && 'Objetivo: ' + objetivo, e.nombre].filter(Boolean).join(' · '), incl: ['Resumen ejecutivo', 'Composición'].concat(lec.ri.length || lec.op.length ? ['Riesgos y oportunidades'] : [], ['Recomendaciones']) }) });
  };

  /* ---------- Alineamiento de perfiles, puestos y equipos ---------- */
  R.informeAlineamiento = () => {
    const In = A.informe, e = R.empresa(), ps = R.state.personas, pu = R.state.puestos, pp = P(), est = R.estructura();
    if (!ps.length) { In.reset(); In.open({ titulo: 'Encaje de personas, puestos y equipos', html: In.cover({ empresa: e.nombre, sector: e.sector, tipo: 'Personas y organización', kicker: 'Encaje de personas, puestos y equipos', titulo: 'Personas, puestos y equipos' }) + In.summary('Alcance', '<p>La empresa no ha aportado la relación de personas y puestos. El análisis de encaje queda fuera del alcance de este documento.</p>') + In.foot('Documento orientativo para el desarrollo profesional. No debe ser el único criterio en decisiones sobre personas.'), after: (paper) => R.notaTrabajo(paper, 'Dé de alta la plantilla y los puestos para elaborar este análisis.') }); return; }
    const pages = [], pag = (titulo, sub, html, idx) => pages.push({ titulo, sub, html, idx: idx !== false });
    const filas = ps.map((p) => ({ p, q: R.puestoDe(p), e: R.encaje(p, R.puestoDe(p)) }));
    const con = filas.filter((f) => f.e && f.e.total != null), media = con.length ? r0(con.reduce((a, f) => a + f.e.total, 0) / con.length) : null;
    const bajos = con.filter((f) => f.e.st === 'stop'), sinPerfil = pu.filter((q) => !q.disc), criticos = pu.filter((q) => q.critico);
    const ranking = (q) => ps.map((p) => ({ p, e: R.encaje(p, q) })).filter((x) => x.e && x.e.total != null).sort((a, b) => b.e.total - a.e.total);
    // Reubicaciones: personas con encaje bajo que encajan claramente mejor en otro puesto
    const reub = bajos.map((f) => { const alt = pu.filter((q) => q !== f.q).map((q) => ({ q, e: R.encaje(f.p, q) })).filter((x) => x.e && x.e.total != null).sort((a, b) => b.e.total - a.e.total)[0]; return alt && alt.e.total - f.e.total >= 15 ? { f, alt } : null; }).filter(Boolean);
    const eqs = R.state.equipos.map((q) => ({ q, an: R.analizarEquipo(q.miembros) }));
    const Fm = R.inf, pl = Fm.pl, critSin = criticos.filter((q) => !est.ocupantes(q.id).length || !q.sucesor || !R.persona(q.sucesor));
    const lead = !con.length ? `${esc(e.nombre)} cuenta con ${pl(ps.length, 'persona', 'personas')} en ${pl(pu.length, 'puesto', 'puestos')}. El encaje entre personas y puestos queda por valorar.`
      : bajos.length ? `<b>${pl(bajos.length, 'persona encaja', 'personas encajan')} por debajo del 55 %</b> con su puesto en ${esc(e.nombre)}; el encaje medio es del ${media} %.`
        : `Las personas de ${esc(e.nombre)} encajan con sus puestos al <b>${media} %</b> de media, sin ningún encaje bajo.`;
    const cl = [
      con.length ? `Encaje medio persona-puesto: ${media} % sobre ${pl(con.length, 'persona valorada', 'personas valoradas')}; ${con.filter((f) => f.e.st === 'ok').length} con encaje alto, ${con.filter((f) => f.e.st === 'warn').length} medio y ${bajos.length} bajo.` : '',
      bajos.length ? `Encaje más bajo: ${bajos.slice(0, 3).map((f) => `${esc(f.p.nombre)}, ${f.e.total} % como ${esc(f.q.nombre)}`).join('; ')}.` : '',
      reub.length ? `${pl(reub.length, 'persona encajaría', 'personas encajarían')} al menos 15 puntos mejor en otro puesto de la empresa.` : '',
      criticos.length ? `${critSin.length} de ${pl(criticos.length, 'puesto crítico', 'puestos críticos')} sin relevo designado o sin titular.` : '',
      eqs.some((x) => x.an.faltan.length) ? `Equipos con aportaciones sin cubrir: ${eqs.filter((x) => x.an.faltan.length).map((x) => `${esc(x.q.nombre)} (${x.an.faltan.length})`).join(', ')}.` : ''
    ];
    pag('Encaje', 'Resumen ejecutivo', `
      ${pp.resumenPp(lead, cl)}
      ${kpis([{ k: 'Personas', v: String(ps.length) }].concat(con.length ? [{ k: 'Encaje medio', v: media + ' %', st: media >= 75 ? 'ok' : media >= 55 ? 'warn' : 'stop' }, { k: 'Personas con encaje bajo', v: String(bajos.length), st: bajos.length ? 'stop' : 'ok' }, { k: 'Cambios de puesto a estudiar', v: String(reub.length) }] : [], criticos.length ? [{ k: 'Puestos críticos sin relevo', v: `${critSin.length} de ${criticos.length}`, st: critSin.length ? 'stop' : 'ok' }] : []))}
      <div class="pp-nota"><b>Uso responsable.</b> El encaje compara estilos de comportamiento y aportaciones con lo que requiere el puesto. Es una guía para conversar y desarrollar, no un criterio único para decidir sobre nadie.</div>`);
    pag('Encaje', 'Personas y puestos', `
      <p class="pp-intro">Encaje de cada persona con su puesto: 60 % comportamiento y 40 % aportaciones clave del puesto.</p>
      ${tabla(['Persona', 'Puesto', 'Encaje', 'Comportamiento', 'Aportaciones', 'Principal diferencia'], filas.map((f) => [{ h: `<b>${esc(f.p.nombre)}</b>` }, f.q ? f.q.nombre : '—', f.e && f.e.total != null ? { h: pill(f.e.st, f.e.total + ' %') } : '—', f.e && f.e.disc != null ? f.e.disc + ' %' : '—', f.e && f.e.roles != null ? f.e.roles + ' %' : '—', f.e && f.e.brechas[0] ? f.e.brechas[0].txt : '—'])) }`);
    const pud = pu.filter((q) => q.disc || (q.roles && q.roles.length));
    if (pud.length) pag('Encaje', 'Puestos y candidatos', `
      <p class="pp-intro">Para cada puesto: quién lo ocupa, cómo encaja y quién encajaría mejor dentro de la empresa. Sirve para preparar relevos, promociones y reorganizaciones.</p>
      ${tabla(['Puesto', 'Ocupa', 'Encaje', 'Mejores candidatos internos', 'Relevo'], pud.map((q) => { const occ = est.ocupantes(q.id), rk = ranking(q).slice(0, 3), en = occ[0] && R.encaje(occ[0], q); return [{ h: `<b>${esc(q.nombre)}</b>${q.critico ? ' ' + pill('stop', 'Crítico') : ''}` }, occ.map((x) => x.nombre).join(', ') || '—', en && en.total != null ? { h: pill(en.st, en.total + ' %') } : '—', rk.map((x) => `${x.p.nombre} (${x.e.total} %)`).join(', ') || '—', q.sucesor ? R.nombre(q.sucesor) : q.critico ? { h: pill('stop', 'Sin relevo') } : '—']; }))}`);
    if (eqs.length) pag('Encaje', 'Equipos y objetivos', `
      <p class="pp-intro">Lo que tiene y lo que le falta a cada equipo para su objetivo.</p>
      ${tabla(['Equipo', 'Objetivo', 'Personas', 'Aportaciones sin cubrir', 'Estilo dominante', 'Fricciones'], eqs.map(({ q, an }) => { const top = an.conDisc.length ? F4.slice().sort((a, b) => an.dist[b] - an.dist[a])[0] : null; return [{ h: `<b>${esc(q.nombre)}</b>` }, q.objetivo || '—', String(an.miembros.length), an.faltan.map((k) => H.ROLES[k].n).join(', ') || (an.conRoles.length ? 'Ninguna' : '—'), top ? H.DISC[top].n : '—', String(an.tensiones.length)]; }))}`);
    const ri = bajos.map((f) => [`${f.p.nombre} encaja al ${f.e.total} % como ${f.q.nombre}. ${f.e.brechas[0] ? f.e.brechas[0].txt : ''}`, 'Riesgo de menor rendimiento y de desgaste si no se ajusta el puesto o se entrena la diferencia.'])
      .concat(critSin.map((q) => { const oc = est.ocupantes(q.id)[0]; return [oc ? `El puesto crítico «${q.nombre}» no tiene relevo designado.` : `El puesto crítico «${q.nombre}» está sin cubrir.`, oc ? `Si ${oc.nombre} falta, la función queda sin cobertura.` : 'La función no tiene titular.']; }))
      .concat(eqs.filter((x) => x.an.faltan.length).map((x) => [`Al equipo ${x.q.nombre} le falta: ${x.an.faltan.map((k) => H.ROLES[k].n.toLowerCase()).join(', ')}.`, H.ROLES[x.an.faltan[0]].falta]));
    const op = reub.map(({ f, alt }) => [`${f.p.nombre} encajaría al ${alt.e.total} % como ${alt.q.nombre} (hoy, ${f.e.total} % como ${f.q.nombre}).`, `Mejora de ${alt.e.total - f.e.total} puntos de encaje sin contratar.`])
      .concat(con.filter((f) => f.e.st === 'ok').length ? [[`${con.filter((f) => f.e.st === 'ok').length} de ${pl(con.length, 'persona valorada', 'personas valoradas')} con encaje alto (75 % o más).`, 'Base estable sobre la que apoyar los cambios.']] : []);
    if (ri.length || op.length) pag('Diagnóstico', 'Riesgos y oportunidades', `
      <p class="pp-intro">Lo que conviene vigilar y lo que conviene aprovechar en el encaje entre personas, puestos y equipos.</p>
      ${pp.ryoPp(ri, op)}`);
    const rc = reub.map(({ f, alt }) => ({ q: `Estudiar el cambio de ${f.p.nombre} a ${alt.q.nombre}`, c: 'Conversación con la persona y con ambos responsables antes de decidir.', imp: `Encaje: del ${f.e.total} % al ${alt.e.total} %`, quien: 'Dirección', plazo: '3 meses' }))
      .concat(bajos.filter((f) => !reub.some((r) => r.f === f)).map((f) => ({ q: `Revisar el encaje de ${f.p.nombre} como ${f.q.nombre}`, c: 'Ajustar el puesto o entrenar la principal diferencia.', imp: `Encaje del ${f.e.total} % por encima del 55 %`, quien: f.p.responsable ? R.nombre(f.p.responsable) : 'Dirección', plazo: '3 meses' })))
      .concat(critSin.length ? [{ q: `Asegurar el relevo de ${pl(critSin.length, 'puesto crítico', 'puestos críticos')}: ${critSin.map((q) => q.nombre).join(', ')}`, c: 'Elegir a la persona entre los mejores candidatos internos y acordar un plan de traspaso.', imp: `Puestos críticos sin cobertura asegurada: de ${critSin.length} a 0`, quien: 'Dirección', plazo: '6 meses' }] : [])
      .concat(sinPerfil.length ? [{ q: `Definir lo que ${sinPerfil.length === 1 ? 'requiere el puesto' : 'requieren los ' + sinPerfil.length + ' puestos'} sin perfil`, c: sinPerfil.slice(0, 6).map((q) => q.nombre).join(', ') + (sinPerfil.length > 6 ? '…' : '') + '.', imp: 'Encaje valorable en todos los puestos', quien: 'Dirección', plazo: '2 meses' }] : [])
      .concat(ps.some((p) => !p.disc) ? [{ q: `Extender la valoración de comportamiento a ${pl(ps.filter((p) => !p.disc).length, 'persona más', 'personas más')}`, c: 'Cuestionarios breves, con el consentimiento de cada persona.', imp: `Personas con encaje valorable: de ${con.length} a ${ps.length}`, quien: 'Recursos humanos o dirección', plazo: '1 mes' }] : []);
    const entreno = con.filter((f) => f.e.brechas.length).slice(0, 8);
    pag('Plan', 'Recomendaciones y próximos pasos', `
      <p class="pp-intro">Acciones por orden de prioridad, con su impacto esperado, responsable y plazo.</p>
      ${rc.length ? pp.recosPp(rc) : '<p>El encaje actual no requiere actuaciones: basta con revisarlo cada seis meses.</p>'}
      ${reub.length ? `${pp.banda('Cambios de puesto a estudiar')}${tabla(['Persona', 'Puesto actual', 'Encaje', 'Encajaría mejor en', 'Encaje'], reub.map(({ f, alt }) => [f.p.nombre, f.q.nombre, f.e.total + ' %', alt.q.nombre, alt.e.total + ' %']))}` : ''}
      ${entreno.length ? `${pp.banda('Diferencias que se pueden entrenar')}${tabla(['Persona', 'Ficha de entrenamiento', 'Motivo'], entreno.map((f) => { const t = R.tablillasDe(f.p)[0]; return [f.p.nombre, t ? t.t.titulo : '—', t ? t.motivos[0] : f.e.brechas[0].txt]; }))}` : ''}
      ${pp.firma()}`);
    const lim = [];
    if (con.length < ps.length) lim.push(con.length ? `El encaje se ha valorado en ${con.length} de ${ps.length} personas: las que tienen valorado su estilo de comportamiento y ocupan un puesto con requisitos definidos.` : 'No se ha podido valorar el encaje: falta la valoración del estilo de comportamiento de las personas o la definición de lo que requiere cada puesto.');
    if (sinPerfil.length) lim.push(`${pl(sinPerfil.length, 'puesto no tiene', 'puestos no tienen')} definido el comportamiento que requiere${sinPerfil.length <= 6 ? ': ' + sinPerfil.map((q) => q.nombre).join(', ') : ''}.`);
    lim.push('Un cambio de puesto se señala cuando el encaje mejoraría 15 puntos o más. Es una hipótesis que debe contrastarse con la persona, su trayectoria y su desempeño.', Fm.LIM_BASE);
    pag('Anexo', 'Metodología, fuentes y limitaciones', pp.anexoPp([Fm.MET.encaje, Fm.MET.disc, Fm.MET.roles, Fm.MET.fuentes], lim));
    pp.montar({ pages, nota: con.length < ps.length || sinPerfil.length ? `Para completar el análisis: ${[ps.filter((p) => !p.disc).length && pl(ps.filter((p) => !p.disc).length, 'persona sin cuestionario de comportamiento', 'personas sin cuestionario de comportamiento'), sinPerfil.length && pl(sinPerfil.length, 'puesto sin perfil', 'puestos sin perfil')].filter(Boolean).join(' y ') || 'personas sin puesto asignado'}.` : '', titulo: 'Encaje de personas, puestos y equipos', pie: `${esc(In.marcaTxt())} · Encaje de personas y puestos · ${esc(e.nombre)}${In.elaborado() ? ' · ' + esc(In.elaborado()) : ''}`,
      portada: pp.portada({ kicker: 'Personas y organización', titulo: 'Encaje de personas, puestos y equipos', nombre: e.nombre, linea: `${pl(ps.length, 'persona', 'personas')} · ${pl(pu.length, 'puesto', 'puestos')} · ${pl(R.state.equipos.length, 'equipo', 'equipos')}`, incl: ['Resumen ejecutivo', 'Personas y puestos', 'Candidatos internos', 'Equipos', 'Riesgos y oportunidades', 'Recomendaciones'] }) });
  };

  /* ---------- Accesos ---------- */
  ['disc', 'roles', 'eneagrama', 'identidad'].forEach((id) => { const m = R.mod(id); if (m) { m.informe = () => { const p = R.personaActiva(); if (p) R.informeCompleto(p); }; m.informeTxt = 'Informe completo de la persona'; } });
  const eq = R.mod('equipos'); if (eq) { eq.informe = () => { const sel = document.querySelector('.pe-eqbar [data-eq][aria-pressed="true"]'), q = sel && R.equipo(sel.dataset.eq); R.informeEquipoCompleto(q ? q.miembros : R.state.personas.map((p) => p.id), q ? q.nombre : 'Toda la empresa', q && q.objetivo); }; eq.informeTxt = 'Diagnóstico completo del equipo'; }
  const enc = R.mod('encaje'); if (enc) { enc.informe = () => R.informeAlineamiento(); enc.informeTxt = 'Encaje de personas, puestos y equipos'; }
  R.onShowExtra = (R.onShowExtra || []).concat([(id, body) => {
    if (id === 'equipos') {
      const bar = body.querySelector('.pe-eqbar'); if (!bar || !R.state.personas.length) return;
      const sel = body.querySelector('.pe-eqbar [data-eq][aria-pressed="true"]'), q = sel && R.equipo(sel.dataset.eq), ids = q ? q.miembros : R.state.personas.map((p) => p.id);
      const box = document.createElement('div'); box.className = 'glass pad stack pe-infbox';
      box.innerHTML = `<div class="row"><div><div class="eyebrow">Informes</div><p class="small" style="margin:0">Diagnóstico completo de ${esc(q ? 'este equipo' : 'toda la empresa')}, encaje con los puestos y perfil profesional completo de cada persona, en PDF con membrete.</p></div><span class="spacer"></span><button class="btn solid small" data-i="eq">Diagnóstico completo del equipo</button><button class="btn small" data-i="al">Encaje con los puestos</button></div>
        <div class="pe-infp">${ids.map(R.persona).filter(Boolean).map((p) => `<button class="chip" data-p="${p.id}">${esc(p.nombre)} <small>informe completo</small></button>`).join('')}</div>`;
      bar.after(box);
      box.querySelector('[data-i="eq"]').onclick = () => R.informeEquipoCompleto(ids, q ? q.nombre : 'Toda la empresa', q && q.objetivo);
      box.querySelector('[data-i="al"]').onclick = () => R.informeAlineamiento();
      box.querySelectorAll('[data-p]').forEach((b) => (b.onclick = () => R.informeCompleto(R.persona(b.dataset.p))));
    }
    if (id === 'informes') {
      const g = body.querySelector('.grid'); if (!g) return;
      const box = document.createElement('div'); box.className = 'glass pad stack';
      box.innerHTML = `<div class="eyebrow">Informes completos en PDF</div><p class="small" style="margin:0">Documentos paginados con el membrete de su firma (o de Atalaya 360°), listos para entregar: la foto completa de una persona (comportamiento, aportación, motivación, identidad, liderazgo y competencias), la del equipo y el alineamiento entre perfiles, puestos y equipos.</p>
        <div class="row">${R.selPersona('peInfC', (R.personaActiva() || {}).id)}<button class="btn solid" data-c="per">Informe completo de la persona</button><button class="btn" data-c="eq">Foto de toda la empresa</button><button class="btn" data-c="al">Alineamiento</button></div>`;
      g.before(box);
      box.querySelector('[data-c="per"]').onclick = () => R.informeCompleto(R.persona(box.querySelector('#peInfC').value));
      box.querySelector('[data-c="eq"]').onclick = () => R.informeEquipoCompleto(R.state.personas.map((p) => p.id), 'Toda la empresa');
      box.querySelector('[data-c="al"]').onclick = () => R.informeAlineamiento();
    }
  }]);
  const ficha0 = R.fichaPersona;
  R.fichaPersona = (id) => { ficha0(id); const card = document.querySelector('.pe-ficha'); const p = R.persona(id); if (!card || !p) return; const row = card.querySelector('[data-inf]'); if (!row) return; const b = document.createElement('button'); b.className = 'btn small'; b.textContent = 'Informe completo'; b.onclick = () => { card.closest('.ef-back').remove(); R.informeCompleto(p); }; row.after(b); };
})();
