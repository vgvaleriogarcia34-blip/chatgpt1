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
  const tabla = (heads, rows) => `<table class="pp-t"><thead><tr>${heads.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c && typeof c === 'object' ? c.h : esc(c)}</td>`).join('')}</tr>`).join('') || `<tr><td colspan="${heads.length}">Sin datos.</td></tr>`}</tbody></table>`;
  const kpis = (l) => `<div class="pp-kp">${l.map((k) => `<div class="${k.st || ''}"><span>${esc(k.k)}</span><b>${esc(k.v)}</b>${k.d ? `<small>${esc(k.d)}</small>` : ''}</div>`).join('')}</div>`;
  const arq = (p) => { const x = R.identidad && R.identidad(p), D = A.identidadDatos; return x && D ? { e: D.ARQ[x.esencia] || D.ARQ[1], c: D.CICLO[x.ciclo] } : null; };

  /* ---------- Foto completa del equipo ---------- */
  R.informeEquipoCompleto = (ids, nombre, objetivo) => {
    const In = A.informe, e = R.empresa(), an = R.analizarEquipo(ids), M = an.miembros, pp = P();
    const pages = [], pag = (titulo, sub, html, idx) => pages.push({ titulo, sub, html, idx: idx !== false });
    const media = an.media;
    pag('Equipo', 'Introducción', `
      <p>Este informe hace una foto completa del equipo <b>${esc(nombre)}</b>${objetivo ? `, cuyo objetivo es «${esc(objetivo)}»` : ''}: cómo se comporta cada persona y el conjunto, qué aportaciones tiene cubiertas y cuáles le faltan, qué le motiva, cómo se lidera, qué competencias le resultan naturales y dónde están las fricciones probables.</p>
      ${kpis([{ k: 'Personas', v: String(M.length) }, { k: 'Con DISC', v: `${an.conDisc.length}/${M.length}`, st: an.conDisc.length === M.length ? 'ok' : 'warn' }, { k: 'Con aportaciones', v: `${an.conRoles.length}/${M.length}`, st: an.conRoles.length === M.length ? 'ok' : 'warn' }, { k: 'Aportaciones sin cubrir', v: String(an.faltan.length), st: an.conRoles.length ? (an.faltan.length > 2 ? 'stop' : an.faltan.length ? 'warn' : 'ok') : '' }, { k: 'Fricciones probables', v: String(an.tensiones.length), st: an.tensiones.length ? 'warn' : 'ok' }])}
      ${pp.banda('Lectura general')}${an.avisos.length ? pp.lista(an.avisos.map((a) => a.t)) : '<p>Sin avisos de composición con los datos actuales.</p>'}
      <div class="pp-nota"><b>Uso responsable.</b> ${esc(X.AVISO)}</div>`, false);
    pag('Equipo', 'Composición', `
      <p class="pp-intro">Quién forma el equipo y el perfil de cada persona en las herramientas de Atalaya 360°.</p>
      ${tabla(['Persona', 'Puesto', 'Estilo', 'Aportación natural', 'Motivación', 'Identidad', 'Encaje'], M.map((p) => { const est = p.disc && R.discEstilo(p.disc), enc = R.encaje(p, R.puestoDe(p)), a = arq(p); return [{ h: `<b>${esc(p.nombre)}</b>` }, (R.puestoDe(p) || {}).nombre || '—', est ? { h: `<span class="pp-dot" style="background:${H.DISC[est.pri].c}"></span>${esc(est.nombre)}` } : '—', p.roles && p.roles.scores ? H.ROLES[R.rolesOrden(p.roles.scores)[0]].n : '—', p.enea && p.enea.tipo ? H.ENEA[p.enea.tipo].n : '—', a ? a.e.n : '—', enc && enc.total != null ? { h: pill(enc.st, enc.total + ' %') } : '—']; }))}`);
    if (an.conDisc.length) {
      pag('Equipo', 'Mapa conductual del equipo', `
        <p class="pp-intro">Dónde se sitúa cada persona respecto a las ocho tendencias de comportamiento. Un equipo con puntos repartidos cubre más situaciones; uno concentrado comparte fortalezas y puntos ciegos.</p>
        <div class="pp-mapa-w">${pp.mapa(null, null, 'Cada círculo es una persona, con sus iniciales y el color de su estilo principal', an.conDisc.map((p) => ({ d: p.disc, t: ini(p.nombre), c: H.DISC[R.discEstilo(p.disc).pri].c })))}</div>
        <div class="pp-row"><div>${pp.banda('Perfil medio del equipo')}<p>${F4.map((k) => `<b style="color:${H.DISC[k].c}">${k}</b> ${esc(H.DISC[k].n.toLowerCase())}: ${media[k]}`).join(' · ')}. Reparto de estilos principales: ${F4.map((k) => `${an.dist[k]} ${esc(H.DISC[k].n.toLowerCase())}`).join(', ')}.</p></div>${pp.barras(media, 'Media del equipo')}</div>`);
      pag('Equipo', 'Perfiles de comportamiento', `
        <p class="pp-intro">El perfil DISC de cada persona del equipo.</p>
        <div class="pp-minis">${an.conDisc.slice(0, 12).map((p) => `<div><b>${esc(p.nombre)}</b><small>${esc(R.discEstilo(p.disc).nombre)}</small>${pp.barras(p.disc, '')}</div>`).join('')}</div>`);
    }
    if (an.conRoles.length) {
      pag('Equipo', 'Aportaciones al equipo', `
        <p class="pp-intro">Un equipo equilibrado tiene cubiertas las nueve aportaciones, aunque una persona cubra varias. Verde: alguien la tiene como aportación natural (60 % o más); ámbar: a medias; rojo: nadie la cubre.</p>
        ${tabla(['Aportación', 'Familia', 'Quién la cubre mejor', 'Puntuación', 'Estado'], an.cobertura.map((c) => [H.ROLES[c.k].n, H.ROLES[c.k].g, c.best ? R.nombre(c.best.id) : '—', c.best ? c.best.v + ' %' : '—', { h: pill(c.nivel === 'sin' ? 'warn' : c.nivel, c.nivel === 'ok' ? 'Cubierta' : c.nivel === 'warn' ? 'A medias' : 'Sin cubrir') }]))}
        ${an.faltan.length ? `<div class="pp-resumen"><b>Falta:</b> ${an.faltan.map((k) => esc(H.ROLES[k].n.toLowerCase())).join(', ')}. ${esc(H.ROLES[an.faltan[0]].falta)}</div>` : '<div class="pp-resumen">Todas las aportaciones tienen a alguien que las cubre.</div>'}`);
    }
    const conA = M.filter((p) => arq(p));
    if (an.conEnea.length || conA.length) {
      const cuenta = (l) => { const o = {}; l.forEach((x) => (o[x] = (o[x] || 0) + 1)); return Object.entries(o).sort((a, b) => b[1] - a[1]); };
      pag('Equipo', 'Motivación e identidad', `
        <p class="pp-intro">Lo que mueve a las personas del equipo y su identidad de fondo. Un equipo con motivaciones distintas necesita un liderazgo que hable a cada una.</p>
        ${an.conEnea.length ? `${pp.banda('Centros de motivación')}<p>${Object.keys(an.centros).map((c) => `<b>${esc(c)}</b>: ${an.centros[c]}`).join(' · ')}.</p>${tabla(['Persona', 'Le mueve', 'Teme'], an.conEnea.map((p) => [p.nombre, H.ENEA[p.enea.tipo].motivacion, H.ENEA[p.enea.tipo].miedo]))}` : ''}
        ${conA.length ? `${pp.banda('Identidad de fondo y momento actual')}${tabla(['Persona', 'Identidad', 'Momento actual'], conA.map((p) => { const a = arq(p); return [p.nombre, a.e.n + ' · ' + a.e.lema, a.c.n]; }))}<p class="pp-intro">Identidades presentes: ${cuenta(conA.map((p) => arq(p).e.n)).map(([k, v]) => `${esc(k)} (${v})`).join(', ')}.</p>` : ''}`);
    }
    const lideres = M.filter((p) => M.some((x) => x.responsable === p.id) || (p.lid && p.lid.estilo));
    const mm = lideres.length && R.mapaMando ? lideres.flatMap((l) => R.mapaMando(l).filter((f) => f.t && f.nv).map((f) => [l.nombre, f.c.nombre, f.t.nombre, A.liderazgoDatos.ESTILOS[f.toca].n, f.des ? { h: pill(f.des.st, f.des.st === 'ok' ? 'Ajustado' : f.des.tipo === 'mas' ? 'Dirige de más' : 'Suelta de más') } : '—'])).slice(0, 14) : [];
    pag('Equipo', 'Liderazgo', `
      <p class="pp-intro">Quién lidera dentro del equipo y con qué estilo, y el estilo de liderazgo natural de cada persona según su comportamiento.</p>
      ${tabla(['Persona', 'Estilo natural de liderazgo', 'Estilo en el test de situaciones', 'Eficacia'], M.map((p) => { const est = p.disc && R.discEstilo(p.disc), lc = R.lidCalc && p.lid && p.lid.estilo && R.lidCalc(p.lid.estilo.resp), LE = A.liderazgoDatos && A.liderazgoDatos.ESTILOS; return [p.nombre, est ? X.ESTILO[est.pri].lid.n : '—', lc && LE ? LE[lc.pri].n : '—', lc ? lc.eficacia + ' %' : '—']; }))}
      ${mm.length ? `${pp.banda('Mapa de mando')}${tabla(['Líder', 'Colaborador', 'Tarea', 'Toca', 'Ajuste'], mm)}` : ''}`);
    if (an.conDisc.length) {
      const cp = X.COMPETENCIAS.map((c) => ({ n: c.n, v: r0(an.conDisc.reduce((a, p) => a + X.calc(c.w, p.disc), 0) / an.conDisc.length) })).sort((a, b) => b.v - a.v);
      pag('Equipo', 'Competencias del equipo', `
        <p class="pp-intro">La facilidad media del equipo en dieciséis competencias conductuales. Las más altas son sus fortalezas naturales; las más bajas, las que le exigirán más esfuerzo o una incorporación que las aporte.</p>
        <div class="pp-comp">${cp.map((x) => pp.filaBar(x.n, x.v)).join('')}</div>
        <div class="pp-cols"><div>${pp.banda('Fortalezas naturales')}${pp.lista(cp.slice(0, 4).map((x) => x.n))}</div><div>${pp.banda('Le exigen más esfuerzo')}${pp.lista(cp.slice(-4).reverse().map((x) => x.n))}</div></div>`);
    }
    pag('Equipo', 'Dinámica y fricciones', `
      <p class="pp-intro">Diferencias de estilo que conviene pactar: no son conflictos, son formas distintas de trabajar.</p>
      ${an.tensiones.length ? tabla(['Entre', 'Diferencia', 'Cómo pactarla'], an.tensiones.slice(0, 10).map((t) => [R.nombre(t.a) + ' y ' + R.nombre(t.b), t.t.txt, t.t.clave])) : '<p>No se detectan fricciones probables entre estilos.</p>'}
      ${an.contratar ? `${pp.banda('Próxima incorporación')}<p>Para equilibrar el equipo, busque ${an.contratar.rol ? `la aportación de <b>${esc(H.ROLES[an.contratar.rol].n.toLowerCase())}</b>` : ''}${an.contratar.rol && an.contratar.estilo ? ' y ' : ''}${an.contratar.estilo ? `un estilo con más <b>${esc(H.DISC[an.contratar.estilo].n.toLowerCase())}</b>` : ''}.</p>` : ''}`);
    const tq = R.tablillasEquipo(an);
    pag('Equipo', 'Plan del equipo', `
      <p class="pp-intro">Fichas de entrenamiento para el equipo y próximos pasos.</p>
      <div class="pp-tabs">${tq.slice(0, 4).map((t) => `<div class="pp-tab"><b>${esc(t.t.titulo)}</b><p>${esc(t.t.objetivo)}</p><ol>${t.t.pasos.slice(0, 3).map((s) => `<li>${esc(s)}</li>`).join('')}</ol><small>${esc(t.motivos.join(' '))}</small></div>`).join('')}</div>
      ${pp.banda('Próximos pasos')}<ol class="pp-list pp-ol"><li>Sesión de devolución de 60 minutos con todo el equipo: cada persona comparte su estilo y cómo prefiere que le pidan las cosas.</li><li>Acordar cinco normas de funcionamiento (reuniones, mensajes, desacuerdos, plazos y ayuda).</li>${an.faltan.length ? `<li>Decidir quién cubre ${esc(H.ROLES[an.faltan[0]].n.toLowerCase())} o si se incorpora a alguien.</li>` : ''}<li>Revisar el equipo en tres meses con este mismo informe.</li></ol>
      <div class="pp-firma"><div><span>Preparado por</span><b>Business Avance · Atalaya 360°</b></div><div><span>Para</span><b>${esc(e.nombre)}</b></div><div><span>Fecha</span><b>${esc(In.fecha())}</b></div></div>`);
    pp.montar({ pages, titulo: 'Foto del equipo · ' + nombre, pie: `Business Avance · Atalaya 360° · Equipo ${esc(nombre)} · ${esc(e.nombre)}`,
      portada: pp.portada({ kicker: 'Personas y equipos', titulo: 'Foto completa del equipo', nombre, linea: `${M.length} personas · ${e.nombre}`, incl: ['Composición', 'Mapa conductual', 'Aportaciones', 'Motivación', 'Liderazgo', 'Competencias', 'Dinámica'] }) });
  };

  /* ---------- Alineamiento de perfiles, puestos y equipos ---------- */
  R.informeAlineamiento = () => {
    const In = A.informe, e = R.empresa(), ps = R.state.personas, pu = R.state.puestos, pp = P(), est = R.estructura();
    const pages = [], pag = (titulo, sub, html, idx) => pages.push({ titulo, sub, html, idx: idx !== false });
    const filas = ps.map((p) => ({ p, q: R.puestoDe(p), e: R.encaje(p, R.puestoDe(p)) }));
    const con = filas.filter((f) => f.e && f.e.total != null), media = con.length ? r0(con.reduce((a, f) => a + f.e.total, 0) / con.length) : null;
    const bajos = con.filter((f) => f.e.st === 'stop'), sinPerfil = pu.filter((q) => !q.disc), criticos = pu.filter((q) => q.critico);
    const ranking = (q) => ps.map((p) => ({ p, e: R.encaje(p, q) })).filter((x) => x.e && x.e.total != null).sort((a, b) => b.e.total - a.e.total);
    // Reubicaciones: personas con encaje bajo que encajan claramente mejor en otro puesto
    const reub = bajos.map((f) => { const alt = pu.filter((q) => q !== f.q).map((q) => ({ q, e: R.encaje(f.p, q) })).filter((x) => x.e && x.e.total != null).sort((a, b) => b.e.total - a.e.total)[0]; return alt && alt.e.total - f.e.total >= 15 ? { f, alt } : null; }).filter(Boolean);
    const eqs = R.state.equipos.map((q) => ({ q, an: R.analizarEquipo(q.miembros) }));
    const imp = [].concat(bajos.slice(0, 3).map((f) => `${f.p.nombre} encaja al ${f.e.total} % en ${f.q.nombre}. ${f.e.brechas[0] ? f.e.brechas[0].txt : ''}`), est.avisos.filter((a) => a.st === 'stop').slice(0, 3).map((a) => a.t), eqs.filter((x) => x.an.faltan.length).slice(0, 2).map((x) => `Al equipo ${x.q.nombre} le falta: ${x.an.faltan.map((k) => H.ROLES[k].n.toLowerCase()).join(', ')}.`), sinPerfil.length ? [`${sinPerfil.length} puesto${sinPerfil.length > 1 ? 's' : ''} sin perfil definido: sin perfil no se puede medir el encaje.`] : []).slice(0, 8);
    pag('Alineamiento', 'Resumen', `
      <p>Este informe comprueba si las personas, los puestos y los equipos de <b>${esc(e.nombre)}</b> están alineados: si cada persona encaja en su puesto, si cada puesto tiene a su mejor candidato y su relevo, y si cada equipo tiene lo que necesita para su objetivo.</p>
      ${kpis([{ k: 'Encaje medio', v: media == null ? '—' : media + ' %', st: media == null ? '' : media >= 75 ? 'ok' : media >= 55 ? 'warn' : 'stop' }, { k: 'Encaje bajo', v: String(bajos.length), st: bajos.length ? 'stop' : 'ok' }, { k: 'Puestos sin perfil', v: String(sinPerfil.length), st: sinPerfil.length ? 'warn' : 'ok' }, { k: 'Críticos sin relevo', v: String(est.avisos.filter((a) => a.st === 'stop').length), st: est.avisos.some((a) => a.st === 'stop') ? 'stop' : 'ok' }, { k: 'Reubicaciones a estudiar', v: String(reub.length) }])}
      ${pp.banda('Lo más importante')}${pp.lista(imp.length ? imp : ['Sin alertas graves de alineamiento.'])}
      <div class="pp-nota"><b>Uso responsable.</b> El encaje compara estilos de comportamiento y aportaciones con lo que pide el puesto. Es una guía para conversar y desarrollar, no un criterio único para decidir sobre nadie.</div>`, false);
    pag('Alineamiento', 'Personas y puestos', `
      <p class="pp-intro">Encaje de cada persona con su puesto: 60 % comportamiento (DISC frente al perfil del puesto) y 40 % aportaciones clave.</p>
      ${tabla(['Persona', 'Puesto', 'Encaje', 'Comportamiento', 'Aportaciones', 'Brecha principal'], filas.map((f) => [{ h: `<b>${esc(f.p.nombre)}</b>` }, f.q ? f.q.nombre : 'Sin puesto', f.e && f.e.total != null ? { h: pill(f.e.st, f.e.total + ' %') } : '—', f.e && f.e.disc != null ? f.e.disc + ' %' : '—', f.e && f.e.roles != null ? f.e.roles + ' %' : '—', f.e && f.e.brechas[0] ? f.e.brechas[0].txt : f.q ? '—' : 'Asignar un puesto'])) }`);
    const pud = pu.filter((q) => q.disc || (q.roles && q.roles.length));
    if (pud.length) pag('Alineamiento', 'Puestos y candidatos', `
      <p class="pp-intro">Para cada puesto con perfil: quién lo ocupa, cómo encaja y quién encajaría mejor dentro de la empresa. Útil para relevos, promociones y reorganizaciones.</p>
      ${tabla(['Puesto', 'Ocupa', 'Encaje', 'Mejores candidatos internos', 'Relevo'], pud.map((q) => { const occ = est.ocupantes(q.id), rk = ranking(q).slice(0, 3), en = occ[0] && R.encaje(occ[0], q); return [{ h: `<b>${esc(q.nombre)}</b>${q.critico ? ' ' + pill('stop', 'Crítico') : ''}` }, occ.map((x) => x.nombre).join(', ') || '—', en && en.total != null ? { h: pill(en.st, en.total + ' %') } : '—', rk.map((x) => `${x.p.nombre} (${x.e.total} %)`).join(', ') || '—', q.sucesor ? R.nombre(q.sucesor) : q.critico ? { h: pill('stop', 'Sin relevo') } : '—']; }))}`);
    if (eqs.length) pag('Alineamiento', 'Equipos y objetivos', `
      <p class="pp-intro">Lo que tiene y lo que le falta a cada equipo para su objetivo.</p>
      ${tabla(['Equipo', 'Objetivo', 'Personas', 'Aportaciones sin cubrir', 'Estilo dominante', 'Fricciones'], eqs.map(({ q, an }) => { const top = an.conDisc.length ? F4.slice().sort((a, b) => an.dist[b] - an.dist[a])[0] : null; return [{ h: `<b>${esc(q.nombre)}</b>` }, q.objetivo || '—', String(an.miembros.length), an.faltan.map((k) => H.ROLES[k].n).join(', ') || (an.conRoles.length ? 'Ninguna' : '—'), top ? H.DISC[top].n : '—', String(an.tensiones.length)]; }))}`);
    pag('Alineamiento', 'Recomendaciones', `
      <p class="pp-intro">Acciones para mejorar el alineamiento, de más a menos urgente.</p>
      ${reub.length ? `${pp.banda('Reubicaciones a estudiar')}${tabla(['Persona', 'Puesto actual', 'Encaje', 'Encajaría mejor en', 'Encaje'], reub.map(({ f, alt }) => [f.p.nombre, f.q.nombre, f.e.total + ' %', alt.q.nombre, alt.e.total + ' %']))}` : ''}
      ${pp.banda('Cerrar brechas con entrenamiento')}${tabla(['Persona', 'Ficha de entrenamiento', 'Por qué'], con.filter((f) => f.e.brechas.length).slice(0, 8).map((f) => { const t = R.tablillasDe(f.p)[0]; return [f.p.nombre, t ? t.t.titulo : '—', t ? t.motivos[0] : f.e.brechas[0].txt]; }))}
      ${pp.banda('Relevos y estructura')}${pp.lista(est.avisos.filter((a) => a.st !== 'info').slice(0, 6).map((a) => a.t).concat(est.avisos.some((a) => a.st !== 'info') ? [] : ['Sin alertas de estructura.']))}
      <div class="pp-firma"><div><span>Preparado por</span><b>Business Avance · Atalaya 360°</b></div><div><span>Para</span><b>${esc(e.nombre)}</b></div><div><span>Fecha</span><b>${esc(In.fecha())}</b></div></div>`);
    pp.montar({ pages, titulo: 'Alineamiento de perfiles, puestos y equipos', pie: `Business Avance · Atalaya 360° · Alineamiento · ${esc(e.nombre)}`,
      portada: pp.portada({ kicker: 'Personas y equipos', titulo: 'Alineamiento', nombre: 'Perfiles, puestos y equipos', linea: `${ps.length} personas · ${pu.length} puestos · ${R.state.equipos.length} equipos · ${e.nombre}`, incl: ['Personas y puestos', 'Candidatos internos', 'Relevos', 'Equipos', 'Recomendaciones'] }) });
  };

  /* ---------- Accesos ---------- */
  ['disc', 'roles', 'eneagrama', 'identidad'].forEach((id) => { const m = R.mod(id); if (m) { m.informe = () => { const p = R.personaActiva(); if (p) R.informeCompleto(p); }; m.informeTxt = 'Informe completo de la persona'; } });
  const eq = R.mod('equipos'); if (eq) { eq.informe = () => { const sel = document.querySelector('.pe-eqbar [data-eq][aria-pressed="true"]'), q = sel && R.equipo(sel.dataset.eq); R.informeEquipoCompleto(q ? q.miembros : R.state.personas.map((p) => p.id), q ? q.nombre : 'Toda la empresa', q && q.objetivo); }; eq.informeTxt = 'Foto completa del equipo'; }
  const enc = R.mod('encaje'); if (enc) { enc.informe = () => R.informeAlineamiento(); enc.informeTxt = 'Informe de alineamiento'; }
  R.onShowExtra = (R.onShowExtra || []).concat([(id, body) => {
    if (id === 'equipos') {
      const bar = body.querySelector('.pe-eqbar'); if (!bar || !R.state.personas.length) return;
      const sel = body.querySelector('.pe-eqbar [data-eq][aria-pressed="true"]'), q = sel && R.equipo(sel.dataset.eq), ids = q ? q.miembros : R.state.personas.map((p) => p.id);
      const box = document.createElement('div'); box.className = 'glass pad stack pe-infbox';
      box.innerHTML = `<div class="row"><div><div class="eyebrow">Informes</div><p class="small" style="margin:0">Foto completa de ${esc(q ? 'este equipo' : 'toda la empresa')}, alineamiento con los puestos e informe completo de cada persona, en PDF con membrete.</p></div><span class="spacer"></span><button class="btn solid small" data-i="eq">Foto completa del equipo</button><button class="btn small" data-i="al">Alineamiento</button></div>
        <div class="pe-infp">${ids.map(R.persona).filter(Boolean).map((p) => `<button class="chip" data-p="${p.id}">${esc(p.nombre)} <small>informe completo</small></button>`).join('')}</div>`;
      bar.after(box);
      box.querySelector('[data-i="eq"]').onclick = () => R.informeEquipoCompleto(ids, q ? q.nombre : 'Toda la empresa', q && q.objetivo);
      box.querySelector('[data-i="al"]').onclick = () => R.informeAlineamiento();
      box.querySelectorAll('[data-p]').forEach((b) => (b.onclick = () => R.informeCompleto(R.persona(b.dataset.p))));
    }
    if (id === 'informes') {
      const g = body.querySelector('.grid'); if (!g) return;
      const box = document.createElement('div'); box.className = 'glass pad stack';
      box.innerHTML = `<div class="eyebrow">Informes completos en PDF</div><p class="small" style="margin:0">Documentos paginados con membrete de Business Avance y Atalaya 360°, listos para entregar: la foto completa de una persona (comportamiento, aportación, motivación, identidad, liderazgo y competencias), la del equipo y el alineamiento entre perfiles, puestos y equipos.</p>
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
