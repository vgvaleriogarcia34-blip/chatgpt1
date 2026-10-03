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
  const confirmar = (btn, fn) => { if (btn.dataset.ok) return fn(); btn.dataset.ok = '1'; const t = btn.textContent; btn.textContent = '¿Seguro? Toca otra vez'; btn.classList.add('del-btn'); setTimeout(() => { if (btn.isConnected) { delete btn.dataset.ok; btn.textContent = t; btn.classList.remove('del-btn'); } }, 3500); };

  /* Bloqueo amable: sin consentimiento no se pasan cuestionarios */
  const pideConsent = (p) => `<div class="alert warn stack"><span>Antes de pasar un cuestionario a <b>${esc(p.nombre)}</b>, explícale para qué es y pide su consentimiento. Puede ver sus resultados y pedir que se borren. Si se indica su fecha de nacimiento, se usa para una lectura complementaria de su perfil. También puedes enviárselo por enlace: lo responde desde su móvil y da su consentimiento al abrirlo.</span><div class="row"><button class="btn solid small" id="peCons">Tengo su consentimiento</button></div></div>`;
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
    const ident = R.identidad ? ps.filter((p) => R.identidad(p)).length : 0;
    const ls = R.lideres ? R.lideres() : [], filas = ls.flatMap((p) => R.mapaMando(p)), desj = filas.filter((f) => f.des && f.des.st !== 'ok').length;
    const graves = s.est.avisos.filter((a) => a.st === 'stop').length, revisar = s.est.avisos.filter((a) => a.st === 'warn').length;
    const luces = n ? [
      { n: 'Consentimiento', v: `${s.consent}/${n}`, st: stP(parte(s.consent)), go: 'personas' },
      { n: 'DISC', v: `${s.disc}/${n}`, st: stP(parte(s.disc)), go: 'disc' },
      { n: 'Aportaciones al equipo', v: `${s.roles}/${n}`, st: stP(parte(s.roles)), go: 'roles' },
      { n: 'Eneagrama', v: `${s.enea}/${n}`, st: stP(parte(s.enea)), go: 'eneagrama' },
      { n: 'Perfil de identidad', v: `${ident}/${n}`, st: stP(parte(ident)), go: 'identidad' },
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
    const con = luces.filter((l) => l.st), nota = con.length ? Math.round(con.reduce((a, l) => a + (l.st === 'ok' ? 100 : l.st === 'warn' ? 55 : 15), 0) / con.length) : null;
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
      acciones: n ? [{ t: 'Enviar cuestionarios', cls: 'solid', fn: () => R.show('envios') }, { t: 'Ver el mapa', fn: () => A.rutaPer && A.rutaPer.openMap() }, { t: 'Informe de la organización', cls: 'ghost', fn: () => R.informeOrg() }]
        : [{ t: 'Empezar por la plantilla', cls: 'solid', fn: () => R.show('personas') }, { t: 'Definir puestos', fn: () => R.show('puestos') }, { t: 'Ver el mapa', cls: 'ghost', fn: () => A.rutaPer && A.rutaPer.openMap() }],
      veredicto: { kicker: 'Salud del equipo humano', st: stN,
        titulo: !n ? 'Sin plantilla todavía' : nota + '/100 · ' + (nota >= 70 ? 'equipo en orden' : nota >= 50 ? 'con puntos que trabajar' : 'con alertas que atender'),
        texto: n ? 'Cada franja es un aspecto del equipo: herramientas completadas, encaje, estructura, talento, equipos y liderazgo. Tócala para ir a su herramienta.' : 'Da de alta a las personas y aquí aparecerá el estado de cada aspecto del equipo, con su semáforo.',
        luces: luces.map((l) => ({ n: l.n, v: l.v, st: l.st, fn: () => R.show(l.go) })),
        enlace: n ? { t: 'Por dónde empezar', fn: () => { const x = document.querySelector('.pe-prior'); if (x) x.scrollIntoView({ behavior: 'smooth', block: 'center' }); } } : null },
      kpis: n ? [
        { k: 'Estilos', v: `${s.disc}/${n}`, d: 'personas con DISC', st: stP(parte(s.disc)), barras: ['D', 'I', 'S', 'C'].map((k) => ({ n: H.DISC[k].n, v: s.todo.dist[k] || 0.3, c: H.DISC[k].c })), fn: () => R.show('disc') },
        { k: 'Cuestionarios', v: String(s.disc + s.roles + s.enea), d: `de ${n * 3} posibles`, st: stP(Math.round(((s.disc + s.roles + s.enea) / (n * 3)) * 100)), barras: [{ n: 'DISC', v: s.disc + 0.3 }, { n: 'Aportaciones', v: s.roles + 0.3 }, { n: 'Eneagrama', v: s.enea + 0.3 }, { n: 'Identidad', v: ident + 0.3 }], fn: () => R.show('envios') },
        { k: 'Encaje medio', v: s.encMedio == null ? '—' : s.encMedio + ' %', d: `${s.enc} con puesto y perfil`, st: s.encMedio == null ? null : s.encMedio >= 75 ? 'ok' : s.encMedio >= 55 ? 'warn' : 'stop', barras: encs.length ? encs.map((x) => ({ n: x.p.nombre, v: x.e.total, c: C3[x.e.st] })) : null, fn: () => R.show('encaje') },
        { k: 'Estructura', v: `${s.est.niveles} nivel${s.est.niveles === 1 ? '' : 'es'}`, d: `${s.est.mandos.length} mandos · ${graves} alertas graves`, st: graves ? 'stop' : revisar ? 'warn' : 'ok', barras: s.est.mandos.map((m) => ({ n: m.p.nombre, v: m.n, c: m.n > 8 ? C3.warn : null })), fn: () => R.show('organigrama') },
        { k: 'Liderazgo', v: `${filas.filter((f) => f.nv).length} tareas`, d: `${desj} desajuste${desj === 1 ? '' : 's'}`, st: filas.some((f) => f.nv) ? (desj ? 'warn' : 'ok') : null, barras: LN ? [1, 2, 3, 4].map((k) => ({ n: LN.NIVELES[k].n, v: niveles[k] + 0.3, c: LN.NIVELES[k].c })) : null, fn: () => R.show('lid-mapa') }
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
        conHero(host, `<div class="glass pad stack"><div class="eyebrow">Cómo empezar</div><h2>Analiza perfiles, encaja personas y puestos y <em>ordena la estructura</em></h2>
          <p>Este mundo trabaja con <b>DISC</b> (estilo de comportamiento), <b>aportaciones al equipo</b> (modelo propio de nueve aportaciones), <b>eneagrama</b> (motivación) y el <b>perfil de identidad</b>. Con ellas: perfiles de puesto, encaje persona-puesto, análisis de equipos, auditoría de la estructura, mapa de talento y <b>tablillas de entrenamiento</b> que se proponen solas.</p>
          <p class="small muted">No es control horario, ni nóminas, ni seguimiento del día a día: es análisis, auditoría y estructura.</p>
          <ol class="pe-pasos"><li><b>Plantilla:</b> da de alta a las personas (o tráelas del organigrama del sistema estratégico).</li><li><b>Puestos:</b> define cada puesto con su perfil (hay plantillas).</li><li><b>Herramientas:</b> cada persona responde sus cuestionarios (5–10 minutos cada uno).</li><li><b>Lectura:</b> encaje, equipos, estructura, talento y tablillas.</li></ol>
          <div class="row"><button class="btn solid" data-go="personas">Empezar por la plantilla</button><button class="btn" data-go="puestos">Definir puestos</button></div></div>${R.aviso()}`);
        return;
      }
      const prior = [];
      if (s.disc < s.n) prior.push({ st: 'info', t: `Faltan ${s.n - s.disc} DISC por completar: sin estilo no hay encaje ni análisis de equipo completo.`, go: 'disc' });
      if (s.criticosSinSucesor) prior.push({ st: 'stop', t: `${s.criticosSinSucesor} puesto${s.criticosSinSucesor > 1 ? 's' : ''} crítico${s.criticosSinSucesor > 1 ? 's' : ''} sin sucesor o sin cubrir.`, go: 'organigrama' });
      if (s.encBajo) prior.push({ st: 'warn', t: `${s.encBajo} persona${s.encBajo > 1 ? 's' : ''} con encaje bajo en su puesto.`, go: 'encaje' });
      if (s.todo.faltan.length) prior.push({ st: 'warn', t: `En el conjunto de la empresa nadie cubre: ${s.todo.faltan.map((k) => H.ROLES[k].n.toLowerCase()).join(', ')}.`, go: 'equipos' });
      s.est.avisos.filter((a) => a.st === 'warn').slice(0, 3).forEach((a) => prior.push({ st: 'warn', t: a.t, go: 'organigrama' }));
      if (!R.state.puestos.length) prior.push({ st: 'info', t: 'Aún no hay puestos definidos: defínelos para medir el encaje.', go: 'puestos' });
      if (!s.evaluados) prior.push({ st: 'info', t: 'Sin valoración de desempeño y potencial: el mapa de talento está vacío.', go: 'talento' });
      conHero(host, `
      <div class="grid pe-two">
        <div class="glass pad stack"><div class="eyebrow">Mapa de estilos</div>${s.disc ? R.rueda(R.state.personas) + '<p class="small muted">Cada punto es una persona; tócalo para ver su ficha. Arriba, los estilos rápidos y orientados a la acción; abajo, los reflexivos y constantes. A la izquierda, orientados a la tarea; a la derecha, a las personas.</p>' : '<p class="muted">Cuando las personas completen su DISC aparecerán aquí.</p>'}</div>
        <div class="glass pad stack"><div class="eyebrow">Por dónde empezar</div>${prior.length ? `<div class="pe-prior">${prior.slice(0, 7).map((a) => `<button class="pe-pr st-${a.st}" data-go="${a.go}"><span>${esc(a.t)}</span><i>›</i></button>`).join('')}</div>` : '<div class="alert info">Todo en orden con los datos actuales. Revisa las tablillas de entrenamiento propuestas.</div>'}
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
      host.innerHTML = `<div class="glass pad stack"><div class="row pe-add"><input class="input" id="peNom" placeholder="Nombre y apellidos" autocomplete="off"><select class="input" id="pePu">${optPuesto('')}</select><button class="btn solid" id="peAdd">Añadir persona</button><span class="spacer"></span><button class="btn ghost" id="peImp">Traer del organigrama estratégico</button></div>
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
        R.save(); R.rerender(); const m2 = $('#peMsg'); if (m2) m2.textContent = `Traídas ${np} persona${np === 1 ? '' : 's'} y ${nq} puesto${nq === 1 ? '' : 's'} del organigrama. Los puestos se crean sin perfil: complétalos en «Puestos».`;
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
        html += `<div class="glass pad stack"><div class="eyebrow">Resultados de un test DISC externo</div><p class="small muted" style="margin:0">Si la persona ya hizo un DISC con otro proveedor, introduce sus cuatro valores de 0 a 100.</p><div class="pe-man">${['D', 'I', 'S', 'C'].map((k) => `<label class="small">${k} · ${H.DISC[k].n}<input class="input" type="number" min="0" max="100" data-f="${k}" value="${d[k]}"></label>`).join('')}</div><div class="row"><button class="btn solid" id="peManOk">Guardar</button><button class="btn ghost" id="peManNo">Cancelar</button></div></div>`;
        host.innerHTML = intro + html; wirePersona(host);
        $('#peManNo', host).onclick = () => { delete borradores['discModo:' + p.id]; R.rerender(); };
        $('#peManOk', host).onclick = () => { const o = {}; $$('[data-f]', host).forEach((i) => (o[i.dataset.f] = Math.max(0, Math.min(100, Math.round(+i.value || 0))))); p.disc = Object.assign(o, { fecha: R.hoy(), origen: 'externo' }); delete borradores['discModo:' + p.id]; R.save(); R.rerender(); };
        return;
      }
      if (!p.disc || modo === 'repetir') {
        const resp = borradores['disc:' + p.id] = borradores['disc:' + p.id] || H.DISC_BLOQUES.map(() => ({}));
        const hechos = resp.filter((r) => r.mas && r.menos).length;
        html += `<div class="glass pad stack"><div class="eyebrow">Cuestionario DISC · ${H.DISC_BLOQUES.length} bloques</div><p class="small" style="margin:0">En cada bloque, marca la palabra que <b>más</b> se parece a ${esc(p.nombre.split(' ')[0])} en el trabajo y la que <b>menos</b>. Responde por lo que hace normalmente, no por lo que le gustaría. Mejor si responde la propia persona.</p>
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
      const svg = `<svg class="pe-enea" viewBox="0 0 300 300" role="img" aria-label="Eneagrama: tipo ${p.enea.tipo}"><circle cx="150" cy="150" r="118" fill="none" stroke="rgba(201, 242, 77, 0.3)"/>
        <polygon points="${[9, 3, 6].map((t) => pt(t, 118).join(',')).join(' ')}" fill="none" stroke="rgba(201, 242, 77, 0.18)"/><polyline points="${[1, 4, 2, 8, 5, 7, 1].map((t) => pt(t, 118).join(',')).join(' ')}" fill="none" stroke="rgba(201, 242, 77, 0.18)"/>
        <polygon points="${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((t) => pt(t, 30 + (s[t] / 100) * 88).join(',')).join(' ')}" fill="rgba(171,123,255,0.22)" stroke="#ab7bff"/>
        ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((t) => { const [x, y] = pt(t, 136); return `<text x="${x}" y="${y + 4}" text-anchor="middle" class="pe-et ${t === p.enea.tipo ? 'on' : t === p.enea.ala ? 'ala' : ''}">${t}</text>`; }).join('')}</svg>`;
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
      host.innerHTML = `<div class="glass pad stack"><p style="margin:0">Cada puesto tiene un <b>perfil ideal</b>: el comportamiento DISC que pide y las aportaciones clave al equipo. Así se mide el encaje de quien lo ocupa y se detecta qué entrenar. Marca como <b>crítico</b> el puesto cuya ausencia pararía la empresa.</p>
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
        ${sel ? `<div class="grid pe-two"><div class="glass pad stack"><div class="eyebrow">${esc(sel.p.nombre)} en ${esc(sel.q.nombre)}</div>${sel.p.disc ? R.discBars(sel.p.disc, sel.q.disc) + '<p class="small muted" style="margin:0">Columnas: la persona. Raya blanca: lo que pide el puesto.</p>' : '<p class="muted">Sin DISC: complétalo para medir el comportamiento.</p>'}
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
      if (!ps.length) { host.innerHTML = R.vacia('Da de alta la plantilla e indica de quién depende cada persona.', 'Ir a la plantilla'); return; }
      const E = R.estructura();
      const nodo = (p, d) => { const q = R.puestoDe(p), h = E.hijos(p.id), e = p.disc && R.discEstilo(p.disc); return `<li><div class="pe-node" data-pid="${p.id}" tabindex="0" role="button">${e ? `<i style="background:${H.DISC[e.pri].c}" title="${esc(e.nombre)}"></i>` : '<i></i>'}<b>${esc(p.nombre)}</b><small>${esc(q ? q.nombre : 'sin puesto')}${q && q.critico ? ' · crítico' : ''}${h.length ? ` · ${h.length} a cargo` : ''}</small></div>${h.length && d < 12 ? `<ul>${h.map((x) => nodo(x, d + 1)).join('')}</ul>` : ''}</li>`; };
      const amp = E.mandos.length ? (E.mandos.reduce((a, m) => a + m.n, 0) / E.mandos.length).toFixed(1).replace('.', ',') : '—';
      const crit = R.state.puestos.filter((x) => x.critico);
      host.innerHTML = `${kpis([{ k: 'Personas', v: ps.length }, { k: 'Niveles', v: E.niveles, st: E.niveles > 4 && ps.length < 50 ? 'warn' : 'ok' }, { k: 'Mandos', v: E.mandos.length }, { k: 'Amplitud media', v: amp, d: 'personas por mando' }, { k: 'Puestos críticos', v: crit.length, d: `${crit.filter((x) => x.sucesor && R.persona(x.sucesor)).length} con sucesor`, st: crit.some((x) => !x.sucesor) ? 'stop' : crit.length ? 'ok' : null }])}
        <div class="grid pe-two"><div class="glass pad stack"><div class="eyebrow">Árbol de dependencias</div><ul class="pe-tree">${E.raices.map((p) => nodo(p, 0)).join('')}</ul><p class="small muted" style="margin:0">El color es el estilo DISC. Las dependencias se cambian en la plantilla. Toca una persona para ver su ficha.</p></div>
        <div class="glass pad stack"><div class="eyebrow">Auditoría de la estructura</div>${R.avisos(E.avisos)}
          ${crit.length ? `<div class="eyebrow">Relevo de puestos críticos</div><div class="table-wrap"><table class="pe-table"><thead><tr><th style="text-align:left">Puesto</th><th style="text-align:left">Ocupa</th><th style="text-align:left">Sucesor</th><th>Encaje del sucesor</th></tr></thead><tbody>${crit.map((x) => { const occ = E.ocupantes(x.id), su = R.persona(x.sucesor), en = su ? R.encaje(su, x) : null; return `<tr><td>${esc(x.nombre)}</td><td>${esc(occ.map((p) => p.nombre).join(', ') || '—')}</td><td><select class="input" data-suc="${x.id}"><option value="">— nadie —</option>${ps.filter((p) => p.puestoId !== x.id).map((p) => `<option value="${p.id}" ${p.id === x.sucesor ? 'selected' : ''}>${esc(p.nombre)}</option>`).join('')}</select></td><td class="num">${en && en.total != null ? R.pill(en.st, en.total + ' %') : '—'}</td></tr>`; }).join('')}</tbody></table></div>` : '<p class="small muted">Marca en «Puestos» los puestos críticos para revisar su relevo.</p>'}</div></div>`;
      $$('[data-suc]', host).forEach((s) => (s.onchange = () => { R.puesto(s.dataset.suc).sucesor = s.value; R.save(); R.rerender(); }));
      $$('.pe-node', host).forEach((n) => { n.onclick = () => R.fichaPersona(n.dataset.pid); n.onkeydown = (e) => { if (e.key === 'Enter') R.fichaPersona(n.dataset.pid); }; });
    }
  });

  R.register({
    id: 'talento', grupo: 'Estructura', nombre: 'Mapa de talento', pregunta: '¿Dónde está el talento que sostiene la empresa y el que la hará crecer?',
    informe: () => R.informeOrg(), informeTxt: 'Informe de la organización',
    render(host) {
      const ps = R.state.personas;
      if (!ps.length) { host.innerHTML = R.vacia('Da de alta la plantilla para construir el mapa de talento.', 'Ir a la plantilla'); return; }
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
      if (!ps.length) { host.innerHTML = R.vacia('Da de alta la plantilla para analizar equipos.', 'Ir a la plantilla'); return; }
      if (eqSel !== 'todos' && !R.equipo(eqSel)) eqSel = 'todos';
      const q = R.equipo(eqSel), ids = q ? q.miembros : ps.map((p) => p.id), an = R.analizarEquipo(ids);
      const col = { ok: 'var(--go)', warn: 'var(--warn)', stop: 'var(--stop)', sin: 'var(--faint)' };
      host.innerHTML = `<div class="glass pad row pe-eqbar"><button class="chip" aria-pressed="${eqSel === 'todos'}" data-eq="todos">Toda la empresa</button>${eqs.map((x) => `<button class="chip" aria-pressed="${x.id === eqSel}" data-eq="${x.id}">${esc(x.nombre)} <small>${x.miembros.length}</small></button>`).join('')}<span class="spacer"></span><button class="btn solid small" id="peEqNew">Nuevo equipo</button></div>
        ${q ? `<div class="glass pad stack"><div class="pe-qgrid"><label class="small">Nombre del equipo<input class="input" id="peEqN" value="${esc(q.nombre)}"></label><label class="small">Objetivo común<input class="input" id="peEqO" value="${esc(q.objetivo || '')}" placeholder="Para qué existe este equipo"></label></div>
          <div class="small muted">Miembros (toca para añadir o quitar):</div><div class="row pe-rchips">${ps.map((p) => `<button class="chip" aria-pressed="${q.miembros.includes(p.id)}" data-m="${p.id}">${esc(p.nombre)}</button>`).join('')}</div><div class="row"><button class="btn ghost small" id="peEqDel">Borrar equipo</button></div></div>` : ''}
        ${an.miembros.length ? `<div class="grid pe-two"><div class="glass pad stack"><div class="eyebrow">Estilos del equipo</div>${an.conDisc.length ? R.rueda(an.miembros) + `<div class="pe-dist">${['D', 'I', 'S', 'C'].map((k) => `<span><i style="background:${H.DISC[k].c}"></i>${H.DISC[k].n}: <b>${an.dist[k]}</b></span>`).join('')}</div>` : '<p class="muted small">Nadie tiene aún DISC.</p>'}
            ${an.conEnea.length ? `<div class="eyebrow">Centros del eneagrama</div><div class="pe-dist">${Object.keys(an.centros).map((c) => `<span>${c}: <b>${an.centros[c]}</b></span>`).join('')}</div><p class="small muted" style="margin:0">${an.centros.Mental >= an.conEnea.length * 0.6 ? 'Equipo muy mental: mucho análisis; cuida la acción y la relación.' : an.centros.Emocional >= an.conEnea.length * 0.6 ? 'Equipo muy emocional: mucha relación e imagen; cuida los datos y la decisión.' : an.centros.Instintivo >= an.conEnea.length * 0.6 ? 'Equipo muy instintivo: mucha acción; cuida la reflexión y la escucha.' : 'Centros equilibrados.'}</p>` : ''}</div>
          <div class="glass pad stack"><div class="eyebrow">Aportaciones cubiertas</div>${an.conRoles.length ? `<div class="pe-cob">${an.cobertura.map((c) => `<div class="pe-cb"><i style="background:${col[c.nivel]}"></i><span>${esc(H.ROLES[c.k].n)}</span><small>${c.best ? `${esc(R.nombre(c.best.id))} · ${c.best.v} %` : '—'}${c.n > 1 ? ` · ${c.n} personas` : ''}</small></div>`).join('')}</div><p class="small muted" style="margin:0">Verde: alguien lo tiene como rol natural (≥ 60 %). Ámbar: se cubre a medias. Rojo: nadie lo cubre.</p>` : '<p class="muted small">Nadie ha hecho aún el mapa de aportaciones.</p>'}</div></div>
        <div class="grid pe-two"><div class="glass pad stack"><div class="eyebrow">Lectura del equipo</div>${R.avisos(an.avisos)}
            ${an.tensiones.length ? `<div class="eyebrow">Posibles fricciones</div><ul class="small">${an.tensiones.slice(0, 6).map((t) => `<li><b>${esc(R.nombre(t.a))} y ${esc(R.nombre(t.b))}</b>: ${esc(t.t.txt)} <i>${esc(t.t.clave)}</i></li>`).join('')}</ul>` : ''}
            ${an.contratar ? `<div class="eyebrow">Si incorporas a alguien</div><p class="small" style="margin:0">Busca ${an.contratar.rol ? `el rol de <b>${esc(H.ROLES[an.contratar.rol].n.toLowerCase())}</b>` : ''}${an.contratar.rol && an.contratar.estilo ? ' con ' : ''}${an.contratar.estilo ? `estilo <b>${esc(H.DISC[an.contratar.estilo].n.toLowerCase())}</b> (${esc(H.DISC[an.contratar.estilo].corto.toLowerCase())})` : ''}: es lo que menos tiene hoy el equipo.</p>` : ''}</div>
          <div class="glass pad stack"><div class="eyebrow">Tablillas para el equipo</div>${R.tablillasEquipo(an).map((x) => R.tablillaHTML(x.t, x.motivos)).join('')}</div></div>` : '<div class="alert info">Añade miembros al equipo para analizarlo.</div>'}`;
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
    informe: () => { const p = R.personaActiva(); if (p) R.informeTablillas(p); }, informeTxt: 'Imprimir sus tablillas',
    render(host) {
      const p = R.personaActiva();
      const prop = p ? R.tablillasDe(p) : [];
      const cats = { todas: 'Todas', disc: 'Estilo DISC', rol: 'Aportaciones al equipo', enea: 'Eneagrama', equipo: 'Equipo', lid: 'Liderazgo', paso: 'Paso entre niveles' };
      const cat = H.TABLILLAS.filter((t) => catFiltro === 'todas' || t.cuando[catFiltro] != null);
      host.innerHTML = `<div class="glass pad stack"><p style="margin:0">Cada <b>tablilla</b> es una ficha corta para entrenar un comportamiento concreto: objetivo, pasos, duración y la señal de que funciona. Se proponen solas según el estilo de la persona, lo que pide su puesto y lo que le falta a su equipo. Se imprimen y se trabajan en la conversación con su responsable.</p></div>
        ${p ? `${cabPersona(host, p)}<div class="glass pad stack"><div class="eyebrow">Propuestas para ${esc(p.nombre)}</div>${prop.length ? `<div class="pe-tabs">${prop.slice(0, 6).map((x) => R.tablillaHTML(x.t, x.motivos)).join('')}</div>` : `<p class="muted">Sin propuestas todavía: ${p.disc ? 'asigna su puesto o completa más herramientas.' : 'completa su DISC y asígnale un puesto.'}</p>`}</div>` : R.vacia('Da de alta la plantilla para recibir propuestas personalizadas.', 'Ir a la plantilla')}
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

  /* ================= INFORMES ================= */
  const discTabla = (d, ideal) => I().table(['Factor', 'Persona', ideal ? 'Puesto' : null].filter(Boolean), ['D', 'I', 'S', 'C'].map((k) => [`${k} · ${H.DISC[k].n}`, String(d[k]), ideal ? String(ideal[k]) : null].filter((x) => x != null)), { num: [1, 2] });
  const pie = 'Herramientas orientativas para conocerse y trabajar mejor. No son diagnósticos ni deben ser el único criterio para decisiones sobre personas. Datos tratados con el consentimiento de cada persona.';
  const cover = (o) => { const e = R.empresa(); return I().cover(Object.assign({ empresa: e.nombre, sector: e.sector, tipo: 'Personas y equipos' }, o)); };
  /* Informe con su parte de consultor (hoja de ruta, seguimiento y cuaderno interno) */
  R.abrirInforme = (o) => (A.consultorInf ? A.consultorInf.abrir(Object.assign({}, o, { ctx: Object.assign({ empresa: R.empresa().nombre, sector: R.empresa().sector }, o.ctx || {}) })) : I().open(o));
  const SEG_PERSONA = [['Semanal', 'Avance de la tablilla en curso', 'Responsable directo', 'Señal de avance de la tablilla', 'Seguir con el paso o cambiarlo'], ['Mensual (30 min)', 'Conversación de desarrollo: qué ha cambiado y qué cuesta', 'Responsable y persona', 'Señales de avance de las tablillas', 'Elegir la siguiente tablilla'], ['Trimestral', 'Repetir los cuestionarios que hagan falta y revisar el encaje', 'Consultor', 'Encaje con el puesto', 'Ajustar el plan de desarrollo']];
  R.SEG_PERSONA = SEG_PERSONA;

  R.informePersona = (p) => {
    if (!p) return; const In = I(); In.reset();
    const pu = R.puestoDe(p), enc = R.encaje(p, pu), e = p.disc && R.discEstilo(p.disc);
    let h = cover({ kicker: 'Informe de persona', titulo: p.nombre, subtitulo: (pu ? pu.nombre : 'Sin puesto asignado') + (p.area ? ' · ' + p.area : '') });
    h += In.summary('Resumen', `<p>${e ? `Estilo <b>${esc(e.nombre)}</b>: ${esc(H.DISC[e.pri].resumen)}` : 'Sin DISC.'}${p.roles && p.roles.scores ? ` Aportaciones naturales: ${R.rolesOrden(p.roles.scores).slice(0, 3).map((k) => H.ROLES[k].n.toLowerCase()).join(', ')}.` : ''}${p.enea && p.enea.tipo ? ` Eneatipo ${p.enea.tipo} (${H.ENEA[p.enea.tipo].n.toLowerCase()}).` : ''}${enc && enc.total != null ? ` Encaje con su puesto: ${enc.total} %.` : ''}</p>`, enc && enc.st);
    if (p.disc) { const D = H.DISC[e.pri]; h += In.section('Estilo de comportamiento (DISC)', discTabla(p.disc, pu && pu.disc) + In.table(['Aspecto', 'Lectura'], [['Aporta', D.aporta.join('; ')], ['Necesita', D.necesita.join('; ')], ['Cómo comunicarse', D.comunicar], ['Qué evitar', D.evitar], ['Bajo presión', D.presion], ['Entorno donde rinde', D.entorno]]), `Resultado del ${R.fechaES(p.disc.fecha)}${p.disc.origen === 'externo' ? ' (test externo)' : ''}.`); }
    if (p.roles && p.roles.scores) { const s = p.roles.scores; h += In.section('Aportaciones al equipo', In.table(['Aportación', 'Familia', 'Puntuación', 'Aporta'], R.rolesOrden(s).map((k) => [H.ROLES[k].n, H.ROLES[k].g, s[k] + ' %', H.ROLES[k].aporta]), { num: [2] }), 'Modelo propio. Las tres primeras son sus aportaciones naturales.'); }
    if (p.enea && p.enea.tipo) { const E = H.ENEA[p.enea.tipo]; h += In.section('Motivación (eneagrama)', In.table(['Aspecto', 'Lectura'], [['Tipo', `${p.enea.tipo} · ${E.n} (ala ${p.enea.ala}, centro ${E.centro.toLowerCase()})`], ['Le mueve', E.motivacion], ['Teme', E.miedo], ['Fortaleza', E.fortaleza], ['En estrés / al crecer', `Tipo ${E.estres} / tipo ${E.crece}`], ['Cómo liderarle', E.liderar], ['Riesgo', E.riesgo]])); }
    if (enc && enc.total != null) h += In.section('Encaje con el puesto', In.kpis([{ k: 'Encaje', v: enc.total + ' %', st: enc.st }, { k: 'Comportamiento', v: pct(enc.disc) }, { k: 'Aportaciones clave', v: pct(enc.roles) }]) + (enc.brechas.length ? In.table(['Brecha'], enc.brechas.map((b) => [b.txt])) : In.callout('Perfil alineado con lo que pide el puesto.', 'ok')), pu.mision ? 'Misión del puesto: ' + esc(pu.mision) : '');
    if (R.identidadInforme) h += R.identidadInforme(p);
    const tabs = R.tablillasDe(p).slice(0, 5);
    if (tabs.length) h += In.section('Plan de entrenamiento', In.table(['Tablilla', 'Objetivo', 'Duración', 'Por qué'], tabs.map((x) => [x.t.titulo, x.t.objetivo, x.t.duracion, x.motivos.join(' ')])));
    h += In.foot(pie);
    const jefe = R.persona(p.responsable);
    R.abrirInforme({ titulo: 'Informe de ' + p.nombre, html: h, clave: 'per:' + p.id, ctx: { titulo: p.nombre, tipo: 'Informe de persona', seguimiento: SEG_PERSONA,
      pasos: [{ q: 'Conversación de devolución del perfil', c: 'Treinta minutos entre ' + (jefe ? jefe.nombre : 'su responsable') + ' y ' + p.nombre + ': leer juntos el informe, contrastarlo con ejemplos y elegir la primera tablilla.', quien: jefe ? jefe.nombre : 'Responsable directo', s: 'Tablilla elegida con fecha de revisión' }]
        .concat(tabs.map((x) => ({ q: 'Tablilla: ' + x.t.titulo, c: x.t.pasos[0] + ' (' + x.t.duracion + ')', quien: p.nombre, s: x.t.senal })))
        .concat(enc && enc.brechas.length ? [{ q: 'Cerrar la brecha principal con el puesto', c: enc.brechas[0].txt, quien: jefe ? jefe.nombre : 'Responsable directo', s: 'La brecha deja de aparecer en la siguiente valoración' }] : []),
      datos: [['Puesto', pu ? pu.nombre : 'Sin puesto'], ['Estilo DISC', e ? e.nombre : '—'], ['Aportaciones naturales', p.roles && p.roles.scores ? R.rolesOrden(p.roles.scores).slice(0, 3).map((k) => H.ROLES[k].n).join(', ') : '—'], ['Eneatipo', p.enea && p.enea.tipo ? p.enea.tipo + ' · ' + H.ENEA[p.enea.tipo].n : '—'], ['Encaje', enc && enc.total != null ? enc.total + ' %' : '—'], ['Consentimiento', p.consentimiento ? 'Sí' + (p.consentFecha ? ' · ' + R.fechaES(p.consentFecha) : '') : 'No']] } });
  };

  R.informeTablillas = (p) => {
    if (!p) return; const In = I(); In.reset();
    const tabs = R.tablillasDe(p).slice(0, 6);
    let h = cover({ kicker: 'Tablillas de entrenamiento', titulo: p.nombre, subtitulo: (R.puestoDe(p) || {}).nombre || '' });
    h += tabs.length ? `<div class="pe-tabs pe-print">${tabs.map((x) => R.tablillaHTML(x.t, x.motivos)).join('')}</div>` : '<p class="rp-muted">Sin tablillas propuestas: completa su DISC y asígnale un puesto.</p>';
    h += In.foot(pie);
    In.open({ titulo: 'Tablillas de ' + p.nombre, html: h });
  };

  R.informeEquipo = (ids, nombre, objetivo) => {
    const In = I(); In.reset(); const an = R.analizarEquipo(ids);
    let h = cover({ kicker: 'Informe de equipo', titulo: nombre, subtitulo: objetivo || `${an.miembros.length} personas` });
    h += In.summary('Resumen', `<p>${an.miembros.length} personas · ${an.conDisc.length} con DISC · ${an.conRoles.length} con aportaciones.${an.faltan.length ? ` Aportaciones sin cubrir: ${an.faltan.map((k) => H.ROLES[k].n.toLowerCase()).join(', ')}.` : an.conRoles.length ? ' Todas las aportaciones tienen a alguien.' : ''}${an.tensiones.length ? ` ${an.tensiones.length} posibles fricciones entre estilos.` : ''}</p>`, an.faltan.length > 2 ? 'stop' : an.faltan.length || an.tensiones.length ? 'warn' : 'ok');
    h += In.section('Miembros', In.table(['Persona', 'Puesto', 'Estilo DISC', 'Aportaciones naturales', 'Eneatipo'], an.miembros.map((p) => [p.nombre, (R.puestoDe(p) || {}).nombre || '—', p.disc ? R.discEstilo(p.disc).nombre : '—', p.roles && p.roles.scores ? R.rolesOrden(p.roles.scores).slice(0, 2).map((k) => H.ROLES[k].n).join(', ') : '—', p.enea && p.enea.tipo ? p.enea.tipo + ' · ' + H.ENEA[p.enea.tipo].n : '—'])));
    if (an.media) h += In.section('Estilos', `<div class="rp-block">${R.rueda(an.miembros)}</div>` + In.table(['Estilo', 'Personas', 'Media del factor'], ['D', 'I', 'S', 'C'].map((k) => [H.DISC[k].n, String(an.dist[k]), String(an.media[k])]), { num: [1, 2] }));
    if (an.conRoles.length) h += In.section('Aportaciones cubiertas', In.table(['Aportación', 'Mejor del equipo', 'Puntuación', 'Estado'], an.cobertura.map((c) => [H.ROLES[c.k].n, c.best ? R.nombre(c.best.id) : '—', c.best ? c.best.v + ' %' : '—', { h: In.pill(c.nivel === 'sin' ? 'warn' : c.nivel, c.nivel === 'ok' ? 'Cubierto' : c.nivel === 'warn' ? 'A medias' : 'Sin cubrir') }]), { num: [2] }));
    h += In.section('Lectura y fricciones', (an.avisos.length ? In.table(['Aviso'], an.avisos.map((a) => [a.t])) : '') + (an.tensiones.length ? In.table(['Entre', 'Diferencia', 'Cómo pactarla'], an.tensiones.map((t) => [R.nombre(t.a) + ' y ' + R.nombre(t.b), t.t.txt, t.t.clave])) : '') + (an.contratar ? In.callout(`Próxima incorporación: ${an.contratar.rol ? 'rol de ' + esc(H.ROLES[an.contratar.rol].n.toLowerCase()) : ''}${an.contratar.rol && an.contratar.estilo ? ', ' : ''}${an.contratar.estilo ? 'estilo ' + esc(H.DISC[an.contratar.estilo].n.toLowerCase()) : ''}.`, 'info') : ''));
    const tq = R.tablillasEquipo(an);
    h += In.section('Tablillas del equipo', In.table(['Tablilla', 'Objetivo', 'Pasos', 'Por qué'], tq.map((x) => [x.t.titulo, x.t.objetivo, x.t.pasos.join(' · '), x.motivos.join(' ')])));
    h += In.foot(pie);
    R.abrirInforme({ titulo: 'Informe del equipo ' + nombre, html: h, clave: 'eq:' + nombre, ctx: { titulo: 'Equipo ' + nombre, tipo: 'Informe de equipo',
      pasos: [{ q: 'Sesión de devolución con el equipo', c: 'Sesenta minutos: cada persona comparte su estilo y cómo prefiere que le pidan las cosas; se leen las aportaciones cubiertas y las que faltan.', quien: 'Responsable del equipo', s: 'Cada persona conoce el estilo de las demás' }]
        .concat(tq.map((x) => ({ q: 'Tablilla de equipo: ' + x.t.titulo, c: x.t.pasos[0], quien: 'Responsable del equipo', s: x.t.senal })))
        .concat(an.tensiones.slice(0, 3).map((t) => ({ q: 'Pactar la diferencia entre ' + R.nombre(t.a) + ' y ' + R.nombre(t.b), c: t.t.clave, quien: 'Responsable del equipo', s: 'Acuerdo escrito y revisado al mes' })))
        .concat(an.contratar ? [{ q: 'Definir la próxima incorporación', c: [an.contratar.rol && 'Aportación de ' + H.ROLES[an.contratar.rol].n.toLowerCase(), an.contratar.estilo && 'estilo ' + H.DISC[an.contratar.estilo].n.toLowerCase()].filter(Boolean).join(', '), quien: 'Dirección', s: 'Perfil del puesto actualizado' }] : []),
      seguimiento: [['Quincenal', 'Acuerdos del equipo y fricciones', 'Responsable del equipo', 'Incidencias entre personas', 'Ajustar los acuerdos'], ['Mensual', 'Avance de las tablillas del equipo', 'Responsable y consultor', 'Señales de avance', 'Siguiente tablilla'], ['Trimestral', 'Revisión del análisis del equipo', 'Consultor', 'Aportaciones cubiertas', 'Recomposición o incorporación']],
      datos: [['Personas', String(an.miembros.length)], ['Con DISC', String(an.conDisc.length)], ['Aportaciones sin cubrir', an.faltan.map((k) => H.ROLES[k].n).join(', ') || 'Ninguna'], ['Fricciones probables', String(an.tensiones.length)]] } });
  };

  R.informeOrg = () => {
    const In = I(); In.reset(); const s = R.resumen(), ps = R.state.personas;
    if (!ps.length) { In.open({ titulo: 'Informe de la organización', html: cover({ kicker: 'Auditoría de personas', titulo: 'Personas y estructura' }) + '<p class="rp-muted">Sin personas dadas de alta.</p>' }); return; }
    let h = cover({ kicker: 'Auditoría de personas y estructura', titulo: 'Personas y estructura', subtitulo: `${s.n} personas · ${R.state.puestos.length} puestos · ${R.state.equipos.length} equipos` });
    const stops = s.est.avisos.filter((a) => a.st === 'stop').length;
    h += In.summary('Resumen ejecutivo', `<p>${s.disc} de ${s.n} personas tienen su DISC, ${s.roles} sus roles y ${s.enea} su eneagrama.${s.encMedio != null ? ` El encaje medio persona-puesto es del ${s.encMedio} % (${s.encBajo} con encaje bajo).` : ''} La estructura tiene ${s.est.niveles} niveles y ${s.est.mandos.length} mandos${stops ? `; hay ${stops} alerta${stops > 1 ? 's' : ''} grave${stops > 1 ? 's' : ''} (puestos críticos sin relevo o sin cubrir)` : ''}.${s.todo.faltan.length ? ` En el conjunto nadie cubre: ${s.todo.faltan.map((k) => H.ROLES[k].n.toLowerCase()).join(', ')}.` : ''}</p>`, stops ? 'stop' : s.est.avisos.some((a) => a.st === 'warn') || s.encBajo ? 'warn' : 'ok');
    h += In.kpis([{ k: 'Personas', v: s.n }, { k: 'DISC completados', v: `${s.disc}/${s.n}` }, { k: 'Encaje medio', v: pct(s.encMedio), st: s.encMedio == null ? null : s.encMedio >= 75 ? 'ok' : s.encMedio >= 55 ? 'warn' : 'stop' }, { k: 'Niveles', v: String(s.est.niveles) }, { k: 'Alertas de estructura', v: String(s.est.avisos.filter((a) => a.st !== 'info').length), st: stops ? 'stop' : 'ok' }]);
    h += In.section('Plantilla y perfiles', In.table(['Persona', 'Puesto', 'Depende de', 'Estilo DISC', 'Aportaciones naturales', 'Eneatipo', 'Encaje'], ps.map((p) => { const e = R.encaje(p, R.puestoDe(p)); return [p.nombre, (R.puestoDe(p) || {}).nombre || '—', p.responsable ? R.nombre(p.responsable) : '—', p.disc ? R.discEstilo(p.disc).nombre : '—', p.roles && p.roles.scores ? R.rolesOrden(p.roles.scores).slice(0, 2).map((k) => H.ROLES[k].n).join(', ') : '—', p.enea && p.enea.tipo ? String(p.enea.tipo) : '—', e && e.total != null ? { h: In.pill(e.st, e.total + ' %') } : '—']; })));
    if (s.todo.media) h += In.section('Mapa de estilos', `<div class="rp-block">${R.rueda(ps)}</div>`, 'Cada punto es una persona, con el color de su estilo principal.');
    const enc = ps.map((p) => ({ p, e: R.encaje(p, R.puestoDe(p)) })).filter((x) => x.e && x.e.total != null && x.e.brechas.length);
    if (enc.length) h += In.section('Encaje persona-puesto: brechas', In.table(['Persona', 'Puesto', 'Encaje', 'Brecha principal'], enc.sort((a, b) => a.e.total - b.e.total).map((x) => [x.p.nombre, R.puestoDe(x.p).nombre, { h: In.pill(x.e.st, x.e.total + ' %') }, x.e.brechas[0].txt])));
    h += In.section('Estructura y relevos', In.table(['Estado', 'Hallazgo'], s.est.avisos.map((a) => [{ h: In.pill(a.st === 'info' ? 'warn' : a.st, a.st === 'stop' ? 'Grave' : a.st === 'warn' ? 'Revisar' : 'Nota') }, a.t])));
    if (s.evaluados) { const filas = Object.keys(R.CAJAS).map((k) => ({ k, quien: ps.filter((p) => R.caja(p) === k) })).filter((x) => x.quien.length); h += In.section('Mapa de talento', In.table(['Casilla', 'Personas', 'Acción recomendada'], filas.map((x) => [R.CAJAS[x.k].n, x.quien.map((p) => p.nombre).join(', '), R.CAJAS[x.k].a]))); }
    if (R.state.equipos.length) h += In.section('Equipos', In.table(['Equipo', 'Miembros', 'Aportaciones sin cubrir', 'Fricciones', 'Incorporar'], R.state.equipos.map((q) => { const a = R.analizarEquipo(q.miembros); return [q.nombre, String(a.miembros.length), a.faltan.map((k) => H.ROLES[k].n).join(', ') || '—', String(a.tensiones.length), a.contratar ? [a.contratar.rol && H.ROLES[a.contratar.rol].n, a.contratar.estilo && H.DISC[a.contratar.estilo].n].filter(Boolean).join(' · ') : '—']; }), { num: [1, 3] }));
    h += In.foot(pie);
    const sinH = ps.filter((p) => !p.disc).length, crit = s.est.avisos.filter((a) => a.st === 'stop');
    R.abrirInforme({ titulo: 'Informe de personas y estructura', html: h, clave: 'org', ctx: { titulo: 'Personas y estructura', tipo: 'Auditoría de personas',
      pasos: (sinH ? [{ q: 'Completar los cuestionarios pendientes', c: sinH + ' personas sin DISC: enviarlos por enlace desde «Test a distancia».', quien: 'Recursos humanos o dirección', s: 'Toda la plantilla con DISC' }] : [])
        .concat(crit.slice(0, 3).map((a) => ({ q: 'Resolver: ' + a.t, c: 'Nombrar sucesor o cubrir el puesto y preparar el relevo con una tablilla.', quien: 'Dirección', s: 'El aviso desaparece de la estructura' })))
        .concat(s.encBajo ? [{ q: 'Revisar las personas con encaje bajo', c: 'Conversación individual: ¿ajustar el puesto, entrenar la brecha o cambiar de puesto?', quien: 'Responsable directo', s: 'Plan acordado con cada persona' }] : [])
        .concat(s.todo.faltan.length ? [{ q: 'Cubrir las aportaciones que nadie tiene', c: s.todo.faltan.map((k) => H.ROLES[k].n).join(', '), quien: 'Dirección', s: 'Aportación cubierta en algún equipo' }] : [])
        .concat([{ q: 'Conversaciones de desarrollo con cada persona', c: 'Treinta minutos con su informe y una tablilla elegida.', quien: 'Cada responsable', s: 'Todas las personas con tablilla en curso' }, { q: 'Revisión trimestral de personas y estructura', c: 'Repetir este informe y comparar.', quien: 'Consultor', s: 'Menos alertas que en este informe' }]),
      seguimiento: SEG_PERSONA,
      datos: [['Personas', String(s.n)], ['DISC completados', s.disc + '/' + s.n], ['Encaje medio', pct(s.encMedio)], ['Niveles', String(s.est.niveles)], ['Alertas graves', String(crit.length)], ['Equipos', String(R.state.equipos.length)]] } });
  };
})();
