/* Atalaya · Personas y equipos · módulos
   Visión (panorama, plantilla) · Herramientas (DISC, aportaciones al equipo, eneagrama) ·
   Estructura (puestos, encaje, organigrama, talento) · Equipos · Desarrollo (tablillas, informes). */
(function () {
  const A = window.Atalaya, H = A.personasDatos, R = A.personas;
  const { $, $$, esc } = R;
  const I = () => A.informe;
  const NIV = { 1: 'Bajo', 2: 'Medio', 3: 'Alto' };
  const pct = (v) => (v == null ? '—' : v + ' %');
  const kpis = (list) => `<div class="kpis" style="margin-top:0">${list.map((t) => `<div class="kpi"><div class="k"><span>${t.k}</span>${t.st ? R.pill(t.st, { ok: 'Bien', warn: 'Revisar', stop: 'Atención' }[t.st]) : ''}</div><div class="v">${t.v}</div>${t.d ? `<div class="d">${t.d}</div>` : ''}</div>`).join('')}</div>`;
  const confirmar = (btn, fn) => { if (btn.dataset.ok) return fn(); btn.dataset.ok = '1'; const t = btn.textContent; btn.textContent = '¿Seguro? Pulse otra vez'; btn.classList.add('del-btn'); setTimeout(() => { if (btn.isConnected) { delete btn.dataset.ok; btn.textContent = t; btn.classList.remove('del-btn'); } }, 3500); };

  /* Bloqueo amable: sin consentimiento no se pasan cuestionarios */
  const pideConsent = (p) => `<div class="alert warn stack"><span>Antes de pasar un cuestionario a <b>${esc(p.nombre)}</b>, explíquele para qué es y pida su consentimiento. Puede ver sus resultados y pedir que se borren.${R.identidadActiva && R.identidadActiva() ? ' Si se indica su fecha de nacimiento, se usa para una lectura complementaria y orientativa de su perfil.' : ''} También puede enviárselo por enlace: lo responde desde su móvil y da su consentimiento al abrirlo.</span><div class="row"><button class="btn solid small" id="peCons">Tengo su consentimiento</button></div></div>`;
  const wireConsent = (host, p) => { const b = $('#peCons', host); if (b) b.onclick = () => { p.consentimiento = true; p.consentFecha = R.hoy(); R.save(); R.rerender(); }; };
  /* Cabecera de herramienta: elegir persona */
  const cabPersona = (host, p, extra, test) => `<div class="glass pad row pe-who"><label class="small">Persona ${R.selPersona('pePer', p.id)}</label>${extra || ''}${test && R.envioBtns ? `<span class="spacer"></span>${R.envioBtns(p, test)}` : ''}</div>`;
  const wirePersona = (host) => { const s = $('#pePer', host); if (s) s.onchange = () => { R.activa = s.value; R.rerender(); }; if (R.wireEnvio) R.wireEnvio(host); };

  /* ================= VISIÓN ================= */
  /* Portada del mundo: la misma cara que el puente de mando del simulador */
  const C3 = { ok: '#2fb24a', warn: '#e8a33b', stop: '#e04848' };
  const stP = (x) => (x == null ? null : x >= 75 ? 'ok' : x >= 50 ? 'warn' : 'stop');
  R.heroCfg = () => {
    const s = R.resumen(), ps = R.state.personas, n = s.n;
    const parte = (k) => (n ? Math.round((k / n) * 100) : null);
    const idAct = !!(R.identidadActiva && R.identidadActiva()), ident = idAct && R.identidad ? ps.filter((p) => R.identidad(p)).length : 0;
    const ls = R.lideres ? R.lideres() : [], filas = ls.flatMap((p) => R.mapaMando(p)), desj = filas.filter((f) => f.des && f.des.st !== 'ok').length;
    const graves = s.est.avisos.filter((a) => a.st === 'stop').length, revisar = s.est.avisos.filter((a) => a.st === 'warn').length;
    const luces = n ? [
      { n: 'Consentimiento', v: `${s.consent}/${n}`, st: stP(parte(s.consent)), go: 'personas' },
      { n: 'DISC', v: `${s.disc}/${n}`, st: stP(parte(s.disc)), go: 'disc' },
      { n: 'Aportaciones al equipo', v: `${s.roles}/${n}`, st: stP(parte(s.roles)), go: 'roles' },
      { n: 'Eneagrama', v: `${s.enea}/${n}`, st: stP(parte(s.enea)), go: 'eneagrama' },
      ...(idAct ? [{ n: 'Perfil de identidad', v: `${ident}/${n}`, st: stP(parte(ident)), go: 'identidad' }] : []),
      { n: 'Puestos definidos', v: String(R.state.puestos.length), st: R.state.puestos.length ? 'ok' : 'warn', go: 'puestos' },
      { n: 'Encaje medio', v: s.encMedio == null ? '—' : s.encMedio + ' %', st: s.encMedio == null ? null : s.encMedio >= 75 ? 'ok' : s.encMedio >= 55 ? 'warn' : 'stop', go: 'encaje' },
      { n: 'Encaje bajo', v: String(s.encBajo), st: s.enc ? (s.encBajo ? 'stop' : 'ok') : null, go: 'encaje' },
      { n: 'Puestos críticos y relevos', v: graves ? graves + ' alertas' : 'sin alertas', st: graves ? 'stop' : 'ok', go: 'organigrama' },
      { n: 'Estructura', v: revisar + ' puntos a revisar', st: revisar > 2 ? 'stop' : revisar ? 'warn' : 'ok', go: 'organigrama' },
      { n: 'Mapa de talento', v: `${s.evaluados}/${n}`, st: stP(parte(s.evaluados)), go: 'talento' },
      { n: 'Aportaciones sin cubrir', v: String(s.todo.faltan.length), st: s.roles ? (s.todo.faltan.length > 2 ? 'stop' : s.todo.faltan.length ? 'warn' : 'ok') : null, go: 'equipos' },
      { n: 'Líderes con test de estilo', v: `${ls.filter((p) => p.lid && p.lid.estilo).length}/${ls.length}`, st: ls.length ? stP(Math.round((ls.filter((p) => p.lid && p.lid.estilo).length / ls.length) * 100)) : null, go: 'lid-estilo' },
      { n: 'Desajustes de liderazgo', v: String(desj), st: filas.some((f) => f.nv) ? (desj > 2 ? 'stop' : desj ? 'warn' : 'ok') : null, go: 'lid-mapa' }
    ] : [];
    // Veredicto y franja salen de las mismas comprobaciones: las de la nota común de Atalaya (la de «Este mundo»
    // en la cabecera) si está disponible; si no, los aspectos de esta portada.
    const chk = n && A.nota && A.nota.personas ? A.nota.personas(R.state) : null, nRes = chk ? A.nota.puntuar(chk) : null;
    const franja = chk ? chk.map((x) => ({ n: x.t, v: x.d || '', st: x.st, go: R.mod(x.zona) ? x.zona : 'panorama' })) : luces;
    const con = franja.filter((l) => l.st), nota = nRes ? nRes.n100 : con.length ? Math.round(con.reduce((a, l) => a + (l.st === 'ok' ? 100 : l.st === 'warn' ? 50 : 0), 0) / con.length) : null;
    const stN = nota == null ? null : nota >= 70 ? 'ok' : nota >= 50 ? 'warn' : 'stop';
    const encs = ps.map((p) => ({ p, e: R.encaje(p, R.puestoDe(p)) })).filter((x) => x.e && x.e.total != null);
    const niveles = { 1: 0, 2: 0, 3: 0, 4: 0 }; filas.filter((f) => f.nv).forEach((f) => niveles[f.nv.nivel]++);
    const LN = A.liderazgoDatos;
    return {
      kicker: 'Personas y equipos · panorama',
      titulo: '¿Tiene cada persona <em>el sitio que le toca</em> en su equipo?',
      lede: 'Comportamiento, aportaciones, motivación e identidad de cada persona; puestos, estructura y relevos; equipos equilibrados y un liderazgo a la medida de cada tarea.',
      empresa: R.empresa().nombre, sector: R.empresa().sector,
      datos: [['Personas', String(n)], ['Puestos', String(R.state.puestos.length)], ['Equipos', String(R.state.equipos.length)], ['Líderes', String(ls.length)]],
      acciones: n ? [{ t: 'Enviar cuestionarios', cls: 'solid', fn: () => R.show('envios') }, { t: 'Informe de la organización', cls: 'ghost', fn: () => R.informeOrg() }]
        : [{ t: 'Empezar por la plantilla', cls: 'solid', fn: () => R.show('personas') }, { t: 'Definir puestos', fn: () => R.show('puestos') }],
      veredicto: { kicker: 'Nota de personas y equipos', st: stN,
        titulo: !n ? 'Sin plantilla todavía' : nota + '/100 · ' + (nota >= 70 ? 'equipo en orden' : nota >= 50 ? 'con puntos que trabajar' : 'con alertas que atender'),
        texto: n ? (nRes ? `Nota con el criterio común de Atalaya, la misma de «Este mundo» en la cabecera: ${A.nota.desglose(nRes)}. Cada franja es una de esas comprobaciones; los indicadores de debajo detallan herramientas, encaje, estructura y liderazgo. Tóquela para ir a su herramienta.` : 'Cada franja es un aspecto del equipo: herramientas completadas, encaje, estructura, talento, equipos y liderazgo. Tóquela para ir a su herramienta.') : 'Dé de alta a las personas y aquí aparecerá el estado de cada aspecto del equipo, con su semáforo.',
        luces: (nota == null && !n ? [] : franja).map((l) => ({ n: l.n, v: l.v, st: l.st, fn: () => R.show(l.go) })),
        enlace: n ? { t: 'Por dónde empezar', fn: () => { const x = document.querySelector('.pe-prior'); if (x) x.scrollIntoView({ behavior: 'smooth', block: 'center' }); } } : null },
      kpis: n ? [
        { k: 'Estilos', v: `${s.disc}/${n}`, d: 'personas con DISC', st: stP(parte(s.disc)), barras: s.disc ? ['D', 'I', 'S', 'C'].map((k) => ({ n: H.DISC[k].n, v: s.todo.dist[k] || 0, c: H.DISC[k].c })) : null, max: s.disc, fn: () => R.show('disc') },
        { k: 'Cuestionarios', v: String(s.disc + s.roles + s.enea + ident), d: `de ${n * (idAct ? 4 : 3)} posibles (${idAct ? 4 : 3} por persona)`, st: stP(Math.round(((s.disc + s.roles + s.enea + ident) / (n * (idAct ? 4 : 3))) * 100)), barras: [{ n: 'DISC', v: s.disc }, { n: 'Aportaciones', v: s.roles }, { n: 'Eneagrama', v: s.enea }].concat(idAct ? [{ n: 'Identidad', v: ident }] : []), max: n, fn: () => R.show('envios') },
        { k: 'Encaje medio', v: s.encMedio == null ? '—' : s.encMedio + ' %', d: `${s.enc} con puesto y perfil`, st: s.encMedio == null ? null : s.encMedio >= 75 ? 'ok' : s.encMedio >= 55 ? 'warn' : 'stop', barras: encs.length ? encs.map((x) => ({ n: x.p.nombre, v: x.e.total, c: C3[x.e.st] })) : null, max: 100, fn: () => R.show('encaje') },
        { k: 'Estructura', v: `${s.est.niveles} nivel${s.est.niveles === 1 ? '' : 'es'}`, d: `${s.est.mandos.length} mandos · ${graves} alertas graves`, st: graves ? 'stop' : revisar ? 'warn' : 'ok', barras: s.est.mandos.map((m) => ({ n: m.p.nombre, v: m.n, c: m.n > 8 ? C3.warn : null })), fn: () => R.show('organigrama') },
        { k: 'Liderazgo', v: `${filas.filter((f) => f.nv).length} tareas`, d: `${desj} desajuste${desj === 1 ? '' : 's'}`, st: filas.some((f) => f.nv) ? (desj ? 'warn' : 'ok') : null, barras: LN && filas.some((f) => f.nv) ? [1, 2, 3, 4].map((k) => ({ n: LN.NIVELES[k].n, v: niveles[k], c: LN.NIVELES[k].c })) : null, fn: () => R.show('lid-mapa') }
      ] : []
    };
  };
  const conHero = (host, html) => { const hc = A.heroMundo ? R.heroCfg() : null; host.innerHTML = (hc ? A.heroMundo.html(hc) : '') + html; if (hc) A.heroMundo.wire(host, hc); };

  R.register({
    id: 'panorama', grupo: 'Visión', nombre: 'Panorama', portada: true, pregunta: '¿Cómo es el equipo humano y qué conviene trabajar primero?',
    informe: () => R.informeOrg(), informeTxt: 'Informe de la organización',
    render(host) {
      const s = R.resumen();
      if (!s.n) {
        conHero(host, `<div class="glass pad stack"><div class="eyebrow">Cómo empezar</div><h2>Analice perfiles, encaje personas y puestos y <em>ordene la estructura</em></h2>
          <p>Este mundo trabaja con <b>DISC</b> (estilo de comportamiento), <b>aportaciones al equipo</b> (modelo propio de nueve aportaciones), <b>eneagrama</b> (motivación) y el <b>perfil de identidad</b>. Con ellas: perfiles de puesto, encaje persona-puesto, análisis de equipos, auditoría de la estructura, mapa de talento y <b>tablillas de entrenamiento</b> que se proponen solas.</p>
          <p class="small muted">No es control horario, ni nóminas, ni seguimiento del día a día: es análisis, auditoría y estructura.</p>
          <ol class="pe-pasos"><li><b>Plantilla:</b> dé de alta a las personas (o tráigalas del organigrama del sistema estratégico).</li><li><b>Puestos:</b> defina cada puesto con su perfil (hay plantillas).</li><li><b>Herramientas:</b> cada persona responde sus cuestionarios (5–10 minutos cada uno).</li><li><b>Lectura:</b> encaje, equipos, estructura, talento y tablillas.</li></ol>
          <div class="row"><button class="btn solid" data-go="personas">Empezar por la plantilla</button><button class="btn" data-go="puestos">Definir puestos</button></div></div>${R.aviso()}`);
        return;
      }
      const prior = [];
      if (s.disc < s.n) prior.push({ st: 'info', t: `Faltan ${s.n - s.disc} DISC por completar: sin estilo no hay encaje ni análisis de equipo completo.`, go: 'disc' });
      if (s.criticosSinSucesor) prior.push({ st: 'stop', t: `${s.criticosSinSucesor} puesto${s.criticosSinSucesor > 1 ? 's' : ''} crítico${s.criticosSinSucesor > 1 ? 's' : ''} sin sucesor o sin cubrir.`, go: 'organigrama' });
      if (s.encBajo) prior.push({ st: 'warn', t: `${s.encBajo} persona${s.encBajo > 1 ? 's' : ''} con encaje bajo en su puesto.`, go: 'encaje' });
      if (s.todo.faltan.length) prior.push({ st: 'warn', t: `En el conjunto de la empresa nadie cubre: ${s.todo.faltan.map((k) => H.ROLES[k].n.toLowerCase()).join(', ')}.`, go: 'equipos' });
      s.est.avisos.filter((a) => a.st === 'warn').slice(0, 3).forEach((a) => prior.push({ st: 'warn', t: a.t, go: 'organigrama' }));
      if (!R.state.puestos.length) prior.push({ st: 'info', t: 'Aún no hay puestos definidos: defínalos para medir el encaje.', go: 'puestos' });
      if (!s.evaluados) prior.push({ st: 'info', t: 'Sin valoración de desempeño y potencial: el mapa de talento está vacío.', go: 'talento' });
      conHero(host, `
      <div class="grid pe-two">
        <div class="glass pad stack"><div class="eyebrow">Mapa de estilos</div>${s.disc ? R.rueda(R.state.personas) + '<p class="small muted">Cada punto es una persona; tóquelo para ver su ficha. Arriba, los estilos rápidos y orientados a la acción; abajo, los reflexivos y constantes. A la izquierda, orientados a la tarea; a la derecha, a las personas.</p>' : '<p class="muted">Cuando las personas completen su DISC aparecerán aquí.</p>'}</div>
        <div class="glass pad stack"><div class="eyebrow">Por dónde empezar</div>${prior.length ? `<div class="pe-prior">${prior.slice(0, 7).map((a) => `<button class="pe-pr st-${a.st}" data-go="${a.go}"><span>${esc(a.t)}</span><i>›</i></button>`).join('')}</div>` : '<div class="alert info">Todo en orden con los datos actuales. Revise las tablillas de entrenamiento propuestas.</div>'}
          ${s.todo.media ? `<div class="eyebrow">Perfil medio de la empresa</div>${R.discBars(s.todo.media)}` : ''}</div>
      </div>${R.aviso()}`);
    }
  });

  /* Ficha de una persona (ventana) */
  R.fichaPersona = (id) => {
    const p = R.persona(id); if (!p) return;
    const pu = R.puestoDe(p), enc = R.encaje(p, pu), e = p.disc && R.discEstilo(p.disc), tabs = R.tablillasDe(p).slice(0, 4);
    const back = document.createElement('div'); back.className = 'ef-back';
    back.innerHTML = `<div class="ef-card glass pad stack pe-ficha" role="dialog" aria-modal="true" aria-label="Ficha de ${esc(p.nombre)}">
      <div class="row"><div><div class="eyebrow">Ficha de la persona</div><h3 style="margin:4px 0 0">${esc(p.nombre)}</h3><p class="small muted" style="margin:0">${esc(pu ? pu.nombre : 'Sin puesto')}${p.area ? ' · ' + esc(p.area) : ''}${p.responsable ? ' · depende de ' + esc(R.nombre(p.responsable)) : ''}</p></div><span class="spacer"></span><button class="btn ghost small" data-x>Cerrar</button></div>
      ${p.disc ? `<div><b>${esc(e.nombre)}</b> — ${esc(H.DISC[e.pri].resumen)}</div>${R.discBars(p.disc, pu && pu.disc)}` : '<p class="muted small">Sin DISC.</p>'}
      ${p.roles && p.roles.scores ? `<p class="small"><b>Aportaciones naturales:</b> ${R.rolesOrden(p.roles.scores).slice(0, 3).map((k) => `${H.ROLES[k].n} (${p.roles.scores[k]} %)`).join(', ')}</p>` : ''}
      ${p.enea && p.enea.tipo ? `<p class="small"><b>Eneagrama:</b> tipo ${p.enea.tipo} · ${H.ENEA[p.enea.tipo].n}, ala ${p.enea.ala}. ${esc(H.ENEA[p.enea.tipo].motivacion)}</p>` : ''}
      ${enc && enc.total != null ? `<p class="small"><b>Encaje con su puesto:</b> ${R.pill(enc.st, enc.total + ' %')} ${enc.brechas.slice(0, 2).map((b) => esc(b.txt)).join(' ')}</p>` : ''}
      ${tabs.length ? `<div class="small"><b>Tablillas propuestas:</b> ${tabs.map((t) => esc(t.t.titulo)).join(' · ')}</div>` : ''}
      <div class="row"><button class="btn solid small" data-inf>Informe de la persona</button><button class="btn small" data-tab>Ver tablillas</button></div></div>`;
    document.body.appendChild(back);
    const close = () => back.remove();
    back.onclick = (ev) => { if (ev.target === back) close(); };
    back.querySelector('[data-x]').onclick = close;
    back.querySelector('[data-inf]').onclick = () => { close(); R.informePersona(p); };
    back.querySelector('[data-tab]').onclick = () => { close(); R.activa = p.id; R.show('tablillas'); };
    back.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') close(); });
    back.querySelector('[data-x]').focus();
  };

  R.register({
    id: 'personas', grupo: 'Visión', nombre: 'Plantilla', pregunta: '¿Quién forma el equipo, en qué puesto y qué herramientas ha completado cada persona?',
    render(host) {
      const ps = R.state.personas, pu = R.state.puestos;
      const optPuesto = (sel) => `<option value="">— sin puesto —</option>${pu.map((x) => `<option value="${x.id}" ${x.id === sel ? 'selected' : ''}>${esc(x.nombre)}</option>`).join('')}`;
      const optResp = (p) => `<option value="">— nadie —</option>${ps.filter((x) => x.id !== p.id).map((x) => `<option value="${x.id}" ${x.id === p.responsable ? 'selected' : ''}>${esc(x.nombre)}</option>`).join('')}`;
      const hecho = (b, t) => `<span class="pe-tool ${b ? 'on' : ''}" title="${t}${b ? ': hecho' : ': pendiente'}">${t[0]}</span>`;
      host.innerHTML = `<div class="glass pad stack"><div class="row pe-add"><input class="input" id="peNom" placeholder="Nombre y apellidos" autocomplete="off"><select class="input" id="pePu">${optPuesto('')}</select><button class="btn solid" id="peAdd">Añadir persona</button><span class="spacer"></span><button class="btn ghost" id="peCsvB" aria-expanded="false">Importar la plantilla (CSV)</button><button class="btn ghost" id="peImp">Traer del organigrama estratégico</button></div>
        <div class="stack" id="peCsv" hidden><p class="small" style="margin:0">Suba el listado de la plantilla en CSV (exportado de la nómina o de una hoja de cálculo) o péguelo aquí. Columnas: <b>nombre</b> (o nombre y apellidos), <b>puesto</b>, <b>área</b>, <b>responsable</b> (de quién depende, por su nombre) y <b>correo</b>; la primera fila con esos títulos. Las personas que ya están no se duplican y los puestos nuevos se crean sin perfil. No incluya fechas de nacimiento ni otros datos que no hagan falta.</p>
          <div class="row"><input type="file" id="peCsvF" accept=".csv,.txt,text/csv,text/plain" class="input"><button class="btn solid" id="peCsvGo">Importar</button><button class="btn ghost" id="peCsvX">Cancelar</button></div>
          <textarea class="input" id="peCsvT" rows="5" placeholder="nombre;puesto;área;responsable&#10;Ana Ruiz;Jefa de taller;Producción;&#10;Luis Gómez;Soldador;Producción;Ana Ruiz"></textarea></div>
        <p class="small muted" id="peMsg" style="margin:0">Basta con el nombre. Puesto, área y de quién depende se pueden completar después.</p></div>
        ${ps.length ? `<div class="glass pad"><div class="table-wrap"><table class="pe-table"><thead><tr><th style="text-align:left">Persona</th><th style="text-align:left">Puesto</th><th style="text-align:left">Área</th><th style="text-align:left">Depende de</th><th>Consentimiento</th><th>Herramientas</th><th></th></tr></thead><tbody>
          ${ps.map((p) => `<tr data-id="${p.id}"><td><input class="input" data-k="nombre" value="${esc(p.nombre)}"></td><td><select class="input" data-k="puestoId">${optPuesto(p.puestoId)}</select></td><td><input class="input" data-k="area" value="${esc(p.area || '')}" placeholder="${esc((R.puestoDe(p) || {}).area || '')}"></td><td><select class="input" data-k="responsable">${optResp(p)}</select></td><td style="text-align:center"><input type="checkbox" data-k="consentimiento" ${p.consentimiento ? 'checked' : ''} aria-label="Consentimiento de ${esc(p.nombre)}"></td><td class="pe-tools">${hecho(p.disc, 'DISC')}${hecho(p.roles && p.roles.scores, 'Aportaciones')}${hecho(p.enea && p.enea.tipo, 'Eneagrama')}</td><td class="pe-act"><button class="btn ghost small" data-ficha>Ficha</button><button class="btn ghost small" data-del>Borrar</button></td></tr>`).join('')}
        </tbody></table></div></div>` : ''}${R.aviso()}`;
      const add = () => {
        const n = $('#peNom', host).value.trim(); if (!n) { $('#peNom', host).focus(); return; }
        const pid = $('#pePu', host).value || '';
        ps.push({ id: R.uid('p'), nombre: n, puestoId: pid, area: '', responsable: '', alta: R.hoy(), consentimiento: false });
        R.save(); R.rerender(); setTimeout(() => { const i = $('#peNom'); if (i) i.focus(); }, 30);
      };
      $('#peAdd', host).onclick = add;
      $('#peNom', host).onkeydown = (e) => { if (e.key === 'Enter') add(); };
      // Importación de la plantilla en CSV (R.importarCsv en core.js)
      const csvP = $('#peCsv', host), csvB = $('#peCsvB', host);
      csvB.onclick = () => { csvP.hidden = !csvP.hidden; csvB.setAttribute('aria-expanded', String(!csvP.hidden)); };
      $('#peCsvX', host).onclick = () => { csvP.hidden = true; csvB.setAttribute('aria-expanded', 'false'); };
      $('#peCsvF', host).onchange = (e) => { const f = e.target.files && e.target.files[0]; if (!f) return; const rd = new FileReader(); rd.onload = () => { $('#peCsvT', host).value = String(rd.result || ''); }; rd.readAsText(f, 'utf-8'); };
      $('#peCsvGo', host).onclick = () => {
        const txt = $('#peCsvT', host).value, msg = $('#peMsg', host);
        if (!txt.trim()) { msg.textContent = 'Elija un archivo CSV o pegue el listado.'; return; }
        const r = R.importarCsv(txt);
        R.rerender();
        const m2 = $('#peMsg'); if (m2) m2.textContent = r.np || r.act ? `Importadas ${r.np} persona${r.np === 1 ? '' : 's'} nueva${r.np === 1 ? '' : 's'}${r.act ? `, ${r.act} completada${r.act === 1 ? '' : 's'}` : ''}, ${r.nq} puesto${r.nq === 1 ? '' : 's'} nuevo${r.nq === 1 ? '' : 's'} y ${r.nr} dependencia${r.nr === 1 ? '' : 's'} de ${r.total} fila${r.total === 1 ? '' : 's'}${r.sinNombre ? ` (${r.sinNombre} sin nombre, no importada${r.sinNombre === 1 ? '' : 's'})` : ''}. Pida el consentimiento de cada persona antes de sus cuestionarios.` : `No se ha importado nadie: ${r.total ? 'las personas ya estaban o las filas no tienen nombre' : 'el listado está vacío'}.`;
      };
      $('#peImp', host).onclick = async () => {
        const nodos = await R.organigramaEstrategia(), msg = $('#peMsg', host);
        const conPersona = nodos.filter((n) => n.persona && !/^\d+\s*personas?$/i.test(n.persona.trim()));
        if (!nodos.length) { msg.textContent = 'El sistema estratégico de esta empresa todavía no tiene organigrama.'; return; }
        const mapa = {}; let np = 0, nq = 0;
        nodos.forEach((n) => {
          let q = pu.find((x) => x.nombre.toLowerCase() === String(n.puesto || '').toLowerCase());
          if (!q && n.puesto) { q = { id: R.uid('q'), nombre: n.puesto, area: n.area || '', mision: '', disc: null, roles: [], critico: false, sucesor: '' }; pu.push(q); nq++; }
          if (conPersona.includes(n)) {
            let p = ps.find((x) => x.nombre.toLowerCase() === n.persona.trim().toLowerCase());
            if (!p) { p = { id: R.uid('p'), nombre: n.persona.trim(), puestoId: q ? q.id : '', area: n.area || '', responsable: '', alta: R.hoy(), consentimiento: false }; ps.push(p); np++; }
            mapa[n.id] = p.id;
          }
        });
        // Dependencias: la persona del puesto del que depende (subiendo si ese puesto no tiene persona)
        nodos.forEach((n) => { const pid = mapa[n.id]; if (!pid) return; let j = nodos.find((m) => m.id === n.jefe), k = 0; while (j && !mapa[j.id] && k++ < 20) j = nodos.find((m) => m.id === j.jefe); const p = R.persona(pid); if (j && mapa[j.id] && !p.responsable) p.responsable = mapa[j.id]; });
        R.save(); R.rerender(); const m2 = $('#peMsg'); if (m2) m2.textContent = `Traídas ${np} persona${np === 1 ? '' : 's'} y ${nq} puesto${nq === 1 ? '' : 's'} del organigrama. Los puestos se crean sin perfil: complételos en «Puestos».`;
      };
      $$('tr[data-id]', host).forEach((tr) => {
        const p = R.persona(tr.dataset.id);
        $$('[data-k]', tr).forEach((el) => (el.onchange = () => { p[el.dataset.k] = el.type === 'checkbox' ? el.checked : el.value; if (el.dataset.k === 'consentimiento' && el.checked) p.consentFecha = R.hoy(); R.save(); if (el.dataset.k !== 'nombre' && el.dataset.k !== 'area') R.rerender(); }));
        $('[data-ficha]', tr).onclick = () => R.fichaPersona(p.id);
        $('[data-del]', tr).onclick = (e) => confirmar(e.target, () => {
          R.state.personas = R.state.personas.filter((x) => x.id !== p.id);
          R.state.personas.forEach((x) => { if (x.responsable === p.id) x.responsable = ''; });
          R.state.puestos.forEach((x) => { if (x.sucesor === p.id) x.sucesor = ''; });
          R.state.equipos.forEach((q) => { q.miembros = q.miembros.filter((m) => m !== p.id); });
          R.save(); R.rerender();
        });
      });
    }
  });

  /* ================= HERRAMIENTAS ================= */
  const borradores = {}; // respuestas a medias, por herramienta y persona
  Object.assign(R, { borradores, pideConsent, wireConsent, cabPersona, wirePersona, kpis, confirmar });

  R.register({
    id: 'disc', grupo: 'Herramientas', nombre: 'DISC', pregunta: '¿Cómo se comporta cada persona: decide, conecta, sostiene o analiza?',
    informe: () => { const p = R.personaActiva(); if (p) R.informePersona(p); }, informeTxt: 'Informe de la persona',
    render(host) {
      const p = R.personaActiva();
      const intro = `<div class="glass pad stack"><p style="margin:0">El DISC describe el <b>estilo de comportamiento</b> con cuatro factores: ${['D', 'I', 'S', 'C'].map((k) => `<b style="color:${H.DISC[k].c}">${k}</b> ${H.DISC[k].n.toLowerCase()} (${H.DISC[k].corto.toLowerCase()})`).join(', ')}. No hay perfiles buenos ni malos: cada uno aporta y necesita cosas distintas.</p></div>`;
      if (!p) { host.innerHTML = intro + R.vacia('Primero da de alta a las personas de la plantilla.', 'Ir a la plantilla'); return; }
      const modo = borradores['discModo:' + p.id];
      let html = cabPersona(host, p, p.disc ? '<button class="btn ghost small" id="peRep2">Repetir cuestionario</button><button class="btn ghost small" id="peMan">Introducir un test externo</button>' : '', 'disc');
      if (!p.consentimiento) { host.innerHTML = intro + html + pideConsent(p); wireConsent(host, p); wirePersona(host); return; }
      if (modo === 'manual') {
        const d = p.disc || { D: 50, I: 50, S: 50, C: 50 };
        html += `<div class="glass pad stack"><div class="eyebrow">Resultados de un test DISC externo</div><p class="small muted" style="margin:0">Si la persona ya hizo un DISC con otro proveedor, introduzca sus cuatro valores de 0 a 100.</p><div class="pe-man">${['D', 'I', 'S', 'C'].map((k) => `<label class="small">${k} · ${H.DISC[k].n}<input class="input" type="number" min="0" max="100" data-f="${k}" value="${d[k]}"></label>`).join('')}</div><div class="row"><button class="btn solid" id="peManOk">Guardar</button><button class="btn ghost" id="peManNo">Cancelar</button></div></div>`;
        host.innerHTML = intro + html; wirePersona(host);
        $('#peManNo', host).onclick = () => { delete borradores['discModo:' + p.id]; R.rerender(); };
        $('#peManOk', host).onclick = () => { const o = {}; $$('[data-f]', host).forEach((i) => (o[i.dataset.f] = Math.max(0, Math.min(100, Math.round(+i.value || 0)))));
          // Cuatro valores iguales (o todos a cero) no son un perfil: no hay estilo que leer
          const vs = ['D', 'I', 'S', 'C'].map((k) => o[k]); if (Math.max(...vs) === Math.min(...vs)) { const w = $('.pe-man', host); if (w && !$('.pe-manerr', host)) w.insertAdjacentHTML('afterend', '<div class="alert warn pe-manerr" role="alert">Los cuatro valores son iguales: así no hay un estilo que leer. Revise los resultados del test externo.</div>'); return; }
          p.disc = Object.assign(o, { fecha: R.hoy(), origen: 'externo' }); delete borradores['discModo:' + p.id]; R.save(); R.rerender(); };
        return;
      }
      if (!p.disc || modo === 'repetir') {
        const resp = borradores['disc:' + p.id] = borradores['disc:' + p.id] || H.DISC_BLOQUES.map(() => ({}));
        const hechos = resp.filter((r) => r.mas && r.menos).length;
        html += `<div class="glass pad stack"><div class="eyebrow">Cuestionario DISC · ${H.DISC_BLOQUES.length} bloques</div><p class="small" style="margin:0">En cada bloque, marque la palabra que <b>más</b> se parece a ${esc(p.nombre.split(' ')[0])} en el trabajo y la que <b>menos</b>. Responda por lo que hace normalmente, no por lo que le gustaría. Mejor si responde la propia persona.</p>
          <div class="pe-prog">${R.bar((hechos / H.DISC_BLOQUES.length) * 100, 'var(--gold)', `${hechos}/${H.DISC_BLOQUES.length}`)}</div>
          <div class="pe-qdisc">${H.DISC_BLOQUES.map((b, i) => `<div class="pe-blk ${resp[i].mas && resp[i].menos ? 'ok' : ''}"><div class="pe-bh"><span>Bloque ${i + 1}</span><span>Más</span><span>Menos</span></div>${['D', 'I', 'S', 'C'].map((k, j) => { const w = b[['D', 'I', 'S', 'C'][(j + i) % 4]], f = ['D', 'I', 'S', 'C'][(j + i) % 4]; return `<div class="pe-br"><span>${esc(w)}</span><button class="pe-rb ${resp[i].mas === f ? 'on' : ''}" data-b="${i}" data-t="mas" data-f="${f}" aria-label="Más: ${esc(w)}"></button><button class="pe-rb menos ${resp[i].menos === f ? 'on' : ''}" data-b="${i}" data-t="menos" data-f="${f}" aria-label="Menos: ${esc(w)}"></button></div>`; }).join('')}</div>`).join('')}</div>
          <div class="row"><button class="btn solid" id="peFin" ${hechos < H.DISC_BLOQUES.length ? 'disabled' : ''}>Ver resultado</button>${p.disc ? '<button class="btn ghost" id="peCan">Cancelar</button>' : ''}<button class="btn ghost" id="peMan2">Tengo un test externo</button></div></div>`;
        host.innerHTML = intro + html; wirePersona(host);
        $$('.pe-rb', host).forEach((b) => (b.onclick = () => {
          const r = resp[+b.dataset.b], t = b.dataset.t, o = t === 'mas' ? 'menos' : 'mas';
          r[t] = b.dataset.f; if (r[o] === r[t]) delete r[o];
          R.rerender();
        }));
        $('#peFin', host).onclick = () => { p.disc = Object.assign(R.discDesdeResp(resp), { resp, fecha: R.hoy(), origen: 'cuestionario' }); delete borradores['disc:' + p.id]; delete borradores['discModo:' + p.id]; R.save(); R.rerender(); };
        const c = $('#peCan', host); if (c) c.onclick = () => { delete borradores['discModo:' + p.id]; R.rerender(); };
        $('#peMan2', host).onclick = () => { borradores['discModo:' + p.id] = 'manual'; R.rerender(); };
        return;
      }
      const e = R.discEstilo(p.disc), D = H.DISC[e.pri], pu = R.puestoDe(p);
      html += `<div class="grid pe-two"><div class="glass pad stack"><div class="eyebrow">Resultado · ${R.fechaES(p.disc.fecha)}${p.disc.origen === 'externo' ? ' · test externo' : ''}</div><h3 style="margin:0;color:${D.c}">${esc(e.nombre)}</h3><p style="margin:0">${esc(D.resumen)}</p>${R.discBars(p.disc, pu && pu.disc)}${pu && pu.disc ? `<p class="small muted" style="margin:0">La raya blanca marca lo que pide su puesto (${esc(pu.nombre)}).</p>` : ''}</div>
        <div class="glass pad stack">${R.rueda([p], { grande: true })}</div></div>
        <div class="grid pe-three">
          <div class="glass pad stack"><div class="eyebrow">Qué aporta</div><ul>${D.aporta.map((x) => `<li>${esc(x)}</li>`).join('')}</ul><div class="eyebrow">Qué necesita</div><ul>${D.necesita.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
          <div class="glass pad stack"><div class="eyebrow">Cómo comunicarse</div><p>${esc(D.comunicar)}</p><div class="eyebrow">Qué evitar</div><p>${esc(D.evitar)}</p></div>
          <div class="glass pad stack"><div class="eyebrow">Bajo presión</div><p>${esc(D.presion)}</p><div class="eyebrow">Entorno donde rinde</div><p>${esc(D.entorno)}</p>${e.sec ? `<p class="small muted">Con su segundo factor (${esc(H.DISC[e.sec].n.toLowerCase())}) suma: ${esc(H.DISC[e.sec].aporta.slice(0, 2).join(' y ').toLowerCase())}.</p>` : ''}</div>
        </div>`;
      host.innerHTML = intro + html; wirePersona(host);
      $('#peRep2', host).onclick = () => { borradores['discModo:' + p.id] = 'repetir'; R.rerender(); };
      $('#peMan', host).onclick = () => { borradores['discModo:' + p.id] = 'manual'; R.rerender(); };
    }
  });

  /* Cuestionario de escala (roles y eneagrama) */
  const escala = (host, cfg) => {
    const { key, items, min, max, etiquetas, onFin } = cfg;
    const resp = borradores[key] = borradores[key] || items.map(() => null);
    const hechos = resp.filter((v) => v != null).length;
    const html = `<div class="pe-prog">${R.bar((hechos / items.length) * 100, 'var(--gold)', `${hechos}/${items.length}`)}</div>
      <div class="pe-scale-h small muted">${etiquetas.map((t, i) => `<span>${min + i} = ${esc(t)}</span>`).join('')}</div>
      <ol class="pe-qs">${items.map((it, i) => `<li class="${resp[i] != null ? 'ok' : ''}"><span>${esc(it.t)}</span><div class="pe-opts" role="group" aria-label="Respuesta ${i + 1}">${Array.from({ length: max - min + 1 }, (_, j) => min + j).map((v) => `<button class="chip" aria-pressed="${resp[i] === v}" data-i="${i}" data-v="${v}" title="${esc(etiquetas[v - min])}">${v}</button>`).join('')}</div></li>`).join('')}</ol>
      <div class="row"><button class="btn solid" id="peFin" ${hechos < items.length ? 'disabled' : ''}>Ver resultado</button>${cfg.cancelar ? '<button class="btn ghost" id="peCan">Cancelar</button>' : ''}</div>`;
    host.insertAdjacentHTML('beforeend', `<div class="glass pad stack">${cfg.cabecera}${html}</div>`);
    $$('.pe-opts .chip', host).forEach((b) => (b.onclick = () => {
      resp[+b.dataset.i] = +b.dataset.v;
      const li = b.closest('li'); li.classList.add('ok'); $$('.chip', li).forEach((c) => c.setAttribute('aria-pressed', c === b));
      const n = resp.filter((v) => v != null).length;
      $('.pe-prog', host).innerHTML = R.bar((n / items.length) * 100, 'var(--gold)', `${n}/${items.length}`);
      $('#peFin', host).disabled = n < items.length;
      const next = li.nextElementSibling; if (next && !next.classList.contains('ok') && next.getBoundingClientRect().top > innerHeight - 120) next.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }));
    $('#peFin', host).onclick = () => { onFin(resp.slice()); delete borradores[key]; };
    const c = $('#peCan', host); if (c) c.onclick = cfg.cancelar;
  };

  R.escala = escala;

  R.register({
    id: 'roles', grupo: 'Herramientas', nombre: 'Aportaciones al equipo', pregunta: '¿Qué papel aporta cada persona cuando trabaja en equipo?',
    informe: () => { const p = R.personaActiva(); if (p) R.informePersona(p); }, informeTxt: 'Informe de la persona',
    render(host) {
      const p = R.personaActiva();
      const grupos = { Mental: 'piensan', Social: 'conectan', Acción: 'hacen' };
      const intro = `<div class="glass pad stack"><p style="margin:0">Nueve <b>aportaciones al equipo</b> en tres familias: los que <b>piensan</b> (inventor, analista, experto), los que <b>conectan</b> (orquestador, explorador, conciliador) y los que <b>hacen</b> (motor, constructor, garante). Un equipo equilibrado tiene todas cubiertas, aunque una persona cubra varias.</p><p class="small muted" style="margin:0">Modelo y cuestionario propios de Atalaya 360°.</p></div>`;
      if (!p) { host.innerHTML = intro + R.vacia('Primero da de alta a las personas de la plantilla.', 'Ir a la plantilla'); return; }
      const rep = borradores['rolesModo:' + p.id];
      host.innerHTML = intro + cabPersona(host, p, p.roles && p.roles.scores && !rep ? '<button class="btn ghost small" id="peRep2">Repetir cuestionario</button>' : '', 'roles');
      wirePersona(host);
      if (!p.consentimiento) { host.insertAdjacentHTML('beforeend', pideConsent(p)); wireConsent(host, p); return; }
      if (!(p.roles && p.roles.scores) || rep) {
        escala(host, {
          key: 'roles:' + p.id, items: H.ROLES_ITEMS, min: 0, max: 4, etiquetas: ['Nada', 'Poco', 'A veces', 'Bastante', 'Totalmente'],
          cabecera: `<div class="eyebrow">Cuestionario · ${H.ROLES_ITEMS.length} frases</div><p class="small" style="margin:0">¿Cuánto describe cada frase a ${esc(p.nombre.split(' ')[0])} cuando trabaja con otros?</p>`,
          cancelar: rep ? () => { delete borradores['rolesModo:' + p.id]; R.rerender(); } : null,
          onFin: (resp) => { p.roles = { resp, scores: R.rolesDesdeResp(resp), fecha: R.hoy() }; delete borradores['rolesModo:' + p.id]; R.save(); R.rerender(); }
        });
        return;
      }
      const s = p.roles.scores, ord = R.rolesOrden(s), top = ord.slice(0, 3), low = ord.slice(-2);
      const col = { Mental: 'var(--s1)', Social: 'var(--s5)', Acción: 'var(--s3)' };
      host.insertAdjacentHTML('beforeend', `<div class="grid pe-two"><div class="glass pad stack"><div class="eyebrow">Resultado · ${R.fechaES(p.roles.fecha)}</div>
          <div class="pe-roles">${ord.map((k) => `<div class="pe-rl ${top.includes(k) ? 'top' : low.includes(k) ? 'low' : ''}"><span>${esc(H.ROLES[k].n)} <small>${H.ROLES[k].g === 'Acción' ? 'hacer' : grupos[H.ROLES[k].g]}</small></span>${R.bar(s[k], col[H.ROLES[k].g], s[k] + ' %')}</div>`).join('')}</div></div>
        <div class="glass pad stack"><div class="eyebrow">Aportaciones naturales</div>${top.map((k) => `<div><b>${esc(H.ROLES[k].n)}</b> — ${esc(H.ROLES[k].aporta)}<br><span class="small muted">Cuidado: ${esc(H.ROLES[k].debilidad)}</span></div>`).join('')}
          <div class="eyebrow">Aportaciones que mejor delegar</div>${low.map((k) => `<div class="small"><b>${esc(H.ROLES[k].n)}</b>: no le sale natural. Que lo cubra otra persona del equipo.</div>`).join('')}</div></div>`);
      $('#peRep2', host).onclick = () => { borradores['rolesModo:' + p.id] = 1; R.rerender(); };
    }
  });

  R.register({
    id: 'eneagrama', grupo: 'Herramientas', nombre: 'Eneagrama', pregunta: '¿Qué mueve a cada persona y qué teme?',
    informe: () => { const p = R.personaActiva(); if (p) R.informePersona(p); }, informeTxt: 'Informe de la persona',
    render(host) {
      const p = R.personaActiva();
      const intro = `<div class="glass pad stack"><p style="margin:0">El <b>eneagrama</b> describe nueve tipos según su <b>motivación</b> de fondo y su miedo principal, agrupados en tres centros: instintivo (8, 9, 1), emocional (2, 3, 4) y mental (5, 6, 7). Ayuda a entender <i>por qué</i> alguien actúa como actúa, y cómo liderarle.</p></div>`;
      if (!p) { host.innerHTML = intro + R.vacia('Primero da de alta a las personas de la plantilla.', 'Ir a la plantilla'); return; }
      const rep = borradores['eneaModo:' + p.id];
      host.innerHTML = intro + cabPersona(host, p, p.enea && p.enea.tipo && !rep ? '<button class="btn ghost small" id="peRep2">Repetir cuestionario</button>' : '', 'enea');
      wirePersona(host);
      if (!p.consentimiento) { host.insertAdjacentHTML('beforeend', pideConsent(p)); wireConsent(host, p); return; }
      if (!(p.enea && p.enea.tipo) || rep) {
        escala(host, {
          key: 'enea:' + p.id, items: H.ENEA_ITEMS, min: 1, max: 5, etiquetas: ['Nada', 'Poco', 'A veces', 'Bastante', 'Totalmente'],
          cabecera: `<div class="eyebrow">Cuestionario · ${H.ENEA_ITEMS.length} frases</div><p class="small" style="margin:0">¿Cuánto se reconoce ${esc(p.nombre.split(' ')[0])} en cada frase? Lo ideal es que responda la propia persona: la motivación no se ve desde fuera.</p>`,
          cancelar: rep ? () => { delete borradores['eneaModo:' + p.id]; R.rerender(); } : null,
          onFin: (resp) => { p.enea = Object.assign(R.eneaDesdeResp(resp), { resp, fecha: R.hoy() }); delete borradores['eneaModo:' + p.id]; R.save(); R.rerender(); }
        });
        return;
      }
      const E = H.ENEA[p.enea.tipo], s = p.enea.scores;
      const rad = (t) => ((t * 40 - 90) * Math.PI) / 180;
      const pt = (t, r) => [150 + r * Math.cos(rad(t)), 150 + r * Math.sin(rad(t))];
      // Radar desde el centro (0) hasta el círculo exterior (100), con anillos de 25 en 25 y el nombre de cada tipo
      const sv = (t) => Math.max(0, Math.min(100, +s[t] || 0)), T9 = [1, 2, 3, 4, 5, 6, 7, 8, 9];
      const svg = `<svg class="pe-enea" viewBox="0 0 300 300" role="img" aria-label="Eneagrama: tipo ${p.enea.tipo} (${esc(E.n)}). Puntuaciones: ${T9.map((t) => `${t} ${esc(H.ENEA[t].n)} ${sv(t)}`).join(', ')}">
        ${[25, 50, 75].map((v) => `<circle cx="150" cy="150" r="${(v / 100) * 118}" fill="none" stroke="rgba(255,255,255,0.07)"/><text x="153" y="${(150 - (v / 100) * 118 + 9).toFixed(1)}" class="pe-eg">${v}</text>`).join('')}
        ${T9.map((t) => { const [x, y] = pt(t, 118); return `<line x1="150" y1="150" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="rgba(255,255,255,0.06)"/>`; }).join('')}
        <circle cx="150" cy="150" r="118" fill="none" stroke="rgba(201, 242, 77, 0.3)"/>
        <polygon points="${[9, 3, 6].map((t) => pt(t, 118).join(',')).join(' ')}" fill="none" stroke="rgba(201, 242, 77, 0.18)"/><polyline points="${[1, 4, 2, 8, 5, 7, 1].map((t) => pt(t, 118).join(',')).join(' ')}" fill="none" stroke="rgba(201, 242, 77, 0.18)"/>
        <polygon points="${T9.map((t) => pt(t, (sv(t) / 100) * 118).map((v) => v.toFixed(1)).join(',')).join(' ')}" fill="rgba(171,123,255,0.22)" stroke="#ab7bff"/>
        ${T9.map((t) => { const [x, y] = pt(t, 136); return `<text x="${x.toFixed(1)}" y="${(y + 4).toFixed(1)}" text-anchor="middle" class="pe-et ${t === p.enea.tipo ? 'on' : t === p.enea.ala ? 'ala' : ''}"><title>${t} · ${esc(H.ENEA[t].n)}: ${sv(t)}</title>${t}</text>`; }).join('')}</svg>
        <p class="small muted" style="margin:0">${T9.map((t) => `<b>${t}</b> ${esc(H.ENEA[t].n)} ${sv(t)}`).join(' · ')}</p>`;
      host.insertAdjacentHTML('beforeend', `<div class="grid pe-two"><div class="glass pad stack"><div class="eyebrow">Resultado · ${R.fechaES(p.enea.fecha)}</div><h3 style="margin:0">Tipo ${p.enea.tipo} · ${esc(E.n)} <small class="muted">ala ${p.enea.ala} (${esc(H.ENEA[p.enea.ala].n.toLowerCase())})</small></h3><p class="small muted" style="margin:0">Centro ${esc(E.centro.toLowerCase())}</p>${svg}</div>
        <div class="glass pad stack"><div><b>Le mueve:</b> ${esc(E.motivacion)}</div><div><b>Teme:</b> ${esc(E.miedo)}</div><div><b>Fortaleza:</b> ${esc(E.fortaleza)}</div>
          <div><b>En estrés</b> tiende a parecerse al tipo ${E.estres} (${esc(H.ENEA[E.estres].n.toLowerCase())}); <b>cuando crece</b>, al ${E.crece} (${esc(H.ENEA[E.crece].n.toLowerCase())}).</div>
          <div class="eyebrow">Cómo liderarle</div><p style="margin:0">${esc(E.liderar)}</p><div class="eyebrow">Riesgo en el trabajo</div><p style="margin:0">${esc(E.riesgo)}</p></div></div>`);
      $('#peRep2', host).onclick = () => { borradores['eneaModo:' + p.id] = 1; R.rerender(); };
    }
  });

  /* ================= ESTRUCTURA ================= */
  let puestoSel = null;
  R.register({
    id: 'puestos', grupo: 'Estructura', nombre: 'Puestos', pregunta: '¿Qué pide cada puesto: comportamiento, aportaciones y misión?',
    render(host) {
      const pu = R.state.puestos;
      if (!pu.find((x) => x.id === puestoSel)) puestoSel = pu[0] ? pu[0].id : null;
      const q = R.puesto(puestoSel);
      host.innerHTML = `<div class="glass pad stack"><p style="margin:0">Cada puesto tiene un <b>perfil ideal</b>: el comportamiento DISC que pide y las aportaciones clave al equipo. Así se mide el encaje de quien lo ocupa y se detecta qué entrenar. Marque como <b>crítico</b> el puesto cuya ausencia pararía la empresa.</p>
        <div class="row pe-add"><select class="input" id="peTpl"><option value="">Plantilla de puesto…</option>${Object.keys(H.PUESTOS_TIPO).map((k) => `<option value="${k}">${esc(H.PUESTOS_TIPO[k].n)}</option>`).join('')}</select><input class="input" id="peQn" placeholder="Nombre del puesto"><button class="btn solid" id="peQadd">Crear puesto</button></div></div>
        ${pu.length ? `<div class="grid pe-side"><div class="glass pad pe-list">${pu.map((x) => { const occ = R.state.personas.filter((p) => p.puestoId === x.id); return `<button class="pe-li ${x.id === puestoSel ? 'on' : ''}" data-q="${x.id}"><b>${esc(x.nombre)}</b><small>${occ.length ? esc(occ.map((p) => p.nombre).join(', ')) : 'sin persona'}${x.critico ? ' · crítico' : ''}${!x.disc ? ' · sin perfil' : ''}</small></button>`; }).join('')}</div>
          <div class="glass pad stack" id="peQed"></div></div>` : ''}`;
      const crear = () => {
        const tk = $('#peTpl', host).value, T = H.PUESTOS_TIPO[tk], n = $('#peQn', host).value.trim() || (T ? T.n : '');
        if (!n) { $('#peQn', host).focus(); return; }
        const x = { id: R.uid('q'), nombre: n, area: '', tipo: tk || '', mision: '', disc: T ? Object.assign({}, T.disc) : { D: 50, I: 50, S: 50, C: 50 }, roles: T ? T.roles.slice() : [], critico: false, sucesor: '' };
        pu.push(x); puestoSel = x.id; R.save(); R.rerender();
      };
      $('#peQadd', host).onclick = crear;
      $('#peTpl', host).onchange = (e) => { if (!$('#peQn', host).value && e.target.value) $('#peQn', host).value = H.PUESTOS_TIPO[e.target.value].n; };
      $$('.pe-li', host).forEach((b) => (b.onclick = () => { puestoSel = b.dataset.q; R.rerender(); }));
      if (!q) return;
      if (!q.disc) q.disc = { D: 50, I: 50, S: 50, C: 50 };
      const ed = $('#peQed', host);
      ed.innerHTML = `<div class="pe-qgrid"><label class="small">Nombre<input class="input" data-k="nombre" value="${esc(q.nombre)}"></label><label class="small">Área<input class="input" data-k="area" value="${esc(q.area || '')}"></label>
        <label class="small" style="grid-column:1/-1">Misión del puesto (para qué existe)<input class="input" data-k="mision" value="${esc(q.mision || '')}" placeholder="Ej.: que cada pedido salga completo y a tiempo"></label></div>
        <div class="row"><select class="input" id="peQtpl"><option value="">Aplicar perfil de plantilla…</option>${Object.keys(H.PUESTOS_TIPO).map((k) => `<option value="${k}">${esc(H.PUESTOS_TIPO[k].n)}</option>`).join('')}</select><label class="small row"><input type="checkbox" data-k="critico" ${q.critico ? 'checked' : ''}> Puesto crítico</label></div>
        <div class="eyebrow">Comportamiento que pide (DISC)</div>
        <div class="pe-sliders">${['D', 'I', 'S', 'C'].map((k) => `<label class="small"><span><b style="color:${H.DISC[k].c}">${k}</b> ${H.DISC[k].n} <output>${q.disc[k]}</output></span><input type="range" min="0" max="100" step="5" data-d="${k}" value="${q.disc[k]}"></label>`).join('')}</div>
        <div class="eyebrow">Aportaciones clave del puesto (hasta tres)</div>
        <div class="row pe-rchips">${R.ROL_IDS.map((k) => `<button class="chip" aria-pressed="${q.roles.includes(k)}" data-r="${k}" title="${esc(H.ROLES[k].aporta)}">${esc(H.ROLES[k].n)}</button>`).join('')}</div>
        ${q.critico ? `<label class="small">Sucesor preparado<select class="input" data-k="sucesor"><option value="">— nadie —</option>${R.state.personas.filter((p) => p.puestoId !== q.id).map((p) => `<option value="${p.id}" ${p.id === q.sucesor ? 'selected' : ''}>${esc(p.nombre)}</option>`).join('')}</select></label>` : ''}
        <div class="row"><button class="btn ghost small" id="peQdel">Borrar puesto</button><span class="spacer"></span><button class="btn small" data-go="encaje">Ver encaje</button></div>`;
      $$('[data-k]', ed).forEach((el) => (el.onchange = () => { q[el.dataset.k] = el.type === 'checkbox' ? el.checked : el.value; R.save(); if (['critico', 'nombre'].includes(el.dataset.k)) R.rerender(); }));
      $$('[data-d]', ed).forEach((el) => { el.oninput = () => { el.parentElement.querySelector('output').textContent = el.value; q.disc[el.dataset.d] = +el.value; R.save(); }; });
      $$('[data-r]', ed).forEach((b) => (b.onclick = () => { const k = b.dataset.r; if (q.roles.includes(k)) q.roles = q.roles.filter((x) => x !== k); else if (q.roles.length < 3) q.roles.push(k); else return; R.save(); R.rerender(); }));
      $('#peQtpl', ed).onchange = (e) => { const T = H.PUESTOS_TIPO[e.target.value]; if (!T) return; q.disc = Object.assign({}, T.disc); q.roles = T.roles.slice(); q.tipo = e.target.value; R.save(); R.rerender(); };
      $('#peQdel', ed).onclick = (e) => confirmar(e.target, () => { R.state.puestos = R.state.puestos.filter((x) => x.id !== q.id); R.state.personas.forEach((p) => { if (p.puestoId === q.id) p.puestoId = ''; }); R.save(); R.rerender(); });
      $$('[data-go]', ed).forEach((b) => (b.onclick = () => R.show(b.dataset.go)));
    }
  });

  let encSel = null, encPuesto = null;
  R.register({
    id: 'encaje', grupo: 'Estructura', nombre: 'Encaje persona-puesto', pregunta: '¿Está cada persona en el puesto que mejor aprovecha su forma de ser?',
    informe: () => R.informeOrg(), informeTxt: 'Informe de la organización',
    render(host) {
      const ps = R.state.personas.filter((p) => R.puestoDe(p));
      const filas = ps.map((p) => ({ p, q: R.puestoDe(p), e: R.encaje(p, R.puestoDe(p)) })).sort((a, b) => (a.e.total == null) - (b.e.total == null) || (a.e.total || 0) - (b.e.total || 0));
      if (!R.state.puestos.length || !ps.length) { host.innerHTML = R.vacia('Para medir el encaje hacen falta puestos definidos y personas asignadas a ellos.', 'Ir a la plantilla') + '<div class="row"><button class="btn" data-go="puestos">Definir puestos</button></div>'; return; }
      const sel = filas.find((f) => f.p.id === encSel) || filas[0];
      if (!R.puesto(encPuesto)) encPuesto = R.state.puestos[0].id;
      const qx = R.puesto(encPuesto);
      const ranking = R.state.personas.map((p) => ({ p, e: R.encaje(p, qx) })).filter((x) => x.e && x.e.total != null).sort((a, b) => b.e.total - a.e.total);
      host.innerHTML = `<div class="glass pad stack"><p class="small muted" style="margin:0">Encaje = 60 % comportamiento (distancia entre el DISC de la persona y el que pide el puesto) + 40 % aportaciones (cómo de natural le salen las aportaciones clave del puesto). Es una orientación para conversar y entrenar, no una nota.</p>
        <div class="table-wrap"><table class="pe-table"><thead><tr><th style="text-align:left">Persona</th><th style="text-align:left">Puesto</th><th>Comportamiento</th><th>Aportaciones</th><th>Encaje</th><th style="text-align:left">Lo principal</th></tr></thead><tbody>
        ${filas.map((f) => `<tr class="pe-click ${sel && f.p.id === sel.p.id ? 'on' : ''}" data-id="${f.p.id}"><td>${esc(f.p.nombre)}</td><td>${esc(f.q.nombre)}</td><td class="num">${pct(f.e.disc)}</td><td class="num">${pct(f.e.roles)}</td><td class="num">${f.e.total != null ? R.pill(f.e.st, f.e.total + ' %') : '<span class="muted small">Faltan cuestionarios</span>'}</td><td class="small">${esc(f.e.brechas[0] ? f.e.brechas[0].txt : f.e.total != null ? 'Perfil alineado con el puesto.' : '')}</td></tr>`).join('')}</tbody></table></div></div>
        ${sel ? `<div class="grid pe-two"><div class="glass pad stack"><div class="eyebrow">${esc(sel.p.nombre)} en ${esc(sel.q.nombre)}</div>${sel.p.disc ? R.discBars(sel.p.disc, sel.q.disc) + '<p class="small muted" style="margin:0">Columnas: la persona. Raya blanca: lo que pide el puesto.</p>' : '<p class="muted">Sin DISC: complételo para medir el comportamiento.</p>'}
            ${sel.e.brechas.length ? `<div class="eyebrow">Brechas</div><ul>${sel.e.brechas.map((b) => `<li>${esc(b.txt)}</li>`).join('')}</ul>` : ''}${sel.e.fuertes.length ? `<div class="eyebrow">A favor</div><ul>${sel.e.fuertes.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>` : ''}
            ${(() => { const t = R.tablillasDe(sel.p).filter((x) => x.prio === 1); return t.length ? `<div class="eyebrow">Para cerrar las brechas</div><p class="small" style="margin:0">${t.map((x) => `<b>${esc(x.t.titulo)}</b>`).join(' · ')}</p><div class="row"><button class="btn small" id="peVerTab">Ver tablillas</button></div>` : ''; })()}</div>
          <div class="glass pad stack"><div class="eyebrow">¿Quién encaja mejor en…?</div><select class="input" id="peEncQ">${R.state.puestos.map((x) => `<option value="${x.id}" ${x.id === encPuesto ? 'selected' : ''}>${esc(x.nombre)}</option>`).join('')}</select>
            ${ranking.length ? `<ol class="pe-rank">${ranking.slice(0, 8).map((x) => `<li><span>${esc(x.p.nombre)}${x.p.puestoId === qx.id ? ' <small class="muted">(lo ocupa)</small>' : ''}</span>${R.bar(x.e.total, x.e.st === 'ok' ? 'var(--go)' : x.e.st === 'warn' ? 'var(--warn)' : 'var(--stop)', x.e.total + ' %')}</li>`).join('')}</ol><p class="small muted" style="margin:0">Útil para cubrir una baja, elegir sucesor o repartir tareas.</p>` : '<p class="muted small">Nadie tiene aún cuestionarios suficientes.</p>'}</div></div>` : ''}`;
      $$('tr.pe-click', host).forEach((tr) => (tr.onclick = () => { encSel = tr.dataset.id; R.rerender(); }));
      $('#peEncQ', host).onchange = (e) => { encPuesto = e.target.value; R.rerender(); };
      const vt = $('#peVerTab', host); if (vt) vt.onclick = () => { R.activa = sel.p.id; R.show('tablillas'); };
    }
  });

  R.register({
    id: 'organigrama', grupo: 'Estructura', nombre: 'Organigrama y mandos', pregunta: '¿Está bien construida la estructura: dependencias, amplitud de mando y relevos?',
    informe: () => R.informeOrg(), informeTxt: 'Informe de la organización',
    render(host) {
      const ps = R.state.personas;
      if (!ps.length) { host.innerHTML = R.vacia('Dé de alta la plantilla e indique de quién depende cada persona.', 'Ir a la plantilla'); return; }
      const E = R.estructura();
      const nodo = (p, d) => { const q = R.puestoDe(p), h = E.hijos(p.id), e = p.disc && R.discEstilo(p.disc); return `<li><div class="pe-node" data-pid="${p.id}" tabindex="0" role="button">${e ? `<i style="background:${H.DISC[e.pri].c}" title="${esc(e.nombre)}"></i>` : '<i></i>'}<b>${esc(p.nombre)}</b><small>${esc(q ? q.nombre : 'sin puesto')}${q && q.critico ? ' · crítico' : ''}${h.length ? ` · ${h.length} a cargo` : ''}</small></div>${h.length && d < 12 ? `<ul>${h.map((x) => nodo(x, d + 1)).join('')}</ul>` : ''}</li>`; };
      const amp = E.mandos.length ? (E.mandos.reduce((a, m) => a + m.n, 0) / E.mandos.length).toFixed(1).replace('.', ',') : '—';
      const crit = R.state.puestos.filter((x) => x.critico);
      host.innerHTML = `${kpis([{ k: 'Personas', v: ps.length }, { k: 'Niveles', v: E.niveles, st: E.niveles > 4 && ps.length < 50 ? 'warn' : 'ok' }, { k: 'Mandos', v: E.mandos.length }, { k: 'Amplitud media', v: amp, d: 'personas por mando' }, { k: 'Puestos críticos', v: crit.length, d: `${crit.filter((x) => x.sucesor && R.persona(x.sucesor)).length} con sucesor`, st: crit.some((x) => !x.sucesor) ? 'stop' : crit.length ? 'ok' : null }])}
        <div class="grid pe-two"><div class="glass pad stack"><div class="eyebrow">Árbol de dependencias</div><ul class="pe-tree">${E.raices.map((p) => nodo(p, 0)).join('')}</ul><p class="small muted" style="margin:0">El color es el estilo DISC. Las dependencias se cambian en la plantilla. Toque una persona para ver su ficha.</p></div>
        <div class="glass pad stack"><div class="eyebrow">Auditoría de la estructura</div>${R.avisos(E.avisos)}
          ${crit.length ? `<div class="eyebrow">Relevo de puestos críticos</div><div class="table-wrap"><table class="pe-table"><thead><tr><th style="text-align:left">Puesto</th><th style="text-align:left">Ocupa</th><th style="text-align:left">Sucesor</th><th>Encaje del sucesor</th></tr></thead><tbody>${crit.map((x) => { const occ = E.ocupantes(x.id), su = R.persona(x.sucesor), en = su ? R.encaje(su, x) : null; return `<tr><td>${esc(x.nombre)}</td><td>${esc(occ.map((p) => p.nombre).join(', ') || '—')}</td><td><select class="input" data-suc="${x.id}"><option value="">— nadie —</option>${ps.filter((p) => p.puestoId !== x.id).map((p) => `<option value="${p.id}" ${p.id === x.sucesor ? 'selected' : ''}>${esc(p.nombre)}</option>`).join('')}</select></td><td class="num">${en && en.total != null ? R.pill(en.st, en.total + ' %') : '—'}</td></tr>`; }).join('')}</tbody></table></div>` : '<p class="small muted">Marque en «Puestos» los puestos críticos para revisar su relevo.</p>'}</div></div>`;
      $$('[data-suc]', host).forEach((s) => (s.onchange = () => { R.puesto(s.dataset.suc).sucesor = s.value; R.save(); R.rerender(); }));
      $$('.pe-node', host).forEach((n) => { n.onclick = () => R.fichaPersona(n.dataset.pid); n.onkeydown = (e) => { if (e.key === 'Enter') R.fichaPersona(n.dataset.pid); }; });
    }
  });

  R.register({
    id: 'talento', grupo: 'Estructura', nombre: 'Mapa de talento', pregunta: '¿Dónde está el talento que sostiene la empresa y el que la hará crecer?',
    informe: () => R.informeOrg(), informeTxt: 'Informe de la organización',
    render(host) {
      const ps = R.state.personas;
      if (!ps.length) { host.innerHTML = R.vacia('Dé de alta la plantilla para construir el mapa de talento.', 'Ir a la plantilla'); return; }
      const opt = (v) => `<option value="">—</option>${[1, 2, 3].map((n) => `<option value="${n}" ${+v === n ? 'selected' : ''}>${NIV[n]}</option>`).join('')}`;
      const celda = (pot, des) => { const k = pot + '-' + des, c = R.CAJAS[k], quien = ps.filter((p) => R.caja(p) === k); return `<div class="pe-box b${pot}${des}"><b>${esc(c.n)}</b><div class="pe-bn">${quien.map((p) => `<span data-pid="${p.id}">${esc(p.nombre)}</span>`).join('')}</div><small>${esc(c.a)}</small></div>`; };
      host.innerHTML = `<div class="glass pad stack"><p style="margin:0">Matriz de nueve casillas: <b>desempeño</b> (lo que logra hoy en su puesto) frente a <b>potencial</b> (capacidad de asumir más). La valoración la hace su responsable con criterio, una o dos veces al año; no es un seguimiento del día a día.</p></div>
        <div class="grid pe-two"><div class="glass pad"><div class="table-wrap"><table class="pe-table"><thead><tr><th style="text-align:left">Persona</th><th>Desempeño</th><th>Potencial</th><th style="text-align:left">Casilla</th></tr></thead><tbody>
          ${ps.map((p) => { const k = R.caja(p); return `<tr data-id="${p.id}"><td>${esc(p.nombre)}</td><td><select class="input" data-v="desempeno">${opt(p.val && p.val.desempeno)}</select></td><td><select class="input" data-v="potencial">${opt(p.val && p.val.potencial)}</select></td><td class="small">${k ? esc(R.CAJAS[k].n) : '—'}</td></tr>`; }).join('')}</tbody></table></div></div>
        <div class="glass pad stack"><div class="pe-9"><div class="pe-9y">Potencial ↑</div><div class="pe-9g">${[3, 2, 1].map((pot) => [1, 2, 3].map((des) => celda(pot, des)).join('')).join('')}</div><div class="pe-9x">Desempeño →</div></div></div></div>`;
      $$('tr[data-id] select', host).forEach((s) => (s.onchange = () => { const p = R.persona(s.closest('tr').dataset.id); p.val = p.val || {}; p.val[s.dataset.v] = s.value ? +s.value : null; p.val.fecha = R.hoy(); R.save(); R.rerender(); }));
      $$('.pe-bn span', host).forEach((s) => (s.onclick = () => R.fichaPersona(s.dataset.pid)));
    }
  });

  /* ================= EQUIPOS ================= */
  let eqSel = 'todos';
  R.register({
    id: 'equipos', grupo: 'Equipos', nombre: 'Equipos', pregunta: '¿Está equilibrado cada equipo: estilos, aportaciones cubiertas y posibles roces?',
    informe: () => { const q = R.equipo(eqSel); R.informeEquipo(q ? q.miembros : R.state.personas.map((p) => p.id), q ? q.nombre : 'Toda la empresa', q && q.objetivo); }, informeTxt: 'Informe del equipo',
    render(host) {
      const ps = R.state.personas, eqs = R.state.equipos;
      if (!ps.length) { host.innerHTML = R.vacia('Dé de alta la plantilla para analizar equipos.', 'Ir a la plantilla'); return; }
      if (eqSel !== 'todos' && !R.equipo(eqSel)) eqSel = 'todos';
      const q = R.equipo(eqSel), ids = q ? q.miembros : ps.map((p) => p.id), an = R.analizarEquipo(ids);
      const col = { ok: 'var(--go)', warn: 'var(--warn)', stop: 'var(--stop)', sin: 'var(--faint)' };
      host.innerHTML = `<div class="glass pad row pe-eqbar"><button class="chip" aria-pressed="${eqSel === 'todos'}" data-eq="todos">Toda la empresa</button>${eqs.map((x) => `<button class="chip" aria-pressed="${x.id === eqSel}" data-eq="${x.id}">${esc(x.nombre)} <small>${x.miembros.length}</small></button>`).join('')}<span class="spacer"></span><button class="btn solid small" id="peEqNew">Nuevo equipo</button></div>
        ${q ? `<div class="glass pad stack"><div class="pe-qgrid"><label class="small">Nombre del equipo<input class="input" id="peEqN" value="${esc(q.nombre)}"></label><label class="small">Objetivo común<input class="input" id="peEqO" value="${esc(q.objetivo || '')}" placeholder="Para qué existe este equipo"></label></div>
          <div class="small muted">Miembros (toque para añadir o quitar):</div><div class="row pe-rchips">${ps.map((p) => `<button class="chip" aria-pressed="${q.miembros.includes(p.id)}" data-m="${p.id}">${esc(p.nombre)}</button>`).join('')}</div><div class="row"><button class="btn ghost small" id="peEqDel">Borrar equipo</button></div></div>` : ''}
        ${an.miembros.length ? `<div class="grid pe-two"><div class="glass pad stack"><div class="eyebrow">Estilos del equipo</div>${an.conDisc.length ? R.rueda(an.miembros) + `<div class="pe-dist">${['D', 'I', 'S', 'C'].map((k) => `<span><i style="background:${H.DISC[k].c}"></i>${H.DISC[k].n}: <b>${an.dist[k]}</b></span>`).join('')}</div>` : '<p class="muted small">Nadie tiene aún DISC.</p>'}
            ${an.conEnea.length ? `<div class="eyebrow">Centros del eneagrama</div><div class="pe-dist">${Object.keys(an.centros).map((c) => `<span>${c}: <b>${an.centros[c]}</b></span>`).join('')}</div><p class="small muted" style="margin:0">${an.centros.Mental >= an.conEnea.length * 0.6 ? 'Equipo muy mental: mucho análisis; cuide la acción y la relación.' : an.centros.Emocional >= an.conEnea.length * 0.6 ? 'Equipo muy emocional: mucha relación e imagen; cuide los datos y la decisión.' : an.centros.Instintivo >= an.conEnea.length * 0.6 ? 'Equipo muy instintivo: mucha acción; cuide la reflexión y la escucha.' : ((cs) => cs[0][1] > an.conEnea.length * 0.45 ? `Predomina el centro ${cs[0][0].toLowerCase()} (${cs[0][1]} de ${an.conEnea.length}); ${cs[2][1] ? `el ${cs[2][0].toLowerCase()} es el menos presente (${cs[2][1]}).` : `nadie del centro ${cs[2][0].toLowerCase()}.`}` : !cs[2][1] ? `Nadie del centro ${cs[2][0].toLowerCase()}.` : 'Centros equilibrados.')(Object.entries(an.centros).sort((a, b) => b[1] - a[1]))}</p>` : ''}</div>
          <div class="glass pad stack"><div class="eyebrow">Aportaciones cubiertas</div>${an.conRoles.length ? `<div class="pe-cob">${an.cobertura.map((c) => `<div class="pe-cb"><i style="background:${col[c.nivel]}"></i><span>${esc(H.ROLES[c.k].n)}</span><small>${c.best ? `${esc(R.nombre(c.best.id))} · ${c.best.v} %` : '—'}${c.n > 1 ? ` · ${c.n} personas` : ''}</small></div>`).join('')}</div><p class="small muted" style="margin:0">Verde: alguien lo tiene como rol natural (≥ 60 %). Ámbar: se cubre a medias. Rojo: nadie lo cubre.</p>` : '<p class="muted small">Nadie ha hecho aún el mapa de aportaciones.</p>'}</div></div>
        <div class="grid pe-two"><div class="glass pad stack"><div class="eyebrow">Lectura del equipo</div>${R.avisos(an.avisos)}
            ${an.tensiones.length ? `<div class="eyebrow">Posibles fricciones</div><ul class="small">${an.tensiones.slice(0, 6).map((t) => `<li><b>${esc(R.nombre(t.a))} y ${esc(R.nombre(t.b))}</b>: ${esc(t.t.txt)} <i>${esc(t.t.clave)}</i></li>`).join('')}</ul>` : ''}
            ${an.contratar ? `<div class="eyebrow">Si incorpora a alguien</div><p class="small" style="margin:0">Busque ${an.contratar.rol ? `el rol de <b>${esc(H.ROLES[an.contratar.rol].n.toLowerCase())}</b>` : ''}${an.contratar.rol && an.contratar.estilo ? ' con ' : ''}${an.contratar.estilo ? `estilo <b>${esc(H.DISC[an.contratar.estilo].n.toLowerCase())}</b> (${esc(H.DISC[an.contratar.estilo].corto.toLowerCase())})` : ''}: es lo que menos tiene hoy el equipo.</p>` : ''}</div>
          <div class="glass pad stack"><div class="eyebrow">Tablillas para el equipo</div>${R.tablillasEquipo(an).map((x) => R.tablillaHTML(x.t, x.motivos)).join('')}</div></div>` : '<div class="alert info">Añada miembros al equipo para analizarlo.</div>'}`;
      $$('[data-eq]', host).forEach((b) => (b.onclick = () => { eqSel = b.dataset.eq; R.rerender(); }));
      $('#peEqNew', host).onclick = () => { const x = { id: R.uid('t'), nombre: 'Equipo ' + (eqs.length + 1), objetivo: '', miembros: [] }; eqs.push(x); eqSel = x.id; R.save(); R.rerender(); setTimeout(() => { const i = $('#peEqN'); if (i) { i.focus(); i.select(); } }, 30); };
      if (q) {
        $('#peEqN', host).onchange = (e) => { q.nombre = e.target.value.trim() || q.nombre; R.save(); R.rerender(); };
        $('#peEqO', host).onchange = (e) => { q.objetivo = e.target.value; R.save(); };
        $$('[data-m]', host).forEach((b) => (b.onclick = () => { const id = b.dataset.m; q.miembros = q.miembros.includes(id) ? q.miembros.filter((x) => x !== id) : q.miembros.concat(id); R.save(); R.rerender(); }));
        $('#peEqDel', host).onclick = (e) => confirmar(e.target, () => { R.state.equipos = eqs.filter((x) => x.id !== q.id); eqSel = 'todos'; R.save(); R.rerender(); });
      }
    }
  });

  /* ================= DESARROLLO ================= */
  let catFiltro = 'todas';
  R.register({
    id: 'tablillas', grupo: 'Desarrollo', nombre: 'Tablillas de entrenamiento', pregunta: '¿Qué conviene entrenar a cada persona y a cada equipo, y cómo?',
    informe: () => { const p = R.personaActiva(); if (p) R.informeTablillas(p); }, informeTxt: 'Plan de entrenamiento',
    render(host) {
      const p = R.personaActiva();
      const prop = p ? R.tablillasDe(p) : [];
      const cats = { todas: 'Todas', disc: 'Estilo DISC', rol: 'Aportaciones al equipo', enea: 'Eneagrama', equipo: 'Equipo', lid: 'Liderazgo', paso: 'Paso entre niveles' };
      const cat = H.TABLILLAS.filter((t) => catFiltro === 'todas' || t.cuando[catFiltro] != null);
      host.innerHTML = `<div class="glass pad stack"><p style="margin:0">Cada <b>tablilla</b> es una ficha corta para entrenar un comportamiento concreto: objetivo, pasos, duración y la señal de que funciona. Se proponen solas según el estilo de la persona, lo que pide su puesto y lo que le falta a su equipo. Se imprimen y se trabajan en la conversación con su responsable.</p></div>
        ${p ? `${cabPersona(host, p)}<div class="glass pad stack"><div class="eyebrow">Propuestas para ${esc(p.nombre)}</div>${prop.length ? `<div class="pe-tabs">${prop.slice(0, 6).map((x) => R.tablillaHTML(x.t, x.motivos)).join('')}</div>` : `<p class="muted">Sin propuestas todavía: ${p.disc ? 'asigne su puesto o complete más herramientas.' : 'complete su DISC y asígnele un puesto.'}</p>`}</div>` : R.vacia('Dé de alta la plantilla para recibir propuestas personalizadas.', 'Ir a la plantilla')}
        <div class="glass pad stack"><div class="eyebrow">Catálogo completo · ${H.TABLILLAS.length} tablillas</div><div class="row">${Object.keys(cats).map((k) => `<button class="chip" aria-pressed="${k === catFiltro}" data-cat="${k}">${cats[k]}</button>`).join('')}</div><div class="pe-tabs">${cat.map((t) => R.tablillaHTML(t)).join('')}</div></div>`;
      wirePersona(host);
      $$('[data-cat]', host).forEach((b) => (b.onclick = () => { catFiltro = b.dataset.cat; R.rerender(); }));
    }
  });

  R.register({
    id: 'informes', grupo: 'Desarrollo', nombre: 'Informes', pregunta: '¿Qué documento necesito: de una persona, de un equipo o de toda la organización?',
    render(host) {
      const ps = R.state.personas, p = R.personaActiva();
      host.innerHTML = `<div class="grid pe-three">
        <div class="glass pad stack"><div class="eyebrow">Persona</div><p class="small" style="margin:0">Perfil DISC, aportaciones, eneagrama, encaje con su puesto, cómo comunicarse con ella y sus tablillas. Para la conversación de desarrollo.</p>${p ? `${R.selPersona('peInfP', p.id)}<div class="row"><button class="btn solid" id="peInfPer">Informe de la persona</button><button class="btn ghost" id="peInfTab">Sus tablillas</button></div>` : '<p class="muted small">Sin personas.</p>'}</div>
        <div class="glass pad stack"><div class="eyebrow">Equipo</div><p class="small" style="margin:0">Estilos, aportaciones cubiertas, fricciones probables, a quién incorporar y tablillas del equipo.</p><select class="input" id="peInfE"><option value="todos">Toda la empresa</option>${R.state.equipos.map((q) => `<option value="${q.id}">${esc(q.nombre)}</option>`).join('')}</select><div class="row"><button class="btn solid" id="peInfEq" ${ps.length ? '' : 'disabled'}>Informe del equipo</button></div></div>
        <div class="glass pad stack"><div class="eyebrow">Organización</div><p class="small" style="margin:0">Auditoría de personas y estructura: cobertura de herramientas, encaje persona-puesto, organigrama y relevos, mapa de talento, equipos y prioridades.</p><div class="row"><button class="btn solid" id="peInfOrg" ${ps.length ? '' : 'disabled'}>Informe de la organización</button></div></div></div>${R.aviso()}`;
      const sp = () => R.persona(($('#peInfP', host) || {}).value) || p;
      const b1 = $('#peInfPer', host); if (b1) b1.onclick = () => R.informePersona(sp());
      const b2 = $('#peInfTab', host); if (b2) b2.onclick = () => R.informeTablillas(sp());
      $('#peInfEq', host).onclick = () => { const q = R.equipo($('#peInfE', host).value); R.informeEquipo(q ? q.miembros : ps.map((x) => x.id), q ? q.nombre : 'Toda la empresa', q && q.objetivo); };
      $('#peInfOrg', host).onclick = () => R.informeOrg();
    }
  });

  /* ================= INFORMES =================
     Cada documento es un dossier sobre la empresa: resumen ejecutivo con la conclusión y sus cifras, diagnóstico,
     riesgos y oportunidades, recomendaciones priorizadas y anexo de metodología y limitaciones. Lo que falta por
     valorar se dice en el anexo, en lenguaje de empresa; los avisos de trabajo van fuera del documento. */
  const F4 = ['D', 'I', 'S', 'C'];
  const pl = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;
  const min = (t) => { t = String(t || ''); return t.charAt(0).toLowerCase() + t.slice(1); };
  const sinPunto = (t) => String(t || '').replace(/\.\s*$/, '');
  const nivelEnc = { ok: 'alto', warn: 'medio', stop: 'bajo' };
  const claves = (l) => `<ul class="rp-claves">${l.filter(Boolean).map((x) => `<li>${x}</li>`).join('')}</ul>`;
  const recos = (l) => I().table(['N.º', 'Qué hacer', 'Impacto esperado', 'Responsable', 'Plazo'], l.map((r, i) => [String(i + 1), { h: `<b>${esc(r.q)}</b>${r.c ? '<br>' + esc(r.c) : ''}` }, r.imp, r.quien, r.plazo]));
  const pasosDe = (l) => l.map((r) => ({ q: r.q, c: r.c || r.imp, quien: r.quien, s: r.imp }));
  const ryo = (ri, op) => I().table(['Tipo', 'Descripción', 'Qué significa para la empresa'], ri.map((x) => [{ h: I().pill('warn', 'Riesgo') }, x[0], x[1]]).concat(op.map((x) => [{ h: I().pill('ok', 'Oportunidad') }, x[0], x[1]])));
  const anexo = (metodo, limites) => `<section class="rp-sec rp-anexo"><h2><span class="rp-n">A</span>Anexo · Metodología, fuentes y limitaciones</h2>${I().table(['Aspecto', 'Cómo se ha obtenido'], metodo)}<p class="rp-lede"><b>Alcance y limitaciones de la información</b></p><ul>${limites.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></section>`;
  const MET = {
    disc: ['Estilo de comportamiento', `Cuestionario de ${H.DISC_BLOQUES.length} bloques en los que la persona elige lo que más y lo que menos la describe (modelo DISC). Mide cuatro factores de 0 a 100: dominancia, influencia, estabilidad y cumplimiento.`],
    roles: ['Aportación al equipo', `Cuestionario de ${H.ROLES_ITEMS.length} afirmaciones sobre nueve aportaciones al trabajo en equipo, de 0 a 100 %. Una aportación se considera natural a partir del 60 % y sin cubrir por debajo del 45 %.`],
    enea: ['Motivación', `Cuestionario de ${H.ENEA_ITEMS.length} afirmaciones sobre lo que mueve a la persona y lo que tiende a evitar (eneagrama).`],
    encaje: ['Encaje con el puesto', 'Compara a la persona con lo que requiere su puesto: 60 % comportamiento y 40 % aportaciones clave. Alto: 75 % o más. Medio: del 55 % al 74 %. Bajo: menos del 55 %.'],
    fuentes: ['Fuentes', 'Relación de personas, puestos, dependencias y equipos aportada por la empresa. Las valoraciones proceden de cuestionarios respondidos por cada persona.'],
    talento: ['Mapa de talento', 'Valoración de desempeño y de potencial de cada persona, en tres niveles, realizada por la dirección.']
  };
  const LIM_BASE = 'Las valoraciones parten de las respuestas de cada persona y describen tendencias de comportamiento, no capacidad ni desempeño. No deben ser el único criterio en decisiones sobre personas.';
  const discTabla = (d, ideal) => I().table(['Factor', 'Persona', ideal ? 'Requerido por el puesto' : null].filter(Boolean), F4.map((k) => [`${k} · ${H.DISC[k].n}`, String(d[k]), ideal ? String(ideal[k]) : null].filter((x) => x != null)), { num: [1, 2] });
  const pie = 'Documento orientativo para el desarrollo profesional. Describe tendencias de comportamiento, no capacidad ni desempeño, y no debe ser el único criterio en decisiones sobre personas. Información tratada con el consentimiento de cada persona.';
  const cover = (o) => { const e = R.empresa(); return I().cover(Object.assign({ empresa: e.nombre, sector: e.sector, tipo: 'Personas y organización' }, o)); };
  const fichaHTML = (t, motivos, i) => `<article class="pe-tab"><header><span class="pe-tk">Ficha ${i + 1}</span><h4>${esc(t.titulo)}</h4></header><p><b>Objetivo:</b> ${esc(t.objetivo)}</p><ol>${t.pasos.map((s) => `<li>${esc(s)}</li>`).join('')}</ol><p class="small"><b>Duración:</b> ${esc(t.duracion)} · <b>Señal de avance:</b> ${esc(t.senal)}</p>${motivos && motivos.length ? `<p class="small pe-why">Motivo: ${motivos.map(esc).join(' ')}</p>` : ''}</article>`;
  /* Nota de trabajo para quien prepara el informe: va encima de la hoja, fuera del documento (ni se imprime ni se copia) */
  R.notaTrabajo = (paper, txt) => { const ov = paper && paper.parentNode; if (!ov) return; ov.querySelectorAll('.pe-nota-trabajo').forEach((x) => x.remove()); if (!txt) return; const n = document.createElement('p'); n.className = 'rp-hint pe-nota-trabajo'; n.innerHTML = '<b>Nota de trabajo · no forma parte del documento ni se imprime.</b> ' + esc(txt); ov.insertBefore(n, paper); };
  /* Informe con su parte de consultor (hoja de ruta, seguimiento y cuaderno interno). El anexo cierra el documento:
     se coloca justo antes del pie cada vez que se pinta la versión para la empresa. */
  R.abrirInforme = (o) => {
    const after = (paper) => {
      if (o.after) o.after(paper);
      R.notaTrabajo(paper, o.nota);
      if (!o.anexo) return;
      const poner = () => { if (paper.classList.contains('ci-interno') || paper.querySelector('.rp-anexo')) return; const f = paper.querySelectorAll('.rp-foot'), u = f[f.length - 1]; if (u) u.insertAdjacentHTML('beforebegin', o.anexo); else paper.insertAdjacentHTML('beforeend', o.anexo); };
      poner(); new MutationObserver(poner).observe(paper, { childList: true });
    };
    const oo = Object.assign({}, o, { after, ctx: Object.assign({ empresa: R.empresa().nombre, sector: R.empresa().sector }, o.ctx || {}) });
    return A.consultorInf ? A.consultorInf.abrir(oo) : I().open(oo);
  };
  const SEG_PERSONA = [['Semanal', 'Avance de la ficha de entrenamiento en curso', 'Responsable directo', 'Señal de avance de la ficha', 'Seguir con el paso o cambiarlo'], ['Mensual (30 min)', 'Conversación de desarrollo: qué ha cambiado y qué cuesta', 'Responsable y persona', 'Señales de avance del plan de entrenamiento', 'Elegir la siguiente ficha'], ['Trimestral', 'Actualizar las valoraciones y revisar el encaje con el puesto', 'Consultor', 'Encaje con el puesto', 'Ajustar el plan de desarrollo']];
  R.SEG_PERSONA = SEG_PERSONA;
  R.inf = { pl, min, sinPunto, claves, recos, pasosDe, ryo, anexo, MET, LIM_BASE, nivelEnc };

  /* Lectura de una persona: conclusión, mensajes clave, riesgos, oportunidades, recomendaciones y limitaciones */
  R.lecPersona = (p) => {
    const pu = R.puestoDe(p), enc = R.encaje(p, pu), e = p.disc && R.discEstilo(p.disc), D = e && H.DISC[e.pri], n1 = String(p.nombre || '').split(' ')[0];
    const s = p.roles && p.roles.scores, ro = s && R.rolesOrden(s), En = p.enea && p.enea.tipo ? H.ENEA[p.enea.tipo] : null;
    const jefe = R.persona(p.responsable), cargo = R.state.personas.filter((x) => x.responsable === p.id);
    const encOk = !!(enc && enc.total != null), sinRelevo = !!(pu && pu.critico && (!pu.sucesor || !R.persona(pu.sucesor)));
    const perfilPuesto = !!(pu && (pu.disc || (pu.roles && pu.roles.length)));
    const tabs = R.tablillasDe(p).slice(0, 5), hay = !!(e || s || En), quien = jefe ? jefe.nombre : 'Consultor';
    const lead = encOk ? `<b>${esc(p.nombre)}</b> presenta un encaje ${nivelEnc[enc.st]} con el puesto de ${esc(pu.nombre)}: <b>${enc.total} %</b>. ${enc.brechas.length ? 'La principal diferencia: ' + esc(min(enc.brechas[0].txt)) : 'Su perfil coincide con lo que requiere el puesto.'}`
      : e ? `<b>${esc(p.nombre)}</b> tiene un estilo de comportamiento de <b>${esc(e.nombre.toLowerCase())}</b>. ${esc(D.resumen)}`
        : `<b>${esc(p.nombre)}</b> ${pu ? 'ocupa el puesto de ' + esc(pu.nombre) : 'forma parte de la plantilla'}${jefe ? ', depende de ' + esc(jefe.nombre) : ''}${cargo.length ? ' y dirige a ' + pl(cargo.length, 'persona', 'personas') : ''}.`;
    const cl = [
      e && encOk ? `Estilo de comportamiento: <b>${esc(e.nombre.toLowerCase())}</b> (${F4.map((k) => k + ' ' + p.disc[k]).join(' · ')}, sobre 100). ${esc(D.resumen)}` : e ? `Factores de comportamiento: ${F4.map((k) => k + ' ' + p.disc[k]).join(' · ')}, sobre 100.` : '',
      ro ? `Aportación al equipo: ${ro.slice(0, 3).map((k) => `${esc(H.ROLES[k].n.toLowerCase())} (${s[k]} %)`).join(', ')}.` : '',
      En ? `Motivación: le mueve ${esc(min(En.motivacion))}` : '',
      encOk && enc.disc != null && enc.roles != null ? `Encaje con el puesto: comportamiento ${pct(enc.disc)} y aportaciones clave ${pct(enc.roles)}.` : '',
      hay ? `Posición: ${jefe ? 'depende de ' + esc(jefe.nombre) : 'primer nivel de la organización'}${cargo.length ? '; dirige a ' + pl(cargo.length, 'persona', 'personas') : ''}.` : '',
      sinRelevo ? 'Ocupa un puesto crítico para la empresa que no tiene relevo designado.' : ''
    ];
    const ri = [], op = [];
    if (encOk) enc.brechas.forEach((b) => ri.push([b.txt, b.tipo === 'rol' ? 'El puesto necesita esa aportación: conviene entrenarla o apoyarla desde el equipo.' : b.d > 0 ? 'Sostener ese comportamiento le exige un esfuerzo de adaptación continuado.' : 'Capacidad que el puesto actual no aprovecha del todo.']));
    if (sinRelevo) ri.push([`El puesto de ${pu.nombre} es crítico y no tiene relevo designado.`, `Si ${n1} falta, la función queda sin cobertura.`]);
    if (D) ri.push([D.presion, 'Conviene anticipar los periodos de más carga y acordar cómo pedirle las cosas.']);
    if (En) ri.push([En.riesgo, 'A tratar en la conversación de desarrollo.']);
    if (encOk) enc.fuertes.forEach((f) => op.push([f, 'Fortaleza que el puesto aprovecha.']));
    if (D) op.push([D.aporta.join('; ') + '.', 'Fortalezas de su estilo que conviene poner al servicio del equipo.']);
    if (ro) op.push([H.ROLES[ro[0]].aporta, `Su aportación más natural al equipo (${s[ro[0]]} %).`]);
    const rc = [];
    if (!hay) rc.push({ q: `Valorar el estilo de comportamiento, la aportación al equipo y la motivación de ${n1}`, c: 'Tres cuestionarios breves, con su consentimiento y una explicación previa de para qué se usan.', imp: 'Base para orientar su desarrollo y valorar el encaje con el puesto', quien: 'Dirección o recursos humanos', plazo: '1 mes' });
    if (!pu) rc.push({ q: 'Definir su puesto, su misión y de quién depende', imp: 'Responsabilidades claras y encaje valorable', quien: 'Dirección', plazo: '1 mes' });
    else if (!perfilPuesto) rc.push({ q: `Definir el comportamiento y las aportaciones que requiere el puesto de ${pu.nombre}`, imp: 'Permite valorar el encaje de la persona con el puesto', quien: 'Dirección', plazo: '1 mes' });
    if (hay) rc.push({ q: 'Conversación de devolución del perfil', c: `Treinta minutos entre ${jefe ? jefe.nombre : 'el consultor'} y ${n1}: contrastar el perfil con ejemplos y acordar una prioridad de desarrollo.`, imp: 'Prioridad de desarrollo acordada, con fecha de revisión', quien, plazo: '2 semanas' });
    if (encOk && enc.st !== 'ok' && enc.brechas.length) rc.push({ q: 'Acordar cómo se cubre la principal diferencia con el puesto', c: enc.brechas[0].txt, imp: `Acercar el encaje del ${enc.total} % al 75 % (umbral de encaje alto)`, quien, plazo: '3 meses' });
    if (sinRelevo) rc.push({ q: `Designar y preparar un relevo para el puesto de ${pu.nombre}`, c: 'Elegir a la persona, acordar un plan de traspaso y revisar su avance cada trimestre.', imp: 'Función crítica cubierta ante una ausencia', quien: 'Dirección', plazo: '6 meses' });
    tabs.slice(0, 3).forEach((x) => rc.push({ q: 'Entrenar: ' + x.t.titulo, c: x.t.objetivo, imp: x.t.senal, quien: p.nombre, plazo: x.t.duracion }));
    const lim = [];
    if (!p.disc) lim.push(`No se ha dispuesto de la valoración del estilo de comportamiento de ${n1}; el documento no describe su estilo ni su forma de comunicarse.`);
    if (!s) lim.push('No se ha dispuesto de la valoración de su aportación al equipo.');
    if (!En) lim.push('No se ha dispuesto de la valoración de su motivación.');
    if (!pu) lim.push('La persona no tiene un puesto definido en el organigrama; no se valora su encaje.');
    else if (!perfilPuesto) lim.push(`El puesto de ${pu.nombre} no tiene definidos el comportamiento ni las aportaciones que requiere; no se valora el encaje.`);
    lim.push(LIM_BASE);
    const falta = [!p.disc && 'el cuestionario de comportamiento', !s && 'el de aportaciones al equipo', !En && 'el de motivación', !pu && 'asignarle un puesto', pu && !perfilPuesto && 'el perfil que requiere su puesto'].filter(Boolean);
    return { pu, enc, e, D, n1, s, ro, En, jefe, cargo, encOk, sinRelevo, perfilPuesto, tabs, hay, lead, claves: cl, ri, op, rc, lim, falta };
  };

  R.informePersona = (p) => {
    if (!p) return; const In = I(); In.reset();
    const { pu, enc, e, D, s, ro, En, jefe, cargo, encOk, sinRelevo, tabs, lead, claves: cl, ri, op, rc, lim, falta } = R.lecPersona(p);
    let h = cover({ kicker: 'Perfil profesional', titulo: p.nombre, subtitulo: [pu ? pu.nombre : null, p.area || (pu && pu.area)].filter(Boolean).join(' · ') });
    h += In.summary('Resumen ejecutivo', `<p>${lead}</p>` + claves(cl), enc && enc.st);
    h += In.section('Posición en la organización', In.table(['Aspecto', 'Situación'], [['Puesto', pu ? pu.nombre : null], ['Área', p.area || (pu && pu.area)], ['Depende de', jefe ? jefe.nombre : null], ['Personas a su cargo', cargo.length ? `${cargo.length}: ${cargo.slice(0, 8).map((x) => x.nombre).join(', ')}${cargo.length > 8 ? '…' : ''}` : 'Ninguna'], ['Misión del puesto', pu && pu.mision], ['Puesto crítico', pu && pu.critico ? (sinRelevo ? 'Sí, sin relevo designado' : 'Sí; relevo designado: ' + R.nombre(pu.sucesor)) : null]].filter((r) => r[1])));
    if (p.disc) h += In.section('Estilo de comportamiento: ' + e.nombre.toLowerCase(), discTabla(p.disc, pu && pu.disc) + In.table(['Aspecto', 'Lectura'], [['Aporta', D.aporta.join('; ')], ['Necesita', D.necesita.join('; ')], ['Cómo comunicarse', D.comunicar], ['Qué evitar', D.evitar], ['Bajo presión', D.presion], ['Entorno donde rinde', D.entorno]]), `Valoración del ${R.fechaES(p.disc.fecha)}${p.disc.origen === 'externo' ? ', aportada por la empresa' : ''}.`);
    if (s) h += In.section('Aportación al equipo: ' + ro.slice(0, 3).map((k) => H.ROLES[k].n.toLowerCase()).join(', '), In.table(['Aportación', 'Familia', 'Puntuación', 'Qué aporta'], ro.map((k) => [H.ROLES[k].n, H.ROLES[k].g, s[k] + ' %', H.ROLES[k].aporta]), { num: [2] }), 'Las tres primeras son sus aportaciones naturales al trabajo en equipo.');
    if (En) h += In.section('Motivación: ' + sinPunto(min(En.motivacion)), In.table(['Aspecto', 'Lectura'], [['Le mueve', En.motivacion], ['Le incomoda', En.miedo], ['Fortaleza', En.fortaleza], ['Cómo dirigirle', En.liderar], ['A cuidar', En.riesgo]]));
    if (encOk) h += In.section(`Encaje ${nivelEnc[enc.st]} con el puesto: ${enc.total} %`, In.kpis([{ k: 'Encaje', v: enc.total + ' %', st: enc.st }, { k: 'Comportamiento', v: pct(enc.disc) }, { k: 'Aportaciones clave', v: pct(enc.roles) }]) + (enc.brechas.length ? In.table(['Diferencias con lo que requiere el puesto'], enc.brechas.map((b) => [b.txt])) : In.callout('Perfil alineado con lo que requiere el puesto.', 'ok')) + (enc.fuertes.length ? In.table(['Puntos fuertes para el puesto'], enc.fuertes.map((f) => [f])) : ''), pu.mision ? 'Misión del puesto: ' + esc(pu.mision) : '');
    if (R.identidadInforme) h += R.identidadInforme(p);
    if (ri.length || op.length) h += In.section('Riesgos y oportunidades', ryo(ri, op));
    h += In.section('Recomendaciones', recos(rc), 'Por orden de prioridad.');
    if (tabs.length) h += In.section('Plan de entrenamiento', In.table(['Ficha de entrenamiento', 'Objetivo', 'Duración', 'Motivo'], tabs.map((x) => [x.t.titulo, x.t.objetivo, x.t.duracion, x.motivos.join(' ')])));
    h += In.foot(pie);
    R.abrirInforme({ titulo: 'Perfil profesional de ' + p.nombre, html: h, clave: 'per:' + p.id, nota: falta.length ? 'Para completar este perfil falta: ' + falta.join(', ') + '.' : '',
      anexo: anexo([p.disc && MET.disc, s && MET.roles, En && MET.enea, encOk && MET.encaje, MET.fuentes].filter(Boolean), lim),
      ctx: { titulo: p.nombre, tipo: 'Perfil profesional', seguimiento: SEG_PERSONA, pasos: pasosDe(rc),
        datos: [['Puesto', pu ? pu.nombre : 'Por definir'], ['Estilo de comportamiento', e ? e.nombre : 'Sin valorar'], ['Aportaciones naturales', ro ? ro.slice(0, 3).map((k) => H.ROLES[k].n).join(', ') : 'Sin valorar'], ['Motivación', En ? sinPunto(En.motivacion) : 'Sin valorar'], ['Encaje con el puesto', encOk ? enc.total + ' %' : 'Sin valorar'], ['Consentimiento informado', p.consentimiento ? 'Sí' + (p.consentFecha ? ' · ' + R.fechaES(p.consentFecha) : '') : 'Pendiente de recabar']] } });
  };

  R.informeTablillas = (p) => {
    if (!p) return; const In = I(); In.reset();
    const tabs = R.tablillasDe(p).slice(0, 6), pu = R.puestoDe(p), jefe = R.persona(p.responsable);
    let h = cover({ kicker: 'Plan de entrenamiento', titulo: p.nombre, subtitulo: [pu && pu.nombre, p.area].filter(Boolean).join(' · ') });
    h += In.summary('Plan de entrenamiento', tabs.length
      ? `<p><b>${pl(tabs.length, 'ficha', 'fichas')} de entrenamiento</b> para ${esc(p.nombre)}, elegidas según su estilo de comportamiento, lo que requiere su puesto y lo que necesita su equipo. Cada ficha se trabaja durante el plazo indicado y se revisa con ${esc(jefe ? jefe.nombre : 'su responsable')}, con la señal de avance como referencia.</p>`
      : `<p>El plan de entrenamiento de ${esc(p.nombre)} se define a partir de su estilo de comportamiento y de lo que requiere su puesto. Esa valoración queda fuera del alcance de este documento.</p>`);
    if (tabs.length) h += `<div class="pe-tabs pe-print">${tabs.map((x, i) => fichaHTML(x.t, x.motivos, i)).join('')}</div>`;
    h += In.foot(pie);
    In.open({ titulo: 'Plan de entrenamiento de ' + p.nombre, html: h, after: (paper) => R.notaTrabajo(paper, tabs.length ? '' : 'Para proponer fichas de entrenamiento hacen falta el cuestionario de comportamiento de la persona y un puesto asignado.') });
  };

  /* Lectura de un equipo, común al diagnóstico breve y al informe completo paginado */
  R.lecEquipo = (ids, nombre, objetivo) => {
    const an = R.analizarEquipo(ids), M = an.miembros, nD = an.conDisc.length, nR = an.conRoles.length;
    const top = nD ? F4.slice().sort((a, b) => an.dist[b] - an.dist[a])[0] : null, cub = 9 - an.faltan.length;
    const encs = M.map((p) => R.encaje(p, R.puestoDe(p))).filter((x) => x && x.total != null), encM = encs.length ? Math.round(encs.reduce((a, x) => a + x.total, 0) / encs.length) : null;
    const eq = nombre === 'Toda la empresa' ? 'la plantilla' : 'el equipo ' + nombre, Eq = eq.charAt(0).toUpperCase() + eq.slice(1);
    const lead = nR ? (an.faltan.length ? `A ${esc(eq)} le ${an.faltan.length === 1 ? 'falta' : 'faltan'} <b>${an.faltan.length} de las 9 aportaciones</b> que necesita un equipo equilibrado: ${an.faltan.map((k) => esc(H.ROLES[k].n.toLowerCase())).join(', ')}. ${esc(H.ROLES[an.faltan[0]].falta)}` : `${esc(Eq)} tiene cubiertas <b>las 9 aportaciones</b> que necesita un equipo equilibrado.`)
      : nD ? `En ${esc(eq)} predomina el estilo de <b>${esc(H.DISC[top].n.toLowerCase())}</b>: ${an.dist[top]} de ${nD} personas.`
        : `${esc(Eq)} reúne a ${pl(M.length, 'persona', 'personas')}${objetivo ? ' con el objetivo «' + esc(objetivo) + '»' : ''}.`;
    const cl = [
      (nR || nD) ? `Composición: ${pl(M.length, 'persona', 'personas')}${objetivo ? '; objetivo: «' + esc(objetivo) + '»' : ''}.` : '',
      nD && nR ? `Estilo predominante: ${esc(H.DISC[top].n.toLowerCase())} (${an.dist[top]} de ${nD} personas). Media del equipo: ${F4.map((k) => k + ' ' + an.media[k]).join(' · ')}, sobre 100.` : nD ? `Media del equipo: ${F4.map((k) => k + ' ' + an.media[k]).join(' · ')}, sobre 100.` : '',
      nR ? `Aportaciones cubiertas: ${cub} de 9.` : '',
      nD ? (an.tensiones.length ? `${pl(an.tensiones.length, 'diferencia de estilo que conviene pactar', 'diferencias de estilo que conviene pactar')} entre miembros del equipo.` : 'Sin diferencias de estilo relevantes entre sus miembros.') : '',
      encM != null ? `Encaje medio de sus miembros con sus puestos: ${encM} % (${pl(encs.length, 'persona valorada', 'personas valoradas')}).` : '',
      an.contratar && (an.contratar.rol || an.contratar.estilo) ? `Perfil que más equilibraría el equipo: ${[an.contratar.rol && 'aportación de ' + esc(H.ROLES[an.contratar.rol].n.toLowerCase()), an.contratar.estilo && 'estilo de ' + esc(H.DISC[an.contratar.estilo].n.toLowerCase())].filter(Boolean).join(' y ')}.` : ''
    ];
    const ri = an.avisos.filter((a) => a.st !== 'info' && !/fricción/.test(a.t)).map((a) => [a.t, /homogéneo/.test(a.t) ? 'Decisiones más rápidas, con menos contraste de puntos de vista.' : /sin cubrir/.test(a.t) ? 'El equipo depende de cubrirla desde fuera o de que alguien la asuma con esfuerzo.' : 'A tener en cuenta en el reparto de tareas y en la próxima incorporación.']);
    if (an.tensiones.length) ri.push([`${pl(an.tensiones.length, 'diferencia de estilo', 'diferencias de estilo')} entre miembros.`, 'Sin un acuerdo de funcionamiento, pueden traducirse en roces y retrasos.']);
    const op = an.cobertura.filter((c) => c.best && c.best.v >= 75).slice(0, 4).map((c) => [`Aportación de ${H.ROLES[c.k].n.toLowerCase()} muy sólida (${R.nombre(c.best.id)}, ${c.best.v} %).`, 'Fortaleza sobre la que apoyar el objetivo del equipo.']);
    if (an.contratar && (an.contratar.rol || an.contratar.estilo)) op.push([`Próxima incorporación: ${[an.contratar.rol && 'aportación de ' + H.ROLES[an.contratar.rol].n.toLowerCase(), an.contratar.estilo && 'estilo de ' + H.DISC[an.contratar.estilo].n.toLowerCase()].filter(Boolean).join(' y ')}.`, 'El perfil que más equilibraría el equipo.']);
    const tq = R.tablillasEquipo(an), rc = [];
    if (!nD && !nR) rc.push({ q: 'Valorar el estilo de comportamiento y la aportación al equipo de cada miembro', c: 'Cuestionarios breves, con el consentimiento de cada persona.', imp: 'Diagnóstico del equipo: estilos, aportaciones cubiertas y diferencias a pactar', quien: 'Responsable del equipo', plazo: '1 mes' });
    if (nD) rc.push({ q: 'Sesión de devolución con el equipo', c: 'Sesenta minutos: cada persona comparte su estilo y cómo prefiere que le pidan las cosas.', imp: 'Cada persona conoce el estilo de las demás', quien: 'Responsable del equipo', plazo: '1 mes' });
    if (an.faltan.length) rc.push({ q: 'Cubrir ' + (an.faltan.length === 1 ? 'la aportación de ' : 'las aportaciones de ') + an.faltan.map((k) => H.ROLES[k].n.toLowerCase()).join(', '), c: 'Decidir quién del equipo las asume, con una ficha de entrenamiento, o incorporarlas desde fuera.', imp: `Aportaciones cubiertas: de ${cub} a 9 de 9`, quien: 'Responsable del equipo', plazo: '3 meses' });
    an.tensiones.slice(0, 3).forEach((t) => rc.push({ q: 'Pactar la diferencia entre ' + R.nombre(t.a) + ' y ' + R.nombre(t.b), c: t.t.clave, imp: 'Acuerdo de funcionamiento escrito y revisado al mes', quien: 'Responsable del equipo', plazo: '1 mes' }));
    if (an.contratar && (an.contratar.rol || an.contratar.estilo)) rc.push({ q: 'Orientar la próxima incorporación', c: [an.contratar.rol && 'Aportación de ' + H.ROLES[an.contratar.rol].n.toLowerCase(), an.contratar.estilo && 'estilo de ' + H.DISC[an.contratar.estilo].n.toLowerCase()].filter(Boolean).join(' y ') + '.', imp: 'Equipo más equilibrado en estilos y aportaciones', quien: 'Dirección', plazo: 'Próxima vacante' });
    const lim = [];
    if (nD < M.length) lim.push(nD ? `La valoración del estilo de comportamiento cubre a ${nD} de ${M.length} personas; las conclusiones sobre estilos se refieren a ese grupo.` : 'No se ha dispuesto de la valoración del estilo de comportamiento de los miembros; el documento no analiza estilos ni diferencias entre ellos.');
    if (nR < M.length) lim.push(nR ? `La valoración de aportaciones al equipo cubre a ${nR} de ${M.length} personas.` : 'No se ha dispuesto de la valoración de aportaciones al equipo; el documento no analiza su cobertura.');
    lim.push(LIM_BASE);
    return { an, M, nD, nR, top, cub, encs, encM, eq, Eq, lead, claves: cl, ri, op, tq, rc, lim, st: an.faltan.length > 2 ? 'stop' : an.faltan.length || an.tensiones.length ? 'warn' : nR ? 'ok' : null };
  };

  R.informeEquipo = (ids, nombre, objetivo) => {
    const In = I(); In.reset(); const { an, M, nD, nR, top, cub, encM, lead, claves: cl, ri, op, tq, rc, lim, st } = R.lecEquipo(ids, nombre, objetivo);
    let h = cover({ kicker: 'Diagnóstico de equipo', titulo: nombre, subtitulo: objetivo ? 'Objetivo: ' + objetivo : pl(M.length, 'persona', 'personas') });
    h += In.summary('Resumen ejecutivo', `<p>${lead}</p>` + claves(cl), st);
    h += In.section('Composición del equipo', In.table(['Persona', 'Puesto', 'Estilo de comportamiento', 'Aportaciones naturales', 'Encaje con el puesto'], M.map((p) => { const en = R.encaje(p, R.puestoDe(p)); return [p.nombre, (R.puestoDe(p) || {}).nombre || '—', p.disc ? R.discEstilo(p.disc).nombre : '—', p.roles && p.roles.scores ? R.rolesOrden(p.roles.scores).slice(0, 2).map((k) => H.ROLES[k].n).join(', ') : '—', en && en.total != null ? { h: In.pill(en.st, en.total + ' %') } : '—']; })));
    if (an.media) h += In.section(`Estilos de comportamiento: predomina la ${H.DISC[top].n.toLowerCase()}`, `<div class="rp-block">${R.rueda(M, { numeros: true })}${R.ruedaLeyenda(M)}</div>` + In.table(['Estilo', 'Personas con ese estilo principal', 'Media del factor (0-100)'], F4.map((k) => [H.DISC[k].n, String(an.dist[k]), String(an.media[k])]), { num: [1, 2] }), 'Cada punto es una persona, numerada y con el color de su estilo principal.');
    if (nR) h += In.section(an.faltan.length ? `Aportaciones al equipo: ${an.faltan.length} de 9 sin cubrir` : 'Aportaciones al equipo: las 9 están cubiertas', In.table(['Aportación', 'Quién la cubre mejor', 'Puntuación', 'Situación'], an.cobertura.map((c) => [H.ROLES[c.k].n, c.best ? R.nombre(c.best.id) : '—', c.best ? c.best.v + ' %' : '—', { h: In.pill(c.nivel === 'sin' ? 'warn' : c.nivel, c.nivel === 'ok' ? 'Cubierta' : c.nivel === 'warn' ? 'A medias' : 'Sin cubrir') }]), { num: [2] }));
    if (an.tensiones.length) h += In.section(`Diferencias de estilo que conviene pactar: ${an.tensiones.length}`, In.table(['Entre', 'Diferencia', 'Cómo pactarla'], an.tensiones.map((t) => [R.nombre(t.a) + ' y ' + R.nombre(t.b), t.t.txt, t.t.clave])), 'No son conflictos: son formas distintas de trabajar.');
    if (ri.length || op.length) h += In.section('Riesgos y oportunidades', ryo(ri, op));
    h += In.section('Recomendaciones', recos(rc), 'Por orden de prioridad.');
    if (nD || nR) h += In.section('Plan de entrenamiento del equipo', In.table(['Ficha de entrenamiento', 'Objetivo', 'Pasos', 'Motivo'], tq.map((x) => [x.t.titulo, x.t.objetivo, x.t.pasos.join(' · '), x.motivos.join(' ')])));
    h += In.foot(pie);
    R.abrirInforme({ titulo: 'Diagnóstico del equipo ' + nombre, html: h, clave: 'eq:' + nombre, nota: nD < M.length || nR < M.length ? `Faltan cuestionarios por responder: comportamiento, ${M.length - nD} de ${M.length} personas; aportaciones, ${M.length - nR} de ${M.length}.` : '',
      anexo: anexo([nD && MET.disc, nR && MET.roles, encM != null && MET.encaje, MET.fuentes].filter(Boolean), lim),
      ctx: { titulo: 'Equipo ' + nombre, tipo: 'Diagnóstico de equipo', pasos: pasosDe(rc).concat((nD || nR) ? tq.slice(0, 2).map((x) => ({ q: 'Entrenamiento de equipo: ' + x.t.titulo, c: x.t.pasos[0], quien: 'Responsable del equipo', s: x.t.senal })) : []),
        seguimiento: [['Quincenal', 'Acuerdos del equipo y diferencias de estilo', 'Responsable del equipo', 'Incidencias entre personas', 'Ajustar los acuerdos'], ['Mensual', 'Avance del plan de entrenamiento del equipo', 'Responsable y consultor', 'Señales de avance', 'Siguiente ficha'], ['Trimestral', 'Revisión del diagnóstico del equipo', 'Consultor', 'Aportaciones cubiertas', 'Recomposición o incorporación']],
        datos: [['Personas', String(M.length)], ['Con estilo de comportamiento valorado', `${nD} de ${M.length}`], ['Aportaciones sin cubrir', nR ? an.faltan.map((k) => H.ROLES[k].n).join(', ') || 'Ninguna' : 'Sin valorar'], ['Diferencias de estilo a pactar', String(an.tensiones.length)]] } });
  };

  R.informeOrg = () => {
    const In = I(); In.reset(); const s = R.resumen(), ps = R.state.personas, pus = R.state.puestos, emp = R.empresa().nombre;
    if (!ps.length) { In.open({ titulo: 'Diagnóstico de personas y estructura', html: cover({ kicker: 'Diagnóstico de personas y estructura', titulo: 'Personas y estructura' }) + In.summary('Alcance', '<p>La empresa no ha aportado la relación de personas y puestos. El diagnóstico de personas y estructura queda fuera del alcance de este documento.</p>') + In.foot(pie), after: (paper) => R.notaTrabajo(paper, 'Dé de alta la plantilla y los puestos para elaborar este diagnóstico.') }); return; }
    let h = cover({ kicker: 'Diagnóstico de personas y estructura', titulo: 'Personas y estructura', subtitulo: `${pl(s.n, 'persona', 'personas')} · ${pl(pus.length, 'puesto', 'puestos')} · ${pl(R.state.equipos.length, 'equipo', 'equipos')}` });
    const est = s.est, crit = pus.filter((x) => x.critico), critSin = crit.filter((x) => !est.ocupantes(x.id).length || !x.sucesor || !R.persona(x.sucesor));
    const unaP = Object.keys(est.areas).filter((a) => est.areas[a].length === 1 && ps.length > 3), warns = est.avisos.filter((a) => a.st === 'warn');
    const encs = ps.map((p) => ({ p, e: R.encaje(p, R.puestoDe(p)) })).filter((x) => x.e && x.e.total != null), bajos = encs.filter((x) => x.e.st === 'stop'), altos = encs.filter((x) => x.e.st === 'ok');
    const top = s.todo.media ? F4.slice().sort((a, b) => s.todo.dist[b] - s.todo.dist[a])[0] : null;
    const porMando = est.mandos.length ? Math.round((est.mandos.reduce((a, m) => a + m.n, 0) / est.mandos.length) * 10) / 10 : null;
    const lead = critSin.length ? `La principal vulnerabilidad de ${esc(emp)} en personas es la continuidad: <b>${critSin.length} de sus ${pl(crit.length, 'puesto crítico', 'puestos críticos')}</b> no ${critSin.length === 1 ? 'tiene' : 'tienen'} relevo designado o titular.`
      : bajos.length ? `<b>${pl(bajos.length, 'persona presenta', 'personas presentan')} un encaje bajo</b> con su puesto en ${esc(emp)}; el encaje medio de la plantilla valorada es del ${s.encMedio} %.`
        : s.encMedio != null ? `La plantilla de ${esc(emp)} encaja con sus puestos al <b>${s.encMedio} %</b> de media, sin riesgos graves de continuidad en su estructura.`
          : `${esc(emp)} cuenta con ${pl(s.n, 'persona', 'personas')} en ${pl(pus.length, 'puesto', 'puestos')}, organizadas en ${pl(est.niveles, 'nivel', 'niveles')}.`;
    h += In.summary('Resumen ejecutivo', `<p>${lead}</p>` + claves([
      `Estructura: ${pl(s.n, 'persona', 'personas')}, ${pl(est.niveles, 'nivel jerárquico', 'niveles jerárquicos')} y ${pl(est.mandos.length, 'mando', 'mandos')}${porMando != null ? `, con ${String(porMando).replace('.', ',')} personas por mando de media` : ''}.`,
      s.encMedio != null ? `Encaje medio persona-puesto: <b>${s.encMedio} %</b> sobre ${pl(s.enc, 'persona valorada', 'personas valoradas')}; ${altos.length} con encaje alto y ${bajos.length} con encaje bajo.` : '',
      crit.length ? `Continuidad: ${critSin.length} de ${pl(crit.length, 'puesto crítico', 'puestos críticos')} sin relevo designado o sin titular.` : '',
      unaP.length ? `${pl(unaP.length, 'área depende', 'áreas dependen')} de una sola persona: ${unaP.map(esc).join(', ')}.` : '',
      s.roles ? (s.todo.faltan.length ? `Nadie en la plantilla aporta de forma natural: ${s.todo.faltan.map((k) => esc(H.ROLES[k].n.toLowerCase())).join(', ')}.` : 'Las 9 aportaciones al trabajo en equipo están cubiertas en la plantilla.') : '',
      top ? `Estilo de comportamiento predominante: ${esc(H.DISC[top].n.toLowerCase())} (${s.todo.dist[top]} de ${pl(s.disc, 'persona valorada', 'personas valoradas')}).` : ''
    ]), critSin.length ? 'stop' : warns.length || bajos.length ? 'warn' : 'ok');
    h += In.kpis([{ k: 'Personas', v: s.n }, { k: 'Niveles', v: String(est.niveles) }, { k: 'Encaje medio', v: pct(s.encMedio), st: s.encMedio == null ? null : s.encMedio >= 75 ? 'ok' : s.encMedio >= 55 ? 'warn' : 'stop' }, { k: 'Puestos críticos sin relevo', v: `${critSin.length} de ${crit.length}`, st: critSin.length ? 'stop' : crit.length ? 'ok' : null }, { k: 'Riesgos de estructura', v: String(est.avisos.filter((a) => a.st !== 'info').length), st: critSin.length ? 'stop' : warns.length ? 'warn' : 'ok' }]);
    h += In.section('Plantilla y perfiles', In.table(['Persona', 'Puesto', 'Depende de', 'Estilo de comportamiento', 'Aportaciones naturales', 'Encaje'], ps.map((p) => { const e = R.encaje(p, R.puestoDe(p)); return [p.nombre, (R.puestoDe(p) || {}).nombre || '—', p.responsable ? R.nombre(p.responsable) : '—', p.disc ? R.discEstilo(p.disc).nombre : '—', p.roles && p.roles.scores ? R.rolesOrden(p.roles.scores).slice(0, 2).map((k) => H.ROLES[k].n).join(', ') : '—', e && e.total != null ? { h: In.pill(e.st, e.total + ' %') } : '—']; })));
    if (top) h += In.section(`Mapa de estilos: predomina la ${H.DISC[top].n.toLowerCase()}`, `<div class="rp-block">${R.rueda(ps, { numeros: true })}${R.ruedaLeyenda(ps)}</div>` + In.table(['Estilo', 'Personas con ese estilo principal', 'Media del factor (0-100)'], F4.map((k) => [H.DISC[k].n, String(s.todo.dist[k]), String(s.todo.media[k])]), { num: [1, 2] }), 'Cada punto es una persona, numerada y con el color de su estilo principal.');
    const dif = encs.filter((x) => x.e.brechas.length).sort((a, b) => a.e.total - b.e.total);
    if (dif.length) h += In.section(`Encaje persona-puesto: ${pl(dif.length, 'persona con diferencias relevantes', 'personas con diferencias relevantes')}`, In.table(['Persona', 'Puesto', 'Encaje', 'Principal diferencia'], dif.map((x) => [x.p.nombre, R.puestoDe(x.p).nombre, { h: In.pill(x.e.st, x.e.total + ' %') }, x.e.brechas[0].txt])));
    if (est.avisos.length) h += In.section(critSin.length ? `Estructura y relevos: ${pl(critSin.length, 'puesto crítico', 'puestos críticos')} sin cobertura asegurada` : 'Estructura y relevos', In.table(['Gravedad', 'Hallazgo'], est.avisos.map((a) => [{ h: In.pill(a.st === 'info' ? 'warn' : a.st, a.st === 'stop' ? 'Grave' : a.st === 'warn' ? 'A revisar' : 'A observar') }, a.t])));
    if (s.evaluados) { const filas = Object.keys(R.CAJAS).map((k) => ({ k, quien: ps.filter((p) => R.caja(p) === k) })).filter((x) => x.quien.length); h += In.section(`Mapa de talento: ${pl(s.evaluados, 'persona valorada', 'personas valoradas')}`, In.table(['Situación', 'Personas', 'Acción recomendada'], filas.map((x) => [R.CAJAS[x.k].n, x.quien.map((p) => p.nombre).join(', '), R.CAJAS[x.k].a]))); }
    if (R.state.equipos.length) h += In.section('Equipos', In.table(['Equipo', 'Personas', 'Aportaciones sin cubrir', 'Diferencias de estilo', 'Perfil que lo equilibraría'], R.state.equipos.map((q) => { const a = R.analizarEquipo(q.miembros); return [q.nombre, String(a.miembros.length), a.conRoles.length ? a.faltan.map((k) => H.ROLES[k].n).join(', ') || 'Ninguna' : '—', a.conDisc.length ? String(a.tensiones.length) : '—', a.contratar ? [a.contratar.rol && H.ROLES[a.contratar.rol].n, a.contratar.estilo && H.DISC[a.contratar.estilo].n].filter(Boolean).join(' · ') : '—']; }), { num: [1, 3] }));
    const ri = critSin.map((x) => { const oc = est.ocupantes(x.id)[0]; return [oc ? `El puesto crítico «${x.nombre}» no tiene relevo designado.` : `El puesto crítico «${x.nombre}» está sin cubrir.`, oc ? `Si ${oc.nombre} falta, la función queda sin cobertura.` : 'La función no tiene titular.']; })
      .concat(warns.map((a) => [a.t, /una sola persona/.test(a.t) ? 'Una ausencia detiene el área.' : 'Resta agilidad a la organización.']))
      .concat(bajos.length ? [[`${pl(bajos.length, 'persona', 'personas')} con encaje bajo: ${bajos.map((x) => x.p.nombre).join(', ')}.`, 'Riesgo de menor rendimiento y de desgaste si no se ajusta el puesto o se entrena la diferencia.']] : [])
      .concat(s.roles && s.todo.faltan.length ? [[`Nadie aporta de forma natural: ${s.todo.faltan.map((k) => H.ROLES[k].n.toLowerCase()).join(', ')}.`, H.ROLES[s.todo.faltan[0]].falta]] : []);
    const cantera = ps.filter((p) => ['3-3', '3-2', '2-3'].includes(R.caja(p)));
    const op = (altos.length ? [[`${altos.length} de ${pl(encs.length, 'persona valorada', 'personas valoradas')} con encaje alto (75 % o más).`, 'Base estable sobre la que apoyar los cambios.']] : [])
      .concat(cantera.length ? [[`Personas con recorrido: ${cantera.map((p) => p.nombre).join(', ')}.`, 'Cantera para relevos y puestos de más responsabilidad.']] : []);
    if (ri.length || op.length) h += In.section('Riesgos y oportunidades', ryo(ri, op));
    const sinH = s.n - s.disc, sinPerfil = pus.filter((q) => !q.disc && !(q.roles && q.roles.length)), rc = [];
    if (critSin.length) rc.push({ q: `Asegurar el relevo de ${pl(critSin.length, 'puesto crítico', 'puestos críticos')}: ${critSin.map((x) => x.nombre).join(', ')}`, c: 'Elegir a la persona, acordar un plan de traspaso y revisar su avance cada trimestre.', imp: `Puestos críticos sin cobertura asegurada: de ${critSin.length} a 0`, quien: 'Dirección', plazo: '6 meses' });
    if (bajos.length) rc.push({ q: 'Revisar el encaje de ' + bajos.map((x) => x.p.nombre).join(', '), c: 'Conversación individual: ajustar el puesto, entrenar la diferencia o valorar otro puesto.', imp: 'Plan acordado con cada persona; encaje por encima del 55 %', quien: 'Responsable directo', plazo: '3 meses' });
    if (unaP.length) rc.push({ q: 'Reducir la dependencia de una sola persona en ' + unaP.join(', '), c: 'Documentar las tareas clave y formar a una segunda persona.', imp: 'Cada área con al menos dos personas capaces de sostenerla', quien: 'Dirección', plazo: '6 meses' });
    if (s.roles && s.todo.faltan.length) rc.push({ q: 'Cubrir las aportaciones que nadie tiene: ' + s.todo.faltan.map((k) => H.ROLES[k].n.toLowerCase()).join(', '), c: 'Asignarlas a quien más cerca esté de cubrirlas o tenerlas en cuenta en la próxima incorporación.', imp: 'Las 9 aportaciones cubiertas en la plantilla', quien: 'Dirección', plazo: '6 meses' });
    if (sinH) rc.push({ q: `Extender la valoración de comportamiento a ${pl(sinH, 'la persona restante', 'las ' + sinH + ' personas restantes').replace(/^\d+ /, '')}`, c: 'Cuestionarios breves, con el consentimiento de cada persona.', imp: `Cobertura del diagnóstico: del ${Math.round((s.disc / s.n) * 100)} % al 100 % de la plantilla`, quien: 'Recursos humanos o dirección', plazo: '1 mes' });
    if (sinPerfil.length) rc.push({ q: `Definir lo que ${pl(sinPerfil.length, 'requiere el puesto', 'requieren los ' + sinPerfil.length + ' puestos').replace(/^\d+ /, '')} sin perfil`, c: sinPerfil.slice(0, 6).map((q) => q.nombre).join(', ') + (sinPerfil.length > 6 ? '…' : '') + '.', imp: 'Encaje valorable en todos los puestos', quien: 'Dirección', plazo: '2 meses' });
    rc.push({ q: 'Conversaciones de desarrollo con cada persona', c: 'Treinta minutos con su perfil y una prioridad de entrenamiento.', imp: 'Cada persona con una prioridad de desarrollo acordada', quien: 'Cada responsable', plazo: '3 meses' }, { q: 'Revisión trimestral de personas y estructura', c: 'Actualizar este diagnóstico y comparar.', imp: 'Menos riesgos abiertos que en este diagnóstico', quien: 'Dirección', plazo: 'Cada trimestre' });
    h += In.section('Recomendaciones', recos(rc), 'Por orden de prioridad.');
    h += In.foot(pie);
    const lim = [];
    if (sinH) lim.push(s.disc ? `La valoración del estilo de comportamiento cubre a ${s.disc} de ${s.n} personas (${Math.round((s.disc / s.n) * 100)} %); las conclusiones sobre estilos y encaje se refieren a ese grupo.` : 'No se ha dispuesto de la valoración del estilo de comportamiento de la plantilla; el documento se limita a la estructura.');
    if (s.roles < s.n && s.roles) lim.push(`La valoración de aportaciones al equipo cubre a ${s.roles} de ${s.n} personas.`);
    if (sinPerfil.length) lim.push(`${pl(sinPerfil.length, 'puesto no tiene', 'puestos no tienen')} definido lo que requiere; el encaje de sus ocupantes no se valora.`);
    if (!s.evaluados) lim.push('No se ha dispuesto de valoración de desempeño y potencial; el documento no incluye mapa de talento.');
    lim.push('El análisis no incluye retribución, absentismo ni rotación.', LIM_BASE);
    R.abrirInforme({ titulo: 'Diagnóstico de personas y estructura', html: h, clave: 'org', nota: sinH || sinPerfil.length ? `Para completar el diagnóstico: ${[sinH && pl(sinH, 'persona sin cuestionario de comportamiento', 'personas sin cuestionario de comportamiento'), sinPerfil.length && pl(sinPerfil.length, 'puesto sin perfil', 'puestos sin perfil')].filter(Boolean).join(' y ')}.` : '',
      anexo: anexo([s.disc && MET.disc, s.roles && MET.roles, s.enc && MET.encaje, s.evaluados && MET.talento, ['Estructura', 'Niveles, mandos y dependencias según el organigrama. Un puesto es crítico cuando la dirección lo ha señalado como tal.'], MET.fuentes].filter(Boolean), lim),
      ctx: { titulo: 'Personas y estructura', tipo: 'Diagnóstico de personas', pasos: pasosDe(rc), seguimiento: SEG_PERSONA,
        datos: [['Personas', String(s.n)], ['Con estilo de comportamiento valorado', s.disc + ' de ' + s.n], ['Encaje medio', pct(s.encMedio)], ['Niveles', String(est.niveles)], ['Puestos críticos sin relevo', critSin.length + ' de ' + crit.length], ['Equipos', String(R.state.equipos.length)]] } });
  };
})();
