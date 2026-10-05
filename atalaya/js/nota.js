/* Atalaya 360° · Nota de la empresa
   Una nota de 0 a 10 (o de 0 a 100, con el mismo criterio) para la empresa activa: la del mundo en el que se está y la global, media de los mundos
   que incluye el plan. Cada mundo se puntúa con sus comprobaciones (semáforos, datos que faltan, datos de
   ejemplo, objetivos mal planteados o vencidos, agenda que no se cumple, plantilla sin evaluar…). Al pulsarla
   se despliegan los puntos a tratar, primero los rojos, y cada uno lleva a su zona.
   Los mundos con motor propio (simulador y sistema estratégico) se calculan cuando se abren y se guardan;
   personas y equipos y la mesa de trabajo se calculan siempre con sus datos.
   A.nota.calcular() → { global, mundos } · A.nota.abrir() · A.nota.refrescar() */
(function () {
  const A = (window.Atalaya = window.Atalaya || {});
  const P = () => A.platform;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const pagina = () => (location.pathname.split('/').pop() || 'index.html').replace(/\?.*$/, '');
  const hoy = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };
  const LSK = () => (P() && P().k ? P().k('atalaya.nota.v1') : 'atalaya.nota.v1');
  const lsGet = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sin almacenamiento */ } };
  const pl = (n, a, b) => `${n} ${n === 1 ? a : b}`;

  const MUNDOS = {
    simulador: { n: 'Simulador de inversión', url: 'app.html', puede: () => true },
    estrategia: { n: 'Sistema estratégico', url: 'estrategia.html', puede: () => !P() || !P().puede || P().puede('estrategia') },
    personas: { n: 'Personas y equipos', url: 'personas.html', puede: () => !P() || !P().puede || P().puede('personas') },
    mesa: { n: 'Mesa de trabajo', url: 'mesa.html', puede: () => true }
  };
  const mundoDePagina = () => ({ 'app.html': 'simulador', 'estrategia.html': 'estrategia', 'personas.html': 'personas', 'mesa.html': 'mesa' }[pagina()] || null);
  const VAL = { ok: 1, warn: 0.5, stop: 0 };
  /* Criterio único de Atalaya para cualquier nota, en cualquier mundo, informe o fase:
     cada comprobación vale verde 1, ámbar 0,5 y rojo 0, ponderada por su peso; la nota es esa proporción
     sobre 100 (o sobre 10, la misma cifra con una coma: 58/100 = 5,8/10). Verde desde 70, ámbar desde 50. */
  const puntuar = (puntos) => {
    const l = (puntos || []).filter((x) => x && VAL[x.st] != null); if (!l.length) return null;
    const w = l.reduce((a, x) => a + (x.peso || 1), 0), v = l.reduce((a, x) => a + (x.peso || 1) * VAL[x.st], 0);
    const n100 = Math.round((v / w) * 100);
    return { n100, n10: n100 / 10, st: n100 >= 70 ? 'ok' : n100 >= 50 ? 'warn' : 'stop', verdes: l.filter((x) => x.st === 'ok').length, ambar: l.filter((x) => x.st === 'warn').length, rojos: l.filter((x) => x.st === 'stop').length, total: l.length };
  };
  const notaDe = (puntos) => { const r = puntuar(puntos); return r ? r.n10 : null; };
  const stDeNota = (n) => (n == null ? '' : n >= 7 ? 'ok' : n >= 5 ? 'warn' : 'stop');
  const fmt = (n) => (n == null ? '—' : String(n.toFixed(1)).replace('.', ','));

  /* ---------- Comprobaciones de cada mundo ---------- */
  // Simulador: veredicto, semáforos, datos de ejemplo y cuentas
  const evalSimulador = (o) => {
    const out = [];
    if (o.ejemplo) out.push({ st: 'stop', peso: 3, t: 'El simulador usa datos de ejemplo', d: 'Cargue los datos reales de la empresa para que el veredicto sirva.', zona: 'empresa' });
    else out.push({ st: 'ok', peso: 3, t: 'Datos de la empresa cargados', zona: 'empresa' });
    if (o.veredicto) out.push({ st: o.veredicto.key === 'stop' ? 'stop' : o.veredicto.key === 'warn' ? 'warn' : 'ok', peso: 3, t: 'Veredicto de la inversión: ' + o.veredicto.titulo, zona: 'puente' });
    (o.luces || []).forEach((l) => out.push({ st: l.st, peso: l.key === 'liquidez' ? 2 : 1, t: (l.st === 'stop' ? 'En rojo: ' : l.st === 'warn' ? 'En ámbar: ' : '') + l.nombre + (l.valor ? ' (' + l.valor + ')' : ''), d: l.st !== 'ok' ? 'Toque para ver qué lo mueve y cómo ponerlo en verde.' : '', zona: 'riesgos' }));
    if (o.deudaEbitda != null && isFinite(o.deudaEbitda)) out.push({ st: o.deudaEbitda > 4 ? 'stop' : o.deudaEbitda > 3 ? 'warn' : 'ok', peso: 2, t: o.deudaEbitda > 3 ? `Carga financiera alta: deuda de ${o.deudaEbitda.toFixed(1).replace('.', ',')} veces el EBITDA` : 'Carga financiera asumible', d: o.deudaEbitda > 3 ? 'Alinee la financiación con lo que genera el negocio: plazo, carencia o aportación.' : '', zona: 'inversion' });
    if (!o.historico) out.push({ st: 'warn', peso: 1, t: 'Sin cuentas de años anteriores', d: 'Con dos o tres ejercicios la proyección es más fiable.', zona: 'historia' });
    return out;
  };
  const simDesdeMotor = () => {
    // En el simulador, con su propia API; en el sistema estratégico, con el mismo motor sobre los datos del simulador
    if (pagina() === 'app.html' && A.appApi && A.appApi.summary) {
      const s = A.appApi.summary(), st = A.appApi.getState ? A.appApi.getState() : {};
      const nm = { Verde: 'ok', 'Ámbar': 'warn', Rojo: 'stop' };
      const de = parseFloat(String((s.cifras || {}).deudaEbitda || '').replace(',', '.'));
      return evalSimulador({ ejemplo: !!st.ejemplo, historico: !!(st.historico && st.historico.anios && st.historico.anios.length && !st.historico.ejemplo), veredicto: { key: /Rediseñar/.test(s.veredicto) ? 'stop' : /condiciones/.test(s.veredicto) ? 'warn' : 'go', titulo: s.veredicto }, luces: (s.semaforos || []).map((l) => ({ key: l.clave, nombre: l.indicador, valor: l.valor, st: nm[l.estado] || 'warn' })), deudaEbitda: isFinite(de) ? de : null });
    }
    if (A.strat && A.strat.sim && A.analyze) {
      const S = A.strat, r = S.analysis();
      return evalSimulador({ ejemplo: !!S.sim.ejemplo, historico: !!(S.sim.historico && S.sim.historico.anios && S.sim.historico.anios.length && !S.sim.historico.ejemplo), veredicto: r.verdict, luces: r.lights.map((l) => ({ key: l.key, nombre: l.nombre, valor: l.valor, st: l.estado === 'go' ? 'ok' : l.estado })), deudaEbitda: r.deudaEbitda });
    }
    return null;
  };
  // Sistema estratégico: indicadores, datos que faltan, ejemplo, ABC, plan de empresa, objetivos y riesgos
  const estDesdeMotor = () => {
    const S = A.strat; if (!S || !S.state || !S.allKpis) return null;
    const out = [], h = hoy(), mod = (id) => S.mod(id);
    S.allKpis().forEach((k) => { if (!k.st) return; out.push({ st: k.st, peso: 1, t: (k.st === 'stop' ? 'En rojo: ' : k.st === 'warn' ? 'En ámbar: ' : '') + k.k + ' (' + k.area + ')', d: k.st !== 'ok' ? String(k.v || '') : '', zona: k.mod }); });
    if (S.needStatus) S.modules.forEach((m) => { const f = S.needStatus(m.id).filter((x) => !x.ok); if (f.length) out.push({ st: 'warn', peso: 1, t: `«${m.nombre}» sin gestionar del todo: ${pl(f.length, 'dato pendiente', 'datos pendientes')}`, d: f.slice(0, 2).map((x) => x.t).join(' · '), zona: m.id }); });
    S.modules.forEach((m) => { const d = S.state[m.id]; if (d && d.ejemplo === true) out.push({ st: 'warn', peso: 1, t: `«${m.nombre}» con datos de ejemplo`, d: 'Sustitúyalos por los de la empresa.', zona: m.id }); });
    const com = S.state.comercial;
    if (com) {
      const ej = com.ejemplo === true, np = (com.productos || []).length, nc = (com.clientes || []).length;
      out.push({ st: ej ? 'stop' : np < 3 || nc < 5 ? 'warn' : 'ok', peso: 2, t: ej ? 'El ABC de clientes y productos usa datos de ejemplo' : np < 3 || nc < 5 ? 'ABC de clientes y productos incompleto' : 'ABC de clientes y productos hecho', d: ej ? 'Sin un ABC real no se sabe qué clientes y productos dan el margen.' : np < 3 || nc < 5 ? `${pl(nc, 'cliente', 'clientes')} y ${pl(np, 'producto', 'productos')} cargados.` : '', zona: 'ventas' });
    }
    const plan = S.state.plan;
    if (plan) {
      const acc = (plan.acciones || []).filter((a) => a.accion), venc = acc.filter((a) => a.estado !== 'Hecha' && a.fin && a.fin < h), sinR = acc.filter((a) => a.estado !== 'Hecha' && (!a.responsable || !a.fin));
      if (!acc.length) out.push({ st: 'warn', peso: 2, t: 'El plan de empresa no tiene acciones', d: 'Sin acciones con responsable y fecha, los objetivos no bajan a la operativa.', zona: 'plan' });
      else out.push({ st: venc.length > 2 ? 'stop' : venc.length ? 'warn' : 'ok', peso: 2, t: venc.length ? `${pl(venc.length, 'acción vencida', 'acciones vencidas')} en el plan de empresa` : 'Plan de empresa al día', zona: 'plan' });
      if (sinR.length) out.push({ st: 'warn', peso: 1, t: `${pl(sinR.length, 'acción', 'acciones')} del plan sin responsable o sin fecha`, zona: 'plan' });
    }
    const c360 = S.state.c360 || {};
    Object.keys(c360).forEach((id) => { const ob = (c360[id].obj || []).filter((o) => o.meta !== '' && o.meta != null); const mal = ob.filter((o) => !o.fecha || !o.resp); const venc = ob.filter((o) => o.fecha && o.fecha < h); const m = mod(id); if (!m) return;
      if (mal.length) out.push({ st: 'warn', peso: 1, t: `Objetivos de «${m.nombre}» sin fecha o sin responsable (${mal.length})`, d: 'Un objetivo sin fecha ni responsable no se cumple.', zona: id });
      if (venc.length) out.push({ st: 'stop', peso: 1, t: `Objetivos de «${m.nombre}» con la fecha vencida (${venc.length})`, zona: id }); });
    if (S.madurez360 && A.C360) Object.keys(A.C360).forEach((id) => { const m = mod(id); if (!m) return; let z = null; try { z = S.madurez360(id); } catch (e) { z = null; } if (z && z.score != null) out.push({ st: z.score >= 70 ? 'ok' : z.score >= 50 ? 'warn' : 'stop', peso: 1, t: `Madurez de la gestión en «${m.nombre}»: ${z.score}/100`, zona: id }); });
    S.allRisks().filter((r) => r.nivel >= 15).slice(0, 5).forEach((r) => out.push({ st: 'stop', peso: 1, t: 'Riesgo alto: ' + r.nombre, d: r.mitigacion || '', zona: r.mod }));
    return out;
  };
  // Personas y equipos: plantilla, perfiles, puestos, equipos y acuerdos de liderazgo
  const evalPersonas = (st) => {
    const out = [], h = hoy(), ps = (st && st.personas) || [];
    if (!ps.length) return [{ st: 'stop', peso: 3, t: 'Plantilla sin dar de alta', d: 'Sin personas no hay perfiles, encaje ni equipos.', zona: 'personas' }];
    const conDisc = ps.filter((p) => p.disc).length, pct = conDisc / ps.length;
    out.push({ st: pct >= 0.8 ? 'ok' : pct >= 0.5 ? 'warn' : 'stop', peso: 2, t: pct >= 0.8 ? 'Perfiles DISC de la plantilla' : `Solo ${conDisc} de ${ps.length} personas con perfil DISC`, zona: pct >= 0.8 ? 'disc' : 'envios' });
    const puestos = (st.puestos || []).length, sinP = ps.filter((p) => !p.puestoId).length;
    out.push({ st: !puestos ? 'stop' : sinP ? 'warn' : 'ok', peso: 2, t: !puestos ? 'Sin puestos definidos' : sinP ? `${pl(sinP, 'persona', 'personas')} sin puesto asignado` : 'Cada persona tiene su puesto', d: !puestos ? 'Sin puestos no se puede medir el encaje persona-puesto.' : '', zona: 'puestos' });
    out.push({ st: (st.equipos || []).length ? 'ok' : 'warn', peso: 1, t: (st.equipos || []).length ? 'Equipos definidos' : 'Sin equipos definidos', zona: 'equipos' });
    const lideres = ps.filter((p) => ps.some((x) => x.responsable === p.id));
    if (lideres.length) {
      const sinTest = lideres.filter((p) => !(p.lid && p.lid.estilo)).length;
      out.push({ st: sinTest ? 'warn' : 'ok', peso: 1, t: sinTest ? `${pl(sinTest, 'responsable', 'responsables')} sin test de estilo de liderazgo` : 'Estilo de liderazgo de los responsables', zona: 'lid-estilo' });
      let venc = 0, acu = 0; ps.forEach((c) => (c.tareas || []).forEach((t) => { if (t.acuerdo) { acu++; if (t.acuerdo.revision && t.acuerdo.revision < h) venc++; } }));
      if (acu) out.push({ st: venc ? 'stop' : 'ok', peso: 2, t: venc ? `${pl(venc, 'acuerdo de liderazgo', 'acuerdos de liderazgo')} con la revisión vencida` : 'Acuerdos de liderazgo al día', zona: 'lid-mapa' });
      else out.push({ st: 'warn', peso: 1, t: 'Sin acuerdos de liderazgo por tarea', zona: 'lid-mapa' });
    }
    return out;
  };
  // Mesa de trabajo: agenda que no se cumple, metas mal planteadas o vencidas, tiempo para lo clave
  const evalMesa = (st) => {
    const out = [], h = hoy(), tareas = (st && st.tareas) || [], metas = ((st && st.metas) || []).filter((m) => m.estado !== 'cumplida');
    const pend = tareas.filter((t) => t.estado !== 'hecha'), atras = pend.filter((t) => t.fecha && t.fecha < h), apl = pend.filter((t) => (t.aplazada || 0) >= 2);
    out.push({ st: atras.length > 3 ? 'stop' : atras.length ? 'warn' : 'ok', peso: 2, t: atras.length ? `La agenda no se cumple: ${pl(atras.length, 'tarea atrasada', 'tareas atrasadas')}` : 'Agenda al día', zona: 'hoy' });
    if (apl.length) out.push({ st: 'warn', peso: 1, t: `${pl(apl.length, 'tarea aplazada', 'tareas aplazadas')} dos veces o más`, d: 'Divídalas, deléguelas o quítelas.', zona: 'bandeja' });
    if (pend.filter((t) => !t.fecha).length > 10) out.push({ st: 'warn', peso: 1, t: `${pend.filter((t) => !t.fecha).length} tareas sin fecha de acción`, zona: 'bandeja' });
    if (!metas.length) out.push({ st: 'warn', peso: 2, t: 'Sin metas SMART activas', d: 'Convierta los objetivos del ecosistema en metas que dependan de quien las ejecuta.', zona: 'metas' });
    metas.forEach((m) => {
      const nombre = m.especifica || m.objetivo || 'sin definir', num = (v) => v !== '' && v != null && isFinite(+String(v).replace(',', '.'));
      const falta = [!(m.especifica || '').trim() && 'qué se hará', !(m.indicador && num(m.valor)) && 'indicador y valor', !m.fecha && 'fecha', !(m.responsable || '').trim() && 'responsable', !(m.beneficio || '').trim() && 'beneficio', !m.solo && 'que dependa solo de quien la ejecuta'].filter(Boolean);
      if (m.fecha && m.fecha < h) out.push({ st: 'stop', peso: 2, t: `Meta vencida sin cumplir: «${nombre}»`, zona: 'metas', meta: m.id });
      else out.push({ st: falta.length > 2 ? 'stop' : falta.length ? 'warn' : 'ok', peso: 1, t: falta.length ? `Meta mal planteada: «${nombre}»` : `Meta SMART: «${nombre}»`, d: falta.length ? 'Falta: ' + falta.join(', ') + '.' : '', zona: 'metas', meta: m.id });
      const accV = (m.acciones || []).filter((a) => a.t && !a.hecha && (a.revisada || a.fecha) && (a.revisada || a.fecha) < h).length;
      if (accV) out.push({ st: 'stop', peso: 1, t: `${pl(accV, 'acción vencida', 'acciones vencidas')} en la meta «${nombre}»`, zona: 'metas', meta: m.id });
    });
    const d = new Date(h + 'T12:00:00'), w0 = new Date(d); w0.setDate(d.getDate() - ((d.getDay() + 6) % 7)); const a0 = w0.toISOString().slice(0, 10); const w6 = new Date(w0); w6.setDate(w0.getDate() + 6); const a6 = w6.toISOString().slice(0, 10);
    const sem = tareas.filter((t) => t.hora && t.fecha >= a0 && t.fecha <= a6), mT = sem.reduce((a, t) => a + (+t.dur || 30), 0), mC = sem.filter((t) => t.clave).reduce((a, t) => a + (+t.dur || 30), 0);
    out.push({ st: !mT ? 'warn' : mC / mT >= 0.4 ? 'ok' : mC / mT >= 0.2 ? 'warn' : 'stop', peso: 2, t: !mT ? 'Sin tiempo reservado esta semana' : `${Math.round((mC / mT) * 100)} % del tiempo reservado va a actividades clave`, d: !mT ? 'Reserve horas para su 20 % en la agenda.' : '', zona: !mT ? 'agenda' : 'prioridades' });
    return out;
  };

  /* ---------- Cálculo y caché por empresa ---------- */
  let cache = null, ultima = null;
  const cargarCache = async () => {
    if (cache) return cache;
    cache = lsGet(LSK()) || {};
    if (P() && P().loadData) { try { const r = await P().loadData('nota'); if (r && typeof r === 'object') { Object.keys(r).forEach((k) => { if (!cache[k] || (r[k] && r[k].fecha > cache[k].fecha)) cache[k] = r[k]; }); } } catch (e) { /* local */ } }
    return cache;
  };
  const guardarCache = () => { lsSet(LSK(), cache); if (P() && P().saveData) P().saveData('nota', cache).catch(() => {}); };
  const datos = async (k, lsBase) => { let st = lsGet(P() && P().k ? P().k(lsBase) : lsBase); if (P() && P().loadData) { try { const r = await P().loadData(k); if (r) st = r; } catch (e) { /* local */ } } return st; };
  A.nota = A.nota || {};
  A.nota.REGLA = 'Mismo criterio en toda Atalaya: cada comprobación (indicadores con semáforo, datos que faltan o de ejemplo, objetivos, plan, riesgos altos y madurez de la gestión) vale verde 1, ámbar 0,5 y rojo 0 según su peso; la nota es esa proporción sobre 100 (58/100 = 5,8/10). La nota de la empresa es la media de los mundos de su plan.';
  A.nota.puntuar = puntuar;
  A.nota.estrategia = () => estDesdeMotor();
  A.nota.personas = (st) => evalPersonas(st);
  // Nota de un conjunto de módulos del sistema estratégico (un área, un módulo o todos)
  A.nota.modulos = (ids) => { const p = estDesdeMotor(); if (!p) return null; const set = ids ? new Set([].concat(ids)) : null; return puntuar(set ? p.filter((x) => set.has(x.zona)) : p); };
  A.nota.desglose = (r) => (r ? `${r.total} comprobaciones: ${r.verdes} en verde, ${r.ambar} en ámbar y ${r.rojos} en rojo` : 'sin comprobaciones');
  A.nota.calcular = async () => {
    await cargarCache();
    const mundos = {};
    for (const k of Object.keys(MUNDOS)) {
      if (!MUNDOS[k].puede()) continue;
      let puntos = null, vivo = false;
      try {
        if (k === 'simulador') { puntos = simDesdeMotor(); vivo = !!puntos; }
        if (k === 'estrategia') { puntos = estDesdeMotor(); vivo = !!puntos; }
        if (k === 'personas') { puntos = evalPersonas((A.personas && A.personas.state) || (await datos('personas', 'atalaya.personas.v1'))); vivo = true; }
        if (k === 'mesa') { puntos = evalMesa(await datos('agenda', 'atalaya.agenda.v1')); vivo = true; }
      } catch (e) { console.error(e); puntos = null; }
      if (puntos && (k === 'simulador' || k === 'estrategia')) { cache[k] = { puntos, fecha: new Date().toISOString() }; }
      if (!puntos && cache[k]) puntos = cache[k].puntos;
      mundos[k] = { n: MUNDOS[k].n, nota: notaDe(puntos), puntos: puntos || [], vivo, fecha: (cache[k] && cache[k].fecha) || null };
    }
    guardarCache();
    const ns = Object.values(mundos).map((m) => m.nota).filter((n) => n != null);
    ultima = { global: ns.length ? Math.round((ns.reduce((a, b) => a + b, 0) / ns.length) * 10) / 10 : null, mundos, actual: mundoDePagina() };
    return ultima;
  };

  /* ---------- Interfaz: indicador en la cabecera y desplegable de puntos a tratar ---------- */
  let chip = null, panel = null, filtro = null;
  const ir = (mundo, zona, meta) => {
    cerrar();
    if (mundo === mundoDePagina()) {
      if (mundo === 'mesa' && meta && A.mesa && A.mesa.abrirMeta) { A.mesa.abrirMeta(meta); return; }
      if (A.assistant && A.assistant.guia && zona) { A.assistant.guia.irZona(zona); return; }
      const el = document.getElementById(zona); if (el) el.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    if (mundo === 'mesa' && meta) { try { sessionStorage.setItem('atalaya.mesa.meta', meta); } catch (e) { /* nada */ } }
    location.href = MUNDOS[mundo].url + (zona ? '#' + zona : '');
  };
  const pintarChip = () => {
    if (!chip || !ultima) return;
    const m = ultima.actual && ultima.mundos[ultima.actual];
    chip.innerHTML = `<span class="nt-n ${stDeNota(ultima.global)}">${fmt(ultima.global)}</span><small>Empresa</small>${m ? `<span class="nt-sep"></span><span class="nt-n ${stDeNota(m.nota)}">${fmt(m.nota)}</span><small>Este mundo</small>` : ''}`;
    chip.title = 'Nota de la empresa de 0 a 10 (media de los mundos) y nota de este mundo, con el mismo criterio que el cuadro de mando y los informes: toque para ver los puntos a tratar';
  };
  const pintarPanel = () => {
    if (!panel || !ultima) return;
    const ks = Object.keys(ultima.mundos);
    const ptos = ks.filter((k) => !filtro || k === filtro).flatMap((k) => ultima.mundos[k].puntos.filter((x) => x.st !== 'ok').map((x) => Object.assign({ mundo: k }, x)))
      .sort((a, b) => (a.st === b.st ? (b.peso || 1) - (a.peso || 1) : a.st === 'stop' ? -1 : 1));
    const rojos = ptos.filter((x) => x.st === 'stop').length;
    panel.innerHTML = `<div class="nt-head"><div><div class="nt-k">Nota de la empresa</div><div class="nt-big ${stDeNota(ultima.global)}">${fmt(ultima.global)}<small>/10</small></div></div><span class="ml-sp"></span><button class="icon-btn" data-x aria-label="Cerrar">×</button></div>
      <p class="nt-exp">Media de los mundos de su plan. Cada mundo puntúa sus comprobaciones: verde suma, ámbar suma la mitad y rojo no suma.</p>
      <div class="nt-mundos">${ks.map((k) => { const m = ultima.mundos[k]; return `<button class="nt-m ${filtro === k ? 'on' : ''} ${k === ultima.actual ? 'aqui' : ''}" data-f="${k}"><b class="${stDeNota(m.nota)}">${fmt(m.nota)}</b><span>${esc(m.n)}</span><small>${m.nota == null ? 'Ábralo para calcularla' : `${m.puntos.filter((x) => x.st === 'stop').length} en rojo · ${m.puntos.filter((x) => x.st === 'warn').length} en ámbar`}${!m.vivo && m.fecha ? ' · ' + new Date(m.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) : ''}</small></button>`; }).join('')}</div>
      <div class="nt-k">${filtro ? 'Puntos a tratar en ' + esc(ultima.mundos[filtro].n) : 'Puntos a tratar'} · ${pl(rojos, 'en rojo', 'en rojo')}, ${ptos.length - rojos} en ámbar</div>
      <ol class="nt-list">${ptos.slice(0, 40).map((x, i) => `<li><button data-i="${i}" class="nt-p ${x.st}"><i></i><span><b>${esc(x.t)}</b>${x.d ? `<small>${esc(x.d)}</small>` : ''}<em>${esc(MUNDOS[x.mundo].n)}</em></span><span class="nt-go">→</span></button></li>`).join('') || '<li class="nt-vacio">Nada en rojo ni en ámbar. Buen trabajo.</li>'}</ol>
      ${ptos.length > 40 ? `<p class="nt-exp">Y ${ptos.length - 40} más.</p>` : ''}`;
    panel.querySelector('[data-x]').onclick = cerrar;
    panel.querySelectorAll('[data-f]').forEach((b) => (b.onclick = () => { filtro = filtro === b.dataset.f ? null : b.dataset.f; pintarPanel(); }));
    panel.querySelectorAll('[data-i]').forEach((b) => (b.onclick = () => { const x = ptos[+b.dataset.i]; ir(x.mundo, x.zona, x.meta); }));
  };
  const abrir = async () => {
    if (!panel) { panel = document.createElement('div'); panel.className = 'nt-panel glass'; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'Nota de la empresa'); document.body.appendChild(panel); panel.addEventListener('keydown', (e) => { if (e.key === 'Escape') cerrar(); }); }
    filtro = null; panel.hidden = false; await A.nota.refrescar(); pintarPanel(); chip && chip.setAttribute('aria-expanded', 'true');
  };
  const cerrar = () => { if (panel) panel.hidden = true; chip && chip.setAttribute('aria-expanded', 'false'); };
  A.nota.abrir = abrir; A.nota.cerrar = cerrar;
  A.nota.refrescar = async () => { try { await A.nota.calcular(); } catch (e) { console.error(e); } pintarChip(); if (panel && !panel.hidden) pintarPanel(); return ultima; };
  A.nota.ultima = () => ultima;

  const iniciar = async () => {
    if (!mundoDePagina()) return;
    const P0 = P(); if (P0 && P0.ready) await P0.ready;
    const acc = document.querySelector('.topbar .account'); if (!acc) return;
    chip = document.createElement('button'); chip.className = 'nt-chip'; chip.type = 'button'; chip.setAttribute('aria-expanded', 'false'); chip.innerHTML = '<span class="nt-n">…</span><small>Nota</small>';
    acc.parentNode.insertBefore(chip, acc);
    chip.onclick = () => (panel && !panel.hidden ? cerrar() : abrir());
    // La ruta del evento se fija al pulsar: el botón puede repintarse antes de que el clic llegue aquí
    document.addEventListener('click', (e) => { const ruta = e.composedPath ? e.composedPath() : [e.target]; if (panel && !panel.hidden && !ruta.includes(panel) && !ruta.includes(chip)) cerrar(); });
    // Espera a que el mundo cargue sus datos y recalcula de vez en cuando (los cambios se reflejan solos)
    setTimeout(() => A.nota.refrescar(), 2500);
    setInterval(() => { if (!document.hidden) A.nota.refrescar(); }, 30000);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
