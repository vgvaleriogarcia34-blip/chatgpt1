/* Atalaya · Personas y equipos · Liderazgo a medida (plan Consultora)
   Estilo del líder (12 situaciones), estilo percibido por su equipo, preparación de cada colaborador por tarea,
   mapa de mando con desajustes, acuerdos de liderazgo, plan de desarrollo con tablillas e informes.
   Datos en cada persona: p.lid = { estilo, percibido[] } (si lidera) y p.tareas[] (como colaborador). */
(function () {
  const A = window.Atalaya, H = A.personasDatos, L = A.liderazgoDatos, R = A.personas;
  const { $, $$, esc } = R;
  const I = () => A.informe;
  const r0 = Math.round;
  const E = L.ESTILOS, N = L.NIVELES;
  // Las tablillas de liderazgo entran en el catálogo general
  L.TABLILLAS.forEach((t) => { if (!H.TABLILLAS.find((x) => x.id === t.id)) H.TABLILLAS.push(t); });
  const tab = (id) => H.TABLILLAS.find((t) => t.id === id);
  const chipE = (e, extra) => (e ? `<span class="lid-chip" style="--c:${E[e].c}">${esc(E[e].n)}${extra ? ' · ' + extra : ''}</span>` : '<span class="muted">—</span>');
  const chipN = (n) => (n ? `<span class="lid-chip lid-n" style="--c:${N[n].c}">${esc(N[n].n)}</span>` : '<span class="muted">—</span>');
  const primero = (p) => esc(String(p.nombre || '').split(' ')[0]);

  /* ================= CÁLCULOS ================= */
  /* Estilo: principal y secundario, eficacia (acierto con el estilo que toca, con puntos parciales
     para los estilos cercanos) y flexibilidad (lo repartido que está el uso de los cuatro estilos). */
  R.lidCalc = (resp) => {
    if (!resp || resp.some((v) => v == null)) return null;
    const n = L.SITUACIONES.length, uso = { 1: 0, 2: 0, 3: 0, 4: 0 }, porNivel = { 1: [0, 0], 2: [0, 0], 3: [0, 0], 4: [0, 0] };
    let pts = 0, demas = 0, demenos = 0;
    resp.forEach((e, i) => {
      const niv = L.SITUACIONES[i].nivel; uso[e]++;
      pts += L.PUNTOS[Math.abs(e - niv)];
      porNivel[niv][1]++; if (e === niv) porNivel[niv][0]++;
      if (e < niv) demas++; if (e > niv) demenos++;
    });
    const ideal = n / 4, maxDev = 2 * (n - ideal);
    const dev = [1, 2, 3, 4].reduce((a, k) => a + Math.abs(uso[k] - ideal), 0);
    const ord = [1, 2, 3, 4].sort((a, b) => uso[b] - uso[a] || a - b);
    return { uso, pri: ord[0], sec: uso[ord[1]] >= 3 ? ord[1] : null, menos: [1, 2, 3, 4].filter((k) => uso[k] <= 1),
      eficacia: r0((pts / (n * 3)) * 100), flex: r0(100 - (dev / maxDev) * 100), porNivel, demas, demenos };
  };
  /* Estilo percibido: suma de todas las respuestas del equipo */
  R.lidPercibido = (p) => {
    const lista = ((p.lid && p.lid.percibido) || []).map((x) => ({ x, c: R.lidCalc(x.resp) })).filter((o) => o.c);
    if (!lista.length) return null;
    const uso = { 1: 0, 2: 0, 3: 0, 4: 0 }; lista.forEach((o) => [1, 2, 3, 4].forEach((k) => (uso[k] += o.c.uso[k])));
    const tot = lista.length, ord = [1, 2, 3, 4].sort((a, b) => uso[b] - uso[a] || a - b);
    return { n: tot, uso, pct: Object.fromEntries([1, 2, 3, 4].map((k) => [k, r0((uso[k] / (tot * L.SITUACIONES.length)) * 100)])), pri: ord[0],
      eficacia: r0(lista.reduce((a, o) => a + o.c.eficacia, 0) / tot), flex: r0(lista.reduce((a, o) => a + o.c.flex, 0) / tot) };
  };
  /* Preparación por tarea: capacidad y disposición de 0 a 100 y nivel resultante */
  R.prepCalc = (resp) => {
    if (!resp || resp.some((v) => v == null)) return null;
    const s = { cap: 0, dis: 0 }; L.PREP_ITEMS.forEach((it, i) => (s[it.f] += +resp[i]));
    const cap = r0(((s.cap - 4) / 16) * 100), dis = r0(((s.dis - 4) / 16) * 100);
    return { cap, dis, nivel: R.nivelDe(cap, dis) };
  };
  R.nivelDe = (cap, dis) => (cap < 40 ? 1 : cap < 65 ? 2 : dis >= 70 ? 4 : 3);
  /* Nivel de una tarea: combina lo que dice el líder y lo que dice la persona; avisa si no coinciden */
  R.tareaNivel = (t) => {
    const a = t.prepLider && R.prepCalc(t.prepLider.resp), b = t.prepYo && R.prepCalc(t.prepYo.resp);
    if (!a && !b) return null;
    const cap = a && b ? r0((a.cap + b.cap) / 2) : (a || b).cap, dis = a && b ? r0((a.dis + b.dis) / 2) : (a || b).dis;
    const out = { cap, dis, nivel: R.nivelDe(cap, dis), lider: a, yo: b, discrepa: null, fuente: a && b ? 'ambos' : a ? 'líder' : 'persona' };
    if (a && b && (a.nivel !== b.nivel || Math.abs(a.cap - b.cap) >= 25 || Math.abs(a.dis - b.dis) >= 25)) {
      const mas = b.cap + b.dis > a.cap + a.dis;
      out.discrepa = mas ? `La persona se ve más preparada (${N[b.nivel].n.toLowerCase()}) de lo que la ve su responsable (${N[a.nivel].n.toLowerCase()}). Conviene hablarlo con ejemplos concretos antes de decidir el estilo.`
        : `La persona se ve menos preparada (${N[b.nivel].n.toLowerCase()}) de lo que la ve su responsable (${N[a.nivel].n.toLowerCase()}). Puede que le falte seguridad o que haya algo que no se ve desde fuera.`;
    }
    return out;
  };
  /* Estilo que usa el líder con esa tarea: el declarado o, si no, su estilo principal */
  R.estiloUsa = (t, lider) => { if (t.usa) return { e: +t.usa, origen: 'declarado' }; const c = lider && lider.lid && lider.lid.estilo && R.lidCalc(lider.lid.estilo.resp); return c ? { e: c.pri, origen: 'test' } : null; };
  R.desajuste = (toca, usa) => {
    if (!toca || !usa) return null;
    const d = usa - toca;
    if (!d) return { st: 'ok', t: 'Ajustado: el estilo que usa es el que toca.' };
    const st = Math.abs(d) >= 2 ? 'stop' : 'warn';
    if (d < 0) return { st, tipo: 'mas', t: toca === 4 ? 'Dirige de más a una persona autónoma en esta tarea: riesgo de desmotivarla y de que deje de proponer.' : toca === 3 ? 'Le dice cómo hacerlo a quien ya sabe: necesita confianza y que se le escuche, no instrucciones.' : 'Más dirección de la que hace falta: frena su avance.' };
    return { st, tipo: 'menos', t: toca === 1 ? 'Delega en alguien que empieza: riesgo de errores y de que se queme.' : toca === 2 ? 'Le suelta demasiado pronto: todavía necesita dirección y ánimo.' : 'Menos apoyo del que necesita ahora mismo.' };
  };
  /* Mapa de mando de un líder: sus colaboradores (del organigrama) y sus tareas */
  R.mapaMando = (lider) => {
    const filas = [];
    R.state.personas.filter((x) => x.responsable === lider.id).forEach((c) => {
      const ts = c.tareas || [];
      if (!ts.length) filas.push({ c, t: null });
      ts.forEach((t) => { const nv = R.tareaNivel(t), toca = nv && L.estiloPara(nv.nivel), usa = R.estiloUsa(t, lider); filas.push({ c, t, nv, toca, usa, des: R.desajuste(toca, usa && usa.e) }); });
    });
    return filas;
  };
  R.lideres = () => { const ps = R.state.personas; return ps.filter((p) => ps.some((x) => x.responsable === p.id) || (p.lid && p.lid.estilo)); };

  /* Tablillas de liderazgo propuestas a una persona, como líder y como colaboradora */
  R.tablillasLid = (p) => {
    const out = [], add = (id, motivo, prio) => { const t = tab(id); if (!t) return; const ya = out.find((x) => x.t.id === id); if (ya) { if (!ya.motivos.includes(motivo)) ya.motivos.push(motivo); return; } out.push({ t, motivos: [motivo], prio }); };
    const c = p.lid && p.lid.estilo && R.lidCalc(p.lid.estilo.resp);
    if (c) {
      c.menos.forEach((k) => add('l-' + { 1: 'marcar', 2: 'entrenar', 3: 'acompanar', 4: 'confiar' }[k], `En el test casi no usa el estilo ${E[k].n} (${c.uso[k]} de ${L.SITUACIONES.length} situaciones).`, 1));
      if (c.flex < 50) add('l-flexibilidad', `Flexibilidad del ${c.flex} %: tiende a dirigir a todos igual.`, 1);
      const pe = R.lidPercibido(p); if (pe && pe.pri !== c.pri) add('l-contraste', `Cree usar sobre todo ${E[c.pri].n}, pero su equipo le percibe ${E[pe.pri].n}.`, 1);
    }
    if (p.disc) { const tnd = L.DISC_TENDENCIA[R.discEstilo(p.disc).pri]; if (R.state.personas.some((x) => x.responsable === p.id)) add('l-' + { 1: 'marcar', 2: 'entrenar', 3: 'acompanar', 4: 'confiar' }[tnd.cuesta], `Por su estilo DISC le suele costar ${E[tnd.cuesta].n}.`, 2); }
    R.mapaMando(p).filter((f) => f.des && f.des.st !== 'ok').forEach((f) => add('l-' + { 1: 'marcar', 2: 'entrenar', 3: 'acompanar', 4: 'confiar' }[f.toca], `Con ${f.c.nombre} en «${f.t.nombre}» toca ${E[f.toca].n}.`, 1));
    (p.tareas || []).forEach((t) => { const nv = R.tareaNivel(t); if (nv) add('p-' + (nv.nivel === 4 ? '4' : nv.nivel + '' + (nv.nivel + 1)), `En «${t.nombre}» está en nivel ${N[nv.nivel].n.toLowerCase()}.`, 2); });
    return out.sort((a, b) => a.prio - b.prio);
  };
  const baseTab = R.tablillasDe;
  R.tablillasDe = (p) => { const a = baseTab(p); R.tablillasLid(p).forEach((x) => { if (!a.find((y) => y.t.id === x.t.id)) a.push(x); }); return a.sort((x, y) => x.prio - y.prio); };

  /* ================= COMPONENTES ================= */
  const bor = R.borradores;
  /* Cuestionario de situaciones: una forma de actuar por situación */
  const situaciones = (host, cfg) => {
    const resp = bor[cfg.key] = bor[cfg.key] || L.SITUACIONES.map(() => null);
    const hechos = () => resp.filter((v) => v != null).length;
    host.insertAdjacentHTML('beforeend', `<div class="glass pad stack">${cfg.cabecera}
      <div class="pe-prog">${R.bar((hechos() / resp.length) * 100, 'var(--gold)', `${hechos()}/${resp.length}`)}</div>
      <ol class="lid-sits">${L.SITUACIONES.map((s, i) => `<li class="${resp[i] != null ? 'ok' : ''}"><p>${esc(s.t)}</p><div class="lid-ops" role="radiogroup" aria-label="Situación ${i + 1}">${s.ops.map((o, j) => `<button class="lid-op" role="radio" aria-checked="${resp[i] === o.e}" data-i="${i}" data-e="${o.e}"><span>${String.fromCharCode(65 + j)}</span>${esc(o.t)}</button>`).join('')}</div></li>`).join('')}</ol>
      <div class="row"><button class="btn solid" id="lidFin" ${hechos() < resp.length ? 'disabled' : ''}>Ver resultado</button>${cfg.cancelar ? '<button class="btn ghost" id="lidCan">Cancelar</button>' : ''}</div></div>`);
    $$('.lid-op', host).forEach((b) => (b.onclick = () => {
      resp[+b.dataset.i] = +b.dataset.e;
      const li = b.closest('li'); li.classList.add('ok'); $$('.lid-op', li).forEach((x) => x.setAttribute('aria-checked', x === b));
      $('.pe-prog', host).innerHTML = R.bar((hechos() / resp.length) * 100, 'var(--gold)', `${hechos()}/${resp.length}`);
      $('#lidFin', host).disabled = hechos() < resp.length;
      const next = li.nextElementSibling; if (next && !next.classList.contains('ok')) next.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }));
    $('#lidFin', host).onclick = () => { const r = resp.slice(); delete bor[cfg.key]; cfg.onFin(r); };
    const c = $('#lidCan', host); if (c) c.onclick = () => { delete bor[cfg.key]; cfg.cancelar(); };
  };
  /* Barras de uso de los cuatro estilos (propio y, si lo hay, percibido) */
  const usoBars = (c, pe) => `<div class="lid-uso">${[1, 2, 3, 4].map((k) => `<div class="lid-u"><span>${esc(E[k].n)}</span>${R.bar((c.uso[k] / L.SITUACIONES.length) * 100, E[k].c, c.uso[k])}${pe ? `<div class="lid-pe">${R.bar(pe.pct[k], E[k].c + '88', pe.pct[k] + ' %')}</div>` : ''}</div>`).join('')}</div>${pe ? '<p class="small muted" style="margin:0">Barra superior: cómo se ve el líder (número de situaciones). Barra inferior: cómo le ve su equipo (porcentaje de respuestas).</p>' : ''}`;
  /* Matriz del modelo: cuatro estilos según dirección y apoyo */
  const matriz = (marca) => `<div class="lid-mat" role="img" aria-label="Cuatro estilos según la dirección y el apoyo">
    <span class="lid-ax lid-ay">Apoyo →</span><span class="lid-ax lid-ax2">Dirección →</span>
    ${[3, 2, 4, 1].map((k) => `<div class="lid-q ${marca && marca.includes(k) ? 'on' : ''}" style="--c:${E[k].c}"><b>${esc(E[k].n)}</b><small>${esc(E[k].corto)}</small><i>${esc(N[k].n)}</i></div>`).join('')}</div>`;
  const selLider = (id, actual) => { const ls = R.lideres(); return `<select class="input" id="${id}">${(ls.length ? ls : R.state.personas).map((p) => `<option value="${p.id}" ${p.id === actual ? 'selected' : ''}>${esc(p.nombre)}${R.puestoDe(p) ? ' · ' + esc(R.puestoDe(p).nombre) : ''}</option>`).join('')}</select>`; };
  let liderActivo = null;
  const liderDe = () => { let p = R.persona(liderActivo); if (!p) { const ls = R.lideres(); p = ls[0] || R.state.personas[0] || null; liderActivo = p ? p.id : null; } return p; };
  const cabLider = (host, p, extra) => `<div class="glass pad row pe-who"><label class="small">Líder ${selLider('lidSel', p.id)}</label>${extra || ''}</div>`;
  const wireLider = (host) => { const s = $('#lidSel', host); if (s) s.onchange = () => { liderActivo = s.value; R.rerender(); }; };
  R.lidActivo = (id) => { if (id) liderActivo = id; return liderDe(); };
  const aviso = () => `<div class="note pe-etica"><b>Cómo leerlo.</b> ${esc(L.AVISO)}</div>`;

  /* ================= MÓDULOS ================= */
  R.register({
    id: 'lid-modelo', grupo: 'Liderazgo', nombre: 'Liderazgo a medida', pregunta: '¿Qué estilo de liderazgo toca con cada persona en cada tarea?',
    informe: () => R.informeLidOrg(), informeTxt: 'Informe de liderazgo de la organización',
    render(host) {
      const ls = R.lideres(), conTest = ls.filter((p) => p.lid && p.lid.estilo).length;
      const filas = ls.flatMap((p) => R.mapaMando(p)), evaluadas = filas.filter((f) => f.nv), des = filas.filter((f) => f.des && f.des.st !== 'ok'), acu = filas.filter((f) => f.t && f.t.acuerdo);
      host.innerHTML = `<div class="grid pe-two"><div class="glass pad stack"><div class="eyebrow">El modelo</div>
          <p style="margin:0">No hay un estilo de liderazgo mejor que otro: hay un estilo que <b>toca</b> según lo preparada que esté cada persona <b>para cada tarea</b>. La misma persona puede ser autónoma facturando e inicial en tesorería, y pedir un estilo distinto en cada una.</p>
          <p style="margin:0">La preparación combina <b>capacidad</b> (sabe hacerlo) y <b>disposición</b> (quiere hacerlo y se siente seguro). El estilo combina cuánta <b>dirección</b> da el líder (qué, cómo y cuándo) y cuánto <b>apoyo</b> (escuchar, animar, implicar).</p>
          ${matriz()}
          <p class="small muted" style="margin:0">En cada casilla, el estilo y, debajo, el nivel de preparación con el que encaja.</p></div>
        <div class="glass pad stack"><div class="eyebrow">Cómo se trabaja</div>
          <ol class="pe-pasos"><li><b>Estilo del líder:</b> cada responsable responde 12 situaciones (10 minutos). Da su estilo principal, su flexibilidad y su eficacia.</li><li><b>Cómo le ve su equipo:</b> sus colaboradores responden las mismas situaciones sobre su responsable.</li><li><b>Preparación por tarea:</b> líder y colaborador valoran cada tarea clave con 8 frases. Sale el nivel y el estilo que toca.</li><li><b>Mapa de mando:</b> estilo que toca frente a estilo que usa, con los desajustes.</li><li><b>Acuerdo de liderazgo:</b> por colaborador y tarea, el estilo pactado, cada cuánto se revisa y cuál es el siguiente nivel.</li><li><b>Plan de desarrollo:</b> tablillas para el líder y para cada paso de nivel, cruzadas con el DISC.</li></ol>
          <div class="row"><button class="btn solid" data-go="lid-estilo">Empezar por el estilo del líder</button><button class="btn" data-go="lid-prep">Valorar tareas</button></div></div></div>
        ${R.kpis([{ k: 'Líderes', v: ls.length, d: `${conTest} con su test de estilo` }, { k: 'Tareas valoradas', v: evaluadas.length, d: `de ${filas.filter((f) => f.t).length} tareas definidas` }, { k: 'Desajustes', v: des.length, d: 'estilo que usa ≠ estilo que toca', st: des.length ? (des.some((f) => f.des.st === 'stop') ? 'stop' : 'warn') : evaluadas.length ? 'ok' : null }, { k: 'Acuerdos', v: acu.length, d: 'pactados por escrito' }])}
        <div class="grid lid-four">${[1, 2, 3, 4].map((k) => `<div class="glass pad stack lid-card" style="--c:${E[k].c}"><div class="row"><h3 style="margin:0">${esc(E[k].n)}</h3><span class="spacer"></span>${chipN(k)}</div><p style="margin:0">${esc(E[k].que)}</p><p class="small" style="margin:0"><b>Cuándo:</b> ${esc(E[k].cuando)}</p><p class="small" style="margin:0"><b>Suena así:</b> ${E[k].frases.map(esc).join(' ')}</p><p class="small" style="margin:0"><b>Seguimiento:</b> ${esc(E[k].seguimiento)}. <b>Riesgo:</b> ${esc(E[k].riesgo)}</p></div>`).join('')}</div>
        <div class="glass pad stack"><div class="eyebrow">Estilo DISC y tendencia natural</div><div class="grid pe-two">${['D', 'I', 'S', 'C'].map((k) => `<p class="small" style="margin:0"><b style="color:${H.DISC[k].c}">${k} · ${esc(H.DISC[k].n)}.</b> ${esc(L.DISC_TENDENCIA[k].txt)}</p>`).join('')}</div></div>${aviso()}`;
    }
  });

  R.register({
    id: 'lid-estilo', grupo: 'Liderazgo', nombre: 'Estilo del líder', pregunta: '¿Cómo dirige este responsable y cuánto ajusta su estilo a cada situación?',
    informe: () => { const p = liderDe(); if (p) R.informeLider(p); }, informeTxt: 'Informe del líder',
    render(host) {
      const p = liderDe();
      if (!p) { host.innerHTML = R.vacia('Primero da de alta a las personas de la plantilla y marca de quién depende cada una.', 'Ir a la plantilla'); return; }
      const est = p.lid && p.lid.estilo, modo = bor['lidModo:' + p.id];
      host.innerHTML = cabLider(host, p, est && !modo ? '<span class="spacer"></span><button class="btn ghost small" id="lidRep">Repetir test</button>' : '');
      wireLider(host);
      if (!p.consentimiento) { host.insertAdjacentHTML('beforeend', R.pideConsent(p)); R.wireConsent(host, p); return; }
      if (!est || modo) {
        situaciones(host, { key: 'lid:' + p.id,
          cabecera: `<div class="eyebrow">Test de estilo · ${L.SITUACIONES.length} situaciones</div><p class="small" style="margin:0">En cada situación, elija lo que <b>haría de verdad</b> con esa persona, no lo que cree que debería hacer. No hay respuestas buenas en abstracto: depende de cada situación. Mejor si responde ${primero(p)} directamente.</p>${R.envioBtns ? R.envioBtns(p, 'lid') : ''}`,
          cancelar: est ? () => { delete bor['lidModo:' + p.id]; R.rerender(); } : null,
          onFin: (resp) => { p.lid = Object.assign(p.lid || {}, { estilo: { resp, fecha: R.hoy(), origen: 'cuestionario' } }); delete bor['lidModo:' + p.id]; R.save(); R.rerender(); } });
        if (R.wireEnvio) R.wireEnvio(host, p);
        return;
      }
      const c = R.lidCalc(est.resp), pe = R.lidPercibido(p), tnd = p.disc && L.DISC_TENDENCIA[R.discEstilo(p.disc).pri];
      host.insertAdjacentHTML('beforeend', `${R.kpis([{ k: 'Estilo principal', v: E[c.pri].n, d: c.sec ? 'secundario: ' + E[c.sec].n : 'sin secundario claro' }, { k: 'Eficacia', v: c.eficacia + ' %', d: 'acierto con el estilo que toca', st: c.eficacia >= 75 ? 'ok' : c.eficacia >= 55 ? 'warn' : 'stop' }, { k: 'Flexibilidad', v: c.flex + ' %', d: 'reparto entre los cuatro estilos', st: c.flex >= 65 ? 'ok' : c.flex >= 40 ? 'warn' : 'stop' }, { k: 'Cómo le ve su equipo', v: pe ? E[pe.pri].n : '—', d: pe ? `${pe.n} respuesta${pe.n > 1 ? 's' : ''}` : 'sin respuestas todavía' }])}
        <div class="grid pe-two"><div class="glass pad stack"><div class="eyebrow">Uso de los estilos · ${R.fechaES(est.fecha)}</div>${usoBars(c, pe)}${matriz([c.pri, c.sec].filter(Boolean))}</div>
        <div class="glass pad stack"><div class="eyebrow">Lectura</div>
          <p style="margin:0"><b>${esc(E[c.pri].n)}</b> es su estilo de referencia: ${esc(E[c.pri].que.toLowerCase())}</p>
          <p style="margin:0">${c.demas > c.demenos + 1 ? `Tiende a <b>dirigir de más</b>: en ${c.demas} de 12 situaciones eligió más dirección de la que hacía falta. Riesgo: frenar a quien ya sabe.` : c.demenos > c.demas + 1 ? `Tiende a <b>soltar demasiado pronto</b>: en ${c.demenos} de 12 situaciones eligió menos dirección de la que hacía falta. Riesgo: dejar solo a quien empieza.` : 'Sus desvíos se reparten entre dirigir de más y soltar pronto: no hay un sesgo claro.'}</p>
          <div class="table-wrap"><table class="pe-table"><thead><tr><th style="text-align:left">Con quien está…</th><th>Acierto</th></tr></thead><tbody>${[1, 2, 3, 4].map((k) => `<tr><td>${esc(N[k].n)} (toca ${esc(E[k].n)})</td><td style="text-align:center">${R.pill(c.porNivel[k][0] >= 2 ? 'ok' : c.porNivel[k][0] === 1 ? 'warn' : 'stop', c.porNivel[k][0] + ' de ' + c.porNivel[k][1])}</td></tr>`).join('')}</tbody></table></div>
          ${c.menos.length ? `<p class="small" style="margin:0"><b>Estilos que casi no usa:</b> ${c.menos.map((k) => E[k].n).join(', ')}. Son los primeros a entrenar.</p>` : ''}
          ${tnd ? `<p class="small muted" style="margin:0"><b>Cruce con su DISC (${esc(R.discEstilo(p.disc).nombre)}).</b> ${esc(tnd.txt)}</p>` : ''}
          ${pe && pe.pri !== c.pri ? `<div class="alert warn">Se ve como <b>${esc(E[c.pri].n)}</b>, pero su equipo le vive como <b>${esc(E[pe.pri].n)}</b>. Es la conversación más útil que puede tener.</div>` : ''}
          <div class="row"><button class="btn small" data-go="lid-360">Cómo le ve su equipo</button><button class="btn small" data-go="lid-mapa">Mapa de mando</button><button class="btn small" data-go="lid-plan">Plan de desarrollo</button></div></div></div>${aviso()}`);
      $('#lidRep', host).onclick = () => { bor['lidModo:' + p.id] = 1; R.rerender(); };
    }
  });

  R.register({
    id: 'lid-360', grupo: 'Liderazgo', nombre: 'Cómo le ve su equipo', pregunta: '¿Coincide el estilo que el líder cree usar con el que vive su equipo?',
    informe: () => { const p = liderDe(); if (p) R.informeLider(p); }, informeTxt: 'Informe del líder',
    render(host) {
      const p = liderDe();
      if (!p) { host.innerHTML = R.vacia('Primero da de alta a las personas de la plantilla.', 'Ir a la plantilla'); return; }
      p.lid = p.lid || {}; p.lid.percibido = p.lid.percibido || [];
      const equipo = R.state.personas.filter((x) => x.responsable === p.id);
      const nuevo = bor['lid360:' + p.id];
      host.innerHTML = cabLider(host, p, '');
      wireLider(host);
      if (nuevo) {
        situaciones(host, { key: 'lid360r:' + p.id,
          cabecera: `<div class="eyebrow">Estilo percibido · responde ${nuevo.de ? esc(R.nombre(nuevo.de)) : 'una persona del equipo (anónimo)'}</div><p class="small" style="margin:0">Piense en cómo actúa <b>${esc(p.nombre)}</b> de verdad. En cada situación, elija lo que <b>haría su responsable</b> con alguien del equipo. Sus respuestas se suman a las del resto del equipo.</p>`,
          cancelar: () => { delete bor['lid360:' + p.id]; R.rerender(); },
          onFin: (resp) => { p.lid.percibido.push({ id: R.uid('v'), de: nuevo.de || '', resp, fecha: R.hoy() }); delete bor['lid360:' + p.id]; R.save(); R.rerender(); } });
        return;
      }
      const c = p.lid.estilo && R.lidCalc(p.lid.estilo.resp), pe = R.lidPercibido(p);
      host.insertAdjacentHTML('beforeend', `<div class="glass pad stack"><p style="margin:0">Las personas que dependen de <b>${esc(p.nombre)}</b> responden las mismas 12 situaciones pensando en cómo actúa su responsable. Lo ideal es que respondan por su cuenta, por enlace o con código, y sin que el líder vea las respuestas una a una.</p>
          <div class="row pe-add"><select class="input" id="lidDe"><option value="">Anónimo</option>${equipo.map((x) => `<option value="${x.id}">${esc(x.nombre)}</option>`).join('')}</select><button class="btn solid" id="lidAdd">Añadir respuesta aquí</button>${R.envioBtns ? R.envioBtns(p, 'lid360') : ''}</div>
          ${equipo.length ? '' : '<p class="small muted" style="margin:0">Nadie depende todavía de esta persona en la plantilla: puede añadir respuestas anónimas.</p>'}</div>
        ${pe ? `<div class="grid pe-two"><div class="glass pad stack"><div class="eyebrow">Propio frente a percibido</div>${c ? usoBars(c, pe) : `<p class="small muted">${esc(primero(p))} aún no ha hecho su propio test.</p>${[1, 2, 3, 4].map((k) => `<div class="lid-u"><span>${esc(E[k].n)}</span>${R.bar(pe.pct[k], E[k].c, pe.pct[k] + ' %')}</div>`).join('')}`}</div>
          <div class="glass pad stack"><div class="eyebrow">Lectura</div>${R.kpis([{ k: 'Percibido', v: E[pe.pri].n, d: `${pe.n} respuesta${pe.n > 1 ? 's' : ''}` }, { k: 'Eficacia percibida', v: pe.eficacia + ' %', st: pe.eficacia >= 75 ? 'ok' : pe.eficacia >= 55 ? 'warn' : 'stop' }, { k: 'Flexibilidad percibida', v: pe.flex + ' %' }])}
            ${c ? (c.pri === pe.pri ? `<div class="alert ok">Coinciden: se ve y le ven como <b>${esc(E[c.pri].n)}</b>.</div>` : `<div class="alert warn">Se ve como <b>${esc(E[c.pri].n)}</b> y su equipo le vive como <b>${esc(E[pe.pri].n)}</b>. ${pe.pri < c.pri ? 'El equipo percibe más dirección y control de los que el líder cree dar.' : 'El equipo percibe menos dirección de la que el líder cree dar: puede que algunas personas se sientan solas.'}</div>`) + (Math.abs(c.eficacia - pe.eficacia) >= 15 ? `<p class="small" style="margin:0">Eficacia propia ${c.eficacia} % frente a percibida ${pe.eficacia} %.</p>` : '') : ''}
            ${pe.n < 3 ? '<p class="small muted" style="margin:0">Con menos de tres respuestas, la lectura es orientativa y se pierde el anonimato.</p>' : ''}</div></div>
          <div class="glass pad"><div class="table-wrap"><table class="pe-table"><thead><tr><th style="text-align:left">Respuesta</th><th>Fecha</th><th>Estilo percibido</th><th></th></tr></thead><tbody>${p.lid.percibido.map((x, i) => { const cc = R.lidCalc(x.resp); return `<tr><td>${pe.n >= 3 ? 'Respuesta ' + (i + 1) : esc(x.de ? R.nombre(x.de) : 'Anónimo')}</td><td style="text-align:center">${R.fechaES(x.fecha)}</td><td style="text-align:center">${cc ? chipE(cc.pri) : '—'}</td><td class="pe-act"><button class="btn ghost small" data-del="${x.id}">Borrar</button></td></tr>`; }).join('')}</tbody></table></div></div>` : '<div class="alert info">Todavía no hay respuestas de su equipo.</div>'}${aviso()}`);
      $('#lidAdd', host).onclick = () => { bor['lid360:' + p.id] = { de: $('#lidDe', host).value }; R.rerender(); };
      $$('[data-del]', host).forEach((b) => (b.onclick = () => R.confirmar(b, () => { p.lid.percibido = p.lid.percibido.filter((x) => x.id !== b.dataset.del); R.save(); R.rerender(); })));
      if (R.wireEnvio) R.wireEnvio(host, p);
    }
  });

  R.register({
    id: 'lid-prep', grupo: 'Liderazgo', nombre: 'Preparación por tarea', pregunta: '¿Lo preparada que está cada persona para cada una de sus tareas clave?',
    render(host) {
      const p = R.personaActiva();
      if (!p) { host.innerHTML = R.vacia('Primero da de alta a las personas de la plantilla.', 'Ir a la plantilla'); return; }
      p.tareas = p.tareas || [];
      const lider = R.persona(p.responsable), q = bor['prep:' + p.id];
      host.innerHTML = R.cabPersona(host, p, `<span class="small muted">${lider ? 'Responsable: ' + esc(lider.nombre) : 'Sin responsable en la plantilla'}</span>`);
      R.wirePersona(host);
      if (!p.consentimiento) { host.insertAdjacentHTML('beforeend', R.pideConsent(p)); R.wireConsent(host, p); return; }
      if (q) {
        const t = p.tareas.find((x) => x.id === q.t); if (!t) { delete bor['prep:' + p.id]; R.rerender(); return; }
        const yo = q.quien === 'yo';
        R.escala(host, { key: 'prepr:' + p.id + t.id + q.quien, items: L.PREP_ITEMS.map((it) => ({ t: yo ? it.yo : it.el })), min: 1, max: 5, etiquetas: L.PREP_ESCALA,
          cabecera: `<div class="eyebrow">Preparación para «${esc(t.nombre)}» · responde ${yo ? esc(p.nombre) : esc(lider ? lider.nombre : 'su responsable')}</div><p class="small" style="margin:0">${yo ? 'Piense solo en esta tarea, no en su trabajo en general.' : `Piense en cómo hace ${primero(p)} esta tarea en concreto, con ejemplos recientes.`}</p>`,
          cancelar: () => { delete bor['prep:' + p.id]; R.rerender(); },
          onFin: (resp) => { t[yo ? 'prepYo' : 'prepLider'] = { resp, fecha: R.hoy() }; delete bor['prep:' + p.id]; R.save(); R.rerender(); } });
        return;
      }
      host.insertAdjacentHTML('beforeend', `<div class="glass pad stack"><p style="margin:0">Anote las <b>tareas clave</b> de ${primero(p)} (las que más pesan en su puesto) y valore cada una con 8 frases. Si responden los dos, el responsable y la propia persona, el resultado es más fiable y se ven las diferencias de percepción.</p>
          <div class="row pe-add"><input class="input" id="lidTN" placeholder="Tarea, por ejemplo: «Presupuestos de obra»" autocomplete="off"><button class="btn solid" id="lidTA">Añadir tarea</button></div>
          ${(R.puestoDe(p) || {}).mision ? `<p class="small muted" style="margin:0">Misión del puesto: ${esc(R.puestoDe(p).mision)}</p>` : ''}</div>
        ${p.tareas.length ? `<div class="lid-tareas">${p.tareas.map((t) => { const nv = R.tareaNivel(t); return `<article class="glass pad stack lid-t" data-t="${t.id}"><div class="row"><input class="input lid-tn" value="${esc(t.nombre)}" aria-label="Nombre de la tarea"><span class="spacer"></span>${nv ? chipN(nv.nivel) + ' ' + chipE(nv.nivel, 'toca') : '<span class="small muted">Sin valorar</span>'}</div>
          ${nv ? `<div class="lid-cd"><div><small>Capacidad</small>${R.bar(nv.cap, 'var(--gold)', nv.cap)}</div><div><small>Disposición</small>${R.bar(nv.dis, 'var(--s5)', nv.dis)}</div></div><p class="small" style="margin:0">${esc(N[nv.nivel].lectura)} <span class="muted">Según ${nv.fuente === 'ambos' ? 'el responsable y la persona' : 'solo ' + (nv.fuente === 'líder' ? 'el responsable' : 'la persona')}.</span></p>${nv.discrepa ? `<div class="alert warn">${esc(nv.discrepa)}</div>` : ''}` : ''}
          <div class="row"><button class="btn small ${t.prepLider ? 'ghost' : ''}" data-q="lider">${t.prepLider ? '✓ ' : ''}Responde el responsable</button><button class="btn small ${t.prepYo ? 'ghost' : ''}" data-q="yo">${t.prepYo ? '✓ ' : ''}Responde ${primero(p)}</button>${R.envioBtns ? R.envioBtns(p, 'prep', t) : ''}<span class="spacer"></span><button class="btn ghost small" data-del>Borrar tarea</button></div></article>`; }).join('')}</div>` : ''}${aviso()}`);
      const add = () => { const n = $('#lidTN', host).value.trim(); if (!n) return $('#lidTN', host).focus(); p.tareas.push({ id: R.uid('t'), nombre: n, alta: R.hoy() }); R.save(); R.rerender(); };
      $('#lidTA', host).onclick = add; $('#lidTN', host).onkeydown = (e) => { if (e.key === 'Enter') add(); };
      $$('.lid-t', host).forEach((card) => {
        const t = p.tareas.find((x) => x.id === card.dataset.t);
        $('.lid-tn', card).onchange = (e) => { t.nombre = e.target.value.trim() || t.nombre; R.save(); };
        $$('[data-q]', card).forEach((b) => (b.onclick = () => { bor['prep:' + p.id] = { t: t.id, quien: b.dataset.q }; R.rerender(); }));
        $('[data-del]', card).onclick = (e) => R.confirmar(e.target, () => { p.tareas = p.tareas.filter((x) => x.id !== t.id); R.save(); R.rerender(); });
      });
      if (R.wireEnvio) R.wireEnvio(host, p);
    }
  });

  /* Acuerdo de liderazgo de una tarea (ventana) */
  const acuerdoDialog = (c, t, lider, toca) => {
    const a = t.acuerdo || {}, est = a.estilo || toca || 1, sig = a.siguiente || Math.min(4, (toca || 1) + 1);
    const back = document.createElement('div'); back.className = 'ef-back';
    back.innerHTML = `<div class="ef-card glass pad stack" role="dialog" aria-modal="true" aria-label="Acuerdo de liderazgo">
      <div class="row"><div><div class="eyebrow">Acuerdo de liderazgo</div><h3 style="margin:4px 0 0">${esc(c.nombre)} · ${esc(t.nombre)}</h3><p class="small muted" style="margin:0">Con ${esc(lider.nombre)}${toca ? ` · nivel ${esc(N[toca].n.toLowerCase())}, toca ${esc(E[toca].n)}` : ''}</p></div><span class="spacer"></span><button class="btn ghost small" data-x>Cerrar</button></div>
      <p class="small" style="margin:0">Se pacta entre los dos, en una conversación de 20 minutos: qué estilo va a usar el responsable en esta tarea, cada cuánto se revisa y qué hace falta para subir al siguiente nivel.</p>
      <label class="small">Estilo pactado<select class="input" data-f="estilo">${[1, 2, 3, 4].map((k) => `<option value="${k}" ${k === +est ? 'selected' : ''}>${E[k].n} — ${E[k].corto}${k === toca ? ' (el que toca)' : ''}</option>`).join('')}</select></label>
      <label class="small">Seguimiento<select class="input" data-f="freq">${Object.keys(L.FRECUENCIAS).map((k) => `<option value="${k}" ${k === (a.freq || E[est].freq) ? 'selected' : ''}>${L.FRECUENCIAS[k]}</option>`).join('')}</select></label>
      <label class="small">Siguiente nivel<select class="input" data-f="siguiente">${[1, 2, 3, 4].map((k) => `<option value="${k}" ${k === +sig ? 'selected' : ''}>${N[k].n}</option>`).join('')}</select></label>
      <label class="small">Qué hará ${esc(lider.nombre.split(' ')[0])}<textarea class="input" rows="2" data-f="lider" placeholder="Por ejemplo: revisar juntos cada viernes las ofertas de la semana">${esc(a.lider || '')}</textarea></label>
      <label class="small">Qué hará ${esc(c.nombre.split(' ')[0])}<textarea class="input" rows="2" data-f="colab" placeholder="Por ejemplo: preparar las ofertas con la lista de comprobación">${esc(a.colab || '')}</textarea></label>
      <label class="small">Fecha de revisión<input class="input" type="date" data-f="revision" value="${esc(a.revision || new Date(Date.now() + 42 * 864e5).toISOString().slice(0, 10))}"></label>
      <div class="row"><button class="btn solid" data-ok>Guardar acuerdo</button>${t.acuerdo ? '<button class="btn ghost" data-borra>Quitar acuerdo</button>' : ''}</div></div>`;
    document.body.appendChild(back);
    const close = () => back.remove();
    back.onclick = (ev) => { if (ev.target === back) close(); };
    back.querySelector('[data-x]').onclick = close;
    back.querySelector('[data-f="estilo"]').onchange = (e) => { back.querySelector('[data-f="freq"]').value = E[e.target.value].freq; };
    back.querySelector('[data-ok]').onclick = () => { const o = { fecha: R.hoy() }; $$('[data-f]', back).forEach((i) => (o[i.dataset.f] = i.value)); o.estilo = +o.estilo; o.siguiente = +o.siguiente; t.acuerdo = o; if (!t.usa) t.usa = o.estilo; R.save(); close(); R.rerender(); };
    const bb = back.querySelector('[data-borra]'); if (bb) bb.onclick = () => { delete t.acuerdo; R.save(); close(); R.rerender(); };
    back.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') close(); });
    back.querySelector('select').focus();
  };

  R.register({
    id: 'lid-mapa', grupo: 'Liderazgo', nombre: 'Mapa de mando', pregunta: '¿Usa cada líder el estilo que toca con cada colaborador en cada tarea?',
    informe: () => { const p = liderDe(); if (p) R.informeLidEquipo(p); }, informeTxt: 'Acuerdos del equipo',
    render(host) {
      const p = liderDe();
      if (!p) { host.innerHTML = R.vacia('Primero da de alta a las personas de la plantilla y marca de quién depende cada una.', 'Ir a la plantilla'); return; }
      const filas = R.mapaMando(p), c = p.lid && p.lid.estilo && R.lidCalc(p.lid.estilo.resp);
      host.innerHTML = cabLider(host, p, `<span class="small muted">${c ? 'Estilo principal: ' + esc(E[c.pri].n) : 'Sin test de estilo'}</span>`);
      wireLider(host);
      if (!filas.length) { host.insertAdjacentHTML('beforeend', '<div class="alert info">Nadie depende de esta persona en la plantilla. Indica en «Plantilla» de quién depende cada persona (el organigrama) para dibujar su mapa de mando.</div>'); return; }
      const des = filas.filter((f) => f.des && f.des.st !== 'ok');
      host.insertAdjacentHTML('beforeend', `${R.kpis([{ k: 'Colaboradores', v: new Set(filas.map((f) => f.c.id)).size }, { k: 'Tareas valoradas', v: filas.filter((f) => f.nv).length + '/' + filas.filter((f) => f.t).length }, { k: 'Desajustes', v: des.length, st: des.length ? (des.some((f) => f.des.st === 'stop') ? 'stop' : 'warn') : filas.some((f) => f.nv) ? 'ok' : null }, { k: 'Acuerdos', v: filas.filter((f) => f.t && f.t.acuerdo).length }])}
        <div class="glass pad"><div class="table-wrap"><table class="pe-table lid-map"><thead><tr><th style="text-align:left">Colaborador</th><th style="text-align:left">Tarea</th><th>Nivel</th><th>Toca</th><th>Usa</th><th style="text-align:left">Ajuste</th><th>Acuerdo</th></tr></thead><tbody>
          ${filas.map((f, i) => f.t ? `<tr data-c="${f.c.id}" data-t="${f.t.id}"><td>${esc(f.c.nombre)}</td><td>${esc(f.t.nombre)}</td><td style="text-align:center">${f.nv ? chipN(f.nv.nivel) + (f.nv.discrepa ? ' <span title="' + esc(f.nv.discrepa) + '">⚠</span>' : '') : '<button class="btn ghost small" data-val>Valorar</button>'}</td><td style="text-align:center">${f.toca ? chipE(f.toca) : '—'}</td>
            <td><select class="input" data-usa aria-label="Estilo que usa"><option value="">${c ? 'Su estilo principal (' + E[c.pri].n + ')' : '— elegir —'}</option>${[1, 2, 3, 4].map((k) => `<option value="${k}" ${+f.t.usa === k ? 'selected' : ''}>${E[k].n}</option>`).join('')}</select></td>
            <td class="small">${f.des ? R.pill(f.des.st, f.des.st === 'ok' ? 'Ajustado' : f.des.tipo === 'mas' ? 'Dirige de más' : 'Suelta de más') + ' ' + (f.des.st === 'ok' ? '' : esc(f.des.t)) : '<span class="muted">—</span>'}</td>
            <td style="text-align:center">${f.t.acuerdo ? `<button class="btn ghost small" data-acu>${esc(E[f.t.acuerdo.estilo].n)} · ${esc(L.FRECUENCIAS[f.t.acuerdo.freq] || '')}</button>` : `<button class="btn small" data-acu ${f.nv ? '' : 'disabled'}>Pactar</button>`}</td></tr>`
            : `<tr><td>${esc(f.c.nombre)}</td><td colspan="6" class="small muted">Sin tareas clave. <button class="btn ghost small" data-tareas="${f.c.id}">Añadir tareas</button></td></tr>`).join('')}
        </tbody></table></div></div>
        ${des.length ? `<div class="glass pad stack"><div class="eyebrow">Qué cambiar primero</div>${des.sort((a, b) => (a.des.st === 'stop' ? -1 : 1) - (b.des.st === 'stop' ? -1 : 1)).slice(0, 6).map((f) => `<div class="alert ${f.des.st}"><b>${esc(f.c.nombre)} · ${esc(f.t.nombre)}.</b> ${esc(f.des.t)} Toca <b>${esc(E[f.toca].n)}</b>: ${esc(E[f.toca].que.toLowerCase())}</div>`).join('')}</div>` : ''}${aviso()}`);
      $$('tr[data-t]', host).forEach((tr) => {
        const col = R.persona(tr.dataset.c), t = (col.tareas || []).find((x) => x.id === tr.dataset.t), f = filas.find((x) => x.t === t);
        $('[data-usa]', tr).onchange = (e) => { t.usa = e.target.value ? +e.target.value : null; R.save(); R.rerender(); };
        $('[data-acu]', tr).onclick = () => acuerdoDialog(col, t, p, f.toca);
        const v = $('[data-val]', tr); if (v) v.onclick = () => { R.activa = col.id; R.show('lid-prep'); };
      });
      $$('[data-tareas]', host).forEach((b) => (b.onclick = () => { R.activa = b.dataset.tareas; R.show('lid-prep'); }));
    }
  });

  R.register({
    id: 'lid-plan', grupo: 'Liderazgo', nombre: 'Plan de desarrollo', pregunta: '¿Qué tiene que entrenar el líder y qué necesita cada colaborador para subir de nivel?',
    informe: () => { const p = liderDe(); if (p) R.informeLider(p); }, informeTxt: 'Informe del líder',
    render(host) {
      const p = liderDe();
      if (!p) { host.innerHTML = R.vacia('Primero da de alta a las personas de la plantilla.', 'Ir a la plantilla'); return; }
      const prop = R.tablillasLid(p), filas = R.mapaMando(p).filter((f) => f.nv);
      const pasos = filas.map((f) => ({ f, t: tab('p-' + (f.nv.nivel === 4 ? '4' : f.nv.nivel + '' + (f.nv.nivel + 1))) }));
      host.innerHTML = cabLider(host, p, '');
      wireLider(host);
      host.insertAdjacentHTML('beforeend', `<div class="glass pad stack"><div class="eyebrow">Para ${esc(p.nombre)} como líder</div>${prop.length ? `<div class="pe-tabs">${prop.slice(0, 6).map((x) => R.tablillaHTML(x.t, x.motivos)).join('')}</div>` : `<p class="muted" style="margin:0">Sin propuestas todavía: ${p.lid && p.lid.estilo ? 'valora las tareas de su equipo en «Preparación por tarea».' : 'haz primero su test de estilo.'}</p>`}</div>
        <div class="glass pad stack"><div class="eyebrow">Para cada colaborador: el siguiente paso</div>${pasos.length ? `<div class="table-wrap"><table class="pe-table"><thead><tr><th style="text-align:left">Colaborador · tarea</th><th>Ahora</th><th style="text-align:left">Siguiente paso</th><th style="text-align:left">Primer paso concreto</th></tr></thead><tbody>${pasos.map((x) => `<tr><td>${esc(x.f.c.nombre)} · ${esc(x.f.t.nombre)}</td><td style="text-align:center">${chipN(x.f.nv.nivel)}</td><td>${esc(x.t.titulo)}</td><td class="small">${esc((x.f.t.acuerdo && x.f.t.acuerdo.lider) || x.t.pasos[0])}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted" style="margin:0">Valora las tareas de su equipo para ver el siguiente paso de cada persona.</p>'}</div>${aviso()}`);
    }
  });

  R.register({
    id: 'lid-informes', grupo: 'Liderazgo', nombre: 'Informes de liderazgo', pregunta: '¿Qué documento necesito: de un líder, de su equipo o de toda la organización?',
    render(host) {
      const p = liderDe();
      host.innerHTML = `<div class="grid pe-three">
        <div class="glass pad stack"><div class="eyebrow">Líder</div><p class="small" style="margin:0">Estilo propio y percibido, eficacia y flexibilidad, cruce con su DISC, mapa de mando, desajustes y plan de desarrollo. Para su conversación de desarrollo.</p>${p ? `${selLider('lidInfL', p.id)}<div class="row"><button class="btn solid" id="lidInf1">Informe del líder</button></div>` : '<p class="muted small">Sin personas.</p>'}</div>
        <div class="glass pad stack"><div class="eyebrow">Equipo</div><p class="small" style="margin:0">Acuerdos de liderazgo del equipo: por colaborador y tarea, el nivel, el estilo pactado, el seguimiento y el siguiente nivel. Se puede compartir con el equipo.</p>${p ? `<div class="row"><button class="btn solid" id="lidInf2">Acuerdos del equipo</button></div>` : ''}</div>
        <div class="glass pad stack"><div class="eyebrow">Organización</div><p class="small" style="margin:0">Todos los líderes: estilos, eficacia, flexibilidad, desajustes, niveles de preparación y prioridades.</p><div class="row"><button class="btn solid" id="lidInf3" ${R.state.personas.length ? '' : 'disabled'}>Informe de la organización</button></div></div></div>${aviso()}`;
      const sp = () => R.persona(($('#lidInfL', host) || {}).value) || p;
      const b1 = $('#lidInf1', host); if (b1) b1.onclick = () => R.informeLider(sp());
      const b2 = $('#lidInf2', host); if (b2) b2.onclick = () => R.informeLidEquipo(sp());
      $('#lidInf3', host).onclick = () => R.informeLidOrg();
    }
  });

  /* ================= INFORMES ================= */
  const SEG_LID = [['Según el acuerdo (diario a mensual)', 'Cada colaborador con su responsable, en el ritmo pactado para cada tarea', 'Responsable', 'Señales del siguiente nivel', 'Mantener o cambiar el estilo'], ['Mensual (con el consultor)', 'Mapa de mando: desajustes y acuerdos', 'Líder y consultor', 'Desajustes abiertos', 'Ajustar los acuerdos'], ['A las seis semanas', 'Repetir la valoración de las tareas', 'Líder y colaborador', 'Nivel de preparación', 'Nuevo estilo para la tarea'], ['Trimestral', 'Repetir el estilo percibido', 'Consultor', 'Propio frente a percibido', 'Nuevo plan de desarrollo del líder']];
  const pie = 'Herramienta orientativa para conversar sobre cómo se dirige cada tarea. El nivel de preparación es de una tarea, no de la persona. Datos tratados con el consentimiento de cada persona.';
  const cover = (o) => { const e = R.empresa(); return I().cover(Object.assign({ empresa: e.nombre, sector: e.sector, tipo: 'Liderazgo a medida' }, o)); };
  const mapaTabla = (In, filas) => In.table(['Colaborador', 'Tarea', 'Nivel', 'Toca', 'Usa', 'Ajuste'], filas.filter((f) => f.t).map((f) => [f.c.nombre, f.t.nombre, f.nv ? N[f.nv.nivel].n : 'Sin valorar', f.toca ? E[f.toca].n : '—', f.usa ? E[f.usa.e].n : '—', f.des ? { h: In.pill(f.des.st, f.des.st === 'ok' ? 'Ajustado' : f.des.tipo === 'mas' ? 'Dirige de más' : 'Suelta de más') } : '—']));
  const acuerdosTabla = (In, filas) => In.table(['Colaborador', 'Tarea', 'Estilo pactado', 'Seguimiento', 'Siguiente nivel', 'Revisión'], filas.filter((f) => f.t && f.t.acuerdo).map((f) => { const a = f.t.acuerdo; return [f.c.nombre, f.t.nombre, E[a.estilo].n, L.FRECUENCIAS[a.freq] || '—', N[a.siguiente] ? N[a.siguiente].n : '—', R.fechaES(a.revision)]; }));

  R.informeLider = (p) => {
    if (!p) return; const In = I(); In.reset();
    const c = p.lid && p.lid.estilo && R.lidCalc(p.lid.estilo.resp), pe = R.lidPercibido(p), filas = R.mapaMando(p), des = filas.filter((f) => f.des && f.des.st !== 'ok');
    const de = p.disc && R.discEstilo(p.disc), tnd = de && L.DISC_TENDENCIA[de.pri];
    let h = cover({ kicker: 'Informe del líder', titulo: p.nombre, subtitulo: ((R.puestoDe(p) || {}).nombre || 'Sin puesto asignado') + ` · ${new Set(filas.map((f) => f.c.id)).size} colaboradores` });
    h += In.summary('Resumen', `<p>${c ? `Estilo principal <b>${esc(E[c.pri].n)}</b>${c.sec ? ' y secundario ' + esc(E[c.sec].n) : ''}; eficacia del ${c.eficacia} % y flexibilidad del ${c.flex} %.` : 'Sin test de estilo.'}${pe ? ` Su equipo le percibe como <b>${esc(E[pe.pri].n)}</b> (${pe.n} respuesta${pe.n > 1 ? 's' : ''}).` : ''} ${filas.filter((f) => f.nv).length} tareas valoradas con ${des.length} desajuste${des.length === 1 ? '' : 's'}.</p>`, des.some((f) => f.des.st === 'stop') ? 'stop' : des.length || (c && c.flex < 40) ? 'warn' : 'ok');
    if (c) {
      h += In.section('Estilo propio', In.kpis([{ k: 'Principal', v: E[c.pri].n }, { k: 'Eficacia', v: c.eficacia + ' %', st: c.eficacia >= 75 ? 'ok' : c.eficacia >= 55 ? 'warn' : 'stop' }, { k: 'Flexibilidad', v: c.flex + ' %', st: c.flex >= 65 ? 'ok' : c.flex >= 40 ? 'warn' : 'stop' }]) +
        In.table(['Estilo', 'Situaciones en que lo eligió', 'Percibido por el equipo', 'Qué es'], [1, 2, 3, 4].map((k) => [E[k].n, c.uso[k] + ' de 12', pe ? pe.pct[k] + ' %' : '—', E[k].que]), { num: [1, 2] }) +
        In.table(['Con quien está…', 'Toca', 'Acierto'], [1, 2, 3, 4].map((k) => [N[k].n, E[k].n, c.porNivel[k][0] + ' de ' + c.porNivel[k][1]]), { num: [2] }),
        `Test del ${R.fechaES(p.lid.estilo.fecha)}. ${c.demas > c.demenos + 1 ? 'Tiende a dirigir de más.' : c.demenos > c.demas + 1 ? 'Tiende a soltar demasiado pronto.' : 'Sin sesgo claro hacia más o menos dirección.'}`);
    }
    if (pe && c && pe.pri !== c.pri) h += In.callout(`Se ve como <b>${esc(E[c.pri].n)}</b> y su equipo le vive como <b>${esc(E[pe.pri].n)}</b>. Conviene compartir el resultado con el equipo y pedir ejemplos concretos.`, 'warn');
    if (tnd) h += In.section('Cruce con su estilo DISC', `<p>${esc(de.nombre)}. ${esc(tnd.txt)}</p>`);
    if (filas.some((f) => f.t)) h += In.section('Mapa de mando', mapaTabla(In, filas) + (des.length ? In.table(['Colaborador · tarea', 'Qué pasa', 'Qué toca'], des.map((f) => [f.c.nombre + ' · ' + f.t.nombre, f.des.t, E[f.toca].n + ': ' + E[f.toca].que])) : ''));
    if (filas.some((f) => f.t && f.t.acuerdo)) h += In.section('Acuerdos de liderazgo', acuerdosTabla(In, filas));
    const tabs = R.tablillasLid(p).slice(0, 5);
    if (tabs.length) h += In.section('Plan de desarrollo', In.table(['Tablilla', 'Objetivo', 'Pasos', 'Por qué'], tabs.map((x) => [x.t.titulo, x.t.objetivo, x.t.pasos.join(' · '), x.motivos.join(' ')])));
    h += In.foot(pie);
    R.abrirInforme({ titulo: 'Informe del líder · ' + p.nombre, html: h, clave: 'lid-lider:' + p.id, ctx: { titulo: 'Liderazgo de ' + p.nombre, tipo: 'Informe del líder', datos: R.datosLider(p), pasos: R.pasosLider(p), seguimiento: SEG_LID } });
  };

  R.informeLidEquipo = (p) => {
    if (!p) return; const In = I(); In.reset(); const filas = R.mapaMando(p);
    let h = cover({ kicker: 'Acuerdos de liderazgo', titulo: 'Equipo de ' + p.nombre, subtitulo: `${new Set(filas.map((f) => f.c.id)).size} colaboradores · ${filas.filter((f) => f.t).length} tareas clave` });
    h += In.summary('Para qué sirve', '<p>Cada persona del equipo sabe, para cada una de sus tareas clave, cómo le va a dirigir su responsable, cada cuánto se revisa y qué hace falta para ganar autonomía. El nivel es de la tarea, no de la persona.</p>');
    const porC = {}; filas.filter((f) => f.t).forEach((f) => (porC[f.c.id] = porC[f.c.id] || []).push(f));
    Object.keys(porC).forEach((id) => {
      const fs = porC[id], col = R.persona(id);
      h += In.section(col.nombre, In.table(['Tarea', 'Nivel', 'Estilo pactado', 'Seguimiento', 'Qué hará el responsable', 'Qué hará la persona', 'Siguiente nivel', 'Revisión'], fs.map((f) => { const a = f.t.acuerdo || {}; const est = a.estilo || f.toca; return [f.t.nombre, f.nv ? N[f.nv.nivel].n : 'Sin valorar', est ? E[est].n : '—', L.FRECUENCIAS[a.freq] || (est ? E[est].seguimiento : '—'), a.lider || '—', a.colab || '—', a.siguiente ? N[a.siguiente].n : '—', a.revision ? R.fechaES(a.revision) : '—']; })));
    });
    h += In.section('Los cuatro estilos', In.table(['Estilo', 'Qué significa', 'Seguimiento habitual'], [1, 2, 3, 4].map((k) => [E[k].n, E[k].que, E[k].seguimiento])));
    h += In.foot(pie);
    R.abrirInforme({ titulo: 'Acuerdos del equipo de ' + p.nombre, html: h, clave: 'lid-eq:' + p.id, ctx: { titulo: 'Acuerdos del equipo de ' + p.nombre, tipo: 'Acuerdos de liderazgo', datos: R.datosLider(p), pasos: R.pasosLider(p).slice(-3), seguimiento: SEG_LID } });
  };

  R.informeLidOrg = () => {
    const In = I(); In.reset(); const ls = R.lideres();
    let h = cover({ kicker: 'Liderazgo en la organización', titulo: 'Liderazgo a medida', subtitulo: `${ls.length} líderes` });
    if (!ls.length) { In.open({ titulo: 'Informe de liderazgo', html: h + '<p class="rp-muted">Todavía no hay líderes: indica en la plantilla de quién depende cada persona.</p>' + In.foot(pie) }); return; }
    const datos = ls.map((p) => { const c = p.lid && p.lid.estilo && R.lidCalc(p.lid.estilo.resp), pe = R.lidPercibido(p), f = R.mapaMando(p); return { p, c, pe, f, des: f.filter((x) => x.des && x.des.st !== 'ok') }; });
    const conC = datos.filter((d) => d.c), todas = datos.flatMap((d) => d.f.filter((x) => x.nv));
    const efM = conC.length ? r0(conC.reduce((a, d) => a + d.c.eficacia, 0) / conC.length) : null, flM = conC.length ? r0(conC.reduce((a, d) => a + d.c.flex, 0) / conC.length) : null;
    const nDes = datos.reduce((a, d) => a + d.des.length, 0), dist = { 1: 0, 2: 0, 3: 0, 4: 0 }; todas.forEach((x) => dist[x.nv.nivel]++);
    const estD = { 1: 0, 2: 0, 3: 0, 4: 0 }; conC.forEach((d) => estD[d.c.pri]++);
    h += In.summary('Resumen ejecutivo', `<p>${conC.length} de ${ls.length} líderes tienen su test de estilo${efM != null ? `, con una eficacia media del ${efM} % y una flexibilidad media del ${flM} %` : ''}. Hay ${todas.length} tareas valoradas y ${nDes} desajuste${nDes === 1 ? '' : 's'} entre el estilo que toca y el que se usa.${todas.length ? ` El ${r0((dist[4] / todas.length) * 100)} % de las tareas están en nivel autónomo.` : ''}</p>`, nDes > 3 ? 'stop' : nDes ? 'warn' : 'ok');
    h += In.kpis([{ k: 'Líderes', v: String(ls.length) }, { k: 'Eficacia media', v: efM != null ? efM + ' %' : '—' }, { k: 'Flexibilidad media', v: flM != null ? flM + ' %' : '—' }, { k: 'Desajustes', v: String(nDes), st: nDes ? 'warn' : 'ok' }]);
    h += In.section('Líderes', In.table(['Líder', 'Colaboradores', 'Estilo principal', 'Percibido', 'Eficacia', 'Flexibilidad', 'Desajustes'], datos.map((d) => [d.p.nombre, String(new Set(d.f.map((x) => x.c.id)).size), d.c ? E[d.c.pri].n : '—', d.pe ? E[d.pe.pri].n : '—', d.c ? d.c.eficacia + ' %' : '—', d.c ? d.c.flex + ' %' : '—', String(d.des.length)]), { num: [1, 4, 5, 6] }));
    if (conC.length) h += In.section('Estilos predominantes', In.table(['Estilo', 'Líderes con ese estilo principal'], [1, 2, 3, 4].map((k) => [E[k].n, String(estD[k])]), { num: [1] }) + (Object.values(estD).filter(Boolean).length === 1 && conC.length > 2 ? In.callout(`Todos los líderes comparten el estilo ${esc(E[conC[0].c.pri].n)}: la organización dirige a todos igual.`, 'warn') : ''));
    if (todas.length) h += In.section('Preparación de las personas por tarea', In.table(['Nivel', 'Tareas', 'Estilo que toca'], [1, 2, 3, 4].map((k) => [N[k].n, String(dist[k]), E[k].n]), { num: [1] }));
    const tDes = datos.flatMap((d) => d.des.map((x) => ({ d, x })));
    if (tDes.length) h += In.section('Desajustes que corregir', In.table(['Líder', 'Colaborador · tarea', 'Qué pasa', 'Toca'], tDes.sort((a, b) => (a.x.des.st === 'stop' ? -1 : 1) - (b.x.des.st === 'stop' ? -1 : 1)).map(({ d, x }) => [d.p.nombre, x.c.nombre + ' · ' + x.t.nombre, x.des.t, E[x.toca].n])));
    h += In.foot(pie);
    R.abrirInforme({ titulo: 'Informe de liderazgo de la organización', html: h, clave: 'lid-org', ctx: { titulo: 'Liderazgo en la organización', tipo: 'Informe de liderazgo', seguimiento: SEG_LID,
      datos: [['Líderes', String(ls.length)], ['Con test de estilo', String(conC.length)], ['Eficacia media', efM != null ? efM + ' %' : '—'], ['Flexibilidad media', flM != null ? flM + ' %' : '—'], ['Tareas valoradas', String(todas.length)], ['Desajustes', String(nDes)]],
      pasos: [{ q: 'Presentar el modelo a los líderes', c: 'Sesión de 60 minutos: estilos, niveles y por qué el nivel es de la tarea, no de la persona.', quien: 'Consultor', s: 'Todos los líderes conocen el modelo' }, { q: 'Test de estilo de cada líder', c: (ls.length - conC.length) + ' pendientes; se pueden enviar por enlace.', quien: 'Cada líder', s: 'Todos los líderes con test' }, { q: 'Estilo percibido', c: 'Enviar el test a cada equipo; mínimo tres respuestas por líder.', quien: 'Recursos humanos o consultor', s: 'Cada líder con su estilo percibido' }, { q: 'Valorar las tareas clave de cada colaborador', c: 'Dos o tres tareas por persona, valoradas por el líder y por la persona.', quien: 'Cada líder', s: 'Mapa de mando completo' }]
        .concat(tDes.slice(0, 4).map(({ d, x }) => ({ q: 'Corregir el desajuste de ' + d.p.nombre + ' con ' + x.c.nombre + ' en «' + x.t.nombre + '»', c: 'Toca ' + E[x.toca].n + ': ' + x.des.t, quien: d.p.nombre, s: 'Acuerdo firmado con el estilo que toca' })))
        .concat([{ q: 'Acuerdos de liderazgo por escrito', c: 'Cada líder con cada colaborador: estilo, seguimiento y siguiente nivel.', quien: 'Cada líder', s: 'Un acuerdo por tarea clave' }, { q: 'Revisión a las seis semanas', c: 'Repetir la valoración de las tareas y comparar niveles.', quien: 'Consultor', s: 'Al menos un nivel subido por equipo' }]) } });
  };

  /* Datos y pasos del líder para el cuaderno del consultor */
  R.datosLider = (p) => { const c = p.lid && p.lid.estilo && R.lidCalc(p.lid.estilo.resp), pe = R.lidPercibido(p), f = R.mapaMando(p); return [['Estilo principal', c ? E[c.pri].n : 'Sin test'], ['Eficacia / flexibilidad', c ? c.eficacia + ' % / ' + c.flex + ' %' : '—'], ['Percibido por el equipo', pe ? E[pe.pri].n + ' (' + pe.n + ')' : 'Sin respuestas'], ['Tareas valoradas', String(f.filter((x) => x.nv).length)], ['Desajustes', String(f.filter((x) => x.des && x.des.st !== 'ok').length)], ['Acuerdos firmados', String(f.filter((x) => x.t && x.t.acuerdo).length)]]; };
  R.pasosLider = (p) => {
    const c = p.lid && p.lid.estilo && R.lidCalc(p.lid.estilo.resp), f = R.mapaMando(p), out = [];
    if (!c) out.push({ q: 'Test de estilo del líder', c: 'Que responda las 12 situaciones; el consultor explica el modelo antes, en 10 minutos.', s: 'Test completado' });
    if (!R.lidPercibido(p)) out.push({ q: 'Estilo percibido', c: 'Enviar el test a su equipo por enlace o código; mínimo tres respuestas para preservar el anonimato.', s: 'Tres respuestas o más' });
    if (f.some((x) => x.t && !x.nv) || !f.some((x) => x.t)) out.push({ q: 'Tareas clave de cada colaborador', c: 'Dos o tres tareas por persona, valoradas por el líder y por la persona.', s: 'Todas las tareas con nivel' });
    out.push({ q: 'Revisar el mapa de mando con el líder', c: 'Sesión de 60 minutos: recorrer cada desajuste y decidir el estilo que va a usar.', s: 'Desajustes con decisión tomada' });
    out.push({ q: 'Acuerdos de liderazgo', c: 'El líder pacta con cada colaborador el estilo, el seguimiento y el siguiente nivel (20 minutos por persona).', s: 'Un acuerdo por tarea clave' });
    out.push({ q: 'Revisión a las seis semanas', c: 'Repetir la valoración de las tareas y comprobar si algún nivel ha subido; ajustar los acuerdos.', s: 'Al menos un nivel subido por colaborador' });
    return out;
  };
})();
