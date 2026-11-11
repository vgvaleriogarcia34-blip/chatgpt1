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
  /* Porcentajes enteros que suman 100 (mayor resto): {1: n, 2: n…} sobre el total */
  R.pctResto = (o, tot) => {
    const ks = Object.keys(o), ex = ks.map((k) => (tot ? (o[k] / tot) * 100 : 0)), out = {}; ks.forEach((k, i) => (out[k] = Math.floor(ex[i])));
    let falta = tot ? 100 - ks.reduce((a, k) => a + out[k], 0) : 0;
    ks.map((k, i) => [k, ex[i] - Math.floor(ex[i])]).sort((a, b) => b[1] - a[1]).forEach(([k]) => { if (falta > 0) { out[k]++; falta--; } });
    return out;
  };
  /* Estilo percibido: suma de todas las respuestas del equipo. Confidencial: solo se muestra agregado y con al menos
     LID_MIN respuestas; con menos, no hay lectura (ni en pantalla ni en informes) */
  const LID_MIN = 3;
  R.LID_MIN = LID_MIN;
  R.lidPercibidoN = (p) => ((p.lid && p.lid.percibido) || []).filter((x) => R.lidCalc(x.resp)).length;
  R.lidPercibido = (p) => {
    const lista = ((p.lid && p.lid.percibido) || []).map((x) => ({ x, c: R.lidCalc(x.resp) })).filter((o) => o.c);
    if (lista.length < LID_MIN) return null;
    const uso = { 1: 0, 2: 0, 3: 0, 4: 0 }; lista.forEach((o) => [1, 2, 3, 4].forEach((k) => (uso[k] += o.c.uso[k])));
    const tot = lista.length, ord = [1, 2, 3, 4].sort((a, b) => uso[b] - uso[a] || a - b);
    return { n: tot, uso, pct: R.pctResto(uso, tot * L.SITUACIONES.length), pri: ord[0],
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
    return { st, tipo: 'menos', t: toca === 1 ? 'Delega en alguien que empieza: riesgo de errores y de desgaste.' : toca === 2 ? 'Le suelta demasiado pronto: todavía necesita dirección y ánimo.' : 'Menos apoyo del que necesita ahora mismo.' };
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
      c.menos.forEach((k) => add('l-' + { 1: 'marcar', 2: 'entrenar', 3: 'acompanar', 4: 'confiar' }[k], `Apenas recurre al estilo ${E[k].n.toLowerCase()} (${c.uso[k]} de ${L.SITUACIONES.length} situaciones de dirección).`, 1));
      if (c.flex < 50) add('l-flexibilidad', `Flexibilidad del ${c.flex} %: tiende a dirigir a todos igual.`, 1);
      const pe = R.lidPercibido(p); if (pe && pe.pri !== c.pri) add('l-contraste', `Se atribuye sobre todo el estilo ${E[c.pri].n.toLowerCase()} y su equipo percibe ${E[pe.pri].n.toLowerCase()}.`, 1);
    }
    if (p.disc) { const tnd = L.DISC_TENDENCIA[R.discEstilo(p.disc).pri]; if (R.state.personas.some((x) => x.responsable === p.id)) add('l-' + { 1: 'marcar', 2: 'entrenar', 3: 'acompanar', 4: 'confiar' }[tnd.cuesta], `Por su estilo de comportamiento, le suele costar ${E[tnd.cuesta].n.toLowerCase()}.`, 2); }
    R.mapaMando(p).filter((f) => f.des && f.des.st !== 'ok').forEach((f) => add('l-' + { 1: 'marcar', 2: 'entrenar', 3: 'acompanar', 4: 'confiar' }[f.toca], `Con ${f.c.nombre} en «${f.t.nombre}» corresponde ${E[f.toca].n.toLowerCase()}.`, 1));
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
  // Las dos barras en la misma unidad (porcentaje de situaciones), para poder compararlas
  const usoBars = (c, pe) => { const pc = R.pctResto(c.uso, L.SITUACIONES.length); return `<div class="lid-uso">${[1, 2, 3, 4].map((k) => `<div class="lid-u"><span>${esc(E[k].n)}</span>${R.bar(pc[k], E[k].c, `${pc[k]} % · ${c.uso[k]}`)}${pe ? `<div class="lid-pe">${R.bar(pe.pct[k], E[k].c + '88', pe.pct[k] + ' %')}</div>` : ''}</div>`).join('')}</div><p class="small muted" style="margin:0">${pe ? 'Barra superior: cómo se ve el líder (porcentaje y número de las ' + L.SITUACIONES.length + ' situaciones). Barra inferior: cómo le ve su equipo (porcentaje de respuestas).' : 'Porcentaje y número de las ' + L.SITUACIONES.length + ' situaciones en que elige cada estilo.'}</p>`; };
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
      if (!p) { host.innerHTML = R.vacia('Primero dé de alta a las personas de la plantilla y marque de quién depende cada una.', 'Ir a la plantilla'); return; }
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
          cabecera: `<div class="eyebrow">Estilo percibido · responde ${nuevo.de ? esc(R.nombre(nuevo.de)) : 'una persona del equipo (sin indicar quién)'}</div><p class="small" style="margin:0">Piense en cómo actúa <b>${esc(p.nombre)}</b> de verdad. En cada situación, elija lo que <b>haría su responsable</b> con alguien del equipo. Sus respuestas se suman a las del resto del equipo y solo se muestran agregadas, con al menos tres respuestas.</p>`,
          cancelar: () => { delete bor['lid360:' + p.id]; R.rerender(); },
          onFin: (resp) => { p.lid.percibido.push({ id: R.uid('v'), de: nuevo.de || '', resp, fecha: R.hoy() }); delete bor['lid360:' + p.id]; R.save(); R.rerender(); } });
        return;
      }
      const c = p.lid.estilo && R.lidCalc(p.lid.estilo.resp), pe = R.lidPercibido(p), nPe = R.lidPercibidoN(p);
      host.insertAdjacentHTML('beforeend', `<div class="glass pad stack"><p style="margin:0">Las personas que dependen de <b>${esc(p.nombre)}</b> responden las mismas 12 situaciones pensando en cómo actúa su responsable. Lo ideal es que respondan por su cuenta, por enlace o con código, y sin que el líder vea las respuestas una a una.</p>
          <div class="row pe-add"><select class="input" id="lidDe"><option value="">Sin indicar quién responde</option>${equipo.map((x) => `<option value="${x.id}">${esc(x.nombre)}</option>`).join('')}</select><button class="btn solid" id="lidAdd">Añadir respuesta aquí</button>${R.envioBtns ? R.envioBtns(p, 'lid360') : ''}</div>
          ${equipo.length ? '' : '<p class="small muted" style="margin:0">Nadie depende todavía de esta persona en la plantilla: puede añadir respuestas sin indicar quién responde.</p>'}</div>
        ${pe ? `<div class="grid pe-two"><div class="glass pad stack"><div class="eyebrow">Propio frente a percibido</div>${c ? usoBars(c, pe) : `<p class="small muted">${esc(primero(p))} aún no ha hecho su propio test.</p>${[1, 2, 3, 4].map((k) => `<div class="lid-u"><span>${esc(E[k].n)}</span>${R.bar(pe.pct[k], E[k].c, pe.pct[k] + ' %')}</div>`).join('')}`}</div>
          <div class="glass pad stack"><div class="eyebrow">Lectura</div>${R.kpis([{ k: 'Percibido', v: E[pe.pri].n, d: `${pe.n} respuesta${pe.n > 1 ? 's' : ''}` }, { k: 'Eficacia percibida', v: pe.eficacia + ' %', st: pe.eficacia >= 75 ? 'ok' : pe.eficacia >= 55 ? 'warn' : 'stop' }, { k: 'Flexibilidad percibida', v: pe.flex + ' %' }])}
            ${c ? (c.pri === pe.pri ? `<div class="alert ok">Coinciden: se ve y le ven como <b>${esc(E[c.pri].n)}</b>.</div>` : `<div class="alert warn">Se ve como <b>${esc(E[c.pri].n)}</b> y su equipo le vive como <b>${esc(E[pe.pri].n)}</b>. ${pe.pri < c.pri ? 'El equipo percibe más dirección y control de los que el líder cree dar.' : 'El equipo percibe menos dirección de la que el líder cree dar: puede que algunas personas se sientan solas.'}</div>`) + (Math.abs(c.eficacia - pe.eficacia) >= 15 ? `<p class="small" style="margin:0">Eficacia propia ${c.eficacia} % frente a percibida ${pe.eficacia} %.</p>` : '') : ''}
            <p class="small muted" style="margin:0">Resultado agregado de ${pe.n} respuestas: las respuestas no se muestran una a una.</p></div></div>` : nPe ? `<div class="alert info">Hay ${nPe} respuesta${nPe > 1 ? 's' : ''}. Se mostrarán cuando respondan al menos ${R.LID_MIN} personas, para que nadie pueda identificar las respuestas de cada una.</div>` : '<div class="alert info">Todavía no hay respuestas de su equipo.</div>'}
          ${p.lid.percibido.length ? `<div class="glass pad"><div class="table-wrap"><table class="pe-table"><thead><tr><th style="text-align:left">Respuesta</th><th>Fecha</th><th></th></tr></thead><tbody>${p.lid.percibido.map((x, i) => `<tr><td>Respuesta ${i + 1}</td><td style="text-align:center">${R.fechaES(x.fecha)}</td><td class="pe-act"><button class="btn ghost small" data-del="${x.id}">Borrar</button></td></tr>`).join('')}</tbody></table></div></div>` : ''}${aviso()}`);
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
      if (!p) { host.innerHTML = R.vacia('Primero dé de alta a las personas de la plantilla y marque de quién depende cada una.', 'Ir a la plantilla'); return; }
      const filas = R.mapaMando(p), c = p.lid && p.lid.estilo && R.lidCalc(p.lid.estilo.resp);
      host.innerHTML = cabLider(host, p, `<span class="small muted">${c ? 'Estilo principal: ' + esc(E[c.pri].n) : 'Sin test de estilo'}</span>`);
      wireLider(host);
      if (!filas.length) { host.insertAdjacentHTML('beforeend', '<div class="alert info">Nadie depende de esta persona en la plantilla. Indique en «Plantilla» de quién depende cada persona (el organigrama) para dibujar su mapa de mando.</div>'); return; }
      const des = filas.filter((f) => f.des && f.des.st !== 'ok');
      host.insertAdjacentHTML('beforeend', `${R.kpis([{ k: 'Colaboradores', v: new Set(filas.map((f) => f.c.id)).size }, { k: 'Tareas valoradas', v: filas.filter((f) => f.nv).length + '/' + filas.filter((f) => f.t).length }, { k: 'Desajustes', v: des.length, st: des.length ? (des.some((f) => f.des.st === 'stop') ? 'stop' : 'warn') : filas.some((f) => f.nv) ? 'ok' : null }, { k: 'Acuerdos', v: filas.filter((f) => f.t && f.t.acuerdo).length }])}
        <div class="glass pad"><div class="table-wrap"><table class="pe-table lid-map"><thead><tr><th style="text-align:left">Colaborador</th><th style="text-align:left">Tarea</th><th>Nivel</th><th>Toca</th><th>Usa</th><th style="text-align:left">Ajuste</th><th>Acuerdo</th></tr></thead><tbody>
          ${filas.map((f, i) => f.t ? `<tr data-c="${f.c.id}" data-t="${f.t.id}" data-ir="personas:acuerdo:${esc(f.c.id + ':' + f.t.id)}"><td>${esc(f.c.nombre)}</td><td>${esc(f.t.nombre)}</td><td style="text-align:center">${f.nv ? chipN(f.nv.nivel) + (f.nv.discrepa ? ' <span title="' + esc(f.nv.discrepa) + '">⚠</span>' : '') : '<button class="btn ghost small" data-val>Valorar</button>'}</td><td style="text-align:center">${f.toca ? chipE(f.toca) : '—'}</td>
            <td><select class="input" data-usa aria-label="Estilo que usa"><option value="">${c ? 'Su estilo principal (' + E[c.pri].n + ')' : '— elegir —'}</option>${[1, 2, 3, 4].map((k) => `<option value="${k}" ${+f.t.usa === k ? 'selected' : ''}>${E[k].n}</option>`).join('')}</select></td>
            <td class="small">${f.des ? R.pill(f.des.st, f.des.st === 'ok' ? 'Ajustado' : f.des.tipo === 'mas' ? 'Dirige de más' : 'Suelta de más') + ' ' + (f.des.st === 'ok' ? '' : esc(f.des.t)) : '<span class="muted">—</span>'}</td>
            <td style="text-align:center">${f.t.acuerdo ? `<button class="btn ghost small" data-acu>${esc((E[+f.t.acuerdo.estilo] || {}).n || '—')} · ${esc(L.FRECUENCIAS[f.t.acuerdo.freq] || '')}</button>` : `<button class="btn small" data-acu ${f.nv ? '' : 'disabled'}>Pactar</button>`}</td></tr>`
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

  const oidPaso = (x) => A.mesa.oid('personas', 'paso', x.f.c.id + ':' + x.f.t.id);
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
      host.insertAdjacentHTML('beforeend', `<div class="glass pad stack"><div class="eyebrow">Para ${esc(p.nombre)} como líder</div>${prop.length ? `<div class="pe-tabs">${prop.slice(0, 6).map((x) => R.tablillaHTML(x.t, x.motivos)).join('')}</div>` : `<p class="muted" style="margin:0">Sin propuestas todavía: ${p.lid && p.lid.estilo ? 'valore las tareas de su equipo en «Preparación por tarea».' : 'haga primero su test de estilo.'}</p>`}</div>
        <div class="glass pad stack"><div class="eyebrow">Para cada colaborador: el siguiente paso</div>${pasos.length ? `<div class="table-wrap"><table class="pe-table"><thead><tr><th style="text-align:left">Colaborador · tarea</th><th>Ahora</th><th style="text-align:left">Siguiente paso</th><th style="text-align:left">Primer paso concreto</th></tr></thead><tbody>${pasos.map((x) => `<tr><td>${esc(x.f.c.nombre)} · ${esc(x.f.t.nombre)}</td><td style="text-align:center">${chipN(x.f.nv.nivel)}</td><td>${esc(x.t.titulo)}</td><td class="small">${esc((x.f.t.acuerdo && x.f.t.acuerdo.lider) || x.t.pasos[0])}${A.mesa && A.mesa.oid ? `<small data-mesa-oid="${esc(oidPaso(x))}"></small>${A.mesa.casilla(oidPaso(x))}` : ''}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted" style="margin:0">Valore las tareas de su equipo para ver el siguiente paso de cada persona.</p>'}</div>${aviso()}`);
      // El plan de desarrollo, a la mesa de trabajo del responsable
      if (A.mesa && A.mesa.boton && (prop.length || pasos.length)) {
        const fila = document.createElement('div'); fila.className = 'row';
        // Ids propios: la tablilla para el líder y la tarea de cada colaborador (lo que ya no se propone, «ya no aplica»)
        const O = A.mesa.oid;
        fila.appendChild(A.mesa.boton(() => prop.slice(0, 6).map((x) => ({ t: `Entrenar como líder: ${x.t.titulo}`, area: 'Personas', mundo: 'personas', resp: p.nombre, origen: 'Plan de desarrollo de ' + p.nombre, oid: O('personas', 'plan', p.id + ':' + x.t.id), aka: ['per:plan:' + p.id + ':' + x.t.titulo], impacto: 4 }))
          .concat(pasos.map((x) => ({ t: `${x.f.c.nombre} · ${x.f.t.nombre}: ${x.t.titulo}`, area: 'Personas', mundo: 'personas', resp: p.nombre, tipo: 'seguimiento', contacto: 'Equipo de ' + p.nombre, origen: 'Plan de desarrollo · ' + ((x.f.t.acuerdo && x.f.t.acuerdo.lider) || x.t.pasos[0] || ''), oid: oidPaso(x), fecha: (x.f.t.acuerdo && x.f.t.acuerdo.revision) || '', impacto: 3 }))), 'Llevar el plan a mi mesa de trabajo', () => ({ origen: [O('personas', 'plan', p.id + ':')].concat(pasos.map((x) => O('personas', 'paso', x.f.c.id + ':'))), completo: true })));
        // Lo que se entrena como líder: su estado en la mesa, y «Hecha» desde aquí
        if (prop.length && A.mesa.casilla) fila.insertAdjacentHTML('beforeend', `<ul class="small lid-mesa" style="margin:0;padding-left:18px;flex-basis:100%">${prop.slice(0, 6).map((x) => { const o = O('personas', 'plan', p.id + ':' + x.t.id); return `<li>${esc(x.t.titulo)}<small data-mesa-oid="${esc(o)}"></small>${A.mesa.casilla(o)}</li>`; }).join('')}</ul>`);
        host.appendChild(fila);
        fila.addEventListener('mesa:enviado', () => A.mesa.marcar(host));
      }
      if (A.mesa && A.mesa.marcar) A.mesa.marcar(host);
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
  const SEG_LID = [['Según el acuerdo (diario a mensual)', 'Cada colaborador con su responsable, en el ritmo pactado para cada tarea', 'Responsable', 'Señales del siguiente nivel de preparación', 'Mantener o cambiar el estilo'], ['Mensual (con el consultor)', 'Dirección por tarea: desajustes y acuerdos', 'Responsable y consultor', 'Desajustes abiertos', 'Ajustar los acuerdos'], ['A las seis semanas', 'Nueva valoración de las tareas clave', 'Responsable y colaborador', 'Nivel de preparación', 'Nuevo estilo para la tarea'], ['Trimestral', 'Contraste con la percepción del equipo', 'Consultor', 'Estilo propio frente a percibido', 'Nuevo plan de desarrollo del responsable']];
  const pie = 'Documento orientativo para conversar sobre cómo se dirige cada tarea. El nivel de preparación es de una tarea, no de la persona. Información tratada con el consentimiento de cada persona.';
  const cover = (o) => { const e = R.empresa(); return I().cover(Object.assign({ empresa: e.nombre, sector: e.sector, tipo: 'Liderazgo y dirección de personas' }, o)); };
  const Fi = () => R.inf, pl = (n, a, b) => R.inf.pl(n, a, b);
  const ajuste = (In, f) => (f.des ? { h: In.pill(f.des.st, f.des.st === 'ok' ? 'Ajustado' : f.des.tipo === 'mas' ? 'Dirige de más' : 'Dirige de menos') } : '—');
  const mapaTabla = (In, filas) => In.table(['Colaborador', 'Tarea', 'Preparación', 'Estilo que corresponde', 'Estilo que aplica', 'Ajuste'], filas.filter((f) => f.t && f.nv).map((f) => [f.c.nombre, f.t.nombre, N[f.nv.nivel].n, f.toca ? E[f.toca].n : '—', f.usa ? E[f.usa.e].n : '—', ajuste(In, f)]));
  const acuerdosTabla = (In, filas) => In.table(['Colaborador', 'Tarea', 'Estilo pactado', 'Seguimiento', 'Siguiente nivel', 'Revisión'], filas.filter((f) => f.t && f.t.acuerdo).map((f) => { const a = f.t.acuerdo; return [f.c.nombre, f.t.nombre, (E[+a.estilo] || {}).n || '—', L.FRECUENCIAS[a.freq] || '—', N[a.siguiente] ? N[a.siguiente].n : '—', R.fechaES(a.revision)]; }));
  const MET_LID = {
    estilo: ['Estilo de dirección', `Cuestionario de ${L.SITUACIONES.length} situaciones de dirección con cuatro respuestas posibles, una por estilo (de más a menos dirección: ${[1, 2, 3, 4].map((k) => E[k].n.toLowerCase()).join(', ')}). Eficacia: grado de acierto con el estilo que corresponde a cada situación. Flexibilidad: reparto del uso entre los cuatro estilos.`],
    percibido: ['Estilo percibido', `El mismo cuestionario, respondido de forma anónima por el equipo. Solo se presenta agregado y a partir de ${LID_MIN} respuestas.`],
    tareas: ['Preparación por tarea', 'Cada tarea clave se valora en capacidad y disposición por el responsable y por la propia persona, y se sitúa en uno de cuatro niveles. A cada nivel le corresponde un estilo de dirección.'],
    fuentes: ['Fuentes', 'Organigrama y tareas clave aportados por la empresa, y cuestionarios respondidos por los responsables y sus equipos.']
  };
  /* Lectura del liderazgo de una persona (para el informe, la hoja de ruta y el cuaderno del consultor) */
  const lecturaLider = (p) => {
    const c = p.lid && p.lid.estilo && R.lidCalc(p.lid.estilo.resp), pe = R.lidPercibido(p), filas = R.mapaMando(p);
    const tareas = filas.filter((f) => f.t), val = tareas.filter((f) => f.nv), des = val.filter((f) => f.des && f.des.st !== 'ok'), acu = tareas.filter((f) => f.t.acuerdo);
    return { c, pe, filas, tareas, val, des, acu, nCol: new Set(filas.map((f) => f.c.id)).size, sesgo: c ? (c.demas > c.demenos + 1 ? 'mas' : c.demenos > c.demas + 1 ? 'menos' : '') : '' };
  };
  R.recosLider = (p) => {
    const x = lecturaLider(p), n1 = String(p.nombre || '').split(' ')[0], rc = [];
    if (!x.c) rc.push({ q: 'Valorar su estilo de dirección', c: `Cuestionario de ${L.SITUACIONES.length} situaciones, tras una explicación del modelo de diez minutos.`, imp: 'Estilo de referencia, eficacia y flexibilidad conocidos', quien: p.nombre, plazo: '2 semanas' });
    if (x.nCol && !x.val.length) rc.push({ q: x.tareas.length ? 'Valorar la preparación de cada colaborador en sus tareas clave' : 'Identificar y valorar las tareas clave de cada colaborador', c: 'Dos o tres tareas por persona, valoradas por el responsable y por la propia persona.', imp: 'Estilo de dirección que corresponde a cada tarea', quien: p.nombre, plazo: '1 mes' });
    x.des.slice().sort((a, b) => (a.des.st === 'stop' ? 0 : 1) - (b.des.st === 'stop' ? 0 : 1)).slice(0, 3).forEach((f) => rc.push({ q: `Ajustar el estilo con ${f.c.nombre} en «${f.t.nombre}»`, c: `Corresponde ${E[f.toca].n.toLowerCase()}. ${E[f.toca].que}`, imp: 'Estilo ajustado a la preparación de la persona en esa tarea', quien: p.nombre, plazo: '1 mes' }));
    if (x.c && x.pe && x.pe.pri !== x.c.pri) rc.push({ q: 'Contrastar con el equipo la diferencia entre el estilo propio y el percibido', c: 'Compartir el resultado y pedir ejemplos concretos.', imp: 'Percepción del equipo alineada con el estilo que quiere aplicar', quien: p.nombre, plazo: '1 mes' });
    if (!x.pe && x.nCol >= LID_MIN) rc.push({ q: 'Recoger cómo percibe el equipo su estilo de dirección', c: `Cuestionario anónimo; hacen falta al menos ${LID_MIN} respuestas para preservar la confidencialidad.`, imp: 'Contraste entre el estilo propio y el percibido', quien: 'Recursos humanos o consultor', plazo: '1 mes' });
    if (x.val.length && x.acu.length < x.tareas.length) rc.push({ q: 'Formalizar los acuerdos de dirección por tarea', c: 'Con cada colaborador: estilo, frecuencia de seguimiento y qué hace falta para ganar autonomía (20 minutos por persona).', imp: `Tareas clave con acuerdo escrito: de ${x.acu.length} a ${x.tareas.length}`, quien: p.nombre, plazo: '6 semanas' });
    R.tablillasLid(p).slice(0, 2).forEach((t) => rc.push({ q: 'Entrenar: ' + t.t.titulo, c: t.t.objetivo, imp: t.t.senal, quien: p.nombre, plazo: t.t.duracion }));
    if (x.val.length) rc.push({ q: 'Revisión a las seis semanas', c: 'Volver a valorar las tareas clave y comprobar si la preparación ha subido; ajustar los acuerdos.', imp: 'Al menos una tarea sube de nivel por colaborador', quien: n1 + ' y cada colaborador', plazo: '6 semanas' });
    return rc;
  };
  /* Datos y pasos del responsable para el cuaderno del consultor */
  R.datosLider = (p) => { const x = lecturaLider(p); return [['Estilo de referencia', x.c ? E[x.c.pri].n : 'Sin valorar'], ['Eficacia / flexibilidad', x.c ? x.c.eficacia + ' % / ' + x.c.flex + ' %' : '—'], ['Percibido por el equipo', x.pe ? E[x.pe.pri].n + ' (' + x.pe.n + ' respuestas)' : 'Sin contraste'], ['Tareas clave valoradas', String(x.val.length)], ['Tareas con el estilo desajustado', String(x.des.length)], ['Acuerdos por escrito', String(x.acu.length)]]; };
  R.pasosLider = (p) => Fi().pasosDe(R.recosLider(p));
  const limLider = (p, x) => {
    const n1 = String(p.nombre || '').split(' ')[0], lim = [];
    if (!x.c) lim.push(`No se ha dispuesto de la valoración del estilo de dirección de ${n1}; el documento no describe su estilo de referencia, su eficacia ni su flexibilidad.`);
    if (!x.pe) lim.push(`No se dispone de la percepción del equipo (menos de ${LID_MIN} respuestas); no se contrasta el estilo propio con el percibido.`);
    if (!x.val.length) lim.push('Las tareas clave de sus colaboradores no están valoradas; no se analiza el ajuste del estilo por tarea.');
    else if (x.val.length < x.tareas.length) lim.push(`${x.val.length} de ${x.tareas.length} tareas clave tienen valorada la preparación; el análisis por tarea se refiere a ellas.`);
    lim.push('El nivel de preparación es de cada tarea, no de la persona. El documento orienta la conversación entre responsable y colaborador; no evalúa el desempeño.');
    return lim;
  };
  const notaLider = (x) => { const f = [!x.c && 'el cuestionario de estilo del responsable', !x.pe && 'respuestas del equipo sobre el estilo percibido', !x.val.length && 'la valoración de las tareas clave'].filter(Boolean); return f.length ? 'Para completar este informe falta: ' + f.join(', ') + '.' : ''; };

  R.informeLider = (p) => {
    if (!p) return; const In = I(); In.reset(); const F = Fi();
    const x = lecturaLider(p), c = x.c, pe = x.pe, des = x.des, pu = R.puestoDe(p);
    const de = p.disc && R.discEstilo(p.disc), tnd = de && L.DISC_TENDENCIA[de.pri];
    let h = cover({ kicker: 'Perfil de dirección', titulo: p.nombre, subtitulo: [pu && pu.nombre, pl(x.nCol, 'colaborador', 'colaboradores')].filter(Boolean).join(' · ') });
    const lead = des.length ? `<b>${esc(p.nombre)}</b> aplica un estilo de dirección distinto del que corresponde en <b>${des.length} de ${pl(x.val.length, 'tarea clave valorada', 'tareas clave valoradas')}</b> de su equipo.`
      : x.val.length ? `<b>${esc(p.nombre)}</b> ajusta su estilo de dirección a la preparación de cada persona en ${x.val.length === 1 ? 'la tarea clave valorada' : 'las <b>' + x.val.length + ' tareas clave valoradas</b>'} de su equipo.`
        : c ? `El estilo de dirección de referencia de <b>${esc(p.nombre)}</b> es <b>${esc(E[c.pri].n.toLowerCase())}</b>, con una eficacia del ${c.eficacia} % y una flexibilidad del ${c.flex} %.`
          : `<b>${esc(p.nombre)}</b>${pu ? ', ' + esc(pu.nombre) + ',' : ''} dirige a ${pl(x.nCol, 'persona', 'personas')}.`;
    h += In.summary('Resumen ejecutivo', `<p>${lead}</p>` + F.claves([
      c && x.val.length ? `Estilo de referencia: <b>${esc(E[c.pri].n.toLowerCase())}</b>${c.sec ? ', con ' + esc(E[c.sec].n.toLowerCase()) + ' como secundario' : ''}. Eficacia del ${c.eficacia} % y flexibilidad del ${c.flex} %.` : c && c.sec ? `Estilo secundario: ${esc(E[c.sec].n.toLowerCase())}.` : '',
      x.sesgo === 'mas' ? 'Tiende a dirigir más de lo que la situación requiere.' : x.sesgo === 'menos' ? 'Tiende a dar autonomía antes de que la persona esté preparada.' : '',
      pe ? `Su equipo percibe un estilo de ${esc(E[pe.pri].n.toLowerCase())} (${pl(pe.n, 'respuesta', 'respuestas')})${c ? (pe.pri !== c.pri ? ', distinto del que se atribuye' : ', coincidente con el propio') : ''}.` : '',
      x.val.length ? `${pl(x.val.length, 'tarea clave valorada', 'tareas clave valoradas')} en ${pl(new Set(x.val.map((f) => f.c.id)).size, 'colaborador', 'colaboradores')}; ${x.val.filter((f) => f.nv.nivel === 4).length} en nivel autónomo.` : '',
      x.tareas.length ? `Acuerdos de dirección por escrito: ${x.acu.length} de ${pl(x.tareas.length, 'tarea clave', 'tareas clave')}.` : ''
    ]), des.some((f) => f.des.st === 'stop') ? 'stop' : des.length || (c && c.flex < 40) ? 'warn' : c || x.val.length ? 'ok' : null);
    if (c) {
      h += In.section('Estilo de dirección: ' + E[c.pri].n.toLowerCase(), In.kpis([{ k: 'Estilo de referencia', v: E[c.pri].n }, { k: 'Eficacia', v: c.eficacia + ' %', st: c.eficacia >= 75 ? 'ok' : c.eficacia >= 55 ? 'warn' : 'stop' }, { k: 'Flexibilidad', v: c.flex + ' %', st: c.flex >= 65 ? 'ok' : c.flex >= 40 ? 'warn' : 'stop' }]) +
        In.table(['Estilo', 'Situaciones en que lo elige', 'Percibido por el equipo', 'En qué consiste'], [1, 2, 3, 4].map((k) => [E[k].n, c.uso[k] + ' de ' + L.SITUACIONES.length, pe ? pe.pct[k] + ' %' : '—', E[k].que]), { num: [1, 2] }) +
        In.table(['Preparación de la persona', 'Estilo que corresponde', 'Acierto'], [1, 2, 3, 4].map((k) => [N[k].n, E[k].n, c.porNivel[k][0] + ' de ' + c.porNivel[k][1]]), { num: [2] }),
        `Valoración del ${R.fechaES(p.lid.estilo.fecha)}. ${x.sesgo === 'mas' ? 'Tiende a dirigir de más.' : x.sesgo === 'menos' ? 'Tiende a dar autonomía demasiado pronto.' : 'Sin inclinación clara hacia más o menos dirección.'}`);
    }
    if (pe && c && pe.pri !== c.pri) h += In.callout(`Se atribuye un estilo de <b>${esc(E[c.pri].n.toLowerCase())}</b> y su equipo percibe <b>${esc(E[pe.pri].n.toLowerCase())}</b>. Conviene compartir el resultado con el equipo y pedir ejemplos concretos.`, 'warn');
    if (tnd) h += In.section('Relación con su estilo de comportamiento', `<p>${esc(de.nombre)}. ${esc(tnd.txt)}</p>`);
    if (x.val.length) h += In.section(des.length ? `Dirección por tarea: ${des.length} de ${x.val.length} con el estilo desajustado` : 'Dirección por tarea: estilo ajustado en todas las valoradas', mapaTabla(In, x.filas) + (des.length ? In.table(['Colaborador · tarea', 'Qué ocurre', 'Qué corresponde'], des.map((f) => [f.c.nombre + ' · ' + f.t.nombre, f.des.t, E[f.toca].n + ': ' + E[f.toca].que])) : ''));
    if (x.acu.length) h += In.section('Acuerdos de dirección', acuerdosTabla(In, x.filas));
    const ri = des.map((f) => [`${f.c.nombre} · ${f.t.nombre}: ${f.des.t}`, f.des.tipo === 'mas' ? 'Frena la autonomía de la persona y ocupa tiempo del responsable.' : 'La tarea puede resentirse por falta de apoyo.']);
    if (c && c.flex < 40) ri.push([`Flexibilidad del ${c.flex} %: recurre casi siempre al mismo estilo.`, 'Dirige igual a personas con una preparación distinta.']);
    if (pe && c && pe.pri !== c.pri) ri.push(['El equipo percibe un estilo distinto del que el responsable se atribuye.', 'Lo que el responsable cree transmitir no es lo que el equipo recibe.']);
    const aut = x.val.filter((f) => f.nv.nivel === 4), op = [];
    if (aut.length) op.push([`${pl(aut.length, 'tarea', 'tareas')} en nivel autónomo: ${aut.slice(0, 4).map((f) => f.c.nombre + ' · ' + f.t.nombre).join('; ')}${aut.length > 4 ? '…' : ''}.`, 'Margen para delegar y liberar tiempo de dirección.']);
    if (c && c.eficacia >= 75) op.push([`Eficacia del ${c.eficacia} %: elige con acierto el estilo que corresponde.`, 'Base sólida para desarrollar a su equipo.']);
    if (ri.length || op.length) h += In.section('Riesgos y oportunidades', F.ryo(ri, op));
    const rc = R.recosLider(p);
    if (rc.length) h += In.section('Recomendaciones', F.recos(rc), 'Por orden de prioridad.');
    const tabs = R.tablillasLid(p).slice(0, 5);
    if (tabs.length) h += In.section('Plan de desarrollo', In.table(['Ficha de entrenamiento', 'Objetivo', 'Pasos', 'Motivo'], tabs.map((t) => [t.t.titulo, t.t.objetivo, t.t.pasos.join(' · '), t.motivos.join(' ')])));
    h += In.foot(pie);
    R.abrirInforme({ titulo: 'Perfil de dirección · ' + p.nombre, html: h, clave: 'lid-lider:' + p.id, nota: notaLider(x),
      anexo: F.anexo([c && MET_LID.estilo, pe && MET_LID.percibido, x.val.length && MET_LID.tareas, MET_LID.fuentes].filter(Boolean), limLider(p, x)),
      ctx: { titulo: 'Dirección de personas de ' + p.nombre, tipo: 'Perfil de dirección', datos: R.datosLider(p), pasos: F.pasosDe(rc), seguimiento: SEG_LID } });
  };

  R.informeLidEquipo = (p) => {
    if (!p) return; const In = I(); In.reset(); const F = Fi(), x = lecturaLider(p), filas = x.filas;
    let h = cover({ kicker: 'Acuerdos de dirección', titulo: 'Equipo de ' + p.nombre, subtitulo: `${pl(x.nCol, 'colaborador', 'colaboradores')} · ${pl(x.tareas.length, 'tarea clave', 'tareas clave')}` });
    const lead = x.tareas.length ? `El equipo de ${esc(p.nombre)} tiene <b>${x.acu.length} de ${pl(x.tareas.length, 'tarea clave', 'tareas clave')}</b> con un acuerdo de dirección por escrito.` : `El equipo de ${esc(p.nombre)} lo forman ${pl(x.nCol, 'persona', 'personas')}. Sus tareas clave están por identificar.`;
    h += In.summary('Resumen ejecutivo', `<p>${lead}</p>` + F.claves([
      x.val.length ? `Preparación por tarea: ${[1, 2, 3, 4].map((k) => `${x.val.filter((f) => f.nv.nivel === k).length} en nivel ${esc(N[k].n.toLowerCase())}`).join(', ')}.` : '',
      x.val.length ? (x.des.length ? `${pl(x.des.length, 'tarea', 'tareas')} con un estilo de dirección distinto del que corresponde.` : 'El estilo de dirección corresponde a la preparación en todas las tareas valoradas.') : '',
      x.tareas.length ? 'Cada persona sabe, para cada tarea clave, cómo la va a dirigir su responsable, cada cuánto se revisa y qué hace falta para ganar autonomía.' : ''
    ]));
    const porC = {}; filas.filter((f) => f.t).forEach((f) => (porC[f.c.id] = porC[f.c.id] || []).push(f));
    Object.keys(porC).forEach((id) => {
      const fs = porC[id], col = R.persona(id);
      h += In.section(col.nombre, In.table(['Tarea', 'Preparación', 'Estilo pactado', 'Seguimiento', 'Qué hará el responsable', 'Qué hará la persona', 'Siguiente nivel', 'Revisión'], fs.map((f) => { const a = f.t.acuerdo || {}; const est = a.estilo || f.toca; return [f.t.nombre, f.nv ? N[f.nv.nivel].n : 'Por valorar', E[+est] ? E[+est].n : '—', L.FRECUENCIAS[a.freq] || (E[+est] ? E[+est].seguimiento : '—'), a.lider || '—', a.colab || '—', a.siguiente ? N[a.siguiente].n : '—', a.revision ? R.fechaES(a.revision) : '—']; })));
    });
    h += In.section('Los cuatro estilos de dirección', In.table(['Estilo', 'En qué consiste', 'Seguimiento habitual'], [1, 2, 3, 4].map((k) => [E[k].n, E[k].que, E[k].seguimiento])));
    const rc = R.recosLider(p).filter((r) => !/^Entrenar|^Valorar su estilo|^Contrastar|^Recoger/.test(r.q));
    if (rc.length) h += In.section('Próximos pasos', F.recos(rc));
    h += In.foot(pie);
    const lim = [];
    if (!x.tareas.length) lim.push('La empresa no ha identificado las tareas clave de este equipo; el documento no incluye acuerdos por tarea.');
    else if (x.val.length < x.tareas.length) lim.push(`${x.val.length} de ${x.tareas.length} tareas clave tienen valorada la preparación; en el resto, el estilo queda por determinar.`);
    lim.push('El nivel de preparación es de cada tarea, no de la persona. Los acuerdos se revisan en la fecha pactada.');
    R.abrirInforme({ titulo: 'Acuerdos de dirección · equipo de ' + p.nombre, html: h, clave: 'lid-eq:' + p.id, nota: !x.tareas.length ? 'Para elaborar los acuerdos faltan las tareas clave de cada colaborador y su valoración.' : '',
      anexo: F.anexo([x.val.length && MET_LID.tareas, MET_LID.fuentes].filter(Boolean), lim),
      ctx: { titulo: 'Acuerdos del equipo de ' + p.nombre, tipo: 'Acuerdos de dirección', datos: R.datosLider(p), pasos: F.pasosDe(rc), seguimiento: SEG_LID } });
  };

  R.informeLidOrg = () => {
    const In = I(); In.reset(); const F = Fi(), ls = R.lideres(), emp = R.empresa().nombre;
    let h = cover({ kicker: 'Diagnóstico de liderazgo', titulo: 'Liderazgo y dirección de personas', subtitulo: pl(ls.length, 'responsable de equipo', 'responsables de equipo') });
    if (!ls.length) { In.open({ titulo: 'Diagnóstico de liderazgo', html: h + In.summary('Alcance', '<p>La empresa no ha aportado su organigrama: no consta quién dirige a quién. El diagnóstico de liderazgo queda fuera del alcance de este documento.</p>') + In.foot(pie), after: (paper) => R.notaTrabajo(paper, 'Indique en la plantilla de quién depende cada persona para elaborar este diagnóstico.') }); return; }
    const datos = ls.map((p) => Object.assign({ p }, lecturaLider(p)));
    const conC = datos.filter((d) => d.c), todas = datos.flatMap((d) => d.val), nT = datos.reduce((a, d) => a + d.tareas.length, 0), nAc = datos.reduce((a, d) => a + d.acu.length, 0);
    const efM = conC.length ? r0(conC.reduce((a, d) => a + d.c.eficacia, 0) / conC.length) : null, flM = conC.length ? r0(conC.reduce((a, d) => a + d.c.flex, 0) / conC.length) : null;
    const nDes = datos.reduce((a, d) => a + d.des.length, 0), dist = { 1: 0, 2: 0, 3: 0, 4: 0 }; todas.forEach((f) => dist[f.nv.nivel]++);
    const estD = { 1: 0, 2: 0, 3: 0, 4: 0 }; conC.forEach((d) => estD[d.c.pri]++);
    const topE = conC.length ? [1, 2, 3, 4].sort((a, b) => estD[b] - estD[a])[0] : null, unico = conC.length > 2 && Object.values(estD).filter(Boolean).length === 1;
    const nCol = datos.reduce((a, d) => a + d.nCol, 0), pAut = todas.length ? r0((dist[4] / todas.length) * 100) : null;
    const lead = nDes ? `En ${esc(emp)}, <b>${nDes} de ${pl(todas.length, 'tarea clave valorada', 'tareas clave valoradas')}</b> se ${nDes === 1 ? 'dirige' : 'dirigen'} con un estilo distinto del que corresponde a la preparación de la persona.`
      : todas.length ? `Los responsables de ${esc(emp)} ajustan su estilo de dirección a la preparación de cada persona en las <b>${todas.length} tareas clave valoradas</b>.`
        : conC.length ? `Los responsables de ${esc(emp)} dirigen con una eficacia media del <b>${efM} %</b> y una flexibilidad media del ${flM} %.`
          : `${esc(emp)} cuenta con ${pl(ls.length, 'responsable de equipo', 'responsables de equipo')}, que ${ls.length === 1 ? 'dirige' : 'dirigen'} a ${pl(nCol, 'persona', 'personas')}.`;
    h += In.summary('Resumen ejecutivo', `<p>${lead}</p>` + F.claves([
      conC.length || todas.length ? `${pl(ls.length, 'responsable de equipo', 'responsables de equipo')} y ${pl(nCol, 'colaborador directo', 'colaboradores directos')}.` : '',
      conC.length && (nDes || todas.length) ? `Eficacia media del ${efM} % y flexibilidad media del ${flM} % (${pl(conC.length, 'responsable valorado', 'responsables valorados')}).` : '',
      topE ? `Estilo de referencia más frecuente: ${esc(E[topE].n.toLowerCase())} (${estD[topE]} de ${conC.length}).${unico ? ' Todos comparten el mismo estilo: la organización dirige a todos igual.' : ''}` : '',
      pAut != null ? `El ${pAut} % de las tareas valoradas está en nivel autónomo.` : '',
      nT ? `Acuerdos de dirección por escrito: ${nAc} de ${pl(nT, 'tarea clave', 'tareas clave')}.` : ''
    ]), nDes > 3 ? 'stop' : nDes ? 'warn' : conC.length || todas.length ? 'ok' : null);
    h += In.kpis([{ k: 'Responsables de equipo', v: String(ls.length) }].concat(conC.length ? [{ k: 'Eficacia media', v: efM + ' %', st: efM >= 75 ? 'ok' : efM >= 55 ? 'warn' : 'stop' }, { k: 'Flexibilidad media', v: flM + ' %', st: flM >= 65 ? 'ok' : flM >= 40 ? 'warn' : 'stop' }] : [], todas.length ? [{ k: 'Tareas con el estilo desajustado', v: `${nDes} de ${todas.length}`, st: nDes > 3 ? 'stop' : nDes ? 'warn' : 'ok' }] : []));
    h += In.section('Responsables de equipo', conC.length || todas.length ? In.table(['Responsable', 'Colaboradores', 'Estilo de referencia', 'Percibido por el equipo', 'Eficacia', 'Flexibilidad', 'Tareas desajustadas'], datos.map((d) => [d.p.nombre, String(d.nCol), d.c ? E[d.c.pri].n : '—', d.pe ? E[d.pe.pri].n : '—', d.c ? d.c.eficacia + ' %' : '—', d.c ? d.c.flex + ' %' : '—', d.val.length ? String(d.des.length) : '—']), { num: [1, 4, 5, 6] }) : In.table(['Responsable', 'Puesto', 'Colaboradores directos'], datos.map((d) => [d.p.nombre, (R.puestoDe(d.p) || {}).nombre || '—', String(d.nCol)]), { num: [2] }));
    if (conC.length) h += In.section(`Estilos de dirección: predomina ${E[topE].n.toLowerCase()}`, In.table(['Estilo', 'Responsables con ese estilo de referencia', 'En qué consiste'], [1, 2, 3, 4].map((k) => [E[k].n, String(estD[k]), E[k].que]), { num: [1] }) + (unico ? In.callout(`Todos los responsables comparten el estilo ${esc(E[conC[0].c.pri].n.toLowerCase())}: la organización dirige a todos igual.`, 'warn') : ''));
    if (todas.length) h += In.section(`Preparación por tarea: el ${pAut} % en nivel autónomo`, In.table(['Nivel de preparación', 'Tareas', 'Estilo que corresponde'], [1, 2, 3, 4].map((k) => [N[k].n, String(dist[k]), E[k].n]), { num: [1] }));
    const tDes = datos.flatMap((d) => d.des.map((f) => ({ d, x: f }))).sort((a, b) => (a.x.des.st === 'stop' ? 0 : 1) - (b.x.des.st === 'stop' ? 0 : 1));
    if (tDes.length) h += In.section(`Desajustes de estilo que corregir: ${tDes.length}`, In.table(['Responsable', 'Colaborador · tarea', 'Qué ocurre', 'Estilo que corresponde'], tDes.map(({ d, x }) => [d.p.nombre, x.c.nombre + ' · ' + x.t.nombre, x.des.t, E[x.toca].n])));
    const demas = tDes.filter((o) => o.x.des.tipo === 'mas').length, ri = [], op = [];
    if (demas) ri.push([`${pl(demas, 'tarea se dirige', 'tareas se dirigen')} con más control del que corresponde.`, 'Frena la autonomía de las personas y consume tiempo de los responsables.']);
    if (tDes.length - demas) ri.push([`${pl(tDes.length - demas, 'tarea se dirige', 'tareas se dirigen')} con menos apoyo del que corresponde.`, 'Riesgo de errores y de desgaste de quien aún no domina la tarea.']);
    if (unico) ri.push([`Todos los responsables valorados comparten el estilo ${E[conC[0].c.pri].n.toLowerCase()}.`, 'Las personas con otra preparación no reciben la dirección que necesitan.']);
    if (flM != null && flM < 40) ri.push([`Flexibilidad media del ${flM} %.`, 'Los responsables recurren casi siempre al mismo estilo.']);
    if (nT && nAc < nT) ri.push([`${nT - nAc} de ${pl(nT, 'tarea clave', 'tareas clave')} sin acuerdo de dirección por escrito.`, 'El estilo y el seguimiento dependen de la costumbre de cada responsable.']);
    if (dist[4]) op.push([`${pl(dist[4], 'tarea', 'tareas')} en nivel autónomo.`, 'Margen para delegar y liberar tiempo de dirección.']);
    const buenos = conC.filter((d) => d.c.eficacia >= 75);
    if (buenos.length) op.push([`${pl(buenos.length, 'responsable', 'responsables')} con eficacia del 75 % o más: ${buenos.map((d) => d.p.nombre).join(', ')}.`, 'Referencia interna para el resto de responsables.']);
    if (ri.length || op.length) h += In.section('Riesgos y oportunidades', F.ryo(ri, op));
    const sinC = ls.length - conC.length, sinT = datos.filter((d) => d.nCol && !d.val.length), rc = [];
    tDes.slice(0, 4).forEach(({ d, x }) => rc.push({ q: `Corregir el estilo de ${d.p.nombre} con ${x.c.nombre} en «${x.t.nombre}»`, c: `Corresponde ${E[x.toca].n.toLowerCase()}. ${x.des.t}`, imp: `Tareas desajustadas: de ${nDes} a ${Math.max(0, nDes - 1)}`, quien: d.p.nombre, plazo: '1 mes' }));
    if (sinC) rc.push({ q: `Valorar el estilo de dirección de ${sinC === ls.length ? 'los responsables de equipo' : pl(sinC, 'responsable', 'responsables') + ' más'}`, c: `Cuestionario de ${L.SITUACIONES.length} situaciones, tras una sesión de 60 minutos sobre estilos y niveles de preparación.`, imp: `Responsables con estilo valorado: de ${conC.length} a ${ls.length}`, quien: 'Dirección', plazo: '1 mes' });
    if (sinT.length) rc.push({ q: 'Identificar y valorar las tareas clave de cada colaborador', c: `Dos o tres tareas por persona, valoradas por el responsable y por la propia persona. Equipos de: ${sinT.slice(0, 6).map((d) => d.p.nombre).join(', ')}${sinT.length > 6 ? '…' : ''}.`, imp: 'Estilo de dirección que corresponde a cada tarea', quien: 'Cada responsable', plazo: '6 semanas' });
    if (datos.some((d) => !d.pe && d.nCol >= LID_MIN)) rc.push({ q: 'Recoger cómo percibe cada equipo el estilo de su responsable', c: `Cuestionario anónimo, con un mínimo de ${LID_MIN} respuestas por responsable.`, imp: 'Contraste entre el estilo propio y el percibido', quien: 'Recursos humanos o consultor', plazo: '6 semanas' });
    if (nT && nAc < nT) rc.push({ q: 'Formalizar los acuerdos de dirección por tarea', c: 'Cada responsable con cada colaborador: estilo, seguimiento y siguiente nivel.', imp: `Tareas clave con acuerdo escrito: de ${nAc} a ${nT}`, quien: 'Cada responsable', plazo: '2 meses' });
    if (todas.length) rc.push({ q: 'Revisión a las seis semanas', c: 'Volver a valorar las tareas clave y comparar niveles de preparación.', imp: 'Al menos una tarea sube de nivel por equipo', quien: 'Dirección', plazo: '6 semanas' });
    if (rc.length) h += In.section('Recomendaciones', F.recos(rc), 'Por orden de prioridad.');
    h += In.foot(pie);
    const lim = [];
    if (sinC) lim.push(conC.length ? `La valoración del estilo de dirección cubre a ${conC.length} de ${ls.length} responsables; las medias se refieren a ese grupo.` : 'No se ha dispuesto de la valoración del estilo de dirección de los responsables; el documento no describe estilos, eficacia ni flexibilidad.');
    if (!todas.length) lim.push('Las tareas clave de los colaboradores no están valoradas; no se analiza el ajuste del estilo por tarea.');
    else if (todas.length < nT) lim.push(`${todas.length} de ${nT} tareas clave tienen valorada la preparación; el análisis por tarea se refiere a ellas.`);
    if (datos.some((d) => !d.pe)) lim.push(`La percepción del equipo solo se presenta con ${LID_MIN} respuestas o más por responsable, para preservar la confidencialidad.`);
    lim.push('El nivel de preparación es de cada tarea, no de la persona. El documento no evalúa el desempeño de los responsables.');
    R.abrirInforme({ titulo: 'Diagnóstico de liderazgo', html: h, clave: 'lid-org', nota: sinC || sinT.length ? `Para completar el diagnóstico: ${[sinC && pl(sinC, 'responsable sin cuestionario de estilo', 'responsables sin cuestionario de estilo'), sinT.length && pl(sinT.length, 'equipo sin tareas clave valoradas', 'equipos sin tareas clave valoradas')].filter(Boolean).join(' y ')}.` : '',
      anexo: F.anexo([conC.length && MET_LID.estilo, datos.some((d) => d.pe) && MET_LID.percibido, todas.length && MET_LID.tareas, MET_LID.fuentes].filter(Boolean), lim),
      ctx: { titulo: 'Liderazgo y dirección de personas', tipo: 'Diagnóstico de liderazgo', seguimiento: SEG_LID, pasos: F.pasosDe(rc),
        datos: [['Responsables de equipo', String(ls.length)], ['Con estilo de dirección valorado', conC.length + ' de ' + ls.length], ['Eficacia media', efM != null ? efM + ' %' : '—'], ['Flexibilidad media', flM != null ? flM + ' %' : '—'], ['Tareas clave valoradas', String(todas.length)], ['Tareas con el estilo desajustado', String(nDes)]] } });
  };
})();
